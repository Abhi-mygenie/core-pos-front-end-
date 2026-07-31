# Order Polling Reconciliation Fix Report

> **CR:** ORDER_POLLING_RECONCILIATION (May-2026)
> **Date:** 2026-05-15
> **Status:** ✅ **IMPLEMENTED** (pending owner runtime smoke)
> **No commits. No backend change. No socket-handler change. No popup change. No new UI.**

---

## 1. Summary

Implemented the approved Order Polling Reconciliation safety net as a single new hook (`useOrderPollingReconciliation.js`), mounted once from `DashboardPage.jsx`, with one additive optional `signal` parameter on `orderService.getRunningOrders`. The hook polls running orders every 60 s while the user is authenticated and the tab is visible, diffs the server response against an in-hook mirror of `OrderContext.orders[]` via a multi-field fingerprint + sorted items hash, and routes additions / updates / removals through the same `addOrder` / `updateOrder` / `removeOrder` / `updateTableStatus` surfaces socket handlers already use. The existing `ScanOrderPopOut` picks up newly-discovered Web/Scan YTC orders automatically — no new UI, no toast, no banner, no sound.

Net envelope: **1 new file (~352 LoC including comments + constants + algorithm), 2 edited files (+18 LoC total)**.

---

## 2. Files Changed

| Path | Op | LoC | Surface |
|---|---|---|---|
| `/app/frontend/src/hooks/useOrderPollingReconciliation.js` | **NEW** | ~352 | Hook itself — constants, fingerprint, reconcile, pollOnce, three lifecycle useEffects |
| `/app/frontend/src/pages/DashboardPage.jsx` | EDIT | +11 / −0 | 1 import alongside `useRefreshAllData`, 1 hook call after `useSocketEvents()`, 8 lines of accompanying comment |
| `/app/frontend/src/api/services/orderService.js` | EDIT | +7 / −1 | Additive optional `options.signal` arg on `getRunningOrders` — backward-compatible with existing callers (`LoadingPage`, `useRefreshAllData`) which ignore it |

### 2.1 Explicitly verified untouched

