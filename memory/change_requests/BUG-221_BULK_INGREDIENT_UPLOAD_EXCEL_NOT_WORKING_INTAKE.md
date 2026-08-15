# BUG-221 — Bulk Ingredient Upload & Excel Download Not Working

**ID:** BUG-221
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P1 (HIGH)
**Risk:** HIGH
**Module:** Inventory — Ingredients Setup (IngredientBulkEditor — import/export)
**Duplicate Check:** RELATED to BUG-212 C (Export Fake — resolved). DISTINCT: BUG-212 C fixed the main export button on the Ingredients tab; BUG-221 concerns the Bulk Editor's own import AND export flows which are still broken or missing.
**Code Reality:** PARTIAL — `InventorySetupPanel.jsx:142-157` export wired to `inventoryService.exportIngredients()` on the main tab. `IngredientBulkEditor.jsx` has Upload (`<Upload>` icon) and Download buttons — need verification of whether these are wired or stub.
**Source:** OWNER-REPORTED (session 2026-07-22)
**Confidence:** REPORTED (bulk editor import/export not curl-verified this session — needs investigation)

---

## Description

The **Bulk Ingredient Editor** (opened via "Bulk Edit" button in Ingredients tab) has two expected operations:
1. **Excel Download** — download the current ingredients list as an `.xlsx` file for offline editing
2. **Bulk Upload** — upload a filled-in `.xlsx` file to update/add multiple ingredients at once

Owner reports both are non-functional. Possible causes:
- Upload handler is stubbed / not wired to API
- Download handler uses incorrect endpoint or mishandles the response (blob vs URL)
- Template (blank xlsx) and export (populated xlsx) may be conflated

---

## Evidence

- Code: `IngredientBulkEditor.jsx` — has `<Download>` and `<Upload>` icons (from imports)
- Code: `InventorySetupPanel.jsx:142-157` — export wired (BUG-212 C fix) for main tab
- Owner-reported: bulk upload and download not working in bulk editor view
- Needs: curl verify upload endpoint + download endpoint in IngredientBulkEditor.jsx

---

## Blast Radius

- 2 files: `IngredientBulkEditor.jsx`, `inventoryService.js`
- Possibly `constants.js` if endpoint missing
- ~20-30 lines change
- Hotspot: NO
- Scope: MEDIUM (2-3 files, async upload/download flows)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Read `IngredientBulkEditor.jsx` in full — locate import/export handlers
2. Curl-verify upload endpoint: `POST /api/v2/vendoremployee/inventory/import-inventory` (or equivalent)
3. Curl-verify download/template endpoint for bulk ingredients
4. Wire download handler: dual-response pattern (JSON `download_url` or blob fallback)
5. Wire upload handler: `FormData` with file input, success → refresh ingredients list

---

## Next
Planning Gate 2 → Gate 3 → Implementation
