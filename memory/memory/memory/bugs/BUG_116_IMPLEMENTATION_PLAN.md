# BUG-116 — Implementation Plan (Gate 3)

**Bug:** BUG-116 — Wire FE listener for `food_update_${rid}` socket; realtime MenuContext update on Add Custom Item
**Date:** 2026-06-08
**Agent:** E1 (Emergent)
**Sprint:** POS 4.0

---

## 1. Objective

Subscribe the FE to the existing backend socket channel `food_update_${restaurantId}` and propagate `food_details` payloads into `MenuContext.products` in realtime. After this fix, an Add Custom Item from terminal A is visible in terminal B's menu without a page reload, and the same terminal's menu list reflects the new product immediately.

---

## 2. Changes — 4 Files, ~60 Lines Added

### 2.1 File: `src/api/socket/socketEvents.js`

**Addition A (after L50, channel generator):**
```js
/**
 * Generate channel name for menu/product update events (BUG-116, 2026-06-08)
 * Backend emits to this channel on add-single-product API.
 * Envelope: args[0] = { type, food_id, restaurant_id, food_details }
 * @param {number} restaurantId
 * @returns {string} e.g., 'food_update_644'
 */
export const getFoodUpdateChannel = (restaurantId) => `food_update_${restaurantId}`;
```

**Addition B (inside `SOCKET_EVENTS`, after L77):**
```js
  // Menu/product update payload-types (BUG-116) — these are payload.type values,
  // not Socket.IO event names on the wire. Carried inside food_update_${rid} body.
  UPDATE_FOOD: 'update-food',
```

**Addition C (new doc block after L155 `MSG_INDEX`):**
```js
// =============================================================================
// FOOD-UPDATE CHANNEL ENVELOPE (BUG-116, 2026-06-08)
// =============================================================================
// `food_update_${rid}` does NOT use the 5-slot array envelope. Server emits a
// single data object: { type, food_id, restaurant_id, food_details }.
// Payload types so far: 'update-food' (add/update product).
// Consumed by handleFoodUpdate in socketHandlers.js.
```

### 2.2 File: `src/api/socket/socketHandlers.js`

**Addition (top imports — add productFromAPI alias):**
```js
import { fromAPI as productFromAPI } from '../transforms/productTransform';
```

**Addition (new exported handler — append at end of file, before the last 2 helper exports):**
```js
/**
 * Handle food_update_${rid} channel event (BUG-116, 2026-06-08).
 *
 * Envelope (NOT MSG_INDEX): args[0] = {
 *   type: 'update-food' | <future>,
 *   food_id: number,
 *   restaurant_id: number,
 *   food_details: { ...full product as per productFromAPI.product input... }
 * }
 *
 * Side effect: addOrUpdateProduct(MenuContext) — payload-driven, no API fetch.
 */
export const handleFoodUpdate = (args, actions) => {
  const data = args?.[0];
  if (!data || typeof data !== 'object') {
    log('ERROR', 'food-update: invalid envelope', args);
    return;
  }
  const { type, food_id, food_details } = data;
  if (type === SOCKET_EVENTS.UPDATE_FOOD && food_details) {
    const product = productFromAPI.product(food_details);
    if (actions?.addOrUpdateProduct) {
      actions.addOrUpdateProduct(product);
      log('INFO', `food-update: product ${food_id} added/updated in MenuContext`);
    } else {
      log('WARN', `food-update: actions.addOrUpdateProduct not wired`);
    }
  } else {
    log('WARN', `food-update: unhandled type='${type}' food_id=${food_id}`);
  }
};
```

### 2.3 File: `src/contexts/MenuContext.jsx`

**Addition (after `setProducts`, ~L21):**
```js
  // BUG-116 (2026-06-08): Delta update from socket `food_update_${rid}`.
  // Dedup by productId; merge if exists, insert if new.
  const addOrUpdateProduct = useCallback((product) => {
    if (!product?.productId) return;
    setProductsData((prev) => {
      const idx = prev.findIndex((p) => p.productId === product.productId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...product };
        return next;
      }
      return [...prev, product];
    });
  }, []);
```

**Modification (`value` object, current ~L86 after `setProducts`):** add `addOrUpdateProduct,`
**Modification (`useMemo` deps array, current ~L104 after `setProducts`):** add `addOrUpdateProduct,`

### 2.4 File: `src/api/socket/useSocketEvents.js`

**Addition A (new imports near top):**
```js
import { useMenu } from '../../contexts/MenuContext';
import { handleFoodUpdate } from './socketHandlers';
import { getFoodUpdateChannel } from './socketEvents';
```
(`handleFoodUpdate` and `getFoodUpdateChannel` should be folded into the existing import statements rather than adding new lines if cleaner — see Code Gate diff.)

**Addition B (inside hook body, alongside `useTables()` / `useRestaurant()` near L41):**
```js
  const { addOrUpdateProduct } = useMenu();
```

**Modification C (`actionsRef` initial value, L46) — add `addOrUpdateProduct`:**
```js
  const actionsRef = useRef({
    addOrder, updateOrder, removeOrder, getOrderById,
    updateTableStatus, setTableEngaged, setOrderEngaged, mergeRunningOrders,
    addOrUpdateProduct, // BUG-116
  });
```

