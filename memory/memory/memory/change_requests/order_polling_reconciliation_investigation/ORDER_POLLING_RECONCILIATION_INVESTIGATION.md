# Order Polling Reconciliation Investigation

> **Mode:** Investigation and reliability analysis only. No code changes, no commits, no refactor.
> **Date:** 2026-05-15
> **Trigger:** POS state can drift from backend when socket events are missed (drop, sleep, reconnect). Owner wants a polling-based safety-net reconciliation that keeps socket as primary and supports the New-Web-Order popup path.

---

## 1. Summary

POS currently relies **exclusively** on socket pushes to keep `OrderContext.orders` in sync with the backend. There is **no polling**, **no periodic reconciliation**, and **no socket-reconnect-driven full refetch** today. The only "catch-up" path is the manual `RefreshCw` button in the dashboard header (`DashboardPage.jsx:482-495 handleRefreshAll`), which is blocked while OrderEntry is open. Anything between two manual refreshes that the socket misses — a missed `new-order`, a missed `update-order-paid`, a missed `scan-new-order` — stays drifted on screen until the cashier presses Refresh.

**Good news for the polling design:** the existing surfaces are already polling-friendly. `OrderContext` exposes idempotent `addOrder` / `updateOrder` / `removeOrder` actions that **dedupe by `orderId`** (line 95: *"Check if order already exists (prevent duplicates)"*). The New-Web-Order popup is **fully derived** from `orders` state via a single predicate (`isUnconfirmedScanOrder = orderFrom === 'web' && fOrderStatus === 7` — `ScanOrderPopOut.jsx:43-44`); it has no separate "trigger popup" action. So **anything that lands a fresh web YTC row into `OrderContext.orders` automatically pops the modal**, no matter whether the source is socket or polling — and there's no double-popup risk because both paths funnel through the same dedupe.

**Recommendation:** add a small, conservative polling hook (`useOrderPollingReconciliation`) that calls `getRunningOrders(roleParam)` every **60 seconds** when the tab is visible and the user is authenticated, diffs the result against `ordersRef.current`, and dispatches existing `addOrder` / `updateOrder` / `removeOrder` actions. Pause polling while any OrderEntry / payment / cancel modal is open OR while a per-order engage flag is set, to avoid clobbering in-flight cashier edits. Also trigger an immediate one-shot poll on socket-reconnect and on `visibilitychange → visible`. Single new file (the hook), one short wiring in `DashboardPage.jsx`. No backend change, no popup redesign, no socket changes.

---

## 2. Current Socket Event Flow

`/app/frontend/src/api/socket/socketEvents.js` declares **10 order-related events** routed through three restaurant-scoped channels:

| Channel | Event name | Handler | Action on `orders` |
|---|---|---|---|
| `new_order_${restaurantId}` | `new-order` | `handleNewOrder` (socketHandlers.js L146) | `addOrder(transformedOrder)` |
| `new_order_${restaurantId}` | `update-order` | `handleUpdateOrder` (L212-307) | `updateOrder()` OR `removeOrder()` if terminal status |
| `new_order_${restaurantId}` | `update-order-target` | `handleUpdateOrder` | same as above (table-switch case) |
| `new_order_${restaurantId}` | `update-order-source` | `handleUpdateOrder` | same |
| `new_order_${restaurantId}` | `update-order-paid` | `handleUpdateOrder` | typically `removeOrder()` |
| `new_order_${restaurantId}` | `update-food-status` | `handleUpdateFoodStatus` (L344-380) | `updateOrder()` |
| `new_order_${restaurantId}` | `update-order-status` | `handleUpdateOrderStatus` (L402-460) | `updateOrder()` or `removeOrder()` if cancelled/paid |
| `new_order_${restaurantId}` | `scan-new-order` | `handleScanNewOrder` (L470-518) | `addOrder()` — **forces `orderFrom='web'` if BE returned wrong** |
| `new_order_${restaurantId}` | `delivery-assign-order` | `handleDeliveryAssignOrder` (L525-545) | `updateOrder()` |
| `new_order_${restaurantId}` | `split-order` | `handleSplitOrder` (L640-670) | `updateOrder()` |
| `update_table_${restaurantId}` | `update-table` | `handleUpdateTable` (L551) | table status only (NOT orders) |
| `order-engage_${restaurantId}` | `order-engage` | (separate path) | `setOrderEngaged()` |
| `aggregator_order_${restaurantId}` | `aggrigator-order`, `aggrigator-order-update` | aggregator route (Phase 3B) | `addOrder` / `updateOrder` |

Mapping owner's questions →

