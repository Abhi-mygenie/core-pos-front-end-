# BUG-596 — Expense Report Transactions Not Sorted by Date (Alphabetical by Item Name)

**Registered:** 2026-10-19
**Type:** BUG
**Severity:** P2 — MEDIUM
**Risk:** LOW
**Area:** Reports / Expense Report
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## Symptom

The TRANSACTIONS table in the Expense Report displays rows in **alphabetical order by expense item name** instead of by expense date. Example from screenshot:
- 12/10/2026 Banana
- 13/10/2026 Bell Pepper
- 14/10/2026 Bell Pepper
- 18/10/2026 Bisleri
- 12/10/2026 **bringl** ← out of date order — shows after 18/10
- 14/10/2026 Burger Bun

Expected: rows sorted by expense date (newest first or oldest first — whichever is consistent with the date filter range).

---

## Duplicate Check

**DISTINCT** — no prior CR/BUG for expense report sort order.

---

## Root Cause (confirmed by investigation 2026-10-19)

`ExpenseReportPage.jsx` L179-191 — `filteredTransactions` useMemo returns `aggregated.transactions` with **no sort applied**:

```js
const filteredTransactions = useMemo(() => {
  if (!aggregated?.transactions) return [];
  if (!debouncedSearch.trim()) return aggregated.transactions;  // ← API order, no sort
  return aggregated.transactions.filter(...);                    // ← API order, no sort
}, [aggregated, debouncedSearch]);
```

API confirmed (live probe, owner@kunafamahal.com) returns data in **alphabetical order by item name**:
```
date='30/04/2026'  item='ac reparing'
date='16/03/2026'  item='ALAMBAGH CON'
date='07/01/2026'  item='almond'
```

`parseDateDDMMYYYY` is already imported at L14 from `expenseTransform` — no new import needed for the fix.

---

## Purchase Report Note

User asked to check Purchase Report also. Purchase Report has an existing sort mechanism (`sortKey='Purchase_Date', sortDir='desc'`, applied via `filteredRows` useMemo). Sort uses `localeCompare` — correct when `Purchase_Date` is `YYYY-MM-DD` format. Could not verify with live data (no purchase entries in probed restaurants). Not confirmed broken — monitor separately.

---

## Evidence

- **Source:** OWNER-REPORTED with screenshot (2026-10-19)
- **Confidence:** CONFIRMED — API probe + code trace
- **Screenshot:** Banana, Bell Pepper, Bisleri, bringl, Burger Bun — clearly alphabetical not date order
- **Investigation:** This session (2026-10-19)

---

## Blast Radius

- **Files WILL change:** `src/pages/reports-module/ExpenseReportPage.jsx` — **NOT R5**
- **Lines:** ~4 lines in `filteredTransactions` useMemo (L179-191)
- **Fast Lane:** YES eligible (≤10 lines, 1 file, not R5, not financial, display-only) — **owner approval required**
- **Risk Classification:** LOW — purely changes display order, no API/data change

---

## Fix Scope

Add date sort (descending — newest first) to `filteredTransactions`:

```js
const filteredTransactions = useMemo(() => {
  if (!aggregated?.transactions) return [];
  const base = !debouncedSearch.trim()
    ? aggregated.transactions
    : aggregated.transactions.filter(t => ...);
  return [...base].sort((a, b) =>
    parseDateDDMMYYYY(b.date) - parseDateDDMMYYYY(a.date) // BUG-596: newest first
  );
}, [aggregated, debouncedSearch]);
```

---

## Gate Status

- Gate 1: **COMPLETE** (this document)
- Planning-skip: **APPROVED by owner** ("call bug fix agent to fix this bug")
- Fix: READY
