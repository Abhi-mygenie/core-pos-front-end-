# INV-001 — Investigation Report: Insights Reports 1-Year Range Feasibility

**ID:** INV-001-INSIGHTS-1YR-RANGE
**Date:** 2026-07-10
**Agent:** INVESTIGATION (AGENT_PROMPT_ALPHA v0.7)
**Steps used:** 10/10
**Confidence:** HIGH (all endpoints probed live against preprod, 18March account)
**Triggered by:** Owner considering lifting the 2-month Insights date-range restriction to 1 year

---

## 1. Summary

All **9 backend-aggregated endpoints** (insights-*) respond well within acceptable UX at 1-year range
(1.2 – 3.3 seconds). The **frontend-aggregated reports** (Item Report Audit tab, PrepServe, Food Court)
are viable for low-to-medium volume restaurants but carry a risk for high-volume data.
The **Order Ledger** cannot support 1-year without a backend contract change — it makes
one API call per day, hard-capped at 92 days in the service layer.

**Bottom line:** Lifting to 1-year is safe for ~90% of the Insights module. Two targeted guards
are needed before release.

---

## 2. Architecture Map — Who Makes What API Call

### GROUP A — Pure backend aggregation (single POST per load)

| Report Screen(s) | Endpoint | File |
|-----------------|----------|------|
| Dashboard (KPI strip) + Audit Log | `insights-dashboard` | DashboardMockup.jsx, AuditLogMockup.jsx |
| Sales, Daily Sales, Hourly Sales, Day of Week, Channel Pivot, Gateway Recon, Round Off, Payments | `insights-sales` | SalesMockup.jsx, DailySalesMockup.jsx, HourlySalesMockup.jsx, DayOfWeekMockup.jsx, ChannelPivotMockup.jsx, GatewayReconMockup.jsx, RoundOffMockup.jsx, PaymentsMockup.jsx |
| Item Report (main view) + KOT Variance | `insights-items` | ItemSalesHybridMockup.jsx, KotVarianceMockup.jsx |
| Cancellations + Cancel Detail + Order Notes | `insights-cancellations` | CancellationsMockup.jsx, CancelDetailMockup.jsx, OrderNotesMockup.jsx |
| Tax Slabs + Tax Calc + Tax Detail | `insights-tax` | TaxSlabsMockup.jsx, TaxCalcMockup.jsx, TaxDetailMockup.jsx |
| Discount Report + Coupon Usage | `insights-discounts` | DiscountReportMockup.jsx, CouponUsageMockup.jsx |
| Staff Servers + Staff Cashiers + Cashier Settlement + Tip | `insights-staff` | StaffServersMockup.jsx, StaffCashiersMockup.jsx, CashierSettlementMockup.jsx, TipReportMockup.jsx |
| Customers RFM + Customers Mix | `insights-customers` | CustomersRfmMockup.jsx, CustomersMixMockup.jsx |
| Delivery Charge + Room Transfers + Table Sales | `insights-locations` | DeliveryChargeMockup.jsx, RoomTransfersMockup.jsx, TableSalesMockup.jsx |
| Settlement Report | `settlementReportService` (separate, non-insights) | SettlementReportMockup.jsx |

> **Note:** SalesMockup and PaymentsMockup still import `orderLedgerService` in their files but
> those imports are commented-out reference lines (CR-049 migration). Both now call only
> `fetchInsightsSales`. Confirmed at line 201 (SalesMockup) and line 201 (PaymentsMockup).

### GROUP B — Frontend-aggregated via ORDER_LOGS_REPORT

These fetch **all raw order data** and aggregate in the browser.

| Report Screen | Service | FE computation |
|--------------|---------|---------------|
| Item Report — **Audit tab** | `getItemSalesAggregated` → `ORDER_LOGS_REPORT` (1 call, full range) | ~500-line JS loop across all order lines |
| Prep/Serve Time | `getPrepServeAnalytics` → `ORDER_LOGS_REPORT` (chunked) | Kitchen timing aggregation |
| Food Court | `getFoodCourtForRange` → `ORDER_LOGS_REPORT` (chunked, maxDays guard) | Aggregator/channel split |

