# CR-072 — Implementation Plan (Gate 3)

**ID:** CR-072
**Title:** Inventory Management — Phase 1 (CRUD Operations)
**Date:** 2026-07-15
**Code Reality:** NONE
**Conflict Pre-Check:** CLEAN — no other open items touch planned files
**Risk:** HIGH (37 endpoints, 5 modules, unit conversion logic)

---

## 1. Scope Lock

### Files WILL change (3 existing + 16 new = 19 total)

**Existing files MODIFIED:**
| # | File | Change | Lines |
|---|------|--------|-------|
| M1 | `api/constants.js` | +INVENTORY_ENDPOINTS + RECIPE_ENDPOINTS blocks (~60 lines additive) | +60 |
| M2 | `components/layout/Sidebar.jsx` | +Inventory section with 5 sub-items | +20 |
| M3 | `App.js` | +5 route imports + 5 Route elements | +15 |

**New files CREATED:**
| # | File | Purpose | Est. Lines |
|---|------|---------|-----------|
| N1 | `api/services/inventoryService.js` | 22 inventory API functions (ingredients, stock, categories, vendors, wastage, purchase, physical) | ~200 |
| N2 | `api/services/recipeService.js` | 15 recipe API functions (standard, sub, addon) | ~130 |
| N3 | `api/transforms/inventoryTransform.js` | fromAPI + toAPI normalizers for inventory data | ~250 |
| N4 | `api/transforms/recipeTransform.js` | fromAPI + toAPI normalizers for recipe data | ~150 |
| N5 | `pages/InventoryDashboardPage.jsx` | Page wrapper: Sidebar + InventoryDashboardPanel | ~20 |
| N6 | `pages/InventorySetupPage.jsx` | Page wrapper: Sidebar + InventorySetupPanel | ~20 |
| N7 | `pages/PurchaseEntryPage.jsx` | Page wrapper: Sidebar + PurchaseEntryPanel | ~20 |
| N8 | `pages/PhysicalCountPage.jsx` | Page wrapper: Sidebar + PhysicalCountPanel | ~20 |
| N9 | `pages/RecipeManagementPage.jsx` | Page wrapper: Sidebar + RecipeManagementPanel | ~20 |
| N10 | `components/inventory/InventoryDashboardPanel.jsx` | Stock Dashboard: KPIs, stock table, search/filter, status badges, Phase 2 placeholder | ~350 |
| N11 | `components/inventory/InventorySetupPanel.jsx` | 3 tabs: Ingredients (category sidebar + table + inline form) / Vendors / Wastage Reasons | ~500 |
| N12 | `components/inventory/PurchaseEntryPanel.jsx` | Purchase form: header fields + line items table + totals + invoice | ~300 |
| N13 | `components/inventory/PhysicalCountPanel.jsx` | System vs physical qty table + drift indicators + wastage reason | ~250 |
| N14 | `components/inventory/RecipeManagementPanel.jsx` | 3 sub-tabs (Standard/Sub/Addon) + recipe cards + add/edit inline form | ~450 |
| N15 | `components/inventory/RecipeFormPanel.jsx` | Recipe add/edit form: food item picker, times, serves, ingredient list with dynamic rows | ~250 |
| N16 | `components/inventory/VendorFormDialog.jsx` | Add/Edit vendor dialog: name, contact, phone, address, email, type, GST | ~120 |

**Total:** ~2,935 lines across 19 files.

### Files WILL NOT touch
- `orderTransform.js` — no order flow changes
- `CollectPaymentPanel.jsx` — no payment changes
- `DashboardPage.jsx` — no dashboard changes
- `OrderEntry.jsx` — no order entry changes
- Any report files
- `expenseService.js` / `expenseTransform.js` — reuse `GET_UNIT` and `PAYMENT_METHOD` from EXPENSE_ENDPOINTS via import, not duplication

---

## 2. Route Plan (5 routes)

| Route | Page | Panel | Mockup Screen |
|-------|------|-------|---------------|
| `/inventory` | InventoryDashboardPage | InventoryDashboardPanel | 1. Dashboard |
| `/inventory-purchase` | PurchaseEntryPage | PurchaseEntryPanel | 2. Purchase Entry |
| `/inventory-physical` | PhysicalCountPage | PhysicalCountPanel | 3. Physical Count |
| `/inventory-setup` | InventorySetupPage | InventorySetupPanel (3 tabs) | 4. Ingredients + 6. Vendors + 7. Wastage |
| `/recipes` | RecipeManagementPage | RecipeManagementPanel | 5. Recipes |

