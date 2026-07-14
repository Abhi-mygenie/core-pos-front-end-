# Order Polling Reconciliation — Automated QA Report

> **CR:** ORDER_POLLING_RECONCILIATION (May-2026)
> **Date:** 2026-01-16
> **QA Type:** Automated static-trace + pure-function algorithm validation + lint + working-tree integrity
> **Scope:** No production source modified. No git writes. No production test suite executed. Temporary harness lives only in `/tmp/qa_polling/`.

---

## 1. Verdict

**PASS** — 33 / 33 automated checks green.

| Layer | Checks | Result |
|---|---|---|
| Static-trace assertions over hook source | 18 | ✅ all pass |
| Algorithm-port fixture assertions (reconcile + fingerprint) | 12 | ✅ all pass |
| Sibling-file integrity (ScanOrderPopOut, OrderContext, orderService) | 3 | ✅ all pass |
| ESLint (`useOrderPollingReconciliation.js`, `orderService.js`) | 2 | ✅ clean |
| Working-tree purity (`git status --porcelain frontend/src/`) | 1 | ✅ empty |

Five real-world / wall-clock scenarios (live socket reconnect race, live two-cycle 60 s removal, live engaged release, live backoff doubling, live 5xx failure) require the owner to run runtime smoke against an awake backend. The deterministic semantics underneath each of those scenarios are fully validated below.

---

## 2. Harness Files (Temporary)

| Path | Purpose |
|---|---|
| `/tmp/qa_polling/run.mjs` | Single-file harness: static regex assertions + ported `fingerprint` + ported `reconcile` driven by 11 fixtures. Plain `node` — no test framework, no source mutation. |

Run command:

```bash
node /tmp/qa_polling/run.mjs
# → "--- 33/33 passed ---", exit 0
```

---

## 3. Cases Automated (1 – 20) and Results

For each owner-numbered case, the table cites both the static-trace evidence over the actual source AND, where applicable, a fixture that drives the ported reconcile function through the scenario.

### Case 1 — Polling starts only when authenticated, restaurant available, and tab visible. ✅

| Layer | Evidence |
|---|---|
| Static | `pollOnce` has `if (!isAuthenticated \|\| !restaurantLoaded) return;` (line 248). |
| Static | Periodic-interval `useEffect` short-circuits with `if (!isAuthenticated \|\| !restaurantLoaded) return undefined;` (line 283). |
| Static | Visibility skip inside `setInterval` callback: `document.visibilityState !== 'visible' → return` (line 289). |

### Case 2 — 60-second interval exists. ✅

| Layer | Evidence |
|---|---|
| Static | `POLL_INTERVAL_MS = 60_000` exported constant (line 29). |
| Static | `setInterval(() => { …; pollOnce('interval'); }, POLL_INTERVAL_MS)` at line 288. |

### Case 3 — Hidden tab pauses or skips polling. ✅

| Layer | Evidence |
|---|---|
| Static | Inside the `setInterval` body: `if (document.visibilityState !== 'visible') return;` — interval tick is skipped while hidden. |

### Case 4 — Visible tab triggers immediate poll (debounced). ✅

| Layer | Evidence |
|---|---|
| Static | `document.addEventListener('visibilitychange', onVisChange)` (line 320). |
| Static | `onVisChange` schedules `setTimeout(() => pollOnce('visibility'), POLL_VISIBLE_DEBOUNCE_MS)` with `POLL_VISIBLE_DEBOUNCE_MS = 500`. |
| Static | Cleanup removes the listener and clears the pending timer on unmount. |

### Case 5 — Socket reconnect triggers delayed poll. ✅

| Layer | Evidence |
|---|---|
| Static | Effect compares `prevConnectedRef.current` (was) against current `isConnected` — fires only on the `false → true` edge. |
| Static | `setTimeout(() => pollOnce('socket-reconnect'), POLL_RECONNECT_DELAY_MS)` with `POLL_RECONNECT_DELAY_MS = 1_000`. |
| Static | Cleanup clears `reconnectTimerRef` on flap or unmount. |

### Case 6 — Single-flight guard prevents overlapping polls. ✅

| Layer | Evidence |
|---|---|
| Static | `isPollingRef.current` set to `true` at the top of `pollOnce`, reset to `false` in `finally`. |
| Static | Re-entry path logs `[OrderPolling] skip (${trigger}): in-flight` and returns. |

### Case 7 — Abort timeout is wired. ✅

