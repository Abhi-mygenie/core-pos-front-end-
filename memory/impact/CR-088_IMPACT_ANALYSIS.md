# CR-088 — Impact Analysis: Recipe "By Ingredient" Reverse View Tab

**ID:** CR-088
**Gate:** 2 (Impact Analysis)
**Risk:** LOW
**Code Reality:** NONE — no reverse-view tab exists. RecipeManagementPanel has 3 tabs: Standard, Sub, Addon.
**Conflict Pre-Check:** CLEAR — RecipeManagementPanel.jsx last modified by CR-073 (IMPLEMENTED). recipeService.js shared with BUG-222 (Wave 3) but BUG-222 fixes Excel export — zero overlap with additive service function.

---

## 1. Data Flow Trace

```
Backend probe:
  GET /api/v2/vendoremployee/recipe/by-ingredient/{id} → 404 (NOT FOUND)
  → No backend endpoint for reverse lookup.

Client-side alternative (RECOMMENDED):
  All 3 recipe lists are ALREADY fetched on mount:
    standardRecipes, subRecipes, addonRecipes
  Each recipe has: recipe.ingredients[] → [{ id, name, quantity, unit, cost }]

  Flow:
    Tab 4 "By Ingredient" → ingredient selector dropdown (from inventoryService.getIngredients())
    → on select: filter ALL recipes where ingredients[].id === selectedIngredientId
    → display matching recipes as cards (reuse existing RecipeCard component)
    → show ingredient.quantity + unit per match
```

**No new API endpoint needed.** Pure client-side filtering on already-loaded data.

---

## 2. Affected Files

| # | File | Lines | Change | Est. Lines |
|---|------|-------|--------|------------|
| 1 | `components/inventory/RecipeManagementPanel.jsx` | 235 total | Add 4th tab "By Ingredient" + ingredient selector + filter logic + render matches | ~50-60 lines |

**Files WILL NOT touch:** `recipeService.js` (no new API), `recipeTransform.js`, `RecipeFormPanel.jsx`, `RecipeBulkEditor.jsx`, `constants.js`, `App.js`

**Files MAY import from (read-only):** `inventoryService.js` → `getIngredients()` for dropdown options (already exists, line 8)

---

## 3. Tab Addition

Current tabs (RecipeManagementPanel.jsx:180-195):
```
Standard | Sub | Addon
```

After:
```
Standard | Sub | Addon | By Ingredient
```

New tab value: `"by-ingredient"`
New TabsTrigger + TabsContent in the existing `<Tabs>` component.

---

## 4. Ingredient Selector

- Fetch ingredients via `inventoryService.getIngredients()` (already exists)
- Dropdown/combobox with search (reuse existing `Input` + filter pattern from RecipeTab)
- On select → filter `[...standardRecipes, ...subRecipes, ...addonRecipes]` where `recipe.ingredients.some(ing => ing.id === selectedId)`
- Display: RecipeCard for each match + badge showing recipe type (Standard/Sub/Addon)

---

## 5. Data Availability Check

Recipe ingredient shape (from `recipeTransform.js:20-26`):
```javascript
{
  id: ing.ingredient_id || ing.id,      // ← ingredient master ID
  name: ing.ingredient_name || ing.name,
  quantity: Number(ing.ingredient_qty || ing.quantity) || 0,
  unit: ing.ingredient_unit || ing.unit || '',
  cost: Number(ing.cost) || 0,
}
```

Ingredient master shape (from `inventoryService.getIngredients()`):
```javascript
{ id, name, category, unit, ... }
```

Match key: `recipe.ingredients[].id === ingredient.id` — both use the inventory master ID. **Confirmed compatible.**

---

## 6. Downstream Consumers

- `RecipeCard`: receives single recipe → no change needed (reuse as-is)
- Tab content is isolated — no other component depends on tab state
- `RecipeBulkEditor`: only shown for Standard/Sub/Addon tabs → hidden on "By Ingredient" tab (no bulk edit for reverse view)

---

## 7. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Ingredient list fetch adds latency | LOW | Fetch once on mount, cache in state |
| Large recipe count slows filter | NEGLIGIBLE | <500 recipes × <50 ingredients = instant |
| Recipe with no ingredients | LOW | Excluded from filter results (correct) |
| BUG-222 conflict (recipeService.js) | NONE | CR-088 does NOT touch recipeService.js |

---

## 8. Owner Decisions — NONE

No business logic involved. Pure read-only reverse lookup.

---

## Next
Gate 3 (Implementation Plan) → Gate 4 GO
