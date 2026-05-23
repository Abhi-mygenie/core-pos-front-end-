# POS2.0 Wave 6 — Code Diff Preview — 2026-05-17

## 1. Purpose

This is the **exact code-change preview** before source files are modified. No source files have been edited yet.

---

## 2. Approved Bugs For Diff Preview

| Bug | Approved By | Direction |
|---|---|---|
| BUG-082 | Owner (Gate 7, Option A) | scan-new-order: read index 4 as primitive, no API call, minimal order, retire fallback |
| BUG-068 | Owner (Gate 7, Option A) | Reconnect rehydration: onStatusChange → getRunningOrders → mergeRunningOrders |

---

## 3. Per-Bug Diff Preview

### BUG-082 — scan-new-order Index 4 = Primitive 'web'

---

#### File 1: `frontend/src/api/socket/socketHandlers.js`

##### Component / Function: `handleScanNewOrder` (L466-518)

##### Current Code Snippet

```javascript
/**
 * Handle scan-new-order event (QR code order)
 * Message: [scan-new-order, order_id, restaurant_id, f_order_status]
 * Action: Fetch order from API, ADD to OrderContext
 */
export const handleScanNewOrder = async (message, { addOrder, updateTableStatus }) => {
  const parsed = parseMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid scan-new-order message format', message);
    return;
  }
  
  const { orderId } = parsed;
  log('INFO', `scan-new-order received: ${orderId}`);
  
  const order = await fetchOrderWithRetry(orderId);
  if (order) {
    // POS2-005: status-8 orders belong on the Audit Hold tab, not the running
    // dashboard. Skip insertion — the order remains accessible via the Audit
    // Report Hold tab (fed by /order-logs-report). When backend later
    // transitions the order to a non-8 active state (1/2/5/7), it emits a
    // fresh insertion event which lands the order on the dashboard normally
    // (per CR-003 OQ-C2 / POS2-005 OQ-5 owner closure — no transition-back
    // fallback required).
    // POS2-005 / BUG-042-C: status-8 (running/Hold-classified) and status-9
    // (PayLater/Hold) orders belong on the Audit Hold tab only. Skip
    // insertion into running OrderContext. (See handleNewOrder for the
    // mirror guard.)
    if (order.fOrderStatus === 8 || order.fOrderStatus === 9) {
      log('INFO', `scan-new-order: skipping order ${orderId} (f_order_status=${order.fOrderStatus} → Hold)`);
      return;
    }
    // POS2-002-P4-FU-01 (May-2026): channel-arrival enrichment.
    // The scan-new-order socket channel is itself proof-of-origin: every
    // order that arrives here was placed via the Scan & Order (web/QR)
    // surface. Backend's `single-order-new` response was observed in the
    // wild (order 825770, 2026-05-10) to omit `order_from='web'`, which
    // left orderFrom=null after the Phase 1 transform and prevented
    // Phase 4's ScanOrderPopOut + Phase 3.1's Web counter from firing.
    // Fill the field only when the backend did not supply it; never
    // overwrite an explicit backend value (preserves forward-compat with
    // BE-OF1 once backend ships the field on this endpoint).
    if (!order.orderFrom) {
      order.orderFrom = 'web';
      order.isWebOrder = true;
    }
    addOrder(order);
    syncTableStatus(order, updateTableStatus);
    log('INFO', `scan-new-order: Added order ${orderId}`);
  } else {
    log('WARN', `scan-new-order: Could not fetch order ${orderId}, skipping`);
  }
};
```

##### Proposed Code

