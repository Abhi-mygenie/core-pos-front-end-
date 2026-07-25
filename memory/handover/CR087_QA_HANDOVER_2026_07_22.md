# CR-087 QA Handover
**Date:** 2026-07-22
**Test report:** `/app/test_reports/iteration_3.json`
**Result:** 9/9 PASS

## Test Coverage

| Test | Result |
|---|---|
| Form Row 2: Notes + Paid to + Ref ID side-by-side | PASS |
| Form inputs accept typed values | PASS |
| Transaction table has 12 columns incl. Paid To + Ref ID | PASS |
| View mode cells: `expense-payment-made-to-{id}`, `expense-payment-ref-id-{id}` | PASS |
| Edit mode cells: `expense-edit-payment-made-to-{id}`, `expense-edit-payment-ref-id-{id}` | PASS |
| Expense Report table has 11 columns incl. Paid To + Ref ID | PASS |
| Expense Report row testids present | PASS |
| `expense-total-amount` still correct | PASS |
| Overall regression: panels load, transactions display | PASS |

## Issue Fixed Post-QA

- React hydration warning (whitespace text node in `<tr>`) — fixed by removing inline comment whitespace from `<td colSpan>` lines

## Backend Field Flag

- `/expenses-list` response: `payment_made_to`, `payment_ref_id` confirmed present ✅
- `/expenses-report` response: **NOT verified** — columns show `—` for existing data (expected). If backend is NOT returning these fields from the report endpoint, file BACKEND_BRIEF_CR087_REPORT_FIELDS to backend team.

## Gate 6 — Owner Smoke

Pending. Owner should:
1. Navigate to Expense Entry → add a new expense entry with "Paid to" and "Ref ID" values
2. Verify they appear in the transaction table
3. Click Edit on that row → verify fields are pre-populated
4. Navigate to Expense Report → verify "Paid To" + "Ref ID" columns appear
