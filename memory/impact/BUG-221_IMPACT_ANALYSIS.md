# BUG-221 — Bulk Ingredient Upload & Excel Download Not Working — IMPACT ANALYSIS (Gate 2)

**ID:** BUG-221
**Title:** Bulk Ingredient Upload & Excel Download Not Working
**Priority:** P1 (HIGH)
**Risk:** HIGH — API contract mismatch + file upload flow (Risk table: "API contract" trigger)
**Date:** 2026-07-23 (session continuation)
**Analyst:** PLANNING agent (Gate 2)
**Code Reality:** PARTIAL — export path exists but broken (contract mismatch); import path DOES NOT EXIST in the bulk editor UI (intake's claim of an Upload icon is wrong — code is truth, R1)
**Conflict Pre-Check:** No ACTIVE conflicts. Prior modifiers all QA PASS: `IngredientBulkEditor.jsx` (CR-086 F4 + BUG-213, 2026-07-21), `inventoryService.js` (BUG-212, 2026-07-21). BUG-218 (Batch 3, Gate 2 approved) touches `InventorySetupPanel.jsx` delete flow — different function than the export handler analyzed here; parallel-safe. Registry scan: no open item on same files.

---

## 1. Data Flow Trace

### Flow A — "Excel" button INSIDE the Bulk Editor (works, but is client-side only)
```
IngredientBulkEditor.jsx:260 "Excel" Button (data-testid="bulk-excel")
  → handleExcel() lines 200-215
  → CLIENT-SIDE: XLSX.utils.json_to_sheet(filtered rows) → XLSX.writeFile()
  → No API call at all. Exports only currently loaded/filtered rows.
```
This produces a valid xlsx. NOT broken per se, but it is a snapshot of UI state, not the server master export, and respects the active search filter (potential owner confusion: filtered export).

### Flow B — Server export (main Ingredients tab, BUG-212 C "fix") — BROKEN
```
InventorySetupPanel.jsx:143 handleExport()
  → inventoryService.exportIngredients()            [inventoryService.js:28-29]
  → api.get(EXPORT_INVENTORY, { responseType: 'blob' })   ← BREAK POINT 1
  → Backend actually returns: HTTP 200 application/json
    {"status":true,"message":"Stock report exported successfully!","download_url":"https://preprod.mygenie.online/storage/stock_report_*.xlsx"}
  → Because responseType:'blob', axios wraps the JSON TEXT in a Blob
  → InventorySetupPanel.jsx:147 res.data.download_url → undefined (res.data is a Blob)
  → Falls to blob branch line 150-153 → saves JSON text as "ingredients.xlsx"
  → RESULT: corrupt file that Excel cannot open  ← owner's "Excel not working"
```
**Curl-verified 2026-07-23 (preprod):** `GET /api/v2/vendoremployee/inventory/export-inventory-master` → `content-type: application/json` with `download_url`; the `download_url` file itself is a VALID xlsx (PK zip magic verified).
Evidence: `/app/memory/evidence/BUG-221/inventory_export-inventory-master_response.bin`

### Flow C — Bulk Upload (import) — DOES NOT EXIST in UI
```
IngredientBulkEditor.jsx: NO Upload button, NO import handler, `Upload` icon not imported (line 5)
inventoryService.importIngredients(formData)  [inventoryService.js:32-37]  ← defined but referenced NOWHERE (grep-verified)
constants.js:154 IMPORT_INVENTORY = '/api/v2/vendoremployee/inventory/import-inventory' ← endpoint exists
```
**BREAK POINT 2:** entire import UI/wiring is missing.

**Curl-verified import endpoint behavior (preprod 2026-07-23):**
| Probe | Response |
|---|---|
| POST empty | HTTP **201** `{"status":false,"errors":"Please upload an Excel file."}` — ⚠ 2xx with `status:false` (axios treats as success; frontend MUST check `status` field) |
| POST multipart field `file` = junk .txt | HTTP 200 `{"status":true,"message":"Inventory imported successfully!"}` — ⚠ backend accepts non-Excel junk with success; no row-level report. Verified no data change (ingredient count 106 before/after). |

Field name confirmed: `file`.

---

## 2. Exact Lines

### inventoryService.js:28-29 (current)
```js
export async function exportIngredients() {
  return api.get(INVENTORY_ENDPOINTS.EXPORT_INVENTORY, { responseType: 'blob' });
}
```
→ Needs: remove `responseType: 'blob'`; return parsed JSON so `download_url` is reachable.

### InventorySetupPanel.jsx:143-163 (current — BUG-212 C handler)
Dual-response pattern is written correctly BUT is unreachable because of the blob responseType. Once service returns JSON, line 147 `res?.data?.download_url` resolves and `window.open(download_url)` works. Minimal or zero change needed here (verify only).

### IngredientBulkEditor.jsx (current)
- Line 5: no `Upload` icon import.
- Lines 200-215 `handleExcel`: client-side export only.
- NO import handler / hidden file input anywhere.
→ Needs (Gate 3): add Import button + hidden `<input type="file" accept=".xlsx,.xls">` + handler calling `inventoryService.importIngredients(fd)` with field `file`, checking `res.data.status === false` → error toast with `res.data.errors`; on success → `onRefresh()`.

---

## 3. Files WILL Change / WILL NOT Touch

**WILL change (Gate 3):**
- `api/services/inventoryService.js` — `exportIngredients()` drop blob responseType (~1-2 lines)
- `components/inventory/IngredientBulkEditor.jsx` — add Import button + handler (~25-30 lines); optionally add server-export option (owner decision Q2)

**WILL NOT touch:**
- `api/constants.js` (endpoints already exist)
- `components/inventory/InventorySetupPanel.jsx` (handler already correct once service fixed — verify only; avoids overlap with BUG-218)
- Transforms, stock import/export (`exportStock`/`importStock` already use correct dual pattern — see inventoryService.js:75-88)

---

## 4. Risk Classification

**HIGH** — API contract handling + new file-upload flow. Not financial. No hotspot (R5) files.
Regression checklist required at QA: main-tab export, bulk-editor save flow (unchanged), stock import/export (share endpoint family, must remain untouched).

---

## 5. Owner Decision Queue

- **Q1:** Backend accepts a junk (non-Excel) file with `status:true` and gives NO row-level result. After import, frontend can only refresh the list — it cannot show "N rows imported / N failed". Accept this UX, or should I file a BACKEND_BRIEF asking for row-level import results + strict file validation? (Recommend: file backend brief; frontend proceeds with refresh-only UX now.)
- **Q2:** Bulk editor's "Excel" button today exports only visible/filtered rows client-side. Keep it, replace it with the server master export (`download_url`), or offer both (e.g., "Excel (view)" + "Excel (master)")?

---

## 6. Effort Estimate

- Files: 2 · Lines: ~30-35 · Test: curl (export JSON path) + browser (import round-trip: download master xlsx → edit → upload → verify list refresh + 2xx `status:false` error path)
- Backend brief candidate: lax import validation (Q1)
