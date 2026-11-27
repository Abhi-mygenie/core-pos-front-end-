# BACKEND_BRIEF_BATCH-C — REVISION v2 — 2026-11-16

**Assigned to:** Gyan
**Priority:** P0
**Supersedes:** `BACKEND_BRIEF_BATCH-C_2026_11_15.md` (ASK 2 endpoint corrected; ASK 3 + ASK 4 added)

---

## ASK 1 — CR-524: Add `punched_at` to insights-cancellations items (**DONE**)

- **Endpoint:** `POST /api/v2/vendoremployee/report/insights-cancellations`
- **Issue:** `created_at` / `punched_at` (item punch timestamp) absent from API. FE needs it for "Punch Time" and "Cancellation Duration" columns.
- **Required:** Add `punched_at` (full ISO datetime, IST or with offset) per cancelled item. For partial-cancel split lines, use the ORIGINAL parent line's add time. For order-scope cancels, return per-item lines with individual `punched_at`.
- **Contract:** `contracts/BATCH-C_CR-524_API_CONTRACT_2026_11_15.md`
- **Status:** ✅ **DONE** — Delivered as `created_at` + `item_punched_at` (identical) + `cancel_time_full`. Verified RID 672, 44 items (2026-11-16).

---

## ASK 2 (REVISED) — CR-528: Post-bill-print audit events in insights-dashboard

> **CORRECTION (2026-11-16):** The Order Edit Audit page uses `insights-dashboard` → `audits`, NOT `order-logs-report`. All asks below target the correct endpoint.
>
> **Foundation DONE (2026-11-16):** Backend delivered v1 on `order-logs-report` — `bill_printed_at`, `bill_print_count`, `print_bill_status`, `operations[]` with `bill_print`/`item_cancel`/`order_cancel`/`order_edit` events all working. Validation: `backend_replies/CR-528_BACKEND_REPLY_VALIDATION_2026_11_16.md`. **The database-level data exists. Remaining work: query it and emit computed audit events on `insights-dashboard` → `audits`.**

- **Endpoint:** `POST /api/v2/vendoremployee/report/insights-dashboard`
- **Issue:** No post-bill-print events exist in the audit section.

### What backend needs to do (remaining — foundation already delivered):

1. ~~**Persist `bill_printed_at`**~~ ✅ DONE (delivered on order-logs-report, 2026-11-16)
2. ~~**Fix `print_bill_status`**~~ ✅ DONE (delivered on order-logs-report, 2026-11-16)
3. **Add 3 new audit event types** to `insights-dashboard` → `audits.orders[]`:
   - `item_cancel_after_print` — item cancelled after bill was printed
   - `order_cancel_after_print` — full order cancelled after bill was printed
   - `order_edit_after_print` — items added/removed after bill was printed
4. **Add 3 new KPI counts** to `audits`:
   - `item_cancel_after_print_count`
   - `order_cancel_after_print_count`
   - `order_edit_after_print_count`
5. **Detection:** for each order where `bill_printed_at IS NOT NULL`, check cancels/edits that occurred after that timestamp

- **Contract:** `contracts/BATCH-C_CR-528_API_CONTRACT_2026_11_16_v2.md` (supersedes v1)
- **Status:** BLOCKING — foundation delivered, audit events pending

---

## ASK 3 (NEW) — CR-543: Late Cancellation Audit — Time-Threshold Setting + Events

- **Endpoint (setting):** `GET /profile` → `restaurants[0]`, `GET /settings-list`, `POST /update-settings`
- **Endpoint (events):** `POST /api/v2/vendoremployee/report/insights-dashboard` → `audits`

### New restaurant setting:

| Field | Type | Values | Default |
|---|---|---|---|
| `cancel_audit_threshold_minutes` | integer | 0 = off, any positive integer = threshold in minutes | 0 |

### New audit event type:

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

### New KPI count:

| Field | Type |
|---|---|
| `late_cancel_count` | integer |

### Dependency:
Requires `punched_at` (same as ASK 1 / CR-524) to compute the duration. If ASK 1 is delivered, ASK 3 can use the same underlying data.

- **Intake:** `change_requests/35_CR-543_LATE_CANCELLATION_AUDIT_THRESHOLD_INTAKE.md`
- **Status:** BLOCKING — needs setting key + `punched_at` data

---

## ASK 4 (NEW) — CR-544: Cancel After Making Unpaid — Audit Event

- **Endpoint:** `POST /api/v2/vendoremployee/report/insights-dashboard` → `audits`

### Detection logic:

For each order in the date range that was made unpaid (`make_unpaid` event exists):
- Get `made_unpaid_at` (timestamp of the make_unpaid action)
- For each cancellation (item or order) on that order WHERE `cancel_at > made_unpaid_at`:
  - Emit audit event

