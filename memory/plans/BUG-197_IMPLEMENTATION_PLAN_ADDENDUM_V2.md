# Implementation Plan — BUG-197 Addendum (QA-Discovered Field Mismatches)

**ID:** BUG-197 (Addendum to v3 plan dated 2026-07-16)
**Date:** 2026-07-17 (v4 — addendum edits only)
**Gate:** 3 — Implementation Plan
**Risk:** HIGH (item-level) / MEDIUM (addendum scope — field renames only)
**Prerequisites:**
- Original Implementation Plan: `/app/memory/plans/BUG-197_IMPLEMENTATION_PLAN.md` (v3)
- Impact Analysis Addendum: `/app/memory/impact/BUG-197_IMPACT_ANALYSIS_ADDENDUM_QA.md`
- QA Report: `/app/memory/test_reports/QA_REPORT_CR072_BUG197_2026_07_17.md`

---

## Code Reality Check

**Status: PARTIAL**
- Original 10 gaps: ALL IMPLEMENTED (previous session 2026-07-16)
- Addendum A1 (axios X-localization): ALREADY DONE (BUG-198 session)
- Addendum A8/A9 (recipeService PUT): ALREADY DONE (original v3 implementation)
- Addendum A2-A7 (field renames): NOT DONE — these are the remaining scope

---

## Conflict Pre-Check

- `recipeTransform.js`: No other item touches this file. Last modifier: BUG-197 (original v3). SAFE.
- No entry in FILE_OWNERSHIP.md for this file yet (will add during EXIT GATE).
- No other CR/BUG in registry with status != CLOSED touching recipe transforms.

**CONFLICT: NONE**

---

## Scope — What This Addendum Covers

6 edits in 1 file (`src/api/transforms/recipeTransform.js`), all field renames to match backend contract confirmed by owner's working curls.

### What We Will NOT Touch
- `api/axios.js` — A1 already done
- `api/services/recipeService.js` — A8/A9 already done
- `components/inventory/RecipeFormPanel.jsx` — no addendum changes
- `components/inventory/InventorySetupPanel.jsx` — no addendum changes
- Any order, settlement, report, financial, socket, context, or provider file

---

## Execution Sequence

### Edit A2 — `toAPI.storeRecipe()` — Field Renames

**File:** `src/api/transforms/recipeTransform.js` L103-117
**Function:** `storeRecipe(data)`

| # | Current (L106-107) | New | Reason |
|---|---|---|---|
| 1 | `qty: data.qty,` | `recipe_qty: data.qty,` | Backend expects `recipe_qty` (confirmed by owner store-recipe curl) |
| 2 | `unit: data.unit,` | `recipe_unit: data.unit,` | Backend expects `recipe_unit` |

**Full function after edit:**
```js
  // C2: store-recipe — BUG-197 #4: name = food_id (integer), serves_people (with 's')
  storeRecipe(data) {
    return {
      name: data.foodId,                    // Backend expects food_id integer in 'name' field
      recipe_qty: data.qty,                 // BUG-197-A2: qty → recipe_qty
      recipe_unit: data.unit,               // BUG-197-A2: unit → recipe_unit
      preparation_time: data.preparationTime || '',
      serve_time: data.serveTime || '',
      serves_people: data.servePeople || 1, // 'serves' with s
      ingredients: (data.ingredients || []).map(ing => ({
        ingredient_id: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    };
  },
```

---

### Edit A3 — `toAPI.updateRecipe()` — Field Renames

**File:** `src/api/transforms/recipeTransform.js` L120-134
**Function:** `updateRecipe(data)`

| # | Current (L123-124) | New | Reason |
|---|---|---|---|
| 1 | `qty: data.qty,` | `recipe_qty: data.qty,` | Same contract as store |
| 2 | `unit: data.unit,` | `recipe_unit: data.unit,` | Same contract as store |

**Full function after edit:**
```js
  // C3: update-recipe — BUG-197 #5: PUT, different ingredient field names
  updateRecipe(data) {
    return {
      name: data.foodId,
      recipe_qty: data.qty,                 // BUG-197-A3: qty → recipe_qty
      recipe_unit: data.unit,               // BUG-197-A3: unit → recipe_unit
      preparation_time: data.preparationTime || '',
      serve_time: data.serveTime || '',
      serves_people: data.servePeople || 1,
      ingredients: (data.ingredients || []).map(ing => ({
        id: ing.ingredientId,               // 'id' not 'ingredient_id' (update contract)
        qty: ing.quantity,                   // 'qty' not 'quantity' (update contract)
        unit: ing.unit,
      })),
    };
  },
```

