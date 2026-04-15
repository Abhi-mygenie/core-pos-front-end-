# REFACTOR_BACKLOG.md
## MyGenie Restaurant POS — Safe Refactor Backlog

> Derived from: VALIDATED_ARCHITECTURE.md (Sections 1-8), RISK_REGISTER.md
> Each item traces to specific evidence. No assumed behavior.
> Classification: **Refactor Now** | **Validate First** | **Backend Confirmation First**

---

## Traceability Matrix

| Backlog Item | Source Risks | Source Contradictions | Blocked By | Classification |
|--------------|-------------|----------------------|------------|----------------|
| P0-1 | RISK-001 | CONTRADICTION-1 | RV-1 | Validate First |
| P0-2 | RISK-007 | CONTRADICTION-2 | RV-1, BC-7 | Validate First |
| P0-3 | RISK-003 | — | — | Refactor Now |
| P0-4 | RISK-004 | — | BC-2 | Backend Confirmation First |
| P0-5 | RISK-002 | — | RV-3 | Validate First |
| P1-1 | RISK-005 | — | — | Refactor Now |
| P1-2 | RISK-008 | CONTRADICTION-3 | RV-4 | Validate First |
| P1-3 | RISK-006 | — | — | Refactor Now |
| P1-4 | — | CONTRADICTION-5 | BC-2 | Backend Confirmation First |
| P1-5 | — | CONTRADICTION-4 | — | Refactor Now |
| P1-6 | RISK-010 | — | — | Refactor Now |
| P2-1 | RISK-011 | — | — | Refactor Now |
| P2-2 | RISK-012 | — | — | Refactor Now |
| P2-3 | RISK-013 | — | — | Refactor Now |
| P2-4 | RISK-014 | — | — | Refactor Now |
| P2-5 | RISK-015 | — | Backend API needed | Backend Confirmation First |
| P2-6 | RISK-016 | — | BC-1 | Backend Confirmation First |
| P2-7 | RISK-017 | — | Backend API needed | Backend Confirmation First |

---

## Recommended Execution Order

```
PHASE 1 — Safe immediate refactors (no blockers):
  P0-3 → P1-1 → P1-3 → P1-5 → P1-6

PHASE 2 — After RV-1 validation (financial trust):
  P0-1 → P0-2 → P0-5

PHASE 3 — After BC-2 confirmation (table free/engage):
  P0-4 → P1-4

PHASE 4 — After RV-4 validation (multi-order per table):
  P1-2

PHASE 5 — Cleanup (anytime, low risk):
  P2-1 → P2-2 → P2-3 → P2-4

PHASE 6 — Backend-dependent (when APIs confirmed/provided):
  P2-5 → P2-6 → P2-7
```

---

## P0 — Critical Refactor Tracks

Issues affecting financial correctness, order state correctness, socket/API consistency, or table lock correctness.

---

### P0-1: Unify Tax Calculation into a Single Shared Function

**Classification**: VALIDATE FIRST (blocked by RV-1)

**Problem Statement**:
Tax for the same items is calculated independently in 3 locations using different formulas. For items with addons/variations, the results diverge. The cart total (OrderEntry) shows a LOWER tax than both the API payload (buildCartItem) and the payment panel (CollectPaymentPanel) because it excludes addon/variation prices from the tax base.

**Root Cause from Code**:
Three independent implementations evolved separately without a shared utility:
- `buildCartItem()` at `orderTransform.js:267-278` — tax on `(base + addon + variation) * qty`
- `OrderEntry.jsx:335-341` — tax on `item.price * qty` (NO addons/variations)
- `CollectPaymentPanel.jsx:64-86` — tax on `getItemLinePrice()` which includes addons/variations

**Concrete divergence** (from CONTRADICTION-1):
> Item: price=100, 1 addon at price=20 qty=2, item qty=3, tax 5% Exclusive
> - buildCartItem: tax = 21, OrderEntry: tax = 15, CollectPaymentPanel: tax = 21

**Affected Files/Modules**:
- `api/transforms/orderTransform.js` — `buildCartItem()`, lines 262-278
- `components/order-entry/OrderEntry.jsx` — lines 331-364
- `components/order-entry/CollectPaymentPanel.jsx` — `taxTotals` useMemo, lines 64-86; `getItemLinePrice()`, lines 48-59

