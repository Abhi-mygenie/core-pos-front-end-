# POS3.0 BUG-097 Combined Gap 1+2+3 Corrective Patch — Owner Approval Plan

> **Purpose**: Exact code diff preview for owner approval before implementation.
> **Date**: 2026-05-20
> **Status**: AWAITING_OWNER_APPROVAL
> **Scope**: Fix all 3 gaps in one corrective patch (socket payload, optimistic update, Serve fall-through)

---

## 1. Change Summary

| # | Gap | File | Change |
|---|-----|------|--------|
| 1 | Socket payload | `socketEvents.js` L107-123 | Move `DELIVERY_ASSIGN_ORDER` from `EVENTS_REQUIRING_ORDER_API` to `EVENTS_WITH_PAYLOAD` |
| 2 | Socket handler | `socketHandlers.js` L588-612 | Rewrite `handleDeliveryAssignOrder` to use socket payload directly; GET API as fallback only |
| 3 | Optimistic update | `OrderCard.jsx` L8, L980-987 | Import `useOrders`, wire `onAssigned` with optimistic context update |
| 4 | Optimistic update | `TableCard.jsx` L591-598 | Wire `onAssigned` with optimistic context update |
| 5 | Serve fall-through | `OrderCard.jsx` L889-940 | Already applied in Bucket 4.5 — no further change needed |
| 6 | Serve fall-through | `TableCard.jsx` L449-500 | Already applied in Bucket 4.5 — no further change needed |

**Total**: 4 files, ~50 lines changed. Gap 3 (Serve fall-through) already fixed in prior Bucket 4.5 patch — confirmed correct in current code.

---

## 2. Exact Code Diffs

### DIFF 1: `src/api/socket/socketEvents.js`

**Move `DELIVERY_ASSIGN_ORDER` from `EVENTS_REQUIRING_ORDER_API` to `EVENTS_WITH_PAYLOAD`**

```diff
 // Events that include full payload (no API call needed)
 export const EVENTS_WITH_PAYLOAD = [
   SOCKET_EVENTS.NEW_ORDER,
   SOCKET_EVENTS.UPDATE_ORDER,
   SOCKET_EVENTS.UPDATE_ORDER_TARGET,
   SOCKET_EVENTS.UPDATE_ORDER_SOURCE,
   SOCKET_EVENTS.UPDATE_ORDER_PAID,
   SOCKET_EVENTS.UPDATE_ITEM_STATUS,
   SOCKET_EVENTS.SPLIT_ORDER,
+  SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER,
 ];

 // Events that require regular order API call
 export const EVENTS_REQUIRING_ORDER_API = [
   SOCKET_EVENTS.UPDATE_FOOD_STATUS,
   SOCKET_EVENTS.UPDATE_ORDER_STATUS,
   SOCKET_EVENTS.SCAN_NEW_ORDER,
-  SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER,
 ];
```

**Rationale**: Owner's live socket capture confirms the event carries `{orders: [...]}` payload at index [4]. No GET API needed.

---

### DIFF 2: `src/api/socket/socketHandlers.js` L588-612

**Rewrite handler to use socket payload; keep GET fallback for safety**

