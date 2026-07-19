# STANDALONE HANDOVER — CR-077 Socket Room-Join (FE Implementation) — 2026-07-19

**READ ME FIRST:** This document is SELF-CONTAINED. No other files travel with it. Everything you need — bug history, validated backend state, exact code changes, test scripts, verification steps — is embedded below.

**Your role:** IMPLEMENTATION. Wait for owner's "Gate 4 GO" before writing code. Then implement Part 3, verify with Part 4.

---

## PART 1 — THE STORY SO FAR (why this change exists)

### 1.1 Original bug (INV-SOCKET-001, P0/CRITICAL)
MyGenie POS (React 19 CRA frontend) fleet of ~1,000 restaurant devices hung 1–4 minutes during peak hours. Investigation proved the Socket.IO v4 server at `https://presocket.mygenie.online` (nginx, single A-record) broadcast EVERY restaurant's events to ALL connected clients — raw `io.emit()` on the default namespace, no rooms, no join. O(N²) fan-out.
**Live proof:** an unauthenticated socket with NO join received other tenants' events (`login_disabled_689`, `login_disabled_523`) while logged-in restaurant 644 was quiet (own=0, foreign=6 in a 4-min window). Secondary findings (parked, NOT in scope here): socket handlers that GET the order API on every event (retry herd, fixed 1s no jitter), synchronized 60s polls, `connect()` duplicate-socket race (guard only checks `.connected`), origin flaps to Cloudflare 521, unauthenticated handshake.

### 1.2 Backend fix #1 — room-scoped emit (deployed, validated)
Backend team changed the socket server's HTTP trigger endpoint:
```js
app.post('/order-update', (req, res) => {
    let order_type = req.body.order_type || "";
    let order_id = req.body.order_id || 0;
    let restaurant_id = req.body.restaurant_id || 0;
    let food_status = req.body.food_status || 0;
    let order_details = req.body.order_details || [];
    let publish_id = 'new_order_' + restaurant_id;
    io.to('rest_' + restaurant_id).emit(publish_id, order_type, order_id, restaurant_id, food_status, order_details);
    res.status(200).send({ status: 'Message broadcasted22' });   // response text confirms new code is live
});
```
Result (both verified live): ✅ leak FIXED (outsider socket receives 0). ❌ CRITICAL REGRESSION: logged-in POS ALSO receives 0 — rooms require membership and nothing ever joined clients to `rest_<rid>`. The frontend never emits anything to the socket server (verified: `socketService.emit` has zero call sites) and the handshake carries no auth/query.

### 1.3 Backend fix #2 — B1 join handler (deployed, validated 100%)
```js
io.on('connection', (socket) => {
    socket.on('join_restaurant', (data) => {
        const rid = parseInt(data && data.restaurant_id, 10);
        if (!rid) return;
        for (const room of socket.rooms) {
            if (room !== socket.id && room.startsWith('rest_')) socket.leave(room);
        }
        socket.join('rest_' + rid);
        socket.emit('joined_restaurant', { room: 'rest_' + rid });
    });
});
```
Validation results (node probes + independent testing agent, all PASS):
- join → ack `joined_restaurant {room:'rest_777001'}` received
- POST /order-update for joined rid → EXACTLY ONE `new_order_<rid>` event, args `['new-order', 424242, 777001, 0, {orders:[]}]`
- never-joined control socket → 0 events (isolation)
- re-join with different rid → old room left (0 leaks), new room delivers (tenant-switch cleanup works)
- invalid payloads `{}` / `{restaurant_id:'abc'}` → silently ignored, no crash, next valid join works

### 1.4 CURRENT LIVE STATE (your starting point)
- Tenant leak on /order-update: FIXED.
- Realtime new orders in the POS: **STILL DEAD** — frontend doesn't emit `join_restaurant`. That is exactly what you implement.
- All OTHER channels (`update_table_<rid>`, `food_update_<rid>`, `order-engage_<rid>`, `aggregator_order_<rid>`, `login_disabled_<rid>`) are STILL globally broadcast (leak included) — they keep working today. Backend converts them to rooms ("B2") ONLY AFTER your change ships. **Sequencing is critical: if B2 lands before your code, ALL realtime dies, not just new orders.**

