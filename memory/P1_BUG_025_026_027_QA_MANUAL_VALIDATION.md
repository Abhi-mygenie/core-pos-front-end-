# P1 BUG-025 / 026 / 027 — Manual QA Validation Plan

> **Purpose**: All manual UX verification pending for the 3 P1 fixes implemented in the current session.
> **Audience**: QA / owner / next agent.
> **Date**: Feb 2026.
> **Source spec**: `/app/memory/P1_BUG_025_026_027_IMPLEMENTATION_HANDOVER.md`.
> **Code review status (from QA validation pass)**: ✅ All 3 bugs match locked spec line-for-line. ESLint clean on all 6 modified files. Parser self-test green against live payload (order 731735).
> **Why manual**: The Emergent preview wrapper hides login form inputs from outer Playwright frame, so automated UI tests could not be executed. All steps below must be exercised manually on the live preview URL.

---

## Environment

| Item | Value |
|---|---|
| Preview URL | https://restaurant-pos-v2-1.preview.emergentagent.com |
| Login email | `owner@18march.com` |
| Login password | `Qplazm@10` |
| Restaurant | `18march` (id 478) |
| Backend | preprod (`https://preprod.mygenie.online/`) — live data |
| ⚠️ **Caution** | Use orders that can be cancelled. **Do not** create destructive room bookings. |

If the preview shows the black "Frontend Preview Only" banner, click **Wake up servers** first; backend may take ~30s to boot.

---

## How to read each test
- **PASS criteria** = exactly what must be observed.
- **FAIL signal** = anything else; capture a screenshot + DevTools Network panel + console log if seen.
- **Selector / testid** = use these in DevTools Inspect for confirmation.

---

# BUG-025 — Cancelled items must remain visible on OrderCard / DineInCard

## Locked behavior
Two SEPARATE dropdowns: existing `▼ Served (n)` is unchanged; a NEW independent `▼ Cancelled (n)` collapsible appears below it whenever the order has any cancelled items. Cancelled rows: strikethrough name + qty, grey `#9CA3AF`, trailing `(Cancelled)` label, NO Mark Ready / Mark Served chip, NO food-transfer button. Order total math is untouched.

## T1 — OrderCard: cancel one item on a 4-item dine-in order
1. Login → Order View dashboard.
2. Place a dine-in order with 4 items on any vacant table.
3. Open the order in Order Entry; cancel **1** item (Pre-Serve cancel).
4. Return to Order View dashboard and locate the order card.

**PASS criteria**
- Active section shows 3 items.
- New row `▼ Cancelled (1)` appears below the served toggle (or as the only collapsible if no served items).
- Click `▼ Cancelled (1)` → expands to 1 row:
  - Grey `#9CA3AF` dot on the left.
  - Item name and `(qty)` rendered with **strikethrough**.
  - Trailing `(Cancelled)` label.
  - **No** Mark Ready / Mark Served chip on the right.
  - **No** food-transfer (corner-up) icon on the left.
- Order total `₹X` in card header is unchanged from before the cancel.

**Selectors**
- Toggle button: `[data-testid="cancelled-toggle-${orderId}"]`
- Cancelled row: `[data-testid="cancelled-item-${itemId}"]`

---

## T2 — OrderCard: independent expand of Served + Cancelled
1. On the same order, mark 2 items Served, then cancel 1 of the 2 remaining.
2. Return to dashboard.

**PASS criteria**
- Both `▼ Served (2)` and `▼ Cancelled (1)` toggles render side-by-side (stacked).
- Each toggle expands and collapses **independently** (clicking one does not affect the other).

---

## T3 — OrderCard: Post-Serve cancel
1. On a fresh order, mark 1 item Ready → Serve. Order item now status `served`.
2. From Order Entry, cancel that served item (Post-Serve cancel).
3. Return to dashboard.

**PASS criteria**
- Cancelled row moves from `▼ Served` block → `▼ Cancelled` block on the next refresh.
- No chip on the cancelled row.

---

## T4 — OrderCard: order with only cancelled items
1. Create an order with 1 item; cancel it.

**PASS criteria**
- Active section shows fallback text `No active items`.
- `▼ Cancelled (1)` is the only collapsible visible.
- No layout breakage.

---

## T5 — OrderCard: order total stays unchanged
1. Place a 3-item order with prices ₹100, ₹200, ₹300 → total ₹600 in card header.
2. Cancel the ₹100 item.

