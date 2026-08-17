# CR-061 — Gate 3: Implementation Plan V3 (Revalidated)

**ID:** CR-061
**Gate:** 3 — Implementation Plan (revalidation, supersedes V2 dated 2026-07-10)
**Date:** 2026-07-09
**Planner:** PLANNING AGENT (AGENT_PROMPT_ALPHA v0.7, revalidation session)
**Supersedes:** `/app/memory/plans/CR_061_IMPLEMENTATION_PLAN_V2.md`
**Risk:** LOW
**Priority:** P1
**Sprint:** POS 5.0

---

## Design Mockup — OWNER APPROVED (2026-07-09)

| Artifact | Path |
|----------|------|
| **Mockup HTML** | `/app/frontend/public/cr061-expense-report-mockup.html` |
| **Live URL** | `https://retail-dashboard-110.preview.emergentagent.com/cr061-expense-report-mockup.html` |
| **Approval** | Owner approved 2026-07-09 — "Approve as-is" |

**Approved layout:** Collapsed sidebar · Header (back + title + date range + presets + download) · 3 filter dropdowns (category, payment, search) · 6 KPI cards · 2 charts (daily bar + category pie) · 3 payment split cards · 7-column transaction table (Date, Item, Category, Amount, Payment, Added By, Notes) · Pagination.

---

## Revalidation Summary

| Check | Result |
|-------|--------|
| **Code Reality** | **NONE** — no CR-061 code exists. No `ExpenseReportPage.jsx`, no `expenseReportService.js`. Grep for `CR-061` returns 0 hits in `src/`. |
| **Conflict Pre-Check** | **CLEAR** — no other active CR/BUG targeting the same files with status ≠ CLOSED. Sidebar.jsx last modified by CR-052 (IMPLEMENTED). |
| **expenseTransform.js:96-122** | **MATCHES V2 plan.** `expenseReport()` at line 96 returns `{totalAmount, transactions: [...]}`. Exact field list matches. |
| **expenseService.js:116** | **MATCHES V2 plan.** `getExpenseReport(from, to, paymentMethod = '')` — 3 positional args. |
| **Backward compat** | **SAFE.** Only other caller: `ExpenseEntryPanel.jsx:392` calls `getExpenseReport(dateStr, dateStr)` — 2 args. New `(from, to, opts={})` signature compatible because 3rd arg defaults to `{}`. |
| **Sidebar.jsx:175** | **MATCHES.** `insights-food-court` is last Insights child at line 175. Array closes at line 176 `],`. Insertion point verified. |
| **App.js:138** | **MATCHES.** Last Insights route is `kot-variance` at line 138. InsightsCacheProvider block closes at line 141. Route insertion verified. |
| **parseDateDDMMYYYY** | **EXPORTED** at expenseTransform.js:43. Available for import. |
| **formatDateDDMMYYYY / formatDateISO** | **EXPORTED** at expenseTransform.js:15 and :29. Available for import. |
| **ReportLoadingShield** | **EXISTS** at `components/reports/ReportLoadingShield.jsx`. |
| **DailySalesMockup reference** | **VERIFIED** — imports match V2 plan pattern (useNavigate, useRestaurant, useInsightsCache, Sidebar, ReportLoadingShield, recharts, lucide). |

---

## What Changed V2 → V3

