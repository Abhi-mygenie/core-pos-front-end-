# Three Requirements — V3 Validation & Gap Analysis

- **Validation Type:** Read-only product + technical validation against V3 documentation set and current frontend code.
- **Repo branch:** `roomv2` (current checkout); cross-referenced V3 baseline commit `32d91748ff963c7ecb8b9c98c102f1280a2fc179` per `/app/v3/*`.
- **Source of truth:** `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md`, `/app/v3/DOC_VS_CODE_GAP.md`, `/app/v3/OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md`, `/app/v3/RISK_REGISTER.md`, `/app/v3/OWNER_REVIEW_PACKET.md`, `/app/v3/COMPARISON_SUMMARY.md`.
- **Cross-references:** `/app/memory/ROOM_CHECKIN_NEXT_AGENT_GAPS_VALIDATED_HANDOVER.md`, `/app/memory/ROOM_MODULE_REQUIREMENTS_V2.md`, `/app/memory/PRD.md`, `/app/memory/BUG_TEMPLATE.md`.
- **Status:** STOP — Owner approval required before any implementation handover is created. Gaps and conflicts found in all 3 requirements.

---

## Executive Summary

| # | Requirement | Code Behavior | V3 Coverage | Status |
|---|---|---|---|---|
| 1 | Employee Menu Count refresh on socket activity | Panel data fetched ONCE on `LoadingPage` via `POST /api/v1/vendoremployee/station-order-list`; no socket-driven refresh exists | Not covered by V3 (no AD/OQ/RISK entry) | **GAP — endpoint name mismatch + missing socket→refresh wiring** |
| 2 | Add button visibility setting | Add button is rendered unconditionally in `Header.jsx`; precedent visibility patterns exist (Channel, Status, Station, View Mode lock) | Not covered by V3; future P3 (`PRD.md`) flags localStorage→role-permission migration | **GAP — pattern is established, but storage authority and admin-vs-user gating not decided in V3** |
| 3 | Room order bill print payload | (a) `OrderEntry.jsx` auto-fires `printOrder()` for postpaid + prepaid paths whenever `settings.autoBill=true`, including for `isRoom` orders. No room-specific suppression exists. (b) `buildBillPrintPayload()` emits `roomRemainingPay: 0`, `roomAdvancePay: 0`, `roomGst: 0` hardcoded; does **not** include `associatedOrders`, `roomPrice`, `totalRoomAmount`, or a `final payable amount` | Partially covered: AD-105 (tax/print consistency), AD-302 (collect-bill ↔ print parity), AD-013A (SC/room caveat) — none decide room-specific auto-bill suppression or room-print payload contract | **MAJOR GAP — V3 silent on (i) auto-bill suppression for rooms and (ii) required print fields for rooms** |

All three items are blocked pending Abhishek's clarifications below.

---

## Requirement 1 — Employee Menu Count Refresh on Socket Order Activity

### 1.1 Requirement (as stated)
> The left-side Kitchen/BAR preparing count panel comes from `GET /api/v1/vendoremployee/employee-menu`. Whenever order activity happens through sockets (new order taken, order edited/updated, item/order marked ready, item/order marked served), this API should be re-called and the panel refreshed.

### 1.2 V3 Documents Checked
- `ARCHITECTURE_DECISIONS_FINAL.md` — no AD covers station-panel refresh on socket events.
- `OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md` — no OQ on Kitchen/BAR panel.
- `RISK_REGISTER.md` — no risk on station/menu-count refresh staleness.
- `DOC_VS_CODE_GAP.md` — no GAP on this surface.
- Memory `ROOM_CHECKIN_NEXT_AGENT_GAPS_VALIDATED_HANDOVER.md` and `PRD.md` — silent on the panel.

### 1.3 Existing Code Behavior
- **Panel component:** `frontend/src/components/station-view/StationPanel.jsx`.
- **Service:** `frontend/src/api/services/stationService.js`
  - `fetchStationData(stationName, categoriesMap)` calls **`POST /api/v1/vendoremployee/station-order-list`** (line 131) with `role_name` and `def_order_status='1'` (Preparing).
  - Builds aggregated `categories[]` with item counts from `orders[].order_details_food[]`.
