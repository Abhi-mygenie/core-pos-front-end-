# POS2-002 Phase 4 — Web / Scan YTC Visual Pop-out
## Implementation Handover

> **Sprint:** pos2.0
> **CR ID:** POS2-002 (Phase 4 of 4)
> **Date:** 2026-05-10
> **Type:** Implementation Handover — planning only. NO source edits, NO `/app/memory/final/` edits, NO QA execution.
> **Branch:** `11-may-uat-final`
> **Predecessors shipped:**
> - Phase 1 — `order_from` → `orderFrom` / `isWebOrder` mapping (2026-05-09)
> - Phase 2 — Web Delivery Charge Lock (2026-05-09)
> - Phase 3 — Header Platform Dropdown (2026-05-10)
> - Phase 3.1 — Live Platform Counter Chip (2026-05-10)
> **Reference docs:**
> - `impact_analysis/POS2_002_ORDER_FROM_WEB_PIPELINE_CR_IMPACT_ANALYSIS_2026_05_07.md` (v1–v6)
> - `sprint_consolidation/POS2_0_OWNER_DECISIONS_AMENDMENT_2026_05_09.md`
> - Phase 4 readiness refresh (Owner clarification, 2026-05-10)

---

## 1. Locked scope

### 1.1 What Phase 4 IS

Phase 4 is a **presentation-only Web / Scan YTC pop-out**. It is a visual attention layer that subscribes to `OrderContext.orders`, filters by the locked predicate, and renders the **same** YTC actions in a more prominent location (an overlay / modal) than a normal dashboard card row.

**Locked predicate (R-POPOUT-1, R-POPOUT-2):**

```js
const isUnconfirmedScanOrder = (order) =>
  order?.orderFrom === 'web' && order?.fOrderStatus === 7;
```

- `orderFrom === 'web'` ships via the Phase 1 transform at `frontend/src/api/transforms/orderTransform.js` (already live).
- `fOrderStatus === 7` is the canonical YTC key (triple-source verified at `api/constants.js:140, 153, 162, 175`, `Header.jsx:20`, `OrderCard.jsx:176`, `TableCard.jsx:59, 484`, `StatusConfigPage.jsx:98`).

### 1.2 What Phase 4 IS NOT

- Not a new business workflow.
- Not a new lifecycle.
- Not a new accept/reject contract.
- Not a new audio surface.
- Not a separate "web snooze system".
- Not a backend change.
- Not a socket-handler change.

### 1.3 Hard constraints (must not be violated)

| # | Constraint | Source |
|---|---|---|
| C-1 | Reuse existing YTC card action handlers. Do NOT create new accept/reject endpoints or new `confirmOrder` semantics. | Owner clarification 2026-05-10 §3 |
| C-2 | Pop-out emits NO audio. Existing FCM → `NotificationContext` → `soundManager` chain stays untouched. No new sound asset. No sound suppression. No sound duplication. | Owner clarification 2026-05-10 §2; v6 R-SNOOZE-13 |
| C-3 | Snooze reuses existing `DashboardPage.toggleSnooze`. A pop-out-local 5-minute auto-clear timer is permitted as long as it does NOT change order status, NOT call backend, NOT remove the order from state, NOT touch persistence, NOT break POS YTC card snooze. | Owner clarification 2026-05-10 §4; v6 R-SNOOZE-9/11/12 |
| C-4 | Underlying dashboard card stays live. The pop-out is a wrapper, not a replacement. | Owner clarification 2026-05-10 §5 |
| C-5 | No change to `confirmOrder` payload, no new `order_status` value, no FE branching on `order_from` at the wire layer. | Owner Decisions Amendment 2026-05-09 Decision 3 |
| C-6 | CR-008 D1-Gate `isPrepaid` predicate at `CollectPaymentPanel.jsx:917` stays untouched. Phase 2 web delivery lock untouched. | v2 §2, §7; Phase 2 summary |
| C-7 | POS-origin YTC card flows untouched (R-POPOUT-9, R-SNOOZE-5). | v2 §0; v6 §19.1 |
| C-8 | Backend confirmations (BE-OF4, BE-Q-NEW-1/2) are documented as QA/smoke checks, NOT implementation blockers. | Owner clarification 2026-05-10 §6 |

### 1.4 Final verdict (advance commitment)

`ready_for_implementation` — see §10 for justification.

---

## 2. Existing handler mapping

The pop-out is wired to the **existing** dashboard handlers. The mapping below is the source of truth for the implementation agent. Every action surface in the pop-out MUST resolve to one of these props.

### 2.1 Card-side handler inventory

