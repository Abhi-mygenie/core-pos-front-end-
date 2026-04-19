# OPEN QUESTIONS FROM CODE — v2

> Generated: 2026 (v2 revision) | Source: `main` branch, static code analysis
> Questions arise from contradictions, unclear patterns, missing context, and divergent calculations in the code.
> Confidence qualifier indicates how sure we are about the underlying observation (not about the answer).

---

## Business Logic Questions

### OQ-001 — What is the canonical rounding rule for order totals?

- **Context**: `orderTransform.calcOrderTotals` (lines 388–393) uses: if `Math.ceil(rawTotal) − rawTotal ≥ 0.10` → ceil; else floor. The same rule is duplicated in `CollectPaymentPanel.jsx` line 242, `OrderEntry.jsx` line 507 (`applyRoundOff`), and derived values in `buildBillPrintPayload`.
- **Question**: Why 0.10? Is this a business requirement matched by backend? What happens at exact boundary (0.10, 0.09)?
- **Impact**: Financial discrepancy if frontend and backend disagree. Also, "ceil if diff ≥ 0.10 else floor" means amounts ending in `.00` round **down** (no change) and `.09` round **down to integer**, whereas `.10+` rounds **up**. Stopwatch-check: `rawTotal = 100.09` → `ceil = 101`, `diff = 0.91` → ceil wins → **101** (+0.91). `100.00` → ceil=100, diff=0 → floor wins → **100**. `100.05` → ceil=101, diff=0.95 → ceil → **101** (+0.95). Is this the desired customer-facing UX?
- **Confidence in observation**: HIGH. **Confidence in the rule's intent**: LOW.

### OQ-002 — When should orders be REMOVED vs UPDATED on socket events?

- **Context**: Current logic:
  - `update-order` (via handleOrderDataEvent('update-order')): always `updateOrder()`, never `removeOrder()`.
  - `update-order-target`: `updateOrder()`; detects old-table change and frees old table.
  - `update-order-source`: if status is `cancelled` or `paid` → `removeOrder()`, else `updateOrder()`.
  - `update-order-paid`: same as `source`.
  - `update-item-status`: always `updateOrder()` (never removes).
  - `update-order-status`: if status is `cancelled` or `paid` → `removeOrder()`; else `updateOrder()`.
  - `split-order`: always `updateOrder()` on the original (the new split order arrives via a different event, presumably `new-order`).
- **Question**: What determines which event fires for a given backend state change? E.g., when a waiter marks a prepaid order "served" and it auto-settles to paid — is that `update-order-paid` or `update-item-status`? The divergent remove-logic implies it matters.
- **Impact**: Wrong branch could leave paid/cancelled orders on the dashboard or remove running orders prematurely.
- **Confidence in observation**: HIGH.

### OQ-003 — What counts as a "Walk-In" order?

- **Context**: `orderTransform.fromAPI.order` sets `isWalkIn = !api.table_id || api.table_id === 0`. All walk-ins show in the dine-in channel but are filtered separately.
- **Question**:
  - Can a walk-in be later assigned to a physical table? (The "Shift Table" flow exists; does a walk-in become a dine-in afterwards, or stay walk-in with a tableId?)
  - Does `api.table_id === 0` ever mean "takeaway/delivery" (i.e., a non-physical channel) rather than walk-in? The code treats all three identically under `isWalkIn=true` for the dineIn→walkIn split.
- **Impact**: Mis-classification could show a takeaway order in the dine-in/walk-in bucket.
- **Confidence**: MEDIUM.

### OQ-004 — Rooms vs Tables: what are the differences in flow?