| Area | V2 Plan | V3 Update | Reason |
|------|---------|-----------|--------|
| **Server-side search (G7)** | Client-side only — `filteredRows` does `.toLowerCase().includes()` in `useMemo` | **Add `?search=` param** to `getExpenseReport()`. Search triggers refetch (debounced). Client-side filter removed for search. | **G7 is RESOLVED.** Backend accepts `?search=` query param. L1 limitation eliminated. |
| **KPI: Total Spend** | Computed from page transactions | **Use `rawData.totalAmount`** (API `total_amount` — always full-range) | API returns full-range total regardless of page. |
| **KPI: Transaction Count** | Computed from page transactions | **Use `rawData.totalCount`** (API `total_count` — full-range) if available, else `transactions.length` | G6 provides full count. Fallback for backward compat. |
| **`getExpenseReport()` params** | `{ categoryId, page }` | `{ paymentMethod, categoryId, page, search }` — **4 params** | Added `search` (G7) + moved `paymentMethod` into opts object (was positional in old signature). |
| **Client-side filter** | Category (server-side) + Payment (client) + Search (client) | Category (server-side) + Payment (**server-side via existing `payment_method` param**) + Search (server-side via G7) | Payment method was already a backend param in the original API. Move to server-side. |
| **`employee_name` field** | V2 added — G4 resolved | **KEPT with `?? ''` fallback.** Probe from 2026-07-07 shows `notes` but not `employee_name` in sample. Transform safely handles absence. **Implementation agent MUST re-probe on day of coding to confirm G4 field presence.** | Safe either way due to fallback. |
| **Surface B** | Deferred | **Still deferred.** Not a backend blocker, just a design choice. | Unchanged. |

---

## Scope Lock V3

### Files WILL create (new)
1. `pages/reports-module/ExpenseReportPage.jsx` — full report page (~520 lines)
2. `api/services/expenseReportService.js` — `aggregateExpenses()` pure function (~30 lines)

### Files WILL change (existing — additive only)
1. `api/transforms/expenseTransform.js` — line 96-122: add `employeeName`, `notes`, pagination metadata to `expenseReport()` return
2. `api/services/expenseService.js` — line 116-119: update `getExpenseReport()` signature to `(from, to, opts={})` with `paymentMethod`, `categoryId`, `page`, `search`
3. `components/layout/Sidebar.jsx` — after line 175: add Expenses group + Expense Report entry
4. `App.js` — after line 138: add import + route for ExpenseReportPage

### Files OUT OF SCOPE — DO NOT TOUCH
- All order / payment / settlement / socket / menu files
- `ExpenseEntryPanel.jsx` — its call `getExpenseReport(dateStr, dateStr)` remains compatible
- `InsightsCacheContext.jsx` — used, not modified
- `OrderSummaryPage.jsx` — Surface B deferred
- All other Insights report pages

---

## Execution Sequence

### Step 1 — `api/transforms/expenseTransform.js` — Update `expenseReport()` [line 96-122]

**Current (verified line 96-122):**
```javascript
expenseReport: (res) => {
    const data = res?.data ?? {};
    const transactions = Array.isArray(
      data.report ?? data.expenses ?? data.transactions ?? data
    )
      ? (data.report ?? data.expenses ?? data.transactions ?? data)
      : [];
    return {
      totalAmount: parseFloat(data.total_amount ?? data.totalAmount ?? 0),
      transactions: transactions.map((t) => ({
        id: t.id,
        date: t['Date & Time'] ?? t.e_date ?? t.date ?? '',
        time: t['Date & Time'] ?? t.created_at ?? t.time ?? '',
        expense: t['EXPENSE'] ?? t.exp_name ?? t.expense ?? t.title ?? '',
        category: t['Category'] ?? t.category_name ?? t.category ?? '',
        categoryId: t.category_id ?? null,
        amount: parseFloat(t['Amount'] ?? t.d_amount ?? t.amount ?? 0),
        paymentMethod: t['Payment Method'] ?? t.payment_method ?? '',
        quantity: parseFloat(t.quantity ?? 0),
        unit: t.unit ?? '',
      })),
    };
  },
```

**Replace with:**
```javascript
expenseReport: (res) => {
    const data = res?.data ?? {};
    const transactions = Array.isArray(
      data.report ?? data.expenses ?? data.transactions ?? data
    )
      ? (data.report ?? data.expenses ?? data.transactions ?? data)
      : [];
    return {
      // Pagination metadata (G6 — absent in older API, defaults to null)
      totalAmount:  parseFloat(data.total_amount ?? data.totalAmount ?? 0),
      totalCount:   data.total_count   ?? null,
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
        // CR-061 V3 — G4 + G5 fields (safe fallback if absent)
        employeeName:  t.employee_name    ?? '',
        notes:         t.notes            ?? '',
      })),
    };
  },
```

