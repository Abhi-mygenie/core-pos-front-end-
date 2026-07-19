# CR-077 — FRONTEND Impact Analysis (Gate 2) — Socket Room-Join (join_restaurant)

**Date:** 2026-07-19 (v2 — complete FE analysis; supersedes v1 combined doc) | **Role:** PLANNING
**Risk:** HIGH (sockets — full gate flow, no Fast Lane) | **Severity:** P0 (realtime currently DEAD)
**Backend status:** B1 `join_restaurant` handler DEPLOYED + VALIDATED (iteration_6, 100% pass; ack, delivery, stale-room cleanup, invalid-payload guard, envelope match all confirmed)

## Code Reality: NONE
`grep -rn "join_restaurant\|joinRestaurant" /app/frontend/src` → 0 hits. No join code exists. Frontend has never emitted anything to the socket server (`socketService.emit` has 0 call sites).

## Conflict Pre-Check
| File | Last modifier | Open conflict? |
|---|---|---|
| `api/socket/socketService.js` | T-10/BUG-068 era | NO open item touches it |
| `api/socket/useSocketEvents.js` | BUG-167 (QA PASS, awaiting smoke) | RELATED, parallel-safe — BUG-167 moved the mount point (AppSocketManager), did not alter the subscription effect internals |
| `api/socket/socketEvents.js` | BUG-096/BUG-116 | NO |
Registry: no other non-CLOSED item lists these files. **Verdict: parallel-safe.**

---

## 1. Full Data Flow (current, with exact break point)

```
LOGIN  → AuthContext.isAuthenticated=true
       → SocketContext.jsx:33-38  connect effect (auth-gated, StrictMode-guarded via initializedRef)
       → socketService.connect() (socketService.js:43-71)  ← handshake carries NO auth/query  ✗ server cannot auto-join
LOADING→ LoadingPage sets RestaurantContext.restaurant (id available AFTER connect, async)
MOUNT  → App.js:86 <AppSocketManager/> (persists all routes, BUG-167) → useSocketEvents()
       → useSocketEvents.js:195-265 subscription effect fires when BOTH isConnected && restaurantId
       → subscribes to new_order_<rid>, update_table_<rid>, order-engage_<rid>, food_update_<rid>
SERVER → io.to('rest_'+rid).emit('new_order_'+rid, ...)   ← ROOM IS EMPTY  ✂ BREAK POINT
       → (never delivered) → handleOrderChannelEvent → socketHandlers → OrderContext/TableContext/MenuContext → UI
```
The subscription effect at useSocketEvents.js:195 is the **only place in the app where "connected + restaurantId known" is guaranteed simultaneously** → correct injection point for the join call.

## 2. Files Affected (exact)

### F1 `src/api/socket/socketEvents.js` (~line 93) — LOW risk
Add `JOIN_EVENT = 'join_restaurant'` constant (+ optional `JOINED_ACK = 'joined_restaurant'`). Additive only; no existing export changes. Consumers unaffected.

### F2 `src/api/socket/socketService.js` — core change, 4 touch points
| # | Location | Change | Why |
|---|---|---|---|
| a | ctor ~L31 | `this.restaurantId = null` | persist rid across reconnects |
| b | new method after connect() ~L72 | `joinRestaurant(rid)`: store + emit if connected | called from useSocketEvents |
| c | CONNECT handler L227-233 | re-emit join if `this.restaurantId` set | **CRITICAL**: Socket.IO rooms are per-connection, lost on EVERY reconnect. Auto-reconnect keeps the same Socket object and re-fires 'connect' → this is the only reliable re-join hook |
| d | disconnect() L76-84 | `this.restaurantId = null` | logout hygiene — prevents next tenant joining previous tenant's room |
Note: (b) must use raw `this.socket.emit`, NOT `this.emit()` — this class's `emit()` logs a WARN and returns false when not connected; join must be silent-safe pre-connection.

### F3 `src/api/socket/useSocketEvents.js` (~line 207, after `if (!restaurantId)` guard) — 1 line
`socketService.joinRestaurant(restaurantId);`
Effect deps already include `isConnected` + `restaurantId` → join fires exactly when both become true, and re-fires on restaurant change. `socketService` is a module singleton import (line 14) — no dep-array change needed. Idempotent server-side (re-join to same room is a no-op; different room triggers cleanup).

## 3. Timing & Edge-Case Matrix (all traced against real code)

