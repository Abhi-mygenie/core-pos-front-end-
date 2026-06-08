# CR-014 — Impact Analysis (Gate 2)

**Status:** COMPLETE
**Date:** 2026-06-08
**Author:** Agent (Gate 2)
**Approach:** Keep UI shell, scrap old service wiring, build new service layer from scratch against Menu Management API.

---

## 1. Executive Summary

The Menu Management panel (`MenuManagementPanel.jsx` + 4 sub-components) currently reads data from `MenuContext` (which is loaded via the **old Product API** `GET /api/v1/vendoremployee/get-products-list`). All write operations (add, edit, delete, reorder, toggle status) are **UI-only / mocked** — they show toasts but make zero API calls.

**CR-014 will:**
1. Create a new `menuManagementService.js` wiring all 10 new Menu Management API endpoints
2. Create a new `menuManagementTransform.js` mapping the new API response shape to the existing UI data shape
3. Wire the 4 UI components to call real APIs instead of local state / toasts
4. Leave order-taking flows (Product API) completely untouched

---

## 2. API Response Shape Comparison

### OLD: `GET /api/v1/vendoremployee/get-products-list` (order-taking)
```
Response: { total_size, limit, offset, products: [...] }
Product keys (63): id, name, description, image, category_id, category_ids, variations, add_ons,
  attributes, choice_options, price, tax, tax_type, tax_calc, discount, discount_type,
  available_time_starts/ends, veg, allergen, egg, jain, status, restaurant_id, order_count,
  avg_rating, rating_count, recommended, slug, food_status, food_stock, food_for,
  dinein, takeaway, delivery, takeaway_charge, delivery_charge, food_order,
  prepration_time_min, serve_time_in_min, give_discount, is_disable, complementary,
  complementary_price, item_code, is_inventory, packed_food, is_recipe, recipe_id,
  live_web, stock_out, pack_charges, created_at, updated_at, kcal, item_unit,
  item_unit_price, restaurant_name, station_name, recipe_status, recipe, ...
```

### NEW: `GET /api/v2/vendoremployee/product/foods-list?food_for=Normal` (menu management)
```
Response: { foods: [...], restaurant_settings: { vat: { status, code } } }
Food keys (30): id, name, category (OBJECT: {id, name}), price, item_type, status,
  image, description, discount_type, discount, available_time_starts/ends,
  prepration_time_min, serve_time_in_min, live_web, pack_charges, takeaway_charge,
  delivery_charge, tax, tax_type, item_unit, item_unit_price, give_discount,
  variation, addons, food_for, allergens, kcal, portion_size, item_code,
  dinein, delivery, takeaway, food_order, complementary, complementary_price
```

### Key Differences

| Aspect | OLD (Product API) | NEW (Foods-list API) |
|--------|-------------------|----------------------|
| **Wrapper** | `{ products: [...] }` | `{ foods: [...], restaurant_settings }` |
| **Category** | `category_id: 4801` (flat int) | `category: { id: 4801, name: "Other Beverages" }` (nested object) |
| **Category IDs** | `category_ids: [{id, position}]` | Not present |
| **Veg field** | `veg: 0` or `1` (int) | `item_type: 0` or `1` (renamed) |
| **Variations** | `variations: [...]` | `variation: [...]` (singular key name) |
| **Add-ons** | `add_ons: [...]` | `addons: [...]` (no underscore) |
| **Egg/Jain** | `egg: 0, jain: 0` | Not present |
| **stock_out** | Present | Not present |
| **is_disable** | Present | Not present |
| **station_name** | Present | Not present |
| **tax_calc** | Present | Not present |
| **slug** | Present | Not present |
| **food_status** | Present | Not present |
| **Allergens** | `allergen: null` (string) | `allergens: []` (array) |
| **restaurant_settings** | Not present | Included (VAT config) |

---

## 3. Other API Response Shapes

### Menu Master (`GET /product/menu-master`)
```json
{ "message": "Menus fetched successfully", "menus": [{ "id": 245, "menu_name": "Normal" }, { "id": 244, "menu_name": "Party" }, { "id": 243, "menu_name": "Premium" }] }
```
Used for: `food_for` dropdown / menu type selector.

