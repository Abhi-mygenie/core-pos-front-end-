# CR-153 — Wastage Report / Top Wasted Items

**Type:** Change Request (New Feature)
**ID:** CR-153
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Owner wants a Wastage Report in the POS that shows:
1. **Wastage Report** — all recorded wastage entries (ingredient, quantity, reason, date, cost impact)
2. **Top Wasted Items** — ranked list of most wasted ingredients/items over a period

This helps owners identify and reduce inventory waste.

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Reports → Wastage Report (new section) / Inventory Intelligence |
| Priority | P1 |
| Severity | HIGH — inventory cost visibility is critical for restaurant profitability |
| Risk | HIGH (financial report; shows cost of waste) |
| Fast Lane | NO — new report component + API |

## Evidence

- Source: OWNER-REPORTED
- Steps to reproduce: Navigate to Reports — no Wastage Report section; check Inventory → no top-wasted summary
- Confidence: REPORTED

## Code Reality Check

```bash
grep -rn "wastage\|Wastage\|topWasted" src/ → 76 matches
  - api/constants.js (wastage endpoints may exist)
  - api/services/inventoryService.js (wastage service calls exist)
  - api/transforms/inventoryTransform.js (wastage transform exists)
  - components/inventory/InventoryIntelligencePanel.jsx (partial intelligence display)
  - pages/InventorySetupPage.jsx (wastage tab referenced: tabParam === 'wastage')
```

- **Code reality: PARTIAL** — wastage data model, transforms, and service exist; dedicated Wastage Report page is NONE; InventoryIntelligencePanel may have partial top-wasted display

## Blast Radius

- ~76 lines reference wastage (MEDIUM)
- Estimated scope: MEDIUM (2-4 files — new report page + potentially reuse InventoryIntelligencePanel data)

## Expected Behavior

**Wastage Report:**
- Table: Date, Ingredient/Item, Quantity Wasted, Unit, Reason, Recorded By, Cost Impact
- Filters: Date range, category, ingredient
- Export: Excel/PDF

**Top Wasted Items widget/tab:**
- Ranked bar chart or table: Top 10 most wasted items
- Sortable by quantity or cost impact
- Period selector: last 7 days / 30 days / custom

## Owner Decisions Needed

1. Should this be under Reports menu or inside Inventory Intelligence panel?
2. Is "cost impact" available from the backend, or needs frontend calculation (qty × unit_cost)?
3. Should Top Wasted Items be a chart (bar/pie) or just a table?

## Duplicate Check

DISTINCT — no prior CR for wastage reporting.

---

**Backend Brief Needed:** Confirm wastage endpoint fields and whether cost_impact is available.
**Next:** Planning Gate 2
