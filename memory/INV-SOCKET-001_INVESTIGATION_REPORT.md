# INV-SOCKET-001 — Peak-Traffic Outage Investigation (Socket Architecture)

**Date:** 2026-07-19
**Role:** INVESTIGATION (no code changed)
**Reported symptom:** During peak traffic, entire app unresponsive for ~1–4 minutes. Clients see HTTP 500s, API timeouts, slow/failed order processing, delayed/missing socket updates, temporary hangs. ~150 live restaurants, 5–10 concurrent users each.
**Scope caveat:** This repo contains ONLY the React frontend. The Socket.IO server (`presocket.mygenie.online`) and Laravel API (`preprod.mygenie.online`) are external. Findings below are split into PROVEN (from code/probes) vs REQUIRES SERVER EVIDENCE (see Backend Brief).

---

## 1. Summary

**Root cause (composite, PROVEN):**
The socket layer has **no room/tenant scoping protocol** — the client never joins a room and sends no identity at handshake, and the server broadcasts on the default namespace to ALL clients. **This is now proven live (2026-07-19 04:25 UTC):** an authenticated client of restaurant 644 received unsolicited events for restaurants 689 and 523 within 4 minutes. Every order/status event of every restaurant travels to every connected socket in the fleet. On top of that, 3 socket handlers **call the order API from inside the handler**, so every broadcast multiplies into N simultaneous API requests. Combined with per-client 60s polling, reconnect-storm rehydration, and a frontend `connect()` leak, peak traffic produces a **self-amplifying O(N²) fan-out storm** that saturates the Laravel origin → 500s/timeouts → retries → more load → the 1–4 minute death spiral.

**Live evidence captured:** `preprod.mygenie.online` returned **HTTP 521 (Cloudflare: origin down)** at two separate times (03:19, 04:12 UTC) — origin does go hard-down, matching the outage signature. Global broadcast confirmed by authenticated onAny probe (own=0, **foreign=6**).

- Classification: **INFRA/BACKEND primary** (global broadcast + origin capacity) with **contributing FE_BUGs** (connect leak, in-handler API herd, retry without jitter)
- Confidence: HIGH (mechanism traced in code) / server-side resource metrics still needed (Backend Brief issued)
- Steps used: 8/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|-----------|-------------|--------|----------|
| H1 | Events broadcast globally, not per-restaurant room | **LIVE authenticated onAny probe, 4 min, 2026-07-19 04:25 UTC** | **CONFIRMED — PROVEN (not just inferred).** Logged in as restaurant **644**; client subscribed only to `*_644`; `onAny` received **6 FOREIGN events** for restaurants **689 and 523** (`login_disabled_689`, `login_disabled_523`) — unsolicited, over websocket. Server emits every tenant's events to every client on the default namespace. | §3.2, evidence/LIVE_REPROBE |
| H2 | Socket handlers trigger API calls (thundering herd) | Code trace `socketHandlers.js` | **CONFIRMED** — `update-food-status`, `update-order-status`, `scan-new-order` each call `GET single-order` with 1s retry, per client | §3.4 |
| H3 | Reconnects create duplicate listeners/connections | Code trace `socketService.connect()` + `SocketContext` | **CONFIRMED (race)** — `connect()` leaks the previous socket while its manager keeps auto-reconnecting → duplicate live connections possible | §3.6 |
| H4 | 500/timeout errors originate at API origin, not proxy | Live curl probe | **CONFIRMED for today's sample** — Cloudflare 521 = origin down/refusing | §4 |
| H5 | Socket server unreachable/misdeployed on configured URL | Live port probe | **CONFIRMED from this pod** — `https://` (443) closed; port 80 = Apache 404 (no socket.io); 6001 = uvicorn 404 | §4 |
| H6 | Event-loop blocking / CPU in server handlers, DB in socket handlers, Redis adapter, same-process API+socket | Not testable from FE repo | **OPEN → Backend Brief** | §6 |

---

## 3. Data Flow Trace (frontend, code-proven)

### 3.1 Connection lifecycle
- Singleton `SocketService` (`socketService.js:21-365`), connects after login (auth-gated, `SocketContext.jsx:33-64`).
- Options (`socketEvents.js:7-18`): reconnection ON, **10 attempts**, delay 1s→max 30s, timeout 5s, `transports: ['websocket','polling']`.
- **No auth token, no query params, no identity sent at handshake** (grep: zero hits for auth/token/query in `socketService.js`). Anyone can connect and receive events.

