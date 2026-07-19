# CR-034 — Impact Analysis (Gate 2)

**Date:** 2026-06-11 · **Status:** ANALYSIS COMPLETE

## 1. Module Mapping
- `insightsService.getItemSalesAggregated`: per-line bucket assignment currently keyed on `f_order_status==='6'` (Sold) / `food_status==='3'` (Cancelled) / `complementary` (Comp) / else Pending
- New rule: parent order `payment_method==='TAB'` → "Added to Credit" bucket (takes precedence over Sold; TAB orders are fs=6 — live-verified all 319)

## 2. Affected Files
| File | Change | Risk |
|---|---|---|
| `insightsService.js` | bucket branch + credit aggregates | MED-LOW |
| `ItemSalesHybridMockup.jsx` | new tab/section + label | LOW |

## 3. Number Shifts (harness targets)
- Items "Sold" drops by TAB item value: May Palm House ≈ ₹49,460-class → Sold scope ≡ Ledger Paid scope (punch-dated)
- "Added to Credit" bucket shows the same value — nothing hidden
- Charge distribution (delivery/tip/round_up after BUG-126): TAB orders' charges follow their items into the credit bucket (not Sold)

## 4. Interactions
- CR-031: Cancelled bucket switches to cancel_at + shared valuation (incl. `complementary_price` for comp lines)
- CR-030: no date-basis change here (Items stays punch-dated — accepted divergence from collection-dated Sales on boundary days; labels make it visible)
- FE-88 audit tab: drift expectations recompute against new Sold scope — update audit baseline

## 5. Regression Risk
MED-LOW. Items screen not frozen. Export sheets gain a bucket column.

## 6. Test Strategy
Harness: Sold(items) ≡ Σ fs-6 non-TAB orders' item values + charges (punch-dated, rooms incl.); Credit(items) ≡ TAB orders' item values; all months, both restaurants.
