# Web Order Snooze Investigation

> SCOPE: Investigation only. No code changed. No backend touched.
> SOURCE OF TRUTH: only the current code in `/app/frontend`.

---

## 1. Summary

The "Snooze 5m" button in the **Web / Scan & Order — Awaiting Confirmation** popup is wired and partially working as designed by the locked Phase 4 contract (see header comment in `ScanOrderPopOut.jsx`, lines 1–36):

- Clicking it **does** call a real handler.
- It **does** close (hide) the popup for the current order.
- It **does** schedule a 5-minute `setTimeout` so the same order re-pops after exactly 5 minutes.
- It **does** dim the order card on the dashboard (via the shared `toggleSnooze` Set).

But the "snooze" is **purely in-memory inside the `ScanOrderPopOut` component instance**. There is **no backend, no localStorage/sessionStorage, no OrderContext write**. As a result, the most common ways users perceive "snooze not working" are all real failure modes:

1. **Page reload / hard refresh** → snooze is forgotten, the same order re-pops immediately.
2. **Navigating away from `/dashboard` and back** → `ScanOrderPopOut` unmounts, its cleanup effect clears all `setTimeout` handles, and the in-memory hide-set is dropped → same order re-pops immediately.
3. **Background tab** → browser throttles `setTimeout`; reopen may fire late, far past 5 min.
4. **A momentary `refreshOrders()` round-trip that does NOT return the order** (transient network/race) → the cleanup `useEffect` (lines 202–223) deletes the snooze entry; if the order comes back in a later refresh while still YTC, the popup re-pops immediately, well before the 5-minute mark.
5. **Visual mismatch** — the dashboard `snoozedOrders` Set added by the popup is **never auto-cleared** (only the popout-local Map auto-clears in 5 min). Users see the card still dimmed/orange `BellOff` long after the popup reopens.
6. **Toggle semantics** — the shared dashboard handler is `toggleSnooze` (not `setSnoozed`). If the order was already in the dashboard snooze set (e.g. user previously snoozed it from the card), clicking Snooze in the popup will silently **REMOVE** it from the dashboard set while still adding a popout-local 5-min hide. The visual "Snooze" state flips inconsistently.

No backend / no API for snooze exists. Snooze is **frontend-only**.

---

## 2. Files / Components Involved

### Popup component
- **File:** `src/components/dashboard/ScanOrderPopOut.jsx`
- **Component:** default export `ScanOrderPopOut`
- **Lines of interest:**
  - L38–L48 — imports and constants. `POPOUT_SNOOZE_MS = 5 * 60 * 1000`.
  - L43–L44 — predicate `isUnconfirmedScanOrder`: `order.orderFrom === 'web' && order.fOrderStatus === 7`.
  - L147–L156 — props: `orders`, `snoozedOrders`, `onToggleSnooze`, `onAccept`, `onReject`, `onEdit`, `currencySymbol`, `suppressed`.
  - L160 — local state: `popOutSnoozeHideSet` (`Map<orderIdStr, expiryEpochMs>`).
  - L161 — local ref: `timerRefs` (`Map<orderIdStr, timeoutHandle>`).
  - L164–L170 — unmount cleanup: clears ALL pending setTimeout handles.
  - L174–L184 — derived `queue` (filters by predicate + excludes ids in `popOutSnoozeHideSet`, sorted FIFO by `createdAt`).
  - L186–L197 — `currentIndex` and clamp effect.
  - L202–L223 — housekeeping `useEffect` (removes hide entries for orders that left YTC; also clears their timer).
  - **L225–L254 — `handleSnoozeClick`** — the actual snooze handler.
  - L297–L298 — `if (suppressed) return null; if (queue.length === 0) return null;`.
  - L310–L356 — header / "Order N of M" indicator (`L350–L354`).
  - L630–L644 — the "Snooze 5m" button, `data-testid={popout-snooze-btn-${idStr}}`.