| Owner's question | Event(s) involved |
|---|---|
| new order | `new-order`, `scan-new-order`, `aggrigator-order` |
| web order | `scan-new-order` (primarily); also `new-order` when BE marks `order_from = 'web'` |
| order edited | `update-order`, `update-order-target`, `update-order-source`, `split-order`, `update-item-status` |
| status update | `update-food-status`, `update-order-status` |
| payment update | `update-order-paid`, `update-order-status` (when transitioning to paid) |
| cancellation / rejection | `update-order-status` (with cancelled `f_order_status`), `update-order-source`, `update-order-paid` |

**Routing:** `useSocketEvents.js` subscribes to the three channels, calls `parseMessage`, and dispatches to the matching handler from `HANDLER_MAP` (socketHandlers.js L693-705). Every handler either uses the inline payload (`EVENTS_WITH_PAYLOAD`) or calls `fetchSingleOrderForSocket(orderId)` (`EVENTS_REQUIRING_ORDER_API`) before mutating `OrderContext`.

**Reconnect behaviour:** `socketService` auto-reconnects (`RECONNECTION_ATTEMPTS: 10`, exponential backoff to 30 s). `SocketContext.jsx` also reconnects on `visibilitychange → visible` (L72-87) and `online` (L93-113). **However**, on reconnect there is **NO full refetch of orders** — any events emitted by the backend during the disconnect window are lost forever.

---

## 3. Current Manual Refresh / API Flow

| Trigger | Code | What it does |
|---|---|---|
| Header `Refresh` button | `DashboardPage.jsx:482-495 handleRefreshAll` → `useRefreshAllData()` | Re-fetches: Tables → (Categories ‖ Products ‖ Popular) → **Orders**, then `setOrders(fresh)` (full replace). |
| LoadingPage boot | `LoadingPage.jsx loadRunningOrders` → `orderService.getRunningOrders(roleParam)` | Initial population only. |

**API endpoint** (the same one polling will hit):

- `GET /api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager`
- Service: `orderService.getRunningOrders(roleName)` (`orderService.js:13-18`).
- Transform: `fromAPI.orderList(orders)` → returns array of transformed order objects with **stable camelCase fields** (the same shape every other consumer uses).
- The role param defaults to `'Manager'`; current calls use `permissions?.[0] || 'Manager'`.

**Guard rails on manual refresh:**

- Blocked while `orderEntryType !== null` (`DashboardPage.jsx:485`). i.e., you cannot manually refresh while editing an order. This prevents the "full replace" from clobbering an in-flight edit.
- Clears `cartsByTable` saved-cart state on each refresh.

---

## 4. Current Order State Storage

Single source of truth: `OrderContext` (`/app/frontend/src/contexts/OrderContext.jsx`).

| Surface | Description |
|---|---|
| `orders` (state) | Unified flat array of every running order — dine-in, walk-in, takeaway, delivery, **rooms** (L9-10 explicit comment: *"Single unified array — includes all orders"*). |
| `ordersRef.current` | Live mirror, used by `waitForOrderRemoval` / `waitForOrderReady` / `waitForOrderEngaged` (and what polling will diff against). Updated atomically in every mutator (L24, 104, 130, 151). |
| `engagedOrders` (Set) + `engagedOrdersRef` | Per-order "I'm locked, mid-update" flag. Set by `setOrderEngaged(orderId, true|false)`. Used to block concurrent socket updates from racing a cashier's mutation. |
| `addOrder(order)` | **Idempotent** — checks `prev.some(o => o.orderId === order.orderId)` and updates in place if it already exists (L95). |
| `updateOrder(orderId, updatedOrder)` | If not found, appends; else replaces by `orderId`. |
| `removeOrder(orderId)` | Filters out by `orderId` (normalises to Number). |
| `refreshOrders(roleName)` | Convenience wrapper: `getRunningOrders` → `setOrdersState(fresh)`. Currently unused — `useRefreshAllData` calls `setOrders` directly. |

**The `orderId` key is the universal join field**, normalised to `Number` everywhere. Socket and polling both work on it.

---

## 5. Current Web Order Popup Flow

File: `/app/frontend/src/components/dashboard/ScanOrderPopOut.jsx`.

**Critical property:** the popup is **fully declarative** — it derives its queue from the `orders` prop via the locked predicate:

```js
// ScanOrderPopOut.jsx:43-44
export const isUnconfirmedScanOrder = (order) =>
  Boolean(order) && order.orderFrom === 'web' && order.fOrderStatus === 7;
```

And:

