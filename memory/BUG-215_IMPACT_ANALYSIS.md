# BUG-215 — Impact Analysis
**Gate:** 2
**Produced:** 2026-07-22
**Agent Role:** PLANNING

---

## Header

| Field | Value |
|---|---|
| ID | BUG-215 |
| Title | Recipe Forms — Validation Errors Not Shown on Save Failure |
| Priority | P1 |
| Code Reality | **CONFIRMED** — `RecipeFormPanel.jsx:91-96` all 5 validation guards use `toast.error()` only; `RecipeFormPanel.jsx:116` API error also `toast.error()` only. Zero `errorState` or conditional `border-red-*` classes anywhere. |
| Conflict Pre-Check | `RecipeFormPanel.jsx` — 0 other open items. **CLEAR.** BUG-214 in same batch modifies line 51 and 150 (different sections). Parallel-safe. |

---

## Data Flow Trace

```
RecipeFormPanel.jsx:90 — handleSave()
  Line 91: !name.trim()           → toast.error('Recipe name is required')       return
  Line 93: !foodId (standard)     → toast.error('Select a menu item...')         return
  Line 94: !addonId (addon)       → toast.error('Select an addon item...')       return
  Line 96: validIngs.length === 0 → toast.error('Add at least one ingredient')   return
  Line 116: API error             → toast.error(err?.readableMessage || '...')    catch

All 5 paths: toast fires (3-5 sec) then vanishes. Field stays un-highlighted.
Owner clicks Save, sees toast, toast fades — owner doesn't know which field to fix.
```

---

## Exact Lines to Change

**File:** `components/inventory/RecipeFormPanel.jsx`

### Fix A — Add `errors` state (line 22, after existing state declarations)
```js
const [errors, setErrors] = useState({});
```

### Fix B — Replace validation guards in `handleSave()` (lines 91-96)
```js
// CURRENT:
if (!name.trim()) { toast.error('Recipe name is required'); return; }
if (recipeType === 'standard' && !foodId) { toast.error('Select a menu item for this recipe'); return; }
if (recipeType === 'addon' && !addonId) { toast.error('Select an addon item for this recipe'); return; }
const validIngs = ingRows.filter(r => r.ingredientId && Number(r.quantity) > 0);
if (validIngs.length === 0) { toast.error('Add at least one ingredient'); return; }

// FIX:
const newErrors = {};
if (!name.trim()) newErrors.name = 'Recipe name is required';
if (recipeType === 'standard' && !foodId) newErrors.foodId = 'Select a menu item';
if (recipeType === 'addon' && !addonId) newErrors.addonId = 'Select an addon item';
const validIngs = ingRows.filter(r => r.ingredientId && Number(r.quantity) > 0);
if (validIngs.length === 0) newErrors.ingRows = 'Add at least one ingredient';
if (Object.keys(newErrors).length > 0) {
  setErrors(newErrors);
  toast.error('Please fix the highlighted fields');
  return;
}
setErrors({});
```

### Fix C — Apply conditional border to inputs (3 fields)
```jsx
// Recipe Name input (line 141) — add to className:
className={`mt-1 ${inputCls} ${errors.name ? 'border-red-400 focus:border-red-400' : ''}`}
// Add error text below:
{errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}

// Food item select (line 156) — add to className:
className={`mt-1 ${selectCls} ${errors.foodId ? 'border-red-400' : ''}`}
{errors.foodId && <p className="text-xs text-red-500 mt-1">{errors.foodId}</p>}

// Addon item select (line 147):
className={`mt-1 ${selectCls} ${errors.addonId ? 'border-red-400' : ''}`}
{errors.addonId && <p className="text-xs text-red-500 mt-1">{errors.addonId}</p>}

// Ingredient table header — add error banner above table if errors.ingRows:
{errors.ingRows && (
  <p className="text-xs text-red-500 px-5 py-2 bg-red-50">{errors.ingRows}</p>
)}
```

### Fix D — Clear field error on change
```jsx
// Name input onChange:
onChange={e => { setName(e.target.value); setErrors(p => ({...p, name: undefined})); }}

// Food select onChange:
onChange={e => { setFoodId(e.target.value); setErrors(p => ({...p, foodId: undefined})); }}

// Addon select onChange:
onChange={e => { setAddonId(e.target.value); setErrors(p => ({...p, addonId: undefined})); }}
```

---

## Risk Classification: **LOW**
- Blast radius: 1 file (`RecipeFormPanel.jsx`), ~25-30 lines
- No API changes, no data model changes
- Pattern is additive (adds error state, no existing logic removed)
- Regression risk: NONE — only changes UX of validation, not logic

---

## Owner Decision Queue

**No owner decisions required.** Standard inline error pattern.

---

## Effort Estimate
- Files: 1 (`RecipeFormPanel.jsx`)
- Lines: ~25-30 added/changed
- Test: Submit form with blank name → red border + error text stays visible; fix name → error clears; re-submit with no food → food select highlighted
- Risk: LOW