### Mount / wiring
- **File:** `src/pages/DashboardPage.jsx`
- **Lines of interest:**
  - L417 — `const [snoozedOrders, setSnoozedOrders] = useState(new Set());` (dashboard-wide in-memory Set).
  - L1172–L1182 — `toggleSnooze(orderId)`: toggles membership (NOT idempotent add).
  - L1463–L1472 — `<ScanOrderPopOut ... onToggleSnooze={toggleSnooze} ... suppressed={Boolean(orderEntryType) || Boolean(cancelOrderEntry)} />`.
  - L1466 — `onToggleSnooze={toggleSnooze}` (same handler used by `OrderCard`, `DineInCard`, etc.).

### Order data origin (popup feed)
- **File:** `src/contexts/OrderContext.jsx` — single in-memory `orders` array.
  - L21–L26 — `setOrders(...)` (used on initial load and on every `refreshAllData()` run).
  - L36–L39 — `refreshOrders(roleName)` calls `orderService.getRunningOrders` and replaces the full array.
  - L87–L107 — `addOrder(...)` dedupes by `orderId` and updates in place.
- **File:** `src/api/socket/socketHandlers.js`
  - L470–L518 — `handleScanNewOrder`: fires on FCM/socket event `scan-new-order`. Fetches the order via REST, calls `addOrder(order)`. Lines 498–511 force `order.orderFrom = 'web'` and `isWebOrder = true` if backend omitted them (POS2-002-P4-FU-01 enrichment).
- **File:** `src/hooks/useRefreshAllData.js`
  - L1–L48 — On manual "Refresh" button, calls `setOrders(freshOrders)` — replaces the whole array.

### Other components that consume `snoozedOrders` / `toggleSnooze`
- `src/pages/DashboardPage.jsx` lines 132, 1575, 1580, 1619–1620, 1651–1652, 1700, 1708, 1732, 1740, 1760, 1768 — all read `snoozedOrders.has(...)` and pass `toggleSnooze` to card components (`DineInCard.jsx`, `OrderCard.jsx`, etc.).

### Tests (documented intended behavior)
- `src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx`
  - T-8 (L158) — Snooze closes the popup immediately.
  - T-9 (L175) — Snoozed order reappears at exactly 5:00.
  - T-10 (L197) — Status-flip out of YTC removes the order regardless of snooze.
  - T-2 (L303) — Popup hides when only order is in popout-local hide-set.
  - A-3 (L419) — Snooze MUST NOT touch localStorage / sessionStorage.
  - A-4 (L434) — Snooze MUST NOT mutate `order.fOrderStatus`.

### Storage keys
- None. There is **no** localStorage / sessionStorage / IndexedDB key for snooze. Confirmed by `grep -rn -i "snooze" src/api` → 0 hits and by the locked contract comment in `ScanOrderPopOut.jsx` lines 14–17.

---

## 3. Current Popup Trigger Flow

End-to-end from incoming web order to popup render:

1. **Customer places order via Scan & Order (QR/web).** Backend creates an order with `f_order_status = 7` (YTC) and emits FCM/socket event `scan-new-order` carrying `[scan-new-order, order_id, restaurant_id, f_order_status]`.
2. **Socket layer receives the event:**
   - `src/api/socket/useSocketEvents.js` L25, L90 → dispatches to `handleScanNewOrder` (`socketHandlers.js` L470).
3. **`handleScanNewOrder`:**
   - Parses the message → `orderId`.
   - REST-fetches the full order via `fetchOrderWithRetry(orderId)` (single-order-new endpoint).
   - Hold-status guard: if `fOrderStatus === 8 || 9`, returns silently (audit-hold lane).
   - Channel-arrival enrichment: if `order.orderFrom` is missing, sets it to `'web'` (L508–L511). This is what makes the popup predicate match.
   - Calls `addOrder(order)` (OrderContext) and `syncTableStatus(order, updateTableStatus)`.
4. **OrderContext:**
   - `addOrder` (L87–L107) inserts new or replaces existing same-`orderId`, then updates `ordersRef.current` for polling consumers.