---

## PART 2 — FRONTEND ARCHITECTURE YOU'LL TOUCH (as-is facts, verified by code trace)

- Socket URL: `process.env.REACT_APP_SOCKET_URL` = `https://presocket.mygenie.online`.
- `src/api/socket/socketService.js` — singleton class `SocketService`; `connect()` (lines ~43–71) calls `io(SOCKET_CONFIG.URL, {reconnection:true, attempts:10, delay:1000→30000, timeout:5000, transports:['websocket','polling']})` — NO auth/query. `_setupConnectionHandlers()` registers CONNECT handler at ~line 227. `disconnect()` at ~line 76 nulls the socket. Dev builds expose `window.__SOCKET_SERVICE__` (T-10).
- `src/contexts/SocketContext.jsx` — connects when `isAuthenticated` (line ~38), StrictMode-guarded by `initializedRef`; reconnect paths: tab-visible (line ~78), network-online (line ~97), manual retry (line ~133). **restaurantId is NOT available here** (it loads later, on /loading, into RestaurantContext) — this is why join can't go in connect options.
- `src/api/socket/useSocketEvents.js` — mounted app-wide via `src/components/AppSocketManager.jsx` (rendered in App.js, persists across routes — BUG-167). Gets `restaurantId = restaurant?.id` (line ~49). Subscription effect (lines ~195–265) runs when `isConnected && restaurantId`, subscribes to `new_order_<rid>`, `update_table_<rid>`, `order-engage_<rid>`, `food_update_<rid>`; deps: [isConnected, restaurantId, subscribe, 4 handlers]. **This effect is the only place where "connected + rid known" is guaranteed simultaneously → the join injection point.**
- `src/api/socket/socketEvents.js` — channel name generators + `MSG_INDEX` envelope `[EVENT_NAME, ORDER_ID, RESTAURANT_ID, STATUS, PAYLOAD]` (lines ~163–170) — already matches the backend emit 1:1, NO handler changes needed.
- `src/hooks/useStationSocketRefresh.js` (used by StationPanel.jsx) — second subscriber to `new_order_<rid>` on the SAME singleton socket → covered by the single join, DO NOT touch.
- Existing unit tests live at `src/__tests__/api/socket/` (socketServiceGlobal, socketEvents, handler tests) — your changes are additive; they must keep passing.

**Registry/process context (their repo has a change-control system under /app/memory/control/):** item is registered as **CR-077**, status "PLANNED — GATE 3", sprint pos_5_0, risk HIGH (sockets — full gate flow, no Fast Lane). Their rules: yarn only (never npm); every modified file needs a `// CR-077` code marker; after coding update registry.json + CR_REGISTRY.md + FILE_OWNERSHIP.md. If those control files don't exist in your environment, note it in your report and skip.

---

## PART 3 — EXACT CODE CHANGES (3 files, ~22 added lines, 0 modified/removed)

### F1 — `src/api/socket/socketEvents.js` (after the SOCKET_EVENTS block, ~line 93)
```js
// =============================================================================
// CR-077: Room-join contract with socket server (INV-SOCKET-001)
// Server: socket.on('join_restaurant', {restaurant_id}) -> socket.join('rest_'+rid)
// =============================================================================
export const JOIN_EVENT = 'join_restaurant';
export const JOINED_ACK_EVENT = 'joined_restaurant';
```

### F2 — `src/api/socket/socketService.js` (4 touch points)
(import) line 5: `import { SOCKET_CONFIG, CONNECTION_EVENTS, JOIN_EVENT } from './socketEvents';`

(a) constructor (~line 31, after `this.statusListeners = new Set();`):
```js
    // CR-077: room to (re)join on every connect
    this.restaurantId = null;
```

