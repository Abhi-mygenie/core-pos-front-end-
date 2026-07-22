# CR-081 Implementation Plan (Gate 3)

**Date:** 2026-07-20
**Risk:** HIGH
**OQ-4 Resolved:** Option (a) — query param `/inventory-setup?tab=vendors`
**Execution Model:** Screen-by-screen. Each screen = implement → owner validates → sign-off → next screen.

---

## Conflict Pre-Check: CLEAN
- Sidebar.jsx: NOT touched (tab bar is separate component)
- App.js: NOT touched (routes exist, setup tabs via query param)

## Scope Lock

**Files WILL change:** InventoryTabBar.jsx (NEW), 6 page files, InventoryIntelligencePanel.jsx, 6 widget files, SmartPurchasePanel.jsx + 4 sub-components, CurrentStockPanel.jsx, StockAuditPanel.jsx, InventorySetupPanel.jsx

**Files WILL NOT touch:** Sidebar.jsx, App.js, inventoryService.js, inventoryTransform.js, recipeService.js

---

## Execution Order — 6 Screens, 1 at a Time

### Screen 1: Tab Bar (Phase A) — FOUNDATION
**Must ship first — all other screens depend on it.**

| Edit | File | Change | Lines |
|---|---|---|---|
| A1 | **NEW** `components/inventory/InventoryTabBar.jsx` | Horizontal pill bar. OPERATIONS group: Dashboard · Current Stock · Smart Purchase · Receive · Stock Audit. SETUP group: Ingredients · Recipes · Vendors · Wastage Reasons. Active pill = dark bg (#1A1A1A) + white text. Receive badge (pending count, franchise only). Sticky below header. | ~65 |
| A2 | `pages/InventoryIntelligencePage.jsx` | Import + mount `<InventoryTabBar active="dashboard" />` | ~3 |
| A3 | `pages/InventoryCurrentStockPage.jsx` | Import + mount `<InventoryTabBar active="current-stock" />` | ~3 |
| A4 | `pages/SmartPurchasePage.jsx` | Import + mount `<InventoryTabBar active="smart-purchase" />` | ~3 |
| A5 | `pages/InventoryReceivePage.jsx` | Import + mount `<InventoryTabBar active="receive" />` | ~3 |
| A6 | `pages/StockAuditPage.jsx` | Import + mount `<InventoryTabBar active="audit" />` | ~3 |
| A7 | `pages/InventorySetupPage.jsx` | Import + mount `<InventoryTabBar active={tabFromQuery} />`. Read `?tab=` query param to highlight correct pill + pass to panel. | ~8 |

**Tab → Route mapping:**
| Pill | Route |
|---|---|
| Dashboard | `/inventory-dashboard` |
| Current Stock | `/inventory-current-stock` |
| Smart Purchase | `/inventory-smart-purchase` |
| Receive | `/inventory-receive` |
| Stock Audit | `/inventory-audit` |
| Ingredients | `/inventory-setup?tab=ingredients` |
| Recipes | `/inventory-setup?tab=recipes` |
| Vendors | `/inventory-setup?tab=vendors` |
| Wastage Reasons | `/inventory-setup?tab=wastage` |

**Owner validates:** Tab bar visible on all inventory pages. Click each pill → navigates correctly. Active state matches. Receive badge shows for franchise. Sticky on scroll.

**Total: ~91 lines, 7 files (1 new + 6 modified)**

---

### Screen 2: Dashboard (Phase B)

| Edit | File | Change | Lines |
|---|---|---|---|
| B1 | `InventoryIntelligencePanel.jsx` | Add 4 KPI cards row (Reorder Alerts, Wastage Value, Cost Change, Recipes at Risk). Data from existing `stockInventory` + `consumptionData` + `vendorItems` + `recipes`. | ~40 |
| B2 | `InventoryIntelligencePanel.jsx` | Add Low-Stock Alerts horizontal strip (≤5 items from stockInventory where days_left < 7). | ~25 |
| B3 | `InventoryIntelligencePanel.jsx` | Add time range chips (7d/14d/30d) + "All Categories" dropdown + Export button. Wire chips to re-fetch consumptionData with selected range. | ~20 |
| B4 | `ReorderForecastWidget.jsx` | Add Current qty, Suggest Reorder qty, Preferred Vendor columns. Days-left color badges (red ≤3d, amber ≤7d, green >7d). | ~25 |
| B5 | `ConsumptionTrendsWidget.jsx` | Render recharts LineChart with ingredient selector dropdown, avg/day label, total label. | ~30 |
| B6 | `CostTrendWidget.jsx` | Add sparkline per ingredient (recharts Sparkline), Δ vs prev % column. | ~25 |
| B7 | `RecipeCostMarginWidget.jsx` | Verify margin bands + add Δ vs prev column. Color: green >30%, amber 15-30%, red <15%. | ~15 |
| B8 | `VendorPerformanceWidget.jsx` + `VendorDirectoryWidget.jsx` | Performance cards styling + Directory table with spend rollup column. | ~20 |

**Owner validates:** Dashboard shows KPI cards with real numbers. Low-stock alerts visible. Time range chips switch data. Each widget renders with real data from existing APIs. Charts render.

**Total: ~200 lines, 8 files**

---

### Screen 3: Smart Purchase (Phase C)

| Edit | File | Change | Lines |
|---|---|---|---|
| C1 | `VendorSuggestionCell.jsx` | Vendor reasoning text: "Cheapest · 8% below X", "Stable · same rate × 6", "Only vendor", "Override · X% costlier" | ~30 |
| C2 | `AutoShoppingList.jsx` | Stock status badges per row: "Out of stock" (red), "Low · X days" (amber), "X days · trending" (green). ON-HAND color coding. Row bg tints. | ~40 |
| C3 | `AutoShoppingList.jsx` | "suggest: X" hint below QTY input. Column name renames per mockup. | ~15 |
| C4 | `SmartPurchasePanel.jsx` | "Review & Submit" button (green), "AUTO SHOPPING LIST · X-DAY HORIZON" header with badge, "Add Ad-hoc Item" link. | ~20 |
| C5 | `AutoShoppingList.jsx` | Override warning row: orange bg tint + warning text when user picks costlier vendor. | ~20 |
| C6 | `GroupedVendorPreview.jsx` | Per-vendor cards with Payment Method selector. "Will submit as X vendor POs" header. | ~20 |
| C7 | `HorizonPicker.jsx` | "Purchase for" label + description text styling. | ~5 |

**Owner validates:** Smart Purchase shows vendor reasoning, stock badges, color-coded rows, override warnings. Vendor preview groups by vendor with PO count.

**Total: ~150 lines, 5 files**

---

### Screen 4: Current Stock (Phase D1)

| Edit | File | Change | Lines |
|---|---|---|---|
| D1a | `CurrentStockPanel.jsx` | "Stock Intelligence Phase 2" banner CTA styling (dashed border, link to Dashboard). | ~10 |
| D1b | `CurrentStockPanel.jsx` | 4 KPI cards: Total Items, Low Stock (amber), Out of Stock (red), Categories. | ~20 |
| D1c | `CurrentStockPanel.jsx` | Filter chips: All / In Stock / Low / Out — each with count badge + color. | ~15 |

**Owner validates:** Current Stock shows KPI cards, filter chips with counts, banner link works.

**Total: ~45 lines, 1 file**

---

### Screen 5: Stock Audit (Phase D2)

| Edit | File | Change | Lines |
|---|---|---|---|
| D2a | `StockAuditPanel.jsx` | Drift color coding: red for negative, green for positive/match. Icons (↓↑=). | ~15 |
| D2b | `StockAuditPanel.jsx` | Save Adjustments button visibility fix. Reason dropdown disabled when no drift. | ~10 |

**Owner validates:** Stock Audit shows colored drift indicators, reason dropdown behavior, save button logic.

**Total: ~25 lines, 1 file**

---

### Screen 6: Setup Screens (Phase D3-D5)

| Edit | File | Change | Lines |
|---|---|---|---|
| D3 | `InventorySetupPanel.jsx` | Ingredients tab: Export/Import/Bulk Edit toolbar buttons. Category orange highlight + count badge. | ~20 |
| D4 | `InventorySetupPanel.jsx` | Vendors tab: Type badges (Wholesale blue, Retail green, Grocery purple), contact/phone/GST columns. | ~15 |
| D5 | `InventorySetupPanel.jsx` | Wastage Reasons tab: Card-style list with edit/delete icons + inline add form orange border. | ~10 |
| D6 | Various | Filter UX polish (result count, clear button, active filter indicator) — absorbed from CR-075. | ~15 |

**Owner validates:** Setup tabs match mockup — ingredient toolbar, vendor badges, wastage cards.

**Total: ~60 lines, 1-2 files**

---

## Verification Matrix

| Screen | How to Verify |
|---|---|
| 1. Tab Bar | All 9 pills render. Click each → correct page. Active state. Receive badge (franchise). Sticky. |
| 2. Dashboard | 4 KPI cards with numbers. Low-stock strip. Time chips switch data. 6 widgets with charts. |
| 3. Smart Purchase | Vendor reasoning. Stock badges. Color rows. Override warning. Vendor preview. |
| 4. Current Stock | KPI cards. Filter chips with counts. Banner link. |
| 5. Stock Audit | Drift colors. Save button. Reason dropdown. |
| 6. Setup | Toolbar buttons. Vendor badges. Wastage cards. |

---

## Post-Code Registry Checklist (per screen)
- [ ] registry.json: CR-081 status updated per screen
- [ ] FILE_OWNERSHIP.md: modified files listed
- [ ] Code markers: // CR-081 in every modified file
- [ ] Compile: 0 new warnings
- [ ] Screenshot: before/after comparison
- [ ] Owner sign-off: PASS/FAIL per screen
