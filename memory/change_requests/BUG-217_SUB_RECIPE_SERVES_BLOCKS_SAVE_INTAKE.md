# BUG-217 — Sub-Recipe "Serves" Field Not Required But Blocks Save

**ID:** BUG-217
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P2 (MEDIUM)
**Risk:** MEDIUM
**Module:** Inventory — Recipe Management (RecipeFormPanel — sub-recipe type)
**Duplicate Check:** NONE — not addressed in BUG-197.
**Code Reality:** PARTIAL — `RecipeFormPanel.jsx` frontend has no required-guard for `servePeople` on sub-recipes. Backend API likely enforces `serves_people` as required, returning 422 which the frontend surfaces as a generic "Failed to save recipe" toast. Owner sees a block with no clear reason.
**Source:** OWNER-REPORTED (session 2026-07-22)
**Confidence:** REPORTED (backend 422 not curl-verified this session — needs confirmation)

---

## Description

When saving a **Sub-Recipe**, the "Serves" / `serve_people` field is presented as an optional input in the UI but the backend returns a save failure (assumed 422) when it is blank. Owner fills in the sub-recipe form, leaves "Serves" blank (appears optional), clicks Save, and gets a generic error.

- Frontend validation at `RecipeFormPanel.jsx:91-96` does NOT check `servePeople > 0` for sub-recipes
- `servePeople: Number(servePeople)` is always passed — if blank input, this becomes `NaN` or `0`
- Backend behaviour: TBD (needs curl verification — may treat `0` as invalid)

---

## Evidence

- Code: `RecipeFormPanel.jsx:91-96` — no `servePeople` validation guard
- Code: `RecipeFormPanel.jsx:102` — `servePeople: Number(servePeople)` — blank becomes `0` or `NaN`
- Owner-reported: sub-recipe save blocked
- Backend endpoint: sub-recipe save (`POST /api/v2/vendoremployee/recipe/store-sub-recipe` or equivalent)

---

## Blast Radius

- 1 file: `RecipeFormPanel.jsx`
- ~5 lines change (add frontend validation for servePeople when recipeType === 'sub')
- May need backend curl verification first
- Hotspot: NO
- Scope: SMALL (1 file)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Curl-verify: does backend require `serves_people > 0` for sub-recipe? Capture response code.
2. If backend requires: add frontend guard — `if (recipeType === 'sub' && !Number(servePeople)) { toast.error('Serves is required for sub-recipes'); setErrors({servePeople: 'Required'}); return; }`
3. Add asterisk (*) to Serves label for sub-recipe type
4. If backend does NOT require: mark field truly optional and ensure `0` or blank passes silently

---

## Next
Planning Gate 2 → Gate 3 → Implementation
