# BUG-177 — Expense Entry: Notes Field Missing from Add Form

**ID:** BUG-177
**Type:** BUG
**Created:** 2026-07-11
**Created by:** INTAKE AGENT (from INVESTIGATION session)
**Sprint:** pos_5_0
**Status:** INTAKE

---

## 1. Description
The `notes` field is visible in the Expense Report (Insights) table but cannot be entered when adding a new expense. Backend accepts and stores `notes` (curl-confirmed), but the Add Expense form has no notes input, and the save payload omits the field entirely.

## 2. Evidence
- **Source:** INVESTIGATION — curl-confirmed backend accepts `notes` in `POST /store-expense-details`
- **Confidence:** CONFIRMED
- **Steps to reproduce:** Navigate to `/expenses` → Add Expense → observe no notes input field. Navigate to `/reports-module/expense-report` → observe "Notes" column with `—` for all entries.

## 3. Classification
| Field | Value |
|-------|-------|
| **Priority** | P2 (MEDIUM) — feature gap, workaround: no way to add notes currently |
| **Risk** | LOW — additive, no financial logic, no hotspot files |
| **Fast Lane eligible** | YES (owner approval needed) |

## 4. Blast Radius
- `components/expense/ExpenseEntryPanel.jsx` — add `notes` to EMPTY_LINE + EntryLine + handleSave + startEdit + editRow
- `api/transforms/expenseTransform.js` — add `notes` to `toAPI.addExpenseEntry` + `toAPI.editExpenseEntry`
- **~15 lines, 2 files, no hotspots**

## 5. Duplicate Check
**DISTINCT** — no existing bug covers notes in expense entry form.

## 6. Related
- Investigation report: `/app/memory/impact/EXPENSE_6_ISSUES_INVESTIGATION_2026_07_11.md` (Issue 1)
