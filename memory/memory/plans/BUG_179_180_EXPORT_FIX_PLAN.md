# BUG-179 + BUG-180 — Impact Analysis + Implementation Plan (Gates 2-3)

**IDs:** BUG-179, BUG-180
**Title:** Expense Report Excel/PDF Export Fixes
**Date:** 2026-07-11
**Agent:** PLANNING (AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 2 (Impact Analysis) + Gate 3 (Implementation Plan)
**Code Reality:** PARTIAL — export functions exist but called with wrong arguments
**Conflict Pre-Check:** NONE — no other active item touches `ExpenseReportPage.jsx`

---

## 1. Root Cause (from Investigation)

Both bugs share the same root cause: `ExpenseReportPage.jsx` calls `reportExporter` functions with argument shapes that don't match the function signatures.

| Bug | Current (broken) | Expected |
|-----|-----------------|----------|
| BUG-179 (Excel) | `exportReportAsExcel(res.data, filename)` — raw API array | `exportReportAsExcel({ title, restaurant, dateRange, sheets })` |
| BUG-180 (PDF) | `exportReportAsPDF(stringTitle)` — 1 string arg | `const win = openReportWindow(); exportReportAsPDF(win, { title, restaurant, dateRange, sheets })` |

**Correct pattern** (used by 10+ other report pages): `DailySalesMockup.jsx`, `OrderNotesMockup.jsx`, etc. all use:
```javascript
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
// ...
let pw = null;
if (action === 'pdf') pw = openReportWindow();
const payload = buildExportPayload();
if (action === 'excel') exportReportAsExcel(payload);
else if (action === 'pdf') exportReportAsPDF(pw, payload);
```

---

## 2. Affected Files

### Files WILL change

| # | File | Change type | Lines |
|---|------|-------------|-------|
| 1 | `pages/reports-module/ExpenseReportPage.jsx` | MODIFY — fix import + rewrite `handleDownloadAction` + add `buildExportPayload` | ~40 lines changed |

### Files will NOT touch
- `utils/reportExporter.js` — function signatures are correct, no change needed
- `api/services/expenseService.js` — `exportExpenseReport` not used (server export endpoint unreliable, use client-side data)
- `api/services/expenseReportService.js` — aggregation unchanged
- Any R5 hotspot files

---

## 3. Implementation Plan — 3 Edits

### EDIT 1 — Fix import: add `openReportWindow`

**Location:** Line 16
**Current:**
```javascript
import { exportReportAsExcel, exportReportAsPDF } from '../../utils/reportExporter';
```

**New:**
```javascript
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
```

---

### EDIT 2 — Add `buildExportPayload` function

**Location:** Insert before `handleDownloadAction` (before line 197)
**Type:** INSERT

**New code:**
```javascript
  // BUG-179 + BUG-180: Build export payload matching reportExporter API
  const buildExportPayload = useCallback(() => {
    if (!aggregated) return null;
    return {
      title: 'Expense Report',
      restaurant: { name: restaurant?.name, id: restaurant?.id },
      dateRange: { from: appliedFrom, to: appliedTo },
      kpis: [
        { label: 'Total Spend', value: totalAmount, format: 'inr', tone: 'primary' },
        { label: 'Transactions', value: totalCount, format: 'text' },
        { label: 'Active Days', value: aggregated.activeDays, format: 'text' },
        { label: 'Avg Daily', value: aggregated.avgDaily, format: 'inr' },
        { label: 'Top Category', value: aggregated.topCategory?.name ?? '—', format: 'text' },
      ],
      sheets: [{
        name: 'Transactions',
        columns: [
          { key: 'date',          label: 'Date',      format: 'text',  width: 100 },
          { key: 'expense',       label: 'Item',      format: 'text',  width: 180 },
          { key: 'category',      label: 'Category',  format: 'text',  width: 120 },
          { key: 'amount',        label: 'Amount',    format: 'inr',   width: 110, align: 'right' },
          { key: 'paymentMethod', label: 'Payment',   format: 'text',  width: 120 },
          { key: 'employeeName',  label: 'Added By',  format: 'text',  width: 140 },
          { key: 'notes',         label: 'Notes',     format: 'text',  width: 200 },
        ],
        rows: aggregated.transactions,
        totals: { label: 'TOTAL', amount: totalAmount },
      }],
    };
  }, [aggregated, restaurant, appliedFrom, appliedTo, totalAmount, totalCount]);
```

---

### EDIT 3 — Rewrite `handleDownloadAction`

**Location:** Lines 197-218 (full function)
**Current:**
```javascript
  const handleDownloadAction = async (type) => {
    setShowDownloadMenu(false);
    if (!aggregated) return;
    if (type === 'excel') {
      try {
        const res = await expenseService.exportExpenseReport(
          formatDateISO(appliedFrom), formatDateISO(appliedTo)
        );
        exportReportAsExcel(res.data, `Expense_Report_${appliedFrom}_${appliedTo}`);
      } catch {
        const rows = aggregated.transactions.map(t => ({
          Date: t.date, Item: t.expense, Category: t.category,
          Amount: t.amount, Payment: t.paymentMethod,
          'Added By': t.employeeName || '', Notes: t.notes || '',
        }));
        exportReportAsExcel(rows, `Expense_Report_${appliedFrom}_${appliedTo}`);
      }
    } else if (type === 'pdf') {
      exportReportAsPDF(`Expense Report (${appliedFrom} to ${appliedTo})`);
    }
  };
```

**New:**
```javascript
  // BUG-179 + BUG-180: Follows same pattern as DailySalesMockup, OrderNotesMockup, etc.
  const handleDownloadAction = (type) => {
    let pdfWin = null;
    if (type === 'pdf') pdfWin = openReportWindow(); // Must be in sync click stack
    setShowDownloadMenu(false);
    if (!aggregated) { if (pdfWin && !pdfWin.closed) pdfWin.close(); return; }
    try {
      const payload = buildExportPayload();
      if (!payload) { if (pdfWin && !pdfWin.closed) pdfWin.close(); return; }
      if (type === 'excel') exportReportAsExcel(payload);
      else if (type === 'pdf') exportReportAsPDF(pdfWin, payload);
    } catch (e) {
      console.error('[ExpenseReport] Export failed:', e);
      if (pdfWin && !pdfWin.closed) pdfWin.close();
    }
  };
```

**Key changes:**
- `async` removed — no longer calls `expenseService.exportExpenseReport` (server export unreliable, client-side data used instead)
- PDF: `openReportWindow()` called **synchronously in click handler** (popup blocker safe), then passed as first arg
- Excel: `buildExportPayload()` returns `{ title, sheets }` — correct shape
- Error handling: closes pre-opened PDF window on failure
- Matches exact pattern used by 10+ other report pages

---

## 4. Risk Register

| Risk | Level | Mitigation |
|------|-------|------------|
| Server export endpoint (`exportExpenseReport`) no longer called | LOW | Endpoint was already failing (triggering catch block). Client-side export from `aggregated.transactions` has identical data. |
| PDF popup blocker | LOW | `openReportWindow()` called synchronously in click handler — same pattern as all other reports. |
| No R5/R6 files touched | NONE | — |

---

## 5. Verification Matrix

| Edit # | File | Change | How to Verify |
|--------|------|--------|---------------|
| 1 | `ExpenseReportPage.jsx` | `openReportWindow` import | Compile: no missing import |
| 2 | `ExpenseReportPage.jsx` | `buildExportPayload` | Browser: console.log payload shape before export |
| 3a | `ExpenseReportPage.jsx` | Excel export | Browser: click Download → Excel → file downloads with transaction data (7 columns) |
| 3b | `ExpenseReportPage.jsx` | PDF export | Browser: click Download → PDF → new window opens with formatted report + print dialog |
| 3c | `ExpenseReportPage.jsx` | Error handling | Browser: if aggregated is null, no crash — PDF window closed cleanly |

---

## 6. Post-Code Registry Checklist

- [ ] `registry.json`: BUG-179, BUG-180 → status: IMPLEMENTED
- [ ] `BUG_TRACKER.md`: rows updated
- [ ] `FILE_OWNERSHIP.md`: `ExpenseReportPage.jsx` listed with BUG-179/180 + date
- [ ] Code markers: `// BUG-179` and `// BUG-180` in modified file
- [ ] Compile: webpack 0 new warnings

---

## Summary

```
Planning complete: BUG-179, BUG-180
Stage: Impact Analysis + Implementation Plan (Gates 2-3)
Code reality: PARTIAL (export called but with wrong args)
Risk: LOW (follows established pattern from 10+ other report pages)
Files WILL change: ExpenseReportPage.jsx (~40 lines: 1 import fix + 1 new function + 1 rewrite)
Files WILL NOT touch: reportExporter.js, expenseService.js, expenseReportService.js, all R5 hotspots
Owner decisions: NONE needed
Verification matrix: 5 checks (1 compile, 4 browser)
Docs: /app/memory/plans/BUG_179_180_EXPORT_FIX_PLAN.md
Next: Gate 4 GO → Implementation
```
