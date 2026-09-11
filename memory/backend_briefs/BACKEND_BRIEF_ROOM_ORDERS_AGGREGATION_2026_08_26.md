# Backend Brief — Room Orders Aggregation Endpoint

**Date:** 2026-08-26
**Requested by:** Frontend Team
**Priority:** P1
**Context:** Currently `/reports-module/room-orders` (Room Orders Insights Report) fetches the generic `order-logs-report` endpoint and does all filtering, grouping, and financial computation client-side in the browser. This causes:
- Large payload download (ALL orders, not just rooms)
- Heavy JS computation on every page load
- No server-side pagination
- Slow on large date ranges

**Request:** New dedicated aggregation endpoint that returns pre-computed room folio data.

---

## 1. Endpoint

```
POST /api/v2/vendoremployee/report/room-orders-report
Authorization: Bearer <token>
Content-Type: application/json
```

---

## 2. Request Payload

```json
{
  "from_date": "2026-08-01",
  "to_date": "2026-08-26",
  "status": "all",
  "sort_by": "checkin_date",
  "sort_order": "desc",
  "page": 1,
  "limit": 50
}
```

| Field | Type | Required | Values | Notes |
|---|---|---|---|---|
| `from_date` | string (YYYY-MM-DD) | YES | — | Start of range |
| `to_date` | string (YYYY-MM-DD) | YES | — | End of range. Same as `from_date` = today only |
| `status` | string | NO | `all` / `paid` / `unpaid` / `in_house` | Default: `all`. `in_house` = currently checked in (not yet checked out) |
| `sort_by` | string | NO | `checkin_date` / `checkout_date` / `total` / `outstanding` | Default: `checkin_date` |
| `sort_order` | string | NO | `asc` / `desc` | Default: `desc` |
| `page` | int | NO | ≥1 | Default: 1 |
| `limit` | int | NO | 10–200 | Default: 50 |

---

## 3. Expected Response

```json
{
  "success": true,
  "restaurant_id": 478,
  "date_range": {
    "from": "2026-08-01",
    "to": "2026-08-26"
  },
  "summary": {
    "total_rooms": 12,
    "total_room_revenue": 85000,
    "total_food_revenue": 24600,
    "total_folio": 109600,
    "total_collected": 67000,
    "total_outstanding": 42600,
    "total_advance": 30000,
    "total_mid_stay_payments": 12000,
    "paid_count": 7,
    "unpaid_count": 5
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_records": 12,
    "total_pages": 1
  },
  "rooms": [
    {
      "order_id": 1232082,
      "restaurant_order_id": "002403",
      "room_id": 6182,
      "room_no": "e3",
      "guest_name": "Arjun Rawal",
      "guest_phone": "9035133228",
      "booking_type": "WalkIn",
      "checkin_date": "2026-08-24 16:00:00",
      "checkout_date": "2026-08-25 11:00:00",
      "nights": 1,
      "f_order_status": 1,
      "is_settled": false,
      "financials": {
        "room_price": 5000,
        "advance_payment": 1000,
        "food_total": 2007,
        "associated_food_total": 0,
        "total_folio": 7007,
        "total_collected": 3007,
        "outstanding": 3993,
        "room_payment_summary": {
          "ledger_paid_amount": 2007,
          "remaining_room_balance": 2993,
          "payments": [
            {
              "id": 10,
              "payment_amount": 1000,
              "payment_mode": "cash",
              "payment_type": "advance",
              "paid_at": "2026-08-24 16:00:34"
            },
            {
              "id": 11,
              "payment_amount": 500,
              "payment_mode": "upi",
              "payment_type": "advance",
              "paid_at": "2026-08-25 10:20:54"
            }
          ]
        }
      },
      "food_orders": [
        {
          "order_id": 1232083,
          "restaurant_order_id": "002404",
          "order_amount": 1200,
          "order_in": "SRM",
          "created_at": "2026-08-24 18:30:00"
        }
      ]
    }
  ]
}
```

---

## 4. Field-by-Field Spec

### Per Room Row (`rooms[]`)

