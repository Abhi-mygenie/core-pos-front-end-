# GO-3 Wave — Gate 4 Code Gate (CR-031, CR-034)
**Date:** 2026-06-11 · **Owner GO:** "go 3" (verbatim) · Order: CR-031 → CR-034 (BUG-125 landed in GO-1)

## CR-031 — One cancellation truth (cancel_at attribution + shared valuation)
- NEW `utils/cancellationValuation.js`: `CANCEL_LOOKBACK_DAYS=45` · `isOrderCancelledScope` (BUG-125 predicate) · `valueCancelledLine` (H18/H19; comp-cancel at `complementary_price` — H22) · `valueCancelledOrder` (OPS-CANCEL: `order_cancel.previous_order_amount` when >0, else line consolidation) · `getCancelAt`
- **Backend constraint (live-verified):** `sort_by='cancel_at'` NOT supported (success=false) → created_at fetch widened by 45d lookback (+1 tail; max observed punch→cancel gap = 33d over 137 cross-day cases), client-filter by cancel_at business day
- `CancellationsMockup.jsx` (S9): widened fetch; rows gated+attributed by cancel_at business day (00:00–03:00 → prior day); module valuation; order-scope KPI/daily loss via `valueCancelledOrder`; label "By cancellation date · order-scope loss per OPS record"
- `insightsService.getDashboardAggregated`: dedicated cancel fetch (created_at, from−45 → to+1); cancel tile rewritten on module — item counts now qty-based (H20), order value OPS-based → **Dashboard ≡ Cancellations by construction**
- `getItemSalesAggregated`: fetch widened identically; cancelled bucket ALWAYS by cancel_at (FE-12 toggle removed); lookback orders contribute ONLY their cancelled lines

## CR-034 — Items Ledger buckets
- Precedence: Cancelled → Comp → **Credit (parent pm='TAB')** → Sold (fs6) → Pending
- New per-item bucket fields (qty/itemTotal/discount/serviceCharge/subtotal/tax/totalRevenue/avgPrice + tax flags) + meta `totalItemsCredit`/`totalRevenueCredit`; TAB orders' order-level charges distribute into Credit
- H22: comp lines (incl comp-cancel) valued at `complementary_price × qty`
- `ItemSalesHybridMockup.jsx`: "Added to Credit" tab (`reports-items-tab-credit`), credit lens, all_items bucket (order: Sold → Pending → Credit → Cancelled → Comp), bucket-summary card (grid 5), separators, column labels (Credit Qty / Credit Value), header label "By punch date · cancellations by cancel date · credit at punched value"

## QA (PASSED — harness replica, May Palm House)
- **Sold+Credit ≡ old Sold to the rupee** (1,374,627.98 + 49,460.00 = 1,424,087.98; diff −0.00)
- **Credit = ₹49,460.00 — exactly the plan target**
- CR-031 May: order-scope 72 orders / qty 157 / loss ₹25,299 (25 ops-valued) + item-scope qty 246 / ₹59,092.50 = **₹84,391.50 total** (82,465-class under new attribution, as planned); **4 cross-month orders surfaced** (blind spot solved)
- UI smoke: Cancellations (label + OPS totals: 3 orders ₹138) ✓ · Items (Credit tab + columns + label) ✓

## Out of scope (NOT touched)
Order Ledger date basis (punch — H21) · Room Orders Report · CR-033 (parked) · audit engine credit-bucket flags (deferred, preprod-only tool) · export sheet for Credit tab (deferred)

## Rollback
CR-031: revert fetch windows + module imports (screen formulas were verbatim-preserved in module). CR-034: bucket branch revert (credit folds back into Sold).
