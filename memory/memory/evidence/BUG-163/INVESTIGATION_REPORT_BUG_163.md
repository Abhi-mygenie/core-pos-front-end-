# Investigation Report — BUG-163: Expense Setup Export Fails — Missing `type` Field in POST Body

**Date:** 2026-07-07
**Investigator:** INVESTIGATION AGENT (AGENT_PROMPT_ALPHA v0.7)
**Classification:** `FE_BUG`
**Severity:** P1 — Export button completely non-functional
**Reported by:** Owner — screenshot showing "The type field is required." error toast on Export click
**Parent CR:** CR-059 (Expense Setup Module — delivered, QA PASS)
**Fast Lane:** YES — 1 file, 1 line, non-financial, non-hotspot

---

## 1. Symptom

Clicking **Export** on the Expense Setup page shows error toast:
> **"The type field is required."**

No file is downloaded. The export feature is 100% broken.

---

## 2. Is This a Future CR or Existing Feature?

**This is part of CR-059 — already delivered and marked QA PASS.**
It is NOT a future CR. The Export button exists and was shipped but the implementation is missing one required field. It was either not tested in QA or the backend requirement was not carried through to the service function.

---

## 3. Code Trace

### Call chain
```
ExpenseSetupPanel.jsx L233
  handleExport()
    → expenseService.exportStockMaster()
        → api.post(EXPENSE_ENDPOINTS.BULK_EXPORT)        ← no body sent
        → POST /api/v2/vendoremployee/expense/bulk-export-expense
        → Backend Laravel validation: "The type field is required." ❌
```

### Root Cause — `expenseService.js` L65

```js
// CURRENT — sends empty POST body:
export const exportStockMaster = () =>
  api.post(EXPENSE_ENDPOINTS.BULK_EXPORT);        // ❌ no body

// CORRECT — must send type field:
export const exportStockMaster = () =>
  api.post(EXPENSE_ENDPOINTS.BULK_EXPORT, { type: 'all' });   // ✅
```

---

## 4. Evidence — Correct Request/Response (from bulk_export.json, CR-059 discovery phase)

This was already tested successfully during the API discovery phase of CR-059:

```
Request:  POST /expense/bulk-export-expense
Body:     { "type": "all" }

Response: {
  "message": "Expenses exported successfully (308 items)",
  "download_url": "https://preprod.mygenie.online/storage/Expenses_2026-07-06_21-57-13.xlsx"
}
```

The `type: "all"` value was discovered during CR-059 and documented in `evidence/CR-059/bulk_export.json`. It was not carried through to the service function implementation.

---

## 5. Same Pattern Confirmed in Menu Management (CR-014)

The menu bulk export (`POST /product/bulk-export`) uses the identical backend pattern:
```js
// CR-014 Phase 2B implementation:
export const bulkExport = (type = 'all') =>
  api.post(`${BASE_V2}/bulk-export`, { type });
```
Both endpoints share the same Laravel controller pattern requiring a `type` field.

---

## 6. Secondary Note — Download URL Handling

The backend returns `{ message, download_url }`. The `handleExport` handler in `ExpenseSetupPanel.jsx` reads `fromAPI.exportResponse(res)` which maps to `{ message, downloadUrl }`. The implementation agent should verify that the `if` branch in `handleExport` (L235) correctly opens `data.downloadUrl` in a new tab or triggers a browser download. This is a separate concern from the `type` bug — but worth verifying after the fix.

---

## 7. Fix

**File:** `api/services/expenseService.js`
**Line:** 65
**Change:** Add `{ type: 'all' }` as the POST body

```js
// BEFORE:
export const exportStockMaster = () =>
  api.post(EXPENSE_ENDPOINTS.BULK_EXPORT);

// AFTER:
export const exportStockMaster = () =>
  api.post(EXPENSE_ENDPOINTS.BULK_EXPORT, { type: 'all' });
```

**Total: 1 file, 1 line change.**

---

## 8. Confidence Level

**CONFIRMED (100%)** — The `bulk_export.json` evidence file from CR-059 discovery phase proves `{ type: "all" }` is the correct payload. The service function was implemented without it. The backend error message directly confirms the missing field.

---

## 9. Fast Lane Checklist

| Criteria | Pass? |
|---|---|
| 1 file only | ✅ `expenseService.js` |
| ≤ 10 lines changed | ✅ 1 line |
| Not financial / billing / settlement logic | ✅ Export only |
| Not a hotspot file | ✅ `expenseService.js` is not in R5 hotspot list |
| No API contract change | ✅ Uses existing endpoint, just adds missing body |
| No provider / context / socket change | ✅ |
| No open conflict in FILE_OWNERSHIP.md | ✅ |

**FAST LANE APPROVED**

---

*Investigation closed. Ready for BUG FIX agent — Fast Lane.*
