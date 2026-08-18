# CR-073: Recipe Bulk Editor — Inline Spreadsheet for Recipe Management

**ID:** CR-073
**Type:** CR (Feature)
**Priority:** P1 (HIGH — 92+ recipes, managing one-at-a-time is inefficient)
**Risk:** HIGH (new UI component, touches recipe API layer, ingredient sub-table complexity)
**Sprint:** POS 5.0
**Reported by:** Owner
**Date:** 2026-07-16
**Source:** OWNER-REPORTED (with screenshots)

---

## Description

Add a Bulk Editor view to Recipes Management (`/recipes`), following the same inline spreadsheet pattern used in Menu Management (`BulkEditor.jsx`). Currently recipes are displayed as cards (view-only grid) with individual edit forms — managing 92+ recipes one at a time is impractical.

The owner wants a Card View / Bulk Editor toggle (same as Menu Management) for efficient bulk recipe management.

---

## Code Reality: NONE

No bulk editor exists for recipes. Current implementation:
- `RecipeManagementPanel.jsx` (198 lines) — card grid + search + 3 tabs (Standard/Sub/Addon)
- `RecipeFormPanel.jsx` (214 lines) — individual recipe add/edit form with ingredient rows
- `recipeService.js` (80 lines) — CRUD + import/export already wired
- `recipeTransform.js` (150 lines) — fromAPI/toAPI normalizers

**Existing Bulk Editor references (pattern to follow):**
- `components/panels/menu/BulkEditor.jsx` — Menu Management inline spreadsheet (PRIMARY reference)
- `components/expense/ExpenseBulkEditor.jsx` — Expense bulk editor
- `components/panels/settings/TableBulkEditor.jsx` — Table settings bulk editor

---

## Duplicate Check: DISTINCT

No existing CR or BUG covers a recipe bulk editor.

---

## Evidence

### Screenshots (owner-provided)
1. Current recipe card grid — 92 Standard Recipes, cards with name, menu item, prep/cook time, ingredient preview, cost/margin
2. Current edit form — one recipe at a time (name, menu item, qty, unit, prep/cook, serves, ingredient table)
3. Menu Management Bulk Editor — the target UX pattern (inline spreadsheet with column toggles, search, Excel export/import)

### Existing Recipe API Endpoints (all verified live — CR-072 Impact Analysis)

| # | Endpoint | Method | Purpose |
|---|---|---|---|
| 1 | `get-recipe` | GET | List all standard recipes |
| 2 | `store-recipe` | POST | Create recipe |
| 3 | `update-recipe` | POST | Update recipe |
| 4 | `delete-recipe` | DELETE | Delete recipe |
| 5 | `export-sample-recipe` | GET | Export sample template |
| 6 | `export-recipe` | GET | Export recipes as Excel |
| 7 | `import-recipe` | POST | Import recipes from Excel |
| 8 | `sub-recipes` | GET | List sub-recipes |
| 9 | `store-sub-recipe` | POST | Create sub-recipe |
| 10 | `update-sub-recipe` | POST | Update sub-recipe |
| 11 | `delete-sub-recipe` | DELETE | Delete sub-recipe |
| 12 | `export-sample-sub-recipe` | GET | Export sub-recipe template |
| 13 | `export-sub-recipes` | GET | Export sub-recipes |
| 14 | `import-sub-recipes` | POST | Import sub-recipes |
| 15 | `addon-recipe-list` | GET | List addon recipes |
| 16 | `store-addon-recipe` | POST | Create addon recipe |
| 17 | `update-addon-recipe` | POST | Update addon recipe |
| 18 | `delete-addon-recipe` | DELETE | Delete addon recipe |

**Import/Export already wired in `recipeService.js`** — Excel flow is ready.

---

## Proposed Bulk Editor Columns

