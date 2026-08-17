# BUG-216 — Recipe Ingredient Row Shows Base Unit, Should Show Small Unit

**ID:** BUG-216
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P2 (MEDIUM)
**Risk:** MEDIUM
**Module:** Inventory — Recipe Management (RecipeFormPanel)
**Duplicate Check:** NONE — distinct from BUG-197 unit issues.
**Code Reality:** CONFIRMED — `RecipeFormPanel.jsx:84` sets `updated.unit = ing.unit` (base unit). `ing.smallUnit` exists but is not offered as the recipe-quantity unit. `RecipeFormPanel.jsx:217` dropdown shows `({ing.unit})` confirming base unit display.
**Source:** OWNER-REPORTED (session 2026-07-22)
**Confidence:** CONFIRMED (code verified)

---

## Description

In the Recipe Ingredient table, each row has a **unit** column/badge. When an ingredient is selected from the dropdown, the row's unit auto-fills with the ingredient's **base unit** (`ing.unit`). 

For costing and recipe accuracy, recipes should typically express quantities in the **small unit** (e.g., grams instead of kg, ml instead of litre). The `ing.smallUnit` field exists on every ingredient object but is never offered as the row unit.

Specific code path:
- `RecipeFormPanel.jsx:84`: `if (ing) updated.unit = ing.unit;` — auto-fills base unit on ingredient select
- `RecipeFormPanel.jsx:217`: `<option ...>{ing.name} ({ing.unit})</option>` — shows base unit in ingredient dropdown

---

## Evidence

- Code: `RecipeFormPanel.jsx:84` — `updated.unit = ing.unit`
- Code: `RecipeFormPanel.jsx:217` — `({ing.unit})` in ingredient option label
- Code: `RecipeFormPanel.jsx:225` — row unit badge displays `{row.unit || '—'}` with no small-unit option

---

## Blast Radius

- 1 file: `RecipeFormPanel.jsx`
- ~5-8 lines change (auto-fill small unit, update unit display)
- Hotspot: NO
- Scope: SMALL (1 file)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Change auto-fill: `updated.unit = ing.smallUnit || ing.unit` (prefer small unit, fallback to base)
2. Update ingredient option label to show small unit: `{ing.name} ({ing.smallUnit || ing.unit})`
3. Unit badge on row: display `row.unit` as-is (already correct once auto-fill is fixed)

---

## Next
Planning Gate 2 → Gate 3 → Implementation
