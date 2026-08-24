# BUG-221 — Ingredient Bulk Export/Import/Template — IMPLEMENTATION PLAN (Gate 3)

**Date:** 2026-07-23 (Session E) | **Impact:** `/app/memory/impact/BUG-221_IMPACT_ANALYSIS.md` (approved; Q1 brief filed, Q2 = server export + Template button) | **Risk:** HIGH (API contract + upload flow)
**Entry verification:** PASS 2026-07-23 — `exportIngredients` blob (:28-30), `importIngredients` defined-unused (:32-37), IngredientBulkEditor has NO import UI, `handleExcel` client-side (:199-215), InventorySetupPanel `handleExport` dual pattern already correct (:143-163, verify-only).

## Dependencies / Wave
WAVE 3 (with BUG-222 — same export-contract pattern; 221 first, 222 reuses approach). No file overlap with Waves 1-2 items except verify-only InventorySetupPanel.

## Scope Lock
WILL change: `api/services/inventoryService.js` (~4 lines), `components/inventory/IngredientBulkEditor.jsx` (~30 lines), `api/constants.js` (+1 line template constant). WILL NOT touch: InventorySetupPanel (verify-only), stock import/export (correct dual pattern already), transforms.

## Edits (exact)
1. **inventoryService.js:28-30** — mirror `exportStock` dual pattern:
```js
export async function exportIngredients() {
  // BUG-221: backend returns JSON { download_url } — blob responseType corrupted the file
  try {
    return await api.get(INVENTORY_ENDPOINTS.EXPORT_INVENTORY);
  } catch (err) {
    if (err?.response?.status === 406 || err?.response?.status === 415) {
      return api.get(INVENTORY_ENDPOINTS.EXPORT_INVENTORY, { responseType: 'blob' });
    }
    throw err;
  }
}
```
2. **constants.js** (INVENTORY_ENDPOINTS): `INGREDIENT_IMPORT_SAMPLE: '/bulk_upload_sample/Ingredients/Ingredients_Bulk_Import_Sample.xlsx', // BUG-221: static template (relative to API base origin)` — implementer: resolve against `process.env.REACT_APP_API_BASE_URL` origin, NOT hardcoded.
3. **IngredientBulkEditor.jsx** — per owner Q2:
   a. REPLACE client-side `handleExcel` with server master export: call `inventoryService.exportIngredients()` → `res?.data?.download_url` → `window.open(url,'_blank','noopener,noreferrer')`; blob fallback branch like InventorySetupPanel:150-153; error → `toast.error(readableMessage)`.
   b. ADD "Template" button (FileDown icon) next to Excel: opens `INGREDIENT_IMPORT_SAMPLE` resolved URL. `data-testid="bulk-template"`.
   c. ADD Import button + hidden `<input type="file" accept=".xlsx,.xls">` + `handleImport`: `fd.append('file', file)` → `importIngredients(fd)` → **MUST check `res?.data?.status === false`** (2xx-trap!) → `toast.error(res.data.errors || 'Import failed')`; on true → `toast.success` + refresh list (component's fetch); `finally e.target.value=''`. `data-testid="bulk-import"`. Icons: add `Upload, FileDown` to lucide import (:5).

3 files, ~35 lines.

## Verification Matrix
| # | Verify | How | Auto? |
|---|---|---|---|
| 1 | Export opens VALID xlsx (server master) | Browser: click Excel → new tab downloads; open file (PK magic via curl) | NO |
| 2 | Template button downloads sample xlsx | Browser + curl HEAD 200 | NO |
| 3 | Import empty/junk file → error toast (2xx status:false trap handled) | Browser with junk .txt renamed .xlsx | NO |
| 4 | Import valid template row → success + list refresh (verify no dup side-effects; template lacks smallUnit/CF cols — expected) | Browser, ZZ_TEST row then delete | NO |
| 5 | Regression: main-tab export (InventorySetupPanel) now works via same service | Browser | NO |
| 6 | Regression: stock export/import untouched | curl spot-check | NO |

## Risk Register
2xx-with-status:false trap is the sharp edge — test #3 mandatory. Backend accepts junk silently (brief #bug-221 filed) — FE cannot fully guard; toast copy should say "check file matches template".

## Registry Checklist
- [ ] registry.json BUG-221 → IMPLEMENTED, pos_5_0  - [ ] BUG_TRACKER row  - [ ] FILE_OWNERSHIP (3 files)  - [ ] `// BUG-221` markers  - [ ] webpack clean

*Gate 3 complete. Awaiting Gate 4 GO.*
