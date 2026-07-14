# BACKEND_BRIEF — FE-Aggregated Reports: Backend Aggregation Endpoints

**Document:** BACKEND_BRIEF_FE_AGGREGATION_2026_07_10.md
**Date:** 2026-07-10
**From:** Frontend Investigation Agent
**Classification:** CONTRACT_MISMATCH / NEW_ENDPOINT_REQUEST
**Priority:** P1 (blocks 1-year range expansion for 5 report screens)

---

## Context

Five Insights reports currently fetch raw `order-logs-report` data and aggregate
entirely in the browser. This works for small date ranges but becomes unsafe
for 1-year ranges on high-volume restaurants (potential 100MB+ payloads,
browser freezes). Each report needs a dedicated backend aggregation endpoint.

All existing `insights-*` endpoints follow the same contract:
- **Method:** `POST`
- **Auth:** Bearer JWT (same as all other insights endpoints)
- **Request body:** `{ "from_date": "YYYY-MM-DD", "to_date": "YYYY-MM-DD" }`
- **Response envelope:** `{ "success": true, "data": { ... } }`

New endpoints should follow this exact same contract.

---

## Endpoint 1 — `insights-prep-serve` (Prep & Serve Time report)

**Proposed path:** `POST /api/v2/vendoremployee/report/insights-prep-serve`

**What the FE currently computes from raw order lines:**

Each order line has timestamps: `created_at`, `ready_at`, `serve_at`.
The FE classifies each line and computes averages.

**Classification rules (must be replicated server-side):**

```
Given: ready_gap = (ready_at - created_at) in minutes
       serve_gap = (serve_at - created_at) in minutes
       THRESHOLD = 0.5 min (30 seconds)

IF   ready_gap < THRESHOLD AND serve_gap < THRESHOLD → mode = "direct"
ELIF ready_gap < THRESHOLD AND serve_gap >= THRESHOLD → mode = "bar"
ELIF ready_gap >= THRESHOLD                           → mode = "kitchen"
IF   no timestamps at all                             → mode = "direct"

Outlier cap: skip any prep or serve value > 120 minutes from averages.
Only skip that value — do not skip the item entirely.
```

**Required response shape:**
```json
{
  "data": {
    "kpi": {
      "avg_prep_minutes": 8.5,
      "avg_serve_minutes": 3.2,
      "avg_total_minutes": 11.7,
      "total_orders": 120,
      "kitchen_items": 450,
      "served_items": 380,
      "bar_items": 120,
      "direct_items": 210
    },
    "mode_count": { "kitchen": 450, "bar": 120, "direct": 210 },
    "daily": [
      { "date": "01/07/2026", "avg_prep": 8.2, "avg_serve": 3.1, "avg_total": 11.3, "orders": 12 }
    ],
    "hourly": [
      { "hour": "12", "avg_prep": 9.1, "avg_serve": 3.5, "orders": 45 }
    ],
    "distribution": [
      { "label": "0-5 min",   "count": 50,  "pct": 11.1 },
      { "label": "5-10 min",  "count": 120, "pct": 26.7 },
      { "label": "10-15 min", "count": 90,  "pct": 20.0 },
      { "label": "15-20 min", "count": 80,  "pct": 17.8 },
      { "label": "20-30 min", "count": 70,  "pct": 15.6 },
      { "label": "30+ min",   "count": 40,  "pct":  8.9 }
    ],
    "by_channel": [
      {
        "channel": "Dine-In",
        "avg_prep": 8.5, "avg_serve": 3.2, "avg_total": 11.7,
        "orders": 80
      }
    ],
    "by_station": [
      {
        "station": "Main Kitchen",
        "avg_prep": 9.0, "avg_serve": 3.5,
        "orders": 60, "items": 180,
        "modes": { "kitchen": 160, "bar": 10, "direct": 10 }
      }
    ],
    "slow_items": [
      {
        "name": "Biryani", "station": "Main Kitchen", "mode": "kitchen",
        "avg_prep": 25.0, "avg_serve": 5.0, "orders": 45
      }
    ],
    "fast_items": [
      {
        "name": "Lassi", "station": "Bar", "mode": "bar",
        "avg_prep": 0, "avg_serve": 2.1, "orders": 30
      }
    ]
  }
}
```

**Notes:**
- `slow_items` and `fast_items`: top 10 each, sorted by `avg_prep + avg_serve` (desc/asc).
  Only include items with ≥ 2 data points.
- `by_channel`: channel values are `dinein → "Dine-In"`, `delivery → "Delivery"`,
  `takeaway / take_away → "Takeaway"`. Exclude "direct" mode items from channel aggregation.
- `daily[].date` format: `DD/MM/YYYY` (matches existing FE display convention)
- `hourly[].hour`: zero-padded 2-digit string (`"09"`, `"12"`, `"23"`)

**FE files that will consume this:**
- `prepServeService.js` → `getPrepServeAnalytics()` (replace body)
- `PrepServeTimeMockup.jsx` (no shape changes needed if response matches above)

---

