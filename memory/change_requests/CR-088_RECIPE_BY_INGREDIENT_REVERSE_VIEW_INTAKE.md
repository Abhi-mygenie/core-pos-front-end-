# CR-088 — Recipe "By Ingredient" Reverse View Tab

**ID:** CR-088
**Type:** CR
**Created:** 2026-07-22
**Severity:** P2 (MEDIUM)
**Risk:** LOW
**Module:** Inventory — Recipe Management (RecipeManagementPanel)
**Duplicate Check:** NONE — new feature, no existing reverse-view tab.
**Code Reality:** NONE — no reverse-view exists. `RecipeManagementPanel.jsx` has tabs: Standard, Sub, Addon. A 4th tab for "By Ingredient" reverse lookup does not exist.
**Source:** OWNER-REQUESTED (session 2026-07-22)
**Confidence:** CONFIRMED (feature gap verified)

---

## Description

Currently the Recipe Management screen shows recipes grouped by type (Standard, Sub, Addon). Owner wants an additional **"By Ingredient"** tab that inverts the view:

- Select an ingredient → see **all recipes that use that ingredient**
- Useful for: understanding impact of ingredient price change, planning batch cooking, checking which dishes use a scarce item

### Expected UI
- Tab 4: "By Ingredient" (alongside Standard, Sub, Addon)
- Left panel or dropdown: ingredient selector (search + select)
- Right/main panel: list of recipes that include the selected ingredient, with quantity/unit for each

---

## Evidence

- Code: `RecipeManagementPanel.jsx:185-230` — 3-tab structure, no 4th tab
- No service function for reverse-lookup exists in `recipeService.js`
- Needs: backend endpoint check — is there a `GET /recipe/by-ingredient/{id}` or equivalent?

---

## Blast Radius

- 2-3 files: `RecipeManagementPanel.jsx`, `recipeService.js`, possibly new sub-component
- ~40-60 lines change
- Scope: MEDIUM

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Backend: curl-verify or request `GET /api/v2/vendoremployee/recipe/by-ingredient/{ingredient_id}`
2. Frontend: add Tab 4 "By Ingredient" to `RecipeManagementPanel.jsx`
3. Add ingredient selector dropdown (uses existing `ingredients` state or fetch fresh)
4. On ingredient select: call API → render recipe cards with ingredient quantity/unit
5. Add service function `recipeService.getRecipesByIngredient(id)`

---

## Next
Planning Gate 2 → Gate 3 → Implementation
