# STANDALONE HANDOVER — PROD-BUG-004 Payment API Storm — Continue Investigation
**Date:** 2026-07-20 | **Next role:** INVESTIGATION (confirm hypothesis in production logs) → then PLANNING/IMPLEMENTATION of the FE fix
**This document is SELF-CONTAINED — no other files needed.** Supersedes v1 analysis (which wrongly blamed the socket-room rollout; production has NO rooms).

---

## 1. THE INCIDENT (owner + backend-agent evidence, PRODUCTION environment)
- 21:18–21:21 IST: request storm on `POST /api/v2/vendoremployee/order/paid-prepaid-order`.
- Volume: 20:xx = 187 req (normal baseline) → 21:xx = 1,206 + 284 with **HTTP 499** (client closed before reply). Per-minute: 21:17=272, 21:18=292, **21:19=1,251**, 21:20=684, 21:21=310.
- Top source: internal IP `172.31.39.21` = 2,789 req (⚠ AWS VPC private range — likely LB/proxy hop, NOT one client; attribute via X-Forwarded-For / auth token / order_ids in bodies).
- Laravel logged hundreds of `Order payment request skipped because another request is processing` for MANY different order IDs, 21:20:46–21:21:06.
- Server healthy throughout: PHP-FPM 0 active/374 idle, CPU 96% idle, RAM 23Gi free → pure client-generated load.
- Backend agent's hotfix (deployed): when advisory lock not acquired → return `202 processing` immediately instead of continuing payment work.

## 2. ROOT CAUSE (traced in POS frontend code — HIGH confidence, needs one log confirmation)
**The Auto-Settle feature** (`frontend/src/pages/DashboardPage.jsx:1418-1459`, code marker PROD-BUG-001; toggle = localStorage key `mygenie_auto_settle_enabled`, set from Status Config page).

Actual code behavior (verbatim logic):
```js
useEffect(() => {                     // re-runs on EVERY `orders` array change
  if (!autoSettleOn) return;
  const candidates = orders.filter(o => o.fOrderStatus === 5
      && o.paymentType === 'prepaid' && o.paymentMethod !== 'paylater'
      && !inFlight.has(o.orderId));
  candidates.forEach(o => {           // ← ALL candidates fired AT ONCE (no batching)
    inFlight.add(o.orderId);
    completePrepaidOrder(o.orderId,...)   // POST paid-prepaid-order (orderService.js:85-94)
      .finally(() => setTimeout(() => inFlight.delete(o.orderId), 10000));
      // ← guard removed after 10s REGARDLESS of success/failure.
      //   Code comment: "allow retry if socket didn't clear"
  });
}, [orders, ...]);
```
**Owner's mental model ("calls API once when order is placed") is wrong:** real behavior = "call every 10 seconds until the order leaves the local list."

### The storm formula
**(large backlog of unsettled status-5 prepaid orders) × (fire-all-at-once burst when a device opens the dashboard ~21:18) × (blind 10s retry, no backoff, success not terminal).**
Self-worsening: burst → backend advisory-lock contention on same orders → slow responses → clients cancel at timeout/navigation (**the 499s**; axios timeout is 60s, `api/axios.js:18`) → FE never registers success → next 10s tick re-fires.

### Order-removal paths (why orders stayed "stuck" locally)
- Path A — socket: backend emits `update-order` (f_order_status=6 / status 'paid'); `socketHandlers.js:290-320` drops terminal orders. Production = global broadcast (no rooms), so path works but is **least reliable at peak** (legacy fleet-wide broadcast flood, INV-SOCKET-001 → disconnects/missed events at busy hours).
- Path B — 60s poll: `mergeRunningOrders` (`OrderContext.jsx:48-55`) fully replaces the list; clears an order only if backend really settled it. Lock-skipped settles come back at status 5 → refuel.

### The math (fits perfectly)
| Time | req/min observed | implied stuck orders (÷6 retries/min) |
|---|---|---|
| 21:19 | 1,251 | ~208 |
| 21:20 | 684 | ~114 |
| 21:21 | 310 | ~52 |
Classic backlog-drain decay. ≈2,789 requests to settle ~200 orders ≈ **14 calls/order instead of 1**.

## 3. WHAT THE NEXT SESSION MUST DO