**Evidence**: RISK-001, CONTRADICTION-1, RULE-8a, RULE-8b, DEF-2

**Severity**: HIGH — financial amounts diverge between display and API submission.

**Prerequisite Validations**:
- **RV-1 MUST be completed first.** If backend recalculates totals, the severity drops to LOW (display-only). If backend trusts frontend values, this is CRITICAL and must be the first thing fixed.

**Suggested Refactor Direction**:
1. Extract a single `calcItemFinancials(item, taxConfig)` utility function
2. Function takes an item (with addons, variations) and restaurant tax config
3. Returns `{ lineTotal, taxAmount, gstAmount, vatAmount }`
4. All 3 locations import and call this function
5. No changes to data shapes, API payloads, or component interfaces

**Expected Outcome**:
- Cart total, payment panel, and API payload show identical tax for the same items
- Single location to maintain/fix tax logic going forward

**Execution Order**: PHASE 2, first item (after RV-1).

---

### P0-2: Wire CollectPaymentPanel to API-Provided Totals (or Shared Calc)

**Classification**: VALIDATE FIRST (blocked by RV-1, BC-7)

**Problem Statement**:
For existing (already-placed) orders, the Collect Bill flow recalculates all financial totals locally from cart items and sends THOSE values to the backend. The backend's own calculated totals (`orderFinancials` from the GET single-order response) are available as a prop but are never used in the payment→API path.

**Root Cause from Code**:
`CollectPaymentPanel` was built as a standalone calculator. It receives `orderFinancials` as a prop but only references it for room transfer display. The `handlePayment()` function builds `paymentData` entirely from local calculations, which is then passed to `collectBillExisting()` in `orderTransform.js`.

**Traced data flow** (from CONTRADICTION-2):
```
CollectPaymentPanel.getItemLinePrice() → taxTotals useMemo → handlePayment() → paymentData
  → OrderEntry.onPaymentComplete() → orderToAPI.collectBillExisting() → API
```
At no point in this chain is `orderFinancials.amount` consulted.

**Affected Files/Modules**:
- `components/order-entry/CollectPaymentPanel.jsx` — lines 48-86 (calc), 192-213 (paymentData), entire component
- `components/order-entry/OrderEntry.jsx` — line 731 (passthrough)
- `api/transforms/orderTransform.js` — lines 595-640 (`collectBillExisting`)

**Evidence**: RISK-007, CONTRADICTION-2, RULE-1a, Section 8.1 (Pipeline B), Section 8.2

**Severity**: HIGH — payment amounts sent to backend may differ from backend's own order total.

**Prerequisite Validations**:
- **RV-1**: Determines if backend trusts these values or recalculates. If recalculates, this is display-only.
- **BC-7**: Confirms whether `collectBillExisting` requires `total_gst_tax_amount` (different schema than place-order). If schemas differ, wiring `orderFinancials` directly may not provide the right field names.
- **P0-1**: Should be completed first — if tax calc is unified, CollectPaymentPanel uses the shared function and divergence is reduced even without wiring `orderFinancials`.

**Suggested Refactor Direction** (two options depending on RV-1 result):

*Option A — If backend recalculates (RV-1 = backend independent)*:
- No change to API payload construction. It's advisory.
- Fix display only: wire `orderFinancials.amount` as the bill total shown to user for placed orders.
- Local calc becomes a preview, not authoritative.

*Option B — If backend trusts frontend (RV-1 = backend trusts)*:
- After P0-1 (shared calc), CollectPaymentPanel uses the shared `calcItemFinancials` for tax and `buildCartItem`-equivalent for line totals.
- This ensures the same calculation path feeds both Place Order and Collect Bill.
- For existing orders with no new items: consider using `orderFinancials.amount` directly as `payment_amount` (skip local recalc). Requires confirming `orderFinancials` includes all discount/tip adjustments.

**Expected Outcome**:
- Collect Bill sends values consistent with Place Order for the same items.
- OR: Collect Bill uses backend-provided totals for existing orders (no local recalc needed).

**Execution Order**: PHASE 2, second item (after P0-1).

---

### P0-3: Add Per-OrderId Dedup/Serialization for Socket Handlers

**Classification**: REFACTOR NOW