| Field | Source | Description |
|---|---|---|
| `order_id` | `orders.id` | DB order ID |
| `restaurant_order_id` | `orders.restaurant_order_id` | Display order number |
| `room_id` | `user_id_documents.room_id` | FK to room |
| `room_no` | Room table | Human-readable room name (e.g. "101", "e3") |
| `guest_name` | `orders.user_name` or `room_info.name3` | Primary guest name |
| `guest_phone` | `orders.phone` | Contact number |
| `booking_type` | `room_info.booking_type` | WalkIn / Online / Corporate |
| `checkin_date` | `room_info.checkin_date` | ISO datetime |
| `checkout_date` | `room_info.checkout_date` | ISO datetime |
| `nights` | Computed: ceil((checkout - checkin) / 86400) | Number of nights |
| `f_order_status` | `orders.f_order_status` | 1=preparing, 5=served, 6=paid |
| `is_settled` | `f_order_status === 6` | True = checked out and paid |

### Financials block

| Field | Formula | Description |
|---|---|---|
| `room_price` | `room_info.room_price` | Room rent agreed at check-in |
| `advance_payment` | `room_info.advance_payment` | Paid at check-in |
| `food_total` | `orders.order_amount` + Σ `associated_orders.order_amount` | All food ordered during stay |
| `associated_food_total` | Σ SRM (transferred) orders | Food from sub-orders |
| `total_folio` | `room_price` + `food_total` | Grand total guest owes |
| `total_collected` | `ledger_paid_amount` from room_payment_summary | Total received so far |
| `outstanding` | `total_folio` − `total_collected` | Remaining to pay |
| `room_payment_summary` | From `room_payments` table | Full ledger (use existing structure already shipping in running orders) |

### Summary block (aggregated across all rows in range)

| Field | Formula |
|---|---|
| `total_rooms` | COUNT of RM orders in range |
| `total_room_revenue` | Σ `room_price` |
| `total_food_revenue` | Σ `food_total` |
| `total_folio` | Σ (`room_price` + `food_total`) |
| `total_collected` | Σ `total_collected` per row |
| `total_outstanding` | Σ `outstanding` per row |
| `total_advance` | Σ `advance_payment` |
| `total_mid_stay_payments` | Σ `room_payment_summary.ledger_paid_amount` − Σ `advance_payment` |
| `paid_count` | COUNT where `f_order_status = 6` |
| `unpaid_count` | COUNT where `f_order_status ≠ 6` |

---

## 5. Filtering Logic (server-side)

```
Include rows where:
  orders.order_in = 'RM'                    ← room parent orders only
  orders.order_status NOT IN ('cancelled', 'merged')
  orders.created_at BETWEEN from_date AND to_date

If status = 'paid':   AND orders.f_order_status = 6
If status = 'unpaid': AND orders.f_order_status != 6
If status = 'in_house': AND orders.f_order_status != 6
                          AND current_time BETWEEN checkin_date AND checkout_date
```

---

## 6. What FE Currently Computes (Move to Backend)

| Currently FE-side | Move to backend |
|---|---|
| Filter `order_in === 'RM'` from all orders | Server-side WHERE clause |
| Group SRM orders by `parent_order_id` | JOIN on `parent_order_id` |
| Parse `room_info` JSON | Server-side field extraction |
| Compute `food_total = order_amount + Σ SRM.amount` | SQL SUM |
| Compute `total_folio = room_price + food_total` | SQL computed column |
| Compute `paid = advance + receiveBalance` | Use `room_payment_summary.ledger_paid_amount` |
| Compute `outstanding = total - paid` | SQL computed column |
| Compute KPI aggregates | SQL GROUP BY + SUM |
| Filter cancelled/merged | SQL WHERE |
| Sort | SQL ORDER BY |
| Pagination | SQL LIMIT/OFFSET |

---

## 7. Response Size Comparison

| Approach | Payload | Client computation |
|---|---|---|
| Current (order-logs-report) | ~500KB–2MB (ALL orders for range) | Heavy — filter, group, compute per row |
| New endpoint | ~20–50KB (rooms only, pre-computed) | None — render only |

---

## 8. Notes for Backend

- `room_payment_summary` structure is already built and shipping in running orders. Reuse the same structure in this response.
- `associated_orders` (SRM) are orders where `order_in = 'SRM'` and `parent_order_id = RM.order_id`. Include their `order_amount` aggregated in `food_total`.
- The `nights` field should be `CEIL(TIMESTAMPDIFF(SECOND, checkin_date, checkout_date) / 86400)` — minimum 1.
- For `is_settled`, use `f_order_status = 6` (paid).
- `guest_name` priority: `room_info.name3` → `orders.user_name` → `"Walk-in"`.
- `room_no` should be the human-readable room label (e.g. "101"), not the internal `room_id`.
- Cancelled and merged room orders should be excluded from results (frontend currently drops them as "anomalies").
