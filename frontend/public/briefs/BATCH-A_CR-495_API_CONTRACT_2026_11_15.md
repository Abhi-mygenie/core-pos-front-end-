# API Contract — CR-495 Meal package + room comp limit — v1 — 2026-11-15

Backend: Parth (cc Gyan) · IDs: B-495-1..7 · FE plan: `plans/BATCH-A_CR-495_IMPLEMENTATION_PLAN_2026_11_15.md` · Mockups M8, M8b, M5, M5c
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**
Owner rules: R6–R10, R16–R18 (`change_requests/BATCH_A_OWNER_DECISIONS_2026_11_14.md`).

## 1. Enums
- `meal_package`: `room_only` · `breakfast` · `half_board` · `full_board`
- `half_board_meal`: `lunch` · `dinner` (required only when `half_board`)
- `meal`: `breakfast` · `lunch` · `dinner`

## 2. Check-in — `POST /api/v1/vendoremployee/pos/user-group-check-in` (request, B-495-1/2) — additive
| Field | Type | Values | Req | Status |
|---|---|---|---|---|
| existing check-in fields | — | as today | — | EXISTING |
| `meal_package` | string | enum | Y | NEW |
| `half_board_meal` | string \| null | `lunch`/`dinner` | Y when `half_board`, else null | NEW |
| `guest_count` | int | ≥ 1 | Y | NEW |
Missing/invalid → 422 `MEAL_PACKAGE_INVALID`.

## 3. Edit guest count during stay — `PUT /api/v2/vendoremployee/pos/room-guest-count` (B-495-2) — NEW
Request `{ "order_id": 123, "guest_count": 3 }` → `{ "guest_count": 3 }`.

## 4. Returned on (B-495-1/2)
`GET /api/v2/vendoremployee/get-room-list` (per room), room order `room_info`, folio: `meal_package`, `half_board_meal`, `guest_count` (same names/types). OTA bookings (B-495-7): same three fields filled from the channel meal plan; `half_board_meal` null if the channel doesn't send it.

## 5. Limit settings (B-495-3) — settings-list + profile `restaurants[0]` + update-settings
`room_comp_limits` (object, ₹ per guest per meal):
```json
{ "breakfast":  { "breakfast": 300.00 },
  "half_board": { "breakfast": 300.00, "lunch": 500.00, "dinner": 500.00 },
  "full_board": { "breakfast": 300.00, "lunch": 500.00, "dinner": 600.00 } }
```
Meals in package: breakfast → breakfast; half_board → breakfast + `half_board_meal`; full_board → all three; room_only → none.

## 6. Usage — `GET /api/v2/vendoremployee/pos/room-comp-usage?order_id=123` (B-495-4) — NEW
```json
{ "business_date": "2026-11-15", "guest_count": 2, "meal_package": "half_board", "half_board_meal": "lunch",
  "meals": {
    "breakfast": { "in_package": "Yes", "limit": 600.00, "used": 220.00, "remaining": 380.00 },
    "lunch":     { "in_package": "Yes", "limit": 1000.00, "used": 0.00, "remaining": 1000.00 },
    "dinner":    { "in_package": "No",  "limit": 0.00, "used": 0.00, "remaining": 0.00 } } }
```
`limit` = per-guest limit × `guest_count`. Server-side counter, per room, per meal, per business day, shared across devices.

## 7. Comp save on a room order (B-495-5/6)
| Field (comp line) | Type | Values | Req | Status |
|---|---|---|---|---|
| `is_complementary`, `complementary_reason` | — | as CR-492 contract | Y | EXISTING |
| `comp_meal` | string | `meal` enum, picked by cashier (R16) | Y on room orders when `is_complementary = "Yes"` | NEW |
| `pin_token` | string | from CR-494 verify (`action` = `complimentary`) | when PIN required | NEW (CR-494) |
PIN required when: over `remaining` for `comp_meal`, or `comp_meal` not in package (R18), or `room_only` (R7). Missing → 403 `PIN_REQUIRED`. Missing `comp_meal` → 422 `COMP_MEAL_REQUIRED`.

## 8. Errors
| Code | HTTP | When |
|---|---|---|
| `MEAL_PACKAGE_INVALID` | 422 | bad/missing package, half-board meal or guest count |
| `COMP_MEAL_REQUIRED` | 422 | room comp without `comp_meal` |
| `PIN_REQUIRED` | 403 | over limit / outside package / room only, no valid token |

## 9. Backend sign-off
| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| B-495-1 | | | |
| B-495-2 | | | |
| B-495-3 | | | |
| B-495-4 | | | |
| B-495-5 | | | |
| B-495-6 | | | |
| B-495-7 | | | |