**Sidebar mapping (7 mockup screens → 5 routes):**
- Operations: Dashboard → `/inventory`, Purchase → `/inventory-purchase`, Physical Count → `/inventory-physical`
- Setup: Ingredients/Vendors/Wastage → `/inventory-setup` (tab switching), Recipes → `/recipes`

---

## 3. Constants (M1 — `api/constants.js`)

```javascript
// CR-072: Inventory Management
export const INVENTORY_ENDPOINTS = {
  // Ingredients Master
  GET_INVENTORY_MASTER: '/api/v2/vendoremployee/inventory/get-inventory-master',
  ADD_INVENTORY: '/api/v2/vendoremployee/inventory/add-inventory',
  DELETE_INGREDIENT: '/api/v2/vendoremployee/inventory/ingredient', // DELETE /{id}
  EXPORT_INVENTORY: '/api/v2/vendoremployee/inventory/export-inventory-master',
  IMPORT_INVENTORY: '/api/v2/vendoremployee/inventory/import-inventory',
  // Categories
  STOCK_CATEGORIES: '/api/v2/vendoremployee/inventory/stock-item-categories',
  STORE_CATEGORY: '/api/v2/vendoremployee/inventory/stock-item-categories/store',
  // Stock
  STOCK_INVENTORY: '/api/v2/vendoremployee/inventory/stock-inventory',
  UNIT_INVENTORY: '/api/v2/vendoremployee/inventory/unit-inventory', // GET /{id}
  UPDATE_STOCK: '/api/v2/vendoremployee/inventory/update-stock',     // POST /{id}
  ADD_STOCK: '/api/v2/vendoremployee/inventory/add-stock',           // POST /{id}
  ADD_PURCHASE: '/api/v2/vendoremployee/inventory/add-purchase',
  EXPORT_STOCK: '/api/v2/vendoremployee/inventory/export-stock',
  IMPORT_STOCK: '/api/v2/vendoremployee/inventory/upload-stock-excel',
  // Vendors
  VENDOR_TYPE: '/api/v2/vendoremployee/inventory/vendor-type',
  // Wastage
  WASTAGE_REASONS: '/api/v2/vendoremployee/inventory/wastage-reasons',
};

export const RECIPE_ENDPOINTS = {
  // Standard Recipes
  GET_RECIPES: '/api/v2/vendoremployee/recipe/get-recipe',
  STORE_RECIPE: '/api/v2/vendoremployee/recipe/store-recipe',
  UPDATE_RECIPE: '/api/v2/vendoremployee/recipe/update-recipe',     // POST /{id}
  DELETE_RECIPE: '/api/v2/vendoremployee/recipe/delete-recipe',     // DELETE /{id}
  EXPORT_SAMPLE_RECIPE: '/api/v2/vendoremployee/recipe/export-sample-recipe',
  EXPORT_RECIPE: '/api/v2/vendoremployee/recipe/export-recipe',
  IMPORT_RECIPE: '/api/v2/vendoremployee/recipe/import-recipe',
  // Sub-Recipes
  GET_SUB_RECIPES: '/api/v2/vendoremployee/recipe/sub-recipes',
  STORE_SUB_RECIPE: '/api/v2/vendoremployee/recipe/store-sub-recipe',
  UPDATE_SUB_RECIPE: '/api/v2/vendoremployee/recipe/update-sub-recipe', // POST /{id}
  DELETE_SUB_RECIPE: '/api/v2/vendoremployee/recipe/delete-sub-recipe', // DELETE /{id}
  EXPORT_SAMPLE_SUB: '/api/v2/vendoremployee/recipe/export-sample-sub-recipe',
  EXPORT_SUB: '/api/v2/vendoremployee/recipe/export-sub-recipes',
  IMPORT_SUB: '/api/v2/vendoremployee/recipe/import-sub-recipes',
  // Addon Recipes
  GET_ADDON_RECIPES: '/api/v2/vendoremployee/product/addon-recipe-list',
  STORE_ADDON_RECIPE: '/api/v2/vendoremployee/product/store-addon-recipe',
  UPDATE_ADDON_RECIPE: '/api/v2/vendoremployee/product/update-addon-recipe', // POST /{id}
  DELETE_ADDON_RECIPE: '/api/v2/vendoremployee/product/delete-addon-recipe', // DELETE /{id}
  // Supporting
  ACTIVE_FOODS_LIST: '/api/v2/vendoremployee/product/active-foods-list',
};
```