### Delete Reasons (`GET /product/delete-reasons`)
```json
{ "reason": ["Item not in menu any more", "Duplicate item"] }
```
Used for: Delete confirmation dialog — dropdown of reasons.

### Other Endpoints (write operations — response shapes TBD at implementation)
- `POST /product/add-food` → `multipart/form-data` with `food_info` JSON + `image` file
- `POST /product/foods/{food_id}` → same shape as add, with `food_id` in URL + optional `swiggy_image`
- `DELETE /product/delete/{food_id}` → body: `{ delete_reason: "..." }`
- `POST /product/status-food/{food_id}` → body: `{ status: 0|1 }`
- `POST /product/bulk-import` → `multipart/form-data` with `products_file` (.xlsx)
- `POST /product/bulk-export` → body: `{ type: "all" }` → returns .xlsx
- `GET /product/export-sample` → returns blank .xlsx template

---

## 4. Current UI Components — What They Do & What's Mocked

### `MenuManagementPanel.jsx` (65 lines) — Container
- 2-column layout: CategoryList (30%) + ProductList (70%)
- **No API calls.** Reads `categories` from MenuContext.
- **No changes needed** — pure layout shell.

### `CategoryList.jsx` (202 lines) — Left Panel
| Feature | Current State | API to Wire |
|---------|--------------|-------------|
| List categories | Reads from `MenuContext.categories` | Will read from `foods-list` response (categories extracted from food items) or could use existing `get-categories` endpoint |
| Search categories | Local filter ✅ | No API needed |
| Drag-and-drop reorder | Local state only + toast **MOCKED** | No reorder API provided in the 10 endpoints — **keep local for now** |
| Add category | Toast only **MOCKED** | No category-add API in the 10 endpoints — **defer** |
| Edit category name | Toast only **MOCKED** | No category-edit API in the 10 endpoints — **defer** |
| Delete category | Toast only **MOCKED** | No category-delete API in the 10 endpoints — **defer** |

**Note:** The 10 APIs are all food/product-level. Category CRUD is not included. Category list can be derived from `foods-list` response (each food has `category: {id, name}`).

### `ProductList.jsx` (239 lines) — Right Panel
| Feature | Current State | API to Wire |
|---------|--------------|-------------|
| List products | Reads from `MenuContext.products` | **API #3:** `GET /product/foods-list` |
| Search products | Local filter ✅ | No API needed |
| Status filter (Active/Inactive/OOS/Disabled) | Local filter ✅ | Filter from foods-list data |
| Food type filter (Veg/Non-Veg/Egg/Jain) | Local filter ✅ | Filter from foods-list data |
| Drag-and-drop reorder | Local state only + toast **MOCKED** | No reorder API in endpoints — **keep local** |
| Add Product → ProductForm | Opens form **MOCKED** | **API #1:** `POST /product/add-food` |
| Quick Edit → ProductCard inline | Opens inline form **MOCKED** | **API #2:** `POST /product/foods/{id}` |
| Full Edit → ProductForm | Opens form **MOCKED** | **API #2:** `POST /product/foods/{id}` |
| Delete → confirm dialog | Toast only **MOCKED** | **API #4:** `DELETE /product/delete/{id}` + **API #5:** `GET /product/delete-reasons` |

### `ProductCard.jsx` (300 lines) — Individual Item
| Feature | Current State | API to Wire |
|---------|--------------|-------------|
| Display product info | Reads props from ProductList ✅ | Props mapped via new transform |
| Quick Edit form (inline) | Local state + toast **MOCKED** | **API #2:** `POST /product/foods/{id}` (partial fields) |
| Delete confirm | Toast only **MOCKED** | **API #4 + #5** |
| Status toggle | Not implemented | **API #6:** `POST /product/status-food/{id}` |

### `ProductForm.jsx` (267 lines) — Full Add/Edit Form
| Feature | Current State | API to Wire |
|---------|--------------|-------------|
| Form fields | Local state ✅ | Transform form → `food_info` JSON for API |
| Category dropdown | Reads from `MenuContext.categories` | From foods-list unique categories or `get-categories` |
| Station dropdown | Hardcoded KDS/BAR/BILL | Keep as-is (station not in new API) |
| Variations display | Read-only ✅ | Read-only (matches new API `variation` field) |
| Add-ons display | Read-only ✅ | Read-only (matches new API `addons` field) |
| Image upload | Not present | **API #1/#2** accept `image` form field |
| Save (Add) | Toast only **MOCKED** | **API #1:** `POST /product/add-food` |
| Save (Edit) | Toast only **MOCKED** | **API #2:** `POST /product/foods/{id}` |

