# CR-031 — Implementation Plan (Gate 3) — One cancellation truth

**Date:** 2026-06-11 · Workstream C · Decisions: H18 (item-line value; discount verified zeroed 823/823), H19 (partial = line value), H20 (qty), H21 (Cancellations+Items by cancel_at; Ledger by punch), H22 (comp loss at `complementary_price`, live-verified), H23 (cafe103 012612 = TEST), OPS-CANCEL (operations.previous_order_amount when present, else item consolidation), BUG-125 prerequisite

## Scope (LOCKED)
One shared cancellation-valuation module consumed by Cancellations report + Dashboard cancel metrics. Ledger Cancelled tab untouched (punch-date, status rule only).

## Changes
1. NEW `frontend/src/utils/cancellationValuation.js`:
   - `valueCancelledLine(line)` = `unit_price×qty + addons + variations` (+ residual line tax as-is); comp lines (`complementary=1`) valued at `complementary_price × qty`
   - `valueCancelledOrder(wrapper)`: if `operations[]` has `order_cancel.previous_order_amount` → use it (OPS-CANCEL display rule, tax-inclusive caveat flagged); else Σ line values
   - counting = qty (H20); scope = `f_order_status===3 || pm 'cancel'/'cancelled'` with Merge guard (BUG-125)
2. `CancellationsMockup.jsx`:
   - Fetch `sort_by: 'cancel_at'` for the range (solves cross-month blind spot: 14 live cases, e.g. 010866 punched Mar 9 cancelled Apr 11)
   - Attribute rows/daily chart by cancel_at business day; use shared module; header label "By cancellation date" (Q-B)
3. `insightsService.getDashboardAggregated`: cancel block uses same `cancel_at` fetch + shared module → Dashboard ≡ Cancellations report
4. Items & Menu cancelled bucket: by cancel_at via same module (CR-034 plan wires the bucket)

## Expected number shifts (harness targets)
- Dashboard cancel revenue rises to equal Cancellations report: May Palm House both = ₹82,465-class (replica recomputed under cancel_at attribution)
- Cross-month cancels appear in the month cancelled (Apr gains 010866's loss, etc.)
- Harness drift check: operations.previous_order_amount vs line consolidation — mismatches logged (015756: 1 vs 54; 015772: 210 vs 400 known)

## QA
Dashboard replica ≡ Cancellations replica exactly, all months, both restaurants; 012612 excluded (TEST). Order-Level tab non-empty (BUG-125 must be live first).

## Freeze-log
S9 Cancellations amendment at Gate 4.

## Rollback
Module behind import swap; screens revert to local formulas.
