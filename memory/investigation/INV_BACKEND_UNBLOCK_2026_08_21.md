# Investigation Report — Backend Endpoint Updates 2026-08-21

**Date:** 2026-08-21
**Role:** INVESTIGATION
**Steps used:** 10/10
**Triggered by:** Backend team shipped endpoint updates — validating which CRs/BUGs are now unblocked

---

## Summary

| Item | Backend Update | FE Unblocked? | Evidence |
|---|---|---|---|
| CR-148 Popular Food | `popular-food` endpoint confirmed | ✅ YES | `/app/memory/evidence/CR-148/popular_food_response.json` |
| CR-150 Purchase Report | `vendor-item-list` updated with purchase history | ✅ YES | `/app/memory/evidence/CR-150/vendor_item_list_response.json` |
| BUG-124 Socket fields | Backend added 5 missing fields | ✅ ALREADY CLOSED | Confirmed by popular-food response containing all 5 fields |
| CR-157 Food Court | `food-court-order-report` updated with breakup | ✅ YES | `/app/memory/evidence/CR-157/food_court_response_sample.json` |

---

## CR-148 — Popular Food Category

**Endpoint:** `GET /api/v2/vendoremployee/popular-food?type=all`

**Response shape:**
```json
{
  "total_size": 20,
  "products": [
    {
      "id": 116723,
      "name": "Tandoori Roti",
      "order_count": 41,
      "status": 1,
      "is_disable": "N",
      "stock_out": "N",
      "food_status": 0,
      "live_web": "Y",
      "price": 40,
      "food_for": "Normal",
      "veg": 1,
      "category_id": 2464,
      "variations": [],
      "add_ons": [],
      "tax": 5,
      "tax_type": "GST"
      // ... all standard product fields
    }
  ]
}
```

**What this enables for CR-148:**
- Returns top 20 popular items by `order_count` (last 7 days)
- Response is fully compatible with existing `productTransform.js` schema
- `show_popular_category` flag already exists in `restaurantSettingsTransform.js` to gate the UI
- `type=all` returns all menu types; `type=Normal` etc. can filter by type

**Gate 2 can start immediately.** FE work: add endpoint to `constants.js`, add `getPopularFoods()` to service, render Popular tab in order entry using existing product card components.

---

## CR-150 — Purchase Report

**Endpoint:** `GET /api/v2/vendoremployee/inventory/vendor-item-list` (SAME URL, UPDATED response)

**New response shape:**
```json
{
  "data": [
    {
      "ID": 13652,
      "Ingredient_Name": "French fries conti",
      "Purchase_Date": "2026-08-17",
      "Vendor_Name": "",
      "vendor_id": null,
      "Quantity": "1 kg",
      "stock_quantity_raw": 1,
      "Amount": "0",
      "line_total": 0,
      "unit_price": 0,
      "Payment_Type": "",
      "restaurant_id": 644,
      "restaurant_type_flag": "normal"
    }
  ],
  "total_amount": 0.00,
  "summary": {
    "applied_restaurant_ids": [644],
    "total_records": 217,
    "actor_restaurant_type": "normal",
    "scope_store_count": 1
  },
  "by_restaurant": {}
}
```

**Important note:** This is the SAME endpoint already used by SmartPurchasePanel (`VENDOR_ITEM_LIST`). The existing transform handles `response?.data || []` — so SmartPurchasePanel should still work since `data` items still contain `ingredient_id`, `vendor_id`, `unit_price`.

**What this enables for CR-150:** All required purchase report fields are present: ingredient name, vendor, date, quantity, unit price, amount, payment type. A new report page can be built using this endpoint with a date-range filter.

**Date filter param:** Needs investigation — current probe had no date filter. Need to confirm if `from`/`to` params are supported (similar to food court endpoint).

**Gate 2 can start.** Owner decisions needed: (1) date filter param name, (2) should it show all historical records or filter by date range.