**Problem Statement**:
Multiple socket events for the same orderId can fire in rapid succession. Each triggers an independent `fetchOrderWithRetry()` HTTP call. If responses arrive out of order, the last-write-wins `updateOrder()` call may write stale data to context.

**Root Cause from Code**:
Socket handlers are stateless functions. No tracking of in-flight requests per orderId. Each handler independently calls:
```
const order = await fetchOrderWithRetry(orderId, actions);
if (order) actions.updateOrder(order);
```
If two events fire for the same orderId 50ms apart, two GET calls run concurrently. The slower one may return data from before the faster one's trigger event was processed by backend.

**Affected Files/Modules**:
- `api/socket/socketHandlers.js` — `handleUpdateOrder` (line 205), `handleUpdateFoodStatus` (line 244), `handleUpdateOrderStatus` (line 282), `handleScanNewOrder` (line 327), `handleDeliveryAssignOrder` (line 355)

**Evidence**: RISK-003, INV-2a (API is sole authority, but concurrent calls break this guarantee)

**Severity**: HIGH — context can hold stale order data after rapid status changes.

**Prerequisite Validations**: None — safe to implement now.

**Suggested Refactor Direction**:
1. Add an `inflightOrders` Map (orderId → AbortController) to `socketHandlers.js` module scope
2. Before each `fetchOrderWithRetry`, check if orderId already in-flight
3. If yes: abort the previous request (via AbortController), start a new one
4. If no: start normally
5. On completion/error: remove from map
6. This ensures only the LATEST socket event's enrichment survives for any given orderId

Implementation sketch:
```js
const inflightOrders = new Map();

const debouncedFetch = async (orderId, actions) => {
  if (inflightOrders.has(orderId)) {
    inflightOrders.get(orderId).abort();
  }
  const controller = new AbortController();
  inflightOrders.set(orderId, controller);
  try {
    const order = await fetchOrderWithRetry(orderId, actions, controller.signal);
    return order;
  } finally {
    if (inflightOrders.get(orderId) === controller) {
      inflightOrders.delete(orderId);
    }
  }
};
```

**Expected Outcome**:
- Only the latest enrichment for any orderId completes
- No stale data writes from out-of-order responses
- Reduced API load from redundant GET calls

**Execution Order**: PHASE 1, first item. No dependencies. Highest value-for-effort.

---

### P0-4: Remove BUG-216 Workaround (or Formalize It)

**Classification**: BACKEND CONFIRMATION FIRST (blocked by BC-2)

**Problem Statement**:
Every `update-table free` socket event is treated as `engage` (locks the table). This was a workaround for BUG-216 where the backend sent `free` for cancel-item instead of `engage`. If the backend has been fixed, this workaround creates unnecessary 1-2s table locks on every "actual free" event.

**Root Cause from Code**:
```js
// socketHandlers.js:402-407
// BUG-216 workaround: backend sends `free` for cancel-item, should send `engage`
if (status === 'free') {
  actions.setTableEngaged(tableId, true); // ← LOCK instead of FREE
  return;
}
```

**Affected Files/Modules**:
- `api/socket/socketHandlers.js` — `handleUpdateTable`, lines 398-410

**Evidence**: RISK-004, RULE-3, DEF-1 (engaged lifecycle)

**Severity**: HIGH — tables stuck as engaged if the only unlock path (order event → GET enrichment → rAF unlock) doesn't fire for this specific table event.

**Prerequisite Validations**:
- **BC-2**: Ask backend team: "Has the `update-table` socket event been fixed to send `engage` instead of `free` for cancel-item operations?"

**Suggested Refactor Direction** (depends on BC-2 answer):

*If backend IS fixed*:
- Remove the `if (status === 'free')` block entirely
- Let `free` status flow through to `updateTableStatus()` which will set the table as available

*If backend is NOT fixed*:
- Keep the workaround but add an automatic unlock timeout:
  ```js
  actions.setTableEngaged(tableId, true);
  setTimeout(() => {
    actions.setTableEngaged(tableId, false);
  }, 3000); // safety net: unlock after 3s if no order event releases it
  ```
- Document this explicitly in code as a known temporary measure

**Expected Outcome**:
- Tables no longer stuck as locked from `free` events
- If workaround kept: bounded lock duration (max 3s instead of indefinite)

**Execution Order**: PHASE 3, after BC-2 response.

---