- **Initial load:** `frontend/src/pages/LoadingPage.jsx:143` calls `stationService.fetchStationData(station, categoriesMap)` for each enabled station and stores in `StationContext` via `setAllStationData`.
- **Refresh trigger today:** none. The panel never re-fetches after initial mount. There is no socket→station refresh wiring in `frontend/src/api/socket/socketHandlers.js` or `useSocketEvents.js`.
- **Socket events fully wired** (file: `frontend/src/api/socket/useSocketEvents.js`):
  - `NEW_ORDER` → `handleNewOrder`
  - `UPDATE_ORDER`, `UPDATE_ORDER_TARGET`, `UPDATE_ORDER_SOURCE`, `UPDATE_ORDER_PAID` → `handleOrderDataEvent`
  - `UPDATE_ITEM_STATUS` → `handleOrderDataEvent` (with `'update-item-status'`)
  - `UPDATE_FOOD_STATUS` → `handleUpdateFoodStatus`
  - `UPDATE_ORDER_STATUS` → `handleUpdateOrderStatus`
  - All update OrderContext/TableContext but never touch `StationContext` or `stationService`.

### 1.4 Alignment With V3 Architecture Decisions
- AD-002 (event-semantic remove vs update) is unaffected; the new behavior is additive (pure read-after-write panel refresh).
- AD-101 / AD-105 / AD-302 (billing & print) are unrelated.
- No conflict with any V3 decision.

### 1.5 Gaps / Questions

**GAP-1A — Endpoint name mismatch (BLOCKING).**
- Requirement says: `GET /api/v1/vendoremployee/employee-menu`.
- Code uses: `POST /api/v1/vendoremployee/station-order-list` (form-data: `role_name`, `def_order_status=1`).
- No reference to `employee-menu` exists anywhere under `/app/frontend/src/`, `/app/v3/`, or `/app/memory/`.
- **Question for Abhishek:** Is the canonical endpoint:
  - (a) `GET /api/v1/vendoremployee/employee-menu` — a NEW endpoint to be wired, replacing or supplementing `station-order-list`?
  - (b) `POST /api/v1/vendoremployee/station-order-list` — the current one, and the spec document is using a colloquial label?
  - (c) Both — and they serve different surfaces?
- A wrong choice here will silently break the Kitchen/BAR panel.

**GAP-1B — Refresh granularity not specified.**
- Should the refresh fire **once per socket event** (simple but chatty), or **debounced/throttled** (e.g., 300–500 ms collapse window) to avoid flooding `station-order-list` during burst events?
- Should it refresh **only the affected station(s)** (derive station from `payload.orders[].order_details_food[].station`) or **all enabled stations** in one shot via `fetchMultipleStationsData`?
- Should `NEW_ORDER` trigger a refresh even when the new order has zero KDS/BAR items (i.e., all `station: null`)?

**GAP-1C — Server vs client load impact unconfirmed.**
- `station-order-list` returns the full preparing-orders list; in a busy tenant a 5–10 events/min event rate could mean an extra 5–10 calls/min. RISK-006 already calls out "sequential loading"; this risks compounding HTTP pressure.
- `useRefreshAllData` in code is invoked for all-data refresh — should the station refresh be folded into that, or kept independent?

**GAP-1D — Map of socket events → refresh decision not formalized.**
- Requirement enumerates: new, update, ready, served. Mapping to current event names is:

| Requirement event | Closest socket event(s) | Wired today |
|---|---|---|
| New order taken | `NEW_ORDER` (`new-order`) | YES (handler updates OrderContext) |
| Order edited/updated | `UPDATE_ORDER`, `UPDATE_ORDER_TARGET`, `UPDATE_ORDER_SOURCE` | YES |
| Item/order marked ready | `UPDATE_ITEM_STATUS` (item) + `UPDATE_FOOD_STATUS` (legacy) + `UPDATE_ORDER_STATUS` (order) | YES |
| Item/order marked served | Same family as "ready"; status payload differs (`fOrderStatus=5` vs `2`) | YES |

  - Should `SCAN_NEW_ORDER`, `DELIVERY_ASSIGN_ORDER`, `SPLIT_ORDER`, `UPDATE_ORDER_PAID` (paid removes order from preparing → reduces count) also trigger refresh? Each represents a state transition that affects the preparing count.
  - Should `update-table` (engage/release) trigger a refresh? Likely no, but worth confirming.

