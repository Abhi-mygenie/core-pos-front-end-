# API Contract — CR-494 PIN, thresholds, daily limits — v1 — 2026-11-15

Backend: Gyan · IDs: BA-11..BA-15 · FE plan: `plans/BATCH-A_CR-494_IMPLEMENTATION_PLAN_2026_11_15.md` · Mockup M4
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**
All endpoints NEW (guessed paths 404 today).

## 1. Action enum (`action`) — used everywhere below
`cancel_before_serve` · `cancel_after_serve` · `cancel_after_bill` · `edit_after_bill` · `discount` · `complimentary`
Serve stage is decided by the backend (FE sends its best guess; backend's stage wins).

## 2. Read config — `GET /api/v2/vendoremployee/pin/config` (BA-11, BA-12, BA-14, BA-15a)
```json
{
  "actions": [
    { "action": "cancel_before_serve", "pin_enabled": "Yes", "threshold_amount": 500.00 }
  ],
  "daily_limits": {
    "cancel_amount": 2000.00, "cancel_count": 5,
    "discount_amount": 1500.00, "discount_count": 10
  }
}
```
Rule: `amount ≤ threshold_amount` → no PIN; `>` → PIN; `threshold_amount = 0` → PIN always. Amounts in ₹ **incl. tax**; for `discount` = ₹ of the discount. `edit_after_bill` applies to everyone (BA-13). **Never returns PIN values.**

## 3. Read my usage today — `GET /api/v2/vendoremployee/pin/usage` (BA-14, BA-15c)
```json
{ "business_date": "2026-11-15",
  "cancel_amount_used": 850.00, "cancel_count_used": 2,
  "discount_amount_used": 300.00, "discount_count_used": 1 }
```
Server-side, per user, shared across devices, reset per business day. Over a limit → action allowed only with PIN.

## 4. Verify PIN — `POST /api/v2/vendoremployee/pin/verify` (BA-15b)
Request: `{ "action": "<enum>", "pin": "<string>", "order_id": 123, "amount": 640.00 }`
Response OK: `{ "verified": "Yes", "pin_token": "<opaque>", "expires_at": "<ISO8601>" }`
Response fail: 403 `PIN_INVALID`.
`pin_token` is single-use, tied to `action` + `order_id`.

## 5. Protected calls carry the token (BA-15d)
| Endpoint | New field | Status |
|---|---|---|
| `PUT .../order/cancel-food-item` | `pin_token` (string, optional) | NEW |
| `PUT .../order/order-status-update` (cancel) | `pin_token` | NEW |
| update-order after bill print | `pin_token` | NEW |
| bill payment / place-order with discount or comp | `pin_token` | NEW |

If a PIN is required (threshold or daily limit) and `pin_token` is missing/invalid → 403 `PIN_REQUIRED`. Daily counters update on success.

## 6. Admin (BA-11)
PINs, thresholds and limits set in backend admin (phase 1). No FE admin screen.

## 7. Errors
| Code | HTTP | When |
|---|---|---|
| `PIN_REQUIRED` | 403 | PIN needed, token missing/expired |
| `PIN_INVALID` | 403 | wrong PIN on verify |

## 8. Backend sign-off
| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BA-11 | | | |
| BA-12 | | | |
| BA-13 | | | |
| BA-14 | | | |
| BA-15 | | | |
