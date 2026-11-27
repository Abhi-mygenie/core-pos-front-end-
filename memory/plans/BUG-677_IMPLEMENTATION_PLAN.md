# BUG-677 — Implementation Plan (Gate 3)

**ID:** BUG-677
**Gate:** 3 — Implementation Plan
**Role:** PLANNING
**Date:** 2026-11-16
**Risk:** HIGH (sockets, realtime, order capture)
**IA verified at HEAD:** YES (same session)

---

### RE-VALIDATION — 2026-11-18 (Planning Agent, pre-Gate-4)

**Code Reality:** NONE — 0 BUG-677 markers in codebase. All 10 edits still pending.

**Line-by-line check:**

| Edit | Plan line(s) | Actual line(s) | Match |
|------|-------------|----------------|-------|
| E1 | socketEvents.js L14 | L14 | ✅ EXACT |
| E4 | socketService.js L5 | L5 | ✅ EXACT |
| E2 | socketService.js L45–52 | L45–52 | ✅ EXACT |
| E5 | socketService.js L79–86 | L79–86 | ✅ EXACT |
| E7 | socketService.js L91–100 | L91–100 | ✅ EXACT |
| E6 | socketService.js L252–254 | L252–254 | ✅ EXACT |
| E3 | socketService.js L298–302 | L298–302 | ✅ EXACT |
| E8 | SocketContext.jsx after L87 | after L87 | ✅ EXACT |
| E9a | useOrderPolling after L26 | after L26 | ✅ EXACT |
| E9b | useOrderPolling L270–275 | **L269–275** | ⚠️ 1-line shift (see §2.9 below) |

**Dependency check:**
- `JOINED_ACK_EVENT`: already exported from socketEvents.js at L100 (CR-082). E4 import is still needed in socketService.js. ✅
- `getAggregatorOrderList`: exists in aggregatorService.js L5. ✅
- `aggregatorFromAPI.aggregatorOrderList`: exists in aggregatorTransform.js L149. ✅
- `addOrder`, `ordersSnapshotRef`: both present in useOrderPollingReconciliation.js. ✅
- `CONNECTION_STATUS`: imported in SocketContext.jsx L5. ✅

**Conflict re-check:**
- CR-082 (socketService.js, socketEvents.js): status QA PASS — awaiting owner smoke. Code already in codebase (CR-082's work is BUG-677's starting state). **Non-blocking.**
- BUG-167 (socket food_update channel): status QA PASS — different channel, no overlap. **Non-blocking.**

**Verdict: Plan is VALID. One line-number annotation updated in E9b below.**

---

## 1. Scope Lock

**Files WILL change:**
- `frontend/src/api/socket/socketEvents.js` — F1
- `frontend/src/api/socket/socketService.js` — F3, F5, F6
- `frontend/src/contexts/SocketContext.jsx` — F2
- `frontend/src/hooks/useOrderPollingReconciliation.js` — F4

**Files WILL NOT touch:**
- `useSocketEvents.js`, `socketHandlers.js`, `AppSocketManager.jsx`
- `DashboardPage.jsx`, `OrderContext.jsx`, `NotificationContext.jsx`
- Any transform, service (except aggregatorService import in F4), or test file

---

## 2. Exact Edits

### Edit E1 — F1: Infinite Reconnection (socketEvents.js L14)

```
CURRENT (L14):
  RECONNECTION_ATTEMPTS: 10,

REPLACE WITH:
  RECONNECTION_ATTEMPTS: Infinity, // BUG-677 F1: never exhaust reconnection budget
```

1 line. No downstream changes — socketService.js L58 reads this config as-is.

---

### Edit E2 — F3: Clean Up Old Socket Before New Connect (socketService.js L50)

```
CURRENT (L45-52):
  connect(options = {}) {
    // Prevent duplicate connections
    if (this.socket && this.socket.connected) {
      this._log('INFO', 'Already connected, skipping');
      return this.socket;
    }

    this._setStatus(CONNECTION_STATUS.CONNECTING);

REPLACE WITH:
  connect(options = {}) {
    // Prevent duplicate connections
    if (this.socket && this.socket.connected) {
      this._log('INFO', 'Already connected, skipping');
      return this.socket;
    }

    // BUG-677 F3: clean up old socket + handlers before creating new connection
    // Prevents listener leak when socket exists but is not connected (ERROR/DISCONNECTED)
    if (this.socket) {
      this._log('INFO', 'BUG-677 F3: cleaning up stale socket before reconnect');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this._setStatus(CONNECTION_STATUS.CONNECTING);
```

