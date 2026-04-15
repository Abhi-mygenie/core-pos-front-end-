# Socket v2 Architecture — Complete Implementation Spec

**Created:** April 13, 2026
**Last Updated:** April 13, 2026
**Status:** ✅ IMPLEMENTED — All phases complete, live testing in progress
**Blocker:** `food_details: null` — ✅ RESOLVED (backend fix deployed)

---

## 1. Executive Summary

### What
Upgrade the POS frontend socket event handling to support v2 backend socket events. All 10 order mutation flows now send `order-engage` lock + data events with full payloads. Frontend needs to handle 3 NEW event names and refactor locking/wait logic.

### Why
- 3 new socket events (`update-order-target`, `update-order-source`, `update-order-paid`) are silently dropped — Switch Table, Merge, Transfer Food, Collect Bill, Mark Ready/Served, Cancel Order all broken on v2
- BUG-216 workaround (`free→engage`) causes permanently stuck tables
- GET API calls (1-3 sec each) can be eliminated — socket payloads have complete data

### Scope
- 5 files changed, 0 new files
- No backend changes needed (already done)
- No UI/visual changes — purely socket handler + locking logic

---

## 2. Background — How Socket Events Work

### 3 Socket Channels
```
Channel: new_order_{restaurantId}     ← All order data events
Channel: update_table_{restaurantId}  ← Table engage/free events
Channel: order-engage_{restaurantId}  ← Order-level lock events
```

### Message Format (order channel)
```javascript
// All data events follow this structure:
[eventName, orderId, restaurantId, f_order_status, { orders: [orderObject] }]

// Examples:
['new-order',           730881, 478, 1, { orders: [{...}] }]
['update-order',        730865, 478, 7, { orders: [{...}] }]
['update-order-target', 730883, 478, 1, { orders: [{...}] }]
['update-order-source', 730884, 478, 3, { orders: [{...}] }]
['update-order-paid',   730880, 478, 5, { orders: [{...}] }]
['split-order',         731025, 478, 1, { orders: [{...}] }]
```

### Message Format (table channel)
```javascript
['update-table', tableId, restaurantId, 'engage'|'free']
```

### Message Format (order-engage channel — DIFFERENT: no event name at index 0)
```javascript
[orderId, restaurantOrderId, restaurantId, 'engage'|'free']
```

### Transform Chain
```
Socket payload → orderFromAPI.order(apiOrder) → transformed order object
                                                  ├── orderId
                                                  ├── tableId
                                                  ├── status (from f_order_status → F_ORDER_STATUS map)
                                                  ├── tableStatus (from status → ORDER_TO_TABLE_STATUS map)
                                                  ├── items[]
                                                  └── ... (51 fields total)
```

### f_order_status → status → tableStatus mapping
```
f_order_status=1 → 'preparing'     → 'occupied'
f_order_status=2 → 'ready'         → 'occupied'
f_order_status=3 → 'cancelled'     → 'available'
f_order_status=5 → 'served'        → 'billReady'
f_order_status=6 → 'paid'          → 'available'
f_order_status=7 → 'pending'       → 'yetToConfirm'
```

---

## 3. All 10 Flows — Verified Socket Events

Every flow was tested via console logs on April 13, 2026, restaurant 478.

### Flow 1: New Order (includes Place+Pay prepaid)
```
Endpoint: POST /api/v2/vendoremployee/order/place-order
Covers: Place New Order (unpaid) AND Place+Pay (prepaid) — same endpoint, same socket events
Events:
  1. update-table {destTableId} engage       ← table locked (dine-in only)
  2. new-order {orderId} {f_order_status} {payload}  ← complete order data
Handler: handleNewOrder (EXISTING — no change needed)
Release: setTableEngaged(tableId, false) via requestAnimationFrame × 2
Walk-in: No update-table engage. 0.5s delay for UX.
Redirect: Fire HTTP (don't await) → waitForTableEngaged → onClose() (both unpaid and prepaid)
Note (April 15, 2026): Place+Pay previously awaited HTTP response and stayed on order screen.
  Now uses fire-and-forget + waitForTableEngaged + redirect (same as Place New Order).
  Uses PLACE_ORDER endpoint — NOT paid-prepaid-order (that is exclusively for Flow 13).
```

### Flow 2: Update Order (Add Items)
```
Endpoint: PUT /api/v2/vendoremployee/order/update-place-order
Events:
  1. order-engage {orderId} engage           ← order locked
  2. update-order {orderId} {f_order_status} {payload}  ← complete order data
Handler: handleOrderDataEvent (NEW unified handler)
Release: setOrderEngaged(orderId, false) via requestAnimationFrame × 2
```

### Flow 3: Cancel Food Item
```
Endpoint: PUT /api/v2/vendoremployee/order/cancel-food-item
Events:
  1. order-engage {orderId} engage
  2. update-order {orderId} {f_order_status} {payload}
Handler: handleOrderDataEvent — SAME as Update Order (reuses update-order event)
Release: setOrderEngaged(orderId, false)
Note: Partial cancel → order stays. Last item cancel → check status in payload.
```

### Flow 4: Switch Table
```
Endpoint: POST /api/v2/vendoremployee/order/order-table-room-switch
Events:
  1. update-table {destTableId} engage       ← dest table locked
  2. update-table {sourceTableId} engage     ← source table locked
  3. update-order-target {orderId} {f_order_status} {payload}  ← order now on dest
Handler: handleOrderDataEvent with detectTableChange=true
Release: setTableEngaged(destTableId, false) + setTableEngaged(sourceTableId, false)
Note: Only 1 data event (no update-order-source). Same order, just moved tables.
Walk-in→Table: sourceTableId=0, skipped by guard.
```

