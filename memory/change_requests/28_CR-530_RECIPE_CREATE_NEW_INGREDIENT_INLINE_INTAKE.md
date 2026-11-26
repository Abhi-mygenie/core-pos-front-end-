# CR-530 — Recipe: Create New Ingredients During Recipe Making

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

When creating or editing a recipe, the user can currently only select from **existing ingredients** in the inventory. If a new ingredient is needed that doesn't exist yet, the user must exit the recipe editor, go to the Inventory Setup, add the ingredient there, then return to recipe making.

**Current behaviour:** Recipe editor shows an ingredients dropdown/search from the existing inventory list. No inline "Create New Ingredient" option.

**Expected behaviour:** An inline "+ Create New Ingredient" option or quick-add modal within the Recipe editor, allowing the user to create a new ingredient without leaving the recipe creation flow.

---

## 2. Classification

- **Type:** CR
- **Severity:** P2 — Medium (workflow friction; workaround exists via separate page)
- **Risk:** MEDIUM — inline ingredient creation, inventory service call within recipe context
- **Area:** Inventory / Stock
- **Fast Lane:** NOT eligible (new inline creation flow)

---

## 3. Duplicate Check

- **Result: DISTINCT** — no prior registration for inline ingredient creation during recipe making

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- `RecipeManagementPage.jsx` or `RecipeManagementPanel.jsx` — inline create button
- `inventoryService.js` — create ingredient API call
- Possibly a new `QuickAddIngredientModal.jsx` component
- **Estimated scope:** SMALL-MEDIUM (2–3 files)

---

## 6. Open Questions

- OD-530-01: Inline quick-add (name + unit only) or full ingredient creation form?
- OD-530-02: After creating, should the new ingredient be automatically selected in the recipe row?

---

## 7. Code Reality

- **Status:** NONE — no inline ingredient creation in recipe editor

---

## 8. Related

- CR-387 (Smart Purchase unit breakdown — GATE_5A_IMPLEMENTED, inventory related)
- BUG-457 (Recipe delete error — GATE_5A_IMPLEMENTED)