## Endpoint 2 — `insights-food-court` (Food Court / Station Sales)

**Proposed path:** `POST /api/v2/vendoremployee/report/insights-food-court`

**Request body:**
```json
{ "from_date": "YYYY-MM-DD", "to_date": "YYYY-MM-DD", "station": "Main Kitchen" }
```
`station` is optional. When omitted, return station list + meta only (no order rows).

**What the FE currently computes:**
- All orders that have at least one item belonging to the selected station
- Per-order: proportional discount split by item price share, subtotal, GST, VAT, total
- Station list derived from all item `station_name` values

**Required response shape (station omitted):**
```json
{
  "data": {
    "stations": ["Bar", "Grill", "Main Kitchen"],
    "meta": { "total_orders": 245, "total_revenue": 186500 }
  }
}
```

**Required response shape (station specified):**
```json
{
  "data": {
    "stations": ["Bar", "Grill", "Main Kitchen"],
    "orders": [
      {
        "order_number": "000123",
        "order_date": "09/07/2026",
        "order_time": "13:45",
        "order_type": "Dine-In",
        "station_name": "Main Kitchen",
        "payment_method": "Cash",
        "payment_status": "paid",
        "f_order_status": 6,
        "order_in": "POS",
        "status": "paid",
        "item_count": 3,
        "total_qty": 5,
        "order_details": "Biryani (2) ₹340, Dal Makhani (1) ₹180, Naan (2) ₹80",
        "item_total": 600,
        "discount": 30,
        "sub_total": 570,
        "gst_amount": 28.5,
        "vat_amount": 0,
        "total": 598.5
      }
    ],
    "meta": {
      "total_orders": 45,
      "total_revenue": 28500,
      "total_gst": 1425,
      "total_discount": 890
    }
  }
}
```

**Discount split rule (must replicate FE logic):**
```
order_discount_share_for_station =
  (station_item_total / total_order_item_total) × order_total_discount
```

**Notes:**
- `order_date` format: `DD/MM/YYYY`
- Include ALL order statuses (paid, running, cancelled) — FE filters at display layer
- Sort by `order_number` descending (latest first)

**FE files that will consume this:**
- `foodCourtService.js` → `getFoodCourtForRange()` (replace body)
- `FoodCourtMockup.jsx` (no shape changes needed)

---

## Endpoint 3 — `insights-room-orders` (Room Orders report)

**Proposed path:** `POST /api/v2/vendoremployee/report/insights-room-orders`

**What the FE currently computes:**
- Filters order-logs-report to `order_in = 'RM'` (room parent orders only)
- Pre-scans raw wrappers to extract `room_info` (room_price, advance, balance, dates, guest name)
- Groups SRM (sub-room) orders by `parent_order_id` as `associated_orders`
- Drops cancelled/merged room parents (anomaly count)

**Required response shape:**
```json
{
  "data": {
    "rows": [
      {
        "parent_order_id": 731922,
        "restaurant_order_id": "000123",
        "table_id": 45,
        "guest_name": "Mr. Sharma",
        "check_in_datetime": "2026-07-01 14:00:00",
        "f_order_status": 6,
        "status": "paid",
        "order_in": "RM",
        "amount": 12500,
        "room_info": {
          "room_no": "101",
          "room_price": 8000,
          "advance_payment": 4000,
          "balance_payment": 4000,
          "receive_balance": 0,
          "discount_amount": 0,
          "checkin_date": "2026-07-01",
          "checkout_date": "2026-07-03"
        },
        "associated_orders": [
          {
            "order_id": 731923,
            "order_number": "000124",
            "amount": 450.0,
            "transferred_at": "2026-07-01 20:30:00"
          }
        ]
      }
    ],
    "anomaly_count": 2,
    "meta": {
      "total_rooms": 12,
      "total_revenue": 156000,
      "rooms_with_srm": 4
    }
  }
}
```

**Guest name resolution rule (replicate from FE):**
```
Priority: room_info.name3 → orders_table.user_name → booking_type (if 'walkin'/'walk-in' → "Walk-in") → booking_type string
```

**Notes:**
- Return only `order_in = 'RM'` rows. Exclude `order_in = 'SRM'` (they appear as `associated_orders`).
- Drop cancelled/merged RM rows from `rows[]` but count them in `anomaly_count`.
- Sort `rows[]` by `parent_order_id` descending (latest first).
- `associated_orders` includes ALL SRM orders for that parent regardless of their status.

**FE files that will consume this:**
- `roomOrdersService.js` → `getRoomOrdersForRange()` (replace body)
- `RoomOrdersMockup.jsx` (no shape changes needed)

---

## Endpoint 4 — `insights-tab-settlements` (Order Ledger — tab settlement data)

**Proposed path:** `POST /api/v2/vendoremployee/report/insights-tab-settlements`

**Context:** The Order Ledger currently calls `daily-sales-revenue-report` once per day
for N days to get tab (credit) settlement breakdown. For a 60-day range that is 60 API
calls. This is the ONLY bottleneck preventing Order Ledger from supporting longer ranges.
The order-logs-report part of Order Ledger is already a single call and handles 1 year fine.

