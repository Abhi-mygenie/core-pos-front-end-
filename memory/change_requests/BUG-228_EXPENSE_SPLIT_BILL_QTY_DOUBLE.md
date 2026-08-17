# BUG-228 — Expense Split Bill: Item Appears as 2 Rows in Transaction List

**ID:** BUG-228
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P1 (HIGH)
**Risk:** MEDIUM
**Module:** Expense Entry (ExpenseEntryPanel.jsx)
**Duplicate Check:** DISTINCT — no existing bug covers split-payment display grouping
**Code Reality:** PARTIAL — split save logic exists (CR-083), display grouping does NOT
**Source:** OWNER-REPORTED (session 2026-07-22, screenshot provided)
**Confidence:** CONFIRMED (code traced)

---

## Description

When an expense item is paid via Split Bill (e.g. Cold Coffee ₹100 = ₹80 UPI + ₹20 Cash), the transaction list shows **2 separate rows** — one per payment leg. The owner expects to see **1 row** with qty=1.

### Root Cause

`handleSave()` at `ExpenseEntryPanel.jsx:681` uses `flatMap` to expand split payments into multiple API detail entries:

```javascript
if (l.splitPayments) {
  return l.splitPayments.map(sp => ({
    ...base,
    amount: parseFloat(sp.amount),
    payment_method: sp.method,
  }));
}
```

Backend stores each split leg as an independent transaction row. On fetch, the transaction table renders all rows as-is → same item appears twice.

### Evidence

- Screenshot: "Cold Coffe" ₹80 UPI + "Cold Coffe" ₹20 Cash shown as 2 separate rows
- Code: `ExpenseEntryPanel.jsx:681` — `flatMap` expansion
- API: `POST /store-expense-details` receives 2 detail entries for 1 item

---

## Blast Radius

- 1 file: `ExpenseEntryPanel.jsx` (transaction table rendering OR handleSave restructure)
- ~20-30 lines
- Scope: SMALL

## Open Questions

| # | Question | Status |
|---|---|---|
| OQ-1 | Should FE group split rows into 1 display row (with "UPI ₹80 + Cash ₹20" in payment column)? Or should backend change the storage model? | **OPEN — owner ruling needed** |

---

## Next
Owner answers OQ-1 → Planning Gate 2