### 1.6 Suggested Options
- **Option A (Lean, recommended pending GAP-1A answer):** Add a thin `refreshStationData()` helper in `StationContext` that calls `fetchMultipleStationsData(enabledStations, …)` and `setAllStationData(result)`; trigger it from `socketHandlers.js` for `NEW_ORDER`, `UPDATE_ORDER*`, `UPDATE_ITEM_STATUS`, `UPDATE_FOOD_STATUS`, `UPDATE_ORDER_STATUS`, `UPDATE_ORDER_PAID`, `SPLIT_ORDER`. Wrap in a 500 ms trailing debounce to coalesce bursts. Skip when `stationViewEnabled=false`.
- **Option B (Targeted):** Same as A, but compute the affected stations from `payload.orders[].order_details_food[].station` and call `fetchStationData` only for those — keeps load minimal but adds derivation logic and could miss the case where a station is removed from a payload.
- **Option C (Server-driven push):** Backend pushes a synthetic `update-station` socket event with the station deltas. Clean, but requires backend work outside this repo's scope.

### 1.7 Recommendation (pending answers)
Adopt **Option A** with a 500 ms debounce, gated on `stationViewEnabled`. Single, idempotent code path, no derivation logic, easy to test, low maintenance. Switch to Option B only if Abhishek requires per-station targeting or if station load proves excessive in QA.

### 1.8 Risk / Impact
- LOW–MEDIUM if endpoint and event mapping are correct.
- HIGH if endpoint mismatch (GAP-1A) is not resolved before code lands — silent panel staleness or 404s.
- Compounding RISK-006 (sequential loading) without debounce.

### 1.9 Files / Components Likely Involved (no edits in this validation)
- `frontend/src/api/services/stationService.js` (helper additions if needed)
- `frontend/src/contexts/StationContext.jsx` (`refreshStationData` action)
- `frontend/src/api/socket/socketHandlers.js` (invoke debounced refresh after order actions)
- `frontend/src/api/socket/useSocketEvents.js` (only if a new top-level subscriber is needed)

---

## Requirement 2 — Add Button Visibility Setting

### 2.1 Requirement (as stated)
> The top-right Add button used for taking/adding orders should be controlled from Visibility Settings — add a configuration to show/hide this Add button.

### 2.2 V3 Documents Checked
- `ARCHITECTURE_DECISIONS_FINAL.md` — no AD on Add-button visibility.
- `OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md` — no OQ.
- `RISK_REGISTER.md` — no risk; precedent risks RISK-009 (permissions decentralized in frontend) is informational.
- `DOC_VS_CODE_GAP.md` — silent.
- `PRD.md` — Future P3: "Migrate localStorage-based visibility settings to user-role permissions."
- `TASK_1_REVISION_GAPS.md` + `REVISION_IMPLEMENTATION_SUMMARY.md` — establish the existing visibility settings pattern (Channel / Status / Station / View Mode locks via localStorage).

### 2.3 Existing Code Behavior
- **Add button (target):** `frontend/src/components/layout/Header.jsx:592-600`
  ```jsx
  <button
    data-testid="add-table-btn"
    className="..."
    onClick={onAddOrder}
  >
    <PlusSquare className="w-4 h-4" />
    <span className="text-sm font-medium">Add</span>
  </button>
  ```
  Rendered unconditionally; `onAddOrder` is wired from `DashboardPage.jsx:1229` → `handleAddOrder` (`DashboardPage.jsx:1053`).

- **Existing visibility-settings pattern** (`frontend/src/pages/StatusConfigPage.jsx`):
  - `STORAGE_KEY = 'mygenie_enabled_statuses'` (status-filter visibility).
  - `STATION_VIEW_STORAGE_KEY = 'mygenie_station_view_config'`.
  - `CHANNEL_VISIBILITY_STORAGE_KEY = 'mygenie_channel_visibility'`.
  - `LAYOUT_TABLE_VIEW_KEY`, `LAYOUT_ORDER_VIEW_KEY`.
  - `VIEW_MODE_TABLE_ORDER_KEY`, `VIEW_MODE_CHANNEL_STATUS_KEY` (Task 1 revision).
  - All loaded on mount, mutated via toggles, persisted on Save, and read by `Header.jsx`/`Sidebar.jsx`/`DashboardPage.jsx`.
- **Sidebar nav anchor:** `frontend/src/components/layout/Sidebar.jsx:74-80` already includes a `visibility-settings` group with one child (`status-config`) → opens `StatusConfigPage`.

