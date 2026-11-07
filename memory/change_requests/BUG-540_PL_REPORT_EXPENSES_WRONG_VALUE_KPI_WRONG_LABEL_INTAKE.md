# BUG-540 — P&L REPORT: EXPENSES COLUMN SHOWS WRONG VALUE + KPI CARD WRONG LABEL AND VALUE
**Registered:** 2026-10-12
**Type:** BUG (data mapping — wrong API field read for two UI elements)
**Severity:** P1 — HIGH
**Risk:** LOW
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE

---

## Description

Two data display bugs in the P&L Report (`/reports-module/profit-loss`):

**Bug A — Expenses table column shows combined value (expenses + purchase) instead of pure expenses:**
The "EXPENSES" column in the data table shows `total_expenses` (which = expenses + purchase = ₹200) but should show `expenses` (pure expense only = ₹100).

**Bug B — KPI card "Total Expenses" has wrong label AND wrong value:**
- Label should be "**Total Expenses and Purchases**" (not "Total Expenses")
- Value should be `total_expenses_combined` (₹200 — both combined) not `total_expenses` (₹100 — expenses only)

---

## API Evidence

From `GET /api/v1/vendoremployee/profit-loss-report` (owner-provided):

```json
row: {
  "expenses": "100.00",          ← what Expenses column SHOULD show
  "purchase": "100.00",
  "total_expenses": "200.00"     ← what it currently shows (WRONG — combined)
}
summary: {
  "total_expenses": "100.00",         ← pure expenses only
  "total_purchase": "100.00",
  "total_expenses_combined": "200.00" ← what KPI card SHOULD show
}
```

---

## Root Cause

**Bug A** — `PLReportPage.jsx L115`:
```javascript
// CURRENT (wrong)
expenses: numStr(r.total_expenses),   // ← 200 (combined)

// SHOULD BE
expenses: numStr(r.expenses),          // ← 100 (pure expenses)
```

**Bug B** — `PLReportPage.jsx L90 + L224`:
```javascript
// CURRENT summary object (L90) — missing combined field
totalExpenses: numStr(s.total_expenses),   // ← 100 (expenses only)

// SHOULD ADD to summary object
totalExpensesCombined: numStr(s.total_expenses_combined),  // ← 200

// CURRENT KPI card (L224)
<KpiCard label="Total Expenses" value={summary.totalExpenses} />

// SHOULD BE
<KpiCard label="Total Expenses and Purchases" value={summary.totalExpensesCombined} />
```

**Note:** The TOTAL row in the table footer for Expenses (L303) already uses `summary.totalExpenses` (= sum of pure expenses = ₹100). This is CORRECT and should remain unchanged after Bug A fix.

---

## Duplicate Check

**DISTINCT** — no prior BUG for P&L data mapping.

---

## Evidence

- **Source:** OWNER-REPORTED (2026-10-12) with full API response JSON provided
- **Confidence:** CONFIRMED — code trace + live API data
- **Code reality:** FULL (bugs at HEAD)

---

## Severity

**P1 — HIGH:** Financial report shows incorrect expense figures. Any user reviewing the P&L report for business decisions sees inflated Expenses (₹200 instead of ₹100) in each row and misleading KPI card label.

---

## Risk

**LOW** — pure data mapping fix in one file. No logic change, no API change, no financial formula change.

---

## Blast Radius

- **Files WILL change:** `PLReportPage.jsx` only (~4 lines)
- **Files WILL NOT touch:** `reportService.js` · `orderTransform.js` · any other file

---

## Fix (4 lines total)

1. L90: Add `totalExpensesCombined: numStr(s.total_expenses_combined)` to summary useMemo
2. L115: Change `numStr(r.total_expenses)` → `numStr(r.expenses)` for table row mapping
3. L224: Change KPI card label `"Total Expenses"` → `"Total Expenses and Purchases"`
4. L224: Change KPI card value `summary.totalExpenses` → `summary.totalExpensesCombined`

---

## Next

→ Gate 2 GO → Impact Analysis (fast — 1 file, 4 lines, LOW risk, planning skip eligible check)
