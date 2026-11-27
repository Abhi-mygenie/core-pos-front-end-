# BUG-677 — Impact Analysis (Gate 2)

**ID:** BUG-677
**Gate:** 2 — Impact Analysis
**Role:** PLANNING
**Date:** 2026-11-16
**Risk:** HIGH (sockets, realtime, order capture)
**Code Reality:** NONE (no fixes applied yet)
**Conflict Pre-Check:** CLEAN (see §3)

---

## 1. Root Cause (from INV-SOCKET-PWA-2026-11-16)

**MULTI-FACTOR:**
1. **Reconnection budget exhaustion:** `RECONNECTION_ATTEMPTS: 10` (socketEvents.js:14). All 10 fail during PWA background → permanent ERROR state.
2. **Server-initiated disconnect = no auto-reconnect:** Server pingInterval=25s + pingTimeout=60s = 85s max silence. After 85s in background, server disconnects. Socket.IO treats `io server disconnect` as intentional → no auto-reconnect (socketService.js:261-263).
3. **`joined_restaurant` ACK never consumed:** `JOINED_ACK_EVENT` defined at socketEvents.js:100 but zero handlers in codebase. Silent room join failure = "connected" but zero events.
4. **No aggregator polling safety net:** `useOrderPollingReconciliation` skips aggregator orders (L206: `if (l.isAggregator === true) continue`). Socket death = Swiggy/Zomato orders silently missed.

**Owner decision OD-677-01:** F1–F6 included, F7 deferred (P2).

---

## 2. Fix-by-Fix Impact Analysis (6 fixes, verified at HEAD)

### F1 — Infinite Reconnection Attempts

| Field | Value |
|-------|-------|
| File | `api/socket/socketEvents.js` (185 lines) |
| Line | **L14** |
| Current | `RECONNECTION_ATTEMPTS: 10,` |
| Fix | `RECONNECTION_ATTEMPTS: Infinity,` |
| Lines changed | 1 |
| Risk | LOW — config constant, no logic change |
| Downstream | socketService.js L58 reads `SOCKET_CONFIG.RECONNECTION_ATTEMPTS` → passes to Socket.IO `reconnectionAttempts` option |

**Why safe:** Socket.IO natively supports `Infinity` for reconnectionAttempts. Exponential backoff (1s → 30s max at L15-16) prevents server flooding.

---

### F2 — Periodic Heartbeat Health Check (30s when visible)

| Field | Value |
|-------|-------|
| File | `contexts/SocketContext.jsx` (248 lines) |
| Location | New `useEffect` after visibility handler (after L87) |
| Lines added | ~15 |
| Risk | MEDIUM — interacts with existing visibility + online handlers |

**Logic:**
```
useEffect (deps: [isAuthenticated]):
  interval = setInterval(30000):
    if document.visibilityState === 'visible'
       && isAuthenticated
       && socketService.getStatus() === CONNECTION_STATUS.ERROR:
      console.log('[SocketContext] Heartbeat: ERROR state detected, reconnecting...')
      socketService.disconnect()   // clean up old socket
      socketService.connect()      // fresh connection
  return () => clearInterval(interval)
```

**Interaction with existing handlers:**
- Visibility handler (L72-87): Fires once on `visibilitychange`. Heartbeat is a periodic safety net for cases where visibility handler failed or socket entered ERROR after becoming visible.
- Online handler (L93-99): Fires once on `online` event. Heartbeat covers cases where network recovered but status stuck in ERROR.
- **No conflict** — heartbeat only acts when status is ERROR (not DISCONNECTED/RECONNECTING/CONNECTED).

---

### F3 — Explicit disconnect() Before New connect()

| Field | Value |
|-------|-------|
| File | `api/socket/socketService.js` (388 lines) |
| Location | `connect()` method, L45-72. Insert cleanup at L50 (after the `already connected` guard) |
| Lines added | ~5 |
| Risk | LOW — defensive cleanup, prevents listener leak |

**Current flow (L45-72):**
```javascript
connect(options = {}) {
  if (this.socket && this.socket.connected) { return this.socket; } // L47-49
  // ...creates new socket at L67 without cleaning up old one
}
```

