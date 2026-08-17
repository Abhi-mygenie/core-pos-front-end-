# BUG-214 — Addon Recipe Dropdown Shows Menu Items Instead of Addon Items

**ID:** BUG-214
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P1 (HIGH)
**Risk:** HIGH
**Module:** Inventory — Recipe Management (Addon Recipes)
**Duplicate Check:** RELATED to BUG-197 (B2-4 addon dropdown fix — partially shipped). DISTINCT: previous fix added fallback `addons.length > 0 ? addons : foods` which is the root cause here.
**Code Reality:** CONFIRMED — `RecipeFormPanel.jsx:150` fallback `(addons.length > 0 ? addons : foods)` causes menu items to show when addon list fails to load or returns empty.
**Source:** OWNER-REPORTED (session 2026-07-22)
**Confidence:** CONFIRMED (code verified)

---

## Description

When creating or editing an **Addon Recipe**, the linked-item dropdown should show only **addon items** (from `/api/v2/vendoremployee/getActiveAddons` or equivalent). Instead, it falls back to showing **menu food items** (same list used for standard recipes).

Root cause: `RecipeFormPanel.jsx:150`
```jsx
{(addons.length > 0 ? addons : foods).map(a => <option .../>)}
```
- `addons` is loaded via `recipeService.getActiveAddons()` inside a try/catch that silences all errors (`catch { /* addon list optional */ }`)
- If the API fails, returns empty, or returns non-array, `addons` stays `[]` → fallback to `foods`
- Owner sees a dropdown populated with menu items (dosa, burger, etc.) instead of addon items (extra cheese, extra sauce, etc.)

---

## Evidence

- Code: `RecipeFormPanel.jsx:49-55` — `getActiveAddons()` wrapped in try/catch with silent failure
- Code: `RecipeFormPanel.jsx:150` — fallback `(addons.length > 0 ? addons : foods)` confirmed
- Owner-reported: "ghee dosa in ingredients is in bundle but in recipe it shows as recipes"
- API: `recipeService.getActiveAddons()` endpoint exists

---

## Blast Radius

- 1 file: `RecipeFormPanel.jsx`
- ~5-10 lines change
- Hotspot: NO
- Scope: SMALL (1 file)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Remove fallback to `foods` in addon dropdown — show only `addons` array
2. If `addons` is empty after load, show a disabled placeholder: "No addon items found — add addon items first"
3. Optionally: surface error if `getActiveAddons()` fails (remove silent catch)

---

## Next
Planning Gate 2 → Gate 3 → Implementation
