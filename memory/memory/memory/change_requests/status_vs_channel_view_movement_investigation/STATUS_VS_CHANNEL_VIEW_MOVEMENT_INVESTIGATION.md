# Status vs Channel View Movement Investigation

> **Scope:** Read-only static code analysis. No code changed. No backend touched.
> **Source of truth:** current code in `/app/frontend` at HEAD (branch `15-may`).
> **Question:** Why does an order/table move in **channel-wise view** after a
> status-changing action (Accept / Ready / Serve / Dispatch / Pay / Reject)?

---

## 1. Summary

The dashboard has **two orthogonal view axes** wired through two state
variables (`activeView` for table/order, `dashboardView` for channel/status).
The grouping container — `ChannelColumnsLayout` — is reused for both
channel-wise and status-wise dashboards, switched by `dashboardView`.

The reported "movement in channel-wise view" comes from **two
status-coupled behaviours that bleed into channel view by accident**:

1. **Always-on status-priority sort inside every column.**
   `ChannelColumn.jsx:64` calls `sortByActiveFirst(filteredItems,
   TABLE_STATUS_PRIORITY)` unconditionally — meaning when an order's
   `fOrderStatus` flips (e.g. Preparing 1 → Ready 2), its priority rank
   changes (3 → 2) and the card visibly **shifts position upward inside the
   same channel column**. The card stays in the right channel, but it
   appears to "move" to a different slot. This is the dominant cause.