```js
// ScanOrderPopOut.jsx:174-184
const queue = useMemo(() => {
  const safeOrders = Array.isArray(orders) ? orders : [];
  return safeOrders
    .filter(isUnconfirmedScanOrder)
    .filter((o) => !popOutSnoozeHideSet.has(String(o.orderId)))
    .sort(...);
}, [orders, popOutSnoozeHideSet]);
```

**Consequences for polling design:**

- There is **no separate "open popup" action** to call. The popup opens whenever a row matching `(orderFrom='web', fOrderStatus=7)` enters `orders` — regardless of whether it was added by socket or polling.
- **Dedupe is automatic** at the `orders` level (via `OrderContext.addOrder`'s `orderId` check), so the popup never sees the same order twice.
- **Snooze is preserved automatically.** The component keeps its own 5-minute in-memory `popOutSnoozeHideSet` (`ScanOrderPopOut.jsx:160`). The dashboard also keeps `snoozedOrders: Set` (`DashboardPage.jsx:417`). Both filters are downstream of `orders`, so polling-added orders honour them transparently.
- **Status-flip auto-remove** (R-SNOOZE-12) is implicit — once a web YTC order moves to a non-YTC status (Preparing, Ready, Cancelled, Paid), it falls out of the predicate and the popup closes. Polling-driven updates flow through the same predicate.
- **No sound side-effect.** `ScanOrderPopOut` has an explicit "NO soundManager import" anti-rule (L23). The dashboard's FCM-driven notification sound is on a separate path (`soundManager.js`), and is **already gated on a socket event arrival** — polling will not trigger it. So no duplicate sounds.

The wire-map (L31-35) is also locked: `onAccept`, `onReject`, `onToggleSnooze`, `onEdit` are existing dashboard handlers — polling never needs to touch them.

---

## 6. Existing Polling / Reconnect Logic

**No polling exists anywhere in the codebase** for orders. Verified by greps for `setInterval`, `useInterval`, `RxJS interval`, `swr` (not used), `react-query` (not used).

| What does exist | Where | What it does |
|---|---|---|
| Socket auto-reconnect | `socketService.js` config | Attempts up to 10 reconnects, exponential backoff. **Does NOT re-fetch orders after reconnect.** |
| `visibilitychange` listener | `SocketContext.jsx:72-87` | On tab-visible: if socket disconnected → reconnect. **Does NOT refetch orders.** |
| `online` listener | `SocketContext.jsx:93-113` | On network online: if socket disconnected → reconnect. **Does NOT refetch orders.** |
| `tick` interval | `LoadingPage.jsx:72-77` | UI-only 100 ms tick for the elapsed counter; nothing to do with orders. |
| `waitForOrderRemoval` / `waitForOrderReady` / `waitForOrderEngaged` | `OrderContext.jsx:197-286` | Event-driven short-poll helpers (50 ms tick, ≤ 5 s timeout) used by individual flows like post-payment, table-engage handshake. **Not the kind of polling this CR wants** — they wait for one specific order's state change, not for a full reconciliation. |
| Manual `Refresh` button | `DashboardPage.jsx:482-495` | One-shot full refetch on click. |

**Net:** zero periodic refresh today. Drift accumulates between manual refreshes.

---

## 7. Candidate Polling API

Use the **existing** endpoint, with the **existing** service function and transform:

| Property | Value |
|---|---|
| Endpoint | `GET /api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager` |
| Service | `orderService.getRunningOrders(roleName)` (`orderService.js:13-18`) |
| Transform | `fromAPI.orderList(...)` — same shape as everything else. |
| Returned shape | `[{ orderId, orderNumber, fOrderStatus, status, paymentStatus, amount, subtotalAmount, orderFrom, orderType, tableId, isWalkIn, isRoom, items, updatedAt, createdAt, ... }]` |
| Auth | Bearer token via `api/axios` interceptor (same as everything else) |
| Backend side-effects | None — pure read |
| Already proven | Yes — used by `LoadingPage` boot and the manual refresh button. No new endpoint needed. |

**No backend change required.** No new endpoint, no new field, no new query param. The same payload that powers the manual Refresh and the boot flow is what polling will diff against.

---

## 8. Reconciliation Strategy

Build a diff between `serverList = await getRunningOrders(roleParam)` and `localList = ordersRef.current` keyed on `orderId`.

### 8.1 Three buckets

```text
serverIds = new Set(serverList.map(o => o.orderId))
localIds  = new Set(localList .map(o => o.orderId))

new      = serverList.filter(o => !localIds.has(o.orderId))
removed  = localList .filter(o => !serverIds.has(o.orderId))
common   = serverList.filter(o =>  localIds.has(o.orderId))
   .map(s => ({ server: s, local: localList.find(l => l.orderId === s.orderId) }))
```

### 8.2 Apply changes

For each `new` order: `addOrder(o)` → adds to `orders`. Picks up popup automatically if web YTC.

For each `removed` order: `removeOrder(o.orderId)` — but ONLY if the local order is **not engaged** (cashier is mid-edit) AND **not in a terminal status** that the local copy may simply be holding for the UI between socket event and dashboard reflow. Safer: gate on `!engagedOrdersRef.current.has(o.orderId)` only. If engaged → defer to next poll.

For each `common` pair: compare a small **fingerprint** to decide if update is needed:

```text
fingerprint(o) = [
  o.fOrderStatus,        // numeric status (1..7)
  o.status,              // 'preparing' / 'ready' / 'served' / 'cancelled' / 'paid' / 'unknown'
  o.paymentStatus,       // 'paid' / 'unpaid' / null
  o.amount,              // grand total
  o.itemCount,           // length of items[] OR sum of qty (cheap O(N))
  o.updatedAt || null,   // BE timestamp if available
].join('|')
```

If `fingerprint(server) !== fingerprint(local)` → `updateOrder(server.orderId, server)`.

This avoids re-rendering every order on every poll. `updatedAt` alone would be ideal but is only present when BE sets it (varies by mutation path), hence the multi-field fingerprint as a robust fallback.

### 8.3 Why the existing `addOrder`/`updateOrder` are safe

- `addOrder` already dedupes by `orderId` (idempotent, line 95). Calling it for an order that **arrived via socket microseconds earlier** is a no-op that just updates the in-place row — harmless.
- `updateOrder` already replaces by `orderId` — race-safe with socket because both paths flow through `setOrdersState(prev => ...)` functional setters.
- `removeOrder` already normalises to `Number` and filters — race-safe.

### 8.4 What NOT to reconcile via polling

| Field | Why |
|---|---|
| In-flight cart edits, OrderEntry state | Polling should pause while OrderEntry is open (see §11). |
| Engaged orders (`engagedOrdersRef`) | Honour the engage lock — defer that one row to the next poll cycle. |
| Tables (`apiTables`) and Menu / Products / Categories | Out of scope of this CR. Manual Refresh button still covers those. |

---

## 9. Web Order Popup Strategy

Because the popup is fully derived from `orders` (§5), the rule is simply:

> Add the new web YTC order to `orders` via `addOrder()`. Don't touch any popup state. The popup will appear automatically on the next render.

Concrete acceptance criteria:

- Polling detects an order with `orderFrom === 'web'` AND `fOrderStatus === 7` AND not in `localIds` → `addOrder(order)`.
- `ScanOrderPopOut` rerenders, recomputes `queue` via `isUnconfirmedScanOrder`, queue becomes non-empty, popup shows.
- If the same order is then delivered via socket microseconds later, `addOrder` short-circuits via the `exists` check → no duplicate.
- If the user has already snoozed it (either dashboard `snoozedOrders` or `popOutSnoozeHideSet`), the order is still in `orders` but is filtered out of the popup's queue — no re-pop.
- If the order is already past YTC (cashier accepted it from another device), polling adds it but the predicate excludes it from the queue → no false popup.

**No new popup code path.** No risk of duplicate popup, duplicate sound, or snooze bypass — those are all properties of the existing single popup pipeline.

---

## 10. Dedupe Strategy

Three layers cooperate, all already in place:

1. **Network layer:** N/A — both socket and polling call the same backend (the difference is the transport). The backend is the ground truth.

2. **State layer (the primary dedupe):** `OrderContext.addOrder` and `OrderContext.updateOrder` are keyed on `orderId` and idempotent. Whichever path arrives first writes; the second one finds `exists === true` and either short-circuits (`addOrder`) or rewrites the same row (`updateOrder`).

3. **Render layer (popup):** `ScanOrderPopOut.queue` is derived from `orders` and applies snooze filters. There's no per-order popup state to dedupe — the order *is* the queue entry.

**Snooze is preserved** because the dashboard `snoozedOrders: Set` and the popup-local `popOutSnoozeHideSet: Map` are keyed on `orderId` (stringified) and live outside polling's reach.

**Sound is not retriggered.** `soundManager` is invoked from FCM / browser notifications elsewhere, not from `addOrder`. Polling never calls `soundManager`. There's no risk of duplicate ping/chime.

---

## 11. Polling Conditions

| Condition | Recommendation | Rationale |
|---|---|---|
| **Default interval** | **60 seconds** | Owner-stated conservative starting interval. With ~7 endpoints in boot, the cost of one `getRunningOrders` per minute is roughly 1.5 % of boot bandwidth per minute — negligible. Backend confirmed in QA reports as the slowest endpoint for the slow case (`/get-products-list`); the running-orders endpoint typically resolves in well under a second. |
| **Always-on vs socket-disconnected-only** | **Always-on.** | Owner asked us to consider socket-disconnected-only. We recommend always-on because (a) socket "connected" status does not guarantee event delivery — a missed event can happen on a fully-connected socket too (server-side drop, queue backlog, single-event payload loss); (b) detecting missed-event-without-disconnect requires polling anyway; (c) the cost is one HTTP call per minute. If owner prefers, a flag in `usePollingReconciliation({ onlyWhenSocketDisconnected: true })` is trivial. |
| **Visibility** | **Pause when `document.visibilityState !== 'visible'`** | If the cashier's tab is in the background, polling adds zero perceived value (they're not looking) and the socket-reconnect path already handles wake-up. Trigger one immediate poll on `visibilitychange → visible`. |
| **Engaged-row pause** | **Skip the engaged subset; never block the whole poll.** | If 1 of 30 orders is engaged, poll the other 29 normally and defer the engaged one's reconciliation to next cycle. Avoids the "polling can't happen because someone is editing" deadlock. |
| **OrderEntry modal open** | **Continue polling — just gate the engaged-row reconciliation as above.** New web orders should still flow into `orders` and the popup should still appear. | The manual Refresh button blocks because it does a full-replace `setOrders(fresh)` which clobbers volatile carts. Our diff-based approach does per-order mutations, so it's safe to continue. **Exception:** if owner prefers parity with manual refresh, pause polling entirely while `orderEntryType !== null`. |
| **Auth gate** | **Only poll when `isAuthenticated === true`** | Same as the socket gate (`SocketContext.jsx:23, 33`). |
| **Restaurant gate** | **Only poll when `restaurant.id` is known** | Defensive — avoids hitting BE before profile resolves. Practically `getRunningOrders` works with the token alone, but checking restaurant.id costs nothing and ensures the poll matches the active tenant. |
| **Reconnect kick** | **One immediate poll on socket-reconnect** | Subscribe to `SOCKET_EVENTS.CONNECT` or read `useSocketStatus().isConnected` transitions; on `false → true`, fire one extra poll to catch up. |
| **Window-focus kick** | **One immediate poll on `visibilitychange → visible`** | Browser sleep/wake recovery. |
| **Manual-refresh kick** | **One immediate poll after Refresh button** | Optional. Manual Refresh already does a full replace; adding a polling-cycle reset on top is just a `pollingTimerRef.reset()`. Nice to have, not required. |
| **Mobile / tablet** | **Same as desktop** | No platform-specific tuning needed. |
| **In-flight overlap** | **Single-flight: if a poll is already running, skip the next tick** | Avoids stacking requests if BE is slow. Implementation: `isPollingRef.current` guard. |