**⚠ Additive only.** All existing consumers (`ExpenseEntryPanel.jsx`) use `totalAmount` and `transactions[].amount/date/expense/etc` — unchanged. New keys ignored by old consumers.

---

### Step 2 — `api/services/expenseService.js` — Update `getExpenseReport()` [line 116-119]

**Current (verified line 116-119):**
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
 * GET /expenses-report — fetch expense transactions
 * @param {string} from           - "DD/MM/YYYY"
 * @param {string} to             - "DD/MM/YYYY"
 * @param {Object} [opts]
 * @param {string} [opts.paymentMethod]  - payment filter (server-side)
 * @param {number} [opts.categoryId]     - category filter (server-side, G8)
 * @param {number} [opts.page=1]         - page number (G6)
 * @param {string} [opts.search]         - search query (server-side, G7)
 */
export const getExpenseReport = (from, to, { paymentMethod = '', categoryId = null, page = 1, search = '' } = {}) => {
  const params = { from, to, page };
  if (paymentMethod) params.payment_method = paymentMethod;
  if (categoryId)    params.category_id    = categoryId;
  if (search)        params.search         = search;
  return api.get(EXPENSE_ENDPOINTS.EXPENSES_REPORT, { params });
};
```

**⚠ Backward-compatible:** `ExpenseEntryPanel.jsx:392` calls `getExpenseReport(dateStr, dateStr)` — 2 args, 3rd defaults to `{}`. SAFE. ✅

---

### Step 3 — `api/services/expenseReportService.js` — NEW FILE (~30 lines)

**Location:** `/app/frontend/src/api/services/expenseReportService.js`

```javascript
// CR-061: Client-side aggregation from raw expense transactions
import { parseDateDDMMYYYY } from '../transforms/expenseTransform';

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
    topCategory,
    highestDay,
    byCategory: byCatArr,
    byPayment:  byPayArr,
    daily:      dailyArr,
    transactions,
  };
};
```

---

### Step 4 — `pages/reports-module/ExpenseReportPage.jsx` — NEW FILE (~520 lines)

**Pattern:** Clone of `DailySalesMockup.jsx`

**Key State — V3 (all filters are server-side):**
```javascript
const [categoryFilter, setCategoryFilter] = useState('');   // server-side (G8)
const [paymentFilter,  setPaymentFilter]  = useState('');   // server-side (existing param)
const [searchQuery,    setSearchQuery]    = useState('');    // server-side (G7)
const [debouncedSearch, setDebouncedSearch] = useState('');  // debounced value for API
const [currentPage, setCurrentPage]       = useState(1);    // server-side (G6)
```

**Data Fetch — V3 (all filters hit API):**
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
          categoryId:    categoryFilter || null,
          paymentMethod: paymentFilter  || '',
          search:        debouncedSearch || '',
          page:          currentPage,
        }
      ),
      expenseService.getCategoryList(),
      expenseService.getPaymentMethods(),
    ]);
    const normalized = fromAPI.expenseReport(reportRes);
    setRawData(normalized);
    setCategories(fromAPI.categories(catRes));
    setPaymentMethods(fromAPI.paymentMethods(payRes));
    setHasLoadedOnce(true);
  } catch (err) {
    setError(err?.readableMessage || err?.response?.data?.message || 'Failed to load expense report');
  } finally {
    setIsLoading(false);
  }
}, [appliedFrom, appliedTo, categoryFilter, paymentFilter, debouncedSearch, currentPage]);

useEffect(() => { fetchData(); }, [fetchData]);
```

**V3: Search debounce (300ms) — prevents hammering API on each keystroke:**
```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery);
    setCurrentPage(1);  // reset page on search change
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);
```

