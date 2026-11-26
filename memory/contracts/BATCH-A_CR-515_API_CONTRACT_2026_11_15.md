# API Contract — CR-515 Payment rights — v2 — 2026-11-15 (pay-later key rule clarified by owner)

Backend: Gyan · ID: BA-09 (BA-10 phase 2) · FE plan: `plans/BATCH-A_CR-515_IMPLEMENTATION_PLAN_2026_11_15.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**

## 1. Right keys
| Action | Key | Status |
|---|---|---|
| Change payment method | `update_payment` | EXISTING |
| Make unpaid | `order_unpaid` | EXISTING |
| Item cancel (phase 1) | `order_cancel` | EXISTING |
| Collect pay-later (Hold tab) | existing key, **or** `collect_pay_later` | **Owner rule: existing keys are never renamed.** If a right for collecting pay-later already exists, backend gives its exact current name and FE uses it as is (no new key, no rename). Only if none exists does backend add `collect_pay_later` exactly. |

## 2. Server enforcement — BEHAVIOUR
| Endpoint | Right needed | Error |
|---|---|---|
| `POST /api/v2/vendoremployee/change-order-payment-method` `{ order_id, payment_method }` | `update_payment` | 403 `RIGHT_REQUIRED` |
| `POST /api/v2/vendoremployee/make-order-unpaid` `{ order_id }` | `order_unpaid` | 403 `RIGHT_REQUIRED` |
| bill payment on a pay-later (held) order | the existing pay-later key (or `collect_pay_later` if none exists) | 403 `RIGHT_REQUIRED` |
| `PUT /api/v2/vendoremployee/order/cancel-food-item` | `order_cancel` | 403 `RIGHT_REQUIRED` |

Request and response bodies unchanged.

## 3. Errors
| Code | HTTP | When |
|---|---|---|
| `RIGHT_REQUIRED` | 403 | user lacks the right for the action |

## 4. Backend sign-off
| ID | OK / ETA / Not feasible | Notes (existing pay-later key, if any) | Date |
|---|---|---|---|
| BA-09 | | | |