**Fix — insert after L49:**
```javascript
// BUG-677 F3: Clean up old socket before creating new connection
if (this.socket) {
  this.socket.removeAllListeners();
  this.socket.disconnect();
  this.socket = null;
}
```

**Why needed:** If `this.socket` exists but is NOT connected (ERROR/DISCONNECTED state), creating a new `io()` at L67 overwrites the reference but doesn't clean up old event handlers → listener leak. The existing `disconnect()` method at L91-100 does this cleanup but `connect()` doesn't call it.

---

### F4 — Aggregator Order Polling Reconciliation

| Field | Value |
|-------|-------|
| File | `hooks/useOrderPollingReconciliation.js` (364 lines) |
| Location | Inside the reconciliation function, before the orphan detection loop |
| Lines added | ~40 |
| Risk | MEDIUM — adds API call to reconciliation cycle |

**Current gap (L204-208):**
```javascript
// BUG-250: Aggregator orders come from UrbanPiper API (not getRunningOrders).
// Do not treat as orphan — status updates arrive via aggregator socket channel.
if (l.isAggregator === true) {
  continue;  // ← skips aggregator = NO reconciliation for aggregator orders
}
```

**Fix approach:** Add `getAggregatorOrderList()` fetch to the reconciliation cycle. Pattern already exists in `useRefreshAllData.js` (BUG-599 Rev2) and `LoadingPage.jsx`:
```
1. Fetch aggregator orders: getAggregatorOrderList(restaurantId)
2. Transform: aggregatorFromAPI(response)
3. Merge new aggregator orders into context (add missing, update existing)
4. Keep the existing L206 skip for ORPHAN detection (aggregator orders should never be removed by polling)
```

**Dependencies:** `getAggregatorOrderList` from `aggregatorService.js`, `aggregatorFromAPI` from `aggregatorTransform.js` — both already imported in `LoadingPage.jsx` and `useRefreshAllData.js`.

**Interaction with BUG-599 Rev2:** BUG-599 added aggregator fetch to LoadingPage (boot) and useRefreshAllData (manual refresh). F4 adds it to the PERIODIC polling cycle (every 60s). Different trigger, same API call. No conflict — complementary.

---

### F5 — Auto-retry on reconnect_failed with Backoff

| Field | Value |
|-------|-------|
| File | `api/socket/socketService.js` (388 lines) |
| Location | `_setupConnectionHandlers()` → `RECONNECT_FAILED` handler at L298-302 |
| Lines added | ~10 |
| Risk | LOW — adds recovery path to existing dead-end handler |

**Current (L298-302):**
```javascript
this.socket.on(CONNECTION_EVENTS.RECONNECT_FAILED, () => {
  this._log('ERROR', 'Reconnect failed after max attempts');
  this._setStatus(CONNECTION_STATUS.ERROR);
  // ⚠️ DEAD END — no recovery, socket stays in ERROR forever
});
```

**Fix:**
```javascript
this.socket.on(CONNECTION_EVENTS.RECONNECT_FAILED, () => {
  this._log('ERROR', 'Reconnect failed after max attempts');
  this._setStatus(CONNECTION_STATUS.ERROR);
  // BUG-677 F5: auto-retry after 5s — fresh connection bypasses exhausted budget
  setTimeout(() => {
    if (this.status === CONNECTION_STATUS.ERROR) {
      this._log('INFO', 'BUG-677 F5: auto-retry after reconnect_failed');
      this.disconnect();
      this.connect();
    }
  }, 5000);
});
```

**Why safe:** 5s delay prevents tight loop. `disconnect()` nullifies old socket + clears handlers. `connect()` creates fresh connection with fresh reconnection budget. The `if (status === ERROR)` guard prevents action if something else already recovered the socket.

**With F1 (Infinity):** F5 becomes a secondary safety net. With infinite attempts, `reconnect_failed` should never fire. F5 catches the edge case where Socket.IO internally caps attempts or hits an unexpected state.

---

### F6 — Listen for `joined_restaurant` ACK, Re-emit on Timeout

