# BUG-128 — Impact Analysis (Gate 2)

**Date:** 2026-06-11 · **Status:** ANALYSIS COMPLETE — ready for Gate 3

## 1. Module Mapping
- `insightsService.getDashboardAggregated` lines ~530-543: `Promise.all([ordersResp POST, cancelDataResp POST (identical), cancelReasonsResp GET])`
- `cancelDataOrders` → `filteredCancelOrders` → cancellations tile block (lines ~781-818)

## 2. Affected Files
| File | Change | Risk |
|---|---|---|
| `frontend/src/api/services/insightsService.js` | Remove 2nd POST; `const cancelDataOrders = orders;` (alias) | LOW |

## 3. Verification of Identity
Both calls: same endpooint, same body `{sort_by:'created_at', from_date, to_date}`, same business-day filter (`bdFilter`) applied to both. Replication confirmed `filteredOrders` ≡ `filteredCancelOrders` for every range tested. Removing the call is **behaviour-preserving by construction**.

## 4. Performance Impact
- Palm House month: ~40 MB payload → halves Dashboard network cost and backend load; load time improvement proportional.

## 5. Out of Scope (follow-up under CR-031)
- The ORIGINAL intent (wider fetch window so cancels of pre-range orders are caught) is a behaviour CHANGE, not a dedup — belongs to CR-031 canonical-cancellation work. Do not bundle.

## 6. Regression Risk
- LOW. Single service function; tiles derive from the same in-memory arrays.
- QA: Dashboard tile values byte-identical before/after for fixed range (snapshot compare via replication harness).
