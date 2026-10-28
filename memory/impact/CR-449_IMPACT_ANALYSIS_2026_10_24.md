# CR-449 — Impact Analysis (Gate 2)
## Item Station With Category Fallback — Frontend

**ID:** CR-449
**Date:** 2026-10-24
**Code Reality:** PARTIAL — category-level station works; per-item override NOT wired
**Conflict Pre-Check:** CLEAN — no open items touch these same files at IMPLEMENTED status
**Risk:** MEDIUM (menu management scope, no financial impact)

---

## 1. What Changed on the Backend

Backend added a `restaurant_printer_id` column to the `food` table. Each food item can now optionally override which kitchen station (printer) it routes to, instead of always inheriting from its category.

**Resolution logic (backend):**
1. If `food.restaurant_printer_id` is set and points to a valid printer → use it (source: `"item"`)
2. Otherwise fall back to `restaurant_printer_category` mapping → use that (source: `"category"`)
3. If neither exists → `"OTHER"` (source: `"none"`)

**New fields returned per food item in product/menu/socket responses:**
```json
{
  "restaurant_printer_id": null,           // saved item-level override (null = use category)
  "station_name": "KDS",                  // display name of the EFFECTIVE station
  "effective_restaurant_printer_id": 951,  // resolved printer ID (from item or category)
  "station_source": "category"             // "item" | "category" | "none"
}
```

**Write contract:**
- Add/Edit food: include `restaurant_printer_id` in payload
- Send `null`/`0`/`""`  → clear override, fall back to category
- Omit field on edit → preserve current value (no change)

---

## 2. Current FE Code Reality

### READ path (API → transform → context → UI)

| File | Current | Gap |
|------|---------|-----|
| `productTransform.js:106` | `station: api.station_name \|\| null` | ⚠️ Only reads `station_name`. Does NOT map `restaurant_printer_id`, `effective_restaurant_printer_id`, or `station_source`. **BUT** since backend now returns the *effective* `station_name` (resolved), the existing field already carries the correct value for display and KOT routing. |
| `menuManagementTransform.js:80` | Comment: "Station — managed at category level, not food level" | ❌ No food-level station fields mapped. |
| `ProductCard.jsx:369` | Comment exists ("Station + Price + Actions") but no station badge rendered | ❌ No visual station indicator per food item. |
| `BulkEditor.jsx` | No station column for food items | ❌ Cannot bulk-edit station. |
| `OrderEntry.jsx:80` | `station: product.station \|\| 'kitchen'` | ✅ Already reads `product.station` which comes from `productTransform:106`. Since backend now returns the effective `station_name`, KOT routing already works without changes. |

### WRITE path (UI → transform → API)

| File | Current | Gap |
|------|---------|-----|
| `menuManagementTransform.js toAPI.foodInfo()` | No `restaurant_printer_id` in payload | ❌ Cannot send item-level station override to backend. |
| `menuManagementService.js addFood()` | Sends `food_info` JSON — no `restaurant_printer_id` | ❌ Not included in add payload. |
| `menuManagementService.js editFood()` | Same — no `restaurant_printer_id` | ❌ Not included in edit payload. |
| `menuManagementService.js addFoodAggregatorMultipart()` | Flat multipart fields — no `restaurant_printer_id` | ❌ Not included. |
| `menuManagementService.js editFoodAggregator()` | Same — no `restaurant_printer_id` | ❌ Not included. |
| `ProductForm.jsx` | No station picker/dropdown for food items | ❌ No UI to assign station. |

### Existing pattern to follow (category level)

`CategoryList.jsx:26-58` already has a station picker for categories:
- Reads `stations` list from props
- Dropdown with station options
- Sends `stationName` + `printerId` on category add via `menuService.addCategory()`

This same pattern should be reused for food-level override.

---

## 3. Downstream Consumers