### Not Yet Built (New Features from API)
| Feature | API | UI Needed |
|---------|-----|-----------|
| Bulk Import | **API #8:** `POST /product/bulk-import` | Upload button + file picker |
| Bulk Export | **API #9:** `POST /product/bulk-export` | Download button |
| Sample Template | **API #10:** `GET /product/export-sample` | Download link |
| Menu Type Selector | **API #7:** `GET /product/menu-master` | Dropdown (Normal/Party/Premium) to pass as `food_for` param |

---

## 5. Data Flow — Before vs After

### BEFORE (current)
```
LoadingPage → GET /v1/get-products-list → productTransform.fromAPI.productList()
  → MenuContext.setProducts(transformed)
    → MenuManagementPanel reads MenuContext.products (same data as order-taking)
    → All writes are MOCKED (toast only, no API calls)
```

### AFTER (CR-014)
```
MenuManagementPanel opens → menuManagementService.getFoodsList(food_for)
  → GET /v2/product/foods-list → menuManagementTransform.fromAPI.foodsList()
    → Panel-local state (NOT MenuContext — menu management has its own data)
    → Writes call real APIs → refresh local state
    → MenuContext (order-taking) remains untouched
```

**Key design decision:** Menu Management will have its **own data fetch**, independent of `MenuContext`. This ensures:
- Order-taking products (MenuContext) are never polluted by management operations
- Menu management shows ALL items (including inactive/disabled) — order-taking only shows active
- No circular dependency between management writes and order-taking reads

---

## 6. Files to Create (NEW)

| File | Purpose |
|------|---------|
| `src/api/services/menuManagementService.js` | 10 API endpoints — all HTTP calls |
| `src/api/transforms/menuManagementTransform.js` | `fromAPI` (response → UI shape) + `toAPI` (form → request payload) |

## 7. Files to Modify (EXISTING)

| File | Change | Risk |
|------|--------|------|
| `components/panels/menu/ProductList.jsx` | Replace MenuContext reads with local state from service; wire add/edit/delete/status calls | MEDIUM — core list component |
| `components/panels/menu/ProductCard.jsx` | Wire quick-edit save + delete + status toggle to service | LOW — props-driven |
| `components/panels/menu/ProductForm.jsx` | Wire save (add/edit) to service; add image upload | MEDIUM — form payload construction |
| `components/panels/menu/CategoryList.jsx` | Replace MenuContext.categories with categories extracted from foods-list | LOW — read-only swap |
| `components/panels/MenuManagementPanel.jsx` | Add state management for foods-list data + menu type selector + bulk ops buttons | LOW — container only |

## 8. Files NOT to Touch

| File | Reason |
|------|--------|
| `api/constants.js` (PRODUCTS, CATEGORIES endpoints) | Order-taking endpoints — must not change |
| `api/transforms/productTransform.js` | Used by order-taking flow — must not change |
| `api/transforms/categoryTransform.js` | Used by order-taking flow — must not change |
| `contexts/MenuContext.jsx` | Order-taking state — must not change (except the BUG-116 prepend already done) |
| `pages/LoadingPage.jsx` | Loads order-taking data — must not change |
| `components/order-entry/OrderEntry.jsx` | Order-taking — must not change |
| `api/socket/socketHandlers.js` | Socket food_update — must not change |

---

## 9. Regression Risk Assessment

| Area | Risk | Mitigation |
|------|------|------------|
| Order-taking menu display | **ZERO** — we don't touch MenuContext, productTransform, or LoadingPage | Verify after implementation |
| Socket food_update handler | **ZERO** — untouched | — |
| Dashboard order cards | **ZERO** — no shared state | — |
| Menu Management UI | **HIGH (expected)** — we're rewiring everything | Test all 10 APIs + all UI interactions |
| Category CRUD in menu panel | **N/A** — no category API provided | Keep mocked; note in plan |

---