### 2.4 Alignment With V3 Architecture Decisions
- No conflict. The proposal extends the **same** visibility-settings pattern that `StatusConfigPage` already uses.
- Does NOT touch billing/socket/print — orthogonal to all current V3 ADs.

### 2.5 Gaps / Questions

**GAP-2A — Storage authority (BLOCKING for design choice).**
- Existing patterns split into:
  - **Cashier-controllable** (Channel filter, Status filter, view-mode runtime toggle) — toggled live from Sidebar/Header.
  - **Admin-locked** (View Mode lock — `'table'|'order'|'both'`) — set in `StatusConfigPage`, read elsewhere.
- For the Add button, which authority applies?
  - (a) Admin-only lock (set once in Settings; cashier cannot override). Aligns with "control point" semantics.
  - (b) Cashier-toggleable (similar to channel filter visibility).
  - (c) Both — admin sets a hard lock; if unlocked, cashier can toggle.
- The storage shape and UI affordance differ substantially across these.

**GAP-2B — Granularity per channel.**
- Should the toggle be **global** ("hide Add button entirely"), or **per channel** (hide for room only, hide for delivery only, etc.)?
- Per-channel may be useful for tenants that disable specific intake methods, but adds 4× toggles and storage.
- The Header already filters channels via `restaurant.features.{delivery|takeaway|dineIn|room}` — a hide-Add-button toggle that overrides at the global level vs. an additional per-channel mask need to be reconciled.

**GAP-2C — Default value.**
- Default = visible (preserves current behavior). Confirm Abhishek wants this default.

**GAP-2D — Permission interplay.**
- `Sidebar.jsx` already maps permissions (`SIDEBAR_PERMISSIONS`) to backend permission keys. Should the Add-button visibility ride **only** on the new visibility setting, or **also** be gated by an existing permission key (e.g., `pos`/`order`)?
- V3 `AD-009` (decentralized frontend permission usage) keeps frontend authoritative for UI gating; either choice is consistent, but mixing the two without a clear precedence rule will be confusing.

**GAP-2E — V3 future-state mismatch.**
- `PRD.md` Future P3 says "Migrate localStorage-based visibility settings to user-role permissions."
- Adding another localStorage key today increases the migration surface. Acceptable, but worth flagging — the new key should be migration-friendly (e.g., reuse existing namespace and have a clean shape).

### 2.6 Suggested Options
- **Option A (Recommended):** New localStorage key `mygenie_add_button_visibility` with shape `{ enabled: boolean }` (default `true`). Toggle lives in `StatusConfigPage` under the existing "Visibility" surface. `Header.jsx` reads this key on mount + listens for `storage` event for cross-tab sync (mirrors Task-1 view-mode lock pattern). Single global toggle.
- **Option B:** Per-channel granularity: `{ enabled: { dineIn: true, takeAway: true, delivery: true, room: true } }`. Reuses the existing channel filter path in `Header.jsx`.
- **Option C:** Hybrid admin-lock pattern: store both `lockMode: 'visible' | 'hidden' | 'cashier-toggle'`. If locked, cashier cannot override; if cashier-toggle, expose a quick toggle in the Header dropdown.

### 2.7 Recommendation (pending answers)
Start with **Option A** (global, admin-set, default `true`). It mirrors the Channel Visibility toggle's UX precisely, lowest surface area, and easy to migrate later to a permission-backed flag. Escalate to Option B/C only if product needs them.

### 2.8 Risk / Impact
- LOW. Pure additive UI gating. No payload or socket impact.
- Minor regression risk if `Header.jsx` does not subscribe to `storage` events (Add button stuck visible in another tab after change in Settings) — same pattern fix already used for view-mode lock.

### 2.9 Files / Components Likely Involved (no edits in this validation)
- `frontend/src/components/layout/Header.jsx` (gate the existing button render block at lines 591–600).
- `frontend/src/pages/StatusConfigPage.jsx` (add the new toggle row + Save logic).
- `frontend/src/pages/DashboardPage.jsx` (no change required if Header reads localStorage directly; alternatively pass a flag down).

---

## Requirement 3 — Room Order Bill Print Payload

### 3.1 Requirement (as stated)
> For room orders:
> - Auto bill print should NOT be applicable, even if the auto bill flag is passed.
> - Room bill print payload must be compared against Collect Bill data; payload must include: room details, advance payment, balance payment, total room amount, associated orders, room service orders, total associated order amount, and final payable amount.

