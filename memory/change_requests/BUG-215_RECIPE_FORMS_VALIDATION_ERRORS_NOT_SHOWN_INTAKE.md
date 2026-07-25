# BUG-215 — Recipe Forms: Validation Errors Not Shown on Save Failure

**ID:** BUG-215
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P1 (HIGH)
**Risk:** MEDIUM
**Module:** Inventory — Recipe Management (RecipeFormPanel)
**Duplicate Check:** NONE — fresh issue on form UX.
**Code Reality:** CONFIRMED — `RecipeFormPanel.jsx:91-116` uses only `toast.error()` for validation feedback. Zero inline red-border / error-span field indicators.
**Source:** OWNER-REPORTED (session 2026-07-22)
**Confidence:** CONFIRMED (code verified)

---

## Description

When saving a recipe fails (either frontend validation or API error), the only feedback is a transient toast notification. There are **no inline error indicators** on the offending fields (no red border, no error message below inputs). Owner misses which field failed and why.

Affected scenarios:
- Recipe name blank → `toast.error('Recipe name is required')`
- No menu item selected (standard recipe) → `toast.error('Select a menu item...')`
- No addon item selected (addon recipe) → `toast.error('Select an addon item...')`
- No ingredients added → `toast.error('Add at least one ingredient')`
- API save failure → `toast.error(err?.readableMessage || 'Failed to save recipe')`

All 5 cases are toast-only — no field stays highlighted after the toast fades.

---

## Evidence

- Code: `RecipeFormPanel.jsx:91-96` — validation block, all `toast.error()` only
- Code: `RecipeFormPanel.jsx:116` — API error handler, `toast.error()` only
- No `errorState`, no `hasError`, no `border-red-500` class conditionals anywhere in the file

---

## Blast Radius

- 1 file: `RecipeFormPanel.jsx`
- ~25-30 lines change (add error state, apply conditional border classes)
- Hotspot: NO
- Scope: SMALL (1 file)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Add `errors` state: `const [errors, setErrors] = useState({})`
2. Replace each `toast.error(...)` validation guard with `setErrors({field: 'message'})` + toast
3. Apply `border-red-500` class to inputs conditionally based on `errors` state
4. Clear field error on change: `onChange={() => setErrors(p => ({...p, field: undefined}))}`

---

## Next
Planning Gate 2 → Gate 3 → Implementation