**PASS criteria**
- Card header total still shows ₹600 → ❌ FAIL if changed (means math regression).
   - Actually expected: ₹500 if backend recomputes (existing behavior — cancelled lines excluded). Confirm this matches pre-fix behavior on a control order.
- Whatever the existing pre-fix behavior was must remain.

---

## T6 — DineInCard mirror (Table View)
1. Open the Table View (grid of dine-in tables).
2. Find a table whose order has a cancelled item.

**PASS criteria**
- A `Cancelled Items (n)` collapsible row appears below the existing `Served Items (n)` block (note: DineInCard label uses `Cancelled Items` without leading `▼`, matching its existing Served label style — this is intentional and within spec).
- Expand → rows show:
  - Grey `X` icon on the left.
  - Strikethrough name + qty.
  - Trailing `(Cancelled)` label.

**Selectors**
- Toggle: `[data-testid="cancelled-toggle-${tableId}"]`
- Row: `[data-testid="cancelled-item-${itemId}"]`

---

## T7 — Layout sanity at multiple viewports
1. Open the dashboard at viewport widths **1280px** and **1920px**.
2. Find an order with active + served + cancelled items, expanded.

**PASS criteria**
- Card grid still flows correctly (4 cards per row at 1920px; whatever the pre-fix breakpoint was at 1280px).
- No horizontal scroll inside cards.
- No text overflow.

---

## T8 — No chip / no transfer button on cancelled rows
1. Inspect a cancelled row in DevTools Elements panel.

**PASS criteria**
- The cancelled row markup contains NO `[data-testid^="item-action-btn-"]` (Mark Ready/Served chip).
- The cancelled row markup contains NO `[data-testid^="food-transfer-btn-"]`.

---

# BUG-026 — Station Panel must split items by variant / add-on / notes signature

## Locked behavior
Aggregation in `stationService.js` keys on `(food name, variant signature, add-on signature, notes)`. Items with different signatures render as separate rows in **all** densities. Variant inline (`Item — Variant`) + add-ons italic sub-line + notes italic sub-line render **only in `Comfortable` density**. **Compact** and **Ultra** show name-only (rows still split by signature). `OrderCard.jsx` variant parser is **out of scope** (Q4).

## T1 — Comfortable density: 4 split rows with full modifiers
1. Login → click density toggle (testid `station-density-toggle`) to set **Comfortable**.
2. Place a dine-in order with these 4 items on any table:
   - 1× `Fried Chicken 4pc` with `varrient: peri peri`
   - 1× `Fried Chicken 4pc` with `varrient: lemon pepper`
   - 1× `jainss` with `varrient: 30ML` + add-on `cheese`
   - 1× `jainss` with `varrient: 60ML` + add-on `cheese`

**PASS criteria** — Station Panel KDS shows **4 rows** (NOT 2):

```
Fried Chicken 4pc — peri peri ····················· 1
Fried Chicken 4pc — lemon pepper ·················· 1
jainss — 30ML ····································· 1
  + cheese
jainss — 60ML ····································· 1
  + cheese
```
- Em-dash separator visible.
- Add-on `+ cheese` rendered as italic grey sub-line under each `jainss` row.
- Count column right-aligned, dotted line fills space.

**FAIL signals**
- 2 rows instead of 4 → aggregation key not honoring variant.
- Bare `Fried Chicken 4pc — varrient` without a value → variant parser regression.
- No `+ cheese` sub-line → add-on signature not in output shape, or `showModifiers` flag inverted.

---

## T2 — Compact density: name-only render
1. Click density toggle to cycle to **Compact**. Same 4-item order from T1.

**PASS criteria**
- Same 4 rows still rendered (signature split preserved).
- Each row shows ONLY the food name (`Fried Chicken 4pc` / `jainss`) — NO em-dash, NO variant text, NO `+ cheese` sub-line, NO `Note:` sub-line.
- Two `Fried Chicken 4pc` rows side-by-side with no visual differentiator (this is the locked owner trade-off — verified intentional).

---

## T3 — Ultra density: name-only render
1. Cycle density toggle to **Ultra**.

**PASS criteria** — Same as T2 (name-only, 4 rows).

---

## T4 — Aggregation: same signature merges
1. Place 2× `Fried Chicken 4pc` with the SAME variant (e.g., both `peri peri`).

**PASS criteria**
- Station Panel shows 1 row: `Fried Chicken 4pc — peri peri ····· 2` (Comfortable) or `Fried Chicken 4pc ····· 2` (Compact/Ultra).

---

