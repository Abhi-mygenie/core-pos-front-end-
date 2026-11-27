# API Contract — BUG-674 Order-cancel note — v2 — 2026-11-15 (item note key = `cancel_item_note`)

Backend: Gyan · IDs: BA-02, BA-03, BA-04, BA-24 · FE plan: `plans/BATCH-A_BUG-674_IMPLEMENTATION_PLAN_2026_11_15.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**

## 1. Order cancel — `PUT /api/v2/vendoremployee/order/order-status-update` (request)
| Field | Type | Values | Req | Status |
|---|---|---|---|---|
| `order_id` | int | — | Y | EXISTING |
| `role_name` | string | — | Y | EXISTING |
| `order_status` | string | `"cancelled"` | Y | EXISTING |
| `cancellation_reason` | string | reason text | Y | EXISTING |
| `cancellation_note` | string | free text, **`""` allowed** | Y | EXISTING — **BEHAVIOUR (BA-04):** store `""` as empty; never copy the reason into it |
| `printer_agent` | array | — | Y | EXISTING |

**BA-24 (refund cancel):** for Razorpay refund-cancels FE sends the Refund Note in this same `cancellation_note` on `order-status-update`. The `cancel-and-refund-order` call stays unchanged. Backend confirms ✅ (no new key).

## 2. Cancel list — `GET /api/v2/vendoremployee/cancel-order-list` (response)
| Path | Type | Status |
|---|---|---|
| `orders[].cancellation_reason` | string \| null | EXISTING |
| `orders[].cancellation_note` | string \| null | EXISTING (must return the stored note) |
| `orders[].canceled_by` | string | EXISTING |
| line `reason` | string | **BEHAVIOUR (BA-03):** full-order cancel must NOT overwrite a line's own `reason` with the order note |

## 3. Order Beta — `GET /api/v1/vendoremployee/daily-order-report-details-combined` (response, BA-02)
| Path | Type | Values | Status |
|---|---|---|---|
| order `cancellation_reason` | string \| null | null when not cancelled | NEW |
| order `cancellation_note` | string \| null | | NEW |
| order `canceled_by_name` | string \| null | employee display name | NEW |
| line `cancel_reason` | string \| null | per cancelled line | NEW |
| line `cancel_item_note` | string \| null | per cancelled line (same key as BUG-670) | NEW |

## 4. Errors
None new.

## 5. Backend sign-off
| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BA-02 | | | |
| BA-03 | | | |
| BA-04 | | | |
| BA-24 | | | |
