# BUG-181 — Expense Entry: "Added By" Column Missing from Daily Table

**ID:** BUG-181
**Type:** BUG
**Created:** 2026-07-11
**Created by:** INTAKE AGENT (from INVESTIGATION session + owner screenshot)
**Sprint:** pos_5_0
**Status:** INTAKE

---

## 1. Description
The daily expense transaction table on `/expenses` does not show who added each expense. The API returns `employee_name` on every transaction, and the transform maps it to `employeeName`, but the table has no "Added By" column.

## 2. Evidence
- **Source:** OWNER-REPORTED (screenshot: table shows Time, Item, Category, Amount, Payment, Actions — no Added By)
- **Confidence:** CONFIRMED
- **API:** `GET /expenses-report` returns `employee_name` field on every row (curl-confirmed).
- **Transform:** `expenseTransform.js` line 123: `employeeName: t.employee_name ?? ''` — data available.
- **Table headers:** `ExpenseEntryPanel.jsx` lines 667-673 — 6 columns, no "Added By".
- **Table rows:** Lines 724-748 — renders time, expense, category, amount, paymentMethod — no employeeName.

## 3. Classification
| Field | Value |
|-------|-------|
| **Priority** | P2 (MEDIUM) — missing info, visible in report but not in entry panel |
| **Risk** | LOW — additive column, no logic change |
| **Fast Lane eligible** | YES (owner approval needed) |

## 4. Blast Radius
- `components/expense/ExpenseEntryPanel.jsx` — add th header + td in read mode + td in edit mode + update colSpan in footer
- **~8 lines, 1 file, no hotspots**

## 5. Duplicate Check
**DISTINCT**

## 6. Related
- BUG-182 (wrong employee name) — same data field, different issue
- Investigation: `/app/memory/impact/EXPENSE_6_ISSUES_INVESTIGATION_2026_07_11.md` (Issue 5)
