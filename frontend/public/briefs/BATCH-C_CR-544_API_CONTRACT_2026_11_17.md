# BATCH-C CR-544 API Contract — Cancel After Making Unpaid: Audit Event

**CR:** CR-544
**Batch:** C — ASK 4
**Endpoint:** `POST /api/v2/vendoremployee/report/insights-dashboard` → `audits`
**Assigned to:** Gyan
**Priority:** P0
**Date:** 2026-11-17
**Status:** BLOCKING

---

## Detection Logic

For each order in the date range that was made unpaid (`make_unpaid` event exists):
- Get `made_unpaid_at` (timestamp of the make_unpaid action)
- For each cancellation (item or order) on that order WHERE `cancel_at > made_unpaid_at`:
  - Emit `cancel_after_unpaid` audit event

## New Event Type: `cancel_after_unpaid`

```json
{
  "type": "cancel_after_unpaid",
  "order_id": "021544",
  "food_name": "Paneer Tikka",
  "amount": 200.00,
  "by": "Counter",
  "made_unpaid_at": "2026-11-16T14:30:00",
  "cancel_time": "2026-11-16T14:35:00",
  "scope": "item",
  "gap_minutes": 5
}
```

| Field | Type | Description |
|---|---|---|
| `type` | string | `"cancel_after_unpaid"` LOCKED |
| `order_id` | string | Order ID (preserve leading zeros) |
| `food_name` | string | Cancelled item name (null/absent for full-order cancel) |
| `amount` | number | ₹ value of cancelled item/order |
| `by` | string | Employee who cancelled |
| `made_unpaid_at` | datetime | When order was marked unpaid |
| `cancel_time` | datetime | When the cancel happened |
| `scope` | string | `"item"` or `"order"` |
| `gap_minutes` | integer | Minutes between unpaid and cancel |

## New KPI Count

| Field | Type |
|---|---|
| `cancel_after_unpaid_count` | integer |

## Data Availability

`operations[].operation = 'make_unpaid'` with `created_at` already exists in `order-logs-report`. Backend can derive `made_unpaid_at` from this existing data.

---

## Fraud Pattern

1. Customer pays ₹500 cash
2. Cashier marks order as "unpaid" → system thinks ₹500 not collected
3. Cashier cancels ₹200 of items → system now shows ₹300 order
4. Cashier pockets ₹200

## Backward Compatibility

- Additive only — no breaking changes
- Same endpoint, same response structure
- No migration needed
