# API Contract — CR-528 Post-bill-print changes in Order Edit Audit — REVISED v2 — 2026-11-16

Backend: Gyan · ID: ASK 2 (revised) · IA doc: `impact/CR-528_IMPACT_ANALYSIS.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**
**Status: DRAFT v2 — READY TO SEND. Waiting backend reply on `insights-dashboard` events. BLOCKING.**

> **v2 CHANGE (2026-11-16):** Corrected target endpoint from `order-logs-report` to `insights-dashboard`. The Order Edit Audit page (`AuditLogMockup.jsx`) consumes `insights-dashboard` → `audits`, NOT `order-logs-report`. All asks below target the correct endpoint.

> **Foundation confirmed (2026-11-16):** Backend delivered v1 fields on `order-logs-report` — `bill_printed_at`, `bill_print_count`, `print_bill_status` all persist correctly. `operations[]` logs `bill_print`, `item_cancel`, `order_cancel`, `order_edit` events with timestamps and employee. This proves the database-level data exists. The remaining work is to query this data and emit computed audit events on `insights-dashboard` → `audits`. See: `backend_replies/CR-528_BACKEND_REPLY_VALIDATION_2026_11_16.md`.

---

## 1. Target page and current data source

**Page:** Order Edit Audit (`AuditLogMockup.jsx`, route `/reports-module/audit-log`)
**Current endpoint:** `POST /api/v2/vendoremployee/report/insights-dashboard`
**Current response shape (audits section):**
```json
{
  "audits": {
    "total": 5,
    "make_unpaid_count": 2,
    "payment_method_change_count": 3,
    "orders": [
      {
        "order_id": "021018",
        "type": "make_unpaid",
        "amount": 500.00,
        "by": "Counter",
        "prev_method": "Cash",
        "curr_method": "pending"
      }
    ]
  }
}
```

**Event types today:** `make_unpaid`, `payment_method_change`

---

## 2. New audit event types needed (CR-528)

### a) Item cancel after bill print

| Field | Type | Description | Status |
|---|---|---|---|
| `type` | string | `"item_cancel_after_print"` | NEW — **LOCKED** |
| `order_id` | string | Restaurant order ID | EXISTING pattern |
| `food_name` | string | Name of the cancelled item | NEW |
| `amount` | number | Value of the cancelled item | EXISTING pattern |
| `by` | string | Employee who cancelled | EXISTING pattern |
| `bill_printed_at` | string (datetime) | When the bill was printed | NEW — **LOCKED** |
| `cancel_time` | string (datetime) | When the item was cancelled | NEW |

### b) Order cancel after bill print

| Field | Type | Description | Status |
|---|---|---|---|
| `type` | string | `"order_cancel_after_print"` | NEW — **LOCKED** |
| `order_id` | string | Restaurant order ID | EXISTING pattern |
| `amount` | number | Full order amount at time of cancel | EXISTING pattern |
| `by` | string | Employee who cancelled | EXISTING pattern |
| `bill_printed_at` | string (datetime) | When the bill was printed | NEW — **LOCKED** |
| `cancel_time` | string (datetime) | When the order was cancelled | NEW |

### c) Order edit after bill print (items added/removed)

| Field | Type | Description | Status |
|---|---|---|---|
| `type` | string | `"order_edit_after_print"` | NEW — **LOCKED** |
| `order_id` | string | Restaurant order ID | EXISTING pattern |
| `amount` | number | Order amount after the edit | EXISTING pattern |
| `prev_amount` | number | Order amount before the edit | NEW |
| `by` | string | Employee who edited | EXISTING pattern |
| `bill_printed_at` | string (datetime) | When the bill was printed | NEW — **LOCKED** |
| `edit_time` | string (datetime) | When the edit happened | NEW |

### d) New KPI counts in `audits`

| Field | Type | Description | Status |
|---|---|---|---|
| `item_cancel_after_print_count` | integer | Count of item cancels after print | NEW — **LOCKED** |
| `order_cancel_after_print_count` | integer | Count of order cancels after print | NEW — **LOCKED** |
| `order_edit_after_print_count` | integer | Count of order edits after print | NEW — **LOCKED** |

---

## 3. Backend prerequisites

For the above to work, backend must:

| # | Requirement | Current state | Priority |
|---|---|---|---|
| P-1 | **Persist `bill_printed_at`** (datetime) on the order when bill is printed | `print_bill_status` exists but stays 'No' after print (probe 2026-11-15) | BLOCKING |
| P-2 | **Persist `print_bill_status = 'Yes'`** when bill is printed | Currently not persisted (probe confirmed) | BLOCKING |
| P-3 | Detect cancels/edits that occurred AFTER `bill_printed_at` and emit them as audit events | No logic exists today | BLOCKING |

---

## 4. Detection logic (backend-side)

```
For each order in the date range:
  IF bill_printed_at IS NOT NULL:
    FOR each item cancellation WHERE cancel_at > bill_printed_at:
      → emit { type: "item_cancel_after_print", ... }
    IF order cancelled WHERE cancel_at > bill_printed_at:
      → emit { type: "order_cancel_after_print", ... }
    FOR each order_edit WHERE edit_at > bill_printed_at:
      → emit { type: "order_edit_after_print", ... }
```

---

## 5. Backward compatibility

- Existing `make_unpaid` and `payment_method_change` events UNCHANGED
- New event types are ADDITIVE in `audits.orders[]`
- `audits.total` should now sum all event types (old + new)
- FE will handle unknown event types gracefully (skip rendering)

---

## 6. Backend sign-off

| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| ASK 2 (revised) | | Confirm: (1) `bill_printed_at` will be persisted; (2) three new event types in `insights-dashboard` → `audits`; (3) KPI counts added; (4) `print_bill_status` fix | |

---

## 7. Supersedes

This contract **supersedes** the DRAFT v1 (2026-11-15) which incorrectly targeted `order-logs-report`. The `order-logs-report` asks (operations logging, bill_print events) are still valid for that endpoint's own purposes, but the Order Edit Audit page does NOT use that endpoint.
