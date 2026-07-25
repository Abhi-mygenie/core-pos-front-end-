# BUG-125 — Impact Analysis (Gate 2)

**Date:** 2026-06-11 · **Status:** ANALYSIS COMPLETE — ready for Gate 3

## 1. Module Mapping
- Screen: `/reports-module/cancellations` (`CancellationsMockup.jsx`)
- Single classification point: `cancelledItems` useMemo, line ~234: `const isOrderCancelled = pm === 'cancelled';`

## 2. Affected Files
| File | Change | Risk |
|---|---|---|
| `frontend/src/pages/reports-module/CancellationsMockup.jsx` | 1 line: `pm === 'cancelled'` → `pm === 'cancel' \|\| pm === 'cancelled'` (or `ot.f_order_status === 3`) | LOW |

## 3. API Check
No API change. `payment_method='Cancel'` confirmed as the only live literal for cancelled orders on both restaurants (Mar–Jun: 300 orders total, zero `'cancelled'`). Keeping the `'cancelled'` match as a fallback is harmless.

## 4. State / Downstream Impact
- `scope` field drives: tab counts (All/Order-Level/Item-Level), KPI split (orderLoss/itemLoss), daily chart series (orderCancels/itemCancels), top-reason aggregation per scope.
- After fix: rows will MOVE from Item-Level to Order-Level. Total loss/count unchanged (scope is a partition, not a filter).
- Recommended alignment: use `fStatus === 3` like `reportTransform.deriveOrderStatus` for one-predicate consistency — but string-fix is the minimal safe change.

## 5. Regression Risk
- LOW. No other consumer of `isOrderCancelled`. Audit tab (env-gated) reads same rows but not scope.
- Watch: CR-031 (canonical cancel formula) builds on this — land BUG-125 first.

## 6. Test Strategy
- Replication harness `/app/audit_data/analyze.py` already computes expected split: Palm House May → order-scope qty should become >0 (97 cancelled orders' lines), Item-Level reduces accordingly; totals constant.
- UI: load Cancellations for 2026-05-01→31 on palmhouse, verify Order-Level tab non-empty.