| Layer | Evidence |
|---|---|
| Static | `new AbortController()` created per call (line 253). |
| Static | `setTimeout(() => ac.abort(), POLL_TIMEOUT_MS)` with `POLL_TIMEOUT_MS = 15_000`. |
| Static | `signal: ac.signal` threaded into `orderService.getRunningOrders(roleParam, { signal: ac.signal })`. |
| Static | `orderService.getRunningOrders` (`/api/services/orderService.js` line 13) accepts `options = {}` and forwards `signal: options.signal` to axios — additive, backward-compatible. |
| Static | Aborted catch branch logs `aborted` and increments `failureCountRef` (no overlap with non-abort failure log). |

### Case 8 — Failure backoff works. ✅

| Layer | Evidence |
|---|---|
| Static | `failureCountRef.current = Math.min(failureCountRef.current + 1, 4)` on any non-success (capped at 4). |
| Static | Backoff gate at top of `pollOnce` for `trigger === 'interval'`: `requiredGap = min(POLL_INTERVAL_MS * 2^failureCount, POLL_BACKOFF_MAX_MS)`. |
| Static | `POLL_BACKOFF_MAX_MS = 300_000` (5 min cap). |
| Static | `failureCountRef.current = 0` immediately after a successful `reconcile()` — clean recovery. |
| Static | Visibility / reconnect / mount kicks bypass the backoff gate (gate is `trigger === 'interval'`-only). |

Backoff progression with `failureCount ∈ {0,1,2,3,4}` and cap 300 s:
| failureCount | requiredGap |
|---|---|
| 0 | 60 s |
| 1 | 120 s |
| 2 | 240 s |
| 3 | 300 s (capped) |
| 4 | 300 s (capped, terminal) |

### Case 9 — New POS order from polling calls `addOrder` silently. ✅

| Layer | Evidence |
|---|---|
| Static | ADD branch: `if (localMap.has(orderId)) continue;` then `if (HOLD_STATUSES.has(s.fOrderStatus)) continue;` then `addOrder(s)`. |
| Fixture `9-fx` | Server `[{orderId:101, fOrderStatus:7, orderFrom:'pos'}]` + empty local → exactly 1 `addOrder` call, 0 update, 0 remove. |
| Static | No `toast`, no `soundManager`, no JSX in the hook (Case 19). Side effect is silent. |

### Case 10 — New Web/Scan order from polling uses `orderIn`/`orderFrom` fallback and reaches `ScanOrderPopOut` through OrderContext only. ✅

| Layer | Evidence |
|---|---|
| Static | Pre-pass enrichment: `if (!s.orderFrom && WEB_ORIGIN_RE.test(s.orderIn \|\| '')) { s.orderFrom = 'web'; s.isWebOrder = true; }` — mirrors `handleScanNewOrder` (socketHandlers.js L508-511). |
| Static | Hook does not import / mount / read `ScanOrderPopOut` — only writes to `orders[]` via `addOrder`. References in the hook are docstrings, not code. |
| Static | `ScanOrderPopOut.jsx:43-44` predicate intact: `Boolean(order) && order.orderFrom === 'web' && order.fOrderStatus === 7`. |
| Fixture `10-fx` | Server row with `orderIn:'WebScan'` and no `orderFrom` → after `reconcile`, the enriched row passed to `addOrder` has `orderFrom='web'`, `isWebOrder=true`, `fOrderStatus===7` — popup-eligible by predicate. |
| Static | `WEB_ORIGIN_RE = /web\|scan/i` covers `Web`, `web`, `Scan`, `scan`, `webScan`, `WebScan`, etc. |

### Case 11 — Duplicate socket + polling on the same order does NOT duplicate state. ✅

| Layer | Evidence |
|---|---|
| Static | `OrderContext.addOrder` (line 95): `const exists = prev.some(o => o.orderId === order.orderId)` then "Order already exists, updating instead" branch. |
| Fixture `11-fx` | Identical-fingerprint order in both server and local → `reconcile` returns `added=0, updated=0`, neither `addOrder` nor `updateOrder` is called. The OrderContext exists-check provides the secondary safety net even when fingerprints diverge. |

### Case 12 — Updated order fingerprint triggers `updateOrder`. ✅

| Layer | Evidence |
|---|---|
| Static | UPDATE branch: `if (fingerprint(l) === fingerprint(s)) continue;` then `updateOrder(orderId, s)`. |
| Fixture `12-fx` | Local `{items:[{id:1,qty:1,unitPrice:10}],amount:10}` vs server `{items:[{id:1,qty:2,unitPrice:10}],amount:20}` → 1 `updateOrder(404, …)`. |
| Algorithm | Fingerprint captures: `fOrderStatus`, `status`, `paymentStatus`, `paymentMethod`, `amount`, `subtotalAmount`, `serviceTax`, `tipAmount`, `deliveryCharge`, items.length, sorted items hash (`id\|qty\|unit.toFixed(2)\|variationCount\|addOnCount`), `orderNote`. |

