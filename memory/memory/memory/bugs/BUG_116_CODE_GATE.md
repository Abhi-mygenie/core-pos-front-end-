# BUG-116 — Pre-Implementation Code Gate (Gate 4)

**Bug:** BUG-116 — Wire FE listener for `food_update_${rid}` socket; realtime MenuContext update
**Date:** 2026-06-08
**Agent:** E1 (Emergent)
**Sprint:** POS 4.0
**Owner GO:** 2026-06-08 (verbatim: "go as per gates")
**Hot-spot ruling (Owner):** "on reconnect menu will anyways come in context" → reconnect rehydration is OUT OF SCOPE.

---

## Scope Lock

**WILL change (4 files):**
- `src/api/socket/socketEvents.js`
- `src/api/socket/socketHandlers.js`
- `src/contexts/MenuContext.jsx`
- `src/api/socket/useSocketEvents.js`

**Will NOT change (deliberate):**
- `src/components/order-entry/OrderEntry.jsx` (local cart path unchanged)
- `src/api/transforms/orderTransform.js`
- `src/api/transforms/productTransform.js`
- `src/api/constants.js`
- All other socket handlers (order / table / aggregator / order-engage / KOT / scan / split / delivery-assign)

---

## Invariants Held

| Invariant | Status |
|---|---|
| `MSG_INDEX` envelope shape for existing order/table channels | Untouched |
| Existing handler signatures (`handleNewOrder`, `handleUpdateFoodStatus`, etc.) | Untouched |
| `actionsRef` field names + initial 8 actions | Unchanged; appends `addOrUpdateProduct` as 9th |
| `MenuContext.products` shape | Unchanged; only writes via existing `setProductsData` |
| Existing `setProducts` (full-load) path | Unchanged; used by `LoadingPage.jsx` + `useRefreshAllData.js` |
| Cart path on Add Custom Item | Unchanged; `setCartItems(prev => [...prev, cartItem])` still runs from HTTP response |
| API endpoint `/api/v2/vendoremployee/product/add-single-product` | Unchanged |
| `productFromAPI.product()` transform | Unchanged; consumed read-only |

---

## Exact Diffs

### Diff 1/4 — `src/api/socket/socketEvents.js`

```diff
 /**
  * Generate channel name for order-engage events
  * @param {number} restaurantId 
  * @returns {string} e.g., 'order-engage_510'
  */
 export const getOrderEngageChannel = (restaurantId) => `order-engage_${restaurantId}`;
+
+/**
+ * Generate channel name for menu/product update events (BUG-116, 2026-06-08)
+ * Backend emits to this channel on add-single-product API.
+ * Envelope: args[0] = { type, food_id, restaurant_id, food_details }
+ * @param {number} restaurantId
+ * @returns {string} e.g., 'food_update_644'
+ */
+export const getFoodUpdateChannel = (restaurantId) => `food_update_${restaurantId}`;
```

```diff
   // Order engage event - comes through order-engage_${restaurantId} channel
   ORDER_ENGAGE: 'order-engage',
+
+  // Menu/product update payload-types (BUG-116) — these are payload.type values,
+  // not Socket.IO event names on the wire. Carried inside food_update_${rid} body.
+  UPDATE_FOOD: 'update-food',
 };
```

```diff
 export const MSG_INDEX = {
   ...
   PAYLOAD: 4,
 };
+
+// =============================================================================
+// FOOD-UPDATE CHANNEL ENVELOPE (BUG-116, 2026-06-08)
+// =============================================================================
+// `food_update_${rid}` does NOT use the 5-slot array envelope. Server emits a
+// single data object: { type, food_id, restaurant_id, food_details }.
+// Payload types so far: 'update-food' (add/update product).
+// Consumed by handleFoodUpdate in socketHandlers.js.
```

### Diff 2/4 — `src/api/socket/socketHandlers.js`

```diff
 import { fromAPI as orderFromAPI } from '../transforms/orderTransform';
+import { fromAPI as productFromAPI } from '../transforms/productTransform';
 import { fetchSingleOrderForSocket } from '../services/orderService';
```

```diff
 export const isAsyncHandler = (eventName) => {
   ...
 };
+
+// =============================================================================
+// FOOD-UPDATE HANDLER (BUG-116, 2026-06-08)
+// =============================================================================
+
+/**
+ * Handle food_update_${rid} channel event.
+ *
+ * Envelope (NOT MSG_INDEX): args[0] = {
+ *   type: 'update-food' | <future>,
+ *   food_id: number,
+ *   restaurant_id: number,
+ *   food_details: { ...full product as per productFromAPI.product input... }
+ * }
+ *
+ * Side effect: actions.addOrUpdateProduct (MenuContext) — payload-driven, no API fetch.
+ */
+export const handleFoodUpdate = (args, actions) => {
+  const data = args?.[0];
+  if (!data || typeof data !== 'object') {
+    log('ERROR', 'food-update: invalid envelope', args);
+    return;
+  }
+  const { type, food_id, food_details } = data;
+  if (type === SOCKET_EVENTS.UPDATE_FOOD && food_details) {
+    const product = productFromAPI.product(food_details);
+    if (actions?.addOrUpdateProduct) {
+      actions.addOrUpdateProduct(product);
+      log('INFO', `food-update: product ${food_id} added/updated in MenuContext`);
+    } else {
+      log('WARN', 'food-update: actions.addOrUpdateProduct not wired');
+    }
+  } else {
+    log('WARN', `food-update: unhandled type='${type}' food_id=${food_id}`);
+  }
+};
```

