# Impact Analysis — BUG-206 + BUG-207 + CR-073-FU-01

**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-19
**Conflict Pre-Check:** No external conflicts. All 3 items target same file (`RecipeBulkEditor.jsx`). Execution order: BUG-206 → BUG-207 → CR-073-FU-01.

---

## BUG-206: Batch Save foodId Null

**Code Reality:** PARTIAL — fix pattern exists in RecipeFormPanel.jsx L50-54
**Risk:** HIGH (core feature broken)
**Confidence:** HIGH

### Data Flow Trace
```
API: GET get-recipe → response.recipes[].food_id = MISSING (not returned)
  → fromAPI.recipes(): foodId: r.food_id || null → null
    → RecipeBulkEditor normaliseRecipe(): foodId: r.foodId ?? null → null
      → handleSave(): payload.foodId = null
        → toAPI.updateRecipe(): name: data.foodId → null
          → PUT update-recipe/{id} → 422 "name required"

CARD VIEW FIX (RecipeFormPanel.jsx L50-54):
  → useEffect([foodList]): if (!foodId && recipe?.foodName)
    → match = foodList.find(f => f.name === recipe.foodName)
    → setFoodId(match.id) → correct integer
    → PUT: name: 168408 → 200 OK
```

### Affected Files
| File | Change | Lines |
|------|--------|-------|
| `RecipeBulkEditor.jsx` | Add foodId enrichment in useEffect when foodsMaster + rows available | ~10-12 lines |

### Fix Approach
Add a `useEffect` that runs after both `rows` and `foodsMaster` are populated:
```js
useEffect(() => {
  if (!foodsMaster.length || !rows.length) return;
  setRows(prev => prev.map(row => {
    if (row.foodId || row.isNew) return row; // already has foodId or is new
    const match = foodsMaster.find(f =>
      (f.name || f.food_name || '').trim().toLowerCase() === (row.name || '').trim().toLowerCase()
    );
    return match ? { ...row, foodId: match.id } : row;
  }));
}, [foodsMaster]); // only on master load, not on every row change
```
Also add client-side validation: `if (recipeType === 'standard' && !row.foodId && !row.isNew) → fail-fast`.

### Blockers: NONE
### Owner Decisions: NONE
### Planning Skip: YES (≤15 lines, 1 file, proven pattern, not hotspot, not financial)

---

## BUG-207: Cost=₹0, Margin=100%

**Code Reality:** PARTIAL — code computes cost correctly, but input data has no cost field
**Risk:** MEDIUM
**Confidence:** HIGH (curl-verified)

### Investigation Results

| Hypothesis | Test | Result |
|-----------|------|--------|
| H1: ingredientsMaster has cost | curl `get-inventory-master` → check keys | **ELIMINATED** — keys are: id, category_id, stock_title, type, unit, quantity etc. **No cost/price/rate field.** |
| H2: Recipe API has ingredient cost | curl `get-recipe` → check ingredient keys | **ELIMINATED** — keys are: ingredient_id, ingredient_name, ingredient_qty, ingredient_unit. **No cost field.** |
| H3: Expense unit-prices has costs | curl `stock-unit-prices` → check coverage | **PARTIAL** — returns only **3 of 105 ingredients** with prices. Insufficient coverage. |

### Verdict: **FE-SOLVABLE via vendor-item-list cross-join**

`vendor-item-list` endpoint returns 1,146 purchase records with `ingredient_id` + `unit_price`. Coverage: 39/69 recipe ingredients (56%).

**Owner ruling (2026-07-19):** If ANY ingredient in a recipe has no purchase rate → show "—" for that recipe's cost/margin. Don't show partial cost.

### Fix Approach
1. In `RecipeBulkEditor.jsx` useEffect (alongside ingredientsMaster load), call `inventoryService.getVendorItemList()`
2. Build `lastRate` map: `ingredient_id → latest non-zero unit_price` (sort by Purchase_Date desc, pick first)
3. In `costMarginFor()`: for each ingredient, look up `lastRate[ing.ingredientId]`. If ANY ingredient has no rate → return `{cost: null, margin: null}`
4. In render: if cost is null → show "—" instead of ₹0

### Affected Files
| File | Change | Lines |
|------|--------|-------|
| `RecipeBulkEditor.jsx` | Add getVendorItemList call, build lastRate map, update costMarginFor, update render | ~20-25 lines |

### Blockers: NONE (owner rulings resolved all OQs)
### Owner Decisions: ALL RESOLVED
### Planning Skip: YES (≤25 lines, 1 file, not hotspot, not financial)

---

## CR-073-FU-01: Column Visibility Toggle

**Code Reality:** NONE (feature not built)
**Risk:** MEDIUM
**Confidence:** HIGH

### Data Flow Trace
```
Menu BulkEditor.jsx (reference pattern):
  → ALL_COLUMNS array: [{key, label, tier}] — 33 columns
  → visibleCols state: {[key]: boolean} — initialized from tier
  → Popover with checkboxes per column
  → Grid renders only activeColumns = ALL_COLUMNS.filter(c => visibleCols[c.key])

Recipe BulkEditor adaptation:
  → RECIPE_COLUMNS array: ~11 columns (expand, #, name, qty, unit, prep, cook, serves, ingredients, cost, margin)
  → Same visibleCols state pattern
  → Same Popover UI
  → Grid filters columns dynamically
```

### Affected Files
| File | Change | Lines |
|------|--------|-------|
| `RecipeBulkEditor.jsx` | Add RECIPE_COLUMNS array, visibleCols state, Popover toggle UI, dynamic grid rendering | ~60-80 lines new |

### Blockers: NONE
### Owner Decisions

| # | Question | Options | Default |
|---|----------|---------|---------|
| **OQ-4** | Which columns hidden by default? | a) All visible (tier 1) · b) Hide Cost/Margin (since BUG-207 shows wrong data) · c) Same as mockup (all 10 visible) | Recommend (b) until BUG-207 resolved — avoids showing misleading ₹0/100% |
| **OQ-5** | Should column preferences persist (localStorage)? | YES / NO | Recommend NO for v1 — keep simple, add persistence later |

### Planning Skip: NO (>10 lines, new UI behavior, needs Gate 3 plan)

---

## Execution Order (recommended)

```
1. BUG-206 (P0) → Direct Bug Fix → QA re-test V9+RT-1
   └── Unblocks: recipe save via Bulk Editor
   
2. BUG-207 (P1) → Backend Brief + FE placeholder ("—" for missing cost)
   └── OQ-1/OQ-2/OQ-3 need owner answers
   └── Backend team ships cost endpoint → FE wires it
   
3. CR-073-FU-01 (P2) → Gate 3 Plan → Gate 4 GO → Implementation
   └── OQ-4/OQ-5 need owner answers
   └── Can ship independently of BUG-207
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| BUG-206 fix introduces regression in new-recipe flow | LOW | MEDIUM | Enrichment useEffect skips `row.isNew` rows; food picker still works for new |
| BUG-207 backend endpoint delayed | MEDIUM | LOW | Ship with "—" placeholder — display-only, no data risk |
| CR-073-FU-01 Columns toggle conflicts with future column additions | LOW | LOW | Use extensible RECIPE_COLUMNS array pattern from Menu BulkEditor |