| Pop-out action | Existing prop on `OrderCard.jsx` | Existing prop on `TableCard.jsx` | Existing handler on `DashboardPage.jsx` | Net wire effect |
|---|---|---|---|---|
| **Accept** (Web YTC dineIn / takeaway / delivery — card-style entries) | `onAccept` (declared `OrderCard.jsx:40`, fires at L699 inside YTC branch) — today wired only via `ChannelColumn.jsx:201` as `onAccept={(order) => onConfirmOrder?.(item)}` | n/a | `handleConfirmOrder` (`DashboardPage.jsx:1214-1228`) → `confirmOrder(order.orderId, permissions?.[0] \|\| 'Manager', defaultOrderStatus)` at `api/services/orderService.js:62-66` | Same single API call already used by POS YTC accept. No payload change. |
| **Accept** (Web YTC where the order is rendered on a TableCard, e.g. QR-menu dine-in with `table_id`) | n/a | `onConfirmOrder` (`TableCard.jsx:51, 316-330`) | `handleConfirmOrder` (same as above) | Same as above. |
| **Reject / Cancel** | `onReject` (declared `OrderCard.jsx:41`, fires at L690) — **NOTE: not currently wired by `ChannelColumn` / `DashboardPage`.** The actual reject path today is `onCancelOrder` → `handleCancelOrderFromCard` (`DashboardPage.jsx:1427`) → opens `<CancelOrderModal />` → `handleCancelOrderConfirm` (`DashboardPage.jsx:1235-1262`) → `api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, orderToAPI.cancelOrder(...))`. | `onCancelOrder` → `handleCancelOrder` (`DashboardPage.jsx:1230-1233`) opens cancel modal for table-card entries. | Cancel modal flow already in production. | **Pop-out MUST wire its reject button to `onCancelOrder` (or to a passthrough that opens the same `<CancelOrderModal />`)** — NOT to the unused `onReject` prop. This is the existing reject contract; nothing new. |
| **Snooze** | `onToggleSnooze` (`OrderCard.jsx:33, 344-349`) gated on `isYetToConfirm && onToggleSnooze` | `onToggleSnooze` (`TableCard.jsx:51, 255-261`) | `toggleSnooze` (`DashboardPage.jsx:1170-1180`) — pure add/remove from in-memory `snoozedOrders: Set` at `DashboardPage.jsx:415` | No backend, no state change, no persistence. |
| **View / Open** | Card root `onClick={() => onEdit?.()}` (`OrderCard.jsx:277`, `onEdit` declared at `OrderCard.jsx:34`) | Card root `onClick` → `onClick?.(table)` → `handleTableClick` family in `DashboardPage.jsx` | `handleTableClick` family (multiple sites: L1687, L1719, L1747 etc.) → routes to OrderEntry | Opens the existing OrderEntry surface for the order. No new route. |

### 2.2 What the pop-out passes through

The pop-out component receives the same handler props that `OrderListSection` / `ChannelColumn` / direct card mounts already receive from `DashboardPage.jsx`. The implementation agent SHOULD pass the same `toggleSnooze`, `handleConfirmOrder`, `handleCancelOrderFromCard` (or `handleCancelOrder` for table-card entries), and the appropriate `handleTableClick`-style `onEdit` resolver.

### 2.3 Critical correction vs prior framing

Earlier framing said *"reuse `onAccept` / `onReject`"*. Code-truth: `onReject` is **declared but unwired** today; the real reject path is `onCancelOrder` → `handleCancelOrderFromCard` → cancel modal. The pop-out MUST use this existing path. Calling it "Reject" or "Cancel" in the UI is the planning agent's UX choice; the underlying wire is the same.

### 2.4 Mapping per origin variant

Web YTC orders can render today on two dashboard surfaces depending on how the order shows up after Phase 1/3:

| Origin variant | Likely dashboard surface | Pop-out wiring |
|---|---|---|
| Web + delivery / takeaway / walk-in (no `table_id`) | `OrderCard` via `OrderListSection` / delivery / takeaway sections (`DashboardPage.jsx:1710-1750`) | Accept = pass an `onAccept` prop that calls `handleConfirmOrder({ orderId: order.orderId })` (matches `ChannelColumn.jsx:201` pattern). Reject = `onCancelOrder = handleCancelOrderFromCard`. Snooze = `onToggleSnooze = toggleSnooze`. View = `onEdit = () => handleTableClick({ id: \`del-\${order.orderId}\` \| \`ta-\${order.orderId}\`, orderId, orderType })`. |
| Web + dine-in via QR (has `table_id`) | `TableCard` | Accept = `onConfirmOrder = handleConfirmOrder`. Reject = `onCancelOrder = handleCancelOrder`. Snooze = `onToggleSnooze = toggleSnooze`. View = card root `onClick = handleTableClick(table)`. |

The pop-out component MUST select the correct wiring based on whether the queued order has a `tableId` / `isWalkIn` / `orderType === 'delivery'` etc. The shape selection logic already exists in `DashboardPage.jsx` (see L1593-1751 for the per-section binding patterns) — the pop-out can build the same resolver.

---

## 3. Pop-out UX structure

> Presentation-only spec. The implementation agent owns final pixel-level decisions; this section locks the structural rules.

### 3.1 Component file

`frontend/src/components/dashboard/ScanOrderPopOut.jsx`

### 3.2 Mount site

`pages/DashboardPage.jsx` — single insertion at the root JSX, sibling to existing dashboard chrome, with `z-index` above sidebar / status pills / settings drawer / cancel-order modal trigger (the cancel modal itself, when opened from the pop-out, sits above the pop-out).