**Modification D (the sync `useEffect` body + deps, L50-51):**
```js
  useEffect(() => {
    actionsRef.current = {
      addOrder, updateOrder, removeOrder, getOrderById,
      updateTableStatus, setTableEngaged, setOrderEngaged, mergeRunningOrders,
      addOrUpdateProduct, // BUG-116
    };
  }, [
    addOrder, updateOrder, removeOrder, getOrderById,
    updateTableStatus, setTableEngaged, setOrderEngaged, mergeRunningOrders,
    addOrUpdateProduct, // BUG-116
  ]);
```

**Addition E (new channel handler callback, after `handleOrderEngageChannelEvent` ~L176):**
```js
  // BUG-116 (2026-06-08): food_update_${rid} channel handler
  const handleFoodUpdateChannelEvent = useCallback((...args) => {
    console.log('[useSocketEvents] food-update channel event:', args);
    handleFoodUpdate(args, actionsRef.current);
  }, []);
```

**Addition F (inside main subscription `useEffect`, after orderEngage at L208):**
```js
    const foodUpdateChannel = getFoodUpdateChannel(restaurantId);
    const unsubscribeFoodUpdate = subscribe(foodUpdateChannel, handleFoodUpdateChannelEvent);
    if (unsubscribeFoodUpdate) {
      console.log('[useSocketEvents] Subscribed to food-update channel successfully');
    } else {
      console.warn('[useSocketEvents] food-update channel subscription failed');
    }
```

**Addition G (cleanup, after L233):**
```js
      unsubscribeFoodUpdate && unsubscribeFoodUpdate();
```

**Modification H (effect deps at L235-241):** add `handleFoodUpdateChannelEvent,`

---

## 3. Insertion-Point Checklist (CRITICAL — Do not skip)

| # | Spot | Risk if missed |
|---|---|---|
| ✅ MenuContext `value` object | Consumer can't see `addOrUpdateProduct` |
| ✅ MenuContext `useMemo` deps | Consumer closes over stale `undefined` |
| ✅ useSocketEvents `actionsRef` initial value | Handler can't access action on first render |
| ✅ useSocketEvents sync-effect body | Stale action after `useMenu` re-renders |
| ✅ useSocketEvents sync-effect deps | Sync effect doesn't re-run when `addOrUpdateProduct` identity changes |
| ✅ useSocketEvents main subscription cleanup | Memory leak / duplicate handlers on remount |
| ✅ useSocketEvents main effect deps | Subscription doesn't re-subscribe on dep change |

---

## 4. Test Strategy

### 4.1 Compile-time
- Webpack compiles clean (no new warnings)
- ESLint: no new advisory or blocking findings

### 4.2 Same-terminal smoke
- Login to preprod as `owner@lafetta.com` (rid=78)
- Order Entry → Add Custom Item → name `BUG_116_SMOKE_<ts>`, price 1, qty 1
- Verify:
  - Item added to local cart (existing behaviour, no regression)
  - Console shows `[useSocketEvents] food-update channel event:`
  - Console shows `[SocketHandler]...food-update: product XXX added/updated in MenuContext`
  - Item appears in MenuContext (search/browse the same item by name in another part of the UI without page reload)

### 4.3 Cross-terminal smoke
- Tab A: same login, Order Entry open
- Tab B: same login, menu browse view open
- Tab A: Add Custom Item
- Tab B: item appears in menu list **without** page reload

### 4.4 Regression checks (must remain unchanged)
- Place a normal order → still works
- KOT/item status updates → still flow through `update-food-status` (existing)
- Polling → unchanged
- Reconnect rehydration → unchanged (orders only, owner ruling)
- Other channels — no spurious unsubscribes

---

## 5. Rollback

Revert the 4 file changes. No data migration, no state change, no API contract change. Backend remains emitting the socket; FE simply stops listening. Behaviour reverts to "no realtime menu update" (current state).

---

## 6. Out of Scope (Explicit)

- Reconnect menu rehydration (owner ruling: out of scope)
- Stock-out / out-of-kitchen toggles via the same channel (future `payload.type` values) — handler logs WARN; safe extension point
- Delete-food (future `payload.type='delete-food'`) — handler logs WARN; safe extension point
- Other terminals' notification toast on new item add — not requested

---

## 7. Patch v2 (2026-06-08) — Socket Payload Defensive Defaults

### File: `src/api/socket/socketHandlers.js`

**Added** above `handleFoodUpdate`:
```js
const SOCKET_FOOD_DEFAULTS = {
  status: 1,
  is_disable: 'N',
  stock_out: 'N',
  food_status: 0,
  live_web: 'Y',
};
```

**Modified** the transform call inside `handleFoodUpdate`:
```js
// before
const product = productFromAPI.product(food_details);
// after
const normalised = { ...SOCKET_FOOD_DEFAULTS, ...food_details };
const product = productFromAPI.product(normalised);
```

**Contract:** Backend values, when present, always override defaults (spread order). Backend can ship its fix at any time; FE silently adapts.

### Files NOT changed in Patch v2
- `MenuContext.jsx` — Patch v1 logic correct; only temp logs reverted
- `OrderEntry.jsx` — only temp log reverted
- `socketEvents.js`, `useSocketEvents.js`, `productTransform.js` — untouched