5. **DashboardPage:**
   - Subscribes via `useOrders().orders` (`DashboardPage.jsx` L175–L178), passes `orders` directly into `<ScanOrderPopOut orders={orders} ... />` (L1464).
6. **`ScanOrderPopOut` derives `queue`:**
   - `queue = orders.filter(orderFrom === 'web' && fOrderStatus === 7).filter(not in popOutSnoozeHideSet).sort(by createdAt asc)` (L174–L184).
   - If `queue.length > 0` and `suppressed === false`, renders the green dialog with header "New Web Order — Awaiting Confirmation", `Order N of M`, body, and action row.

Note — there is **no setInterval polling** for orders anywhere in `src/` (verified by `grep`). The order list is updated only by: (a) initial load (`LoadingPage.jsx` L325 → `setOrders(...)`), (b) socket events (`handleScanNewOrder`, `handleNewOrder`, `handleUpdateOrder`, `handleDeliveryAssignOrder`, …), (c) manual "Refresh" button (`useRefreshAllData` → `setOrders`), (d) `refreshOrders()` invoked inline from `OrderEntry.jsx` L2145.

---

## 4. Current Snooze Button Flow

Button JSX — `ScanOrderPopOut.jsx` L630–L644:

```jsx
<button
  data-testid={`popout-snooze-btn-${idStr}`}
  onClick={() => handleSnoozeClick(activeOrder.orderId)}
  ...
>
  {isUnderlyingSnoozed ? <BellOff/> : <Bell/>} <span>Snooze 5m</span>
</button>
```

`isUnderlyingSnoozed` (L304–L305) = `snoozedOrders.has(idStr)` — read-only mirror of the **dashboard-wide** snooze Set.

`handleSnoozeClick(orderId)` — L225–L254 — does, in order:

1. `idStr = String(orderId)` (L227).
2. **Calls the shared dashboard handler** `onToggleSnooze(idStr)` (L230–L232). This is `DashboardPage.toggleSnooze` (L1172–L1182), which **toggles** membership: if `idStr` is already in `snoozedOrders` → removes it; otherwise adds it. (This is shared with `OrderCard`/`DineInCard` snooze toggles.)
3. **Adds the order to the popout-local hide Map** with expiry = `Date.now() + 5*60*1000` (L234–L238). `popOutSnoozeHideSet.set(idStr, expiryMs)`.
4. **Schedules a `setTimeout`** for 5 minutes (L240–L251) that:
   - On fire: deletes `idStr` from the hide Map (so the order re-enters the `queue` and popup re-shows the same order).
   - Defensively clears any prior pending timer for the same `idStr`.

Effect on the UI:
- The derived `queue` recomputes (memoised on `[orders, popOutSnoozeHideSet]`). The snoozed order is filtered out.
- If it was the only order in the queue, `queue.length === 0` → component returns `null` at L298 → popup disappears.
- If there are siblings, the next remaining web-YTC order takes its slot (subject to `currentIndex` clamp at L188–L197).

After exactly `POPOUT_SNOOZE_MS` ms (L48 = 300_000 ms = 5 min):
- The timer's callback removes the entry from the hide Map (L243–L249).
- `queue` recomputes → if the order is still `orderFrom==='web' && fOrderStatus===7` in `OrderContext`, it re-enters the queue → popup renders again.
- `timerRefs.current.delete(idStr)` removes the handle.

No write to localStorage / sessionStorage / IndexedDB / backend. No mutation of `order.fOrderStatus`. No call to OrderContext beyond reading `orders`.

---

## 5. Expected Behavior Inferred From Code

From the code + tests (locked owner contract in the header comment + T-2/T-8/T-9/T-10/A-3/A-4 in `ScanOrderPopOut.test.jsx`):

When user clicks **Snooze 5m** in the popup, the code intends:

| Question | Code's intent |
|---|---|
| Hide ONLY the current order's popup view? | **Yes** (filter in `queue`). |
| Hide ALL web order popups? | **No** — only this `orderId`. |
| Move the order to the back of queue? | **No** — it is removed for 5 min. Other orders shift up by FIFO. |
| Keep the order pending but stop showing modal temporarily? | **Yes** — order stays in `OrderContext` at status 7. |
| Show the same order again after 5 minutes? | **Yes** — `setTimeout(POPOUT_SNOOZE_MS)` re-enables it. |
| Keep the order visible on the dashboard? | **Yes** — the dashboard card stays; `isSnoozed` Set just dims it (`opacity-60` in `DineInCard.jsx` L47). |
| Persist snooze after refresh? | **No** — explicitly in-memory (locked contract L14–L17 + A-3 test). |
| Persist snooze across tabs/devices? | **No** — no shared storage. |
| Update backend order status? | **No** — A-4 test guards this. |

If the user-visible business expectation is anything different from the above table, the code does not implement it. The locked contract treats Snooze as a **PRESENTATION-ONLY temporary hide of the attention overlay**, not a workflow state.

---

## 6. Actual Behavior Observed

Reasoned from code (no live web-order traffic was available to physically click through during this investigation; behaviour traced through code paths + Jest tests):

| Case | Behavior |
|---|---|
| **A — Single web order, click Snooze 5m** | Popup closes immediately (queue length = 0). Underlying card dims on dashboard (`snoozedOrders` Set adds the id). After 5 min the same popup reopens with the same order. Matches T-9. |
| **B — Multiple web orders, snooze the first** | First order is removed from `queue`. `currentIndex` clamps to remain valid (L188–L197). Header re-renders as "Order 1 of N-1". Other orders not affected. After 5 min, the snoozed one returns to the queue. The user may see it appear behind the currently-displayed order, position determined by `createdAt` FIFO sort. |
| **C — Snooze, then hard refresh the page** | `ScanOrderPopOut` is unmounted → its cleanup `useEffect` at L164–L170 calls `clearTimeout` on all pending handles and `popOutSnoozeHideSet` is discarded with the React state. On mount, `LoadingPage` calls `setOrders(data.runningOrders)`; the order is still status 7 → popup pops **immediately**. Snooze is forgotten. (Locked contract intent — but reads as broken to users.) |
| **D — Snooze, then auto-refresh from socket / `refreshAllData`** | `addOrder` / `setOrders` updates the array. The popout's hide-set still holds the `orderId` (Map persists for the component lifetime) → order stays hidden. **Caveat:** if a transient refresh response omits the order (race, partial response), the housekeeping effect at L202–L223 deletes the hide-set entry. If the order is included in a subsequent refresh while still YTC, the popup reopens immediately (well before 5 min). |
| **E — Snooze, then later Accept/Reject from the popup or card** | Accept (`handleConfirmOrder`) hits backend; on the resulting socket update, `fOrderStatus` changes → the order falls out of the YTC predicate → housekeeping effect at L202–L223 removes its hide-set entry and cancels its setTimeout. No stale popup. T-10 covers this. Reject opens `CancelOrderModal` (suppresses the popout via `cancelOrderEntry`); after confirm, the order is removed from `OrderContext` (`removeOrder`) and likewise drops out cleanly. |

Additional observed mismatch (not in tests):

- After a Snooze click, the dashboard-wide `snoozedOrders` Set is populated but is **never auto-cleared**. The 5-minute timer ONLY clears the popout-local Map. So the underlying card shows the "snoozed" dim/`BellOff` state indefinitely — it diverges from the popup's behavior after the popup-side 5 min auto-clear.

---

## 7. Root Cause

The Snooze button is **functionally wired correctly per the locked Phase 4 contract**. There is no missing `onClick`, no stale closure, no id-mismatch, no broken timer cleanup. The "not working correctly" complaint is most likely driven by one or more of these by-design / edge-case behaviors:

1. **Volatility — in-memory only.** `popOutSnoozeHideSet` lives on the React component instance. Any hard refresh, route change away from `/dashboard`, or component remount loses the snooze. Locked contract `ScanOrderPopOut.jsx` L14–L17. (Most likely cause of perceived bug.)