### Flow 5: Merge Table
```
Endpoint: POST /api/v2/vendoremployee/order/transfer-order
Events:
  1. order-engage {sourceOrderId} engage     ← source order locked
  2. order-engage {targetOrderId} engage     ← target order locked
  3. update-order-target {targetOrderId} {1} {payload}  ← target gets merged items
  4. update-order-source {sourceOrderId} {3} {payload}  ← source cancelled (f_order_status=3)
Handler: handleOrderDataEvent — target updates, source removes
Release: setOrderEngaged for both orders
```

### Flow 6: Transfer Food Item
```
Endpoint: POST /api/v2/vendoremployee/order/transfer-food-item
Events:
  1. order-engage {sourceOrderId} engage
  2. order-engage {targetOrderId} engage
  3. update-order-target {targetOrderId} {1} {payload}  ← target gets item
  4. update-order-source {sourceOrderId} {1 or 3} {payload}
     ← f_order_status=1: source still active (partial transfer)
     ← f_order_status=3: source cancelled (last item transferred)
Handler: handleOrderDataEvent — SAME pattern as Merge
Release: setOrderEngaged for both orders
```

### Flow 7: Collect Bill
```
Endpoint: POST /api/v2/vendoremployee/order/order-bill-payment
Events:
  1. order-engage {orderId} engage
  2. update-order-paid {orderId} {6} {payload}  ← f_order_status=6 (paid)
Handler: handleOrderDataEvent — status=paid → removeOrder + free table
Release: setOrderEngaged(orderId, false)
Walk-in: No table operations (tableId=0).
```

### Flow 8: Cancel Order
```
Endpoint: PUT /api/v2/vendoremployee/order/order-status-update
Events:
  1. order-engage {orderId} engage
  2. update-order-paid {orderId} {oldStatus} {payload}  ← echoes previous status (e.g. 5=served)
  3. update-table 0 free                                 ← walk-in only, skipped
  4. update-order-paid {orderId} {3} {payload}           ← f_order_status=3 (cancelled)
Handler: handleOrderDataEvent — first event updateOrder (harmless), second removeOrder (correct)
Note: Backend sends 2× update-order-paid. Handler is idempotent — second corrects first.
Dine-in: May also send update-table {tableId} free — ignored by frontend.
```

### Flow 9: Mark Ready
```
Endpoint: PUT /api/v2/vendoremployee/order/order-status-update
Events:
  1. order-engage {orderId} engage
  2. update-order-paid {orderId} {2} {payload}  ← f_order_status=2 (ready)
Handler: handleOrderDataEvent — status=ready → updateOrder
Release: setOrderEngaged(orderId, false)
```

### Flow 10: Mark Served
```
Endpoint: PUT /api/v2/vendoremployee/order/order-status-update
Events:
  1. order-engage {orderId} engage
  2. update-order-paid {orderId} {5} {payload}  ← f_order_status=5 (served)
Handler: handleOrderDataEvent — status=served → updateOrder
Release: setOrderEngaged(orderId, false)
Note: For PREPAID orders (payment_type=prepaid), use Flow 13 instead.
```

### Flow 13: Complete Prepaid Order — Mark Served (NEW — April 15, 2026)
```
Endpoint: POST /api/v2/vendoremployee/order/paid-prepaid-order
Payload: { order_id: "731054", payment_status: "paid", service_tax: 0, tip_amount: 0 }
Trigger: When a prepaid order (payment_type=prepaid) is marked Served on Dashboard
Events: TBD — expected same as Flow 10 (order-engage + update-order-paid)
Handler: handleOrderDataEvent — status depends on backend response
Note: Frontend checks order.paymentType === 'prepaid' in handleMarkServed.
  If prepaid → POST paid-prepaid-order (JSON).
  If not prepaid → PUT order-status-update (regular Flow 10).
IMPORTANT (April 15, 2026): This endpoint is EXCLUSIVELY for completing existing prepaid orders
  (DashboardPage.handleMarkServed → completePrepaidOrder()). It must NOT be used for placing
  new orders — Place+Pay (prepaid) uses PLACE_ORDER endpoint (Flow 1).
```

### Flow 11: Confirm Order (NEW — April 14, 2026)
```
Endpoint: PUT /api/v2/vendoremployee/order/waiter-dinein-order-status-update
Payload: { order_id, role_name, order_status: <def_ord_status mapped via F_ORDER_STATUS_API> }
Events:
  1. order-engage {orderId} engage           ← order locked
  2. update-order-status {orderId} {f_order_status} {orders: [...]}  ← complete order data
Handler: handleUpdateOrderStatus (UPGRADED to v2 pattern — uses socket payload, no GET API)
Release: setOrderEngaged(orderId, false) via requestAnimationFrame × 2
Note: order_status value comes from profile API def_ord_status field, mapped through F_ORDER_STATUS_API
```

### Flow 12: Split Order (NEW — April 15, 2026)
```
Endpoint: POST /api/v2/vendoremployee/order/split-order
Payload: { order_id, split_count, splits: [[{ id, qty }]] }
Availability: Dine-In, Walk-In, Room ONLY (NOT TakeAway/Delivery)
Events:
  1. order-engage {orderId} engage                              ← original order locked
  2. split-order {orderId} {f_order_status} {orders: [...]}     ← original order with reduced items
Handler: handleSplitOrder — updateOrder() for original, release engage
New order: NOT in socket — fetched via fetchSingleOrderForSocket(newOrderId) from API response, added via addOrder()
Release: setOrderEngaged(orderId, false) via requestAnimationFrame × 2

Dashboard rendering: 1:N table-to-order mapping
  - adaptTable() returns N entries per table (flatMap)
  - orderItemsByTableId stores arrays per tableId
  - Split table cards labeled "T5 (1/2)", "T5 (2/2)"
  - Walk-in splits: no issue (keyed by orderId, not tableId)

Known gap: Other devices don't receive new-order socket for the split order.
  They see it on next refreshOrders() call.
```