| Consumer | Uses `product.station` | Impact |
|----------|----------------------|--------|
| `OrderEntry.jsx:80` | Cart item station for KOT routing | ✅ NO CHANGE — already reads `product.station` which is the effective station_name |
| `OrderCard.jsx:204` | `getStationsFromOrderItems()` | ✅ NO CHANGE — reads station from product catalog |
| `TableCard.jsx:170` | `getStationsFromOrderItems()` | ✅ NO CHANGE |
| `stationService.js:29` | `extractUniqueStations(products)` | ✅ NO CHANGE — reads `product.station` |
| `LoadingPage.jsx` | Uses products for station discovery | ✅ NO CHANGE |
| `StationMappingTab.jsx` | Category-level station config | ✅ NO CHANGE — separate from food-level |
| `printerAgentSelector.js` | Matches cart station → printer agent | ✅ NO CHANGE — reads `item.station` from cart |

**Key insight:** Because `productTransform.js:106` already reads `api.station_name`, and the backend now returns the *effective* station_name (resolved from item or category), **all downstream KOT routing, station views, and order cards already work correctly without any changes.**

The only work needed is in the **Menu Management UI** — giving owners the ability to set/clear the per-item override.

---

## 4. Files WILL Change

| # | File | Change | Lines (est) |
|---|------|--------|:-----------:|
| 1 | `productTransform.js` | Add `restaurantPrinterId`, `effectiveRestaurantPrinterId`, `stationSource` to product mapping | +3 |
| 2 | `menuManagementTransform.js` | Add same 3 fields to `fromAPI.food()` + add `restaurant_printer_id` to `toAPI.foodInfo()` | +6 |
| 3 | `menuManagementService.js` | Add `restaurant_printer_id` to aggregator `FOOD_INFO_KEYS` or flat field | +2 |
| 4 | `ProductForm.jsx` | Add "Station Assignment" section with dropdown ("Category Default" + station list) + override badge | +30 |
| 5 | `ProductCard.jsx` (QuickEditForm) | Add station dropdown to the quick edit form + visual badge for inherited vs overridden | +25 |
| 6 | `BulkEditor.jsx` | Add "Station" column (type: dropdown) after CATEGORY, before PRICE. Column shows inherited station with override dropdown. Render inherited (gray pill) vs overridden (blue pill) states. Wire save to include `restaurant_printer_id`. | +45 |
| 7 | `ProductList.jsx` | Pass stations list down to ProductCard/QuickEdit for the dropdown options | +3 |

**Total: 7 files, ~114 lines**

## 5. Files WILL NOT Touch

`OrderEntry.jsx` · `OrderCard.jsx` · `TableCard.jsx` · `stationService.js` · `LoadingPage.jsx` · `printerAgentSelector.js` · `CollectPaymentPanel.jsx` · `CartPanel.jsx` · `orderTransform.js` · `CategoryList.jsx` · any `.env`

---

## 6. Owner Decisions — RESOLVED

| OD | Question | Resolution |
|----|----------|------------|
| **OD-449-01** | Is the backend deployed to preprod? | ✅ YES — probed 2026-10-24. All 4 fields live (restaurant_printer_id, station_name, effective_restaurant_printer_id, station_source). 336 foods, all category-sourced. |
| **OD-449-02** | Station badge on ProductCard? | ✅ YES — owner wants visual indicator |
| **OD-449-03** | BulkEditor station column? | ✅ YES — owner explicitly requested. Column after CATEGORY, before PRICE. |
| **OD-449-04** | QuickEdit station field? | ✅ YES — owner explicitly requested. |

---

## 7. Risk Register

| # | Risk | Level | Mitigation |
|---|------|-------|------------|
| R-1 | Setting item override permanently instead of using category default | LOW | UI sends `null` for "Category Default" option; backend clears override |
| R-2 | Stale station in cart after item reassignment | LOW | Cart reads from product catalog at add-time; station view refresh covers this |
| R-3 | Aggregator food add/edit missing the field | LOW | Add `restaurant_printer_id` to flat multipart fields or FOOD_INFO_KEYS |