```javascript
/**
 * Handle scan-new-order event (QR code / Web order)
 *
 * BUG-082 (Wave 6, May-2026): Backend confirmed message structure:
 *   ['scan-new-order', orderId, restaurantId, fOrderStatus, 'web']
 * Index 4 is a PRIMITIVE string indicating order origin — NOT a payload object.
 *
 * No API call. Full order data arrives via subsequent socket events
 * (update-order-status, update-order, etc.) when the order is confirmed/edited.
 * Until then, a minimal order entry is added to OrderContext so the
 * ScanOrderPopOut popup can fire (predicate: orderFrom === 'web' && fOrderStatus === 7).
 *
 * Owner directive Q-082-4: channel-based fallback at former L508-511 RETIRED.
 * Runtime validated 2026-05-17 (restaurant 478, order 868557).
 */
export const handleScanNewOrder = (message, { addOrder }) => {
  if (!Array.isArray(message) || message.length < 4) {
    log('ERROR', 'Invalid scan-new-order message format', message);
    return;
  }

  const orderId = Number(message[MSG_INDEX.ORDER_ID]);
  const fOrderStatus = Number(message[MSG_INDEX.STATUS]);
  // BUG-082: index 4 is a primitive string ('web') for scan-new-order.
  const orderFrom = typeof message[MSG_INDEX.PAYLOAD] === 'string'
    ? message[MSG_INDEX.PAYLOAD]
    : null;

  log('INFO', `scan-new-order received: orderId=${orderId}, fOrderStatus=${fOrderStatus}, orderFrom=${orderFrom}`);

  // POS2-005 / BUG-042-C: status-8/9 (Hold) → Audit tab only, skip dashboard.
  if (fOrderStatus === 8 || fOrderStatus === 9) {
    log('INFO', `scan-new-order: skipping order ${orderId} (fOrderStatus=${fOrderStatus} → Hold)`);
    return;
  }

  // Minimal order entry — full data arrives on confirm/edit via
  // update-order-status or update-order socket events.
  const minimalOrder = {
    orderId,
    fOrderStatus,
    orderFrom: orderFrom || 'web',
    isWebOrder: orderFrom === 'web',
    status: 'pending',
    items: [],
    amount: 0,
    tableId: 0,
  };

  addOrder(minimalOrder);
  log('INFO', `scan-new-order: Added minimal order ${orderId} (orderFrom=${orderFrom})`);
};
```

##### What changed
- Removed `async` — no API call
- Removed `fetchOrderWithRetry(orderId)` call
- Removed `parseMessage` usage — reads message indices directly
- Reads index 4 as primitive string (`orderFrom`), with `typeof` guard
- Creates minimal order entry (orderId, fOrderStatus, orderFrom, isWebOrder, empty items/amount)
- **Retired** POS2-002-P4-FU-01 channel-based fallback (L508-511)
- Removed `syncTableStatus` (no table data in minimal order)
- Removed `updateTableStatus` from destructured context

---

##### Component / Function: `isAsyncHandler` (L716-731)

##### Current Code Snippet

```javascript
export const isAsyncHandler = (eventName) => {
  const asyncEvents = [
    SOCKET_EVENTS.UPDATE_ORDER,
    SOCKET_EVENTS.UPDATE_ORDER_TARGET,
    SOCKET_EVENTS.UPDATE_ORDER_SOURCE,
    SOCKET_EVENTS.UPDATE_ORDER_PAID,
    SOCKET_EVENTS.UPDATE_ITEM_STATUS,
    SOCKET_EVENTS.UPDATE_FOOD_STATUS,
    SOCKET_EVENTS.UPDATE_ORDER_STATUS,
    SOCKET_EVENTS.SCAN_NEW_ORDER,
    SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER,
    SOCKET_EVENTS.SPLIT_ORDER,
  ];
  
  return asyncEvents.includes(eventName);
};
```

##### Proposed Code

```javascript
export const isAsyncHandler = (eventName) => {
  const asyncEvents = [
    SOCKET_EVENTS.UPDATE_ORDER,
    SOCKET_EVENTS.UPDATE_ORDER_TARGET,
    SOCKET_EVENTS.UPDATE_ORDER_SOURCE,
    SOCKET_EVENTS.UPDATE_ORDER_PAID,
    SOCKET_EVENTS.UPDATE_ITEM_STATUS,
    SOCKET_EVENTS.UPDATE_FOOD_STATUS,
    SOCKET_EVENTS.UPDATE_ORDER_STATUS,
    // BUG-082: SCAN_NEW_ORDER removed — no longer async (no API call).
    SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER,
    SOCKET_EVENTS.SPLIT_ORDER,
  ];
  
  return asyncEvents.includes(eventName);
};
```