---

## 4. Implementation — Step by Step

### Step 1: `socketEvents.js` — Add 3 new event constants

**File:** `/app/frontend/src/api/socket/socketEvents.js`

**What to add** in the `SOCKET_EVENTS` object (after `UPDATE_ORDER_STATUS`):

```javascript
// New v2 events (April 2026)
UPDATE_ORDER_TARGET: 'update-order-target',
UPDATE_ORDER_SOURCE: 'update-order-source',
UPDATE_ORDER_PAID: 'update-order-paid',

// Split order event (April 15, 2026)
SPLIT_ORDER: 'split-order',
```

**Also update** the `EVENTS_WITH_PAYLOAD` array — add all new events (they all have payloads):

```javascript
export const EVENTS_WITH_PAYLOAD = [
  SOCKET_EVENTS.NEW_ORDER,
  SOCKET_EVENTS.UPDATE_ORDER,           // already has payload
  SOCKET_EVENTS.UPDATE_ORDER_TARGET,    // NEW
  SOCKET_EVENTS.UPDATE_ORDER_SOURCE,    // NEW
  SOCKET_EVENTS.UPDATE_ORDER_PAID,      // NEW
  SOCKET_EVENTS.SPLIT_ORDER,            // NEW (April 15)
];
```

**Update** `EVENTS_REQUIRING_ORDER_API` — remove `UPDATE_ORDER` from this list (it now has payload):
```javascript
export const EVENTS_REQUIRING_ORDER_API = [
  // UPDATE_ORDER removed — now has payload in v2
  SOCKET_EVENTS.UPDATE_FOOD_STATUS,
  SOCKET_EVENTS.UPDATE_ORDER_STATUS,
  SOCKET_EVENTS.SCAN_NEW_ORDER,
  SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER,
];
```

---

### Step 2: `socketHandlers.js` — Add unified handler

**File:** `/app/frontend/src/api/socket/socketHandlers.js`

#### 2a. Add new function `handleOrderDataEvent`

This ONE function handles 4 events: `update-order`, `update-order-target`, `update-order-source`, `update-order-paid`.

```javascript
/**
 * Unified handler for all v2 order data events
 * Events: update-order, update-order-target, update-order-source, update-order-paid
 * 
 * All share the same message format:
 * [eventName, orderId, restaurantId, f_order_status, { orders: [...] }]
 * 
 * Strategy per event:
 * - update-order:        updateOrder()
 * - update-order-target: updateOrder() + detect table change (switch table)
 * - update-order-source: auto — if cancelled/paid → removeOrder(), else updateOrder()
 * - update-order-paid:   auto — if cancelled/paid → removeOrder(), else updateOrder()
 */
export const handleOrderDataEvent = async (message, context, eventName) => {
  const { updateOrder, removeOrder, updateTableStatus, getOrderById, setOrderEngaged, setTableEngaged } = context;
  
  const parsed = parseMessage(message);
  if (!parsed) {
    log('ERROR', `Invalid ${eventName} message format`, message);
    return;
  }
  
  const { orderId, payload } = parsed;
  log('INFO', `${eventName} received: ${orderId}`);
  
  // Guard: skip if order already removed (by a previous event in same batch)
  if (eventName !== 'update-order-target' && getOrderById && !getOrderById(orderId)) {
    log('INFO', `${eventName}: Order ${orderId} already removed, skipping`);
    return;
  }
  
  // --- Transform payload ---
  let order = null;
  
  if (payload && payload.orders && Array.isArray(payload.orders) && payload.orders.length > 0) {
    try {
      order = orderFromAPI.order(payload.orders[0]);
      log('INFO', `${eventName}: Using socket payload for order ${orderId}`);
    } catch (error) {
      log('ERROR', `${eventName}: Transform failed`, error.message);
    }
  }
  
  // Fallback to GET API if no payload (backwards compat for v1)
  if (!order) {
    log('INFO', `${eventName}: No socket payload, fetching from API`);
    order = await fetchOrderWithRetry(orderId);
  }
  
  if (!order) {
    log('WARN', `${eventName}: Could not get order ${orderId}, skipping`);
    return;
  }
  
  // --- Detect table change (Switch Table: update-order-target) ---
  if (eventName === 'update-order-target') {
    const oldOrder = getOrderById ? getOrderById(orderId) : null;
    const oldTableId = oldOrder?.tableId || 0;
    const newTableId = order.tableId || 0;
    
    if (oldTableId !== newTableId) {
      log('INFO', `${eventName}: Table changed ${oldTableId} → ${newTableId} (switch table)`);
      
      // Free old table
      if (oldTableId && oldTableId !== 0) {
        updateTableStatus(oldTableId, 'available');
        if (setTableEngaged) setTableEngaged(oldTableId, false);
        log('INFO', `${eventName}: Old table ${oldTableId} → available + released`);
      }
    }
  }
  
  // --- Decide action: update or remove ---
  const isTerminal = (order.status === 'cancelled' || order.status === 'paid');
  const shouldRemove = isTerminal && (eventName === 'update-order-source' || eventName === 'update-order-paid');
  
  if (shouldRemove) {
    // Remove order + free table
    log('INFO', `${eventName}: Order ${orderId} is ${order.status}, removing`);
    syncTableStatus(order, updateTableStatus, 'available');
    removeOrder(orderId);
  } else {
    // Update order + sync table status
    updateOrder(order.orderId, order);
    syncTableStatus(order, updateTableStatus);
    log('INFO', `${eventName}: Updated order ${order.orderId} (status: ${order.status})`);
  }
  
  // --- Release engage after React paints ---
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Release order engage
      if (setOrderEngaged) {
        setOrderEngaged(orderId, false);
        log('INFO', `${eventName}: Order ${orderId} released from ENGAGED`);
      }
      
      // Release table engage (for switch table — new table)
      if (eventName === 'update-order-target' && order.tableId && order.tableId !== 0 && setTableEngaged) {
        setTableEngaged(order.tableId, false);
        log('INFO', `${eventName}: Table ${order.tableId} released from ENGAGED`);
      }
    });
  });
};
```