- **Context**: Same context holds both; `isRoom` flag toggles behavior. Rooms have `associatedOrders` (orders transferred into the room via `ORDER_SHIFTED_ROOM`). Check-in is via `roomService.checkIn` (multipart or JSON).
- **Questions**:
  - Can a room have multiple concurrent orders (the UI seems to aggregate under one room via `associated_order_list`)?
  - What triggers a room status back to available? (Tables auto-clear on `paid`/`cancelled`; is the room flow different because it's tied to a guest check-out?)
  - Why is `paid_room` / `room_id` passed as empty strings in `placeOrderWithPayment` but `null` in `updateOrder`? Is the backend lenient to both?
- **Impact**: Unclear room state transitions; inconsistent field shapes to backend.
- **Confidence**: MEDIUM.

### OQ-005 — What are all possible values of `order_in`?

- **Context**: Checked values: `'RM'` (room), `'SRM'` (shifted room, in reportTransform). `orderTransform` also checks it in `isRoom` derivation.
- **Question**: Complete enumeration? Is it orthogonal to `order_type` (which is `dinein` / `takeaway` / `delivery` / etc.)?
- **Impact**: Unexpected values may silently fall into `dineIn` bucket.
- **Confidence**: MEDIUM.

### OQ-006 — What is `def_ord_status` / `defaultOrderStatus`'s business rule?

- **Context**: `RestaurantContext.defaultOrderStatus` is derived from profile; `orderService.confirmOrder(id, roleName, orderStatus='paid')` defaults to `'paid'`. `F_ORDER_STATUS_API` maps to 1='cooking', 2='ready', 3='cancelled', 5='served', 6='paid', 7='pending', 8='running', 9='pendingPayment', 10='reserved'.
- **Question**: Which restaurants use `'paid'` as default (implying auto-settlement on confirm)? Can it be `'running'` or `'cooking'`? What does the UX look like for each?
- **Impact**: Confirm action could silently close/settle orders for some restaurants.
- **Confidence**: MEDIUM.

### OQ-007 — Which orderStatus counts as "terminal"?

- **Context**: Handlers check `status === 'cancelled' || status === 'paid'` to decide remove-vs-update.
- **Question**: Is `'pending'` ever terminal? What about `'reserved'`? `'pendingPayment'` stays on dashboard?
- **Impact**: Cards for edge-state orders may linger.
- **Confidence**: MEDIUM.

### OQ-008 — What is the actual role string `getOrderRoleParam` expects?

- **Context**: `orderService.getOrderRoleParam(userRole)` returns `'Waiter'` for waiters and `'Manager'` for everyone else. It then gets passed to `getRunningOrders({role_name})`.
- **Question**: Does the backend accept only these two values, or also `'Owner'`, `'Captain'`, `'Manager'`? What does the backend filter by? If a `'Kitchen'` user logs in, do they see zero orders (currently they'd see Manager's view)?
- **Impact**: Unclear.
- **Confidence**: MEDIUM.

### OQ-009 — What permissions exist?

- **Context**: Code checks: `order_cancel`, `food`, `transfer_table`, `merge_table`, `food_transfer`, `customer_management`, `bill`, `discount`, `print_icon`.
- **Question**: Is this the full set? Are there more the UI doesn't currently gate (e.g., "refund", "reopen order")?
- **Impact**: Unauthorized actions might be attempted.
- **Confidence**: MEDIUM.

---

## Payment & Calculation Questions

### OQ-101 — Service charge application point — pre-discount or post-discount?

- **Context**:
  - `CollectPaymentPanel` line 211: `serviceCharge = Math.round(itemTotal × SC% / 100 × 100) / 100` — applied on pre-discount `itemTotal`.
  - `orderTransform.calcOrderTotals` line 377: `serviceCharge = round(subtotal × SC% / 100 × 100) / 100`, where `subtotal` is the sum of `fullUnitPrice × qty` (no discount applied at this layer; the transform doesn't know about discounts).
  - `buildBillPrintPayload` line 909: `serviceChargeAmount = round(computedSubtotal × SC% / 100 × 100) / 100` when not overridden.
- **Question**: What is the canonical rule? Does SC apply on pre- or post-discount base? If pre-discount, does discount apply on (items + SC) or only items?
- **Impact**: Order totals differ from bill print totals in some edge cases; both may differ from backend.
- **Confidence in divergence**: HIGH (three-place duplication). **Confidence in correct rule**: LOW.

### OQ-102 — What happens when a v2 data event arrives with no `payload.orders`?

- **Context**: All v2 data handlers (`handleNewOrder`, `handleOrderDataEvent`, `handleUpdateOrderStatus`, `handleSplitOrder`) log `'ERROR … — backend issue'` and bail.
- **Question**: Is this a permanent backend contract (always includes payload), or is the "no payload" case a transient concern? Should the handlers fall back to a GET call like the legacy flow?
- **Impact**: If backend emits a data event without the payload, the dashboard stays stale for that order until the next `new-order` / `update-order-*` or manual refresh. Silent UX failure.
- **Confidence**: HIGH.

### OQ-103 — `update-item-status` vs `update-food-status` — which authoritative?

- **Context**: Two events exist. `update-item-status` is handled via `handleOrderDataEvent` (payload-carrying). `update-food-status` is the legacy event that still triggers a GET fetch and has the table-engage workaround.
- **Question**: Does the backend emit both, or only one depending on action? Is `update-food-status` deprecated? If both fire on Ready/Serve action, is there a race?
- **Impact**: Unknown. The `getOrderById` guard in `handleUpdateFoodStatus` reduces but does not eliminate race.
- **Confidence**: HIGH that two paths exist; MEDIUM on actual backend emission.

### OQ-104 — Which bill-payment endpoint is canonical: `BILL_PAYMENT` or `CLEAR_BILL`?

- **Context**:
  - `OrderEntry` directly calls `api.post(API_ENDPOINTS.BILL_PAYMENT, ...)` for collect-bill on existing orders.
  - `paymentService.collectPayment()` calls `api.post(API_ENDPOINTS.CLEAR_BILL, ...)` — but `CLEAR_BILL` is not defined in constants.
  - Test file `paymentService.test.js` asserts `CLEAR_BILL` exists and is not `'TBD'`.
- **Question**: Is `CLEAR_BILL` a planned rename for `BILL_PAYMENT`, or is it legacy? Should `paymentService` be removed?
- **Impact**: Direct; see RISK-001.
- **Confidence**: HIGH (contradiction confirmed).

### OQ-105 — BUG-281 Subtotal — is the bill print's `gst_tax` really discount-adjusted?

- **Context**: `CollectPaymentPanel` has two tax memos:
  - `taxTotals` (gross, used for UI and payment API payload): per-item linePrice × rate.
  - `printTaxTotals` (net, used only for bill print `gst_tax`/`vat_tax` overrides): per-item gross tax × `(1 − discountRatio)` + SC×avgGstRate.
- **Question**: Is the "print payload shows tax net of discount, but backend payload shows tax gross" pattern intentional? Does the backend then recompute, or does it trust what we send?
- **Impact**: Printed bill may show totals different from what backend recorded.
- **Confidence**: HIGH.

---

## Socket & State Questions

### OQ-106 — Is the `update_table` channel still used, or was it removed?

- **Context**: `socketHandlers.js` header (lines 4–6) and `useSocketEvents.js` header (lines 4–6) both say "BUG-203 (April 5, 2026): Table status is now derived from order data. The update-table socket channel is no longer subscribed to." Yet `useSocketEvents.js` lines 146, 153 subscribe to `getTableChannel(restaurantId)` and wire it to `handleUpdateTable`.
- **Question**: Was the BUG-203 fix reverted? Are the comments stale, or is the subscription stale? Who owns this?
- **Impact**: See RISK-021. Potential for duplicated state updates causing flicker.
- **Confidence**: HIGH.

### OQ-107 — How does the WebSocket authenticate?

- **Context**: `socketService.connect()` passes no `auth`, `query`, or cookie handling. Reconnect inherits.
- **Question**: Is the WebSocket authenticated implicitly (cookie, subdomain ACL) or unauthenticated (anyone can listen on `new_order_${restaurantId}` if they know the ID)?
- **Impact**: Potential privacy/security issue (see RISK-014).
- **Confidence**: HIGH.

### OQ-108 — How are engage locks recovered on disconnect?

- **Context**: `engagedOrders` and `engagedTables` are in-memory Sets. If a card is locked (engage=true) and the socket disconnects before receiving the release event, the lock persists.
- **Question**: Should reconnect flush the sets? Is there a backend recovery event ("here's the current engage state")?
- **Impact**: See RISK-020.
- **Confidence**: HIGH.

### OQ-109 — Why does `handleUpdateFoodStatus` still engage the table as a workaround?

- **Context**: Comment says backend doesn't emit update-table for item-level status changes. But the code keeps that workaround and also subscribes to `update-table` channel.
- **Question**: Does backend emit table engage for food-status changes in v2? If yes, workaround is redundant; if no, the comments about BUG-203 removing the table channel are misleading (the channel isn't only for explicit engages but also needed here).
- **Impact**: UX flicker; possible double-engage if both events fire.
- **Confidence**: HIGH.

### OQ-110 — What is the contract for `order-engage` message format?

- **Context**: Comments say `[orderId, restaurantOrderId, restaurantId, status]` (no event-name prefix). Other channels use `[eventName, id, restId, status, ...]`.
- **Question**: Was this inconsistency deliberate (saves bandwidth for a high-frequency event) or a backend bug?
- **Impact**: The handler hardcodes this shape; any backend normalization would break the UI.
- **Confidence**: HIGH.

### OQ-111 — Why is `NotificationContext` above `RestaurantContext`?

- **Context**: Provider order is Auth → Socket → Notification → Restaurant → … . The reason given in the comment is "socket only connects after login, and notification depends only on auth".
- **Question**: Is there a reason Notification can't depend on Restaurant (e.g., to scope sounds per-restaurant)? Currently it uses global soundManager.
- **Impact**: Low — just a design choice; sound preloading starts before restaurant is known.
- **Confidence**: MEDIUM.

---

## API & Integration Questions

### OQ-201 — Which toast system is canonical: shadcn Toaster or Sonner?

- **Context**: Both `ui/toaster.jsx` and `ui/sonner.jsx` exist; `App.js` mounts the former. `package.json` includes `sonner@^2.0.3`.
- **Question**: Is Sonner a planned migration, or dead code?
- **Impact**: See RISK-017.
- **Confidence**: HIGH.

### OQ-202 — What is the expected shape of `place-order` response for `order_id` capture?

- **Context**: `OrderEntry.jsx` lines 1101–1106 try three shapes: `res.data.order_id`, `res.data.data.order_id`, `res.data.new_order_ids[0]`. All three are tried sequentially.
- **Question**: Which is correct? Why do three shapes exist — is this actual backend drift, or defensive coding?
- **Impact**: BUG-273 auto-print only works if `newOrderId` is captured. If backend changes shape, capture may silently fail.
- **Confidence**: HIGH.

### OQ-203 — Can the CRM API key rotate mid-session?

- **Context**: `setCrmRestaurantId(id)` is called once on login. The map `REACT_APP_CRM_API_KEYS` is parsed once at module load.
- **Question**: If a restaurant's CRM key is rotated, does the user need to re-login? Is there a way to hot-swap without reload?
- **Impact**: Session continuity during key rotations.
- **Confidence**: HIGH.

### OQ-204 — Are the `src/data/mock*` files used at runtime or only in tests?

- **Context**: `mockMenu.js`, `mockTables.js`, `mockOrders.js`, `mockCustomers.js`, `mockConstants.js`, `notePresets.js`. Imports exist in SettingsPanel, ListFormViews, ViewEditViews, shared.jsx.
- **Question**: Which are reference data (e.g., note presets) and which are legacy fallbacks? Should they be pruned?
- **Impact**: Confusing; risk of accidentally rendering mocks instead of real data.
- **Confidence**: MEDIUM.

### OQ-205 — What is the `plugins/health-check` CRACO plugin for?

- **Context**: `frontend/plugins/health-check/` exists; `craco.config.js` references plugins folder.
- **Question**: Is it a webpack-dev-server health endpoint, a build checker, or something else? Not audited.
- **Impact**: LOW.
- **Confidence**: LOW (not examined).

### OQ-206 — Do any flows still use legacy `handleUpdateOrder`?

- **Context**: Legacy `handleUpdateOrder` is kept “for rollback reference”. Currently `update-order` routes through `handleOrderDataEvent('update-order')`, and the legacy function's body also forwards to the same — so calling either is equivalent.
- **Question**: Is there any code path that imports `handleUpdateOrder` directly instead of going through the event router?
- **Impact**: Likely none. Confirm before deletion.
- **Confidence**: HIGH (no imports seen outside `socketHandlers.js` and the barrel).

---

## Printing Questions

### OQ-301 — Why does `printOrder('bill', null, order, ...)` take `stationKot=null` when print_type is bill?

- **Context**: `orderService.printOrder` branches: if `printType === 'bill' && orderData` → use `buildBillPrintPayload` (station_kot = `''`). Else → pass-through `{order_id, print_type, station_kot}` where `station_kot` gets `''` for bill-without-order-data.
- **Question**: Why does the function accept `stationKot` when it's meaningless for bill? Signature leaks.
- **Impact**: LOW (ergonomic).
- **Confidence**: HIGH.

### OQ-302 — Who validates that the printer is online / bill printed successfully?

- **Context**: `printOrder` returns `response.data` from the print-temp-store endpoint; the caller just shows a toast "Bill request sent".
- **Question**: Is there an async confirmation (print status update), or is it fire-and-forget from the POS perspective with the physical printer potentially offline?
- **Impact**: User thinks print succeeded when it didn't.
- **Confidence**: HIGH.

### OQ-303 — Auto-print on new-order only or also on update?

- **Context**: Comment in `OrderEntry.onPaymentComplete` explicitly says auto-print is scoped to new-order. Scenario 1 (collect-bill on existing order) and item edits do NOT auto-print.
- **Question**: Is this intentional per product spec? Some POS systems auto-print bill on any settlement. Should the comment be surfaced to users (tooltip on `autoBill` setting)?
- **Impact**: Subtle behavior; staff may not realize.
- **Confidence**: HIGH.

---

## Reports & Reporting Questions

### OQ-401 — How does the business-day range handle DST transitions?

- **Context**: `utils/businessDay.js` computes start/end based on day-of-week from `selectedDate + 'T12:00:00'` (noon to avoid TZ quirks). But crossing DST boundary at 02:00 local time could shift the business-day window.
- **Question**: Is the restaurant timezone fixed in backend, or does the client's `new Date()` influence the window?
- **Impact**: Rare reporting discrepancies around DST.
- **Confidence**: MEDIUM.

### OQ-402 — Are "merged orders" distinct from "transferred orders"?

- **Context**: `reportTransform.js` has `filterMergedOrders` and `filterRoomTransferOrders`. Both involve associating one order with another.
- **Question**: What's the precise distinction? Merged = two tables combined into one order? Transferred = order moved from table to room?
- **Impact**: Report semantics.
- **Confidence**: MEDIUM.

---

## UI / UX Questions

### OQ-501 — `USE_CHANNEL_LAYOUT` and `USE_STATUS_VIEW` — are they permanent?

- **Context**: Both flags are `true` in `featureFlags.js`. Comments describe them as rollback switches.
- **Question**: Are these now the default UX? When will the legacy paths be removed?
- **Impact**: Dead code accumulation.
- **Confidence**: HIGH.

### OQ-502 — Why does `serviceChargeEnabled` default to ON on every render of CollectPaymentPanel?

- **Context**: `useState(true)` on every mount.
- **Question**: Should it persist per-session or per-restaurant default?
- **Impact**: See RISK-030.
- **Confidence**: HIGH.

### OQ-503 — Mobile / touch UX?

- **Context**: No visible responsive breakpoints beyond Tailwind defaults; `CONFIG.TOUCH_TARGET_MIN` constant exists but usage not verified.
- **Question**: Is this POS targeted at tablets, desktop terminals, or both? Any minimum viewport?
- **Impact**: Out-of-scope here.
- **Confidence**: LOW.

### OQ-504 — Why two `useEffect` in OrderEntry for syncing from OrderContext (one with stale dep)?

- **Context**: `OrderEntry.jsx` has multiple effects that react to `orders` changes. Eslint disable comment on dep array. Possibility of re-render loops.
- **Question**: Is the existing pattern intentional?
- **Impact**: Potential perf issue in high-volume restaurants.
- **Confidence**: MEDIUM.

---

## Testing Questions

### OQ-601 — What is `setupTests.polyfills.js`?

- **Context**: File exists; contents not inspected in this pass.
- **Question**: What polyfills are required for Jest / jsdom? Are they production-relevant or test-only?
- **Impact**: LOW.
- **Confidence**: LOW.

### OQ-602 — Is the `paymentService.test.js` test currently passing?

- **Context**: It asserts `CLEAR_BILL` exists with a regex `/^\/api\//`. `CLEAR_BILL` is undefined.
- **Question**: How does CI pass today? Is the test excluded? Or is CI failing and being ignored?
- **Impact**: Trust in test signals.
- **Confidence**: HIGH on the contradiction.

### OQ-603 — Do any tests cover the v2 socket event handlers?

- **Context**: `__tests__/api/socket/updateOrderStatus.test.js` and `socketEvents.test.js`, `socketServiceGlobal.test.js` exist. Scope not inspected.
- **Question**: Are `handleOrderDataEvent`, `handleOrderEngage`, `handleSplitOrder` covered?
- **Impact**: Regression safety for v2 flow.
- **Confidence**: LOW.

---

## Deployment & Environment

### OQ-701 — Are all required env vars surfaced in a `.env.example`?

- **Context**: No `.env.example` found in this clone.
- **Question**: How do new developers know the required vars? README doesn’t list them.
- **Impact**: Onboarding friction.
- **Confidence**: HIGH (file absence confirmed).

### OQ-702 — Why does `backend/requirements.txt` declare `boto3`, `pandas`, `numpy`, `cryptography`, `python-jose`, `bcrypt`, `emergentintegrations`, etc., when `server.py` uses none of them?

- **Context**: Backend is a stub; requirements file has 28 dependencies.
- **Question**: Is this template leftover from another project, or reserved for planned features?
- **Impact**: LOW (longer install times); but unclear intent.
- **Confidence**: HIGH.

### OQ-703 — Why does `backend/server.py` exist in this frontend-focused repo at all?

- **Context**: Repo name is `core-pos-front-end-` yet contains a backend stub.
- **Question**: Is this a placeholder for Emergent tooling (health checks, localhost forwarding) or a planned microservice split?
- **Impact**: Clarity of repo purpose.
- **Confidence**: HIGH.

---

## Summary of Highest-Impact Questions

| Rank | ID | Topic |
|---|---|---|
| 1 | OQ-104 | `CLEAR_BILL` vs `BILL_PAYMENT` endpoint canonical |
| 2 | OQ-101 | SC / tax calculation canonical rule |
| 3 | OQ-102 | Missing-payload fallback behavior |
| 4 | OQ-106 | Table channel usage in v2 |
| 5 | OQ-107 | WebSocket authentication |
| 6 | OQ-108 | Engage lock recovery on disconnect |
| 7 | OQ-002 | Remove-vs-update branching semantics |
| 8 | OQ-202 | `place-order` response shape for `order_id` |
| 9 | OQ-009 | Permission enumeration |
| 10 | OQ-006 | `defaultOrderStatus` semantics for each restaurant |
