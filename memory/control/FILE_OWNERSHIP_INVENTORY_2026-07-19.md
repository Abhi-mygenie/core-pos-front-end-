# FILE OWNERSHIP · Inventory Module (CR-078 · CR-079 · CR-075-A bundle · 2026-07-19)

**First-ever inventory section** — closes IA §R1 long-standing gap.

## Utilities (CR-078)

| File | Owning CR | Purpose | Notes |
|---|---|---|---|
| `src/utils/purchasePlanner.js` | CR-078 | Velocity + gap + suggest_qty math (Path X workaround for backend contract) | Reads `calQuantity` + `smallUnit`; ships with 12/12 automated tests |
| `src/utils/vendorRanking.js` | CR-078 | Vendor ranking + tie-breaker (B5) + 5% override warning (B3) | Reads raw API field `Purchase_Date` (G7) |

## API layer additions

| File | Owning CR | Change |
|---|---|---|
| `src/api/constants.js` | CR-078 | Added `INVENTORY_ENDPOINTS.VENDOR_ITEM_LIST` + new `REPORT_ENDPOINTS` block |
| `src/api/services/inventoryService.js` | CR-078 | Added `getDailyConsumptionReport()`, `getVendorItemList()` |
| `src/api/transforms/inventoryTransform.js` | CR-075-A P6 + CR-078 | `addPurchase` now sends `batch`, `expiry_date`, `origin` fields (previously silently dropped) |
| `src/api/transforms/profileTransform.js` | CR-078 | Surfaces `restaurantTypeFlag` + `parentRestaurantId` |

## Context extensions

| File | Owning CR | Change |
|---|---|---|
| `src/contexts/RestaurantContext.jsx` | CR-078 B13 | Derived value `restaurantTypeFlag` exposed for Receive-pill wiring |

## Current Stock surface (renamed + polished · CR-079 + CR-075-A)

| File | Owning CR | Notes |
|---|---|---|
| `src/components/inventory/CurrentStockPanel.jsx` | CR-079 (rename) + CR-075-A (S1/S2/S3/S5) | Renamed from `InventoryDashboardPanel.jsx`. New: dual-response export, filter clear button, status chips, load-error banner, export spinner |
| `src/pages/InventoryCurrentStockPage.jsx` | CR-079 | Renamed from `InventoryDashboardPage.jsx`. H1 "Current Stock" |

## Stock Audit surface (renamed · CR-079 absorbs CR-075-B)

| File | Owning CR | Notes |
|---|---|---|
| `src/components/inventory/StockAuditPanel.jsx` | CR-079 (renames CR-075-B) | Renamed from `PhysicalCountPanel.jsx`. Same behavior · heading "Stock Audit" |
| `src/pages/StockAuditPage.jsx` | CR-079 | Renamed from `PhysicalCountPage.jsx`. H1 "Stock Audit" |

## Smart Purchase surface (new · CR-078)

| File | Owning CR | Notes |
|---|---|---|
| `src/components/inventory/smart/HorizonPicker.jsx` | CR-078 | 3d/7d/10d/14d/custom chips |
| `src/components/inventory/smart/VendorSuggestionCell.jsx` | CR-078 | Vendor `<select>` + B3 5% override warning icon |
| `src/components/inventory/smart/AutoShoppingList.jsx` | CR-078 | 11-column planner table + G15 ad-hoc typeahead (existing ingredients only) |
| `src/components/inventory/smart/GroupedVendorPreview.jsx` | CR-078 | Per-vendor submit preview + PM select (B1 mandatory) |
| `src/components/inventory/SmartPurchasePanel.jsx` | CR-078 | Orchestrator · 5-parallel fetch · N-sequential submit · partial-success UX |
| `src/pages/SmartPurchasePage.jsx` | CR-078 | Thin wrapper · H1 "Smart Purchase" |

## Intelligence Dashboard (new · CR-079)

| File | Owning CR | Notes |
|---|---|---|
| `src/components/inventory/widgets/ReorderForecastWidget.jsx` | CR-079 | Days-left banding: red ≤3 / amber ≤7 / green >7 |
| `src/components/inventory/widgets/ConsumptionTrendsWidget.jsx` | CR-079 | 30-day recharts LineChart · aggregated · base units |
| `src/components/inventory/widgets/CostTrendWidget.jsx` | CR-079 | Week-over-week rate delta · red/green arrows |
| `src/components/inventory/widgets/RecipeCostMarginWidget.jsx` | CR-079 | FB-7-Q2 colour bands (green ≥50% · amber 30-49% · red <30%) |
| `src/components/inventory/widgets/VendorPerformanceWidget.jsx` | CR-079 | 30d spend + rate delta vs cheapest for shared ingredients |
| `src/components/inventory/widgets/VendorDirectoryWidget.jsx` | CR-079 | Unique vendors · lifetime spend · last purchase date |
| `src/components/inventory/InventoryIntelligencePanel.jsx` | CR-079 | Hosts 6 widgets + 2 locked wastage placeholders + B14 empty-state banner |
| `src/pages/InventoryIntelligencePage.jsx` | CR-079 | H1 "Inventory Intelligence" · new landing at `/inventory-dashboard` |

## Navigation & routing edits

| File | Owning CR | Change |
|---|---|---|
| `src/components/layout/Sidebar.jsx` | CR-078/079/077 | Restructured inventory `children[]` (7 items) · added Receive pill with `featureGate: 'restaurantTypeFlagged'` · destructured `restaurantTypeFlag` from RestaurantContext · extended featureGate branch at 2 render sites |
| `src/App.js` | CR-078/079 | Restructured `/inventory-*` routes · added `/inventory` → `Navigate to="/inventory-dashboard"` · added 302 redirects for legacy `/inventory-purchase` and `/inventory-physical` |

## Files DEFERRED (Phase F skipped per owner ruling)

| File | Status | Rationale |
|---|---|---|
| `src/components/inventory/PurchaseEntryPanel.jsx` | KEPT · superseded by `SmartPurchasePanel.jsx` | Rollback safety · delete in follow-up PR |
| `src/pages/PurchaseEntryPage.jsx` | KEPT · superseded by `SmartPurchasePage.jsx` | Rollback safety · delete in follow-up PR |

Both files still importable via `App.js:173` (`/inventory-purchase` remains routed to `PurchaseEntryPage` as a fallback · legacy 302 covers user-facing URL).

**Follow-up cleanup CR:** delete these two files + remove the `App.js` import + remove the redundant route.
