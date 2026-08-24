# CR-081 Impact Analysis (Gate 2)

**Date:** 2026-07-20
**Item:** CR-081 — Inventory V5 Mockup Design Alignment
**Risk:** HIGH (12+ files, hotspot Sidebar.jsx)
**Code Reality:** PARTIAL — all 18 inventory components exist, API wired, design polish missing

---

## Conflict Pre-Check

| File | Last Modified By | Date | Conflict? |
|---|---|---|---|
| Sidebar.jsx | CR-052, CR-059, CR-061, BUG-136, CR-041, CR-060, CR-011 | Multiple | ⚠️ HOTSPOT — Phase A adds tab bar ALONGSIDE, does NOT modify sidebar |
| App.js | CR-077 | 2026-07-19 | NO CHANGE NEEDED — routes already exist |
| InventoryIntelligencePanel.jsx | CR-072 | 2026-07-15 | Will modify — no active conflict |
| SmartPurchasePanel.jsx | CR-078 | 2026-07-18 | Will modify — no active conflict |

---

## Phase A — Navigation Tab Bar

### Code Reality
- `InventoryTabBar.jsx` — **DOES NOT EXIST**
- `InventoryLayout.jsx` — **DOES NOT EXIST**
- V5 mockup data-testids: `nav-dashboard`, `nav-current-stock`, `nav-smart-purchase`, `nav-receive`, `nav-audit`, `nav-ingredients`, `nav-recipes`, `nav-vendors`, `nav-wastage`
- Current: 6 separate routes in App.js (lines 172-181), sidebar children only

### Existing Routes (confirmed in App.js)
| Route | Page | Mockup Tab |
|---|---|---|
| `/inventory-dashboard` | InventoryIntelligencePage | Dashboard |
| `/inventory-current-stock` | InventoryCurrentStockPage | Current Stock |
| `/inventory-smart-purchase` | SmartPurchasePage | Smart Purchase |
| `/inventory-receive` | InventoryReceivePage | Receive |
| `/inventory-audit` | StockAuditPage | Stock Audit |
| `/inventory-setup` | InventorySetupPage (3 tabs: Ingredients, Recipes, Vendors + Wastage) | Ingredients / Recipes / Vendors / Wastage Reasons |

### Gap: Setup has 3 internal tabs, mockup has 4 separate pills
Mockup shows Ingredients, Recipes, Vendors, Wastage Reasons as 4 separate top-level tabs. Live has them as 3 tabs inside InventorySetupPanel. **This means:** tab bar click for "Ingredients" should navigate to `/inventory-setup` and auto-select the Ingredients tab. Same for Recipes, Vendors, Wastage.

### Files WILL change
1. **NEW:** `InventoryTabBar.jsx` (~60 lines)
2. **MODIFIED:** Each inventory page component to mount the tab bar (6 files, ~5 lines each)

### Files WILL NOT change
- Sidebar.jsx ❌ (tab bar is independent)
- App.js ❌ (routes already exist)

### Blockers: **NONE**

### Open Question (needs your answer)
- **OQ-4:** Setup tab pills — should clicking "Vendors" in the tab bar navigate to `/inventory-setup?tab=vendors` (query param) or a new route `/inventory-vendors`?

---

## Phase B — Dashboard Widgets

### Code Reality — MORE COMPLETE THAN EXPECTED

**Dashboard panel exists** (134 lines) and **already fetches REAL data:**
| API Call | Endpoint | Status |
|---|---|---|
| `getStockInventory()` | `/inventory/get-stock-inventory` | ✅ 200 OK |
| `getDailyConsumptionReport()` | `/inventory/daily-consumption-report` | ✅ 200 OK |
| `getVendorItemList()` | `/inventory/vendor-item-list` | ✅ 200 OK (1,146 records) |
| `getRecipes()` | `/inventory/get-recipe` | ✅ 200 OK |

**6 widgets exist with data refs:**
| Widget | Lines | Has Data? |
|---|---|---|
| ReorderForecastWidget | 51 | YES — uses stockInventory |
| ConsumptionTrendsWidget | 49 | YES — uses consumptionData |
| CostTrendWidget | 63 | YES — uses vendorItemList |
| RecipeCostMarginWidget | 81 | YES — uses recipes + vendorItemList |
| VendorPerformanceWidget | 73 | YES — uses vendorItemList |
| VendorDirectoryWidget | 43 | YES — uses vendorItemList |

### What's MISSING (design only — no new API calls needed)
1. **4 KPI cards row** — not rendered, data available
2. **Low-Stock Alerts strip** — not rendered, data available from stockInventory
3. **Time range chips** (7d/14d/30d) — not rendered
4. **Chart rendering** — ConsumptionTrends has recharts but may not be rendering the line chart
5. **Color coding** — days-left badges, margin bands
6. **Restaurant context subtitle** — data available from RestaurantContext

### Blockers
- **NOT blocked by CR-072 Phase 2 missing endpoints.** Dashboard uses EXISTING endpoints that work today.
- The 6 missing endpoints (EP-1 to EP-6 returning 404) are for ENHANCED intelligence — not needed for Phase B basic dashboard.

### Files WILL change
1. `InventoryIntelligencePanel.jsx` — add KPI cards, low-stock strip, time range chips, styling
2. 6 widget files — design polish (color coding, badges, chart config)

---

## Phase C — Smart Purchase Polish

### Code Reality
`SmartPurchasePanel.jsx` (227 lines) exists with API wiring. 4 sub-components:
- `AutoShoppingList.jsx` (142L), `GroupedVendorPreview.jsx` (61L), `HorizonPicker.jsx` (45L), `VendorSuggestionCell.jsx` (37L)

### What's MISSING (design only)
All 11 items from intake (C1-C11) — vendor reasoning text, stock badges, color coding, column renames, override warning. Pure CSS/JSX — no new API.

### Blockers: **NONE**

---

## Phase D — Other Screens Polish

### Code Reality
- `CurrentStockPanel.jsx` (286L) — exists, API wired
- `StockAuditPanel.jsx` (192L) — exists, API wired
- `InventorySetupPanel.jsx` (489L) — exists, 3 tabs working

### What's MISSING (design only)
D1-D6 from intake — banner styling, color coding, toolbar buttons, vendor type badges, wastage card style.

### Blockers: **NONE**

---

## Summary

| Phase | Code Reality | API Blocked? | Files | Est. Lines | Blockers |
|---|---|---|---|---|---|
| **A** Tab Bar | NONE | NO | 7 (1 new + 6 modified) | ~90 | **OQ-4** (setup tab routing) |
| **B** Dashboard | PARTIAL (data wired, design missing) | **NO** (uses existing APIs) | 7 | ~200 | None |
| **C** Smart Purchase | PARTIAL (functional, design missing) | NO | 5 | ~150 | None |
| **D** Other Screens | PARTIAL (functional, design missing) | NO | 3 | ~100 | None |

### Overall Blockers: **1 question**

**OQ-4:** When user clicks "Vendors" or "Wastage Reasons" in the tab bar — should it:
- **(a)** Navigate to `/inventory-setup` and auto-select that tab via query param (`?tab=vendors`)
- **(b)** Create new routes (`/inventory-vendors`, `/inventory-wastage`)

This determines whether Phase A is ~60 lines (option a) or ~90 lines + App.js route changes (option b).
