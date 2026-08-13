# CR-062 — Expense Report Backend Aggregation: API Contract

**Status:** PLANNING — Contract document only. Zero FE code until backend delivers endpoint.
**Date:** 2026-07-22
**Decisions Source:** `LEARNING_SUMMARY_OQ_CLOSURE_2026_07_22.md`
**Pattern:** Follows CR-049 (backend aggregation pattern)

---

## Purpose

Current: FE fetches all expense transactions → client-side groups/sums in `expenseTransform.js`
Future: FE sends filter params → backend returns pre-aggregated data → FE renders directly (no client-side compute)

---

## Endpoint

```
POST /api/v2/vendoremployee/expense/expense-aggregation
Content-Type: application/json
Authorization: Bearer {token}
X-localization: en
```

---

## Request Body

```json
{
  "from": "DD/MM/YYYY",
  "to": "DD/MM/YYYY",
  "category_ids": [1, 2, 3],
  "payment_methods": ["Cash Draw", "Bank Transfer"]
}
```

### Request Field Notes
| Field | Type | Required | Notes |
|---|---|---|---|
| `from` | string | ✅ | Format: "DD/MM/YYYY" — same as existing `getExpenseReport()` |
| `to` | string | ✅ | Format: "DD/MM/YYYY" |
| `category_ids` | int[] | ❌ optional | Omit or send `[]` for "All categories" |
| `payment_methods` | string[] | ❌ optional | Omit or send `[]` for "All methods" |

---

## Response Shape (ALL THREE BREAKDOWNS in one call)

```json
{
  "grand_total": 48250.00,
  "daily_totals": [
    {
      "date": "2026-07-01",
      "total": 1250.00,
      "transaction_count": 8
    }
  ],
  "category_totals": [
    {
      "category_id": 12,
      "category_name": "Groceries",
      "total": 18500.00,
      "transaction_count": 34
    }
  ],
  "payment_totals": [
    {
      "payment_method": "Cash Draw",
      "total": 32000.00,
      "transaction_count": 56
    }
  ]
}
```

### Response Field Notes
| Field | Type | Notes |
|---|---|---|
| `grand_total` | float | Sum of all transactions in date range (respects filters) |
| `daily_totals` | array | One entry per calendar day in range that has transactions |
| `category_totals` | array | One entry per expense category that has transactions |
| `payment_totals` | array | One entry per payment method that has transactions |

---

## FE Integration Plan (post-delivery)

When backend delivers:
1. Add `EXPENSE_AGGREGATION: '/api/v2/vendoremployee/expense/expense-aggregation'` to `constants.js`
2. Add `getExpenseAggregation(from, to, { categoryIds, paymentMethods })` to `expenseService.js`
3. Update `ExpenseReportPanel.jsx` to call aggregation endpoint instead of client-side compute
4. Deprecate aggregation functions in `expenseTransform.js`

No FE code written before backend delivery.

---

## Backend Brief (to send to backend team)

> We need a new endpoint: `POST /expense/expense-aggregation`
>
> Purpose: Server-side aggregation of expense transactions (replaces current client-side compute).
>
> Request: `{ from, to, category_ids[], payment_methods[] }` (filters optional)
>
> Response must include ALL THREE in one call:
> - `daily_totals[]` with `{ date, total, transaction_count }`
> - `category_totals[]` with `{ category_id, category_name, total, transaction_count }`
> - `payment_totals[]` with `{ payment_method, total, transaction_count }`
> - `grand_total` (scalar)
>
> Date format: DD/MM/YYYY (consistent with existing expense endpoints)
> No pagination needed — full dataset per request (same behavior as existing `expenses-report`)

---

## Current CR-061 Functions That Will Be Deprecated

From `expenseTransform.js`:
- `fromAPI.dailyAggregation()` — client groups transactions by date
- `fromAPI.categoryAggregation()` — client groups by category
- `fromAPI.paymentAggregation()` — client groups by payment method

These are kept as-is until backend delivers the endpoint and FE switches over.