```jsx
// SKETCH — DO NOT IMPLEMENT IN THIS HANDOVER
<ScanOrderPopOut
  orders={unconfirmedWebYtcOrders}              // memoised selector
  onAccept={handleConfirmOrder}                  // existing
  onReject={handleCancelOrderFromCard}           // existing — note name choice
  onToggleSnooze={toggleSnooze}                  // existing
  onEdit={(order) => handleTableClick(/* derived entry */)}  // existing family
  snoozedOrders={snoozedOrders}                  // existing
  currencySymbol={currencySymbol}                // existing
/>
```

### 3.3 Visibility rules (R-POPOUT-3, R-POPOUT-4, OQ-12)

| Condition | Behaviour |
|---|---|
| `unconfirmedWebYtcOrders.length === 0` after applying pop-out-local snooze hide-set | Component returns `null`. No DOM footprint. |
| `unconfirmedWebYtcOrders.length > 0` on desktop (≥ 1024 px) | Render as a centered overlay/modal that covers **≥ 50% of the dashboard area**, with a dimmed backdrop, high z-index. The dashboard cards behind it stay live (continue to receive socket updates), just visually obscured. |
| `unconfirmedWebYtcOrders.length > 0` on tablet / small viewport (< 1024 px) | Render as a **full-screen modal**. No sticky-banner fallback. |
| Operator clicks Accept / Reject / open and the queue drains | Auto-dismiss (return `null`). |
| Page reload | Pop-out re-evaluates from `OrderContext.orders` on mount. Snooze state (in-memory) is cleared by reload → orders that were locally hidden re-enter the queue if still YTC. |

### 3.4 Per-order panel content

Each queued order's panel inside the pop-out renders (in priority order):

1. Origin badge — "Web / Scan & Order" (reuse the chip from Phase 3.1 if available, else inline label).
2. Order summary — order ID, channel (dineIn / takeAway / delivery / room), table / address, item count, total. (Read from `order` fields already mapped in `orderTransform.js`.)
3. Action row — **Accept** (primary), **Reject** (secondary, opens existing cancel modal), **View** (tertiary, opens OrderEntry), **Snooze** (icon, 5 min auto-clear).
4. Queue position — "Order N of M" indicator + Next / Previous chevrons (see §4).

### 3.5 Visual deprioritisation hook for the underlying card (optional)

Default = leave the underlying dashboard card untouched (per Owner clarification §5).

Optional non-breaking visual hint: while the pop-out is the active surface for a given order, the implementation may add a subtle visual cue to the underlying card (e.g., a thin border highlight) IF and only IF it does NOT change any handler binding and IS implemented via additive className only. This is **explicitly optional** and the safer default is "no card change".

### 3.6 Accessibility

- Pop-out container: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the heading.
- Focus trap inside the pop-out while open; restore focus on close.
- Accept/Reject/View/Snooze buttons must each have unique `data-testid` (e.g., `popout-accept-btn-${orderId}`, `popout-reject-btn-${orderId}`, etc.) per repo data-testid convention.
- Next / Previous chevrons: `data-testid="popout-nav-next"`, `data-testid="popout-nav-prev"`.

---

## 4. Queue behaviour

### 4.1 Selector

```js
// SKETCH — locate in DashboardPage.jsx or inside ScanOrderPopOut.jsx
const unconfirmedWebYtcOrders = useMemo(() => {
  return (orders ?? [])
    .filter((o) => o?.orderFrom === 'web' && o?.fOrderStatus === 7)
    .filter((o) => !popOutSnoozeHideSet.has(String(o.orderId)))
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));  // FIFO oldest first
}, [orders, popOutSnoozeHideSet]);
```

- Source of truth: `OrderContext.orders` (already socket-fed by Phase 1 + Phase 3-validated socket-first handlers).
- Sort: **FIFO by createdAt ascending** so the oldest unconfirmed order is shown first. Implementation agent may pick alternative ordering (e.g., earliest `orderId`) only if `createdAt` is unreliable on the live model — verify at coding time.

### 4.2 Sequential one-at-a-time UI (R-POPOUT-8)

- Render exactly **one** order panel at any time.
- Header strip shows `Order ${currentIndex + 1} of ${totalCount}`.
- Next / Previous chevrons advance / retreat through the queue. Wrap-around: at the end of the queue, "Next" is disabled (not wrap). At the start, "Previous" is disabled.
- Default active index: `0` (oldest). Resets to a valid index whenever the queue mutates (e.g., after Accept removes the current order, advance to the next; if it was the last, decrement; if queue is empty, dismiss).

### 4.3 De-queue triggers (R-SNOOZE-12 single rule)

An order leaves the pop-out queue when ANY of these fire — no separate "if accepted / if rejected / if confirmed" clauses:

| Trigger | Mechanism |
|---|---|
| Socket-driven status change away from YTC (`fOrderStatus !== 7`) | `OrderContext.orders` mutation → selector recomputes → order falls out. Applies uniformly to confirm / cancel / internal flips. |
| Order removed from `OrderContext.orders` entirely | Same — selector drops it. |
| Pop-out-local snooze hide-set contains the order ID and timer has not yet expired | See §5. |

