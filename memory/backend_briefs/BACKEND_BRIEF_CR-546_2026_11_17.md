# BACKEND_BRIEF_CR-546_2026_11_17

## Summary
- Issue: No audit events exist for discount applied/removed after bill print
- Classification: CONTRACT_MISMATCH (feature gap — event types not yet implemented)
- Frontend impact: Order Edit Audit page cannot show discount-after-print fraud events
- Priority/Risk: P0 / HIGH

## Endpoint
- Method: POST
- URL: `/api/v2/vendoremployee/report/insights-dashboard`
- Auth/context: Bearer token / RID (any restaurant)

## What's Needed

Add 2 new audit event types to `insights-dashboard` → `audits.orders[]` and 2 new KPI counts to `audits`.

### ASK 5 — CR-546: Discount After Bill Print — Audit Events (Apply & Remove)

**Context:** CR-528 (ASK 2) added 3 post-print event types (item_cancel, order_cancel, order_edit). CR-546 extends this with 2 more: discount apply and discount remove after print.

### Detection logic:

For each order in the date range where `bill_printed_at IS NOT NULL`:
- If a discount was applied WHERE `discount_applied_at > bill_printed_at` → emit `discount_apply_after_print`
- If a discount was removed WHERE `discount_removed_at > bill_printed_at` → emit `discount_remove_after_print`

### New event type: `discount_apply_after_print`

```json
{
  "type": "discount_apply_after_print",
  "order_id": "021544",
  "amount": 350.00,
  "discount_amount": 50.00,
  "discount_type": "percent | flat | preset",
  "discount_value": 10,
  "by": "Manager",
  "bill_printed_at": "2026-11-17T14:10:00",
  "discount_time": "2026-11-17T14:15:00"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"discount_apply_after_print"` LOCKED |
| `order_id` | string | Order ID (preserve leading zeros) |
| `amount` | number | Order amount at time of discount |
| `discount_amount` | number | Discount ₹ value applied |
| `discount_type` | string | "percent" / "flat" / "preset" |
| `discount_value` | number | Raw discount input (e.g., 10 for 10%) |
| `by` | string | Employee who applied |
| `bill_printed_at` | datetime | When bill was printed |
| `discount_time` | datetime | When discount was applied |

### New event type: `discount_remove_after_print`

```json
{
  "type": "discount_remove_after_print",
  "order_id": "021544",
  "amount": 350.00,
  "discount_amount": 50.00,
  "discount_type": "percent | flat | preset",
  "discount_value": 10,
  "by": "Manager",
  "bill_printed_at": "2026-11-17T14:10:00",
  "discount_time": "2026-11-17T14:20:00"
}
```

Same fields as `discount_apply_after_print`.

### New KPI counts:

| Field | Type |
|-------|------|
| `discount_apply_after_print_count` | integer |
| `discount_remove_after_print_count` | integer |

### `total` update:

`total` should now sum all 7 counts: `make_unpaid_count` + `payment_method_change_count` + `item_cancel_after_print_count` + `order_cancel_after_print_count` + `order_edit_after_print_count` + `discount_apply_after_print_count` + `discount_remove_after_print_count`.

### Data availability:

Discount operations should be available in `operations[]` on `order-logs-report` (similar to how cancel/edit operations are tracked). Backend needs to:
1. Identify discount apply/remove operations in the operations log
2. Compare their timestamps against `bill_printed_at`
3. Emit events where `operation_time > bill_printed_at`

## Backward Compatibility

- Additive only — no breaking changes
- Existing 5 event types unchanged
- `total` computation update (additive)
- Same endpoint, same filters

## Frontend Workaround
- Available: NO
- Frontend cannot detect discount timing without backend events

## Evidence
- Owner request during CR-528 investigation (2026-11-17)
- Intake: `change_requests/37_CR-546_DISCOUNT_AFTER_BILL_PRINT_AUDIT_INTAKE.md`

## Cross-reference

| ASK | CR | What | Status |
|-----|-----|------|--------|
| 2b | CR-528 | Post-print cancel/edit events | ✅ DELIVERED |
| 3 | CR-543 | Late cancel threshold + events | BLOCKING |
| 4 | CR-544 | Cancel-after-unpaid events | BLOCKING |
| **5** | **CR-546** | **Discount after print events** | **NEW — BLOCKING** |
