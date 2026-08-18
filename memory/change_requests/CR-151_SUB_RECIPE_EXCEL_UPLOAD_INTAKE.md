# CR-151 — Sub Recipe Excel Upload

**Type:** Change Request (New Feature)
**ID:** CR-151
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Owner needs the ability to upload sub-recipes in bulk via an Excel file. Currently, sub-recipes can only be added one-by-one through the UI. A bulk Excel import would allow faster data entry for restaurants with many sub-recipes.

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Inventory → Sub Recipes |
| Priority | P2 |
| Severity | MEDIUM — data entry efficiency improvement; manual entry still works |
| Risk | MEDIUM (bulk data mutation; incorrect template could corrupt inventory data) |
| Fast Lane | NO — file upload + transform + API integration |

## Evidence

- Source: OWNER-REPORTED
- Steps to reproduce: Navigate to Inventory → Sub Recipes — no "Import from Excel" option
- Confidence: REPORTED

## Code Reality Check

```bash
grep -rn "excel.*upload\|ExcelUpload\|importExcel\|uploadExcel\|subRecipe.*upload" src/ → 0 matches
grep -rn "subRecipe\|sub_recipe\|SubRecipe" src/ → 68 matches (sub recipe UI exists)
```

- **Code reality: PARTIAL** — sub-recipe CRUD UI exists; Excel upload functionality is NONE
- Related existing files:
  - `src/components/inventory/` (sub-recipe components)
  - `src/api/services/inventoryService.js` (sub-recipe API calls)
  - Reference: any existing Excel upload utility if present

## Blast Radius

- Sub-recipe section: ~68 lines
- New upload component: SMALL addition to existing panel
- Estimated scope: SMALL-MEDIUM (2-3 files)

## Expected Behavior

- Sub Recipes panel has an "Import Excel" button
- Downloadable template with correct columns (name, ingredients, quantities, units)
- Upload validates and previews rows before saving
- Shows success/error counts after upload

## Owner Decisions Needed

1. What is the backend endpoint for bulk sub-recipe upload? (xlsx or JSON payload?)
2. Should it merge (update existing) or always insert new?

## Duplicate Check

RELATED to BUG-SRSTOCK (sub-recipe stock) — different issue (this is import, not stock calc).
Otherwise DISTINCT.

---

**Backend Brief Needed:** Yes — need bulk upload endpoint contract.
**Next:** Planning Gate 2