### 4.4 Re-enter triggers (when a previously snoozed order reappears)

- 5-minute timer expires for that order — `popOutSnoozeHideSet` clears the entry → selector re-includes it.
- Page reload — `popOutSnoozeHideSet` resets to empty `Set` (matches existing `snoozedOrders` device-local in-memory scope) → order re-enters if still YTC.

### 4.5 Multi-operator behaviour

Pop-out inherits the existing first-wins assumption from today's POS YTC accept flow. If two operators on the same tenant accept simultaneously, backend's `confirmOrder` is idempotent (existing behaviour, validated daily on POS YTC). Pop-out adds no new race risk.

---

## 5. Snooze handling plan

### 5.1 Existing snooze surface (re-verification gate V-1..V-6, anchored to v6 §19.2)

The implementation agent MUST re-run this 6-check verification before wiring any snooze logic. Snapshot at time of this handover: all six PASS.

| # | Check | How to verify | Pass criterion |
|---|---|---|---|
| V-1 | State location unchanged | `grep -n "snooze" frontend/src` and inspect `pages/DashboardPage.jsx:415` | State still owned at `DashboardPage.jsx:415` as `useState(new Set())`. No new owner emerged. |
| V-2 | No backend calls inside `toggleSnooze` | inspect body at `DashboardPage.jsx:1170-1180` | Body is pure `Set` add/remove. No `axios`, `fetch`, `socket.emit`, or service call. |
| V-3 | No side-effects on order state | inspect body at `DashboardPage.jsx:1170-1180` | Only `setSnoozedOrders` mutation. No `OrderContext`, `TableContext`, status-derivation, or socket subscription mutation. |
| V-4 | No persistence | `grep snoozedOrders frontend/src` for `localStorage`, `sessionStorage`, IndexedDB, server sync | Zero hits. |
| V-5 | Socket handlers oblivious to snooze | inspect `socketHandlers.js` for `snooze` references | Zero hits. |
| V-6 | YTC card-button predicate unchanged | inspect `OrderCard.jsx:344` and `TableCard.jsx:255` | Predicate is `isYetToConfirm && onToggleSnooze` (with optional additional `!(isWebOrder && fOrderStatus === 7 && popOutActiveFor(orderId))` if R-SNOOZE-6 default-a is taken — see §5.4). |

If ANY check FAILS at coding time → STOP and escalate (per R-SNOOZE-7 fail-safe: pop-out ships with Accept / Reject / View only; no Snooze button).

### 5.2 Pop-out-local 5-minute snooze (preferred design)

Owner-locked rule (R-SNOOZE-9): a snoozed Web YTC order re-enters the pop-out exactly **5 minutes** after the snooze action fires, or earlier if its status flips out of YTC (R-SNOOZE-12).

**Recommended implementation (lowest-delta):** add a separate, pop-out-local hide-set keyed by order ID with expiry timestamps. Do NOT extend the existing `snoozedOrders: Set` semantics.

```js
// SKETCH (inside ScanOrderPopOut.jsx) — DO NOT IMPLEMENT IN THIS HANDOVER
const [popOutSnoozeHideSet, setPopOutSnoozeHideSet] = useState(new Map());
// Map<orderId: string, expiryTimestamp: number>

const snoozePopOut = useCallback((orderId) => {
  const expiry = Date.now() + 5 * 60 * 1000;
  setPopOutSnoozeHideSet((prev) => {
    const next = new Map(prev);
    next.set(String(orderId), expiry);
    return next;
  });
  // Also call the existing DashboardPage toggleSnooze to keep the
  // underlying card's dim-card UX consistent with the pop-out's hide:
  onToggleSnooze?.(String(orderId));

  // Schedule auto-clear after 5 minutes
  const handle = setTimeout(() => {
    setPopOutSnoozeHideSet((prev) => {
      const next = new Map(prev);
      next.delete(String(orderId));
      return next;
    });
    // Optional: un-toggle the existing snooze so the card stops dimming
    // — only if owner accepts. Default: leave the card snoozed; the
    // operator clears it manually via the card. (Cosmetic stale-flag.)
  }, 5 * 60 * 1000);

  return () => clearTimeout(handle);  // cleanup on unmount
}, [onToggleSnooze]);
```

### 5.3 Why two state surfaces (existing `snoozedOrders` + pop-out-local hide-set)

- `snoozedOrders` (existing, owned by `DashboardPage.jsx:415`) — drives card-level dim treatment for POS AND Web YTC. Untouched semantics.
- `popOutSnoozeHideSet` (new, owned by `ScanOrderPopOut.jsx`) — pop-out display-only hide map with 5-minute expiry. Lifetime: the pop-out component's lifetime.

This split satisfies:
- "Reuse existing snooze handler where safe" → call `onToggleSnooze` from the pop-out's snooze button.
- "Add only pop-out-local UI timer logic" → the 5-minute auto-clear lives only in the pop-out.
- "Do not change existing POS YTC snooze behaviour" → never reach `setSnoozedOrders` directly for the auto-clear branch; only invoke the existing `toggleSnooze` handler exactly as today.
- "No backend, no status change, no order removal, no persistence" → all four satisfied trivially.