##### What changed
- Removed `SOCKET_EVENTS.SCAN_NEW_ORDER` from async list (handler is now synchronous)

---

#### File 2: `frontend/src/api/socket/socketEvents.js`

##### Component / Constant: `MSG_INDEX` (L148-154)

##### Current Code Snippet

```javascript
export const MSG_INDEX = {
  EVENT_NAME: 0,
  ORDER_ID: 1,      // or TABLE_ID for update-table
  RESTAURANT_ID: 2,
  STATUS: 3,        // f_order_status, rider_id, or table status
  PAYLOAD: 4,       // only for new-order
};
```

##### Proposed Code

```javascript
export const MSG_INDEX = {
  EVENT_NAME: 0,
  ORDER_ID: 1,      // or TABLE_ID for update-table
  RESTAURANT_ID: 2,
  STATUS: 3,        // f_order_status, rider_id, or table status
  PAYLOAD: 4,       // new-order / update-order*: full payload object {orders:[...]}
                     // scan-new-order: PRIMITIVE string ('web') — BUG-082, confirmed 2026-05-17
};
```

##### What changed
- Expanded comment on `PAYLOAD` to document the scan-new-order exception

---

### BUG-068 — Socket Reconnect Rehydration

---

#### File 3: `frontend/src/api/socket/socketService.js`

##### Component / Method: `_setStatus` (L286-300)

##### Current Code Snippet

```javascript
  _setStatus(newStatus) {
    if (this.status !== newStatus) {
      const oldStatus = this.status;
      this.status = newStatus;
      this._log('DEBUG', `Status changed: ${oldStatus} → ${newStatus}`);
      
      // Notify all listeners
      this.statusListeners.forEach((listener) => {
        try {
          listener(newStatus, this.reconnectAttempts);
        } catch (err) {
          this._log('ERROR', 'Status listener error', err.message);
        }
      });
    }
  }
```

##### Proposed Code

```javascript
  _setStatus(newStatus) {
    if (this.status !== newStatus) {
      const oldStatus = this.status;
      this.status = newStatus;
      this._log('DEBUG', `Status changed: ${oldStatus} → ${newStatus}`);
      
      // BUG-068 (Wave 6): pass oldStatus as 3rd arg so listeners can detect
      // specific transitions (e.g., RECONNECTING → CONNECTED for rehydration).
      this.statusListeners.forEach((listener) => {
        try {
          listener(newStatus, this.reconnectAttempts, oldStatus);
        } catch (err) {
          this._log('ERROR', 'Status listener error', err.message);
        }
      });
    }
  }
```

##### What changed
- `listener(newStatus, this.reconnectAttempts)` → `listener(newStatus, this.reconnectAttempts, oldStatus)`
- Added `oldStatus` as 3rd argument so downstream code can detect transition direction

---

##### Component / Method: `onStatusChange` (L202-216)

##### Current Code Snippet

```javascript
  /**
   * Subscribe to connection status changes
   * @param {Function} listener - Callback(status, reconnectAttempts)
   * @returns {Function} Unsubscribe function
   */
  onStatusChange(listener) {
    this.statusListeners.add(listener);
    // Immediately call with current status
    listener(this.status, this.reconnectAttempts);
    
    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(listener);
    };
  }
```

##### Proposed Code

```javascript
  /**
   * Subscribe to connection status changes
   * @param {Function} listener - Callback(newStatus, reconnectAttempts, oldStatus)
   * @returns {Function} Unsubscribe function
   */
  onStatusChange(listener) {
    this.statusListeners.add(listener);
    // Immediately call with current status (oldStatus = current → no transition detected)
    listener(this.status, this.reconnectAttempts, this.status);
    
    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(listener);
    };
  }
```

