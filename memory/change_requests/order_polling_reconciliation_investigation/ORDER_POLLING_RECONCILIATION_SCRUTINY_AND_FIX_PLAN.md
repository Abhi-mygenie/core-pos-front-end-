# Order Polling Reconciliation Scrutiny and Fix Plan

> **Mode:** Scrutiny / impact analysis only. No code changes, no commits, no refactor.
> **Date:** 2026-05-15
> **Predecessor:** `ORDER_POLLING_RECONCILIATION_INVESTIGATION.md` (same folder)
> **Locked owner direction:** Reconciliation must be **silent** — no banner, no toast, no sound, no overlay, no new popup. The only visible side-effect allowed is the **existing** `ScanOrderPopOut` opening for a newly-discovered web YTC order, identical to the socket-driven path.

---

## 1. Summary

The original investigation plan is **largely correct and safe to proceed**, with **five corrections** layered on:

1. **`updatedAt` is not always reliable** on the running-orders payload. Treat it as a *bonus* race-guard, not the primary fingerprint. Drive the diff off a small **multi-field fingerprint** (`fOrderStatus`, `status`, `paymentStatus`, `paymentMethod`, `amount`, `subtotalAmount`, `tipAmount`, `deliveryCharge`, `items.length`, items-hash) and use `updatedAt` only as a **monotonicity tie-breaker** when present on both sides.
2. **The fingerprint proposed in the investigation is too thin.** It misses modifier (variation/add-on) changes, item-level edits, payment-method change, delivery/SC/tip changes — all of which can land via socket today and must be caught by polling. Add a lightweight items-hash and explicit money fields.
3. **Polling-added web orders may not always trigger the popup.** The `handleScanNewOrder` socket handler explicitly **fills `orderFrom='web'` when backend omits it** (`socketHandlers.js:508-511`, POS2-002-P4-FU-01, May-2026). The running-orders endpoint is **not proven** to always set `order_from='web'` on web/scan orders. Polling **must mirror the same forced enrichment** for any order whose `order_in` indicates a web/scan source but `order_from` came back empty — otherwise the popup contract silently regresses on missed-socket recovery.
4. **Terminal-status parity must match three handlers, not one.** Socket removes orders on (a) `status === 'cancelled' || 'paid'`, (b) `fOrderStatus === 9` (Hold/Park OR PayLater settle on `update-order-paid`). Polling must follow the same union, **plus** apply the **`fOrderStatus === 8 || 9` skip-on-add** rule from `handleNewOrder` / `handleScanNewOrder` so polling never adds a Hold order to the running dashboard.
5. **Removal needs two consecutive missing polls** before `removeOrder`, not one. The running-orders endpoint is role-scoped (`role_name=Manager` vs other roles), and a one-time backend lag or role-filter quirk should not orphan a live order. One-cycle confirmation latency (≤ 60 s) is acceptable; one-cycle wrong-deletion is not.

Other directional decisions:

- **Interval:** 60 s, always-on while authenticated and tab visible.
- **Triggers:** pause on `visibilitychange → hidden`; immediate poll on visible; immediate poll 1 s after socket reconnect; single-flight; 15 s per-call timeout; exponential failure backoff up to 5 min.
- **Engaged orders:** skip update **and** removal for engaged rows; new orders still flow through `addOrder` (which is idempotent and never touches engaged rows).
- **Multi-tab:** for v1, every authenticated tab polls. No tab-leader election. Acceptable because (a) `OrderContext.addOrder` dedupes intra-tab; (b) popup snooze is intra-tab anyway; (c) backend load is one GET/minute/tab; (d) tab-leader adds material complexity that's not justified at v1.
- **Visual disruption:** none. Polling routes through `addOrder`/`updateOrder`/`removeOrder` — the same surface socket uses. `ScanOrderPopOut` is fully derived from `orders` and already respects `suppressed={Boolean(orderEntryType) || Boolean(cancelOrderEntry)}` (DashboardPage.jsx:1434), so polling never interrupts an active workflow.

Recommended scope: **one new hook file + one wiring line**. No backend change, no transform change, no popup redesign, no socket change.

---

## 2. Baseline Docs Read

### Baseline (`/app/memory/final/`)
- `ARCHITECTURE_DECISIONS_FINAL.md`
- `CHANGE_REQUEST_PLAYBOOK.md`
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `FINAL_DOCS_SUMMARY.md`
- `IMPLEMENTATION_AGENT_RULES.md`
- `MODULE_DECISIONS_FINAL.md`
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md`

### Sprint accepted state (`/app/memory/change_requests/`)
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`

### CR-specific
- `order_polling_reconciliation_investigation/ORDER_POLLING_RECONCILIATION_INVESTIGATION.md`

### Code inspected (truth)
- `/app/frontend/src/contexts/OrderContext.jsx` (full)
- `/app/frontend/src/api/socket/socketHandlers.js` (full)
- `/app/frontend/src/api/socket/socketEvents.js` (full)
- `/app/frontend/src/contexts/SocketContext.jsx` (full)
- `/app/frontend/src/api/services/orderService.js` (full)
- `/app/frontend/src/api/transforms/orderTransform.js` (lines 28–280 — `fromAPI.order` field-by-field)
- `/app/frontend/src/components/dashboard/ScanOrderPopOut.jsx` (full)
- `/app/frontend/src/hooks/useRefreshAllData.js` (full)
- `/app/frontend/src/pages/DashboardPage.jsx` (relevant slices around L411–L495, L1135, L1415–L1455, L1539–L1735)

### Baseline rules invoked during scrutiny

