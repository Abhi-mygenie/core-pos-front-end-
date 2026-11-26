# BUG-688 — Impact Analysis (Gate 2)

**ID:** BUG-688 · **Type:** BUG · **Area:** Aggregator / Sockets
**Priority:** P3 · **Risk:** LOW · **QA Severity:** MINOR
**Stage:** Gate 2 — Impact Analysis only (no plan, no code)
**Author:** PLANNING agent · **Date:** 2026-11-18

## Code Reality
**FULL** — `frontend/src/api/socket/socketService.js`:
- `joinRestaurant()` L88-94 emits via `_emitJoinWithAck()` when connected.
- `_emitJoinWithAck()` L97-118 (BUG-677 F6) emits `JOIN_EVENT`, then on 5s ACK-miss **re-emits (attempt 2)**, and on 2nd miss forces `disconnect()/connect()`.
- The `on('connect')` handler (~L284-290, "BUG-677 F6: use ACK-aware join on reconnect too") calls the join again on every (re)connect.
Root-cause candidate: on reconnect the **connect-handler join** fires AND the **ACK re-emit timer** (or an external `joinRestaurant` call from the socket hook) also fires, producing two `join_restaurant` emits / two acks. Exact second emitter to be confirmed in Gate 3 (connect-handler vs useSocketEvents re-subscribe vs ACK re-emit).

## Conflict Pre-Check
- `socketService.js` owned by BUG-677 (F1/F3/F6) + CR-082. No other open edit.
- RELATED: BUG-677. Parallel-safe with others.

## Data-flow trace
socket reconnect → `connect` event → ACK-aware join emit (#1); ACK timer / external joinRestaurant → emit (#2) → server acks twice. No functional break observed (idempotent server-side join), only a duplicate ack.

## Affected files / lines
| File | Lines | Nature |
|------|-------|--------|
| `api/socket/socketService.js` | ~L97-118 + ~L284-290 | de-duplicate: ensure one join per (re)connection; clear pending ACK timer before connect-handler re-emit |

## Risk
LOW. Not Fast-Lane (socket layer + R5-adjacent; needs reconnect verification).

## Owner decisions
None.

## Verification seeds
1. Force offline→online → exactly **one** `join_restaurant` emit per reconnection (check socket logs).
2. ACK-miss path still re-emits once then force-reconnects (BUG-677 F6 intact).
