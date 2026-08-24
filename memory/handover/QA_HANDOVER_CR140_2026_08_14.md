# QA Handover — CR-140 Aggregator Menu Management
**Date:** 2026-08-14  
**Role:** IMPLEMENTATION  
**Registry:** IMPLEMENTED ✅  
**EXIT GATE:** 5/5 PASS  

---

## 1. Inherited Verification Matrix (Self-Test Results)

| # | Edit | File | Verification | Result |
|---|------|------|-------------|--------|
| V1 | E1 | constants.js | AGGREGATOR_SYNC_ENDPOINTS present | ✅ grep: 1 hit |
| V2 | E2 | menuManagementService.js | addFoodAggregator present | ✅ grep: 3 new fns |
| V3 | E2 | menuManagementService.js | getRestaurantClients present | ✅ |
| V4 | E2 | menuManagementService.js | aggregatorStockToggle present | ✅ |
| V5 | E3a | menuManagementTransform.js | swiggy/zomato/clientId/foodStock/turnOnAt in fromAPI | ✅ grep: 8 hits |
| V6 | E3b | menuManagementTransform.js | conditional spread in toAPI.foodInfo | ✅ |
| V7 | E4 | AggregatorStockToggle.jsx | file exists | ✅ |
| V8 | E5 | ProductCard.jsx | AggregatorStockToggle imported | ✅ grep: 2 hits |
| V9 | E8 | BulkEditor.jsx | getColumns replaces ALL_COLUMNS (9 refs) | ✅ grep: 9 hits |
| V10 | E8 | BulkEditor.jsx | isDirty has swiggy/zomato/clientId | ✅ |
| V11 | E8 | BulkEditor.jsx | CellRenderer clientId branch | ✅ |
| V12 | E9 | MenuManagementPanel.jsx | fetchClients + separate useEffect | ✅ grep: 7 hits |
| V13 | ALL | — | webpack compiled 0 new warnings | ✅ |

---

## 2. Browser Test Cases (for QA agent)

**Test credentials:** `owner@thegoankitchen.com` / `Qplazm@10` (has Aggregator menu type + sub-brand "mallu goan")  
**URL:** `https://react-pos-frontend-10.preview.emergentagent.com`

### T1 — Platform Sync section visible in Aggregator mode
1. Login → Dashboard → Menu icon (or navigate to menu management)
2. Change menu type dropdown to "Aggregator"
3. Click "+ Add Product"
**Expected:** "Platform Sync" section visible at top of form (Swiggy toggle, Zomato toggle, Brand dropdown with "Main Brand" + "mallu goan")

### T2 — Platform Sync section hidden in Normal mode
1. Set menu type to "Normal"
2. Click "+ Add Product"
**Expected:** No "Platform Sync" section. Only standard form sections.

### T3 — Swiggy/Zomato chips on aggregator food cards
1. Switch to "Aggregator" menu type
2. View existing aggregator foods
**Expected:** Cards show "Swiggy ✓" + "Zomato ✓" chips (green) instead of Dine-In/Delivery/Takeaway

### T4 — Stock toggle button visible on aggregator cards
1. In Aggregator menu view
**Expected:** Each food card shows "● Live ▾" green button

### T5 — Disable popover opens with timing options
1. Click "● Live ▾" on any aggregator food card
**Expected:** Popover with: Indefinitely, 30m, 1h, 2h, 6h, 12h, 1d, 7d, Custom

### T6 — Stock disable with 2h preset fires correct payload
1. Click Live ▾ → select "2 hours" → click Disable
**Expected:** Network: POST /aggregator-sync/stock-toggle with `{action:"disable", item_ids:[...], turn_on_preset:"2h"}`

### T7 — Normal mode cards: Dine-In/Delivery/Takeaway chips unchanged
1. Switch to "Normal" menu type
**Expected:** Cards show Dine-In/Delivery/Takeaway chips (no Swiggy/Zomato, no stock toggle button)

### T8 — Add aggregator food fires add-food-aggregator endpoint
1. Aggregator mode → Add Product → fill name/price/category, toggle Swiggy/Zomato
2. Save
**Expected:** Network: POST /product/add-food-aggregator (NOT /add-food)  
**Expected payload:** includes `swiggy:"YES"`, `zomato:"YES"`, `client:0`

### T9 — Bulk Edit: Swiggy/Zomato/Brand columns visible in Aggregator mode
1. Aggregator mode → Bulk Edit button
**Expected:** Swiggy, Zomato, Brand columns visible in spreadsheet (tier 1, default visible)

### T10 — Bulk Edit: columns absent in Normal mode
1. Normal mode → Bulk Edit
**Expected:** No Swiggy, Zomato, Brand columns

### T11 — Quick Edit: platform row visible in Aggregator mode
1. Aggregator mode → hover food card → ⚡ Quick Edit
**Expected:** Compact Swiggy/Zomato/Brand selects shown at top of quick edit form

### T12 — Brand selector populated from API
1. Aggregator mode → Add Product → Platform Sync section
**Expected:** Brand dropdown shows "Main Brand" + "mallu goan" (from GET /restaurant-clients)

### R1 — Normal menu add/edit unchanged (regression)
1. Normal mode → Add Product → fill form → Save
**Expected:** Network: POST /product/add-food (multipart, not add-food-aggregator)

### R2 — Normal mode chips intact (regression)
**Expected:** Dine-In/Delivery/Takeaway chips still present on Normal mode cards

---

## 3. Registry Sync Confirmation
- Registry: CR-140 → IMPLEMENTED / pos_5_1 ✅
- EXIT GATE: ALL 5 PASSED ✅

## 4. Credentials
- URL: https://react-pos-frontend-10.preview.emergentagent.com  
- Account: `owner@thegoankitchen.com` / `Qplazm@10`
- Also valid: `owner@18march.com` / `Qplazm@10`