| Rule | Applies how |
|---|---|
| **FA-03** Do not expand hotspot files casually | Polling is implemented as a new hook + one wiring line in `DashboardPage.jsx`. No hotspot file gets new business logic. |
| **API-02** Preserve transform-mediated payload shaping | Polling reuses `orderService.getRunningOrders` → `fromAPI.orderList` → `fromAPI.order`. Zero transform change. |
| **API-03** OrderEntry composition vs CollectPaymentPanel settlement | Polling never touches either. Engaged-order skip protects in-flight composition/settlement. |
| **SM-05** OrderContext owns live runtime state | Polling is a pure consumer of the public surface (`addOrder` / `updateOrder` / `removeOrder` / `engagedOrdersRef`). |
| **SM-07** Table status derived from order-socket `f_order_status` | Polling-driven `updateOrder` will refresh `tableStatus` (already inside the transformed order object). No separate table call. |
| **MC-02** Realtime flows may sync through socket instead of immediate response | Polling is **complementary** to socket sync; same dispatch surface. |
| **EH-03** Empty state vs failure state | Polling failure does **not** mutate `orders`. Empty-list response is still authoritative (per role-filter caveat: see scrutiny answer #4). |
| **LOG-01** Console logging is part of operational behaviour | Polling logs cycle start/result/skipped/failed; level: INFO/WARN/ERROR. |

---

## 3. Existing Investigation Recap

The 2026-05-15 investigation (`ORDER_POLLING_RECONCILIATION_INVESTIGATION.md`) proposes:

- New hook `useOrderPollingReconciliation.js` (~150 lines) mounted from `DashboardPage.jsx` (or higher).
- Poll `orderService.getRunningOrders(roleParam)` every 60 s when tab visible + authenticated.
- Diff `serverList` vs `ordersRef.current` keyed on `orderId`:
  - `new` → `addOrder`
  - `removed` → `removeOrder` (skip engaged)
  - `common` with fingerprint diff → `updateOrder` (skip engaged; `updatedAt` race guard)
- Pause on `visibilitychange → hidden`; immediate poll on visible; immediate poll 1 s after socket reconnect; single-flight; 15 s timeout; exponential backoff to 5 min.
- Fingerprint = `fOrderStatus | status | paymentStatus | amount | items.length | updatedAt`.
- New web orders pop via the existing `ScanOrderPopOut` (purely derived from `orders`).
- No new endpoint, no popup redesign, no sound, no backend change.

The plan is sound on direction. Five corrections needed (see §1), centred on fingerprint completeness, web-order enrichment, terminal-status parity, removal safety, and `updatedAt` reliability. None of the corrections invalidate the scope — they tighten it.

---

## 4. Scrutiny Answers

### 4.1 `updatedAt` reliability

**Field name (transformed):** `order.updatedAt`, set in `orderTransform.js:231` as `updatedAt: api.updated_at`. Available for every order produced by `fromAPI.order` (which is the same transform `getRunningOrders` → `fromAPI.orderList` → `fromAPI.order` uses, and what socket handlers use via `fetchSingleOrderForSocket`).

**Reliability on the running-orders endpoint:**
- The field is **populated by backend on every standard order mutation path** (place / update / status / paid / cancel) — `api.updated_at` is a baseline orders_table column.
- BUT we have **no static-inspection proof** that the running-orders endpoint always returns the *same* `updated_at` value that the socket's payload-bundled order carries. The single-source-of-truth here is the orders_table column, so they should match — but during the brief window between mutation and DB commit, a stale read is theoretically possible.
- Worse: the **special enrichment path** in `handleScanNewOrder` that force-fills `orderFrom='web'` (`socketHandlers.js:508-511`) does NOT touch `updated_at`. Polling sees the same row as socket, but neither shifts the timestamp on FE.
- **Conclusion:** `updatedAt` is **best-effort**, not guaranteed. Suitable as a tie-breaker, not as the primary signal.

**Fallback when `updatedAt` is missing/stale on either side:** drive the diff off the multi-field fingerprint (see §5). If both `local.updatedAt` and `server.updatedAt` exist and `local.updatedAt > server.updatedAt`, **skip the update** (stale-overwrite guard). Otherwise rely on the fingerprint difference alone.

**Decision (§5):** fingerprint is primary, `updatedAt` is monotonicity guard only.

---

### 4.2 Fingerprint completeness

The investigation's proposed fingerprint (`fOrderStatus | status | paymentStatus | amount | itemCount | updatedAt`) **misses** the following real mutations that can land via socket today:

| Change type | Caught by investigation's fingerprint? | Why it matters |
|---|---|---|
| `fOrderStatus` change (1 → 2 → 5 → 6/3) | ✅ Yes | — |
| `paymentStatus` flip (`unpaid` → `paid`) | ✅ Yes | — |
| Grand total change | ✅ Yes (via `amount`) | — |
| Item quantity +/− (single-line) | ❌ **No** if `amount` lookup tolerance hides the delta | quantity change shifts `subtotalAmount` + `amount` together — `amount` catches it |
| Item added / removed | ⚠ Partial (catches item count, misses if count unchanged due to other addition) | new item arriving simultaneously with a removal could yield equal `itemCount` and shifted but rounded `amount` matching local |
| Variation / add-on change on existing line | ❌ **No** if line price stayed identical (rare but possible: same-price variation swap) | edited variations affect KOT/print; `itemCount` and `amount` may both stay equal |
| `paymentMethod` change (cash → card) | ❌ **No** | shifts cashier reporting, affects PG-paid badge logic |
| `deliveryCharge` change | ❌ **No** if rolled into `amount` rounding | shifts delivery audit + print |
| `serviceTax` / `tipAmount` change | ⚠ Partial (rolls into `amount` only after profile-derived calc) | shifts SC / Tip lines on bill |
| `orderNote` edit | ❌ **No** | non-financial; debatable whether reconciliation should catch it — owner direction is "make missed data appear as if socket had delivered it", so we should catch it |

**Decision (§5):** broaden the fingerprint to include:

```text
fingerprint(o) = [
  o.fOrderStatus,
  o.status,
  o.paymentStatus,
  o.paymentMethod,
  o.amount.toFixed(2),
  o.subtotalAmount.toFixed(2),
  o.serviceTax.toFixed(2),
  o.tipAmount.toFixed(2),
  o.deliveryCharge.toFixed(2),
  o.items.length,
  // tiny items-hash: per-item id|qty|unitPrice|variations.length|addOns.length
  o.items
    .map(it => `${it?.id ?? it?.foodId ?? ''}|${Number(it?.qty ?? it?.quantity) || 0}|${Number(it?.unitPrice ?? it?.price) || 0}|${(it?.variation ?? []).length}|${(it?.addOns ?? []).length}`)
    .sort()
    .join(';'),
  o.orderNote || '',
].join('||')
```

This catches all socket-observable mutations without recomputing transforms or doing deep object diffs. It's O(N) per order on items; N is small (< 50 typical, < 200 worst case). The cost on 100 orders ≈ 100 * 50 string ops per poll = trivially negligible.

**Safety guards on the fingerprint:**
- All numeric fields are explicitly `.toFixed(2)` to neutralise float drift.
- Items hash is sorted so item re-ordering at backend doesn't trip false updates.
- Variation/add-on **counts** (not contents) are used — a counter delta is sufficient to trigger a refresh; the full payload comes from `server`. This avoids the full-deep-equal cost.
- `orderNote` is included to honour the "missed data appears as if socket delivered it" mandate.

---

### 4.3 Polling API completeness

**Endpoint:** `GET /api/v1/vendoremployee/pos/employee-orders-list?role_name=<roleParam>` (`API_ENDPOINTS.RUNNING_ORDERS`).
**Service:** `orderService.getRunningOrders` → `fromAPI.orderList` → `fromAPI.order` for each row.

**Does it carry enough to safely `updateOrder`?**
- `fromAPI.order` (orderTransform.js:182-280) is the **same transform** used by:
  - LoadingPage boot (`getRunningOrders`)
  - Manual refresh (`useRefreshAllData`)
  - Socket handlers (via `fetchSingleOrderForSocket` → `fromAPI.order`)
  - Socket v2 payloads (via `orderFromAPI.order` from the inline payload)
- The output shape includes: `orderId, orderNumber, orderType, rawOrderType, orderIn, status, fOrderStatus, tableStatus, lifecycle, tableId, tableNumber, tableSectionName, isWalkIn, isRoom, customer, customerName, phone, amount, subtotalBeforeTax, subtotalAmount, serviceTax, tipAmount, tipTaxAmount, paymentStatus, paymentType, paymentMethod, orderFrom, isWebOrder, time, createdAt, updatedAt, readyAt, servedAt, punchedBy, waiter, source, items[] (full), orderNote, kotPrinted, billPrinted, deliveryAddress, deliveryCharge, roomInfo, associatedOrders, …`.
- Every field a downstream consumer (`OrderCard`, `OrderEntry`, `CollectPaymentPanel`, station view, popup) depends on is produced by this transform.

**Could polling-driven `updateOrder` drop fields?**
- `OrderContext.updateOrder` performs a **full-row replace** (`prev.map(o => o.orderId === orderId ? updatedOrder : o)`). It does NOT merge with the local copy. So whatever `fromAPI.order` produces becomes the new row.
- The risk surface: if any consumer of `orders[]` writes ad-hoc fields onto an order object after socket delivery (e.g., a UI-only flag), polling would erase that flag. Static read of OrderContext + the consumers found **no such ad-hoc writes** — everything that flows into `orders[]` comes through `setOrders`, `addOrder`, `updateOrder`. Cart state is held separately in `cartsByTable` (DashboardPage local state) and `OrderEntry`'s own state, not on the order row.
- One nuance: `socketHandlers.handleScanNewOrder` **mutates the transformed order** in-flight (`order.orderFrom = 'web'; order.isWebOrder = true;` at L508-511) before calling `addOrder`. This mutation is **load-bearing for the popup**. Polling must apply the same enrichment (see §4.7).

**Decision:** the running-orders endpoint is safe for add/update/remove **provided** the polling hook applies the same web-order enrichment that `handleScanNewOrder` applies, and uses the **same transform path** (it does — via `getRunningOrders`).

---

### 4.4 Removal safety

**Risk:** the local row exists; the server response omits it. Could be:
1. Order actually terminal (paid / cancelled / Hold-cleared) — correct to remove.
2. Role-filter quirk — `role_name=Manager` should return everything except Waiter-scoped; but if backend ever changes scoping, a once-visible order could disappear. **Possible.**
3. Pagination — `employee-orders-list` is not paginated today (one shot returns all running orders). **Confirm via wire trace; static read found no `limit/offset` params used by FE for this endpoint.**
4. Backend transient — DB blip, brief 0-row response. Has happened on other endpoints historically.
5. Restaurant mismatch — if the JWT token's `restaurant_id` somehow shifts mid-session (it doesn't, but defensive coding). Not realistic.