**What the FE currently extracts per day:**
```javascript
const tp = data.paid_revenue_method?.tab_payment || {};
cash = tp['Credit Cash']
card = tp['Credit Card']
upi  = tp['Credit UPI']
```

**Required response shape:**
```json
{
  "data": {
    "tab_settlements": [
      {
        "date": "2026-07-01",
        "date_display": "01/07/2026",
        "cash": 1200.0,
        "card": 800.0,
        "upi": 500.0,
        "total": 2500.0
      }
    ],
    "summary": {
      "total_cash": 45000,
      "total_card": 28000,
      "total_upi": 19000,
      "total": 92000
    }
  }
}
```

**Notes:**
- One row per calendar day in the requested range, even if `total = 0` (FE needs full date spine).
- `date_display` format: `DD/MM/YYYY`
- This is the simplest of the 5 endpoints — it's just a range wrapper over the existing
  `daily-sales-revenue-report` logic.

**FE files that will consume this:**
- `orderLedgerService.js` → `getTabSettlementsForRange()` (replace N-per-day calls with 1 call)
- `OrderLedgerMockup.jsx` (no shape changes needed)

---

## Endpoint 5 — `insights-item-audit` (Item Report — Audit tab)

**Priority: P2 — Defer. FE volume guard is the recommended short-term fix.**

**Why deferred:**
The Audit tab requires per-item, per-order-line detail including:
- Per-line expected tax calculation (requires product.tax_rate, product.tax_calc)
- Drift detection (actual tax vs computed expected tax)
- Up to 20 most-recent order lines per item (date, qty, price, discount, status, waiter)
- Variation and addon aggregation per item
- Cancellation reason aggregation per item (with scope: item vs order-level cancel)

This is the most complex aggregation of the five, as it requires joining the full product
catalogue with per-line order data and running fiscal calculations server-side.

**Short-term FE fix (recommended while backend is built):**
In `ItemSalesHybridMockup.jsx`, after `ORDER_LOGS_REPORT` resolves on the Audit tab:
```javascript
if (orders.length > 5000) {
  setAuditError('Audit analysis is limited to 62 days for high-volume data. Please narrow your date range.');
  return;
}
```
This keeps main-view Item Report at 365 days (backed by `insights-items`) while
protecting the Audit tab from payload blowup.

**Required response shape (when endpoint is built):**
```json
{
  "data": {
    "items": [
      {
        "food_id": 176906,
        "name": "Biryani",
        "category_name": "Main Course",
        "station": "Main Kitchen",
        "tax_rate": 5.0,
        "tax_type": "GST",
        "tax_calc": "Exclusive",
        "qty_sold": 120,
        "total_revenue_sold": 48000,
        "expected_tax_sold": 2285.71,
        "actual_tax_sold": 2400.00,
        "tax_drift": 114.29,
        "drift_class": "OVER_TAXED",
        "recent_order_lines": [
          {
            "order_id": "#002384", "date": "2026-07-09 13:45:00",
            "qty": 2, "price": 800, "discount": 0,
            "status": "served", "waiter": "Ravi"
          }
        ],
        "variations": [
          { "label": "Full", "qty": 80, "revenue": 32000 }
        ],
        "addons": [
          { "name": "Extra Raita", "count": 15, "revenue": 450, "rate": 12 }
        ],
        "cancel_reasons": [
          { "reason": "Wrong order", "scope": "item", "count": 3 }
        ]
      }
    ],
    "meta": {
      "total_items": 85,
      "total_drift_items": 12,
      "date_range_days": 365
    }
  }
}
```

---

## Implementation Priority

| # | Endpoint | Effort | FE impact | Recommended priority |
|---|----------|--------|-----------|---------------------|
| 1 | `insights-tab-settlements` | **Low** — wrapper over existing DAILY_SALES_REPORT logic | Unblocks Order Ledger for 1-year | **P1 — Do first** |
| 2 | `insights-food-court` | Medium — station-scoped order aggregation | Unblocks Food Court for 1-year | **P1** |
| 3 | `insights-room-orders` | Medium — RM/SRM join + room_info extraction | Unblocks Room Orders for 1-year | **P1** |
| 4 | `insights-prep-serve` | Medium-High — timestamp classification logic | Unblocks PrepServe for 1-year | **P2** |
| 5 | `insights-item-audit` | **High** — tax drift engine + per-line join | FE volume guard handles short-term | **P3 — Defer** |

---

## Testing Instructions (for backend team)

**Test credentials (preprod):**
- Email: `owner@18march.com` (role: Owner)
- Auth endpoint: `POST /api/v1/auth/vendoremployee/login`

**Suggested test cases:**
1. 1-day range → verify counts match same-day order-logs-report
2. 62-day range → verify totals match current FE computation
3. 1-year range → verify HTTP 200, response time < 10s
4. Empty range (no orders) → verify empty arrays, no 500 errors

**Evidence path:** `/app/memory/evidence/INV-001-INSIGHTS-1YR-RANGE/`
