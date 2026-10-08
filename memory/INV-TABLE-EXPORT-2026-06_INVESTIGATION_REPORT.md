# INVESTIGATION REPORT — Table Management "Bulk Export" not working

**ID:** INV-TABLE-EXPORT-2026-06
**Role:** INVESTIGATION (ALPHA v0.7)
**Date:** 2026-06 (preprod probe timestamp 2026-10-08 session)
**Source:** OWNER-REPORTED — "bulk export options is not working in table management"
**Risk:** MEDIUM (component-level UI behaviour; non-financial; no API contract change)

## 1. Summary
Root cause: **FE_BUG.** The Export action in Table Management fires `window.open(download_url, "_blank")`
*after* an `await`, so the browser's popup blocker blocks the deferred window in production → no
download, while a success toast still shows. Backend and data mapping are correct.
Classification: **FE_BUG**
Confidence: **HIGH** (backend + file verified by curl; browser repro shows the empty-popup path)
Steps used: 7/10

## 2. Hypotheses Tested
| # | Hypothesis | Test Method | Result | Evidence |
|---|-----------|-------------|--------|----------|
| H1 | API fails / returns error | curl export-list w/ live token | ELIMINATED — HTTP 200, valid body | evidence/export_list_resp.txt |
| H2 | `download_url` nested/renamed → FE reads undefined | curl shape vs FE code | ELIMINATED — top-level `download_url`, FE reads `res.download_url` | export_list_resp.txt + TableManagementView.jsx:120 |
| H3 | File URL dead / 404 | curl -I on download_url | ELIMINATED — HTTP 200, xlsx, 8533 bytes, ACAO:* | HEAD output in report |
| H4 | Deferred `window.open` blocked by popup blocker | browser repro (Playwright) | CONFIRMED — opens empty NEWPAGE tab; prod blocker blocks it | evidence/browser_repro_2026-06.md |

## 3. Data Flow Trace
Button onClick → `handleExport()` → `await exportTableList()`
  → `GET /api/v2/vendoremployee/restaurant-settings/table-config/export-list`
  → 200 `{success, message, download_url, total_records:84}` (returned raw as `res.data`)
  → `if (res?.download_url) window.open(res.download_url, "_blank")`  ← **BREAK POINT**
  (window.open runs after the await → no transient activation → popup blocked in prod)

Affected files (identical defect in both):
- `src/components/panels/settings/TableManagementView.jsx` — `handleExport` L117–127 (`export-btn`)
- `src/components/panels/settings/TableBulkEditor.jsx` — `handleExport` L165–173 (`table-bulk-export-btn`, the "Bulk" export)

## 4. Evidence Artifacts
All in `/app/memory/evidence/INV-TABLE-EXPORT-2026-06/`:
- `export_list_resp.txt` — live export-list 200 response
- `export_sample_resp.txt` — live export-sample 200 response (same shape, same latent defect path via handlers that use it)
- `browser_repro_2026-06.md` — Playwright repro (empty popup + download)

## 5. Recommendations
Classification: **FE_FIX** (no backend change).
Replace the deferred `window.open(url,"_blank")` with the app's canonical reliable download
trigger (anchor element with `download`, append→click→remove), matching
`reportService.exportOrderReportBetaExcel` / `recipeService`. An anchor navigation to a file
URL is not treated as a popup, so it is not blocked; the file is served with a binary
content-type and `access-control-allow-origin: *`, so it downloads without navigating away.
This also removes the stray empty tab seen even when popups are allowed.

Scope: 2 files, ~3–5 lines each.
Planning-skip eligibility: **NO** (touches 2 files → fails the ≤10-line AND 1-file rule).
→ Recommend normal Gate cycle: INTAKE register (BUG) → PLANNING Gate 2/3 → owner Gate 4 GO → BUG FIX.
Both export sites must be fixed together; add a regression check that no extra blank tab opens.

## 6. Retroactive Candidates
NONE. (Same latent `window.open`-after-await pattern also exists in inventory/menu bulk exports —
IngredientBulkEditor, RecipeBulkEditor, InventorySetupPanel, menu BulkEditor — flag as RELATED
if the owner reports those too; out of scope for this item.)
