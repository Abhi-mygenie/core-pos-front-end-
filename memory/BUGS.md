# POS Frontend - Bug Tracker & Audit Document

**Last Updated:** April 5, 2026

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

**Status:** IN PROGRESS
**Priority:** P0
**Reported:** April 5, 2026

### Symptom 1: Price sends unit price instead of total
Payload: `price: 120, quantity: 5` but should be `price: 600` (120 × 5)?
The `order_amount` is correct (600), but per-item `price` may need to be total.

### Symptom 2: Addon format causes "Cannot use a scalar value as an array"
Current payload:
```json
{
  "add_ons": [10773],
  "add_on_qtys": [5]
}
```
Backend (PHP) error suggests it expects nested arrays:
```json
{
  "add_ons": [[10773]],
  "add_on_qtys": [[5]]
}
```

### Symptom 3: Place order endpoint may have changed
Current: `POST /api/v2/vendoremployee/pos/place-order`
May need to be a different endpoint. User to confirm.

### Next Steps
- User to share correct endpoint for place order
- User to share working payload from production POS (with addons) for format reference
- Confirm if `price` should be unit or total

---

## Updated Endpoint Mapping (April 5, 2026)

| Action | Endpoint | Status |
|--------|----------|--------|
| Place New Order | `POST /api/v2/vendoremployee/pos/place-order` | **NEEDS VERIFICATION** |
| Update Order | `PUT /api/v2/vendoremployee/pos/update-place-order` | Working ✅ |
| Cancel Item (full/partial) | `PUT /api/v1/vendoremployee/order/cancel-food-item` | Working ✅ |
| Cancel Full Order | `PUT /api/v2/vendoremployee/order-status-update` | Working ✅ |
| Get Single Order | `POST /api/v2/vendoremployee/pos/get-single-order-new` | Working ✅ |
| Food Status Update | `PUT /api/v2/vendoremployee/food-status-update` | Working ✅ |

---

## Socket Event → User Action (Verified April 5, 2026)

| Action | Socket Event | Status |
|--------|-------------|--------|
| Place New Order | `new-order` (with payload) | ✅ 0 API calls |
| Update Order | `update-order` | ✅ 1 API call |
| Cancel Single Item | `update-order-status` (status=3) | ✅ 1 API call |
| Cancel Partial Item | `update-order-status` (status=3) | ✅ 1 API call |
| Cancel Full Order | `update-order-status` (status=3) | ✅ 0 API calls (skipped, already removed) |
