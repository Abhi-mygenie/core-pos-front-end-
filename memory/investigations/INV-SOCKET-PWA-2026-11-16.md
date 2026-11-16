# INV-SOCKET-PWA — Socket Disconnection & PWA Lifecycle Investigation

**Date:** 2026-11-16
**Role:** INVESTIGATION
**Classification:** HIGH risk (sockets, realtime, order capture)
**Steps Used:** 10/10
**Confidence:** HIGH — code-traced, all paths documented

---

## 1. Summary

**Root Cause:** MULTI-FACTOR — Socket disconnection in PWA is caused by a combination of (A) server-initiated disconnect during background with no auto-reconnect, (B) finite reconnection budget (10 attempts) that can exhaust during prolonged background, and (C) race conditions in event re-subscription after reconnect. The "works after force refresh" symptom confirms the socket singleton is stuck in a dead state that only a full page reload clears.

**Classification:** CONFIG_ISSUE + INTERACTION_BUG (platform + browser PWA lifecycle)

---

## 1b. Live Probe Results (2026-11-16, owner@ruby.com / RID=672)

| Probe | Result | Evidence Path |
|-------|--------|---------------|
| Server handshake | pingInterval=25s, pingTimeout=60s, maxPayload=1MB | `evidence/INV-SOCKET-PWA-2026-11-16/server_handshake_probe.md` |
| Room join + ACK | Server DOES send `joined_restaurant: {room:'rest_672'}` — **FE never listens for it** | `evidence/INV-SOCKET-PWA-2026-11-16/room_join_probe.md` |
| Socket.IO version | Client v4.8.4, Server EIO=4 (compatible) | package.json |
| Transport | WebSocket (upgraded from polling) | Live probe |
| Running orders | 23 orders, all fOS=5 (served), all order_from=pos, zero fOS=7 | curl probe |

**NEW CRITICAL FINDING — `joined_restaurant` ACK ignored:**
The server sends a `joined_restaurant` acknowledgment (`{room: 'rest_672'}`) after `join_restaurant` is emitted. The constant `JOINED_ACK_EVENT` is **defined** at `socketEvents.js:100` but is **never subscribed to** anywhere in the codebase. This means:
- `join_restaurant` is fire-and-forget on the client side
- If the join fails (race, server error, network glitch), the client has **no detection mechanism**
- Socket shows "connected" ✅ but receives **zero** restaurant-scoped events
- This is a **silent failure mode** — invisible to staff, indistinguishable from "no new orders"

---

## 2. Architecture Map

### Socket Stack (5 layers):

```
Layer 5: UI (DashboardPage, ScanOrderPopOut, AggregatorOrderPopOut)
Layer 4: useSocketEvents hook (mounted in AppSocketManager — persists all routes)
Layer 3: SocketContext (auth-gated connect/disconnect, visibility + online handlers)
Layer 2: socketService singleton (Socket.IO client, room join, status listeners)
Layer 1: Socket.IO transport (WebSocket primary, polling fallback)
```

### Channels Per Restaurant:
| Channel | Pattern | Events |
|---------|---------|--------|
| `new_order_{rid}` | Order lifecycle | new-order, update-order, update-order-target/source/paid, update-item-status, update-food-status, update-order-status, scan-new-order, delivery-assign-order, split-order |
| `update_table_{rid}` | Table status | update-table (engage/free) |
| `order-engage_{rid}` | Order locking | engage/free per orderId |
| `food_update_{rid}` | Menu realtime | update-food, delete-food |
| `aggregator_order_{rid}` | Swiggy/Zomato | aggrigator-order, aggrigator-order-update |