| Field | Value |
|-------|-------|
| File | `api/socket/socketService.js` — `joinRestaurant()` method at L79-86 |
| Location | Extend `joinRestaurant()` + add ACK listener in `_setupConnectionHandlers()` |
| Lines added | ~20 |
| Risk | MEDIUM — new event listener + timeout logic |

**Current (L79-86):**
```javascript
joinRestaurant(restaurantId) {
  if (!restaurantId) return;
  this.restaurantId = restaurantId;
  if (this.socket && this.socket.connected) {
    this.socket.emit(JOIN_EVENT, { restaurant_id: restaurantId });
    this._log('INFO', `join_restaurant emitted for ${restaurantId}`);
  }
  // ⚠️ Fire-and-forget — no ACK check
}
```

**Fix approach:**
```
1. Import JOINED_ACK_EVENT from socketEvents.js (already defined at L100)
2. In joinRestaurant(): after emit, start a 5s timeout
3. In _setupConnectionHandlers(): listen for JOINED_ACK_EVENT
   - On ACK received: clear timeout, log success
   - On timeout (5s): re-emit join_restaurant once
   - On second timeout (10s): log error, force reconnect via disconnect()+connect()
4. Store timeout ref on instance (this._joinAckTimeout) for cleanup in disconnect()
```

**Why safe:** `JOINED_ACK_EVENT` is already defined (`socketEvents.js:100`) and the server already sends it (confirmed by live probe in investigation). Adding a listener is purely additive. The timeout only triggers if the ACK is never received — a genuine failure mode that currently causes silent event loss.

---

## 3. Conflict Pre-Check

| Item | Files | Status | Conflict? |
|------|-------|--------|-----------|
| CR-082 (QA PASS) | socketEvents.js, socketService.js, useSocketEvents.js | CLOSED | **NO** — CR-082 added JOIN_EVENT/joinRestaurant, already in codebase. F6 extends it. |
| BUG-599 Rev2 (IMPLEMENTED) | LoadingPage.jsx, useRefreshAllData.js, DashboardPage.jsx | CLOSED | **NO** — BUG-599 added aggregator to boot+refresh. F4 adds to periodic polling. Different files. |
| BUG-068 (CLOSED) | socketService.js, useSocketEvents.js | CLOSED | **NO** — BUG-068 added reconnect rehydration. F2/F5 add reconnect TRIGGERING (upstream). |
| BUG-167 (QA PASS) | AppSocketManager.jsx | CLOSED | **NO** — persistent socket mount. Not touching AppSocketManager. |
| BUG-606/619/620/658 | Various socket handlers | QA PASS | **NO** — event handler logic, not connection lifecycle. |

**Result: CLEAN — no blocking conflicts.**

---

## 4. Files Changed Summary

| # | Fix | File | Lines | Risk |
|---|-----|------|-------|------|
| F1 | Infinite reconnection | `api/socket/socketEvents.js` L14 | 1 | LOW |
| F2 | Heartbeat health check | `contexts/SocketContext.jsx` (new useEffect after L87) | ~15 | MEDIUM |
| F3 | Disconnect before connect | `api/socket/socketService.js` L50 (insert) | ~5 | LOW |
| F4 | Aggregator polling | `hooks/useOrderPollingReconciliation.js` | ~40 | MEDIUM |
| F5 | Auto-retry reconnect_failed | `api/socket/socketService.js` L298-302 (extend) | ~10 | LOW |
| F6 | joined_restaurant ACK | `api/socket/socketService.js` L79-86 (extend) + `_setupConnectionHandlers` | ~20 | MEDIUM |
| **Total** | | **4 files** | **~91 lines** | **HIGH (aggregate)** |

**Files WILL change:** socketEvents.js, socketService.js, SocketContext.jsx, useOrderPollingReconciliation.js
**Files WILL NOT touch:** useSocketEvents.js, socketHandlers.js, DashboardPage.jsx, OrderContext.jsx, AppSocketManager.jsx, NotificationContext.jsx, firebase-messaging-sw.js

---

## 5. Execution Order