### 3.2 "Rooms" — DO NOT EXIST in the protocol
- Client subscribes to **event names**, not rooms: `new_order_${rid}`, `update_table_${rid}`, `order-engage_${rid}`, `food_update_${rid}`, `aggregator_order_${rid}` (`socketEvents.js:29-59`, `useSocketEvents.js:210-223`).
- The ONLY `socket.emit` in the entire client is the generic wrapper (`socketService.js:178`) — **no caller ever emits `join` or any subscription message** (grep of `/src`: 0 hits).
- Consequence: restaurant scoping happens **client-side by event-name filter**. The server cannot know which restaurant a socket belongs to, therefore every emit is necessarily `io.emit(...)` **to all sockets in the fleet**. Every order event for every restaurant travels down the wire to all ~600–1,500 connected clients (150 restaurants × 4–10 devices).
- Server-side cost per single order event: 1 emit × N_total_sockets writes on one Node event loop. At peak (~150 restaurants × 20–50 orders/hr × 3–5 events/order ≈ 3–10 events/sec) that is **3,000–15,000 socket writes/sec**, plus kernel buffers held for slow/mobile clients → memory balloon + event-loop lag. (Write amplification is proven by protocol; absolute numbers need server metrics.)

### 3.3 Events per order (client-observed contract)
Per ARCHITECTURE_BIBLE §18.2 and handler inventory: **3–5 socket messages per order** (`new-order`, `update-food-status`, `update-order-status`, `order-engage`/disengage, `update-table`), all multiplexed through `new_order_${rid}` 5-slot array envelope (`socketEvents.js:163-170`).

### 3.4 API calls INSIDE socket handlers (herd amplifier) — `socketHandlers.js`
- `handleUpdateFoodStatus` (:380-434), `handleUpdateOrderStatus` (:459+), `handleScanNewOrder` → `fetchOrderWithRetry(orderId)` (:94-112) → `GET single order`, **retry after fixed 1s, no jitter/backoff**.
- `delivery-assign-order` fallback also fetches (:632-640).
- Effect: **one** `update-order-status` emit → **every connected device of that restaurant (5–10) fires the same GET simultaneously**. When the API slows, retries double the volume. This is a positive feedback loop: API slow → failures → retries → more load.

