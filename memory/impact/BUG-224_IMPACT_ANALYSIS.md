# BUG-224 — Smart Purchase: Ingredients Without Recipes Never Appear — IMPACT ANALYSIS (Gate 2)

**ID:** BUG-224
**Title:** Smart Purchase Ingredients Without Recipes
**Priority:** P2 (MEDIUM)
**Risk:** HIGH — UPGRADED from MEDIUM (intake). Rationale: adds new rows to the purchase submission flow (feeds `add-purchase` financial write) AND amends locked owner ruling B2 (R21 upgrade, agent-permitted).
**Date:** 2026-07-23 (session continuation)
**Analyst:** PLANNING agent (Gate 2)
**Code Reality:** CONFIRMED — mechanism verified this session and is more precise than intake described (see trace). No fix code exists.
**Conflict Pre-Check:** No active conflicts. `purchasePlanner.js` (CR-078, pure function), `SmartPurchasePanel.jsx` (CR-078/CR-085, QA PASS). SHARED FILE with BUG-227: `SmartPurchasePanel.jsx` — different functions (BUG-224: computePlan call/row build; BUG-227: vendor fetch/map). Plan-safe in parallel; implement in one session or sequentially with FILE_OWNERSHIP note.

---

## 1. Data Flow Trace (corrected vs intake)

Intake said "computePlan only processes ingredients in dcrStockSummary". **Code reality is subtler** (R1 — code is truth):

```
purchasePlanner.js:107 computePlan({ stockInventory, dcrStockSummary, horizonDays })
  → :112 maps over ALL stockInventory rows (every ingredient IS processed)
  → :122 dcrRow = dcrByIngredient.get(id) → undefined for no-recipe/no-consumption items
  → :123 computeVelocity(undefined, ...) → returns 0
  → :124-125 projected = 0 → gap = onHand - 0 = onHand ≥ 0 (even when onHand = 0 → gap = 0)
  → :139 rows.filter(r => r.gap < 0)   ← BREAK POINT: B2 filter drops ALL such rows
```
An ingredient with zero recipes/consumption can NEVER have gap < 0, even at 0 stock — so it never appears, regardless of `minQtyAlert`/`minUnitAlert`. Thresholds are never consulted by the planner.

**Data availability (verified in code):** `fromAPI.stockItems` (inventoryTransform.js:47-72) ALREADY delivers `minQtyAlert` (line 71) and `minUnitAlert` (line 72) plus `calQuantity` (small-unit on-hand) on every stock row. **No new fetch is required** — intake's step "fetch ingredientsMaster" is unnecessary (it is also already fetched at SmartPurchasePanel.jsx:39 for other purposes).

---

## 2. Exact Lines

### purchasePlanner.js:107-140 computePlan (current)
Velocity-only need model + B2 filter.
→ Needs (Gate 3 sketch): after building velocity rows, add a second pass over `stockInventory`:
```
stock-alert candidates = items where isSubRecipe !== true
  AND item is NOT already in the gap<0 result
  AND threshold > 0 AND onHand(calQuantity) < threshold
threshold (small-unit domain) = minUnitAlert || (minQtyAlert × conversionFactor)   ← semantics pending owner Q1
row: { ...same shape, origin: 'stock_alert', velocity_per_day: 0, projected_need: threshold,
       gap: onHand - threshold (negative), suggest_qty: ceil(threshold - onHand) }
```
Planner rows gain `origin: 'planner' | 'stock_alert'` (SmartPurchasePanel.jsx:57 already stamps `origin: 'planner'` — move/merge stamp into planner or keep panel-side).

### SmartPurchasePanel.jsx:42-59 (current)
`computePlan` call + row build → minimal change: rows from stock_alert origin flow through the SAME vendor ranking / qty / submit pipeline (no special-casing in submit).

### AutoShoppingList.jsx (display)
Optional badge for `origin === 'stock_alert'` rows ("Low stock" vs velocity columns showing 0). ~5 lines. Verify columns render sensibly with velocity 0.

---

## 3. Files WILL Change / WILL NOT Touch

**WILL change (Gate 3):**
- `utils/purchasePlanner.js` — stock-alert second pass (~15-18 lines, pure function → unit-testable)
- `components/inventory/SmartPurchasePanel.jsx` — origin stamping merge (~2-4 lines)
- `components/inventory/smart/AutoShoppingList.jsx` — "Low stock" badge (~5 lines, optional per owner)

**WILL NOT touch:**
- `utils/vendorRanking.js` (BUG-227 territory)
- Submit/validation/grouping logic in SmartPurchasePanel
- Locked rulings G9 (sub-recipe filter — stock-alert pass ALSO excludes isSubRecipe), B1 (velocity window), G4 (unit conversion)
- `api/services/*`, `api/constants.js` (no new endpoints)

---

## 4. Risk Classification

**HIGH** (upgraded — header). Amends locked ruling B2's scope; new rows feed financial write. QA regression: existing velocity rows unchanged for same data; stock-alert rows require vendor + rate before submit (existing validation); sub-recipes still excluded.

---

## 5. Owner Decision Queue — PARTIALLY RESOLVED (owner, 2026-07-23)

- **Q1 → DECIDED:** Threshold = **`minQtyAlert` only** (base unit). Planner compares in small-unit domain: `onHand(calQuantity) < minQtyAlert × conversionFactor`. `minUnitAlert` NOT used.
- **Q2 → APPROVED:** Suggested qty = top-up to threshold: `ceil(threshold − onHand)`.
- **Q3 (B2 amendment) → OWNER APPROVED (2026-07-23):** B2 amended — velocity rows keep original B2 (hide gap ≥ 0); NEW Rule 2: ingredients below `minQtyAlert` appear as "Low stock" rows with top-up qty, regardless of consumption. Additive only.
- **Q4 (badge) → default to "Low stock" badge, confirm at Gate 3 plan review.

---

## 6. Effort Estimate

- Files: 2-3 · Lines: ~22-27 · Test: unit tests on computePlan (no-DCR + below-threshold ⇒ appears; above-threshold ⇒ hidden; sub-recipe ⇒ excluded) + browser verification on preprod