---

### Edit A4 — `toAPI.storeSubRecipe()` — Field Renames + Missing Fields

**File:** `src/api/transforms/recipeTransform.js` L137-149
**Function:** `storeSubRecipe(data)`

| # | Current | New | Reason |
|---|---|---|---|
| 1 | `name: data.name,` | `sub_recipe_name: data.name,` | Backend field name |
| 2 | `unit: data.unit,` | `subunit: data.unit,` | Backend field name |
| 3 | `preparation_time:` | `prepration_time:` | R9: backend typo is contract |
| 4 | (missing) | `serve_time: data.serveTime \|\| 0,` | Required by backend |
| 5 | (missing) | `serve_people: data.servePeople \|\| 1,` | Required by backend |
| 6 | (missing) | `thershold_qty: data.thresholdQty \|\| 0,` | R9: backend typo "thershold" |
| 7 | (missing) | `thershold_unit: data.thresholdUnit \|\| '',` | R9: backend typo |

**Full function after edit:**
```js
  // C6: store-sub-recipe — BUG-197-A4: field renames per backend contract
  storeSubRecipe(data) {
    return {
      sub_recipe_name: data.name,           // BUG-197-A4: name → sub_recipe_name
      qty: data.qty,
      subunit: data.unit,                   // BUG-197-A4: unit → subunit
      prepration_time: data.preparationTime || '', // BUG-197-A4: R9 backend typo
      serve_time: data.serveTime || 0,      // BUG-197-A4: missing field
      serve_people: data.servePeople || 1,  // BUG-197-A4: missing field
      thershold_qty: data.thresholdQty || 0,  // BUG-197-A4: R9 backend typo "thershold"
      thershold_unit: data.thresholdUnit || '', // BUG-197-A4: R9 backend typo
      ingredients: (data.ingredients || []).map(ing => ({
        ingredient_id: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    };
  },
```

---

### Edit A5 — `toAPI.updateSubRecipe()` — Same Changes as A4

**File:** `src/api/transforms/recipeTransform.js` L152-164
**Function:** `updateSubRecipe(data)`

Same field renames and missing fields as A4, but with update-contract ingredient fields (`id`/`qty` instead of `ingredient_id`/`quantity`).

**Full function after edit:**
```js
  // C7: update-sub-recipe — BUG-197-A5: field renames per backend contract
  updateSubRecipe(data) {
    return {
      sub_recipe_name: data.name,           // BUG-197-A5: name → sub_recipe_name
      qty: data.qty,
      subunit: data.unit,                   // BUG-197-A5: unit → subunit
      prepration_time: data.preparationTime || '', // BUG-197-A5: R9 backend typo
      serve_time: data.serveTime || 0,      // BUG-197-A5: missing field
      serve_people: data.servePeople || 1,  // BUG-197-A5: missing field
      thershold_qty: data.thresholdQty || 0,  // BUG-197-A5: R9 backend typo
      thershold_unit: data.thresholdUnit || '', // BUG-197-A5: R9 backend typo
      ingredients: (data.ingredients || []).map(ing => ({
        id: ing.ingredientId,
        qty: ing.quantity,
        unit: ing.unit,
      })),
    };
  },
```

---

### Edit A6 — `toAPI.storeAddonRecipe()` — Field Renames + Missing Fields

**File:** `src/api/transforms/recipeTransform.js` L167-179
**Function:** `storeAddonRecipe(data)`

| # | Current | New | Reason |
|---|---|---|---|
| 1 | `qty: data.qty,` | `recipe_qty: data.qty,` | Backend field name |
| 2 | `unit: data.unit,` | `recipe_unit: data.unit,` | Backend field name |
| 3 | (missing) | `preparation_time: data.preparationTime \|\| 0,` | Required |
| 4 | (missing) | `serves_people: data.servePeople \|\| 1,` | Required |
| 5 | (missing) | `serve_time: data.serveTime \|\| 0,` | Required |

**Full function after edit:**
```js
  // D2: store-addon-recipe — BUG-197-A6: field renames per backend contract
  storeAddonRecipe(data) {
    return {
      addon_id: data.addonId,
      name: data.name,
      recipe_qty: data.qty,                 // BUG-197-A6: qty → recipe_qty
      recipe_unit: data.unit,               // BUG-197-A6: unit → recipe_unit
      preparation_time: data.preparationTime || 0, // BUG-197-A6: missing field
      serves_people: data.servePeople || 1, // BUG-197-A6: missing field
      serve_time: data.serveTime || 0,      // BUG-197-A6: missing field
      ingredients: (data.ingredients || []).map(ing => ({
        ingredient_id: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    };
  },
```