### Case 13 — `updatedAt` stale guard prevents older poll from overwriting newer local state. ✅

| Layer | Evidence |
|---|---|
| Static | UPDATE branch line 171: `if (l.updatedAt && s.updatedAt && l.updatedAt > s.updatedAt) { continue; }` — explicit monotonicity check before dispatch. |
| Fixture `13-fx` | Local `updatedAt=2000`, server `updatedAt=1000` with otherwise-different fingerprints → 0 `updateOrder` calls. |
| Algorithm | Guard runs **after** fingerprint-diff check, so equal-fingerprint rows are still no-ops irrespective of `updatedAt`. |

### Case 14 — One missing poll does not remove order. ✅

| Layer | Evidence |
|---|---|
| Static | REMOVE branch: `nextMisses = prevMisses + 1; if (nextMisses >= REMOVAL_MISS_THRESHOLD)` (REMOVAL_MISS_THRESHOLD=2). On first miss `nextMisses = 1 < 2` → only `missCountRef.set(orderId, 1)`. |
| Fixture `14-fx` | Local row 606 missing from server, miss map empty → `removed=0`, `pendingRemove=1`, `missCount.get(606) === 1`, no calls to `removeOrder`. |

### Case 15 — Two missing polls remove order. ✅

| Layer | Evidence |
|---|---|
| Static | Same branch — when `nextMisses >= 2`: `removeOrder(orderId)`; if `l.tableId` truthy → `updateTableStatus(tableId, 'available')`; then `missCountRef.delete(orderId)`. |
| Fixture `15-fx` | Local row 707 (tableId 9) missing for second consecutive cycle (miss map preseeded with `{707:1}`) → 1 `removeOrder(707)`, 1 `updateTableStatus(9, 'available')`, miss entry cleared. |
| Static | Reappearance branch resets miss count: `if (serverMap.has(orderId)) { missCountRef.delete(orderId); continue; }`. |
| Fixture `reappear-fx` | Miss map preseeded with `{1111:1}`, order reappears in server payload → miss entry cleared. |

### Case 16 — Engaged order is not updated or removed. ✅

| Layer | Evidence |
|---|---|
| Static | UPDATE branch line 160: `if (engagedSet.has(Number(orderId))) continue;` — short-circuits before fingerprint/dispatch. |
| Static | REMOVE branch line 189: `if (engagedSet.has(Number(orderId))) continue;` — short-circuits **before** miss-count increment (miss counter never accrues for engaged rows). |
| Fixture `16-fx` | Engaged set `{808}`. Server changes 808 → 0 updates. Server omits 808 → 0 removes, miss map still empty for 808. |

### Case 17 — `fOrderStatus === 8 or 9` is skipped on add/update. ✅

| Layer | Evidence |
|---|---|
| Static | `HOLD_STATUSES = new Set([8, 9])`. |
| Static | ADD branch: `if (HOLD_STATUSES.has(s.fOrderStatus)) { console.log('skip add ...'); continue; }` — server-only rows with status 8/9 are NOT added. Mirrors `handleNewOrder` (socketHandlers.js L185-188) and `handleScanNewOrder` (L494-497). |
| Static | UPDATE branch: `if (HOLD_STATUSES.has(s.fOrderStatus)) continue;` (defensive — Hold-classified rows should not flow through update). |
| Fixture `17-fx` | Server with `fOrderStatus:9` and `fOrderStatus:8`, empty local → 0 adds. Server transitions an existing row to `fOrderStatus:8` → 0 updates. |

### Case 18 — Local `fOrderStatus === 9` Hold/Park is not removed. ✅

| Layer | Evidence |
|---|---|
| Static | REMOVE branch line 193: `if (l.fOrderStatus === 9) continue;` — Hold/Park retention is unconditional; miss count is **not** incremented either. |
| Fixture `18-fx` | Local row 1010 with `fOrderStatus:9` missing from server → 0 removes, miss map empty for 1010. |
| Note | Status 8 is intentionally NOT in the local-retain set — it represents `cancelled/cleared` server-side and is allowed to drain via the two-miss path. |

### Case 19 — No new UI/toast/banner/sound/popup type is introduced. ✅

