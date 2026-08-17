# BACKEND BRIEF — FOOD-COURT-ORDER-REPORT — 2026-08-12

## Summary
- Issue: No backend endpoint exists that returns per-order rows pre-filtered and pre-aggregated by station for the food court report
- Classification: FEATURE_REQUEST (new endpoint)
- Frontend impact: FE currently calls `order-logs-report` (returns ALL orders) and does station filtering + financial aggregation client-side. This is slow for date ranges > 30 days, requires batching, and transfers large payloads when only 1 station's data is needed.
- Priority/Risk: P1 · MEDIUM

## Context — What Exists Today

Two endpoints exist for food court data. Neither does the job alone:

| Endpoint | What it returns | Gap |
|---|---|---|
| `POST /api/v2/vendoremployee/report/order-logs-report` | Raw per-order wrappers, all items | Returns ALL station items; FE must filter & aggregate. Batching required for >30d. |
| `POST /api/v1/vendoremployee/top-food%20sales-report` | Food-item × station aggregated totals | No order IDs, no per-order rows, no payment method — cannot show order-level view |

**What we need:** A single endpoint that returns per-order rows already filtered and financially broken down by station — the same shape the FE currently computes client-side.

## Proposed Endpoint

- Method: `POST`
- URL: `/api/v1/vendoremployee/food-court-order-report`
- Auth: Bearer token (same as `order-logs-report`)
- Pattern parity: Business-day aware (same as `top-food-sales-report` — use session timezone boundaries)

## Request Body

```json
{
  "from": "2026-07-01",          // required · YYYY-MM-DD
  "to":   "2026-07-31",          // required · YYYY-MM-DD
  "station": "GUPTAJEE",         // optional · if omitted → return all stations (FE picks one)
  "sort_by": "collect_bill"      // optional · "collect_bill" | "created_at" (default: collect_bill)
}
```

## Required Response Shape

```json
{
  "orders": [
    {
      "order_id":        "036327",           // restaurant_order_id
      "order_date":      "03/08/2026",       // DD/MM/YYYY
      "order_time":      "14:30",            // HH:MM
      "station":         "GUPTAJEE",
      "payment_method":  "Cash",
      "payment_status":  "paid",
      "f_order_status":  6,
      "order_type":      "DineIn",
      "items": [
        {
          "name":      "Achari Paneer",
          "quantity":  1,
          "price":     280,
          "gst":       14.00,
          "vat":       0.00
        }
      ],
      "item_count":   2,
      "total_qty":    2,
      "item_total":   565.00,      // sum of item prices (this station only) + variation + addon
      "discount":     0.00,        // proportional share of order-level discount
      "sub_total":    565.00,      // item_total - discount
      "gst":          28.25,       // sum of item-level gst (this station only)
      "vat":          0.00,
      "total":        593.25       // sub_total + gst + vat
    }
  ],
  "stations": ["CREAMBELLPARLOUR", "GUPTAJEE", "MSB", "ZORKO"],
  "total_orders": 254,
  "from": "2026-07-01 06:00:00",
  "to":   "2026-08-01 03:00:00"
}
```

## Business Rules

| # | Rule | Decision |
|---|---|---|
| 1 | Station filtering | Include only items where `item.station === requested station`. Orders that have no items for the requested station must be excluded entirely. |
| 2 | Proportional discount | Order-level discount is distributed to each station proportionally by that station's share of the total order item price. Formula: `station_discount = order_discount × (station_item_total / order_item_total)` |
| 3 | Financial scope | `item_total`, `gst`, `vat` reflect only items belonging to the requested station. Order-level charges (delivery, tip, round-off) are excluded. |
| 4 | Station = NULL items | Items with no station assignment → exclude from station-filtered view. Return in `station: "UNASSIGNED"` if station param is omitted. |
| 5 | f_order_status | Include all statuses in the response. FE will filter "Settled" (fOrderStatus = 6) client-side. |
| 6 | Empty results | Return `{ "orders": [], "stations": [], "total_orders": 0 }`. Do not return null or 404. |
| 7 | Business day | Apply same business-day timezone logic as `top-food-sales-report`. Single-day query for "2026-08-03" should cover business hours (e.g. 06:00 Aug 3 → 03:00 Aug 4), not calendar midnight. |

## Why This Replaces FE Aggregation

Current FE `foodCourtService.js`:
- Calls `order-logs-report` → downloads all 817 orders for July (full payloads)
- Loops through every item of every order → filters by station
- Computes proportional discount, builds row object
- For >30 day ranges: splits into monthly chunks, 3 parallel calls, progress bar UI

With this endpoint:
- 1 API call regardless of date range
- Backend does the filter + aggregation server-side
- Payload is only the station's orders (e.g. GUPTAJEE had 254 of 817 orders)
- Zero FE computation — just render the rows

## Sample cURL (for FE testing once shipped)

```bash
curl --location 'https://preprod.mygenie.online/api/v1/vendoremployee/food-court-order-report' \
  --header 'Content-Type: application/json; charset=UTF-8' \
  --header 'X-localization: en' \
  --header 'Authorization: Bearer <TOKEN>' \
  --data '{
    "from": "2026-07-01",
    "to":   "2026-07-31",
    "station": "GUPTAJEE"
  }'
```

## Evidence

Live data probed on `preprod.mygenie.online` with `owner@shimlaqohfoodcourt.com`:
- July 2026: 817 total orders, 4 stations (CREAMBELLPARLOUR, GUPTAJEE, MSB, ZORKO)
- GUPTAJEE: 254 orders, ZORKO: 332, CREAMBELLPARLOUR: 355, MSB: 137
- Curl responses: `/app/memory/evidence/FC-BACKEND-AGG/`

## Acceptance Criteria (FE will test)

1. `GET` station list (no station param) returns all 4 stations + empty orders array
2. Filter by `station=GUPTAJEE` returns 254 orders for July 2026 (matches FE current count)
3. `SUM(orders[].total)` for GUPTAJEE ≈ `₹96,612.60` (matches `top-food-sales-report` station total)
4. An order with items from multiple stations appears under each relevant station separately
5. `f_order_status = 3` (cancelled) orders are excluded (same as `sort_by: collect_bill` filter)
6. Empty date range returns `{ orders: [], stations: [...], total_orders: 0 }`
7. Response for 1-year range completes in < 3s (the key performance requirement)

## Related

- `POST /api/v2/vendoremployee/report/order-logs-report` — existing (raw orders, FE aggregates)
- `POST /api/v1/vendoremployee/top-food%20sales-report` — existing (aggregated items, no order IDs)
- Investigation report: `/app/memory/investigation/FC-BACKEND-AGG_INVESTIGATION_REPORT_2026_08_12.md`
- Filed: 2026-08-12 · Sprint: pos_5_1 · Frontend Planning Gate 2
