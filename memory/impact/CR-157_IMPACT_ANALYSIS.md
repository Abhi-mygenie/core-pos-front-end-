# CR-157 — Food Court Report (Beta — New Dedicated Endpoint)
## Gate 2: Impact Analysis (v2 — Updated 2026-08-22)

**Date:** 2026-08-22 (updated from 2026-08-21 original)
**Role:** PLANNING agent
**Stage:** Gate 2 — Impact Analysis COMPLETE
**Risk:** LOW–MEDIUM (new isolated page, no existing files touched)
**Code Reality:** NONE
**Evidence:** `/app/memory/evidence/CR-157/food_court_response_updated_2026_08_22.json`

---

## Scope

**CR-157 is a BRAND NEW report page** using the dedicated backend endpoint.
`FoodCourtMockup.jsx` and `foodCourtService.js` (CR-013 era) are **NOT touched**.

---

## Owner Decisions — ALL RESOLVED (2026-08-22)

| # | Question | Answer |
|---|---|---|
| OQ-1 | `station_gst_map` null — show per-station GST? | **RESOLVED** — backend populated. Show as column in table AND next to station name in selector |
| OQ-2 | Pagination or all-in-one? | All-in-one acceptable |
| OQ-3 | Sidebar label | "Food Court Beta" |
| Q1 | Audit tab? | **NO** — skip entirely. Only "All Orders" + "Settled" tabs |
| Q2 | `station_gst` display | **BOTH**: (A) column in table + (B) shown next to station name in selector — **null GST: show name only** (no "· —") |
| Q3 | `sort_by` param | **Always `"collect_bill"`** — hardcoded in request body |
| Q4 | Date presets | **Same 6 as existing**: Today / 7D / 30D / MTD / 1Y / FY |
| Q5 | Page H1 title | **"Food Court"** — same title as existing page |
| Q6 | STATION GST column position | **After ORDER ID** (position 2 in table) |

---

## Step 1 — Conflict Pre-Check

| File | Last Modifier | Open Conflict? |
|---|---|---|
| `FoodCourtMockup.jsx` | CR-013 era | **NOT TOUCHED** |
| `foodCourtService.js` | BUG-296 2026-08-06 | **NOT TOUCHED** |
| `api/constants.js` | BUG-327 (closed) | Clean — additive only |
| `components/layout/Sidebar.jsx` | CR-041 (closed) | Clean — additive entry |
| `App.js` | CR-150 agent 2026-08-22 | Clean — additive route |

---

## Step 2 — Updated Endpoint Contract (live-probed 2026-08-22)

**Endpoint:** `POST /api/v1/vendoremployee/food-court-order-report`

### Request body
```json
{
  "from": "YYYY-MM-DD",
  "to": "YYYY-MM-DD",
  "station": "CHICAGO DELIGHT'S",   ← omit for station-list-only call
  "sort_by": "collect_bill"          ← always send this
}
```

### Response — No station (Step 1: get station list)
```json
{
  "orders": [],
  "stations": ["CHICAGO DELIGHT'S", "CHICAGO SHIMLA", "CREAMBELLPARLOUR", "GUPTAJEE", "MSB", "ZORKO"],
  "station_gst_map": {
    "CHICAGO DELIGHT'S": "GST666666",
    "CHICAGO SHIMLA": null,
    "CREAMBELLPARLOUR": "GST222222",
    "GUPTAJEE": "GST555555",
    "MSB": "GST111111",
    "ZORKO": "GST444444"
  },
  "total_orders": 0,
  "from": "2026-08-01T...",
  "to": "2026-08-22T..."
}
```

### Response — With station (Step 2: get orders)
```json
{
  "orders": [
    {
      "order_id": "039368",
      "display_order_id": "#039368#CHICAGO DELIGHT'S",
      "order_date": "21/08/2026",
      "order_time": "12:12",
      "station": "CHICAGO DELIGHT'S",
      "station_gst": "GST666666",
      "payment_method": "Upi",
      "payment_status": "paid",
      "f_order_status": 6,
      "order_type": "DineIn",
      "items": [
        {"name": "Garlic To Hot", "quantity": 1, "price": 230, "gst": 11.5, "vat": 0}
      ],
      "item_count": 1,
      "total_qty": 1,
      "item_total": 230,
      "discount": 0,
      "sub_total": 230,
      "gst": 11.5,
      "vat": 0,
      "total": 241.5
    }
  ],
  "stations": [...],
  "station_gst_map": {...},
  "total_orders": 60
}
```

---

## Step 3 — Gap Analysis: Old Probe vs New Probe

| Gap | Old (2026-08-21) | New (2026-08-22) | Resolution |
|---|---|---|---|
| Order ID format | `"039368"` only — FE had to format `#ID#STATION` | `display_order_id: "#039368#CHICAGO DELIGHT'S"` | ✅ **Use `display_order_id` directly** |
| `station_gst` per order | `null` | `"GST666666"` (real GST number) | ✅ **Show as column, "—" when null** |
| `station_gst_map` | All null | Real values populated | ✅ **Show next to station name in selector** |
| `sort_by` param | Not documented | `"collect_bill"` accepted | ✅ **Always send, hardcoded** |
| Audit tab | No data in endpoint | No data (by design) | ✅ **Skip — owner confirmed** |
| Items text rendering | Array `items[]` | Array `items[]` | ⚙️ FE formats as inline text |
| TOTALS row | FE aggregation | FE aggregation | ⚙️ FE computes from orders[] |
| KPI cards | FE aggregation | FE aggregation | ⚙️ FE computes |

**All blockers resolved. Remaining items are standard FE build work.**

---

## Step 4 — Data Flow (Updated)

