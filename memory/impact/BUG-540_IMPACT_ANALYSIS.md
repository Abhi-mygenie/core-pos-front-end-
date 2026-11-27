# BUG-540 — Impact Analysis (Gate 2)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Item:** BUG-540 — P&L Report: Expenses column shows wrong value + KPI card wrong label and value
**Risk:** LOW
**Sprint:** oct_cr_batch

---

## Header

**Code Reality:** FULL — both bugs confirmed at HEAD (line numbers verified against live file)
**Conflict Pre-Check:** CLEAN — only BUG-539 also touches `PLReportPage.jsx` (L175 header + L264 table), different lines, parallel-safe. Last non-BUG-540 modifier: CR-094 (2026-07-23).
**Gate 2 Status:** COMPLETE — 1 open decision (OD-540-01)

---

## 1. Data Flow Trace

```
API:  GET /api/v1/vendoremployee/profit-loss-report
      ↓
Response shape:
  {
    report: [ { date, sales, paid_revenue, expenses, purchase,
                total_expenses,   ← expenses + purchase combined
                total_purchase, profit_loss } ],
    summary: { total_sales, total_paid_revenue, total_expenses,
               total_purchase, total_expenses_combined,  ← combined
               total_profit_loss }
  }
      ↓
PLReportPage.jsx — numStr() inline helper (L82) — strips commas, parseFloat
      ↓
summary useMemo (L84-94) — reads summary fields → feeds KPI strip + pieData + tfoot
tableRows useMemo (L109-128) — reads row fields → feeds data table + PDF export
chartData useMemo (L97-106) — reads row fields → feeds bar chart
      ↓
UI:
  KpiCard (L224) — "Total Expenses" / summary.totalExpenses  ← BUG B
  tableRows[].expenses (L290) — displays r.expenses cell    ← BUG A
  tfoot (L303) — summary.totalExpenses                      ← CORRECT, unchanged
  pieData (L140) — summary.totalExpenses + totalPurchase    ← CORRECT, unchanged
  chartData[].expenses (L102) — r.total_expenses            ← NEW FINDING (OD-540-01)
```

**Break points:**
- **Bug A** — `tableRows` useMemo L115: reads `r.total_expenses` (= ₹200 combined) instead of `r.expenses` (= ₹100 pure)
- **Bug B** — `summary` useMemo L90: missing `totalExpensesCombined` field → KPI card cannot reference it
- **Bug B** — KPI strip L224: label `"Total Expenses"` + value `summary.totalExpenses` both wrong

---

## 2. Line-by-Line Code Verification (HEAD)

All lines verified against `PLReportPage.jsx` at HEAD (319 lines total):

| Line | Current code | Bug? | Action |
|------|-------------|------|--------|
| L90 | `totalExpenses: numStr(s.total_expenses),` | Bug B — missing combined field | **ADD** `totalExpensesCombined: numStr(s.total_expenses_combined)` on new line after L90 |
| L102 | `expenses: numStr(r.total_expenses),` (chartData) | **NEW FINDING** | OD-540-01 — see §4 |
| L115 | `expenses:    numStr(r.total_expenses),` | Bug A — reads combined | **CHANGE** to `numStr(r.expenses)` |
| L224 | `<KpiCard label="Total Expenses" value={summary.totalExpenses} .../>` | Bug B — wrong label + wrong value | **CHANGE** label → `"Total Expenses and Purchases"`, value → `{summary.totalExpensesCombined}` |
| L303 | `{fmtINR(summary.totalExpenses)}` (tfoot Expenses) | CORRECT — pure expenses sum | **DO NOT TOUCH** |
| L140 | `{ name: 'Expenses', value: summary.totalExpenses }` (pieData) | CORRECT — pie shows Expenses vs Purchase separately | **DO NOT TOUCH** |

---

## 3. Conflict Pre-Check

**FILE_OWNERSHIP.md:**
- `PLReportPage.jsx` — last owner: CR-094 (2026-07-23, initial creation). No modifications since.

**Registry scan — other open items touching PLReportPage.jsx:**
- **BUG-539** (GATE_1_INTAKE) — edits at L175 (`flex-wrap gap-y-2` on header div) and L264 (`overflow-x-auto` wrapper). **Parallel-safe** — zero line overlap with BUG-540 edits (L90, L115, L224). Execution order: either first. No dependency.

**Verdict:** CLEAN — no conflict.

---

## 4. Open Owner Decision

