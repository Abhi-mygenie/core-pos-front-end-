# CR-423 — Revised Impact Analysis (Gate 2)

**ID:** CR-423
**Date:** 2026-11-02 (revised from 2026-10-22)
**Code Reality:** PARTIAL — 34/40 pages have working exports, 6 need fixes
**Risk:** MEDIUM
**Conflict Pre-Check:** CLEAN — no active items on any of the 6 files

---

## 1. Per-Page Audit: Data Source + Export Status + Data Captured

### Page 1: CancellationsMockup.jsx

| Aspect | Detail |
|---|---|
| **Data Source** | **BACKEND aggregation** — `POST /insights-cancellations` via `fetchInsightsCancellations()` |
| **Response shape** | `{ summary, by_day[], by_stage[], by_reason[], by_employee[], items[] }` |
| **FE computation** | `analytics` useMemo: stageData, byReason, byEmployee, daily, byHour (CR-480), peakHour |
| **Detail data** | `cancelledItems[]` — orderNumber, date, time, foodName, qty, amount, stage, reason, cancelledBy, station |
| **Export status** | ❌ **BOTH DISABLED** — `enabled: false` on L168-169. No `buildExportPayload`. No `handleDownloadAction`. |
| **Data captured correctly?** | ✅ YES — all sections (KPIs, stage donut, reasons, employees, daily trend, hourly trend, detail table) have data. Export just needs to serialize them. |
| **Fix needed** | Implement `buildExportPayload()` with: Summary sheet (KPIs) + Detail sheet (all cancelledItems columns) + Stage/Reason/Employee summaries. Enable both buttons. |

### Page 2: RoomOrdersMockup.jsx

| Aspect | Detail |
|---|---|
| **Data Source** | **FE aggregation** — `getRoomOrdersForRange()` calls `order-logs-report` + processes room orders |
| **Response** | Processed in FE: room orders with items, grouped by date, KPIs computed |
| **Export status** | ⚠️ **UI present, handler calls `exportReportAsExcel`/`exportReportAsPDF` INLINE** (L447-478) — already has working export with column mapping |
| **Data captured correctly?** | ✅ YES — export calls exist at L447 (Excel) and L471 (PDF) with proper column headers |
| **Fix needed** | Actually **WORKING** (L447-478) — was misreported in original investigation. Inline export, not `buildExportPayload` pattern, but functional. **REMOVE from scope.** |

### Page 3: PLReportPage.jsx

| Aspect | Detail |
|---|---|
| **Data Source** | **BACKEND aggregation** — `POST /profit-loss-report` via `getProfitLossReport()` |
| **Response** | `{ summary: { total_sales, paid_revenue, expenses, purchase, profit_loss }, rows: [{ date, sales, expenses, ... }] }` |
| **Export status** | ⚠️ **PDF only** (L147-157 — custom HTML-based PDF). No Excel button. |
| **Data captured correctly?** | ✅ YES for PDF — includes Date, Sales, Paid Revenue, Expenses, Purchase, Net P&L with totals footer |
| **Fix needed** | Add Excel export using `reportExporter` pattern. Data is already transformed in `dailyData[]` + `summary`. |

### Page 4: OrderReportBetaPage.jsx

| Aspect | Detail |
|---|---|
| **Data Source** | **BACKEND aggregation** — `POST /daily-order-report-details-combined` via `getOrderReportBetaCombined()` |
| **Response** | `{ daily_reports: [{ date, orders: [...] }], totals: {...} }` — pre-computed by backend |
| **Export status** | ⚠️ **Excel only** (L369-376 — uses **backend Excel endpoint** `ORDER_REPORT_BETA_EXCEL`). No PDF. |
| **Data captured correctly?** | ✅ YES for Excel — backend generates the XLSX directly. FE just downloads. |
| **Fix needed** | Add PDF export. Can reuse the existing filtered/rendered table data. |

### Page 5: FoodCourtMockup.jsx