### New audit event type:

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

### New KPI count:

| Field | Type |
|---|---|
| `cancel_after_unpaid_count` | integer |

### Data availability:
`operations[].operation = 'make_unpaid'` with `created_at` already exists in `order-logs-report`. Backend can derive `made_unpaid_at` from this existing data.

- **Intake:** `change_requests/36_CR-544_CANCEL_AFTER_UNPAID_AUDIT_INTAKE.md`
- **Status:** BLOCKING — needs correlation logic

---

## Summary of all asks

| ASK | CR | Endpoint | What | Priority | Status |
|---|---|---|---|---|---|
| 1 | CR-524 | `insights-cancellations` | `punched_at` per cancelled item | P0 | ✅ DONE (2026-11-16) |
| 2a | CR-528 | `order-logs-report` | Foundation: `bill_printed_at`, `bill_print_count`, `operations[]` | P0 | ✅ DONE (2026-11-16) |
| 2b | CR-528 | `insights-dashboard` → `audits` | Post-bill-print audit events (3 types) + KPI counts | P0 | BLOCKING — NOT SENT |
| 3 | CR-543 | `insights-dashboard` → `audits` + settings | `cancel_audit_threshold_minutes` setting + `late_cancel` events | P0 | BLOCKING |
| 4 | CR-544 | `insights-dashboard` → `audits` | `cancel_after_unpaid` events | P0 | BLOCKING |

### Shared dependency: ASK 1 (`punched_at`) feeds ASK 3 (late cancel threshold). Delivering ASK 1 first unblocks both CR-524 and CR-543.

---

## Evidence artifacts

```
/app/memory/evidence/BATCH-C-IA/probes_2026_11_15/
  01c_cr524_items_full.txt   — created_at MISSING confirmed
  02g_cr528_orders_table_full.txt — print_bill_status stays 'No'
  02f_cr528_ops_detail.txt   — operations types
/app/memory/evidence/BATCH-C-IA/probes_2026_11_15_write/
  WRITE_PROBE_FINDINGS_2026_11_15.md — bill print not persisted
```

---

## ASK 5 (NEW) — BA-23 (CR-493): Auto-Cancel Rework — cancel_source + Comma Reasons + Audit Event + Backfill

> **Moved from Batch A to Batch C brief for consolidation** — all cancellation-related backend asks now in one brief.
> **Supersedes** BA-23 §3 in `contracts/BATCH-A_CR-493_API_CONTRACT_2026_11_15.md`.
> **Full contract:** `contracts/BATCH-A_BA-23_API_CONTRACT_2026_11_16_v2.md`

### Problem (proved by probe)
When cashier cancels items one by one until the order auto-cancels, Insights shows the order TWICE (once per item, once as order cancel). `cancellation_reason: null`, `canceled_by: null` on the auto-cancelled order. Order #021537 on CAFE 103: same Gravy appears as scope=order (₹210) AND scope=item (₹200) — ₹410 shown, real loss ₹210.

### What backend must do

| # | Requirement | Detail |
|---|---|---|
| 1 | **`cancel_source` field** | Every cancelled order gets `cancel_source`: `"manual"` / `"auto_last_item"` / `"merge"`. On `cancel-order-list`, `insights-cancellations`, `combined` (Order Beta). No null, no absent. |
| 2 | **Comma-separated reason** | Auto-cancelled order: `cancellation_reason` = all items' reasons joined with comma+space, deduplicated. E.g. `"Wrong item punched, Late preparation"`. |
| 3 | **Copy employee** | Auto-cancelled order: `canceled_by` = last item's employee (by cancel timestamp). |
| 4 | **Fix Insights counts** | `insights-cancellations` → `summary.cancelled_order_count` EXCLUDES `auto_last_item` + `merge`. Items from auto-cancelled orders counted under `item_scope_count` only (not `order_scope_count`). |
| 5 | **Audit event** | `insights-dashboard` → `audits.orders[]`: new type `all_items_cancelled` with `order_id`, `amount`, `by`, `item_count`, `reasons` (comma-separated), `cancel_time`, `items[]` array (food_name, reason, amount, by, cancel_time per item). New count: `all_items_cancelled_count`. |
| 6 | **Backfill** | One-time migration: find all orders with `cancellation_reason IS NULL` + items with reasons → set `cancel_source: "auto_last_item"`, comma-separated reason, `canceled_by`. Merges → `cancel_source: "merge"`. All restaurants, all history. |

### Sign-off

| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BA-23a | | `cancel_source` on 3 endpoints | |
| BA-23b | | Comma-separated reason | |
| BA-23c | | Insights counting fix | |
| BA-23d | | `all_items_cancelled` audit event | |
| BA-23e | | Backfill historical data | |