2. **Status-chip filter applied to channel data.**
   `DashboardPage.jsx:722–751, 774/782/788/795` filter `channelData` items
   through `statusMatchesFilter`, which checks `activeStatuses` (the
   status pills the cashier sees in channel view's Header). If the cashier
   has *narrowed* the status chips (anything less than the full default
   list), an order whose status transitions OUT of the active set
   **disappears from the channel column** entirely. Terminal transitions
   (paid 6 / cancelled 3 / hold 9) are even stronger — they call
   `removeOrder(orderId)` in the socket handler, so the order vanishes from
   *both* views regardless of filters.

Neither (1) nor (2) is gated by `dashboardView`. The status-view dashboard
expects exactly this re-grouping behaviour. The channel-view dashboard does
not — its grouping should be **channel-stable** and status changes should
only affect badges/colours/buttons, not card position or visibility.

---

## 2. View Modes Found

| Axis | State variable | Values | LocalStorage lock key | LocalStorage default key |
|---|---|---|---|---|
| Card type | `activeView` | `'table'` &#124; `'order'` | `mygenie_view_mode_table_order` | `mygenie_default_pos_view` |
| Grouping axis | `dashboardView` | `'channel'` &#124; `'status'` | `mygenie_view_mode_channel_status` | `mygenie_default_dashboard_view` |

Initial-state resolution lives at `DashboardPage.jsx:369–390`
(`resolveInitialView`), with admin-lock precedence:
`lock value → admin default → factory default ('channel')`.

Cross-storage runtime sync at `DashboardPage.jsx:463–478`. Lock flags
(`lockTableOrder`, `lockChannelStatus`) at L396–L407 drive whether the
sidebar runtime toggle is shown.

Header filter chips swap automatically with `dashboardView` (`Header.jsx:255`):
- `dashboardView === 'status'` → channel pills (`activeChannels`) shown
- `dashboardView === 'channel'` → status pills (`activeStatuses`) shown

Internal names used in code: `channelData`, `statusData`, `dashboardView`,
`activeView`, `activeChannels`, `activeStatuses`, `enabledStatuses`,
`hiddenChannels`, `hiddenStatuses`, `channelVisibility`,
`USE_CHANNEL_LAYOUT`, `USE_STATUS_VIEW`.

Channel IDs: `dineIn`, `takeAway`, `delivery`, `room`. Walk-in folds into
`dineIn` for grouping (`DashboardPage.jsx:958`).

Status IDs (mapped from `fOrderStatus` numerics): `pending`(7),
`preparing`(1), `ready`(2), `running`(8 — filtered out), `served`(5),
`pendingPayment`(9), `paid`(6), `cancelled`(3), `reserved`(10). Map source:
`DashboardPage.jsx:737–747` and `:900–904`.

---

## 3. Current Grouping / Filtering Flow

### 3.1 Two parallel memoised data structures

**`channelData`** — `DashboardPage.jsx:662–799`:

```js
{
  dineIn:   { id, name, items: [...filtered], enabled },
  takeAway: { id, name, items: [...filtered], enabled },
  delivery: { id, name, items: [...filtered], enabled },
  room:     { id, name, items: [...filtered], enabled },
}
```

Each channel's `items` is built from per-channel source arrays
(`allTablesList`, `walkInOrders`, `takeAwayOrders`, `deliveryOrders`,
`allRoomsList`) and **then filtered through `statusMatchesFilter` and
`platformMatches`**:

```js
items: [
  ...allTablesList.filter(...).map(enrichTable).filter(statusMatchesFilter).filter(platformMatches),
  ...walkInOrders.map(adaptWalkIn).filter(statusMatchesFilter).filter(platformMatches),
]
```

`statusMatchesFilter` (L722–L751) computes `statusId` from `fOrderStatus`
and returns `activeStatuses.includes(statusId)`. So the cashier's chip
selection in the Header directly removes items from channel columns.

**`statusData`** — `DashboardPage.jsx:802–923`:

```js
{
  pending:   { id, name, fOrderStatus, items: [...], enabled },
  preparing: { ... },
  ready:     { ... },
  // ... one entry per STATUS_COLUMNS row, gated by enabledStatuses
}
```

Items are grouped *by `fOrderStatus`* and filtered by `activeChannels` and
`platform` (note: NOT by `activeStatuses` chips — status-view uses
`enabledStatuses` from settings + per-column "hide" instead). All orders
across all channels are pooled into `allOrders` (L827–L885) and bucketed
by status.

### 3.2 Render layer

`DashboardPage.jsx:1553–1595` renders **one** `ChannelColumnsLayout`,
switching `channels` prop on `dashboardView`:

```js
channels={
  dashboardView === 'status' && statusData
    ? Object.values(statusData).filter(c => c.items?.length > 0 && !hiddenStatuses.includes(c.id))
    : Object.values(channelData).filter(c => ...)
}
```

`ChannelColumnsLayout` renders one `ChannelColumn` per column.
`ChannelColumn.jsx:56–66`:

```js
const filteredItems = useMemo(() => {
  if (!channel.items) return [];
  if (matchingIds === null) return channel.items;
  return channel.items.filter(item => matchingIds.has(item.id || `${channel.id}-${item.orderId}`));
}, [channel.items, matchingIds, channel.id]);

const sortedItems = useMemo(() => {
  return sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY);  // ← status-priority sort
}, [filteredItems]);
```

`sortByActiveFirst` (`utils/statusHelpers.js:147–163`) keys on
`F_ORDER_STATUS_PRIORITY[a.fOrderStatus]` — i.e. **sort rank is the
order's current status**. Every column always sorts this way, regardless
of `dashboardView`. ChannelColumn doesn't even know `dashboardView`.

In status view this sort is effectively a no-op within a column because
all items in a status column share the same `fOrderStatus`, so they fall
through to the secondary label-numeric sort (L157–L161). In channel view
the items have heterogeneous statuses, so the sort actively re-orders
cards when any item's status changes.

### 3.3 Counters

`platformCounts` (L937–L998) is view-aware via the `statusOk` and
`channelOk` helpers — they switch between `activeStatuses` vs
`hiddenStatuses` (and `activeChannels` vs `hiddenChannels`) depending on
`dashboardView`. This is good and orthogonal to the bug; counts themselves
reflect the view-correct narrowing.

---

## 4. Current Action Flow

All status-changing card actions live in `DashboardPage.jsx`:

| Action | Handler (line) | API call | Status after |
|---|---|---|---|
| Accept (Confirm YTC) | `handleConfirmOrder` (L1216) | `confirmOrder` → `WAITER_DINEIN_ORDER_STATUS_UPDATE` | 7 → 1 |
| Mark Ready | `handleMarkReady` (L1375) | `updateOrderStatus(... 'ready')` | 1 → 2 |
| Mark Serve | `handleMarkServed` (L1388) | `updateOrderStatus(... 'serve')` *or* `completePrepaidOrder` | 2 → 5 (or 6 if prepaid) |
| Pay (Bill / Settle) | `handleBillClick` (L1361) → opens OrderEntry → `CollectPaymentPanel` | `BILL_PAYMENT` (eventual) | → 6 |
| Reject / Cancel | `handleCancelOrderFromCard` → `CancelOrderModal` → `handleCancelOrderConfirm` (L1237) | `orderToAPI.cancelOrder` → `ORDER_STATUS_UPDATE` | → 3 |
| Dispatch (delivery) | Card button → `onUpdateStatus` / status update flow | `updateOrderStatus` | (rider/dispatch flow) |
| Item-level Ready/Serve | `handleItemStatusChange` (L1411) | `FOOD_STATUS_UPDATE` | per-item; aggregate may flip order status |

Every action ends with a backend call. Server then emits a socket event
(`update-order`, `update-order-status`, `update-order-paid`,
`update-food-status`). `useSocketEvents` routes to handlers in
`socketHandlers.js`.

`handleUpdateOrderStatus` (`socketHandlers.js:402–469`):
1. Transforms the new order shape via `orderFromAPI.order`.
2. **Terminal cases** (status `cancelled`, `paid`, or `fOrderStatus=9`):
   `removeOrder(orderId)` + frees the table via `syncTableStatus(...,
   'available' or default)`.
3. **Non-terminal cases**: `updateOrder(orderId, order)` + `syncTableStatus`.
4. Releases order-engage via double-rAF.

The OrderContext / TableContext mutations trigger React re-renders.
`channelData` and `statusData` memos recompute. `ChannelColumn` re-sorts.
The DOM moves the card to its new sorted slot.

---

## 5. Why Movement Happens Today

### 5.1 Primary cause — in-column re-sort by status priority

`ChannelColumn.jsx:64–66` always sorts items by status rank
(`F_ORDER_STATUS_PRIORITY` 7→5→2→1→10→8→9). When a non-terminal status
change lands (e.g. Preparing → Ready, rank 3 → 2), the order's row index
within the channel column changes. Visually the card slides upward; the
cashier sees "the order moved". This happens **without any filter or
removal**.

`ChannelColumn` does not receive `dashboardView`, so it cannot
distinguish: status view wants this sort (effectively no-op within a
status column), channel view does not.

### 5.2 Secondary cause — status-chip filter in channel view

`channelData` items pass through `statusMatchesFilter` (DashboardPage
L774, L782, L788, L795). `statusMatchesFilter` is bound to `activeStatuses`
— the chip selection visible only in channel view's Header (L284–L303 of
`Header.jsx`).