**Key logic explained:**

1. **Parse + transform:** Same for all 4 events. Fallback to GET if no payload.
2. **Guard (already removed):** If previous event in same batch already removed this order, skip. Exception: `update-order-target` should NOT skip — it might be a new order on this table.
3. **Table change detection:** Only for `update-order-target`. Compare old tableId vs new tableId. If different → free old table (switch table flow). Guard: skip if tableId=0 (walk-in).
4. **Update vs Remove:** `update-order-source` and `update-order-paid` check if status is terminal (cancelled/paid) → `removeOrder()`. Otherwise → `updateOrder()`. This handles:
   - Merge: source cancelled → remove
   - Transfer food partial: source active → update
   - Transfer food last item: source cancelled → remove
   - Collect bill: paid → remove
   - Mark ready: ready → update
   - Mark served: served → update
   - Cancel order: cancelled → remove (second `update-order-paid` event)
   - Cancel order first event: old status (served) → update (harmless, corrected by second event)
5. **Release:** Always release `orderEngaged`. For `update-order-target`, also release `tableEngaged` on the new table.

#### 2b. Fix BUG-216 in `handleUpdateTable`

**Current code (lines 458-463):**
```javascript
} else if (socketStatus === 'free') {
    // BUG-216 workaround: Backend sends 'free' for cancel-item but should send 'engage'
    if (setTableEngaged) setTableEngaged(tableId, true);
    log('INFO', `update-table: Table ${tableId} ENGAGED (free→engage workaround, BUG-216)`);
}
```

**Replace with:**
```javascript
} else if (socketStatus === 'free') {
    // v2: No flow sends update-table free. Ignore it.
    // Table status is derived from order data in order event handlers.
    log('INFO', `update-table: Table ${tableId} free received — ignoring (v2: table status from order data)`);
}
```

**Why this is safe:** Every v2 flow that was tested sends NO `update-table free`. Only old v1 cancel flows sent it (incorrectly). Cancel food is now v2 (sends `order-engage` + `update-order`). Cancel order sends `update-order-paid` which handles table status. Mark Ready/Served don't send table events at all.

#### 2c. Add guard to `handleUpdateOrderStatus`

**At the top of the function (after parsing), add:**
```javascript
// Guard: skip if order was already handled by update-order-paid
if (getOrderById && !getOrderById(orderId)) {
    log('INFO', `update-order-status: Order ${orderId} already removed (handled by update-order-paid), skipping GET`);
    return;
}
```

This prevents wasted GET API calls when `update-order-paid` has already processed the order.

#### 2d. Update handler registry

In the `getHandler` function and `isAsyncHandler` function, add the new events:

```javascript
// In getHandler:
[SOCKET_EVENTS.UPDATE_ORDER_TARGET]: handleOrderDataEvent,
[SOCKET_EVENTS.UPDATE_ORDER_SOURCE]: handleOrderDataEvent,
[SOCKET_EVENTS.UPDATE_ORDER_PAID]: handleOrderDataEvent,

// In isAsyncHandler — add all 3 (they can await GET fallback):
SOCKET_EVENTS.UPDATE_ORDER_TARGET,
SOCKET_EVENTS.UPDATE_ORDER_SOURCE,
SOCKET_EVENTS.UPDATE_ORDER_PAID,
```

#### 2e. Export the new function

Add to exports:
```javascript
export { handleOrderDataEvent };
```

---

### Step 3: `useSocketEvents.js` — Wire new events

**File:** `/app/frontend/src/api/socket/useSocketEvents.js`

#### 3a. Import new handler

Add to imports:
```javascript
import {
  handleNewOrder,
  handleUpdateOrder,          // keep for reference but will route through unified
  handleOrderDataEvent,       // NEW
  handleUpdateFoodStatus,
  handleUpdateOrderStatus,
  handleScanNewOrder,
  handleDeliveryAssignOrder,
  handleUpdateTable,
  handleOrderEngage,
} from './socketHandlers';
```

#### 3b. Update switch statement in `handleOrderChannelEvent`

**Current:**
```javascript
case SOCKET_EVENTS.UPDATE_ORDER:
    handleUpdateOrder(args, actionsRef.current);
    break;
```

**Replace with:**
```javascript
case SOCKET_EVENTS.UPDATE_ORDER:
    handleOrderDataEvent(args, actionsRef.current, 'update-order');
    break;
case SOCKET_EVENTS.UPDATE_ORDER_TARGET:
    handleOrderDataEvent(args, actionsRef.current, 'update-order-target');
    break;
case SOCKET_EVENTS.UPDATE_ORDER_SOURCE:
    handleOrderDataEvent(args, actionsRef.current, 'update-order-source');
    break;
case SOCKET_EVENTS.UPDATE_ORDER_PAID:
    handleOrderDataEvent(args, actionsRef.current, 'update-order-paid');
    break;
```

**Note:** `SOCKET_EVENTS.UPDATE_ORDER` now routes to `handleOrderDataEvent` instead of `handleUpdateOrder`. The old `handleUpdateOrder` function can be kept in `socketHandlers.js` for reference but is no longer called.

