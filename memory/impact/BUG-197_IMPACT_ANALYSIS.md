# Impact Analysis — BUG-197 (CR-072 Post-Delivery FE Fixes)

**ID:** BUG-197 (batch: 5 FE-fixable issues from CR-072 post-delivery investigation)
**Date:** 2026-07-16
**Gate:** 2 — Impact Analysis
**Risk:** HIGH (API contract changes, recipe CRUD, purchase CRUD — core inventory flow)
**Code Reality:** PARTIAL — service/transform layer exists but has contract mismatches and missing UI
**Conflict Pre-Check:** CLEAN — no other open items touch these files. BUG-159/160 touch `constants.js` (expense block) — parallel-safe.

---

## Scope — 5 Issues (Issue #3 wastage CRUD is BACKEND-BLOCKED, excluded)

| # | Issue | Classification | Severity | Files |
|---|---|---|---|---|
| 1 | Add Ingredient — no UI button | CODE_GAP | P1 | `InventorySetupPanel.jsx` |
| 2 | Add Vendor — no-op save | CODE_ERROR + CODE_GAP | P1 | `constants.js`, `inventoryService.js`, `inventoryTransform.js`, `InventorySetupPanel.jsx` |
| 4 | Recipe Create — wrong field types | CONTRACT_MISMATCH | P1 | `recipeTransform.js` |
| 5 | Recipe Update — wrong method + fields | CONTRACT_MISMATCH | P1 | `recipeService.js`, `recipeTransform.js` |
| 6 | Purchase — lowercase Amount | CONTRACT_MISMATCH | P1 | `inventoryTransform.js` |

---

## Issue 1: Add Ingredient — No UI

### Data Flow Trace
```
UI: IngredientsTab (InventorySetupPanel.jsx:12-183)
  → NO "Add Ingredient" button exists
  → addIngredient() (inventoryService.js:12-14) ← NEVER CALLED
  → toAPI.addIngredient() (inventoryTransform.js:104-112) ← NEVER CALLED
  → POST /inventory/add-inventory ← WORKS (investigation curl-verified)
BREAK POINT: No UI trigger to call the existing service function.
```

### What Exists
- `inventoryService.addIngredient(data)` — L12-14 — calls `toAPI.addIngredient()` then `api.post(ADD_INVENTORY)`
- `toAPI.addIngredient(data)` — L104-112 — maps `categoryId → category_id`, `name → stock_title`, `unit → unit`
- API: `POST /inventory/add-inventory` — verified working. Required fields: `category_id` (int), `stock_title` (string), `unit` (string)
- Units list: `getUnits()` already fetched in IngredientsTab (L27) — available for ingredient form dropdown

### What's Missing
- No "Add Ingredient" button in the toolbar (L123-128)
- No inline form or dialog to collect: category, name, unit
- Need: add button → inline form → call `addIngredient()` → refresh

### Downstream Consumers
- Stock tab reads ingredients via `getStockInventory()` — additive, no impact
- Recipe forms use ingredient dropdowns — new ingredients will appear after refresh
- No financial logic touched.

---

## Issue 2: Add Vendor — No-op Save

### Data Flow Trace
```
UI: VendorsTab (InventorySetupPanel.jsx:187-258)
  → "Add Vendor" button (L224) → opens VendorFormDialog
  → VendorFormDialog.handleSave() (L27-30) → calls onSave(form)
  → VendorsTab.handleSave() (L209-213)
  → toast.success() ← FAKE — no API call!
  → fetchData() ← refetches vendor types (no new vendor persisted)
BREAK POINT: handleSave never calls any service function.
```

### What Exists
- VendorFormDialog collects: `name`, `contactPerson`, `phone`, `email`, `address`, `typeId`, `gst`
- `getVendorTypes()` fetches vendor types (read-only)
- No `addVendor` service function
- No `ADD_VENDOR` endpoint constant
- No `toAPI.addVendor` transform

### What's Missing (4 additions across 4 files)
1. `constants.js` — add `ADD_VENDOR: '/api/v2/vendoremployee/inventory/add-vendor'`
2. `inventoryService.js` — add `addVendor(data)` function
3. `inventoryTransform.js` — add `toAPI.addVendor(data)` mapping form fields to API contract
4. `InventorySetupPanel.jsx` L209 — wire `handleSave` to call `inventoryService.addVendor()`

### API Contract (curl-verified from investigation)
```
POST /inventory/add-vendor
Body: { "vendor_name": "Test", "email": "test@test.com", "address": "Test St" }
Response: { "data": { "id": 271, "vendor_name": "Test Vendor Probe", ... } }
```

### Downstream Consumers
- Vendor dropdown in purchase entry form — new vendors will appear after refresh
- No financial logic touched.

---

## Issue 4: Recipe Create — Wrong Field Types

### Data Flow Trace
```
UI: Recipe form → storeRecipe(data) (recipeService.js:12-14)
  → toAPI.storeRecipe(data) (recipeTransform.js:102-116)
  → Sends: { food_id: data.foodId, name: data.name, ..., serve_people: ... }
  → POST /recipe/store-recipe
BREAK POINT: Backend expects name=foodId(int) + serves_people(with 's')
  → Backend returns: "The selected name is invalid" / "serves_people field is required"
```

### Current Code (recipeTransform.js L102-116)
```js
storeRecipe(data) {
    return {
      food_id: data.foodId,    // Redundant — backend uses `name` field
      name: data.name,          // ← WRONG: sends string, backend expects integer (food_id)
      ...
      serve_people: data.servePeople || 1,  // ← WRONG: missing 's' → serves_people
      ingredients: (data.ingredients || []).map(ing => ({
        ingredient_id: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    };
```