If the cashier has narrowed the chip set (e.g. only "Preparing" + "Ready"
active), then the moment the status changes to one that's NOT in
`activeStatuses` (e.g. Served = `5`), the order disappears from the
channel column. This is the "order disappeared" complaint — driven by the
status filter, not the channel grouping.

By default (`activeStatuses` initialised at L367 with all nine status IDs),
this disappearance is dormant. But it is enabled the moment a cashier
clicks any chip.

### 5.3 Tertiary cause — terminal removal in socket handler

For `paid` (6), `cancelled` (3), and hold-clear (`fOrderStatus = 9` via
`update-order-status`), `socketHandlers.js:439–447` calls
`removeOrder(orderId)`. The order leaves the OrderContext entirely, so it
disappears from **both** views regardless of grouping or filters.

This is by-design for status view ("order paid → moves out of the running
dashboard"), but contradicts the channel-view expectation ("delivery order
remains in delivery view even after pay"). This is the only behaviour that
needs an **owner decision** — see §11 open questions.

### 5.4 NOT causes (verified)

- **Channel itself doesn't change.** `orderType` of an order is set at
  creation (web order_type / table type) and is not mutated by any
  status-update path. Searched: no setter writes `orderType` post-create.
- **`channelData` does not include `dashboardView` in its dependency
  array.** It does include `activeStatuses` and `platform`, plus the per-
  channel source arrays. So a status-only flip (no chip change) only
  recomputes when an order's `fOrderStatus` flips — and the recompute
  produces the *same* channel placement; the visible move comes from §5.1
  re-sort, not from `channelData` itself.
- **`socketHandlers` do not switch on `dashboardView`.** Mutations are
  view-agnostic, which is correct — the bug is in the rendering layer.

---

## 6. Expected Behavior Gap

| Behaviour | Current | Expected (per task) |
|---|---|---|
| Channel view + status flip (non-terminal) → card position | **shifts** (status-priority sort) | stay put (only badges/colour update) |
| Channel view + status flip → card visibility (status chips at defaults) | stays | stays ✓ |
| Channel view + status flip → card visibility (status chip narrowed) | disappears if new status is unchecked | stays (channel view should ignore status filter for membership) |
| Channel view + Pay (terminal) | disappears (removeOrder) | OPEN — see §11 |
| Channel view + Cancel/Reject (terminal) | disappears (removeOrder) | OPEN — see §11 |
| Status view + status flip → card position | moves to new status column | move to new status column ✓ |
| Status view + status flip → card visibility | moves between columns | moves ✓ |
| Status view + Pay (terminal) | disappears (removeOrder) | disappears ✓ |
| Actual channel change (e.g. dineIn → takeAway, hypothetically) | moves between channel columns | moves ✓ — but in practice not user-driven; channel is set at create time. |

The two clearly-broken cells are the two **"channel view, status flip"**
rows: the column re-sort and the chip-filter-driven disappearance.

---

## 7. Files / Functions Involved

### State + grouping
- `pages/DashboardPage.jsx`
  - `activeView` (L369), `setActiveView` (L369)
  - `dashboardView` (L380), `setDashboardView` (L380)
  - `activeChannels` (L366), `activeStatuses` (L367)
  - `hiddenChannels` (L408), `hiddenStatuses` (L409), `enabledStatuses` (L223)
  - `channelData` memo (L662–L799)
  - `statusData` memo (L802–L923)
  - `statusMatchesFilter` (L722–L751)
  - `platformMatches` (L758–L764, L892–L898)
  - `platformCounts` memo (L937–L998)
  - `<ChannelColumnsLayout/>` render block (L1553–L1595)

### Render / sort
- `components/dashboard/ChannelColumnsLayout.jsx` (whole file; receives
  `channels`, `viewType`; passes through to per-column children)
- `components/dashboard/ChannelColumn.jsx`
  - `filteredItems` memo (L56–L60) — search-id filter only
  - `sortedItems` memo (L64–L66) — **status-priority sort, unconditional**
- `utils/statusHelpers.js`
  - `TABLE_STATUS_PRIORITY` (L74–L83)
  - `F_ORDER_STATUS_PRIORITY` (L86–L94)
  - `sortByActiveFirst` (L147–L163)

### Header filter chips
- `components/layout/Header.jsx`
  - `dashboardView` prop (L46)
  - Pill swap block (L252–L304)
  - `handleStatusToggle` flips `activeStatuses` (L222–L232)

### Action handlers
- `pages/DashboardPage.jsx`
  - `handleConfirmOrder` (L1216) — Accept
  - `handleMarkReady` (L1375)
  - `handleMarkServed` (L1388)
  - `handleBillClick` (L1361) — opens collect-payment flow
  - `handleCancelOrder` / `handleCancelOrderFromCard` /
    `handleCancelOrderConfirm` (L1232, L1237, L1429)
  - `handleItemStatusChange` (L1411)
  - `handleUpdateTableStatus` (L1441)

### Socket handlers (state mutations after action)
- `api/socket/socketHandlers.js`
  - `handleUpdateOrderStatus` (L402–L469)
  - `handleUpdateOrder` (L212+)
  - `handleUpdateFoodStatus` (L344+)
  - `syncTableStatus` (L123–L131)
  - `handleNewOrder` (L146+) — for newly arrived scan orders

### Feature flags
- `constants/featureFlags.js`
  - `USE_CHANNEL_LAYOUT = true` (L20)
  - `USE_STATUS_VIEW = true` (L37)

---

## 8. Recommended Fix Plan

> **Owner-locked principle:** in channel view, membership is by **channel
> identity** (constant for the order's lifetime). Status flips must
> repaint badges / icons / button-state but not relocate or hide the card.

### 8.1 Pass `dashboardView` down to `ChannelColumn` (and its parent)

Currently `ChannelColumnsLayout` only knows `viewType` ('table'|'order').
Add a `groupingMode` (or pass `dashboardView` directly) so the column can
decide its sort/filter behaviour.

`DashboardPage.jsx:1553–1595` → add `groupingMode={dashboardView}` to
`<ChannelColumnsLayout/>`. Thread the prop through to `ChannelColumn`.

### 8.2 Make the in-column sort view-aware in `ChannelColumn.jsx:64`

```js
const sortedItems = useMemo(() => {
  if (groupingMode === 'channel') {
    // Channel view: stable order — preserve channel.items order from the
    // grouping memo (which is fed in a deterministic, source-array order).
    // Optionally fall back to a stable, non-status secondary key
    // (createdAt asc, or label-numeric) so the order doesn't shuffle when
    // an item is added/removed.
    return [...filteredItems].sort(stableNonStatusCompare);
  }
  return sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY);
}, [filteredItems, groupingMode]);
```

Recommended `stableNonStatusCompare`: by `createdAt` ascending (oldest
first) — matches kitchen FIFO expectation, status-agnostic, and a card
will not move when its status flips. Or by label-numeric (table number)
where present.

### 8.3 Decouple status-chip filter from `channelData` membership

`channelData` items currently pass through `statusMatchesFilter`. In the
channel-view world this is wrong by the new rule — channel membership
must NOT depend on `activeStatuses`.

Two safe shapes:

**Option A — drop `statusMatchesFilter` from `channelData` entirely.**
Move status filtering to a **visual treatment**, not a filter: e.g. dim or
fade cards whose status is outside `activeStatuses`. Counters in the chip
still respect `activeStatuses` (already view-aware via `platformCounts`).

**Option B — keep the filter only for "highlighted-only" semantics.**
Repurpose `activeStatuses` chips in channel view to a search-style
narrowing (matching items get a highlight, non-matching get dimmed); never
remove. The current "remove" behaviour is silently a hidden filter.

Recommend Option A for simplicity and minimal regression. Cashier already
has explicit per-column hide for channels (`hiddenChannels`); a parallel
"dim by status" treatment in channel view keeps the same screen
information density.

### 8.4 Decide terminal-status policy for channel view

This is the only case that needs explicit owner sign-off (§11).

If the owner wants paid/cancelled orders to disappear from channel view
too (consistent with today's `removeOrder` behaviour and with status
view), no code change is needed in the socket handler.

If the owner wants channel view to retain paid/cancelled orders for some
window (e.g. last N minutes, or until next refresh), the change is bigger:
either keep the order in context with a `terminalRemovedAt` timestamp and
filter it out of `statusData` while keeping it in `channelData`, or split
the contexts. **Out of scope for the in-column-move fix**; flag for
follow-up.

### 8.5 Guard rails

- Do NOT change `statusData` grouping or `sortByActiveFirst`'s behaviour
  for status view. Status view's contract is unchanged.
- Do NOT touch `channelData` source arrays (`takeAwayOrders`,
  `deliveryOrders`, etc.) or the order's `orderType` field.
- Do NOT touch socket handlers' update/remove logic except via §8.4
  (which is owner-gated).
- Do NOT modify `platformCounts` — it already correctly switches on
  `dashboardView`.
- Do NOT touch VAT / Service Charge / Tip / Delivery Charge math.
- Keep test IDs and `data-testid` patterns intact for QA scripts.

### 8.6 Approximate diff envelope

- `DashboardPage.jsx`: add `groupingMode` prop pass-through; (Option A)
  remove `.filter(statusMatchesFilter)` from the four `channelData.items`
  arrays. ~+1 / −4 lines.
- `ChannelColumnsLayout.jsx`: accept `groupingMode` prop and forward to
  each `ChannelColumn`. ~+2 lines.
- `ChannelColumn.jsx`: receive `groupingMode`; branch in `sortedItems`
  memo; optional dim-styling for off-chip statuses if Option A taken.
  ~+15 / −2 lines.
- No backend, no transform, no payload builder, no auth, no VAT/SC/tip.

---

## 9. Regression Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Status view stops auto-moving cards to new status column | LOW — the change only branches on `groupingMode === 'channel'`; status view's branch retains `sortByActiveFirst` | Test status view first; predicate is the only gate |
| Stale status indicator on cards in channel view | LOW — cards still receive the updated `fOrderStatus` via `channelData` recompute; only their *position* and *visibility* are stabilised. The card itself re-renders with new badge/colour. | Verify TableCard/OrderCard already keys badges on `fOrderStatus`, which they do via `getOrderStatusConfig` / `getTableStatusConfig` |
| Duplicate cards if an order is matched by two channels | NONE under current code — source arrays are mutually exclusive (`walkInOrders`, `dineInOrders`, etc.) and `id` keys are `${type}-${orderId}` | No mitigation needed |
| Paid/Rejected orders staying in channel view indefinitely | OWNER DECISION — current behaviour (§8.4) keeps removal; if owner reverses, must add staleness sweep | Defer; gate behind owner decision |
| Table cards (no order) losing their slot when an order opens on the table | LOW — table-card stable-sort by table number gives a deterministic slot regardless of status | Use label-numeric secondary in channel-view sort |
| Channel-tab counts mismatch — counts respect `activeStatuses` but visibility doesn't | MEDIUM if Option A taken — counters currently match the *filtered* `channelData`. After the fix, the column shows more cards than the count badge. Need to either update the count to match (count all channel cards regardless of status chip) or keep the chip semantics consistent | Recompute counts to exclude `activeStatuses` narrowing in channel view, OR keep chips as "highlight" semantics (Option B) |
| Search filter regression | NONE — search filter (`matchingIds`) is computed in `ChannelColumn.filteredItems` upstream of `sortedItems`; unchanged | n/a |
| Socket update race after action → engaged-lock release | NONE — `setOrderEngaged(orderId, false)` runs unchanged; engage / disengage is orthogonal to the grouping layer | n/a |
| Per-column hide via `hiddenChannels` / `hiddenStatuses` | NONE — column-level hide is at `ChannelColumnsLayout` parent and is view-correct already | n/a |
| StationPanel (kitchen view) parity | LOW — StationPanel is a separate render path; not affected unless it imports the same `sortByActiveFirst`. Worth a grep before fix. | Quick verification step |

---

## 10. QA Checklist (post-fix)

### Channel view — non-terminal status flips
1. Dine-In channel, order in Preparing → click Mark Ready → card **stays
   in same slot**, status badge changes to Ready, channel column remains
   Dine-In. ✅
2. Delivery channel, scan order in YTC → click Accept → card stays in
   Delivery column same slot, badge changes to Preparing. ✅
3. Room channel, order in Ready → click Mark Served → card stays in Room
   column same slot, badge changes to Served. ✅
4. TakeAway channel, order in Preparing → click item-level Ready (single
   item) → card stays put; if aggregate order status flips to Ready, badge
   updates but slot does not move. ✅
5. Dine-In channel, status chip "Ready" toggled OFF; order transitions
   Preparing → Ready → card STAYS visible in Dine-In (Option A), possibly
   dimmed. (Old behaviour: card disappears.) ✅

### Channel view — terminal statuses (depends on §11 decision)
6. Dine-In channel, click Pay → if owner picks "keep" → card stays in
   Dine-In with `paid` styling. If owner picks "remove" → card disappears
   (current behaviour). Document & test the chosen path.
7. Delivery channel, click Reject → same dual-path test.

### Status view — must not regress
8. Status view, Preparing column, click Mark Ready on a card → card moves
   from Preparing column to Ready column. ✅
9. Status view, Ready column, click Pay → card removed from running
   dashboard. ✅
10. Status view, click any channel chip OFF → orders of that channel
    disappear from all status columns. ✅
11. Status view, sort within a column remains label-numeric (no visible
    change). ✅

### Counter / badge consistency
12. Channel column header count matches the number of visible cards (no
    mismatch after Option A). ✅
13. Header chip counts (active/total) still reflect the same numbers they
    do today (view-aware via `platformCounts`). ✅
14. Per-column hide / restore-hidden flows unchanged. ✅

### Socket / refetch path
15. Manual refresh button → all cards re-render at their stable channel-
    view positions. ✅
16. Cross-device socket update (other cashier marks Ready) → same
    behaviour as a local Mark Ready. ✅

### Negative
17. Available table cards in Dine-In channel stay at the end of the column
    (priority 99). ✅
18. Disabling Order Taking → channel view still renders correctly with
    `'order'` enforcement. ✅

---

## 11. Open Questions

> Items requiring owner decision before implementation. **None of these
> block the in-column-move fix (§5.1)**, which is unambiguous — only the
> downstream policy questions are flagged.

1. **Terminal status (Paid 6) in channel view: keep or remove?**
   Today: `removeOrder` in `handleUpdateOrderStatus` strips the order from
   the OrderContext entirely. This is the same behaviour the status view
   wants. Spec line "Delivery order remains in Delivery view even after
   status action" is ambiguous about whether "status action" includes
   *Pay*. Owner needs to choose:
   - (a) Channel view also removes paid orders (current; consistent with
     status view; simplest).
   - (b) Channel view retains paid orders for some window or until next
     refresh (UX argument: cashier can verify the order was paid). Bigger
     code change.

2. **Terminal status (Cancelled 3 / Reject) in channel view: keep or
   remove?** Same as #1.

3. **Status-chip filter semantics in channel view: REMOVE or HIGHLIGHT?**
   - (a) Drop the filter (Option A in §8.3) — chips no longer narrow
     visibility; only the count badges change. Simpler and matches
     "should not disappear" verbatim.
   - (b) Convert chips to a highlight-only treatment (Option B) — chips
     dim non-matching cards; cashier still sees them. Preserves the
     existing visual affordance for narrowing.

4. **Channel-view sort stability rule: createdAt-asc or label-numeric?**
   Owner pick. CreatedAt-asc matches FIFO kitchen mental model; label-
   numeric matches table-floor mental model. Recommend createdAt-asc for
   order view, label-numeric for table view (we have `viewType` already
   threaded — easy to branch).

5. **Should `enabledStatuses` (settings page) hide cards in channel view
   too?** Today, `enabledStatuses` only gates `statusData` column
   visibility. It does not touch `channelData`. Likely already correct
   (channel view is channel-axis-only) but flag for owner confirmation.

6. **StationPanel / kitchen view parity** — out of scope per task, but
   confirm with owner if the same channel-view stability rule should
   apply to the station view's grouping (separate code path).

---

## 12. References (quick links)

- `frontend/src/pages/DashboardPage.jsx:369–390` — view-mode state init
- `frontend/src/pages/DashboardPage.jsx:662–799` — `channelData`
- `frontend/src/pages/DashboardPage.jsx:722–751` — `statusMatchesFilter`
- `frontend/src/pages/DashboardPage.jsx:802–923` — `statusData`
- `frontend/src/pages/DashboardPage.jsx:1553–1595` — render switch
- `frontend/src/components/dashboard/ChannelColumn.jsx:56–66` — filter/sort
- `frontend/src/utils/statusHelpers.js:74–94, 147–163` — priority + sort
- `frontend/src/components/layout/Header.jsx:252–304` — chip swap
- `frontend/src/api/socket/socketHandlers.js:402–469` — update-order-status

— End of investigation.
