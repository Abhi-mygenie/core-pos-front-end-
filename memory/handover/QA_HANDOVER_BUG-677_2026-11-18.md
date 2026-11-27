# QA Handover — BUG-677
**Date:** 2026-11-18
**From:** Implementation Agent (Gate 5a complete)
**To:** QA Agent (Gate 5b)
**Item:** BUG-677 — Socket Disconnection in PWA: Reconnection Exhaustion + No Auto-Reconnect

---

## 1. Verification Matrix (self-test results)

| # | Edit | File | Verification | Self-Test |
|---|------|------|-------------|:---:|
| V1 | E1 | socketEvents.js:14 | `RECONNECTION_ATTEMPTS: Infinity` | ✅ grep confirmed |
| V2 | E2 | socketService.js | `removeAllListeners` + null before new io() | ✅ grep confirmed |
| V3 | E3 | socketService.js | `setTimeout 5s → disconnect + connect` in reconnect_failed | ✅ grep confirmed |
| V4 | E4 | socketService.js:5 | `JOINED_ACK_EVENT` in import | ✅ grep confirmed |
| V5 | E5 | socketService.js | `_emitJoinWithAck` method exists (5 hits) | ✅ grep confirmed |
| V6 | E6 | socketService.js | `.on(JOINED_ACK_EVENT)` handler present | ✅ grep confirmed |
| V7 | E7 | socketService.js | `_joinAckTimeout` cleared in disconnect (3 cleanup sites) | ✅ grep confirmed |
| V8 | E8 | SocketContext.jsx | `setInterval 30_000` + ERROR state check | ✅ grep confirmed |
| V9 | E9a | useOrderPolling | aggregatorService + aggregatorTransform imports at L27-28 | ✅ grep confirmed |
| V10 | E9b | useOrderPolling | `Promise.allSettled` POS + aggregator at L275 | ✅ grep confirmed |
| V11 | — | all 4 files | 20 × `// BUG-677` markers | ✅ 20 hits |
| V12 | — | — | webpack compiled successfully, 0 new warnings | ✅ |
| V13 | — | — | PWA bg→fg → socket recovers (30s heartbeat) | ⬜ browser only |
| V14 | — | — | Aggregator order appears via polling | ⬜ browser only |

---

## 2. Test Cases for QA

| # | Feature | Steps | Expected |
|---|---------|-------|----------|
| T1 | Reconnection budget | Disable WiFi for 5 min, re-enable | Socket recovers, never permanently disconnects |
| T2 | Stale socket cleanup | Force disconnect then reconnect | No duplicate listeners, single connection |
| T3 | Heartbeat recovery | Simulate ERROR state (block socket URL), wait 30s, unblock | Console: `BUG-677 F2: heartbeat detected ERROR state` → reconnects |
| T4 | Join ACK — happy path | Login + load dashboard | Console: `joined_restaurant ACK received` within 5s |
| T5 | Join ACK — slow server | Throttle socket server response > 5s | Console: `ACK not received in 5s, re-emitting (attempt 2)` |
| T6 | Join ACK — both fail | Block socket entirely | Console: `force reconnect` after 2 attempts |
| T7 | Aggregator polling | Have aggregator orders on backend | Orders appear on dashboard within 60s without socket event |
| T8 | POS polling still works | Normal POS orders | Existing POS reconciliation unaffected |
| T9 | Disconnect cleanup | Logout | No _joinAckTimeout fires after logout |

---

## 3. Regression scope

| Area | Risk | Notes |
|------|------|-------|
| Socket connect/disconnect flow | LOW | F3 guard only triggers on !connected socket |
| joinRestaurant | LOW | Same emit, same event — ACK timeout is additive |
| Order capture | NONE | No order payload changes |
| Aggregator orders | LOW | Promise.allSettled — POS path unchanged even if aggr fails |
| Existing BUG-250 aggregator skip in REMOVAL loop | NONE | L205 guard still intact |

---

## 4. Files changed

| File | Key changes |
|------|------------|
| `src/api/socket/socketEvents.js` | L14: Infinity |
| `src/api/socket/socketService.js` | L5, L52-61, L90-128, L288-290, L336-343, L348-354 |
| `src/contexts/SocketContext.jsx` | L90-108: heartbeat useEffect |
| `src/hooks/useOrderPollingReconciliation.js` | L27-28, L274-300, L315: dep array |