**Proposal:** **two consecutive missing polls** before `removeOrder`.

Implementation: maintain a small `missCountRef = new Map<orderId, count>`. On each poll:

- If order is in `serverIds` → delete its key from `missCountRef`.
- If order is in `localIds` but NOT in `serverIds` → increment its `missCountRef` entry.
  - If `missCountRef.get(orderId) >= 2` → call `removeOrder(orderId)` and delete the key.
  - Otherwise hold for next cycle.

Adds **one cycle of removal latency (≤ 60 s)** in exchange for resilience against single-cycle backend hiccups. Acceptable tradeoff — socket events still drop terminal orders in real-time on the happy path; polling is only a safety net.

**Terminal-status parity:** when polling DOES drop an order (after two misses), it should match socket parity:
- `status === 'cancelled'` or `'paid'` (i.e., `fOrderStatus === 3` or `6`) → free table.
- `fOrderStatus === 9` Hold/Park (no PayLater bill-collect channel context here) → **keep table 'occupied'** (mirror `handleUpdateOrderStatus` lines 437–446 + `socketHandlers.handleOrderDataEvent` lines 289–302).
- `fOrderStatus === 8` → never reaches `removeOrder` because we **skip on add** (per `handleNewOrder` and `handleScanNewOrder` L185-188 / L494-497). Document this gate in the hook.

**Engaged-order removal:** if `engagedOrdersRef.current.has(orderId)`, **skip removal entirely** (do not increment `missCountRef` either) — defer the entire decision to the next cycle after engage releases. Otherwise we'd race a cashier mid-edit.

---

### 4.5 Backend load

**Cost per poll:** one HTTP GET `/pos/employee-orders-list?role_name=Manager`. Payload is the running-orders list — for a busy mid-day tenant, observed at ~50-200 orders. Response size on the wire is typically tens of KB to a few hundred KB (the same endpoint LoadingPage hits at boot).

**Per-tenant rate:**
- 1 POS tab × 1 call/60 s × 1440 minutes/day = **1,440 calls/day/tab**.
- 5 POS tabs (typical multi-station restaurant) = **7,200 calls/day**.
- 20 POS tabs (large multi-floor / multi-station deployment) = **28,800 calls/day**.

**Per-platform rate:**
- 1,000 active tenants × 5 tabs = 5,000 polls/minute = ~83 polls/second.
- The endpoint is a single-table SELECT with join (orders_table + order_details_table + employee_table + table_table). Backend has confirmed it as the slowest report endpoint for the slow case, but well under 1 s per call.
- At 83/sec, the load is comparable to having ~80 dashboards refreshing the manual button simultaneously — well within capacity.

**Recommended posture: always-on while authenticated + tab visible.**

Rationale:
- Socket "connected" status does NOT guarantee event delivery. A missed single-event packet (server-side queue drop, brief subscriber overload, payload corruption) is invisible to the FE socket layer — the socket stays "connected" yet drift exists. Polling **regardless of socket state** is the only way to catch this class of bug.
- Visibility-pause + per-tab single-flight + 15 s timeout + exponential backoff already bound the worst case.
- Switching to "only when socket disconnected" mode is a one-line config change if owner later finds the load unacceptable.

**Backoff on consecutive failures:** start at 60 s; on each consecutive failure, double up to a max of 5 min (`60 → 120 → 240 → 300`). Reset to 60 s on first success.

**Timeout per call:** 15 s. If a call hangs, abort via `AbortController`; log a WARN; next tick proceeds.

---

### 4.6 Multi-tab behaviour

**Today:** every authenticated POS tab opens its own socket, subscribes to the same three channels, and holds its own `OrderContext` (per-tab React tree). When backend emits an event, every tab receives it independently. Snooze and engaged-order state are **per-tab** by design (see DashboardPage.jsx:417 `snoozedOrders` and OrderContext.jsx:18 `engagedOrdersRef`).

**With polling:**
- Every authenticated tab will poll once per 60 s. Net: N tabs = N HTTP/minute/tenant.
- **No cross-tab collision risk** because: (a) `OrderContext.addOrder` is idempotent (line 95 — `exists` check); (b) `OrderContext.updateOrder` is a full-replace by `orderId` — concurrent writes from two tabs converge to the same value within a few ms; (c) snooze is intra-tab anyway.
- **Could multiple tabs show the same web-order popup?** Yes — but that's **today's behaviour with socket too**. Two tabs at the same restaurant both receive `scan-new-order` and both pop their own modal. Snooze is per-tab. This is the existing baseline, not a polling regression. The popup contract is "every authenticated viewer sees the YTC alert"; that's the intended product behaviour.

**Tab-leader election (defer):** owner could later add a BroadcastChannel-based leader election where only one tab polls and others piggyback via the same channel. **Out of scope for v1.** The cost benefit is small (a few extra HTTP/min per tenant) and the complexity is large (leader handover on tab-close, role drift, race conditions). Reconsider only if backend load becomes an observable issue.

---

### 4.7 Popup and snooze behaviour

**Reuse path is automatic.** `ScanOrderPopOut` (DashboardPage.jsx:1426-1435) derives its queue purely from the `orders` prop via the predicate `orderFrom === 'web' && fOrderStatus === 7` (`ScanOrderPopOut.jsx:43-44`). Whatever puts a matching row into `orders` triggers a re-render and the popup picks it up. Polling does exactly that via `addOrder`.

**Critical correctness point (CORRECTION 3):** polling must **mirror the orderFrom enrichment** that `handleScanNewOrder` applies. From `socketHandlers.js:498-511`:

```js
// POS2-002-P4-FU-01 (May-2026): channel-arrival enrichment.
// The scan-new-order socket channel is itself proof-of-origin: every
// order that arrives here was placed via the Scan & Order (web/QR)
// surface. Backend's `single-order-new` response was observed in the
// wild (order 825770, 2026-05-10) to omit `order_from='web'`, which
// left orderFrom=null after the Phase 1 transform and prevented
// Phase 4's ScanOrderPopOut + Phase 3.1's Web counter from firing.
// Fill the field only when the backend did not supply it; never
// overwrite an explicit backend value (preserves forward-compat with
// BE-OF1 once backend ships the field on this endpoint).
if (!order.orderFrom) {
  order.orderFrom = 'web';
  order.isWebOrder = true;
}
```

Polling **cannot rely on channel arrival as proof-of-origin** (it's HTTP, not a scan channel). It must use a different but equivalent signal. Candidates:

1. **`order.orderIn` field** (transform line 187 `orderIn: api.order_in`) — for orders placed via the web/scan surface, `order_in` is typically `'web'` or `'scan'`. This is the most reliable proof-of-web-origin available on the running-orders payload.
2. **Fall back to leaving `orderFrom` as-is** if `order_in` is also missing — the order will simply not pop as a web order. This is the safe default (better silent than wrong).

**Decision:** in the polling diff, for each `new` order whose `orderFrom` is falsy AND whose `orderIn` matches `/web|scan/i`, replicate the `handleScanNewOrder` patch:

```js
if (!order.orderFrom && /web|scan/i.test(order.orderIn || '')) {
  order.orderFrom = 'web';
  order.isWebOrder = true;
}
```

Only apply this to `new` orders. Do NOT retro-patch `common` orders — if a row was already in `orders` with `orderFrom !== 'web'`, polling must not change that interpretation.

**Snooze preservation:**
- Dashboard `snoozedOrders: Set` (DashboardPage.jsx:417) keyed on `String(orderId)`. Survives across re-renders within the tab.
- Popout-local `popOutSnoozeHideSet: Map<orderIdStr, expiry>` (ScanOrderPopOut.jsx:160) with 5-min auto-clear.
- Both are downstream of `orders[]` (filtered inside `queue` useMemo). Polling never touches either Set/Map directly. ✅ Snooze preserved transparently.

**Double-popup prevention (intra-tab):**
- `OrderContext.addOrder` short-circuits via `prev.some(o => o.orderId === order.orderId)` (line 95). Socket + polling arriving microseconds apart yields one row, one popup queue entry.
- The popup itself is a singleton modal showing the active queue position. Two web orders → "Order 1 of 2" navigation. No double dialog.

**Suppressed state honoured.** `suppressed={Boolean(orderEntryType) || Boolean(cancelOrderEntry)}` (DashboardPage.jsx:1434). Polling-added web YTC orders flow into `orders` but the modal stays hidden while OrderEntry / cancel modal is open. The instant the cashier closes the modal, the queue rebuilds and the popup appears — same as socket. ✅ No cashier-facing interruption.

**No sound.** `ScanOrderPopOut` has an explicit "NO soundManager import" anti-rule (header comment L22-26). Sound today comes from FCM/push notification, NOT from `addOrder`. Polling routes through `addOrder` only. ✅ Zero new sound paths.

---

### 4.8 Engaged orders

**Definition:** "engaged" means `engagedOrdersRef.current.has(orderId)` is true. This Set is set/cleared by `OrderContext.setOrderEngaged(orderId, true|false)`. Callers:

| Caller | When set | When cleared |
|---|---|---|
| Socket: `order-engage` event (`handleOrderEngage`) | Backend pushed `'engage'` on `order-engage_${restaurantId}` channel — typically when another terminal opens the order | Backend pushed `'free'` OR via the cascading "release after React paint" in `handleOrderDataEvent` (L312-323), `handleUpdateOrderStatus` (L455-462), `handleSplitOrder` (L672-679) |
| Local: `OrderEntry` open → save / update / status-change flow | Set in OrderEntry / DashboardPage just before HTTP fire; double `requestAnimationFrame` release ensures the engage flag is held across the React paint that lands the socket update |

**What "engaged" actually means in practice:** the order's UI is **locked** while a transactional mutation (or another terminal's transaction) is in flight. Local card shows a spinner / disabled state. The cashier on this tab CAN still have OrderEntry open on a different order.

**Per the question — what counts as engaged:**
- **OrderEntry open on this order** → typically yes (engage is set during save/update/cancel/transfer flows), but **the engage flag is per-order, not per-tab**. If OrderEntry is open in "browsing" mode (read-only, just looking at a placed order), the order may NOT be engaged. **Safer rule for polling: gate on `engagedOrdersRef.current.has(orderId)` only.**
- **CollectPayment open** on this order → engaged for the duration of `BILL_PAYMENT` POST (set just before, cleared on socket return).
- **Reject modal open** on this order → engaged during `cancel-order` POST.
- **Split bill open** → split is short-lived; engage is set during `splitOrder` POST.
- **View Order (read-only)** → typically NOT engaged. Reading is safe.