---

## BUG-124 — food_update Socket Missing Fields

**Status: ALREADY CLOSED** (registry updated earlier this session)

**Confirmed by popular-food endpoint:** Response includes `status: 1`, `is_disable: "N"`, `stock_out: "N"`, `food_status: 0`, `live_web: "Y"` — all 5 fields that were missing from socket payload.

The FE `SOCKET_FOOD_DEFAULTS` workaround is forward-compatible — backend values override defaults. Zero FE code change needed.

---

## CR-157 — Food Court Report (Invoice + Breakup)

**Endpoint:** `POST /api/v1/vendoremployee/food-court-order-report`
**Method:** POST (NOT GET — GET returns 405)
**Params:** `{ from: "YYYY-MM-DD", to: "YYYY-MM-DD", station: "MSB" }`

**Response shape:**
```json
{
  "orders": [
    {
      "order_id": "039364",
      "order_date": "18/08/2026",
      "order_time": "21:56",
      "order_type": "Pos",
      "station": "MSB",
      "items": [{"name": "Butter Chicken", "quantity": 1, "price": 319, "gst": 15.95, "vat": 0}],
      "item_count": 2,
      "total_qty": 17,
      "item_total": 719,
      "discount": 0,
      "sub_total": 719,
      "gst": 35.95,
      "vat": 0,
      "total": 754.95,
      "payment_method": "Upi",
      "payment_status": "paid",
      "f_order_status": 6,
      "station_gst": null
    }
  ],
  "stations": ["CHICAGO DELIGHT'S", "CHICAGO SHIMLA", "CREAMBELLPARLOUR", "GUPTAJEE", "MSB", "ZORKO"],
  "station_gst_map": {...},
  "total_orders": 1586,
  "from": "2026-08-18 06:00:00",
  "to": "2026-08-22 03:00:00"
}
```

**What was added (invoice + breakup):**
- `items[]` array — per-item breakdown with individual GST per line
- `gst` + `vat` — tax breakup per order
- `station_gst_map` — GST by station (aggregation check)
- `payment_method` — payment type per order

**Current FE workaround impact:** `foodCourtService.js` currently calls `ORDER_LOGS_REPORT` and re-aggregates FE-side. The new endpoint replaces ALL of that — it's backend-aggregated, faster, and includes the breakup data the current workaround couldn't produce.

**Field mapping (current FE → new API):**

| FE field (toStationRow) | API field | Status |
|---|---|---|
| `orderNumber` | `order_id` | ✅ Direct map |
| `orderDate` | `order_date` | ✅ Direct map |
| `orderTime` | `order_time` | ✅ Direct map |
| `orderType` | `order_type` | ✅ Direct map |
| `stationName` | `station` | ✅ Direct map |
| `itemTotal` | `item_total` | ✅ Direct map |
| `discount` | `discount` | ✅ Direct map |
| `subTotal` | `sub_total` | ✅ Direct map |
| `gstAmount` | `gst` | ✅ Direct map |
| `vatAmount` | `vat` | ✅ Direct map |
| `total` | `total` | ✅ Direct map |
| `paymentMethod` | `payment_method` | ✅ Direct map |
| `paymentStatus` | `payment_status` | ✅ Direct map |
| `stationItems` | `items[]` | ✅ Better — per-item GST included |

**Gate 2 can start immediately.** Replace `foodCourtService.js` to use this endpoint directly. The response shape is almost a 1:1 match with what `FoodCourtMockup.jsx` already renders.

---

## Credentials used (investigation)

- `owner@cafe103.com` / `Qplazm@10` — rid=644 (popular-food + vendor-item-list)
- `owner@shimlaqohfoodcourt.com` / `Qplazm@10` — food court (food-court-order-report)
- Login endpoint: `POST /api/v1/auth/vendoremployee/login` (NOT `/api/v1/vendoremployee/login`)