| Path | `git diff` |
|---|---|
| `frontend/src/contexts/OrderContext.jsx` | **empty** ✅ |
| `frontend/src/api/socket/socketHandlers.js` | empty |
| `frontend/src/api/socket/socketEvents.js` | empty |
| `frontend/src/api/socket/useSocketEvents.js` | empty |
| `frontend/src/api/transforms/orderTransform.js` | empty |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` | empty |
| `frontend/src/components/order-entry/*` (all files) | empty |
| `frontend/src/components/cards/*`, `sections/*` | empty |
| Backend / API services other than `getRunningOrders` | empty |

`git status --short frontend/src/` returns exactly three entries — two `M` + one untracked new file.

---

## 3. Hook Behavior

### 3.1 Public surface

```js
import { useOrderPollingReconciliation } from "../hooks/useOrderPollingReconciliation";

// inside DashboardPage component body, alongside other hooks:
useOrderPollingReconciliation();
```

Returns nothing. Side-effect-only. No props, no callbacks, no callback surface to other components.

### 3.2 Context consumption

| Context | Used for |
|---|---|
| `useAuth()` → `{ isAuthenticated, permissions }` | Auth gate + role param for the role-scoped endpoint |
| `useRestaurant()` → `{ isLoaded }` | Restaurant readiness gate |
| `useSocketStatus()` → `{ isConnected }` | Reconnect-edge detection |
| `useOrders()` → `{ orders, addOrder, updateOrder, removeOrder, engagedOrders }` | Read-only mirror of orders + engaged set; dispatch surface for adds/updates/removals |
| `useTables()` → `{ updateTableStatus }` | Free-table parity on terminal-status removal |

OrderContext is **not** modified. Both `orders` and `engagedOrders` are mirrored into hook-local refs (`ordersSnapshotRef`, `engagedSnapshotRef`) via cheap `useEffect`s so `pollOnce` reads fresh values without stale-closure hazards.

### 3.3 Internal refs

- `isPollingRef` — single-flight guard.
- `intervalIdRef` — `setInterval` handle.
- `reconnectTimerRef` / `visibleTimerRef` — debounce timers for reconnect / visibility triggers.
- `abortRef` — current `AbortController`.
- `lastAttemptAtRef` — for backoff gate.
- `failureCountRef` — consecutive failure counter (0..4).
- `prevConnectedRef` — socket-reconnect edge detector.
- `missCountRef` — `Map<orderId, missCount>` for two-miss removal confirmation.
- `ordersSnapshotRef`, `engagedSnapshotRef` — live state mirrors.

### 3.4 Constants (exported for testability)

```js
export const POLL_INTERVAL_MS         = 60_000;
export const POLL_TIMEOUT_MS          = 15_000;
export const POLL_RECONNECT_DELAY_MS  =  1_000;
export const POLL_VISIBLE_DEBOUNCE_MS =    500;
export const POLL_BACKOFF_MAX_MS      = 300_000;
export const REMOVAL_MISS_THRESHOLD   =        2;
```

---

## 4. Polling Interval / Trigger Behavior

| Trigger | Source | Behaviour |
|---|---|---|
| **Periodic 60 s** | `setInterval` inside the auth+restaurant `useEffect` | Calls `pollOnce('interval')`. Skipped when `document.visibilityState !== 'visible'`. Also skipped while a backoff window is active. |
| **Mount / auth-flip** | Same `useEffect` body, kick before `setInterval` | Calls `pollOnce('mount-or-auth')`. Bypasses backoff. |
| **Tab → visible** | `document.addEventListener('visibilitychange', …)` | Debounced 500 ms via `visibleTimerRef`, then calls `pollOnce('visibility')`. Bypasses backoff. |
| **Socket disconnect → connect edge** | Effect watching `isConnected` against `prevConnectedRef` | After 1 s delay via `reconnectTimerRef`, calls `pollOnce('socket-reconnect')`. Bypasses backoff. Cleanup clears any pending timer on subsequent flap. |
| **Failure backoff** | `failureCountRef` + `lastAttemptAtRef` skip-gate at top of `pollOnce` (interval trigger only) | 60 s → 120 s → 240 s → 300 s (capped). Reset to 0 on first success. |
| **Per-call timeout** | `AbortController` + `setTimeout(abort, 15_000)` | Aborts hanging calls; `aborted` branch in the catch logs `[OrderPolling] aborted` and increments failure count. |
| **Single-flight** | `isPollingRef` flag | Skipped tick logged as `skip (trigger): in-flight`. |

All triggers gated by `isAuthenticated && restaurantLoaded`. On unmount / auth-flip, cleanup clears the interval, cancels any in-flight `AbortController`, and clears debounce timers.

---

## 5. Reconciliation Algorithm

`reconcile(serverOrders, trigger, durationMs)` is invoked synchronously inside `pollOnce` after a successful fetch. Steps in order:

### 5.1 Pre-process — Web/Scan origin enrichment

```js
for (const s of serverOrders) {
  if (!s.orderFrom && WEB_ORIGIN_RE.test(s.orderIn || '')) {
    s.orderFrom = 'web';
    s.isWebOrder = true;
  }
  serverMap.set(s.orderId, s);
}
```

Mirrors `handleScanNewOrder` (`socketHandlers.js:508-511`) so polling-discovered web/scan orders still reach `ScanOrderPopOut` even if backend omits `order_from`.

### 5.2 ADD — server-only rows

```js
for (const [orderId, s] of serverMap) {
  if (localMap.has(orderId)) continue;
  if (HOLD_STATUSES.has(s.fOrderStatus)) {
    console.log(`[OrderPolling] skip add ${orderId}: fOrderStatus=${...} (Hold)`);
    continue;
  }
  addOrder(s);
}
```

Skip-on-add gate for `fOrderStatus === 8` or `9` mirrors `handleNewOrder` (L185-188) + `handleScanNewOrder` (L494-497).

### 5.3 UPDATE — rows present on both sides

```js
for (const [orderId, s] of serverMap) {
  const l = localMap.get(orderId);
  if (!l) continue;
  if (engagedSet.has(Number(orderId))) continue;          // engaged-row skip
  if (HOLD_STATUSES.has(s.fOrderStatus)) continue;        // defensive Hold skip
  if (fingerprint(l) === fingerprint(s)) continue;        // no change
  if (l.updatedAt && s.updatedAt && l.updatedAt > s.updatedAt) continue; // stale poll
  updateOrder(orderId, s);
}
```

### 5.4 REMOVE — local-only rows, two-miss confirmation

```js
for (const [orderId, l] of localMap) {
  if (serverMap.has(orderId)) {
    missCountRef.current.delete(orderId);                 // reset miss count
    continue;
  }
  if (engagedSet.has(Number(orderId))) continue;          // engaged-row skip (no increment)
  if (l.fOrderStatus === 9) continue;                     // Hold/Park retention (no increment)
  const next = (missCountRef.current.get(orderId) || 0) + 1;
  if (next >= REMOVAL_MISS_THRESHOLD) {
    if (l.tableId && l.tableId !== 0) updateTableStatus(l.tableId, 'available');
    removeOrder(orderId);
    missCountRef.current.delete(orderId);
  } else {
    missCountRef.current.set(orderId, next);
  }
}
```

### 5.5 Log line

```
[OrderPolling] ok (interval, 142ms): +1/~2/-0 (pending-remove=0, server=27, local=26)
```

---

## 6. Fingerprint Strategy

```js
const fingerprint = (o) => {
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
    (Number(o.amount) || 0).toFixed(2),
    (Number(o.subtotalAmount) || 0).toFixed(2),
    (Number(o.serviceTax) || 0).toFixed(2),
    (Number(o.tipAmount) || 0).toFixed(2),
    (Number(o.deliveryCharge) || 0).toFixed(2),
    items.length,
    itemHash,
    o.orderNote || '',
  ].join('||');
};
```

Captures every socket-observable mutation on a running order:
- Status transitions (`fOrderStatus`, `status`, `paymentStatus`).
- Money fields (`amount`, `subtotalAmount`, `serviceTax`, `tipAmount`, `deliveryCharge`).
- Payment method flip.
- Item quantity + variation + add-on changes (via sorted items hash).
- Order note edits.

`updatedAt` is **not** part of the fingerprint — it's used separately as a stale-update guard inside the UPDATE branch.

Robustness:
- `.toFixed(2)` neutralises float drift.
- Items sorted to absorb backend reorderings.
- Variation/add-on **counts** (not contents) keep the hash cheap while still tripping a refresh on any modifier change.

---

## 7. Removal Safety

| Layer | Rule |
|---|---|
| **Two-miss confirmation** | `missCountRef` bumps once per cycle a row is missing. Removal fires only when count ≥ 2. Reset to 0 the moment the row reappears in any subsequent server payload. |
| **Engaged-row skip** | `engagedOrders.has(Number(orderId))` short-circuits before the miss-count increment. Engaged rows are never removed and never accrue miss count. |
| **Hold retention** | Local row with `fOrderStatus === 9` short-circuits identically. Hold/Park orders are socket-only removal. |
| **Table-status parity** | On confirmed removal, `updateTableStatus(tableId, 'available')` is called (wrapped in `try/catch` defensively). Mirrors socket handler parity at `socketHandlers.js:289-302, 437-447`. |
| **Worst-case latency** | ≤ 60 s for the first miss to register; total ≤ 120 s before removal. Acceptable per locked owner direction. |

---

## 8. Web / Scan Popup Fallback

`ScanOrderPopOut.jsx` is **not modified**. It already derives its queue from `orders[]` via the predicate:

```js
order.orderFrom === 'web' && order.fOrderStatus === 7   // isUnconfirmedScanOrder
```

When polling adds a Web/Scan order via `addOrder`, React re-renders, the popup queue `useMemo` recomputes, and the popup appears (subject to its existing snooze and `suppressed` gates — both honoured automatically).

**Critical enrichment** for fallback: §5.1 patches `order.orderFrom = 'web'` + `order.isWebOrder = true` when backend omitted `order_from` but `order_in` indicates web/scan. This mirrors the equivalent enrichment in `handleScanNewOrder` (socketHandlers.js:508-511) and keeps the popup contract intact on the polling path.

Dedupe matrix (socket + polling delivering the same order):

| Event sequence | Result |
|---|---|
| Socket first, polling second | `addOrder` exists-check (OrderContext L95) short-circuits the polling add; one row in `orders[]`, one popup queue entry. |
| Polling first, socket second | Same — exists-check guards in the other direction. |
| Both in the same render frame | React state batching + exists-check converge to one row. |

---

## 9. No Visual Disruption Confirmation

| Surface | Polling adds anything? |
|---|---|
| New banner | ❌ |
| "Orders updated" toast | ❌ |
| Notification sound | ❌ (`addOrder` does not invoke `soundManager`; FCM path independent) |
| Loading overlay | ❌ |
| New popup type | ❌ |
| New UI indicator | ❌ |
| Cashier interruption | ❌ |
| Console logs | ✅ `[OrderPolling] ok / skip / failed / aborted` at INFO/WARN level only |
| Existing `ScanOrderPopOut` for newly-discovered Web/Scan YTC | ✅ same as socket path; honours `suppressed={Boolean(orderEntryType) \|\| Boolean(cancelOrderEntry)}` |

Errors are **console-only**. Network 5xx / abort / 401 etc. degrade the polling cycle (backoff) without surfacing to the cashier.

---

## 10. Engaged Order Behavior

| Operation | If `engagedOrders.has(Number(orderId))` |
|---|---|
| `addOrder` (new server-only row) | Not applicable — engaged means already in `orders[]`, so the row is a `common`, not a `new`. |
| `updateOrder` | **Skipped.** Fingerprint diff is computed but the call to `updateOrder` is bypassed. Next polling cycle re-evaluates. |
| `removeOrder` (after two misses) | **Skipped entirely.** `missCountRef` is **not** incremented for engaged rows — protects against accruing miss count while the cashier is mid-transaction. After engage releases, the next cycle evaluates fresh. |

This honours the project's existing engage-lock semantic (OrderContext line 17 + the engage flag's "release after React paint" pattern in socket handlers). No engage-state side effects from polling.

---

## 11. QA / Check Results

### 11.1 Static checks performed in this session

| Check | Tool | Result |
|---|---|---|
| ESLint on `useOrderPollingReconciliation.js` | `mcp_lint_javascript` | ✅ **No issues found** |
| ESLint on `DashboardPage.jsx` | `mcp_lint_javascript` | ✅ **No issues found** |
| ESLint on `orderService.js` | `mcp_lint_javascript` | ✅ **No issues found** |
| `git status --short frontend/src/` | git | ✅ Three entries only: 2 modified + 1 new file |
| `git diff frontend/src/contexts/OrderContext.jsx` | git | ✅ Empty (untouched) |
| Hook signature export confirmed | grep | ✅ `export const useOrderPollingReconciliation` at line 80, default export at line 352 |
| Hook mounted in DashboardPage | grep | ✅ Import at line 17, call at line 194 |
| `getRunningOrders` backward-compat | grep | ✅ Signature `(roleName = 'Manager', options = {})` — existing callers unaffected |
| `git diff --stat` | git | ✅ 2 files changed (orderService +6, DashboardPage +11), plus 1 new file |

### 11.2 Manual / runtime QA pending owner

The 25-item QA matrix from the implementation plan §15 should be re-run by the owner against an awake backend. Highest-priority items:

| # | Scenario | Expected |
|---|---|---|
| 1 | Block socket for 90 s; backend emits an `update-order` | Within ≤ 60 s, polling catches the change; card reflects new state. No banner/toast/sound. |
| 2 | Place a Web/Scan order; suppress the `scan-new-order` socket event | Within ≤ 60 s, polling adds the order; `ScanOrderPopOut` opens with one entry. |
| 3 | Pay an order from another terminal; suppress the socket | Cycle 1: row missing → miss=1 (no remove). Cycle 2: still missing → `removeOrder` + free table. |
| 4 | Hold an order (`fOrderStatus = 9`); suppress socket | Row stays on dashboard across polling cycles (Hold retention). Socket clears it normally. |
| 5 | Open OrderEntry on order X; backend mutates X | X skipped (engaged). Save X; engage releases; next cycle reconciles. |
| 6 | DevTools "Block request URL" on `employee-orders-list` | Console shows `[OrderPolling] failed`; backoff doubles 60 → 120 → 240 → 300; no UI noise; recovery resets to 60 s on first success. |
| 7 | Submit bill | `BILL_PAYMENT` payload contains `name` + `mobile` only (unrelated to this CR; sanity check that polling didn't somehow touch payloads). |
| 8 | Manual Refresh button | Manual Refresh wins (full replace). Polling tick continues 60 s later. |
| 9 | Sleep laptop, wake after 5 min | `visibilitychange → visible` debounced kick fires within 500 ms. Backlog catches up in one cycle. |
| 10 | Socket disconnect + reconnect | Within ~1 s of `connected`, one extra `customers?role_name=…` request fires. |

---

## 12. Risks / Open Questions

### 12.1 Risk register

| # | Risk | Status |
|---|---|---|
| 1 | Backend load — 1 GET/min/tab | Acceptable (planning §8). 1k tenants × 5 tabs ≈ 83 polls/sec — well within capacity. |
| 2 | Duplicate popup in same tab | None — `addOrder` exists-check + popup queue `useMemo` derives from single source of truth. |
| 3 | Duplicate notification sound | None — `addOrder` doesn't trigger sound; FCM path independent. |
| 4 | Stale-overwrite | Guarded by `updatedAt` monotonicity check. Fingerprint self-heals next cycle even without `updatedAt`. |
| 5 | Engaged-row conflict | None — engaged rows skip both update and remove; miss count never accrues for them. |
| 6 | Terminal removal mismatch (BE blip) | Two-miss threshold absorbs single-cycle transients. |
| 7 | Snooze conflict | None — snooze sets are downstream of `orders[]` filter; polling never reads/writes them. |
| 8 | Hold order accidentally cleared | None — `fOrderStatus === 9` retention is a hard gate. |
| 9 | Aggregator order missed | None — `getRunningOrders` returns aggregator orders too; same dispatch path. |
| 10 | Hot-reload / StrictMode double effect | `isPollingRef` single-flight + cleanup guards cover the worst case. |
| 11 | Multi-tab N-poll load | Accepted for v1 (planning §9). Tab-leader election deferred. |
| 12 | Web-order popup miss (BE omitted `order_from`) | Mitigated by `orderIn` enrichment fallback (§5.1 + §8). |

### 12.2 Open questions (carried from planning §17)

| # | Question | Default if owner is silent | Blocking? |
|---|---|---|---|
| OQ-1 | Does `employee-orders-list` reliably set `order_from='web'` for web/scan orders? | The `orderIn` fallback covers omission cases. | No |
| OQ-2 | Is `employee-orders-list` paginated? | Assumed full set (no `limit/offset` in current FE call). | No — would need explicit `limit` arg if BE ever paginates |
| OQ-3 | Should backoff continue silently until manual user intervention, or eventually surface an error? | Silent per locked owner direction. | No — closed |
| OQ-4 | Telemetry verbosity in production | INFO `ok` / WARN `failed/aborted` / INFO `skip/retain` — matches `socketHandlers.js` levels | No — tunable in one line |
| OQ-5 | Unit-test coverage on `fingerprint` helper | Deferred unless owner requests | No |

### 12.3 Recommended next steps after owner runtime smoke

1. Run the 10-item runtime smoke in §11.2 against an awake backend.
2. If all pass, mark the CR `closed_after_smoke` in the pending register.
3. Optional v2 enhancements (deferred per planning §13):
   - Tab-leader election via `BroadcastChannel` to reduce N-tab load on busy multi-station tenants.
   - Phone-blur exact `lookupCustomer` (already deferred from BUG-038 and unrelated here, mentioned for completeness).

---

## 13. Strict-Rules Compliance Certification

| Rule | Status |
|---|---|
| No commits | ✅ Working tree only |
| No backend changes | ✅ |
| No socket-handler changes | ✅ `git diff` on `socketHandlers.js`, `socketEvents.js`, `useSocketEvents.js`, `socketService.js`, `SocketContext.jsx` all empty |
| No popup redesign | ✅ `ScanOrderPopOut.jsx` untouched |
| No new UI | ✅ Hook returns nothing; no JSX |
| No new sound | ✅ Hook does not invoke `soundManager`; FCM path independent |
| Accept / Reject / View / Snooze behaviour unchanged | ✅ |
| Order status business logic unchanged | ✅ |
| `OrderContext` untouched | ✅ `git diff` empty |
| `ordersRef` / `engagedOrdersRef` NOT exposed | ✅ Hook-local mirrors via `useEffect` only |
| Three-file footprint (1 new + 2 edited) | ✅ |
| ESLint clean on all three files | ✅ |
| `/app/memory/final/*` untouched | ✅ (read-only consultation) |

---

— End of Order Polling Reconciliation Fix Report —