**Polling behaviour for engaged rows:**
- **Skip update:** if `engagedOrdersRef.current.has(orderId)`, do NOT call `updateOrder` for that row, even if fingerprint differs. Defer to next cycle.
- **Skip removal:** if engaged, do NOT increment `missCountRef` for that row either (it's a cashier-driven workflow; backend may transiently report it differently mid-flow).
- **Allow add:** new orders (not in `localIds`) cannot be engaged — `addOrder` is safe.

This avoids the stale-overwrite-while-cashier-edits failure mode without blocking the entire poll cycle.

---

### 4.9 Socket reconnect trigger

**Where to observe:** `useSocketStatus()` (`SocketContext.jsx:224-227`) returns `{ isConnected, isReconnecting, hasError, status, reconnectAttempts }`. We can read `isConnected` in the polling hook.

**Detect the reconnect transition:**
- Hold a ref to the previous `isConnected` value.
- On each render where `prevIsConnected.current === false && isConnected === true` (the disconnected→connected edge), schedule an immediate poll **1 s later** (per investigation §11 — `POLL_RECONNECT_DELAY_MS`). The 1 s pause lets backend flush any in-flight events first.

**Flapping protection:** if a second reconnect transition fires within `POLL_RECONNECT_DELAY_MS`, dedupe — cancel the pending kick and schedule a new one. Equivalent to `setTimeout` + clear on re-edge. Standard debounce pattern, ~10 lines.

**Alternative observation surface:** subscribe directly to `socketService.onStatusChange` (`SocketContext.jsx:41`). Probably unnecessary — the hook approach is cleaner and stays within the public surface (`useSocketStatus`).

**No multiple-poll storm on reconnect:** single-flight guard + 1 s debounce ensures the reconnect kick is at most one extra HTTP call per reconnect transition.

---

### 4.10 Terminal status parity

**Reference handlers in socket layer:**

| Handler | Removal rule |
|---|---|
| `handleOrderDataEvent` (L289-302, covers `update-order`, `update-order-target`, `update-order-source`, `update-order-paid`, `update-item-status`) | `(status === 'cancelled' \|\| status === 'paid')` OR `(fOrderStatus === 9 && eventName === 'update-order-paid')` (PayLater settle, frees table) OR `(fOrderStatus === 9 && eventName !== 'update-order-paid')` (Hold/Park, keeps table 'occupied') |
| `handleUpdateOrderStatus` (L437-447) | `(status === 'cancelled' \|\| status === 'paid')` OR `fOrderStatus === 9` (Hold/Park, table stays 'occupied') |
| `handleNewOrder` (L185-188) | Skip-on-add if `fOrderStatus === 8 \|\| 9` |
| `handleScanNewOrder` (L494-497) | Skip-on-add if `fOrderStatus === 8 \|\| 9` |

**Polling's union rule for removal (after two consecutive misses):**

```text
shouldRemove = (
  serverRow.status === 'cancelled' ||
  serverRow.status === 'paid' ||
  serverRow.fOrderStatus === 9
)
```

But polling sees an order **disappear from the list** (it's gone, not present-with-terminal-status). The backend has already filtered it out of `employee-orders-list`. So polling doesn't need to evaluate the union — backend already did. Polling just needs to call `removeOrder` after the two-miss confirmation.

**Polling's union rule for skip-on-add:**

```text
shouldSkipAdd = (
  serverRow.fOrderStatus === 8 ||
  serverRow.fOrderStatus === 9
)
```

This mirrors `handleNewOrder` / `handleScanNewOrder`. The running-orders endpoint normally filters these out server-side, but the FE defence-in-depth gate must be preserved.

**Table-status sync on polling-driven removal:** the socket handlers call `syncTableStatus(order, updateTableStatus, 'available')` for terminal removals (or `syncTableStatus(order, updateTableStatus)` to free-from-`tableStatus`-field for Hold cases). Polling **does not have the order object** when removing (the server response omitted it). The local row is in `ordersRef.current` — use the local copy to derive `tableId` and apply `updateTableStatus(tableId, 'available')`. For `fOrderStatus === 9` Hold/Park, keep the local row alive entirely (skip removal — the order is Holding, table stays occupied; if it eventually clears, we'll see it).

**Refined rule:** polling **never removes an order whose local copy shows `fOrderStatus === 9` (Hold/Park)**. Treat Hold orders as "live until socket says otherwise". Reduces risk of accidentally clearing Hold tables that backend transiently dropped.

---

### 4.11 Visual disruption rule

**Confirmed silent.** Polling routes through `addOrder` / `updateOrder` / `removeOrder` — the same OrderContext surface socket uses. Every visible behaviour today (card render, channel chip, station view, popup, snooze badge, paid badge, action buttons) is derived from `orders[]`. **Nothing new appears for the cashier**.

**Explicit "no new":**

| Surface | Polling adds? |
|---|---|
| Refresh banner | ❌ No |
| "Orders updated" toast | ❌ No |
| Notification sound | ❌ No |
| Loading overlay | ❌ No |
| New popup type | ❌ No |
| New UI indicator | ❌ No |
| Cashier interruption | ❌ No |

**Only visible side-effect:** the **existing** `ScanOrderPopOut` (DashboardPage.jsx:1426) opens for a newly-discovered web YTC order, **identical** to what `handleScanNewOrder` does today. This is allowed per locked owner direction.

**Suppressed state honoured.** `suppressed={Boolean(orderEntryType) || Boolean(cancelOrderEntry)}` — polling-driven web YTC additions defer popup display until the cashier closes the active modal. Same as socket today.

**Console logs allowed (per LOG-01).** Polling will emit `[OrderPolling][INFO]` / `[WARN]` / `[ERROR]` lines following the same format as `socketHandlers.js`. Not visible to cashiers; useful for ops debugging.

---

## 5. UpdatedAt / Fingerprint Decision

**Field used as the monotonicity guard:** `order.updatedAt` from `orderTransform.js:231`. Available across all order paths (socket inline payload, socket fetch-single-order, manual refresh, polling). Treated as best-effort: when present on both sides AND `local.updatedAt > server.updatedAt`, skip the update (stale-overwrite guard).

**Primary diff signal — fingerprint:**

```js
const fingerprint = (o) => [
  o.fOrderStatus,
  o.status,
  o.paymentStatus,
  o.paymentMethod || '',
  Number(o.amount || 0).toFixed(2),
  Number(o.subtotalAmount || 0).toFixed(2),
  Number(o.serviceTax || 0).toFixed(2),
  Number(o.tipAmount || 0).toFixed(2),
  Number(o.deliveryCharge || 0).toFixed(2),
  (o.items || []).length,
  (o.items || [])
    .map(it => `${it?.id ?? it?.foodId ?? ''}|${Number(it?.qty ?? it?.quantity) || 0}|${Number(it?.unitPrice ?? it?.price) || 0}|${(it?.variation ?? []).length}|${(it?.addOns ?? []).length}`)
    .sort()
    .join(';'),
  o.orderNote || '',
].join('||');
```

**Diff decision per `common` row:**

```text
if (fingerprint(server) === fingerprint(local)) → skip (no-op)
else if (local.updatedAt && server.updatedAt && local.updatedAt > server.updatedAt) → skip (stale poll)
else if (engagedOrdersRef.has(orderId)) → skip (cashier mid-edit)
else → updateOrder(orderId, server)
```

**Fallback when `updatedAt` is missing on either side:** rely on the fingerprint difference alone. The fingerprint is robust to socket-driven updates that don't shift `updated_at` (rare but theoretically possible).

---

## 6. Polling API Completeness Decision

**Verdict: safe for add / update / remove with two guardrails.**

| Operation | Safe? | Guardrail |
|---|---|---|
| `addOrder` | ✅ Yes | Apply web-order enrichment (§4.7) for orders where `!orderFrom && /web\|scan/i.test(orderIn)`. Skip-on-add if `fOrderStatus === 8 \|\| 9`. |
| `updateOrder` | ✅ Yes | Skip if engaged. Skip if stale `updatedAt`. Skip if `fOrderStatus === 8 \|\| 9` on incoming (defensive — should already be excluded by BE). |
| `removeOrder` | ✅ Yes | Require **two consecutive missing polls**. Skip if engaged. Skip entirely if local row `fOrderStatus === 9` (Hold/Park retention). |

**Endpoint payload completeness:** `fromAPI.order` produces every field the dashboard / cards / popup / OrderEntry / CollectPayment / station view / print consumers depend on. No field-drop risk from `updateOrder`'s full-row replace because the local row is itself a `fromAPI.order` output, so the shape is identical.

**Aggregator orders:** confirmed in scope. `getRunningOrders` returns the unified list; `fromAPI.order` handles aggregator and direct orders the same way. The dedicated `aggregator_order_${restaurantId}` channel events are caught by polling-as-safety-net the same as any other socket event.

---

## 7. Removal Safety Decision

**Decision: two consecutive missing polls before `removeOrder`.**

- Cycle 1 missing: increment `missCountRef.get(orderId) || 0` to 1. **Do not remove.**
- Cycle 2 missing (and still not engaged): call `removeOrder(orderId)` + `updateTableStatus(localRow.tableId, 'available')` (only if local row was a dine-in non-Hold). Delete from `missCountRef`.
- Order reappears in any subsequent poll → delete from `missCountRef` (reset).

**Special cases:**

- Engaged orders → no removal at all (defer entire decision).
- Local `fOrderStatus === 9` (Hold/Park) → no removal at all. Hold orders are expected to be retained on the dashboard until socket clears them.
- Local `fOrderStatus === 8` → never reaches `removeOrder` because polling skip-on-add prevents it from being in `orders[]` in the first place.

**Total worst-case removal latency vs socket:** ≤ 120 s (one cycle to record the first miss, one more to confirm). Acceptable because socket itself is removing terminal orders in real-time on the happy path. Polling is the safety net.

---

## 8. Polling Interval / Backend Load Decision

| Knob | Value | Rationale |
|---|---|---|
| `POLL_INTERVAL_MS` | **60 000** | Owner-stated conservative default. Easy to tune via constants block. |
| Mode | **Always-on while authenticated + tab visible** | Socket "connected" status doesn't guarantee event delivery. Always-on is the only mode that catches missed-event-on-connected-socket drift. |
| Visibility | **Pause on `visibilitychange → hidden`. Immediate poll on `visible`.** | No value polling for a background tab. Wake-recovery handled by visible kick. |
| Reconnect | **One immediate poll 1 s after socket disconnected→connected transition.** | Catches events lost during the disconnect window. 1 s delay lets backend flush in-flight events first. |
| Single-flight | **`isPollingRef` guard** | Prevents stacking if a poll outruns the next tick. |
| `POLL_TIMEOUT_MS` | **15 000** | Aborts hanging calls. |
| `POLL_VISIBLE_DEBOUNCE_MS` | **500** | Avoid double-fire on quick tab-switch. |
| `POLL_RECONNECT_DELAY_MS` | **1 000** | Documented above. |
| `POLL_FAIL_BACKOFF_MAX_MS` | **300 000** (5 min) | On consecutive failures, double 60 → 120 → 240 → 300; reset to 60 on first success. |

**Auth gate:** poll only when `isAuthenticated === true` (read via `useAuth()`).
**Restaurant gate:** poll only when `restaurant?.id` is truthy. Defensive — practically the token alone is enough, but checking `restaurant.id` ensures we don't poll during a brief auth-but-no-profile window.
**Role param:** `permissions?.[0] || 'Manager'` — same source `useRefreshAllData` uses. Honours the 2026-05-04 A0b ROLE-NAME-WIRE-FIX baseline.

---

## 9. Multi-Tab Decision

**Decision: every authenticated tab polls independently for v1. No tab-leader election.**

Rationale recap:
- `OrderContext.addOrder` dedupes intra-tab.
- Snooze is per-tab today (with socket); polling preserves this.
- Backend load is one GET/minute/tab — comfortably within capacity even at 1,000-tenant × 20-tab worst case.
- Tab-leader election (e.g., BroadcastChannel-based) costs material complexity (leader handover, role drift, race conditions) for a small load saving.

**Defer:** revisit only if (a) backend reports observable load attributable to polling, or (b) owner specifically requests one-poll-per-restaurant.

---

## 10. Popup / Snooze Decision

**Decision: the existing `ScanOrderPopOut` carries the entire popup contract. Polling does NOT call popup APIs.**

Polling's only popup-relevant action is to `addOrder` with the right shape:
1. Run the order through `fromAPI.order` (already done by `getRunningOrders`).
2. If `!order.orderFrom && /web|scan/i.test(order.orderIn || '')`, set `order.orderFrom = 'web'; order.isWebOrder = true;` (mirrors `handleScanNewOrder` L508-511).
3. Call `addOrder(order)`.

The popup picks it up automatically via the `isUnconfirmedScanOrder` predicate. Snooze (both dashboard `snoozedOrders` Set and popout-local `popOutSnoozeHideSet` Map) is honoured downstream of the `orders[]` flow — polling never touches either.

**Same-order socket+polling collision:** `addOrder`'s `exists` short-circuit prevents the popup queue from ever seeing a duplicate.

**Suppressed state:** `suppressed={Boolean(orderEntryType) || Boolean(cancelOrderEntry)}` honoured — polling-added orders flow into `orders[]` but the modal stays hidden during active workflows.

**No new sound.** Confirmed — `ScanOrderPopOut` does not call `soundManager`. The FCM-driven sound path is independent of `OrderContext` mutations.

---

## 11. Engaged Order Decision

**Definition (per scrutiny §4.8):** "engaged" = `engagedOrdersRef.current.has(orderId)` is `true`.

**Polling behaviour for engaged rows:**

| Action | If engaged |
|---|---|
| `addOrder` | N/A — engaged means already in `orders[]`, so this is a `common` not a `new` |
| `updateOrder` | **Skip** entirely. Defer to next cycle. |
| `removeOrder` (after two misses) | **Skip** entirely. Do NOT increment `missCountRef` for engaged rows. Defer the entire removal decision to next cycle after engage releases. |

**Rationale:** engage is the project's existing mid-mutation lock. Polling must respect it to avoid stale-overwrite-while-cashier-edits failures.

---

## 12. Socket Reconnect Decision

**Trigger source:** `useSocketStatus().isConnected` (from `SocketContext.jsx:224-227`).

**Detect the edge:**

```js
const prevConnectedRef = useRef(isConnected);
useEffect(() => {
  if (prevConnectedRef.current === false && isConnected === true) {
    // edge: disconnected → connected
    const t = setTimeout(() => pollOnce(), POLL_RECONNECT_DELAY_MS);
    return () => clearTimeout(t);
  }
  prevConnectedRef.current = isConnected;
}, [isConnected]);
```

**Flap protection:** the cleanup in the `useEffect` clears the pending kick if the edge re-fires (rapid disconnect/reconnect cycles). Worst-case one extra poll per stable reconnect.

**No multiple extra polls per reconnect attempt:** the single-flight guard (`isPollingRef`) covers any pathological case.

---

## 13. Terminal Status Parity Decision

**Removal triggered by polling (after two consecutive misses):**

| Server-side cause | Mirror? |
|---|---|
| Backend dropped row from `employee-orders-list` because `status === 'paid'` (fOrderStatus 6) | Yes — `removeOrder` + free table |
| Backend dropped row because `status === 'cancelled'` (fOrderStatus 3) | Yes — `removeOrder` + free table |
| Backend dropped row because `fOrderStatus === 9` (Hold/PayLater settle) | **Do not remove via polling.** Wait for socket. Local Hold rows stay until socket `update-order-paid` (PayLater settle, frees table) or `update-order-status` (Hold-clear, keeps table 'occupied'). |
| Backend dropped row because `fOrderStatus === 8` | Should already not be in local `orders[]` (skip-on-add gate). If somehow present, the two-miss removal will fire. Defensive only. |

**Skip-on-add (mirror `handleNewOrder`/`handleScanNewOrder` L185-188 / L494-497):** never `addOrder` an incoming row with `fOrderStatus === 8` or `9`. Log INFO and continue.

**Table-status sync on polling-driven removal:**
- For terminal status (3 or 6) → derive `tableId` from local row, call `updateTableStatus(tableId, 'available')`. Mirrors `syncTableStatus(order, updateTableStatus, 'available')` in socket handler.
- For Hold cases → never reached (polling won't remove Hold).

**Combined removal predicate (after two misses):**

```text
canPollingRemove(localRow) =
  !engagedOrdersRef.has(localRow.orderId) &&
  localRow.fOrderStatus !== 9
```

If the row was missing for two cycles AND not engaged AND not Hold → `removeOrder` + free its table. Otherwise hold for another cycle.

---

## 14. No Visual Disruption Decision

**Confirmed silent.** Locked owner direction is fully respected.

No new UI, no new toast, no new banner, no new sound, no loading overlay, no refresh indicator. The only visible side-effect allowed (and required) is the existing `ScanOrderPopOut` for newly discovered web YTC orders — identical to what `handleScanNewOrder` does on the socket path today.

**Validation: any UI surface that today reacts to a socket-driven `addOrder` / `updateOrder` / `removeOrder` will react identically to the polling-driven version because they share the same `OrderContext` dispatch surface.**

---

## 15. Final Recommended Implementation Scope

**Single new file + one wiring line. Surgical scope.**

### 15.1 New hook (recommended location: `/app/frontend/src/hooks/useOrderPollingReconciliation.js`)

Responsibilities (in execution order):

1. Read auth state (`useAuth() → { isAuthenticated, permissions }`), restaurant state (`useRestaurant() → restaurant?.id`), socket state (`useSocketStatus() → { isConnected }`), order state (`useOrders() → { orders, ordersRef internally via context, addOrder, updateOrder, removeOrder, engagedOrders /* set; ref derived */ }`).
   - Note: `ordersRef` and `engagedOrdersRef` are not currently part of the public OrderContext value surface. To avoid stale-closure reads in the poll function, the polling hook must read from `orders` and `engagedOrders` via the live state (functional setters and `useRef`-mirror within the hook for the diff snapshot).
2. Define constants (`POLL_INTERVAL_MS = 60_000`, etc. per §8).
3. Setup `setInterval` to call `pollOnce()` while gates are open (authenticated + visible + restaurant known).
4. Setup `visibilitychange` listener.
5. Setup socket-reconnect edge detector.
6. `pollOnce()` function:
   - Single-flight guard (`isPollingRef`).
   - `await orderService.getRunningOrders(roleParam)` with 15 s `AbortController` timeout.
   - Build `serverIds`, `localIds`, diff into `new` / `removed` / `common`.
   - For each `new` order:
     - Skip if `fOrderStatus === 8 || 9` (log INFO + continue).
     - If `!order.orderFrom && /web|scan/i.test(order.orderIn || '')` → set `order.orderFrom = 'web'; order.isWebOrder = true;`.
     - Call `addOrder(order)`.
   - For each `removed` local row:
     - Skip if engaged OR `fOrderStatus === 9` (Hold).
     - Bump `missCountRef.get(orderId) || 0` to 1.
     - If `missCountRef.get(orderId) >= 2` → call `removeOrder(orderId)`, free its table via `updateTableStatus(localRow.tableId, 'available')` when applicable, delete `missCountRef` entry.
   - For each `common` pair:
     - Skip if engaged.
     - Skip if fingerprints match.
     - Skip if `local.updatedAt > server.updatedAt` (both present).
     - Otherwise `updateOrder(server.orderId, server)`.
   - Reset `missCountRef` entries for orders present in `serverIds`.
   - On success: reset failure counter.
   - On catch: bump failure counter; apply exponential backoff (60 → 120 → 240 → 300).
7. Returns nothing (side-effect-only hook). Optional debug object for tests.

Estimated size: ~180 lines including comments and constants.

### 15.2 Wiring

Single import + single hook call. Recommended location: just after the other top-level dashboard hooks in `DashboardPage.jsx` (around the existing context-consumer section). Alternatively, lift the hook one level higher into `AppProviders.jsx` so it survives intra-app navigation — but `DashboardPage.jsx` is the only POS-active screen today, and the auth/restaurant gates inside the hook itself make placement-flexibility a non-issue.

### 15.3 NOT changed

- `OrderContext.jsx` — no API surface additions needed. The hook consumes existing `addOrder` / `updateOrder` / `removeOrder` / `engagedOrders`. **(One small ergonomic improvement is possible: expose `ordersRef` and `engagedOrdersRef` from the context value to avoid the hook re-mirroring state — but this is optional and additive, not corrective.)**
- `socketHandlers.js`, `socketEvents.js`, `useSocketEvents.js`, `socketService.js`, `SocketContext.jsx` — untouched.
- `ScanOrderPopOut.jsx` — untouched. Popup picks up polling-added orders automatically.
- `DashboardPage.jsx` popup wiring, snooze logic, manual Refresh — untouched.
- `orderService.js`, `orderTransform.js` — untouched.
- Backend — untouched.
- All financial / payment / print / room / station logic — untouched.

---

## 16. Files Proposed To Change

| File | Operation | Why |
|---|---|---|
| `/app/frontend/src/hooks/useOrderPollingReconciliation.js` | **NEW** | The polling hook itself (~180 lines). |
| `/app/frontend/src/pages/DashboardPage.jsx` | **EDIT** (one import + one hook call, ~2 lines net) | Mount the polling hook on the POS-active screen. |

**Optional (recommended but not required):**

| File | Operation | Why |
|---|---|---|
| `/app/frontend/src/contexts/OrderContext.jsx` | **EDIT** (add `ordersRef` and `engagedOrdersRef` to the exposed `value`, ~2 lines) | Avoid re-mirroring state inside the polling hook. Strictly additive. Existing consumers unaffected. **Defer unless owner approves.** |

**Total: 1 new file + 1 edited file (2 if owner approves the optional ref exposure).**

No backend changes. No transform changes. No socket changes. No popup changes. No new sound. No new UI.

---

## 17. Regression Risks

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| **Duplicate popups in same tab** | Eliminated by design | — | `OrderContext.addOrder` dedupes by `orderId`; popup queue is a `useMemo` over `orders[]`; same row appears once. |
| **Duplicate popups across tabs** | Already today's behaviour with socket | — | Multi-tab parity — not a polling regression. |
| **Duplicate notification sounds** | None | — | `soundManager` is not invoked from `addOrder`. FCM/push path is separate. |
| **Backend load** | Low | Low | Conservative interval (60 s) + visibility-pause + single-flight + exponential backoff. Net: 1 call/min/tab. |
| **Stale overwrite (older poll arrives after newer socket event)** | Low | Low | `updatedAt` monotonicity guard skips writes when local is newer. Even without it, next poll self-heals within 60 s. |
| **Active OrderEntry / payment / cancel modal conflict** | Low | Medium | Engaged-row skip for `updateOrder` and `removeOrder`. New web orders still flow into `orders[]` for the popup to pick up — but `suppressed={Boolean(orderEntryType) \|\| Boolean(cancelOrderEntry)}` (DashboardPage.jsx:1434) hides the popup until modal closes. **No cashier interruption.** |
| **Terminal order removal mismatch** (BE dropped due to role filter / transient quirk) | Low | High if happens | **Two-miss removal rule** + skip engaged + skip Hold (`fOrderStatus === 9`). Adds ≤ 60 s removal latency in exchange for resilience. |
| **Snooze conflict** | None | — | Snooze sets are intra-tab and downstream of `orders[]` filter. Polling never touches them. |
| **Status-jump / movement interaction** (Phase-3 dashboard re-flow) | None | — | Polling-driven `updateOrder` is identical to socket-driven `updateOrder`. Downstream logic identical. |
| **Multi-tab polling load** | Low | Low | One call/min/tab. Defer tab-leader election to v2. |
| **Web order missed by polling** (BE returned without `order_from='web'`) | Mitigated | Medium | Polling mirrors `handleScanNewOrder`'s `orderFrom` enrichment using `order_in` as proof-of-origin (see §4.7). |
| **Hold order accidentally cleared by polling** | Mitigated | High if happens | Polling never removes orders whose local copy is `fOrderStatus === 9`. Hold is socket-only. |
| **Polling-added order in OrderEntry-engaged state** | Cannot happen | — | Engaged means already in `orders[]`. New orders are by definition not engaged. |
| **`useUpdatedAt` race during quick edits** | Low | Low | Even without `updatedAt`, fingerprint difference self-heals on next cycle. |
| **Aggregator order missed by polling** | Low | Medium | Confirmed `getRunningOrders` returns aggregator orders too. Same dispatch path. |
| **Split-order parent/child confusion** | None | — | Polling diffs by `orderId`; each split child has its own `orderId`. |
| **Restaurant switch mid-session** | N/A today | — | Single-tenant per session; not a current risk. |
| **Hot-reload / StrictMode double effect** | Low | Low | `isPollingRef` single-flight guard; `useEffect` cleanup clears timers. |

---

## 18. QA Checklist

Mirrors the 20-item list in `ORDER_POLLING_RECONCILIATION_INVESTIGATION.md` §15, plus four additions covering the scrutiny corrections:

| # | Test | Pass criterion |
|---|---|---|
| 1 | Socket-working normal new order | Socket fires, polling does not duplicate; order appears once. |
| 2 | Socket-missed `update-order` for one order | Within 60 s, polling catches the change via fingerprint; `updateOrder` fires. No banner / toast / sound. |
| 3 | Socket-missed `new-order` (POS-origin) | Within 60 s, polling adds the new order silently. No popup (it's POS-origin, not web). |
| 4 | Socket-missed `scan-new-order` (web YTC) | Within 60 s, polling adds the new web YTC order; existing `ScanOrderPopOut` opens. Single popup, no double. |
| 5 | Socket + polling for same web order | `addOrder` exists-check short-circuits; popup queue shows one entry. |
| 6 | Edited order without socket fire (quantity change) | Within 60 s, fingerprint differs; `updateOrder` fires; cart-line / amount reflect new state. |
| 7 | Paid order without socket fire | Cycle 1: missing → bump `missCountRef`. Cycle 2: still missing → `removeOrder` + free table. |
| 8 | Snoozed web order during polling | Snoozed order stays in `orders[]`; popup queue filter excludes it; **no re-pop**. Snooze respected through polling cycles. |
| 9 | Polling API failure (BE 500) | `console.warn`; backoff doubles (60 → 120 → 240 → 300); recovery resets to 60 s. POS UI unaffected. |
| 10 | Browser sleep / wake | `visibilitychange → visible` triggers immediate poll + resumes 60 s timer. Backlog catches up in one cycle. |
| 11 | OrderEntry open on order X, status change on order Y | Order Y updated silently. Order X (engaged) skipped. Cashier saves X; engage releases; X reconciles on next cycle. |
| 12 | Manual Refresh + polling | Manual Refresh wins (full replace). Polling timer optionally resets so next tick is 60 s after manual. |
| 13 | DevTools confirms no new endpoints | Only `GET /pos/employee-orders-list` fires periodically. No new URLs. |
| 14 | Tab hidden then visible | `setInterval` cleared on hidden; single immediate poll on visible; periodic resumes. |
| 15 | Socket reconnect after 30 s disconnect | Within ~1 s of `connected`, one extra `getRunningOrders` fires. Periodic continues thereafter. |
| 16 | Stale-overwrite test | Slow poll (10 s); fresh socket update arrives mid-flight. Stale poll's row does NOT downgrade the newer socket row (via `updatedAt` guard). |
| 17 | High-frequency new web orders (5 in 30 s) via polling-only | All 5 added; popup queue shows "Order 1 of 5" with Next/Prev navigation. |
| 18 | Aggregator order via polling-only | Added correctly via `addOrder`; channel chip + dashboard column reflect aggregator origin. |
| 19 | Single-flight guard | Force 90 s poll latency; next 60 s tick is skipped (logs "skipped — in-flight"). |
| 20 | Non-order surfaces unaffected | Tables / Categories / Products / Popular / Cancellation Reasons not refetched by polling. Manual Refresh still covers them. |
| **21 (added)** | **Hold order retention** | Drop `fOrderStatus === 9` order from socket emit. Polling does NOT remove it across two cycles; row stays on dashboard until socket clears. |
| **22 (added)** | **Fingerprint catches variation/add-on edit** | Edit an item's variation without changing line price. Within 60 s, fingerprint differs (variation count or items-hash); `updateOrder` fires. |
| **23 (added)** | **Web-order enrichment fallback** | Backend returns running-order row with `order_in='scan'` but `order_from=null`. Polling-driven add sets `orderFrom='web'`; popup opens. |
| **24 (added)** | **Two-miss removal protects against transient BE blip** | Force backend to return an empty list once (followed by normal list on next cycle). Polling does NOT remove any order. Subsequent cycles confirm rows still alive. |
| **25 (added)** | **No new UI / toast / banner / sound** | Audit pass: walk every reconciliation-driven `addOrder` / `updateOrder` / `removeOrder` call site. Verify ONLY `OrderContext` mutations occur. No `toast`, no `Banner`, no `soundManager`, no overlay rendered. |

---

## 19. Open Questions

| # | Question | Recommendation | Blocker? |
|---|---|---|---|
| OQ-1 | Does `employee-orders-list` (the running-orders endpoint) reliably set `order_from='web'` for web/scan orders today? Static read of code only — wire trace pending. | If reliable, the enrichment fallback in §4.7 is defensive overhead but harmless. If unreliable, the fallback is load-bearing. **Recommend a single live-preprod wire trace** during the QA cycle to confirm — owner-side, 5-minute check via DevTools Network panel filtering on a web order. | Non-blocking (the FE fallback is safe either way). |
| OQ-2 | Is `employee-orders-list` ever paginated, or does it always return the full running set? | Static read shows FE calls it with no `limit/offset` — assumes full set. **Recommend confirming with backend.** If paginated, polling needs explicit `limit=999`-style guard. | Non-blocking but worth confirming. |
| OQ-3 | Owner preference: continue polling while OrderEntry is open (engaged-row skip), or pause polling entirely (parity with manual Refresh button)? | Recommend **continue with engaged-row skip** — new web orders still surface for the popup to display when OrderEntry closes. Manual Refresh's full-pause is because it does full-replace; our diff approach is per-orderId and safe. | **Owner decision recommended.** Default to continue-with-skip. |
| OQ-4 | Should `OrderContext` expose `ordersRef` and `engagedOrdersRef` publicly to simplify the polling hook? | Recommend **yes (additive)** — strictly expanding the public surface, no existing consumer affected. Polling hook reads them directly instead of re-mirroring. | Non-blocking — polling can re-mirror locally if owner prefers to keep `OrderContext` surface narrow. |
| OQ-5 | Initial telemetry — should the first ship window log every poll cycle for verification? | Recommend **yes for first 1–2 weeks** at INFO level. Owner flips to silent after stability is confirmed. | Non-blocking. |
| OQ-6 | Tab-leader election timeline — keep as future v2 enhancement? | Yes. Out of scope for v1. Revisit only if backend load becomes observable. | Non-blocking. |

---

## 20. Strict-Rules Compliance Certification

| Rule | Status |
|---|---|
| Scrutiny / planning only — no code change | ✅ |
| No commits | ✅ |
| No backend change | ✅ |
| No popup redesign | ✅ |
| No new UI | ✅ |
| No new sound | ✅ |
| Accept / Reject / View / Snooze behaviour unchanged | ✅ |
| Order status business logic unchanged | ✅ |
| `/app/memory/final/*` untouched (read-only consultation) | ✅ |
| Single new file + one wiring line scope preserved | ✅ |
| Locked owner direction (silent reconciliation) honoured | ✅ |

---

— End of Order Polling Reconciliation Scrutiny and Fix Plan —