(b) new method, after `connect()` ends (~line 72), before `disconnect()`:
```js
  /**
   * CR-077: Register restaurant room. Server joins this socket to rest_<rid>.
   * Safe to call before connection — rid is stored and emitted on 'connect'.
   */
  joinRestaurant(restaurantId) {
    if (!restaurantId) return;
    this.restaurantId = restaurantId;
    if (this.socket && this.socket.connected) {
      this.socket.emit(JOIN_EVENT, { restaurant_id: restaurantId });
      this._log('INFO', `join_restaurant emitted for ${restaurantId}`);
    }
  }
```
**TRAP:** must use raw `this.socket.emit`, NOT `this.emit()` — the class's `emit()` wrapper logs WARN and returns false when disconnected.

(c) CONNECT handler inside `_setupConnectionHandlers()` (~lines 227–233) — **THE CRITICAL EDIT**. Current:
```js
    this.socket.on(CONNECTION_EVENTS.CONNECT, () => {
      this._log('INFO', 'Connected successfully');
      this._setStatus(CONNECTION_STATUS.CONNECTED);
      this.lastConnectedAt = new Date();
      this.reconnectAttempts = 0;
      this.lastError = null;
    });
```
Add before the closing `});`:
```js
      // CR-077: re-join room on EVERY (re)connect — Socket.IO room membership
      // is per-connection and lost on each reconnect
      if (this.restaurantId) {
        this.socket.emit(JOIN_EVENT, { restaurant_id: this.restaurantId });
        this._log('INFO', `join_restaurant re-emitted for ${this.restaurantId} (connect)`);
      }
```
Why critical: socket.io auto-reconnect keeps the same Socket object and re-fires 'connect'. Without this, realtime silently dies after the first network blip and nobody notices until orders stop appearing.

(d) `disconnect()` (~lines 76–84), inside the `if (this.socket)` block:
```js
      // CR-077: clear room on logout — prevents next tenant joining previous tenant's room
      this.restaurantId = null;
```

### F3 — `src/api/socket/useSocketEvents.js` (~line 207)
Current code in the subscription effect:
```js
    if (!restaurantId) {
      console.log('[useSocketEvents] No restaurantId yet, skipping subscriptions');
      return;
    }
    
    // Subscribe to order channel
    const orderChannel = getOrderChannel(restaurantId);
```
Insert between the guard and the subscribe block:
```js
    // CR-077: join server-side room so room-scoped emits reach this client
    socketService.joinRestaurant(restaurantId);
```
No dependency-array change (effect already keyed on isConnected+restaurantId; `socketService` is a module singleton imported at line 14). Do NOT put the unjoin in the effect cleanup — cleanup runs on every re-render/route event; room state lives in the service and is cleared only on disconnect().

### Files you must NOT touch (scope lock)
SocketContext.jsx, AppSocketManager.jsx, socketHandlers.js, useStationSocketRefresh.js, any context/transform, AppProviders order, localStorage keys, .env.

### Edge cases already analyzed (all covered by the above — do not add extra code)
cold login (join fires when rid loads) · auto-reconnect (F2c) · tab sleep/wake + network-online (both call connect() → 'connect' → F2c) · manual retry button (same) · logout→login as different tenant (F2d + server stale-room cleanup, both validated) · React StrictMode double-mount (SocketContext initializedRef guards connect; duplicate join emit is idempotent anyway) · rid flicker on re-render (join is a no-op re-emit) · missed events between connect and rid-load (pre-existing 60s poll + reconnect rehydration handle it — unchanged behavior).

---

## PART 4 — VERIFICATION (run ALL after implementing; use a testing agent for the E2E parts)

**Credentials:** owner@cafe103.com (restaurant_id=644) and Manager@hogwarts.com (restaurant_id=618). Passwords: get from owner (per security rule they are not printed here; owner knows them — same test password for both).
Login API: `POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login` `{"email","password"}`. App preview: your environment's frontend URL; app is a dev CRA build so `window.__SOCKET_SERVICE__` is exposed.

