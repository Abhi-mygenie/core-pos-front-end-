# BATCH-C CR-543 API Contract — Late Cancellation Audit: Time-Threshold

**CR:** CR-543
**Batch:** C — ASK 3
**Endpoint:** `POST /api/v2/vendoremployee/report/insights-dashboard` → `audits`
**Assigned to:** Gyan
**Priority:** P0
**Date:** 2026-11-17
**Status:** BLOCKING

---

## New Restaurant Setting

| Field | Type | Values | Default |
|---|---|---|---|
| `cancel_audit_threshold_minutes` | integer | 0 = off, any positive integer = threshold in minutes | 0 |

**Read from:** `GET /profile` → `restaurants[0]` or `GET /settings-list`
**Write to:** `POST /update-settings`

---

## New Event Type: `late_cancel`

When `cancel_audit_threshold_minutes > 0`, for each cancelled item/order where `cancel_time − punch_time > threshold`:

```json
{
  "type": "late_cancel",
  "order_id": "021544",
  "food_name": "Paneer Tikka",
  "amount": 350.00,
  "by": "Counter",
  "punch_time": "2026-11-16T14:10:00",
  "cancel_time": "2026-11-16T14:45:00",
  "duration_minutes": 35,
  "scope": "item"
}
```

| Field | Type | Description |
|---|---|---|
| `type` | string | `"late_cancel"` LOCKED |
| `order_id` | string | Order ID (preserve leading zeros) |
| `food_name` | string | Cancelled item name (null for full-order cancel) |
| `amount` | number | ₹ value of cancelled item/order |
| `by` | string | Employee who cancelled |
| `punch_time` | datetime | When item was originally punched |
| `cancel_time` | datetime | When the cancel happened |
| `duration_minutes` | integer | Minutes between punch and cancel |
| `scope` | string | `"item"` or `"order"` |

## New KPI Count

| Field | Type |
|---|---|
| `late_cancel_count` | integer |

## Dependency

Requires `punched_at` (ASK 1 / CR-524 — DONE). Backend can use the same underlying data.

---

## Backward Compatibility

- Additive only — no breaking changes
- Setting default = 0 (off) means no events emitted until restaurant enables it
- Same endpoint, same response structure