### 3.2 V3 Documents Checked
- `ARCHITECTURE_DECISIONS_FINAL.md`
  - **AD-013A** — SC order-type gating: "Default collect-bill branch gates to dine-in/walk-in/room; room-with-associated-orders UI still shows SC toggle by percentage without the same visible `scApplicable` guard." (room-checkout branch flagged as nuance, NOT a print-payload decision).
  - **AD-105** — tax/print parity: override paths align; fallback recomputation remains; **no room-specific clause**.
  - **AD-302** — collect-bill ↔ print parity: postpaid auto-print improved, but **no room exclusion**.
- `DOC_VS_CODE_GAP.md` — `GAP-N3` (room-with-associated-orders SC UI nuance only).
- `OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md` — `OQ-013A` (SC), `OQ-302A` (postpaid auto-print) → no room-specific carve-out.
- `RISK_REGISTER.md` — `RISK-018` (tax/SC consistency), `RISK-036` (runtime complimentary parity), `RISK-037` (delivery-address persistence). No `RISK-Room-AutoBill` or `RISK-Room-PrintPayload`.
- `OWNER_REVIEW_PACKET.md` — Backend B-02 (settlement authority) is a related open question but not a room-print decision.
- `/app/memory/ROOM_CHECKIN_NEXT_AGENT_GAPS_VALIDATED_HANDOVER.md`
  - Notes "Auto-print fires on ₹0 checkout (if `settings.autoBill=true`). Auto-print block at `OrderEntry.jsx:1309-1363` is try/catch-wrapped; empty `billFoodList` should be handled gracefully" — i.e., the Room ₹0 case is **inert** today, NOT suppressed.
  - "Print receipt for ₹0 room not in scope of this fix (already handled by existing `billFoodList` filter). ✅" — confirms there is **no** explicit decision to disable auto-print for rooms; the team accepted the inert behavior.
- `/app/memory/ROOM_MODULE_REQUIREMENTS_V2.md` — covers room module structure, profile flags, but **does not specify a room-bill print contract**.
- `/app/memory/PRD.md` — Lists Task 4 (room card total = food + transfers + balance) but no print-payload spec.

### 3.3 Existing Code Behavior

#### 3.3.a Auto-bill suppression for rooms — DOES NOT EXIST
- `frontend/src/components/order-entry/OrderEntry.jsx`:
  - **Postpaid (Scenario 1, line 1310):**
    ```js
    if (settings?.autoBill && collectOrderId) { … await printOrder(…); }
    ```
    No `isRoom` guard.
  - **Prepaid (Scenario 2, line 1262):**
    ```js
    await autoPrintNewOrderIfEnabled(newOrderId);
    ```
    Inside, checks `settings?.autoBill` only — no `isRoom` guard.
  - **Transfer to Room (Scenario 3, lines 1168-1181):** does not auto-print — but also does not run collect-bill.
- Therefore: today, a postpaid Room checkout with `settings.autoBill=true` WILL fire `printOrder(...)` for the room, regardless of any "auto bill is not applicable for room orders" intent.

#### 3.3.b Room print payload — current shape
`frontend/src/api/transforms/orderTransform.js:1017` (`buildBillPrintPayload(order, serviceChargePercentage, overrides)`) emits the following fields. Reference: lines 1197-1245.

| Field | Current value | Source |
|---|---|---|
| `order_id` | `order.orderId` | from order |
| `restaurant_order_id` | `order.orderNumber` | from order |
| `print_type` | `'bill'` | constant |
| `payment_amount` | `overrides.paymentAmount` ?? `order.amount` | order/overrides |
| `grant_amount` | `finalPaymentAmount` (= `payment_amount`) | derived |
| `order_item_total` | `overrides.orderItemTotal` ?? subtotal | overrides |
| `order_subtotal` | `overrides.orderSubtotal` ?? `itemBase + SC + tip` | overrides |
| `discount_amount` | `overrides.discountAmount` ?? **0 (hardcoded)** | overrides |
| `coupon_code` | `overrides.couponCode` ?? `''` | overrides |
| `loyalty_dicount_amount` | `overrides.loyaltyAmount` ?? 0 | overrides |
| `wallet_used_amount` | `overrides.walletAmount` ?? 0 | overrides |
| `serviceChargeAmount` | computed/overridden, gated on `dineIn || isRoom` | overrides |
| `roomRemainingPay` | **`0` (hardcoded)** | constant |
| `roomAdvancePay` | **`0` (hardcoded)** | constant |
| `roomGst` | **`0` (hardcoded)** | constant |
| `gst_tax`, `vat_tax` | computed/overridden | overrides |
| `delivery_charge` | overrides ?? `order.deliveryCharge` | overrides |
| `Tip` | overrides ?? `order.tipAmount` | overrides |
| `billFoodList` | rawDetails minus 'check in' marker | derived |
| `tablename` | derived (`'WC'`/`'TA'`/`'Del'`/`tableNumber`) | derived |
| **NOT EMITTED** | `associatedOrders` / room-service split / `totalRoomAmount` / `finalPayable` (single grand) | n/a |

