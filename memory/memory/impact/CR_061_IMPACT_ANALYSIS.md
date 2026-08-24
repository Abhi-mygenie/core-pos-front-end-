# CR-061 — Gate 2: Impact Analysis

**ID:** CR-061
**Gate:** 2 — Impact Analysis only
**Date:** 2026-07-07 (re-plan — previous plan had protocol violations, see audit)
**Planner:** PLANNING AGENT (AGENT_PROMPT_ALPHA v0.7)
**Code Reality:** PARTIAL (see Step 0 below)
**Conflict Pre-Check:** CLEAN (see Step 1 below)
**Risk:** LOW — read-only report, no mutations, follows proven Insights pattern
**Priority:** P1
**Sprint:** POS 5.0

---

## Owner Decisions — RESOLVED 2026-07-07

| Q | Question | Answer | Status |
|---|---|---|---|
| Q1 | New `expenseReportService.js` or import directly? | **A — Create new helper file** (`expenseReportService.js` with `aggregateExpenses`) | ✅ RESOLVED |
| Q2 | Default date preset on load? | **Today** | ✅ RESOLVED |
| Q3 | Sidebar: group header + child or child only? | **PENDING** — owner needs clarification (see question above) | ⏳ PENDING |
| Q4 | Surface B (OrderSummaryPage expense card) in scope? | **Deferred to later phase** — not in CR-061 | ✅ RESOLVED |
| Q5 | Date sort utility preference | Minor — use `parseDateDDMMYYYY` (Option A) | ✅ RESOLVED |

---

## Step 0 — Code Reality Check (verified by grep)

```bash
grep -rn "getExpenseReport\|exportExpenseReport\|expenseReport\|EXPENSES_REPORT\|EXPORT_REPORT" /app/frontend/src/
```

### ALREADY EXISTS — must reuse, must NOT duplicate

| What | File | Line | Notes |
|---|---|---|---|
| `getExpenseReport(from, to, paymentMethod)` | `api/services/expenseService.js` | L92 | Fetch raw transactions. Params: DD/MM/YYYY format |
| `exportExpenseReport(from, to)` | `api/services/expenseService.js` | L152 | POST export. Uses `EXPENSE_ENDPOINTS.EXPORT_REPORT` (NOT `EXPENSES_EXPORT`) |
| `getCategoryList()` | `api/services/expenseService.js` | L15 | Category dropdown |
| `getPaymentMethods()` | `api/services/expenseService.js` | L225 | Payment method dropdown |
| `expenseTransform.expenseReport(res)` | `api/transforms/expenseTransform.js` | L96 | Normalises non-standard API keys ('Date & Time', 'EXPENSE', 'Amount', 'Payment Method', 'Category') |
| `expenseTransform.paymentMethods(res)` | `api/transforms/expenseTransform.js` | L129 | Normalises `{ Payment_method: [] }` |
| `formatDateDDMMYYYY(date)` | `api/transforms/expenseTransform.js` | L15 | ISO → DD/MM/YYYY (needed since InsightsCacheContext uses ISO dates) |
| `EXPENSE_ENDPOINTS.EXPENSES_REPORT` | `api/constants.js` | L338 | `/api/v2/vendoremployee/expense/expenses-report` |
| `EXPENSE_ENDPOINTS.EXPORT_REPORT` | `api/constants.js` | L342 | `/api/v2/vendoremployee/expense/expenses-export-report` |
| `EXPENSE_ENDPOINTS.CATEGORY_LIST` | `api/constants.js` | L328 | `/api/v2/vendoremployee/expense/category-list` |

**Code Reality: PARTIAL.**
The fetch layer, transform layer, and all API constants already exist.
What does NOT exist: the page component (`ExpenseReportPage.jsx`) and the client-side `aggregateExpenses()` function.
**The plan must reuse what exists. No new service file is strictly required — this is Owner Decision Q1 below.**

---

## Step 1 — Conflict Pre-Check (verified against FILE_OWNERSHIP.md + registry.json)

### Target files and their last known modifiers

| File | Last Modified By | Risk | CR-061 conflict? |
|---|---|---|---|
| `components/layout/Sidebar.jsx` | CR-059 (2026-07-06) | MEDIUM — 7 CRs have touched this file | NONE — CR-059 added Expenses menu. CR-061 inserts inside Insights section (different array block, L175 insertion point). Parallel-safe. |
| `App.js` | CR-041 + CR-045 cleanup (2026-06-17) | LOW | NONE — adding 1 import + 1 route inside `<InsightsCacheProvider>` block. Same pattern as existing 30+ routes. |
| `pages/OrderSummaryPage.jsx` | CR-052 (isSidebarExpanded default, 2026-06-18) | LOW | NONE — additive card section only. No existing code modified. |