2. **Transient-refresh edge case.** Housekeeping `useEffect` at L202–L223 deletes a snooze entry whenever the snoozed `orderId` is not present in the latest `orders` list. A single momentary absence from a refresh response (network race, partial payload) silently kills the snooze — the next refresh re-adds the order in YTC status and the popup re-pops well before 5 minutes.

3. **`toggleSnooze` (not `addSnooze`) for the dashboard set.** Because `handleSnoozeClick` reuses the shared `toggleSnooze` handler from `DashboardPage`, clicking Snooze on an order that was already snoozed (e.g. from the underlying card) will REMOVE it from the dashboard set, while still adding a 5-min popout-local hide. This causes UI inconsistency: the card "un-dims" while the popup is hidden, then the popup re-pops after 5 min with `BellOff` icon flipped to `Bell` (since `isUnderlyingSnoozed` is now false).

4. **Dashboard `snoozedOrders` never auto-clears.** Only the popout-local Map has a 5-min timer. The card's dimmed visual outlives the popup hide.

5. **`setTimeout` throttling.** When the POS tab is backgrounded, browsers throttle `setTimeout` to ≥ 1 s / minute. The 5-min reopen may fire much later than expected.

6. **No persistence across devices / tabs / users.** A second POS terminal (or another tab) is unaware of the snooze; the popup will pop there independently.

None of these are caused by a broken handler. They are consequences of the locked "presentation-only, in-memory" design.

---

## 8. Backend / API Dependency

**Snooze is frontend-only currently.**

Verified by `grep -rn -i "snooze" src/api` → 0 matches. No `defer`, no `hold`, no `pause`, no `reminder` endpoint exists for web/scan orders.

The only backend interaction near the popup is:
- `handleConfirmOrder` → calls `confirmOrder(...)` (Accept).
- `handleCancelOrderFromCard` → opens `CancelOrderModal` → on confirm, `PUT API_ENDPOINTS.ORDER_STATUS_UPDATE` (Reject).
- `handleTableClick` → opens `OrderEntry` (View).

The "Snooze 5m" path does **not** call any backend endpoint. There is no server-side notion of a snoozed web order.

---

## 9. Edge Cases

| Edge case | Current code outcome |
|---|---|
| Multiple web YTC orders queued, snooze second one | First and third remain; second removed from queue and timed for 5-min reopen. `currentIndex` clamp keeps view valid (L188–L197). FIFO ordering by `createdAt` preserved. |
| Snooze then hard refresh | Snooze lost. Same order re-pops immediately. |
| Snooze then leave `/dashboard` and return (within 5 min) | Component unmounts → all timers cleared (L164–L170) → hide-set lost. On return, same order re-pops immediately. |
| Snooze + auto-refresh (`useRefreshAllData`) | If order is present in refresh: snooze preserved. If order is momentarily missing: housekeeping effect removes the snooze entry → premature re-pop on next refresh. |
| Snooze + socket re-fire `scan-new-order` for same `orderId` | `addOrder` updates in place. Hide-set still has id → still hidden. Safe. |
| Snooze + Accept | Status flips out of 7 → predicate fails → housekeeping effect removes hide entry + clears timer. Clean. |
| Snooze + Reject | Order eventually removed from OrderContext → not in `liveYtcIds` → housekeeping clears hide entry + timer. Clean. |
| Snooze in background tab | Browser throttles `setTimeout`. Reopen may fire >5 min late. |
| Snooze across two open POS tabs | Each tab has its own in-memory hide-set. Tab B will still pop. |
| User clicks Snooze when the order is already in `snoozedOrders` (snoozed from the card earlier) | Dashboard set toggles OFF (un-dim card). Popout-local hide adds a fresh 5-min timer. Inconsistent UX. |
| User clicks Next/Prev then Snooze | Snoozes the currently visible order (`activeOrder`), not the first in queue. Correct. |
| Order's `orderId` type differs (string vs number) across paths | Popup always uses `String(orderId)` for Map key and for filter (`!popOutSnoozeHideSet.has(String(o.orderId))`). Safe. |
| `Order 1 of 1` indicator after snoozing the only order | Popup unmounts (queue=0) before any "0 of 0" state is rendered. |