The hardcoded zeros for `roomRemainingPay`, `roomAdvancePay`, `roomGst` are direct evidence the print contract was **stubbed but never wired**. Backend may already accept these keys, but the frontend never populates them.

#### 3.3.c Collect Bill (CollectPaymentPanel) actually computes & displays
`frontend/src/components/order-entry/CollectPaymentPanel.jsx`:
- `roomBalance` = `Math.max(0, roomInfo.balancePayment || 0)` (lines 110-113).
- `roomInfo.roomPrice`, `roomInfo.advancePayment`, `roomInfo.balancePayment` rendered (lines 854-866).
- `associatedOrders[]` rendered with count + `associatedTotal` (lines 874-915).
- Final grand: `(isRoom && associatedOrders.length > 0 ? finalTotal + associatedTotal : finalTotal) + roomBalance` (line 543).
- These values are **not** propagated into the auto-print override object (`OrderEntry.jsx` lines 1136-1151 prepaid; 1319-1347 postpaid). Auto-print currently uses generic `paymentData.itemTotal/subtotal/finalTotal/discounts/...`.

#### 3.3.d Source: `fromAPI.order` (lines 248-277) populates:
- `associatedOrders[]` from `api.associated_order_list` with `{ orderId, orderNumber, amount, transferredAt }`.
- `roomInfo: { roomPrice, advancePayment, balancePayment }` from `api.room_info`.

Both are available in the `order` argument passed to `buildBillPrintPayload`, so populating the payload with them is purely additive frontend work.

### 3.4 Alignment With V3 Architecture Decisions
- **AD-105 (tax/print consistency):** the requirement is consistent with this AD's spirit — "Collect-bill UI must equal printed bill." Today the room sub-block (room balance, advance, transferred orders) is in the UI but absent in print payload; that is an AD-105-spirit violation, but V3 did not explicitly call it out.
- **AD-302 (collect-bill ↔ print parity, postpaid auto-print):** decision says auto-print is implemented when `settings.autoBill=true`. The new requirement EXEMPTS rooms from this — direct conflict that needs an AD update.
- **AD-013A (SC gating room caveat):** acknowledges room-with-associated-orders branch differs but did not extend to print-payload contract.
- This is a **substantive product/architecture change** requiring a new AD or AD amendment.

### 3.5 Gaps / Questions

**GAP-3A — Auto-bill suppression for rooms (BLOCKING).**
- Should suppression apply to:
  - (a) BOTH postpaid (Scenario 1) and prepaid (Scenario 2) when the order `isRoom`?
  - (b) Only postpaid Room checkout?
  - (c) Only Room checkout WITH balance/advance > 0 (i.e., real room booking), but allow auto-print for "Room Service food only" cases (no balance, no advance)?
- The requirement language says "even if auto bill flag is passed", suggesting (a). Confirm.
- Conflicts with **AD-302** as currently written. AD-302 must be amended/superseded with a Room exclusion clause.

**GAP-3B — Manual print parity for rooms.**
- Is **manual** Print Bill from CollectPaymentPanel still allowed for rooms (the `Print Bill` button)? Manual print uses the same `buildBillPrintPayload` with overrides.
- Today: yes. Confirm Abhishek expects manual print to remain available, with the enriched room fields.
- If both manual and auto are blocked for rooms → no print path remains at all for rooms (likely undesired).

**GAP-3C — Room print payload contract — exact field shape (BLOCKING).**
The requirement enumerates eight fields. Need exact key names + types since backend may already accept `room*` keys. Proposed mapping (needs Abhishek confirmation):

