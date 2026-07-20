# PAYMENT API STORM ANALYSIS — paid-prepaid-order (2026-07-20, incident 21:18–21:21 IST)
**For: next agent / backend team | From: frontend investigation (full POS codebase traced) | Registered: PROD-BUG-004**

## TL;DR
The storm is almost certainly the POS **Auto-Settle feature** — a retry loop in `DashboardPage.jsx` that re-POSTs `paid-prepaid-order` **every ~10 seconds per stuck order, forever, with no backoff and no terminal state**. It fires for EVERY prepaid order at status 5 the moment a device loads its dashboard — which matches your "some POS opened or synced around 9:20 PM" observation exactly. The socket room-scoping rollout is a likely amplifier: devices running the OLD frontend build (no `join_restaurant`) no longer receive the settle-confirmation socket event, so orders never clear locally and the loop retries at full rate.

## 1. The exact frontend code (verbatim behavior, `DashboardPage.jsx:1418–1459`, marker PROD-BUG-001)
```
useEffect(() => {                                        // runs on EVERY `orders` array change
  if (localStorage 'mygenie_auto_settle_enabled' !== 'true') return;
  candidates = orders.filter(o => o.fOrderStatus === 5
                && o.paymentType === 'prepaid'
                && o.paymentMethod !== 'paylater'
                && !inFlight.has(o.orderId));
  candidates.forEach(o => {                              // ← ALL candidates fired AT ONCE, no batching
    inFlight.add(o.orderId);
    completePrepaidOrder(o.orderId, ...)                 // POST /api/v2/vendoremployee/order/paid-prepaid-order
      .finally(() => setTimeout(() => inFlight.delete(o.orderId), 10000));
      // ↑ guard removed after 10s REGARDLESS of success/failure —
      //   comment in code says: "allow retry if socket didn't clear"
  });
}, [orders, ...]);
```
Failure properties: no exponential backoff, no max attempts, no jitter, success is NOT terminal (guard still expires), 4xx/timeout not terminal either. Axios timeout is 60s (`api/axios.js:18`); users navigating/refreshing during slow responses produce your **499s** (client closed before reply).

## 2. Why an order gets "stuck" at fOrderStatus=5 (the loop's fuel)
The order leaves the local `orders` array ONLY via:
- **(a) Socket event** — backend emits `update-order` (f_order_status=6 / status 'paid') on the settle flow; `socketHandlers.js` drops terminal orders (see BUG-PREPAID-SETTLE comment at socketHandlers.js:290-297). **If the device runs the OLD frontend (no join_restaurant) against the NOW room-scoped server, this event NEVER arrives.**
- **(b) 60s poll / reconnect rehydration** — `mergeRunningOrders` fully REPLACES the array with fresh running orders. This clears settled orders only if the backend really settled them and stops returning them.
So: if (a) is dead (old build + room scoping) AND (b) still returns the order at status 5 (settle failed/skipped server-side), the loop retries **6×/min/order indefinitely**.

## 3. Why the numbers fit
- A device opening at ~21:18 with a backlog of N status-5 prepaid orders fires N POSTs instantly, then N every ~10s → your ramp 272 → 1251/min.
- Your Laravel log "Order payment request skipped because another request is processing" for MANY DIFFERENT order IDs in a 20-second window = many orders × concurrent duplicates = exactly this loop's signature (plus possibly 2+ devices of the same restaurant with auto-settle on, settling the same orders → guaranteed lock contention).
- Server healthy (FPM idle, CPU idle) = correct; it's client-generated load, not resource exhaustion.

## 4. ⚠ Check the IP attribution
`172.31.39.21` is an AWS VPC private address. If that's a load balancer / reverse-proxy node, **2,789 requests may be many devices behind one LB IP**, not one client. Attribute via `X-Forwarded-For`, auth token, or `order_id`→restaurant lookup in the request payloads. The order_ids in the storm will tell you exactly which restaurant(s) — and whether their devices run the old (no-join) frontend build.

## 5. Fixes
### Backend (yours — agree with your change, plus)
- ✅ Return `202 processing` immediately when the advisory lock is not acquired (done per your note). Also make the SAME response for "already settled/paid" (idempotency) so duplicate settles are cheap no-ops.
- Consider per-token rate limit on this endpoint (e.g., >60/min → 429) as a permanent circuit breaker against any client bug.

### Frontend (register + gate-flow; NOT yet implemented anywhere)
In the Auto-Settle effect:
1. On **success** → mark orderId terminal locally (never retry it again; let socket/poll confirm removal).
2. On failure → exponential backoff (10s → 30s → 90s), **max 3 attempts** per order, then park with a visible toast ("Auto-settle failed for order #X — settle manually").
3. Treat 4xx and "already paid/processing" (your new 202) responses as terminal.
4. Cap the per-tick burst (e.g., settle max 3 candidates per cycle, queue the rest).
5. Precondition: deploy the CR-077 join fix to ALL production devices — restores the socket removal path that this loop depends on.

### Rollout ordering note
Until the join-enabled frontend is universally deployed, room-scoping makes EVERY socket-dependent cleanup loop (this one, and any similar pattern) degrade into its polling/retry fallback. Audit for other "retry until socket clears" patterns before more incidents; this codebase's known ones: auto-settle (this), socket GET-back retries (fixed 1s, socketHandlers.js:94-112, 380-434 — prior finding F2).

## 6. How to confirm this diagnosis in 5 minutes
1. From the storm window's access logs, pull 3 sample `paid-prepaid-order` request bodies → note `order_id`s.
2. Check those orders' timelines: same order_id POSTed repeatedly ~10s apart from the same token = confirmed.
3. Check that restaurant's frontend build: if it lacks `join_restaurant` emit (old build), amplifier confirmed.
4. Ask the restaurant if "Auto Settle" is enabled (Status Config page, localStorage `mygenie_auto_settle_enabled`).

## Cross-references (this repo)
- Loop: `frontend/src/pages/DashboardPage.jsx:1418-1459` (PROD-BUG-001 marker)
- API fn: `frontend/src/api/services/orderService.js:85-94` (`completePrepaidOrder`)
- Socket removal contract: `frontend/src/api/socket/socketHandlers.js:290-320`
- Poll replacement: `frontend/src/contexts/OrderContext.jsx:48-55` (`mergeRunningOrders`)
- Manual settle buttons (also call same API, but guarded by `isSettling` state): OrderCard.jsx:238-253, TableCard.jsx:243
- Prior socket investigation: INV-SOCKET-001 / CR-077 (rooms + join, QA-passed 2026-07-20)
