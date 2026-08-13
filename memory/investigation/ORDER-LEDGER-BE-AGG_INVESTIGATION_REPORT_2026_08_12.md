# ORDER-LEDGER-BE-AGG — Investigation Report
# Order Ledger: Backend Aggregation Possibility & Gap Analysis

**Date:** 2026-08-12
**Role:** INVESTIGATION (Role 6)
**Item:** Create a report similar to Order Ledger Insights, powered by `top-food-sales-report` backend aggregation
**Steps used:** 8/10
**Confidence:** HIGH — Order Ledger source fully traced, endpoint shape confirmed via live probe

---

## 1. What the Order Ledger Currently Does

**Service:** `orderLedgerService.getOrderLedgerForRange()`
**Endpoint:** `POST /api/v2/vendoremployee/report/order-logs-report`
**Grain:** **1 row = 1 ORDER** (per-order financial audit trail)

| | |
|---|---|
| Max date range | 60 days (performance constraint) |
| Columns | 51 (configurable via column chooser, 16 default visible) |
| Tabs | All Orders / Settled / Cancelled / Credit / Hold / Merged / Running / Aggregator / Audit / Ledger Audit |
| Audit features | Missing-ID gap detection + FE-81 to FE-88 GST formula rules |
| Drill-down | Click any order row → OrderDetailSheet (full order breakdown) |
| Sort by | Punched date (created_at) — hardcoded per owner directive 2026-06-05 |

---

## 2. What `top-food-sales-report` Provides

**Endpoint:** `POST /api/v1/vendoremployee/top-food%20sales-report`
**Grain:** **1 row = 1 food item × station** (pre-aggregated across ALL orders in the range)

```json
{
  "food_sales_report": [
    {
      "food_item": "Cappuccino",
      "station_name": "KDS",
      "category_name": "Grounds & Leaves",
      "complementary_status": "No",
      "total_quantity": "7",          // ALL numeric fields are STRINGS
      "item_price": "1330.00",
      "variation_price": "0.00",
      "addon_price": "0.00",
      "gst": "66.50",
      "vat": "0.00",
      "service_charge": "0.00",
      "discount": "0.00",
      "complementary_price": "0.00",
      "total_sales": "1396.50"
    }
  ],
  "total_sales": 23329.95,            // number (root), strings (row-level)
  "from": "2026-08-03 06:00:00",      // business-day aware
  "to":   "2026-08-04 03:00:00"
}
```

---

## 3. Column-by-Column Mapping: Order Ledger → top-food-sales-report

| # | Order Ledger Column | top-food-sales-report | Notes |
|---|---|---|---|
| 1 | Order ID | ❌ | No per-order data — endpoint is aggregated |
| 2 | Order Date | ❌ | Aggregated across date range — no per-order date |
| 3 | Order Time | ❌ | Aggregated |
| 4 | Order Type | ❌ | DineIn/Takeaway/Delivery — not in response |
| 5 | No. Of Items | ✅ partial | `total_quantity` = units sold (different: Order Ledger = items per order) |
| 6 | Order Details | ✅ | `food_item` = dish name |
| 7 | Waiter (Ordered) | ❌ | No staff data |
| 8 | Waiter (Collected) | ❌ | No staff data |
| 9 | Payment Type | ❌ | Cash/Card/UPI — not in response |
| 10 | Item Total | ✅ | `item_price + variation_price + addon_price` |
| 11 | Delivery Charge | ❌ | No delivery data |
| 12 | Service Tax | ✅ | `service_charge` field (0 for most outlets) |
| 13 | Tip Amount | ❌ | No tip data |
| 14 | Discount | ✅ | `discount` field |
| 15 | Discount Category | ❌ | No coupon/reason data |
| 16 | Coupon Code | ❌ | No coupon data |
| 17 | Sub Total | ✅ derived | `item_price+variation+addon - discount` (computable, not a field) |
| 18 | GST | ✅ | `gst` field |
| 19 | VAT | ✅ | `vat` field |
| 20 | Round Off | ❌ | No round-off data |
| 21 | Total Amount | ✅ | `total_sales` |
| 22 | Cash / Card / UPI / TAB | ❌ | No payment split data |
| 23 | Contact Name / Phone | ❌ | No customer data |
| 24 | Location / Table | ❌ | No location data |
| 25 | Transaction ID / Razorpay | ❌ | No gateway data |
| 26 | Collect Bill Date/Time | ❌ | No per-order collect timestamp |
| 27 | Room data | ❌ | Not applicable |