| Requirement | Suggested key | Type | Source |
|---|---|---|---|
| Room details | reuse existing `tablename` (room number) + new `roomName` or reuse `tablename` only? | string | `order.tableNumber` / `roomInfo` |
| Advance payment | `roomAdvancePay` (key already exists, currently `0`) | number | `order.roomInfo.advancePayment` |
| Balance payment | `roomRemainingPay` (key already exists, currently `0`) | number | `order.roomInfo.balancePayment` |
| Total room amount | new key `roomPrice` or `roomTotalAmount` | number | `order.roomInfo.roomPrice` |
| Associated orders | new key `associatedOrders` | array of `{order_id, restaurant_order_id, amount, transferredAt}` | `order.associatedOrders` |
| Room service orders | clarify — is this the cart/`billFoodList` of the room order itself? Or a separate entity? | array | `order.rawOrderDetails` (= same as `billFoodList`) ? |
| Total associated order amount | new key `associatedOrdersTotal` | number | sum of `associatedOrders[].amount` |
| Final payable amount | reuse `payment_amount` / `grant_amount`, OR new key `finalPayable`? | number | `(finalTotal + associatedTotal) + roomBalance` |

**Specific clarifications needed:**
- (i) Does backend printer template already understand any of these keys?
- (ii) Should `serviceChargeAmount`, `gst_tax`, `vat_tax` continue to apply ONLY to the room-service food portion (per architectural rule "room balance has NO SC, NO GST, NO discount" — see `orderTransform.js:269-271`)? The current `CollectPaymentPanel` adds room balance as a flat pass-through with no tax. Confirm the print payload follows the same rule.
- (iii) For `roomGst` (currently `0`), should it stay `0` or carry the GST on room balance if the tenant has `room_gst_applicable=Yes` (per `room_module_implementation_requirements.md` A6)?

**GAP-3D — Discount / SC / tip applicability on the merged total.**
- `CollectPaymentPanel` applies SC/discount/tip ONLY on the room-service food subtotal, never on `roomBalance` or `associatedTotal`. The print payload contract should encode this clearly so the backend printer doesn't double-charge.

**GAP-3E — Source of associated orders for print.**
- `order.associatedOrders[]` is hydrated from `api.associated_order_list[]`. Verify (with backend owner) that this list is **complete** at the moment of print (right after `order-bill-payment` returns) — there is a known race where socket re-engage may lag the HTTP collect-bill response (RISK-009 / `OrderEntry.jsx:1281-1366`). If lag matters, a fresh `GET /get-single-order-new` may be required before printing.

**GAP-3F — Compatibility with `paid_room` / `room_id` keys.**
- `orderToAPI.collectBillExisting` already sends `paid_room`, `room_id`, etc. on the **collect-bill** payload (lines 780-781). The **print** payload does NOT carry these. Confirm whether print needs them too (some printer backends key off them).

**GAP-3G — V3 AD update path.**
- This requirement requires either:
  - A new AD: `AD-Room-Print` / `AD-302A — room auto-print suppression`.
  - Or amendments to AD-302 + AD-105 + AD-013A to encode the room-specific carve-out.
- Without one of these updates, the change will silently regress V3's "collect-bill ↔ print parity" claim.

### 3.6 Suggested Options

**Option A — Hard suppression + enriched payload (recommended):**
- Add an `isRoom` short-circuit at the top of both auto-print blocks in `OrderEntry.jsx` (Scenario 1 line 1310; Scenario 2 line 1262). Skip `printOrder()` entirely.
- Manual `Print Bill` button remains functional.
- Extend `buildBillPrintPayload` with room-aware fields populated from `order.roomInfo` and `order.associatedOrders`. Keep all existing keys; populate `roomRemainingPay` / `roomAdvancePay` from real values; add `roomPrice`, `associatedOrders`, `associatedOrdersTotal`, `finalPayable`. Wire CollectPaymentPanel's manual print to forward these via overrides if needed.

**Option B — Soft suppression (config flag):**
- Introduce a `restaurant.features.roomAutoBill` flag (or similar). Default: false (suppressed). Allows tenants to opt-in later. More flexible, more surface.

**Option C — Conditional suppression by balance:**
- Skip auto-print only when `roomBalance > 0` (real room booking) but allow auto-print for room-service-food-only cases. Closer to current ROOM_CHECKIN_NEXT_AGENT_GAPS handover language. Adds a runtime check.

