# BUG-207: RecipeBulkEditor Cost=₹0 and Margin=100% — Ingredient Cost Data Missing

**ID:** BUG-207
**Type:** BUG (DATA_GAP — API does not return ingredient cost)
**Priority:** P1 (HIGH — display wrong, but does not block save once BUG-206 is fixed)
**Risk:** MEDIUM (display-only, no data corruption risk)
**Sprint:** POS 5.0
**Source:** QA-FOUND (CR-073 mockup comparison 2026-07-19)
**Parent:** CR-073

---

## Description

RecipeBulkEditor shows **₹0 cost** and **100% margin** for ALL recipes. The frozen mockups (`recipe_bulk_editor_mockup.html` + `cr072-inventory-mockup-v5-full.html#screen-recipes`) show real cost values (₹78, ₹42, ₹85 etc.) and varied margins (74%, 86%, 72% etc.) with color-coded bands.

---

## Code Reality: PARTIAL

The code DOES compute cost + margin:
- `RecipeBulkEditor.jsx` L107-115: `cost = sum(ing.cost * ing.quantity)`, `margin = (price - costPerServe) / price * 100`
- Margin bands implemented per ruling FB-7-Q2: ≥50% green, 30-49% amber, <30% red

But the input data has no cost field, so the formula always evaluates to 0.

---

## Duplicate Check: DISTINCT

No prior registration of ingredient cost gap in recipe context.

---

## Evidence

- **API curl:** `GET /api/v2/vendoremployee/recipe/get-recipe` returns ingredients with keys: `ingredient_id`, `ingredient_name`, `ingredient_qty`, `ingredient_unit` — **NO `cost` field**.
- **Mockup:** Shows ₹78, ₹42, ₹85, ₹55, ₹68 — implies ingredient costs were available during mockup design (hard-coded in mockup JS).
- **Screenshot comparison:** `/app/memory/test_reports/MOCKUP_VS_LIVE_GAP_ANALYSIS_2026_07_19.md`

---

## Root Cause Investigation (2 hypotheses)

### H1: FE cross-join with inventory master (FE-fixable)
`RecipeBulkEditor.jsx` already loads `ingredientsMaster` via `inventoryService.getIngredients()` on mount (L82-88). If this master list contains `cost` or `unit_price` per ingredient, the fix is to match by `ingredient_id` and populate cost from master.

**Status:** NEEDS 1 CURL CHECK — does `get-inventory-master` return cost per ingredient?

### H2: Backend enrichment needed (BACKEND-BLOCKED)
If `get-inventory-master` does NOT return cost, then:
- Backend needs to either add `cost` to `get-recipe` ingredient response, OR
- Provide a dedicated `get-ingredient-costs` endpoint

**Status:** Falls to backend brief if H1 fails.

---

## Blast Radius

- **If H1 (FE fix):** 1 file, ~15 lines (`RecipeBulkEditor.jsx` — enrich ingredient cost from master)
- **If H2 (backend):** Backend brief + 1 FE file after endpoint ships
- **Hotspot files:** NO
- **Estimated scope:** SMALL

---

## Owner Ruling (2026-07-19)

- **Cost source:** (a) Last purchase rate from `vendor-item-list` endpoint
- **Coverage:** 39/69 recipe ingredients (56%) have purchase history with `unit_price`
- **Uncovered ingredients:** Show "—" (no cost)
- **Recipe-level rule:** If ANY ingredient in a recipe lacks a rate → show "—" for that recipe's cost and margin. Don't show partial/approximate cost.
- **Not backend-blocked:** FE can cross-join `vendor-item-list` → recipe ingredients entirely client-side

## Investigation Outcome (2026-07-19)

- **H1 (ingredientsMaster has cost): ELIMINATED** — no cost field
- **H2 (backend enrichment): NOT NEEDED** — `vendor-item-list` provides last purchase rate per ingredient_id
- **H3 (FE cross-join with vendor-item-list): CONFIRMED** — 1,146 purchase records, 48 ingredients with non-zero unit_price, 39/69 recipe ingredients covered

## Planning Skip Eligibility

✅ ~20-25 lines · ✅ 1 file (+ 1 extra API call in existing useEffect) · ✅ not hotspot · ✅ not financial
**ELIGIBLE for DIRECT_BUG_FIX** — owner approved.

---

## Next: Direct Bug Fix → BUG FIX role