---

### Edit A7 — `toAPI.updateAddonRecipe()` — Same as A6

**File:** `src/api/transforms/recipeTransform.js` L182-194
**Function:** `updateAddonRecipe(data)`

Same field renames and missing fields as A6, but with update-contract ingredient fields.

**Full function after edit:**
```js
  // D3: update-addon-recipe — BUG-197-A7: field renames per backend contract
  updateAddonRecipe(data) {
    return {
      addon_id: data.addonId,
      name: data.name,
      recipe_qty: data.qty,                 // BUG-197-A7: qty → recipe_qty
      recipe_unit: data.unit,               // BUG-197-A7: unit → recipe_unit
      preparation_time: data.preparationTime || 0, // BUG-197-A7: missing field
      serves_people: data.servePeople || 1, // BUG-197-A7: missing field
      serve_time: data.serveTime || 0,      // BUG-197-A7: missing field
      ingredients: (data.ingredients || []).map(ing => ({
        id: ing.ingredientId,
        qty: ing.quantity,
        unit: ing.unit,
      })),
    };
  },
```

---

## Verification Matrix

| # | Edit | File | Verification | Method |
|---|---|---|---|---|
| VA1 | A2: storeRecipe | recipeTransform.js | `grep 'recipe_qty' recipeTransform.js` — 2+ hits (store + update) | grep |
| VA2 | A3: updateRecipe | recipeTransform.js | `grep 'recipe_unit' recipeTransform.js` — 2+ hits | grep |
| VA3 | A4: storeSubRecipe | recipeTransform.js | `grep 'sub_recipe_name' recipeTransform.js` — 2 hits (store + update) | grep |
| VA4 | A4: storeSubRecipe | recipeTransform.js | `grep 'prepration_time' recipeTransform.js` — 2 hits | grep |
| VA5 | A4: storeSubRecipe | recipeTransform.js | `grep 'thershold_qty' recipeTransform.js` — 2 hits | grep |
| VA6 | A6: storeAddonRecipe | recipeTransform.js | `grep 'serves_people' recipeTransform.js` — 4+ hits (std store/update + addon store/update) | grep |
| VA7 | A6: storeAddonRecipe | recipeTransform.js | No remaining bare `qty:` or `unit:` in store/update functions (only inside ingredients array) | manual review |
| VA8 | Regression | recipeTransform.js | `fromAPI` functions unchanged — no regressions on read path | visual diff |
| VA9 | Compile | webpack | `webpack compiled` with 0 new warnings | log check |

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Backend rejects renamed fields | LOW (owner curls confirmed these names) | HIGH — store/update broken | Curl-verify during QA with real token |
| 2 | Sub-recipe store uses different names than update | LOW (addendum assumes same contract) | MEDIUM — store broken | Curl-verify store endpoint separately |
| 3 | Missing fields cause validation error | LOW (defaults provided: 0, 1, '') | MEDIUM — store rejected | Curl-verify during QA |
| 4 | `fromAPI` read path regressed | ZERO (not touching fromAPI) | HIGH | VA8 visual diff |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-197 → status remains IMPLEMENTED, gate remains 5
- [ ] BUG_TRACKER.md: BUG-197 note: "Addendum A2-A7 field renames applied"
- [ ] FILE_OWNERSHIP.md: add `recipeTransform.js` with BUG-197 addendum + date
- [ ] Code markers: // BUG-197-A2 through // BUG-197-A7 in every modified function
- [ ] Webpack compiles with 0 new warnings
```

---

## Scope Lock

### File WILL change (1):
| File | Edits |
|---|---|
| `src/api/transforms/recipeTransform.js` | A2, A3, A4, A5, A6, A7 (6 function bodies) |

### Files WILL NOT touch:
- `api/axios.js` — A1 already done
- `api/services/recipeService.js` — A8/A9 already done
- `components/inventory/RecipeFormPanel.jsx` — no addendum changes
- `components/inventory/InventorySetupPanel.jsx` — no addendum changes
- Any order, settlement, report, financial, socket, context, or provider file

---

## Estimated Size

| Edit | Lines Changed |
|---|---|
| A2 (storeRecipe) | 2 renames |
| A3 (updateRecipe) | 2 renames |
| A4 (storeSubRecipe) | 3 renames + 4 new lines |
| A5 (updateSubRecipe) | 3 renames + 4 new lines |
| A6 (storeAddonRecipe) | 2 renames + 3 new lines |
| A7 (updateAddonRecipe) | 2 renames + 3 new lines |
| **Total** | **~24 lines changed in 1 file** |
