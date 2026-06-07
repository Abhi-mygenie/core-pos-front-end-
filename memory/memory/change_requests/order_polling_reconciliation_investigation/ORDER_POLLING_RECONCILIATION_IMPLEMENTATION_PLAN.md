# Order Polling Reconciliation Implementation Plan

> **Mode:** Implementation planning only. No code change, no commit, no refactor.
> **Date:** 2026-05-15
> **Predecessors (all read before drafting):**
> - `ORDER_POLLING_RECONCILIATION_INVESTIGATION.md` (same folder)
> - `ORDER_POLLING_RECONCILIATION_SCRUTINY_AND_FIX_PLAN.md` (same folder)
> - `/app/memory/final/*` (all 7 baseline docs)
> - `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
> - `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
> - `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md`
> - `/app/memory/change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
> - `/app/memory/change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`

---

## 1. Summary

This document converts the locked owner direction + scrutiny findings into a **concrete, code-shaped implementation plan**. The plan ships in two files only — one new hook and a one-line wiring change in `DashboardPage.jsx` — and **does not touch `OrderContext`**, the socket layer, transforms, the popup, or the backend.

Polling runs silently in the background while authenticated + tab visible, calls the existing `getRunningOrders` endpoint every 60 s, diffs the result against in-memory state via a multi-field fingerprint + per-item hash, and routes additions / updates / removals through the same `OrderContext.addOrder` / `updateOrder` / `removeOrder` surface socket handlers already use. The existing `ScanOrderPopOut` picks up new web YTC orders automatically — no new popup code, no new sound path, no new UI surface.

Estimated envelope: **~240 LoC new + 3 lines edited**, all frontend.

---

## 2. Baseline Docs Read

| Doc | Purpose for this plan |
|---|---|
| `ARCHITECTURE_DECISIONS_FINAL.md` | Confirmed the socket-primary / polling-as-safety-net direction, SM-05 (OrderContext owns runtime state), API-02 (preserve transform-mediated payload shaping), SM-07 (table status derived from order events). |
| `CHANGE_REQUEST_PLAYBOOK.md` | CR scoping conventions, file-touch budget rules. |
| `FINAL_DOCS_APPROVAL_STATUS.md` | Confirmed no overlapping in-flight CR conflicts on the running-dashboard reconciliation surface. |
| `FINAL_DOCS_SUMMARY.md` | High-level cross-doc index. |
| `IMPLEMENTATION_AGENT_RULES.md` | Console-logging conventions (LOG-01), no-emoji rule, transform reuse mandate. |
| `MODULE_DECISIONS_FINAL.md` | OrderContext public-surface contract; engage lock semantics. |
| `OPEN_QUESTIONS_FINAL_RESOLUTION.md` | Confirmed POS2-005 + BUG-042-C skip-on-add gate (`fOrderStatus === 8 \|\| 9`). |
| `BASELINE_RECONCILIATION_REPORT_2026_05_04.md` | Role-name wire fix (`permissions?.[0]`) baseline. |
| `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | Closed items confirmation. |
| `PENDING_TASK_REGISTER_2026_05_04.md` | Polling CR sits in pending-work bucket — no conflict with other in-flight items. |
| `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` | Priority sequencing — polling is independent of CR-009 / Bean Me Up. |
| `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` | Running-orders endpoint shape unaffected by FE-only reconciliation. |
| `ORDER_POLLING_RECONCILIATION_INVESTIGATION.md` | Original hook proposal — directionally valid. |
| `ORDER_POLLING_RECONCILIATION_SCRUTINY_AND_FIX_PLAN.md` | Five corrections layered onto the original investigation. **This plan implements those corrections.** |

### Code inspected (truth source for this plan)

- `/app/frontend/src/contexts/OrderContext.jsx` — `useOrders`, `addOrder`, `updateOrder`, `removeOrder`, `engagedOrders` Set, `isOrderEngaged`
- `/app/frontend/src/contexts/AuthContext.jsx` — `useAuth`, `isAuthenticated`, `permissions`
- `/app/frontend/src/contexts/TableContext.jsx` — `useTables`, `updateTableStatus`
- `/app/frontend/src/contexts/SocketContext.jsx` — `useSocketStatus`, `isConnected`
- `/app/frontend/src/contexts/RestaurantContext.jsx` — `useRestaurant`, `restaurant?.id`
- `/app/frontend/src/api/services/orderService.js` — `getRunningOrders(roleName)`
- `/app/frontend/src/api/transforms/orderTransform.js` — `fromAPI.order` output shape (lines 182–280)
- `/app/frontend/src/api/socket/socketHandlers.js` — terminal-status parity, skip-on-add gate, `handleScanNewOrder` enrichment
- `/app/frontend/src/api/socket/useSocketEvents.js` — exposes `{ isConnected, restaurantId }`
- `/app/frontend/src/components/dashboard/ScanOrderPopOut.jsx` — popup predicate + reactive derivation from `orders[]`
- `/app/frontend/src/hooks/useRefreshAllData.js` — pattern reference for `permissions?.[0] || 'Manager'`
- `/app/frontend/src/pages/DashboardPage.jsx` — L155–200 (context-consumer band, where hook mount lands)

---

## 3. Owner Decisions Applied

