# CR-061 — Gate 3: Implementation Plan V2

**ID:** CR-061
**Gate:** 3 — Implementation Plan (re-plan, supersedes V1 dated 2026-07-07)
**Date:** 2026-07-10
**Planner:** PLANNING AGENT (AGENT_PROMPT_ALPHA v0.7)
**Supersedes:** `/app/memory/plans/CR_061_IMPLEMENTATION_PLAN.md` (V1)
**Reason for re-plan:** Backend shipped G2–G8 fixes (confirmed 2026-07-10). New API fields `employee_name`, `notes`, pagination (`total_count`, `total_pages`, `per_page`), and server-side `category_id` filter are now available. V1 plan used client-side-only aggregation and missed these capabilities.
**Risk:** LOW
**Priority:** P1
**Sprint:** POS 5.0

---

## What Changed Since V1

| Area | V1 Assumption | V2 Reality (post-audit) |
|------|--------------|-------------------------|
| Pagination | All 765+ rows returned flat; client-side only | Backend now returns `total_count`, `total_pages`, `per_page`; `page=N` accepted |
| Category filter | Client-side filter over all rows | Backend accepts `?category_id=N`; FE passes it as a param, triggers refetch |
| Table columns | Date, Item, Category, Amount, Payment Method (5 cols) | + `employee_name` (Added By) + `notes` (Notes) → 7 columns |
| `expenseTransform.expenseReport()` | Extract 5 fields from each row | Must also extract `employee_name`, `notes`; must extract pagination metadata at top level |
| `getExpenseReport()` service | Accepts `(from, to, paymentMethod)` | Must also accept `categoryId`, `page` |
| `aggregateExpenses()` | 5-field transaction shape | Must pass `employeeName` + `notes` through to raw transactions array |
| Export date format | Assumed DD/MM/YYYY | Confirmed ISO (YYYY-MM-DD): `{ from: "2026-07-07", to: "2026-07-07" }` |
| Q3 (sidebar) | Pending | Resolved V1: Group header "Expenses" + child "Expense Report" |

---

## Scope Lock V2

### Files WILL create (new)
1. `pages/reports-module/ExpenseReportPage.jsx` — full report page (~520 lines)
2. `api/services/expenseReportService.js` — `aggregateExpenses()` pure function only (~30 lines)

### Files WILL change (existing — additive only)
1. `api/transforms/expenseTransform.js` — **NEW IN V2**: update `expenseReport()` transform to extract `employee_name`, `notes`, and pagination metadata
2. `api/services/expenseService.js` — **NEW IN V2**: update `getExpenseReport()` signature to accept `categoryId`, `page`
3. `components/layout/Sidebar.jsx` — add Expense Report entry under Insights (unchanged from V1)
4. `App.js` — add import + route for ExpenseReportPage (unchanged from V1)

### Files OUT OF SCOPE — DO NOT TOUCH
- `expenseService.js` bulk export/import, unit prices, store-expense-details (other functions)
- `InsightsCacheContext.jsx` — used, not modified
- `OrderSummaryPage.jsx` — Surface B still deferred
- All order / payment / settlement / socket / menu files
- All other Insights report pages

---

## Execution Sequence

---

### Step 1 — `api/transforms/expenseTransform.js` — Update expenseReport() [NEW IN V2]

**File:** `/app/frontend/src/api/transforms/expenseTransform.js`

**Verify before editing — current function (approximately lines 96–130):**
```javascript
  expenseReport: (res) => {
    const data = res?.data ?? {};
    const transactions = ...
    return {
      totalAmount: parseFloat(data.total_amount ?? data.totalAmount ?? 0),
      transactions: transactions.map((t) => ({
        id: t.id,
        date: t['Date & Time'] ?? ...
        ...
        unit: t.unit ?? '',
      })),
    };
  },
```