##### What changed
- Updated JSDoc: `Callback(status, reconnectAttempts)` → `Callback(newStatus, reconnectAttempts, oldStatus)`
- Immediate call passes `this.status` as both newStatus and oldStatus (same = no transition detected)

---

#### File 4: `frontend/src/api/socket/useSocketEvents.js`

##### Component / Hook: `useSocketEvents` — New imports + reconnect rehydration

##### Current Code Snippet (imports, L1-31)

```javascript
import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useOrders } from '../../contexts/OrderContext';
import { useTables } from '../../contexts/TableContext';
import { useRestaurant } from '../../contexts/RestaurantContext';
import socketService from './socketService';
import { 
  SOCKET_EVENTS,
  getOrderChannel,
  getTableChannel,
  getOrderEngageChannel,
} from './socketEvents';
import {
  handleNewOrder,
  handleOrderDataEvent,
  handleUpdateFoodStatus,
  handleUpdateOrderStatus,
  handleScanNewOrder,
  handleDeliveryAssignOrder,
  handleUpdateTable,
  handleOrderEngage,
  handleSplitOrder,
} from './socketHandlers';
```

##### Proposed Code (imports)

```javascript
import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useOrders } from '../../contexts/OrderContext';
import { useTables } from '../../contexts/TableContext';
import { useRestaurant } from '../../contexts/RestaurantContext';
import socketService, { CONNECTION_STATUS } from './socketService';
import { getRunningOrders } from '../services/orderService';
import { 
  SOCKET_EVENTS,
  getOrderChannel,
  getTableChannel,
  getOrderEngageChannel,
} from './socketEvents';
import {
  handleNewOrder,
  handleOrderDataEvent,
  handleUpdateFoodStatus,
  handleUpdateOrderStatus,
  handleScanNewOrder,
  handleDeliveryAssignOrder,
  handleUpdateTable,
  handleOrderEngage,
  handleSplitOrder,
} from './socketHandlers';
```

##### What changed
- Added `CONNECTION_STATUS` named import from `./socketService`
- Added `getRunningOrders` import from `../services/orderService`

---

##### Current Code Snippet (hook body — useOrders destructure + actionsRef, L36-52)

```javascript
export const useSocketEvents = () => {
  const { subscribe, isConnected } = useSocket();
  const { addOrder, updateOrder, removeOrder, getOrderById, setOrderEngaged } = useOrders();
  const { updateTableStatus, setTableEngaged } = useTables();
  const { restaurant } = useRestaurant();
  
  // Get restaurant ID for dynamic channel names
  const restaurantId = restaurant?.id;
  
  // Use refs to avoid stale closures in event handlers
  // All handlers now receive both order + table actions (BUG-203)
  const actionsRef = useRef({ addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus, setTableEngaged, setOrderEngaged });
  
  // Update ref when context functions change
  useEffect(() => {
    actionsRef.current = { addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus, setTableEngaged, setOrderEngaged };
  }, [addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus, setTableEngaged, setOrderEngaged]);
```

##### Proposed Code