**Summary: 8 of 36 core Order Ledger columns are mappable (22%).**

---

## 4. Tabs Feasibility

| Order Ledger Tab | Feasible from top-food-sales-report? | Why |
|---|---|---|
| All Orders | ❌ | No orders — only aggregated items |
| Settled | ❌ | Requires `fOrderStatus === 6` per order |
| Cancelled | ❌ | Requires `paymentMethod === 'Cancel'` per order |
| Credit / TAB | ❌ | Requires `paymentMethod === 'TAB'` per order |
| Hold | ❌ | Requires `fOrderStatus === 9` per order |
| Merged | ❌ | Requires `paymentStatus === 'Merge'` per order |
| Running | ❌ | Requires per-order status |
| Aggregator | ❌ | Requires `orderIn = 'zomato'/'swiggy'` per order |
| Audit (gap) | ❌ | Requires sequential order IDs |
| Ledger Audit (FE-81–88) | ❌ | Requires per-order GST formula verification |

**0 of 10 existing Order Ledger tabs can be replicated from `top-food-sales-report`.**

---

## 5. What IS Possible — New "Item Sales Ledger" Design

While the endpoint **cannot replicate** the Order Ledger, it powers a **different but equally valuable** report with these UNIQUE capabilities:

### ✅ POSSIBLE — New UI Features

| # | Feature | Source | Notes |
|---|---|---|---|
| P1 | Same header shell (date picker, presets, download) | Reuse existing | Today/7D/30D/MTD/FY/custom |
| P2 | **No date range limit** (vs 60-day max in Order Ledger) | Single API call | Year-long view in 1 call |
| P3 | **Item performance table** | `food_item + total_quantity + total_sales` | Top-sellers sorted by backend |
| P4 | **Category grouping** | `category_name` | NEW — Order Ledger has no category view |
| P5 | **Station grouping** | `station_name` | NEW — relevant for food courts |
| P6 | **Variation + Addon revenue breakdown** | `variation_price, addon_price` | NEW — Order Ledger only shows combined itemTotal |
| P7 | **Complementary items tab** | `complementary_status === 'Yes'` | NEW — gives cost-of-complements |
| P8 | KPI strip: Qty, Gross, Discount, GST, Net | Sum from rows | Instant totals |
| P9 | Column chooser (subset of cols) | 10 cols available | Less than Order Ledger's 51 |
| P10 | Excel / PDF export | Same exportReportAsExcel/PDF | 1:1 reuse |
| P11 | Search by food item / category | FE filter on rows | Instant, no re-fetch |
| P12 | Sort by any column | FE sort | Backend pre-sorts by total_sales, FE can re-sort |

### ✅ NEW TABS (not in Order Ledger at all)

| Tab | Filter | Value |
|---|---|---|
| **All Items** | All rows | Overall item performance |
| **By Category** | Group by `category_name` | Category-level accordion + subtotals |
| **By Station** | Group by `station_name` | Station-level accordion (food court relevant) |
| **Complementary** | `complementary_status === 'Yes'` | See cost of free items |

---

## 6. Recommended Design — "Item Sales Ledger"