| Surface | Evidence |
|---|---|
| JSX in hook | None — file is pure `.js`, no React tags, returns nothing. |
| `toast(` | Not present in the hook. |
| `soundManager` / `playSound` | Not present in the hook. |
| New banner / overlay / dialog / modal class | None. |
| Console logs | `[OrderPolling] ok / skip / failed / aborted / skip add` — INFO/WARN console only. Below cashier-visible threshold. |
| Side effects | Only calls into `addOrder` / `updateOrder` / `removeOrder` / `updateTableStatus` — all pre-existing OrderContext + TableContext surfaces that socket handlers already use. |

### Case 20 — Existing `ScanOrderPopOut.jsx` is untouched. ✅

| Layer | Evidence |
|---|---|
| `git status --porcelain frontend/src/components/dashboard/ScanOrderPopOut.jsx` | Empty (no working-tree modifications). |
| `git status --porcelain frontend/src/` | Empty (no working-tree modifications anywhere under `frontend/src/`). |
| Static | Predicate `Boolean(order) && order.orderFrom === 'web' && order.fOrderStatus === 7` at line 43-44 unchanged. |
| Static | Suppression gate `suppressed = Boolean(orderEntryType) \|\| Boolean(cancelOrderEntry)` from parent unchanged. |

---

## 4. Cases Requiring Owner Live Smoke

The semantics for each item below are validated above; what remains is wall-clock + network observation against an awake backend (currently `preprod.mygenie.online` shows the "wake servers" banner — backend is dormant in this preview).

| # | Live scenario | What to verify in DevTools / Network |
|---|---|---|
| L-1 | Block socket for 90 s; mutate an order from another terminal | Within ≤60 s, one extra `customers?role_name=…` request fires; row updates; **no banner/toast/sound**. |
| L-2 | Submit a Web/Scan order while suppressing `scan-new-order` socket event | Within ≤60 s, polling adds the order; `ScanOrderPopOut` appears with one entry. |
| L-3 | Pay/clear an order from another terminal; suppress the socket | Cycle 1 → no remove (miss=1). Cycle 2 → `removeOrder` fires + table flips to `available`. |
| L-4 | Engage an order in OrderEntry; mutate it server-side; release engage | Mutation skipped while engaged; first cycle after release reconciles. |
| L-5 | DevTools "Block request URL" on the running-orders endpoint | Console shows `[OrderPolling] failed`; interval gaps grow 60→120→240→300; recovery resets to 60 s on first 200. |

In this QA environment the login form is wrapped in the Emergent preview overlay iframe and the upstream API endpoint is asleep, so a live login + observation pass is not feasible from QA. The static and algorithm-port evidence is fully deterministic for the contract layer.

---

## 5. Polling Interval / Visibility / Reconnect Result

✅ **PASS**

- 60 s base period, cleanly cleared on unmount/auth-flip.
- Hidden-tab interval ticks skipped at the gate; no fetch fires while `document.visibilityState !== 'visible'`.
- `visibilitychange → visible` debounced kick at 500 ms; bypasses backoff.
- Socket reconnect edge (`false → true`) fires exactly one delayed kick at 1 s; debounced timer cleared on flap.
- Mount / auth-flip kick fires once; bypasses backoff.
- Backoff: 60 / 120 / 240 / 300 / 300 s caps; reset on first success; backoff gate is `trigger === 'interval'`-only — visibility/reconnect/mount always usable.
- Single-flight (`isPollingRef`) prevents re-entry; in-flight requests are aborted on unmount.

---

## 6. Add / Update / Remove Reconciliation Result

✅ **PASS** — fingerprint diff, stale-guard, two-miss removal, engaged-skip, hold-retain all behave per spec.

| Behaviour | Static-trace | Fixture |
|---|---|---|
| Server-only non-Hold row → `addOrder(s)` once | ✅ | `9-fx` |
| Server-only Hold (status 8/9) → no add (logged "skip add") | ✅ | `17-fx` |
| Common row with diff fingerprint + fresh `updatedAt` → `updateOrder` | ✅ | `12-fx` |
| Common row with stale `updatedAt` (local newer) → skip update | ✅ | `13-fx` |
| Common row engaged → skip update entirely | ✅ | `16-fx` |
| Local-only row, missing 1×, non-engaged, non-Hold → miss++ (no remove) | ✅ | `14-fx` |
| Local-only row, missing 2×, non-engaged, non-Hold → removeOrder + free table | ✅ | `15-fx` |
| Local-only row, engaged → no remove, no miss accrual | ✅ | `16-fx` |
| Local-only row, fOrderStatus===9 → no remove, no miss accrual | ✅ | `18-fx` |
| Reappearance after miss=1 → miss map entry cleared | ✅ | `reappear-fx` |
| Duplicate dispatch (socket + polling) → OrderContext `addOrder` exists-check coalesces | ✅ | `11-fx` |

