# BUG-555 — Impact Analysis (Gate 2)
## Tablet Responsiveness umbrella — WP-A Order Entry → WP-D Reports → WP-B Sidebar → WP-C Header

**ID:** BUG-555 · **Date:** 2026-10-15 · **Role:** PLANNING (Gate 2 only — no Implementation Plan, no code)
**Code Reality:** NONE — `grep -rn "BUG-555" frontend/src` → 0 hits; no `matchMedia`/breakpoints in Order Entry tree; Sidebar has no responsive mode.
**Status:** ✅ GATE 2 CLOSED 2026-10-15 — owner approved design review + all ODs (§9)
**Risk:** HIGH (umbrella, via WP-A) · WP-A HIGH · WP-B **MEDIUM** (OD-555-15 approved) · WP-C MEDIUM · WP-D LOW
**Inputs:** `change_requests/BUG-555_TABLET_RESPONSIVENESS_INTAKE.md`, `evidence/BUG-555/BUG-555_INVESTIGATION_REPORT.md` §3/§5c (frozen ODs)
**Target viewports:** 893×533 · 1006×600 · 533×893 (+ 800 floor, 1024, 1279 edges)

---

## 0. Conflict Pre-Check

| Item | Status | File overlap | Verdict |
|---|---|---|---|
| CR-414 / BUG-537 | GATE_5A (QA pending) | `Header.jsx` L271/339/428/433/438/441/445/483 (same `lg:` classes WP-C moves to `xl:`) | **SEQUENCE: WP-C after CR-414 QA PASS** (WP-C is last in OD-555-08 anyway) |
| BUG-539 | GATE_5A | `PLReportPage.jsx` L176 (outer row already wraps) | Parallel-safe — WP-D touches only inner L186 |
| BUG-538 | GATE_1_INTAKE | `OrderEntry.jsx` canDiscount prop, `CollectPaymentPanel.jsx` discount section | Parallel-safe — logic lines, WP-A touches only layout classes L1666–1863 / CPP untouched (§1.4) |
| CR-410 | BACKEND_BLOCKED | OrderEntry / CPP props | Parallel-safe |
| CR-408/409/411/412/413, BUG-527, BUG-530 | GATE_5A | OrderEntry / CPP / DashboardPage logic | Parallel-safe by line range; all are logic, not layout |
| BUG-532 | GATE_3 | `DashboardPage.jsx:L49` | Parallel-safe (WP-B may not touch DashboardPage at all — §3) |
| CR-052 / CR-355 / CR-415 / CR-117 | QA/5A | `Sidebar.jsx` nav entries, flyout | **CAUTION** — WP-B wraps the `<aside>` root; flyout (CR-052) must keep working in collapsed desktop mode and be disabled/irrelevant in drawer mode |
| BUG-452 / CR-411 | 5A/5B | `<OrderEntry key={orderEntryResetNonce}>` remount, cart persistence | **CONSTRAINT** — rotate overlay must NOT unmount/remount OrderEntry (§1.5) |

FILE_OWNERSHIP: last layout-class edits on these files are CR-414 (Header), BUG-134 (OrderEntry/CategoryPanel `min-h-0`), CR-376-FU-B (CategoryPanel logic). No open owner conflicts.

---

## 1. WP-A — Order Entry (HIGH, R5) — FIRST

### 1.1 Data/Layout flow (verified at HEAD)
```
DashboardPage.jsx:2076  <OrderEntry key={orderEntryResetNonce} …/>   (only mount point)
OrderEntry.jsx:1666     fixed inset-0 z-50 flex                     (full-screen overlay)
  1671  <CategoryPanel/>  → CategoryPanel.jsx:32  w-44 flex-shrink-0  = 176px
  1683  middle            flex-1 flex flex-col min-h-0      (NO min-w-0)
  1685    header row      px-4 py-3 flex items-center gap-3 (no wrap)
            search  relative flex-1 max-w-xs
            flex-1 spacer · order-id chip (flex-shrink-0) · menu-type chip (flex-shrink-0)
  1738      icon group    flex items-center gap-3 flex-shrink-0 → add-custom-item, customer-info,
                          order-notes, [shift-table], [merge] (p-2.5 = 40px each)
  1812    items area      flex-1 overflow-y-auto p-4 → `flex flex-wrap gap-3` pills (L1817) — already fluid ✓
  1863  right            w-96 flex-shrink-0 overflow-y-auto = 384px → CartPanel | CollectPaymentPanel
BREAK: 176 + 367 (header min-content) + 384 = 927 > 893 / 800
```

