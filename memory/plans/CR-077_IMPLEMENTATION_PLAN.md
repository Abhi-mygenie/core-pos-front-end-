# CR-077 — Implementation Plan (Gate 3): Socket Room-Join Contract

**Risk:** HIGH | **Prereq:** Owner D1 approval of contract + backend deploys join handler FIRST | **Awaiting Gate 4 GO**

## Scope Lock
WILL change (frontend): `src/api/socket/socketEvents.js`, `src/api/socket/socketService.js`, `src/api/socket/useSocketEvents.js` (3 files, ~20 lines total)
WILL NOT touch: SocketContext.jsx, socketHandlers.js, contexts, transforms, any financial/order-entry file, .env

---

## PART 1 — BACKEND (external team, socket server on presocket.mygenie.online)

### Edit B1 (P0, additive — deploy first): join handler
Inside the existing `io.on('connection', (socket) => { ... })` block add:
```js
socket.on('join_restaurant', (data) => {
    const rid = parseInt(data && data.restaurant_id, 10);
    if (!rid) return;
    // handle restaurant switch / stale rooms on the same socket
    for (const room of socket.rooms) {
        if (room !== socket.id && room.startsWith('rest_')) socket.leave(room);
    }
    socket.join('rest_' + rid);
    socket.emit('joined_restaurant', { room: 'rest_' + rid }); // ack for diagnostics
});
```

### Edit B2 (after frontend ships): scope ALL remaining global emits
Every other `io.emit(<channel>_<rid>, ...)` in the server (login_disabled_<rid>, update_table_<rid>, aggregator_order_<rid>, order-engage_<rid>, food_update_<rid>, ...) becomes:
```js
io.to('rest_' + restaurant_id).emit(...same args unchanged...);
```
DO NOT change emit arg order/payloads — frontend envelope (MSG_INDEX) depends on current shape.

### Edit B3 (Phase 2, separate item): validate on join
Client will send `{ restaurant_id, token }`; server verifies token (Laravel introspection or shared JWT secret) before `socket.join`, and disconnects sockets that never join within ~30s. Closes F6 (unauthenticated handshake).

---

## PART 2 — FRONTEND (this repo, after B1 is live)

### Edit F1 — `src/api/socket/socketEvents.js` (~line 93, end of SOCKET_EVENTS or as new export)
```js
// CR-077: room-join contract with socket server (INV-SOCKET-001)
export const JOIN_EVENT = 'join_restaurant';
```

### Edit F2 — `src/api/socket/socketService.js`
(a) constructor (~line 31): add
```js
this.restaurantId = null; // CR-077: room to (re)join on every connect
```
(b) new method (after connect(), ~line 72):
```js
// CR-077: register restaurant room; server joins socket to rest_<rid>
joinRestaurant(restaurantId) {
    if (!restaurantId) return;
    this.restaurantId = restaurantId;
    if (this.socket && this.socket.connected) {
        this.socket.emit('join_restaurant', { restaurant_id: restaurantId });
        this._log('INFO', `join_restaurant emitted for ${restaurantId}`);
    }
}
```
(c) CONNECT handler inside `_setupConnectionHandlers()` (~line 227-233) — CRITICAL re-join, room membership is lost on every reconnect:
```js
this.socket.on(CONNECTION_EVENTS.CONNECT, () => {
    ...existing lines...
    // CR-077: re-join room on every (re)connect
    if (this.restaurantId) {
        this.socket.emit('join_restaurant', { restaurant_id: this.restaurantId });
    }
});
```
(d) disconnect() (~line 76-84): add `this.restaurantId = null;` (logout hygiene — prevents joining the previous tenant's room after re-login as another restaurant).

### Edit F3 — `src/api/socket/useSocketEvents.js` (subscription effect, immediately after the `if (!restaurantId)` guard, ~line 207)
```js
// CR-077: join server-side room so room-scoped emits reach this client
socketService.joinRestaurant(restaurantId);
```
(Effect already re-runs on restaurantId change and subscribes when connected — no dependency changes needed.)

---

## Verification Matrix
| # | Check | How | Automated? |
|---|---|---|---|
| 1 | Join emitted on connect | Browser console: `[Socket] join_restaurant emitted for 644` + `joined_restaurant` ack in wiretap | NO |
| 2 | Own events received | Login rid 644 → wiretap `onAny` → `curl -X POST https://presocket.mygenie.online/order-update ... restaurant_id:644` → exactly 1 `new_order_644` | NO (script: evidence/INV-SOCKET-001 retest procedure) |
| 3 | Isolation holds | Outsider node socket (no join) during same POST → 0 events (rerun room_fix_probe.js) | YES |
| 4 | Re-join after reconnect | DevTools → offline 5s → online → wait reconnect → repeat check 2 → event still received | NO |
| 5 | Tenant switch | Logout 644 → login as Hogwarts (618) → POST for 644 → 0 events on 618 tab; POST for 618 → 1 event | NO |
| 6 | Unit tests still pass | `npx craco test --watchAll=false --testPathPattern=socket` | YES |
| 7 | Compile clean | webpack 0 new warnings | YES |

## Post-Code Registry Checklist (Implementation agent MUST execute)
- [ ] registry.json: CR-077 → status IMPLEMENTED, sprint_key pos_5_0
- [ ] CR_REGISTRY.md row updated
- [ ] FILE_OWNERSHIP.md: 3 socket files + CR-077 + date
- [ ] `// CR-077` marker in each modified file

## Risk Register
| Risk | Mitigation |
|---|---|
| Backend deploys B2 before F1-F3 ship | Sequencing constraint in plan; all realtime channels would go dark |
| Event name mismatch FE↔BE | Contract string frozen as `join_restaurant` / payload `{ restaurant_id }` — owner D1 confirms with backend |
| Reconnect storm re-join misses | Re-join lives in the CONNECT handler itself (fires on every reconnect incl. socket.io auto-reconnect) |
| Stale room after tenant switch | Server leaves old `rest_*` rooms on join; client clears rid on disconnect() |