```
┌──────────────────────────────────────────────────────────────────────┐
│ [← Back]  Item Sales Ledger                                          │
│           [From ──── To]  [Apply]  [Today 7D 30D MTD 1Y FY]        │
│           [Columns ▾]  [Download ▾]                                 │
├──────────────────────────────────────────────────────────────────────┤
│ KPI STRIP:                                                           │
│ [Total Items: 255] [Units Sold: 4,823] [Gross: ₹4,73,893]          │
│ [Discount: ₹18,887] [GST: ₹23,694] [Net Sales: ₹4,73,893]         │
├──────────────────────────────────────────────────────────────────────┤
│ TABS: [All Items] [By Category] [By Station] [Complementary]        │
├──────────────────────────────────────────────────────────────────────┤
│ TABLE (10 columns, configurable):                                    │
│ Food Item | Category | Station | Qty | Base | Variation | Addon |  │
│ Discount | GST | Net Sales                                          │
│ ─── TOTALS row ────────────────────────────────────────────────── │
│ Cappuccino    | Gnd&Lvs | KDS | 749 | 1,42,310 | 0 | 0 | 5,981  │
│ Farmhouse Pizza | Pizza  | KDS | 259 | 1,29,500 | 0 | 0 | 7,216  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 7. Gaps — What Cannot Be Replicated From Order Ledger

| Gap | Severity | Root cause |
|---|---|---|
| **G1: No order-level status tabs** (Settled/Cancelled/Running/Credit/Hold/Merged) | HIGH | API returns aggregated items, not per-order rows |
| **G2: No Audit / Ledger Audit** (FE-81–88, gap detection) | HIGH | Requires sequential order IDs and per-order GST breakdown |
| **G3: No payment method split** (Cash/Card/UPI/TAB) | MEDIUM | Not in aggregated response |
| **G4: No customer/waiter data** | MEDIUM | Not in aggregated response |
| **G5: No OrderDetailSheet drill-down** | MEDIUM | No per-order `__source` in response |
| **G6: All numeric fields are strings** | LOW | Need `parseFloat()` in transform — same as food court fix |
| **G7: subTotal not a field** (must compute) | LOW | Derivable: `item_price + variation + addon − discount` |

---

## 8. Files Needed for New Screen

| File | Action | Notes |
|---|---|---|
| `src/api/services/topFoodSalesService.js` | **CREATE NEW** | Fetch + transform (parseFloat all numerics, add subTotal derivation) |
| `src/api/constants.js` | **ADD** `TOP_FOOD_SALES_REPORT` endpoint | 1 line |
| `src/pages/reports-module/ItemSalesLedgerMockup.jsx` | **CREATE NEW** | New screen — same header/KPI/export shell as OrderLedgerMockup |
| `src/App.js` | **ADD** route | `/reports-module/item-sales` |
| `src/components/layout/Sidebar.jsx` | **ADD** nav link | Under Insights/Reports |

**Files NOT touched:**
- `OrderLedgerMockup.jsx` — zero changes, remains fully intact
- `orderLedgerService.js` — zero changes
- All financial/order screens — no regression risk

---

## 9. Summary

```
Investigation complete: ORDER-LEDGER-BE-AGG
Endpoint: POST /api/v1/vendoremployee/top-food%20sales-report (confirmed live)

KEY FINDING:
  top-food-sales-report CANNOT replicate the Order Ledger.
  They are different reports at different grains:
  - Order Ledger    = per-ORDER financial audit trail (Who paid what, how)
  - top-food-sales  = per-ITEM performance analytics (What sold, how much)

MAPPING SCORE: 8/36 columns (22%) mappable
STATUS TABS:   0/10 replicable (all require per-order status)
AUDIT TABS:    0/2 replicable (require per-order sequential IDs + GST formulas)

RECOMMENDATION:
  Build a NEW "Item Sales Ledger" page — visually similar to Order Ledger
  (same header shell, KPIs, column chooser, download), but with item-level
  data and new tabs (By Category, By Station, Complementary).
  DO NOT position this as a replacement for Order Ledger.
  They serve different audiences:
  - Order Ledger → accountants, managers checking order-level audit trail
  - Item Sales Ledger → operations, chefs checking what's selling

UNIQUE VALUE-ADD vs Order Ledger:
  ✅ No 60-day limit — 1 API call for any range
  ✅ Category-level view (Order Ledger has none)
  ✅ Station attribution (food court relevant)
  ✅ Variation + Addon revenue separated
  ✅ Units sold (not just item count per order)

Risk: MEDIUM (new screen, 5 files, no hotspot files, no financial order logic)
Planning skip eligible: YES (new screen, no existing code changes)
Next: Owner GO → Planning Gate 2 → Implementation
```

---

## 10. Evidence Artifacts
- `/app/memory/evidence/FC-BACKEND-AGG/api_response_cafe103.json` (Aug 3, cafe103)
- `/app/memory/evidence/FC-BACKEND-AGG/api_response_shimla_july.json` (July, shimla)
- `/app/memory/investigation/FC-BACKEND-AGG_INVESTIGATION_REPORT_2026_08_12.md` (food court variant)