~5 lines inserted after L49, before L52.

---

### Edit E3 — F5: Auto-Retry on reconnect_failed (socketService.js L298-302)

```
CURRENT (L298-302):
    // Reconnect failed (max attempts reached)
    this.socket.on(CONNECTION_EVENTS.RECONNECT_FAILED, () => {
      this._log('ERROR', 'Reconnect failed after max attempts');
      this._setStatus(CONNECTION_STATUS.ERROR);
    });

REPLACE WITH:
    // Reconnect failed (max attempts reached)
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

~7 lines added inside existing handler.

---

### Edit E4 — F6: Import JOINED_ACK_EVENT (socketService.js L5)

```
CURRENT (L5):
import { SOCKET_CONFIG, CONNECTION_EVENTS, JOIN_EVENT } from './socketEvents'; // CR-082: +JOIN_EVENT

REPLACE WITH:
import { SOCKET_CONFIG, CONNECTION_EVENTS, JOIN_EVENT, JOINED_ACK_EVENT } from './socketEvents'; // CR-082: +JOIN_EVENT, BUG-677: +JOINED_ACK_EVENT
```

---

### Edit E5 — F6: joinRestaurant ACK Handling (socketService.js L79-86)

```
CURRENT (L79-86):
  joinRestaurant(restaurantId) {
    if (!restaurantId) return;
    this.restaurantId = restaurantId;
    if (this.socket && this.socket.connected) {
      this.socket.emit(JOIN_EVENT, { restaurant_id: restaurantId });
      this._log('INFO', `join_restaurant emitted for ${restaurantId}`);
    }
  }

REPLACE WITH:
  joinRestaurant(restaurantId) {
    if (!restaurantId) return;
    this.restaurantId = restaurantId;
    if (this.socket && this.socket.connected) {
      this._emitJoinWithAck(restaurantId);
    }
  }

  // BUG-677 F6: emit join_restaurant with ACK timeout + re-emit + force reconnect
  _emitJoinWithAck(restaurantId, attempt = 1) {
    if (!this.socket || !this.socket.connected) return;
    // Clear any previous ACK timeout
    if (this._joinAckTimeout) clearTimeout(this._joinAckTimeout);

    this.socket.emit(JOIN_EVENT, { restaurant_id: restaurantId });
    this._log('INFO', `join_restaurant emitted for ${restaurantId} (attempt ${attempt})`);

    this._joinAckTimeout = setTimeout(() => {
      if (attempt < 2) {
        // Re-emit once
        this._log('WARN', `BUG-677 F6: joined_restaurant ACK not received in 5s, re-emitting (attempt 2)`);
        this._emitJoinWithAck(restaurantId, 2);
      } else {
        // Force reconnect after 2nd failure
        this._log('ERROR', `BUG-677 F6: joined_restaurant ACK not received after 2 attempts, force reconnect`);
        this.disconnect();
        this.connect();
      }
    }, 5000);
  }
```

~20 lines. New helper method `_emitJoinWithAck`.

---

### Edit E6 — F6: Listen for JOINED_ACK_EVENT (socketService.js _setupConnectionHandlers)

Insert inside `_setupConnectionHandlers()` after the `RECONNECT_FAILED` handler (after the closing of E3's block), before the closing `}` of `_setupConnectionHandlers()` at L303:

```
INSERT AFTER the reconnect_failed handler block (after E3):

    // BUG-677 F6: listen for joined_restaurant ACK — clears timeout set by _emitJoinWithAck
    this.socket.on(JOINED_ACK_EVENT, (data) => {
      if (this._joinAckTimeout) {
        clearTimeout(this._joinAckTimeout);
        this._joinAckTimeout = null;
      }
      this._log('INFO', `joined_restaurant ACK received: ${JSON.stringify(data)}`);
    });
```

~7 lines inserted. Also update the `connect` handler (L244-256) to use `_emitJoinWithAck`:

```
CURRENT (L252-254 inside 'connect' handler):
      if (this.restaurantId) {
        this.socket.emit(JOIN_EVENT, { restaurant_id: this.restaurantId });
        this._log('INFO', `join_restaurant re-emitted for ${this.restaurantId} (connect)`);
      }