### P0-5: Audit and Harden `unit_price` vs `price` in `fromAPI.orderItem()`

**Classification**: VALIDATE FIRST (blocked by RV-3)

**Problem Statement**:
`fromAPI.orderItem()` uses `unit_price` as canonical price with fallback to `price`. The comment warns that socket's `price` field = total (unit_price x qty), which would cause double-multiplication if used directly. If any API response provides `unit_price` as a total instead of per-unit, all financial calculations downstream are wrong.

**Root Cause from Code**:
```js
// orderTransform.js:80-81
price: api.unit_price || api.price || 0,
// Comment: "unit_price preferred — socket `price` is total (unit_price × qty)"
```
This heuristic depends on `unit_price` ALWAYS being per-unit across ALL API responses (socket payload, GET single-order, running orders list). If any endpoint has a different convention, this breaks silently.

**Affected Files/Modules**:
- `api/transforms/orderTransform.js` — `fromAPI.orderItem()`, line 80

**Evidence**: RISK-002, Section 8.1 (both pipelines consume price from this transform)

**Severity**: HIGH — affects every financial calculation downstream.

**Prerequisite Validations**:
- **RV-3**: Inspect the `new-order` socket payload's item-level fields. Check: is `unit_price` per-unit? Is `price` total? Are they both present?
- Additionally: inspect GET single-order response for the same order. Compare field values.
- Check: are there items where `unit_price` is null/0? What does the fallback to `price` produce?

**Suggested Refactor Direction**:
1. After validation confirms the field semantics, add an explicit assertion/guard:
   ```js
   const unitPrice = api.unit_price || api.price || 0;
   // Guard: if price looks like a total (price == unitPrice * qty), use unitPrice
   if (api.price && api.unit_price && Math.abs(api.price - api.unit_price * api.quantity) < 0.01) {
     // price IS total, unit_price IS per-unit — expected
   } else if (!api.unit_price && api.price) {
     // Only price available — log warning, assume per-unit
     console.warn(`[orderTransform] item ${api.item_id}: using 'price' as unit_price (unit_price missing)`);
   }
   ```
2. This guard is defensive, not behavioral — it logs anomalies without changing logic.

**Expected Outcome**:
- Confirmed correct price extraction semantics with documentation
- Defensive logging catches any future API changes immediately
- No silent double-multiplication risk

**Execution Order**: PHASE 2, third item.

---

## P1 — High-Impact Structural Refactors

Issues causing repeated bugs, unclear ownership, hard-to-maintain logic, or inconsistent module behavior.

---

### P1-1: Lift Socket Subscriptions Above DashboardPage

**Classification**: REFACTOR NOW

**Problem Statement**:
`useSocketEvents()` is called only in `DashboardPage`. Navigating to `/reports/*` unmounts the hook, unsubscribes from socket channels, and loses all events during the navigation. Returning to the dashboard shows stale data until the next event or manual refresh.

**Root Cause from Code**:
`useSocketEvents()` is called at `DashboardPage.jsx:107`. It's a hook that subscribes to socket channels and wires event handlers. React unmounts it on route change. No catch-up or re-sync mechanism exists.

**Affected Files/Modules**:
- `pages/DashboardPage.jsx` — line 107 (current call site)
- `api/socket/useSocketEvents.js` — the hook itself
- `contexts/AppProviders.jsx` — potential new call site

**Evidence**: RISK-005, RULE-4, INV-5a (dashboard is eventually-consistent but only when subscribed)

**Severity**: MEDIUM — stale data on return from reports.

**Prerequisite Validations**: None — safe to implement now.

**Suggested Refactor Direction**:
1. Create a `SocketEventManager` component (no UI) that calls `useSocketEvents()`
2. Place it inside `AppProviders.jsx`, after OrderProvider (needs all contexts)
3. Gate it with `isAuthenticated && restaurant?.id` (same conditions as current)
4. Remove `useSocketEvents()` call from `DashboardPage.jsx`
5. Socket events now fire regardless of which page is active

Guard:
- Must be INSIDE the provider tree (needs all context setters)
- Must only mount when authenticated + restaurant loaded

**Expected Outcome**:
- Socket events are received on all pages (dashboard, reports, order entry)
- No more stale data on dashboard return
- No behavior change to existing logic — just a wider subscription scope

**Execution Order**: PHASE 1, second item.

---

