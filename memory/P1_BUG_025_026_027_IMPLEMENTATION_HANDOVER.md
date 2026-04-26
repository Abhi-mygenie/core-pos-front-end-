# P1 BUG-025 / BUG-026 / BUG-027 Implementation Handover

> **Audience**: next Implementation Agent.
> **Mode**: documentation only — no code changes performed in this pass.
> **Date**: Feb 2026 (post `roomv3` Station Panel realtime ship).
> **Source of truth ranking**: 1) Code, 2) `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md`, 3) `/app/memory/BUG_TEMPLATE.md`, 4) other `/app/memory/*` handovers.

---

## Scope

This handover is **strictly limited** to the following three P1 frontend bugs surfaced during the Station Panel realtime work. No other bugs are addressed here.

| Bug | One-liner |
|---|---|
| **BUG-025** | OrderCard / DineInCard "Served" dropdown silently drops cancelled items — they must remain visible. |
| **BUG-026** | Station Panel aggregates items by `food_details.name` only; items with different variants/add-ons collapse into one row. |
| **BUG-027** | Room Check-In modal collects an "Advance" amount but never captures HOW it was paid (cash/card/UPI/etc.). |

---

## References Checked

### Architecture / decisions
- `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md` — surveyed AD-001…AD-901. **No locked decision** covers cancelled-item card visibility (BUG-025), Station Panel aggregation key (BUG-026), or advance-payment-method capture (BUG-027). Closest adjacent decisions:
  - `AD-002` — socket event remove-vs-update semantics (orthogonal).
  - `AD-013A` — service-charge gating (room branch caveat noted, unrelated to advance payment-method).
  - `AD-401 / AD-402` — financial ownership phases (frontend constructs values; backend persistence not formally locked for advance method).

> ⚠️ The user's task description referred to `/app/memory/v3/ARCHITECTURE_DECISIONS_FINAL.md`. That path does **not** exist. The actual file lives at `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md` (referenced by `PRD.md:300`).

### Bug docs (current state)
- `/app/memory/BUG_TEMPLATE.md`
  - BUG-025 detail at lines **2431–2504**.
  - BUG-026 detail at lines **2507–2611**.
  - BUG-027 detail at lines **2615–2697**.
  - BUG-022 (cancelled strikethrough in CollectPaymentPanel main bill summary, line ~28) — already shipped; pattern reusable for BUG-025 visual styling.

### Code (read-only review)
- `/app/frontend/src/components/cards/OrderCard.jsx` (full file).
- `/app/frontend/src/components/cards/DineInCard.jsx` (full file).
- `/app/frontend/src/components/station-view/StationPanel.jsx` (full file).
- `/app/frontend/src/api/services/stationService.js` (full file, incl. B2 defensive filter at L143–149).
- `/app/frontend/src/contexts/StationContext.jsx`.
- `/app/frontend/src/components/modals/RoomCheckInModal.jsx` (full file).
- `/app/frontend/src/api/services/roomService.js` (full file).
- `/app/frontend/src/api/transforms/orderTransform.js` — `fromAPI.orderItem` (lines 83–115), `cancelItem` (lines 521–555), `isCheckInMarker` carve-out (lines 220–230, 662, 834).
- `/app/frontend/src/components/order-entry/CartPanel.jsx` — cancelled-item rendering (lines 17, 33, 49–180).

### Module / requirement docs
- `/app/memory/STATION_PANEL_REALTIME_HANDOVER_v3.md` — context for the realtime work that surfaced these bugs.
- `/app/memory/ROOM_MODULE_REQUIREMENTS_V2.md`, `room_module_open_questions_answered.md`, `ROOM_CHECKIN_UI_REFINEMENT_V2_1.md` — reference for room check-in UI conventions.
- `/app/memory/PRD.md` §9 — backlog summary.

---

## Executive Summary

| Bug | Layer | Backend dependency | Confidence |
|---|---|---|---|
| BUG-025 | Frontend only | None | **Confirmed** root cause: filter excludes `cancelled` and there's no third bucket. |
| BUG-026 | Frontend only (aggregation) | None for fix; **owner decision needed** on display format | **Confirmed** root cause: aggregation key uses only `food_details.name`. |
| BUG-027 | Frontend + **Backend contract change required** | **Yes** — new field on `ROOM_CHECK_IN` endpoint payload + persistence + (later) reports | **Confirmed** frontend gap; **suspected** backend gap (needs backend-team confirmation on field name). |

> **All three are independent.** They can be implemented in any order. BUG-025 is the smallest; BUG-027 is the most cross-functional.

---

## Approval Status

- **Ready for implementation:** **YES (partial)** — owner answers received Feb 2026. BUG-025 and BUG-027 are unblocked; BUG-026 is unblocked **except** the parser shape (Q4), which depends on a live payload Abhishek will share before parser code is written.

### Locked Decisions (Owner — Abhishek, Feb 2026)