**No open CR in registry with status ≠ CLOSED touching these files.**

Conflict Pre-Check: **CLEAN**

---

## Step 2 — Gate 2: Impact Analysis

### Scope

**Surface A — `/reports-module/expense-report` (NEW PAGE)**
Full Insights expense report with KPIs, charts, table, filters, export.

**Surface B — `/reports/summary` expense card — ⛔ DEFERRED**
Moved to a later phase / separate CR. Not in scope for CR-061.

---

### APIs Used

All 4 endpoints already fully confirmed:

| Endpoint | Constant | Direction | Transform | Status |
|---|---|---|---|---|
| `GET /expense/expenses-report?from=&to=&payment_method=` | `EXPENSES_REPORT` | Fetch raw transactions | `expenseTransform.expenseReport(res)` | ✅ CONFIRMED LIVE (probe_expenses_report_7d.json — 3 txns, ₹1,476 total) |
| `POST /expense/expenses-export-report` | `EXPORT_REPORT` | Excel export | None (file download) | ✅ Endpoint defined |
| `GET /expense/category-list` | `CATEGORY_LIST` | Category filter dropdown | `expenseTransform.categoryList(res)` ← verify exists | ⚠ Not probed — field shape unknown |
| `GET /expense/payment-method` | — | Payment method filter | `expenseTransform.paymentMethods(res)` | ⚠ Not probed — field shape assumed from transform code |

**⚠ FLAG — Q6:** `category-list` and `payment-method` endpoints were not curl-probed. The `expenseTransform.categoryList()` and `expenseTransform.paymentMethods()` functions handle these responses. Implementation agent must verify both transform outputs before building the filter UI.

---

### Confirmed API Response Shape (from live probe)

From `probe_expenses_report_7d.json`:
```json
{
  "total_amount": 1476,
  "report": [
    {
      "id": 13571,
      "Date & Time": "06/07/2026",
      "EXPENSE": "10000",
      "Category": "To Owner",
      "category_id": 255,
      "Amount": "500",
      "Payment Method": "Cash",
      "quantity": "0.00",
      "unit": "",
      "physical_quantity": "0",
      "notes": ""
    }
  ]
}
```

**Key observations:**
1. `Date & Time` field returns **date only** (no time component) — `"06/07/2026"` format (DD/MM/YYYY). Daily grouping in `aggregateExpenses()` can use this field directly as the key — no `.split(' ')` needed.
2. `EXPENSE` field is the budget ceiling / stock item name — NOT the expense item name. `Amount` is the actual charge.
3. `total_amount` is a number (not a string).
4. `Amount` is a string — must be `parseFloat()`.
5. `expenseTransform.expenseReport()` already handles all non-standard keys correctly.

---

### Data Flow

```
preprod.mygenie.online
  │
  ├── GET /expense/expenses-report?from=DD/MM/YYYY&to=DD/MM/YYYY
  │     └── expenseService.getExpenseReport(from, to, paymentMethod)  [EXISTING]
  │           └── expenseTransform.expenseReport(res)                  [EXISTING]
  │                 └── { totalAmount, transactions: [{id, date, expense, category, amount, paymentMethod, ...}] }
  │
  ├── GET /expense/category-list
  │     └── expenseService.getCategoryList()                           [EXISTING]
  │           └── expenseTransform.categoryList(res)                   [EXISTING — verify]
  │
  ├── GET /expense/payment-method
  │     └── expenseService.getPaymentMethods()                         [EXISTING]
  │           └── expenseTransform.paymentMethods(res)                 [EXISTING]
  │
  └── POST /expense/expenses-export-report
        └── expenseService.exportExpenseReport(from, to)               [EXISTING]
                                                                        ↓
                               aggregateExpenses(transactions)          [NEW — pure fn]
                                 → { totalAmount, transactionCount, activeDays, avgDaily,
                                     topCategory, highestDay, byCategory[], byPayment[], daily[] }
                                                                        ↓
                         ┌──────────────────────────────────────────────────────────┐
                         │                                                          │
               ExpenseReportPage.jsx [NEW]                    OrderSummaryPage.jsx [MODIFIED]
               /reports-module/expense-report                 /reports/summary
               (Surface A — full report)                      (Surface B — today's card)
```