**Replace the return statement** to add pagination fields and two new transaction fields:
```javascript
  expenseReport: (res) => {
    const data = res?.data ?? {};
    const transactions = Array.isArray(
      data.report ?? data.expenses ?? data.transactions ?? data
    )
      ? (data.report ?? data.expenses ?? data.transactions ?? data)
      : [];
    return {
      // Pagination metadata (new in V2 — absent in older API, defaults to null)
      totalAmount:  parseFloat(data.total_amount ?? data.totalAmount ?? 0),
      totalCount:   data.total_count   ?? null,   // total rows server-side
      totalPages:   data.total_pages   ?? null,
      perPage:      data.per_page      ?? null,
      currentPage:  data.page          ?? 1,
      transactions: transactions.map((t) => ({
        id:            t.id,
        date:          t['Date & Time']   ?? t.e_date          ?? t.date ?? '',
        time:          t['Date & Time']   ?? t.created_at      ?? t.time ?? '',
        expense:       t['EXPENSE']       ?? t.exp_name        ?? t.expense ?? t.title ?? '',
        category:      t['Category']      ?? t.category_name   ?? t.category ?? '',
        categoryId:    t.category_id      ?? null,
        amount:        parseFloat(t['Amount'] ?? t.d_amount   ?? t.amount ?? 0),
        paymentMethod: t['Payment Method'] ?? t.payment_method ?? '',
        quantity:      parseFloat(t.quantity ?? 0),
        unit:          t.unit             ?? '',
        // V2 — new fields
        employeeName:  t.employee_name    ?? '',   // "Owner", "Staff1", etc.
        notes:         t.notes            ?? '',   // free-text memo
      })),
    };
  },
```

**⚠ Additive only.** All existing consumers of `expenseReport()` use `totalAmount` and `transactions[].amount/date/expense/etc` — those keys are unchanged. New keys (`totalCount`, `employeeName`, `notes`) are ignored by existing consumers.

---

### Step 2 — `api/services/expenseService.js` — Update getExpenseReport() [NEW IN V2]

**File:** `/app/frontend/src/api/services/expenseService.js`

**Verify before editing (currently ~line 92):**
```javascript
export const getExpenseReport = (from, to, paymentMethod = '') => {
  const params = { from, to };
  if (paymentMethod) params.payment_method = paymentMethod;
  return api.get(EXPENSE_ENDPOINTS.EXPENSES_REPORT, { params });
};
```

**Replace with:**
```javascript
/**
 * GET /expenses-report — fetch paginated expense transactions
 * @param {string} from           - "DD/MM/YYYY"
 * @param {string} to             - "DD/MM/YYYY"
 * @param {Object} [opts]
 * @param {string} [opts.paymentMethod]  - optional payment filter
 * @param {number} [opts.categoryId]     - optional category filter (server-side) — V2
 * @param {number} [opts.page=1]         - page number — V2
 */
export const getExpenseReport = (from, to, { paymentMethod = '', categoryId = null, page = 1 } = {}) => {
  const params = { from, to, page };
  if (paymentMethod) params.payment_method = paymentMethod;
  if (categoryId)    params.category_id    = categoryId;
  return api.get(EXPENSE_ENDPOINTS.EXPENSES_REPORT, { params });
};
```

**⚠ Backward-compatible:** The old call signature `getExpenseReport(from, to, 'Cash')` would now pass `'Cash'` as the `opts` object — this would break. **Verify there are no other callers before editing.**

```bash
grep -rn "getExpenseReport" /app/frontend/src/
```

If the only caller is `ExpenseReportPage.jsx` (new file being created), no backward-compat issue.
If other callers exist (e.g., `ExpenseEntryPage.jsx`), update those call sites to use the new options object pattern.

---

### Step 3 — `api/services/expenseReportService.js` — NEW FILE (unchanged from V1 + employeeName/notes passthrough)

**Location:** `/app/frontend/src/api/services/expenseReportService.js`