### Diff 3/4 — `src/contexts/MenuContext.jsx`

```diff
   // Set products (called from LoadingPage)
   const setProducts = useCallback((data) => {
     setProductsData(data || []);
   }, []);
+
+  // BUG-116 (2026-06-08): Delta update from socket `food_update_${rid}`.
+  // Dedup by productId; merge if exists, insert if new.
+  const addOrUpdateProduct = useCallback((product) => {
+    if (!product?.productId) return;
+    setProductsData((prev) => {
+      const idx = prev.findIndex((p) => p.productId === product.productId);
+      if (idx >= 0) {
+        const next = [...prev];
+        next[idx] = { ...next[idx], ...product };
+        return next;
+      }
+      return [...prev, product];
+    });
+  }, []);
```

```diff
     setCategories,
     setProducts,
+    addOrUpdateProduct,
     setPopularFood,
     clearMenu,
```

```diff
     setCategories,
     setProducts,
+    addOrUpdateProduct,
     setPopularFood,
     clearMenu,
```

### Diff 4/4 — `src/api/socket/useSocketEvents.js`

```diff
 import { useSocket } from '../../contexts/SocketContext';
 import { useOrders } from '../../contexts/OrderContext';
 import { useTables } from '../../contexts/TableContext';
 import { useRestaurant } from '../../contexts/RestaurantContext';
+import { useMenu } from '../../contexts/MenuContext';
 import socketService, { CONNECTION_STATUS } from './socketService';
 import { getRunningOrders } from '../services/orderService';
 import { 
   SOCKET_EVENTS,
   getOrderChannel,
   getTableChannel,
   getOrderEngageChannel,
+  getFoodUpdateChannel,
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
+  handleFoodUpdate,
 } from './socketHandlers';
```

```diff
   const { addOrder, updateOrder, removeOrder, getOrderById, setOrderEngaged, mergeRunningOrders } = useOrders();
   const { updateTableStatus, setTableEngaged } = useTables();
   const { restaurant } = useRestaurant();
+  // BUG-116: MenuContext action for realtime product upsert
+  const { addOrUpdateProduct } = useMenu();
```

```diff
-  const actionsRef = useRef({ addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus, setTableEngaged, setOrderEngaged, mergeRunningOrders });
+  const actionsRef = useRef({ addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus, setTableEngaged, setOrderEngaged, mergeRunningOrders, addOrUpdateProduct });
   
-  // Update ref when context functions change
   useEffect(() => {
-    actionsRef.current = { addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus, setTableEngaged, setOrderEngaged, mergeRunningOrders };
-  }, [addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus, setTableEngaged, setOrderEngaged, mergeRunningOrders]);
+    actionsRef.current = { addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus, setTableEngaged, setOrderEngaged, mergeRunningOrders, addOrUpdateProduct };
+  }, [addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus, setTableEngaged, setOrderEngaged, mergeRunningOrders, addOrUpdateProduct]);
```

```diff
   const handleOrderEngageChannelEvent = useCallback((...args) => {
     ...
   }, []);
+
+  // BUG-116 (2026-06-08): food_update_${rid} channel handler
+  const handleFoodUpdateChannelEvent = useCallback((...args) => {
+    console.log('[useSocketEvents] food-update channel event:', args);
+    handleFoodUpdate(args, actionsRef.current);
+  }, []);
```

```diff
     const orderEngageChannel = getOrderEngageChannel(restaurantId);
+    // BUG-116: menu-update channel
+    const foodUpdateChannel = getFoodUpdateChannel(restaurantId);
     
-    console.log(`[useSocketEvents] Subscribing to channels for restaurant ${restaurantId}: ${orderChannel}, ${tableChannel}, ${orderEngageChannel}`);
+    console.log(`[useSocketEvents] Subscribing to channels for restaurant ${restaurantId}: ${orderChannel}, ${tableChannel}, ${orderEngageChannel}, ${foodUpdateChannel}`);
     
     const unsubscribeOrder = subscribe(orderChannel, handleOrderChannelEvent);
     const unsubscribeTable = subscribe(tableChannel, handleTableChannelEvent);
     const unsubscribeOrderEngage = subscribe(orderEngageChannel, handleOrderEngageChannelEvent);
+    const unsubscribeFoodUpdate = subscribe(foodUpdateChannel, handleFoodUpdateChannelEvent);
```

```diff
     if (unsubscribeOrderEngage) {
       console.log(`[useSocketEvents] Subscribed to order-engage channel successfully`);
     } else {
       console.warn('[useSocketEvents] Order-engage channel subscription failed');
     }
+
+    if (unsubscribeFoodUpdate) {
+      console.log('[useSocketEvents] Subscribed to food-update channel successfully');
+    } else {
+      console.warn('[useSocketEvents] food-update channel subscription failed');
+    }
```

```diff
     return () => {
       console.log('[useSocketEvents] Unsubscribing from channels');
       unsubscribeOrder && unsubscribeOrder();
       unsubscribeTable && unsubscribeTable();
       unsubscribeOrderEngage && unsubscribeOrderEngage();
+      unsubscribeFoodUpdate && unsubscribeFoodUpdate();
     };
   }, [
     isConnected,
     restaurantId,
     subscribe,
     handleOrderChannelEvent,
     handleTableChannelEvent,
     handleOrderEngageChannelEvent,
+    handleFoodUpdateChannelEvent,
   ]);
```
