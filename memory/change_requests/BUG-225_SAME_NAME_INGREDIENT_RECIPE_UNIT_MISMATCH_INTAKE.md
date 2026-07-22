# BUG-225 — Same Name Appears as Ingredient + Recipe; Unit Mismatch Across Screens

**ID:** BUG-225
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P2 (MEDIUM)
**Risk:** MEDIUM
**Module:** Inventory — Recipe Management + Ingredients Setup (cross-screen)
**Duplicate Check:** NONE — fresh cross-screen data classification issue.
**Code Reality:** NEEDS INVESTIGATION — owner message: "ghee dosa in ingredients is in bundle but in recipe it shows as recipes." This indicates a food/ingredient classification overlap: an item called "Ghee Dosa" is in the ingredients list as "bundle" type, but in the recipe management screen it appears in the recipe list (treated as a recipe, not an ingredient).
**Source:** OWNER-REPORTED (session 2026-07-22, verbatim: "ghee dosa in ingrients is in budle but in recipe it shows as recipes")
**Confidence:** REPORTED (cross-screen data not traced this session)

---

## Description

Two interlinked issues:

### A — Same Item Name as Both Ingredient and Food/Recipe
- An item "Ghee Dosa" is added to the Ingredients master (inventory) as a "bundle" type
- The same name "Ghee Dosa" appears in the Recipe list (likely because a recipe exists for it, and the food-item link creates overlap)
- This causes confusion: owner cannot tell if they are looking at an ingredient or a recipe
- May cause unit mismatches when the ingredient unit (`bundle`) differs from the recipe's serving unit

### B — Unit Mismatch Across Screens
- The ingredient "Ghee Dosa" may show one unit on the Ingredients screen and a different unit on the Recipe or Current Stock screen
- Root cause: `fromAPI.ingredients()` and `fromAPI.recipes()` may map the same backend entity with different unit fields

---

## Evidence

- Owner-reported: "ghee dosa in ingrients is in budle but in recipe it shows as recipes"
- Code: `RecipeManagementPanel.jsx` — recipe list loaded from recipe endpoints
- Code: `InventorySetupPanel.jsx` — ingredient list loaded from inventory master
- Potential cause: food item and ingredient both named "Ghee Dosa" — recipe links to food, not ingredient
- Needs: backend check — can a food item and an ingredient share the same name? Are they the same entity?

---

## Blast Radius

- Investigation across: `RecipeManagementPanel.jsx`, `InventorySetupPanel.jsx`, `inventoryTransform.js`, `recipeService.js`
- Fix likely in transform layer or recipe display filter
- Scope: MEDIUM (investigation required before fix scoping)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Curl-verify: get ingredient list and recipe list — check if "Ghee Dosa" appears in both with different IDs/types
2. Determine root cause: is it a data issue (two separate records) or a display issue (same record shown in two places)?
3. If data issue: add validation on ingredient add/edit to warn when name matches an existing food item
4. If display issue: filter recipe list to exclude items that are also ingredients, or add type badge
5. Unit mismatch: trace `fromAPI` transforms for both screens — ensure same unit field is used

---

## Next
Planning Gate 2 → Gate 3 → Implementation
