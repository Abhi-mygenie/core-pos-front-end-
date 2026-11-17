# BACKEND_BRIEF_CR-544 — v2 (Revised after Backend Feedback)

**New standalone brief** — previously only in BATCH-C combined brief ASK 4
**Revision reason:** Backend feedback — re-payment window clarification, missing fields
**Date:** 2026-11-17
**Priority:** P0 / HIGH
**Assigned to:** Gyan

---

## Changes from v1 (BATCH-C ASK 4)

| # | What Changed | v1 | v2 |
|---|---|---|---|
| C1 | Re-payment window | Not addressed — ambiguous | **Re-payment does NOT close the window** (per OD-544-02) |
| C2 | `unpaid_count` field | Referenced in OD but not in event schema | **Added to event schema** |
| C3 | `order_status_at_cancel` field | Referenced in OD but not in event schema | **Added to event schema** |
| C4 | Detection rule | "cancel_at > made_unpaid_at" | **Clarified: uses FIRST make_unpaid_at, ignores re-payments** |
| C5 | Standalone brief | Was embedded in Batch-C combined brief | **Now self-contained with full schema + examples** |

---

## Summary

- **Issue:** No audit event exists for the two-step fraud chain: order marked unpaid → then items cancelled
- **Classification:** NEW_FEATURE (fraud detection)
- **Frontend impact:** Order Edit Audit page needs `cancel_after_unpaid` event type with fraud pattern visibility
- **Priority/Risk:** P0 / HIGH

---

## Endpoint

- **Method:** POST
- **URL:** `/api/v2/vendoremployee/report/insights-dashboard`
- **Auth:** Bearer token
- **Response section:** `audits.orders[]` (new event type) + `audits` (new KPI count)

---

## Owner Decisions (ALL LOCKED — 2026-11-17)

| # | Decision | Answer | Rationale |
|---|----------|--------|-----------|
| OD-544-01 | Time window for cancel-after-unpaid? | **No time limit** — any cancel after unpaid on same order, even days later | Fraud doesn't have a time limit |
| OD-544-02 | Include re-paid then cancelled? | **YES, flag ALL** — even if re-paid between unpaid and cancel | Covers both direct fraud AND laundering pattern |

---

## Detection Rule (FINAL — v2)

```
For each order in the requested date range:

  1. Check: does this order have at least one make_unpaid operation?
     → If NO: skip this order
     → If YES: get first_make_unpaid_at = timestamp of the EARLIEST make_unpaid event

  2. Count: unpaid_count = total number of make_unpaid operations on this order

  3. For each cancellation on this order (item-level or order-level):
     → If cancel_time > first_make_unpaid_at:
        → Determine order_status_at_cancel:
           - Query the payment status of the order AT the moment of cancellation
           - "unpaid" = order was still unpaid when cancel happened
           - "paid" = order was re-paid before cancel happened (laundering pattern)
        → Emit cancel_after_unpaid event

  IMPORTANT:
  - Re-payment between make_unpaid and cancel does NOT prevent event emission
  - Use the FIRST make_unpaid_at (not the most recent)
  - No time limit — cancel can be minutes or days after make_unpaid
  - For full-order cancel: emit per-item events (same as CR-543 approach)
```

### Why re-payment doesn't close the window:

Two fraud patterns exist:

**Pattern A — Direct fraud:**
```
Order placed → Paid → make_unpaid → Cancel item → Pocket the food/money
order_status_at_cancel = "unpaid"
```

**Pattern B — Laundering:**
```
Order placed → Paid → make_unpaid → Re-pay (cover tracks) → Cancel later → Claim refund
order_status_at_cancel = "paid"
```

Both patterns are suspicious. Owner wants BOTH flagged. The `order_status_at_cancel` field lets managers distinguish between them during investigation.

---

## Event Schema (FINAL — v2)

### Event type: `cancel_after_unpaid`

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
  "gap_minutes": 5,
  "unpaid_count": 2,
  "order_status_at_cancel": "paid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | YES | Always `"cancel_after_unpaid"` |
| `order_id` | string | YES | Order ID (preserve leading zeros) |
| `food_name` | string | YES | Item name. For full-order cancel: individual item name (per-item events) |
| `amount` | number | YES | Item amount (₹) |
| `by` | string | YES | Employee who cancelled |
| `made_unpaid_at` | datetime | YES | Timestamp of the **FIRST** `make_unpaid` event on this order |
| `cancel_time` | datetime | YES | When cancellation happened |
| `scope` | string | YES | Always `"item"` (per-item events, even for full-order cancel) |
| `gap_minutes` | integer | YES | `floor((cancel_time - made_unpaid_at) / 60)` — gap in whole minutes |
| `unpaid_count` | integer | YES | **NEW v2** — Total number of times this order was made unpaid |
| `order_status_at_cancel` | string | YES | **NEW v2** — Payment status at moment of cancel: `"paid"` or `"unpaid"` |