---

## 10. Recommended Fix Plan (NOT implemented)

> All steps are scoped strictly to make Snooze 5m more robust. No new business logic, no backend change required unless explicitly opted-in. Owner approval required on items marked OWNER-DECISION.

### 10.1 Make the snooze hide-set survive component remounts within the same browser session
- **OWNER-DECISION**: lift `popOutSnoozeHideSet` and `timerRefs` out of `ScanOrderPopOut` and into a small dedicated context/provider (e.g. `WebOrderSnoozeContext`) mounted at the `DashboardPage` level (or above). Keep storage in-memory only (matches existing in-memory `snoozedOrders` Set semantics).
  - Pros: tab navigation inside the POS no longer drops snooze.
  - Cons: navigating away from `/dashboard` to `/login` and back still resets (acceptable per existing in-memory convention).

### 10.2 Optionally persist snooze across hard refresh
- **OWNER-DECISION**: store `Map<orderIdStr, expiryEpochMs>` in `sessionStorage` (NOT `localStorage`, to keep tab-scope). On mount, prune expired entries before seeding the hide-set.
  - This DIRECTLY contradicts the locked contract line 27 and test A-3. If approved, the locked contract + the A-3 test must be updated alongside.
  - If not approved, keep current in-memory behavior and update UX copy to make ephemerality explicit (e.g. tooltip: "Snooze for 5 minutes — resets if you reload the page").

### 10.3 Harden the housekeeping effect against transient refresh races
- In `ScanOrderPopOut.jsx` L202–L223, only delete a snooze entry when:
  - the order's expiry has already passed, OR
  - the order is genuinely gone (e.g. observed missing for N consecutive refreshes, or removed by `removeOrder`).
  - Recommended minimal change: instead of deleting on "missing from current `orders`", delete only when the predicate `isUnconfirmedScanOrder` is **observed false** for an order that IS still in `orders` (i.e. status-flip), OR the order has been removed via `removeOrder`. The current "absent from list" branch is the source of premature re-pops on partial-payload refreshes.

### 10.4 Replace `toggleSnooze` with an idempotent "add-only" semantic for the popup
- Add a sibling handler `addSnooze(orderId)` in `DashboardPage.jsx` (next to `toggleSnooze` L1172). The popup's `handleSnoozeClick` should call `addSnooze` (idempotent) instead of `toggleSnooze` (toggling). The card-level snooze button continues to use `toggleSnooze`.
- This removes the "un-snooze surprise" when the card was already snoozed.

### 10.5 Align dashboard-side and popout-side snooze lifetimes
- **OWNER-DECISION**: when the 5-min popout timer fires, also remove the id from the dashboard `snoozedOrders` Set (call `toggleSnooze(idStr)` only if it is still set, OR introduce `clearSnooze(idStr)`). This eliminates the "card stays dimmed forever, popup keeps pinging" inconsistency.

### 10.6 Optional: `Page Visibility` rescheduling
- If `document.visibilityState` becomes `visible`, recompute the hide-set against `Date.now()` so any throttled timers that should already have expired do so deterministically. Adds 6–8 lines, no behavior change for non-throttled cases.

### 10.7 Telemetry-style logs (optional)
- Add a few `console.log('[ScanOrderPopOut] snooze ...')` lines on enter/exit, similar to OrderContext logs, so future regressions are easier to diagnose. No behavior change.

### Scope guardrails for the fix (must hold)
- Do not modify `handleConfirmOrder`, `handleCancelOrderFromCard`, `handleTableClick`, or `CancelOrderModal`.
- Do not modify `addOrder`, `updateOrder`, `removeOrder`, `refreshOrders` in `OrderContext`.
- Do not modify `handleScanNewOrder` or any other socket handler.
- Do not introduce KOT/bill/print side effects.
- Do not call any backend endpoint.