**Full file content:**
```javascript
// CR-061: Client-side aggregation from raw expense transactions
// Input: transactions[] from expenseTransform.expenseReport(res).transactions
import { parseDateDDMMYYYY } from '../transforms/expenseTransform';

/**
 * Aggregate raw expense transactions into chart/KPI data shapes.
 * V2: transactions now include employeeName and notes — passed through to raw array.
 * @param {Array}  transactions  - from expenseTransform.expenseReport().transactions
 * @param {number} apiTotalAmount - from expenseTransform.expenseReport().totalAmount
 */
export const aggregateExpenses = (transactions = [], apiTotalAmount = 0) => {
  const totalAmount = apiTotalAmount || transactions.reduce((s, t) => s + t.amount, 0);

  const byCategory = {};
  const byPayment  = {};
  const byDate     = {};

  transactions.forEach((t) => {
    const amt  = t.amount;
    const cat  = t.category       || 'Unknown';
    const pay  = t.paymentMethod  || 'Unknown';
    const date = t.date           || '';

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

  const dailyArr = Object.entries(byDate)
    .map(([date, d]) => ({ date, total: d.total, count: d.count }))
    .sort((a, b) => parseDateDDMMYYYY(a.date) - parseDateDDMMYYYY(b.date));

  const topCategory = byCatArr[0] ?? null;
  const highestDay  = dailyArr.length
    ? [...dailyArr].sort((a, b) => b.total - a.total)[0]
    : null;

  return {
    totalAmount,
    transactionCount: transactions.length,
    activeDays,
    avgDaily,
    topCategory,    // { name, total } | null
    highestDay,     // { date, total, count } | null
    byCategory: byCatArr,
    byPayment:  byPayArr,
    daily:      dailyArr,
    transactions,   // raw — for the table (includes employeeName, notes)
    // TODO CR-062: switch to backend aggregation if > 5000 txns
  };
};
```

---

### Step 4 — `pages/reports-module/ExpenseReportPage.jsx` — NEW FILE

**Location:** `/app/frontend/src/pages/reports-module/ExpenseReportPage.jsx`
**Pattern:** Clone of `DailySalesMockup.jsx` (same hooks, layout, InsightsCacheContext, ReportLoadingShield)

**Imports:**
```javascript
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import * as expenseService from '../../api/services/expenseService';
import { fromAPI, formatDateDDMMYYYY, formatDateISO } from '../../api/transforms/expenseTransform';
import { aggregateExpenses } from '../../api/services/expenseReportService';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import Sidebar from '../../components/layout/Sidebar';
import { ArrowLeft, Download, FileSpreadsheet, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
```

**State:**
```javascript
const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
const [fromDate, setFromDate]       = useState(sharedFrom);
const [toDate,   setToDate]         = useState(sharedTo);
const [appliedFrom, setAppliedFrom] = useState(sharedFrom);
const [appliedTo,   setAppliedTo]   = useState(sharedTo);
const [activePreset, setActivePreset]     = useState('Today');
const [isLoading, setIsLoading]           = useState(false);
const [hasLoadedOnce, setHasLoadedOnce]   = useState(false);
const [error, setError]                   = useState(null);
const [rawData, setRawData]               = useState(null);
// V2: server-side pagination
const [currentPage, setCurrentPage]       = useState(1);
// V2: category filter is server-side (triggers refetch, not client-side filter)
const [categoryFilter, setCategoryFilter] = useState('');
// client-side only
const [paymentFilter,  setPaymentFilter]  = useState('');
const [searchQuery,    setSearchQuery]    = useState('');
const [categories,     setCategories]     = useState([]);
const [paymentMethods, setPaymentMethods] = useState([]);
const [showDownloadMenu, setShowDownloadMenu] = useState(false);
const downloadRef = useRef(null);
```

**Data fetch — V2 (category_id + page are now params):**
```javascript
const fetchData = useCallback(async () => {
  setIsLoading(true);
  setError(null);
  try {
    const [reportRes, catRes, payRes] = await Promise.all([
      expenseService.getExpenseReport(
        formatDateDDMMYYYY(appliedFrom),
        formatDateDDMMYYYY(appliedTo),
        {
          categoryId: categoryFilter || null,   // V2: server-side
          page: currentPage,                    // V2: pagination
        }
      ),
      expenseService.getCategoryList(),
      expenseService.getPaymentMethods(),
    ]);
    const normalized = fromAPI.expenseReport(reportRes);
    setRawData(normalized);
    setCategories(fromAPI.categories(catRes));    // ← use fromAPI.categories (existing)
    setPaymentMethods(fromAPI.paymentMethods(payRes));
    setHasLoadedOnce(true);
  } catch (err) {
    setError(err?.response?.data?.message || 'Failed to load expense report');
  } finally {
    setIsLoading(false);
  }
}, [appliedFrom, appliedTo, categoryFilter, currentPage]);   // V2: deps include categoryFilter + currentPage

useEffect(() => { fetchData(); }, [fetchData]);
```

