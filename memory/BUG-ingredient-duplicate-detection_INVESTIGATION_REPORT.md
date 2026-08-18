# BUG-ingredient-duplicate-detection — Investigation Report
**Date:** 2026-08-13  
**Role:** INVESTIGATION  
**Steps used:** 6/10  
**Confidence:** HIGH  
**Source:** Owner-reported (three screenshots — no duplicate warning when adding ingredients)

---

## 1. Summary
Ingredients have NO duplicate detection at any layer. Expenses have THREE layers: (1) ItemCombobox typeahead in entry form, (2) pre-save isDuplicate guard in setup add form, (3) skip-and-badge in bulk editor. All three are missing for ingredients.

Classification: **FE_GAP** — missing feature  
Files affected: `InventorySetupPanel.jsx`, `IngredientBulkEditor.jsx`

---

## 2. Expense Reference Pattern

### Layer 1 — ItemCombobox (ExpenseEntryPanel.jsx:65-160)
Typeahead dropdown: as user types, existing items appear with category + price badge.
Only shows "+ Use xxx (new item)" when no match found.

### Layer 2 — isDuplicate pre-save guard (ExpenseSetupPanel.jsx:352-363)
```js
const isDuplicate = allItems.some(
  i => catMatch && i.title.trim().toLowerCase() === newItemName.trim().toLowerCase()
);
if (isDuplicate) {
  toast({ title: "Duplicate item", description: `"..." already exists in ${cat.name}.` });
  return;
}
```

### Layer 3 — Bulk editor skip-and-badge (ExpenseBulkEditor.jsx:366, 472)
Duplicate rows get `_saveStatus: "error"` with `"already exists in ${targetCat.name}"` — visually flagged, not silently created.

---

## 3. Ingredient Gaps

| # | Gap | File | Line | Expense Equivalent |
|---|-----|------|------|--------------------|
| G1 | No typeahead/combobox in name input | InventorySetupPanel.jsx | 306–308 | ItemCombobox (ExpenseEntryPanel.jsx:65) |
| G2 | No isDuplicate check in addIngredient() | InventorySetupPanel.jsx | 136–150 | isDuplicate guard (ExpenseSetupPanel.jsx:352) |
| G3 | No duplicate skip in IngredientBulkEditor handleSave() | IngredientBulkEditor.jsx | 161–203 | Skip+badge (ExpenseBulkEditor.jsx:366) |
| G4 | Category has guard but ingredient name does not | InventorySetupPanel.jsx | 84–87 vs 136–150 | Both guarded in expenses |
| G5 (NOTE) | Scope: expense=per-category; ingredient=should be global | Both | — | Different business rule |

---

## 4. What Needs to Be Built (when owner approves)

1. **Typeahead on name input**: dropdown shows existing ingredients as user types, with category badge. Exact/fuzzy match → amber warning inline.
2. **Pre-save isDuplicate guard in addIngredient()**: global name scan (case-insensitive across all categories).
3. **Duplicate skip+badge in IngredientBulkEditor.handleSave()**: check against `allItems` before API call.

---

## 5. Planning Skip Eligibility
- G2+G3 alone: ≤15 lines, 2 files, no hotspot → borderline eligible with owner approval
- G1 (typeahead): new component, >10 lines → full Planning Gate 2-3 required
- Recommended: full gate cycle (all three gaps together in one plan)
