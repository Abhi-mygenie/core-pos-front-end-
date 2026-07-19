# INV-SOCKET-001 — Backend Room-Fix Validation — 2026-07-19

## Backend change validated (deployed on presocket.mygenie.online)
`POST /order-update` now does `io.to('rest_'+restaurant_id).emit('new_order_'+restaurant_id, order_type, order_id, restaurant_id, food_status, order_details)`.
Confirmed live: POST returns 200 `{"status":"Message broadcasted22"}`.

## Verdict
| Check | Result |
|---|---|
| V1 Tenant leak via /order-update | ✅ FIXED — no-join outsider socket received 0 events (was foreign=6 in iteration_4) |
| V2 Own restaurant still receives new orders | ❌ CRITICAL REGRESSION — logged-in POS (rid 644, owner@cafe103.com) received 0 `new_order_644` events across 2 triggered POSTs (wiretap via window.__SOCKET_SERVICE__.socket.onAny) |
| V3 Other emit paths (login_disabled_<rid> etc.) | Inconclusive in window — backend fix was scoped to /order-update only; re-observe longer during traffic |

## Root cause of regression
Frontend never joins room `rest_<rid>`:
- `socketService.js connect()` (lines 43-71): io(SOCKET_URL) with NO auth/query — server can't auto-join.
- Frontend emits NOTHING to the socket server (verified: `socketService.emit` never called).
- Probe tried 9 join-event candidates ('join', 'join_room', 'subscribe', ...) → none placed a socket in `rest_777001`.
→ Room-scoped emit reaches ZERO clients. Realtime new orders are dead until a join contract exists.

## Required contract (pick one, backend + frontend must agree)
- **Option A (recommended):** server auto-joins on handshake — reads `restaurant_id` (or auth token) from `socket.handshake.auth`/`query`, calls `socket.join('rest_'+rid)`. Frontend then passes `auth: { restaurant_id }` (1-line connect option). Also closes the F6 unauthenticated-handshake privacy gap if token-validated.
- **Option B:** server adds `socket.on('join_restaurant', rid => socket.join('rest_'+rid))`. Frontend emits it in the 'connect' handler (maps to FE-4).
Either way the frontend needs a small change — NOT done (user mandate: no code edits this session).

## Evidence
- /app/memory/evidence/INV-SOCKET-001/room_fix_probe.js + room_fix_probe_result.txt (pod probe)
- /app/memory/evidence/INV-SOCKET-001/frontend_wiretap_2026-01.txt (logged-in wiretap)
- /app/test_reports/iteration_5.json (testing agent verification)

## Re-test after backend adds join
Login rid 644 → wiretap onAny → `curl -X POST https://presocket.mygenie.online/order-update -H 'Content-Type: application/json' -d '{"order_type":"new-order","order_id":999999,"restaurant_id":644,"food_status":0,"order_details":{"orders":[]}}'` → expect exactly ONE `new_order_644` on the 644 tab, ZERO on any other tenant/outsider socket.
