# BUG-179 — Expense Report: Excel Export Has No Data

**ID:** BUG-179
**Type:** BUG
**Created:** 2026-07-11
**Created by:** INTAKE AGENT (from INVESTIGATION session)
**Sprint:** pos_5_0
**Status:** INTAKE

---

## 1. Description
Clicking "Download as Excel" on the Expense Report page produces an Excel file with only a Summary metadata sheet — no transaction data. Root cause: `exportReportAsExcel` is called with raw API response data instead of the expected `{ title, sheets: [{ columns, rows }] }` structure.

## 2. Evidence
- **Source:** OWNER-REPORTED + INVESTIGATION code trace
- **Confidence:** CONFIRMED
- **Code location:** `ExpenseReportPage.jsx` lines 200-213
  - Primary path: `exportReportAsExcel(res.data, filename)` — `res.data` = raw array, not `{ sheets }`
  - Fallback path: `exportReportAsExcel(rows, filename)` — `rows` = flat array, not `{ sheets }`
- **Expected:** `exportReportAsExcel({ title, restaurant, dateRange, sheets: [{ columns, rows, totals }] })`

## 3. Classification
| Field | Value |
|-------|-------|
| **Priority** | P1 (HIGH) — core report feature broken, no workaround |
| **Risk** | MEDIUM — touches report export logic, ~25 lines |
| **Fast Lane eligible** | NO — 25+ lines, report logic |

## 4. Blast Radius
- `pages/reports-module/ExpenseReportPage.jsx` — rebuild `handleDownloadAction` Excel path with proper params
- **~25 lines, 1 file, no hotspots**

## 5. Duplicate Check
**DISTINCT**

## 6. Related
- BUG-180 (PDF export) — same root cause pattern, fix together
- Investigation: `/app/memory/impact/EXPENSE_6_ISSUES_INVESTIGATION_2026_07_11.md` (Issue 3)