```diff
 /**
- * Handle delivery-assign-order event
- * Message: [delivery-assign-order, order_id, restaurant_id, rider_id]
- * Action: Fetch order from API, UPDATE in OrderContext
+ * Handle delivery-assign-order event (BUG-097 Gap 1 fix, 2026-05-20)
+ * Message: [delivery-assign-order, order_id, restaurant_id, f_order_status, { orders: [...] }]
+ *
+ * Emitted by backend on BOTH rider assign and rider cancel/reject.
+ * Socket carries full order payload — use it directly (same pattern as
+ * handleOrderDataEvent). GET fallback only if payload is missing/empty.
  */
-export const handleDeliveryAssignOrder = async (message, { updateOrder, updateTableStatus }) => {
+export const handleDeliveryAssignOrder = async (message, { updateOrder, updateTableStatus, setOrderEngaged }) => {
   const parsed = parseMessage(message);
   
   if (!parsed) {
     log('ERROR', 'Invalid delivery-assign-order message format', message);
     return;
   }
   
-  const { orderId, status: riderId } = parsed;
-  log('INFO', `delivery-assign-order received: ${orderId}, rider: ${riderId}`);
+  const { orderId, payload } = parsed;
+  log('INFO', `delivery-assign-order received: ${orderId}`);
   
-  const order = await fetchOrderWithRetry(orderId);
-  if (order) {
+  // Primary path: use socket payload directly (verified 2026-05-20 live capture)
+  if (payload && payload.orders && Array.isArray(payload.orders) && payload.orders.length > 0) {
+    let order;
+    try {
+      order = orderFromAPI.order(payload.orders[0]);
+      log('INFO', `delivery-assign-order: Transformed order ${orderId} from socket payload`);
+    } catch (error) {
+      log('ERROR', `delivery-assign-order: Transform failed`, error.message);
+      return;
+    }
     updateOrder(order.orderId, order);
     syncTableStatus(order, updateTableStatus);
-    log('INFO', `delivery-assign-order: Updated order ${order.orderId}`);
-  } else {
-    log('WARN', `delivery-assign-order: Could not fetch order ${orderId}, skipping`);
+    log('INFO', `delivery-assign-order: Updated order ${order.orderId} from payload`);
+  } else {
+    // Fallback: no payload — fetch from API (legacy safety net)
+    log('WARN', `delivery-assign-order: No payload for ${orderId}, falling back to API`);
+    const order = await fetchOrderWithRetry(orderId);
+    if (order) {
+      updateOrder(order.orderId, order);
+      syncTableStatus(order, updateTableStatus);
+      log('INFO', `delivery-assign-order: Updated order ${order.orderId} from API fallback`);
+    } else {
+      log('WARN', `delivery-assign-order: Could not fetch order ${orderId}, skipping`);
+    }
   }
+
+  // Release engage after React paints
+  if (setOrderEngaged) {
+    requestAnimationFrame(() => {
+      requestAnimationFrame(() => {
+        setOrderEngaged(orderId, false);
+        log('INFO', `delivery-assign-order: Order ${orderId} released from ENGAGED`);
+      });
+    });
+  }
 };
```

**Rationale**: Matches the pattern used by `handleOrderDataEvent` (L260-268) and `handleUpdateOrderStatus` (L460-468). Fallback to GET API only if socket payload is empty/missing (defensive — should never happen per live capture evidence).

---

### DIFF 3: `src/components/cards/OrderCard.jsx`

**3a. Import `useOrders` (L8)**

```diff
-import { useMenu, useRestaurant, useAuth } from "../../contexts";
+import { useMenu, useOrders, useRestaurant, useAuth } from "../../contexts";
```

**3b. Destructure `updateOrder` from `useOrders` (after L70)**

```diff
   const { user } = useAuth();
+  const { updateOrder } = useOrders();
```

**3c. Wire `onAssigned` on AssignRiderModal (L980-987)**

```diff
       <AssignRiderModal
         isOpen={showAssignRider}
         onClose={() => setShowAssignRider(false)}
         orderId={orderId}
         orderNumber={orderNumber}
         orderAmount={order.amount}
         currentRiderId={order.deliveryManId || null}
+        onAssigned={(picked) => {
+          // Optimistic update: set rider fields on local order immediately
+          // Socket delivery-assign-order will follow as authoritative final update
+          if (picked) {
+            updateOrder(orderId, {
+              ...order,
+              deliveryManId: picked.id,
+              rider: picked.fullName,
+              riderPhone: picked.phone || '',
+              deliveryManStatus: 'No',
+              riderStatus: 'riderAssigned',
+            });
+          }
+        }}
       />
```

**Rationale**: After the assign API succeeds, immediately spread the current order with the selected rider's data. Card re-renders instantly with `hasRiderAssigned = true` → shows "Reassign" (not Serve, not stale "Assign Rider"). Socket `delivery-assign-order` will overwrite with authoritative data seconds later.

