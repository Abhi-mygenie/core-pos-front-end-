# BUG-116 — Add Custom Item: Backend Socket Emission + FE Realtime Menu Update

**Status:** IMPLEMENTED — AWAITING OWNER SMOKE
**Priority:** P1
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Runtime validated:** 2026-06-08 (live socket observation via temp `socket.onAny` tap)
**Reporter:** Owner
**Component:** socketEvents.js, socketHandlers.js, useSocketEvents.js, MenuContext.jsx

---

## Runtime Findings (2026-06-08)

Backend `POST /api/v2/vendoremployee/product/add-single-product` **already emits a socket** on a new channel — confirmed in browser console:

- **Channel name:** `food_update_${restaurantId}` (underscore separator; e.g. `food_update_644`, `food_update_78`)
- **Envelope:** single object as `args[0]` — NOT the 5-slot `MSG_INDEX` array used by order/table channels
- **Payload shape:**
  ```json
  {
    "type": "update-food",
    "food_id": 206172,
    "restaurant_id": 644,
    "food_details": { "id": 206172, "name": "gggg", "price": 7, "category_id": 2454, ... }
  }
  ```
- **`food_details`** is the full product object (matches `productFromAPI.product()` input shape — no extra fetch required)
- FE had **zero** listeners for `food_update_*` (grep confirmed). Backend signal was being silently discarded.

---

## 1. Problem Statement (Owner Verbatim)

> When we add an out-of-kitchen item (custom item not in menu), an API is called. There's a change in the API so that it will emit a socket which needs to be used. We can do runtime validation if required. The menu should update in realtime once the custom item is added.

---

## 2. Context — "Add Custom Item" Flow

The **"Add Custom Item" modal** (screenshot: Item Name, Category, Price, Quantity, Notes → "Add to Order") is for items NOT in the menu. It creates a new product in the catalog AND adds it to the current cart.

### Backend API Endpoint
```
POST https://preprod.mygenie.online/api/v2/vendoremployee/product/add-single-product
```
FE constant: `API_ENDPOINTS.ADD_CUSTOM_ITEM` at `constants.js` L36.

**Backend will now emit a socket event** when this API is called — FE needs to handle it.

---

## 3. Current FE Flow (Code-Traced)

### File: `OrderEntry.jsx` L1119–1127
```js
const handleAddCustomItem = async ({ name, categoryId, price, qty, notes }) => {
  const payload = orderToAPI.addCustomItem(name, categoryId, price);
  const response = await api.post(API_ENDPOINTS.ADD_CUSTOM_ITEM, payload);
  const cartItem = customItemFromAPI(response.data.data, qty, notes);
  setCartItems(prev => [...prev, cartItem]);   // ← adds to LOCAL cart only
  toast({ title: "Custom Item Added" });
};
```

### Payload sent (`orderTransform.js` L832–839):
```js
{ name, category_id, price, tax: 0, tax_type: 'GST', tax_calc: 'Exclusive' }
```

### Response mapped (`orderTransform.js` L1904–1915):
```js
{ id, name, price, unitPrice, qty, notes, status: 'preparing', placed: false, isCustomItem: true }
```

### What happens today:
1. API creates product in backend catalog ✅
2. Item added to **current cart only** ✅
3. Item does NOT appear in `MenuContext.products` ❌ (menu not updated)
4. Other terminals don't see the new item ❌ (no socket handler)
5. Same terminal: new item won't appear in menu search/browse until page reload ❌

---

## 4. What Needs to Change

### Backend (already in progress per owner):
- `POST add-single-product` will emit a socket event with the new product data
- Socket event name TBD (e.g., `product-update` or `menu-update`)

### Frontend — 3 changes:

**Change 1 — Add socket event constant**
`socketEvents.js`: Add new event for menu/product updates.

**Change 2 — Add socket handler**
Listen for the new event on the order channel (or a new menu channel). On receipt:
- Transform the product data via `productTransform.fromAPI.product()`
- Add to `MenuContext.products` if not already present (by `productId`)
- If already present, update the existing entry (for future stock-out toggle use)

**Change 3 — Add `addOrUpdateProduct` helper to MenuContext**
```js
const addOrUpdateProduct = useCallback((product) => {
  setProductsData(prev => {
    const idx = prev.findIndex(p => p.productId === product.productId);
    if (idx >= 0) {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...product };
      return updated;
    }
    return [...prev, product];
  });
}, []);
```

---

## 5. Affected Files

| File | Change |
|---|---|
| `socketEvents.js` L55-78 | Add `PRODUCT_UPDATE` (or `MENU_UPDATE`) event constant |
| `MenuContext.jsx` | Add `addOrUpdateProduct()` helper + expose in context value |
| New hook or `useStationSocketRefresh.js` | Subscribe to product-update socket, call `addOrUpdateProduct` on receipt |
| `productTransform.js` | May need to transform socket payload → same shape as `fromAPI.product()` |

**No change to `OrderEntry.jsx` L1119** — the existing `handleAddCustomItem` stays as-is (it handles the local cart). The socket handler handles the menu update separately.

---

## 6. Runtime Validation (Owner Mentioned)

If needed, on socket receipt:
- Validate the product has required fields (name, price, categoryId)
- Check if product already exists in menu (dedup by productId)
- Optionally show a toast: "New item '{name}' added to menu by {employee}"

---

## 7. Dependencies

| Dependency | Status |
|---|---|
| Backend emits socket on `add-single-product` | **Owner confirmed: will be done** |
| Socket event name | **Needs backend to define** |
| Socket payload shape | **Needs backend to define** (ideally same as product API response) |

---

## 8. Open Questions

| # | Question | Status |
|---|---|---|
| ~~Q-116-1~~ | Endpoint | **ANSWERED:** `POST /api/v2/vendoremployee/product/add-single-product` |
| Q-116-2 | Socket event name backend will emit | **Needs backend** |
| Q-116-3 | Socket payload shape — full product object or minimal? | **Needs backend** |
| Q-116-4 | Which socket channel — existing `new_order_{rid}` or new `menu_{rid}`? | **Needs backend** |
| Q-116-5 | Should other terminals show a notification when a new custom item is added? | **Owner decision** |
