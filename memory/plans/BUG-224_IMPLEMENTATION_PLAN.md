# BUG-224 — Smart Purchase Low-Stock Rows (B2 Rule 2) — IMPLEMENTATION PLAN (Gate 3)

**Date:** 2026-07-23 (Session E) | **Impact:** `/app/memory/impact/BUG-224_IMPACT_ANALYSIS.md` (approved; Q1 minQtyAlert only, Q2 top-up, Q3 B2 amended, Q4 badge default) | **Risk:** HIGH (feeds add-purchase write; amends locked B2)
**Entry verification:** PASS 2026-07-23 — computePlan (:107-140) velocity-only + `filter(r => r.gap < 0)` matches; `fromAPI.stockItems` delivers `minQtyAlert`(numeric)/`conversionFactor`/`calQuantity`.

## Dependencies / Wave
WAVE 4 with BUG-227 (shared SmartPurchasePanel.jsx) — **224 FIRST** (planner rows), then 227 (vendor layer). Data note: BUG-219 retypes `minUnitAlert` only — `minQtyAlert` stays numeric → no interaction, but QA Wave 4 after Wave 2 must re-verify threshold math.

## Scope Lock
WILL change: `utils/purchasePlanner.js` (~18 lines), `components/inventory/SmartPurchasePanel.jsx` (~3 lines), `components/inventory/smart/AutoShoppingList.jsx` (~5 lines). WILL NOT touch: vendorRanking.js (227), submit/validation/grouping, locked G9/B1/G4, services/constants.

## Edits (exact)
1. **purchasePlanner.js computePlan** — after existing `rows` build, replace `return rows.filter(r => r.gap < 0);` with:
```js
  const velocityRows = rows.filter(r => r.gap < 0)
    .map(r => ({ ...r, origin: 'planner' }));                    // B2 Rule 1 (unchanged)

  // BUG-224: B2 Rule 2 (owner-amended 2026-07-23) — low-stock rows regardless of consumption
  const inPlan = new Set(velocityRows.map(r => String(r.ingredient_id)));
  const alertRows = stockInventory
    .filter(item => item?.isSubRecipe !== true)                  // G9 also applies
    .filter(item => !inPlan.has(String(item.id)))
    .map(item => {
      const threshold = (Number(item.minQtyAlert) || 0) * (Number(item.conversionFactor) || 1); // Q1: minQtyAlert only, small-unit domain
      const onHand = Number(item.calQuantity) || 0;
      if (!(threshold > 0) || onHand >= threshold) return null;
      return {
        ingredient_id: item.id,
        name: item.name || '',
        unit: item.smallUnit || item.unit || '',
        display_unit: item.displayUnit || item.smallUnit || item.unit || '',
        on_hand: Number(onHand.toFixed(3)),
        velocity_per_day: 0,
        projected_need: Number(threshold.toFixed(3)),
        gap: Number((onHand - threshold).toFixed(3)),
        suggest_qty: Math.ceil(threshold - onHand),              // Q2: top-up
        origin: 'stock_alert',
      };
    })
    .filter(Boolean);

  return [...velocityRows, ...alertRows];
```
2. **SmartPurchasePanel.jsx:~57** — row build currently stamps `origin: 'planner'`: change to `origin: r.origin || 'planner', // BUG-224` (planner now provides origin).
3. **AutoShoppingList.jsx** — Q4 badge: where velocity/name renders, if `row.origin === 'stock_alert'` show amber pill `Low stock` (`data-testid="low-stock-badge-{id}"`). ~5 lines. `// BUG-224`.

3 files, ~26 lines. Pure-function change → unit-testable.

## Verification Matrix
| # | Verify | How | Auto? |
|---|---|---|---|
| 1 | No-DCR item below threshold → appears with Low stock badge, suggest = ceil(threshold−onHand) | Unit test on computePlan | YES |
| 2 | No-DCR item above threshold → hidden | Unit test | YES |
| 3 | Sub-recipe below threshold → excluded (G9) | Unit test | YES |
| 4 | Velocity rows identical to pre-change output for same input (B2 Rule 1 regression) | Unit test snapshot | YES |
| 5 | Item in BOTH sets → appears once as planner row | Unit test | YES |
| 6 | Browser preprod: known low-stock zero-velocity ingredient appears; requires vendor+rate before submit (existing validation intact) | Browser | NO |
| 7 | E2E financial: submit flow NOT executed to real add-purchase in QA unless owner smoke — validation-only check | Browser (stop before submit) | NO |

## Risk Register
CRITICAL-adjacent (feeds add-purchase). Mitigations: unit tests (craco test) mandatory; suggest_qty never negative; `rate>0` validation untouched forces manual rate for alert rows (no history price). Rule 2 additive only — Rule 1 output bit-identical.

## Registry Checklist
- [ ] registry.json BUG-224 → IMPLEMENTED, pos_5_0  - [ ] BUG_TRACKER row  - [ ] FILE_OWNERSHIP (3 files)  - [ ] `// BUG-224` markers  - [ ] webpack clean + unit tests pass

*Gate 3 complete. Awaiting Gate 4 GO.*