| Aspect | Detail |
|---|---|
| **Data Source** | **FE aggregation** — `getFoodCourtForRange()` processes order-logs into food court format |
| **Export status** | ✅ **WORKING** — inline `exportReportAsExcel` at L391 + `exportReportAsPDF` at L432 with proper headers |
| **Data captured correctly?** | ✅ YES — Token#, Time, Station, Items, Qty, Amount, Discount, Tax, Total, Status |
| **Fix needed** | Actually **WORKING** — was misreported. **REMOVE from scope.** |

### Page 6: FoodCourtBetaPage.jsx

| Aspect | Detail |
|---|---|
| **Data Source** | **BACKEND aggregation** — `getFoodCourtBetaOrders()` |
| **Export status** | ✅ **WORKING** — `exportReportAsExcel` at L267 + `exportReportAsPDF` at L286 |
| **Data captured correctly?** | ✅ YES |
| **Fix needed** | Actually **WORKING** — was misreported. **REMOVE from scope.** |

---

## 2. Revised Scope (3 pages, not 6)

Original investigation (2026-10-17) reported 6 pages. Re-verification shows **3 are already working** (RoomOrders, FoodCourt, FoodCourtBeta have inline exports). Revised scope:

| # | Page | Data Source | Issue | Fix | Priority |
|---|------|-----------|-------|-----|:---:|
| **1** | `CancellationsMockup.jsx` | Backend aggregation | Both Excel+PDF disabled, no `buildExportPayload` | Implement full export | **P1** |
| **2** | `PLReportPage.jsx` | Backend aggregation | PDF only, no Excel | Add Excel export | **P2** |
| **3** | `OrderReportBetaPage.jsx` | Backend aggregation | Excel only (backend-generated), no PDF | Add PDF export | **P2** |

---

## 3. Data Completeness Audit — What Should Be in Each Export

### CancellationsMockup Export Payload

**Sheet 1: Summary**
| Field | Source | In UI? |
|---|---|---|
| Total Cancellations | `analytics.totalQty` | ✅ KPI card |
| Order Count | `analytics.cancelledOrderCount` | ✅ KPI card subtitle |
| Item Count | `analytics.itemQty` | ✅ KPI card subtitle |
| Revenue Loss | `analytics.totalLoss` | ✅ KPI card |
| Order Loss | `analytics.orderLoss` | ✅ KPI card |
| Item Loss | `analytics.itemLoss` | ✅ KPI card |
| Before Serving % | `analytics.beforeCookingPct` | ✅ KPI card |
| After Serving % | `analytics.afterServingPct` | ✅ KPI card |

**Sheet 2: Detail (all cancelledItems)**
| Column | Source | In table? |
|---|---|---|
| Order # | `r.orderNumber` | ✅ |
| Date | `r.orderDate` | ✅ |
| Time | `r.orderTime` | ✅ |
| Item | `r.foodName` | ✅ |
| Qty | `r.qty` | ✅ |
| Amount | `r.amount` | ✅ |
| Stage | `r.stage` | ✅ |
| Reason | `r.reason` | ✅ |
| Cancelled By | `r.cancelledBy` | ✅ |
| Station | `r.station` | ✅ |
| Scope | `r.scope` | ✅ (tab filter) |

**Sheet 3: By Stage (optional — data in analytics.stageData)**

**Sheet 4: By Reason (optional — data in analytics.byReason)**

### PLReportPage Excel Payload

| Column | Source | In PDF? |
|---|---|---|
| Date | `r.date` | ✅ |
| Sales | `r.sales` | ✅ |
| Paid Revenue | `r.paidRevenue` | ✅ |
| Expenses | `r.expenses` | ✅ |
| Purchase | `r.purchase` | ✅ |
| Net P&L | `r.profitLoss` | ✅ |
| + Summary totals footer | `summary.*` | ✅ |

### OrderReportBetaPage PDF

Uses the same data already shown in the table — Order#, Date, Platform, Type, Waiter, Items, Amount, GST, Service, Payment, Status.

---

## 4. Scope Lock

**Files WILL change:** `CancellationsMockup.jsx`, `PLReportPage.jsx`, `OrderReportBetaPage.jsx`
**Files WILL NOT touch:** RoomOrdersMockup, FoodCourtMockup, FoodCourtBetaPage (already working), reportExporter.js, any API service