### 3.7 Recommendation (pending answers)
**Option A** — definitive product behavior, lowest ambiguity, easiest to test, and direct match to the requirement statement. Accompanied by an AD-302A amendment in V3.

### 3.8 Risk / Impact
- HIGH if the print payload keys don't match what the backend printer template expects → blank/garbled receipts on rooms.
- HIGH if auto-bill suppression is partial (e.g., only Scenario 1) → tenants will see inconsistent behavior between prepaid and postpaid rooms.
- MEDIUM if discount/SC/tax rules are not explicitly encoded for rooms → potential mis-billing when a cashier applies a discount on a room collect-bill.

### 3.9 Files / Components Likely Involved (no edits in this validation)
- `frontend/src/components/order-entry/OrderEntry.jsx` (Scenario 1 auto-print block at ~line 1310; Scenario 2 `autoPrintNewOrderIfEnabled` at ~line 1093).
- `frontend/src/api/transforms/orderTransform.js` (`buildBillPrintPayload` at line 1017; `fromAPI.order` at lines 248-277 already provides `associatedOrders` + `roomInfo`).
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (manual `handlePrintBill` overrides — ensure room values forwarded for manual print parity, lines 875-915, ~1290-1462).
- `frontend/src/api/services/orderService.js` (printOrder helper).
- V3 doc updates: `ARCHITECTURE_DECISIONS_FINAL.md` (new AD or AD-302 amendment), `DOC_VS_CODE_GAP.md` (close room-print gap once landed).

---

## Cross-Cutting Notes

### V3 Documents That Will Need Update Post-Approval
- `ARCHITECTURE_DECISIONS_FINAL.md` — add/amend ADs:
  - AD-Station-Refresh (Req 1) — new.
  - AD-Visibility-Add-Button (Req 2) — new.
  - AD-302A — Room auto-print suppression (Req 3) — new, supersedes AD-302 for rooms.
  - AD-Room-Print-Payload (Req 3) — new.
- `DOC_VS_CODE_GAP.md` — close gaps once implementation lands.
- `RISK_REGISTER.md` — re-classify `RISK-018` if auto-print room exclusion is implemented.

### Test Credentials
- `/app/memory/test_credentials.md` is empty per handoff. Manual end-to-end QA on Tasks 2–5 (PRD §10) cannot be performed by the testing agent without credentials — flag this for the next QA pass.

### Out of Scope for This Validation
- No code changes were made. No file under `/app/frontend` or `/app/v3` was edited in this validation cycle.

---

## Approval Gate (STOP)

The following BLOCKING questions must be answered by Abhishek before `/app/memory/THREE_REQUIREMENTS_IMPLEMENTATION_HANDOVER.md` is created:

1. **GAP-1A** — Confirm endpoint name for the Kitchen/BAR preparing count panel: `employee-menu` (new) vs `station-order-list` (current) vs both.
2. **GAP-1B** — Refresh granularity (per-station targeted vs all-stations) and debounce window.
3. **GAP-1D** — Final list of socket events that must trigger refresh (specifically: `UPDATE_ORDER_PAID`, `SCAN_NEW_ORDER`, `DELIVERY_ASSIGN_ORDER`, `SPLIT_ORDER` — include or exclude?).
4. **GAP-2A** — Visibility authority for Add button: admin-locked vs cashier-toggleable vs hybrid.
5. **GAP-2B** — Granularity: global vs per-channel.
6. **GAP-3A** — Auto-bill suppression scope: postpaid-only, prepaid-only, both, or balance-conditional.
7. **GAP-3B** — Manual `Print Bill` for rooms: keep enabled or also block?
8. **GAP-3C** — Exact print payload key names (per the table in §3.5) and tax rule for room balance / `roomGst`.
9. **GAP-3F** — Whether `paid_room` / `room_id` need to also flow into the print payload.
10. **GAP-3G** — Confirm Abhishek wants V3 ADs amended (AD-302A + AD-Room-Print-Payload), or treated as implementation-only without architecture-doc revision.

Once answered, the implementation handover will be drafted with:
- exact file ranges to edit,
- AD/risk-register update plan,
- sequenced test cases (manual + automated),
- rollback/feature-flag strategy if applicable.

---

_End of validation document. No code or production docs modified during this audit._