### 3.5 Standing API load per client (aggravators)
- `useOrderPollingReconciliation.js:29,292-299`: `getRunningOrders` every **60s per client** + on tab-visibility + on socket reconnect. Fleet baseline ≈ 600–1,500 clients / 60s = **10–25 heavy list queries/sec**, bursting at shift changes (all tabs become visible together).
- Reconnect rehydration (`useSocketEvents.js:67-111`): on any reconnect >1.5s, every client calls `getRunningOrders`. A 3-second Wi-Fi/server blip at peak = **hundreds of simultaneous running-orders queries** (documented as "socket reconnect storms" in ARCHITECTURE_BIBLE §18.4, breaking point #100–200 restaurants — fleet is at 150).

### 3.6 Duplicate connections/listeners — FE BUG (race, code-proven)
`socketService.connect()` (`socketService.js:43-71`) only guards `if (this.socket && this.socket.connected)`. If the existing socket is mid-reconnect (NOT connected), it creates a **brand-new `io()` connection without disconnecting the old one**. The old manager keeps auto-reconnecting (10 attempts, up to 30s apart) and can ALSO connect → **two live physical connections**, both with registered handlers → duplicate event processing and **doubled** in-handler API fetches. Triggers: `SocketContext.jsx:72-87` (visibilitychange) and `:93-113` (online) both call `connect()` whenever `!isConnected()` — i.e., precisely during reconnection windows at peak. Stale entries in `eventHandlers` Map for replaced sockets are also never cleaned (slow memory leak).

### 3.7 Duplicate event emission (server side, documented)
- `scan-new-order` ships **two payload formats (v1+v2) simultaneously** (ARCHITECTURE_BIBLE §459) — duplicate payload per logical event.
- When Station View is enabled, each client has **2 subscribers on the same order channel** (`useSocketEvents` + `useStationSocketRefresh.js:217-241`); station handler additionally refetches station data (debounced 500ms) on qualifying events.

### 3.8 Cleanup
- Logout → `disconnect()` (proper). Component unmount → `off()` per handler (proper). The gap is only the §3.6 replaced-socket path.

---

## 4. Live Probe Evidence (captured 2026-07-19, from this pod)

Saved to `/app/memory/evidence/INV-SOCKET-001/`:

| Probe | Result | Meaning |
|---|---|---|
| `GET https://preprod.mygenie.online/api/v1/` | **HTTP 521 in 0.39s** | Cloudflare reached, **origin web server DOWN/refusing** — the 500-class errors originate at the Laravel origin, not the CDN/proxy layer |
| `presocket.mygenie.online:443` (configured `REACT_APP_SOCKET_URL` is https) | **connection refused** | Socket server not reachable on its configured URL from this network |
| `presocket.mygenie.online:80` | Apache/2.4.52 (Ubuntu), 404 on `/socket.io/` | An Apache server co-exists on the socket host — supports "shared box" hypothesis |
| `presocket.mygenie.online:6001` | `server: uvicorn`, 404 | A Python service also runs on the socket host |
| DNS | 52.66.232.149 (single A record, AWS ap-south-1) | Single host, **no load balancing** for sockets; sticky-session config is moot (nothing to balance) — and a SPOF |

Caveat: pod egress could be filtered for some ports, but the 521 is served *by Cloudflare itself*, which is authoritative evidence of origin failure independent of our network.

---

## 5. Direct Answers to Owner's Questions

| Question | Answer | Basis |
|---|---|---|
| Broadcast scoped per restaurant or global? | **Global (all restaurants) with near-certainty.** No join protocol, no handshake identity → server cannot scope. Decisive 5-min wire test provided: `evidence/INV-SOCKET-001/wire_probe.js` | Code-proven protocol |
| Users joined to restaurant rooms? | **No.** Zero `join` emits in the entire client | Code-proven |
| Total active socket connections | Est. 600–1,500 (150 rest. × 4–10 devices). Exact count needs server: `io.engine.clientsCount` | Needs server metric |
| Events per order | 3–5 (new-order, food-status, order-status, engage/disengage, table) — each globally broadcast | Code + ARCH bible |
| Duplicate events? | Yes: `scan-new-order` dual v1+v2 payloads; 2 FE subscribers per channel with Station View; §3.6 dup-connection race can double delivery | Code-proven |
| Blocking/CPU-heavy socket handlers (FE)? | No heavy CPU in FE handlers; risk is the API fetches they trigger. Server handlers unknown → brief | Code-proven / open |
| DB queries inside socket handlers? | FE indirectly forces them: every status event → N clients × `GET single-order`. Server-side unknown → brief | Code-proven |
| Does broadcasting block Node event loop? | Very likely at peak (3k–15k writes/sec, single node). Needs `perf_hooks` event-loop-lag metric → brief | Protocol math / open |
| API and socket on same process? | Different hostnames; Apache + uvicorn co-located on socket host suggest shared box. Process layout → brief | Probe + open |
| Resource spikes (CPU/mem/DB/Redis) at peak? | Origin hard-down proven (521). Metrics → brief | Probe + open |
| Disconnected sockets cleaned up? | Client: yes on logout; leak in replaced-socket race (§3.6). Server: unknown → brief | Code-proven / open |
| Reconnects create duplicate listeners/connections? | **Yes — confirmed FE race** (§3.6) | Code-proven |
| Load balancing / sticky sessions correct? | No LB exists (single A record, single node). Polling fallback transport WILL break if LB is added without sticky sessions | Probe |
| Redis adapter needed for horizontal scaling? | Yes, mandatory the moment a 2nd socket node is added; irrelevant until then. Room protocol is the prerequisite | Architecture |
| Where do 500/timeouts originate? | **API origin (Laravel/box) — proven by Cloudflare 521.** Not the CDN. DB vs PHP-FPM vs OOM needs server logs → brief | Probe |

---

## 6. Recommendations

### Backend/Infra (see BACKEND_BRIEF_INV-SOCKET-001_2026-07-19.md — the decisive evidence checklist lives there)
1. **Room protocol (P0):** client sends `join` + restaurantId (+auth) on connect; server `socket.join('rest_${rid}')` and `io.to('rest_${rid}').emit(...)`. Cuts wire traffic by ~99.3% (1/150).
2. **Payload-complete events (P0):** include full order payload in `update-order-status`/`update-food-status` to eliminate the N-client GET-back herd (FE already supports payload events — `EVENTS_WITH_PAYLOAD`).
3. Instrument: socket count, emit rate, event-loop lag, PHP-FPM/Apache worker saturation, DB pool, slow queries, OOM logs during a 521 window.
4. Verify what serves the production bundle (if `craco start` dev server: ~100-connection cap = outage-class bug on its own, ARCH bible FDEP-04).

### Frontend (register as CRs, full gate flow — NOT implemented in this session)
- **FE-1 (HIGH):** Fix `connect()` leak — disconnect/teardown old socket before creating a new one (`socketService.js:43-71`).
- **FE-2 (HIGH):** Add jitter + exponential backoff to `fetchOrderWithRetry` and reconnect rehydration; randomize the 60s poll phase per client to de-synchronize the fleet.
- **FE-3 (MEDIUM):** De-duplicate in-flight single-order fetches (same orderId from multiple events).
- **FE-4 (MEDIUM):** Send restaurantId+token in handshake `auth` now, so the server room rollout can be backward-compatible.

### Decisive experiment (5 min, run in any logged-in POS browser console)
`/app/memory/evidence/INV-SOCKET-001/wire_probe.js` — counts ALL events arriving on the wire via `onAny`, split into own-restaurant vs foreign-restaurant. If foreign events appear → global broadcast proven with numbers (events/sec, bytes/sec).

## 7. Retroactive Candidates
None found.
