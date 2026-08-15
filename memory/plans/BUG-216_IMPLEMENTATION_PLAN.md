# BUG-216 — Recipe Ingredient Autofill Small Unit — IMPLEMENTATION PLAN (Gate 3)

**Date:** 2026-07-23 (Session E) | **Impact:** `/app/memory/impact/BUG-216_IMPACT_ANALYSIS.md` (approved, risk HIGH) | **Risk:** HIGH
**Entry verification:** PASS 2026-07-23 — RecipeFormPanel:84 (`if (ing) updated.unit = ing.unit;`), :217 option label, RecipeBulkEditor:185 (`if (master) { next.unit = master.unit; }`) all match.

## Dependencies / Wave
WAVE 1 (RecipeFormPanel cluster; last in order 215→217→214→216). RecipeBulkEditor edit lands BEFORE BUG-222's Wave-3 rework of the same file (declare in FILE_OWNERSHIP).

## Scope Lock
WILL change: `RecipeFormPanel.jsx` (2 lines), `RecipeBulkEditor.jsx` (1 line). WILL NOT touch: save payload structure (:103), stored units of existing recipes (no migration — data already 100% small units), units master, transforms.

## Edits (exact)
1. **RecipeFormPanel.jsx:84**: `if (ing) updated.unit = ing.unit;` → `if (ing) updated.unit = ing.smallUnit || ing.unit; // BUG-216`
2. **RecipeFormPanel.jsx:217**: option label `({ing.unit})` → `({ing.smallUnit || ing.unit})` `{/* BUG-216 */}`
3. **RecipeBulkEditor.jsx:185**: `if (master) { next.unit = master.unit; }` → `if (master) { next.unit = master.smallUnit || master.unit; } // BUG-216` (transform exposes smallUnit — verified, same getIngredients source)

2 files, 3 lines.

## Verification Matrix
| # | Verify | How | Auto? |
|---|---|---|---|
| 1 | Form: select kg/gm ingredient → row badge shows 'gm' | Browser | NO |
| 2 | Bulk editor: same autofill behavior | Browser | NO |
| **3 CRITICAL** | E2E deduction integrity: save test recipe with smallUnit≠unit ingredient → curl recipe → `ingredient_unit='gm'`; spot-check DCR/deduction math; DELETE test recipe after | curl + browser | NO |
| 4 | Regression: edit existing recipe keeps stored unit (autofill only fires on ingredient re-select) | Browser | NO |
| 5 | Post-QA: re-curl unit distribution — still 100% small units | curl | YES |

## Risk Register
HIGH — `row.unit` is SAVED and feeds backend stock-deduction math. Mitigation: CRITICAL test #3 mandatory before QA handover. R13: include one walk-in-adjacent recipe check if applicable.

## Registry Checklist
- [ ] registry.json BUG-216 → IMPLEMENTED, pos_5_0 (also close BUG-225 as subsumed at QA PASS)  - [ ] BUG_TRACKER rows (216 + 225 note)  - [ ] FILE_OWNERSHIP both files  - [ ] `// BUG-216` markers  - [ ] webpack clean

*Gate 3 complete. Awaiting Gate 4 GO.*
