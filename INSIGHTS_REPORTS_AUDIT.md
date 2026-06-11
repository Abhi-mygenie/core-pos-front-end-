# Insights Module — Cross-Report Consistency Audit

**Date:** 2026-06-10 · **Restaurant:** cafe103 (rid 644, owner@cafe103.com) · **Period verified:** March 1 – June 10, 2026 (live preprod data)
**Method:** Replicated each report's exact frontend aggregation logic (from source) on the same raw `/order-logs-report` payloads, then cross-compared + compared against backend `daily-sales-revenue-report` and `get-settlement-report`.

---

## Executive Summary

All Insights screens share one API (`/api/v2/vendoremployee/report/order-logs-report`) but **each report applies its own gates, date attribution, and money formulas**, so the same question — "how much did we sell?" — gets **3 different answers** depending on which screen you open. The largest verified gaps:

| Metric (May 2026) | Value | Source |
|---|---|---|
| Sales / Payments / Dashboard revenue | **₹25,34,440** | fStatus=6, incl. TAB credit |
| Order Ledger / Audit "Paid" tab | **₹23,03,501** | excludes TAB (−₹2,30,939) |
| Items & Menu "Sold" revenue | **₹25,33,960** | item-formula drift (−₹480) |

| Metric (June 9, single day) | Value | Source |
|---|---|---|
| Sales report | **₹4,080** | punch-date (created_at) |
| Order Summary (backend) paid revenue | **₹9,708** | collection-date |
| Settlement report sale | **₹10,076** | collection-date |

---

## A. CRITICAL — verified with live numbers

### A1. Two different date attributions across the module (punch date vs collection date)
- **Sales, Payments, Dashboard, Items & Menu, Order Ledger, Cancellations, Kitchen Ops, Food Court, Room Orders** → attribute orders to **`created_at` (punch date)**, filtered by business day (06:00 → 03:00+1).
- **Settlement Report and Order Summary (backend `daily-sales-revenue-report`)** → attribute to **collection date (`collect_bill`)**.
- Live proof (June, daily revenue):

| Day | Sales report (created_at) | Settlement / backend (collect date) |
|---|---|---|
| Jun 3 | 7,335 | 6,316 |
| Jun 5 | 9,650 | 8,212 |
| **Jun 8** | **3,203** | **0** |
| **Jun 9** | **4,080** | **10,076** |

Orders punched on Jun 8 but billed on Jun 9 move entire days of revenue between the two views. Monthly totals roughly converge (June: 161,590 vs 159,853) but **no single day matches**. This is the #1 source of "the reports don't agree" complaints.
**Recommendation:** pick one canonical attribution (or expose the toggle uniformly on every screen with an explicit label "by punch date / by collection date").

### A2. TAB (credit) orders counted as revenue in some reports, excluded in others
All **141 TAB orders in Mar–Jun have `f_order_status = 6`** even though money is *not collected*. Consequences:
- **Sales / Payments / Dashboard / Items & Menu** (gate = fStatus 6): count TAB as settled revenue on punch day → March includes **₹3,44,698 (36 orders)**, May **₹2,30,939 (55 orders)** of uncollected credit.
- **Order Ledger / Audit Report "Paid" tab**: explicitly excludes `payment_method === 'TAB'` → March Paid = ₹17,49,295 vs Sales ₹20,93,993.
- **Backend Order Summary**: treats TAB as `unpaid_revenue` / `orderTAB` (Jun 9: ₹368 unpaid), and counts it as revenue only when settled (`tab_cash/card/upi`).
Three contradictory treatments of the same orders. **Decide:** is TAB revenue at punch or at settlement? Then align Sales/Payments/Dashboard gate (e.g., `fStatus===6 && paymentMethod!=='TAB'`, plus a separate "Credit outstanding" KPI).

### A3. Cancellations report can never detect order-level cancellations (string bug)
`CancellationsMockup` classifies scope with `payment_method === 'cancelled'`, but the live API value is **`'Cancel'`** (`'cancel' !== 'cancelled'` after lowercasing). Verified: 41 cancelled orders in Mar–Jun, all with `payment_method='Cancel'`, **zero matched**.
- The "Order-Level" tab is permanently empty; every order-cancel line shows under "Item-Level".
- Dashboard uses `f_order_status === 3` and *does* find them (16 cancelled orders in June).
**Fix:** match `pm === 'cancel'` / `'cancelled'` or use `f_order_status === 3` like the Dashboard and the shared transform (`reportTransform` already does `paymentMethod === 'Cancel' || fStatus === 3`).

### A4. Cancellation revenue disagrees between Dashboard and Cancellations report
| Month | Cancellations report loss | Dashboard cancellation revenue | Δ |
|---|---|---|---|
| Apr | 23,569 | 17,301 | 6,268 |
| May | 34,756 | 28,226 | 6,530 |
| Jun | 122,613 | 106,313 | 16,300 |

