# API Contract — BUG-670 Item-cancel note — v2 — 2026-11-15 (owner: key renamed `cancel_note` → `cancel_item_note` before sending)

Backend: Gyan · ID: BA-01 · FE plan: `plans/BATCH-A_BUG-670_IMPLEMENTATION_PLAN_2026_11_15.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**

## 1. Item cancel — `PUT /api/v2/vendoremployee/order/cancel-food-item` (request)
| Field | Type | Values | Req | Status |
|---|---|---|---|---|
| `order_id`, `order_food_id`, `item_id`, `cancel_qty`, `order_status`, `reason_type`, `reason`, `cancel_type`, `printer_agent` | — | as today | Y | EXISTING |
| `cancel_item_note` | string | free text, `""` allowed (max 255) | Y (always sent) | **NEW — store per cancelled line** |

Probe note: none of the tried keys (`cancel_reason_text`, `notes`, `cancellation_note`, `cancel_note`) is stored today (IA files 20–26). Backend adds `cancel_item_note`.

## 2. Responses that must return it
| Endpoint | Path | Type | Status |
|---|---|---|---|
| `GET /api/v2/vendoremployee/cancel-order-list` | cancelled line `cancel_item_note` | string \| null | NEW |
| `GET /api/v2/vendoremployee/report/insights-cancellations` | `items[].cancel_item_note` | string \| null | NEW (keep `items[].notes` = kitchen note, unchanged) |
| `GET /api/v1/vendoremployee/daily-order-report-details-combined` | line `cancel_item_note` | string \| null | NEW (see BUG-674 §3) |

## 3. Errors
None new.

## 4. Backend sign-off
| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BA-01 | | | |