### 1.2 Width budget (what must fit)
| Viewport | Today (176+384) middle left | Middle needs | Result |
|---|---|---|---|
| 1280+ | ≥720 | 367 | OK |
| 1006 | 446 | 367 | OK |
| 960 | 400 | 367 | OK |
| **893** | 333 | 367 | **CLIPS 34px** |
| **800 (floor)** | 240 | 367 | **CLIPS 127px** |

### 1.3 Change surface (candidate edits — exact lines go into Gate 3)
| # | File:line | Change | Why |
|---|---|---|---|
| A1 | `OrderEntry.jsx:1683` | add `min-w-0` to middle pane | lets flex child shrink below min-content (root cause of 367 floor) |
| A2 | `OrderEntry.jsx:1685` | header row → `flex-wrap gap-y-2` (or icons-only compact <1280) | 5 icons + 2 chips + search fit in 240–333px by wrapping to 2 rows |
| A3 | `OrderEntry.jsx:1687` | search `flex-1 max-w-xs` → add `min-w-[140px]`/`basis` | search keeps usable width when row wraps |
| A4 | `CategoryPanel.jsx:32` | `w-44` → `w-32 xl:w-44` (128px <1280) | frees 48px; category buttons need visual check (labels truncate) |
| A5 | `OrderEntry.jsx:1863` | right pane width — **see OD-555-12** | biggest lever |
| A6 | `OrderEntry.jsx` (new block inside L1666 root) | portrait "Rotate your tablet" overlay — **see OD-555-13** | OD-555-02 |

Budget with A1–A4 and right pane kept at 384: 800 − 128 − 384 = **288px middle** → header wraps to 2 rows, item pills wrap (already `flex-wrap`). Fits. At 893: 381px. At 1006: 494px.

### 1.4 CollectPaymentPanel.jsx — finding: can drop out of scope
CPP root is `flex flex-col h-full` (L1259); its width is entirely dictated by the OrderEntry L1863 container. CPP internals: `grid-cols-3` (L2743), `grid-cols-2` (L3233/L3288), `min-w-[60px]` (L2858) — all designed for 384px.
- **If right pane stays 384px (OD-555-12 = a):** **zero edits to `CollectPaymentPanel.jsx` and `CartPanel.jsx`** → removes one R5 hotspot and all R6 (financial) proximity from BUG-555.
- If right pane shrinks to 320px (OD-555-12 = b): CPP/CartPanel internals must be re-verified at 320 (Pay/Discount/Tip/split rows); likely internal edits → R5 + R6-adjacent, larger QA.

