# BUG-311 — Ingredient Add: No Duplicate Detection (Missing All 3 Layers vs Expense Pattern)
**Registered:** 2026-08-13  
**Source:** OWNER-REPORTED (screenshots — typing "hhh" shows no duplicate warning)  
**Sprint:** POS 5.0  
**Status:** INTAKE — GATE 1

---

## Classification
- **Type:** BUG  
- **Severity:** P1 — Data integrity (duplicate ingredients silently created)  
- **Risk:** MEDIUM (data integrity, non-financial)  
- **Area:** Inventory → Ingredients → Add Form + Bulk Edit  
- **Duplicate check:** DISTINCT from BUG-164/165 (expense item duplicates) and BUG-220 (ingredient CATEGORY duplicates). This is about ingredient NAME duplicates across both the card view add form and bulk editor.

## Symptom
When adding an ingredient with a name that already exists (e.g., "Almond"), the user receives no warning and the duplicate is silently created. No typeahead suggestions, no pre-save check. The expense module has all three protection layers; ingredients have none.

## Root Cause — 3 Missing Layers

### Layer 1 Missing: No typeahead in add form
`InventorySetupPanel.jsx:306-308` — plain `<Input value={newIng.name}>`. No dropdown showing existing ingredients as user types. Compare: `ExpenseEntryPanel.jsx:65` has `ItemCombobox` that shows existing items in a dropdown as you type.

### Layer 2 Missing: No pre-save isDuplicate check in addIngredient()
`InventorySetupPanel.jsx:136-150` — `addIngredient()` has NO duplicate check before calling `inventoryService.addIngredient()`. Compare: `ExpenseSetupPanel.jsx:352-363` runs `allItems.some(i => i.title.toLowerCase() === newItemName.toLowerCase())` before every add call.

### Layer 3 Missing: No duplicate check in IngredientBulkEditor handleSave()
`IngredientBulkEditor.jsx:161-203` — `handleSave()` validates name/category/unit but NOT duplicate check against existing ingredients. Compare: `ExpenseBulkEditor.jsx:366` flags rows with `"already exists in ${targetCat.name}"` before save.

### Note: Category duplicate check EXISTS but ingredient duplicate does NOT
`InventorySetupPanel.jsx:84-87` has `categories.some(c => c.name === dupName)` for category names — the pattern exists but was never applied to ingredient names.

## Blast Radius
- 2 files: `InventorySetupPanel.jsx`, `IngredientBulkEditor.jsx`
- Scope: MEDIUM (2 files, ~30-50 lines)
- Hotspot: NO (not on R5 list)
- Financial: NO

## Fix Approach (not implemented — awaiting Gate 2-3)
1. Add `ingredients.some(i => i.name.toLowerCase() === newIng.name.toLowerCase())` check in `addIngredient()` + amber warning inline in the name input
2. Add same check in `IngredientBulkEditor.handleSave()` for new rows — flag as `_saveError: "Already exists"`
3. (Enhancement, separate) Add typeahead to the name input — would need a new component or adaptation of `ItemCombobox`

Layer 1 (typeahead) requires full Planning Gate 2-3 (new component, >10 lines).  
Layers 2+3 (pre-save guard): planning skip eligible — ≤15 lines, 2 non-hotspot files.

## Evidence
Investigation report: `/app/memory/BUG-ingredient-duplicate-detection_INVESTIGATION_REPORT.md`  
Screenshots provided by owner (SS1: bulk editor typing "ss", SS2: card view typing "hhh", SS3: expense ItemCombobox reference)
