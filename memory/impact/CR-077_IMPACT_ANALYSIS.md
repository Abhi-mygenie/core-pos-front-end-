# CR-077 — Socket Room-Join Contract (restore realtime after room-scoped emits)

**Date:** 2026-07-19 | **Role:** PLANNING (Gate 2) | **Risk:** HIGH (sockets — full gate flow, no Fast Lane)
**Severity:** P0 — realtime new-order delivery is currently DEAD on preprod (proven, iteration_5)
**Code Reality:** NONE (no join code exists anywhere in frontend)
**Conflict Pre-Check:** socketService.js / useSocketEvents.js / socketEvents.js — last touched by BUG-167 (QA PASS, awaiting smoke). No open item modifies the same lines. Parallel-safe; BUG-167 change (route-level subscription) is orthogonal.
**Related:** INV-SOCKET-001 (root investigation), FE-4 (handshake auth+join, subsumed partially), BUG-094/BUG-124 (backend payload items, unaffected)

## Problem
Backend changed socket server `/order-update` from global `io.emit(...)` to `io.to('rest_'+restaurant_id).emit('new_order_'+rid, ...)`. Rooms fixed the tenant leak (verified) but NO client is ever a member of `rest_<rid>`:
- Frontend `socketService.connect()` sends no auth/query in the handshake.
- Frontend never emits anything to the server (verified — `socketService.emit` has zero call sites).
- Server has no working join handler (9 candidate events probed live — none joined the room).
→ Logged-in POS (rid 644) received 0 `new_order_644` events across 2 triggered POSTs. Evidence: /app/memory/evidence/INV-SOCKET-001/ROOM_FIX_VALIDATION_2026-07-19.md, /app/test_reports/iteration_5.json.

## Data Flow Trace (current, broken)
Laravel → POST presocket `/order-update` → `io.to('rest_'+rid)` → **room is EMPTY** ✂ BREAK POINT
→ (never reaches) client `new_order_<rid>` listener → useSocketEvents.handleOrderChannelEvent → handlers → OrderContext → UI.
Client side (all healthy, unchanged): SocketContext.jsx:38 connects when authenticated → useSocketEvents.js:204-218 subscribes to `new_order_<rid>`, `update_table_<rid>`, `order-engage_<rid>`, `food_update_<rid>` channels once restaurantId is available.

## Options
**Option A — handshake auto-join:** client passes `auth/query: { restaurant_id | token }` in `io(URL, opts)`; server joins on `connection`. Pros: survives reconnects automatically; enables auth validation (closes F6 gap). Cons: `socketService.connect()` is invoked from SocketContext.jsx:38 where only `isAuthenticated` is known — restaurantId (RestaurantContext) loads later during /loading, so connect-time rid is not reliably available without re-plumbing contexts or reading localStorage.
**Option B — explicit join event (RECOMMENDED for this fix):** server adds `socket.on('join_restaurant')` → `socket.join('rest_'+rid)`; client emits it (a) when subscriptions are set up and (b) on every reconnect. Pros: fits existing architecture (useSocketEvents already has restaurantId and runs on connect); tiny diff; backend handler is additive and can deploy before frontend with zero risk. Cons: joins are unauthenticated until Phase-2 token validation (status quo today anyway — handshake is already unauthenticated).
Phase 2 (separate item, backend-led): validate token inside join / handshake → closes F6.

## CRITICAL Socket.IO mechanic
Room membership is per-connection and is LOST on every reconnect. The client MUST re-emit join on each `connect` event, not just once. (Fleet reconnects during origin flaps would otherwise silently kill realtime again.)

## Affected Files (frontend)
| File | Why |
|---|---|
| src/api/socket/socketEvents.js | add join event name constant |
| src/api/socket/socketService.js | store rid; emit join; re-join inside CONNECT handler (line ~227) |
| src/api/socket/useSocketEvents.js | call joinRestaurant(restaurantId) in subscription effect (line ~204) |
NOT touched: SocketContext.jsx, socketHandlers.js, any context/transform/financial file.

## Downstream Consumers
All realtime channels benefit once backend scopes them: new_order, update_table, aggregator_order, order-engage, food_update, login_disabled. Envelope compatibility verified: backend's new emit args (order_type, order_id, restaurant_id, food_status, order_details) match MSG_INDEX [EVENT_NAME, ORDER_ID, RESTAURANT_ID, STATUS, PAYLOAD] — no handler change needed.

## Sequencing Constraint (blast-radius control)
1. Backend deploys join handler (additive — safe, nothing depends on it yet). `/order-update` realtime stays broken until step 2.
2. Frontend ships join emit → realtime for new orders RESTORED.
3. Only then backend converts remaining global `io.emit` paths to `io.to('rest_'+rid)` (login_disabled etc.).
Reversing 2 and 3 extends the outage to all channels.

## Owner Decisions Needed
- D1: Approve Option B contract (event name `join_restaurant`, payload `{ restaurant_id }`) — must be agreed verbatim with backend team.
- D2: Phase-2 token validation on join — register as separate backend-led item? (recommended YES)
