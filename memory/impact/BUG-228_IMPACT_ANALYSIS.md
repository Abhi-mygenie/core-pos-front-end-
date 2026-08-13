# BUG-228 — Impact Analysis: Expense Split Bill 2 Rows

**ID:** BUG-228
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-22
**Risk:** MEDIUM
**Code Reality:** PARTIAL — split save exists (CR-083 L669-688), display grouping MISSING
**Conflict Pre-Check:** ExpenseEntryPanel.jsx touched by BUG-153-156, 203-205, CR-083, CR-087 — all QA PASS / IMPLEMENTED. No active conflicts. Parallel-safe.

---

## 1. Data Flow Trace

```
Save path:
  handleSave() [L635-704]
    → lines.flatMap() [L669]
    → split items expanded: 1 item with 2 payments → 2 API detail entries
    → expenseService.addExpenseEntry(dateStr, total, details) [L690]
    → Backend stores each split leg as independent row

Fetch path:
  fetchReport(date) [L543-555]
    → expenseService.getExpenseReport(date)
    → fromAPI.expenseReport(res) [expenseTransform.js:97-129]
    → transactions = data.report.map(t => {...}) — 1:1 mapping, no grouping
    → setTransactions(data.transactions) [L549]

Render path:
  transactions.map((tx, i) => <tr>...) [L909-1027]
  → Each transaction = 1 table row
  → Split legs appear as separate rows: "Cold Coffee ₹80 UPI" + "Cold Coffee ₹20 Cash"
```

## 2. Root Cause

The `flatMap` at L669-688 correctly expands split payments for the backend API contract. The backend stores each split payment leg as an independent expense_detail row. On fetch, `fromAPI.expenseReport()` maps each row 1:1 — no grouping logic exists. The transaction table renders all rows individually.

**This is a DISPLAY issue, not a data issue.** The save and storage are correct per CR-083 design.

## 3. Fix Options

### Option A: FE Display Grouping (RECOMMENDED)
Group transactions in the render layer by `expense` (item name) + `date` + proximity (same save batch).

- **Where:** `ExpenseEntryPanel.jsx` — between `transactions` state and the render `<tbody>` (L908-1027)
- **How:** Add a `useMemo` that groups transactions sharing the same `expense` name + `date` created within the same save batch (consecutive rows). Render grouped rows with combined payment info: "UPI ₹80 + Cash ₹20".
- **Risk:** LOW — display-only change, no API or save logic touched
- **Lines:** ~25-30 new lines (grouping logic in useMemo + modified render for grouped payments)

### Option B: Backend Storage Change
Backend stores 1 row with `payment_methods: [{method, amount}]` JSON field.

- **Scope:** Backend change (out of FE scope)
- **Risk:** HIGH — breaks existing single-payment rows, requires migration
- **Not recommended** for FE-only sprint

## 4. BLOCKER — OQ-1 Still Open

**⚠ OWNER RULING REQUIRED before Gate 3:**

> **OQ-1:** Should FE group split rows into 1 display row (Option A)? Or should backend change the storage model (Option B)?

**Agent recommendation:** Option A (FE grouping). Zero backend dependency. Display-only. Can ship independently.

## 5. Files Affected

| File | Change | Risk |
|---|---|---|
| `components/expense/ExpenseEntryPanel.jsx` | Add grouping useMemo + modify transaction row render for grouped payments | MEDIUM |

**Files WILL NOT touch:** expenseTransform.js, expenseService.js, constants.js, ExpenseSetupPanel.jsx, ExpenseBulkEditor.jsx

## 6. Downstream Consumers

- KPI calculations (L563-576): Sum `transactions` amounts — unaffected (grouping is display-only)
- Edit flow (`startEdit`): May need adjustment if grouped rows have different IDs — **investigate in Gate 3**
- Delete flow: Same concern — which row ID to delete for a grouped display?
- Export: Not applicable (expense export is separate API)

## 7. Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R1 | Grouping heuristic may mis-group unrelated items with same name on same date | Use consecutive-row + same-timestamp heuristic |
| R2 | Edit/delete on grouped row ambiguity | Gate 3 must define: expand group on edit? Delete all legs? |
| R3 | KPI totals double-counted | Grouping is display-only; KPIs sum raw transactions |

---

## Next

**BLOCKED on OQ-1.** Owner must approve Option A (FE grouping) or Option B (backend change) before Gate 3 planning can proceed.