**⚠ IMPORTANT — V2 category filter is SERVER-SIDE:**
When `setCategoryFilter(newCat)` is called, `currentPage` must reset to 1.
```javascript
const handleCategoryFilter = (val) => {
  setCategoryFilter(val);
  setCurrentPage(1);   // reset page on filter change
};
```

**Aggregated data (unchanged from V1):**
```javascript
const aggregated = useMemo(() => {
  if (!rawData) return null;
  return aggregateExpenses(rawData.transactions, rawData.totalAmount);
}, [rawData]);
```

**Filtered table rows — V2 (payment + search only — category is server-side):**
```javascript
const filteredRows = useMemo(() => {
  if (!aggregated) return [];
  return aggregated.transactions.filter((t) => {
    // Category filtering is now server-side — removed from client filter
    if (paymentFilter && t.paymentMethod !== paymentFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.expense.toLowerCase().includes(q) &&
          !t.category.toLowerCase().includes(q) &&
          !(t.notes ?? '').toLowerCase().includes(q) &&
          !(t.employeeName ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });
}, [aggregated, paymentFilter, searchQuery]);
```

**Pagination helpers:**
```javascript
const totalPages  = rawData?.totalPages  ?? 1;
const totalCount  = rawData?.totalCount  ?? aggregated?.transactionCount ?? 0;

const handlePrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
const handleNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
```

