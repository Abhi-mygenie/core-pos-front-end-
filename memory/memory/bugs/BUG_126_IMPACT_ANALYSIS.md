# BUG-126 — Impact Analysis (Gate 2)

**Date:** 2026-06-11 · **Status:** ANALYSIS COMPLETE — ready for Gate 3

## 1. Module Mapping
- Service: `insightsService.getItemSalesAggregated` — order-level charge distribution (Pass 2)
- Line ~93: `const orderRoundOff = parseFloat(ot.round_off) || 0;`

## 2. Affected Files
| File | Change | Risk |
|---|---|---|
| `frontend/src/api/services/insightsService.js` | 1 token: `ot.round_off` → `ot.round_up` | LOW |

## 3. API Check
`round_up` confirmed present on `orders_table` in all live payloads (numeric, can be negative). `round_off` confirmed absent. `reportTransform.js` line ~984 already reads `round_up` correctly (`roundOff: toNum(api.round_up)`) — this fix aligns insightsService with the transform.

## 4. State / Downstream Impact
- Only consumer of `orderLevelCharges` is the proportional distribution into `totalRevenueSold` (sold lines only, when order has sold revenue > 0).
- Effect: Items "Sold" revenue increases by monthly round-off sum (Palm House: ₹460/₹305/₹272/₹23; cafe103 ~₹100+). Brings Items closer to Sales/Dashboard footing.
- Items report meta (`totalRevenueSold`) and per-item `avgPriceSold` shift by paise-level amounts.

## 5. Regression Risk
- LOW. Dashboard aggregator does NOT distribute round-off (different code path) — untouched.
- FE-88 audit engine reads per-line fields, not the distribution — untouched.
- Note: residual Items-vs-Sales drift remains from item-sum≠order_amount orders (2/month at palmhouse) — out of scope, documented in audit §A7.

## 6. Test Strategy
- `/app/audit_data/analyze.py` computes both variants (`sold_rev` vs `roundoff_missing` delta) — post-fix Items total must equal current `sold_rev + roundoff_missing` per month.