| OD | Question | Context | Agent Rec |
|----|---------|---------|-----------|
| **OD-540-01** | `chartData` useMemo L102 reads `r.total_expenses` (combined ₹200) for the bar chart "Expenses" bar. Should this also be fixed to `r.expenses` (pure ₹100), for consistency with the table column? | If left as-is, the bar chart shows combined expenses+purchases as "Expenses", while the table shows pure expenses. If fixed, bar chart "Expenses" bar = pure expenses only; a separate "Purchase" bar would be needed to show purchases in the chart — but there is no separate Purchase bar defined in the chart today. | **(A) Fix to `r.expenses`** — consistent with table; bar chart shows pure expenses matching the column. Accept that the chart omits purchases (they're visible in the table). OR **(B) Leave as-is** — chart remains an aggregate view; add a note that chart Expenses ≠ table Expenses column. |

---

## 5. Risk Classification

| Attribute | Value |
|-----------|-------|
| Risk | **LOW** |
| Trigger | Pure API field mapping change, display only |
| R5 hotspot? | NO — PLReportPage.jsx is not on the R5 list |
| R6 financial? | Partial — P&L report display. Not billing/tax/settlement calculation. Owner approval required per R6 at Gate 4. |
| Planning-skip eligible? | **NO** — IS financial-display, owner approval mandatory at Gate 4 per R6 |
| Files WILL change | `PLReportPage.jsx` only |
| Files WILL NOT touch | `reportService.js` · `orderTransform.js` · `App.js` · any other file |

---

## 6. Affected Files

| File | Lines | Change Type | R5? |
|------|-------|-------------|-----|
| `src/pages/reports-module/PLReportPage.jsx` | L90, L115, L224 (+ L102 if OD-540-01 = A) | Data field remapping — no logic | NO |

---

## 7. Downstream Consumer Audit

**`summary.totalExpenses` — all usages after fix:**
| Location | Usage | Change? |
|----------|-------|---------|
| L224 KPI card | `value={summary.totalExpenses}` | → **CHANGE** to `totalExpensesCombined` |
| L303 tfoot Expenses | `fmtINR(summary.totalExpenses)` | **KEEP** — pure expenses total is correct for the column footer |
| L140 pieData | `{ name: 'Expenses', value: summary.totalExpenses }` | **KEEP** — pie shows Expenses slice vs Purchase slice separately; pure value is correct |

**`tableRows[].expenses` — all usages after fix:**
| Location | Usage | Change? |
|----------|-------|---------|
| L290 table cell | `{fmtINR(r.expenses)}` | Automatically reflects fix (reads from tableRows) — no separate change needed |
| L149 PDF export | `${fmtINR(r.expenses)}` | Automatically reflects fix — no separate change needed |

**New field `summary.totalExpensesCombined`:**
| Location | Usage |
|----------|-------|
| L90 (ADD) | `totalExpensesCombined: numStr(s.total_expenses_combined)` |
| L224 (CHANGE) | KPI card value uses it |

---

## 8. Verification Matrix (seeds Gate 3 plan + QA handover)

| # | What to verify | How | Automated? |
|---|---------------|-----|:---:|
| V1 | Table "EXPENSES" column shows pure expenses (≠ purchase) | Screenshot P&L page; confirm Expenses column ≠ Purchase column values | NO |
| V2 | KPI card label reads "Total Expenses and Purchases" | Screenshot KPI strip | NO |
| V3 | KPI card value = `total_expenses_combined` (≥ totalExpenses) | Screenshot; compare with API response | NO |
| V4 | Table footer "Expenses" total = sum of pure expenses rows | Manually sum Expenses column; compare footer | NO |
| V5 | pieData unchanged — pie still shows Expenses vs Purchase | Screenshot pie chart | NO |
| V6 (if OD-540-01=A) | Bar chart "Expenses" bar ≠ "Purchase" column value | Screenshot bar chart + table side by side | NO |
| V7 | webpack compiles 0 new warnings | `yarn build` exit 0 | YES |

---

## 9. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-540 → status: IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] BUG_TRACKER.md: row updated with IMPLEMENTED status
- [ ] FILE_OWNERSHIP.md: PLReportPage.jsx row added with BUG-540 + date
- [ ] Code markers: // BUG-540 comment in every modified line/block
- [ ] Compile check: yarn build exit 0, 0 new warnings
```

---

## 10. Summary

- **Root cause confirmed:** Code reads `r.total_expenses` (combined) instead of `r.expenses` (pure) in `tableRows`; `summary` useMemo missing `totalExpensesCombined`; KPI card JSX uses wrong field + wrong label.
- **Fix scope:** 1 file, 3-4 lines (4 lines if OD-540-01=A, 3 lines if =B).
- **No formula change, no API change, no logic change.**
- **1 open owner decision:** OD-540-01 (chartData L102).
- **Planning-skip:** NOT eligible (financial-display, R6 owner approval required at Gate 4).

**Next:** Owner resolves OD-540-01 → Gate 3 GO → Implementation Plan.