**Do NOT change** the following cases — they stay as-is:
- `SOCKET_EVENTS.NEW_ORDER` → `handleNewOrder` (different flow — addOrder, different message structure)
- `SOCKET_EVENTS.UPDATE_FOOD_STATUS` → `handleUpdateFoodStatus` (v1, no payload, keep GET)
- `SOCKET_EVENTS.UPDATE_ORDER_STATUS` → `handleUpdateOrderStatus` (v1 fallback, keep GET)
- `SOCKET_EVENTS.SCAN_NEW_ORDER` → `handleScanNewOrder` (v1)
- `SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER` → `handleDeliveryAssignOrder` (v1)

#### 3c. Import SOCKET_EVENTS additions

Make sure the new constants are imported:
```javascript
import {
  SOCKET_EVENTS,
  getOrderChannel,
  getTableChannel,
  getOrderEngageChannel,
} from './socketEvents';
```
(No change needed if importing `SOCKET_EVENTS` as object — new keys are automatically available.)

---

### Step 4: `OrderContext.jsx` — Add `waitForOrderEngaged`

**File:** `/app/frontend/src/contexts/OrderContext.jsx`

#### 4a. Add `waitForOrderEngaged` function

Same pattern as `waitForTableEngaged` in `TableContext.jsx`. Polls `engagedOrdersRef` until the orderId appears in the engaged set.

```javascript
/**
 * Wait for an order to become engaged (locked) via socket
 * Used by OrderEntry to wait for socket confirmation before redirect
 * @param {number} orderId - Order ID to wait for
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<boolean>} - true if engaged, false if timeout
 */
const waitForOrderEngaged = useCallback((orderId, timeout = 5000) => {
    return new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
            if (engagedOrdersRef.current.has(orderId)) {
                resolve(true);
            } else if (Date.now() - start > timeout) {
                console.warn(`[OrderContext] waitForOrderEngaged: timeout for order ${orderId}`);
                resolve(false);
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
}, []);
```

**Requires:** `engagedOrdersRef` — a ref that mirrors the `engagedOrders` state (same pattern as `engagedTablesRef` in TableContext). Check if this already exists in OrderContext. If not, add:

```javascript
const engagedOrdersRef = useRef(new Set());

// Keep ref in sync with state (in setOrderEngaged):
const setOrderEngaged = useCallback((orderId, engaged) => {
    const next = new Set(engagedOrdersRef.current);
    engaged ? next.add(orderId) : next.delete(orderId);
    engagedOrdersRef.current = next;
    setEngagedOrders(next);
}, []);
```

#### 4b. Export `waitForOrderEngaged`

Add to the context value and the `useOrders` hook return:
```javascript
const value = useMemo(() => ({
    orders,
    isLoaded,
    addOrder,
    updateOrder,
    removeOrder,
    getOrderById,
    getOrderByTableId,
    waitForOrderRemoval,
    engagedOrders,
    setOrderEngaged,
    isOrderEngaged,
    waitForOrderEngaged,    // NEW
}), [...]);
```

---

### Step 5: `OrderEntry.jsx` — Update 6 handlers

**File:** `/app/frontend/src/components/order-entry/OrderEntry.jsx`

#### 5a. Import `waitForOrderEngaged`

Update the destructure from `useOrders()`:
```javascript
const { orders, refreshOrders, removeOrder, waitForOrderRemoval, waitForOrderEngaged } = useOrders();
```

#### 5b. `handlePlaceOrder` — Update Order path (line ~423)

**Current:**
```javascript
// Wait for socket update-table (engage) before redirect
const tableId = Number(effectiveTable?.tableId);
if (tableId) {
    await waitForTableEngaged(tableId, 5000);
}
```

**Replace with:**
```javascript
// Wait for socket order-engage before redirect
if (placedOrderId) {
    await waitForOrderEngaged(placedOrderId, 5000);
}
```

**Why:** Update Order sends `order-engage` (order-level), not `update-table engage` (table-level).

#### 5c. `handleShift` (line ~518)

**Current:**
```javascript
const handleShift = async ({ toTable }) => {
    const payload = tableToAPI.shiftTable(effectiveTable, toTable);
    const response = await api.post(API_ENDPOINTS.ORDER_TABLE_SWITCH, payload);
    toast({ title: "Table Shifted", description: response.data?.message || `Order moved to ${toTable.displayName}` });
    onClose();
};
```

**Replace with:**
```javascript
const handleShift = async ({ toTable }) => {
    const payload = tableToAPI.shiftTable(effectiveTable, toTable);
    const response = await api.post(API_ENDPOINTS.ORDER_TABLE_SWITCH, payload);
    toast({ title: "Table Shifted", description: response.data?.message || `Order moved to ${toTable.displayName}` });
    
    // Wait for socket update-table engage (dest) before redirect
    const destTableId = Number(toTable?.tableId);
    if (destTableId) {
        await waitForTableEngaged(destTableId, 5000);
    }
    
    onClose();
};
```

**Why:** Switch Table sends `update-table engage` for dest table. Wait for it before redirect so dashboard shows correct state.

#### 5d. `handleMerge` (line ~505)

**Current:**
```javascript
const handleMerge = async ({ selectedOrders }) => {
    for (const sourceOrder of selectedOrders) {
        const payload = tableToAPI.mergeTable(effectiveTable, sourceOrder);
        await api.post(API_ENDPOINTS.MERGE_ORDER, payload);
    }
    toast({ title: "Tables Merged", description: `${selectedOrders.length} table(s) merged into ${table?.label || table?.id}` });
    onClose();
};
```

**Replace with:**
```javascript
const handleMerge = async ({ selectedOrders }) => {
    for (const sourceOrder of selectedOrders) {
        const payload = tableToAPI.mergeTable(effectiveTable, sourceOrder);
        await api.post(API_ENDPOINTS.MERGE_ORDER, payload);
    }
    toast({ title: "Tables Merged", description: `${selectedOrders.length} table(s) merged into ${table?.label || table?.id}` });
    
    // Wait for socket order-engage before redirect
    const targetOrderId = effectiveTable?.orderId;
    if (targetOrderId) {
        await waitForOrderEngaged(targetOrderId, 5000);
    }
    
    onClose();
};
```

