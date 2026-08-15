# CR-061 — Gate 3: Implementation Plan

**ID:** CR-061
**Gate:** 3 — Implementation Plan
**Date:** 2026-07-07 (re-plan)
**Depends on:** CR_061_IMPACT_ANALYSIS.md (Gate 2)
**Code Reality:** PARTIAL
**Risk:** LOW

> ⚠ Sections marked **[Q-DEPENDENT]** require owner answers from the Gate 2 Owner Decision Queue before the Implementation agent proceeds. Do not implement Q-dependent sections without owner answers.

---

## SCOPE LOCK

### Files WILL create (new)
1. `pages/reports-module/ExpenseReportPage.jsx` — full report page (~500 lines)
2. `api/services/expenseReportService.js` — `aggregateExpenses()` function only (~30 lines)

### Files WILL change (existing — additive only)
1. `components/layout/Sidebar.jsx` — add Expense Report entry under Insights (**Q3-PENDING**: 1 or 2 lines)
2. `App.js` — add import + route for ExpenseReportPage

### Files OUT OF SCOPE — DO NOT TOUCH
- `pages/OrderSummaryPage.jsx` — Surface B **deferred to later phase**
- `api/services/expenseService.js` — reused as-is (fetch functions already exist here)
- `api/transforms/expenseTransform.js` — reused as-is (transform + date utils already exist here)
- `api/constants.js` — no new constants needed
- `contexts/InsightsCacheContext.jsx` — used, not modified
- All order / payment / settlement / socket / menu files
- All other Insights report pages

---

## EXECUTION SEQUENCE

---

### Step 1 — `api/services/expenseReportService.js` — NEW FILE

**Location:** `api/services/expenseReportService.js`
This file contains ONE thing only: the `aggregateExpenses()` pure function.
All fetch functions (getExpenseReport, exportExpenseReport, getCategoryList, getPaymentMethods) remain in `expenseService.js` and are imported directly from there in the page component.

**Logic (exact, no placeholders):**

```javascript
// CR-061: client-side aggregation from raw expense transactions
// Input: transactions[] from expenseTransform.expenseReport(res).transactions
// Each transaction: { id, date ("DD/MM/YYYY"), expense, category, categoryId, amount, paymentMethod, quantity, unit }

export const aggregateExpenses = (transactions = [], apiTotalAmount = 0) => {
  const totalAmount = apiTotalAmount || transactions.reduce((s, t) => s + t.amount, 0);

  const byCategory = {};
  const byPayment  = {};
  const byDate     = {};

  transactions.forEach((t) => {
    const amt  = t.amount;
    const cat  = t.category  || 'Unknown';
    const pay  = t.paymentMethod || 'Unknown';
    const date = t.date      || '';   // already "DD/MM/YYYY" — use directly as group key

    byCategory[cat] = (byCategory[cat] || 0) + amt;
    byPayment[pay]  = (byPayment[pay]  || 0) + amt;
    if (!byDate[date]) byDate[date] = { total: 0, count: 0 };
    byDate[date].total += amt;
    byDate[date].count += 1;
  });

  const activeDays = Object.keys(byDate).length;
  const avgDaily   = activeDays > 0 ? totalAmount / activeDays : 0;

  const byCatArr = Object.entries(byCategory)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  const byPayArr = Object.entries(byPayment)
    .map(([method, total]) => ({ method, total }))
    .sort((a, b) => b.total - a.total);

  // [Q5-DEPENDENT] sort: using parseDateDDMMYYYY (Option A) shown below
  // Option B alternative: inline split "DD/MM/YYYY" → new Date(YYYY, MM-1, DD)
  const dailyArr = Object.entries(byDate)
    .map(([date, d]) => ({ date, total: d.total, count: d.count }))
    .sort((a, b) => parseDateDDMMYYYY(a.date) - parseDateDDMMYYYY(b.date));
    // parseDateDDMMYYYY imported from expenseTransform.js

  const topCategory = byCatArr[0] ?? null;
  const highestDay  = dailyArr.length
    ? [...dailyArr].sort((a, b) => b.total - a.total)[0]
    : null;

  return {
    totalAmount,
    transactionCount: transactions.length,
    activeDays,
    avgDaily,
    topCategory,   // { name, total } or null
    highestDay,    // { date, total, count } or null
    byCategory: byCatArr,
    byPayment: byPayArr,
    daily: dailyArr,
    transactions,  // raw — for the table
  };
};
```

**Imports needed:**
```javascript
import { parseDateDDMMYYYY } from '../transforms/expenseTransform'; // Q5 resolved: Option A
```

---

### Step 2 — `pages/reports-module/ExpenseReportPage.jsx` — NEW FILE