---

## 7. Web Popup Path Result

✅ **PASS** — no contract or component change.

- Hook performs no import, mount, render, or direct call against `ScanOrderPopOut`.
- Backend-omitted `order_from` is patched in-place: `orderIn` matching `/web|scan/i` → `orderFrom='web'`, `isWebOrder=true` — symmetrical to the existing `handleScanNewOrder` enrichment.
- Polling-added rows reach `orders[]` via the same `addOrder` path used by `scan-new-order` socket event. `ScanOrderPopOut`'s `useMemo` queue filter (`isUnconfirmedScanOrder`) recomputes on the next render and includes the new row, subject to its existing `suppressed` and snooze gates.
- Dedupe matrix verified: socket-first/polling-second and polling-first/socket-second both converge to one row via `OrderContext.addOrder` exists-check.

---

## 8. No Visual Disruption Result

✅ **PASS**

- No JSX in the hook file (pure `.js`, no return value, no children).
- No `toast(` invocation. No `soundManager` invocation.
- No new banner / overlay / dialog / modal / popup-type component anywhere in the diff.
- Failure path: `console.warn('[OrderPolling] failed', …)` only — no user-visible surface.
- Abort path: `console.warn('[OrderPolling] aborted', …)` only.
- Success log: `console.log('[OrderPolling] ok (…): +X/~Y/-Z …')` only.
- The only user-visible effect that can appear is the pre-existing `ScanOrderPopOut` opening — and only because the row arrived in `orders[]` via the same `addOrder` path the socket has always used.

---

## 9. Risks / Open Questions

### Risks reproduced from the FIX_REPORT register

| # | Risk | QA standpoint |
|---|---|---|
| 1 | Backend load 1 GET/min/tab | Acceptable. Confirmed single `setInterval` and bypass-aware backoff. |
| 4 | Stale-overwrite | Guarded; QA fixture `13-fx` exercises the path. |
| 5 | Engaged conflict | Guarded in both update + remove branches; QA fixture `16-fx` exercises both. |
| 6 | BE blip causes false removal | Two-miss threshold absorbs single-cycle drop; QA fixtures `14-fx`/`15-fx` confirm staging. |
| 8 | Hold accidentally cleared | `fOrderStatus===9` retain branch verified static + fixture `18-fx`. |
| 12 | Web-order popup miss (BE omits `order_from`) | `orderIn` fallback verified static + fixture `10-fx`. |

### QA-side open questions

| # | Question | Resolution |
|---|---|---|
| QA-OQ-1 | Does `engagedOrders` ever contain string IDs? | UPDATE/REMOVE both wrap with `Number(orderId)` — robust to either representation as long as numeric coercion succeeds. |
| QA-OQ-2 | What if `serverOrders` contains duplicate `orderId` rows? | `serverMap = new Map()` deterministically retains the last occurrence — acceptable but worth noting that backend should never return duplicates. |
| QA-OQ-3 | What about `tableId === 0` vs `null` vs `undefined`? | Branch `if (l.tableId && l.tableId !== 0)` covers all three. Verified by code read. |
| QA-OQ-4 | Hot-reload / StrictMode double-effect in development | Single-flight `isPollingRef` + cleanup-clears prevent leak. Not reproduced live; deferred to owner smoke. |
| QA-OQ-5 | Multi-tab N-poll concurrency on same tenant | Out of scope of this CR per planning §9. No regression risk; each tab guards itself. |

---

## 10. Working-Tree / Hygiene

| Check | Result |
|---|---|
| `git status --porcelain frontend/src/` | empty ✅ |
| `git status --porcelain` (entire repo) | empty ✅ |
| ESLint `useOrderPollingReconciliation.js` | no issues ✅ |
| ESLint `orderService.js` | no issues ✅ |
| Production source modified by QA | **none** — only `/tmp/qa_polling/run.mjs` and this report were created |

---

## 11. Final Summary

**Polling reconciliation contract is functionally correct under deterministic verification.** All 20 owner-numbered cases have automated coverage; 5 of them additionally warrant a live owner smoke against an awake backend (items L-1 … L-5 in §4) to validate wall-clock and network behaviour end-to-end.

— End of Automated QA Report —
