# BUG-374 IMPLEMENTATION PLAN — Cart: Variation Qty Sync
**Date:** 2026-09-01 | **Gate:** 3 | **Risk:** CRITICAL
**Execution order:** #1 — highest priority (P0 BLOCKER)

---

## Step 0 — Entry Verification ✅
| Claim | Verified |
|---|---|
| `updateQuantity` at line 736 matches by `item.id` (line 778) | ✅ |
| `CartPanel.jsx NewItemRow` calls `updateQuantity(item.id, ...)` (lines 297-299) | ✅ |
| No `_cartKey` field exists anywhere in cart logic | ✅ |
| `addToCart` new slot at line 623 | ✅ |
| `addCustomizedItemToCart` new slot at line 720 | ✅ |

---

## Root Cause (confirmed)
`updateQuantity` matches unplaced cart items by `item.id`. Two variations (30ml/60ml) of the same food share the same `item.id` → both get updated when either qty changes.

---

## Fix: Assign `_cartKey` per cart slot, match by `_cartKey` in updateQuantity

### Edit 1 — OrderEntry.jsx: assign `_cartKey` in `addToCart` weight path (line 596)
```js
// BEFORE (line 596-604):
setCartItems([...cartItems, {
  ...item, qty: defaultWeight, price: item.itemUnitPrice,
  totalPrice: item.itemUnitPrice * defaultWeight,
  status: 'preparing', placed: false, addedAt: new Date().toISOString(),
}]);
// AFTER: add _cartKey
setCartItems([...cartItems, {
  ...item, qty: defaultWeight, price: item.itemUnitPrice,
  totalPrice: item.itemUnitPrice * defaultWeight,
  status: 'preparing', placed: false, addedAt: new Date().toISOString(),
  _cartKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`, // BUG-374
}]);
```

### Edit 2 — OrderEntry.jsx: assign `_cartKey` in `addToCart` new non-customized slot (line 623)
```js
// BEFORE (line 623-629):
setCartItems([...cartItems, {
  ...item, qty: item.quantity || 1,
  status: "preparing", placed: false, addedAt: new Date().toISOString()
}]);
// AFTER:
setCartItems([...cartItems, {
  ...item, qty: item.quantity || 1,
  status: "preparing", placed: false, addedAt: new Date().toISOString(),
  _cartKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`, // BUG-374
}]);
```

### Edit 3 — OrderEntry.jsx: assign `_cartKey` in `addCustomizedItemToCart` new slot (line 720)
```js
// BEFORE (line 720-727):
setCartItems([...cartItems, {
  ...item, qty: item.quantity || 1,
  status: "preparing", placed: false, addedAt: new Date().toISOString()
}]);
// AFTER:
setCartItems([...cartItems, {
  ...item, qty: item.quantity || 1,
  status: "preparing", placed: false, addedAt: new Date().toISOString(),
  _cartKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`, // BUG-374
}]);
```

### Edit 4 — OrderEntry.jsx: assign `_cartKey` for custom item from API (line 1332)
```js
// BEFORE: setCartItems(prev => [...prev, cartItem]);
// AFTER:
setCartItems(prev => [...prev, { ...cartItem, _cartKey: `${Date.now()}-${Math.random().toString(36).slice(2)}` }]); // BUG-374
```

### Edit 5 — OrderEntry.jsx: update `updateQuantity` unplaced match (line 777-778)
```js
// BEFORE (line 777-778):
setCartItems(prev => prev.map(item => {
  if (item.id !== itemId) return item;

// AFTER: match by _cartKey when available, fall back to id
setCartItems(prev => prev.map(item => {
  // BUG-374: use _cartKey for exact slot match when available (prevents same-food variations from syncing qty)
  if (item._cartKey ? item._cartKey !== itemId : item.id !== itemId) return item;
```

### Edit 6 — CartPanel.jsx: pass `_cartKey` as identifier to `updateQuantity` (NewItemRow)
```js
// Line 283 — weight item minus:
if (item.qty > minVal) updateQuantity(item._cartKey || item.id, Math.round((item.qty - step) * 100) / 100);
// Line 292 — weight item plus:
updateQuantity(item._cartKey || item.id, Math.round((item.qty + step) * 100) / 100);
// Line 297 — minus button:
if (item.qty > 1) updateQuantity(item._cartKey || item.id, item.qty - 1);
// Line 298 — input change:
if (!isNaN(val) && val >= 1) updateQuantity(item._cartKey || item.id, val);
// Line 299 — plus button:
updateQuantity(item._cartKey || item.id, item.qty + 1)
```

---

## Verification Matrix

| # | Edit | How to Verify |
|---|---|---|
| E1-E4 | `_cartKey` assigned on cart add | Check cart item in React DevTools — `_cartKey` field present |
| E5 | updateQuantity uses `_cartKey` | Add 30ml + 60ml → change 30ml to 3 → 60ml stays at 1 |
| E6 | CartPanel passes `_cartKey` | Console log: `item._cartKey` in NewItemRow |
| V1 | Core fix | Add 30ml qty=1 + 60ml qty=1 → increase 30ml to 3 → 60ml remains 1 |
| V2 | Non-customized regression | Add plain "Burger" twice (same ID, no variations) → qty merges to 2 (existing behavior preserved) |
| V3 | Placed items delta unaffected | Place order → increase qty of placed item → delta item created correctly |

---

## Scope Lock
**Files WILL change:** `OrderEntry.jsx` (Edits 1-5), `CartPanel.jsx` (Edit 6)
**Files will NOT touch:** `orderTransform.js`, `CollectPaymentPanel.jsx`, `TableCard.jsx`, `OrderCard.jsx`

---

## Post-Code Registry Checklist
- [ ] registry.json: BUG-374 → IMPLEMENTED, sprint_key: pos_5_1
- [ ] BUG_TRACKER.md row updated
- [ ] FILE_OWNERSHIP.md: OrderEntry.jsx + CartPanel.jsx listed
- [ ] Code markers: `// BUG-374` in every modified file
- [ ] Compile: webpack 0 new warnings
