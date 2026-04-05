# POS Frontend - Bug Tracker & Audit Document

**Last Updated:** Feb 2026

---

## NOTE-200: `addOrder` Console Log Appears Twice on New Order (React StrictMode)

**Status:** NO ACTION NEEDED (Dev-only artifact)
**Priority:** P3 (Informational)
**Reported:** April 5, 2026

### Symptom
After placing a new order, `[OrderContext] addOrder: Adding new order 730305` appears **twice** in the console.

### Root Cause
**React StrictMode** (development mode only). React 18+ intentionally double-invokes state updater functions to detect impure logic. The `console.log` inside `setOrdersState(prev => { ... })` in `OrderContext.jsx` runs twice, but the second run is discarded — state is only updated once.

### Evidence
- `[Socket] Event received` — logs **once** (server sends event once)
- `[useSocketEvents] Order channel event` — logs **once** (listener registered once)
- `[SocketHandler] new-order received` — logs **once** (handler called once)
- `[SocketHandler] new-order: Added order` — logs **once** (loop runs once)
- `[OrderContext] addOrder: Adding new order` — logs **twice** (inside state updater → StrictMode double-invoke)

Every log outside a state updater appears once. Only the log inside the state updater appears twice.

### Action
- No code change needed
- **Must verify in production** — this double-log should NOT appear in production builds (StrictMode is dev-only)
- If it still appears in production, the investigation should shift to duplicate socket listener registration

---

## BUG-201: Duplicate `get-single-order-new` API Calls on Update Order

**Status:** FIXED ✅
**Priority:** P0
**Reported:** April 4, 2026
**Fixed:** April 5, 2026
**Verified:** April 5, 2026 (User console logs confirmed 1 API call)

### Root Cause
Both `OrderEntry.jsx` and `socketHandlers.js` called `fetchSingleOrderForSocket()` after update order.

### Fix Applied
1. Removed `fetchSingleOrderForSocket` from `handlePlaceOrder` update path in `OrderEntry.jsx`
2. Added optimistic local marking (items set to `placed: true`)
3. Expanded `useEffect` to sync from `OrderContext` on any financial change
4. Socket handler remains the only caller of `fetchSingleOrderForSocket`

### Verified Console Flow (Update Order)
```
update-order socket → handleUpdateOrder → fetchSingleOrderForSocket (1 call only)
    → OrderContext.updateOrder → useEffect sync → cartItems + financials updated
```

---

## BUG-202: Duplicate `get-single-order-new` API Calls on Cancel Item

**Status:** FIXED ✅
**Priority:** P0
**Reported:** April 4, 2026
**Fixed:** April 5, 2026
**Verified:** April 5, 2026 (User console logs confirmed 1 API call, `[CancelFood] Waiting for socket sync`)

### Root Cause
`handleCancelFood` in `OrderEntry.jsx` called `fetchSingleOrderForSocket` directly after cancel API success.

### Fix Applied
1. Removed `fetchSingleOrderForSocket` from `handleCancelFood`
2. Socket `update-order-status` handler fetches and updates OrderContext
3. `useEffect` syncs cartItems + financials from context
4. `fetchSingleOrderForSocket` import fully removed from `OrderEntry.jsx`

---

## BUG-203: Redundant `update-table` Socket Event Handling

**Status:** FIXED ✅
**Priority:** P1
**Reported:** April 4, 2026
**Fixed:** April 5, 2026
**Verified:** April 5, 2026 (Console shows no `update-table` events, table status derived from order data)

### Root Cause
Server emits on 2 channels for every order action. `update-table` on table channel was redundant — order data already has `table_id` and `f_order_status`.

### Fix Applied
1. Removed table channel subscription from `useSocketEvents.js`
2. Added `syncTableStatus()` helper in `socketHandlers.js`
3. All order handlers now derive and update table status from order data
4. Single source of truth: OrderContext → table status derived from order

### Backend Team Note
Server still emits `update-table` on `update_table_{restaurantId}` channel — we just don't subscribe to it anymore. Questions documented in API_MAPPING_AUDIT.md Section 8.