---

## 11. Acceptance Criteria (for the future fix)

Functional:
1. Clicking Snooze 5m on the Web / Scan & Order popup hides the popup for the active order immediately.
2. The same order does not re-pop for 5 minutes from the moment of the click, **including** when:
   - the user navigates within `/dashboard` (e.g. toggles channels/views/sidebar);
   - `refreshAllData()` runs and the order is still in YTC;
   - the socket re-fires `scan-new-order` for the same `orderId` while it remains YTC;
   - a transient refresh momentarily omits the order before another refresh restores it (only if 10.3 is implemented).
3. After 5 minutes from the click, if the order is still `orderFrom==='web' && fOrderStatus===7`, the popup re-pops the same order.
4. If the order leaves YTC (Accept/Reject/cancel) before 5 minutes, the popup never re-pops for it.
5. If multiple web YTC orders are queued and the user snoozes the active one, the next order in FIFO order takes the slot; the queue header updates correctly; Prev/Next remain consistent.

State / UX:
6. The dashboard card's "snoozed" dim stays consistent with the popup hide: when the popup self-clears after 5 min, the card's dim also clears (if 10.5 approved). When the popup remains hidden the card stays dim.
7. Clicking Snooze when the order was already snoozed from the card does NOT toggle the dashboard snooze off (if 10.4 approved).
8. No `localStorage` writes from the snooze path unless 10.2 is explicitly approved; if approved, `sessionStorage` only, expiry-aware.

Non-functional:
9. No new backend call from the snooze path.
10. No change to `order.fOrderStatus`, `order.status`, or any other field on the order object.
11. No new sound, banner, toast, KOT, bill, or printing side-effects.
12. All existing tests in `ScanOrderPopOut.test.jsx` continue to pass (with T-9/T-10 amended if behavior is broadened per 10.1/10.3/10.5).

QA scripts (manual):
- Trigger a fresh Scan & Order (web YTC) order; verify popup appears.
- Click Snooze 5m → popup hides; card dims (or matches new semantics per 10.5).
- Wait 5 minutes → popup reopens with the same order.
- Repeat snooze, then within 4 minutes click Refresh → popup remains hidden.
- Repeat snooze, then within 4 minutes Accept the order from another surface (card) → popup never reopens.
- Repeat snooze, then within 4 minutes Reject via CancelOrderModal → popup never reopens.
- (If 10.2 approved) Repeat snooze, then hard-refresh → popup remains hidden until original 5-min window expires.

---

## 12. Open Questions (need owner approval)

1. **Is in-memory volatility acceptable** (current locked contract), or should snooze survive a hard refresh? (Drives 10.2.)
2. **Should snooze be tab-local** (`sessionStorage`) **or shared** across tabs/terminals (`localStorage` or backend)?
3. **Should snooze be device-local or per-restaurant** (backend-managed)? If backend-managed, owner must specify endpoint + payload shape; this is currently NOT in scope.
4. **Should the dashboard card "snoozed" visual auto-clear in sync with the 5-min popup timer?** (Drives 10.5.)
5. **Should the popup's Snooze button be idempotent** (add-only) **or shared toggle semantics with cards?** (Drives 10.4.)
6. **What is the expected behavior in the transient-refresh edge case** (order momentarily absent from a refresh response)? Keep snooze, or honour the response and drop? (Drives 10.3.)
7. **Background-tab throttling** — is "popup reappears slightly late when tab was hidden" acceptable, or should we recompute on visibility change? (Drives 10.6.)
8. **Do any of these snooze semantics differ for `orderType` = `delivery` vs `dineIn` vs `takeAway` web orders?** Currently treated uniformly; unclear from current code whether business wants any per-type override.
9. **Is the 5-minute interval fixed or owner-configurable?** Currently hardcoded `POPOUT_SNOOZE_MS` (L48).

---