## T5 — Add-on quantity in signature
1. Place 1× `jainss (30ML) + 1× cheese` and 1× `jainss (30ML) + 2× cheese`.

**PASS criteria**
- 2 separate rows. In Comfortable: row 1 sub-line `+ cheese`, row 2 sub-line `+ 2× cheese`.
- In Compact / Ultra: 2 rows both `jainss` (split by signature, name-only).

---

## T6 — Notes are part of the signature (Q6)
1. Place 2× `Fried Chicken 4pc (peri peri)`. On the SECOND one, set `food_level_notes` to `less spicy` via Add Note in cart panel.

**PASS criteria**
- 2 separate rows on Station Panel (NOT merged).
- In Comfortable: second row shows italic sub-line `Note: less spicy`.
- In Compact / Ultra: 2 rows, name-only.

---

## T7 — Plain item with no variant / no add-on / no notes
1. Place 3× of any item with no variant config (e.g., a plain dish).

**PASS criteria**
- 1 row, count `3`, all densities identical (no em-dash, no sub-lines).

---

## T8 — B2 filter still works (regression)
1. With T1 order placed, mark one variant Ready (e.g., `Fried Chicken 4pc (peri peri)`).
2. Wait for socket refresh / click manual refresh.

**PASS criteria**
- That row disappears from Station Panel (food_status≠1 filter intact).
- Other 3 rows remain.

---

## T9 — Multi-station order
1. Place an order containing items routed to 2 different stations (e.g., KDS + BAR).

**PASS criteria**
- Each station's panel aggregates independently.
- Variant/add-on splitting works on both panels.

---

## T10 — Density preference persists
1. Set density to Comfortable, refresh the page.

**PASS criteria**
- Density resets to last-saved value from `localStorage` key `mygenie_station_density`.

---

## T11 — Density toggle visible
1. Inspect the station-panel header.

**PASS criteria**
- Density toggle button is present with `data-testid="station-density-toggle"` and label cycles `Comfortable / Compact / Ultra`.

---

# BUG-027 — Room check-in advance payment method capture (Phase 1)

## Locked behavior
On the Room Check-In modal, when **Advance > 0**, a `Payment Method` picker (Cash / Card / UPI) is rendered. Options are filtered from `restaurant.paymentMethods` to the intersection of `{cash, card, upi}` (Q8). The picker is required when Advance > 0 (Q1 validation). The selected method is sent to backend as FormData field **`payment_method`** (Q7). When Advance changes back to 0, the picker disappears and the state auto-clears. **Phase 2** (reload hydration / Collect Bill display / print) is explicitly **deferred**.

## ⚠️ Backend dependency
Backend acceptance of the new `payment_method` field on the `ROOM_CHECK_IN` endpoint is **suspected but unconfirmed**. If backend silently drops the field, frontend submit succeeds but the value is not persisted. **All T3 / T5 cases require DevTools Network inspection to confirm backend echoes / persists the value.**

## T1 — Picker hidden when Advance = 0
1. Navigate to Room view. Click any vacant room (DoorOpen icon) to open the Check-In modal.
2. Fill required fields (name, phone, primary ID, etc.).
3. Set Room Price = 5000, Advance = 0.

**PASS criteria**
- No Payment Method picker visible.
- Submit succeeds.
- Network tab → POST `/api/...ROOM_CHECK_IN`, FormData has `payment_method=` (empty string).

---

## T2 — Picker appears when Advance > 0
1. From state in T1, change Advance to 1000.

**PASS criteria**
- A `Payment Method *` row (with red asterisk on `*`) appears between the Advance row and Balance row.
- Picker block has `data-testid="checkin-payment-method-block"`.
- Three pills visible: `Cash`, `Card`, `UPI` (assuming all 3 enabled in restaurant profile).
- Pills have `data-testid="checkin-payment-method-cash"`, `-card`, `-upi`.

---

## T3 — Required validation when Advance > 0
1. With Advance = 1000 and NO method picked, click **Submit**.

**PASS criteria**
- Submit blocked.
- Toast `Please fix the highlighted fields`.
- Inline error text below picker: `Required when Advance > 0` (testid `checkin-payment-method-error`, red color).
- No network call to ROOM_CHECK_IN.

---

## T4 — Error clears on pick
1. From state in T3, click `Cash` pill.

**PASS criteria**
- Inline error message disappears immediately.
- The Cash pill is visually selected (highlighted).

---

## T5 — Successful submit with method
1. Open DevTools Network tab. Filter for `group-add` or the `ROOM_CHECK_IN` endpoint.
2. With Advance = 1000 and method = Cash, click Submit.

