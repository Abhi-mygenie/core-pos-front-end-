# CR-531 — Recipe: Ingredients List Should Show Category

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

When viewing or selecting ingredients during recipe creation, the ingredient list does not show the **ingredient's category** (e.g. "Dairy", "Spices", "Vegetables"). The owner wants the category to be visible alongside each ingredient name so that staff can quickly find and differentiate ingredients with similar names.

**Current behaviour:** Ingredient search/list in the recipe editor shows ingredient name (and possibly unit) but no category.

**Expected behaviour:** Each ingredient in the recipe list/dropdown shows its category alongside the name — e.g. "Butter (Dairy)" or a subtle category label.

---

## 2. Classification

- **Type:** CR
- **Severity:** P2 — Medium (usability improvement; not blocking)
- **Risk:** LOW — display-only change, no logic or API change
- **Area:** Inventory / Stock
- **Fast Lane:** ELIGIBLE if change is ≤10 lines display only (owner approval needed)

---

## 3. Duplicate Check

- **Result: DISTINCT** — no prior registration

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- `RecipeManagementPage.jsx` or ingredient picker component — add category to display
- `inventoryTransform.js` — ensure `category` field is mapped from API response
- **Estimated scope:** SMALL (1–2 files)

---

## 6. Open Questions

- OD-531-01: Does the ingredient API response include a `category` field for each ingredient?
- OD-531-02: Show category as (a) "(Category)" suffix in ingredient name (b) a small badge/chip (c) grouped by category in the dropdown?

---

## 7. Code Reality

- **Status:** NONE — no category display in recipe ingredient list

---

## 8. Related

- CR-530 (Inline ingredient creation during recipe — same context)
- CR-387 (Smart Purchase unit breakdown — inventory related)