### P1-2: Harmonize `getOrderByTableId` and `orderItemsByTableId`

**Classification**: VALIDATE FIRST (blocked by RV-4)

**Problem Statement**:
Two methods for looking up orders by tableId use opposite strategies: `getOrderByTableId` returns the FIRST match, `orderItemsByTableId` keeps the LAST. DashboardPage uses both for different purposes, potentially returning different orders for the same table.

**Root Cause from Code**:
- `getOrderByTableId(tableId)` → `orders.find()` → FIRST match — `OrderContext.jsx:157-159`
- `orderItemsByTableId` useMemo → loop with `map[tableId] = order` → LAST match — `OrderContext.jsx:192-216`

**Affected Files/Modules**:
- `contexts/OrderContext.jsx` — both functions
- `pages/DashboardPage.jsx` — line 187 (grid enrichment, uses `getOrderByTableId`), line 474 (`getOrderDataForEntry`, uses `orderItemsByTableId`)

**Evidence**: RISK-008, CONTRADICTION-3, INV-5c

**Severity**: MEDIUM — dashboard grid and OrderEntry may show different orders for same table.

**Prerequisite Validations**:
- **RV-4**: Confirm whether multiple running orders can exist for the same `table_id`. If impossible, both methods return the same result and this is a cosmetic fix. If possible, this is a data integrity issue.

**Suggested Refactor Direction** (depends on RV-4):

*If multiple orders per table are impossible*:
- Align both methods to use `find()` (first match) for clarity
- Add a dev-mode assertion in `addOrder` that logs if a duplicate `tableId` is detected

*If multiple orders per table are possible*:
- `orderItemsByTableId` should be `ordersByTableId: Map<tableId, order[]>` (array, not single)
- `getOrderByTableId` should return the array, let consumers choose
- DashboardPage grid must handle multi-order display per table

**Expected Outcome**:
- Consistent order lookup regardless of which method is used
- If multi-order possible: explicit handling instead of silent data loss

**Execution Order**: PHASE 4, after RV-4.

---

### P1-3: Route OrderEntry API Calls Through Service Layer

**Classification**: REFACTOR NOW

**Problem Statement**:
`OrderEntry.jsx` makes 8+ direct `api.post`/`api.put` calls instead of using the service layer (`services/*.js`). This means error handling, request/response logging, and transform application are inconsistent with the rest of the app.

**Root Cause from Code**:
OrderEntry was likely the earliest and largest component built, before the service pattern was established. Direct `api` calls were never migrated.

**Affected Files/Modules**:
- `components/order-entry/OrderEntry.jsx` — lines 384, 401, 432, 445, 455, 467, 497, 516
- `api/services/orderService.js` — should absorb these calls
- `api/services/paymentService.js` — dead code, should absorb collect-bill

**Evidence**: RISK-006

**Severity**: MEDIUM — maintenance burden, inconsistent error handling.

**Prerequisite Validations**: None — pure structural refactor, no behavior change.

**Suggested Refactor Direction**:
1. For each direct `api.post`/`api.put` in OrderEntry:
   - Create/extend corresponding service function in `services/orderService.js`
   - Service function calls `api.post/put` with the same endpoint and transform
   - OrderEntry imports the service function instead of `api`
2. Replace dead `paymentService.js` (references non-existent `CLEAR_BILL`) with working collect-bill service
3. NO changes to transforms, endpoints, or payload shapes — pure routing change

Migration order (safest to riskiest):
1. `cancelItem` — simple PUT, low risk
2. `cancelOrder` — simple PUT, low risk
3. `shiftTable`, `mergeTable`, `transferFood` — simple POSTs
4. `placeOrder` — multipart/form-data, test carefully
5. `updateOrder` — JSON PUT
6. `collectBill` — POST to v2 endpoint

**Expected Outcome**:
- All API calls go through service layer
- Consistent error handling and logging
- OrderEntry imports only services, not raw `api`

**Execution Order**: PHASE 1, third item.

---

### P1-4: Add Engage Lock to `handleUpdateFoodStatus`

**Classification**: BACKEND CONFIRMATION FIRST (blocked by BC-2)

**Problem Statement**:
`handleUpdateFoodStatus` updates the order in context and syncs table status but does NOT release the engaged lock. If a preceding `update-table engage` event locked the table, this handler's completion doesn't release it. The table stays locked until a different handler (update-order, update-order-status) fires and unlocks.

