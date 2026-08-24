# CR-094 — Impact Analysis: P&L Report (Daily Reports, Above Sales)

**ID:** CR-094
**Gate:** 2 (Impact Analysis)
**Risk:** MEDIUM (new screen, no existing logic modified, no financial calculations — display only)
**Code Reality:** NONE — no P&L screen, service, or route exists
**Conflict Pre-Check:** NO active items touching Daily Reports nav or reportService.js

---

## 1. Data Flow Trace

```
API Endpoint:
  POST /api/v1/vendoremployee/profit-loss-report
  Auth: Bearer token (standard axios interceptor)
  Headers: X-localization: en (via axios interceptor)
  Payload: { date_from: "DD/MM/YYYY", date_to: "DD/MM/YYYY" }
  Response: {
    report: [{ date, sales, paid_revenue, expenses, purchase, total_expenses, profit_loss }],
    summary: { total_sales, total_paid_revenue, total_expenses, total_purchase, total_expenses_combined, total_profit_loss }
  }

  ⚠ Date format: DD/MM/YYYY (NOT ISO) — FE must convert before sending

UI Flow:
  Sidebar → Daily Report → "P&L Report" (first position, ABOVE Sales Summary)
  → PLReportPage.jsx (new) → date range picker (from/to)
  → API call → table with 7 columns + summary footer row
  → KPI strip: Revenue, Expenses, Purchase, Net P&L
  → Export: Excel/PDF (follow existing reportExporter pattern)

Service Layer:
  New function in reportService.js (or new plReportService.js)
  → getProfitLossReport(fromDate, toDate) 
  → api.post(ENDPOINTS.P_AND_L_REPORT, { date_from: formatDDMMYYYY(from), date_to: formatDDMMYYYY(to) })
```

---

## 2. Affected Files

| # | File | Current State | Change | Lines |
|---|------|--------------|--------|-------|
| 1 | `pages/reports-module/PLReportPage.jsx` | **NEW** | Full report page: sidebar + header + date range + KPI strip + table + summary row + export | ~280-320 lines |
| 2 | `api/constants.js` | No P&L endpoint | Add `P_AND_L_REPORT: '/api/v1/vendoremployee/profit-loss-report'` | ~1 line |
| 3 | `api/services/reportService.js` | Existing report functions | Add `getProfitLossReport(from, to)` | ~8 lines |
| 4 | `components/layout/Sidebar.jsx` | Daily Report children: [Sales Summary, Order Report, Item Report, Settlement Report] | Insert "P&L Report" as FIRST child (above Sales Summary) | ~1 line |
| 5 | `App.js` | No P&L route | Add `import PLReportPage` + `<Route path="profit-loss" ...>` inside reports-module | ~3 lines |

**Files WILL NOT touch:** `orderTransform.js`, `CollectPaymentPanel.jsx`, `DashboardPage.jsx`, `settlementService.js`, any existing report page

---

## 3. Design Pattern (follows existing reports exactly)

Reference screens: `DailySalesMockup.jsx`, `SettlementReportMockup.jsx`, `ExpenseReportPage.jsx`

| Pattern Element | Source | Apply to P&L |
|---|---|---|
| Sidebar + main layout | All reports | ✅ Same flex layout |
| Header: back arrow + title + date range + refresh + download | DailySalesMockup | ✅ Same header strip |
| Date range picker (from/to with presets 7D/30D/90D/Custom) | DailySalesMockup | ✅ Same picker |
| KPI strip (4-5 cards) | DailySalesMockup, SettlementReportMockup | ✅ 4 KPI cards |
| Data table with column headers + sortable | SettlementReportMockup | ✅ 7 columns |
| Summary/total row (bold, sticky bottom or separate strip) | SettlementReportMockup | ✅ Summary from API |
| Export dropdown (Excel/PDF + disabled email/whatsapp/sms) | All reports | ✅ Same DOWNLOAD_MENU |
| ReportLoadingShield | All reports | ✅ Loading skeleton |
| InsightsCache (sharedFrom/sharedTo) | All reports | ✅ Shared date state |
| `useRestaurant()` context | All reports | ✅ Restaurant info |