### 1.5 Rotate overlay constraints
- Must render **inside** OrderEntry root as `absolute inset-0` sibling — never conditionally unmount OrderEntry children (BUG-452/CR-411 cart state + `orderEntryResetNonce` remount contract; test `DashboardPage.bug452.test.jsx` asserts the key wiring).
- z-index must exceed Order Entry modals (`z-[100]`×15, `z-[110]`×2 in order-entry/*) → overlay `z-[120]`+; Radix portaled dialogs (z-50, body-level) are below the OrderEntry root anyway.
- Detection: `window.matchMedia(...)` + `change` listener — same pattern as `ChannelColumnsLayout.jsx:107` (CR-414). No new dependency.
- Placing an order / payment in flight while device rotates: overlay blocks input only; in-flight requests continue (no state reset). QA case required.
- OD-555-09: no manifest orientation lock — overlay is the only mechanism.

### 1.6 Downstream consumers / regression zone
Order Entry is used for dine-in, takeaway, delivery, room, walk-in (R13), scan-order edit, Collect Bill / Pay (CPP), shift/merge table. Layout-only change, but QA must run: place order → collect payment → settle at 893×533 and 1006×600 + desktop 1920 unchanged; walk-in separately.

---

## 2. WP-D — Report toolbars (LOW) — SECOND

### 2.1 Code reality — scope count differs from frozen OD (R1: code wins)
Scan saved: `evidence/BUG-555/BUG-555_WPD_toolbar_scan_2026_10_15.txt`. 47 files in `pages/reports-module/`, **42 have a presets toolbar**, no shared toolbar component (each page inlines it).

| Group | Files | Edit |
|---|---|---|
| Standard S5 header: outer `<header|div className="flex items-center justify-between px-8 py-5 …">` + inner `flex items-center gap-3` (controls) — both NOWRAP | **38**: AuditLog, CancelDetail, Cancellations, CashierSettlement, ChannelPivot, CouponUsage, CustomersMix, CustomersRfm, DailySales, Dashboard, DayOfWeek, DeliveryCharge, DiscountReport, ExpenseReportPage, FoodCourt, FoodCourtBetaPage, GatewayRecon, HourlySales, ItemSalesHybrid, ItemSalesLedger, KotVariance, OrderLedger, OrderNotes, Payments, PrepServeTime, RoomOrders, RoomTransfers, RoundOff, Sales, SettlementReport, StaffCashiers, StaffServers, TableSales, TaxCalc, TaxDetail, TaxSlabs, TipReport, VariationAddon | outer `+ flex-wrap gap-y-3`, inner `+ flex-wrap` (+`justify-end` where right-aligned) |
| Outer already wraps (BUG-539), inner NOWRAP | 1: PLReportPage (L186) | inner `+ flex-wrap` |
| Already OK | 2: ConsumptionReportPage (L238), PurchaseReportPage (L262) | none |
| Presets disabled demo, needs eye-check | 1: EdgeStatesMockup (L112) | verify at Gate 3 |

→ **39–40 files**, not 34 (investigation counted pages that *visibly* clipped at 853; at 800/533 more clip). OD-555-06 intent = "all report-module toolbars" → **OD-555-14** confirms the corrected count.

### 2.2 Risk
Class-only edits, no logic, no data. Each page is independent (no shared component) → mechanical but wide; risk of typo per file. QA: one screenshot per page at 893 + 533 portrait + 1920 regression (desktop must look identical — `flex-wrap` is a no-op when content fits).

---

## 3. WP-B — Sidebar hamburger <1280 + desktop sticky pin (HIGH → MEDIUM candidate) — THIRD

### 3.1 Code reality
- `Sidebar.jsx:247` `const Sidebar = ({ isExpanded, setIsExpanded, … })` — expansion state is **owned by each page**, persisted under localStorage `mygenie_sidebar_expanded` (162 references across pages — **R8: key must not change**).
- `Sidebar.jsx:490-497` `<aside className="h-screen flex flex-col … flex-shrink-0 relative" style={{ width: isExpanded ? 280 : 70 }}>`.
- 94 pages mount `<Sidebar>`; wrappers are `flex h-screen …` (≈80 pages — inner scroll, sidebar never scrolls away) vs `flex min-h-screen` (DashboardPage L1668 + 3 others — body scroll → scroll-away).
- CR-052 hover flyout (L279-281, L682) for collapsed mode.

### 3.2 Design implications
| Concern | Finding |
|---|---|
| Self-contained (owner trap) | Achievable: Sidebar reads its own `matchMedia('(max-width: 1279px)')`; in tablet mode it renders (i) a slim in-flow rail or floating hamburger button and (ii) a `fixed` slide-over drawer + backdrop. No page file edits. |
| localStorage | Drawer open/close must be **local state**, never call `setIsExpanded` → otherwise tablet toggles overwrite desktop preference in `mygenie_sidebar_expanded`. Drawer always renders expanded (280px) content. |
| Desktop pin | `sticky top-0` on `<aside>` fixes scroll-away on the 4 `min-h-screen` pages **without editing DashboardPage.jsx**. → `DashboardPage.jsx` (R5) can likely drop out of WP-B → WP-B risk HIGH → **MEDIUM** (owner approval needed to downgrade — OD-555-15). |
| Placement | In-flow rail vs floating button affects every page header (most use `px-8`, title/back button at left) — **OD-555-12b** design decision, to be mocked by design agent. |
| Flyout | CR-052 flyout irrelevant in drawer mode (drawer shows full tree); must remain intact ≥1280. |
| Navigation | Drawer closes on route change and on backdrop tap; Escape closes. |
| Dashboard Header | Dashboard top Header also scrolls away on tablet (sits inside min-h-screen column). Not owner-reported; making it sticky would be a DashboardPage/Header change → **out of scope unless owner adds it (OD-555-16)**. |

### 3.3 Downstream
All 94 pages; logout, Switch Restaurant (CR-166), sound toggle, Printers shortcut (CR-355), view toggles (table/order, channel/status). QA: 5 representative pages × 3 viewports + 1920 regression.

---

## 4. WP-C — Header tablet mode <1280 + Add visible ≤600 (MEDIUM) — FOURTH

### 4.1 Code reality
`Header.jsx` is mounted **only by DashboardPage** (import `../components/layout`). CR-414 breakpoints are all `lg` (1024): L271 pills `hidden lg:flex`, L339 tablet dropdown `lg:hidden`, L428 PlatformDropdown `hidden lg:flex`, L433 `px-2 lg:px-4`, L438 counter chip `hidden lg:flex`, L441 search `flex-1 lg:flex-initial min-w-0`, L445 `lg:w-64/lg:w-48`, L483 results popover `lg:` positioning. Add group L765-787 `flex items-center gap-3` (no shrink protection).

### 4.2 Change surface
| # | Edit | Effect |
|---|---|---|
| C1 | `lg:` → `xl:` on the 8 CR-414 header sites | tablet header (dropdown instead of pills) up to 1279 → closes 1024–1077 gap (iPad landscape) |
| C2 | Add group `flex-shrink-0`; label `hidden sm:inline` (icon-only <640) | Add visible at 533–600 portrait |
| C3 | Keep `ChannelColumnsLayout.jsx:107` at 1023 | OD-555-10 — grid stacking unchanged |

Risk: CR-414 test/QA expectations reference 1024 for header → CR-414 QA handover cases must be updated to 1280 for header items only. Sequence after CR-414 QA PASS (§0).

---

## 5. Files

**WILL change (candidates, final list at Gate 3):**
- WP-A: `components/order-entry/OrderEntry.jsx` (R5, layout classes L1666–1863 + overlay block), `components/order-entry/CategoryPanel.jsx` (L32)
- WP-D: 39–40 × `pages/reports-module/*.jsx` (class-only)
- WP-B: `components/layout/Sidebar.jsx`
- WP-C: `components/layout/Header.jsx`

**WILL NOT touch:**
- `CollectPaymentPanel.jsx`, `CartPanel.jsx` (if OD-555-12 = a) · `DashboardPage.jsx` (if OD-555-15 accepted) · `ChannelColumnsLayout.jsx` · any of the 94 Sidebar host pages · `orderTransform.js` · `AppProviders.jsx` · `manifest.json` (OD-555-09) · any API/service/transform/localStorage key · `config/firebase.js` (BUG-560)

**Hotspot count:** 1 (OrderEntry.jsx) if OD-555-12=a and OD-555-15 accepted; 3 otherwise → Gate 4 owner approval required either way (R5).

---

## 6. Risk Register
| # | Risk | WP | Sev | Mitigation |
|---|---|---|---|---|
| R-1 | Overlay remounts Order Entry → cart lost | A | HIGH | overlay as sibling layer; QA rotate mid-cart |
| R-2 | Shrinking right pane breaks CPP rows (money UI) | A | HIGH | OD-555-12 = a (keep 384) |
| R-3 | Category labels truncate at 128px | A | LOW | design mockup; `truncate` + title |
| R-4 | Tablet drawer writes `mygenie_sidebar_expanded` | B | MED | local drawer state only |
| R-5 | Hamburger overlaps 94 page headers | B | MED | OD-555-12b + design mockup |
| R-6 | CR-052 flyout regress on desktop | B | MED | ≥1280 path unchanged; QA hover |
| R-7 | Typo/miss across 40 report files | D | LOW | scan script re-run post-edit = 0 NOWRAP |
| R-8 | CR-414 QA invalidated by lg→xl | C | MED | WP-C after CR-414 QA; update its cases |
| R-9 | Desktop ≥1280 visual change | all | MED | 1920×800 regression screenshots per WP |

---

## 7. Owner Decisions surfaced (R3 — not guessed)
| ID | Question | Options | Agent recommendation |
|---|---|---|---|
| **OD-555-12** | Order Entry right pane (cart / Collect Payment) width <1280 | a) keep 384px, shrink category + wrap middle header · b) 320px (CPP internals re-verified/edited) | **a** — CPP + CartPanel leave scope (−1 R5, no R6 proximity) |
| **OD-555-12b** | Sidebar tablet trigger | a) slim in-flow rail (~56px) with hamburger · b) floating hamburger button over page header | **a** — no overlap with 94 page headers; decide after design mockups |
| **OD-555-13** | Rotate overlay trigger rule | a) `(orientation: portrait) and (max-width: 1279px)` · b) any viewport `< 800px` wide · c) a OR b | **c** — covers tablets in portrait + the 800 floor |
| **OD-555-14** | WP-D scope count | a) all 39–40 files found at HEAD · b) only the 34 from investigation | **a** (matches OD-555-06 intent "all") |
| **OD-555-15** | Downgrade WP-B HIGH → MEDIUM if `DashboardPage.jsx` is not touched (sticky on Sidebar only) | approve / keep HIGH | approve (umbrella risk stays HIGH via WP-A) |
| **OD-555-16** | Dashboard top Header also scrolls away on tablet — add to scope? | a) out of scope (not reported) · b) add sticky header (DashboardPage/Header edit) | a — log as follow-up |

---

## 8. Next (OD-555-11 pipeline)
1. Owner answers OD-555-12..16.
2. **Design agent** — tablet mockups at 893×533 / 1006×600 / 533×893 for: Order Entry (category 128 + wrapping header + 384 cart), rotate overlay, Sidebar rail+drawer, Dashboard header <1280 + icon-only Add, one report toolbar wrapped (Settlement).
3. Owner design review → PLANNING Gate 3 (exact line edits + Verification Matrix + Registry Checklist) → Gate 4 GO.

---

## 9. Owner Decisions — LOCKED 2026-10-15 (Gate 2 closed)
Owner: "I'm okay with the design suggestions and the suggestion which we have given… close impact analysis."

| ID | Locked decision |
|---|---|
| OD-555-12 | **a** — right pane stays 384px; CategoryPanel 128px <1280; middle `min-w-0` + 2-row wrapping header. **CollectPaymentPanel.jsx + CartPanel.jsx OUT of scope.** |
| OD-555-12b | **a** — slim in-flow 56px rail + hamburger <1280 → fixed 280px drawer + backdrop |
| OD-555-13 | **c** — overlay when (portrait AND <1280) OR width <800 |
| OD-555-14 | **a** — all 39–40 report toolbars at HEAD |
| OD-555-15 | **APPROVED** — WP-B HIGH→MEDIUM; `DashboardPage.jsx` NOT touched (sticky on Sidebar only). Rationale: no R5 file in WP-B. |
| OD-555-16 | **a** — Dashboard Header not sticky (out of scope) |
| OD-555-17 | **Layout-only** — design review page is illustrative. Existing components, colours, fonts, icons, styling unchanged; only width/wrap/breakpoint classes + rotate-overlay and drawer shells (reusing current Sidebar styling). Desktop ≥1280 pixel-identical. |
| OD-555-18 | **Static rotate icon** (added 2026-10-15 at Gate 3 revalidation) — overlay icon has no animation; mockup's "slowly tilting" note dropped. Blur + 96px icon + approved copy kept. See `plans/BUG-555_PLAN_REVALIDATION_2026_10_15.md` F4. |

**Gate 3 revalidation (2026-10-15):** plan re-verified line-by-line against HEAD — all anchors match. Amendments accepted by owner: F1 (`max-sm:` on Add button — protects OD-555-17), F2 (`gap-y-2`), F3 (`ml-auto` icon group), F5 (`absolute` overlay), F7 (backdrop blur), F8 (`invisible`/`inert`/dialog on closed drawer), F9 (Header L337 comment), F10/F11 (text), F14 (scripted WP-D edit), F15 (chip wrap tolerance). Plan is now **v2**.

**Final scope lock for Gate 3:**
- WILL change: `OrderEntry.jsx` (R5, layout classes + overlay), `CategoryPanel.jsx`, `Sidebar.jsx`, `Header.jsx`, 39–40 × `pages/reports-module/*.jsx`
- WILL NOT touch: `CollectPaymentPanel.jsx`, `CartPanel.jsx`, `DashboardPage.jsx`, `ChannelColumnsLayout.jsx`, 94 Sidebar host pages, `orderTransform.js`, `AppProviders.jsx`, `manifest.json`, any API/transform/localStorage key, `config/firebase.js`
- Hotspots: **1** (OrderEntry.jsx) → Gate 4 owner GO still required (R5)
- Approved design: `frontend/public/bug555-tablet-design-review.html` + `/app/design_guidelines.json`

**Next:** PLANNING Gate 3 — Implementation Plan (WP-A → WP-D → WP-B → WP-C) with Verification Matrix + Registry Checklist.
