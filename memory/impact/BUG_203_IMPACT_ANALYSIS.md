# BUG-203 — Impact Analysis (Gate 2)

**Date:** 2026-07-24
**Code Reality:** PARTIAL — FE uses 2-call workaround (PUT rename → POST set-unit-price). Backend now accepts `unit_price` on PUT.
**Risk:** LOW

---

## Backend Validation (2026-07-24)

| Test | Previous | Now |
|---|---|---|
| `PUT /expense/expenses/{id}` with `unit_price: 500` | Ignored `unit_price` field (§3.4 not delivered) | **Accepts + persists**: `{unit_price: true, unit_price_amount: 500}` ✅ |
| `GET /expenses-list` verify | `unit_price_amount: null` | `unit_price_amount: 500` — persisted ✅ |

## Current FE Workaround (BUG-203 in ExpenseSetupPanel.jsx)

The inline edit uses a 2-call sequence:
1. `PUT /expenses/{id}` — rename + category move
2. `POST /set-unit-price` — set price separately

Now that PUT accepts `unit_price`, this can be simplified to a single PUT call.

## Affected Files

| # | File | Change | Risk |
|---|------|--------|------|
| 1 | `components/expense/ExpenseSetupPanel.jsx` | Simplify inline edit save: include `unit_price` in the PUT body. Remove second POST call. | LOW — ~10 lines cleanup |
| 2 | `api/services/expenseService.js` | Update `updateExpenseItem()` to accept + pass `unit_price` param | LOW — ~3 lines |

**Files WILL NOT touch:** constants.js, expenseTransform.js, ExpenseEntryPanel.jsx

## Scope Lock

- **2 files, ~13 lines** (merge 2-call into 1-call)
- No UI change — same edit experience
- Performance improvement: 1 API call instead of 2

---

**Next:** Gate 3 → Implementation (bundle with BUG-164 + BUG-165)
