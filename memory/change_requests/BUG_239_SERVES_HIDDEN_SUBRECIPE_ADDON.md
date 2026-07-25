# BUG-239: Recipe Form — Hide Serves Field for Sub-Recipe & Addon (Default 1)

**Registered:** 2026-07-24
**Source:** OWNER-REPORTED (screenshot evidence)
**Classification:** BUG
**Severity:** P2
**Risk:** LOW
**Duplicate Check:** DISTINCT
**Code Reality:** NONE — bug still present
**Fast Lane Eligible:** YES (1 file, ~3 lines, non-financial, non-hotspot)
**Investigation:** Completed in session 2026-07-24 — confirmed Serves is semantically meaningless for sub/addon

---

## Summary

The "Serves" field is visible on the recipe form for ALL recipe types. For sub-recipes (intermediate components like sauces/doughs) and addon recipes (individual toppings), "Serves" is meaningless. Owner directive: hide for sub/addon, always pass default `1`.

## Root Cause

`RecipeFormPanel.jsx:294-296` — Serves `<Input>` rendered unconditionally. Should only show for `recipeType === 'standard'`.

## Fix

- **L294-297**: Wrap in `{recipeType === 'standard' && ( ... )}` conditional
- Transform already defaults to `1` via `data.servePeople || 1` — no API change needed

## Evidence

- Screenshot: "Create Addon Recipe" form showing Serves field (owner-highlighted)
- Code: `recipeTransform.js` L155/174/193/211 — all use `|| 1` default

## Next

Owner approved direct bug fix.
