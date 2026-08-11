# BUG-222 — Bulk Recipe Excel: No Template/Export Split; File Won't Open

**ID:** BUG-222
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P2 (MEDIUM)
**Risk:** MEDIUM
**Module:** Inventory — Recipe Management (RecipeBulkEditor — Excel import/export)
**Duplicate Check:** NONE — fresh issue on recipe bulk editor.
**Code Reality:** PARTIAL — `RecipeBulkEditor.jsx:95`: `excelEnabled = recipeType === 'standard'` disables Excel for addon/sub recipes. Export/import exist for standard only. "File Won't Open" not yet curl-verified.
**Source:** OWNER-REPORTED (session 2026-07-22)
**Confidence:** REPORTED (file-open failure not curl-verified this session)

---

## Description

Two sub-issues in the Recipe Bulk Editor Excel flow:

### A — No Template / Export Split
- Owner expects two separate actions: **Download Template** (blank xlsx with headers) and **Export Recipes** (populated xlsx with existing data)
- Current UI has a single Export button — no blank template option
- Owner cannot use bulk import without first knowing the correct column format

### B — Exported/Imported File Won't Open
- Owner reports that the Excel file produced by the export cannot be opened (corrupt or wrong format)
- Possible causes: API returns binary blob but frontend handles as JSON, or content-type mismatch
- `RecipeBulkEditor.jsx:285-296` handles export via `recipeService.exportRecipes()` — needs blob-handling verification

### C — Excel Disabled for Addon/Sub Recipe Types
- `excelEnabled = recipeType === 'standard'` at line 95 — Addon and Sub recipe bulk editors have disabled Excel buttons
- Owner may expect Excel on all recipe types

---

## Evidence

- Code: `RecipeBulkEditor.jsx:95` — `excelEnabled = recipeType === 'standard'`
- Code: `RecipeBulkEditor.jsx:283-303` — export and import handlers
- Owner-reported: file won't open after download
- Needs: curl verify `recipeService.exportRecipes()` response format (blob vs JSON download_url)

---

## Blast Radius

- 2 files: `RecipeBulkEditor.jsx`, `recipeService.js`
- ~20-25 lines change
- Hotspot: NO
- Scope: MEDIUM (2 files, blob/download fix + UI split)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Curl-verify `exportRecipes()` endpoint — check content-type (application/octet-stream or JSON with url)
2. Fix export download handler: use dual-response pattern (URL or blob fallback with proper MIME type)
3. Add "Download Template" button pointing to a template endpoint (or generate client-side headers-only xlsx)
4. Review whether to enable Excel for sub/addon types — owner decision required

---

## Next
Planning Gate 2 → Gate 3 → Implementation