**BUG-025**
- **Q1 → Single dropdown.** Use the **existing** `▼ Served (n)` collapsible. Cancelled items go inside the **same** dropdown next to served items. **Do NOT add a separate `▼ Cancelled` toggle.** The dropdown count `n` includes both served + cancelled items.
- **Q2 → Strikethrough-only treatment.** No reason text, no `cancel_at` timestamp. Visual treatment matches the BUG-022 pattern (strikethrough name + price + grey colour + `(Cancelled)` label trailing).
- **Q3 → Grey `#9CA3AF`.** Reuse BUG-022 colour token.

**BUG-026**
- **Q4 → Pending live payload.** Abhishek will share a captured network response for `POST /api/v1/vendoremployee/station-order-list` on a multi-variant order. Parser code in `OrderCard.jsx:412–423` is **not to be touched** until the payload arrives — the aggregation work in `stationService.js` can proceed in parallel since it only requires the existing `variation` / `add_ons` / `food_level_notes` fields (already present, even when empty).
- **Q5 → Chef-readability recommendation locked:** **variant inline with em-dash on the main line**, add-ons as a small italic sub-line, food-level notes as another small sub-line.
  - Main line: `Test Biryani — Half` ........ count
  - Sub-line 1 (italic, smaller, grey): `+ Extra Raita`
  - Sub-line 2 (italic, smaller, grey): `Note: less spicy`
  - Rationale: keeps the count column aligned (no horizontal overflow at `ultra` density 210px), variant always visible at a glance, modifiers read clearly as secondary information.
- **Q6 → Notes are part of the signature.** Items with same variant + same add-ons but different `food_level_notes` render as **separate rows**.

**BUG-027**
- **Q7 → Field name = `payment_method`** (matches restaurant convention from `orderTransform.js:191–192, 595, 671, 762`). Backend team to confirm acceptance on the `ROOM_CHECK_IN` endpoint contract.
- **Q8 → Single-tender, dynamic option list filtered to Cash / Card / UPI only.**
  - Pull payment types from `restaurant.profile.paymentMethods` (existing dynamic source per `profileTransform.js:95`).
  - Filter the rendered options down to the intersection of `{cash, card, upi}` (3 hardcoded keys for v1).
  - **No** split-tender, **no** auto-default for Online / Corporate booking sources — operator must pick explicitly.

### Remaining Blocker

- **(BUG-026)** Live payload capture for variant-shape parser (Q4). Aggregation work can ship without it; parser refinement waits.

---

## BUG-025 — OrderCard/DineInCard Served Dropdown Cancelled Items Visibility

### Current Behavior

- `OrderCard.jsx` partitions `order.items` into exactly two buckets:
  - **`activeItems`** (`OrderCard.jsx:152`): `items.filter(i => i.status !== "served" && i.status !== "cancelled")` — explicitly excludes cancelled.
  - **`servedItems`** (`OrderCard.jsx:153`): `items.filter(i => i.status === "served")` — only served.
  - **No bucket** for `i.status === "cancelled"`. Cancelled items are silently dropped from the entire card render.
- `DineInCard.jsx:21–23` mirrors the same gap:
  ```js
  const preparingItems = orderData.items.filter(item => item.status === "preparing");
  const readyItems     = orderData.items.filter(item => item.status === "ready");
  const servedItems    = orderData.items.filter(item => item.status === "served");
  // No cancelledItems bucket.
  ```
- The order detail / Cart Panel screen DOES render cancelled items correctly with strikethrough (`CartPanel.jsx:33` — `const isCancelled = item.status === 'cancelled'`) and the order entry / collect-bill screens already shipped BUG-022 styling (strikethrough + grey + "(Cancelled)" label) — proving the data carries `status === 'cancelled'`; only the dashboard card render hides it.
- Status field that flags cancellation on items: **`item.status === 'cancelled'`** (string, normalized in `orderTransform.fromAPI.orderItem`). Backing API field: `food_status === 3` (mapped via `F_ORDER_STATUS` in `api/constants.js:127`).

### Expected Behavior

- The order card must surface cancelled items so cashier / kitchen / waiter can see them without opening the order detail screen.
- Visual treatment: strikethrough text + grey colour + "(Cancelled)" label, matching the existing pattern shipped for BUG-022 in `CollectPaymentPanel.jsx`.
- Cancelled items must be **excluded from order totals** (already true today — `order.amount` and downstream financial fields exclude cancelled lines per `orderTransform.js:662, 834`). The fix is **purely visual** — make them visible without touching billing math.
- No action chips (Mark Ready / Mark Served) on cancelled rows. `getItemActionConfig(item)` already returns `null` for non-`preparing`/non-`ready` statuses (`OrderCard.jsx:237–241`), so the existing gate naturally suppresses chips for cancelled.

### Code References

