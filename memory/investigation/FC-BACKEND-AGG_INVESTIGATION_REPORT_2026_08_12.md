# FC-BACKEND-AGG — Investigation Report (FINAL)
# Food Court: Backend Aggregation Endpoint Analysis

**Date:** 2026-08-12  
**Role:** INVESTIGATION (Role 6)  
**Steps used:** 10/10  
**Confidence:** HIGH — endpoint probed, response shape fully confirmed

---

## 1. Confirmed API Contract

**Endpoint:** `POST https://preprod.mygenie.online/api/v1/vendoremployee/top-food%20sales-report`  
*(also live on manage.mygenie.online — same auth)*

**Request:**
```json
{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }
```

**Response shape:**
```json
{
  "food_sales_report": [
    {
      "food_item": "Cappuccino",
      "station_name": "KDS",
      "category_name": "Grounds & Leaves",
      "complementary_status": "No",
      "total_quantity": "7",       // STRING — need parseFloat()
      "item_price": "1330.00",     // STRING
      "variation_price": "0.00",   // STRING
      "addon_price": "0.00",       // STRING
      "gst": "66.50",              // STRING
      "vat": "0.00",               // STRING
      "service_charge": "0.00",    // STRING
      "discount": "0.00",          // STRING
      "complementary_price": "0.00",// STRING
      "total_sales": "1396.50"     // STRING
    }
    // ... one row per food_item × station_name
  ],
  "total_sales": 23329.95,          // NUMBER at root (grand total)
  "from": "2026-08-03 06:00:00",    // Business-day start (not calendar midnight)
  "to":   "2026-08-04 03:00:00"     // Business-day end
}
```

**Key characteristics:**
- Grain: **food_item × station_name** (NOT per-order)
- Rows sorted by `total_sales` DESC (backend handles it)
- ALL row-level numeric fields are **strings** — must parseFloat() in transform
- Root `total_sales` is a **number** (different type — inconsistency)
- Business-day aware: `from`/`to` reflect actual business hours, not calendar midnight
- Response for Aug 3 (cafe103): 64 rows, 1 station (KDS), ₹23,329.95 total

**Evidence:** `/app/memory/evidence/FC-BACKEND-AGG/api_response_cafe103.json`

---

## 2. Current FoodCourtMockup.jsx — What It Does

```
Current flow: ORDER-LOGS-REPORT → FE aggregation → per-order rows per station
Grain: one row = one ORDER (filtered to items belonging to selected station)
Fields shown: Order ID, Date, Time, Items text, Item Count, Qty, Payment Type,
              Item Total, Discount, Sub Total, GST, Total
Extra: Audit tab with per-order × per-station drift matrix
       OrderDetailSheet (click row → full order detail)
       Settled tab (fOrderStatus === 6 filter)
Weakness: Long ranges → 12 batched API calls, large payloads, batch progress bar
```

---

## 3. Possibility & Gap Matrix (Final)

### ✅ FULLY POSSIBLE

| # | Feature | Notes |
|---|---|---|
| P1 | Date range + presets (Today, 7D, 30D, MTD, 1Y, FY) | Exact same header UI — no change |
| P2 | Station filter dropdown | `station_name` field exists on every row — filter rows where `station_name === selected` |
| P3 | KPI strip | Sum from filtered rows: Total Qty sold, Gross Revenue (item+variation+addon), Discount, GST, Net Sales |
| P4 | Food Item table | Columns: Food Item, Category, Station, Qty, Gross, Discount, GST, VAT, Service Charge, Net Sales |
| P5 | Sort by any column | All fields available for FE sort |
| P6 | Search / filter | Filter rows by `food_item` or `category_name` text |
| P7 | Group by Station | Since `station_name` is a field, can render station-wise accordion sections |
| P8 | Group by Category | `category_name` field exists |
| P9 | Complementary filter | `complementary_status` = "Yes"/"No" → can add toggle |
| P10 | Excel / PDF export | All 14 fields available for column mapping |
| P11 | Single API call for ANY date range | No batching needed — backend handles aggregation. 1-year range = 1 call |
| P12 | No base URL change | Endpoint is on `preprod.mygenie.online` — same `REACT_APP_API_BASE_URL` |

---

### ❌ NOT POSSIBLE from this endpoint

| # | Gap | Reason | Impact |
|---|---|---|---|
| G1 | Per-order rows | API returns food-item aggregates, not individual orders | "All Orders" tab as currently designed cannot be replicated |
| G2 | Order ID, Date, Time, Payment Type | No per-order data in response | Table grain must change from order-level → item-level |
| G3 | Audit tab (drift matrix) | Requires per-order × per-item × per-station detail | Audit tab must be removed or redesigned as Category Summary |
| G4 | Settled vs All filter | No `fOrderStatus` field | Cannot filter by settlement status |
| G5 | OrderDetailSheet click-through | No order detail available | Row click cannot open order slide-out |
| G6 | Real-time qty (e.g. items sold this hour) | Aggregated totals only | Not a gap for reports use case |