Causes (all verified):
1. **Different money basis:** Cancellations = per-line `subtotal + tax`; Dashboard = `order_amount` for order-cancels and raw `line.price` for item-cancels.
2. **Partially-cancelled orders have `order_amount` ≠ item sums** — e.g. order `012580`: order_amount ₹120 vs cancelled item value **₹10,680**; `012642`: ₹30 vs ₹830. Dashboard reports ₹120 lost, Cancellations reports ₹10,680 lost — for the same order.
3. **Different date gates:** Dashboard requires item `cancel_at` within the *calendar* range (on top of created_at business-day fetch); Cancellations attributes display rows by `cancel_at` but *filters* by `created_at` business day. Cross-midnight / cross-range cancels land differently.
4. Dashboard counts item-cancels as **lines** (`+= 1`); Cancellations counts **qty** — counts disagree whenever qty > 1.
Note: June includes a single ₹1,02,285.90 cancelled order (`012612`, reason "Others") — worth a manual look; it dominates June's cancellation totals in both reports.

### A5. Backend vs frontend discount & payment-mix mismatch
- **Jun 5:** frontend discount = **₹1,212**, backend = **₹282**. Order `012632` is a **₹0-amount, 100%-discounted (₹930) "paid" order** — counted as a paid order in Sales (skews AOV and order count), apparently excluded from backend discount.
- **`partial` payment method (78 orders Mar–Jun):** backend splits a partial payment into its real cash/UPI legs (Jun 5: cash 7,710 + upi 502); frontend buckets the whole order as one method — Sales shows "Partial ₹1,502", Dashboard shows raw key `partial`, Payments' classifier doesn't recognise it (falls into "Other"). Three different payment-mix renderings, none matching settlement.
- `zomato_gold` (14 orders) is likewise passed through raw with no consistent bucket.

### A6. Dashboard "Unsettled TAB" tile is dead code — always ₹0
In `getDashboardAggregated`, `if (pm === 'tab' && fStatus !== '6')` is nested **inside** the `isPaid` branch (which requires `fStatus === '6'`) — the condition can never be true. Live-confirmed ₹0 despite 55 TAB orders in May. The tile is misinformation.

### A7. Dashboard double-fetches the same payload
`getDashboardAggregated` makes **two byte-identical POSTs** to `/order-logs-report` (`ordersResp` and `cancelDataResp`, both `sort_by: 'created_at'`, same dates). The comment says the second is for "cancel_at attribution", but it's the same call — doubling the heaviest API (a month is ~35 MB) for nothing, and the cancel-attribution intent (fetching a wider window so cancels of older orders are caught) is NOT actually implemented: cancellations of orders *created before the range* are missed by the Dashboard.

### A8. Items & Menu totals drift from Sales (every month)
| Month | Items "Sold" revenue | Sales revenue | Δ |
|---|---|---|---|
| Mar | 20,93,457 | 20,93,993 | −536 |
| Apr | 17,78,601 | 17,78,785 | −184 |
| May | 25,33,960 | 25,34,440 | −480 |
| Jun | 1,62,548 | 1,61,590 | **+958** |

Verified causes:
1. **`insightsService` reads `ot.round_off` — the field does not exist** (API field is `round_up`). Round-off is silently never distributed to items (~₹100+/month).
2. **26–32 paid orders/month where item sums ≠ `order_amount`** (cancelled/edited items not consistently zeroed by backend; e.g. June `012662`: order ₹1,653 vs items ₹2,523 → Items report over-credits ₹870).
3. Delivery/tip/round-off are distributed only to "sold" lines and only when the order has sold revenue > 0.
Per-item tax also drifts ~₹100/month vs order-level tax (Sales). Small for cafe103, but it means **Items can never be footed against Sales** exactly.

### A9. GST/VAT formula conflict between transforms (latent, severe for VAT restaurants)
- `reportTransform` (BUG-117 fix, 2026-06-08): `total_gst_tax_amount` is **pure GST**, `total_vat_tax_amount` pure VAT (verified live on another restaurant per code comment).
- `insightsService` + `CancellationsMockup` still apply the **old "VAT-FIX"**: `gst = gst_tax_amount − vat_tax_amount` at line level.
cafe103 has 0 VAT lines so no live impact here, but **any VAT-configured restaurant gets negative/understated GST in Items & Menu and Cancellations while Ledger/Sales report it correctly**. The two conventions are mutually exclusive — one is wrong. Needs a single shared tax helper.

