# BUG-180 — Expense Report: PDF Export Throws Error

**ID:** BUG-180
**Type:** BUG
**Created:** 2026-07-11
**Created by:** INTAKE AGENT (from INVESTIGATION session)
**Sprint:** pos_5_0
**Status:** INTAKE

---

## 1. Description
Clicking "Download as PDF" on the Expense Report page throws an error. Root cause: `exportReportAsPDF` is called with a single string argument instead of `(Window, params)`. The function requires `openReportWindow()` to be called first to get a window handle.

## 2. Evidence
- **Source:** OWNER-REPORTED + INVESTIGATION code trace
- **Confidence:** CONFIRMED
- **Code location:** `ExpenseReportPage.jsx` line 216
  - Current: `exportReportAsPDF(\`Expense Report (...)\`)`
  - Expected: `const win = openReportWindow(); exportReportAsPDF(win, { title, restaurant, dateRange, sheets })`
- **Error:** "Report window was closed before generation completed" (string has no `.closed` property)

## 3. Classification
| Field | Value |
|-------|-------|
| **Priority** | P1 (HIGH) — core report feature broken, no workaround |
| **Risk** | MEDIUM — touches report export logic, ~25 lines |
| **Fast Lane eligible** | NO — 25+ lines, report logic |

## 4. Blast Radius
- `pages/reports-module/ExpenseReportPage.jsx` — add `openReportWindow` import + rebuild PDF path with proper params
- **~25 lines, 1 file, no hotspots**

## 5. Duplicate Check
**DISTINCT**

## 6. Related
- BUG-179 (Excel export) — same root cause pattern, fix together
- Investigation: `/app/memory/impact/EXPENSE_6_ISSUES_INVESTIGATION_2026_07_11.md` (Issue 4)
