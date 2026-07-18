# Investigation Report — 4 Expense Module Issues

**Date:** 2026-07-11
**Agent:** INVESTIGATION (AGENT_PROMPT_ALPHA v0.7)
**Steps used:** 8/10
**Credentials:** owner@cafe103.com (masked)

---

## Issue 1: Notes field — shows in reports but cannot be added

### Summary
- **Root cause:** FE_BUG — `notes` field missing from Add Expense form + `toAPI.addExpenseEntry` payload
- **Confidence:** HIGH (curl-confirmed: backend accepts and stores `notes`)
- **Classification:** FE_BUG

### Evidence
- **Backend accepts notes:** `POST /store-expense-details` with `"notes": "test note"` → stored and returned in response.
- **Backend returns notes:** `GET /expenses-report` includes `"notes": ""` or `"notes": "test note"` on every row.
- **Report page shows notes:** `ExpenseReportPage.jsx` line 393 has a "Notes" column, line 411 renders `t.notes`.
- **Entry form missing notes:** `EMPTY_LINE` object (line 32-37 of `ExpenseEntryPanel.jsx`) has NO `notes` field.
- **Save payload missing notes:** `handleSave` (line 476-483) maps `expense, amount, payment_method, quantity, unit, physical_quantity` — no `notes`.
- **Transform missing notes:** `toAPI.addExpenseEntry` (expenseTransform.js line 221-232) has no `notes` in the `details` array.

### Fix Required (FE — 3 files, ~15 lines)
1. **`ExpenseEntryPanel.jsx`:** Add `notes: ""` to `EMPTY_LINE`. Add notes textarea/input to `EntryLine` component. Pass `notes` in `handleSave` details. Add `notes` to `startEdit` editRow. Add notes input to edit mode row. Pass `notes` in `saveEdit`.
2. **`expenseTransform.js`:** Add `notes: l.notes ?? ''` to `toAPI.addExpenseEntry` details mapping. Add `notes: data.notes ?? ''` to `toAPI.editExpenseEntry`.
3. **Planning skip eligible?** YES — ~15 lines across 2 files, no hotspot, no financial logic. Owner approval needed for FAST LANE.

---

## Issue 2: Item name editable during transaction edit — should be read-only

### Summary
- **Root cause:** FE_BUG — edit mode renders `ItemCombobox` allowing item name change
- **Confidence:** HIGH (code confirmed + screenshot provided)
- **Classification:** FE_BUG + BACKEND_FLAG

### Evidence
- **Screenshot provided:** Edit row shows item dropdown (`ItemCombobox`) with "aaa" selectable.
- **Code:** `ExpenseEntryPanel.jsx` lines 688-695 — edit mode renders `<ItemCombobox>` for the item field.
- **Owner directive:** Item name should NOT be editable in edit flow.
- **Backend flag:** `PUT /edit-expense/{id}` accepts `exp_name` — backend should also reject item name changes, or at minimum the FE should not send it.

### Fix Required (FE — 1 file, ~5 lines)
1. **`ExpenseEntryPanel.jsx` lines 688-695:** Replace `ItemCombobox` in edit mode with static text: `<td className="px-4 py-2.5 font-medium" style={{ color: COLORS.darkText }}>{editRow.expense}</td>`.
2. **Backend brief:** Flag to backend that `PUT /edit-expense/{id}` should reject `exp_name` changes or ignore the field.
3. **Planning skip eligible?** YES — 1 file, ~5 lines, no hotspot, no financial logic. Owner approval needed.

### Backend Brief (Handoff)
```
BACKEND_BRIEF — PUT /edit-expense/{id} item name immutability
Issue: Frontend currently allows changing exp_name on edit.
Owner directive: Item name should NOT be editable after creation.
Request: Either (a) ignore exp_name in PUT payload, or (b) return 422 if exp_name differs from stored value.
Endpoint: PUT /api/v2/vendoremployee/expense/edit-expense/{id}
Priority: P2
```

---

## Issue 3: Expense Report — Excel export has no data

### Summary
- **Root cause:** FE_BUG — `exportReportAsExcel` called with wrong argument shape
- **Confidence:** HIGH (code trace confirmed)
- **Classification:** FE_BUG (argument mismatch)

### Evidence

**The function signature** (`reportExporter.js`):
```javascript
export function exportReportAsExcel(params, filename) {
  // params = { title, subtitle, restaurant, dateRange, generatedBy, kpis, sheets }
```

**How it's called** (`ExpenseReportPage.jsx` lines 200-213):
```javascript
// Primary path:
exportReportAsExcel(res.data, `Expense_Report_...`);
// res.data = raw API response (array of transactions) — NOT { title, sheets }

// Fallback path:
exportReportAsExcel(rows, `Expense_Report_...`);
// rows = flat array of objects — NOT { title, sheets }
```