```
FoodCourtBetaPage.jsx

Boot:
  POST /food-court-order-report { from, to, sort_by: "collect_bill" }
    → { stations[], station_gst_map{} }
    → station dropdown populated
    → each option shows: "CHICAGO DELIGHT'S  ·  GST666666"  (or just name if null)

User selects station + Apply:
  POST /food-court-order-report { from, to, station, sort_by: "collect_bill" }
    → { orders[], total_orders }
    → render

Tabs:
  "All Orders" → all orders[]
  "Settled"    → orders[].filter(o => o.payment_status === 'paid' || o.f_order_status === 6)
  (NO Audit tab — owner confirmed Q1)

KPI cards (4):
  Total Orders · Total Amount (Σ item_total) · Total GST (Σ gst) · Total Qty (Σ total_qty)

Table columns:
  ORDER ID (display_order_id) | DATE | TIME | ITEMS (inline text) |
  ITEMS count | QTY | PAYMENT | ITEM TOTAL | DISCOUNT | SUB TOTAL | GST | TOTAL

Station GST shown in TWO places (Q2 answer: A + B):
  (A) Column: "STATION GST" column in table → value from order.station_gst ("—" when null)
  (B) Station selector option: "CHICAGO DELIGHT'S  ·  GST666666"

Items inline text (FE formatter):
  items[].map(i => `${i.name} (${i.quantity}) ₹${i.price}`).join(', ')
  e.g. "Garlic To Hot (1) ₹230, Maxican Taco (1) ₹150"

TOTALS row:
  Σ item_count | Σ total_qty | — | Σ item_total | Σ discount | Σ sub_total | Σ gst | Σ total

Export: Excel (one row per order, follows ExpenseReportPage pattern)
```

---

## Step 5 — Files WILL Change (5 files, 2 new)

| File | Change | Lines | Risk |
|---|---|---|---|
| `src/pages/reports-module/FoodCourtBetaPage.jsx` | **NEW** — full report: date range, station dropdown with GST, All/Settled tabs, KPI strip, table (TOTALS row + data), Excel export | ~400–500 | LOW |
| `src/api/services/foodCourtBetaService.js` | **NEW** — `getStations(from, to)` + `getFoodCourtOrders(from, to, station)` via POST, `sort_by` always "collect_bill" | ~45 | LOW |
| `src/api/constants.js` | + `FOOD_COURT_ORDER_REPORT: '/api/v1/vendoremployee/food-court-order-report'` | ~1 | LOW |
| `src/components/layout/Sidebar.jsx` | + "Food Court Beta" entry alongside existing "Food Court" | ~3 | LOW |
| `src/App.js` | + `/reports-module/food-court-beta` route + import | ~3 | LOW |

## Files WILL NOT Touch
`FoodCourtMockup.jsx` · `foodCourtService.js` · `reportTransform.js` · `orderTransform.js` · any financial logic

---

## Step 6 — Table Column Mapping (confirmed from live probe)

| Column | API Field | Notes |
|---|---|---|
| ORDER ID | `display_order_id` | Pre-formatted as `#ID#STATION` — use directly |
| DATE | `order_date` | DD/MM/YYYY string — display as-is |
| TIME | `order_time` | HH:MM string |
| ITEMS | `items[]` | FE: `items.map(i => ${i.name} (${i.quantity}) ₹${i.price}).join(', ')` |
| ITEMS # | `item_count` | integer |
| QTY | `total_qty` | integer |
| PAYMENT | `payment_method` | pill: Upi=blue, Cash=green, etc. |
| ITEM TOTAL | `item_total` | ₹ |
| DISCOUNT | `discount` | ₹, show "—" if 0 |
| SUB TOTAL | `sub_total` | ₹ |
| GST | `gst` | ₹ |
| TOTAL | `total` | ₹, bold |
| STATION GST | `station_gst` | GST reg number (e.g. "GST666666"), "—" if null |

---

## Risk Register (updated)

| Risk | Severity | Mitigation |
|---|---|---|
| `station_gst` null for some stations (e.g. CHICAGO SHIMLA) | LOW | Show "—" — owner confirmed Q2: A+B, no hard block |
| Large dataset (60+ orders per station per range) | LOW | All-in-one acceptable (owner confirmed OQ-2) |
| New page alongside old page | LOW | Sidebar label "Food Court Beta" distinguishes clearly |

---

## Verification Matrix (seeds Gate 3 + QA)

| # | Check | How |
|---|---|---|
| 1 | Route `/reports-module/food-court-beta` loads | Browser navigate |
| 2 | Station dropdown shows all stations with GST next to name | e.g. "CHICAGO DELIGHT'S · GST666666" |
| 3 | Selecting station + Apply loads orders | Table populates |
| 4 | STATION GST column shows GST number or "—" | Per row in table |
| 5 | Items column shows inline text | "Name (qty) ₹price, ..." |
| 6 | All Orders tab = all orders | Count matches total_orders |
| 7 | Settled tab = payment_status paid / f_order_status 6 | Filtered subset |
| 8 | NO Audit tab visible | Not rendered |
| 9 | TOTALS row correct | Σ columns match |
| 10 | KPI cards correct | Total Orders / Amount / GST / Qty |
| 11 | Excel export downloads | .xlsx file |
| 12 | Existing Food Court page unaffected | `/food-court` still works |

---

Gate 2 COMPLETE: CR-157
All owner decisions resolved. All blockers cleared.
Code reality: NONE
Risk: LOW–MEDIUM
Files WILL change: 5 (2 new)
Evidence: /app/memory/evidence/CR-157/food_court_response_updated_2026_08_22.json
Next: Gate 3 → Implementation Plan → Gate 4 GO
