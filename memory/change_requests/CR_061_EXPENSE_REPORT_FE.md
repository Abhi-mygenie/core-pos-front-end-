# CR-061: Expense Report — FE Build with Client-Side Aggregation

**ID:** CR-061
**Type:** CR (Change Request)
**Created:** 2026-07-06
**Status:** INTAKE
**Priority:** P1
**Risk:** LOW (read-only report, no mutations, follows proven Insights pattern)
**Sprint:** POS 5.0
**Source:** OWNER-DIRECTED (split from CR-059 Phase 2)
**Parent:** CR-059 Phase 2

---

## Summary

Build the Expense Report page under Insights module using client-side aggregation from the existing raw `expenses-report` API. Same approach used for all initial Insights reports before CR-049 backend migration.

This is the **FE-first** step. The report ships with client-side aggregation. Once finalized, the report's data needs become the input for CR-062 (backend aggregation contract).

---

## Scope

### Surface A: Insights → Expense Report (NEW page)
- **Route:** `/reports-module/expense-report`
- **Pattern:** Exact clone of DailySalesMockup / SettlementReportMockup
- **Data source:** `GET /expense/expenses-report` (raw transactions, client-side aggregation)
- **Components:** InsightsCacheContext + useReportFetch + ReportLoadingShield + recharts
- **KPIs:** Total Spend, Avg Daily, Transaction Count, Top Category, Highest Day, Cash vs Digital
- **Charts:** Daily trend bar, Category pie, Payment method split
- **Table:** Date, Item, Category, Amount, Payment — sortable, searchable, filterable
- **Filters:** Date range (presets) + Category + Payment Method + Search
- **Export:** Excel/PDF via `expenses-export-report` endpoint
- **Sidebar:** New "Expenses" group under Insights

### Surface B: Daily Report → Expense Summary Card
- **Route:** Existing `/reports/summary` (OrderSummaryPage)
- **Change:** Add expense summary card showing today's total + payment breakdown
- **Data:** `expenses-report?from=today&to=today`
- **Link:** Navigate to Insights Expense Report

---

## APIs Used (all from Phase 1 — no new endpoints needed)

| Endpoint | Usage |
|---|---|
| `GET /expense/expenses-report?from=&to=&payment_method=` | Main data source |
| `POST /expense/expenses-export-report` | Excel export |
| `GET /expense/category-list` | Category filter |
| `GET /expense/payment-method` | Payment filter |

---

## Client-Side Aggregations (will become backend contract in CR-062)

| Aggregation | Computation | Future Backend Endpoint |
|---|---|---|
| Total spend | `sum(amounts)` | `expense_summary.total` |
| By category | `groupBy(category).sum(amount)` | `expense_summary.by_category[]` |
| By date | `groupBy(date).sum(amount)` | `expense_summary.daily[]` |
| By month | `groupBy(month).sum(amount)` | `expense_summary.monthly[]` |
| By payment | `groupBy(payment_method).sum(amount)` | `expense_summary.by_payment[]` |
| Avg daily | `total / unique_active_days` | `expense_summary.avg_daily` |
| Top category | `max(by_category)` | `expense_summary.top_category` |
| Highest day | `max(by_date)` | `expense_summary.highest_day` |

---

## Next

- Discovery complete → Gate 2 (Impact Analysis) → Gate 3 → Implementation
- After ship: finalized report data shapes become input for CR-062
