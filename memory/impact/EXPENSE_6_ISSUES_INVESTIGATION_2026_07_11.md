# Investigation Report — 6 Expense Module Issues

**Date:** 2026-07-11
**Agent:** INVESTIGATION (AGENT_PROMPT_ALPHA v0.7)
**Steps used:** 10/10
**Credentials:** owner@cafe103.com (masked)
**Restaurant:** CAFE 103 (id=644)

---

## Issue 1: Notes field — shows in reports but cannot be added

**Root cause:** FE_BUG — `notes` field missing from Add Expense form + `toAPI.addExpenseEntry` payload
**Confidence:** HIGH | **Classification:** FE_BUG

**Evidence:**
- Backend accepts `notes`: `POST /store-expense-details` with `"notes": "test"` → stored and echoed.
- Backend returns `notes`: `GET /expenses-report` includes `"notes": ""` on every row.
- Report page renders notes: `ExpenseReportPage.jsx` line 393 "Notes" column, line 411 `t.notes`.
- Entry form missing: `EMPTY_LINE` (line 32-37) has no `notes`. `handleSave` (line 476-483) no `notes`. `toAPI.addExpenseEntry` no `notes`.

**Fix:** ~15 lines, 2 files (`ExpenseEntryPanel.jsx`, `expenseTransform.js`). FAST LANE eligible.

---

## Issue 2: Item name editable during transaction edit — should be read-only

**Root cause:** FE_BUG + BACKEND_FLAG — edit mode renders `ItemCombobox` allowing name change
**Confidence:** HIGH | **Classification:** FE_BUG

**Evidence:**
- Screenshot: edit row shows item dropdown with "aaa" selectable.
- Code: `ExpenseEntryPanel.jsx` lines 688-695 renders `<ItemCombobox>` in edit mode.
- Owner directive: item name must NOT be editable after creation.

**Fix:** ~5 lines, 1 file. FAST LANE eligible.
**Backend brief:** `PUT /edit-expense/{id}` should reject/ignore `exp_name` changes.

---

## Issue 3: Expense Report — Excel export has no data

**Root cause:** FE_BUG — `exportReportAsExcel` called with wrong argument shape
**Confidence:** HIGH | **Classification:** FE_BUG (argument mismatch)

**Evidence:**
- Function expects `{ title, sheets: [{ columns, rows }] }`.
- Code passes `res.data` (raw API array) or `rows` (flat array) — no `sheets` property.
- Result: Excel has Summary metadata sheet only, no transaction data.

**Fix:** ~25 lines, 1 file (`ExpenseReportPage.jsx`). Normal flow.

---

## Issue 4: Error while exporting PDF for expenses

**Root cause:** FE_BUG — `exportReportAsPDF` called with 1 string instead of `(Window, params)`
**Confidence:** HIGH | **Classification:** FE_BUG (argument mismatch)

**Evidence:**
- Function signature: `exportReportAsPDF(win, params)` — needs `openReportWindow()` first.
- Code: `exportReportAsPDF(\`Expense Report (...)\`)` — passes string as `win`.
- Result: throws "Report window was closed before generation completed."

**Fix:** ~25 lines, 1 file (fix with Issue 3). Normal flow.

---

## Issue 5: "Added By" not showing in daily transaction table

**Root cause:** FE_BUG — missing column in table
**Confidence:** HIGH | **Classification:** FE_BUG

**Evidence:**
- API returns `employee_name` on every row (curl confirmed).
- Transform maps it: `employeeName: t.employee_name ?? ''` (line 123).
- Table headers (lines 667-673): Time, Item, Category, Amount, Payment, Actions — **no "Added By"**.
- Table rows (lines 724-748): renders time, expense, category, amount, paymentMethod — **no employeeName**.

**Fix:** ~8 lines, 1 file. FAST LANE eligible.

---

## Issue 6: "Added By" name in report is wrong/random

**Root cause:** BACKEND_DATA_ISSUE — employee_name resolution inconsistent across endpoints
**Confidence:** HIGH | **Classification:** BACKEND_DATA_ISSUE

**Curl-Probed Evidence (owner@cafe103.com / CAFE 103 / id=644):**

| Endpoint | employee_id | employee_name | Expected |
|----------|-------------|---------------|----------|
| `GET /profile` | 667 | **Pranav Dogra** | ✅ Correct |
| `POST /store-expense-details` | **3063** | **"Owner"** | ❌ Wrong ID, generic name |
| `POST /expenses-export-report` (same entry) | 3063 | **"rowan"** | ❌ Different name for same ID |
| `GET /expenses-report` (older entries) | 3081 | **"Emily/Meychele"** | ❌ Different employee entirely |
| User screenshot | ? | **"Sharon teacher"** | ❌ Yet another name |

**Conclusion:**
- Profile ID=667 but expenses created under employee_id=3063 (mismatch).
- Same employee_id=3063 resolves to "Owner" on create, "rowan" on read.
- FE correctly displays `t.employee_name` as-is — no FE fix possible.
- **Backend must investigate employee_id assignment + name resolution.**

**Backend Brief:**
```
BACKEND_BRIEF — employee_name inconsistency on expense endpoints
Restaurant: CAFE 103 (id=644), Account: owner@cafe103.com
Problem: 3 different names for same user: "Pranav Dogra" (profile), "Owner" (create), "rowan" (report read)
Questions:
  1. Why does profile id=667 but expense creation uses employee_id=3063?
  2. Why does employee_id=3063 → "Owner" on create but "rowan" on report?
  3. Which employee_id→name mapping table is used by each endpoint?
Endpoints: store-expense-details, expenses-report, expenses-export-report
Priority: P1 (data integrity)
```

---

## Summary

| # | Issue | Type | Fix Side | Scope | Status |
|---|-------|------|----------|-------|--------|
| 1 | Notes missing from add form | FE_BUG | FE | ~15 lines, 2 files | Ready for impl |
| 2 | Item name editable in edit | FE_BUG + BACKEND | FE + backend brief | ~5 lines, 1 file | Ready for impl |
| 3 | Excel export empty | FE_BUG | FE | ~25 lines, 1 file | Ready for impl |
| 4 | PDF export error | FE_BUG | FE | ~25 lines, 1 file | Ready for impl (with #3) |
| 5 | "Added By" missing from daily table | FE_BUG | FE | ~8 lines, 1 file | Ready for impl |
| 6 | Wrong employee name in report | BACKEND | Backend | Backend investigation | **BACKEND BRIEF filed** |

**FE-fixable total: ~78 lines across 3 files**
**Backend briefs: 2 (Issue 2 item immutability + Issue 6 employee name)**