REPLACE WITH:
      // BUG-677 F6: use ACK-aware join on reconnect too
      if (this.restaurantId) {
        this._emitJoinWithAck(this.restaurantId);
      }
```

---

### Edit E7 — F6: Clean Up ACK Timeout in disconnect() (socketService.js L91-100)

```
CURRENT (L91-100):
  disconnect() {
    if (this.socket) {
      this._log('INFO', 'Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this._setStatus(CONNECTION_STATUS.DISCONNECTED);
      this.reconnectAttempts = 0;
      // CR-082: clear room on logout — prevents next tenant joining previous tenant's room
      this.restaurantId = null;
    }
  }

REPLACE WITH:
  disconnect() {
    // BUG-677 F6: clear join ACK timeout
    if (this._joinAckTimeout) {
      clearTimeout(this._joinAckTimeout);
      this._joinAckTimeout = null;
    }
    if (this.socket) {
      this._log('INFO', 'Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this._setStatus(CONNECTION_STATUS.DISCONNECTED);
      this.reconnectAttempts = 0;
      // CR-082: clear room on logout — prevents next tenant joining previous tenant's room
      this.restaurantId = null;
    }
  }
```

~4 lines added.

---

### Edit E8 — F2: Heartbeat Health Check (SocketContext.jsx after L87)

Insert a new `useEffect` after the visibility handler's closing `}, [isAuthenticated]);` at L87:

```
INSERT AFTER L87:

  // ===========================================================================
  // BUG-677 F2: PERIODIC HEARTBEAT HEALTH CHECK
  // Safety net — if socket enters ERROR state and visibility/online handlers
  // didn't recover it, this 30s check will force a fresh connection.
  // ===========================================================================
  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        isAuthenticated &&
        socketService.getStatus() === CONNECTION_STATUS.ERROR
      ) {
        console.log('[SocketContext] BUG-677 F2: heartbeat detected ERROR state, reconnecting...');
        socketService.disconnect();
        socketService.connect();
      }
    }, 30_000);

    return () => clearInterval(heartbeat);
  }, [isAuthenticated]);
