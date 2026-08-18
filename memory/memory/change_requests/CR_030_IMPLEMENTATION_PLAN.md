# CR-030 — Implementation Plan (Gate 3) — Revenue by collection date + TAB rework

**Date:** 2026-06-11 · Workstream B · Decisions: R1 (collected basis: Sales/Payments/Dashboard), H5 set (TAB out of revenue, settlements in by method, GST stays), H13, Q1/Q2 (API groups verified), ITEMS-BASIS (Items stays punch-dated), Q-B (labels), H25 (zero-bill orders stay counted), Ledger stays punch-dated

## Scope (LOCKED)
Sales, Payments, Dashboard switch to collection-date revenue. Order Ledger, Items & Menu, Order Summary, Settlement, Room report: basis unchanged.

## Phases
### B-1 Services (no UI change)
1. `orderLedgerService.js` / `insightsService.js`: collection-mode pipeline —
   - fetch `sort_by: 'collect_bill'`, range `from_date` … `to_date + 1 day` (captures 00:00–03:00 checkout tail; verified case: order 014894 collected Jun 8 00:xx = Jun 7 business day, matches settlement)
   - filter by `collect_bill` within business-day range (NOT created_at — fixes structural B1 row-loss)
   - daily bucketing by collect_bill **business day** (00:00–03:00 → prior day; required to match settlement to the rupee — derived from R1, flagged at Gate 4)
2. TAB: rows with `payment_method='TAB'` excluded from revenue/mix; their GST kept in tax-collected (H5)
3. TAB settlements: per-day `daily-sales-revenue-report` fetch for range → `tab_payment` (Credit Cash/Card/UPI) added to revenue + mix on settlement day. Perf note: N calls for N-day range, parallelized + cached; backend brief asks for range endpoint (nice-to-have)

### B-2 Sales + Payments screens
- Wire collection pipeline; mix = 3 groups (CR-032): order / Credit (settlements) / Room Bill
- Header label: "Revenue by collection date · incl. room food · credit counted on settlement" (Q-B)

### B-3 Dashboard
- Same pipeline + BUG-127 tile + label; cancel metrics untouched until CR-031

## Expected reconciliation (harness targets, live-verified)
- Daily Sales = Order Summary `paid_revenue` + room_revenue + tab_payment per day (e.g. Mar 15: 64,648 incl. room food 22,324)
- Jun 3: Sales reads ₹22,897-class collection figure (was ₹7,838 punch) ≈ settlement 24,892 (Δ = documented scope diffs)
- Palm House settled-TAB lines: ₹0 today (Q1 — real, nothing settled)

## QA
Harness extended with collection-mode replica; acceptance = screen matches replica AND Order Summary cross-foot per day, both restaurants, Mar 1–Jun 10. Test data exclusion: cafe103 012612 (H23).

## Freeze-log
S7/S8 amendments at Gate 4 (combined with CR-029 entries).

## Rollback
Pipeline behind a constant flag (`REVENUE_BASIS = 'collect'`) — single-line revert to 'punch'.

---
## ADDENDUM 2026-06-11 — OWNER FORMULA LIVE-VALIDATED (acceptance target locked)
Owner formula: **Sales = all paid orders (order log) + TAB settled (daily-sales API)**.
Validated to the rupee on 5/5 days (Mar 15, 18, 24, 25, 31 — incl. both TAB-settlement days):
- Order-log side: fs=6, bucket by `collect_bill` business day (06:00→03:00), room orders (RM/SRM/pm='ROOM') included natively, pm='TAB' EXCLUDED (stamped fs=6 at punch but not revenue).
- Plus `tab_payment` (Credit Cash/Card/UPI) from daily-sales per day.
- Result == backend `paid_revenue` exactly (e.g. Mar 25: 53,628 + 3,582 = 57,210 ✓).
- Bucket disjointness proven order-by-order (Mar 15): room orders ONLY in `room_revenue` (137/20,475/1,712), never in `order_payment` (15,367/12,155.50/14,802) — no double count possible.
**QA acceptance sharpened:** screen daily total MUST equal daily-sales `paid_revenue` per day, both restaurants (replaces approximate cross-foot).