**V3: Filter handlers all reset page:**
```javascript
const handleCategoryFilter = (val) => { setCategoryFilter(val); setCurrentPage(1); };
const handlePaymentFilter  = (val) => { setPaymentFilter(val);  setCurrentPage(1); };
```

**V3: KPI cards use API-level totals (full-range, not page-scoped):**
```javascript
const totalAmount = rawData?.totalAmount ?? 0;                    // API total_amount (full-range)
const totalCount  = rawData?.totalCount  ?? aggregated?.transactionCount ?? 0;  // API total_count (full-range)
```

**Table shows current page data only. KPIs for Avg Daily, Top Category, Highest Day are page-scoped (acceptable for Phase 1 — full-range requires CR-062 backend aggregation).**

**Layout — 7 columns (unchanged from V2):**
Date · Item · Category · Amount · Payment · Added By · Notes

**Pagination, Charts, Export — unchanged from V2.**

---

### Step 5 — `components/layout/Sidebar.jsx` — Insert after line 175

**Verified line 175:**
```javascript
      { id: "insights-food-court", label: "Food Court", path: "/reports-module/food-court" },
```

**Insert after line 175 (before the `],` at line 176):**
```javascript
      // CR-061: Expense Report
      { id: "insights-expenses-group", label: "Expenses", isGroup: true },
      { id: "insights-expense-report", label: "Expense Report", path: "/reports-module/expense-report" },
```

---

### Step 6 — `App.js` — Add import + route

**Edit 6a — Import** (after line ~20, near other report imports):
```javascript
import ExpenseReportPage from "./pages/reports-module/ExpenseReportPage"; // CR-061
```

**Edit 6b — Route** (after line 138, before line 139 `preview` route):
```javascript
              {/* CR-061: Expense Report */}
              <Route path="expense-report" element={<ProtectedRoute><ExpenseReportPage /></ProtectedRoute>} />
```

---

## Verification Matrix V3

| # | File | Check | How to Verify | V3 Δ |
|---|------|-------|---------------|------|
| 1 | `expenseTransform.js` | No compile errors | webpack 0 errors | — |
| 2 | `expenseService.js` | No compile errors, backward compat | webpack + existing ExpenseEntry still works | — |
| 3 | `App.js` + `Sidebar.jsx` | Navigate to `/reports-module/expense-report` → page renders | Browser | — |
| 4 | Insights sidebar | "Expenses" group + "Expense Report" child visible | Browser | — |
| 5 | On load | Network: `expenses-report?from=...&to=...&page=1` fires | DevTools | — |
| 6 | KPI: Total Spend | Shows API `total_amount` (full-range) | Browser | **V3** |
| 7 | KPI: Transactions | Shows API `total_count` (full-range, fallback to page count) | Browser | **V3** |
| 8 | Daily chart | Bar chart renders (1 bar per date) | Browser | — |
| 9 | Category chart | Pie chart renders | Browser | — |
| 10 | Table | 7 columns: Date, Item, Category, Amount, Payment, Added By, Notes | Browser | — |
| 11 | Added By column | Employee name or "—" | Browser | — |
| 12 | Notes column | Notes or "—" | Browser | — |
| 13 | Category filter | Select → `?category_id=N` fires → table updates | DevTools | — |
| 14 | Payment filter | Select → `?payment_method=X` fires → table updates | DevTools | **V3: now server-side** |
| 15 | **Search** | Type → debounce 300ms → `?search=X` fires → table updates | DevTools | **V3: server-side G7** |
| 16 | Pagination | If >25 results: prev/next buttons visible, `?page=2` fires | DevTools | — |
| 17 | Date preset | Click "7D" → Apply → new data fetched | Browser | — |
| 18 | Excel export | `expenses-export-report` POST fires with ISO dates | DevTools | — |
| 19 | Backward compat | Navigate to Add Expenses → add an entry → no errors | Browser | **V3: critical** |
| 20 | **Search + pagination** | Search "Cash" → results filtered → change page → search persists | Browser | **V3: new** |