### Safety Nets:
| Mechanism | Trigger | File | Purpose |
|-----------|---------|------|---------|
| Reconnect rehydration | RECONNECTING→CONNECTED | useSocketEvents.js:72-116 | Re-fetch all running orders, merge into context |
| Polling reconciliation | Every 60s / visibility / reconnect | useOrderPollingReconciliation.js | Fingerprint-based diff, add/update/remove orphans |
| Visibility reconnect | Tab becomes visible | SocketContext.jsx:73-80 | Re-establish connection after background |
| Network reconnect | `online` event | SocketContext.jsx:94-99 | Re-establish after network loss |

---

## 3. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|----------|
| H1 | Reconnection budget exhaustion (10 attempts) | Code trace | 2 | **CONFIRMED** | socketEvents.js:14 `RECONNECTION_ATTEMPTS: 10`, socketService.js:299 `reconnect_failed` → ERROR state, no recovery path |
| H2 | Server-initiated disconnect kills auto-reconnect | Code trace + live probe | 1 | **CONFIRMED** | socketService.js:261-263: `reason === 'io server disconnect'` → status=DISCONNECTED (NOT RECONNECTING). **Live probe: server pingInterval=25s, pingTimeout=60s → 85s max silence before server disconnect.** |
| H3 | Room membership lost on reconnect | Code trace | 1 | **ELIMINATED** | socketService.js:250-255: CR-082 re-emits `join_restaurant` on every `connect` event including reconnect |
| H4 | Event subscription race after reconnect | Code trace | 2 | **CONFIRMED (partial)** | socketService.on() at L137-143 returns null if not connected; useSocketEvents re-subscribes on `isConnected` change, but React state update lags behind actual socket readiness |
| H5 | PWA background kills WebSocket, no proactive recovery | Code + platform analysis | 2 | **CONFIRMED** | iOS/Android aggressively kill WebSocket in background PWA; visibility handler (SocketContext.jsx:73-80) is the ONLY recovery; if it fails or fires before network is ready, socket stays dead |
| H6 | Polling reconciliation masks but doesn't fix socket death | Code trace | 2 | **CONFIRMED** | useOrderPollingReconciliation.js polls every 60s for ORDER data only; does NOT restore socket subscriptions for real-time events (table engage, food updates, aggregator orders) |
| H7 | `joined_restaurant` ACK never consumed — silent room join failure | Live probe + grep | 1 | **CONFIRMED** | Server sends `{room:'rest_672'}` ACK. `JOINED_ACK_EVENT` defined at socketEvents.js:100 but **zero handlers** in entire codebase. join_restaurant is fire-and-forget. |

---

## 4. Data Flow Trace — Disconnection Lifecycle

### Normal Flow:
```
Auth login → SocketContext connects → socketService.connect()
  → io(SOCKET_URL, {reconnection:true, attempts:10})
  → on 'connect': status=CONNECTED, joinRestaurant(rid)
  → useSocketEvents subscribes to 5 channels
  → Events flow → handlers → OrderContext/TableContext/MenuContext
```

### PWA Background Scenario (THE BUG):
```
Step 1: PWA goes to background (user switches app / screen off)
  → OS suspends WebSocket after ~30s (iOS) or ~5min (Android)
  → Socket.IO detects disconnection

Step 2: Socket.IO auto-reconnect starts
  → Attempts 1-10 with exponential backoff (1s → 30s max)
  → If server is unreachable (network suspended) → all 10 fail
  → 'reconnect_failed' fires → status=ERROR
  → ⚠️ NO MORE RECONNECT ATTEMPTS — socket is DEAD

Step 3: User returns to PWA
  → 'visibilitychange' fires → SocketContext.jsx:73-80
  → Calls socketService.connect()
  → socketService.connect() at L46-49: checks this.socket.connected
  → If socket exists but not connected → CREATES NEW connection
  → ✅ This SHOULD work...

Step 4: BUT — potential failure modes:
  A) If reconnect_failed already fired but this.socket is still assigned
     → connect() creates new socket at L67, old socket garbage collected
     → New connection starts fresh ✅
  
  B) If server initiated disconnect (ping timeout during background)
     → reason='io server disconnect' → status=DISCONNECTED
     → Socket.IO does NOT auto-reconnect (by design)
     → Visibility handler tries connect() → should work
     → BUT: if the old socket's event handlers are still registered
       and the new socket gets new handlers from _setupConnectionHandlers,
       the old handlers on the overwritten socket reference create a
       listener leak (no explicit removeAllListeners before new connect)

  C) Race condition: visibility fires + online fires simultaneously
     → Two concurrent connect() calls
     → L47 guard prevents double-connect IF first socket.connected=true
     → But if first is still connecting (not yet connected), second also
       enters → two io() instances created → last one wins, first leaks
```