| File | Lines | Purpose |
|---|---|---|
| `frontend/src/components/cards/OrderCard.jsx` | 152–153 | `activeItems` / `servedItems` filter. **Add a `cancelledItems` filter here.** |
| `frontend/src/components/cards/OrderCard.jsx` | 512–551 | `▼ Served (n)` collapsible block. **Mirror this block for cancelled.** |
| `frontend/src/components/cards/DineInCard.jsx` | 21–23 | Item partitioning. **Add `cancelledItems`.** |
| `frontend/src/components/cards/DineInCard.jsx` | 163–188 | `▼ Served Items (n)` collapsible block. **Mirror for cancelled.** |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | (BUG-022 ship) | Reference style for strikethrough + "(Cancelled)" label. |
| `frontend/src/api/transforms/orderTransform.js` | 83–115, 537 | Confirms `status: 'cancelled'`, `cancelAt`, `cancel_type` are preserved through the transform. |
| `frontend/src/api/constants.js` | 127 | `F_ORDER_STATUS = { 3: 'cancelled' }`. |

### Root Cause

**Confirmed.** Pure UI omission in `OrderCard.jsx` and `DineInCard.jsx`. Data layer is fine; render layer never partitions a `cancelled` bucket and never mounts a section to display it.

### Proposed Fix Plan (high level — implementation agent to confirm)

1. In `OrderCard.jsx`:
   - Add `const cancelledItems = items.filter(i => i.status === 'cancelled');`
   - Below the `servedItems` collapsible block (after L551), add a parallel `▼ Cancelled (n)` collapsible block:
     - Independent `useState` toggle (`showCancelled` / `setShowCancelled`).
     - Same touch-target sizing as the Served toggle (`min-h-[40px]`, chevron, `data-testid="cancelled-toggle-${orderId}"`).
     - Each cancelled row: strikethrough `item.name (item.qty)` + grey colour + `(Cancelled)` label. Reuse colour tokens from BUG-022 (`#9CA3AF`).
     - **No** action chips, **no** food-transfer button.
2. In `DineInCard.jsx`: mirror the same change at L21–23 (filter) and L163–188 (render block).
3. **No changes** to `order.amount`, `activeItems`, `servedItems`, transforms, or APIs.

### Files Likely To Change

- `frontend/src/components/cards/OrderCard.jsx`
- `frontend/src/components/cards/DineInCard.jsx`

### Files Not To Change

- `orderTransform.js` (cancellation metadata is already correct).
- `api/constants.js` (`F_ORDER_STATUS` map is correct).
- Any billing / collect-bill / print path (cancelled items are already excluded from totals; do **not** re-touch math).
- `CartPanel.jsx` / `CollectPaymentPanel.jsx` (already render cancelled correctly).

### Edge Cases

- **Order with only cancelled items, nothing else.** Empty `activeItems`, empty `servedItems`. Today the card shows "No active items". After fix, the `▼ Cancelled (n)` block must still render. Behaviour of the footer action button (`fOrderStatus === 1 → Ready`) for an all-cancelled order is unchanged.
- **Cancelled item that was previously served (post-serve cancel).** `cancel_type: 'Post-Serve'` per `orderTransform.js:537`. After the cancel, transform should set `status: 'cancelled'` (verify with live capture). Item should then move from Served bucket → Cancelled bucket on the next refresh.
- **Order-level cancel (whole order).** All items become cancelled. The card itself is already pulled from the dashboard via `update-order-source` / `update-order-paid` socket events (per AD-002). The cancelled-bucket render must not break for the brief window before the card is removed.
- **Item with cancelled status but no `cancelAt` / no reason.** Render must not crash on missing optional fields — guard with `?.` access.
- **Realtime refresh** — cancelled items should appear immediately on next debounced fetch from `useStationSocketRefresh` or equivalent order-list refresh; no separate listener changes needed for BUG-025.

### Test Scenarios

| # | Steps | Expected |
|---|---|---|
| T1 | Place dinein order with 4 items → from Order Entry, cancel 1 item (Pre-Serve) → return to dashboard. | Card shows 3 active items + `▼ Cancelled (1)` toggle. Expand → cancelled row strikethrough + grey + "(Cancelled)". |
| T2 | Same as T1 but mark 2 items Served first, then cancel 1 of the remaining. | `▼ Served (2)` and `▼ Cancelled (1)` both render, independently expandable. |
| T3 | Cancel after Mark Ready (Post-Serve cancel). | Cancelled row appears in `▼ Cancelled (n)` block; `cancel_type` is "Post-Serve" in transform; chip behaviour unaffected. |
| T4 | Order with only cancelled items. | Active section shows "No active items"; `▼ Cancelled (n)` is the only item bucket. |
| T5 | Order amount / total field. | Unchanged — cancelled lines remain excluded from `order.amount`. |
| T6 | DineInCard view (table grid). | Same `▼ Cancelled (n)` collapsible appears, mirroring Served. |

### Risks / Regression Areas

- **Layout overflow** — adding a third collapsible may push card height past current 4-cards-per-row breakpoint. Verify with multi-status orders in 1280px / 1920px viewports.
- **Action button gating** — the per-item action chip (`getItemActionConfig`) returns `null` for cancelled, but the surrounding `showItemAction` logic must be inspected to confirm cancelled rows in the new block don't accidentally render a chip.
- **Snooze / engaged overlay** must continue to gray out the new section.
- **`isYetToConfirm` orders** — these states may not allow cancellation; the new block should still render gracefully (`cancelledItems.length === 0` → block hidden).

