# OQ Closure — Learning Summary
**Date:** 2026-07-22
**Session:** Fork from 2026-07-21 Gate 2 Impact Analysis
**Status:** OQs closed → Items transition to Gate 3

---

## CR-062 — Expense Report Backend Aggregation

### Decisions Locked

| OQ | Question | Decision |
|---|---|---|
| OQ-1 | Which breakdowns? | **All three: daily totals + by-category + by-payment-method** |
| OQ-2 | Date range / pagination? | **Follow existing layout** — owner-selected date range (same as current ExpenseReportPage `from`/`to` params), full dataset (no pagination) |
| OQ-3 | Replace or run alongside CR-061? | **Replaces client-side compute entirely** — no client-side aggregation once backend endpoint delivers |

### What This Means for the Contract

- Request shape mirrors current `getExpenseReport()`: `{ from, to, category_id?, payment_method? }`
- Response must return all 3 breakdown arrays in ONE call (no multiple endpoints)
- FE will pass filter state (category_ids[], payment_methods[]) to backend
- Backend returns pre-aggregated `{ daily_totals[], category_totals[], payment_totals[], grand_total }`
- CR-061 `expenseTransform.js` client-side aggregation functions are **deprecated** once this ships

### Gate Status
- Gate 2 Impact: ✅ COMPLETE (this doc)
- Gate 3 (Backend contract): ✅ See `CR_062_BACKEND_CONTRACT.md`
- Gate 4+: ❌ Blocked until backend delivers `POST /expense/expense-aggregation`

---

## CR-087 — New Expense Payment Fields (payment_made_to + payment_ref_id)

### Decisions Locked

| OQ | Question | Decision |
|---|---|---|
| OQ-1 | Form position | **Row 2 of Add Expense form** — Notes becomes narrower, payment_made_to and payment_ref_id appear alongside Notes in same row |
| OQ-2 | Required or optional? | **Always optional** |
| OQ-3 | payment_made_to type? | **Free-text input** (no vendor dropdown) |
| OQ-4 | payment_ref_id in table/report? | **Yes, both** — also flag backend if field missing from response |
| OQ-5 | payment_made_to in table/report? | **Yes, both** — also flag backend if field missing from response |
| OQ-6 | Edit flow included? | **Yes** — edit flow already supported by backend (fields exist in response) |
| OQ-7 | Original linked CR/BUG? | **Unknown** — assigned new ID CR-087 |

### Backend Field Verification (from Gate 2 live probes)
- `expenses-list` response: `"payment_made_to": ""`, `"payment_ref_id": ""` ✅ confirmed present
- `store-expense-details`: accepts both fields ✅ confirmed

### Form Layout (from screenshot 2026-07-21)

**Current Row 2:**
```
[  Notes (optional) — full width                           ]
```

**New Row 2 (after CR-087):**
```
[  Notes (smaller) ] [ payment_made_to ] [ payment_ref_id ]
```

### Files to Change

| File | Change | Risk |
|---|---|---|
| `expenseTransform.js` | Add `payment_made_to` + `payment_ref_id` to `toAPI.storeExpenseDetails()` + `toAPI.editExpenseEntry()` + `fromAPI.expenseTransaction()` | LOW |
| `ExpenseEntryPanel.jsx` | Add 2 fields in Row 2 alongside Notes; wire through add + edit form state; add to save handler | MEDIUM |
| `ExpenseEntryPanel.jsx` | Add to transaction table columns | LOW |
| `ExpenseReportPage.jsx` | Add to report table columns | LOW |

### Gate Status
- Gate 0 (intake): ✅ Registered as CR-087
- Gate 1 (duplicate check): ✅ No duplicate found
- Gate 2 (impact): ✅ This doc
- Gate 3 (implementation plan): → NEXT
- Gate 4+: → Pending owner Gate 3 GO

---

## BUG-201 Phase 1 — Cascade Delete Warning (Pre-existing, Gate 3 Ready)

- All blockers cleared in previous session via live endpoint tests
- Implementation started this session (see BUG_TRACKER.md)