**Trigger command (fires a synthetic order event through the real socket server — harmless):**
```bash
curl -s -X POST https://presocket.mygenie.online/order-update -H 'Content-Type: application/json' \
  -d '{"order_type":"new-order","order_id":999999,"restaurant_id":644,"food_status":0,"order_details":{"orders":[]}}'
# expect: {"status":"Message broadcasted22"}
```

**Wiretap (browser console of the logged-in tab):**
```js
const s = window.__SOCKET_SERVICE__.socket;
s.onAny((ev, ...a) => console.log('WIRETAP', ev, JSON.stringify(a).slice(0,150)));
```

**Outsider isolation probe (node, run from repo root; socket.io-client comes from frontend node_modules):**
```js
// save as /tmp irrelevant — keep under a persistent folder in your env
const { io } = require('./frontend/node_modules/socket.io-client');
const s = io('https://presocket.mygenie.online', { transports:['websocket'], reconnection:false });
let n = 0;
s.onAny((ev) => { n++; console.log('OUTSIDER GOT', ev); });
s.on('connect', () => console.log('outsider connected (no join) — must receive 0'));
setTimeout(() => { console.log('outsider total:', n, n === 0 ? 'PASS' : 'FAIL — leak!'); process.exit(0); }, 60000);
```

**The 8 checks:**
| # | Check | Expected |
|---|---|---|
| 1 | Login rid 644 → console | `[Socket] ... join_restaurant emitted for 644` + wiretap shows `joined_restaurant {"room":"rest_644"}` |
| 2 | Fire trigger for 644 | exactly ONE `WIRETAP new_order_644 ["new-order",999999,644,0,...]` |
| 3 | Outsider probe running during #2 | 0 events |
| 4 | DevTools → Network offline 5s → online → wait reconnect → repeat #2 | still ONE event (re-join works; if 0 → F2c is broken) |
| 5 | Logout 644 → login 618 → fire for 644 then for 618 | 0 events for 644, ONE `new_order_618` |
| 6 | Station view (if enabled on the account) refreshes on order event | yes |
| 7 | `npx craco test --watchAll=false --testPathPattern=socket` | all pass; add 1 unit test: joinRestaurant stores rid + emits on connect |
| 8 | webpack compile | 0 new warnings |
Success = own event exactly 1, foreign 0, outsider 0. Any other combination means something is wrong (see Part 5 table).

---

## PART 5 — DIAGNOSIS TABLE (if a check fails)
| Symptom | Meaning |
|---|---|
| No `joined_restaurant` ack after join emit | backend B1 handler missing/renamed on server — re-confirm contract with backend team (event `join_restaurant`, payload `{restaurant_id}`) |
| Ack OK but no `new_order_644` on trigger | wrong rid in trigger, or subscription effect didn't run (check console for "Subscribing to channels for restaurant 644") |
| Works, then dies after network blip | F2c re-join missing/misplaced — must be INSIDE the CONNECT handler |
| Outsider probe receives events | backend reverted to global io.emit — the original leak is back (escalate immediately) |
| 618 tab receives 644 events | server stale-room cleanup broken or F2d missing (rid not cleared on logout) |

## PART 6 — AFTER YOU SHIP (tell the owner)
1. Owner green-lights backend **B2**: convert ALL remaining global `io.emit(channel_<rid>, ...)` to `io.to('rest_'+rid).emit(...)` — arg shapes unchanged. Re-run outsider probe after → 0 events on every channel.
2. Recommend registering: **B3/Phase-2** token-validated join (server verifies token before socket.join; disconnect sockets that never join) — closes the "anyone can connect and join any room" gap.
3. Parked hardening backlog (from investigation, separate intake): FE-1 connect() duplicate-socket race, FE-2 reconnect jitter/backoff + 60s poll de-sync, FE-3 in-flight order-fetch dedupe.