### Backend Expects (curl-verified)
```json
{
  "name": 62118,           // food_id as INTEGER (not recipe name string)
  "serves_people": 1,     // with 's'
  "ingredients": [{"ingredient_id": 8874, "quantity": 10, "unit": "ml"}]
}
```

### Fix
- `name: data.foodId` (send food_id integer as `name`)
- Remove separate `food_id` field (backend ignores it)
- `serves_people` (add the 's')
- Store ingredient fields (`ingredient_id`, `quantity`, `unit`) are CORRECT for store — no change needed

### Downstream Consumers
- Recipe list refresh after store — additive
- No financial logic.

---

## Issue 5: Recipe Update — Wrong HTTP Method + Wrong Fields

### Data Flow Trace
```
UI: Recipe edit form → updateRecipe(id, data) (recipeService.js:17-19)
  → toAPI.storeRecipe(data) ← REUSES store transform (wrong for update)
  → api.post(`/recipe/update-recipe/${id}`) ← WRONG METHOD (should be PUT)
BREAK POINTS:
  1. POST method → backend returns 405 MethodNotAllowed
  2. ingredient_id/quantity → backend update expects id/qty
```

### Current Code (recipeService.js L17-19)
```js
export async function updateRecipe(id, data) {
  const payload = toAPI.storeRecipe(data);  // ← reuses store transform
  return api.post(`.../${id}`, payload);     // ← POST, should be PUT
}
```

### Backend Expects (curl-verified)
```
PUT /recipe/update-recipe/{id}
Body: {
  "name": 62118,              // food_id integer (same as store)
  "serves_people": 1,         // with 's' (same as store)
  "ingredients": [{
    "id": 3107,               // ← DIFFERENT from store (store uses ingredient_id)
    "qty": 0.3,               // ← DIFFERENT from store (store uses quantity)
    "unit": "kg"
  }]
}
```

### Critical: Store vs Update have DIFFERENT ingredient contracts

| Field | Store (POST) | Update (PUT) |
|---|---|---|
| HTTP method | POST | **PUT** |
| Ingredient ID field | `ingredient_id` | **`id`** |
| Quantity field | `quantity` | **`qty`** |

### Fix (2 files)
1. `recipeService.js` L19: `api.post(` → `api.put(`
2. `recipeTransform.js`: Add separate `toAPI.updateRecipe()` that maps `id`/`qty` instead of `ingredient_id`/`quantity`
3. `recipeService.js` L18: `toAPI.storeRecipe(data)` → `toAPI.updateRecipe(data)`

### Downstream Consumers
- Recipe list refresh after update — no new data shape
- No financial logic.

---

## Issue 6: Purchase Entry — Lowercase `amount`

### Data Flow Trace
```
UI: Purchase entry form → addPurchase(data) (inventoryService.js:63-65)
  → toAPI.addPurchase(data) (inventoryTransform.js:116-132)
  → Sends: { purchase_items: [{ ..., amount: 500 }] }  ← lowercase
  → POST /inventory/add-purchase
BREAK POINT: Backend expects capital 'A' → Amount
  → Backend returns: "Undefined array key \"Amount\""
```

### Current Code (inventoryTransform.js L124-131)
```js
purchase_items: (data.items || []).map(item => ({
    Ingredient: item.ingredientId,  // Capital I — correct
    Unit: item.unit,                // Capital U — correct
    quantity: item.quantity,
    rate: item.rate,
    amount: item.amount,            // ← WRONG: lowercase 'a'
    converion_factor: item.conversionFactor || 1,
})),
```

### Fix
- Line ~129: `amount:` → `Amount:` (capital A)

### Downstream Consumers
- Purchase history — additive, no read-side impact
- Stock levels updated by backend after purchase — correct behavior once save works
- No financial logic beyond purchase recording.

---

## Risk Assessment

| # | Risk | Reason |
|---|---|---|
| 1 | LOW | Additive UI — existing service layer untouched |
| 2 | MEDIUM | New endpoint + service + transform + wiring — but no financial logic |
| 4 | HIGH | Recipe create field contract — wrong data sent to backend |
| 5 | HIGH | HTTP method change + field contract — recipe update completely broken |
| 6 | MEDIUM | Single character change — but blocks all purchase entry |

**Overall: HIGH** — Issues #4 and #5 are API contract fixes that, if wrong, will corrupt recipe data.

---

## Owner Decisions Needed

None. All 5 fixes are deterministic — backend contracts are curl-verified. No ambiguity.

---

## Files WILL Change

| File | Issues | Type |
|---|---|---|
| `components/inventory/InventorySetupPanel.jsx` | #1, #2 | MODIFY — add ingredient form, wire vendor save |
| `api/constants.js` | #2 | MODIFY — add ADD_VENDOR endpoint |
| `api/services/inventoryService.js` | #2 | MODIFY — add addVendor() function |
| `api/transforms/inventoryTransform.js` | #2, #6 | MODIFY — add toAPI.addVendor(), fix amount→Amount |
| `api/services/recipeService.js` | #5 | MODIFY — POST→PUT, use updateRecipe transform |
| `api/transforms/recipeTransform.js` | #4, #5 | MODIFY — fix storeRecipe fields, add updateRecipe transform |

## Files WILL NOT Touch

- `VendorFormDialog.jsx` — dialog UI is already correct, just needs backend wiring in parent
- `RecipeManagementPanel.jsx` — calls service functions, no transform-level changes
- Any report, order, settlement, or financial file
- Any socket, context, or provider file
