# Mockup vs Live — Gap Analysis
**Date:** 2026-07-19
**Scope:** CR-073 Recipe Bulk Editor + v5 Inventory Mockup cross-check
**Role:** QA / Investigation (no code edits)

---

## PART A: CR-073 Recipe Bulk Editor — Mockup vs Live

Compared: `__dev/recipe_bulk_editor_mockup.html` + `cr072-inventory-mockup-v5-full.html#screen-recipes` vs live `/recipes` Bulk Editor

### BLOCKER Gaps (functional)

| # | Gap | Mockup Shows | Live Shows | Root Cause | Fix Owner |
|---|-----|-------------|-----------|-----------|-----------|
| **G1** | **Batch Save broken** | Save works | PUT 422 "name required" | `foodId` not reverse-looked-up from foodsMaster — sends `name: null`. Card View works (has BUG-197 #7 fix). | **BUG FIX** on RecipeBulkEditor.jsx |
| **G2** | **Cost shows ₹0 for ALL recipes** | ₹78, ₹42, ₹85 etc. | ₹0 everywhere | API `get-recipe` does NOT return ingredient `cost` field. Ingredients only have: `ingredient_id`, `ingredient_name`, `ingredient_qty`, `ingredient_unit`. No `cost`. Code does `ing.cost * ing.quantity` but `ing.cost` is always 0. | **BACKEND GAP** — need ingredient cost from either recipe endpoint or inventory master cross-join |
| **G3** | **Margin shows 100% for ALL recipes** | 74%, 86%, 72% etc. with color bands | 100% green everywhere | Downstream of G2: cost=0 → margin=(price-0)/price=100% | Resolves when G2 is fixed |

### MAJOR Gaps (missing features from mockup)

| # | Gap | Mockup Shows | Live Has | Status |
|---|-----|-------------|---------|--------|
| **G4** | **"Columns" toggle button MISSING** | "Columns 10" button in toolbar for column visibility toggles | Not implemented | CR-073 intake says "Column visibility toggles (same as Menu Columns dropdown)" — **feature not built** |
| **G5** | **food_id missing from get-recipe API** | N/A (mockup uses static data) | API returns `name` (food name string), NOT `food_id` (integer). RecipeBulkEditor needs food_id for save. | **Same root as G1** — known issue (BUG-197 #7). Card View workaround exists but not ported to Bulk Editor |
| **G6** | **Recipe Name column header mismatch** | "RECIPE NAME" (full label) | "NAME" (abbreviated) | Minor labeling difference |

### MINOR Gaps (cosmetic/polish)

| # | Gap | Mockup | Live | Severity |
|---|-----|--------|------|----------|
| G7 | Save button text when clean | "No Changes" with save icon | "Save Changes" (disabled, grayed) | MINOR — different text, same intent |
| G8 | Footer "Showing X of Y recipes" | Present below grid | Missing | MINOR — info is in toolbar ("92 of 92 standard recipes") instead |
| G9 | Delete column (trash icon per row) | NOT in mockup | Present in live | MINOR — live added extra column not in mockup design. May be intentional |
| G10 | Margin band thresholds | Standalone mockup: ≥80/≥70/<70 | Live: ≥50/≥30/<30 | **NOT a gap** — changed per locked ruling FB-7-Q2 |
| G11 | Excel button styling | Green border, green text | Gray border, gray text | MINOR — visual accent difference |

---

## PART B: V5 Full Inventory Mockup — Screen-by-Screen Gap Audit

The v5 mockup (`cr072-inventory-mockup-v5-full.html`) defines **9 screens**. Cross-referencing against live codebase:

### Screens IMPLEMENTED (code exists)

| Screen | Mockup ID | Live Component | CR | Status |
|--------|-----------|---------------|-----|--------|
| Stock Intelligence Dashboard | `screen-dashboard` | `InventoryIntelligencePanel.jsx` | CR-079 | INTAKE (code exists, may not match mockup fully) |
| Current Stock | `screen-current-stock` | `CurrentStockPanel.jsx` | CR-079 | INTAKE (code exists) |
| Smart Purchase | `screen-smart-purchase` | `SmartPurchasePanel.jsx` + `/smart/*` helpers | CR-078 | INTAKE (code exists) |
| Stock Audit | `screen-audit` | `StockAuditPanel.jsx` | CR-079 | INTAKE (code exists) |
| Ingredients (Setup) | `screen-ingredients` | `InventorySetupPanel.jsx` (tab) | CR-072 | IMPLEMENTED |
| Recipes | `screen-recipes` | `RecipeManagementPanel.jsx` + `RecipeBulkEditor.jsx` | CR-072 + CR-073 | IMPLEMENTED (with gaps above) |
| Vendors | `screen-vendors` | `InventorySetupPanel.jsx` (tab) | CR-072 | IMPLEMENTED |
| Wastage Reasons | `screen-wastage` | `InventorySetupPanel.jsx` (tab) | CR-072 | IMPLEMENTED (setup only, no CRUD endpoints per BUG-197) |

### Screens NOT IMPLEMENTED

| Screen | Mockup ID | CR | Status | Blocker |
|--------|-----------|-----|--------|---------|
| **Receive** (Hierarchy Stock Transfer) | `screen-receive` | CR-077 | INTAKE — not coded | Needs master-outlet creds, dispatch/approval endpoint validation |

### Navigation Architecture Gap

| Aspect | V5 Mockup | Live |
|--------|-----------|------|
| Top nav | Horizontal pill bar: Dashboard · Current Stock · Smart Purchase · Stock Audit · Receive | Separate sidebar routes (`/inventory-dashboard`, `/inventory-current-stock`, etc.) |
| Sub-nav | Tab bar: Setup · Ingredients · Recipes · Vendors · Wastage Reasons | Recipes on own route `/recipes`, Setup tabs on `/inventory-setup` |
| Consolidated view | Single page with tab switching | Separate pages per route |

**Status:** Navigation restructure is part of **CR-079** (INTAKE, Gate 2 CLOSED, awaiting Gate 3 plan). Not expected to match v5 mockup yet.

---

## PART C: Cross-Inventory CR/BUG Status Summary

| ID | Title | Status | Gap vs Mockup |
|----|-------|--------|--------------|
| **CR-072** | Inventory CRUD | IMPLEMENTED (Phase 1) | Base CRUD works. 10 post-delivery gaps found (BUG-197) |
| **CR-073** | Recipe Bulk Editor | Code exists, registry says PLANNED | G1-G9 gaps documented above |
| **BUG-196** | Sidebar missing on 6 pages | IMPLEMENTED | Fixed |
| **BUG-197** | CR-072 post-delivery gaps | IMPLEMENTED | Partially — foodId reverse-lookup not ported to Bulk Editor (G1/G5) |
| **CR-075** | UX Overhaul / Stock export | INTAKE | Not built yet |
| **CR-076** | S3 File Upload | INTAKE (PARKED) | Awaiting backend contract |
| **CR-077** | Hierarchy Stock Transfer (Receive) | INTAKE | Not built — `screen-receive` empty |
| **CR-078** | Smart Purchase | INTAKE (code exists, Gate 2 CLOSED) | Components built, needs Gate 3/4 |
| **CR-079** | IA Restructure (nav + dashboard) | INTAKE (code exists, Gate 2 CLOSED) | Components built, nav not restructured |
| **CR-080** | Transfer-First Smart Purchase | INTAKE (DEFERRED) | Future — post CR-077+CR-078 |

### Dashboard Widget Status (v5 `screen-dashboard`)

| Widget | Mockup testid | Live Component | Status |
|--------|--------------|---------------|--------|
| Reorder Alerts + Low Stock | `widget-low-stock` | — (in IntelligencePanel) | Exists |
| Wastage Value | — | — | Data but no dedicated widget |
| Cost Change | — | `CostTrendWidget.jsx` | Exists |
| Recipes at Risk | `widget-recipe-margin` | `RecipeCostMarginWidget.jsx` | Exists |
| Reorder Forecast | `widget-reorder-forecast` | `ReorderForecastWidget.jsx` | Exists |
| Consumption Trends | `widget-consumption-trends` | `ConsumptionTrendsWidget.jsx` | Exists |
| Cost Trend per Ingredient | `widget-cost-trends` | `CostTrendWidget.jsx` | Exists |
| Recipe Cost & Margin | `widget-recipe-margin` | `RecipeCostMarginWidget.jsx` | Exists |
| Vendor Directory | `widget-vendor-directory` | `VendorDirectoryWidget.jsx` | Exists |
| Vendor Performance | `widget-vendor-performance` | `VendorPerformanceWidget.jsx` | Exists |
| Top Wasted Items | `widget-top-wasted-locked` | — | **LOCKED (Phase 2)** in mockup — backend endpoint needed |
| Wastage Insights | `widget-wastage-insights-locked` | — | **LOCKED (Phase 2)** in mockup — backend endpoint needed |

---

## Summary of Actionable Gaps (Priority Order)

| Priority | Gap | Type | Action |
|----------|-----|------|--------|
| **P0** | G1: Batch Save 422 (foodId null) | CODE BUG | Port BUG-197 #7 foodId reverse-lookup into RecipeBulkEditor |
| **P0** | G2/G3: Cost=₹0, Margin=100% | API/DATA GAP | Ingredient cost not returned by recipe API. Need backend brief OR cross-join with inventory master |
| **P1** | G4: Columns toggle missing | MISSING FEATURE | Build column visibility toggle (per CR-073 intake spec) |
| **P1** | Registry (V15-V17): EXIT GATE incomplete | PROCESS GAP | Update registry.json, CR_REGISTRY.md, FILE_OWNERSHIP.md |
| **P2** | screen-receive not built | CR-077 PENDING | Awaiting master-outlet creds + endpoint validation |
| **P2** | Nav restructure not done | CR-079 PENDING | Awaiting Gate 3 plan |
| **P3** | G6-G9: Minor label/text/style diffs | POLISH | Low priority cosmetic alignment |
