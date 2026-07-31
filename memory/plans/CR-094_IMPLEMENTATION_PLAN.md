# CR-094 — Implementation Plan: P&L Report (Daily Reports, Above Sales)

**ID:** CR-094
**Gate:** 3 (Implementation Plan)
**Risk:** MEDIUM (new screen, display-only, no existing logic modified)
**Code Reality:** NONE — entirely new screen
**Impact Analysis:** `/app/memory/impact/CR-094_IMPACT_ANALYSIS.md` — verified accurate 2026-07-22
**Mock:** `/app/memory/evidence/CR-094/pl_report_mock.html`

---

## Scope Lock

**Files WILL change:**
1. `pages/reports-module/PLReportPage.jsx` — **NEW** (~300 lines)
2. `api/constants.js` — add 1 endpoint constant
3. `api/services/reportService.js` — add 1 export function
4. `components/layout/Sidebar.jsx` — insert 1 nav item
5. `App.js` — add 1 import + 1 route

**Files WILL NOT touch:** `orderTransform.js`, `CollectPaymentPanel.jsx`, `DashboardPage.jsx`, `settlementService.js`, any existing report page, any existing transform

---

## Execution Sequence

### Edit 1: `api/constants.js` — Add P&L endpoint

**After `ITEM_IMPACT` line** (last line of EXPENSE_ENDPOINTS block, ~line 200), add above the closing `};`:

```javascript
// CR-094: Profit & Loss Report
export const PL_REPORT_ENDPOINT = '/api/v1/vendoremployee/profit-loss-report';
```

**Verification:** `grep PL_REPORT_ENDPOINT /app/frontend/src/api/constants.js` → returns match

---

### Edit 2: `api/services/reportService.js` — Add P&L fetch function

**Before the `export default {` block** (line ~735), insert:

```javascript
// CR-094: Profit & Loss Report
export const getProfitLossReport = async (fromDate, toDate) => {
  const formatDDMMYYYY = (iso) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };
  const { data } = await api.post('/api/v1/vendoremployee/profit-loss-report', {
    date_from: formatDDMMYYYY(fromDate),
    date_to: formatDDMMYYYY(toDate),
  });
  return data;
};
```

Then add `getProfitLossReport` to the default export object.

**Verification:** `grep getProfitLossReport reportService.js` → returns match

---

### Edit 3: `components/layout/Sidebar.jsx` — Insert P&L as first Daily Report child

**At line 95** (current: `{ id: "summary", label: "Sales Summary"...}`), insert BEFORE it:

```javascript
      { id: "profit-loss", label: "P&L Report", path: "/reports-module/profit-loss" },  // CR-094
```

**After (children array becomes):**
```javascript
    children: [
      { id: "profit-loss", label: "P&L Report", path: "/reports-module/profit-loss" },  // CR-094
      { id: "summary", label: "Sales Summary", path: "/reports/summary" },
      { id: "audit", label: "Order Report", path: "/reports/audit" },
      { id: "item-report", label: "Item Report", comingSoon: true },
      { id: "insights-settlement", label: "Settlement Report", path: "/reports-module/settlement" },
    ],
```

**Verification:** Browser sidebar → expand Daily Report → "P&L Report" is first item

---

### Edit 4: `App.js` — Add import + route

**At line 46** (after `import ExpenseReportPage`), insert:

```javascript
import PLReportPage from "./pages/reports-module/PLReportPage"; // CR-094
```

**Inside the reports-module Routes block** (after the ExpenseReportPage route at ~line 149), insert:

```jsx
              {/* CR-094: P&L Report */}
              <Route path="profit-loss" element={<ProtectedRoute><PLReportPage /></ProtectedRoute>} />
```

**Verification:** Navigate to `/reports-module/profit-loss` → page loads

---

### Edit 5: `pages/reports-module/PLReportPage.jsx` — NEW file (~300 lines)

**Full new page.** Pattern: clone from `DailySalesMockup.jsx` / `ExpenseReportPage.jsx` structure:

```
Structure:
├── Imports (React, hooks, recharts, lucide, contexts, services)
├── Constants (COLUMNS, DOWNLOAD_MENU, KPI definitions)
├── Helpers (fmtINR, fmtISO, formatDDMMYYYY)
├── Chart tooltip component
├── Main component:
│   ├── State: dates, data, loading, sidebar, download menu
│   ├── Fetch: getProfitLossReport(from, to) → setData
│   ├── Computed: aggregated KPIs from summary, chart data from report[]
│   ├── Export handlers (Excel/PDF via reportExporter)
│   └── JSX:
│       ├── Sidebar
│       ├── Header (back + title + date range pill + presets + apply + download)
│       ├── ReportLoadingShield
│       ├── KPI strip (4 cards: Sales, Paid Revenue, Total Expenses, Net P&L)
│       ├── Charts row (2/3 ComposedChart: revenue bars + expense bars, 1/3 PieChart: expense vs purchase)
│       ├── Table (7 columns + summary row)
│       └── Empty state
```

**Key implementation details:**

1. **Date format conversion:** API expects DD/MM/YYYY, FE stores ISO internally
2. **KPI values from `data.summary.*`** — parse with `parseFloat()` (API returns strings)
3. **Chart data from `data.report[]`** — map each row to `{ date, revenue: parseFloat(sales), expenses: parseFloat(total_expenses), profit: parseFloat(profit_loss) }`
4. **Pie chart data:** `[{ name: 'Expenses', value: parseFloat(summary.total_expenses) }, { name: 'Purchase', value: parseFloat(summary.total_purchase) }]`
5. **P&L color coding:** green if `profit_loss >= 0`, red if negative
6. **Sorting:** client-side sort by any column, default sort by date descending
7. **Export:** use existing `exportReportAsExcel` / `exportReportAsPDF` from `utils/reportExporter`
8. **data-testid:** prefix all with `pl-report-`

---

## Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 1 | `constants.js` | Add `PL_REPORT_ENDPOINT` | `grep PL_REPORT_ENDPOINT constants.js` | NO |
| 2 | `reportService.js` | Add `getProfitLossReport()` | `grep getProfitLossReport reportService.js` | NO |
| 3 | `Sidebar.jsx:95` | Insert P&L nav item first in Daily Report | Browser: sidebar → Daily Report → first child = "P&L Report" | NO |
| 4 | `App.js:46+149` | Import + route for PLReportPage | Browser: navigate to `/reports-module/profit-loss` → page loads | NO |
| 5 | `PLReportPage.jsx` (NEW) | Full report page | Browser: date range → Apply → KPIs populate → chart renders → table shows rows → summary row correct | NO |
| 6 | — | Compile check | webpack compiles with 0 new warnings | NO |
| 7 | — | API integration | curl `POST /api/v1/vendoremployee/profit-loss-report` with auth → 200 + data | NO |
| 8 | — | Date format | Send DD/MM/YYYY dates → API returns data (not 400) | NO |
| 9 | — | KPI accuracy | `summary.total_profit_loss` matches Net P&L KPI card value | NO |
| 10 | — | Chart renders | Bar chart shows blue (revenue) + red (expenses) bars per day; Donut shows expenses vs purchase split | NO |
| 11 | — | Export | Download as Excel → file opens with 7 columns + summary row | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-094 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: CR-094 row updated with IMPLEMENTED + files list
- [ ] FILE_OWNERSHIP.md: add PLReportPage.jsx (CR-094), reportService.js (CR-094), Sidebar.jsx (CR-094), App.js (CR-094), constants.js (CR-094)
- [ ] Code markers: // CR-094 comment in every modified/created file
```

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Date format mismatch (ISO vs DD/MM/YYYY) | HIGH | Explicit `formatDDMMYYYY()` helper, curl-verified |
| API returns string values ("0.00") | MEDIUM | `parseFloat()` on all numeric fields before display/chart |
| Empty data for new restaurant | LOW | Empty state message "No data for selected period" |
| Large date ranges (slow) | LOW | Max 365 days, loading shield |
| Sidebar ordering wrong | LOW | Insert as array index 0, visual verification |

---

## Next
Gate 4 GO (Owner approval) → Implementation
