# CR-073 Implementation Plan — Recipe Bulk Editor

**ID:** CR-073
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-16
**Risk:** HIGH
**Depends on:** Impact Analysis `impact/CR-073_IMPACT_ANALYSIS.md`, Frozen Mockup `/__dev/recipe_bulk_editor_mockup.html`

---

## Scope Lock

**Files WILL change (2):**
1. `components/inventory/RecipeBulkEditor.jsx` — **NEW** (~450-550 lines)
2. `components/inventory/RecipeManagementPanel.jsx` — **MODIFY** (~30 lines changed)

**Files will NOT touch:**
- `recipeService.js`, `recipeTransform.js`, `RecipeFormPanel.jsx`, `RecipeManagementPage.jsx`, `App.js`, `api/constants.js`

---

## Execution Sequence

### Phase 1: Modify RecipeManagementPanel.jsx — Add Card/Bulk Toggle

**Edit 1a — Add imports (top of file):**
```
+ import RecipeBulkEditor from './RecipeBulkEditor';
+ import { LayoutGrid, Table2 } from 'lucide-react';
```

**Edit 1b — Add view state (inside RecipeManagementPanel component):**
```
+ const [viewMode, setViewMode] = useState('card'); // 'card' | 'bulk'
```

**Edit 1c — Add toggle buttons (in header area, next to Create Recipe button):**
Replace the current header `<div className="flex items-center justify-between mb-6">` block to include:
- Left: Tabs (unchanged)
- Right: Card/Bulk toggle + Create Recipe button

**Edit 1d — Conditional render:**
- If `viewMode === 'card'`: render existing `<RecipeTab>` (unchanged)
- If `viewMode === 'bulk'`: render `<RecipeBulkEditor>` with props:
  - `recipes={currentRecipes}` (based on active tab)
  - `recipeType={activeTab}`
  - `onRefresh={fetchData}`

### Phase 2: Create RecipeBulkEditor.jsx — The Inline Spreadsheet

**Structure:**
```
RecipeBulkEditor ({ recipes, recipeType, onRefresh })
├── State: editedRecipes (Map), expandedRows (Set), search, saving
├── Hooks: useEffect to load ingredients + units (for dropdowns)
├── Toolbar: Search, Columns toggle, Excel, Import, +Add, Save
├── Data Grid Table
│   ├── Header Row (11 columns)
│   ├── Recipe Rows (map over filtered recipes)
│   │   ├── Main Row: chevron, #, name input, qty, unit, prep, cook, serves, ingredients badge, cost, margin
│   │   └── Expanded Row (if in expandedRows):
│   │       └── Ingredient Sub-Table
│   │           ├── Header: Ingredient, Quantity, Unit, Delete
│   │           ├── Ingredient Rows (editable)
│   │           └── + Add Ingredient button
│   └── Empty State (if no recipes match search)
├── Batch Save Logic
│   ├── Collect all modified recipes from editedRecipes Map
│   ├── For each: build payload via toAPI.storeRecipe()
│   ├── Call recipeService.updateRecipe(id, data) sequentially
│   ├── Track progress (N/total)
│   ├── Toast success/error
│   └── Call onRefresh() to reload
└── Import/Export stubs (call existing recipeService functions)
```

**Key Implementation Details:**

1. **Local editing state:** Deep-clone recipes into local state. Track modifications in a `Set<id>`. On save, diff modified recipes and call update API.

2. **Ingredient sub-table:** When a row is expanded, render a full-width `<tr>` with `colSpan=11` containing the ingredient editor. Ingredients are edited in local state and saved as part of the parent recipe's batch save.

3. **Ingredient dropdown:** Load ingredient master list via `inventoryService.getIngredients()` on mount. Auto-fill unit when ingredient is selected.

4. **Cost calculation:** Sum `ingredient.cost * ingredient.quantity` for each recipe. Margin = `(price - cost) / price * 100` (price not available in recipe data — show cost only, margin as placeholder "...%" until linked).

5. **Add Recipe:** Appends a new empty row at top. On save, calls `storeRecipe()` instead of `updateRecipe()`.

6. **Delete Recipe:** Icon button in row → confirmation → `deleteRecipe(id)` → remove from local state.

7. **Import/Export:** Directly call existing `recipeService.exportRecipes()` / `importRecipes()`. Import triggers full refresh.

---

## Verification Matrix

| # | What | How to Verify | Automated? |
|---|---|---|---|
| 1 | Card/Bulk toggle visible | Browser: `/recipes` — see toggle buttons | NO |
| 2 | Bulk Editor renders recipe grid | Toggle to Bulk → see 92 recipes in table | NO |
| 3 | Search filters recipes | Type in search → rows filter in real-time | NO |
| 4 | Inline editing works | Change recipe name, qty, prep time → Save button activates | NO |
| 5 | Expandable ingredient row | Click chevron → ingredient sub-table expands with orange left border | NO |
| 6 | Ingredient editing | Change ingredient dropdown, quantity → included in batch save | NO |
| 7 | Add Ingredient | Click "+Add Ingredient" → new empty row in sub-table | NO |
| 8 | Delete Ingredient | Click trash → ingredient removed | NO |
| 9 | Batch Save | Click Save → all modified recipes updated via API | NO |
| 10 | Add Recipe | Click "+Add Recipe" → new empty row → fill → save creates new recipe | NO |
| 11 | Excel Export | Click "Excel" → file downloads | NO |
| 12 | Import | Click "Import" → file picker → upload → refresh | NO |
| 13 | Card View toggle back | Toggle Card → see original card grid (unchanged) | NO |
| 14 | Compile check | webpack compiled with 0 new warnings | YES |

---

## Post-Code Registry Checklist

- [ ] registry.json: CR-073 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: add 2 files with CR-073 + date
- [ ] Code markers: `// CR-073` comment in every modified file

---

## Estimation

- RecipeBulkEditor.jsx: ~450-550 lines (new)
- RecipeManagementPanel.jsx: ~30 lines modified
- Total: ~500 lines
- Complexity: HIGH (nested editable sub-table, batch save, local state diffing)
- No new API endpoints, no new transforms, no new routes

---

**Next:** Gate 4 GO (owner approval) → Implementation