**Pattern:** Clone of `DailySalesMockup.jsx` (uses same hooks, layout, InsightsCacheContext, ReportLoadingShield)

**Imports:**
```javascript
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import * as expenseService from '../../api/services/expenseService';           // EXISTING
import { fromAPI, formatDateDDMMYYYY } from '../../api/transforms/expenseTransform'; // EXISTING
import { aggregateExpenses } from '../../api/services/expenseReportService';   // NEW file
import { exportReportAsExcel, exportReportAsPDF } from '../../utils/reportExporter';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import Sidebar from '../../components/layout/Sidebar';
import { ArrowLeft, Download, FileSpreadsheet, FileDown, Mail, MessageCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
```

**State:**
```javascript
const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
const [fromDate, setFromDate] = useState(sharedFrom);
const [toDate,   setToDate]   = useState(sharedTo);
const [appliedFrom, setAppliedFrom] = useState(sharedFrom);
const [appliedTo,   setAppliedTo]   = useState(sharedTo);
const [activePreset, setActivePreset] = useState('Today'); // Q2 resolved: Today
const [isLoading, setIsLoading]       = useState(false);
const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
const [error, setError]               = useState(null);
const [rawData, setRawData]           = useState(null);
const [categoryFilter, setCategoryFilter] = useState('');
const [paymentFilter,  setPaymentFilter]  = useState('');
const [searchQuery,    setSearchQuery]    = useState('');
const [categories,     setCategories]     = useState([]);
const [paymentMethods, setPaymentMethods] = useState([]);
const [showDownloadMenu, setShowDownloadMenu] = useState(false);
const downloadRef = useRef(null);
```

**Data fetch (same pattern as DailySalesMockup):**
```javascript
const fetchData = useCallback(async () => {
  setIsLoading(true);
  setError(null);
  try {
    const [reportRes, catRes, payRes] = await Promise.all([
      expenseService.getExpenseReport(
        formatDateDDMMYYYY(appliedFrom),
        formatDateDDMMYYYY(appliedTo),
      ),
      expenseService.getCategoryList(),
      expenseService.getPaymentMethods(),
    ]);
    const normalized = fromAPI.expenseReport(reportRes);
    setRawData(normalized);
    setCategories(fromAPI.categoryList(catRes));        // verify transform fn name
    setPaymentMethods(fromAPI.paymentMethods(payRes));
    setHasLoadedOnce(true);
  } catch (err) {
    setError(err?.response?.data?.message || 'Failed to load expense report');
  } finally {
    setIsLoading(false);
  }
}, [appliedFrom, appliedTo]);

useEffect(() => { fetchData(); }, [fetchData]);
```

**⚠ FLAG — Implementation agent:** Verify `fromAPI.categoryList` is the correct transform function name before implementing. Check `expenseTransform.js` for the exact export name.

**Aggregated data (useMemo):**
```javascript
const aggregated = useMemo(() => {
  if (!rawData) return null;
  return aggregateExpenses(rawData.transactions, rawData.totalAmount);
}, [rawData]);
```

**Filtered table rows (useMemo):**
```javascript
const filteredRows = useMemo(() => {
  if (!aggregated) return [];
  return aggregated.transactions.filter((t) => {
    if (categoryFilter && t.category !== categoryFilter) return false;
    if (paymentFilter  && t.paymentMethod !== paymentFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.expense.toLowerCase().includes(q) &&
          !t.category.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}, [aggregated, categoryFilter, paymentFilter, searchQuery]);
```

