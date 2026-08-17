# BACKEND_BRIEF_BUG-233_2026-07-23

## Summary
- **Issue:** `addon-recipe-list` endpoint does not include ingredients in the response, so addon recipes never appear in the By Ingredient reverse-lookup tab
- **Classification:** BACKEND_BUG
- **Frontend impact:** By Ingredient tab (CR-088) shows only Standard + Sub recipes for any ingredient. Addon recipes are structurally included in the FE logic but always return `ingredients: []`, so they never match.
- **Priority/Risk:** P1 / MEDIUM

---

## Endpoint

- **Method:** GET
- **URL:** `https://preprod.mygenie.online/api/v2/vendoremployee/product/addon-recipe-list`
- **Auth/context:** Bearer token (vendoremployee, owner role)

---

## Reproduction

1. Login as `owner@palmhouse.com`
2. GET `addon-recipe-list` with Bearer token
3. Inspect any recipe object → `"ingredients": []`

Compare with:
- GET `/api/v2/vendoremployee/recipe/get-recipe` → `"ingredients": [{"ingredient_id": ..., "ingredient_name": ..., "ingredient_qty": ..., "ingredient_unit": ...}]` ✅

---

## Payload / Response

**Actual response (truncated):**
```json
{
  "recipes": [
    {
      "recipe_id": 9797,
      "name": "Cureveda Vegan Pea Protein Vanilla",
      "ingredients": [],
      ...
    },
    {
      "recipe_id": 9796,
      "name": "Cureveda Vegan Pea Protein Choclate",
      "ingredients": [],
      ...
    }
  ]
}
```

**Expected response:**
```json
{
  "recipes": [
    {
      "recipe_id": 9797,
      "name": "Cureveda Vegan Pea Protein Vanilla",
      "ingredients": [
        {
          "ingredient_id": 12345,
          "ingredient_name": "Vanilla protein powder",
          "ingredient_qty": 33,
          "ingredient_unit": "gm"
        }
      ],
      ...
    }
  ]
}
```

**Evidence:** `/app/memory/evidence/BUG-233/addon_recipe_list_response.json`

---

## Frontend Workaround

- **Available:** NO
- **Details:** No individual addon recipe detail endpoint exists (GET on update-addon-recipe returns 405). N+1 calls per addon recipe not viable. FE is correct — it includes `addonRecipes` in `allRecipes` and runs the same ingredient match. The fix must be on the backend.

## ⚠️ Data Loss Risk (CRITICAL — discovered in same investigation)

Because `addon-recipe-list` returns `ingredients: []`, the **edit form** for addon recipes (RecipeFormPanel.jsx:34-36) initializes with ONE empty ingredient row. If an owner opens an addon recipe to edit ANY field (e.g. prep time) and clicks "Update Recipe", the FE will POST `ingredients: []` to `update-addon-recipe`, **permanently deleting all stored ingredients for that recipe.**

The ingredients ARE being stored correctly on creation (storeAddonRecipe sends `ingredients: [{id, qty, unit}]`). The data-loss risk is only triggered by editing after this bug is present.

**Severity upgrade: P0 (data loss risk) — recommend fixing backend ASAP**

---

## Fix Request

Please ensure `addon-recipe-list` includes `ingredients` array per recipe entry, with the same shape as `get-recipe`:
```
ingredient_id, ingredient_name, ingredient_qty, ingredient_unit, cost
```