| # | Decision | Implementation |
|---|---|---|
| 1 | Polling silent / background-only | All side effects route through `addOrder` / `updateOrder` / `removeOrder` |
| 2 | No new UI / banner / toast / sound / overlay / popup type | Hook returns nothing; emits console logs only |
| 3 | Only visible exception: existing `ScanOrderPopOut` for new pending Web/Scan orders | Polling-added web YTC orders flow into `orders[]`; popup picks them up via existing predicate |
| 4 | 60 s interval while authenticated + tab visible | `POLL_INTERVAL_MS = 60_000`; auth + visibility gate |
| 5 | Pause when tab hidden | `visibilitychange → hidden` clears interval |
| 6 | Immediate poll on tab visible | `visibilitychange → visible` triggers `pollOnce` (500 ms debounce) |
| 7 | Immediate poll ~1 s after socket reconnect | `useEffect` watching `isConnected` edge schedules `setTimeout(pollOnce, 1000)` |
| 8 | Single-flight guard | `isPollingRef = useRef(false)` |
| 9 | 15 s timeout | `AbortController` + `setTimeout(abort, 15_000)` |
| 10 | Exponential failure backoff to 5 min | `60_000 → 120_000 → 240_000 → 300_000`; reset on success |
| 11 | Continue polling while OrderEntry open | No special handling; rely on engaged-row skip |
| 12 | Engaged-row skip, not full pause | Read `isOrderEngaged(orderId)` per row before update/remove |
| 13 | Two consecutive missing polls before removal | `missCountRef = new Map<orderId, count>`; remove on count ≥ 2 |
| 14 | Never remove local `fOrderStatus === 9` via polling | Hard gate in remove branch |
| 15 | `updatedAt` only as stale-update guard | After fingerprint differs, additionally skip if `local.updatedAt > server.updatedAt` |
| 16 | Stronger fingerprint from scrutiny | See §9 |
| 17 | `orderIn` fallback to mark recovered Web/Scan orders | `if (!order.orderFrom && /web\|scan/i.test(order.orderIn \|\| '')) { order.orderFrom = 'web'; order.isWebOrder = true; }` for **new** orders only |
| 18 | Orders-only scope | Only `orderService.getRunningOrders` is called; no table/menu/category traffic |

---

## 4. Exact Files To Change

| # | Path | Op | Net LoC change | Reason |
|---|---|---|---|---|
| 1 | `/app/frontend/src/hooks/useOrderPollingReconciliation.js` | **NEW** | ~240 | The polling hook itself |
| 2 | `/app/frontend/src/pages/DashboardPage.jsx` | **EDIT** | +3 (one import, one hook call, one blank line) | Mount the polling hook on the POS-active screen |

**OrderContext is NOT edited.** Detailed rationale in §6. The hook will mirror live `orders` and `engagedOrders` via local refs inside its own scope — same pattern OrderContext itself uses internally (`ordersRef.current`, `engagedOrdersRef.current`). Cost: ~6 extra LoC inside the hook for the mirror useEffects. Benefit: zero contract change to a hotspot context. **Trade is worth it.**

**No other files touched.** Specifically untouched:
- `socketHandlers.js`, `socketEvents.js`, `useSocketEvents.js`, `socketService.js`, `SocketContext.jsx`
- `orderService.js`, `orderTransform.js`
- `ScanOrderPopOut.jsx`
- All `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `OrderCard.jsx`, station / channel components
- All print / KOT / bill / room / split files
- Backend
- `.env`, `requirements.txt`, `package.json`

---

## 5. Hook Design

### 5.1 File header (matches existing project convention — see `useRefreshAllData.js`)

```js
// useOrderPollingReconciliation — Order Polling Reconciliation Hook
// CR: ORDER_POLLING_RECONCILIATION (May-2026)
// Scope: silent background reconciliation against employee-orders-list every 60 s.
// Socket remains primary; this hook is a safety net for missed-event drift.
//
// Anti-rules (locked owner direction):
//   - NO new UI / banner / toast / sound / overlay / popup type
//   - Only visible side-effect: existing ScanOrderPopOut for newly discovered
//     Web/Scan YTC orders (purely derived from OrderContext.orders[])
//   - Routes through addOrder/updateOrder/removeOrder ONLY
//   - Skips engaged orders; never removes fOrderStatus === 9 (Hold/Park)
//   - Two consecutive missing polls required before removal
//
// See:
//   /app/memory/change_requests/order_polling_reconciliation_investigation/
//     ORDER_POLLING_RECONCILIATION_SCRUTINY_AND_FIX_PLAN.md
```

### 5.2 Imports

```js
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import { useTables } from '../contexts/TableContext';
import { useRestaurant } from '../contexts/RestaurantContext';
import { useSocketStatus } from '../contexts/SocketContext';
import * as orderService from '../api/services/orderService';
```

Notes:
- `useSocketStatus` is the named convenience export from `SocketContext.jsx:224`. It returns `{ isConnected, isReconnecting, hasError, status, reconnectAttempts }`. We use only `isConnected`.
- `useRestaurant` provides `isLoaded` (and `restaurant.id` indirectly via the restaurant object). For the auth/restaurant gate we use `isAuthenticated && isLoaded`.
- `orderService.getRunningOrders(roleName)` is already wired with the transform pipeline (`fromAPI.orderList` → `fromAPI.order`). The hook does NOT call `fromAPI.order` directly — it consumes the transformed result.

### 5.3 Constants block (top-of-file, exported for tests if owner wants unit coverage later)

```js
export const POLL_INTERVAL_MS         = 60_000;    // base 60 s cycle
export const POLL_TIMEOUT_MS          = 15_000;    // per-call abort
export const POLL_RECONNECT_DELAY_MS  =  1_000;    // 1 s after socket reconnect
export const POLL_VISIBLE_DEBOUNCE_MS =    500;    // visibility-flip debounce
export const POLL_BACKOFF_MAX_MS      = 300_000;   // 5 min cap
export const REMOVAL_MISS_THRESHOLD   =        2;  // two consecutive misses