```javascript
export const useSocketEvents = () => {
  const { subscribe, isConnected } = useSocket();
  const { addOrder, updateOrder, removeOrder, getOrderById, setOrderEngaged, mergeRunningOrders } = useOrders();
  const { updateTableStatus, setTableEngaged } = useTables();
  const { restaurant } = useRestaurant();
  
  // Get restaurant ID for dynamic channel names
  const restaurantId = restaurant?.id;
  
  // Use refs to avoid stale closures in event handlers
  // All handlers now receive both order + table actions (BUG-203)
  const actionsRef = useRef({ addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus, setTableEngaged, setOrderEngaged, mergeRunningOrders });
  
  // Update ref when context functions change
  useEffect(() => {
    actionsRef.current = { addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus, setTableEngaged, setOrderEngaged, mergeRunningOrders };
  }, [addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus, setTableEngaged, setOrderEngaged, mergeRunningOrders]);

  // ===========================================================================
  // BUG-068 (Wave 6): RECONNECT REHYDRATION
  // On RECONNECTING → CONNECTED, re-fetch running orders to catch any
  // orders missed during the disconnection gap. Debounce micro-blips.
  // ===========================================================================
  const disconnectedAtRef = useRef(null);

  useEffect(() => {
    const unsubscribe = socketService.onStatusChange((newStatus, _attempts, oldStatus) => {
      // Track when disconnection started (for debounce threshold)
      if (
        (newStatus === CONNECTION_STATUS.RECONNECTING || newStatus === CONNECTION_STATUS.DISCONNECTED) &&
        !disconnectedAtRef.current
      ) {
        disconnectedAtRef.current = Date.now();
      }

      // Detect RECONNECTING → CONNECTED transition
      if (oldStatus === CONNECTION_STATUS.RECONNECTING && newStatus === CONNECTION_STATUS.CONNECTED) {
        const disconnectDuration = disconnectedAtRef.current
          ? Date.now() - disconnectedAtRef.current
          : Infinity;
        disconnectedAtRef.current = null;

        // Debounce: skip refetch for micro-blips (< 1500ms)
        if (disconnectDuration < 1500) {
          console.log(`[useSocketEvents] Micro-blip (${disconnectDuration}ms), skipping rehydration`);
          return;
        }

        console.log(`[useSocketEvents] Reconnected after ${disconnectDuration}ms, rehydrating orders...`);

        getRunningOrders()
          .then((freshOrders) => {
            if (freshOrders && Array.isArray(freshOrders)) {
              actionsRef.current.mergeRunningOrders(freshOrders);
              console.log(`[useSocketEvents] Rehydration complete: ${freshOrders.length} orders merged`);
            }
          })
          .catch((err) => {
            console.error('[useSocketEvents] Rehydration failed:', err?.message);
          });
      }

      // Reset disconnect tracker on terminal states
      if (newStatus === CONNECTION_STATUS.CONNECTED || newStatus === CONNECTION_STATUS.ERROR) {
        disconnectedAtRef.current = null;
      }
    });

    return unsubscribe;
  }, []);
```

##### What changed
- Added `mergeRunningOrders` to `useOrders()` destructure
- Added `mergeRunningOrders` to `actionsRef` (initial + update effect + dependency array)
- Added `disconnectedAtRef` ref for debounce tracking
- Added new `useEffect` that subscribes to `socketService.onStatusChange` and:
  - Tracks disconnect start time
  - On RECONNECTING → CONNECTED (after 1500ms threshold), calls `getRunningOrders()` → `mergeRunningOrders()`
  - Debounces micro-blips (< 1500ms disconnect)
  - Resets tracker on terminal states

---

#### File 5: `frontend/src/contexts/OrderContext.jsx`

##### Component: `OrderProvider` — New `mergeRunningOrders` function

##### Insert after `refreshOrders` (after L39)

```javascript
  // BUG-068 (Wave 6): Reconnect rehydration merge.
  // Replaces the current orders list with a fresh snapshot from
  // getRunningOrders. This is safe because:
  //   - The fresh list IS the current backend truth after reconnect.
  //   - Engage locks live in separate state (engagedOrders) — untouched.
  //   - Any minimal scan-new-order entries for orders that are still YTC
  //     will be present in the fresh list with full data.
  const mergeRunningOrders = useCallback((freshOrders) => {
    if (!Array.isArray(freshOrders)) return;
    setOrdersState((prev) => {
      console.log(`[OrderContext] mergeRunningOrders: ${prev.length} existing → ${freshOrders.length} fresh`);
      ordersRef.current = freshOrders;
      return freshOrders;
    });
  }, []);
```

##### Expose in context value (add to `value` useMemo)