## 10. Transform Mapping — New API → Existing UI Shape

```
NEW foods-list item          →  Existing UI ProductCard/Form prop shape
─────────────────────────────────────────────────────────────────────
id                           →  productId
name                         →  productName
category.id                  →  categoryId
category.name                →  (bonus: categoryName available inline)
price                        →  basePrice
item_type                    →  isVeg (1=veg, 0=non-veg)
status                       →  isActive (1=true, 0=false)
image                        →  productImage
description                  →  description
discount_type                →  discountType
discount                     →  discount
available_time_starts/ends   →  availableTimeStart/End
prepration_time_min          →  prepTimeMin
serve_time_in_min            →  serveTimeMin
live_web                     →  (online visibility)
pack_charges                 →  packCharges
takeaway_charge              →  takeawayCharge
delivery_charge              →  deliveryCharge
tax                          →  tax.percentage
tax_type                     →  tax.type
give_discount                →  (allow discount flag)
variation                    →  variations (note: singular→plural)
addons                       →  addOns (note: no underscore→underscore)
food_for                     →  foodFor
allergens                    →  allergen (note: array→kept as array)
kcal                         →  kcal
item_code                    →  itemCode
dinein                       →  availability.dineIn
delivery                     →  availability.delivery
takeaway                     →  availability.takeaway
food_order                   →  sortOrder
complementary                →  isComplementary
complementary_price          →  complementaryPrice

MISSING in new API (vs old):
  egg, jain                  →  Not available — set false by default
  stock_out                  →  Not available — derive from status or default false
  is_disable                 →  Not available — derive from status or default false
  station_name               →  Not available — keep null
  tax_calc                   →  Not available — default "Exclusive"
  slug                       →  Not needed for menu management
  category_ids               →  Not available — use category.id only
```

---

## 11. Open Items for Owner Decision

| # | Question | Impact |
|---|----------|--------|
| D-1 | Category CRUD APIs not in the 10 endpoints — keep mocked or defer entirely? | CategoryList add/edit/delete stays toast-only |
| D-2 | Drag-and-drop reorder API not provided — keep local-only or defer? | Reorder stays client-side only |
| D-3 | Bulk ops (import/export/template) — build UI now or defer to Phase 2? | Adds 3 buttons + file picker to panel header |
| D-4 | Menu type selector (Normal/Party/Premium from menu-master) — add to panel header? | Adds dropdown, passes `food_for` to foods-list |
| D-5 | Image upload — the API supports it but current form has no image field. Add? | Adds file input to ProductForm |

---

## 12. Recommended Phased Approach

**Phase 1 (Core — must ship):**
- Service + Transform (all 10 APIs)
- Wire foods-list (read) to ProductList + CategoryList
- Wire add-food / edit-food to ProductForm
- Wire delete to ProductCard (with delete-reasons dropdown)
- Wire status-toggle to ProductCard

**Phase 2 (Enhancements — can follow):**
- Menu type selector (menu-master → food_for dropdown)
- Bulk import/export/template buttons
- Image upload in ProductForm
- Category CRUD (when APIs become available)

---

---

## 13. Verified Missing Keys (Scanned 2 restaurants: Lafetta rid=78, Kunafa Mahal)

All 98 items on Kunafa Mahal + 231 items on Lafetta scanned. Results identical.

| Key | Old Product API | New Foods-list API | Needed for UI? |
|-----|----------------|-------------------|----------------|
| `egg` | `0` (int) | ❌ MISSING | Yes — Food Type Egg option |
| `jain` | `0` (int) | ❌ MISSING | Yes — Food Type Jain option |
| `veg` | `0` (int) | ❌ MISSING (replaced by `item_type`) | Renamed — mapped |
| `stock_out` | `'N'` (str) | ❌ MISSING | Yes — Out of Stock badge + toggle |
| `is_disable` | `'N'` (str) | ❌ MISSING | Yes — Hidden from POS badge + toggle |
| `station_name` | `'KDS'` (str) | ❌ MISSING | Yes — Station badge + dropdown |
| `tax_calc` | `'Exclusive'` (str) | ❌ MISSING | Yes — Tax Inclusive toggle |
| `is_inventory` | `'No'` (str) | ❌ MISSING | Yes — **NEW: Inventory checkbox** |
| `packed_food` | `'No'` (str) | ❌ MISSING | Yes — **NEW: Packaging Item checkbox** |
| `slug` | `'test455'` (str) | ❌ MISSING | No — not needed for menu mgmt |
| `food_status` | `0` (int) | ❌ MISSING | No — not needed for menu mgmt |

