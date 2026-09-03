# BACKEND_BRIEF_BUG-BE-05_2026_09_03
## PMS check-in (`user-group-check-in`) — missing `id_type` → 500 + orphan order (non-transactional)

## Summary
- Issue: `POST /pos/user-group-check-in` (JSON body) without `id_type` returns **HTTP 500** (`Column 'id_type' cannot be null`) **after** already inserting an `orders` row → orphan order left in DB.
- Classification: BACKEND_BUG (validation + missing DB transaction)
- Frontend impact: Any client that omits `id_type` (PMS S4 Check-In JSON path, third-party/self check-in later) gets a raw SQL error instead of a 422, and the hotel accumulates orphan orders that never appear in `get-room-list` but may surface in order/revenue reports.
- Priority/Risk: **P2 · HIGH** (not a P2-phase blocker — FE sends `id_type`; but data-integrity risk on preprod/prod)

## Endpoint
- Method: POST
- URL: `/api/v1/vendoremployee/pos/user-group-check-in`
- Auth/context: Bearer *** (owner, restaurant 69, sandbox-pms)

## Reproduction
1. Create a Direct reservation: `POST /aiosell/direct-reservation` (201) → `booking_id` MG-69-A26BDA2F-…, room 8524.
2. `POST /pos/user-group-check-in` with JSON: `booking_type=Direct`, `booking_id`, `name`, `phone`, `email`, `room_id:[8524]`, `checkin_date`, `checkout_date`, `order_amount`, `room_price`, `advance_payment`, `balance_payment`, `total_adult`, `total_children`, `booking_for`, `order_note` — **no `id_type`**.
3. Observe 500. SQL in error text shows `order_id = 1232204` already generated. `get-room-list` does not show 8524; reservation stays `pending`.
4. Repeat with `id_type: "Select document type"` (+ FormData-parity keys) → 200, `order_id 1232205`, reservation `in_house`.

## Payload / Response
- Request payload (step 2/4): documented in `/app/memory/plans/CR-358-P2_IMPLEMENTATION_PLAN.md` §4.2
- Actual response (step 3): `/app/memory/evidence/CR-358-P2/probe_06_checkin_direct_json.json`
- Actual response (step 4): `/app/memory/evidence/CR-358-P2/probe_08_checkin_direct_json_idtype.json`
- Expected: `422 { errors: { id_type: [...] } }` **before** any write; or default `id_type` server-side; whole check-in wrapped in a DB transaction.
- Actual: `500 QueryException`, `orders` row 1232204 persisted, `user_id_documents` insert failed, `aiosell_reservation_rooms` untouched.

## Evidence
- Curl output: `/app/memory/evidence/CR-358-P2/probe_06_checkin_direct_json.json`, `probe_07_verify_flip.json`, `probe_08_*.json`, `probe_09_verify_flip.json`, `probe_10_room_list_after.json`
- Screenshot/log: n/a

## Ask
1. Wrap `user-group-check-in` in `DB::transaction()` so a failed `user_id_documents` insert rolls back the order.
2. Validate `id_type` (and other NOT NULL columns) → 422 before writes, or default it to `"Select document type"` (what the POS FormData path sends).
3. Clean up orphan `orders.id = 1232204` (restaurant 69) if it appears in reports.

## Frontend Workaround
- Available: YES
- Details: `pmsService.pmsCheckIn()` (CR-358-P2) always sends `id_type: "Select document type"` plus the full FormData-parity key set (plan §4.2). Verified 200 on preprod 2026-09-03.
