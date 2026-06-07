# BUG-116 — Out-of-Kitchen Item: API Must Emit Socket Event for Realtime Menu Update

**Status:** DISCOVERY COMPLETE
**Priority:** P1
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Reporter:** Owner
**Component:** Backend API + FE socket handler + MenuContext

---

## 1. Problem Statement (Owner Verbatim)

> When we add an out-of-kitchen item, an API is called so that menu which is added to out-of-kitchen item is called on the sockets. There's a change in the API needed so that it can be handled on a socket and realtime menu can be updated once it's added from out-of-kitchen or out-of-menu item.

---

## 2. Backend API Endpoint (Owner-Provided)

```
POST https://preprod.mygenie.online/api/v2/vendoremployee/product/add-single-product
```

FE constant: `API_ENDPOINTS.ADD_CUSTOM_ITEM` at `constants.js` L36.

---

## 3. Discovery — FE Architecture Trace

### Menu Data Flow

```
LoadingPage (bootstrap)
  → productService.getAllProducts() → GET /api/v2/vendoremployee/product (paginated)
    → productTransform.fromAPI.productList() → transforms each product
      → product.isOutOfStock = toBoolean(api.stock_out)   ← L93
    → MenuContext.setProducts(transformedProducts)         ← stored in React state
```

### Menu State: `MenuContext.jsx`

| State | Type | Set By | Used By |
|---|---|---|---|
| `products` | Array | `setProducts()` from LoadingPage | All order-taking screens |
| `categories` | Array | `setCategories()` from LoadingPage | Category navigation |
| `popularFood` | Array | `setPopularFood()` from LoadingPage | Popular items section |

Key method: `getActiveProducts()` at L73 filters `products.filter(p => p.isActive && !p.isOutOfStock)`.

**No socket listener updates menu state.** Menu is loaded once on bootstrap and never refreshed until full page reload.

### Existing Socket Events (socketEvents.js L55-78)

| Event | Channel | Purpose |
|---|---|---|
| `new-order` | `new_order_{rid}` | New order placed |
| `update-order` | `new_order_{rid}` | Order updated |
| `update-food-status` | `new_order_{rid}` | Item status change (preparing/ready/served) |
| `update-table` | `update_table_{rid}` | Table status change |
| ... | ... | ... |

**No `menu-update`, `product-update`, `stock-update`, or similar event exists.** There is zero infrastructure for realtime menu changes.

### Where Stock-Out Is Displayed

| Component | File | How |
|---|---|---|
| `ProductCard.jsx` | L204, L226-229 | `isOutOfStock` → grey bg + "Out of Stock" badge |
| `ProductList.jsx` | L15, L60 | Filter tab "Out of Stock" checks `p.isOutOfStock` |
| `MenuContext.getActiveProducts()` | L73-75 | Excludes `isOutOfStock` from active products |
| Order-taking (via `useMenu`) | Various | `getActiveProducts()` filters out-of-stock items |

### Current Toggle Flow (Menu Management Panel)

```
User toggles "Out of Stock" in ProductForm.jsx (L22: isOutOfStock field)
  → onSave callback (ProductList.jsx L109) → shows toast "Saved"
  → BUT: no API call visible in the save handler!
  → ProductForm only calls `onSave()` prop which just shows toast + closes form
  → No actual PUT/POST to update stock_out on backend
```

**CRITICAL FINDING:** The `onSave` handler in `ProductList.jsx` L109-112 only shows a toast and closes the form. **It does NOT make any API call to persist the change.** The save is UI-only — the stock-out toggle is not persisted to the backend at all in the current code.

---

## 4. Two-Part Problem

### Part A — Backend: No socket emission on product update
The endpoint `POST /api/v2/vendoremployee/product/add-single-product` does not emit a socket event when a product is updated/toggled. **Backend must add socket emission.**

### Part B — Frontend: No socket handler + save not wired to API
1. **Save not wired:** `ProductForm.onSave` → `ProductList.onSave` only shows toast. No API call to `add-single-product` or any update endpoint.
2. **No socket handler:** Even if backend emits a socket event, FE has no listener to update `MenuContext.products`.
3. **No `setProducts` updater for single-item change:** `MenuContext.setProducts` replaces the entire array. Need an `updateProduct(productId, changes)` method for granular updates.

---

## 5. FE Implementation Scope

### Step 1 — Wire ProductForm save to API
- In `ProductList.jsx` or `ProductForm.jsx`: call `api.post(API_ENDPOINTS.ADD_CUSTOM_ITEM, payload)` on save
- Transform form data to API shape (new `toAPI.updateProduct()` in `productTransform.js`)
- Update local `MenuContext.products` optimistically after API success

### Step 2 — Add socket event listener for menu updates
- Add new event to `socketEvents.js`: `MENU_UPDATE: 'menu-update'` (or whatever backend names it)
- Subscribe to event in a new hook or in `useStationSocketRefresh.js`
- On receipt: update the specific product in `MenuContext.products`

### Step 3 — Add `updateProduct` helper to MenuContext
```js
const updateProduct = useCallback((productId, changes) => {
  setProductsData(prev => prev.map(p =>
    p.productId === productId ? { ...p, ...changes } : p
  ));
}, []);
```

---

## 6. Affected Files

| File | Change | Owner |
|---|---|---|
| `socketEvents.js` | Add `MENU_UPDATE` event constant | FE |
| `MenuContext.jsx` | Add `updateProduct()` helper | FE |
| `ProductList.jsx` or `ProductForm.jsx` | Wire `onSave` to API call | FE |
| `productTransform.js` | Add `toAPI.updateProduct()` | FE |
| New hook or existing `useStationSocketRefresh.js` | Socket listener for menu-update | FE |
| **Backend API** | Emit socket event on product update | **Backend team** |

---

## 7. Dependencies

| Dependency | Status |
|---|---|
| Backend emits socket event on `add-single-product` | **BLOCKED — backend team must implement** |
| Socket event name + payload shape | **BLOCKED — backend team must define** (resolves BQ-CR-01 from BUG-096) |
| FE wiring (Steps 1-3) | Ready to implement once save API shape is confirmed |

---

## 8. Open Questions

| # | Question | Status |
|---|---|---|
| ~~Q-116-1~~ | Endpoint for toggling out-of-kitchen | **ANSWERED:** `POST /api/v2/vendoremployee/product/add-single-product` |
| Q-116-2 | Socket event name backend will emit | **BLOCKED — backend team** |
| Q-116-3 | Socket payload shape (full product object or just id + stock_out?) | **BLOCKED — backend team** |
| Q-116-4 | What is the request payload shape for `add-single-product` to toggle stock_out? | **Needs curl test or API docs** |
| Q-116-5 | Is `add-single-product` the correct endpoint for UPDATING an existing product, or only for adding new ones? | **Needs backend clarification** |