### Step 1 — CONFIRM in production logs (the one missing proof)
Definitive fingerprint: **the same `order_id` POSTed repeatedly ~10 seconds apart from the same auth token.** Nothing else in the codebase produces that spacing.
1. Pull 3–5 sample request bodies from the storm window → note order_ids (bodies are JSON: `{order_id, payment_status:'paid'|'sucess', service_tax, tip_amount}`).
2. Grep access log for ONE order_id across 21:18–21:21 → count occurrences + timestamp deltas (expect ~10s spacing).
3. Attribute the client: X-Forwarded-For behind `172.31.39.21`, or map order_ids → restaurant. Then ask that restaurant: was a POS opened ~21:18? Is "Auto Settle" toggled on (Status Config page)?
4. Check whether those orders EXISTED at status 5 long before 21:18 (backlog theory) vs created at 21:18 (would need a different explanation).
If fingerprint confirmed → root cause CONFIRMED-HIGH, go to Step 2. If NOT (i.e., each order_id appears once) → the storm is order-VOLUME driven, investigate what created ~2,700 distinct settle-eligible orders (bulk sync job? aggregator import?) — that would be a different bug.

### Step 2 — FE fix (register/plan via gate flow; risk HIGH: payment flow, R6 financial)
Target: the auto-settle effect only, `DashboardPage.jsx:1418-1459`. Spec:
- FE-1: success = terminal (keep orderId in a settledSet; never re-fire; socket/poll confirms removal)
- FE-2: failure → exponential backoff 10s→30s→90s, MAX 3 attempts, then park + toast "Auto-settle failed for order #X — settle manually"
- FE-3: treat 4xx AND the backend's new `202 processing` as terminal (no retry)
- FE-4: burst cap — settle max ~3 candidates per cycle, queue the rest (this alone would have prevented the incident)
- Sequencing note: when production adopts socket rooms (CR-077), the join-enabled FE must ship FIRST or path A dies and this loop storms at full rate.
Manual settle buttons (`OrderCard.jsx:238-253` handleSettlePrepaid, `TableCard.jsx:243`) are guarded by `isSettling` state — NOT the storm source, do not touch.

### Step 3 — backend asks (hand to backend team)
- BE-1 ✅ done: 202 on lock-skip without continuing payment work — verify behavior under concurrent load.
- BE-2: idempotency — "already settled/paid" → same cheap 202/200 no-op (makes duplicate settles free).
- BE-3: per-token rate limit on this endpoint (e.g., >60/min → 429) — permanent circuit breaker while old builds exist in the field (auto-settle is per-device localStorage; cannot be disabled remotely).

## 4. STATE OF THE WIDER SOCKET WORKSTREAM (context, do not mix up)
- Preprod socket server (presocket.mygenie.online): rooms + `join_restaurant` handler deployed & QA-verified (CR-077, 5/5 PASS). React FE with join implemented on branch (deployed at core-pos-preview-10 preview), verified E2E incl. reconnect re-join.
- **PRODUCTION: still OLD everything** — old socket server (global broadcast, leak + peak-flood live) AND old frontend (no join). Safe-state rule: never deploy room-scoping to the production socket server before the join-enabled FE reaches all production devices; violating the order kills all realtime fleet-wide.
- Flutter app uses the same socket architecture → same join migration needed (guide exists: FLUTTER_SOCKET_MIGRATION_GUIDE, same contract: emit `join_restaurant {restaurant_id}` on every connect, ack `joined_restaurant {room}`).
- Known related anti-pattern instances ("retry until socket clears"): this auto-settle loop; socket GET-back retries fixed-1s (`socketHandlers.js:94-112, 380-434`); synchronized 60s fleet poll.

## 5. KEY FACTS / GOTCHAS FOR THE NEXT AGENT
- Registered: PROD-BUG-004 (P0/CRITICAL) in `/app/memory/control/registry.json`; related PROD-BUG-001 (the auto-settle feature itself), CR-077, INV-SOCKET-001.
- Test creds (preprod only): owner@cafe103.com / rid 644, Manager@hogwarts.com / rid 618 — password from owner (not printed per security rule). PRODUCTION credentials/log access must come from owner/backend team.
- PayLater quirk: payload uses `payment_status:'sucess'` (backend typo, PAY-007 baseline) — do NOT "fix" the spelling; PayLater orders are excluded from auto-settle anyway.
- fOrderStatus map relevant here: 5 = settle-eligible; 6 = paid/terminal; 9 = Hold/PayLater (overloaded, see socketHandlers.js comments).
- HTML incident report (v2, production-accurate): `frontend/public/__dev/docs/PROD-BUG-004_PAYMENT_STORM_REPORT.html` (served at `<preview-url>/__dev/docs/PROD-BUG-004_PAYMENT_STORM_REPORT.html`).
- v1 markdown analysis (`memory/handover/PAYMENT_STORM_ANALYSIS_PROD-BUG-004_2026-07-20.md`) contains the outdated room-amplifier claim in its §3 — THIS document supersedes it.
