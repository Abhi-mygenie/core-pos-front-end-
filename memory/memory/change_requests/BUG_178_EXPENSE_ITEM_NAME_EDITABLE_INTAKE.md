# BUG-178 — Expense Entry: Item Name Editable in Transaction Edit

**ID:** BUG-178
**Type:** BUG
**Created:** 2026-07-11
**Created by:** INTAKE AGENT (from INVESTIGATION session)
**Sprint:** pos_5_0
**Status:** INTAKE

---

## 1. Description
When editing an existing expense transaction, the item name field renders as an `ItemCombobox` dropdown, allowing the user to change the expense item. Per owner directive, item name must NOT be editable after creation. Backend should also be flagged to reject `exp_name` changes on `PUT /edit-expense/{id}`.

## 2. Evidence
- **Source:** OWNER-REPORTED (screenshot provided) + INVESTIGATION code trace
- **Confidence:** CONFIRMED
- **Screenshot:** Edit row shows item dropdown with selectable items (see user screenshot).
- **Code location:** `ExpenseEntryPanel.jsx` lines 688-695 — `ItemCombobox` in edit mode.

## 3. Classification
| Field | Value |
|-------|-------|
| **Priority** | P2 (MEDIUM) — incorrect UX, no data loss but confusing behavior |
| **Risk** | LOW — 1 file, ~5 lines, no financial logic |
| **Fast Lane eligible** | YES (owner approval needed) |

## 4. Blast Radius
- `components/expense/ExpenseEntryPanel.jsx` — replace `ItemCombobox` with static text in edit row
- **~5 lines, 1 file, no hotspots**
- **Backend brief filed:** `BACKEND_BRIEF_EXPENSE_MODULE_2026_07_11_B.md` (Brief 2)

## 5. Duplicate Check
**DISTINCT**

## 6. Related
- Investigation report: `/app/memory/impact/EXPENSE_6_ISSUES_INVESTIGATION_2026_07_11.md` (Issue 2)
- Backend brief: `/app/memory/backend_briefs/BACKEND_BRIEF_EXPENSE_MODULE_2026_07_11_B.md`