### 5.4 Card-level snooze button on Web YTC during pop-out (relaxed default)

Owner clarification (2026-05-10 §5) supersedes v5 R-SNOOZE-6 default-a. New default:

| Scenario | Behaviour |
|---|---|
| Pop-out is active AND order is in the pop-out queue | Card-level snooze button on the underlying card **stays available**. No predicate tightening required at `OrderCard.jsx:344` or `TableCard.jsx:255`. |
| Optional UX refinement (only if implementation agent finds a concrete duplicate-click confusion) | Add a thin opt-out predicate to the card-level button: `isYetToConfirm && onToggleSnooze && !(isWebOrder && fOrderStatus === 7)` — only on web YTC cards. Even then, the underlying handler is unchanged. |

Recommendation: ship the relaxed default (leave card snooze button alone). The opt-out refinement is reserved for a future iteration if QA finds real-world confusion.

### 5.5 Anti-checks

- Snooze MUST NOT call `confirmOrder` / `cancelOrder` / any service.
- Snooze MUST NOT mutate `order.status` / `order.fOrderStatus`.
- Snooze MUST NOT remove the order from `OrderContext.orders`.
- Snooze MUST NOT write to localStorage / sessionStorage / IndexedDB / backend.
- Snooze MUST NOT block any future socket update from arriving — `OrderContext` mutations are independent of the snooze set.
- A snoozed order whose status flips via socket (`fOrderStatus !== 7`) MUST naturally fall out of the pop-out queue via the selector, without any extra invalidator.

---

## 6. Files to touch

### 6.1 New files