### A10. Room-order scope differs per report (latent for hotel properties)
- Sales / Payments / Order Ledger **exclude** rooms (`orderIn RM/SRM` or `paymentMethod === 'ROOM'` — note: exact-uppercase match only).
- Dashboard and Items & Menu **include** rooms.
cafe103 has no room orders, so the numbers happen to match today — for any property using Rooms, **Dashboard Net Sales will exceed Sales by the full room revenue**. Also `transferToRoom` rows pass the room-exclusion (excluded from Ledger Paid, included in Sales revenue) — same class of mismatch as TAB.

---

## B. Structural doubts / flags (no live damage at cafe103, but inconsistent by design)

1. **`sort_by=collect_bill` fetch + `created_at` filter mismatch** — `orderLedgerService` default and legacy `ItemSalesMockup` fetch by paid-date but then business-day-filter on `created_at`. An order created before `from_date` but paid in-range gets fetched and then dropped. 0 occurrences at cafe103 (orders settle same business day), but it structurally breaks "paid date" attribution. (The routed Items screen hardcodes `created_at`, so the legacy screen + service default are footguns.)
2. **Business-day tail loss** — business day ends at `to_date + 1, 03:00`, but the API is fetched only for calendar `from_date..to_date`; the response contains no `to_date+1` rows (verified). Any order punched 00:00–03:00 after `to_date` silently disappears from single-day and range reports. 0 cases in Mar–Jun for cafe103, but the old `reportService` fetched two `searchDates` precisely for this; the order-logs consumers don't.
3. **"Today" computed via `toISOString()` (UTC)** in Sales/Payments/Cancellations/Ledger presets — between 00:00 and 05:30 IST the default range ends on *yesterday*; other code (`reportService.formatDateParam`) uses device-local date. Mixed conventions.
4. **Order Ledger `meta.totalRevenue` sums ALL rows** including cancelled/merged (May: 25,37,540 vs Sales 25,34,440) — fine if unused, dangerous if ever surfaced/exported.
5. **Items & Menu `meta.totalOrders` uses the raw unfiltered response length** (includes merged + out-of-window rows) — inconsistent with every other order count.
6. **Max-range limits differ per report** (60 days Sales/Payments, 62 Cancellations, 30-day chunked-unlimited Food Court/Kitchen Ops) — users cannot run identical periods everywhere; "last 3–4 months" only possible on chunked reports.
7. **Dashboard "Top Items" revenue uses raw `line.price` and includes unpaid orders' lines** (May basis ₹25,68,345 vs Items sold ₹25,33,960) — won't match Items & Menu ranking/values. Code comments themselves call `price` inconsistent (FE-53).
8. **`fOrderStatus === 6` strict-number vs `String(...) === '6'`** comparisons coexist; live API returns numbers today, but a backend type change silently zeroes Sales/Payments revenue while Items keeps working.
9. **Hold-orders endpoint returns paid-order data** (backend ISSUE-001, already noted in code) — Hold tab reliability depends entirely on TAB_FILTERS, not the source.
10. **Dashboard customer tile**: "New customers" = guest (un-identified) order count, and repeat % is computed only among identified customers within the selected range — both are approximations, not customer analytics.

---

## C. Quick-win fix list (priority order)

| # | Fix | Effort |
|---|---|---|
| 1 | Cancellations scope: match `'Cancel'`/fStatus 3 (A3) | 1 line |
| 2 | Dashboard: remove duplicate fetch (A7); fix dead Unsettled-TAB (A6) | small |
| 3 | `round_off` → `round_up` in insightsService (A8.1) | 1 line |
| 4 | Decide TAB policy & align Sales/Payments/Dashboard vs Ledger Paid (A2) | medium |
| 5 | One shared tax helper; retire line-level VAT subtraction (A9) | medium |
| 6 | One canonical money formula for cancellations (A4) | medium |
| 7 | Attribution toggle (punch vs collection) standardized on all screens + label (A1) | larger |
| 8 | Unify room/merge exclusion + payment-method classifier into one shared predicate module (A10/A5) | larger |

## D. Open questions for the owner/backend team
1. Should revenue mean **billed (punch day)** or **collected (settlement day)**? Today the module ships both without labelling.
2. Is TAB revenue recognised at punch or settlement? (Backend itself says "unpaid"; Insights says "paid".)
3. Why do partially-cancelled orders keep non-zero financials on cancelled lines (`012580`: ₹120 order vs ₹10,680 cancelled lines)? Backend data bug — both reports are victims.
4. June 3 order `012612` — ₹1,02,285.90 cancelled ("Others"): genuine, or test/mistake? It dominates June cancellation KPIs.
5. Confirm item-level `gst_tax_amount` semantics (pure GST vs GST+VAT) on a VAT-enabled restaurant to settle the A9 conflict definitively.

---
*Replication scripts + raw data: `/app/audit_data/` (analyze.py reproduces every number in this report).*
