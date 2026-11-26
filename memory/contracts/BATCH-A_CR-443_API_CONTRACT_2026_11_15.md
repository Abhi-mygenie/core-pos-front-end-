# API Contract — CR-443 Staff alerts — v1 — 2026-11-15

Backend: Gyan · IDs: BA-19..BA-22 · FE plan: `plans/BATCH-A_CR-443_IMPLEMENTATION_PLAN_2026_11_15.md` · Mockup M9
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**

## 1. Delivery (BA-20)
Existing Firebase flow: FE sends `fcm_token` at login (EXISTING). Backend sends FCM **data** messages to users holding the receive right.

## 2. FCM `data.type` values (BA-19) — NEW
`staff_cancel_before_serve` · `staff_cancel_after_serve` · `staff_order_unpaid` · `staff_payment_method_changed` · `staff_discount_above_limit` · `staff_complimentary` · `staff_cancel_after_bill`

## 3. FCM `data` payload — all values strings (FCM rule)
| Key | Example | Req |
|---|---|---|
| `type` | `staff_cancel_after_serve` | Y |
| `title` | `Cancelled after serve` | Y |
| `body` | `T4 · Paneer Tikka · by Ravi · Customer left` | Y |
| `order_id` | `1568851` | Y |
| `restaurant_order_id` | `021421` | Y |
| `table_name` | `T4` (empty if room/none) | Y |
| `room_no` | `101` (empty if not room) | Y |
| `item_names` | `Paneer Tikka, Naan` (empty for whole order) | Y |
| `amount` | `640.00` | Y |
| `by_employee_id` | `3092` | Y |
| `by_employee_name` | `Ravi` | Y |
| `reason` | reason text (empty if none) | Y |
| `note` | note text (empty if none) | Y |
| `old_payment_method` / `new_payment_method` | `UPI` / `Cash` (only `staff_payment_method_changed`) | cond. |
| `created_at` | ISO8601 | Y |

## 4. Receive right (BA-21) — NEW key
`receive_staff_alerts` in the permission catalogue / role permissions. Only holders get these FCM messages. Per-device mute is FE-only (no API).

## 5. Discount alert amount (BA-22) — NEW setting
`alert_discount_above_amount` (number, ₹) in settings-list + profile `restaurants[0]` + update-settings. `staff_discount_above_limit` fires when discount ₹ > this value. 0 or missing → no discount alert.

## 6. Errors
None (push only).

## 7. Backend sign-off
| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BA-19 | | | |
| BA-20 | | | |
| BA-21 | | | |
| BA-22 | | | |