**PASS criteria**
- POST succeeds (HTTP 200).
- FormData payload (DevTools → Network → Payload tab) contains `payment_method: cash`.
- Toast `Group check-in completed successfully`.
- Modal closes.

**FAIL signal (backend)**
- If backend response does not echo back `payment_method` in any field, OR a subsequent fetch of the booking does not include it → **backend has not yet shipped acceptance.** Frontend fix is functionally a no-op until backend lands. Flag G-027-BE-1 in QA report.

---

## T6 — Auto-clear when Advance drops to 0
1. With Advance = 1000 and method = Cash visible.
2. Change Advance back to 0.

**PASS criteria**
- Picker disappears.
- Internal state cleared (verifiable by re-raising Advance to 1000 → no pre-selection on any pill).
- If picker block was previously erroring, error also clears.

---

## T7 — Profile filter respected
1. In **Restaurant Settings → Payment Methods**, disable `Card` (keep `Cash` and `UPI`).
2. Reload the app. Open Room Check-In modal again. Set Advance = 1000.

**PASS criteria**
- Only `Cash` and `UPI` pills visible.
- `Card` pill absent.

---

## T8 — Profile filter excludes `tab`
1. Confirm restaurant profile has `tab` enabled (typical default).

**PASS criteria**
- Picker does NOT show a `Tab` pill (tab is excluded by Q8 — only the 3 hardcoded keys cash/card/upi are intersected with profile).

---

## T9 — `flags.bookingDetails = false` (gating)
1. If a restaurant exists with the Booking & Payment block disabled (`flags.bookingDetails = false` in profile), open its check-in modal.

**PASS criteria**
- Entire money block (Room Price / Advance / Balance) is hidden, including the new Payment Method picker.
- No re-prompt or validation block triggered.
- (Optional — only if such a restaurant is available; otherwise mark **N/A**.)

---

## T10 — Update Order on engaged room (regression)
1. From the dashboard, find an already-engaged room.
2. Click Update Order.

**PASS criteria**
- NO advance-payment-method re-prompt anywhere in the Update Order flow.
- Update Order behaves identically to before the fix.

---

## T11 — Collect Bill on engaged room (regression)
1. On an engaged room, click Collect Bill / Pay Balance.

**PASS criteria**
- The Collect Bill panel's payment-method picker (for the **balance** settlement) behaves identically to before the fix.
- It is **independent** of any advance method captured at check-in time (Phase 2 hydration is deferred — the advance method does NOT yet appear on the Collect Bill screen, by design).

---

## T12 — Backward compat: existing engaged room
1. Open an engaged room created **before** this fix shipped.

**PASS criteria**
- No crash, no validation re-prompt.
- Phase 2 hydration is deferred → the previously captured advance method (if any) is NOT yet displayed in the UI. This is expected.

---

## T13 — `isCheckInMarker` carve-out preserved (regression)
1. On an engaged room, look at the cart, the bill, and the print payload.

**PASS criteria**
- The synthetic check-in marker line is NOT visible in cart, NOT included in math, NOT in print output (existing behavior).
- The new Payment Method picker does not introduce any code path that surfaces or operates on the marker.

---

## T14 — Booking source defaults
1. Try a Walk-in booking with Advance = 1000.
2. Try an Online booking with Advance = 1000.
3. Try a Corporate booking with Advance = 1000.

**PASS criteria**
- All three cases require the operator to **explicitly** pick a method (no auto-default), per locked Q8 (no auto-default for Online / Corporate).

---

# Regression Checklist (cross-bug)

| # | Item | Verify with |
|---|---|---|
| R1 | OrderCard active section unchanged for orders with no cancelled items | T1 control: place an order, no cancellation → no `▼ Cancelled` toggle visible |
| R2 | DineInCard active section unchanged | Open Table View on a fresh order |
| R3 | Order amount header unchanged for control orders | Compare `₹X` value pre/post a cancellation event |
| R4 | Station Panel B2 filter still works | BUG-026 T8 |
| R5 | Density localStorage persistence | BUG-026 T10 |
| R6 | `useStationSocketRefresh` listeners still fire on `new-order`, `update-item-status`, `update-food-status`, `update-order-paid` | Place / cancel / mark-ready an item → station panel updates within ~2s |
| R7 | RadioPillGroup component on existing fields (Booking Type, Booking For) unchanged | Open modal, click between Walk-in / Online and Individual / Corporate pills |
| R8 | Existing room check-in fields (`room_price`, `advance_payment`, `balance_payment`, `gst_tax`, etc.) sent in same shape | DevTools Network inspect on any check-in submit |
| R9 | Existing modal validations (phone, email, GSTIN, advance ≤ room price) intact | Trigger each invalid case and confirm the original error message |
| R10 | Update Order on engaged room: no advance-method prompt | BUG-027 T10 |
| R11 | `OrderCard.jsx:412–423` variant parser untouched | BUG-026 sub-issue 2.1 deferred — bare `Size` label may still appear on dashboard cards. **Do NOT flag this as a BUG-026 regression.** |