---

## BUG-204: `order_sub_total_without_tax` Returns 0 from Backend API

**Status:** BLOCKED (Backend team required)
**Priority:** P1
**Reported:** April 4, 2026

### Symptom
`get-single-order-new` API always returns `order_sub_total_without_tax: 0`. Frontend uses `order_sub_total_amount` as fallback.

### Action Required
Backend team must fix. Documented for handover.

---

## BUG-205: Cancel Complete Order — Race Condition (Order Re-added)

**Status:** FIXED ✅
**Priority:** P0
**Reported:** April 5, 2026
**Fixed:** April 5, 2026
**Verified:** April 5, 2026 (Console: `Order 730308 already removed (full cancel), skipping`)

### Root Cause
Old flow used per-item `PUT /food-status-update` loop (N API calls, N socket events). Socket arrived before HTTP response → handler found order still in context → re-added after `removeOrder`.

### Fix Applied
1. New endpoint: `PUT /order-status-update` (single call for full order cancel)
2. `removeOrder` + `updateTableStatus('available')` called BEFORE `api.put` (socket can't re-add)
3. Socket handler: `update-order-status` (status=3) → `getOrderById` → null → skip
4. Added `useTables` to `OrderEntry.jsx` for `updateTableStatus`
5. Fixed `tableId` type mismatch (string vs number in TableContext)

### Files Changed
- `constants.js` — Added `ORDER_STATUS_UPDATE`, `FOOD_STATUS_UPDATE`
- `orderTransform.js` — Added `toAPI.cancelOrder`, removed `cancelOrderItem`
- `OrderEntry.jsx` — `handleCancelOrder` → single API call, immediate remove
- `DashboardPage.jsx` — `handleCancelOrderConfirm` → same fix
- `socketHandlers.js` — `handleUpdateOrderStatus` → immediate skip for removed orders

---

## BUG-206: Partial Item Cancel Cancels All Items

**Status:** FIXED ✅
**Priority:** P0
**Reported:** April 5, 2026
**Fixed:** April 5, 2026

### Root Cause
Old endpoint `PUT /cancel-food-item` (v2) ignores `cancel_qty` — cancels all quantity regardless.

### Fix Applied
Switched to correct endpoint: `PUT /api/v1/vendoremployee/order/cancel-food-item`
- Handles both full and partial via `cancel_qty` field
- Full cancel = `cancel_qty: item.qty`
- Unified `cancelItem` transform replaces `cancelItemFull` + `cancelItemPartial`

### Endpoint Testing Results
| Endpoint | cancel_qty respected? |
|----------|----------------------|
| `v2 /partial-cancel-food-item` | NO — "Order item not found" error |
| `v2 /cancel-food-item` | NO — ignores cancel_qty, cancels all |
| `v1 /order/cancel-food-item` | **YES — works correctly** ✅ |

---

## BUG-207: Place Order Payload — Price Field & Addon Format

**Status:** FIXED ✅
**Priority:** P0
**Reported:** April 5, 2026
**Fixed:** April 6, 2026

### Symptoms Fixed
1. `price` field now sends unit price (correct — backend expects unit price, calculates total internally)
2. Addon format now uses nested arrays: `add_ons: [[id1, id2]]`, `add_on_qtys: [[qty1, qty2]]`
3. Endpoint migrated to `POST /api/v1/vendoremployee/order/place-order` with `multipart/form-data`
4. `buildCartItem` + `calcOrderTotals` helper functions implemented
5. All 4 flows updated: Place Order, Update Order, Place+Pay, Collect Bill (existing)

### Files Modified
- `orderTransform.js` — Added `buildCartItem()`, `calcOrderTotals()` helpers
- `OrderEntry.jsx` — Fixed FormData wrapping, corrected function/endpoint references

---

## Updated Endpoint Mapping (April 5, 2026)

| Action | Endpoint | Status |
|--------|----------|--------|
| Place New Order | `POST /api/v1/vendoremployee/order/place-order` (multipart/form-data) | Updated ✅ |
| Update Order | `PUT /api/v1/vendoremployee/order/update-place-order` (JSON) | Updated ✅ |
| Collect Bill (existing order) | `POST /api/v1/vendoremployee/order/place-order` (multipart/form-data, with order_id) | Updated ✅ |
| Place + Pay (new order) | `POST /api/v1/vendoremployee/order/place-order` (multipart/form-data, payment_status=paid) | Updated ✅ |
| Cancel Item (full/partial) | `PUT /api/v1/vendoremployee/order/cancel-food-item` | Working ✅ |
| Cancel Full Order | `PUT /api/v2/vendoremployee/order-status-update` | Working ✅ |
| Get Single Order | `POST /api/v2/vendoremployee/get-single-order-new` | Working ✅ |
| Food Status Update | `PUT /api/v2/vendoremployee/food-status-update` | Working ✅ |

---

## Socket Event → User Action (Verified April 5, 2026)

| Action | Socket Event | Status |
|--------|-------------|--------|
| Place New Order | `new-order` (with payload) | ✅ 0→1 API call (GET single order enrichment) |
| Update Order | `update-order` | ✅ 1 API call |
| Cancel Single Item | `update-order-status` (status=3) | ✅ 1 API call |
| Cancel Partial Item | `update-order-status` (status=3) | ✅ 1 API call |
| Cancel Full Order | `update-order-status` (status=3) | ✅ 0 API calls (skipped, already removed) |


---

## BUG-208: Socket orderDetails returns empty `variation` and `add_ons`

**Status:** FIXED ✅ (both addons and variations now returned by backend)
**Priority:** CLOSED
**Reported:** April 6, 2026
**Fixed:** April 6, 2026

### Resolution
Backend now returns both fields correctly:
- `variation`: `[{name: "Size", values: [{label: "Large", optionPrice: "40"}]}]`
- `add_ons`: `[{id: 10730, name: "lemon pepper Sprinkler", price: 15, quantity: 1}]`

### Frontend fixes applied:
- `fromAPI.orderItem` normalizes `price` to `unit_price` (BUG-209)
- PlacedItemRow + CollectPaymentPanel parse nested `variation[].values[].optionPrice`
- Display shows "Size: Large" format (handles both array and object `values`)

---

## BUG-209: Placed Item Prices Double-Multiplied

**Status:** FIXED ✅
**Priority:** P0
**Reported:** April 6, 2026
**Fixed:** April 6, 2026

### Symptom
Placed items showed ₹1,904 instead of ₹476 for qty=4. The socket `detail.price` returns the **total** line price (unit × qty), but display code multiplied by qty again.

### Root Cause
`fromAPI.orderItem()` mapped `detail.price` directly. Display then did `price × qty` = double multiplication.

### Fix Applied
`fromAPI.orderItem()` now normalizes `price` to use `unit_price` (per-unit base). Display formula `unit_price × qty` is correct.

### Files Changed
- `orderTransform.js` — `fromAPI.orderItem()`: `price: parseFloat(detail.unit_price) || detail.food_details?.price || 0`

---

## BUG-210: No table engage check before placing order (MULTI-DEVICE RACE CONDITION)

**Status:** OPEN — CRITICAL
**Priority:** P0 CRITICAL
**Reported:** April 6, 2026

### Problem
When user clicks "Place Order", there is no pre-check to verify the table is free on the server. On multi-device setups, two users can place orders on the same table simultaneously.

### Required Fix
Before calling place-order API:
1. Call `GET /api/v1/vendoremployee/all-table-list`
2. Find table by ID → check `engage` field
3. If `engage === "Yes"` → toast "Table already occupied" → redirect to dashboard
4. If `engage === "No"` → proceed with place order

### API Reference
**Endpoint:** `GET /api/v1/vendoremployee/all-table-list`
**Response:** Array of tables, each with `engage: "Yes"` or `"No"`
```json
{"id": 4252, "table_no": "1", "engage": "Yes", "rtype": "TB"}
```
**Note:** No single-table endpoint available — must filter from full list.

### Impact
Two orders on same table → billing confusion, order conflicts, data corruption.

---

## BUG-211: Backend does NOT send `update-table engage` for new orders

**Status:** WORKAROUND IMPLEMENTED ✅
**Priority:** P1
**Reported:** Feb 2026
**Workaround:** Feb 2026

### Problem
When placing a **new order**, the backend sends:
- `new-order` on the order channel ✅
- But **NO** `update-table engage` on the table channel ❌

For **update order**, the backend correctly sends:
- `update-order` on the order channel ✅
- `update-table engage` on the table channel ✅

This asymmetry caused `waitForTableEngaged(tableId)` to **timeout** (5s) for new orders, because nobody ever set the table as engaged.

### Evidence (User Console Logs)
```
[SocketHandler] new-order received: 730440
[OrderContext] addOrder: Adding new order 730440
[TableContext] updateTableStatus: 4259 → occupied
[SocketHandler] Fetching order 730440 (attempt 1)
[PlaceOrder] response: {message: 'Order placed successfully', order_id: 730440}
[SocketHandler] Fetched order 730440 successfully
[OrderContext] updateOrder: Updating order 730440
[SocketHandler] new-order: Enriched order 730440 (GET API data)
[TableContext] setTableEngaged: 4259 → false          ← Released, but never engaged!
[TableContext] waitForTableEngaged: timeout for 4259   ← TIMED OUT because never engaged
```

### Workaround Applied (Frontend)
In `socketHandlers.js` → `handleNewOrder`:
1. Immediately call `setTableEngaged(tableId, true)` when `new-order` arrives
2. This triggers `waitForTableEngaged()` in `OrderEntry.jsx` to resolve
3. After GET enrichment completes, release via `requestAnimationFrame × 2 → setTableEngaged(false)`

### Backend Action Suggested
Send `update-table engage` on the table channel for new orders, same as update orders, for consistency.

---

## BUG-204 (Extended): Socket `new-order` Missing Financial Fields

**Status:** WORKAROUND IMPLEMENTED (GET single order enrichment)
**Priority:** P1
**Reported:** April 6, 2026
**Updated:** April 6, 2026

### Problem
Socket `new-order` event sends only 35 keys. GET single order API returns 51 keys. The 16 missing fields include critical financial data needed for Collect Bill.

### Evidence (verified April 6)

**Socket `new-order` payload (35 keys):**
```
order_amount: 166                    ✅ Present
order_sub_total_amount:              ❌ MISSING
order_sub_total_without_tax:         ❌ MISSING
total_service_tax_amount:            ❌ MISSING
payment_method:                      ❌ MISSING
delivery_charge:                     ❌ MISSING
order_edit_count:                    ❌ MISSING
print_bill_status:                   ❌ MISSING
payment_id:                          ❌ MISSING
parent_order_id:                     ❌ MISSING
canceled_by:                         ❌ MISSING
cancel_at:                           ❌ MISSING
send_payment_link:                   ❌ MISSING
tablepart:                           ❌ MISSING
associated_order_list:               ❌ MISSING
delivery_man / delivery_man_id:      ❌ MISSING
```

**GET `/api/v2/vendoremployee/get-single-order-new` (51 keys):**
```
order_amount: 166                    ✅
order_sub_total_amount: 159          ✅
order_sub_total_without_tax: 159     ✅
total_service_tax_amount: 0.00       ✅
(all 51 keys present)
```

### Frontend Workaround (April 6)
After socket `new-order`, immediately call GET single order API to enrich the order with missing fields. Flow:
1. Socket → addOrder (35 keys, cart items render)
2. GET API → updateOrder (51 keys, financials render)
3. When backend adds fields to socket, remove step 2.

### Backend Action Required
Add these fields to socket `new-order` event payload to match GET single order:
- `order_sub_total_amount`
- `order_sub_total_without_tax`
- `total_service_tax_amount`
- (ideally all 16 missing fields for full parity)