```
F1 (socketEvents.js)      — independent, no prerequisites
F3 (socketService.js)      — independent, no prerequisites
F5 (socketService.js)      — same file as F3, apply after F3
F6 (socketService.js)      — same file as F3/F5, apply after F5
F2 (SocketContext.jsx)      — depends on F3 working (heartbeat calls disconnect+connect)
F4 (useOrderPolling...)     — independent, no prerequisites
```

F1 → F3 → F5 → F6 → F2 → F4 (sequential within socketService.js, then others)

---

## 6. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Infinite reconnect floods server | LOW | MEDIUM | Socket.IO exponential backoff (1s→30s max) built-in |
| R2 | Heartbeat creates duplicate connections | LOW | LOW | Guard: only acts when status === ERROR |
| R3 | F3 disconnect loses in-flight events | VERY LOW | LOW | Only fires when socket NOT connected already |
| R4 | F4 aggregator API adds load | LOW | LOW | Same 60s interval as POS polling; single fetch |
| R5 | F5 auto-retry loop | LOW | MEDIUM | 5s delay + status guard prevents tight loop |
| R6 | F6 ACK timeout false positive | LOW | MEDIUM | 5s timeout generous; re-emit before force reconnect |
| R7 | Multiple fixes interact unexpectedly | LOW | MEDIUM | Each fix is independently testable; F2 is the aggregator safety net |

---

## 7. Owner Decisions

**None required** — OD-677-01 already locked (F1–F6 included, F7 deferred).

---

## 8. Verification Matrix (seeds QA)

| # | Fix | Check | Method | Expected |
|---|-----|-------|--------|----------|
| V1 | F1 | RECONNECTION_ATTEMPTS = Infinity | grep socketEvents.js | `Infinity` at L14 |
| V2 | F2 | Heartbeat useEffect exists | grep SocketContext.jsx | 30s interval + ERROR check |
| V3 | F3 | Old socket cleaned before new connect | Code trace socketService.js | removeAllListeners + disconnect before io() |
| V4 | F4 | Aggregator orders fetched in polling | grep useOrderPollingReconciliation | getAggregatorOrderList call |
| V5 | F5 | reconnect_failed has auto-retry | Code trace socketService.js | setTimeout 5s → disconnect + connect |
| V6 | F6 | JOINED_ACK_EVENT listener exists | grep socketService.js | .on(JOINED_ACK_EVENT) handler |
| V7 | F6 | Join timeout + re-emit logic | Code trace | 5s timeout, re-emit, force reconnect on 2nd failure |
| V8 | — | Webpack compiles 0 new warnings | Dev server / yarn build | 0 new |
| V9 | — | `// BUG-677` markers in all changed files | grep | ≥6 hits across 4 files |
| V10 | F2 | PWA background → foreground → socket recovers | Browser: background tab 2min → return | Socket reconnects within 30s of return |
| V11 | F4 | Aggregator order appears after socket death | Browser: kill socket → wait 60s → check dashboard | Aggregator order visible via polling |

---

## 9. Artifacts

| Artifact | Path |
|----------|------|
| Intake | `change_requests/BUG-677_SOCKET_PWA_DISCONNECT_INTAKE.md` |
| Investigation | `investigations/INV-SOCKET-PWA-2026-11-16.md` |
| Owner decisions | `change_requests/BATCH_2_OWNER_DECISIONS_2026_11_16.md` |
| Impact Analysis (this doc) | `impact/BUG-677_IMPACT_ANALYSIS.md` |

---

```
Planning complete: BUG-677
Stage: Impact Analysis (Gate 2 only)
Code reality: NONE
Risk: HIGH
Files WILL change: socketEvents.js (L14), socketService.js (L50, L79-86, L298-302), SocketContext.jsx (after L87), useOrderPollingReconciliation.js
Files WILL NOT touch: useSocketEvents.js, socketHandlers.js, DashboardPage.jsx, OrderContext.jsx, AppSocketManager.jsx, NotificationContext.jsx
Owner decisions: OD-677-01 already locked (F1-F6)
Docs: impact/BUG-677_IMPACT_ANALYSIS.md
Next: Gate 3 (Implementation Plan) or Gate 4 GO
```
