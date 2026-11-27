# API Contract — CR-493 Cancel reason / notes setting — v1 — 2026-11-15

Backend: Gyan · IDs: BA-05, BA-06, BA-23 · FE plan: `plans/BATCH-A_CR-493_IMPLEMENTATION_PLAN_2026_11_15.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**

## 1. Notes-mandatory setting (BA-05)
| Where | Field | Type | Values | Default | Status |
|---|---|---|---|---|---|
| `GET /api/v1/vendoremployee/profile` → `restaurants[0]` | `cancel_note_mandatory` | string | `"Yes"` / `"No"` | `"No"` | NEW |
| `GET /api/v2/vendoremployee/restaurant-settings/settings-list` | `cancel_note_mandatory` | string | `"Yes"` / `"No"` | `"No"` | NEW |
| `POST /api/v2/vendoremployee/restaurant-settings/update-settings` | `cancel_note_mandatory` | string | `"Yes"` / `"No"` | — | NEW |

One key for both order cancel and item cancel. When `"Yes"`, backend rejects an empty note: 422 `CANCEL_NOTE_REQUIRED` on `order-status-update` (cancel) and `cancel-food-item`.

## 2. Reasons list (BA-06) — `GET /api/v1/vendoremployee/cancellation-reasons`
| Path | Type | Values | Status |
|---|---|---|---|
| `[].item_type` | string | `"Order"` / `"Food"` | EXISTING — confirm unchanged |

## 3. Auto-cancel when the last item is cancelled (BA-23) — BEHAVIOUR + NEW field
| Path (order) | Type | Rule | Status |
|---|---|---|---|
| `cancellation_reason` | string | = the last cancelled item's reason text (not null) | BEHAVIOUR |
| `cancellation_note` | string | `""` | BEHAVIOUR |
| `canceled_by` | string | = employee who cancelled the last item (not null) | BEHAVIOUR |
| `cancel_source` | string | `"manual"` / `"auto_last_item"` / `"merge"` | NEW — on order in cancel-order-list, insights-cancellations, Order Beta |

Insights (`GET /api/v2/vendoremployee/report/insights-cancellations`): orders with `cancel_source` `"auto_last_item"` or `"merge"` must NOT be counted again as order cancels (no double count, no "No reason provided" row).

## 4. Errors
| Code | HTTP | When |
|---|---|---|
| `CANCEL_NOTE_REQUIRED` | 422 | setting `"Yes"` and note empty |

## 5. Backend sign-off
| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BA-05 | | | |
| BA-06 | | | |
| BA-23 | | | |
