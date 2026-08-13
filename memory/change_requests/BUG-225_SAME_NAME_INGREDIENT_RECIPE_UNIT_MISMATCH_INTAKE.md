# BUG-225 — Same Name Appears as Ingredient + Recipe; Unit Mismatch Across Screens

**ID:** BUG-225
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P2 (MEDIUM)
**Risk:** MEDIUM
**Module:** Inventory — Recipe Management + Ingredients Setup (cross-screen)
**Duplicate Check:** NONE — fresh cross-screen data classification issue.
**Code Reality:** CONFIRMED (data + display issue traced via preprod API 2026-07-22). Ingredient "ghee dosa" (ID 18523, type: inventory, unit: bundle, small_unit: piece, converion_factor: null) is used as an ingredient row inside the "Ajwain Paratha" standard recipe. It is NOT a standalone recipe. The confusion arises because: (1) the ingredient row in the recipe form shows unit "bundle" (base unit — BUG-216 overlap) instead of "piece" (small unit); (2) `converion_factor: null` confirms BUG-226 for this item too. No separate food item named "ghee dosa" exists in the menu.
**Source:** OWNER-REPORTED (session 2026-07-22, verbatim: "ghee dosa in ingrients is in budle but in recipe it shows as recipes")
**Confidence:** CONFIRMED (preprod API curl-verified — ingredient ID 18523, recipe ID 8362 "Ajwain Paratha")

---

## Description

**Root cause confirmed via preprod API (2026-07-22):**

Ingredient **"ghee dosa"** (ID: 18523, type: `inventory`, unit: `bundle`, small_unit: `piece`, `converion_factor: null`) is used as an ingredient row **inside the "Ajwain Paratha" standard recipe** (recipe_id: 8362).

The owner's confusion comes from:
1. In the **Ingredients tab**: "ghee dosa" appears as `bundle` (base unit)
2. In the **Recipe view for "Ajwain Paratha"**: "ghee dosa" appears as an ingredient with `ingredient_unit: "bundle"` — the owner sees this and thinks "ghee dosa" is being treated as a recipe/food item rather than a raw ingredient

**Why it "shows as recipe":** The RecipeFormPanel ingredient row displays `{row.unit}` which is the **base unit** (`bundle`) — not the small unit (`piece`). This makes a bundled ingredient look like a recipe-type item. This overlaps with **BUG-216** (recipe rows should show `smallUnit` not `unit`).

**Additional finding:** `converion_factor: null` for "ghee dosa" confirms **BUG-226** is active on this ingredient — conversion factor was never saved.

**Unit mismatch:** The ingredient shows `bundle` in both screens (no actual mismatch) but the recipe context makes `bundle` look wrong for an ingredient quantity — fixing BUG-216 will resolve the visual confusion by showing `piece` instead of `bundle` in recipe rows.

---

## Evidence

- Preprod API `GET /api/v2/vendoremployee/inventory/get-inventory-master` — "ghee dosa" found: `{ id: 18523, stock_title: "ghee dosa", type: "inventory", unit: "bundle", small_unit: "piece", converion_factor: null, quantity: "-13.00" }`
- Preprod API `GET /api/v2/vendoremployee/recipe/get-recipe` — "ghee dosa" NOT in recipe list as a standalone recipe
- "ghee dosa" appears as `ingredient_name: "ghee dosa", ingredient_unit: "bundle"` inside recipe_id 8362 ("Ajwain Paratha")
- No food item called "ghee dosa" found in menu (active foods check)
- `converion_factor: null` confirms BUG-226 co-occurrence on this ingredient
- `quantity: "-13.00"` — negative stock, likely from test/incorrect adjustments

---

## Blast Radius

- 1 file primary: `RecipeFormPanel.jsx` — BUG-216 fix (show `smallUnit` instead of `unit` in ingredient rows) resolves the visual confusion
- 0 additional files needed for the "same name" part — no duplicate record exists, purely a display issue
- Scope: SMALL (subsumed by BUG-216 fix)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. **BUG-216 fix resolves this** — when recipe ingredient rows show `small_unit` (`piece`) instead of base unit (`bundle`), "ghee dosa" will display as `1 piece` in the recipe, not `1 bundle`
2. No separate code change needed for BUG-225 beyond BUG-216
3. For the negative stock (`-13.00`): owner should manually correct via Stock Audit panel — this is a data issue, not a code issue
4. To prevent future confusion: optionally add a tooltip/badge on recipe ingredient rows distinguishing ingredient type (`inventory` vs `sub-recipe`)

---

## Next
Planning Gate 2 → Gate 3 → Implementation