---

## 4. Column Definition

| # | Key | Label | Align | Format |
|---|-----|-------|-------|--------|
| 1 | `date` | Date | left | DD/MM/YYYY (as-is from API) |
| 2 | `sales` | Sales | right | ₹ currency |
| 3 | `paid_revenue` | Paid Revenue | right | ₹ currency |
| 4 | `expenses` | Expenses | right | ₹ currency (red if > 0) |
| 5 | `purchase` | Purchase | right | ₹ currency (red if > 0) |
| 6 | `total_expenses` | Total Expenses | right | ₹ currency (red if > 0) |
| 7 | `profit_loss` | Profit / Loss | right | ₹ currency (green if +, red if −) |

---

## 5. KPI Cards

| # | Label | Source | Icon | Color |
|---|-------|--------|------|-------|
| 1 | Total Sales | `summary.total_sales` | TrendingUp | green |
| 2 | Paid Revenue | `summary.total_paid_revenue` | Banknote | blue |
| 3 | Total Expenses | `summary.total_expenses_combined` | ArrowDownToLine | orange |
| 4 | Net Profit / Loss | `summary.total_profit_loss` | DollarSign | green if +, red if − |

---

## 6. Date Handling (CRITICAL — DD/MM/YYYY)

The API requires dates in `DD/MM/YYYY` format (returns 400 if ISO). Conversion helper:

```javascript
const formatDDMMYYYY = (isoDate) => {
  const d = new Date(isoDate);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};
```

This is a one-off for this v1 endpoint. Other reports use ISO dates.

---

## 7. Sidebar Placement

Current Daily Report children (Sidebar.jsx ~L95):
```javascript
children: [
  { id: "summary", label: "Sales Summary", path: "/reports/summary" },
  { id: "audit", label: "Order Report", path: "/reports/audit" },
  { id: "item-report", label: "Item Report", comingSoon: true },
  { id: "insights-settlement", label: "Settlement Report", path: "/reports-module/settlement" },
],
```

After (insert as FIRST child):
```javascript
children: [
  { id: "profit-loss", label: "P&L Report", path: "/reports-module/profit-loss" },  // CR-094
  { id: "summary", label: "Sales Summary", path: "/reports/summary" },
  { id: "audit", label: "Order Report", path: "/reports/audit" },
  { id: "item-report", label: "Item Report", comingSoon: true },
  { id: "insights-settlement", label: "Settlement Report", path: "/reports-module/settlement" },
],
```

---

## 8. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Date format mismatch (ISO vs DD/MM/YYYY) | HIGH | Explicit `formatDDMMYYYY()` helper, tested |
| Empty report for restaurants with no data | LOW | Show "No data for selected period" empty state |
| API values are strings ("0.00") not numbers | MEDIUM | `parseFloat()` before display and calculations |
| Negative P&L display | LOW | Color-code: green=profit, red=loss |
| Large date ranges (slow API) | LOW | Loading shield + max range 365 days |

---

## 9. Owner Decisions — ALL RESOLVED

All 3 open questions from intake are now resolved:
1. ✅ Backend endpoint URL + schema confirmed
2. ✅ Date format: DD/MM/YYYY, custom range picker
3. ✅ First position above Sales in Daily Reports

**No blocking decisions needed.**

---

## 10. Downstream Consumers

- NONE — new standalone screen with no dependencies from other components
- Does NOT affect existing Daily Report pages
- Does NOT touch any shared state (uses own local state for data)
- InsightsCache is READ-ONLY (sharedFrom/sharedTo dates) — consistent with all other reports

---

## 11. Mock HTML Screen

Delivered as standalone HTML file at: `/app/memory/evidence/CR-094/pl_report_mock.html`
Follows exact design patterns from DailySalesMockup, SettlementReportMockup, and ExpenseReportPage.

---

## Next
Gate 3 (Implementation Plan) → Gate 4 GO