| Column | Type | Editable | Notes |
|---|---|---|---|
| # | Row number | No | |
| Recipe Name | Text | Yes | Required |
| Menu Item | Dropdown (food items) | Yes | Links recipe to menu |
| Qty | Number | Yes | |
| Unit | Dropdown | Yes | plates, pieces, etc. |
| Prep Time | Number | Yes | Minutes |
| Cook/Serve Time | Number | Yes | Minutes |
| Serves | Number | Yes | |
| Ingredients | Count badge + expand | Inline | Click to expand ingredient sub-rows |
| Cost | Read-only | No | Calculated from ingredient costs |
| Margin | Read-only | No | Calculated |

### Key UX Features (matching Menu Bulk Editor pattern)
- **Card View / Bulk Editor toggle** (top-right, same as Menu Management)
- **Column visibility toggles** (same as Menu "Columns" dropdown)
- **Search bar** (filter recipes by name)
- **Tab retention** (Standard / Sub / Addon tabs work in both views)
- **Excel Export / Import** (already wired in service layer)
- **Batch Save** (save all changes at once)
- **+ Add Recipe** (add row inline)

### Ingredient Sub-Table Challenge
Each recipe has a variable-length ingredient list (1-10+ ingredients). Options:
- **Option A:** Expandable row (click row → ingredient table expands below)
- **Option B:** Side panel (click row → ingredient editor in right drawer)
- **Option C:** Ingredient count badge only in bulk view; full ingredient editing stays in form view

**Owner decision needed on Option A/B/C.**

---

## Blast Radius

- **New files:** ~2-3 (RecipeBulkEditor.jsx, possibly RecipeBulkRow.jsx for ingredient expansion)
- **Modified files:** ~2 (RecipeManagementPanel.jsx — add toggle, RecipeFormPanel.jsx — minor if needed)
- **No changes to:** API layer (recipeService.js already complete), transforms (recipeTransform.js already complete), routes, Sidebar
- Hotspot files touched: **NO**
- Estimated scope: **LARGE** (new component ~400-600 lines based on Menu BulkEditor reference at similar size)

---

## Open Questions

| # | Question | Status |
|---|---|---|
| OQ-1 | Ingredient editing in bulk view: expandable row (A), side panel (B), or count-only with form for full edit (C)? | **RESOLVED — Option A (Expandable Row) approved 2026-07-16** |
| OQ-2 | Should Sub-Recipes and Addon Recipes also get bulk editor, or Standard only first? | PENDING |
| OQ-3 | Any columns to add beyond the proposed list? | **RESOLVED — Recipe Name = Menu Item (single column, not two). Owner confirmed they are the same.** |
| OQ-4 | Should the bulk editor support drag-reorder of recipes? | PENDING |

---

## Approved Design (Frozen 2026-07-16)

**Mockup URL:** `/__dev/recipe_bulk_editor_mockup.html`
**Mockup file:** `/app/frontend/public/__dev/recipe_bulk_editor_mockup.html`
**Pattern:** Expandable Row with inline ingredient sub-table
**Design archetype:** Swiss & High-Contrast (ARCHETYPE 4)

### Key Design Decisions (Owner-Approved)
1. **Single "Recipe Name" column** — no separate "Menu Item" column (recipe name = menu item name)
2. **Expandable Row for ingredients** — click chevron to expand/collapse ingredient sub-table inline
3. **Orange left border accent** on expanded ingredient sub-table for visual grouping
4. **Card View / Bulk Editor toggle** — same pattern as Menu Management
5. **Columns:** #, Recipe Name, Qty, Unit, Prep Time, Cook Time, Serves, Ingredients (count badge + expand), Cost (read-only), Margin % (read-only, color-coded)
6. **Ingredient sub-table:** Ingredient dropdown, Quantity input, Unit, Delete button, + Add Ingredient
7. **Toolbar:** Search, Columns toggle, Excel export, Import, + Add Recipe, Batch Save (activates on edit)
8. **Dense grid** — 1px borders, compact h-8 inputs, transparent borders until hover/focus
9. **Margin color coding:** green ≥80%, orange ≥70%, red <70%

---

## Fast Lane Eligibility: NO
- New component (~400-600 lines)
- Multiple files
- Full gate flow required

---

## Next: Planning Gate 2 (after owner resolves OQs)
