# CR-033 — Impact Analysis (Gate 2)

**Date:** 2026-06-11 · **Status:** ANALYSIS COMPLETE — BACKEND-BLOCKED (definition ask); FE follow-up scoped

## 1. What We Know (replication-verified)
- `get-settlement-report` per-day `totals.total_sale` and aggregate `totals.total_sale` exceed every frontend figure: Palm House Mar ₹15,03,418 vs Dashboard ₹13,46,993 vs Sales ₹11,68,821; May ₹14,58,269 vs ₹14,23,021 vs ₹13,21,940.
- Date basis is collection-day (matches backend daily endpoint on overlapping days: Jun 7 settlement 2,631 ≈ collected May-orders 2,367+264).
- Gap is NOT explained by: rooms (+Dashboard already includes), TAB (included in both), cancels (+₹17,685 Mar), pending/unpaid (small). ~₹1.4L residual in March.

## 2. Hypotheses for Backend to Confirm/Deny
a. `total_sale` is PRE-discount (Mar discounts ₹31,750 — insufficient alone)
b. Includes room folio amounts (room_price/advance) beyond order_amount
c. Includes delivery charges/tips/service double-count
d. Includes merged-away originals or split-order duplicates
e. Different restaurant-day cutoff (e.g., calendar day not business day)

## 3. FE Follow-up Scope (after backend answers)
| File | Change |
|---|---|
| `SettlementReportMockup.jsx` | Definition footnote on "Total Sale" KPI + (optional) reconciliation row vs Sales report for same range |
| `settlementReportTransform.js` | No change expected (pass-through) |

## 4. Regression Risk
- NONE until backend answers; FE follow-up is additive labelling.

## 5. Test Strategy
Once formula is documented, extend `/app/audit_data/analyze.py` to recompute `total_sale` from order-logs and assert ±₹1 against the API per day — this becomes the permanent reconciliation harness.

## 6. Dependencies
- CR-030 (attribution): settlement is collection-based; reconciliation only meaningful in collection mode.
- BUG-129 (TAB stamping): TAB treatment inside `total_sale` is part of the definition ask.