### GROUP C — N-per-day API calls

| Report Screen | Service | Mechanism |
|--------------|---------|-----------|
| Order Ledger | `getTabSettlementsForRange` → `DAILY_SALES_REPORT` × 1 call/day | Hard-capped at 92 days in service (line 254 of orderLedgerService.js): `days.length < 92` |

### GROUP D — No real data API (UI state screens)
- **EdgeStatesMockup**: Empty/loading/error state testing screen. No live data calls.

---

## 3. Timing Results

### 3a. Backend endpoints — 62-day vs 1-year

| Endpoint | 62-day (current) | **1-year** | Slowdown | Response size (1yr) | Verdict |
|----------|-----------------|------------|----------|---------------------|---------|
| insights-locations | 689ms | **1,241ms** | 1.8× | 18.5 KB | ✅ Fast |
| insights-staff | 817ms | **1,949ms** | 2.4× | 3.1 KB | ✅ Fast |
| insights-tax | 896ms | **2,302ms** | 2.6× | 18.5 KB | ✅ Acceptable |
| insights-cancellations | 896ms | **3,311ms** | 3.7× | 265 KB | ✅ Acceptable |
| insights-sales | 1,112ms | **2,864ms** | 2.6× | 35.3 KB | ✅ Acceptable |
| insights-dashboard | 1,249ms | **3,178ms** | 2.5× | 4.4 KB | ✅ Acceptable |
| insights-discounts | 1,304ms | **2,757ms** | 2.1× | 24.7 KB | ✅ Acceptable |
| insights-items | 1,356ms | **2,690ms** | 2.0× | 107 KB | ✅ Acceptable |
| insights-customers | 1,377ms | **2,636ms** | 1.9× | 26.0 KB | ✅ Acceptable |

**Max response time across all backend reports at 1-year: 3.3 seconds (cancellations).**
All endpoints: HTTP 200. No timeouts. No errors.

### 3b. ORDER_LOGS_REPORT — 62-day vs 1-year

| Date range | Time | Size | Orders returned |
|-----------|------|------|----------------|
| 62 days | 1,251ms | 149 KB | 30 orders |
| **1 year** | **3,591ms** | **1.88 MB** | **574 orders** |

> Test restaurant (18March) has ~574 orders per year = ~1.6 orders/day (very low volume).
> A typical busy restaurant (100 orders/day) would generate 36,500 orders/year
> → estimated response: ~120 MB → risk of browser memory pressure + 30–120s JS computation.

### 3c. Order Ledger (N-calls-per-day)

- 62-day range → 62 × `DAILY_SALES_REPORT` calls (parallel, browser limit ~6 concurrent)
- Estimated time for 60 days: ~10–15 seconds (6 concurrent × 10 batches × ~1s each)
- 1-year: would need 365 calls → **not viable** (estimated 60–120 seconds)
- **Hard code cap in service at 92 days regardless of date picker setting**

---

## 4. Current Date Restrictions Per Report

| Report file | Current MAX_RANGE_DAYS | Date source | 1-year safe? |
|------------|----------------------|-------------|-------------|
| DashboardMockup.jsx | **62** (master picker) | Own picker → writes to InsightsCacheContext | ✅ Yes (backend) |
| ItemSalesHybridMockup.jsx | **62** | Own picker | ⚠️ Main view: Yes; Audit tab: caveat (see §5) |
| CancellationsMockup.jsx | **62** | Own picker | ✅ Yes (3.3s) |
| OrderLedgerMockup.jsx | **60** | Own picker | ❌ No (N-per-day calls) |
| RoomOrdersMockup.jsx | **60** | Own picker | ⚠️ Same issue as Order Ledger for paid filter |
| SettlementReportMockup.jsx | **365** | Own picker | ✅ Already enabled |
| All other sub-reports | None (inherit from Dashboard) | InsightsCacheContext | ✅ Yes (backend) |