### "After a particular time it gets again disconnected":
```
This is the SERVER-SIDE PING TIMEOUT — CONFIRMED BY LIVE PROBE:

Server config (probed 2026-11-16):
  pingInterval = 25,000ms (25s) — server sends ping every 25s
  pingTimeout  = 60,000ms (60s) — server waits 60s for pong
  Total silence tolerance = 85s

In PWA background:
  → JS execution is suspended → pong never sent
  → After 85s of silence → server disconnects
  → Reason: 'ping timeout' (from server's perspective)
  → Client sees: 'io server disconnect' or 'transport close'
  → ⚠️ 'io server disconnect' → status=DISCONNECTED → NO auto-reconnect
  → Socket stays dead until visibility/online handler fires

The "particular time" the user reports = ~85 seconds (25s + 60s).
After this window, the socket is dead on the server side even if
the client thinks it might still be alive.
```

---

## 5. Aggregator Socket Specifics

Aggregator orders use a **completely separate channel** (`aggregator_order_{rid}`) from POS orders. This means:

1. **Same disconnection vulnerability** — if the main socket dies, aggregator events are also lost
2. **No separate reconnect mechanism** — aggregator relies on the same SocketContext
3. **No polling safety net for aggregator orders** — `useOrderPollingReconciliation` calls `getRunningOrders()` which returns POS orders only. Aggregator orders from UrbanPiper API are NOT polled (see line 206 in reconciliation hook: "aggregator orders preserved during merge" but never FETCHED during reconciliation)
4. **BUG-250 defensive logic** — aggregator orders are preserved in `mergeRunningOrders` (L53 of OrderContext) and excluded from removal by polling (L207 of reconciliation), but if socket is dead, NO new aggregator orders arrive until socket reconnects

**GAP:** There is NO background polling or reconciliation for aggregator orders. If socket dies, new Swiggy/Zomato orders are silently missed until reconnect or page refresh.

---

## 6. FCM / Push Notification Independence

FCM (Firebase Cloud Messaging) is INDEPENDENT of the Socket.IO connection:
- FCM uses Firebase service worker (`firebase-messaging-sw.js`)
- Push notifications arrive via Google's push service, NOT via the Socket.IO WebSocket
- Background notifications handled by service worker → forwarded to clients via `postMessage`
- **FCM survives socket death** — notifications still arrive even when socket is disconnected

BUT: FCM only triggers sounds/toasts. The actual order data comes via socket. If socket is dead:
- Staff hears the notification sound ✅
- Staff sees the toast ✅  
- But the order card does NOT appear on dashboard ❌ (no socket data)
- Polling reconciliation picks it up in ≤60s for POS orders
- Aggregator orders: NOT picked up until socket reconnects or force refresh

---

## 7. Specific Failure Scenarios

### Scenario A: "Socket stops working, need force refresh"
**Cause:** Reconnection budget (10 attempts) exhausted during prolonged background
**Evidence:** socketEvents.js:14 — `RECONNECTION_ATTEMPTS: 10`
**Recovery:** Only force refresh clears the singleton and starts fresh

### Scenario B: "After a particular time it gets again disconnected"  
**Cause:** Server ping timeout during background → `io server disconnect` → no auto-reconnect
**Evidence:** socketService.js:261-263 — server disconnect path sets DISCONNECTED, not RECONNECTING
**Recovery:** Visibility handler should reconnect, but if it fails (see H4 race), stuck again