// Skip-on-add gate (mirrors handleNewOrder L185-188 and handleScanNewOrder L494-497).
const HOLD_STATUSES = new Set([8, 9]);
const WEB_ORIGIN_RE = /web|scan/i;
```

### 5.4 Hook signature

```js
export const useOrderPollingReconciliation = () => {
  // ... refs, gates, pollOnce, lifecycle wiring ...
  // returns nothing (side-effect-only)
};
```

### 5.5 Internal refs

```js
const isPollingRef     = useRef(false);            // single-flight guard
const intervalIdRef    = useRef(null);             // current setInterval handle
const reconnectTimerRef = useRef(null);            // reconnect debounce timer
const visibleTimerRef  = useRef(null);             // visibility debounce timer
const abortRef         = useRef(null);             // active AbortController
const missCountRef     = useRef(new Map());        // Map<orderId, missCount>
const failureCountRef  = useRef(0);                // consecutive failures
const prevConnectedRef = useRef(false);            // socket-reconnect edge detect
const ordersSnapshotRef = useRef([]);              // live orders mirror (stale-closure shield)
const engagedSnapshotRef = useRef(new Set());      // live engagedOrders mirror
```

### 5.6 Context consumption

```js
const { isAuthenticated, permissions } = useAuth();
const { isLoaded: restaurantLoaded } = useRestaurant();
const { isConnected } = useSocketStatus();
const { orders, addOrder, updateOrder, removeOrder, engagedOrders } = useOrders();
const { updateTableStatus } = useTables();
```

`engagedOrders` is the public Set state from OrderContext (line 17). We re-mirror it into `engagedSnapshotRef` so `pollOnce` reads a non-stale snapshot regardless of when it was defined.

---

## 6. OrderContext Exposure Decision

**Decision: do NOT edit OrderContext.**

Rationale:
- The hook needs fresh reads of `orders` and `engagedOrders` inside `pollOnce`. React's closure model means a `useCallback`-wrapped `pollOnce` captures the values at definition time, not call time.
- Solution **inside the hook**: mirror both values into refs via cheap `useEffect`s:

```js
useEffect(() => { ordersSnapshotRef.current = orders; }, [orders]);
useEffect(() => { engagedSnapshotRef.current = engagedOrders; }, [engagedOrders]);
```

  These run synchronously after React commits. By the time the next `setInterval` tick fires (≥ 60 s later), the refs are up to date.
- Cost: ~3 extra LoC. Benefit: zero change to a load-bearing context surface. **Equivalent functional behaviour** to exposing `ordersRef` / `engagedOrdersRef` from OrderContext.
- Existing consumers of `useOrders()` are unaffected — `engagedOrders` is already in the value object (line 352).

**No additive surface needed.** Keep OrderContext untouched.

---

## 7. Poll Lifecycle Plan

### 7.1 Effect 1 — mirror live state to refs (always on)

```js
useEffect(() => { ordersSnapshotRef.current = orders; }, [orders]);
useEffect(() => { engagedSnapshotRef.current = engagedOrders; }, [engagedOrders]);
```

### 7.2 Effect 2 — periodic interval (gated)

```js
useEffect(() => {
  // Gate: authenticated + restaurant loaded + tab visible
  if (!isAuthenticated || !restaurantLoaded) return;
  if (document.visibilityState !== 'visible') return;

  // Kick once immediately on (re)mount under valid gates.
  pollOnce('mount-or-resume');

  intervalIdRef.current = setInterval(() => {
    pollOnce('interval');
  }, currentIntervalMs());                          // current backoff-aware interval

  return () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    // Abort any in-flight call on unmount/gate-flip.
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isAuthenticated, restaurantLoaded, document.visibilityState]);
```

Note: `document.visibilityState` is not a React state — we trigger this effect's re-evaluation via the visibility listener in Effect 3 by calling a state-bumping setter, OR by managing it inside the visibility effect directly. **Cleaner: keep all visibility handling in Effect 3 and have Effect 2 depend only on `isAuthenticated, restaurantLoaded`**, with the visibility check inside the interval callback:

```js
// Revised Effect 2 — periodic interval (auth+restaurant gated only)
useEffect(() => {
  if (!isAuthenticated || !restaurantLoaded) return;

  pollOnce('mount-or-auth');

  intervalIdRef.current = setInterval(() => {
    if (document.visibilityState !== 'visible') return; // skip hidden ticks
    pollOnce('interval');
  }, POLL_INTERVAL_MS);  // backoff handled by skipping inside pollOnce (see §10)

  return () => {
    if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    intervalIdRef.current = null;
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isAuthenticated, restaurantLoaded]);
```

### 7.3 Effect 3 — visibility listener (kick on `→ visible`)

```js
useEffect(() => {
  const onVisChange = () => {
    if (document.visibilityState !== 'visible') return;
    // Debounce burst tab-switching.
    if (visibleTimerRef.current) clearTimeout(visibleTimerRef.current);
    visibleTimerRef.current = setTimeout(() => {
      pollOnce('visibility');
      visibleTimerRef.current = null;
    }, POLL_VISIBLE_DEBOUNCE_MS);
  };
  document.addEventListener('visibilitychange', onVisChange);
  return () => {
    document.removeEventListener('visibilitychange', onVisChange);
    if (visibleTimerRef.current) {
      clearTimeout(visibleTimerRef.current);
      visibleTimerRef.current = null;
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

### 7.4 Effect 4 — socket-reconnect edge kick

```js
useEffect(() => {
  const wasConnected = prevConnectedRef.current;
  prevConnectedRef.current = isConnected;

  if (!wasConnected && isConnected && isAuthenticated && restaurantLoaded) {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      pollOnce('socket-reconnect');
      reconnectTimerRef.current = null;
    }, POLL_RECONNECT_DELAY_MS);
  }

  return () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isConnected, isAuthenticated, restaurantLoaded]);
```

### 7.5 Single-flight + timeout inside `pollOnce`

```js
const pollOnce = useCallback(async (trigger) => {
  if (isPollingRef.current) {
    console.log(`[OrderPolling] skip (${trigger}): in-flight`);
    return;
  }
  if (!isAuthenticated || !restaurantLoaded) return;

  isPollingRef.current = true;
  const ac = new AbortController();
  abortRef.current = ac;
  const timeoutHandle = setTimeout(() => ac.abort(), POLL_TIMEOUT_MS);

  const t0 = Date.now();
  try {
    const roleParam = permissions?.[0] || 'Manager';
    const serverOrders = await orderService.getRunningOrders(roleParam, { signal: ac.signal });
    // ↑ Note: orderService.getRunningOrders does NOT currently accept a signal.
    //   We will pass it via the existing api.get options; orderService is a one-line
    //   pass-through (line 13). Two implementation choices:
    //     (a) Add optional `signal` arg to getRunningOrders (~1 LoC change in
    //         orderService.js). Strictly additive, no breaking change.
    //     (b) Skip the AbortController + rely on the natural HTTP timeout
    //         configured in api/axios.js for the request. Simpler; no service
    //         change.
    //   DECISION: choice (a). The 1 extra LoC in orderService is worth the
    //   explicit timeout behaviour. Listed as a sub-item in §4.
    reconcile(serverOrders, trigger, Date.now() - t0);
    failureCountRef.current = 0;
  } catch (err) {
    if (ac.signal.aborted) {
      console.warn(`[OrderPolling] aborted (${trigger}, ${POLL_TIMEOUT_MS}ms)`);
    } else {
      console.warn(`[OrderPolling] failed (${trigger})`, err?.message || err);
    }
    failureCountRef.current = Math.min(failureCountRef.current + 1, 4);
  } finally {
    clearTimeout(timeoutHandle);
    isPollingRef.current = false;
    abortRef.current = null;
  }
}, [isAuthenticated, restaurantLoaded, permissions]);
```

The `currentIntervalMs()` helper used in Effect 2 returns:

```js
const currentIntervalMs = () => Math.min(
  POLL_INTERVAL_MS * Math.pow(2, failureCountRef.current),
  POLL_BACKOFF_MAX_MS
);
```

However, because `setInterval` is fixed at creation, the simpler implementation is to keep the 60 s interval and have `pollOnce` itself **skip ticks** when `failureCountRef.current > 0` based on a last-attempt timestamp. **Final implementation choice** (cleaner, no rebuilds): a tiny `lastAttemptAtRef` + a skip check at top of `pollOnce`:

```js
const lastAttemptAtRef = useRef(0);

// inside pollOnce, before single-flight check:
const requiredGap = Math.min(POLL_INTERVAL_MS * Math.pow(2, failureCountRef.current), POLL_BACKOFF_MAX_MS);
if (trigger === 'interval' && Date.now() - lastAttemptAtRef.current < requiredGap) {
  return;  // backoff active, skip this tick
}
lastAttemptAtRef.current = Date.now();
```

Triggers `'visibility'`, `'socket-reconnect'`, `'mount-or-auth'` bypass the backoff gate intentionally — those are user-perceived recovery events.

### 7.6 Cleanup matrix

| Trigger | What gets cleared |
|---|---|
| Hook unmount | Interval, visibility listener, reconnect listener, in-flight abort, debounce timers |
| Auth flip → false | Interval cleared via Effect 2 cleanup; in-flight abort |
| Restaurant unload | Same as auth flip |
| Tab hidden | Interval tick skipped via `document.visibilityState` check (no clear needed) |
| Backoff active | Tick skipped via `lastAttemptAtRef` check |

---

## 8. Reconciliation Algorithm

`reconcile(serverOrders, trigger, durationMs)` is a pure function (no `await`) called inside `pollOnce` after a successful fetch.

```text
function reconcile(serverOrders, trigger, durationMs):
  // Snapshot live state via refs (closure-safe).
  const localOrders   = ordersSnapshotRef.current || []
  const engagedSet    = engagedSnapshotRef.current || new Set()

  // Build O(1) lookup maps.
  const serverMap = new Map<orderId, transformedOrder>()
  for (s in serverOrders):
    // Defensive enrichment for missing-but-recoverable web origin.
    if (!s.orderFrom and WEB_ORIGIN_RE.test(s.orderIn || '')):
      s.orderFrom  = 'web'
      s.isWebOrder = true
    serverMap.set(s.orderId, s)

  const localMap = new Map<orderId, localOrder>()
  for (l in localOrders):
    localMap.set(l.orderId, l)

  // ── ADD: new orders ────────────────────────────────────────────
  let added = 0
  for ([orderId, s] of serverMap):
    if (localMap.has(orderId)) continue                    // not new
    if (HOLD_STATUSES.has(s.fOrderStatus)) {                // skip-on-add gate
      console.log(`[OrderPolling] skip add ${orderId}: fOrderStatus=${s.fOrderStatus}`)
      continue
    }
    addOrder(s)
    added++

  // ── UPDATE: orders present on both sides with fingerprint diff ──
  let updated = 0
  for ([orderId, s] of serverMap):
    const l = localMap.get(orderId)
    if (!l) continue                                       // already handled in ADD
    if (engagedSet.has(Number(orderId))) {                 // engaged-row skip
      console.log(`[OrderPolling] skip update ${orderId}: engaged`)
      continue
    }
    if (HOLD_STATUSES.has(s.fOrderStatus)) {               // defensive: server returning Hold somehow
      console.log(`[OrderPolling] skip update ${orderId}: fOrderStatus=${s.fOrderStatus} (Hold)`)
      continue
    }
    const fpLocal  = fingerprint(l)
    const fpServer = fingerprint(s)
    if (fpLocal === fpServer) continue                     // no change
    if (l.updatedAt and s.updatedAt and l.updatedAt > s.updatedAt) {
      console.log(`[OrderPolling] skip update ${orderId}: stale poll (local newer)`)
      continue
    }
    updateOrder(orderId, s)
    updated++

  // ── REMOVE: local rows not in server payload ──────────────────
  let removed = 0
  let pendingRemove = 0
  for ([orderId, l] of localMap):
    if (serverMap.has(orderId)) {
      // present — reset miss count
      if (missCountRef.current.has(orderId)) missCountRef.current.delete(orderId)
      continue
    }
    if (engagedSet.has(Number(orderId))) {                 // engaged-row skip
      console.log(`[OrderPolling] skip remove ${orderId}: engaged`)
      continue                                             // do NOT increment miss count
    }
    if (l.fOrderStatus === 9) {                            // Hold/Park retention
      console.log(`[OrderPolling] retain ${orderId}: fOrderStatus=9 (Hold/Park)`)
      continue                                             // do NOT increment miss count
    }
    const prevMisses = missCountRef.current.get(orderId) || 0
    const nextMisses = prevMisses + 1
    if (nextMisses >= REMOVAL_MISS_THRESHOLD):
      // Confirmed terminal-or-orphan after 2 consecutive missing polls.
      // Free table if dine-in.
      if (l.tableId && l.tableId !== 0):
        updateTableStatus(l.tableId, 'available')
      removeOrder(orderId)
      missCountRef.current.delete(orderId)
      removed++
    else:
      missCountRef.current.set(orderId, nextMisses)
      pendingRemove++

  console.log(`[OrderPolling] ok (${trigger}, ${durationMs}ms): +${added}/~${updated}/-${removed} (pending-remove=${pendingRemove})`)
```

### 8.1 Key behaviours derived directly from this pseudocode

| Behaviour | Code path |
|---|---|
| Idempotent add (no duplicates) | `OrderContext.addOrder` line 95 `exists` short-circuit |
| Web-popup recovery for missed `scan-new-order` | `orderFrom` enrichment in the ADD/UPDATE preprocessing loop |
| Skip Hold on add | `HOLD_STATUSES.has(s.fOrderStatus)` |
| Skip update for engaged | `engagedSet.has(Number(orderId))` |
| Stale-overwrite guard | `l.updatedAt > s.updatedAt` |
| Two-miss removal | `missCountRef` + `REMOVAL_MISS_THRESHOLD` |
| Hold retention | `l.fOrderStatus === 9` short-circuit |
| Engaged retention | engaged short-circuit before miss bump |
| Table freed on terminal removal | `updateTableStatus(tableId, 'available')` |
| Reset miss count on reappearance | `missCountRef.delete(orderId)` when found |

---

## 9. Fingerprint Function

```js
const fingerprint = (o) => {
  if (!o) return '';
  const items = Array.isArray(o.items) ? o.items : [];
  const itemHash = items
    .map((it) => {
      const id   = it?.id ?? it?.foodId ?? '';
      const qty  = Number(it?.qty ?? it?.quantity) || 0;
      const unit = Number(it?.unitPrice ?? it?.price) || 0;
      const vCt  = Array.isArray(it?.variation) ? it.variation.length : 0;
      const aCt  = Array.isArray(it?.addOns) ? it.addOns.length : 0;
      return `${id}|${qty}|${unit.toFixed(2)}|${vCt}|${aCt}`;
    })
    .sort()
    .join(';');

  return [
    o.fOrderStatus ?? '',
    o.status ?? '',
    o.paymentStatus ?? '',
    o.paymentMethod ?? '',
    (Number(o.amount)          || 0).toFixed(2),
    (Number(o.subtotalAmount)  || 0).toFixed(2),
    (Number(o.serviceTax)      || 0).toFixed(2),
    (Number(o.tipAmount)       || 0).toFixed(2),
    (Number(o.deliveryCharge)  || 0).toFixed(2),
    items.length,
    itemHash,
    o.orderNote || '',
  ].join('||');
};
```

Captures (confirmed):
- `fOrderStatus` ✅
- `status` ✅
- `paymentStatus` ✅
- `paymentMethod` ✅
- `amount` ✅
- `subtotalAmount` ✅
- `serviceTax` ✅
- `tipAmount` ✅
- `deliveryCharge` ✅
- `items.length` ✅
- Item hash (id|qty|unitPrice|variation.length|addOn.length, sorted) ✅
- `orderNote` ✅

Properties:
- Stable under item-reorder at backend (sorted).
- Robust to float drift (toFixed(2)).
- O(N) per order on items.
- Does **not** include `updatedAt` — `updatedAt` is a separate stale-update guard, not a fingerprint input.
- Does **not** include `createdAt`, `tableId`, `customer`, `phone` — irrelevant to socket-observable mutations on running orders.

---

## 10. Web Popup / Snooze Path

**Polling never invokes popup code directly.** The reasoning:

1. `ScanOrderPopOut` (DashboardPage.jsx:1426-1435) is fully derived from `orders` prop via `isUnconfirmedScanOrder` predicate (`ScanOrderPopOut.jsx:43-44`: `order.orderFrom === 'web' && order.fOrderStatus === 7`).
2. The popup's queue is a `useMemo` over `orders` (`ScanOrderPopOut.jsx:174-184`). Any React state change to `orders[]` triggers a re-render and queue recompute.
3. Polling calls `addOrder(s)` → `setOrdersState` → React re-render → `ScanOrderPopOut` re-renders → predicate matches new web YTC order → popup opens (or appends to the queue).

**Duplicate-popup-in-same-tab guarantee:**

| Race | Mitigation |
|---|---|
| Socket `scan-new-order` arrives at T=0; polling tick at T=58 s sees the same order | `addOrder` exists-check (OrderContext L95) skips duplicate add |
| Both events arrive within 1 ms | React state batching + exists-check still yields a single row |
| Popup re-renders on update | Queue useMemo recomputes; same orderId; same popup entry |

**Snooze preservation:**

- `snoozedOrders` Set (DashboardPage.jsx:417) — keyed by `String(orderId)`. Polling never reads or writes it.
- Popout-local `popOutSnoozeHideSet` Map (ScanOrderPopOut.jsx:160) — 5-min hide, auto-clear. Polling never touches it.
- Both are filters applied **downstream** of `orders[]`. Polling-added orders flow into `orders[]` but a still-snoozed order is excluded from the queue until snooze expires.

**`suppressed` prop preservation:**

DashboardPage.jsx:1434 — `suppressed={Boolean(orderEntryType) || Boolean(cancelOrderEntry)}`. While OrderEntry or cancel-modal is open, the popup renders nothing (`ScanOrderPopOut.jsx:297` early-returns). Polling-added web YTC orders sit silently in `orders[]` until the cashier closes the modal, at which point the popup naturally appears. **No cashier interruption.**

**No new sound path:**

- `ScanOrderPopOut.jsx` header (L22-26): explicit "NO soundManager import. NO NotificationContext import."
- Sound today comes from FCM push, not `OrderContext` mutations.
- Polling routes through `addOrder` / `updateOrder` / `removeOrder` only. None of those triggers a sound.

---

## 11. No Visual Disruption Guarantee

| Surface | Polling effect |
|---|---|
| Refresh banner | None (not rendered by hook) |
| "Orders updated" toast | None |
| Notification sound | None |
| Loading overlay | None |
| New popup type | None |
| New UI indicator | None |
| Cashier-facing interruption | None |
| Console logs | Yes — `[OrderPolling] ok/skip/failed/aborted/retain` at INFO/WARN level. Visible only in DevTools console. |
| Existing `ScanOrderPopOut` for newly discovered web YTC | Yes — identical to socket-driven path |

**Error handling is console-only.**

```js
catch (err) {
  if (ac.signal.aborted) console.warn(`[OrderPolling] aborted (${trigger}, ${POLL_TIMEOUT_MS}ms)`);
  else console.warn(`[OrderPolling] failed (${trigger})`, err?.message || err);
  failureCountRef.current = Math.min(failureCountRef.current + 1, 4);
}
```

No `toast(...)`, no `setBanner(...)`, no `useNotification(...)`. Network failures degrade the polling cycle (backoff) but never surface to the user.

---

## 12. Removal / Table Status Plan

**`updateTableStatus` source:** `useTables()` from `/app/frontend/src/contexts/TableContext.jsx` (line 94 — `updateTableStatus` definition; line 262 — `useTables` hook export). Same source DashboardPage.jsx:180 already consumes.

**Removal sequence (after two consecutive misses):**

```js
if (l.tableId && l.tableId !== 0) {
  updateTableStatus(l.tableId, 'available');
}
removeOrder(l.orderId);
missCountRef.current.delete(l.orderId);
```

Order of operations matches socket parity (socketHandlers.js:298-303): table-status free → `removeOrder`. The reverse order also works (both are independent context mutations), but matching socket order keeps behavioural parity.

**Skipped removals:**

| Condition | Action |
|---|---|
| `engagedOrders.has(orderId)` | Skip entirely. **Do NOT increment miss count.** |
| `localRow.fOrderStatus === 9` | Skip entirely. **Do NOT increment miss count.** Hold-clear is socket-only. |

**Why no-increment for engaged/Hold:** if backend transiently dropped a Hold order from the running list (or an engaged order is briefly omitted for some race), incrementing miss count would eventually remove it after two missed cycles — defeating the retention guard. By short-circuiting before the increment, we ensure that a row in either of these states is **never removed by polling** regardless of how many cycles pass.

**`fOrderStatus === 9` retention** is explicit per owner decision 14. Mirrors the live behaviour: `handleUpdateOrderStatus` (L437-446) and `handleOrderDataEvent` (L289-302) do remove status-9 orders **only on specific socket channel arrivals** — polling has no such channel context, so it must not remove.

---

## 13. Backoff / Timeout Constants

```js
export const POLL_INTERVAL_MS         = 60_000;
export const POLL_TIMEOUT_MS          = 15_000;
export const POLL_RECONNECT_DELAY_MS  =  1_000;
export const POLL_VISIBLE_DEBOUNCE_MS =    500;
export const POLL_BACKOFF_MAX_MS      = 300_000;
export const REMOVAL_MISS_THRESHOLD   =        2;
```

**Backoff sequence on consecutive failures:**

| failureCount | Required gap |
|---|---|
| 0 | 60 000 ms (1 min)  |
| 1 | 120 000 ms (2 min) |
| 2 | 240 000 ms (4 min) |
| 3 | 300 000 ms (5 min, capped) |
| 4+ | 300 000 ms (5 min, capped) |

Reset to 0 on the first successful fetch.

**Visibility-resume and socket-reconnect kicks bypass the backoff gate.** They are user-perceived recovery events and should always attempt at least once.

---

## 14. Regression Risks

| # | Risk | Mitigation | Residual |
|---|---|---|---|
| 1 | Duplicate popup in same tab | `OrderContext.addOrder` exists-check; popup `useMemo` over `orders[]` | None |
| 2 | Duplicate popup across tabs | Already today's behaviour with socket; not a polling regression | Accepted |
| 3 | Duplicate sound | `addOrder` does not invoke `soundManager`; FCM path independent | None |
| 4 | Backend load | 1 GET / min / tab; visibility-pause; single-flight; backoff | Low |
| 5 | Stale overwrite | `updatedAt` monotonicity guard + fingerprint self-heal next cycle | Negligible |
| 6 | Active OrderEntry conflict | Engaged-row skip for update + remove | None |
| 7 | Terminal-removal mismatch (BE blip) | Two-miss threshold | Adds ≤ 60 s removal latency |
| 8 | Snooze conflict | Snooze sets downstream of `orders[]`; polling never touches them | None |
| 9 | Status-jump / dashboard-movement interaction | Same `updateOrder` surface as socket | None |
| 10 | Multi-tab load | 1 GET / min / tab acceptable for v1 | Defer leader election to v2 |
| 11 | Missed Web order popup (BE returned without `order_from='web'`) | `orderIn` enrichment fallback (`/web\|scan/i`) | Negligible |
| 12 | Hold order accidentally cleared | Hard skip on `fOrderStatus === 9` | None |
| 13 | Aggregator order missed | Same endpoint returns aggregator orders; same dispatch path | None |
| 14 | Hot-reload / StrictMode double effect | `isPollingRef` single-flight + cleanup | None |
| 15 | Polling interval drift due to backoff | `lastAttemptAtRef` gate at `pollOnce` entry; backoff transparent | None |
| 16 | Abort signal not plumbed through orderService | Plan adds optional `signal` arg (additive 1 LoC) OR falls back to natural axios timeout | None — decision made in §5.5 |

---

## 15. QA Checklist

### 15.1 Static checks (pre-merge)

- `yarn lint` — zero new ESLint errors / warnings.
- `yarn build` — zero CRACO build errors.
- DevTools Network panel — confirm only `GET /pos/employee-orders-list?role_name=...` fires periodically; no new endpoints.
- DevTools React DevTools — confirm `OrderProvider` value reference does not change on poll (refs-only mirror).

### 15.2 Manual QA scenarios

| # | Scenario | Pass criterion |
|---|---|---|
| 1 | Socket-working normal new order | Order appears once. No duplicate. |
| 2 | Block socket events for 90 s; backend emits an `update-order` | Within ≤ 60 s, polling catches the change; `updateOrder` fires; card reflects new state. No banner/toast/sound. |
| 3 | Block socket; new POS order placed via cashier on another terminal | Within ≤ 60 s, polling adds the new POS-origin order silently. No popup (POS origin, not web). |
| 4 | Block socket; new web/QR order placed | Within ≤ 60 s, polling adds the order; existing `ScanOrderPopOut` opens. Single popup. |
| 5 | Socket + polling deliver same web order | `addOrder` short-circuits; popup queue shows one entry. |
| 6 | Edit item quantity from another terminal; socket dropped | Within ≤ 60 s, fingerprint differs; `updateOrder` fires; cart-line + amount update. |
| 7 | Pay an order from another terminal; socket dropped | Cycle 1: row missing → miss=1 (no remove). Cycle 2: still missing → `removeOrder` + free table. |
| 8 | Snooze a web YTC order; force polling to re-add (it stays in `orders[]`) | Snoozed order excluded from popup queue. No re-pop until snooze expires. |
| 9 | Force BE 500 on `getRunningOrders` | `console.warn` only. Backoff sequence visible (60 → 120 → 240 → 300). No user-facing error. |
| 10 | Sleep laptop 5 min, wake | Visibility-resume kick fires within 500 ms; backlog catches up in one cycle. |
| 11 | Open OrderEntry on order X; status change on order Y via another terminal | Y updated silently. X (engaged) skipped while OrderEntry open. Save X; engage releases; X reconciles next cycle. |
| 12 | Manual Refresh during polling | Manual Refresh wins (full replace via `useRefreshAllData`). Polling timer continues; next tick is 60 s later. |
| 13 | Tab hidden then visible after 5 min | Hidden ticks no-op; visible kick fires; one full reconciliation pass. |
| 14 | Socket disconnect + reconnect | Within ~1 s of `connected`, one extra `getRunningOrders` fires. Subsequent periodic cycles continue. |
| 15 | Stale overwrite test (long-running poll arrives after fresh socket) | `updatedAt` monotonicity guard skips stale write. |
| 16 | High-frequency new web orders (5 in 30 s) via polling-only | All 5 added; popup shows "Order 1 of 5" with Next/Prev. |
| 17 | Aggregator (Zomato/Swiggy) order via polling-only | Added via `addOrder`; channel chip + dashboard column reflect aggregator origin. |
| 18 | Force `pollOnce` latency > 60 s | Next 60 s tick skipped (log: `skip (interval): in-flight`). |
| 19 | Non-order surfaces untouched | Tables / Categories / Products / Popular / Cancellation Reasons not refetched by polling. Only manual Refresh covers them. |
| 20 | Hold order retention | Place order; tap Hold (`fOrderStatus=9`); poll cycles continue. Row stays on dashboard. Socket clears it normally. |
| 21 | Fingerprint catches variation/add-on edit at same price | Within ≤ 60 s, fingerprint diff fires; `updateOrder` lands. |
| 22 | Web-order enrichment fallback | Backend returns row with `order_in='scan'` and `order_from=null`. Polling sets `orderFrom='web'`; popup opens. |
| 23 | BE returns empty list once (transient) | All rows missing on cycle 1; miss=1 across the board. Cycle 2 returns normal list; miss counts reset; **no orders removed**. |
| 24 | No new UI / toast / banner / sound audit | DOM inspection: no new banner element. Audio devices silent. |

### 15.3 Test files

- **No automated test file added in this CR** unless owner asks for unit coverage on the `fingerprint` helper. If requested, the export `fingerprint` makes it trivially testable in isolation.

---

## 16. Final Implementation Scope

### 16.1 Net change inventory

| File | LoC | Operation |
|---|---|---|
| `/app/frontend/src/hooks/useOrderPollingReconciliation.js` | ~240 new | NEW |
| `/app/frontend/src/pages/DashboardPage.jsx` | +3 | EDIT (1 import + 1 call + 1 blank) |
| `/app/frontend/src/api/services/orderService.js` | +1 | EDIT (optional `signal` arg on `getRunningOrders`, strictly additive) |

**Total: 2 new files (1 implementation + 0 tests), 2 edited files, ~245 net LoC.**

### 16.2 Hook mount location

**File:** `/app/frontend/src/pages/DashboardPage.jsx`
**Exact insertion point:** after line 183 (`const { isConnected: socketConnected } = useSocketEvents();`), before line 185 comment "Redirect to loading if data not loaded".

Edit shape (3 net lines):

```jsx
  const { isConnected: socketConnected } = useSocketEvents();

+ // CR ORDER_POLLING_RECONCILIATION (May-2026): silent background safety net.
+ // See /app/memory/change_requests/order_polling_reconciliation_investigation/
+ useOrderPollingReconciliation();

  // Redirect to loading if data not loaded (auth check handled by ProtectedRoute — T-07)
```

Plus the new import alongside the existing `useRefreshAllData` import:

```jsx
import { useRefreshAllData } from "../hooks/useRefreshAllData";
+ import { useOrderPollingReconciliation } from "../hooks/useOrderPollingReconciliation";
```

### 16.3 Hard guarantees (locked owner direction)

✅ No backend change.
✅ No socket handler change.
✅ No transform change.
✅ No popup redesign.
✅ No new UI surface.
✅ No new sound path.
✅ No new endpoint.
✅ Accept / Reject / View / Snooze behaviour unchanged.
✅ Order status business logic unchanged.
✅ `/app/memory/final/*` untouched (read-only consultation).

### 16.4 Implementation order (when owner approves)

1. Open `/app/frontend/src/hooks/useOrderPollingReconciliation.js` — create file with constants, hook scaffolding, refs, mirror useEffects, `pollOnce`, `reconcile`, `fingerprint`, lifecycle useEffects.
2. Open `/app/frontend/src/api/services/orderService.js` — add optional `signal` arg threaded into `api.get` options.
3. Open `/app/frontend/src/pages/DashboardPage.jsx` — add the import + hook call at the documented position.
4. `yarn lint` — zero new errors.
5. `yarn build` — zero new errors.
6. Run the 24-item QA checklist (§15.2).

### 16.5 Rollback plan

Removing the hook call from `DashboardPage.jsx` (one line) fully disables the feature. The new hook file can stay on disk untouched (zero side-effect when not mounted). Rollback is instant and surgical.

---

## 17. Open Questions

These do NOT block implementation. Safe FE defaults are in place for all of them. Documented for owner visibility.

| # | Question | Default if owner is silent | Status |
|---|---|---|---|
| OQ-1 | Does `employee-orders-list` reliably set `order_from='web'` for web/scan orders today? | The `orderIn` fallback (`/web\|scan/i`) covers the case where backend omits `order_from`. No FE blocker. | Wire-trace recommended during the QA cycle; owner-side ~5-min DevTools task. |
| OQ-2 | Is `employee-orders-list` paginated? Static read shows no `limit/offset` params. | Assume full set. If backend ever paginates, polling will need an explicit `limit=999`-style guard. | Confirm with backend owner before first ship; defensive guard easy to add later. |
| OQ-3 | Should backoff continue (5-min cap) until manual user intervention, or eventually surface an error indicator? | **No error indicator.** Locked owner direction is silent reconciliation. Log to console; do not affect UI. | Owner-confirmed via decision #2 — closed. |
| OQ-4 | Telemetry verbosity in production | Default to INFO `ok`, WARN `failed/aborted`, INFO `skip/retain`. Same volume as existing `socketHandlers.js` logging. | Tunable in one line if owner wants quieter logs. |
| OQ-5 | Test coverage scope — unit-test `fingerprint` helper? | Defer. If owner requests, `fingerprint` is exported and trivially unit-testable. | Optional. |

---

— End of Order Polling Reconciliation Implementation Plan —
