# CR-016 — Impact Analysis (Gate 2)

**Status:** COMPLETE
**Date:** 2026-06-09

---

## 1. API Response Shape (Live Verified — vishal@vishal.com, 9-day range)

### Multi-Day Response Structure

**Request:** `POST /waiter/get-settlement-report`
```json
{ "date_from": "01-06-2026", "date_to": "09-06-2026" }
```

**Response top-level keys:** `success`, `data`, `totals`

### Aggregate Totals (across entire range)

| Field | Type | Present in Day-Level? |
|---|---|---|
| `total_opening_balance` | number | ✅ |
| `total_today_collection` | number | ✅ |
| `total_today_settlement` | number | ✅ |
| `total_balance_to_settle` | number | ✅ |
| `total_pilferage` | number | ✅ |
| `total_total_funds` | number | ✅ |
| `total_sale` | number | ✅ |
| `total_paid` | number | ✅ |
| `total_unpaid` | number | ✅ |
| `total_today_delivery_charge` | number | ✅ |
| `total_today_service_charge` | number | ✅ |
| `total_today_tips` | number | ✅ |
| `total_today_given` | number | ✅ |
| `last_day_pending` | number | ✅ |
| `stattlement_status` | int | ❌ only in top-level |

**Key finding:** `stattlement_status` exists ONLY in top-level totals, NOT in day-level totals. No way to determine per-day close status from this API.

### Day-Level (`data[]`)

Each day entry: `{ date, totals, waiters }` — totals has 14 of 15 fields (missing `stattlement_status`).

### Waiter-Level (`data[].waiters[]`)

20 fields per waiter — identical shape to CR-015 single-day response. All number fields come as **strings** (e.g., `"2416.00"`). Transform must use `parseFloat()`.

### API Behavior Notes

| Behavior | Verified |
|---|---|
| Returns ALL days in range (including zero-activity) | ✅ 9 days returned, 8 had zero data |
| Aggregate totals = sum across range | ✅ matches single active day |
| Zero-activity days have empty waiters array? | ❌ still returns full waiter list with all zeros |
| Date format in response | `YYYY-MM-DD` |
| Date format in request | `DD-MM-YYYY` |
| Max range tested | 9 days (need to test 30/60 day range for performance) |

---

## 2. Shared Component Compatibility

### Components That CAN Be Reused Directly

| Component | Reuse | Notes |
|---|---|---|
| `Sidebar` | ✅ Direct | Add one entry under Insights children |
| `ReportLoadingShield` | ✅ Direct | Props: `isLoading`, `hasLoadedOnce`, `error`, `onRetry`, `children` — all compatible |
| `useReportFetch` | ✅ Direct | Pass fetch function + deps array — returns `{ data, isLoading, error, hasLoadedOnce, refetch }` |
| `reportExporter.js` | ✅ Direct | `exportReportAsExcel()`, `exportReportAsPDF()` — accepts column/row config |

### Components That Are INLINE (not shared — must be rebuilt)

| Pattern | Where It Lives | CR-016 Approach |
|---|---|---|
| **From-To DatePicker** | Order Ledger has inline `<input type="date">` with presets, Apply button, max 60 day range — NOT the shared `DatePicker` component | **Clone the inline pattern** from OrderLedger (lines 208-209, 270-275, 590-600) |
| **Download Menu** | Order Ledger has inline `DOWNLOAD_MENU` array + dropdown — NOT `ExportButtons` component | **Clone the inline pattern** from OrderLedger (lines 114-120, 237, 539-542) |
| **KPI Strip** | Order Ledger builds its own summary strip inline | **Build inline** — 5 cards matching CR-015 KPI pattern |

**`ExportButtons` shared component** (from `components/reports/`) is used by Audit Report (AllOrdersReportPage), NOT by the Insights S5/S6 screens. The Insights pattern uses the inline Download dropdown. CR-016 should follow the Insights pattern.

**`DatePicker` shared component** is a single-day picker. The Insights pattern uses inline From-To inputs with Apply. CR-016 needs date range → use inline pattern.

---

## 3. Files to Create (3 new)

| File | Purpose | Est. Lines |
|---|---|---|
| `src/pages/reports-module/SettlementReportMockup.jsx` | Main page. Inherits: Sidebar layout, ReportLoadingShield, useReportFetch. Inline: From-To date inputs, KPI strip, day-summary table, expandable waiter rows, Download menu. | ~450 |
| `src/api/services/settlementReportService.js` | `getSettlementForRange(fromDate, toDate)` — thin wrapper calling existing `getSettlementReport` | ~15 |
| `src/api/transforms/settlementReportTransform.js` | `fromAPI.settlementRange(response)` — maps multi-day response to UI shape: `{ aggregateTotals, days: [{ date, totals, waiters }] }` | ~50 |