### Scenario C: "Aggregator orders missed"
**Cause:** No polling reconciliation for aggregator channel; relies 100% on socket
**Evidence:** useOrderPollingReconciliation.js:206 — `if (l.isAggregator === true) continue;`
**Recovery:** None until socket reconnects or force refresh

---

## 8. Recommendations

### FE Fixes (scope for Implementation Plan):

| # | Fix | Risk | Files | Lines | Priority |
|---|-----|------|-------|-------|----------|
| F1 | Set `RECONNECTION_ATTEMPTS: Infinity` (or very high, e.g. 999) | LOW | socketEvents.js | 1 | P0 |
| F2 | Add periodic heartbeat check (every 30s when visible): if `socketService.status === ERROR`, call `disconnect()` then `connect()` | MEDIUM | SocketContext.jsx | ~15 | P0 |
| F3 | In `connect()`, explicitly call `disconnect()` first to clean up old socket + handlers before creating new | LOW | socketService.js | ~5 | P1 |
| F4 | Add aggregator order polling reconciliation (fetch aggregator order list every 60-120s as safety net) | MEDIUM | useOrderPollingReconciliation.js or new hook | ~40 | P1 |
| F5 | On `reconnect_failed`, auto-call `disconnect()` + `connect()` after 5s delay (infinite retry with backoff) | LOW | socketService.js | ~10 | P1 |
| F6 | **Listen for `joined_restaurant` ACK** — if not received within 5s after emit, re-emit `join_restaurant`. If still no ACK, force reconnect. | MEDIUM | socketService.js + useSocketEvents.js | ~20 | P1 |
| F7 | Add `navigator.serviceWorker.addEventListener('message')` handler for a new `SOCKET_HEALTH_CHECK` SW message that fires on PWA resume | HIGH | NotificationContext.jsx + SW | ~20 | P2 |

### Backend Ask (if applicable):
- **Server ping interval / timeout settings** — what are the current values? Increasing ping timeout would reduce disconnects during brief background periods
- **Socket.IO server reconnection policy** — does the server disconnect idle clients? If so, what is the idle timeout?

---

## 9. Evidence Artifacts

### Live Probes (saved to persistent storage):
- `evidence/INV-SOCKET-PWA-2026-11-16/server_handshake_probe.md` — Socket.IO server config (pingInterval, pingTimeout)
- `evidence/INV-SOCKET-PWA-2026-11-16/room_join_probe.md` — Live room join test, ACK received but not consumed

### Code Traces:

- socketService.js: Singleton connection manager (389 lines)
- socketEvents.js: Channel definitions + config (186 lines)  
- socketHandlers.js: Event handlers for all 13+ event types (1004 lines)
- useSocketEvents.js: Hook wiring events to handlers (309 lines)
- SocketContext.jsx: React context with visibility/network handlers (249 lines)
- NotificationContext.jsx: FCM + sound + SW update (365 lines)
- useOrderPollingReconciliation.js: Safety-net polling (365 lines)
- firebase.js: Firebase init + FCM token (129 lines)
- firebase-messaging-sw.js: Background notification SW (~80 lines)

---

## 10. Retroactive Candidates

None identified.

---

## Report Footer

```
Root cause: MULTI-FACTOR — (A) finite reconnection budget exhausts in background,
            (B) server disconnect disables auto-reconnect, (C) no aggregator polling safety net.
Confidence: HIGH. Steps: 10/10.
FE fix: YES — 7 fixes proposed (F1-F7), 2 files for P0, 5 total.
Backend ask: YES — ping interval/timeout values needed.
Planning skip eligible: NO — touches hotspot files (socketService, SocketContext), HIGH risk.
Retroactive candidates: NONE.
Investigation report at: /app/memory/investigations/INV-SOCKET-PWA-2026-11-16.md
```
