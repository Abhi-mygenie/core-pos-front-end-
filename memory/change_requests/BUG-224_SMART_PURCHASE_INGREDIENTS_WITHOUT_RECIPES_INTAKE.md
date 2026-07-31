# BUG-224 — Smart Purchase: Ingredients Without Recipes Never Appear

**ID:** BUG-224
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P2 (MEDIUM)
**Risk:** MEDIUM
**Module:** Inventory — Smart Purchase (SmartPurchasePanel, purchasePlanner.js)
**Duplicate Check:** NONE — fresh issue on smart purchase planner logic.
**Code Reality:** CONFIRMED — `SmartPurchasePanel.jsx:42` calls `computePlan({ stockInventory, dcrStockSummary, horizonDays })`. `purchasePlanner.js:computePlan` only processes ingredients that appear in `dcrStockSummary` (daily consumption report). Ingredients with no recipes have no consumption data → never appear in plan.
**Source:** OWNER-REPORTED (session 2026-07-22)
**Confidence:** CONFIRMED (code verified)

---

## Description

The Smart Purchase planner computes a purchase list based on consumption (from the DCR — daily consumption report) vs current stock. Only ingredients that have at least one recipe will appear in the DCR consumption summary. **Ingredients that are purchased directly (no recipe) — e.g., cleaning supplies, packaging, standalone raw materials — are completely excluded from the smart purchase plan.**

Owner expects that ALL ingredients with low stock (below `minQtyAlert` or `minUnitAlert` threshold) should appear in the plan, regardless of whether they have a recipe.

---

## Evidence

- Code: `SmartPurchasePanel.jsx:42-50` — `computePlan()` uses `dcrStockSummary` as the primary source
- Code: `purchasePlanner.js:107` — `computePlan({ stockInventory, dcrStockSummary, horizonDays })` — no ingredient-master pass-through for non-DCR items
- Code: `SmartPurchasePanel.jsx:38-62` — three data fetches: `stockInventory`, `dcrStockSummary`, `vendorItemList` — no `ingredientsMaster` independent pass

---

## Blast Radius

- 2 files: `SmartPurchasePanel.jsx`, `purchasePlanner.js`
- ~20-30 lines change (add ingredient-master scan for low-stock items without recipes)
- Hotspot: NO
- Scope: MEDIUM (2 files, logic change to planner)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. In `SmartPurchasePanel.jsx`: fetch `ingredientsMaster` alongside existing fetches
2. In `computePlan()` or after: scan `ingredientsMaster` for items with `current_stock < minQtyAlert` that are NOT already in `dcrStockSummary` rows
3. Add those items as additional purchase rows with `suggested_qty = minQtyAlert - current_stock`
4. Label them distinctly (e.g., `origin: 'stock_alert'` vs `origin: 'planner'`)

---

## Next
Planning Gate 2 → Gate 3 → Implementation
