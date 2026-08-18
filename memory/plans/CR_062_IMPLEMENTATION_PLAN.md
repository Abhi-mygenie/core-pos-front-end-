# CR-062 — Implementation Plan (Gate 3)

**Date:** 2026-07-24
**Impact Analysis:** `impact/CR_062_IMPACT_ANALYSIS.md` (Gate 2 ✅)
**Backend Contract:** `impact/CR_062_BACKEND_CONTRACT_2026_07_22.md`
**Code Reality:** PARTIAL — CR-061 (client-side aggregation in `expenseReportService.js`) is IMPLEMENTED. CR-062 swaps data source to server-side.
**Conflict Pre-Check:** No active CR touches ExpenseReportPage data source. Low conflict risk.
**Risk:** LOW (data source swap, no UI change, no financial logic)
**Scope Lock:** 3 files WILL change, all others WILL NOT touch

---

## Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 1 | `api/constants.js:~448` | Add `EXPENSE_AGGREGATION` endpoint constant | Code inspection: constant exists | NO |
| 2 | `api/services/expenseService.js` (new export) | Add `getExpenseAggregation(from, to, filters)` POST function | Curl: POST endpoint returns aggregated data | YES (curl) |
| 3 | `pages/reports-module/ExpenseReportPage.jsx` | Swap from client-side `aggregateExpenses()` to server-side endpoint | Browser: report loads same KPIs, faster for large datasets | NO |

---

## Edits (Execution Sequence)

### Edit 1: `api/constants.js` — Add endpoint constant

**File:** `api/constants.js`
**Line:** After L447 (`STOCK_UNIT_PRICES: '/api/v2/vendoremployee/expense/stock-unit-prices',`)
**Current:** No aggregation endpoint
**New:** Add one line:
```js
  EXPENSE_AGGREGATION: '/api/v2/vendoremployee/expense/expense-aggregation', // CR-062: server-side aggregation
```

### Edit 2: `api/services/expenseService.js` — Add aggregation function

**File:** `api/services/expenseService.js`
**Line:** After the `TRANSACTIONS` section comment (after existing report functions, before EOF)
**New:** Add function:
```js
// CR-062: Server-side expense aggregation (replaces client-side math from CR-061)
/**
 * @param {string} from - DD/MM/YYYY
 * @param {string} to   - DD/MM/YYYY
 * @param {Object} [filters]
 * @param {number[]} [filters.category_ids]
 * @param {string[]} [filters.payment_methods]
 * @returns {Promise<{grand_total: number, daily_totals: Array, category_totals: Array, payment_totals: Array}>}
 */
export const getExpenseAggregation = async (from, to, filters = {}) => {
  const body = { from, to };
  if (filters.category_ids?.length) body.category_ids = filters.category_ids;
  if (filters.payment_methods?.length) body.payment_methods = filters.payment_methods;
  const res = await api.post(EXPENSE_ENDPOINTS.EXPENSE_AGGREGATION, body);
  return res.data;
};
```

### Edit 3: `pages/reports-module/ExpenseReportPage.jsx` — Swap data source

**File:** `pages/reports-module/ExpenseReportPage.jsx`

**3a — Import swap (L15):**
**Current:**
```js
import { aggregateExpenses } from '../../api/services/expenseReportService';
```
**New:**
```js
import { getExpenseAggregation } from '../../api/services/expenseService'; // CR-062: server-side
```

**3b — Data fetching: Replace the `useMemo` aggregation (~L134-137) with a separate query:**

This requires understanding the existing data flow. Currently:
- `rawData` = result from `GET /expenses-report` (all transactions)
- `aggregated` = `useMemo(() => aggregateExpenses(rawData.transactions, rawData.totalAmount), [rawData])`
- UI reads `aggregated.totalAmount`, `aggregated.activeDays`, `aggregated.avgDaily`, `aggregated.topCategory`, `aggregated.byCategory`, `aggregated.byPayment`, `aggregated.daily`, `aggregated.transactions`