---

# Out of Scope (do NOT QA in this round)

- **OrderCard variant parser fix** (BUG-026 sub-issue 2.1) — deferred per Q4.
- **BUG-027 Phase 2** — Collect Bill / Update Order display of the captured advance method, reload hydration. Picker is only on fresh check-in modal in Phase 1.
- **BUG-027 Phase 3** — Bill print template + reports breakdown by tender.
- **Backend persistence** of `payment_method` — flag if missing, but treat as separate backend ticket, not a frontend regression.

---

# Summary Sheet (fill in during execution)

| Bug | Test ID | Result | Notes |
|---|---|---|---|
| BUG-025 | T1 | ☐ PASS / ☐ FAIL | |
| BUG-025 | T2 | ☐ PASS / ☐ FAIL | |
| BUG-025 | T3 | ☐ PASS / ☐ FAIL | |
| BUG-025 | T4 | ☐ PASS / ☐ FAIL | |
| BUG-025 | T5 | ☐ PASS / ☐ FAIL | |
| BUG-025 | T6 | ☐ PASS / ☐ FAIL | |
| BUG-025 | T7 | ☐ PASS / ☐ FAIL | |
| BUG-025 | T8 | ☐ PASS / ☐ FAIL | |
| BUG-026 | T1 | ☐ PASS / ☐ FAIL | |
| BUG-026 | T2 | ☐ PASS / ☐ FAIL | |
| BUG-026 | T3 | ☐ PASS / ☐ FAIL | |
| BUG-026 | T4 | ☐ PASS / ☐ FAIL | |
| BUG-026 | T5 | ☐ PASS / ☐ FAIL | |
| BUG-026 | T6 | ☐ PASS / ☐ FAIL | |
| BUG-026 | T7 | ☐ PASS / ☐ FAIL | |
| BUG-026 | T8 | ☐ PASS / ☐ FAIL | |
| BUG-026 | T9 | ☐ PASS / ☐ FAIL | |
| BUG-026 | T10 | ☐ PASS / ☐ FAIL | |
| BUG-026 | T11 | ☐ PASS / ☐ FAIL | |
| BUG-027 | T1 | ☐ PASS / ☐ FAIL | |
| BUG-027 | T2 | ☐ PASS / ☐ FAIL | |
| BUG-027 | T3 | ☐ PASS / ☐ FAIL | |
| BUG-027 | T4 | ☐ PASS / ☐ FAIL | |
| BUG-027 | T5 | ☐ PASS / ☐ FAIL | ⚠️ Confirm backend persists `payment_method` |
| BUG-027 | T6 | ☐ PASS / ☐ FAIL | |
| BUG-027 | T7 | ☐ PASS / ☐ FAIL | |
| BUG-027 | T8 | ☐ PASS / ☐ FAIL | |
| BUG-027 | T9 | ☐ PASS / ☐ FAIL / ☐ N/A | |
| BUG-027 | T10 | ☐ PASS / ☐ FAIL | |
| BUG-027 | T11 | ☐ PASS / ☐ FAIL | |
| BUG-027 | T12 | ☐ PASS / ☐ FAIL | |
| BUG-027 | T13 | ☐ PASS / ☐ FAIL | |
| BUG-027 | T14 | ☐ PASS / ☐ FAIL | |
| Regression | R1–R11 | ☐ PASS / ☐ FAIL | |

---

# If a Test Fails

1. Capture: full-page screenshot + DevTools Console log + DevTools Network panel for the failing call.
2. Note the test ID, observed vs expected, and the data-testid / selector used.
3. File a bug report referencing this doc and the locked spec at `/app/memory/P1_BUG_025_026_027_IMPLEMENTATION_HANDOVER.md`.
4. Tag for triage: `regression` if a previously-working flow breaks; `partial-fix` if the new behavior is wrong; `out-of-scope` if it's actually one of the deferred items above.

---

**End of QA Manual Validation Plan.**
