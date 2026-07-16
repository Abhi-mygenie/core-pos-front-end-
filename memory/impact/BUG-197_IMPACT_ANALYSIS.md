# Impact Analysis — BUG-197 (CR-072 Post-Delivery FE Fixes)

**ID:** BUG-197 (batch: 6 issues from CR-072 post-delivery investigation)
**Date:** 2026-07-16 (revised — Issue #3 wastage CRUD now UNBLOCKED)
**Gate:** 2 — Impact Analysis
**Risk:** HIGH (API contract changes, recipe CRUD, purchase CRUD, wastage CRUD — core inventory flow)
**Code Reality:** PARTIAL — service/transform layer exists but has contract mismatches, missing UI, and missing CRUD
**Conflict Pre-Check:** CLEAN — no other open items touch these files. BUG-159/160 touch `constants.js` (expense block) — parallel-safe.

---

## Scope — 6 Issues (ALL FE-fixable, Issue #3 unblocked by owner-provided endpoints)

| # | Issue | Classification | Severity | Files |
|---|---|---|---|---|
| 1 | Add Ingredient — no UI button | CODE_GAP | P1 | `InventorySetupPanel.jsx` |
| 2 | Add Vendor — no-op save | CODE_ERROR + CODE_GAP | P1 | `constants.js`, `inventoryService.js`, `inventoryTransform.js`, `InventorySetupPanel.jsx` |
| 3 | Wastage CRUD — read-only, no add/edit/delete | CODE_GAP + PREVIOUSLY BACKEND-BLOCKED | P2 | `constants.js`, `inventoryService.js`, `inventoryTransform.js`, `InventorySetupPanel.jsx` |
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
  → POST /inventory/add-inventory ← WORKS (curl-verified)
BREAK POINT: No UI trigger to call the existing service function.
```

### What Exists
- `inventoryService.addIngredient(data)` — L12-14
- `toAPI.addIngredient(data)` — L104-112 — maps `categoryId→category_id`, `name→stock_title`, `unit→unit`
- API verified: `POST /inventory/add-inventory` — required fields: `category_id` (int), `stock_title` (string), `unit` (string)
- Units list: `getUnits()` already fetched in IngredientsTab (L27)

### What's Missing
- No "Add Ingredient" button in toolbar (L123-128)
- No inline form or dialog to collect: category, name, unit

### Downstream: Additive. No financial logic.

---

## Issue 2: Add Vendor — No-op Save

### Data Flow Trace
```
UI: VendorsTab (InventorySetupPanel.jsx:187-258)
  → "Add Vendor" button (L224) → opens VendorFormDialog
  → VendorFormDialog.handleSave() (L27-30) → calls onSave(form)
  → VendorsTab.handleSave() (L209-213)
  → toast.success() ← FAKE — no API call!
BREAK POINT: handleSave never calls any service function.
```

### What's Missing (4 additions across 4 files)
1. `constants.js` — `ADD_VENDOR: '/api/v2/vendoremployee/inventory/add-vendor'`
2. `inventoryService.js` — `addVendor(data)` function
3. `inventoryTransform.js` — `toAPI.addVendor(data)` transform
4. `InventorySetupPanel.jsx` L209 — wire `handleSave` to call API

### API Contract (curl-verified)
```
POST /inventory/add-vendor
Body: { "vendor_name": "Test", "email": "test@test.com", "address": "Test St" }
Response: { "data": { "id": 271, "vendor_name": "Test Vendor Probe", ... } }
```

### Downstream: Additive. No financial logic.

---

## Issue 3: Wastage CRUD — Read-Only (NOW UNBLOCKED)

### Data Flow Trace
```
UI: WastageTab (InventorySetupPanel.jsx:262-301)
  → Read-only table rendering reasons
  → getWastageReasons() (inventoryService.js:85-88)
  → GET /inventory/wastage-reasons ← WORKS
BREAK POINT: No Add/Edit/Delete/Status UI or service functions exist.
```

### Existing Endpoint vs New CRUD Endpoints (owner-provided)

| Operation | Existing Path | New Path (owner-provided) | HTTP Method |
|---|---|---|---|
| List | `/inventory/wastage-reasons` | `/wastage-reasons/list` | GET |
| Add | — | `/wastage-reasons/add` | POST |
| Update | — | `/wastage-reasons/update/{id}` | POST |
| Status toggle | — | `/wastage-reasons/status/{id}` | POST |
| Delete | — | `/wastage-reasons/delete/{id}` | DELETE |

**Key path difference:** Existing GET uses `/inventory/wastage-reasons`. New CRUD set uses `/wastage-reasons/...` (no `/inventory/` prefix). Both may work for listing — implementation agent should verify response format of `/wastage-reasons/list` and update the list endpoint if the response shape matches `fromAPI.wastageReasons()`.

### API Contracts (from owner curl commands)
```
POST /wastage-reasons/add       → { "reason": "rrr" }
POST /wastage-reasons/update/25 → { "reason": "rrrb" }
POST /wastage-reasons/status/25 → { "status": 0 }
DELETE /wastage-reasons/delete/25
```

### What's Missing
1. `constants.js` — 4 new endpoint constants (add, update, status, delete) + optionally update list path
2. `inventoryService.js` — 4 new functions (add, update, toggleStatus, delete)
3. `inventoryTransform.js` — fromAPI update (add `status` field), toAPI for add/update/status
4. `InventorySetupPanel.jsx` WastageTab — Add/Edit/Delete/Status buttons + inline form

### Note on `fromAPI.wastageReasons()`
Current transform (L88-93) maps only `id` and `reason`. The list endpoint may also return a `status` field (active/inactive). Transform should be updated to include `status`.

### Downstream: Stock adjustment form uses `wastage_reason_id` — unaffected by CRUD changes. No financial logic.

---

## Issue 4: Recipe Create — Wrong Field Types

### Data Flow Trace
```
UI: Recipe form → storeRecipe(data) (recipeService.js:12-14)
  → toAPI.storeRecipe(data) (recipeTransform.js:102-116)
  → Sends: { food_id: data.foodId, name: data.name, serve_people: ... }
BREAK POINT: Backend expects name=foodId(int) + serves_people(with 's')
```

### Current Code (recipeTransform.js L102-116)
```js
return {
  food_id: data.foodId,        // Redundant — backend uses 'name' field
  name: data.name,             // ← WRONG: sends string, backend expects integer (food_id)
  serve_people: ...,           // ← WRONG: missing 's'
```

### Backend Expects (curl-verified)
```json
{ "name": 62118, "serves_people": 1, "ingredients": [{"ingredient_id": 8874, "quantity": 10, "unit": "ml"}] }
```

### Fix: `name: data.foodId` (int), remove `food_id`, `serves_people` (with 's'). Store ingredient fields are correct.

---

## Issue 5: Recipe Update — Wrong HTTP Method + Wrong Fields

### Current Code (recipeService.js L17-19)
```js
const payload = toAPI.storeRecipe(data);   // reuses store transform
return api.post(`.../${id}`, payload);      // POST, should be PUT
```

### Backend Expects (curl-verified)
```
PUT /recipe/update-recipe/{id}
Body: { "name": 62118, "serves_people": 1, "ingredients": [{ "id": 3107, "qty": 0.3, "unit": "kg" }] }
```

### Critical: Store vs Update have DIFFERENT ingredient contracts

| Field | Store (POST) | Update (PUT) |
|---|---|---|
| HTTP method | POST | **PUT** |
| Ingredient ID field | `ingredient_id` | **`id`** |
| Quantity field | `quantity` | **`qty`** |

### Fix: `api.put()`, separate `toAPI.updateRecipe()` transform.

---

## Issue 6: Purchase Entry — Lowercase `amount`

### Current (inventoryTransform.js L129)
```js
amount: item.amount,    // ← lowercase
```

### Backend expects `Amount` (capital A). Fix: `Amount: item.amount`.

---

## Risk Assessment

| # | Risk | Reason |
|---|---|---|
| 1 | LOW | Additive UI — existing service layer untouched |
| 2 | MEDIUM | New endpoint + service + transform + wiring — no financial logic |
| 3 | MEDIUM | New CRUD endpoints + UI — no financial logic, additive |
| 4 | HIGH | Recipe create field contract — wrong data sent to backend |
| 5 | HIGH | HTTP method change + field contract — recipe update completely broken |
| 6 | MEDIUM | Single field rename — blocks all purchase entry |

**Overall: HIGH**

---

## Owner Decisions Needed

**OQ-1:** Should the wastage list endpoint be updated from `/inventory/wastage-reasons` to `/wastage-reasons/list`? Or keep both (old for stock adjustment dropdown, new for CRUD list)? Implementation agent should verify if response shapes match. If they differ, keep both paths.

---

## Files WILL Change (6 files)

| File | Issues | Type |
|---|---|---|
| `components/inventory/InventorySetupPanel.jsx` | #1, #2, #3 | MODIFY — add ingredient form, wire vendor save, wastage CRUD UI |
| `api/constants.js` | #2, #3 | MODIFY — add ADD_VENDOR + 4 wastage CRUD endpoints |
| `api/services/inventoryService.js` | #2, #3 | MODIFY — add addVendor + 4 wastage CRUD functions |
| `api/transforms/inventoryTransform.js` | #2, #3, #6 | MODIFY — add vendor/wastage transforms, fix Amount |
| `api/services/recipeService.js` | #5 | MODIFY — POST→PUT, use updateRecipe transform |
| `api/transforms/recipeTransform.js` | #4, #5 | MODIFY — fix storeRecipe fields, add updateRecipe transform |

## Files WILL NOT Touch

- `VendorFormDialog.jsx` — dialog UI is already correct
- `RecipeManagementPanel.jsx` — calls service functions, no changes needed
- Any report, order, settlement, or financial file
- Any socket, context, or provider file