---

## 5. Recommendations

### ✅ SAFE TO LIFT — Backend reports (Scope: 1 constant change each)

| Action | File | Change |
|--------|------|--------|
| Lift Dashboard + all sub-reports | `DashboardMockup.jsx` line 70 | `MAX_RANGE_DAYS = 62` → `365` |
| Lift Cancellations group | `CancellationsMockup.jsx` line 189 | `MAX_RANGE_DAYS = 62` → `365` |
| Lift Item Report main view | `ItemSalesHybridMockup.jsx` line 166 | `MAX_RANGE_DAYS = 62` → `365` |
| (No change needed) | `SettlementReportMockup.jsx` | Already 365 ✅ |

**Risk: LOW** — single-line constants in date-picker guard logic. No API contract changes. No financial logic.

### ⚠️ LIFT WITH GUARD — FE-aggregated reports

**Item Report — Audit tab** (file: `ItemSalesHybridMockup.jsx`, calls `getItemSalesAggregated`):
- Safe for 18March (574 orders → ~5s total). Risky for high-volume restaurants.
- Recommended guard: after `ORDER_LOGS_REPORT` resolves, check `orders.length`.
  If > 5,000 orders: show warning `"Audit tab analysis is limited to 62 days for large datasets"` and skip FE computation.
- This keeps main view (backend) at 365 days while protecting the Audit tab.

**PrepServe Time + Food Court**: Currently no MAX_RANGE_DAYS. Already use chunked ORDER_LOGS_REPORT.
- Keep current behavior (no change needed for now). Both use internal chunking guards.

### ❌ DO NOT LIFT — Order Ledger

`OrderLedgerMockup.jsx` (MAX_RANGE_DAYS = 60) must stay at its current limit.
- Root cause: `getTabSettlementsForRange` in `orderLedgerService.js` makes one `DAILY_SALES_REPORT`
  call per day (hard-capped at 92 days in code: line 254).
- Fix requires: Backend to add a date-range endpoint for `DAILY_SALES_REPORT`
  (already filed in Backend Brief as "backend brief #4 asks for range endpoint" — comment at
  `orderLedgerService.js` line 249).
- **Same applies to RoomOrdersMockup for the "paid" filter** (uses order-logs-report per day).

### ❌ NOT APPLICABLE — EdgeStatesMockup, FoodCourtMockup
- EdgeStatesMockup: UI state testing screen, no live API.
- FoodCourtMockup: Uses ORDER_LOGS_REPORT chunks, same as PrepServe — not a Insights dashboard sub-report.

---

## 6. Evidence Artifacts

| Artifact | Path |
|---------|------|
| 1-year probe responses | `/tmp/r_*.json` (session only) |
| 62-day probe responses | `/tmp/b_*.json` (session only) |
| This report | `/app/memory/evidence/INV-001-INSIGHTS-1YR-RANGE/INV001_INVESTIGATION_REPORT.md` |

**Test context:**
- Restaurant: 18March (`owner@18march.com`)
- Date range: `2025-07-09 → 2026-07-09` (366 days)
- Baseline: `2026-05-09 → 2026-07-09` (62 days)
- All calls: authenticated, HTTP 200, no errors

---

## 7. Retroactive Candidates

None.

---

## 8. Planning Skip Eligibility

Backend report lift (3 file changes, each 1 line):
- ≤10 lines: ✅
- 1-3 files: ✅
- Not hotspot (R5): ✅ (date picker guard constants only)
- Not financial logic (R6): ✅

**Planning skip eligible for the 3 backend MAX_RANGE_DAYS constant changes.**
Owner must approve before implementing.

The Item Report Audit tab guard is a slightly larger change (adds a conditional check + user message after fetch).
Risk: LOW. Also planning-skip eligible with owner approval.