**Layout structure:**
```
<div data-testid="expense-report-page">
  <Sidebar isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded} />
  <main>
    <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>

      {/* Header */}
      <button data-testid="expense-report-back-btn" onClick={() => navigate(-1)}>← Back</button>
      <h1>Expense Report</h1>

      {/* Date Range + Presets */}
      <div data-testid="expense-report-presets">
        {['Today','7D','30D','MTD'].map(p => (
          <button data-testid={`expense-report-preset-${p}`} onClick={() => applyPreset(p)}>{p}</button>
        ))}
      </div>
      <input type="date" data-testid="expense-report-from-date" value={fromDate} onChange={...} />
      <input type="date" data-testid="expense-report-to-date" value={toDate} onChange={...} />
      <button data-testid="expense-report-apply-btn" onClick={handleApply}>Apply</button>

      {/* Filters */}
      <select data-testid="expense-report-category-filter" value={categoryFilter} onChange={...}>
        <option value="">All Categories</option>
        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
      </select>
      <select data-testid="expense-report-payment-filter" value={paymentFilter} onChange={...}>
        <option value="">All Payment Methods</option>
        {paymentMethods.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <input data-testid="expense-report-search" value={searchQuery} onChange={...} placeholder="Search..." />

      {/* KPI Strip — 6 cards */}
      <div data-testid="expense-report-kpi-total">    Total Spend       {aggregated.totalAmount}   </div>
      <div data-testid="expense-report-kpi-avg">      Avg Daily         {aggregated.avgDaily}      </div>
      <div data-testid="expense-report-kpi-count">    Transactions      {aggregated.transactionCount} </div>
      <div data-testid="expense-report-kpi-days">     Active Days       {aggregated.activeDays}    </div>
      <div data-testid="expense-report-kpi-top-category"> Top Category  {aggregated.topCategory?.name} </div>
      <div data-testid="expense-report-kpi-highest-day">  Highest Day   {aggregated.highestDay?.date}  </div>

      {/* Charts Row */}
      <ResponsiveContainer data-testid="expense-report-daily-chart">
        <BarChart data={aggregated.daily}>
          <Bar dataKey="total" />
          <XAxis dataKey="date" /><YAxis /><CartesianGrid /><ReTooltip />
        </BarChart>
      </ResponsiveContainer>

      <ResponsiveContainer data-testid="expense-report-category-chart">
        <PieChart>
          <Pie data={aggregated.byCategory} dataKey="total" nameKey="name">
            {aggregated.byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Legend /><ReTooltip />
        </PieChart>
      </ResponsiveContainer>

      {/* Payment Method Cards */}
      <div data-testid="expense-report-payment-chart">
        {aggregated.byPayment.map(p => <div key={p.method}>{p.method}: {p.total}</div>)}
      </div>

      {/* Transaction Table */}
      <table data-testid="expense-report-table">
        <thead>Columns: Date | Item | Category | Amount | Payment Method</thead>
        <tbody>
          {filteredRows.map(t => (
            <tr key={t.id} data-testid={`expense-report-table-row-${t.id}`}>
              <td>{t.date}</td><td>{t.expense}</td><td>{t.category}</td>
              <td>{fmtINR(t.amount)}</td><td>{t.paymentMethod}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Download Menu */}
      <div ref={downloadRef}>
        <button data-testid="expense-report-download-btn" onClick={() => setShowDownloadMenu(v => !v)}>
          Download
        </button>
        {showDownloadMenu && (
          <>
            <button data-testid="expense-report-download-excel" onClick={handleExcel}>Excel</button>
            <button data-testid="expense-report-download-pdf"   onClick={handlePDF}>PDF</button>
          </>
        )}
      </div>

    </ReportLoadingShield>
  </main>
</div>
```

**Export handlers:**
```javascript
const handleExcel = async () => {
  const res = await expenseService.exportExpenseReport(
    formatDateDDMMYYYY(appliedFrom),
    formatDateDDMMYYYY(appliedTo),
  );
  exportReportAsExcel(res.data, `Expense_Report_${appliedFrom}_${appliedTo}`);
};

const handlePDF = () => {
  exportReportAsPDF('expense-report-page', `Expense_Report_${appliedFrom}_${appliedTo}`);
};
```

---

### Step 3 — `components/layout/Sidebar.jsx` — Insert Expense Report under Insights

**File:** `/app/frontend/src/components/layout/Sidebar.jsx`
**Action:** Insert after **line 175** (after `insights-food-court` entry, before closing `]` of insights children array)

**Verify before editing:** Line 175 currently reads:
```javascript
      { id: "insights-food-court", label: "Food Court", path: "/reports-module/food-court" },
```

**Insert after line 175:**

**⏳ [Q3 RESOLVED — Option A: with group heading]**

```javascript
      // CR-061: Expense Report
      { id: "insights-expenses-group", label: "Expenses", isGroup: true },
      { id: "insights-expense-report", label: "Expense Report", path: "/reports-module/expense-report" },
```

---

### Step 4 — `App.js` — Add Import + Route

**File:** `/app/frontend/src/App.js`

**Edit 4a — Import** (insert after line 44, after `KotVarianceMockup` import):
```javascript
import ExpenseReportPage from "./pages/reports-module/ExpenseReportPage"; // CR-061
```

**Verify before editing:** Line 44 currently reads:
```javascript
import KotVarianceMockup from "./pages/reports-module/KotVarianceMockup"; // CR-011 S38
```

**Edit 4b — Route** (insert before line 139, before `</Routes></InsightsCacheProvider>}` closing):
```javascript
              {/* CR-061: Expense Report */}
              <Route path="expense-report" element={<ProtectedRoute><ExpenseReportPage /></ProtectedRoute>} />
```

**Verify before editing:** Line 139 currently reads:
```javascript
              </Routes></InsightsCacheProvider>} />
```

---

