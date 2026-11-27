# CR-473 — Impact Analysis

**Item:** CR-473 — Recipe Mapping by Menu Master (food_for)
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** PARTIAL (transform exists, service hardcoded to aggregator)
**Risk:** MEDIUM
**Conflict Pre-Check:** CR-119 (Aggregator Mapping) is at `GATE_5A_IMPLEMENTED — QA PENDING`. Same files but CR-473 is additive — extends the same pattern, doesn't rewrite. Parallel-safe.

---

## Blocker Status — RESOLVED ✅ (2026-10-26)

All 4 recipe mapping endpoints now support `food_for` on preprod:

| Endpoint | Probe (Ruby, RID 672) |
|---|---|
| `GET /food-recipe-mapping?food_for=Normal` | ✅ 88 foods, `food_for: "Normal"`, `foods_mapped: 1` |
| `GET /food-recipe-mapping?food_for=Premium` | ✅ 1 food ("premi") |
| `GET /food-recipe-mapping?food_for=Party` | ✅ 0 foods (empty menu) |
| `GET /export-recipe-mapping?food_for=Normal` | ✅ HTTP 200, xlsx 7.8 KB |
| `POST /unlink-recipe-mapping` + `food_for` | ✅ Proper 422 on invalid item |
| Palm House `food_for=Normal` | ✅ 284 foods, 80 mapped |

---

## Data Flow Trace

### Existing (Aggregator — CR-119, unchanged)
```
AggregatorInventoryTab mounts
  → getFoodRecipeMapping(clientId) → GET /food-recipe-mapping?client={id}
  → response: { aggregator_foods[], recipes[], stats{} }
  → renders aggregator food table with recipe combobox
  → Save → batchUpdateRecipeMapping({ type:'aggregator', updates })
  → Unlink → unlinkRecipeMapping({ type:'aggregator', item_id })
  → Export → exportRecipeMapping({ type:'aggregator' })
```

### New (Per-Menu — CR-473)
```
User selects menu from dropdown (e.g., "Normal")
  → getFoodRecipeMappingByMenu(foodFor) → GET /food-recipe-mapping?food_for={menu_name}
  → response: { foods[], recipes[], stats{ foods_total, foods_mapped }, food_for }
  → renders per-menu food table with recipe combobox (same UI pattern)
  → Save → batchUpdateRecipeMappingByMenu({ food_for, updates })  (NO type field)
  → Unlink → unlinkRecipeMappingByMenu({ food_for, item_id })     (NO type field)
  → Export → exportRecipeMappingByMenu(foodFor) → GET /export?food_for={menu_name}
```

**Critical rule from spec:** When using `food_for`, never send `type`. When using `type`, don't send `food_for`. These are mutually exclusive.

---

## Affected Files

### Files WILL change (5 modified + 0 new)

| # | File | Change | Lines | Risk |
|---|---|---|---|---|
| **E1** | `src/api/constants.js` | Add `MENU_MASTER` endpoint to existing `RECIPE_MAPPING_ENDPOINTS` block | +1 | LOW |
| **E2** | `src/api/services/recipeService.js` | +1 new `getMenuMaster()` fn + add new `getFoodRecipeMappingByMenu()`, `batchUpdateByMenu()`, `unlinkByMenu()`, `exportByMenu()` functions | +~40 | LOW — additive, existing functions untouched |
| **E3** | `src/components/inventory/AggregatorInventoryTab.jsx` | Add menu dropdown at top, fetch menus on mount, switch data source between aggregator (existing) and per-menu (new food_for calls). Stats/search/table/save/unlink/export adapt to active mode. | ~80 lines modified/added | MEDIUM |
| **E4** | `src/components/inventory/RecipeManagementPanel.jsx` | Rename tab label from "Aggregator Inventory" to "Food Mapping" (or keep and add context) | ~2 lines | LOW |
| **E5** | `src/api/constants.js` | Add `PRODUCT_ENDPOINTS.MENU_MASTER` (or add to RECIPE_MAPPING_ENDPOINTS) | +1 | LOW |

**Note:** E1 and E5 can be combined — single additive line in constants.js.

### Files WILL NOT change

- `recipeTransform.js` — existing `activeFoods` already maps `foodFor`; `menuManagementTransform.menuMaster()` already exists at L174
- `inventoryService.js`, `inventoryTransform.js` — not related
- `RecipeFormPanel.jsx`, `RecipeBulkEditor.jsx` — recipe CRUD, not mapping
- Any order-entry, dashboard, PMS, financial, or report files

---

## E1: constants.js — Add MENU_MASTER endpoint

**Location:** `RECIPE_MAPPING_ENDPOINTS` block (L272-278)
**Current L278:**
```js
  EXPORT_RECIPE_MAPPING: '/api/v2/vendoremployee/recipe/export-recipe-mapping',
```
**Insert after L278:**
```js
  MENU_MASTER: '/api/v2/vendoremployee/product/menu-master', // CR-473
```

---

## E2: recipeService.js — Add menu-aware mapping functions

**Insert after existing `exportRecipeMapping()` (end of file). All additive — existing functions untouched.**

New functions needed:

```
getMenuMaster()
  → GET RECIPE_MAPPING_ENDPOINTS.MENU_MASTER
  → returns: [{ id, name }] via menuManagementTransform.menuMaster()

getFoodRecipeMappingByMenu(foodFor)
  → GET /food-recipe-mapping?food_for={foodFor}
  → returns: { foods[], recipes[], stats{} }
  → maps foods[].food_name → foodName, recipe_id → recipeId (same pattern as aggregator)

batchUpdateRecipeMappingByMenu({ foodFor, updates })
  → POST /update-recipe-mapping-batch
  → body: { food_for: foodFor, updates: [{ item_id, recipe_id }] }  ← NO type field

unlinkRecipeMappingByMenu({ foodFor, itemId })
  → POST /unlink-recipe-mapping
  → body: { food_for: foodFor, item_id: itemId }  ← NO type field

exportRecipeMappingByMenu(foodFor)
  → GET /export-recipe-mapping?food_for={foodFor}
  → responseType: blob → download
```

**Why new functions instead of modifying existing?** The `type` vs `food_for` mutual exclusivity is a hard contract rule. Separate functions prevent accidental `type` + `food_for` in the same payload. Existing aggregator functions stay untouched — zero risk to CR-119.

---

## E3: AggregatorInventoryTab.jsx — Add menu dropdown + mode switching

**This is the primary UI change.** The tab currently shows only aggregator foods. After CR-473 it shows a **mode dropdown** at the top:

```
[Mode dropdown: Aggregator ▾ | Normal | Party | Premium | ...]
```

- **Mode = "Aggregator"** (default): existing behavior unchanged — `getFoodRecipeMapping(clientId)`, shows `aggregator_foods`, client selector visible, save/unlink/export use `type: 'aggregator'`
- **Mode = menu name** (e.g., "Normal"): calls `getFoodRecipeMappingByMenu("Normal")`, shows `foods[]`, client selector hidden, save/unlink/export use `food_for`

**New state:**
- `menus[]` — loaded from `getMenuMaster()` on mount
- `activeMode` — `'aggregator'` (default) or a menu_name string

**Conditional logic:**
- `isAggregatorMode = activeMode === 'aggregator'`
- When mode changes: re-fetch mapping data from the appropriate endpoint
- Stats bar adapts: "Total Aggregator Foods" → "Total Normal Foods" etc.
- Search placeholder adapts
- Save/unlink/export call the appropriate service function

**Lines affected:** ~80 lines added/modified (state, useEffect, conditional rendering, handlers)

---

## E4: RecipeManagementPanel.jsx — Tab label update

**Current L506-508:**
```jsx
<TabsTrigger value="aggregator-inventory" data-testid="recipe-tab-aggregator-trigger" ...>
  Aggregator Inventory
</TabsTrigger>
```
**New:**
```jsx
<TabsTrigger value="aggregator-inventory" data-testid="recipe-tab-aggregator-trigger" ...>
  Food Mapping
</TabsTrigger>
```

The tab value stays `aggregator-inventory` to avoid breaking existing test IDs. Only the visible label changes.

---

## Open Decisions

| OD | Question | Recommendation |
|---|---|---|
| **OD-473-01** | ~~UI layout~~ LOCKED by owner: "Dropdown selector above the food list" | Dropdown inside existing tab |
| **OD-473-02** | Tab label: keep "Aggregator Inventory" or rename to "Food Mapping"? | Rename to "Food Mapping" — now covers all menus, not just aggregator |
| **OD-473-03** | ~~Wait for backend~~ RESOLVED: backend deployed | Proceed |
| **OD-473-04** | Export — one download per menu (current selection) | Per-menu export matching active dropdown selection |
| **OD-473-05** | Default mode: Aggregator (existing behavior) or first menu from menu-master? | Aggregator — preserves current UX, menu is opt-in |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Aggregator flow regression | LOW | HIGH | Existing service functions untouched; new functions are separate |
| `type` + `food_for` sent together | LOW | HIGH | Separate function pairs; never mix in same call |
| Menu-master returns unexpected data | LOW | LOW | Transform already exists; empty array fallback |
| Tab rename breaks test references | LOW | LOW | `value="aggregator-inventory"` and `data-testid` unchanged |

---

## Verification Matrix

| # | Edit | File | How to Verify |
|---|---|---|---|
| V1 | E1 | constants.js | grep MENU_MASTER |
| V2 | E2 | recipeService.js | grep getMenuMaster, getFoodRecipeMappingByMenu |
| V3 | E3 | AggregatorInventoryTab.jsx | Browser: dropdown shows Aggregator + menus from menu-master |
| V4 | E3 | AggregatorInventoryTab.jsx | Select "Normal" → table shows 88 Normal foods (Ruby) or 284 (Palm House) |
| V5 | E3 | AggregatorInventoryTab.jsx | Select "Aggregator" → table shows aggregator foods (existing behavior) |
| V6 | E3 | AggregatorInventoryTab.jsx | Map a Normal food to a recipe → batch save → refresh → mapping persists |
| V7 | E3 | AggregatorInventoryTab.jsx | Unlink a mapped Normal food → refresh → recipe_id is null |
| V8 | E3 | AggregatorInventoryTab.jsx | Export with Normal selected → xlsx downloads |
| V9 | E4 | RecipeManagementPanel.jsx | Tab label reads "Food Mapping" |
| V10 | ALL | — | webpack compiles, 0 new warnings |

---

## Backend Brief Update

Previous brief `BACKEND_BRIEF_CR-473_FOOD_FOR_NOT_ACTIVE_2026_10_26.md` — **RESOLVED**. All endpoints confirmed live. No further backend dependency.

---

## Gate Status

- Gate 1: COMPLETE (Intake)
- Gate 2: **COMPLETE** (this document)
- Gate 3: Awaiting "Gate 3 GO" → Implementation Plan