**Layout structure (V2 — additions highlighted):**
```
<div data-testid="expense-report-page">
  <Sidebar ... />
  <main>
    <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>

      {/* Header */}
      <button data-testid="expense-report-back-btn" onClick={() => navigate(-1)}>← Back</button>
      <h1>Expense Report</h1>

      {/* Date Range + Presets */}
      <div data-testid="expense-report-presets">
        {['Today','7D','30D','MTD'].map(p =>
          <button data-testid={`expense-report-preset-${p}`} onClick={() => applyPreset(p)}>{p}</button>)}
      </div>
      <input type="date" data-testid="expense-report-from-date" value={fromDate} onChange={...} />
      <input type="date" data-testid="expense-report-to-date"   value={toDate}   onChange={...} />
      <button data-testid="expense-report-apply-btn" onClick={handleApply}>Apply</button>

      {/* Filters — V2: category triggers refetch */}
      <select data-testid="expense-report-category-filter" value={categoryFilter} onChange={e => handleCategoryFilter(e.target.value)}>
        <option value="">All Categories</option>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select data-testid="expense-report-payment-filter" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
        <option value="">All Payment Methods</option>
        {paymentMethods.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <input data-testid="expense-report-search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search item, notes..." />

      {/* KPI Strip — 6 cards */}
      <div data-testid="expense-report-kpi-total">       Total Spend        {aggregated.totalAmount}           </div>
      <div data-testid="expense-report-kpi-avg">         Avg Daily          {aggregated.avgDaily}             </div>
      <div data-testid="expense-report-kpi-count">       Transactions       {totalCount}                       </div>
      <div data-testid="expense-report-kpi-days">        Active Days        {aggregated.activeDays}            </div>
      <div data-testid="expense-report-kpi-top-category">Top Category       {aggregated.topCategory?.name}     </div>
      <div data-testid="expense-report-kpi-highest-day"> Highest Day        {aggregated.highestDay?.date}      </div>

      {/* Charts */}
      <ResponsiveContainer data-testid="expense-report-daily-chart">
        <BarChart data={aggregated.daily}>
          <Bar dataKey="total" /><XAxis dataKey="date" /><YAxis /><CartesianGrid /><ReTooltip />
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

      <div data-testid="expense-report-payment-chart">
        {aggregated.byPayment.map(p => <div key={p.method}>{p.method}: {p.total}</div>)}
      </div>

      {/* Transaction Table — V2: 7 columns */}
      <table data-testid="expense-report-table">
        <thead>
          <tr>
            <th>Date</th><th>Item</th><th>Category</th>
            <th>Amount</th><th>Payment</th>
            <th>Added By</th>  {/* V2 — employee_name */}
            <th>Notes</th>     {/* V2 — notes */}
          </tr>
        </thead>
        <tbody>
          {filteredRows.map(t => (
            <tr key={t.id} data-testid={`expense-report-table-row-${t.id}`}>
              <td>{t.date}</td>
              <td>{t.expense}</td>
              <td>{t.category}</td>
              <td>{fmtINR(t.amount)}</td>
              <td>{t.paymentMethod}</td>
              <td data-testid={`expense-report-row-employee-${t.id}`}>{t.employeeName || '—'}</td>
              <td data-testid={`expense-report-row-notes-${t.id}`}>{t.notes || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination — V2 */}
      {totalPages > 1 && (
        <div data-testid="expense-report-pagination">
          <button data-testid="expense-report-prev-page" onClick={handlePrevPage} disabled={currentPage === 1}>
            <ChevronLeft />
          </button>
          <span data-testid="expense-report-page-info">Page {currentPage} of {totalPages}</span>
          <button data-testid="expense-report-next-page" onClick={handleNextPage} disabled={currentPage === totalPages}>
            <ChevronRight />
          </button>
        </div>
      )}

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

**Export handlers — V2 (confirmed ISO date format for export endpoint):**
```javascript
const handleExcel = async () => {
  const res = await expenseService.exportExpenseReport(
    formatDateISO(appliedFrom),   // V2: export endpoint expects YYYY-MM-DD (confirmed curl 9)
    formatDateISO(appliedTo),
  );
  exportReportAsExcel(res.data, `Expense_Report_${appliedFrom}_${appliedTo}`);
};
```

---

### Step 5 — `components/layout/Sidebar.jsx` — Insert entry (unchanged from V1)

**File:** `/app/frontend/src/components/layout/Sidebar.jsx`
**Action:** Insert after `insights-food-court` entry in the Insights children array.
**Verify line content before editing:**
```javascript
      { id: "insights-food-court", label: "Food Court", path: "/reports-module/food-court" },
```
**Insert after:**
```javascript
      // CR-061: Expense Report
      { id: "insights-expenses-group", label: "Expenses", isGroup: true },
      { id: "insights-expense-report", label: "Expense Report", path: "/reports-module/expense-report" },
```

---

### Step 6 — `App.js` — Add import + route (unchanged from V1)

**File:** `/app/frontend/src/App.js`

**Edit 6a — Import** (after existing Insights page imports, verify line content):
```javascript
import ExpenseReportPage from "./pages/reports-module/ExpenseReportPage"; // CR-061
```

**Edit 6b — Route** (inside `<InsightsCacheProvider>` block, after last existing Insights route):
```javascript
              {/* CR-061: Expense Report */}
              <Route path="expense-report" element={<ProtectedRoute><ExpenseReportPage /></ProtectedRoute>} />