**Result:** `buildExcelXML(params)` receives either raw API data or a flat array. Since `params.sheets` is undefined, the Excel contains only the Summary sheet with metadata — no data sheets. This explains "no data in Excel."

### Fix Required (FE — 1 file, ~25 lines)
1. **`ExpenseReportPage.jsx` `handleDownloadAction`:** Build a proper `params` object for `exportReportAsExcel`:
```javascript
exportReportAsExcel({
  title: 'Expense Report',
  restaurant: { name: restaurant?.name, id: restaurant?.id },
  dateRange: { from: appliedFrom, to: appliedTo },
  kpis: [...],
  sheets: [{
    name: 'Transactions',
    columns: [
      { key: 'date', label: 'Date', format: 'text' },
      { key: 'expense', label: 'Item', format: 'text' },
      { key: 'category', label: 'Category', format: 'text' },
      { key: 'amount', label: 'Amount', format: 'inr', align: 'right' },
      { key: 'paymentMethod', label: 'Payment', format: 'text' },
      { key: 'employeeName', label: 'Added By', format: 'text' },
      { key: 'notes', label: 'Notes', format: 'text' },
    ],
    rows: aggregated.transactions,
    totals: { label: 'TOTAL', amount: totalAmount },
  }],
});
```
2. **Planning skip eligible?** NO — 25+ lines, touches report export logic. Recommend normal Planning → Implementation.

---

## Issue 4: Error while exporting PDF for expenses

### Summary
- **Root cause:** FE_BUG — `exportReportAsPDF` called with wrong arguments (1 string instead of 2 params)
- **Confidence:** HIGH (code trace confirmed)
- **Classification:** FE_BUG (argument mismatch)

### Evidence

**The function signature** (`reportExporter.js`):
```javascript
export function exportReportAsPDF(win, params) {
  // win = pre-opened Window object from openReportWindow()
  // params = { title, subtitle, restaurant, dateRange, generatedBy, kpis, sheets }
```

**How it's called** (`ExpenseReportPage.jsx` line 216):
```javascript
exportReportAsPDF(`Expense Report (${appliedFrom} to ${appliedTo})`);
```

**Result:** `win` = a string (truthy but no `.closed` property → `undefined` → falsy → throws Error: "Report window was closed before generation completed"). Even if it didn't throw, `params` would be `undefined` — no data to render.

### Fix Required (FE — 1 file, ~25 lines)
1. **`ExpenseReportPage.jsx` `handleDownloadAction`:** Use `openReportWindow()` first, then build params:
```javascript
const win = openReportWindow();
exportReportAsPDF(win, {
  title: 'Expense Report',
  restaurant: { name: restaurant?.name, id: restaurant?.id },
  dateRange: { from: appliedFrom, to: appliedTo },
  kpis: [...],
  sheets: [{ /* same as Excel */ }],
});
```
2. **Also import `openReportWindow`** from `reportExporter.js`.
3. **Planning skip eligible?** NO — same scope as Issue 3, recommended to fix together.

---

## Summary Table

| # | Issue | Classification | Confidence | Root Cause | Fix Scope | Skip? |
|---|-------|---------------|------------|------------|-----------|-------|
| 1 | Notes not available in add form | FE_BUG | HIGH | `notes` field missing from form + payload | ~15 lines, 2 files | FAST LANE eligible |
| 2 | Item name editable in edit mode | FE_BUG + BACKEND_FLAG | HIGH | `ItemCombobox` in edit mode | ~5 lines, 1 file + backend brief | FAST LANE eligible |
| 3 | Excel export empty | FE_BUG | HIGH | Wrong argument shape to `exportReportAsExcel` | ~25 lines, 1 file | Normal flow |
| 4 | PDF export error | FE_BUG | HIGH | Wrong arguments to `exportReportAsPDF` | ~25 lines, 1 file | Normal flow (fix with #3) |

### Recommendations
- **Issues 1 & 2:** FAST LANE eligible (owner approval needed). Can be fixed in ~20 lines total.
- **Issues 3 & 4:** Fix together as one batch — both are the same root cause pattern (expense report page not using `reportExporter` API correctly). Recommend registering as a single bug and going through Planning → Implementation.
- **Backend brief for Issue 2:** Provide to backend team.

---

## Data Flow Trace (Issues 3+4)
```
User clicks "Download Excel/PDF" → handleDownloadAction(type)
  → Excel: exportReportAsExcel(res.data OR rows, filename)
    ↓ BREAK: res.data = raw API array, not { title, sheets } object
    → buildExcelXML(params) → params.sheets = undefined → empty workbook

  → PDF: exportReportAsPDF(stringTitle)
    ↓ BREAK: win = string (not Window), params = undefined
    → throws "Report window was closed" error
```

## Evidence Artifacts
All curl outputs inline in this report. No persistent files needed (standard API shapes, no unusual data).