**Owner decision (2026-06-08):** Backend team will add all missing keys to foods-list response.

---

## 14. UI Changes Required (Owner-Approved 2026-06-08)

### 14.1 Quick Edit Form (`ProductCard.jsx` — QuickEditForm)

**Current fields (7):** Name, Category, Price, Food Type, Complementary, Tax Type, Tax %

**Add (2 new fields):**

| Field | Type | Maps to API | Placement |
|-------|------|-------------|-----------|
| Inventory | Checkbox (Yes/No) | `is_inventory` | New row below Tax Type/Tax % |
| Packaging Item | Checkbox (Yes/No) | `packed_food` | Same row as Inventory |

### 14.2 Full Edit Form (`ProductForm.jsx`)

**Existing fields stay. Add (7 new fields):**

| Field | Type | Maps to API | Section |
|-------|------|-------------|---------|
| Image upload | File picker + preview | `image` form field | Top (below Name) |
| Inventory | Toggle (Yes/No) | `is_inventory` | Status section |
| Packaging Item | Toggle (Yes/No) | `packed_food` | Status section |
| Allergens | Text input or chips | `allergens[]` | Below Food Type |
| Kcal | Number input | `kcal` | Below Allergens |
| Give Discount | Toggle (Yes/No) | `give_discount` | Discount section |
| Live Web (Online visibility) | Toggle (Yes/No) | `live_web` | Availability section |

### 14.3 Product Card Display (`ProductCard.jsx`)

| Element | Change | Condition |
|---------|--------|-----------|
| Inventory badge | Show "Inventory" chip | `is_inventory = "Yes"` |
| Packaging badge | Show "Packaged" chip | `packed_food = "Yes"` |
| Status toggle button | Active/Inactive toggle icon on hover | Calls API #6 |

### 14.4 Menu Management Panel Header (`MenuManagementPanel.jsx`)

| Element | Purpose |
|---------|---------|
| Menu Type dropdown | Normal / Party / Premium (from menu-master API #7). Passes `food_for` to foods-list |

### 14.5 No Changes Needed

| Component | Reason |
|-----------|--------|
| `CategoryList.jsx` | Reads categories from foods-list. CRUD wiring when APIs provided |
| `ProductList.jsx` | Structure stays. Data source changes from MenuContext to local service |
| Sidebar / DashboardPage | Already wired |

---

## 15. Pending from Owner / Backend Team

| Item | Status | Blocks |
|------|--------|--------|
| Backend: Add 9 missing keys to `foods-list` response | REQUESTED | Full edit form fields |
| Owner: Category CRUD API curls | PENDING | CategoryList write operations |
| Owner: Add-on CRUD API curls | PENDING | Add-on management in ProductForm |
| Owner: Drag & drop reorder API (or backend build) | PENDING | DnD persistence |
| Suggested reorder API shape: `POST /product/reorder` with `{ type, items: [{id, position}] }` | SUGGESTED | — |

---

## 16. Phasing (Owner-Approved 2026-06-08)

### Phase 1 (Ship with available APIs)
- Service + Transform (food CRUD: APIs #1-7)
- Wire foods-list → ProductList + CategoryList (read)
- Wire add/edit food → ProductForm
- Wire delete → ProductCard (with delete-reasons dropdown)
- Wire status toggle → ProductCard
- Menu type selector (menu-master dropdown)
- Image upload in ProductForm
- UI additions: Inventory checkbox, Packaging checkbox, Allergens, Kcal, Give Discount, Live Web
- Quick Edit: +2 checkboxes (Inventory, Packaging)

### Phase 2 (When APIs arrive / deferred)
- Bulk import/export/template (APIs #8-10)
- Category CRUD (APIs TBD)
- Add-on CRUD (APIs TBD)
- Drag & drop reorder persistence (API TBD)

---

*End of Impact Analysis — Gate 2 Complete. Ready for Gate 3 (Implementation Plan) on owner GO.*
