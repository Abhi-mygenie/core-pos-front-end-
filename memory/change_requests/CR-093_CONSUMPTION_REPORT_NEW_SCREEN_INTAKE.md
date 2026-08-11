# CR-093 — Consumption Report: New Screen (Date Range, Category, Ingredient, Margin, Cost)

**ID:** CR-093
**Type:** CR
**Created:** 2026-07-22
**Severity:** P2 (MEDIUM)
**Risk:** MEDIUM
**Module:** Inventory — New Screen (Consumption Report)
**Duplicate Check:** NONE — new screen, not a variant of any existing report.
**Code Reality:** NONE — no Consumption Report screen exists in the inventory module. `InventoryTabBar.jsx` would need a new tab.
**Source:** OWNER-REQUESTED (session 2026-07-22)
**Confidence:** CONFIRMED (feature gap verified)

---

## Description

Owner wants a new **Consumption Report** screen under the Inventory module, showing how much of each ingredient was consumed over a date range, along with cost and margin data.

### Expected Fields / Columns
- **Date Range**: from/to date picker
- **Category filter**: filter by ingredient category
- **Ingredient filter**: filter by specific ingredient
- **Ingredient Name**
- **Qty Consumed** (with unit)
- **Cost per Unit**
- **Total Cost** (qty × cost)
- **Recipe Cost** (cost attributed to recipe production)
- **Margin** (sales price - recipe cost, per recipe/item)

### Expected Navigation
- New tab in `InventoryTabBar.jsx` labeled "Consumption"
- Or new nav item under Inventory section

---

## Evidence

- `InventoryTabBar.jsx` — current tabs, no Consumption tab
- Backend: need to check if a consumption summary endpoint exists (DCR or separate consumption API)
- `inventoryService.getDailyConsumptionReport()` exists (CR-078) — may be basis for this report

---

## Blast Radius

- 3-4 files: New `ConsumptionReportPanel.jsx`, `InventoryTabBar.jsx` (+1 tab), `inventoryService.js` (+API call), possibly `constants.js`
- ~100-150 lines (new screen)
- Scope: LARGE (new screen)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Backend: curl-verify consumption endpoint — check available filters (date range, category, ingredient)
2. Add tab to `InventoryTabBar.jsx`: "Consumption"
3. Create `ConsumptionReportPanel.jsx` with date range pickers + category/ingredient filters
4. Fetch data on filter change, render table with all required columns
5. Add Excel export for the consumption report

---

## Next
Planning Gate 2 → Gate 3 → Implementation
