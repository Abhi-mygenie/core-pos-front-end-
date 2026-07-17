# Impact Analysis — BUG-197 (CR-072 Post-Delivery — Complete Inventory Module Fix)

**ID:** BUG-197
**Date:** 2026-07-16 (v3 — full module audit, 10 gaps)
**Gate:** 2 — Impact Analysis
**Risk:** HIGH
**Code Reality:** PARTIAL
**Conflict Pre-Check:** CLEAN

---

## Scope — 10 Gaps across 8 files

### Group A — API Contract Fixes (transforms + services)

| # | Gap | Classification | Sev | Root Cause |
|---|---|---|---|---|
| 4 | Recipe Store: `name` should be foodId int, `serves_people` → `serves_people` | CONTRACT_MISMATCH | P1 | `recipeTransform.js` sends wrong types |
| 5 | Recipe Update: POST → PUT, ingredient fields `ingredient_id/quantity` → `id/qty` | CONTRACT_MISMATCH | P1 | `recipeService.js` wrong method, `recipeTransform.js` reuses store transform |
| 6 | Purchase: `amount` → `Amount` | CONTRACT_MISMATCH | P1 | `inventoryTransform.js` lowercase key |
| 9 | Sub/Addon Recipe Update: also use POST, likely need PUT + possibly different ingredient fields | CONTRACT_MISMATCH (verify) | P1 | Same pattern as #5 — `recipeService.js` L47-49, L67-69 |

### Group B — Missing fromAPI Mapping

| # | Gap | Classification | Sev | Root Cause |
|---|---|---|---|---|
| 7 | `fromAPI.recipes()` doesn't map `foodId` — recipe edit form can't load food association | CODE_GAP | P1 | `recipeTransform.js` L4-28 missing field |

### Group C — UI Logic Gaps (RecipeFormPanel)

| # | Gap | Classification | Sev | Root Cause |
|---|---|---|---|---|
| 8 | No `foodId` validation for standard recipes — save sends `name: null` | CODE_GAP | P1 | `RecipeFormPanel.jsx` L70 only checks `name.trim()` |
| 10 | Addon recipe: dropdown sets `foodId` but transform uses `addonId` — addon never linked | CODE_ERROR | P1 | `RecipeFormPanel.jsx` L122 + `recipeTransform.js` L137 |

### Group D — Missing CRUD Plumbing + UI

| # | Gap | Classification | Sev | Root Cause |
|---|---|---|---|---|
| 1 | Add Ingredient — no UI button (service exists, never called) | CODE_GAP | P1 | `InventorySetupPanel.jsx` missing UI |
| 2 | Add Vendor — `handleSave` shows fake toast, no API call | CODE_ERROR + CODE_GAP | P1 | 4 files: constant, service, transform, wiring all missing |
| 3 | Wastage CRUD — read-only (endpoints now available) | CODE_GAP | P2 | `InventorySetupPanel.jsx` + service/transform/constants missing |

---

## Detailed Trace per Gap

### Gap 4 — Recipe Store Wrong Fields

**File:** `recipeTransform.js` L100-117
**Current sends:** `{ food_id: data.foodId, name: data.name, serve_people: ... }`
**Backend expects:** `{ name: <food_id integer>, serves_people: ... }`
**Fix:** `name: data.foodId` (int), remove `food_id`, `serves_people` (add 's')

### Gap 5 — Recipe Update Wrong Method + Fields

**File:** `recipeService.js` L17-19
**Current:** `api.post()` + reuses `toAPI.storeRecipe()`
**Backend:** `PUT`, ingredients use `id`/`qty` not `ingredient_id`/`quantity`
**Fix:** `api.put()` + new `toAPI.updateRecipe()` with `id`/`qty` mapping

### Gap 6 — Purchase Lowercase Amount

**File:** `inventoryTransform.js` L129
**Current:** `amount: item.amount`
**Fix:** `Amount: item.amount`

### Gap 7 — fromAPI.recipes() Missing foodId

**File:** `recipeTransform.js` L4-28
**Current mapping:** `name`, `foodName`, `categoryName`, `ingredients`, etc. — NO `foodId`
**Impact:** RecipeFormPanel L25 initializes `foodId = recipe?.foodId || ''` → always `''` in edit mode → food dropdown empty → save sends `name: null` → backend rejects
**Fix:** Add `foodId: r.food_id || null` to `fromAPI.recipes()` mapping
**CURL VERIFY AT IMPL:** `GET /recipe/get-recipe` — confirm response field name for raw food_id

### Gap 8 — No foodId Validation in RecipeFormPanel

**File:** `RecipeFormPanel.jsx` L70
**Current:** Only checks `name.trim()` and ingredient count
**Impact:** User can save standard recipe without selecting menu item → `name: null`
**Fix:** Add `if (recipeType !== 'sub' && !foodId) { toast.error('...'); return; }`
For addon recipes: validate `addonId` instead (after Gap 10 fix)

### Gap 9 — Sub/Addon Recipe Update Also Use POST

**File:** `recipeService.js` L47-49 (sub) + L67-69 (addon)
**Current:** Both use `api.post()` + reuse their respective store transforms
**Likely need:** `api.put()` — same backend pattern as standard recipe
**Note:** Addon endpoints are under `/product/` not `/recipe/` — different controller
**CURL VERIFY AT IMPL:** Both update endpoints. If PUT required, also check ingredient field names (id/qty vs ingredient_id/quantity)

### Gap 10 — Addon Recipe Dropdown → Wrong State Variable

**File:** `RecipeFormPanel.jsx` L122
**Current:** Dropdown always sets `foodId` regardless of recipe type
**Impact for addon:**
```
User picks addon item from dropdown → sets foodId
data = { foodId: 123, addonId: null }
toAPI.storeAddonRecipe sends: { addon_id: null }  ← LOST!
```
**Fix:** When `recipeType === 'addon'`, dropdown should set `addonId` instead of `foodId`

### Gaps 1, 2, 3 — Setup Panel (unchanged from previous plan)

See previous analysis. No new findings.

---

## Files WILL Change (8 files)

| # | File | Gaps | Change Type |
|---|---|---|---|
| 1 | `api/transforms/recipeTransform.js` | 4, 5, 7 | Fix storeRecipe, add updateRecipe, add foodId to fromAPI |
| 2 | `api/services/recipeService.js` | 5, 9 | POST→PUT for standard + sub + addon update |
| 3 | `api/transforms/inventoryTransform.js` | 2, 3, 6 | Amount fix, add vendor transform, add wastage transforms |
| 4 | `api/constants.js` | 2, 3 | ADD_VENDOR + 5 wastage endpoints |
| 5 | `api/services/inventoryService.js` | 2, 3 | addVendor + 5 wastage functions |
| 6 | `components/inventory/InventorySetupPanel.jsx` | 1, 2, 3 | Add ingredient UI, wire vendor save, wastage CRUD UI |
| 7 | `components/inventory/RecipeFormPanel.jsx` | 8, 10 | foodId validation, addon dropdown fix |
| 8 | `components/inventory/VendorFormDialog.jsx` | — | No changes needed |

## Files WILL NOT Touch

- `RecipeManagementPanel.jsx` — calls service functions, no changes needed
- `PurchaseEntryPanel.jsx` — vendor free-text is P3, deferred
- `PhysicalCountPanel.jsx` — reads wastage reasons, will benefit from CRUD without code changes
- `InventoryDashboardPanel.jsx` — read-only dashboard, no changes
- Any order/settlement/report/financial/socket/context file
