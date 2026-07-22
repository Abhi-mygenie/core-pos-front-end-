# BUG-222 — Bulk Recipe Excel: No Template/Export Split; File Won't Open — IMPACT ANALYSIS (Gate 2)

**ID:** BUG-222
**Title:** Bulk Recipe Excel — No Template/Export Split; File Won't Open
**Priority:** P2 (MEDIUM)
**Risk:** HIGH — UPGRADED from MEDIUM (intake). Rationale: curl verification confirmed an API contract mismatch (multipart field name) and a broken export contract (JSON vs blob). Risk table trigger: "API contract". Upgrade is agent-permitted per R21.
**Date:** 2026-07-23 (session continuation)
**Analyst:** PLANNING agent (Gate 2)
**Code Reality:** PARTIAL — export + import handlers exist (`RecipeBulkEditor.jsx:282-311`, `recipeService.js:26-33`) but BOTH are broken against the verified backend contract. Template button does not exist although the backend endpoint does.
**Conflict Pre-Check:** No ACTIVE conflicts. Prior modifiers of `RecipeBulkEditor.jsx`: CR-073 (new), BUG-206 + BUG-207 (QA PASS 2026-07-19), CR-085 D3 column toggle. `recipeService.js`: CR-072. Registry scan: no open item on same files. Parallel-safe with BUG-221 (different files).

---

## 1. Data Flow Trace

### Sub-issue B — Exported file won't open (CONFIRMED root cause)
```
RecipeBulkEditor.jsx:282 handleExport()
  → recipeService.exportRecipes()          [recipeService.js:26-27]
  → api.get(EXPORT_RECIPE, { responseType: 'blob' })    ← BREAK POINT 1
  → Backend actually returns: HTTP 200 application/json
    {"status":true,"message":"Recipe Exported Successfully","download_url":"https://preprod.mygenie.online/storage/RecipieMaster_*.xlsx"}
  → responseType:'blob' → res.data is a Blob containing JSON TEXT
  → line 286: res.data instanceof Blob → TRUE → JSON text saved as recipes_<date>.xlsx
  → RESULT: corrupt file, Excel cannot open it   ← owner's report, CONFIRMED
```
**Curl-verified 2026-07-23 (preprod):** `GET /api/v2/vendoremployee/recipe/export-recipe` → `content-type: application/json` + `download_url`; the linked file is a VALID xlsx (PK magic verified).
Evidence: `/app/memory/evidence/BUG-221/recipe_export-recipe_response.bin`, `/app/memory/evidence/BUG-222/RecipieMaster_sample_download.xlsx`

### Sub-issue C(new) — Import ALWAYS fails: wrong multipart field name (CONFIRMED)
```
RecipeBulkEditor.jsx:298-311 handleImport()
  → fd.append('file', file)                ← BREAK POINT 2
  → recipeService.importRecipes(fd)  → POST /recipe/import-recipe
  → Backend: HTTP 422 {"message":"The given data was invalid.",
       "errors":{"products_file":["The products file field is required."]}}
```
Backend expects multipart field **`products_file`**, frontend sends `file` → recipe import can never succeed. (Curl-verified with both empty POST and junk-file POST under field `file` — identical 422.)
Note: without `Accept: application/json` the endpoint responds HTTP 302 redirect — the axios instance must send Accept json (verify at Gate 3; empty-POST probe without the header returned 302 HTML).

### Sub-issue A — No Template / Export split
```
Backend template endpoint EXISTS and works:
  GET /api/v2/vendoremployee/recipe/export-sample-recipe
  → HTTP 200 application/json {"status":true,"message":"Sample file generated successfully","download_url":".../RecipeSample_*.xlsx"}
constants.js:205 EXPORT_SAMPLE_RECIPE already defined.
recipeService.js: NO exportSampleRecipes() function.        ← BREAK POINT 3
RecipeBulkEditor.jsx: NO "Download Template" button.
```
Sub-recipe template also live: `GET /recipe/export-sample-sub-recipe` → HTTP 200 JSON (curl-verified). Constants `EXPORT_SAMPLE_SUB / EXPORT_SUB / IMPORT_SUB` exist (lines 213-215). No addon-recipe excel endpoints exist in constants.

### Sub-issue C(intake) — Excel disabled for addon/sub types
`RecipeBulkEditor.jsx:95` → `excelEnabled = recipeType === 'standard'` (by design, CR-073 A6). Sub-recipe backend endpoints exist; addon endpoints do not. Enabling sub-recipe excel = scope expansion → owner decision.

---

## 2. Exact Lines

### recipeService.js:26-33 (current)
```js
export async function exportRecipes() {
  return api.get(RECIPE_ENDPOINTS.EXPORT_RECIPE, { responseType: 'blob' });
}
export async function importRecipes(formData) {
  return api.post(RECIPE_ENDPOINTS.IMPORT_RECIPE, formData, { ... });
}
```
→ Needs: `exportRecipes()` drop blob responseType (return JSON with `download_url`); ADD `exportSampleRecipes()` → GET EXPORT_SAMPLE_RECIPE; `importRecipes` unchanged (field name is caller-side).

### RecipeBulkEditor.jsx:282-295 handleExport (current)
Blob-wrapping logic → replace with dual-response pattern: `download_url` → `window.open`; blob fallback only if response is a real binary.

### RecipeBulkEditor.jsx:301 (current)
```js
const fd = new FormData(); fd.append('file', file);
```
→ Needs: `fd.append('products_file', file)`.

### RecipeBulkEditor.jsx toolbar (~lines 341-361)
→ Needs: add "Template" button (FileDown/FileSpreadsheet icon) calling exportSampleRecipes → open download_url. Import success handler should also surface backend `status:false` bodies if any (import returns 2xx shapes not yet observed for valid files — verify during Gate 3/QA with a real template file).

---

## 3. Files WILL Change / WILL NOT Touch

**WILL change (Gate 3):**
- `api/services/recipeService.js` — fix exportRecipes, add exportSampleRecipes (~6-8 lines)
- `components/inventory/RecipeBulkEditor.jsx` — export handler rewrite, import field name, Template button (~20-25 lines)

**WILL NOT touch:**
- `api/constants.js` (all endpoints already defined)
- `api/transforms/recipeTransform.js`
- DISPATCH save/delete logic, cost/margin logic (BUG-206/207 fixes)
- `excelEnabled` gating at line 95 — UNCHANGED unless owner approves sub-recipe enablement (Q1)

---

## 4. Risk Classification

**HIGH** (upgraded — see header). Not financial, no R5 hotspot files. Regression checklist at QA: standard-tab export/import round-trip, addon/sub tabs still show disabled Excel buttons, batch save (BUG-206) and cost/margin (BUG-207) untouched.

---

## 5. Owner Decision Queue

- **Q1:** Enable Excel (template/export/import) for **Sub-recipes**? Backend endpoints exist (`export-sample-sub-recipe`, `export-sub-recipes`, `import-sub-recipes`). Addon recipes have NO backend excel endpoints → stay disabled either way. (Recommend: fix standard first in this bug; register sub-recipe enablement as a separate CR if wanted.)
- **Q2:** Import of a real filled template has not been executed against preprod (would mutate live recipe data). Approve QA to run one live import on preprod with a 1-row test recipe, or should import be verified only with validation-error paths?

---

## 6. Effort Estimate

- Files: 2 · Lines: ~28-33 · Test: curl (export + template JSON paths, 422 field-name proof) + browser (template download opens in Excel, export opens in Excel, import 1-row file per Q2)
- Subsumption note: none (distinct from BUG-221; parallel-safe)