| Path | Purpose |
|---|---|
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` | The overlay component itself. Owns: selector composition (or consumes the memoised selector via props), local hide-set with 5-min timers, queue navigation state, JSX layout, action button bindings. |
| `frontend/src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx` | Unit + integration tests — see §8. |

### 6.2 Existing files to edit (additive only)

| Path | Edit | Anchor |
|---|---|---|
| `frontend/src/pages/DashboardPage.jsx` | (a) Add memoised selector `unconfirmedWebYtcOrders` (recommended), or let the pop-out filter inside. (b) Mount `<ScanOrderPopOut ... />` once at the root JSX, passing the existing handlers (`toggleSnooze`, `handleConfirmOrder`, `handleCancelOrderFromCard`, `handleCancelOrder`, `handleTableClick`-family resolver, `snoozedOrders`, `currencySymbol`). | Selector near other memoised selectors (e.g., L1167); mount near top of returned JSX so the overlay sits above the rest. |

### 6.3 Optional additive edits (planning agent's choice at coding time)

| Path | Optional edit | Why optional |
|---|---|---|
| `frontend/src/components/cards/OrderCard.jsx:344` | Tighten the YTC card snooze predicate to `isYetToConfirm && onToggleSnooze && !(isWebOrder && fOrderStatus === 7)` — only if R-SNOOZE-6 default-a is reinstated by a future owner ask. | Owner has explicitly relaxed this default. Default = no edit. |
| `frontend/src/components/cards/TableCard.jsx:255` | Same as above. | Same. |
| `frontend/src/contexts/OrderContext.jsx` | Expose a memoised `unconfirmedWebYtcOrders` selector if the implementation agent prefers context-level derivation over page-level. | Convenience only; not required. |

### 6.4 LOC budget (estimate)

| Surface | Estimated LOC |
|---|---|
| `ScanOrderPopOut.jsx` (new) | ~250–350 LOC (component + queue logic + 5-min timer + Tailwind layout + a11y) |
| `DashboardPage.jsx` (additive) | ~10–15 LOC (selector + mount + minor handler resolver) |
| Tests (new file) | ~200–300 LOC (~12–15 cases) |
| **Total** | **~460–660 LOC** |

This sits between the v6 estimate (1.5–2 days) and a comfortable 1-day buffer.

---

## 7. Files NOT to touch

| Path | Reason |
|---|---|
| `frontend/src/api/services/orderService.js` (`confirmOrder`, `cancelOrder` family) | No new endpoints, no payload changes. C-1, C-5. |
| `frontend/src/api/transforms/orderTransform.js` | Phase 1 already maps `orderFrom` / `isWebOrder`. No further mapping needed. |
| `frontend/src/api/socket/socketHandlers.js` | Socket-first handlers unchanged. Pop-out subscribes to `OrderContext.orders`, not raw socket events. |
| `frontend/src/utils/soundManager.js` | No audio surface in Phase 4. C-2. |
| `frontend/src/contexts/NotificationContext.jsx` | FCM-driven audio path stays exactly as today. C-2. |
| `frontend/src/components/layout/Sidebar.jsx` (Ringer toggle) | No bypass of operator mute. C-2. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | CR-008 D1-Gate + Phase 2 web delivery lock untouched. C-6. |
| `frontend/src/components/order-entry/OrderEntry.jsx` | Phase 2 wiring untouched. C-6. |
| `frontend/src/components/cards/OrderCard.jsx` (action surfaces) and `frontend/src/components/cards/TableCard.jsx` (action surfaces) — **behaviourally** | C-4, C-7. Optional additive predicate tightening per §5.4 is the only permitted edit and is OFF by default. |
| `frontend/src/components/cards/DineInCard.jsx`, `DeliveryCard.jsx`, `TakeAwayCard.jsx`, `RoomCard.jsx` | Out of Phase 4 scope. |
| `frontend/public/sounds/*.wav` | No new audio asset. C-2. |
| `frontend/src/api/constants.js` (F_ORDER_STATUS family) | YTC key already canonical. No new status code. |
| `/app/memory/final/*` | Strict-rules — playbook prohibits edits. |
| Any backend code / API spec | Pop-out is FE-only. C-5, C-8. |

---

## 8. Tests to add

> Follow existing test patterns: `frontend/src/__tests__/components/order-entry/CollectPaymentPanel.deliveryLock.test.jsx` is a good shape reference.

### 8.1 Unit tests — `ScanOrderPopOut.test.jsx`

| # | Test name | Verifies |
|---|---|---|
| T-1 | renders nothing when there are no web YTC orders | Empty selector → null render |
| T-2 | renders nothing when the only web YTC order is in the pop-out-local snooze hide-set | Snooze hide-set respected |
| T-3 | renders a single panel when one web YTC order is queued | One-at-a-time |
| T-4 | renders "Order 1 of N" indicator with correct N | Queue index display |
| T-5 | clicking Accept invokes the passed-in `onAccept` with the correct order | Handler reuse |
| T-6 | clicking Reject invokes the passed-in `onReject` (= `handleCancelOrderFromCard` or `handleCancelOrder`) with the correct order | Handler reuse |
| T-7 | clicking View / Open invokes the passed-in `onEdit` with the correct order | Handler reuse |
| T-8 | clicking Snooze calls `onToggleSnooze` with the correct order ID and adds the ID to the pop-out-local hide-set with a 5-minute expiry | Snooze split-state |
| T-9 | a snoozed order re-enters the queue after 5 minutes (mock timers) | 5-min auto-clear |
| T-10 | a snoozed order is removed from the queue immediately when its `fOrderStatus` flips to a non-YTC value | R-SNOOZE-12 |
| T-11 | Next / Previous chevrons advance/retreat the active index correctly with boundary handling (no wrap) | Queue nav |
| T-12 | small-viewport class is applied at < 1024 px (full-screen modal); desktop class at ≥ 1024 px (centered overlay ≥ 50%) | OQ-12 / R-POPOUT-4 |
| T-13 | predicate strictly requires `orderFrom === 'web'` (non-web YTC, e.g. POS YTC dineIn, is NOT included) | R-POPOUT-9 |
| T-14 | predicate strictly requires `fOrderStatus === 7` (web non-YTC orders, e.g. `fOrderStatus === 1`, are NOT included) | R-POPOUT-1 |
| T-15 | pop-out auto-dismisses (renders null) when the queue drains | Auto-dismiss |
| T-16 | accessibility attributes: `role="dialog"`, `aria-modal="true"`, focus-trapped while open | a11y |

### 8.2 Integration / wire-level tests (light)

| # | Test name | Verifies |
|---|---|---|
| I-1 | DashboardPage mounts `<ScanOrderPopOut />` and passes `toggleSnooze` / `handleConfirmOrder` / `handleCancelOrderFromCard` / `snoozedOrders` correctly | Wiring at mount site |
| I-2 | When a fake socket update mutates a web YTC order's status from 7 → 1 in `OrderContext`, the pop-out auto-drops that order | Socket-first integration |

### 8.3 Anti-tests (regression guards)

| # | Test name | Verifies |
|---|---|---|
| A-1 | The pop-out makes no calls to `soundManager.play` / `setEnabled` / any audio surface (mock the soundManager singleton and assert no invocations) | C-2 silent layer |
| A-2 | The pop-out makes no direct calls to `confirmOrder` / `cancelOrder` services — all action paths go through passed-in props (mock the service module and assert zero invocations from inside the pop-out) | C-1 |
| A-3 | The pop-out does not write to `localStorage` / `sessionStorage` for snooze state (spy on storage APIs and assert no writes during snooze) | C-3 / OQ-13.d |
| A-4 | The pop-out does not mutate `order.status` / `order.fOrderStatus` on snooze (clone the order and assert deep-equality after snooze action) | C-3 |
| A-5 | Existing POS YTC card snooze flow still works end-to-end when the pop-out is mounted (POS YTC order → click card-level snooze → `snoozedOrders` Set updates → card gets `opacity-60`) | C-7, R-SNOOZE-5 |

### 8.4 Test infrastructure

- Use `@testing-library/react` (already in repo).
- Use `jest.useFakeTimers()` for T-9 / T-10 / T-15 / I-2.
- Mock `OrderContext` via the existing test-utils pattern (`react-router-dom` provider wrappers already used in `CollectPaymentPanel.deliveryLock.test.jsx`).
- Mock `api/services/orderService.js` to assert A-2.

---

## 9. QA checklist

### 9.1 Functional smoke (live app on `https://insights-phase.preview.emergentagent.com/`)

| # | Step | Pass criterion |
|---|---|---|
| Q-1 | Place a real Scan & Order order from a customer-side surface (or simulate via backend) so a YTC order with `orderFrom='web'` arrives at the dashboard | Pop-out appears within the same socket-update cycle as the order arrives in `OrderContext` |
| Q-2 | Visual cover ≥ 50% of dashboard area on desktop (≥ 1024 px) | Manual visual check |
| Q-3 | Visual = full-screen modal on tablet / mobile (< 1024 px) | Resize browser to ≤ 1023 px or DevTools device toolbar |
| Q-4 | "Order 1 of N" indicator matches the actual count of web YTC orders in `OrderContext` | DevTools / Redux-style inspection |
| Q-5 | Click Accept on the pop-out's order → backend receives `confirmOrder` call → `fOrderStatus` flips 7 → 1 (or per-tenant `def_ord_status`) → socket update arrives → order falls out of pop-out queue → underlying dashboard card transitions from YTC to confirmed | End-to-end via network tab + dashboard view |
| Q-6 | Click Reject → existing `<CancelOrderModal />` opens → confirm reason → order cancelled → drops out of pop-out and dashboard | Same flow as today's POS YTC reject |
| Q-7 | Click View → OrderEntry surface opens for the same order | Routing |
| Q-8 | Click Snooze → pop-out hides this order for exactly 5 minutes (use stopwatch or DevTools mock) → after 5 min, order re-enters the queue if still YTC | 5-minute timer accuracy ±2 s |
| Q-9 | Snooze a web YTC order, then backend confirms it via another operator → order is removed from the pop-out queue immediately (does not wait for the 5-min timer) | R-SNOOZE-12 |
| Q-10 | Reload the dashboard while a web YTC order is snoozed → snooze is cleared (in-memory only) → order re-appears in pop-out if still YTC | Device-local in-memory |
| Q-11 | Place a POS-origin YTC order (dine-in cashier-punched, no Scan & Order) → pop-out is NOT triggered → per-card YTC accept flow continues exactly as today | R-POPOUT-9 |
| Q-12 | Verify no new audio cue fires during pop-out display / actions; the existing FCM ringer (if any tenant has it configured) continues to fire exactly as before | C-2 / R-SNOOZE-13 |
| Q-13 | Open Sidebar → Ringer On / Silent Mode toggle works exactly as today | C-2 |
| Q-14 | Place a Web YTC order in each of the three sub-channels (delivery, takeaway, dineIn via QR with `table_id`) → each triggers the pop-out with the correct origin badge + correct Accept wiring | OQ-1 scope (b) — all web YTC |
| Q-15 | Multi-operator: two browser sessions on the same tenant both see the pop-out for the same web YTC order. Operator A clicks Accept first → Operator B's pop-out auto-dismisses for that order via socket update | First-wins, OQ-10 acceptance |
| Q-16 | Phase 3 dropdown (All / POS / Web) still works while pop-out is open; switching to "Web" filters the dashboard cards behind the pop-out as expected | Phase 3 regression guard |
| Q-17 | CR-008 D1-Gate + Phase 2 web delivery charge lock both still work on a Collect Bill screen for any web order with `delivery_charge > 0` | C-6 regression guard |

### 9.2 Backend / smoke confirmations (non-blocking; can run post-merge)

| # | Backend ask | Smoke confirmation |
|---|---|---|
| BE-OF4 | Does `order_from === 'web'` always co-arrive with `f_order_status === 7` on socket frames for scan YTC? | Q-1: if Pop-out appears reliably on every scan YTC arrival across 10 sample orders, BE-OF4 is empirically satisfied. |
| BE-Q-NEW-1 | Backend correctly routes `confirmOrder` emissions / FCM / audit using persisted `order_from='web'`? | Q-5 + audit log inspection: confirm web-origin tag persists through accept. |
| BE-Q-NEW-2 | Backend treats web-postpaid YTC the same as in-house POS-postpaid YTC when `def_ord_status === 1`? | Q-5 + Q-14: place a postpaid Scan & Order, accept it, verify it routes to kitchen the same as a POS-postpaid YTC. |
| OQ-10 | `confirmOrder` first-wins idempotency in multi-operator scenarios | Q-15 |

### 9.3 Regression suite (existing)

- Run the full Jest unit suite — must remain 100% green.
- Run the production build (`yarn build`) — must complete clean.
- ESLint must remain clean on new and modified files.

---

## 10. Final verdict

**`ready_for_implementation`**

### 10.1 Justification

| Dimension | Status |
|---|---|
| Owner decisions | All locked. Zero open OQs remain after the 2026-05-10 clarification (OQ-1, OQ-4, OQ-5, OQ-12 closed in v4; OQ-13.b / d / e closed in v6 + 2026-05-10; OQ-13.a / c gated on V-1..V-6 which currently PASS). |
| Backend asks | BE-OF3 / BE-OF8 de-facto closed by Phase 1+3 production proof + Owner Decisions Amendment Decision 4. BE-OF4 + BE-Q-NEW-1/2 demoted to QA/smoke confirmations per the 2026-05-10 clarification §6. No hard blocker remains. |
| Code surfaces | One new component (`ScanOrderPopOut.jsx`) + one additive insertion in `DashboardPage.jsx`. Optional zero edits to cards (relaxed default per Owner clarification §5). No backend / socket / audio / service surface touched. |
| Hard constraints | C-1 through C-8 all enforced by §6 / §7 / §8. |
| Risk profile | Low. All existing handlers (`handleConfirmOrder`, `handleCancelOrderFromCard`, `handleCancelOrder`, `toggleSnooze`, `handleTableClick`) are battle-tested by the POS YTC path today. Phase 4 reuses them verbatim. |

### 10.2 Pre-implementation checklist for the implementation agent

1. Run V-1..V-6 verification grep (§5.1). Snapshot at this handover: 6/6 PASS — must remain so.
2. Confirm code-truth of §2 mapping (especially the `onReject` is-not-wired-but-`onCancelOrder`-is observation at §2.3 and §2.1 row 3). If code has drifted since 2026-05-10, reconcile before wiring.
3. Trace a single live Scan & Order order via DevTools to confirm the existing FCM audio behaviour (R-SNOOZE-14 / §19.4 documentation gate). This is **documentation-only** — the pop-out does no audio either way.
4. Implement `ScanOrderPopOut.jsx` per §3 + §4 + §5.
5. Mount in `DashboardPage.jsx` per §6.2.
6. Write tests per §8 (16 unit + 2 integration + 5 anti-tests).
7. Run lint + tests + build.
8. Run the live smoke checklist in §9.1 (Q-1 through Q-17) and document outcomes in a QA report at `change_requests/qa_reports/POS2_002_PHASE_4_QA_REPORT.md`.
9. Capture BE-OF4 / BE-Q-NEW-1/2 / OQ-10 smoke outcomes in the same QA report (§9.2).

### 10.3 Suggested implementation header

```
Title:      POS2-002 Phase 4 — Web/Scan YTC Visual Pop-out (presentation-only)
Frame:      Reuse existing YTC card action handlers (handleConfirmOrder,
            handleCancelOrderFromCard, toggleSnooze, handleTableClick) and
            render them inside a Web/Scan YTC pop-out queue. No new endpoints,
            no new audio, no new snooze system, no card behavioural change,
            no backend payload change.
Predicate:  orderFrom === 'web' && fOrderStatus === 7
Queue UX:   Sequential "Order N of M", desktop ≥ 50% overlay, tablet full-screen
Audio:      Silent layer (existing FCM ringer untouched)
Snooze:     Reuse toggleSnooze + pop-out-local 5-min hide-set; no backend,
            no persistence, no status change
BE asks:    BE-OF4 + BE-Q-NEW-1/2 + OQ-10 are QA/smoke confirmations, not
            implementation blockers.
```

### 10.4 What this handover explicitly does NOT do

- Does not modify any source code.
- Does not edit `/app/memory/final/`.
- Does not run tests.
- Does not commit anything.
- Does not call any backend.
- Does not assume `onReject` is wired (per §2.3 correction — uses `onCancelOrder` path instead).

---

## 11. Strict-rules compliance certification

| Rule | Status |
|---|---|
| `/app/memory/final/*` untouched | ✅ |
| No source code edited | ✅ |
| No implementation | ✅ |
| No QA / tests run | ✅ |
| No tracker rewrite (only this handover doc created) | ✅ |
| Existing handlers and their semantics preserved | ✅ — handover only reuses, never re-implements |
| Snooze cannot suppress an order permanently (R-SNOOZE-2) | ✅ — 5-minute auto-clear documented |
| Snooze cannot block socket updates (R-SNOOZE-3(e) + R-SNOOZE-12) | ✅ — selector recomputes on every `OrderContext.orders` mutation |
| Snooze cannot change order status (R-SNOOZE-3(d)) | ✅ — anti-test A-4 mandated |
| Existing ringer / buzzer behaviour out of scope (R-SNOOZE-13) | ✅ — anti-test A-1 mandated |
| No new sound asset (R-SNOOZE-13 + OQ-5) | ✅ |
| Existing POS YTC card snooze button preserved (R-SNOOZE-5) | ✅ — anti-test A-5 mandated |
| Single deduplicated status-flip rule (R-SNOOZE-12) | ✅ — selector handles all status flips uniformly |
| 5-minute fixed snooze duration owner-locked (R-SNOOZE-9) | ✅ — §5.2 |
| Pre-implementation verification gate documented (V-1..V-6) | ✅ — §5.1 |
| CR-008 D1-Gate behaviour preserved | ✅ — C-6 |
| Phase 2 web delivery charge lock preserved | ✅ — C-6 |
| Phase 3 dropdown + Phase 3.1 chip preserved | ✅ — Q-16 regression guard |
| Owner clarification 2026-05-10 (presentation-only framing) honoured | ✅ — §1.1, §1.2, §2.3, §3.5, §5.4 |
| Stop after creating handover | ✅ |

---

— End of POS2-002 Phase 4 Web / Scan YTC Visual Pop-out Implementation Handover 2026-05-10 —