**Shared with Expense (import, don't duplicate):**
- `EXPENSE_ENDPOINTS.GET_UNIT` — units list
- `EXPENSE_ENDPOINTS.PAYMENT_METHOD` — payment methods

---

## 4. Execution Sequence (5 groups)

### Group 1: Foundation (constants + service + transform)
**Files:** N1, N2, N3, N4, M1
**Can parallel:** YES — all independent

1. `constants.js` — add INVENTORY_ENDPOINTS + RECIPE_ENDPOINTS
2. `inventoryService.js` — all 22 functions
3. `recipeService.js` — all 15 functions
4. `inventoryTransform.js` — fromAPI/toAPI normalizers
5. `recipeTransform.js` — fromAPI/toAPI normalizers

**Compile check after Group 1:** webpack should compile (no UI yet)

### Group 2: Dashboard + Physical Count (Operations screens)
**Files:** N5, N8, N10, N13
**Can parallel:** YES

6. `InventoryDashboardPanel.jsx` — KPIs + stock table
7. `PhysicalCountPanel.jsx` — system vs physical table
8. `InventoryDashboardPage.jsx` — page wrapper
9. `PhysicalCountPage.jsx` — page wrapper

### Group 3: Setup screens (Ingredients + Vendors + Wastage)
**Files:** N6, N11, N16

10. `InventorySetupPanel.jsx` — 3-tab panel (Ingredients/Vendors/Wastage)
11. `VendorFormDialog.jsx` — vendor add/edit dialog
12. `InventorySetupPage.jsx` — page wrapper

### Group 4: Purchase Entry
**Files:** N7, N12

13. `PurchaseEntryPanel.jsx` — purchase form
14. `PurchaseEntryPage.jsx` — page wrapper

### Group 5: Recipes
**Files:** N9, N14, N15

15. `RecipeManagementPanel.jsx` — 3-tab recipe list
16. `RecipeFormPanel.jsx` — recipe add/edit form
17. `RecipeManagementPage.jsx` — page wrapper

### Group 6: Wiring (Sidebar + App.js routes)
**Files:** M2, M3
**Must be last** — depends on all pages existing

18. `Sidebar.jsx` — add Inventory section
19. `App.js` — add 5 routes + imports

**Compile check after Group 6:** Full webpack compile + verify all routes load

---

## 5. Key Transform Rules

### `inventoryTransform.js` — Critical normalizations

```
fromAPI.ingredients(res):
  - category_id: { id, name } → extract to flat categoryId + categoryName
  - quantity: string → Number
  - cal_quantity: string → Number (in small units)
  - display_qty: string → Number
  - min_qty_alert: string → Number

fromAPI.stockItems(res):
  - category_id: integer (NOT nested object — different from ingredients)
  - is_low_stock: boolean (use directly for status badge)
  - Merge type="SubRecipe" items with visual indicator

toAPI.addIngredient(data):
  - Accepts array (batch add)
  - Fields: category_id, stock_title, unit, small_unit, minimun_stock_alert (R9 typo), min_unit_alert

toAPI.addPurchase(data):
  - purchase_date: "DD-MM-YYYY" format (R9 — not ISO)
  - converion_factor: preserve typo (R9)
  - purchase_items[].Ingredient: capitalize I (R9)
  - purchase_items[].Unit: capitalize U (R9)
```

---

## 6. Verification Matrix

| # | File | Change | How to Verify | Automated? |
|---|------|--------|---------------|:---:|
| 1 | constants.js | +INVENTORY_ENDPOINTS + RECIPE_ENDPOINTS | grep for endpoint strings | YES |
| 2 | inventoryService.js | 22 API functions | curl each endpoint + verify service calls match | NO |
| 3 | recipeService.js | 15 API functions | curl recipe endpoints | NO |
| 4 | inventoryTransform.js | fromAPI/toAPI normalizers | Unit test: pass raw API JSON → verify normalized output | YES |
| 5 | recipeTransform.js | fromAPI/toAPI normalizers | Unit test: pass raw recipe JSON → verify output | YES |
| 6 | InventoryDashboardPanel | KPIs + stock table + filters | Browser: navigate /inventory → verify KPIs load, table populated, filters work | NO |
| 7 | PhysicalCountPanel | System vs physical table | Browser: navigate /inventory-physical → verify system qty, input physical, see drift | NO |
| 8 | InventorySetupPanel | 3 tabs + ingredient CRUD | Browser: /inventory-setup → switch tabs, add category, add ingredient, edit, delete | NO |
| 9 | PurchaseEntryPanel | Multi-line purchase form | Browser: /inventory-purchase → add vendor, add line items, verify totals compute | NO |
| 10 | RecipeManagementPanel | 3 sub-tabs + recipe cards | Browser: /recipes → switch tabs, verify cards load with ingredients | NO |
| 11 | RecipeFormPanel | Add/edit recipe form | Browser: click Create Recipe → pick food, add ingredients, save | NO |
| 12 | VendorFormDialog | Vendor add/edit | Browser: /inventory-setup Vendors tab → Add Vendor → fill form → save | NO |
| 13 | Sidebar.jsx | Inventory section visible | Browser: verify sidebar shows Inventory with 5 sub-items | NO |
| 14 | App.js | 5 routes registered | Browser: navigate each route → no 404 | NO |
| 15 | Full E2E | All screens load with real data | Login as kunafamahal → navigate all 5 routes → verify data from preprod API | NO |

---

## 7. Post-Code Registry Checklist

```
- [ ] registry.json: CR-072 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated with IMPLEMENTED status + files list
- [ ] FILE_OWNERSHIP.md: all 19 files listed with CR-072 + date
- [ ] Code markers: // CR-072 comment in every modified/created file
- [ ] COMPILE CHECK: webpack compiles with 0 new warnings
```

---

## 8. Risk Register

| Risk | Level | Mitigation |
|------|-------|-----------|
| Unit conversion math (kg↔gm, ltr↔ml) | HIGH | Explicit conversion map in transform. `cal_quantity` always in small units. Display uses `display_qty` + `display_unit` from API. |
| Purchase payload field name typos (R9) | MEDIUM | Document each R9 field. Comment in code: `// R9: backend expects "converion_factor"` |
| category_id shape inconsistency (nested vs flat) | MEDIUM | Transform normalizes both to flat `{ categoryId, categoryName }` |
| Shared APIs (get-unit, payment-method) | LOW | Import from expenseService, not duplicate |
| Sub-recipe dual nature (recipe + stock item) | LOW | Visual badge in stock table: "Sub-Recipe" type indicator |
| Negative stock quantities | LOW | Display as-is with red styling. No FE clamping — backend is source of truth |

---

## 9. Dependencies

| Dependency | Status | Blocking? |
|-----------|--------|-----------|
| 37 inventory/recipe APIs on preprod | ✅ LIVE (verified with kunafamahal) | No |
| `get-unit` from expense module | ✅ Already in EXPENSE_ENDPOINTS | No |
| `payment-method` from expense module | ✅ Already in EXPENSE_ENDPOINTS | No |
| `active-foods-list` for recipe linking | ✅ LIVE on preprod | No |
| Phase 2 intelligence endpoints | ❌ Not yet built | No — Phase 1 doesn't need them |

---

## 10. Estimated Effort

| Group | Files | Est. Lines | Effort |
|-------|-------|-----------|--------|
| Foundation (constants + services + transforms) | 5 | ~790 | Medium |
| Dashboard + Physical Count | 4 | ~640 | Medium |
| Setup (Ingredients + Vendors + Wastage) | 3 | ~640 | High (most complex) |
| Purchase Entry | 2 | ~320 | Medium |
| Recipes | 3 | ~720 | High (3 types + form) |
| Wiring (Sidebar + App.js) | 2 | ~35 | Low |
| **Total** | **19** | **~2,935** | |
