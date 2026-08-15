# BUG-216 — Recipe Ingredient Row Shows Base Unit, Should Show Small Unit — IMPACT ANALYSIS (Gate 2)

**ID:** BUG-216
**Title:** Recipe Ingredient Row Shows Base Unit
**Priority:** P2 (MEDIUM)
**Risk:** HIGH — UPGRADED from MEDIUM (intake). Rationale: `row.unit` is NOT display-only — it is saved in the recipe payload (`RecipeFormPanel.jsx:103` → `ingredients[].unit`) and consumed by backend stock-deduction math. Wrong unit changes deduction quantities by the conversion factor (data-integrity, not cosmetics). R21 upgrade, agent-permitted.
**Date:** 2026-07-23 (session continuation)
**Analyst:** PLANNING agent (Gate 2)
**Code Reality:** CONFIRMED — lines verified this session; plus a SIBLING instance of the same bug found in `RecipeBulkEditor.jsx:183-186` (not in intake).
**Conflict Pre-Check:** `RecipeBulkEditor.jsx` is ALSO in BUG-222's WILL-change list (Gate 2 approved, Batch 4). Different functions: BUG-222 = export/import/toolbar; BUG-216 sibling fix = `updateIng` autofill (line 185). Parallel-safe; declare both in FILE_OWNERSHIP at implementation. `RecipeFormPanel.jsx` is also target of BUG-214/BUG-215 (Batch 2, Gate 2 approved — silent catch + validation display; different lines/functions). Execution note: implement Batch 2 + BUG-216 edits in one session or sequentially.

---

## 1. Data Flow Trace

```
RecipeFormPanel.jsx:82-84 updateIngRow('ingredientId', ...)
  → ing = ingredients.find(...)   (ingredients from getIngredients() — has unit, smallUnit)
  → updated.unit = ing.unit                       ← BREAK POINT: autofills BASE unit
  → :225 row badge shows {row.unit} → "bundle"/"kg" (owner sees recipe-ish unit)
  → :217 dropdown label "{ing.name} ({ing.unit})" → base unit reinforces confusion
  → handleSave :103 ingredients[].unit = r.unit    ← SAVED to backend (store/update recipe)
  → backend deduction consumes ingredient_unit
SIBLING: RecipeBulkEditor.jsx:183-186 updateIng → if master found: next.unit = master.unit  ← same base-unit autofill
```

**Preprod data evidence (curl 2026-07-23, 92 recipes, 346 ingredient rows):**
`ingredient_unit` distribution = `{ gm: 256, piece: 75, ml: 14, pieces: 1 }` — **100% small units, zero base units (no kg/bundle/ltr).**
Conclusion: production data convention IS small units (consistent with Path X: `cal_quantity` always in small_unit). The form's base-unit autofill produces outlier rows; the fix ALIGNS the form with existing data, it does not migrate anything.
Evidence: `/app/memory/evidence/BUG-216/get_recipe_response.json`

**BUG-225 tie-in:** the "ghee dosa (bundle)" row cited in BUG-225 intake no longer exists in any recipe (verified this session — data changed since 2026-07-22). The display rule fix remains valid.

---

## 2. Exact Lines

### RecipeFormPanel.jsx:84 (current)
```js
if (ing) updated.unit = ing.unit;
```
→ `if (ing) updated.unit = ing.smallUnit || ing.unit;`

### RecipeFormPanel.jsx:217 (current)
```js
{ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
```
→ label shows `({ing.smallUnit || ing.unit})`

### RecipeFormPanel.jsx:225 — row badge `{row.unit || '—'}` — correct as-is once autofill fixed. Editing an EXISTING recipe keeps its saved unit (already small-unit per data evidence) — no touch.

### RecipeBulkEditor.jsx:185 (sibling, current)
```js
if (master) { next.unit = master.unit; }
```
→ `next.unit = master.smallUnit || master.unit;` (verify `getIngredients()` transform exposes `smallUnit` on master rows — it does, same source as form)

---

## 3. Files WILL Change / WILL NOT Touch

**WILL change (Gate 3):**
- `components/inventory/RecipeFormPanel.jsx` — 2 lines (84, 217)
- `components/inventory/RecipeBulkEditor.jsx` — 1 line (185) — sibling fix, same defect class

**WILL NOT touch:**
- Save payload structure (line 103) — unchanged; only the VALUE flowing into it changes
- Backend contracts, transforms, `units` master list
- Existing recipes' stored units (no migration — data already small-unit)

---

## 4. Risk Classification

**HIGH** (upgraded — header). QA MUST include one end-to-end verification: save a recipe with an ingredient whose smallUnit ≠ unit (e.g., kg/gm), confirm backend accepts and the recipe view + DCR/deduction reflect gm quantities correctly. Regression: edit-existing-recipe flow keeps stored units; RecipeBulkEditor batch save (BUG-206 path) unaffected.

---

## 5. Owner Decision Queue

No owner decisions required. (Direction is data-confirmed: recipes store small units.)

---

## 6. Effort Estimate

- Files: 2 · Lines: 3 · Test: browser (select ingredient → unit badge shows small unit; save; reopen) + 1 E2E deduction spot-check + unit distribution re-curl after QA save