```

---

## Verification Matrix V2

| # | File | Check | How to Verify |
|---|------|-------|---------------|
| 1 | `expenseTransform.js` | No compile errors | webpack 0 errors |
| 2 | `expenseService.js` | No compile errors | webpack 0 errors |
| 3 | `App.js` + `Sidebar.jsx` | Navigate to `/reports-module/expense-report` → page renders | Browser |
| 4 | Insights sidebar | "Expenses" group + "Expense Report" child visible | Browser |
| 5 | On load | Network: `expenses-report?from=...&to=...&page=1` fires | DevTools |
| 6 | KPI strip | Total Spend = `total_amount` from API | Browser |
| 7 | KPI strip | Transactions = `total_count` from API | Browser |
| 8 | Daily chart | Bar chart renders (1 bar per date) | Browser |
| 9 | Category chart | Pie chart renders | Browser |
| 10 | Table | 7 columns visible: Date, Item, Category, Amount, Payment, **Added By, Notes** | Browser |
| 11 | V2: Added By column | Employee name shows (not blank) for entries made today | Browser |
| 12 | V2: Notes column | Notes show for entries with notes; "—" otherwise | Browser |
| 13 | V2: Category filter | Select category → `expenses-report?category_id=N` fires → table updates | DevTools |
| 14 | V2: Pagination | If >25 results: prev/next buttons visible, clicking fires `?page=2` | DevTools |
| 15 | Search | Type text → table filters by item name, notes, employee | Browser |
| 16 | Payment filter | Select payment → table filters client-side (no refetch) | Browser |
| 17 | Date preset | Click "7D" → dates update → Apply → new data fetched | Browser |
| 18 | Excel export | Click Excel → `expenses-export-report` POST fires with ISO dates | DevTools |
| 19 | PDF export | Click PDF → PDF downloaded | Browser |

**Total: 19 checks (2 automated, 17 browser)**
*(V1 had 14 checks — 5 new added for V2 features)*

---

## Risk Register V2

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | `getExpenseReport(from, to, 'Cash')` — old positional call signature breaks | MEDIUM | grep all callers before editing. If old callers exist, update them to new options object pattern simultaneously. |
| R2 | `fromAPI.categories` vs `fromAPI.categoryList` — transform fn name mismatch | LOW | V1 plan flagged this. Verified: correct name is `fromAPI.categories` (line 56 of expenseTransform.js). |
| R3 | `exportExpenseReport()` — ISO vs DD/MM/YYYY date format conflict | LOW | Curl 9 confirmed ISO. Use `formatDateISO()` for export call. |
| R4 | `employee_name` field absent on older expense records | LOW | `employeeName: t.employee_name ?? ''` in transform. Table shows "—" for empty. |
| R5 | Sidebar.jsx insertion point shifts if another CR has modified lines | LOW | Implementation agent verifies exact line content before editing. |
| R6 | `totalPages = null` when backend omits pagination (old records?) | LOW | `rawData?.totalPages ?? 1` default in component. Pagination controls hidden when `totalPages <= 1`. |
| R7 | Client-side search vs paginated data — search only searches current page | LOW | Acceptable for phase 1. Flag as TODO: "search across all pages requires server-side search endpoint." |
| R8 | Category filter refetch + page reset race condition | LOW | `handleCategoryFilter` sets both in one handler; `fetchData` deps include `categoryFilter` + `currentPage`. |
| R9 | `aggregateExpenses` on page-filtered data (not all data) | LOW | KPI charts reflect current page only. Flag in code: `// TODO CR-062: aggregate across all pages for full-range KPIs`. |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-061 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: add ExpenseReportPage.jsx (NEW), expenseReportService.js (NEW),
      expenseTransform.js (MODIFIED — V2), expenseService.js (MODIFIED — V2)
- [ ] Code markers: // CR-061 in every new/modified file
- [ ] Compile check: 0 new webpack warnings or errors
```

---

## Summary V2

```
Gate 3 V2 complete: CR-061
Re-plan reason: Backend shipped G2–G8 (confirmed 2026-07-10)
New vs V1:
  + expenseTransform.js — now in scope (employee_name, notes, pagination metadata)
  + expenseService.getExpenseReport() — extended with categoryId + page params
  + Table: 5 → 7 columns (Added By, Notes)
  + Category filter: client-side → server-side (triggers refetch)
  + Pagination: total_pages / page controls
  + Export date: ISO format confirmed
Files WILL create:   ExpenseReportPage.jsx (~520 lines) + expenseReportService.js (~50 lines)
Files WILL change:   expenseTransform.js (+12 lines) · expenseService.js (+5 lines) ·
                     Sidebar.jsx (+2 lines) · App.js (+2 lines)
Files OUT OF SCOPE:  OrderSummaryPage.jsx (Surface B still deferred)
Verification matrix: 19 checks (V1 had 14)
Owner decisions:     ALL RESOLVED (unchanged from V1)

STATUS: GATE 4 GO — ready for Implementation agent
```