Current (L332-375):
```javascript
  const value = useMemo(() => ({
    // State
    orders,
    isLoaded,
    // Actions
    setOrders,
    clearOrders,
    refreshOrders,
    // Socket Update Actions
    addOrder,
    updateOrder,
    removeOrder,
    getOrderById,
    waitForOrderRemoval,
    waitForOrderEngaged,
    waitForOrderReady,
    // Order Engage
    engagedOrders,
    setOrderEngaged,
    isOrderEngaged,
    // Computed
    dineInOrders,
    takeAwayOrders,
    deliveryOrders,
    tableOrders,
    walkInOrders,
    // Helpers
    getOrderByTableId,
    getOrdersByTableId,
    orderItemsByTableId,
  }), [
    orders, isLoaded,
    setOrders, clearOrders, refreshOrders,
    addOrder, updateOrder, removeOrder, getOrderById, waitForOrderRemoval, waitForOrderEngaged, waitForOrderReady,
    engagedOrders, setOrderEngaged, isOrderEngaged,
    dineInOrders, takeAwayOrders, deliveryOrders,
    tableOrders, walkInOrders,
    getOrderByTableId, getOrdersByTableId, orderItemsByTableId,
  ]);
```

Proposed — add `mergeRunningOrders`:
```javascript
  const value = useMemo(() => ({
    // State
    orders,
    isLoaded,
    // Actions
    setOrders,
    clearOrders,
    refreshOrders,
    mergeRunningOrders,
    // Socket Update Actions
    addOrder,
    updateOrder,
    removeOrder,
    getOrderById,
    waitForOrderRemoval,
    waitForOrderEngaged,
    waitForOrderReady,
    // Order Engage
    engagedOrders,
    setOrderEngaged,
    isOrderEngaged,
    // Computed
    dineInOrders,
    takeAwayOrders,
    deliveryOrders,
    tableOrders,
    walkInOrders,
    // Helpers
    getOrderByTableId,
    getOrdersByTableId,
    orderItemsByTableId,
  }), [
    orders, isLoaded,
    setOrders, clearOrders, refreshOrders, mergeRunningOrders,
    addOrder, updateOrder, removeOrder, getOrderById, waitForOrderRemoval, waitForOrderEngaged, waitForOrderReady,
    engagedOrders, setOrderEngaged, isOrderEngaged,
    dineInOrders, takeAwayOrders, deliveryOrders,
    tableOrders, walkInOrders,
    getOrderByTableId, getOrdersByTableId, orderItemsByTableId,
  ]);
```

##### What changed
- Added `mergeRunningOrders` function (after `refreshOrders`)
- Added `mergeRunningOrders` to context value object
- Added `mergeRunningOrders` to useMemo dependency array

---

## 4. Files Not Changed (Explicitly)

| File | Reason |
|---|---|
| `ScanOrderPopOut.jsx` | Predicate unchanged: `orderFrom === 'web' && fOrderStatus === 7`. Re-evaluates automatically from OrderContext. |
| `orderService.js` | `getRunningOrders` reused as-is. `fetchSingleOrderForSocket` no longer called by scan-new-order (but kept for other handlers). |
| `useOrderPollingReconciliation.js` | POLL-001 / POLL-004 unchanged. |
| `SocketContext.jsx` | Existing status listener ignores 3rd arg (backwards-compatible). |
| `handleNewOrder` | `new-order` still uses full payload at index 4 — no change. |
| All other socket handlers | Unaffected by Wave 6 changes. |

---

## 5. Implementation Order

1. **BUG-082** — `socketHandlers.js` + `socketEvents.js` (simpler, independent)
2. **BUG-068** — `socketService.js` + `useSocketEvents.js` + `OrderContext.jsx` (more complex, independent)

---

## 6. Final Status

`code_diff_preview_created_pending_owner_approval`

---

*— End of POS2.0 Wave 6 Code Diff Preview — 2026-05-17 —*