#### 5e. `handleTransfer` (line ~494)

**Current:**
```javascript
const handleTransfer = async ({ toOrder, item: transferredItem }) => {
    const payload = tableToAPI.transferFood(effectiveTable, toOrder, transferredItem);
    const response = await api.post(API_ENDPOINTS.TRANSFER_FOOD, payload);
    toast({ title: "Item Transferred", description: response.data?.message || `...` });
    setTransferItem(null);
    onClose();
};
```

**Replace with:**
```javascript
const handleTransfer = async ({ toOrder, item: transferredItem }) => {
    const payload = tableToAPI.transferFood(effectiveTable, toOrder, transferredItem);
    const response = await api.post(API_ENDPOINTS.TRANSFER_FOOD, payload);
    toast({ title: "Item Transferred", description: response.data?.message || `...` });
    setTransferItem(null);
    
    // Wait for socket order-engage (source order) before redirect
    const sourceOrderId = effectiveTable?.orderId;
    if (sourceOrderId) {
        await waitForOrderEngaged(sourceOrderId, 5000);
    }
    
    onClose();
};
```

#### 5f. Collect bill `onPaymentComplete` (line ~792)

**Current:**
```javascript
// Scenario 1 — existing order: collect bill via POST order-bill-payment
const tableId = Number(effectiveTable?.tableId || table?.tableId);
if (tableId) setTableEngaged(tableId, true);    // ← LOCAL table engage (REMOVE THIS)
setIsPlacingOrder(true);
```

**Replace with:**
```javascript
// Scenario 1 — existing order: collect bill via POST order-bill-payment
// No local table engage — order-engage socket handles locking
setIsPlacingOrder(true);
```

**Remove the line:** `if (tableId) setTableEngaged(tableId, true);`

**Why:** Backend sends `order-engage` (order-level lock). Local `setTableEngaged` creates a permanent lock because no `update-table free` arrives to undo it. The `update-order-paid` handler now handles table freeing.

#### 5g. `handleCancelFood` (line ~527)

**Current:**
```javascript
const handleCancelFood = async ({ item, reason, cancelQuantity }) => {
    setIsPlacingOrder(true);
    try {
        const payload = orderToAPI.cancelItem(effectiveTable, item, reason, cancelQuantity);
        await api.put(API_ENDPOINTS.CANCEL_ITEM, payload);
        toast({ title: "Item Cancelled", description: `${item?.name} cancelled successfully` });
        
        // Wait for socket update-table (engage) before redirect
        const tableId = Number(effectiveTable?.tableId || table?.tableId);
        if (tableId) {
            await waitForTableEngaged(tableId, 5000);
        }
        
        setCancelItem(null);
        onClose();
    } catch (err) { ... }
};
```

**Replace wait logic with:**
```javascript
// Wait for socket order-engage before redirect
const orderId = effectiveTable?.orderId || placedOrderId;
if (orderId) {
    await waitForOrderEngaged(orderId, 5000);
}
```

**Why:** Cancel food v2 sends `order-engage` (order-level), not `update-table engage`.

---

## 5. What Stays Unchanged

| Handler/Component | File | Why No Change |
|-------------------|------|---------------|
| `handleNewOrder` | socketHandlers.js | Different flow: `addOrder()`, different message structure (table_info at index 5), already v2 clean |
| `handleUpdateFoodStatus` | socketHandlers.js | Still v1 for item-level status. Local table engage workaround kept. Backend needs to upgrade |
| `handleUpdateOrderStatus` | socketHandlers.js | ✅ UPGRADED to v2 (Apr 14): uses socket payload directly, releases order engage. No GET API call |
| `handleScanNewOrder` | socketHandlers.js | v1, external trigger, no change |
| `handleDeliveryAssignOrder` | socketHandlers.js | v1, external trigger, no change |
| `handleOrderEngage` | socketHandlers.js | Lock-only, no data — works correctly |
| `handleUpdateTable` (engage) | socketHandlers.js | Table engage handling unchanged. Only `free` behavior changes (ignore instead of convert to engage) |
| `handleNewOrder` in useSocketEvents | useSocketEvents.js | Case unchanged |
| `handlePlaceOrder` (new order path) | OrderEntry.jsx | New order wait logic unchanged (waitForTableEngaged for dine-in, 0.5s for walk-in) |
| `handleCancelOrder` | OrderEntry.jsx | Uses `waitForOrderRemoval` — works with removeOrder in update-order-paid handler |

---

## 6. Files Changed — Summary

| File | What Changes |
|------|-------------|
| `socketEvents.js` | Add 3 constants (`UPDATE_ORDER_TARGET`, `UPDATE_ORDER_SOURCE`, `UPDATE_ORDER_PAID`). Update `EVENTS_WITH_PAYLOAD` and `EVENTS_REQUIRING_ORDER_API` arrays |
| `socketHandlers.js` | Add `handleOrderDataEvent()`. Fix `handleUpdateTable` free→ignore. Add guard to `handleUpdateOrderStatus`. Export new function. Update handler registry |
| `useSocketEvents.js` | Import `handleOrderDataEvent`. Replace `update-order` case + add 3 new cases in switch |
| `OrderContext.jsx` | Add `waitForOrderEngaged()` + `engagedOrdersRef` (if not exists). Export in context value |
| `OrderEntry.jsx` | Update 6 handlers: handlePlaceOrder (update path), handleShift, handleMerge, handleTransfer, collect bill, handleCancelFood |

---

## 7. Risks & Mitigations — All Verified