### `order_status_at_cancel` allowed values:

| Value | Meaning | Fraud Pattern |
|-------|---------|---------------|
| `"unpaid"` | Order was still unpaid when cancel happened | Direct fraud — item cancelled while bill is unpaid |
| `"paid"` | Order was re-paid before cancel happened | Laundering — re-paid to cover tracks, then cancelled |

---

## Examples

### Example 1 — Direct fraud (cancel while unpaid)

```
Timeline:
  14:00 — Order placed, paid
  14:30 — make_unpaid (1st time)
  14:35 — Item "Paneer Tikka" cancelled (order still unpaid)
```

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
  "gap_minutes": 5,
  "unpaid_count": 1,
  "order_status_at_cancel": "unpaid"
}
```

### Example 2 — Laundering (re-paid then cancelled)

```
Timeline:
  14:00 — Order placed, paid
  14:30 — make_unpaid (1st time)
  14:32 — Payment received again (re-paid) ← does NOT close the window
  14:40 — make_unpaid (2nd time)
  14:42 — Payment received again (re-paid)
  15:00 — Item "Butter Chicken" cancelled (order is paid at this moment)
```

```json
{
  "type": "cancel_after_unpaid",
  "order_id": "021544",
  "food_name": "Butter Chicken",
  "amount": 350.00,
  "by": "Manager",
  "made_unpaid_at": "2026-11-16T14:30:00",
  "cancel_time": "2026-11-16T15:00:00",
  "scope": "item",
  "gap_minutes": 30,
  "unpaid_count": 2,
  "order_status_at_cancel": "paid"
}
```

### Example 3 — Full-order cancel (per-item events)

```
Timeline:
  14:00 — Order placed with 2 items, paid
  14:30 — make_unpaid
  14:45 — Full order cancelled (both items cancelled at once)
```

→ Emit **2 events** (one per item):

```json
// Event 1:
{
  "type": "cancel_after_unpaid",
  "order_id": "021544",
  "food_name": "Paneer Tikka",
  "amount": 200.00,
  "by": "Counter",
  "made_unpaid_at": "2026-11-16T14:30:00",
  "cancel_time": "2026-11-16T14:45:00",
  "scope": "item",
  "gap_minutes": 15,
  "unpaid_count": 1,
  "order_status_at_cancel": "unpaid"
}

// Event 2:
{
  "type": "cancel_after_unpaid",
  "order_id": "021544",
  "food_name": "Butter Naan",
  "amount": 60.00,
  "by": "Counter",
  "made_unpaid_at": "2026-11-16T14:30:00",
  "cancel_time": "2026-11-16T14:45:00",
  "scope": "item",
  "gap_minutes": 15,
  "unpaid_count": 1,
  "order_status_at_cancel": "unpaid"
}
```

---

## KPI Counts

Return in `audits` object:

| Field | Type | Description |
|-------|------|-------------|
| `cancel_after_unpaid_count` | integer | Total `cancel_after_unpaid` events (counts each item) |

---

## Data Availability

- `operations[].operation = 'make_unpaid'` with `created_at` already exists in `order-logs-report` → derive `made_unpaid_at`
- Payment status history should be queryable to determine `order_status_at_cancel`
- `unpaid_count` = count of `make_unpaid` operations on the order

---

## Backward Compatibility

- Additive only — no breaking changes
- Existing audit event types unchanged
- Same endpoint, same response structure
- New fields appear ONLY in `cancel_after_unpaid` events

---

## Validation Checklist for Gyan

```
□ Detection uses FIRST make_unpaid_at (not most recent)
□ Re-payment between unpaid and cancel does NOT prevent event emission
□ No time limit — gap can be minutes or days
□ Full-order cancel emits per-item events (not one order event)
□ unpaid_count correctly counts all make_unpaid operations on the order
□ order_status_at_cancel reflects payment status AT moment of cancel
□ gap_minutes = floor((cancel_time - made_unpaid_at) / 60)
□ KPI count counts individual items (not orders)
□ Existing audit events unchanged
```

---

*End of CR-544 v2 contract. Ref: INV-BATCH-C-BACKEND-FEEDBACK-2026-11-17.md, OD-544-01/02.*