| Scenario | Path | Outcome after change |
|---|---|---|
| Cold login | connect (no rid) → restaurant loads → effect fires → join | ✓ joined once rid known; events missed between connect and join are covered by existing 60s poll + BUG-068 rehydration |
| Auto-reconnect (network blip) | same Socket obj re-fires 'connect' → F2c re-joins | ✓ subscriptions also survive (handlers live on same socket object) |
| Reconnect >1.5s | F2c re-join + BUG-068 rehydration (useSocketEvents.js:67-111) fetches missed orders | ✓ complementary, no interaction |
| Tab sleep/wake | SocketContext.jsx:72-87 calls connect(); if socket existed → reconnect path (F2c); if socket was null → new connect, rid still in memory → F2c | ✓ |
| Network online event | SocketContext.jsx:93-99 same as above | ✓ |
| Logout → login as другой tenant | disconnect() clears rid (F2d) + server leaves old rest_* rooms on join (validated) | ✓ double protection |
| React StrictMode double-mount | initializedRef guard (SocketContext.jsx:26,34) prevents double connect; double join emit would be harmless (idempotent) anyway | ✓ |
| Manual retry button | SocketContext.reconnect() → connect() → 'connect' → F2c | ✓ |
| restaurantId briefly undefined (context re-render) | effect cleanup only unsubscribes channels; join state untouched in service | ✓ no join churn |

## 4. Downstream Consumers (verified by grep — NO changes needed)
- `useSocketEvents.js` channel handlers + `socketHandlers.js` — envelope already matches server emit (validated live: `["new-order",424242,777001,0,{...}]` = MSG_INDEX).
- `useStationSocketRefresh.js` (StationPanel.jsx:380) — 2nd subscriber to `new_order_<rid>` on the SAME singleton socket → covered by the single app-level join. No edit.
- `useSocketEvent` convenience hook (SocketContext.jsx:236) — rides same socket. No edit.
- `AppSocketManager.jsx`, `SocketContext.jsx`, `AppProviders` order, localStorage keys — untouched (R7/R8 safe).
- Tests: `socketServiceGlobal.test.js` (T-10 window gate), `socketEvents.test.js`, handler tests — additive method/constant, no assertions broken. Plan should add 1 unit test: join emitted on connect when rid set.

## 5. What still WON'T work after F1-F3 (scope boundary — expectations)
- Channels other than new_order are still emitted GLOBALLY by the server until backend B2 lands (they will keep working, leak included). F1-F3 neither helps nor hurts them; after B2 they start benefiting from the same join.
- Join is unauthenticated (anyone can join any room) — Phase-2 token validation (B3, backend-led, separate item). Same privacy level as today; not a regression.
- Events fired in the gap between connect and restaurant-load are not received — mitigated by existing poll + rehydration (pre-existing behavior, unchanged).

## 6. Risk Register
| Risk | Sev | Mitigation |
|---|---|---|
| Re-join missing on reconnect → realtime silently dies after first blip | HIGH | F2c placement inside CONNECT handler is mandatory; Verification Matrix check #4 (offline/online toggle) |
| Contract string drift FE↔BE | HIGH | frozen: event `join_restaurant`, payload `{ restaurant_id }` (B1 validated with exactly this) |
| Using this.emit() wrapper pre-connect logs WARN noise / returns false | LOW | use raw socket.emit inside guarded method |
| Tenant bleed after re-login | MED | F2d + server-side stale-room cleanup (both validated) |
| BUG-167 smoke pending on same file | LOW | changes are on different lines (195-207 area only adds 1 line); coordinate QA re-test |

## 7. Verification Matrix (inherited by Implementation + QA)
| # | Check | Method | Auto? |
|---|---|---|---|
| 1 | join emitted + ack on login | console: `join_restaurant emitted for 644` + wiretap `joined_restaurant` | NO |
| 2 | own order delivered | POST /order-update rid 644 → exactly 1 `new_order_644` in wiretap | semi (curl + console) |
| 3 | isolation | outsider probe (b1_join_probe.js pattern) during same POST → 0 events | YES |
| 4 | re-join on reconnect | DevTools offline 5s → online → repeat #2 → still 1 event | NO |
| 5 | tenant switch | logout 644 → login 618 → POST 644 → 0 on tab; POST 618 → 1 | NO |
| 6 | station view still refreshes | trigger order with station view enabled | NO |
| 7 | unit tests | `npx craco test --watchAll=false --testPathPattern=socket` (+1 new join test) | YES |
| 8 | compile | webpack 0 new warnings | YES |

## 8. Owner Decisions
- D1 ✅ RESOLVED — contract `join_restaurant` / `{restaurant_id}` deployed & validated (B1).
- D2 OPEN — register Phase-2 token-validated join (B3) as separate backend-led item? (recommended YES)
- D3 NEW — after F1-F3 pass QA, green-light backend B2 (scope remaining global emits)?

## Scope Lock (unchanged from plan)
WILL change: socketEvents.js, socketService.js, useSocketEvents.js (~20 lines, `// CR-077` markers).
WILL NOT touch: SocketContext.jsx, AppSocketManager.jsx, socketHandlers.js, useStationSocketRefresh.js, contexts, transforms, .env, any R5 hotspot/financial file.