| # | Risk | Level | Status | Evidence |
|---|------|-------|--------|----------|
| R1 | Double fire: paid + order-status | LOW | ✅ ELIMINATED | Only update-order-paid fires for collect bill |
| R2 | update-table free on collect bill | LOW | ✅ ELIMINATED | No table events for collect bill |
| R3 | BUG-216 removal breaks cancel food | MEDIUM | ✅ ELIMINATED | Cancel food v2 sends order-engage + update-order. No update-table free |
| R4 | Collect bill local engage → perm lock | HIGH | ✅ MITIGATED | Remove local setTableEngaged. order-engage handles lock. update-order-paid frees table |
| R5 | Transfer food last item → source cancelled | LOW | ✅ VERIFIED | update-order-source f_order_status=3 → removeOrder. Auto logic handles both partial and full |
| R6 | Walk-in table events | LOW | ✅ ELIMINATED | No table events for walk-in. syncTableStatus guards tableId=0 |
| R7 | Cancel Order double update-order-paid | LOW | ✅ VERIFIED | First event: updateOrder (harmless). Second event: removeOrder (correct). Idempotent |
| R8 | food_details: null in socket payload | HIGH | 🔴 BLOCKER (backend) | All items show "Unknown Item". Backend must populate food_details. Frontend transform already reads it correctly |

---

## 8. Test Plan (Post-Implementation)

### Phase 1: Socket Handlers (Steps 1-3) — 15 tests

| # | Test | Action | Expected Console Logs | Pass Criteria |
|---|------|--------|----------------------|--------------|
| 1 | New Order (dine-in) | Place order on table | `handleNewOrder` — no change | Order appears on dashboard |
| 2 | New Order (walk-in) | Place walk-in | `handleNewOrder` — no change | Order card appears |
| 3 | Update Order | Add items to existing | `handleOrderDataEvent: update-order` → `updateOrder` | Items added, order updated |
| 4 | Cancel Food (partial) | Cancel 1 of 3 items | `handleOrderDataEvent: update-order` → `updateOrder` | Item removed, order stays |
| 5 | Cancel Food (last item) | Cancel only item | `handleOrderDataEvent: update-order` → check status | Order removed if cancelled |
| 6 | Switch Table (table→table) | Shift 3240→3237 | `handleOrderDataEvent: update-order-target` → detect table change → free 3240, occupy 3237 | Old table available, new table occupied |
| 7 | Switch Table (walk-in→table) | Shift walk-in to table | `handleOrderDataEvent: update-order-target` → old=0 skip, new occupied | Walk-in becomes dine-in |
| 8 | Merge Table | Merge source into target | `update-order-target` → updateOrder. `update-order-source` → removeOrder (status=3) | Source removed, target updated |
| 9 | Transfer Food (partial) | Move 1 item | `update-order-target` + `update-order-source` (status=1) → both updateOrder | Both orders updated |
| 10 | Transfer Food (last item) | Move last item | `update-order-source` (status=3) → removeOrder | Source removed |
| 11 | Collect Bill (dine-in) | Pay cash | `update-order-paid` (status=6) → removeOrder | Order removed, table available |
| 12 | Collect Bill (walk-in) | Pay walk-in | `update-order-paid` (status=6) → removeOrder, no table ops | Order card removed |
| 13 | Mark Ready | Mark order ready | `update-order-paid` (status=2) → updateOrder | Order status changes to ready |
| 14 | Mark Served | Mark order served | `update-order-paid` (status=5) → updateOrder | Order status changes to served |
| 15 | Cancel Order | Cancel entire order | 2× `update-order-paid` → first update, second removeOrder | Order removed |

### Phase 2: OrderEntry Wait Logic (Steps 4-5) — 6 tests

| # | Test | Action | Expected | Pass Criteria |
|---|------|--------|----------|--------------|
| 16 | Update Order redirect | Add items, check timing | Waits for order-engage → then redirect | No premature redirect |
| 17 | Shift Table redirect | Shift, check timing | Waits for update-table engage (dest) → then redirect | Dashboard shows correct state |
| 18 | Merge Table redirect | Merge, check timing | Waits for order-engage → then redirect | No stale data flash |
| 19 | Transfer Food redirect | Transfer, check timing | Waits for order-engage → then redirect | No stale data flash |
| 20 | Collect Bill no perm lock | Pay dine-in, check table | Table available after bill, NOT stuck spinner | Table clickable after payment |
| 21 | Cancel Food redirect | Cancel item, check timing | Waits for order-engage → then redirect | No premature redirect |

### Phase 3: Edge Cases — 5 tests

| # | Test | Action | Expected | Pass Criteria |
|---|------|--------|----------|--------------|
| 22 | BUG-216 gone | Cancel order dine-in | update-table free ignored. No stuck table | Table available after cancel |
| 23 | Walk-in merge | Merge walk-in into table | Source removed (no table ops), target updated | No errors for tableId=0 |
| 24 | Table→walk-in merge | Merge table into walk-in | Source table freed, target updated | Source table available |
| 25 | Cancel Order double fire | Cancel order, check logs | No GET API call. update-order-paid handles both | No "Fetching order" in console |
| 26 | Stale handleUpdateOrderStatus | Collect bill, check logs | Guard skips GET (order already removed) | No wasted GET API call |

---

## 9. Rollback Plan

| Component | How to Rollback | Impact |
|-----------|----------------|--------|
| `handleOrderDataEvent` | Remove new cases from switch. Re-add `handleUpdateOrder` case. Old events still work | New events silently dropped (current behavior) |
| BUG-216 fix | Restore `free→engage` line in handleUpdateTable | Tables stuck on shift/merge (current known bug) |
| `waitForOrderEngaged` | Revert to `waitForTableEngaged` or fire-and-close | May redirect before socket confirms (current behavior) |
| Collect bill local engage | Add back `if (tableId) setTableEngaged(tableId, true)` | Permanent table lock (current known bug) |
| Each phase independently rollbackable | Phase 1 (handlers) and Phase 2 (OrderEntry) are separate changes | Can rollback one without the other |

