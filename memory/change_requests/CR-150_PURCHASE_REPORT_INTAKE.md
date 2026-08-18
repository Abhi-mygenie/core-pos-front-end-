# CR-150 — Purchase Report in New POS

**Type:** Change Request (New Feature)
**ID:** CR-150
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

The new POS does not have a Purchase Report. Owner needs a report showing all purchase transactions (ingredients/stock purchased from vendors), likely including: vendor name, item, quantity, unit cost, total cost, date, and purchase order reference.

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Reports → Purchase Report (new section) |
| Priority | P1 |
| Severity | HIGH — purchase tracking is core to inventory cost management |
| Risk | HIGH (financial report; displays purchase costs and vendor payments) |
| Fast Lane | NO — new report component + API integration |

## Evidence

- Source: OWNER-REPORTED
- Steps to reproduce: Navigate to Reports — no "Purchase" section exists
- Confidence: REPORTED

## Code Reality Check

```bash
grep -rn "PurchaseReport\|purchase.*report\|purchaseReport" src/ → 0 matches
```

- **Code reality: NONE** — no purchase report component or service exists
- Related existing files (for pattern reference):
  - `src/pages/reports-module/` (existing report pages to follow pattern)
  - `src/api/services/reportService.js` (add purchase report service here)
  - `src/api/constants.js` (add purchase report endpoint)

## Blast Radius

- 0 existing lines (SMALL — greenfield within reports module)
- Estimated scope: MEDIUM (new component + service + constants + sidebar/nav entry)

## Expected Behavior

- Reports → Purchase Report page
- Columns: Date, Vendor, Item/Ingredient, Quantity, Unit, Unit Cost, Total Cost, PO Reference
- Filters: Date range, vendor, category
- Export: Excel/PDF (matching existing report export pattern)

## Owner Decisions Needed

1. What is the backend endpoint for purchase data? (Need API contract from backend team)
2. Should it show purchase orders only, or also individual GRN/stock entries?
3. Date range default: today / this week / this month?

## Duplicate Check

DISTINCT — no prior CR for purchase report.

---

**Backend Brief Needed:** Yes — need endpoint contract before implementation.
**Next:** Planning Gate 2