**Concrete interval set:**

| Constant | Value | Notes |
|---|---|---|
| `POLL_INTERVAL_MS` | `60_000` | Owner-approved conservative default. |
| `POLL_VISIBLE_RESUME_DEBOUNCE_MS` | `500` | When tab regains focus, debounce briefly so a click doesn't fire two polls. |
| `POLL_RECONNECT_DELAY_MS` | `1_000` | Slight delay after socket-reconnect so subscribed events for the disconnect window can flush first; then polling catches anything still missing. |
| `POLL_TIMEOUT_MS` | `15_000` | If a poll hangs (slow BE), abort it; logs a warning; next tick proceeds normally. |
| `POLL_FAIL_BACKOFF_MAX_MS` | `300_000` (5 min) | On consecutive failures, exponential backoff so a flaky BE doesn't get hammered. |

---

## 12. Edge Cases

| Scenario | Behaviour with the recommended design |
|---|---|
| **Missed socket event** (server drop, lost packet) | Next poll (≤ 60 s later) detects the divergence via fingerprint, fires `updateOrder` / `addOrder` / `removeOrder`. Drift window: 0–60 s. |
| **Socket reconnect after disconnect** | Reconnect listener triggers one immediate poll. Backend events during the disconnect are recovered. |
| **Browser sleep then wake** | `visibilitychange → visible` triggers one immediate poll + resumes the 60 s timer. Socket-context already reconnects on the same event. |
| **Duplicate socket + polling for the same order** | `addOrder` short-circuits via `exists` check. `updateOrder` rewrites identical fields → idempotent. No double-mutation visible. |
| **Edited order while cashier is viewing it in OrderEntry** | Polling sees `engagedOrdersRef.current.has(orderId)` is true → skips that one row only. Next poll cycle re-evaluates. The cashier's edit completes normally; engage is released; reconciliation catches any drift on the next tick. |
| **Accepted / rejected / paid web order** | These transition to a non-YTC `fOrderStatus`. Polling sees the new fingerprint → `updateOrder` (which keeps the row but with new status) OR `removeOrder` (if BE no longer returns it because it's terminal). Either way, the popup predicate now returns false and the popup closes. **No re-pop** because `isUnconfirmedScanOrder` evaluates to `false`. |
| **Snoozed web order** | Polling still includes it in `orders` (it's a live order). The popup queue filters it out via `popOutSnoozeHideSet` (component-local) and `snoozedOrders` (dashboard-level Set). Snooze is honoured. |
| **Multiple new web orders** between polls | Polling discovers N new web YTC orders → calls `addOrder` N times → `orders` grows by N → popup queue's `useMemo` picks them all up → sequential one-at-a-time UI navigates through them per the locked Phase-4 contract (`ScanOrderPopOut.jsx:9`). |
| **Slow polling API** (BE overload) | `POLL_TIMEOUT_MS = 15 s` aborts the call. `POLL_FAIL_BACKOFF_MAX_MS` ramps down call frequency on consecutive failures. Single-flight guard prevents stacking. POS UI is unaffected — failure is silent except a `console.warn`. |
| **Polling API failure** (network blip, BE 500) | Caught in a try/catch; nothing is mutated; `OrderContext` keeps its current state; backoff increments; next attempt at `min(60s * 2^failures, 5 min)`. |
| **Restaurant switch** (out of scope today; future-proofing) | Not applicable today (single-tenant per session). If introduced later, the polling timer should reset on tenant change so the new restaurant's roleParam is used. |
| **Role change mid-session** | Not applicable today (role is fixed per session). Use `permissions?.[0] || 'Manager'` same as `useRefreshAllData`. |
| **Aggregator orders** | They flow through `aggrigator-order` events into the same `OrderContext.addOrder`. Polling cannot distinguish aggregator-vs-direct at the `getRunningOrders` payload level (it returns the unified list). No special handling needed. |
| **Split orders** | A split produces multiple orderIds tied to one parent. Each child order has its own `orderId` → polling treats them as independent rows. The existing `split-order` handler already updates them via `updateOrder`. Polling will reconcile any drift on a child the same way. |
| **Out-of-order arrival** (polling delivers an older snapshot after a newer socket event) | The fingerprint check almost certainly differs → polling calls `updateOrder` with the older payload, briefly downgrading the row. Mitigation: compare `updatedAt` if present and skip when `local.updatedAt > server.updatedAt`. Simple guard, 2 lines. **Recommend including this guard from day 1.** |
| **Backend lag** (server returns an order that's already in terminal status with `f_order_status = 6` paid) | Polling sees it → applies `updateOrder` → next dashboard render filters it out via `getRunningOrders` natural inclusion (BE will drop it on the next poll). Self-healing within one cycle. |
| **`removeOrder` on engaged order** | Skipped (engaged guard). Defers to next cycle. |

---

## 13. Recommended Fix Plan

**Scope:** one new hook + one wiring line.

### 13.1 New file

`frontend/src/hooks/useOrderPollingReconciliation.js` (~150 lines, incl. comments).

Responsibilities:

- `useEffect` setup of the 60 s timer; cleanup on unmount; guard on auth + restaurant.
- `visibilitychange` listener → immediate poll on visible.
- Socket-status listener (via `useSocket()`) → on reconnect (transition `disconnected → connected`), wait 1 s then poll.
- `pollOnce()` function:
  1. Single-flight guard.
  2. `await orderService.getRunningOrders(roleParam)`.
  3. Build `serverIds`, `localIds`, diff into `new` / `removed` / `common`.
  4. For each `new` → `addOrder(o)`.
  5. For each `removed` → if `!engagedOrdersRef.has(orderId)` → `removeOrder(orderId)`.
  6. For each `common` → if fingerprint differs AND `local.updatedAt < server.updatedAt` (where defined) → `updateOrder(server.orderId, server)`.
  7. Reset fail counter on success; bump on catch; backoff on failure.
- Exposes nothing (side-effect-only hook); returns an optional debug object.

### 13.2 Wiring

In `DashboardPage.jsx`, after the existing context hooks:

```js
useOrderPollingReconciliation();   // single line; pulls deps from contexts internally
```

Or, slightly safer, mount it inside a top-level `<App>`-scoped wrapper or alongside `<SocketProvider>` so the timer survives page-internal nav. Recommend the latter — keeps polling on whenever the user is authenticated, regardless of route.

### 13.3 Files NOT changed

- `OrderContext.jsx`, `socketHandlers.js`, `SocketContext.jsx`, `socketService.js`, `socketEvents.js`, `useSocketEvents.js` — all untouched. Polling is a pure consumer of the public surface.
- `ScanOrderPopOut.jsx`, `DashboardPage.jsx` popup wiring, snooze logic — all untouched. The popup is fully derived from `orders`.
- `orderService.js`, `orderTransform.js` — untouched. We reuse `getRunningOrders` and `fromAPI.orderList`.
- `OrderEntry.jsx`, VAT, service charge, tip, delivery charge, payload builders, KOT/print payloads — none touched. Polling never crosses those boundaries.
- Backend — untouched. No new endpoint or field.

### 13.4 Owner-facing knobs

A small constants block at the top of the new hook for easy tuning post-launch:

```js
const POLL_INTERVAL_MS = 60_000;
const POLL_VISIBLE_DEBOUNCE_MS = 500;
const POLL_RECONNECT_DELAY_MS = 1_000;
const POLL_TIMEOUT_MS = 15_000;
const POLL_FAIL_BACKOFF_MAX_MS = 300_000;
```

If owner later wants `30_000` or wants to switch to socket-disconnected-only, it's a one-line change.

---

## 14. Regression Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Duplicate popups** | Eliminated by design. The popup is fully derived from `orders`; `OrderContext.addOrder` dedupes by `orderId`. There's no separate "open popup" action to call twice. | None needed. |
| **Duplicate notification sounds** | None. `soundManager` is not invoked by polling. The existing FCM-driven sound is on a separate pipeline. | None needed. |
| **Backend load** | One `GET /pos/employee-orders-list` per minute per active POS tab. For an N-tab tenant that's ~N requests/minute. Conservative interval; single-flight; visibility-pause; exponential backoff on failure. | Recommend instrumenting `console.log('[Polling] elapsed=…')` for the first weeks so owner can confirm. |
| **Stale overwrite** (older poll arrives after newer socket event) | Low — `updatedAt` guard skips the older write. Even without it, the next poll (60 s) self-heals; worst-case the row briefly downgrades for ≤ 60 s. | `updatedAt` guard. |
| **Active modal / OrderEntry conflict** | Diff-based polling does per-order mutations; the engaged-row skip prevents clobbering the row being edited. Other rows update freely. | Engaged-row skip; optional full pause toggle if owner prefers parity with manual Refresh. |
| **Terminal-order removal mismatch** (local says "in progress", server omits it because it's paid) | `removed` bucket calls `removeOrder` — same path socket uses for `update-order-paid`. Risk identical to today's socket path. | None new. |
| **Snooze conflict** | Polling never touches `snoozedOrders` or `popOutSnoozeHideSet`. Snooze is preserved transparently. | None needed. |
| **Status-jump / movement interactions** (Phase-3 row movement logic) | Polling calls `updateOrder` exactly the same way socket does. Status-jump logic downstream of `orders` works identically. | None needed. |
| **Race with `useStationSocketRefresh`** | Different domain (kitchen station view); independent code path; no shared state. | None needed. |
| **`engagedOrdersRef` race** | Polling reads the ref, snapshot is per-tick. If user engages an order during the poll, worst case is one cycle of "I thought it wasn't engaged"; engaged-row is mutated; on engage release the next tick reconciles. | Acceptable. |
| **Hot-reload / strict-mode double effect** | `isPollingRef` single-flight guard. Cleanup function clears the timer. | Standard. |

---

## 15. QA Checklist

1. **Socket-working normal order update.** Cashier on POS A places an order from POS B. Socket fires; polling does not duplicate; the order appears exactly once.
2. **Socket-missed order update → polling catches it.** Stub-disable socket `update-order` for one order on POS B. Within 60 s, POS A's view updates via polling (no manual refresh).
3. **Socket-missed new POS order → polling catches it.** Same as above for `new-order`.
4. **Socket-missed new web order → polling opens popup.** Stub-disable `scan-new-order`. POS B places a web/scan order. Within 60 s, POS A's `ScanOrderPopOut` appears with the new order. Only one popup.
5. **Socket + polling same web order, no duplicate popup.** Re-enable socket, polling still running. New web order: `addOrder` first writer wins; second is a no-op. Popup appears once.
6. **Edited order reflected.** Drive an order edit via BE (or another POS) without the socket event. Within 60 s, fingerprint changes → `updateOrder` fires → POS A's row reflects the new amount / item count.
7. **Paid / cancelled reflected.** BE marks order paid; socket event suppressed. Within 60 s, polling sees fingerprint change OR removal → `removeOrder` (or `updateOrder` to terminal status) → row disappears / greys out per existing rules.
8. **Snoozed web order not incorrectly reopened.** Cashier snoozes a web YTC order. Polling continues to include it in `orders`. Popup queue's snooze filter excludes it. No re-pop.
9. **Polling API failure does not break POS.** Force the endpoint to 500. POS keeps running on existing state; `console.warn` is the only signal; backoff increases interval; eventual recovery resets backoff.
10. **Browser sleep / wake catches up.** Sleep the laptop for 5 minutes during a busy hour. On wake, `visibilitychange → visible` triggers an immediate poll; all backlog updates apply within one cycle.
11. **OrderEntry open while polling.** Cashier opens OrderEntry on order X; meanwhile order Y on another table changes status. Polling updates order Y normally; order X is skipped (engaged); cashier saves; engage releases; next cycle reconciles order X.
12. **Manual Refresh button + polling.** Click manual Refresh during a poll. Manual Refresh wins (full replace). Polling timer resets (optional) so next tick is 60 s after the manual refresh.
13. **No new endpoints called.** DevTools confirms only `GET /pos/employee-orders-list` fires periodically — no new URLs.
14. **Visibility-paused polling.** Switch tabs. `setInterval` is cleared. Switch back. Single immediate poll fires; periodic resumes.
15. **Socket reconnect kicks one extra poll.** Pull the network cable for 30 s. Reconnect. Within 1 s of socket "connected" event, one extra `getRunningOrders` fires. Periodic timer continues thereafter.
16. **Stale overwrite test.** Stub a slow poll (e.g. 10 s) and let a fresh socket update arrive in the meantime. Verify the stale poll's row does NOT downgrade the newer socket row (via the `updatedAt` guard).
17. **High-frequency new orders.** Place 5 web orders in 30 s, all via polling-only (socket disabled). All 5 appear; popup queue navigates one-at-a-time per locked contract.
18. **Aggregator order.** Aggregator order placed; socket disabled. Within 60 s, polling adds it via `addOrder`. Channel chip + dashboard column reflect it.
19. **Single-flight guard.** Force a 90 s poll latency. Verify the next 60 s tick does NOT fire a second concurrent call; it's skipped.
20. **No regression in non-order surfaces.** Tables, Categories, Products, Popular, Cancellation Reasons unaffected. Manual Refresh still updates them.

---

## 16. Open Questions

| # | Question | Recommendation |
|---|---|---|
| 1 | **Interval default — 60 s, or shorter?** | 60 s for v1 (owner-stated conservative). After 1-2 weeks of telemetry, consider 30 s if drift complaints exist. |
| 2 | **Always-on, or only when socket disconnected?** | Always-on (socket "connected" status does not guarantee event delivery; the cost of one HTTP/minute is negligible). One-line config flag if owner wants the alternative. |
| 3 | **Pause polling entirely while OrderEntry is open** (parity with manual Refresh) or **continue with engaged-row skip**? | Continue with engaged-row skip. The diff approach is per-orderId; only the engaged row is unsafe, and the engage flag is precisely the mechanism to protect it. This preserves the popup-on-new-web-order behaviour even while a cashier is editing. |
| 4 | **Should socket-reconnect trigger one extra poll** (recommended) or rely on the 60 s timer? | Yes — extra poll on reconnect, 1 s after `disconnected → connected`. Closes the worst-case gap to ~1 s. |
| 5 | **Telemetry / logging level** | Two `console.log` lines per poll cycle for the first ship window (start, applied counts). Owner can flip to silent after stability is proven. |
| 6 | **`updatedAt` guard required from day 1?** | Yes. Tiny addition, protects against the most subtle race. |
| 7 | **`removeOrder` policy when local row is engaged** | Skip-and-defer for one cycle; if still engaged on cycle 2 (unlikely — engage durations are seconds), log a warning. Avoid hard kill. |
| 8 | **Polling for non-orders** (tables, menu) — same CR or separate? | **Separate CR.** Out of scope here. Tables/menu drift is much rarer (long-lived state, less event-driven). |
| 9 | **Aggregator orders** dedicated polling? | No — same `getRunningOrders` returns them. Covered. |
| 10 | **Backend rate-limit headroom** | None expected at one call per minute per tab. Owner may want to confirm with infra team if multi-thousand-tenant scenarios are in scope. |
| 11 | **Mobile / tablet behaviour** | Same logic. The visibility-pause covers the "POS app sent to background on tablet" case. |
| 12 | **Should the manual Refresh button be replaced by polling?** | No. Keep both. Manual Refresh is the user-driven full reset (with full-replace semantics); polling is the silent background reconciler. They cooperate. |

---

— End of investigation.
