# BUG-233 INVESTIGATION REPORT
**Date:** 2026-07-23
**Role:** INVESTIGATION (Role 6)
**Restaurant tested:** palmhouse (owner@palmhouse.com)

---

## 1. Summary

**Root cause:** `addon-recipe-list` backend endpoint returns `ingredients: []` for ALL addon recipes.
**Classification:** BACKEND_BUG
**Confidence:** HIGH (API probed directly, response confirmed)
**Steps used:** 5/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | Addon recipe API returns no `ingredients` (backend omits) | curl GET addon-recipe-list | **CONFIRMED** | `ingredients: []` on both addon recipes |
| H2 | ID field mismatch in addon ingredients | Code trace recipeTransform.js:77 | ELIMINATED | `id: ing.ingredient_id \|\| ing.id` is correct pattern |
| H3 | ingFilter counts exclude addon ingredients | Follows from H1 — empty ingredients means 0 IDs in Set | CONFIRMED (consequence of H1) | — |

---

## 3. Data Flow Trace

```
API: GET /api/v2/vendoremployee/product/addon-recipe-list
  → Response: { recipes: [ { ..., ingredients: [] }, ... ] }   ← EMPTY — BREAK POINT

Transform: recipeTransform.js:77
  → ingredients: (r.ingredients || []).map(...)
  → Result: [] (nothing to map)

State: addonRecipes = [{ id, name, ..., ingredients: [] }]

Component: ByIngredientTab (line 152)
  → allRecipes = [...standardRecipes, ...subRecipes, ...addonRecipes]
  → matches: addonRecipes never match because ingredients: []

UI: Addon recipes never appear in By Ingredient results
```

**Contrast — Standard recipe endpoint:**
```
API: GET /api/v2/vendoremployee/recipe/get-recipe
  → Response: { recipes: [ { ingredients: [{ingredient_id: 18511, ...}] } ] }  ← POPULATED ✓
```

---

## 4. Evidence Artifacts

- API response: `/app/memory/evidence/BUG-233/addon_recipe_list_response.json`
- Both addon recipes return `"ingredients": []`
- Standard recipe `Americano` returns `"ingredients": [{"ingredient_id": 18511, "ingredient_name": "Blue Tokai Coffee Attikan", ...}]`

---

## 5. Recommendations

**Classification:** BACKEND_BUG → must be fixed on backend
**FE workaround available:** NO — no individual addon recipe detail endpoint exists. N+1 calls per addon recipe not acceptable.

**Backend ask:**
- Endpoint: `GET /api/v2/vendoremployee/product/addon-recipe-list`
- Expected: `ingredients` array populated for each recipe (same shape as `get-recipe`)
- Actual: `ingredients: []` for all addon recipes
- Fix: Include ingredients relation in the addon recipe list query (eager load)

**Planning skip eligible:** NO — root cause is backend, FE has no fix path.

---

## 6. Retroactive Candidates
NONE
