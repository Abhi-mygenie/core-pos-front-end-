# API Contract — CR-528 Post-bill-print changes in Audit report — DRAFT v1 — 2026-11-15

> **⚠️ SUPERSEDED by v2 (2026-11-16).** This v1 contract targeted `order-logs-report` — the wrong endpoint. The Audit page (`AuditLogMockup.jsx`) uses `insights-dashboard`, not `order-logs-report`. See `contracts/BATCH-C_CR-528_API_CONTRACT_2026_11_16_v2.md` for the correct contract.
>
> **Backend reply on v1 (2026-11-16):** Gyan delivered ALL 6 items on `order-logs-report` — `bill_printed_at`, `bill_print_count`, `print_bill_status`, `operations[]` with `bill_print`/`item_cancel`/`order_cancel` events. Validation: `backend_replies/CR-528_BACKEND_REPLY_VALIDATION_2026_11_16.md`. This confirms the database-level plumbing works; the remaining ask is to surface these fields on `insights-dashboard` → `audits` (v2 contract).

Backend: Gyan · ID: ASK 2 · IA doc: `impact/CR-528_IMPACT_ANALYSIS.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**
**Status: ~~DRAFT v1~~ SUPERSEDED — see v2. Backend delivered v1 fields on order-logs-report (2026-11-16).**

## 1. Persist bill_print_status and log every print (ASK 2)

Endpoint: `GET /api/v2/vendoremployee/report/order-logs-report` → `orders_table` rows + `operations[]`

**Problem (probe 02g/02f):** `print_bill_status` exists on `orders_table` but stays `'No'` even after printing. `operations[]` today only has `order_edit` entries — no `bill_print` event.

### a) `orders_table` row — persist print flag + timestamp

| Path | Type | Values | Default | Status |
|---|---|---|---|---|
| `orders_table[].print_bill_status` | string | `'Yes'` / `'No'` | `'No'` | EXISTING — **fix: persist `Yes` when bill is printed** |
| `orders_table[].bill_printed_at` | string (datetime) or null | Datetime of **latest** bill print (incl. reprints) | `null` | NEW — **LOCKED** |
| `orders_table[].bill_print_count` | integer | Total number of times bill was printed | `0` | NEW — **LOCKED** |

### b) `operations[]` — log every bill print event

| Path | Type | Values | Status |
|---|---|---|---|
| `operations[].operation` | string | `'bill_print'` | NEW value — **LOCKED** |
| `operations[].created_at` | string (datetime) | When bill was printed | NEW |
| `operations[].employee` | string | Name of employee who printed | NEW |
| `operations[].amount` | number | Order amount at time of print | NEW |

**Rule:** one `operations[]` entry per print event, including reprints after an edit (OD-C-R3 Q5: every print, not just first).

### c) Item-level cancels in operations (OD-528-B)

| Path | Type | Values | Status |
|---|---|---|---|
| `operations[].operation` | string | `'item_cancel'` | EXISTING — confirm present today |

OD-528-B: post-print section shows both order-level AND item-level cancels. Backend confirms `item_cancel` appears in `operations[]` for items cancelled after print.

### d) Order-level cancel in operations

| Path | Type | Values | Status |
|---|---|---|---|
| `operations[].operation` | string | `'order_cancel'` | NEW — log whole-order cancellation after print |

## 2. Backend sign-off

| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| ASK 2 | | Confirm: (1) `print_bill_status` persisted; (2) `bill_print` in ops with time/employee/amount; (3) `bill_print_count`; (4) `bill_printed_at` (latest); (5) `item_cancel` in ops confirmed; (6) `order_cancel` added to ops | |