---

## 10. Endpoints Reference

| Flow | Constant | Path | Method |
|------|----------|------|--------|
| Place Order (incl. Place+Pay prepaid) | `PLACE_ORDER` | `/api/v2/vendoremployee/order/place-order` | POST |
| Update Order | `UPDATE_ORDER` | `/api/v2/vendoremployee/order/update-place-order` | PUT |
| Switch Table | `ORDER_TABLE_SWITCH` | `/api/v2/vendoremployee/order/order-table-room-switch` | POST |
| Merge Table | `MERGE_ORDER` | `/api/v2/vendoremployee/order/transfer-order` | POST |
| Transfer Food | `TRANSFER_FOOD` | `/api/v2/vendoremployee/order/transfer-food-item` | POST |
| Collect Bill | `BILL_PAYMENT` | `/api/v2/vendoremployee/order/order-bill-payment` | POST |
| Cancel Food | `CANCEL_ITEM` | `/api/v2/vendoremployee/order/cancel-food-item` | PUT |
| Cancel Order / Ready / Served | `ORDER_STATUS_UPDATE` | `/api/v2/vendoremployee/order/order-status-update` | PUT |
| Complete Prepaid (Mark Served) | `PREPAID_ORDER` | `/api/v2/vendoremployee/order/paid-prepaid-order` | POST |
| Confirm Order (YTC) | `CONFIRM_ORDER` | `/api/v2/vendoremployee/order/waiter-dinein-order-status-update` | PUT |
| Food Status | `FOOD_STATUS_UPDATE` | `/api/v2/vendoremployee/order/food-status-update` | PUT |
| Get Single Order | `SINGLE_ORDER_NEW` | `/api/v2/vendoremployee/get-single-order-new` | POST |

---

## 11. Known Blocker

### `food_details: null` in ALL Socket Payloads

**Status:** ✅ RESOLVED — Backend fix deployed April 13, 2026
**Impact:** Was: All items show "Unknown Item" on dashboard. Now: Fixed, item names display correctly.

---

## 12. Implementation Notes (April 13, 2026)

### Deviations from Original Plan

| Item | Original Plan | Actual Implementation | Reason |
|------|--------------|----------------------|--------|
| Step 2 Guard | Skip if already removed | Deferred to Phase 2 | Not needed if sockets work correctly |
| Step 3 GET fallback | Fallback to GET API | Removed — fail fast with ERROR log | Production v2 only, fallback masks bugs |
| Redirect pattern | Wait after API response | Wait BEFORE API (fire-and-forget) | Socket is faster than API response — race condition fix |
| `handleUpdateFoodStatus` | Keep as v1 fallback | Dead code — backend sends `update-item-status` now | New v2 event discovered during testing |

### New Discovery: `update-item-status` Event

Not in original plan. Backend sends `update-item-status` (v2 with payload) for item-level Ready/Serve instead of old `update-food-status` (v1 no payload). Added to `handleOrderDataEvent` — same pattern as other v2 events.

### Dashboard Engage Fix (Not in Original Plan)

Original plan covered 5 files. During testing discovered:
- `DashboardPage.jsx`: `handleMarkReady`/`handleMarkServed` had local `setTableEngaged` — caused permanent spinner on table orders
- All OrderCard/TableCard checked `isTableEngaged(tableId)` only — walk-in/delivery/takeaway never showed spinner
- Fix: Added `isOrderEngaged(orderId)` to all card components via DashboardPage → ChannelColumnsLayout → ChannelColumn prop chain

### Files Changed (Final — 8 total)

| File | Changes |
|------|---------|
| `socketEvents.js` | 4 new constants (UPDATE_ORDER_TARGET, UPDATE_ORDER_SOURCE, UPDATE_ORDER_PAID, UPDATE_ITEM_STATUS) |
| `socketHandlers.js` | `handleOrderDataEvent` unified handler, BUG-216 fix, handler registry updated |
| `useSocketEvents.js` | 5 new switch cases, import updated |
| `OrderContext.jsx` | `waitForOrderEngaged` added |
| `OrderEntry.jsx` | 8 handlers updated to fire-and-forget + wait-for-engage pattern, console log identifiers |
| `DashboardPage.jsx` | Removed local `setTableEngaged` from markReady/markServed, added `isOrderEngaged` props |
| `ChannelColumnsLayout.jsx` | `isOrderEngaged` prop pass-through |
| `ChannelColumn.jsx` | `isOrderEngaged` prop usage for spinner |

### Merge Matrix (Verified April 13, 2026)

| Source → Target | `update-order-target` | `update-order-source` | Works? |
|----------------|----------------------|----------------------|--------|
| Table → Table | ✅ | ✅ | ✅ |
| Walk-in → Walk-in | ✅ | ✅ | ✅ |
| Table → Walk-in | ✅ | ✅ | ✅ |
| Walk-in → Table | ❌ (BUG-228) | ✅ | ❌ |

### Open Backend Bugs (Filed During Implementation)

| Bug | Title | Status |
|-----|-------|--------|
| BUG-226 | `order-engage` missing before `update-item-status` | ✅ FIXED (same day) |
| BUG-227 | Order-level Ready/Serve does not update item-level `food_status` | ❌ OPEN |
| BUG-228 | `update-order-target` not sent for Walk-in → Table merge | ❌ OPEN |
| BUG-229 | Confirm Order — backend `$orderstatus` undefined at OrderController.php:3643 | ✅ BYPASSED (new endpoint) |
