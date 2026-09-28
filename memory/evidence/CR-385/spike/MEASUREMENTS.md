# CR-385 · D5 spike — CollectPaymentPanel inside a 560 px expandable table row (2026-09-20)

```
Owner go-ahead: "ok go ahead only for d5 spike test, do not edit actual source code or design file"
What ran:  scratch route /spike-cr385 (2 throw-away files under src/spike/cr385/ + 1 temporary import/route line in App.js)
           → deleted; App.js reverted with git checkout; `git status` = 0 changes in src/; frontend recompiled clean.
Panel:     components/order-entry/CollectPaymentPanel.jsx — imported UNMODIFIED, room mode, same props as PmsCheckoutDrawer (CR-358-P3).
Data:      mode=synthetic → 14 F&B lines + 3 transferred orders + room 17,500/GST 2,188/adv 1,500 (display only, no writes)
           mode=live → real order 1232602 (room r2, other tester's stay) via get-single-order-new → orderTransform.fromAPI.order (read-only)
Box:       expansion row = grid [LEFT statement 1fr | RIGHT 440 px] × 560 px; RIGHT box overflow:hidden; panel root is `flex flex-col h-full`
Viewports: 1920×800 and 1366×768 (Playwright, logged in as owner@thegoankitchen.com)
Screenshots: this folder (A1…H1 .jpg)
```

## Measurements (from the in-page probe `spike-metrics`)
| Case | Viewport | box h | body client / scroll | body scrolls | Checkout btn inside box | Checkout in viewport | Payment Method visible w/o scroll |
|---|---|---|---|---|---|---|---|
| A1 synthetic, default state | 1920×800 | 560 | 353 / 783 | yes | yes (bottom 741 ≤ 757) | yes | yes |
| A2 synthetic, body scrolled to bottom | 1920×800 | 560 | 353 / 783 | yes | yes | yes | yes |
| B3 synthetic, all 3 section rows expanded | 1920×800 | 560 | 353 / 1443 | yes | yes | yes | **no** (expected — sections are hidden by design) |
| C1 synthetic, Q6 CSS hide of the 3 toggles | 1920×800 | 560 | 353 / 691 | yes | yes | yes | yes |
| D1 live order 1232602 | 1920×800 | 560 | 353 / 755 | yes | yes | yes | yes |
| E1 synthetic | 1366×768 | 560 | 353 / 783 | yes | yes | yes (bottom 741 ≤ 768) | yes |
| G2 row 3 (lower row) expanded via keyboard, no scroll | 1366×768 | 560 | 353 / 783 | yes | yes | **no** (box bottom 804 > 768) | yes |
| H1 same, after `scrollIntoView({block:'nearest'})` on the expansion row | 1366×768 | 560 | 353 / 783 | yes | yes | **yes** (box 201–761) | yes |

Fixed parts of the panel inside 560 px: sticky header 62 px (`bill-summary-header` block) + pinned Pay block 91 px (`p-4 border-t` + 56 px button) → **scroll body = 353 px** at every viewport (panel is `h-full`, so it inherits the box height exactly).

## Verdicts
| Question | Result |
|---|---|
| Does the unmodified panel fit a 560 px box? | **Yes.** Header pinned, body scrolls internally, `Checkout ₹X` pinned and always visible inside the box. No layout break, no double scrollbar, no clipping. Live and synthetic data behave identically. |
| Inner scroll vs pinned settle (D1 "right = adjust → verify → collect") | **Works as designed:** Adjustments + Bill Summary + Payment Method scroll; Pay button never scrolls. In the default (sections collapsed) state the Payment Method block is visible **without** scrolling at both viewports. |
| OG-PMS-021 (Payment Method lives inside the scroll body) | Confirmed. Acceptable: visible without scroll in the default state; only when a cashier expands a hidden section or adds long adjustments does it move below the fold (B3). |
| Split-bill state (v2.27 352–395 px band) | **N/A** — with `onOpenSplitBill={null}` (D1: no Split Bill in room mode) the `split-bill-btn` is not rendered, so the Split state cannot occur. Band check retired. |
| Sticky `<th>` | Works (`position: sticky; top: 0` inside the table's scroll container). Note: it sticks at the scroll container's **padding edge** (measured y 70 vs container y 46 with `p-6`) → the workstation table must live in a scroll container with **no top padding**, or set `top` = padding. |
| Keyboard `↑ ↓ Enter Esc` | Works with a simple focus index on the `tbody` (Enter toggles, Esc collapses, one expansion at a time). |
| 1366×768, lower rows | A row expanded near the bottom of the viewport overflows (G2). **`scrollIntoView({block:'nearest'})` on the expansion row fixes it (H1)** — the box then sits at 201–761. This is the "viewport-clamped" clause of D1; implement as scroll-on-expand, not as height clamping (560 px always fits under a 52 px header + 40 px sticky `<th>` at 768). |
| **Q6 mechanism** (hide the 3 collapsible section rows Room / Transferred / Room Orders) | **CSS from the host works with zero panel edits:** `.frontdesk-bill [data-testid="checkout-room-booking-toggle"], … [data-testid="checkout-transferred-toggle"], … [data-testid="checkout-room-service-toggle"] { display:none }` — all three invisible (C1), body shrinks 783 → 691, their collapsed content never renders because the toggles default to closed. Risk: relies on `data-testid` selectors (stable for 3 CRs, but test hooks). Alternative = `hideSectionRows` prop (~5 L wrapper edit, new OD-385-12 exception). **Recommendation: CSS (a), owner decides** — see D57. |

## What this means for the plan (M6)
1. `FolioCheckoutPanel` = grid `[1fr | 440 px]`, height 560 px, RIGHT box `overflow:hidden` hosting `<CollectPaymentPanel … isRoom onOpenSplitBill={null}>` with the same prop mapping as `PmsCheckoutDrawer.jsx` L260–297 (incl. the BUG-425 `remainingRoomBalance` override until backend `charge` replaces it per D50).
2. On expand: `row.scrollIntoView({block:'nearest'})`; scroll container without top padding; `<th class="sticky top-0">`.
3. Q6: host-scoped CSS class on the RIGHT box (D57 option a) — no `CollectPaymentPanel.jsx` change.
4. Verification matrix rows: box 560 · body 353 · Checkout visible at 1920×800 and 1366×768 · three toggles hidden · scroll-on-expand for the last row · live order loads via `get-single-order-new`.
5. No `src/` residue: `git status` clean after the spike; App.js reverted (`git checkout -- frontend/src/App.js`).