### Open Questions

1. Separate `▼ Cancelled (n)` vs unified `▼ Completed (n)` (Served + Cancelled merged)? **Owner decision.**
2. Show cancel reason / cancel timestamp in collapsed view, on expand only, or never? **Owner decision.**
3. Colour token for cancelled — reuse BUG-022 grey `#9CA3AF` or pick a distinct red-tinted "danger" colour? **Owner decision.**

---

## BUG-026 — Station Panel Variant/Add-on Signature Split

### Current Behavior

- `frontend/src/api/services/stationService.js:140–177` aggregates kitchen items into a category map keyed only by **`food_details.name`**:
  ```js
  const foodName = item.food_details?.name || 'Unknown Item';
  // ...
  const itemsMap = categoryMap.get(categoryName);
  const currentCount = itemsMap.get(foodName) || 0;
  itemsMap.set(foodName, currentCount + quantity);
  ```
- Two physical lines with same `food_details.name` but different `variation[]` / `add_ons[]` / `food_level_notes` collapse to a single map entry → chef sees `Test Biryani × 2` with no information about which one is Half and which one is Full.
- Variation / add-ons / notes are present in `order_details_food[*]` (verified — `orderTransform.js:105–106` reads `detail.variation`, `detail.add_ons`; live capture for order #731715 showed empty arrays present even when no variants — so the shape is reliably available).
- `OrderCard.jsx:412–430` parses `variation[*]` for inline display on the order card. The current parser handles three shapes (`string`, `{name, labels[]}`, `{name, value/option_label/label/selected_option}`) — but for some catalog items it falls through to **name-only**, displaying bare `Size` without `Half`/`Full`. This is a separate-but-related gap also captured under BUG-026.

### Expected Behavior

- Items with **different variant signatures** OR **different add-on signatures** OR (optionally) **different `food_level_notes`** must render as **separate rows** on the Station Panel.
- Items with **identical** signatures may continue to be grouped (count ≥ 2) — this is the current "aggregation" benefit and should be preserved.
- The variant value AND add-on summary must be visible inline on the Station Panel row so the chef can read it without expanding anything. Format (TBD by owner): `Test Biryani — Half [+ Extra Raita]` or `Test Biryani (Half) +Raita`.
- (Stretch) Item-level notes (`food_level_notes`) should also be visible to the chef — currently dropped entirely.
- On the order card (BUG-026 sub-issue 2.1), the variant value must display next to the variant name, e.g., `Size: Half`. If no value is parseable, **suppress** the variant subtitle entirely (do not render a bare `Size` label that confuses more than helps).

### Code References

| File | Lines | Purpose |
|---|---|---|
| `frontend/src/api/services/stationService.js` | 140–177 | **Primary fix.** Replace the `foodName`-only key with a `signature` key that incorporates variant + add-on (+ optional notes). |
| `frontend/src/api/services/stationService.js` | 180–188 | Output shape — currently `{ name, count }`. May need `{ name, count, variantLabel, addonLabel, notes }`. |
| `frontend/src/components/station-view/StationPanel.jsx` | 82–106 (`StationItemRow`) | **Render path.** Currently shows `itemName` only. Needs to render variant/add-on inline (or as a sub-line). |
| `frontend/src/components/station-view/StationPanel.jsx` | 159–166 (`CategorySection`) | Where items are mapped — keys must remain stable when signature is added. |
| `frontend/src/components/cards/OrderCard.jsx` | 412–430 | Variant/add-on parser for the dashboard card (sub-issue 2.1). |
| `frontend/src/api/transforms/orderTransform.js` | 102–106 | `fromAPI.orderItem` already passes `variation` + `addOns` arrays — no transform change required, but could expose a normalized `variantLabel` string here for downstream consumers. |
| `frontend/src/hooks/useStationSocketRefresh.js` | (existing) | Already triggers refresh on `update-order` / `update-item-status` / `update-food-status` / `update-order-paid` (filtered to `{2,3}`). **No event-listener change required for BUG-026** — the fix is in the aggregation step, which runs on every refresh. |

### Root Cause

**Confirmed for the aggregation half**: `stationService.js` keys the inner map purely by `food_details.name`, discarding all per-line modifiers.

**Suspected for the parser half** (sub-issue 2.1): `OrderCard.jsx:412–423` parser doesn't recognise the field shape backend sends for some catalog items (e.g., Test Biryani with `Size` variant). **Cannot be confirmed without a live captured payload** — see Open Question #3.

### Proposed Fix Plan (high level — implementation agent to confirm)

1. **Build a per-line signature** in `stationService.fetchStationData` aggregation loop. Suggested shape (subject to owner approval — see Open Q #5):
   ```js
   const variantSig = (item.variation || []).map(v => `${v.name}=${(v.labels||[v.value||v.option_label||v.label||'']).join('|')}`).sort().join(';');
   const addonSig   = (item.add_ons || []).map(a => `${a.name||a.addon_name}=${a.quantity||1}`).sort().join(';');
   const noteSig    = (item.food_level_notes || '').trim();
   const signatureKey = `${foodName}∷${variantSig}∷${addonSig}∷${noteSig}`;
   // Use signatureKey as the inner-map key. Preserve foodName + parsed labels in the value.
   ```
2. **Extend the per-row output** to carry variant + add-on display strings:
   ```js
   itemsMap.set(signatureKey, {
     name: foodName,
     variantLabel,    // e.g., "Half"
     addonLabel,      // e.g., "+ Extra Raita"
     notes,           // optional
     count: prevCount + quantity,
   });
   ```
3. **Update `StationItemRow`** in `StationPanel.jsx:82–106` to render the variant/add-on label inline (or on a sub-line — owner decision). Keep dotted-line + count column intact.
4. **Re-test** with a live multi-variant order to confirm parser correctly extracts the value field. If parser still returns name-only, capture the payload and extend the parser shape table in `OrderCard.jsx:412–423` AND `stationService.js`.
5. **No changes** to socket listeners, debounce timing, B2 defensive filter, or transform shapes.

### Files Likely To Change

- `frontend/src/api/services/stationService.js` (aggregation key + output shape).
- `frontend/src/components/station-view/StationPanel.jsx` (`StationItemRow` render + maybe `CategorySection` keying).
- `frontend/src/components/cards/OrderCard.jsx` (variant parser fall-through fix — sub-issue 2.1, only after live payload captured).

### Files Not To Change

- `useStationSocketRefresh.js` — listener rules just shipped; aggregation fix is independent.
- `orderTransform.js` — `fromAPI.orderItem` already preserves variation/add-ons; only **add** a label helper if explicitly needed.
- `StationContext.jsx` — state model is fine.
- B2 defensive filter at `stationService.js:143–149` — keep as-is until BUG-024 backend cascade lands.

### Edge Cases

- **Item with empty `variation: []` and empty `add_ons: []`.** Signature collapses to `foodName∷∷∷` — same key for all such items, so they correctly aggregate (count ≥ 2). Preserves existing benefit for non-customised items.
- **Item with same variant but different add-on.** Different signature → separate rows. ✅
- **Item with same variant + add-on but different `food_level_notes`.** Owner decision via Open Q #5 — split or merge?
- **Variant label parse fails (no recognised value field).** Fall back to **suppressing** the variant subtitle on the card (per Expected Behavior); on Station Panel, fall back to `foodName` only with a console warning so the parser shape gap is observable.
- **Add-on quantity > 1** (e.g., `+ 2 × Extra Raita`). Signature must include quantity to avoid merging "1 raita" with "2 raita" lines.
- **Multi-variant items** (multiple variant groups, e.g., Size + Spice Level). Sort signature components for stability across reorderings.
- **Catalog renamed mid-session** — `food_details.name` change between calls would split rows, but this is an edge case with no clean answer; document as known limitation.
- **B2 defensive filter** still skips `food_status !== 1` — cancelled / ready items are NOT shown on the kitchen panel regardless of signature.
- **Check-in marker items** (`isCheckInMarker: true`) — these are a hospitality artefact and must NOT appear on the Station Panel. Currently they are not in `order_details_food` (they are a synthetic item at cart level, see `orderTransform.js:230`). Verify on next live capture; if they ever leak into station-list, add `!item.isCheckInMarker` filter.

### Socket/Event Impact

- **`new-order`** — when a fresh order with variants arrives, listener triggers a station-list refetch via debounced `fetchStationData`. The new aggregation key naturally splits the variant rows on next render. **No event-listener change.**
- **`update-order` / `update-item-status` / `update-food-status`** — same refetch path. New signature key works automatically.
- **`update-order-paid` (status `{2,3}`)** — same refetch path.

> The Station Panel realtime listeners (`useStationSocketRefresh.js`) operate at the order/item-status level. The aggregation key change is downstream of the fetch, so **no event listener needs touching.**

### Test Scenarios

| # | Steps | Expected |
|---|---|---|
| T1 | Place dinein order: 1 × `Test Biryani (Half)` + 1 × `Test Biryani (Full)`. | Station Panel shows two rows: `Test Biryani — Half  1` and `Test Biryani — Full  1`. |
| T2 | Place dinein order: 2 × `Test Biryani (Half)`. | Station Panel shows one row: `Test Biryani — Half  2`. |
| T3 | Place order: 1 × `Test Biryani (Half)` + 1 × `Test Biryani (Half) + Extra Raita`. | Two rows — variant same, add-on differs. |
| T4 | Place order with item having no variants and no add-ons. | Single row, count = qty (existing behaviour preserved). |
| T5 | Open dashboard order card for T1. | Each row shows `Size: Half` / `Size: Full` instead of bare `Size` (sub-issue 2.1). |
| T6 | Mark one variant Ready → backend cascades → station refreshes. | The Ready row disappears from station panel (B2 filter). The other variant remains. |
| T7 | Cancel one variant. | Same — cancelled row drops from station panel. |
| T8 | Multi-station order (KDS + BAR items). | Each station's panel aggregates independently with the new signature key. |

### Risks / Regression Areas

- **Performance** — signature string built per item per refresh. With ~100 items typical, negligible. Document complexity if it grows.
- **Density layout** — long variant labels may overflow on `ultra` density (210px panel width). `StationItemRow` already has `break-words` on the name span and `min-w-[20px]` on the count column; verify variant label doesn't push the dotted-line away.
- **Order card variant parser change** must NOT affect the existing happy-path (`{name, labels[]}` shape) — test with at least 2 different catalog items.
- **B2 defensive filter** continues to mask BUG-024; do not couple BUG-026 work with B1 backend fix verification.

### Open Questions

1. Variant label parse — need a captured live payload of a Test Biryani-style order to know the exact field shape. Can Abhishek share a screenshot of the browser network response for `POST /api/v1/vendoremployee/station-order-list` on a multi-variant order?
2. Display format on the Station Panel — `Test Biryani — Half [+ Extra Raita]` vs `Test Biryani (Half) +Raita` vs sub-line. Owner pick.
3. Should `food_level_notes` be part of the signature (split on note differences) or just rendered as a sub-line without affecting grouping?
4. Should the order-card variant parser also be extended in this same PR, or kept as a separate sub-ticket?
5. If a parsed variant label is empty, should the Station Panel still split (signature includes empty variant) or merge with the no-variant bucket?

---

## BUG-027 — Room Check-in Advance Payment Method Persistence

### Current Behavior

- Room Check-In modal at `frontend/src/components/modals/RoomCheckInModal.jsx`:
  - Captures `roomPrice` (L1013–1025) and `advancePayment` (L1026–1036) as numeric inputs.
  - Computes `balancePayment` as `roomPrice - advancePayment` (L312–316), rendered read-only at L1040–1045.
  - **No payment-method selector** exists between (or near) `Advance` and the rest of the form. Confirmed by full-file read; `payment_method` / `paymentMethod` does not appear anywhere in the modal.
- Submit handler `handleSubmit` (L496–554) builds the params object passed to `roomService.checkIn` — no `paymentMethod` / `advancePaymentMethod` field.
- API service at `frontend/src/api/services/roomService.js`:
  - `checkIn(params)` builds a `FormData` payload at L45–119.
  - Appends `room_price`, `order_amount`, `advance_payment`, `balance_payment`, `order_note`, `gst_tax`, `firm_name`, `firm_gst` etc.
  - **Never appends** `payment_method`, `advance_payment_method`, `payment_type`, or any tender field. Backend therefore receives the advance amount as an undifferentiated number.
- Reference: `CollectPaymentPanel.jsx` (restaurant flow) DOES capture and submit `payment_method` for in-restaurant settle/collect bill — convention exists; only the room module skipped it.
- `orderTransform.js` already exposes `paymentType` and `paymentMethod` on read (L191–192) and writes them on outbound order payloads (L595, 671, 762).
- The **check-in marker item** (synthetic cart item created on check-in, `isCheckInMarker: true` per `orderTransform.js:220–230`) is filtered out of UI / billing math / print payloads (`orderTransform.js:662, 834`; `CartPanel.jsx:281, 282, 288, 677`). It must remain so — BUG-027 work must not introduce any code path that inflates totals using this marker or surfaces it in the UI.

### Expected Behavior

- When `Advance > 0`, the form must require the operator to pick a payment method.
- UI: a single-select group (Cash / Card / UPI / Wallet / Bank Transfer) directly under or beside the `Advance` input, styled consistent with `CollectPaymentPanel` payment-method picker.
- When `Advance === 0`, picker is hidden / not required.
- When `Advance > 0` and method is empty → block submit with inline error (mirrors Collect Bill).
- Submit payload (`roomService.checkIn` → multipart `FormData`) must append the chosen method using the **agreed field name** (Open Q #1 below).
- Backend must persist the method against the booking/folio so daily reconciliation reports can break advances down by tender.
- Persistence on **reload** of the engaged room order: when the user re-enters the room order screen later (Update Order / Collect Bill / Print Bill flow), the captured advance method must be visible and carried through to:
  - **Collect Bill** screen — the advance line must show `Advance: ₹X (Cash)` (or similar). The CollectPaymentPanel's Cash/Card/UPI selector for the *balance* remains independent of the advance method.
  - **Room order update** payload — should not lose the advance method on subsequent edits.
  - **Print payload** (`buildBillPrintPayload`) — bill template should optionally render the advance breakdown by method, owner-confirmed.
  - **Reload state** — re-fetching the order/folio must hydrate `advancePaymentMethod` back into the UI state.
- Check-in marker carve-out (`isCheckInMarker: true`) is **not** related to the advance amount or method; it stays out of UI / math / print regardless.

### Code References

| File | Lines | Purpose |
|---|---|---|
| `frontend/src/components/modals/RoomCheckInModal.jsx` | 1026–1036 | `Advance` input. **Add payment-method selector adjacent.** |
| `frontend/src/components/modals/RoomCheckInModal.jsx` | 289–290 | State declaration site. **Add `advancePaymentMethod` state.** |
| `frontend/src/components/modals/RoomCheckInModal.jsx` | 442–482 (`validate`) | **Add validation:** when `advance > 0` and method empty → block. |
| `frontend/src/components/modals/RoomCheckInModal.jsx` | 496–554 (`handleSubmit`) | **Append `advancePaymentMethod` to params** passed to `roomService.checkIn`. |
| `frontend/src/api/services/roomService.js` | 45–119 (`checkIn`) | **Append payment-method field to FormData** with backend-agreed key. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | (existing payment-method picker) | **Reference pattern** — option list, radio pills, single-select state. |
| `frontend/src/api/transforms/orderTransform.js` | 191–192, 595, 671, 762 | Existing `payment_method` / `paymentMethod` plumbing on order flows — pattern to mirror. |
| `frontend/src/api/transforms/orderTransform.js` | 220–230, 662, 834 | `isCheckInMarker` carve-out — **must be preserved**; do not couple BUG-027 work to this marker. |

### Root Cause

**Confirmed (frontend):** `RoomCheckInModal.jsx` has no payment-method UI; `roomService.checkIn` does not include any payment-method field in the submit payload. End-to-end gap from form → API → backend.

**Suspected (backend):** API endpoint `API_ENDPOINTS.ROOM_CHECK_IN` likely also lacks any payment-method field in its persistence schema. Needs backend-team confirmation on (a) ability to accept the new field, (b) exact field name, (c) existing-record default for backward compatibility.

### Proposed Fix Plan (high level — implementation agent to confirm)

1. **Coordinate with backend team first** — do NOT ship frontend ahead of contract.
   - Confirm field name (`advance_payment_method` vs `payment_method` vs `advance_pay_type`).
   - Confirm option vocabulary — must align with restaurant `payment_method` enum (cash/card/upi/wallet/bank/online).
   - Confirm backward-compat default for existing bookings (probably `'unknown'` or the frontend-equivalent of `'pending'`).
2. **Add UI** in `RoomCheckInModal.jsx`:
   - New state `advancePaymentMethod` (default `''`).
   - Picker rendered **only** when `Number(advancePayment) > 0`. Reuse `RadioPillGroup` (already present in this file at L123–155) with options derived from `restaurant.profile.payment_methods` (or a hardcoded short list aligned with `CollectPaymentPanel`).
   - Place the picker directly under the `Advance` input, before `Balance`.
3. **Validation** — extend `validate()` (L442–482):
   - If `Number(advancePayment) > 0` and `!advancePaymentMethod` → set `errors.advancePaymentMethod = 'Required when Advance > 0'`.
4. **Submit** — append `advancePaymentMethod` to the params at `handleSubmit` (L504–532).
5. **API** — in `roomService.checkIn`, append the field to FormData (after L104 `advance_payment`):
   - `fd.append('<backend-agreed-field-name>', params.advancePaymentMethod || '');`
6. **Persistence on reload / collect-bill / print** (downstream — separate sub-task once backend lands):
   - Extend the room/order fetch transform to hydrate `advancePaymentMethod`.
   - Surface in `CollectPaymentPanel` advance-line display.
   - Optional bill-print payload extension.

### Files Likely To Change

- `frontend/src/components/modals/RoomCheckInModal.jsx`
- `frontend/src/api/services/roomService.js`
- (Downstream, post backend) `frontend/src/api/transforms/orderTransform.js` (room-info hydration), `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (display only), and `frontend/src/api/transforms/orderTransform.js` `buildBillPrintPayload` (bill template).

### Files Not To Change (for the initial UI + payload PR)

- Any restaurant in-store flow files (`OrderEntry.jsx`, `CartPanel.jsx` body, dashboard cards) — out of scope.
- `isCheckInMarker` filter sites — keep marker out of UI/calc/print as it is today.
- `useStationSocketRefresh.js` — unrelated.
- BUG-025 / BUG-026 files.

### Edge Cases

- **Advance = 0 / empty.** Picker hidden; no validation; no payload field (or empty string per backend contract).
- **Advance > Room Price.** Existing validation already blocks this (`RoomCheckInModal.jsx:469–471`). Ensure new validation runs **before** the advance-validation guard.
- **Online booking source.** Owner Q — default to `Online`/`Gateway` automatically? Or always require a pick?
- **Corporate booking.** Default to `Bank Transfer` / `Credit`? Owner decision.
- **Split-tender** (advance partly cash + partly card). Out of scope for v1 unless owner confirms.
- **Reload of an engaged room.** The hydrated form must show the previously selected method (if backend persists it). If backend returns blank for legacy rows, show empty + warning.
- **Update Order on a Room.** Per `ROOM_CHECKIN_UPDATE_ORDER_FIX_V2.md` flow, update-order does NOT re-collect advance. Fix must NOT introduce a re-prompt during update-order.
- **Collect Bill** for a room — the existing CollectPaymentPanel payment-method picker (for the balance/final settlement) is **independent** of the advance method. Do not couple them.
- **Print Bill** — the bill template currently shows `roomAdvancePay` (per `orderTransform.js` Req-3 work). Owner Q on whether the method label appears next to it.
- **Currency formatting / `to2dp`** — keep existing helper; method field is a string, not a number.

### Collect Bill / Print / Reload Impact

Phased approach is recommended:

| Phase | Scope | Files |
|---|---|---|
| **Phase 1 (this PR)** | Capture method on check-in form, send to backend. | `RoomCheckInModal.jsx`, `roomService.js`, backend endpoint. |
| **Phase 2** | Hydrate method on reload; display on Collect Bill advance line. | `orderTransform.js` (read transform), `CollectPaymentPanel.jsx` (display only). |
| **Phase 3** | Surface method in bill print template + reports. | `orderTransform.buildBillPrintPayload`, hospitality reports backend. |

**Phase 1 is the minimum to ship.** Phases 2–3 require explicit owner sign-off and additional backend coordination.

### Test Scenarios

| # | Steps | Expected |
|---|---|---|
| T1 | Open Check-In modal → enter Room Price 5000, Advance 0. | Method picker hidden. Submit succeeds. |
| T2 | Same modal → Room Price 5000, Advance 1000, no method. | Submit blocked with inline error "Required when Advance > 0". |
| T3 | Room Price 5000, Advance 1000, method = Cash → Submit. | API call includes `<backend-field-name>=cash`. Backend persists. |
| T4 | Reopen the same room (engaged) later. | Hydrated state shows previously selected method (Phase 2). |
| T5 | Click "Update Order" on an engaged room. | NO re-prompt for advance method. Existing update-order flow unchanged. |
| T6 | Click "Collect Bill" → Pay Balance. | Balance is settled with its own (independent) payment-method picker. Advance method is shown for context only (Phase 2). |
| T7 | Print bill on an engaged room. | (Phase 3) Bill optionally shows `Advance: ₹1000 (Cash)`. |
| T8 | Daily reconciliation report. | (Phase 3) Advances broken down by tender. |
| T9 | Check-in marker line never appears in cart, math, or print. | Existing carve-out preserved. |
| T10 | Backward compat: open an engaged room created BEFORE this fix. | Advance method = empty / "Unknown". UI degrades gracefully (no crash, no validation re-prompt). |

### Risks / Regression Areas

- **Backend contract drift.** If backend ships with a different field name than agreed, frontend submit silently no-ops. Mitigation: write an integration test that asserts the FormData body contains the agreed key.
- **Re-prompt loop.** If validation fires on existing bookings missing the method, operators get blocked retroactively. Apply validation only on **fresh check-in submit**, not on update-order or any other flow.
- **Profile flag drift.** `restaurant.checkInFlags.bookingDetails` (L257–259) currently controls whether Booking & Payment block renders at all. The new picker must respect the same gate (no picker if booking details not enabled).
- **Phantom payment-method in math.** The advance-method must be a **label only** (string), not a number. It must NOT touch any total/SC/GST/round-off computation.
- **`isCheckInMarker` carve-out** — verify the new picker doesn't accidentally surface or operate on the marker line.

### Open Questions

1. **Field name** — `advance_payment_method` vs `payment_method` vs `advance_pay_type` vs `payment_type`. Backend team must confirm.
2. **Option list** — exact tender vocabulary. Should we adopt restaurant's `cash | card | upi | wallet | bank | online | pending`, or a hospitality-specific list?
3. **Online booking source** — auto-default to `Online`/`Gateway` or always prompt?
4. **Corporate** — auto-default to `Bank Transfer` or always prompt?
5. **Split-tender** support in v1?
6. **Backward-compat** — for existing bookings missing the field, what value to display in Phase 2 hydration? (`Unknown` / `—` / empty.)
7. **Display in Collect Bill / Print** — Phase 2 + 3 timing; can Phase 1 ship before Phase 2 design is locked?

---

## Final Implementation Checklist

- [ ] **BUG-025 ready** — pending owner answers to Open Qs 1–3 (separate vs unified toggle, reason/timestamp visibility, colour token).
- [ ] **BUG-026 ready** — pending live multi-variant payload capture + display-format + signature-strategy decisions (Open Qs 1–5).
- [ ] **BUG-027 ready** — pending backend field-name contract + option list + booking-source defaults + split-tender decision (Open Qs 1–7).
- [ ] All blocking questions resolved with Abhishek.
- [ ] **Safe to Proceed** approval required before implementation begins.

---

STATUS: BLOCKED — Questions need Abhishek approval