---

## 4. Recommended UI Design for the New Screen

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: [← Back] Food Sales Report                            │
│          [Station ▾] [From ──── To] [Apply] [7D 30D MTD FY]   │
│          [Download ▾]                                           │
├─────────────────────────────────────────────────────────────────┤
│  KPI STRIP (4 cards):                                           │
│  [Items Sold: 64] [Gross: ₹24,500] [Discount: ₹700]           │
│  [GST: ₹1,165]   [Net Sales: ₹23,329]                         │
├─────────────────────────────────────────────────────────────────┤
│  TABS: [All Items] [By Station] [By Category]                   │
├─────────────────────────────────────────────────────────────────┤
│  TABLE:                                                         │
│  Food Item | Category | Station | Qty | Gross | Disc | GST |  │
│  VAT | Complementary | Net Sales                               │
│  ─────── TOTALS row (sticky) ───────────────────────────────── │
│  Cappuccino  | Grd & Lvs | KDS | 7 | ₹1,330 | ₹0 | ₹66.50 │
│  Farmhouse P | Pizza     | KDS | 1 | ₹500   | ₹0 | ₹25.00 │
└─────────────────────────────────────────────────────────────────┘
```

**Tabs:**
- `All Items` — flat table, sorted by Net Sales desc
- `By Station` — accordion per station, each station's items + subtotal
- `By Category` — accordion per category, items + subtotal

---

## 5. Transform Spec (for new `topFoodSalesService.js`)

```javascript
// All row numeric fields are STRINGS — must parseFloat
const parseRow = (r) => ({
  foodItem:          r.food_item,
  stationName:       r.station_name,
  categoryName:      r.category_name,
  complementary:     r.complementary_status === 'Yes',
  totalQuantity:     parseFloat(r.total_quantity)  || 0,
  itemPrice:         parseFloat(r.item_price)       || 0,
  variationPrice:    parseFloat(r.variation_price)  || 0,
  addonPrice:        parseFloat(r.addon_price)      || 0,
  grossRevenue:      parseFloat(r.item_price)
                   + parseFloat(r.variation_price)
                   + parseFloat(r.addon_price),
  gst:               parseFloat(r.gst)              || 0,
  vat:               parseFloat(r.vat)              || 0,
  serviceCharge:     parseFloat(r.service_charge)   || 0,
  discount:          parseFloat(r.discount)         || 0,
  complementaryPrice:parseFloat(r.complementary_price) || 0,
  totalSales:        parseFloat(r.total_sales)      || 0,
});

// Root total_sales is already a number (but verify)
const grandTotal = parseFloat(d.total_sales) || 0;
const stations   = [...new Set(rows.map(r => r.stationName))].sort();
const categories = [...new Set(rows.map(r => r.categoryName))].sort();
```

---

## 6. Files That Will Need to Change

| File | Action | Notes |
|---|---|---|
| `src/api/services/topFoodSalesService.js` | **CREATE NEW** | Replaces `foodCourtService.js` for this report |
| `src/api/constants.js` | **ADD** `TOP_FOOD_SALES_REPORT` endpoint | One line addition |
| `src/pages/reports-module/TopFoodSalesReport.jsx` | **CREATE NEW** | New screen (can reuse header/KPI patterns from FoodCourtMockup) |
| `src/App.js` | **ADD** route | `/reports-module/food-sales` |
| `src/components/layout/Sidebar.jsx` | **ADD** nav link | Link to new screen |

**Files NOT touched:**
- `FoodCourtMockup.jsx` — keep existing screen as-is
- `foodCourtService.js` — keep as-is
- `orderTransform.js` — not involved
- All financial/order screens — zero regression risk

---

## 7. Summary

```
Investigation complete: FC-BACKEND-AGG
Root cause of current FE slowness: batched order-logs fetch, no BE aggregation
New endpoint: CONFIRMED LIVE on preprod.mygenie.online
Response shape: food_item × station (14 fields, all row numerics are strings)
GAP-1 (shape unknown): RESOLVED ✅
GAP-2 (per-order rows): CONFIRMED — not possible from this endpoint
GAP-3 (audit drift): CONFIRMED — not possible from this endpoint

RECOMMENDATION:
  Build NEW screen TopFoodSalesReport.jsx using this endpoint
  Keep existing FoodCourtMockup.jsx untouched
  New screen: item-level table, station/category grouping, single API call

Confidence: HIGH
Files: 5 (3 new, 2 modified — no hotspot files)
Risk: MEDIUM (new report screen, no financial/order logic)
Planning skip eligible: YES for new screen (no hotspot files, no financial logic)
Next: Owner GO → Implementation
```