```

~15 lines.

---

### Edit E9 — F4: Aggregator Polling in Reconciliation (useOrderPollingReconciliation.js)

**E9a — Add imports (after L26):**

```
INSERT AFTER L26 (after orderService import):
import { getAggregatorOrderList } from '../api/services/aggregatorService'; // BUG-677 F4
import { fromAPI as aggregatorFromAPI } from '../api/transforms/aggregatorTransform'; // BUG-677 F4
```

**E9b — Add aggregator fetch inside pollOnce (extend L269-275, was L270-275 in original plan — 1-line shift confirmed 2026-11-18):**

```
CURRENT (L269-275, was L270-275 in original plan):
    const t0 = Date.now();
    try {
      const roleParam = permissions?.[0] || 'Manager';
      const serverOrders = await orderService.getRunningOrders(roleParam, {
        signal: ac.signal,
      });
      reconcile(serverOrders || [], trigger, Date.now() - t0);

REPLACE WITH:
    const t0 = Date.now();
    try {
      const roleParam = permissions?.[0] || 'Manager';
      // BUG-677 F4: fetch POS + aggregator orders in parallel (same pattern as useRefreshAllData)
      const [posResult, aggResult] = await Promise.allSettled([
        orderService.getRunningOrders(roleParam, { signal: ac.signal }),
        getAggregatorOrderList().catch(() => []),
      ]);

      const serverOrders = posResult.status === 'fulfilled' ? (posResult.value || []) : [];
      reconcile(serverOrders, trigger, Date.now() - t0);

      // BUG-677 F4: reconcile aggregator orders — add missing ones to context
      if (aggResult.status === 'fulfilled') {
        const aggOrders = aggResult.value ? aggregatorFromAPI.aggregatorOrderList(aggResult.value) : [];
        const localOrders = ordersSnapshotRef.current || [];
        const localIds = new Set(localOrders.map(o => o.orderId));
        let aggAdded = 0;
        for (const agg of aggOrders) {
          if (agg && !localIds.has(agg.orderId)) {
            addOrder(agg);
            aggAdded += 1;
          }
        }
        if (aggAdded > 0) {
          // eslint-disable-next-line no-console
          console.log(`[OrderPolling] BUG-677 F4: +${aggAdded} aggregator orders discovered`);
        }
      }
```

~20 lines replace 6 existing lines. POS reconciliation unchanged — aggregator fetch is additive.

**Note:** The existing L206 `if (l.isAggregator === true) { continue; }` in the REMOVAL loop stays intact — aggregator orders are still never removed by polling. F4 only ADDS missing aggregator orders.

---

## 3. Execution Sequence

```
1. E1  (F1) — socketEvents.js L14           — config change, independent
2. E4  (F6) — socketService.js L5            — import change, before other edits
3. E2  (F3) — socketService.js L50           — connect() cleanup
4. E5  (F6) — socketService.js L79-86        — joinRestaurant rewrite
5. E7  (F6) — socketService.js L91-100       — disconnect() cleanup
6. E6  (F6) — socketService.js handlers      — JOINED_ACK listener
7. E3  (F5) — socketService.js L298-302      — reconnect_failed retry
8. E8  (F2) — SocketContext.jsx after L87     — heartbeat
9. E9a (F4) — useOrderPolling... imports      — aggregator imports
10. E9b (F4) — useOrderPolling... pollOnce    — aggregator fetch
```

Webpack check after each file is complete (3 checkpoints: after socketService, after SocketContext, after useOrderPolling).

---

## 4. Verification Matrix

| # | Edit | File | Change | How to Verify | Auto? |
|---|------|------|--------|---------------|:---:|
| V1 | E1 | socketEvents.js:14 | `Infinity` | grep | YES |
| V2 | E2 | socketService.js:50 | removeAllListeners + disconnect before new io() | code trace | YES |
| V3 | E3 | socketService.js:298+ | setTimeout 5s → disconnect + connect | code trace | YES |
| V4 | E4 | socketService.js:5 | JOINED_ACK_EVENT in import | grep | YES |
| V5 | E5 | socketService.js:79+ | _emitJoinWithAck method exists | grep | YES |
| V6 | E6 | socketService.js:handlers | .on(JOINED_ACK_EVENT) handler | grep | YES |
| V7 | E7 | socketService.js:91+ | _joinAckTimeout cleared in disconnect | code trace | YES |
| V8 | E8 | SocketContext.jsx | heartbeat setInterval 30s + ERROR check | grep | YES |
| V9 | E9a | useOrderPolling | aggregatorService + aggregatorTransform imports | grep | YES |
| V10 | E9b | useOrderPolling | Promise.allSettled POS + aggregator | code trace | YES |
| V11 | — | all | `// BUG-677` markers | grep -r | YES |
| V12 | — | — | webpack 0 new warnings | dev server | YES |
| V13 | — | — | PWA bg→fg → socket recovers | browser | NO |
| V14 | — | — | Aggregator order appears via polling | browser | NO |

---

## 5. Post-Code Registry Checklist (EXIT GATE)

```
- [ ] registry.json: BUG-677 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add socketEvents.js, socketService.js, SocketContext.jsx, useOrderPollingReconciliation.js
- [ ] Code markers: // BUG-677 in every modified file (F1–F6 labels)
- [ ] Compile check: webpack 0 new warnings
```

---

## 6. Risk Register

| # | Risk | Mitigation |
|---|------|------------|
| R1 | Infinite reconnect floods server | Socket.IO backoff: 1s→30s max. F5 adds extra 5s gate. |
| R2 | Heartbeat creates duplicate connections | Only acts when status === ERROR, not CONNECTING/CONNECTED |
| R3 | F3 removes handlers on a socket that's mid-reconnect | Guard: only triggers when `!this.socket.connected` |
| R4 | F4 aggregator fetch adds latency to polling | Promise.allSettled — POS reconcile runs even if aggregator fails |
| R5 | F6 ACK timeout false positive (slow server) | 5s generous; 2 attempts before force reconnect |
| R6 | F5+F1 redundancy | With Infinity attempts, reconnect_failed rarely fires. F5 is a safety net. |

---

```
Planning complete: BUG-677
Stage: Implementation Plan (Gate 3)
Code reality: NONE
Risk: HIGH
Edits: 10 (E1–E9b) across 4 files, ~91 lines
Execution order: E1→E4→E2→E5→E7→E6→E3→E8→E9a→E9b
Verification matrix: 14 checks (12 automated, 2 manual browser)
Owner decisions: OD-677-01 already locked
Docs: plans/BUG-677_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → Implementation
```
