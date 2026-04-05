# POS Frontend - Bug Tracker & Audit Document

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

**Status:** IN PROGRESS
**Priority:** P0
**Reported:** April 4, 2026
**Reported by:** User (Network tab screenshots)

### Symptom
When adding items to an existing order (Update Order), the `get-single-order-new` API is called **twice**. Visible in browser Network tab as two separate XHR requests to `get-single-order-new`, both returning 200.

### Timeline of Calls (from Network tab)
| # | Request | Type | Time |
|---|---------|------|------|
| 1 | `update-place-order` | preflight | 334ms |
| 2 | `update-place-order` | xhr | 653ms |
| 3 | `get-single-order-new` | preflight | 452ms |
| 4 | `get-single-order-new` | **xhr (call 1)** | **352ms** |
| 5 | `get-single-order-new` | preflight | 334ms |
| 6 | `get-single-order-new` | **xhr (call 2)** | **337ms** |

### Root Cause Analysis

**Source of duplicate calls:**

Previously, both `OrderEntry.jsx` and `socketHandlers.js` called `fetchSingleOrderForSocket()` after an update:

- **Call A (OrderEntry.jsx):** After `PUT /update-place-order` API returned success, the UI immediately called `fetchSingleOrderForSocket(orderId)` with a 500ms delay + retry logic.
- **Call B (socketHandlers.js):** Server emits `update-order` socket event. `handleUpdateOrder()` calls `fetchOrderWithRetry(orderId)` which calls `fetchSingleOrderForSocket(orderId)`.

**Fix applied (April 4, 2026):** Removed Call A from `OrderEntry.jsx`. Now only the socket handler fetches the order, and the `useEffect` in `OrderEntry.jsx` syncs from `OrderContext`.

**Current status (post-fix):** User screenshot still shows 2 calls. Two possible explanations:

1. **Cached JS** — User's browser may still be running old bundled code. A hard refresh (`Ctrl+Shift+R`) is required to pick up webpack changes.
2. **Duplicate socket listener registration** — The `update-order` socket event listener might be registered twice, causing `handleUpdateOrder` to fire twice for a single server emit. This would need investigation in:
   - `useSocketEvents.js` — where `subscribe(orderChannel, handleOrderChannelEvent)` is called
   - `SocketContext.jsx` — the `useSocketEvent` hook and cleanup logic
   - `socketService.js` — the `on()` method's handler wrapping/storage

### Key learning from user
- **For Update Order (adding items):** Server emits ONLY `update-order` socket. NOT `update-food-status`.
- `update-food-status` is for kitchen status changes (preparing -> ready, etc.)
- `update-order-status` is for order-level status changes (cancelled, paid, etc.)

### Files Involved
| File | Role |
|------|------|
| `src/components/order-entry/OrderEntry.jsx` | UI component — was calling `fetchSingleOrderForSocket` directly (REMOVED) |
| `src/api/socket/socketHandlers.js` | `handleUpdateOrder()` — calls `fetchOrderWithRetry` → `fetchSingleOrderForSocket` |
| `src/api/socket/useSocketEvents.js` | Subscribes to order channel, routes events to handlers |
| `src/contexts/SocketContext.jsx` | `useSocketEvent` hook — manages subscribe/unsubscribe lifecycle |
| `src/api/socket/socketService.js` | Core `on()`/`off()` — wraps handlers, stores in Map |
| `src/api/services/orderService.js` | `fetchSingleOrderForSocket()` — the actual API call |

### Changes Applied So Far
1. **`OrderEntry.jsx` — `handlePlaceOrder` (Update Order path):**
   - Removed: `fetchSingleOrderForSocket` call with 500ms delay + retry
   - Added: Optimistic local marking (`placed: true, status: 'preparing'`)

2. **`OrderEntry.jsx` — `useEffect` sync:**
   - Before: Only synced when local financials were 0 (new order only)
   - After: Syncs whenever context financials differ from local (covers new order + update order)
   - Added: Preserves unplaced items during sync

### Next Steps
- Confirm hard refresh resolves the issue (cached JS hypothesis)
- If still 2 calls after hard refresh: investigate duplicate socket listener registration in `useSocketEvents.js` and `socketService.js`

---

## BUG-202: Duplicate `get-single-order-new` API Calls on Cancel Item

**Status:** NOT STARTED
**Priority:** P0
**Reported:** April 4, 2026

### Symptom
Same pattern as BUG-201 but for item cancellation. When cancelling an item, `get-single-order-new` is called twice.

