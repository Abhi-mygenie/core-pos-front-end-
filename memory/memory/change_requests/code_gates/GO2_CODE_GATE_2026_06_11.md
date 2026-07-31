# GO-2 Wave — Gate 4 Code Gate (CR-029, CR-030, CR-032, BUG-127)
**Date:** 2026-06-11 · **Owner GO:** "go 2" (verbatim) · Order: CR-029 → CR-030 + CR-032 + BUG-127

## CR-029 — Room food included everywhere
- `orderLedgerService.js`: room-exclusion predicate + filter DELETED — rows flow through (`orders = filtered.map(toLedgerRow)`)
- `AllOrdersReportPage.jsx`: `nonRoomOrders = fullOrders` (stripping removed); predicate deleted
- TAB_FILTERS untouched (Q3-val: classify all room stages correctly)

## CR-030 — Revenue by collection date (flag `REVENUE_BASIS='collect'`)
- `orderLedgerService.js` NEW: `getRevenueOrdersForRange` (sort_by=collect_bill, to+1 tail, fs6, business-day window 06:00→03:00, room incl, pm='TAB' flagged `isTabCredit`), `getTabSettlementsForRange` (N daily-sales calls → Credit Cash/Card/UPI per day), `REVENUE_BASIS` flag (1-line rollback)
- `SalesMockup.jsx` + `PaymentsMockup.jsx`: dual fetch; revenue = non-TAB rows + settlements; daily bucket = `revenueDate`; TAB GST kept in tax (H5); header label "Revenue by collection date · incl. room food · credit counted on settlement"
- `insightsService.getDashboardAggregated`: separate collect_bill fetch drives Net Sales / Channel / Payment mix / hourly; punch fetch keeps items/kitchen/customers/discounts/audits/cancels (CR-031 untouched)
- Payments KPI "TAB / Credit" → "Credit Settled" (= settlements, money-in)

## CR-032 — Shared payment classifier
- NEW `utils/paymentClassifier.js`: canonical buckets Cash/Card/UPI/Room Bill/Partial/Zomato Gold/Other(+console.warn); null for TAB/pending/transferToRoom/Cancel/cancelled/Merge
- Consumers: SalesMockup (replaced inline chain), PaymentsMockup (local def deleted), insightsService dashboard (replaced inline chain). Credit group = settlements (CR-030)

## BUG-127 — Credit Outstanding tile (R2-AMEND)
- `insightsService`: tap-waiter-list POST in dashboard Promise.all → `restaurant-tap-summary.balance` (comma-stripped) → `payments.creditOutstanding`
- `DashboardMockup.jsx`: row in Payment Mix tile, label "(as of today)", testids `dashboard-credit-outstanding-tile/-value`. Dead `unsettledTab` removed

## QA (PASSED)
- Harness replica: **31/31 March days == daily-sales `paid_revenue` to the rupee** (room incl + TAB excl + settlements)
- Live June: Jun 1/2/3/9/11 exact; **Jun 7 (−74) & Jun 10 (−128): backend daily-sales anomaly** — amounts exist in NO order row and NOT in settlement engine (settlement total_paid agrees with screen: 2,631/544). Logged for backend brief. Screen is correct per order-log + settlement engine
- Classifier: zero unknown enums over March (buckets: Card 553,748.50 / Cash 555,470 / UPI 309,779 / Partial 9,858)
- UI smoke: Sales (label + Room channel + ₹ totals) ✓ · Dashboard (label + Credit Outstanding ₹6,27,428 == live API) ✓

## Out of scope (NOT touched)
cancel_at attribution (CR-031) · Items Ledger buckets (CR-034) · Items & Menu basis (stays punch) · Room Orders Report (frozen) · Order Ledger date basis (stays punch, room rows now included per CR-029)

## Rollback
CR-030: `REVENUE_BASIS='punch'` (1 line). CR-029: re-add 2-line predicate+filter. CR-032: revert imports. BUG-127: remove tile row + tap fetch.