**Root Cause from Code**:
```
handleUpdateFoodStatus: fetchOrderWithRetry → updateOrder → syncTableStatus
  → NO setTableEngaged(false)  ← GAP
```
Compare with `handleUpdateOrder` which DOES call `setTableEngaged(false)` after the same sequence.

**Affected Files/Modules**:
- `api/socket/socketHandlers.js` — `handleUpdateFoodStatus`, lines 244-269

**Evidence**: CONTRADICTION-5, Section 1.2 (event→handler→lock table), DEF-1 (engaged lifecycle)

**Severity**: MEDIUM — table can stay locked if `update-food-status` is the last event in a sequence.

**Prerequisite Validations**:
- **BC-2**: Understand which socket events the backend sends for food status changes. If backend sends `update-table engage` before `update-food-status`, the lock is acquired but never released. If backend doesn't send `engage` for food status changes, the lock is never acquired and the gap is irrelevant.

**Suggested Refactor Direction**:
1. Add `setTableEngaged(tableId, false)` with double-rAF pattern at the end of `handleUpdateFoodStatus`, matching the pattern in `handleUpdateOrder`
2. This is safe even if the table wasn't previously locked (unlocking a non-locked table is a no-op in the Set)

**Expected Outcome**:
- Consistent lock/unlock behavior across all order-related socket handlers
- No more asymmetric lock behavior depending on which event fires last

**Execution Order**: PHASE 3, after BC-2 (along with P0-4).

---

### P1-5: Normalize Round-Off Convention

**Classification**: REFACTOR NOW

**Problem Statement**:
`calcOrderTotals` produces `round_up` as positive-or-zero. `CollectPaymentPanel` produces `roundOff` that can be negative. The `collectBillExisting` transform hardcodes `round_up: 0`, ignoring both. If this field is ever wired correctly, the sign mismatch will cause issues.

**Root Cause from Code**:
- `orderTransform.js:328` — `roundUp = diff >= 0.10 ? diff : 0` — always ≥ 0
- `CollectPaymentPanel.jsx:157` — `roundOff = roundDiff >= 0.10 ? roundDiff : -Math.round(...)` — can be negative
- `orderTransform.js:617` — `round_up: 0` — hardcoded, ignores both

**Affected Files/Modules**:
- `api/transforms/orderTransform.js` — `calcOrderTotals()` line 328, `collectBillExisting()` line 617
- `components/order-entry/CollectPaymentPanel.jsx` — line 157

**Evidence**: CONTRADICTION-4

**Severity**: LOW currently (hardcoded to 0), but MEDIUM if field is ever wired.

**Prerequisite Validations**: None — can be done now as a defensive normalization.

**Suggested Refactor Direction**:
1. Define round-off convention: `round_up` = positive means "rounded up", negative means "rounded down"
2. Apply consistently in both `calcOrderTotals` and `CollectPaymentPanel`
3. In `collectBillExisting`, wire `paymentData.roundOff` instead of hardcoding 0 (after confirming backend accepts it)

**Expected Outcome**:
- Consistent round-off sign convention across codebase
- `collectBillExisting` sends actual round-off value instead of 0

**Execution Order**: PHASE 1, fourth item.

---

### P1-6: Add Session Keep-Alive or Token Refresh Warning

**Classification**: REFACTOR NOW

**Problem Statement**:
Auth uses a single Bearer JWT with no refresh mechanism. Long-running POS sessions (8-12 hours is common in restaurants) will eventually get 401'd mid-operation, potentially losing an in-progress order.

**Root Cause from Code**:
No refresh token endpoint in `constants.js`. No token expiry parsing. Session survives until server-side expiry triggers a 401, which is caught by the Axios interceptor and triggers a hard redirect to login.

**Affected Files/Modules**:
- `api/axios.js` — 401 interceptor, lines 41-51
- `api/services/authService.js` — no refresh function
- `api/constants.js` — no refresh endpoint

**Evidence**: RISK-010

**Severity**: MEDIUM — common scenario in restaurant POS usage.

**Prerequisite Validations**: None for the warning. Token refresh would need backend API.

**Suggested Refactor Direction** (phased):