**Date format note:** `InsightsCacheContext` provides `sharedFrom` / `sharedTo` as **ISO (YYYY-MM-DD)**. `getExpenseReport()` expects **DD/MM/YYYY**. Conversion: `formatDateDDMMYYYY(sharedFrom)` — utility already exists at `expenseTransform.js:L15`.

---

### Client-Side Aggregation (`aggregateExpenses`)

Input: `transactions[]` from `expenseTransform.expenseReport(res).transactions`

Computed outputs:

| KPI | Formula | Notes |
|---|---|---|
| Total Spend | `sum(t.amount)` (use `totalAmount` from API) | API provides `total_amount` directly — prefer API value |
| Transaction Count | `transactions.length` | |
| Active Days | `new Set(transactions.map(t => t.date)).size` | |
| Avg Daily | `totalAmount / activeDays` | Guard: `activeDays > 0` |
| Top Category | `max(byCategory by total)` | |
| Highest Day | `max(byDate by total)` | |
| By Category | `groupBy(t.category).sum(t.amount)` | |
| By Payment | `groupBy(t.paymentMethod).sum(t.amount)` | |
| Daily | `groupBy(t.date).sum(t.amount)` + count | `t.date` is "DD/MM/YYYY" — use directly as group key |
| Daily sort | sort by parsed date ascending | `parseDateDDMMYYYY(a.date) - parseDateDDMMYYYY(b.date)` — utility exists at `expenseTransform.js:L43` |

---

### Affected Files

| File | Type | Scope | Risk |
|---|---|---|---|
| `pages/reports-module/ExpenseReportPage.jsx` | NEW | ~500 lines | LOW |
| `api/services/expenseReportService.js` | NEW | ~30 lines — `aggregateExpenses()` only | LOW |
| `components/layout/Sidebar.jsx` | MODIFY | +1 or +2 lines (Q3-pending) | LOW |
| `App.js` | MODIFY | +2 lines (import + route) | LOW |

**Files WILL NOT touch:**
- `expenseService.js` — reused as-is, zero modifications
- `expenseTransform.js` — reused as-is, zero modifications
- `api/constants.js` — no new constants needed
- `InsightsCacheContext.jsx` — used, not modified
- `OrderSummaryPage.jsx` — **OUT OF SCOPE (Surface B deferred)**
- All order/payment/settlement/menu/socket files
- All other Insights report pages

---

### Risk Classification

**Risk: LOW**

| Trigger check | Result |
|---|---|
| API contract change | NO — all endpoints existing and confirmed |
| Financial mutation | NO — read-only report |
| Order flow touched | NO |
| Settlement / billing touched | NO |
| Auth / permission change | NO |
| Socket change | NO |
| hotspot files (Sidebar/App.js) | YES — but changes are additive-only (2 lines each) |
| Provider order change | NO |
| localStorage key change | NO |

---

### Downstream Consumer Check

| File changed | Downstream consumers to verify |
|---|---|
| `Sidebar.jsx` (+2 lines under Insights) | All Insights pages — navigation only, no logic change |
| `App.js` (+1 route) | None — new isolated route |
| `OrderSummaryPage.jsx` (+card) | `reportService.js` (read-only, not modified) |

---

## Owner Decision Queue

| Q | Question | Answer |
|---|---|---|
| Q1 | New `expenseReportService.js` or import directly from `expenseService.js`? | ✅ **Create new helper file** (`expenseReportService.js` — contains `aggregateExpenses` only) |
| Q2 | Default date preset on page load? | ✅ **Today** |
| Q3 | Sidebar: group header "Expenses" + child, or just the child item? | ✅ **A — Group header "Expenses" + child "Expense Report"** |
| Q4 | Surface B (OrderSummaryPage expense card) in scope? | ✅ **Deferred — later phase** |
| Q5 | Date sort utility preference | ✅ **Use `parseDateDDMMYYYY` (Option A)** |

```
Gate 2 complete: CR-061
Code Reality: PARTIAL (fetch + transform + constants exist; page + aggregation function do not)
Conflict Pre-Check: CLEAN
Risk: LOW
Affected files: 2 existing (Sidebar, App.js) + 2 new (ExpenseReportPage + expenseReportService)
OrderSummaryPage.jsx: OUT OF SCOPE — Surface B deferred to later phase
All owner decisions: RESOLVED
Next: Gate 4 GO → Implementation
```
