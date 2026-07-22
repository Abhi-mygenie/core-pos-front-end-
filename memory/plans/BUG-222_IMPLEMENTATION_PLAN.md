# BUG-222 — Recipe Bulk Export/Import/Template Fix — IMPLEMENTATION PLAN (Gate 3)

**Date:** 2026-07-23 (Session E) | **Impact:** `/app/memory/impact/BUG-222_IMPACT_ANALYSIS.md` (approved; Q1 = same-excel sub-recipes, Q2 = one live import allowed) | **Risk:** HIGH (API contract)
**Entry verification:** PASS 2026-07-23 with ONE correction to impact doc: RecipeBulkEditor **already has** Import button + `handleImport` (:298-311) and hidden input (toolbar :361) — only the multipart field name is wrong. Template button confirmed absent. `exportRecipes` blob confirmed (:26-28).

## Dependencies / Wave
WAVE 3 — after BUG-221 (reuse export pattern) and after BUG-216 (its 1-line edit at :185 in this same file lands first).

## Scope Lock
WILL change: `api/services/recipeService.js` (~8 lines), `components/inventory/RecipeBulkEditor.jsx` (~20 lines). WILL NOT touch: constants (endpoints exist), recipeTransform, `excelEnabled` gating (:95, per Q1), batch save/cost logic (BUG-206/207).

## Edits (exact)
1. **recipeService.js:26-28** — dual-pattern export (mirror exportStock):
```js
export async function exportRecipes() {
  // BUG-222: backend returns JSON { download_url }
  try {
    return await api.get(RECIPE_ENDPOINTS.EXPORT_RECIPE);
  } catch (err) {
    if (err?.response?.status === 406 || err?.response?.status === 415) {
      return api.get(RECIPE_ENDPOINTS.EXPORT_RECIPE, { responseType: 'blob' });
    }
    throw err;
  }
}
export async function exportSampleRecipes() { // BUG-222: template
  return api.get(RECIPE_ENDPOINTS.EXPORT_SAMPLE_RECIPE);
}
```
2. **RecipeBulkEditor.jsx `handleExport` (:282-295)** — replace blob-wrapping with: `const url = res?.data?.download_url; if (url) { window.open(url,'_blank','noopener,noreferrer'); return; }` then existing blob fallback ONLY for real binary; error toast unchanged. `// BUG-222`.
3. **RecipeBulkEditor.jsx:301** — `fd.append('file', file);` → `fd.append('products_file', file); // BUG-222: backend field name (422-proven)`. Import success handler: also check `res?.data?.status === false` → error toast (defensive, shape unobserved for valid files).
4. **Toolbar** — add "Template" button before Excel (FileDown icon, `data-testid="bulk-template"`, disabled when `!excelEnabled`): `exportSampleRecipes()` → open `download_url`.

2 files, ~28 lines.

## Verification Matrix
| # | Verify | How | Auto? |
|---|---|---|---|
| 1 | Export opens valid xlsx | Browser + file opens in Excel/PK magic | NO |
| **2 Q1-check** | Exported file CONTAINS sub-recipe rows ("come in same excel") — if NOT, STOP and flag owner | Open exported file / parse with python openpyxl | NO |
| 3 | Template button downloads RecipeSample xlsx | Browser | NO |
| 4 | Import: ONE live 1-row import per owner Q2 (obvious ZZ_TEST recipe name; delete after via dispatch delete) | Browser on preprod | NO |
| 5 | Import bad file → 422 field error surfaces via readableMessage (`products_file` no longer the cause) | Browser junk file | NO |
| 6 | Regression: addon/sub tabs Excel buttons stay disabled; batch save + cost/margin untouched | Browser | NO |

## Risk Register
Import writes real recipes — Q2 limits to ONE live test with cleanup. Axios instance must send `Accept: application/json` (else 302) — verify instance default headers at implementation; if absent, add per-request header in importRecipes (in-scope, service file).

## Registry Checklist
- [ ] registry.json BUG-222 → IMPLEMENTED, pos_5_0  - [ ] BUG_TRACKER row  - [ ] FILE_OWNERSHIP  - [ ] `// BUG-222` markers  - [ ] webpack clean

*Gate 3 complete. Awaiting Gate 4 GO.*