*Phase A — Defensive warning (Refactor Now)*:
1. Parse JWT expiry from token (`atob(token.split('.')[1])` → `exp` field)
2. In Axios request interceptor, before attaching token:
   - If token expires within 15 minutes, dispatch a non-blocking UI warning (toast)
   - If token is already expired, trigger re-login immediately (don't wait for 401)
3. This gives staff time to finish current order before session expires

*Phase B — Token refresh (needs backend API)*:
1. Add refresh endpoint to `constants.js`
2. In 401 interceptor, attempt refresh before hard redirect
3. Queue failed requests, replay after refresh success

**Expected Outcome**:
- Phase A: Staff sees "Session expiring soon" 15 min before logout. In-progress orders not lost.
- Phase B: Seamless session renewal without interruption.

**Execution Order**: PHASE 1, fifth item (Phase A only). Phase B is P2-level and backend-dependent.

---

## P2 — Cleanup / Non-Critical Improvements

Issues that improve maintainability but are not urgent.

---

### P2-1: Remove Dead `paymentService.js`

**Classification**: REFACTOR NOW

**Problem Statement**: `paymentService.collectPayment()` references `API_ENDPOINTS.CLEAR_BILL` which does not exist in `constants.js`. The file is never imported anywhere.

**Root Cause from Code**: Legacy code from an earlier API version, never cleaned up.

**Affected Files**: `api/services/paymentService.js`

**Evidence**: RISK-011

**Severity**: LOW — dead code, no runtime impact.

**Suggested Refactor Direction**: Delete `paymentService.js`. If P1-3 is done first, create a new proper collect-bill service function in `orderService.js`.

**Expected Outcome**: No dead code. Clean service directory.

**Execution Order**: PHASE 5, first item. Can be done alongside P1-3.

---

### P2-2: Dynamic SGST/CGST Tax Labels

**Classification**: REFACTOR NOW

**Problem Statement**: CollectPaymentPanel displays "SGST (2.5%)" and "CGST (2.5%)" as hardcoded strings regardless of actual restaurant tax rate.

**Root Cause from Code**: `CollectPaymentPanel.jsx:504-510, 655-661` — hardcoded JSX strings. The actual rate IS available from `restaurant.taxPercentage`.

**Affected Files**: `components/order-entry/CollectPaymentPanel.jsx`

**Evidence**: RISK-012

**Severity**: LOW — display label only, calculation uses correct rate.

**Suggested Refactor Direction**: Replace hardcoded "2.5%" with `{(restaurant.taxPercentage / 2).toFixed(1)}%` (SGST = CGST = half of total GST).

**Expected Outcome**: Correct tax rate labels for all restaurants.

**Execution Order**: PHASE 5, second item.

---

### P2-3: Eliminate Double `buildCartItem` Mapping

**Classification**: REFACTOR NOW

**Problem Statement**: `placeOrder()` calls `unplacedItems.map(buildCartItem)` for the cart array AND again for `calcOrderTotals()`, processing each item through the same function twice.

**Root Cause from Code**: `orderTransform.js:406-407` — two separate `.map(buildCartItem)` calls on the same input.

**Affected Files**: `api/transforms/orderTransform.js` — `toAPI.placeOrder()`, `toAPI.updateOrder()`

**Evidence**: RISK-013

**Severity**: LOW — performance only, no logic error.

**Suggested Refactor Direction**:
```js
const builtItems = unplacedItems.map(buildCartItem);
const totals = calcOrderTotals(builtItems); // reuse already-built items
const cart = builtItems.map(({ _fullUnitPrice, ...item }) => item); // strip internal field
```

**Expected Outcome**: Each item processed once instead of twice. ~2x faster for large orders.

**Execution Order**: PHASE 5, third item.

---

### P2-4: Remove Mock Data Files from Production Bundle

**Classification**: REFACTOR NOW

**Problem Statement**: `data/mock*.js` files (mockConstants, mockCustomers, mockMenu, mockOrders, mockTables) are included in the production bundle, increasing size. Only `notePresets.js` appears to be actively used.

**Root Cause from Code**: Development mock data was never moved to a dev-only location or excluded from build.

**Affected Files**: `data/mockConstants.js`, `data/mockCustomers.js`, `data/mockMenu.js`, `data/mockOrders.js`, `data/mockTables.js`

**Evidence**: RISK-014

**Severity**: LOW — bundle size only.

**Prerequisite**: Verify no component imports these files (`grep -r "mock" src/ --include="*.js" --include="*.jsx"`)

**Suggested Refactor Direction**: Move mock files to `src/__tests__/fixtures/` or `src/__mocks__/`. Update any test imports.

**Expected Outcome**: Smaller production bundle. Cleaner source directory.

**Execution Order**: PHASE 5, fourth item.

---

### P2-5: Server-Side Coupon Validation

**Classification**: BACKEND CONFIRMATION FIRST

**Problem Statement**: Coupon codes are validated client-side against a hardcoded list (FLAT50, SAVE10) plus customer-provided coupons. No API call validates the coupon server-side.

**Root Cause from Code**: `CollectPaymentPanel.jsx:163-188` — `handleApplyCoupon()` checks against local `generalCoupons` array and `customerCoupons` prop.

**Affected Files**: `components/order-entry/CollectPaymentPanel.jsx`

**Evidence**: RISK-015

**Severity**: LOW — business logic gap, minor revenue risk.

**Prerequisite**: Need backend API endpoint for coupon validation. Check with backend team.

**Suggested Refactor Direction**: Add API call in `handleApplyCoupon` to validate coupon code, get discount amount, check eligibility.

**Expected Outcome**: Coupons validated server-side. Invalid/expired coupons rejected.

**Execution Order**: PHASE 6.

---

### P2-6: Socket Authentication

**Classification**: BACKEND CONFIRMATION FIRST (blocked by BC-1)

**Problem Statement**: Socket.IO connection is established without any authentication token. If the server doesn't validate connections, any client can subscribe to any restaurant's events.

**Root Cause from Code**: `socketService.js:53-67` — connection options have no `auth`, `query`, or token field.

**Affected Files**: `api/socket/socketService.js`

**Evidence**: RISK-016, BC-1

**Severity**: LOW (uncertain until BC-1 confirms) — potentially HIGH if server is unauthenticated.

**Prerequisite**: **BC-1**: Confirm socket server auth requirements.

**Suggested Refactor Direction** (if server supports auth):
```js
const socket = io(SOCKET_URL, {
  ...options,
  auth: { token: localStorage.getItem('auth_token') },
});
```

**Expected Outcome**: Socket connections authenticated. Unauthorized access prevented.

**Execution Order**: PHASE 6.

---

### P2-7: Resolve TBD Endpoints for Edit Placed Item

**Classification**: BACKEND CONFIRMATION FIRST

**Problem Statement**: `EDIT_ORDER_ITEM` and `EDIT_ORDER_ITEM_QTY` are `'TBD'` in constants. The feature to edit quantity of already-placed items is not functional — `updateQuantity` in OrderEntry has a TODO stub for placed items.

**Root Cause from Code**: `api/constants.js:37-38` — both endpoints set to `'TBD'` with CHG-040 tag.

**Affected Files**: `api/constants.js`, `components/order-entry/OrderEntry.jsx` (updateQuantity handler)

**Evidence**: RISK-017

**Severity**: LOW — feature gap, not a bug.

**Prerequisite**: Backend team must provide the actual endpoints and expected payload schema.

**Suggested Refactor Direction**: When endpoints are provided, implement `orderService.editItem()` and wire into OrderEntry's `updateQuantity` handler for placed items.

**Expected Outcome**: Users can modify quantity of already-placed items without cancelling and re-adding.

**Execution Order**: PHASE 6.

---

## Summary

| Priority | Count | Refactor Now | Validate First | Backend Confirm First |
|----------|-------|-------------|----------------|----------------------|
| P0 | 5 | 1 | 3 | 1 |
| P1 | 6 | 4 | 1 | 1 |
| P2 | 7 | 4 | 0 | 3 |
| **Total** | **18** | **9** | **4** | **5** |

**Immediate action items** (Phase 1 — no blockers):
1. P0-3: Socket dedup per orderId
2. P1-1: Lift socket subscriptions
3. P1-3: Route OrderEntry through services
4. P1-5: Normalize round-off
5. P1-6: Token expiry warning

**Validation required before further refactors**:
- RV-1 (financial trust) → unlocks P0-1, P0-2, P0-5
- RV-4 (multi-order per table) → unlocks P1-2
- BC-2 (table free/engage fix) → unlocks P0-4, P1-4
