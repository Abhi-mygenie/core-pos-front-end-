# BUG-677: Socket Disconnection in PWA — Reconnection Exhaustion + No Auto-Reconnect After Server Disconnect

**ID:** BUG-677
**Type:** BUG
**Area:** Aggregator / Sockets
**Priority:** P0
**Risk:** HIGH
**Severity:** P0 — CRITICAL (realtime orders missed, force refresh required)
**Client:** ALL
**Assignee:** Abhishek (FE, not backend-blocked)
**Routing reason:** Sockets area, frontend code, not blocked at backend
**Sprint:** —
**Created:** 2026-11-16

---

## Symptom
PWA app sockets stop working after some time in background. Staff must force refresh to restore. After refresh, sockets work temporarily, then disconnect again after the app is backgrounded. Aggregator order sockets are also affected — Swiggy/Zomato orders silently missed.

## Classification
- **Bug** — existing functionality broken
- **Source:** OWNER-REPORTED
- **Confidence:** CONFIRMED (code-traced + live server probed)

## Root Cause (from investigation INV-SOCKET-PWA-2026-11-16)
**MULTI-FACTOR:**
1. **Reconnection budget exhaustion:** `RECONNECTION_ATTEMPTS: 10` in socketEvents.js:14. When all 10 attempts fail during PWA background suspension, socket enters permanent ERROR state.
2. **Server-initiated disconnect = NO auto-reconnect:** Server pingInterval=25s, pingTimeout=60s (live-probed). After 85s of silence (PWA background), server disconnects. Socket.IO treats `io server disconnect` as intentional — no auto-reconnect.
3. **`joined_restaurant` ACK never consumed:** Server sends room-join confirmation but FE never listens for it. If join fails silently, socket shows "connected" but receives zero events.
4. **No aggregator polling safety net:** `useOrderPollingReconciliation` polls POS orders only. Aggregator orders have zero fallback when socket dies.

## Evidence
- Server handshake probe: `/app/memory/evidence/INV-SOCKET-PWA-2026-11-16/server_handshake_probe.md`
- Room join probe: `/app/memory/evidence/INV-SOCKET-PWA-2026-11-16/room_join_probe.md`
- PWA vs Browser analysis: `/app/memory/evidence/INV-SOCKET-PWA-2026-11-16/pwa_vs_browser_analysis.md`
- Full investigation: `/app/memory/investigations/INV-SOCKET-PWA-2026-11-16.md`

## Blast Radius
- ~8 files, HIGH scope
- Hotspot files: socketService.js, socketEvents.js, SocketContext.jsx, useSocketEvents.js
- Affects: ALL restaurants using PWA, ALL order types (POS + aggregator)

## Proposed Fixes (7 items, from investigation)
| # | Fix | Priority |
|---|-----|----------|
| F1 | `RECONNECTION_ATTEMPTS: Infinity` | P0 |
| F2 | Periodic heartbeat health check (30s when visible) | P0 |
| F3 | Explicit `disconnect()` before new `connect()` | P1 |
| F4 | Aggregator order polling reconciliation | P1 |
| F5 | Auto-retry on `reconnect_failed` with backoff | P1 |
| F6 | Listen for `joined_restaurant` ACK, re-emit on timeout | P1 |
| F7 | Service Worker health ping on PWA resume | P2 |

## Open Questions
None — investigation complete, all hypotheses resolved.

## Duplicate Check
- **BUG-068:** "Pending Scan & Order Popup Does Not Appear After Socket Reconnect" — RELATED but DISTINCT. BUG-068 fixed the reconnect rehydration (re-fetch orders on reconnect). This BUG-677 is about the reconnect NEVER HAPPENING (budget exhaustion + server disconnect). BUG-068 fix only works IF the socket reconnects successfully.
- **Verdict:** DISTINCT — BUG-068 is a subset scenario; BUG-677 is the root cause of permanent socket death.

---

## Owner Decisions (locked 2026-11-16)

See `change_requests/BATCH_2_OWNER_DECISIONS_2026_11_16.md`

- **OD-677-01:** F1 through F6 included. F7 deferred (P2).
- IA scope: 6 fixes, ~6 files, ~90 lines total.
- Next: Impact Analysis (Gate 2).