## 4. Files to Modify (2 existing)

| File | Change | Lines Changed | Risk |
|---|---|---|---|
| `App.js` | Add `<Route path="/reports-module/settlement" ... />` (protected) | ~2 lines | LOW |
| `Sidebar.jsx` | Add `{ id: "insights-settlement", label: "Settlement Report", path: "/reports-module/settlement" }` to Insights children array | ~1 line | LOW |

## 5. Files NOT Touched

| File Category | Files | Reason |
|---|---|---|
| CR-015 Settlement Panel | `SettlementPanel.jsx`, `settlementService.js`, `settlementTransform.js` | Independent — different route, different purpose (day-close vs history) |
| Other Insights reports | `OrderLedgerMockup.jsx`, `ItemSalesHybridMockup.jsx`, `SalesMockup.jsx`, etc. | No shared state, only reuses shared components |
| Order-taking / Dashboard | `DashboardPage.jsx`, `OrderEntry.jsx`, all context files | Zero touch |
| Menu Management | `MenuManagementPanel.jsx`, `BulkEditor.jsx` | Zero touch |
| Shared report components | `ReportLoadingShield.jsx`, `useReportFetch.js`, `reportExporter.js` | Read-only usage, no modifications |

---

## 6. Data Transform Mapping

### Day Summary Row (table)

| UI Column | API Source | Transform |
|---|---|---|
| Date | `data[].date` | Format `YYYY-MM-DD` → `DD MMM YYYY` |
| Opening Balance | `data[].totals.total_opening_balance` | Direct number |
| Cash Collected | `data[].totals.total_today_collection` | Direct number |
| Total Funds | `data[].totals.total_total_funds` | Direct number |
| Settled | `data[].totals.total_today_settlement` | Direct number |
| Expected | Computed | `total_funds − settled − pilferage` |
| Pilferage | `data[].totals.total_pilferage` | `Math.abs(value)` for display |
| # Waiters | `data[].waiters.length` active count | Filter: `collection > 0 || opening > 0` |

### Waiter Drill-Down Row (expandable)

Identical to CR-015 waiter transform — reuse `fromAPI.waiter()` from `settlementTransform.js`.

### KPI Aggregate Strip

| Card | Source | Notes |
|---|---|---|
| Total Opening | `totals.total_opening_balance` | Direct from aggregate |
| Total Cash Collected | `totals.total_today_collection` | Direct from aggregate |
| Total Settled | `totals.total_today_settlement` | Direct from aggregate |
| Total Expected | Computed | `total_funds − settled − pilferage` |
| Total Pilferage | `totals.total_pilferage` | `Math.abs()` for display |

---

## 7. Regression Risk

| Area | Risk | Reason |
|---|---|---|
| Dashboard / Order-taking | **ZERO** | New page, no shared state |
| CR-015 Settlement Panel | **ZERO** | Different route (`/settlement` vs `/reports-module/settlement`), independent |
| Other Insights reports | **ZERO** | No shared state, read-only reuse of shared components |
| Sidebar | **LOW** | Adding one entry to Insights children array |
| App.js routes | **LOW** | Adding one route |
| Shared components | **ZERO** | Using existing components, no modifications |

---

## 8. Open Questions — RESOLVED (Owner answered 2026-06-09)

| # | Answer | Decision |
|---|--------|----------|
| Q-016-1 | **A) Show all days** including zero-activity | All days rendered, no filtering |
| Q-016-2 | **A) Skip** Day Status column | API lacks per-day `stattlement_status` — column omitted |
| Q-016-3 | **1 year (365 days)** | API performance tested: 5.2s for 366 days, 2.6 MB — viable |
| Q-016-4 | **Before Sales** in sidebar | Insert after "Dashboard", before "Sales" |

### API Performance Test Results (cafe103, 2026-06-09)

| Range | Response Time | Size | Days |
|-------|--------------|------|------|
| 30 days | 4.2s | 224 KB | 31 |
| 90 days | 4.0s | 656 KB | 91 |
| 180 days | 4.4s | 1.3 MB | 181 |
| **365 days** | **5.2s** | **2.6 MB** | **366** |

---

*End of Impact Analysis — Gate 2 Complete. Open Questions resolved by owner 2026-06-09. Gate 3 (Implementation Plan) ready to proceed.*