### Root Cause
Same dual-source pattern:
- **Call A (OrderEntry.jsx):** `handleCancelFood()` calls `fetchSingleOrderForSocket(orderId)` after `PUT /cancel-food-item` success (lines 466-483).
- **Call B (socketHandlers.js):** Server emits `update-food-status` or `update-order-status` socket → handler calls `fetchOrderWithRetry` → `fetchSingleOrderForSocket`.

### Fix Plan
Same approach as BUG-201:
1. Remove `fetchSingleOrderForSocket` from `handleCancelFood()` in `OrderEntry.jsx`
2. Let socket handler update `OrderContext`
3. The expanded `useEffect` (from BUG-201 fix) will auto-sync cancelled item status + updated financials to local state

### Files to Modify
- `src/components/order-entry/OrderEntry.jsx` — `handleCancelFood()`

---

## BUG-203: Redundant `update-table` Socket Event Handling

**Status:** NOT STARTED
**Priority:** P1
**Reported:** April 4, 2026
**Reported by:** User (Console screenshots showing `update-table` logging twice)

### Symptom
The `update-table` socket event fires and is logged twice in the console after order operations.

### Root Cause Analysis
The `update-table` socket updates `TableContext` with table status (occupied/available). But `OrderContext` already contains `table_id` and `f_order_status` — meaning table status can be **derived** from order data without a separate socket channel.

Currently, table status is set from two sources:
1. `update-table` socket → `handleUpdateTable()` → `updateTableStatus()` in `TableContext`
2. `OrderContext` data — orders contain `tableId`, and table status can be derived (order exists + not cancelled = occupied)

### Recommendation
Deprecate the `update-table` socket handler entirely. Derive table status from `OrderContext`:
- If an active order exists for a `tableId` → table is `occupied`
- If no active order → table is `available`
- If order is paid → table transitions to `available`

This establishes `OrderContext` as the **single source of truth** for both order and table status.

### Files to Modify
- `src/api/socket/useSocketEvents.js` — bypass or remove `update-table` subscription
- `src/api/socket/socketHandlers.js` — `handleUpdateTable()` can be deprecated
- `src/contexts/TableContext.jsx` — derive status from `OrderContext` instead of standalone updates

---

## BUG-204: `order_sub_total_without_tax` Returns 0 from Backend API

**Status:** BLOCKED (Backend team required)
**Priority:** P1
**Reported:** April 4, 2026
**Reported by:** User (Console response of `get-single-order-new`)

### Symptom
The `get-single-order-new` API response always returns `order_sub_total_without_tax: 0`, regardless of the actual order items and their base prices.

### Evidence
User shared raw console response showing:
```json
{
  "order_sub_total_without_tax": 0,
  "order_amount": 190,
  "order_sub_total_amount": 190
}
```

### Impact
- Frontend cannot display accurate pre-tax subtotal on the Collect Bill screen
- Tax breakdown calculations are unreliable if based on this field

### Current Workaround
Frontend uses `order_sub_total_amount` (which works correctly) instead of `order_sub_total_without_tax` for display. Local calculation from item base prices can serve as a fallback if needed.

### Action Required
- **Backend team** must investigate and fix `order_sub_total_without_tax` calculation in the `get-single-order-new` API response
- The `new-order` socket payload has the same issue — needs to be verified

---

## Architecture Decision: Socket as Source of Truth

**Date:** April 4, 2026

### Principle
After placing/updating/cancelling an order, the UI component (`OrderEntry.jsx`) must NOT call `get-single-order-new` directly. Instead:

1. **API call** (PUT/POST) → sends the action to the server
2. **Server processes** → emits the appropriate socket event
3. **Socket handler** (`socketHandlers.js`) → fetches fresh order data via `get-single-order-new` and updates `OrderContext`
4. **`useEffect`** in `OrderEntry.jsx` → detects `OrderContext` change and syncs local state (cartItems, orderFinancials)

### Socket Events per Action
| Action | Socket Event Emitted | Handler |
|--------|---------------------|---------|
| Place New Order | `new-order` | `handleNewOrder` (uses payload directly, no API call) |
| Update Order (add items) | `update-order` | `handleUpdateOrder` (fetches from API) |
| Cancel Item | `update-food-status` or `update-order-status` | `handleUpdateFoodStatus` / `handleUpdateOrderStatus` |
| Cancel Full Order | `update-order-status` | `handleUpdateOrderStatus` |
| Payment Collected | `update-order-status` (status=6) | `handleUpdateOrderStatus` (removes order) |

### Data Flow Diagram
```
User Action → API Call → Server → Socket Event → socketHandlers.js
                                                      ↓
                                               fetchSingleOrderForSocket()
                                                      ↓
                                               OrderContext.updateOrder()
                                                      ↓
                                               useEffect in OrderEntry.jsx
                                                      ↓
                                               setCartItems + setOrderFinancials
```
