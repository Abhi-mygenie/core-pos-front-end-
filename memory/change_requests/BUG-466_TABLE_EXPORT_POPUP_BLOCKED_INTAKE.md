# BUG-466 — Table Management Export ("Bulk Export") does nothing in production

**Type:** BUG
**Registered:** 2026-06
**Sprint:** sep_bug_closure
**Gate:** 1 (INTAKE)
**Source:** OWNER-REPORTED
**Confidence:** CONFIRMED (live backend probe + browser reproduction)
**Related:** CR-060 (introduced Table/Room Management export), RELATED pattern family (BUG-221 / inventory + menu bulk exports use the same `window.open`-after-await trigger)

## Summary
In **Settings → Table Management**, the **Export** button (and the **Export** button inside **Bulk Edit**)
appears to do nothing in a normal browser: no file downloads, while a green "Exported" toast still
claims success. The backend and data mapping are correct; the frontend's download trigger is the defect.

## Classification + Severity
- Classification: **BUG**
- Severity (proposed): **P1 — HIGH** — a shipped feature is broken with no in-app workaround (owner cannot export the table list). *Owner to confirm/override.*
- Risk: **MEDIUM** — component-level UI behaviour; non-financial; no API contract, localStorage, socket, or provider-order change.

## Duplicate check
**DISTINCT.** No existing BUG covers Table Management export. Related: CR-060 (shipped the feature).
Note: the identical `window.open(url,"_blank")`-after-`await` pattern also exists in inventory/menu
bulk exports (IngredientBulkEditor, RecipeBulkEditor, InventorySetupPanel, menu BulkEditor) — flag as
RELATED if the owner reports those; out of scope for BUG-466.

## Evidence
- Screenshot: table-management bulk editor (session capture)
- Steps to reproduce:
  1. Login → Settings → Table Management.
  2. Click **Export** (or open **Bulk Edit** → click **Export**).
  3. Observe: "Exported" toast shows, but no .xlsx downloads (real browser with default popup blocker).
- Curl output (live, token masked):
  - `GET /api/v2/vendoremployee/restaurant-settings/table-config/export-list` → **200** `{success:true, message:"Table list exported successfully", download_url:"…/storage/TableList_*.xlsx", total_records:84}` → `evidence/INV-TABLE-EXPORT-2026-06/export_list_resp.txt`
  - `HEAD` on `download_url` → **200**, `content-type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, 8533 bytes, `access-control-allow-origin: *`
- Browser repro (Playwright, popups NOT blocked): export opens an **empty new tab** (`NEWPAGE::`) alongside the download → `evidence/INV-TABLE-EXPORT-2026-06/browser_repro_2026-06.md`
- Investigation report: `INV-TABLE-EXPORT-2026-06_INVESTIGATION_REPORT.md`

## Root cause (from investigation — HIGH confidence, FE_BUG)
`handleExport` calls `window.open(res.download_url, "_blank")` **after** `await exportTableList()`.
The deferred `window.open` has lost its transient user activation, so the browser popup blocker
blocks it in production → no tab, no download, while the success toast still fires. Playwright does
not enforce popup blocking, which is why automation never caught it.

## Blast radius
- **SMALL** — 2 files, ~3–5 lines each:
  - `src/components/panels/settings/TableManagementView.jsx` — `handleExport` (L117–127), `export-btn`
  - `src/components/panels/settings/TableBulkEditor.jsx` — `handleExport` (L165–173), `table-bulk-export-btn`
- Hotspot files touched (R5 list): **NO**
- Code reality: **FULL** (feature shipped under CR-060; defect is the download trigger)

## Recommended fix (no code yet)
Replace the deferred `window.open` with the app's canonical reliable download trigger — an anchor
element (`document.createElement('a')` + `a.href=url` + `a.download` + append→click→remove), matching
`reportService.exportOrderReportBetaExcel` and `recipeService`. Anchor navigation to a file URL is not
treated as a popup (not blocked), and the binary content-type + `access-control-allow-origin: *` make
the browser download it without navigating away. Also removes the stray empty tab.

## Route decision (gates & rules)
- **Fast Lane:** NOT eligible — fails the hard **"1 file only"** condition (change spans 2 files).
- **Investigation planning-skip / DIRECT_BUG_FIX:** NOT eligible — requires **≤10 lines AND 1 file**; this is 2 files.
- **BUG FIX role path:** NOT applicable — that path is only for QA failures against an existing approved plan; there is no prior plan here.
- → **FULL PLANNING gate cycle required:** Gate 2 Impact Analysis → Gate 3 Implementation Plan → owner **Gate 4 GO** → IMPLEMENTATION → QA (Gate 5b). Both export sites fixed together; QA must assert "no stray blank tab + file actually downloads".

## Open owner decisions
- OD-466-01: Confirm severity P1 (or downgrade to P2 if export is low-traffic for you).
- OD-466-02: Fix both export sites together (recommended YES).
- OD-466-03: Also fix the RELATED inventory/menu bulk exports now, or keep separate? (recommended: separate CR/BUG batch.)

**Next:** owner answers ODs → "Gate 2 GO" → PLANNING Impact Analysis.
