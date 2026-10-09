# BACKEND_BRIEF_PROD-003_2026-10-09

## Summary
- Issue: When a PayLater bill is settled, the backend does not reliably send the `update-order-paid` socket event, so POS has to guess from other events to clear the table.
- Classification: CONTRACT_MISMATCH (socket event contract)
- Frontend impact: After a PayLater settle, the table can stay "occupied" (or be freed wrongly) when the settle arrives on the generic `update-order` event instead of `update-order-paid`. Table status on the running dashboard is then wrong until refresh.
- Priority/Risk: P2 · HIGH (sockets + order lifecycle; Business safety rule — settlement)
- Origin: PROD-003 "PayLater table clear" (registered 2026-05-21, status was `FE-VERIFIED, BE-FOLLOWUP`, note: "Backend should emit on update-order-paid"). Closed in closure pass 2026-10-09; this brief keeps the backend follow-up alive.

## Endpoint
- Method: socket emit (server → POS)
- Event expected: `update-order-paid` (`SOCKET_EVENTS.UPDATE_ORDER_PAID`, `frontend/src/api/socket/socketEvents.js:76`)
- Event observed (per PROD-BUG-003 notes): generic `update-order` with `f_order_status = 9`
- Trigger: PayLater settle / bill collected as PayLater (REST endpoint that performs the settle — **backend to confirm which endpoint emits**)
- Server: `presocket.mygenie.online` (preprod) · Auth/context: restaurant room channel, RID `***`

## Reproduction
1. Login to POS (preprod), open a dine-in table, place an order.
2. Collect Bill → choose payment method **PayLater** → settle.
3. Watch socket traffic: expected `update-order-paid` with `payment_type=prepaid`, `payment_method=paylater`, `payment_status=success`.
4. Actual (reported): event arrives as `update-order` with `f_order_status=9` → indistinguishable from Hold/Park on the channel.

## Payload / Response
- Request payload path: `/app/memory/evidence/PROD-003/` — **not captured yet** (to be added on next live repro)
- Expected: settle of a PayLater bill always emits `update-order-paid`; `payment_status` spelled `success` (typo `sucess` is tracked as PAY-007).
- Actual: sometimes `update-order` (f_order_status=9); `payment_status` = `sucess`.

## Evidence
- Code: `frontend/src/api/socket/socketHandlers.js:300-341`
  - L311 `isPayLaterSettle` relies on `eventName === 'update-order-paid'` (BUG-049 contract: "PayLater settle ALWAYS arrives on update-order-paid").
  - L328-338 PROD-BUG-003 fallback: when it arrives on `update-order`, POS checks `paymentType/paymentMethod/paymentStatus` to tell PayLater apart from Hold.
  - L316-321 accepts both `sucess` and `success`.
- Curl output / socket log: not captured (legacy item, pre-evidence standard).

## Frontend Workaround
- Available: YES (shipped, PROD-BUG-003, 2026-05-20)
- Details: field-based fallback on `update-order` frees the table when `payment_type=prepaid` + `payment_method=paylater` + `payment_status ∈ {sucess, success}`. Fragile: depends on backend field names/spelling; any change breaks table clear silently.

## Ask to backend
1. Confirm which endpoint performs PayLater settle and that it emits `update-order-paid` every time (not `update-order`).
2. Confirm `payment_status` spelling on that event (fix `sucess` → `success`, PAY-007) — POS accepts both, so this is safe to change.
3. Reply with a sample event payload → store at `/app/memory/evidence/PROD-003/`.
Once 1 is confirmed, POS can remove the L328-338 fallback (new CR).
