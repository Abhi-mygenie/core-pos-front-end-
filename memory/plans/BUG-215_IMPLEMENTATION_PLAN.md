# BUG-215 — Inline Validation Errors on Recipe Form — IMPLEMENTATION PLAN (Gate 3)

**Date:** 2026-07-23 (Session E) | **Impact:** `/app/memory/BUG-215_IMPACT_ANALYSIS.md` (approved) | **Risk:** LOW
**Entry verification:** PASS 2026-07-23 — lines 91-96, 116, 141, 147, 156 match.

## Dependencies / Wave
WAVE 1 — **IMPLEMENT FIRST** in the RecipeFormPanel cluster: establishes the inline-error pattern that BUG-217's Unit guard must adopt (see BUG-217 plan Variant A).

## Scope Lock
WILL change: `components/inventory/RecipeFormPanel.jsx` only. WILL NOT touch: save payload, transforms, API error semantics (readableMessage stays).

## Edits (exact — from approved impact doc, verbatim Fixes A-D)
1. **Line ~22** add state: `const [errors, setErrors] = useState({}); // BUG-215`
2. **Lines 91-96** replace 4 toast-guards with error-collection block (impact doc Fix B verbatim) — collect `newErrors.{name,foodId,addonId,ingRows}`, single `toast.error('Please fix the highlighted fields')`, `setErrors(newErrors); return;` else `setErrors({})`.
   **BUG-217 coordination:** when adding this block, ALSO include `if (!unit) newErrors.unit = 'Unit is required';` ONLY if BUG-217 is implemented in the same session (per its plan Variant A); otherwise leave for 217.
3. **Fix C** — conditional red borders + `<p className="text-xs text-red-500 mt-1">` under: Name input (:141), Addon select (:147), Food select (:156); error banner above ingredients table for `errors.ingRows`.
4. **Fix D** — clear field error in each onChange (name/foodId/addonId).
Add `data-testid="recipe-error-{field}"` to each error `<p>` (testing mandate).

1 file, ~25-30 lines.

## Verification Matrix
| # | Verify | How | Auto? |
|---|---|---|---|
| 1 | Blank name → red border + persistent inline text | Browser | NO |
| 2 | Fix name → error clears on change | Browser | NO |
| 3 | Standard w/o food → food select highlighted | Browser | NO |
| 4 | No ingredients → banner above table | Browser | NO |
| 5 | Regression: valid save works all 3 types | Browser + 1 preprod save (delete test row after) | NO |

## Risk Register
Purely additive UX; guard ORDER unchanged. Interaction: BUG-217 adds a 5th guard — same block (see coordination note).

## Registry Checklist
- [ ] registry.json BUG-215 → IMPLEMENTED, pos_5_0  - [ ] BUG_TRACKER row  - [ ] FILE_OWNERSHIP  - [ ] `// BUG-215` markers  - [ ] webpack clean

*Gate 3 complete. Awaiting Gate 4 GO.*
