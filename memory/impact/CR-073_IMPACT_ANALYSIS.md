# CR-073 Impact Analysis — Recipe Bulk Editor

**ID:** CR-073
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-16
**Code Reality:** NONE (no bulk editor exists for recipes)
**Conflict Pre-Check:** No conflicts — only CR-073 touches recipe UI files (BUG-196 touched page wrapper only)
**Risk:** HIGH (new component with nested editable sub-table)

---

## 1. Summary

Add a Bulk Editor view to Recipe Management with an inline spreadsheet grid and expandable ingredient rows. The existing Card View remains as the default; a toggle switches to the Bulk Editor. The API layer, transforms, and service functions are COMPLETE — no backend changes needed.

---

## 2. Data Flow Trace

```
API: GET /recipe/get-recipe
  → recipeService.getRecipes()
    → fromAPI.recipes(response)
      → [{ id, name, foodName, qty, unit, preparationTime, serveTime, servePeople, ingredients: [{ id, name, quantity, unit, cost }] }]
        → RecipeManagementPanel (state: standardRecipes)
          → RecipeTab (Card View) — EXISTING
          → RecipeBulkEditor (Bulk View) — NEW

Update: POST /recipe/update-recipe/{id}
  → recipeService.updateRecipe(id, data)
    → toAPI.storeRecipe(data) — ATOMIC (metadata + ingredients in one payload)
```

**Key insight:** Updates are atomic — one API call per recipe sends both metadata and full ingredients array. No separate ingredient CRUD needed. This simplifies the batch save logic: iterate modified recipes, call `updateRecipe()` for each.

---

## 3. Existing Code Inventory

| File | Lines | Role | Changes Needed |
|---|---|---|---|
| `recipeService.js` | 80 | API layer — all 15 functions wired | **NONE** |
| `recipeTransform.js` | 150 | fromAPI/toAPI normalizers | **NONE** |
| `RecipeManagementPanel.jsx` | 198 | Card grid + tabs + search + create | **MODIFY** — add Card/Bulk toggle + bulk editor route |
| `RecipeFormPanel.jsx` | 214 | Individual recipe add/edit form | **NONE** (stays for Card View + Add Recipe in Bulk) |
| `RecipeManagementPage.jsx` | ~30 | Page wrapper with Sidebar | **NONE** |

### Reference: Menu BulkEditor.jsx
- 1066 lines, 33 columns, category grouping, inline editing, batch save, Excel import/export
- Recipe Bulk Editor will be **simpler** (10 columns vs 33) but adds **ingredient sub-table** (unique complexity)
- Estimated: ~450-550 lines

---

## 4. API Endpoints (all verified live — CR-072)

| Action | Endpoint | Service Function | Status |
|---|---|---|---|
| List recipes | `GET get-recipe` | `getRecipes()` | Ready |
| Update recipe | `POST update-recipe/{id}` | `updateRecipe(id, data)` | Ready — atomic |
| Delete recipe | `DELETE delete-recipe/{id}` | `deleteRecipe(id)` | Ready |
| Store recipe | `POST store-recipe` | `storeRecipe(data)` | Ready |
| Export Excel | `GET export-recipe` | `exportRecipes()` | Ready |
| Import Excel | `POST import-recipe` | `importRecipes(formData)` | Ready |
| List ingredients | `GET get-inventory-master` | `inventoryService.getIngredients()` | Ready (for ingredient dropdowns) |
| List units | via inventory service | `inventoryService.getUnits()` | Ready |

**No new API endpoints needed.**

---

## 5. Component Design

### RecipeBulkEditor.jsx (NEW)

**Props:** `{ recipes, recipeType, onRefresh, ingredients, units }`

**Columns (owner-approved from frozen mockup):**

| # | Key | Label | Type | Width | Editable | Notes |
|---|---|---|---|---|---|---|
| 0 | expand | — | chevron button | 40px | — | Toggle ingredient sub-table |
| 1 | index | # | row number | 40px | No | |
| 2 | name | Recipe Name | text input | 220px+ | Yes | = Menu Item name (single column) |
| 3 | qty | Qty | number input | 60px | Yes | |
| 4 | unit | Unit | dropdown | 90px | Yes | From units list |
| 5 | preparationTime | Prep | number input | 60px | Yes | Minutes |
| 6 | serveTime | Cook | number input | 60px | Yes | Minutes |
| 7 | servePeople | Serves | number input | 60px | Yes | |
| 8 | ingredients | Ingredients | count badge | 100px | Click to expand | Shows "N items" pill |
| 9 | cost | Cost | read-only | 80px | No | Sum of ingredient costs |
| 10 | margin | Margin | read-only | 80px | No | Color-coded % |

**Ingredient Sub-Table (expanded row):**

| Column | Type | Notes |
|---|---|---|
| Ingredient | dropdown (from ingredients master) | Auto-fills unit on select |
| Quantity | number input | |
| Unit | read-only text | Auto-filled from ingredient |
| Delete | icon button | Remove ingredient row |
| + Add Ingredient | link | Appends new empty row |

**State Management:**
- `editedRecipes` — Map<id, editedFields> tracking which recipes are modified
- `expandedRows` — Set<id> tracking which rows are expanded
- `search` — filter string
- Batch save: iterate editedRecipes, call `updateRecipe()` per recipe

---

## 6. Remaining OQs (Non-Blocking — Safe Defaults)

| # | Question | Default Decision | Rationale |
|---|---|---|---|
| OQ-2 | Sub/Addon scope | **Build for all tabs** — same component, different data | Data structure is identical across recipe types; component receives `recipes` prop |
| OQ-4 | Drag-reorder | **Defer** — no reorder support | No API endpoint for recipe ordering; not a user-reported need |

---

## 7. Scope Declaration

**Files WILL change (2):**
- `components/inventory/RecipeBulkEditor.jsx` — **NEW** (~450-550 lines)
- `components/inventory/RecipeManagementPanel.jsx` — **MODIFY** (add Card/Bulk toggle, conditional render)

**Files will NOT touch:**
- `recipeService.js` — API layer complete
- `recipeTransform.js` — transforms complete
- `RecipeFormPanel.jsx` — stays for Card View edits + Add Recipe
- `RecipeManagementPage.jsx` — page wrapper unchanged
- `App.js` — routes unchanged
- `api/constants.js` — endpoints already defined

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Batch save race conditions (many concurrent updates) | MEDIUM | MEDIUM | Sequential save with progress indicator; abort on first error |
| Ingredient sub-table performance with many expanded rows | LOW | LOW | Only render expanded rows; collapse on navigation |
| Cost/margin calculation accuracy | LOW | HIGH | Use existing `ingredient.cost` from API; sum formula matches backend |
| Import overwrite without confirmation | MEDIUM | HIGH | Add confirmation dialog before import (same as Menu BulkEditor) |