**New approach:**
- Keep `rawData` fetch for the transaction table (still needs individual rows for search/filter/export)
- Add a second query for aggregated KPIs from `POST /expense-aggregation`
- Replace `aggregated` fields (totalAmount, activeDays, avgDaily, topCategory, byCategory, byPayment, daily) with server response
- Keep `aggregated.transactions` from `rawData.transactions` (the server endpoint doesn't return individual rows)

**3b — Replace aggregation useMemo (~L134-137):**
**Current:**
```js
  const aggregated = useMemo(() => {
    if (!rawData?.transactions) return null;
    return aggregateExpenses(rawData.transactions, rawData.totalAmount);
  }, [rawData]);
```
**New:**
```js
  // CR-062: Server-side aggregation for KPIs/charts (replaces client-side math)
  const [serverAgg, setServerAgg] = useState(null);
  useEffect(() => {
    if (!appliedFrom || !appliedTo) return;
    let cancelled = false;
    getExpenseAggregation(appliedFrom, appliedTo)
      .then((data) => { if (!cancelled) setServerAgg(data); })
      .catch(() => { if (!cancelled) setServerAgg(null); });
    return () => { cancelled = true; };
  }, [appliedFrom, appliedTo]);

  // Build aggregated shape compatible with existing UI reads
  const aggregated = useMemo(() => {
    if (!rawData?.transactions) return null;
    // KPIs from server when available, fallback to client-side
    if (serverAgg) {
      const dailyArr = (serverAgg.daily_totals || []).map(d => ({
        date: d.date, total: d.total, count: d.transaction_count,
      }));
      const byCatArr = (serverAgg.category_totals || []).map(c => ({
        name: c.category_name, total: c.total,
      }));
      const byPayArr = (serverAgg.payment_totals || []).map(p => ({
        method: p.payment_method, total: p.total,
      }));
      return {
        totalAmount: serverAgg.grand_total,
        transactionCount: rawData.transactions.length,
        activeDays: dailyArr.length,
        avgDaily: dailyArr.length > 0 ? serverAgg.grand_total / dailyArr.length : 0,
        topCategory: byCatArr[0] ?? null,
        highestDay: dailyArr.length ? [...dailyArr].sort((a, b) => b.total - a.total)[0] : null,
        byCategory: byCatArr,
        byPayment: byPayArr,
        daily: dailyArr,
        transactions: rawData.transactions,
      };
    }
    // Fallback: client-side (import kept for safety)
    const { aggregateExpenses } = require('../../api/services/expenseReportService');
    return aggregateExpenses(rawData.transactions, rawData.totalAmount);
  }, [rawData, serverAgg]);
```

**3c — Add `useState` import if not already present (check L1-5 of ExpenseReportPage).**

---

## Design Decisions (Locked)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Keep rawData fetch | YES | Transaction table still needs individual rows for search/filter/export |
| 2 | Fallback to client-side | YES | If server endpoint fails, graceful degradation to CR-061 math |
| 3 | No filter UI yet | DEFERRED | Backend supports `category_ids[]` / `payment_methods[]` filters but UI doesn't expose them yet. Can add later. |
| 4 | Remove old import? | NO — lazy require as fallback | Clean removal can happen after 1 sprint of stable server-side usage |

---

## Scope Lock

**Files WILL change:**
- `api/constants.js` (1 line — endpoint constant)
- `api/services/expenseService.js` (~15 lines — new function)
- `pages/reports-module/ExpenseReportPage.jsx` (~30 lines — import swap + data source swap + fallback)

**Files WILL NOT touch:**
- `expenseReportService.js` (kept as fallback, not modified)
- ExpenseEntryPanel, ExpenseSetupPanel, expenseTransform, Sidebar, App.js

## Post-Code Registry Checklist

- [ ] registry.json: CR-062 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: add constants.js, expenseService.js, ExpenseReportPage.jsx with CR-062
- [ ] Code markers: // CR-062 comment in every modified file

---

**Next:** Gate 4 GO → Implementation