### Step 5 — `pages/OrderSummaryPage.jsx` — ⛔ OUT OF SCOPE

**Surface B (expense summary card on Daily Summary page) has been deferred to a later phase.**
Do not touch `OrderSummaryPage.jsx` in this CR.
A separate CR will be raised during the next planning cycle.

---

## VERIFICATION MATRIX

| # | File | Change | How to Verify | Auto? |
|---|---|---|---|---|
| 1 | `ExpenseReportPage.jsx` | New file created | Webpack compiles with 0 new errors | YES |
| 2 | `App.js` | Import + route added | Navigate to `/reports-module/expense-report` → page renders | NO |
| 3 | `Sidebar.jsx` | Entry added | Insights sidebar shows Expense Report entry | NO |
| 4 | `ExpenseReportPage` | Fetch on mount | Network tab: `expenses-report` request fires with `from`, `to` params in DD/MM/YYYY | NO |
| 5 | `ExpenseReportPage` | KPI strip | Total Spend matches `total_amount` from API response | NO |
| 6 | `ExpenseReportPage` | KPI strip | Transaction Count = number of rows in `report[]` | NO |
| 7 | `ExpenseReportPage` | Daily chart | Bar chart renders with 1 bar per unique date | NO |
| 8 | `ExpenseReportPage` | Category chart | Pie chart renders slices for each category | NO |
| 9 | `ExpenseReportPage` | Table | Rows match transactions; sorted by date | NO |
| 10 | `ExpenseReportPage` | Category filter | Select a category → table shows only matching rows | NO |
| 11 | `ExpenseReportPage` | Search | Type item name → table filters | NO |
| 12 | `ExpenseReportPage` | Date apply | Change dates → click Apply → new data fetched | NO |
| 13 | `ExpenseReportPage` | Excel export | Click Excel → `expenses-export-report` POST fires | NO |
| 14 | `ExpenseReportPage` | PDF export | Click PDF → PDF generated from page | NO |

**Total: 14 checks (1 automated, 13 browser)**
*(Surface B checks removed — OrderSummaryPage deferred to later phase)*

---

## RISK REGISTER

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | `fromAPI.categoryList` transform name is wrong | LOW | Implementation agent verifies exact export name in `expenseTransform.js` before use |
| R2 | InsightsCacheContext `sharedFrom/sharedTo` are ISO (YYYY-MM-DD); API expects DD/MM/YYYY | LOW | `formatDateDDMMYYYY()` from `expenseTransform.js` handles conversion |
| R3 | Sidebar.jsx insertion point shifts if another CR modifies lines before 175 | LOW | Implementation agent verifies line 175 content before editing |
| R4 | App.js import/route lines shift | LOW | Implementation agent verifies line 44 + 139 content before editing |
| R5 | `aggregateExpenses` sorts DD/MM/YYYY strings — must use date parser, not string sort | LOW | `parseDateDDMMYYYY()` from `expenseTransform.js` handles this correctly |
| R6 | `exportExpenseReport` returns Excel binary — must use correct blob handling | LOW | Follow exact same pattern as other report export calls in codebase |
| R7 | OrderSummaryPage already imports `useEffect` / `Link` — double import risk | LOW | Implementation agent checks existing imports before adding |
| R8 | Client-side aggregation memory: 5,000+ transactions | LOW | Flag in code: `// TODO CR-062: backend aggregation if > 5000 txns` |

---

## POST-CODE REGISTRY CHECKLIST

```
- [ ] registry.json: CR-061 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: add ExpenseReportPage.jsx (NEW), optionally expenseReportService.js (NEW),
      OrderSummaryPage.jsx (MODIFIED) — all with CR-061
- [ ] Code markers: // CR-061 comment in every new/modified file
- [ ] Compile check: 0 new webpack warnings or errors
```

---

## SUMMARY

```
Gate 3 complete: CR-061 — ALL DECISIONS RESOLVED
Code Reality: PARTIAL — expenseService.js + expenseTransform.js + constants fully reused
Files WILL create: ExpenseReportPage.jsx (~500 lines) + expenseReportService.js (~30 lines)
Files WILL change: Sidebar.jsx (+2 lines: group header + child) · App.js (+2 lines)
Files OUT OF SCOPE: OrderSummaryPage.jsx (Surface B deferred to later phase)
Verification matrix: 14 checks (1 automated, 13 browser)
Owner decisions: ALL RESOLVED
  Q1 = new helper file (expenseReportService.js)
  Q2 = Today (default preset)
  Q3 = A — group header "Expenses" + child "Expense Report" in Insights sidebar
  Q4 = Surface B deferred to later phase
  Q5 = parseDateDDMMYYYY (sort utility)

STATUS: GATE 4 GO — ready for Implementation agent
```