---

### DIFF 4: `src/components/cards/TableCard.jsx`

**4a. Wire `onAssigned` on AssignRiderModal (L591-598)**

```diff
       <AssignRiderModal
         isOpen={showAssignRider}
         onClose={() => setShowAssignRider(false)}
         orderId={table.orderId}
         orderNumber={table.order?.orderNumber}
         orderAmount={table.order?.amount}
         currentRiderId={table.order?.deliveryManId || null}
+        onAssigned={(picked) => {
+          // Optimistic update: set rider fields on local order immediately
+          // Socket delivery-assign-order will follow as authoritative final update
+          if (picked && table.orderId) {
+            const { updateOrder } = require('../../contexts/OrderContext');
+            // Not viable via require — use getOrderById + context pattern below
+          }
+        }}
       />
```

**WAIT — TableCard already has `useOrders` imported (L13) and destructures `getOrderById` (L66). Need to also destructure `updateOrder`.**

**4a-revised. Destructure `updateOrder` from `useOrders` (L66)**

```diff
-  const { getOrderById } = useOrders();
+  const { getOrderById, updateOrder } = useOrders();
```

**4b. Wire `onAssigned` on AssignRiderModal (L591-598)**

```diff
       <AssignRiderModal
         isOpen={showAssignRider}
         onClose={() => setShowAssignRider(false)}
         orderId={table.orderId}
         orderNumber={table.order?.orderNumber}
         orderAmount={table.order?.amount}
         currentRiderId={table.order?.deliveryManId || null}
+        onAssigned={(picked) => {
+          if (picked && table.orderId) {
+            const existing = getOrderById(table.orderId);
+            if (existing) {
+              updateOrder(table.orderId, {
+                ...existing,
+                deliveryManId: picked.id,
+                rider: picked.fullName,
+                riderPhone: picked.phone || '',
+                deliveryManStatus: 'No',
+                riderStatus: 'riderAssigned',
+              });
+            }
+          }
+        }}
       />
```

**Rationale**: TableCard gets order data via `table.order` (derived from context in parent). The optimistic update via `updateOrder(table.orderId, ...)` updates OrderContext, which flows back to TableCard on next render. `getOrderById` provides the full current order for spreading.

---

## 3. What Is NOT Changed

| Item | Status |
|------|--------|
| `AssignRiderModal.jsx` | NO CHANGE — `onAssigned` prop already supported (L68) |
| `deliveryService.js` | NO CHANGE — API calls unchanged |
| `OrderCard.jsx` fOrderStatus 2 branching (L889-940) | NO CHANGE — Bucket 4.5 fix already correct |
| `TableCard.jsx` fOrderStatus 2 branching (L449-500) | NO CHANGE — Bucket 4.5 fix already correct |
| `DeliveryCard.jsx` | NOT TOUCHED |
| Non-delivery order behavior | NOT TOUCHED |
| `/app/memory/final/` | NOT UPDATED |
| Baseline docs | NOT UPDATED |
| Rider accept/reject socket | NOT IMPLEMENTED — Bucket 5 |

---

## 4. Verification Plan

After implementation:
1. `yarn build` — must pass with 0 errors
2. Dev server hot reload — must compile
3. Update smoke QA checklist with new test items for optimistic update
4. Update Bucket 4.5 implementation report
5. Stop for owner live retest

---

## 5. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Socket payload shape changes | GET API fallback in handler if payload missing |
| Optimistic update has stale spread | Socket authoritative update overwrites within seconds |
| `updateOrder` not available in OrderCard | Adding import — same pattern as TableCard which already uses it |
| Other socket handlers broken | No change to any other handler — only `handleDeliveryAssignOrder` modified |

---

## Document Metadata

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | 2026-05-20 |
| Status | AWAITING_OWNER_APPROVAL |
| Files affected | 4 (`socketEvents.js`, `socketHandlers.js`, `OrderCard.jsx`, `TableCard.jsx`) |
| Lines changed | ~50 |
