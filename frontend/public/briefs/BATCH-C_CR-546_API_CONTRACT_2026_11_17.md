# BATCH-C CR-546 API Contract — Discount After Bill Print: Audit Events

**CR:** CR-546
**Batch:** C — ASK 5
**Endpoint:** `POST /api/v2/vendoremployee/report/insights-dashboard` → `audits`
**Assigned to:** Gyan
**Priority:** P0
**Date:** 2026-11-17
**Status:** BLOCKING

---

## Detection Logic

For each order where `bill_printed_at IS NOT NULL`:
- If a discount was applied WHERE `discount_applied_at > bill_printed_at` → emit `discount_apply_after_print`
- If a discount was removed WHERE `discount_removed_at > bill_printed_at` → emit `discount_remove_after_print`

## New Event Type: `discount_apply_after_print`

```json
{
  "type": "discount_apply_after_print",
  "order_id": "021544",
  "amount": 350.00,
  "discount_amount": 50.00,
  "discount_type": "percent",
  "discount_value": 10,
  "by": "Manager",
  "bill_printed_at": "2026-11-17T14:10:00",
  "discount_time": "2026-11-17T14:15:00"
}
```

## New Event Type: `discount_remove_after_print`

```json
{
  "type": "discount_remove_after_print",
  "order_id": "021544",
  "amount": 350.00,
  "discount_amount": 50.00,
  "discount_type": "percent",
  "discount_value": 10,
  "by": "Manager",
  "bill_printed_at": "2026-11-17T14:10:00",
  "discount_time": "2026-11-17T14:20:00"
}
```

| Field | Type | Description |
|---|---|---|
| `type` | string | `"discount_apply_after_print"` or `"discount_remove_after_print"` LOCKED |
| `order_id` | string | Order ID (preserve leading zeros) |
| `amount` | number | Order amount at time of action |
| `discount_amount` | number | ₹ value of discount applied/removed |
| `discount_type` | string | `"percent"` / `"flat"` / `"preset"` |
| `discount_value` | number | Raw input value (e.g., 10 for 10%) |
| `by` | string | Employee who applied/removed |
| `bill_printed_at` | datetime | When bill was printed |
| `discount_time` | datetime | When discount was applied/removed |

## New KPI Counts

| Field | Type |
|---|---|
| `discount_apply_after_print_count` | integer |
| `discount_remove_after_print_count` | integer |

## Updated `total`

`total` should sum all event counts (8 types after CR-544 + CR-546):
```
make_unpaid_count + payment_method_change_count
+ item_cancel_after_print_count + order_cancel_after_print_count + order_edit_after_print_count
+ cancel_after_unpaid_count
+ discount_apply_after_print_count + discount_remove_after_print_count
```

## Backward Compatibility

- Additive only — no breaking changes
- Same endpoint, same response structure
- No migration needed