**Total: 20 checks (V2 had 19 — 2 new, 1 upgraded)**

---

## Resolved Limitations (V2 → V3)

| # | V2 Limitation | V3 Status | Resolution |
|---|---|---|---|
| **L1** | Search only searches current page | **ELIMINATED** | G7 `?search=` is server-side. Debounced refetch. |
| **L2** | KPIs only current page | **MOSTLY RESOLVED** | `total_amount` + `total_count` from API are full-range. 3 derived KPIs (Avg Daily, Top Category, Highest Day) still page-scoped — acceptable Phase 1. Full fix = CR-062. |
| **L3** | Surface B deferred | **UNCHANGED** | Design choice, not a backend blocker. |

---

## Remaining Known Limitations (Phase 1 — acceptable)

1. **Avg Daily, Top Category, Highest Day** KPIs are computed from current page transactions only when paginated. Full-range aggregation requires CR-062 backend aggregation endpoint. Impact: negligible for most restaurants (≤25 daily transactions fit one page).
2. **Surface B** (Expense Summary Card on OrderSummaryPage) deferred — separate scope.

---

## Risk Register V3

| # | Risk | Sev | Mitigation | V3 Δ |
|---|------|-----|------------|------|
| R1 | `getExpenseReport(from, to, 'Cash')` old positional call | LOW | Grep confirmed: only `ExpenseEntryPanel.jsx:392` calls with 2 args. SAFE. | Downgraded LOW (verified) |
| R2 | `fromAPI.categories` name mismatch | LOW | Verified: correct name at expenseTransform.js. | — |
| R3 | Export ISO vs DD/MM/YYYY | LOW | Confirmed ISO. | — |
| R4 | `employee_name` absent on older records | LOW | `?? ''` fallback. Table shows "—". | — |
| R5 | Sidebar insertion point shift | LOW | Verified line 175 is correct as of today. | — |
| R6 | `totalPages = null` when backend omits | LOW | `?? 1` default. Pagination hidden when ≤1. | — |
| R7 | Search debounce race condition | LOW | `useEffect` cleanup clears timer. Only `debouncedSearch` in fetch deps. | **V3 new** |
| R8 | Category + payment + search filter combo resets page | LOW | All handlers call `setCurrentPage(1)`. | — |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-061 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: add ExpenseReportPage.jsx (NEW), expenseReportService.js (NEW),
      expenseTransform.js (MODIFIED), expenseService.js (MODIFIED)
- [ ] Code markers: // CR-061 in every new/modified file
- [ ] Compile check: 0 new webpack warnings or errors
```

---

## Summary V3

```
Planning complete: CR-061
Stage: Revalidation (V3) — code reality + G7 server-search amendment
Code reality: NONE
Risk: LOW
Files WILL change: expenseTransform.js (+12 lines) · expenseService.js (+8 lines) ·
                   Sidebar.jsx (+2 lines) · App.js (+2 lines)
Files WILL create: ExpenseReportPage.jsx (~520 lines) · expenseReportService.js (~50 lines)
Files WILL NOT touch: ExpenseEntryPanel.jsx · InsightsCacheContext.jsx · OrderSummaryPage.jsx ·
                      all order/payment/settlement/socket/menu files
Owner decisions: ALL RESOLVED
Verification matrix: 20 checks (2 automated, 18 browser)

V2 → V3 changes:
  + Search is now SERVER-SIDE (G7 ?search= param) — L1 eliminated
  + Payment filter now SERVER-SIDE (was always available, just unused)
  + KPI Total Spend + Transaction Count use API full-range values — L2 mostly resolved
  + Search debounce (300ms) added to prevent API hammering
  + Backward compat explicitly verified (ExpenseEntryPanel.jsx:392)
  + 20 verification checks (was 19)

Blocking questions: NONE
Design mockup: OWNER APPROVED (2026-07-09)
Mockup: /app/frontend/public/cr061-expense-report-mockup.html
STATUS: GATE 4 GO — ready for Implementation agent
```
