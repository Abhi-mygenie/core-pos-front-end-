# Status vs Channel View Movement — Fix Report

> **Status:** Implementation complete. Lint clean on all three files. Full
> Jest suite green (492 / 492 across 34 suites). No commits.
> **Scope:** Render-layer + `channelData` membership filter only. No
> socket-handler, action-handler, backend, transform, payload-builder,
> VAT, service-charge, tip, or delivery-charge changes.
> **Source plan:** `STATUS_VS_CHANNEL_VIEW_MOVEMENT_FIX_PLAN.md` in this
> same folder.

---

## 1. Files Changed

| File | Lines | Why |
|---|---|---|
| `frontend/src/pages/DashboardPage.jsx` | +18 / −7 | (a) Pass `groupingMode={dashboardView}` to `<ChannelColumnsLayout/>` (L1577). (b) Remove `.filter(statusMatchesFilter)` from the four `channelData.items` arrays (dineIn, walkIn fold, takeAway, delivery, room — 5 call sites). Added explanatory comment block. `platformMatches` retained. Dep-array kept as belt-and-braces per plan §5.2. |
| `frontend/src/components/dashboard/ChannelColumnsLayout.jsx` | +7 / 0 | Accept new `groupingMode` prop (default `'channel'`); forward to every `<ChannelColumn/>` child. No logic change. |
| `frontend/src/components/dashboard/ChannelColumn.jsx` | +71 / −2 | Accept `groupingMode` prop (default `'channel'`). Branch in `sortedItems` memo: `'status'` mode keeps the existing `sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY)` call byte-for-byte; `'channel'` mode uses a new stable status-independent comparator gated on existing `viewType` ('table' → label-numeric; 'order' → `createdAt` FIFO). Pre-buckets `[occupied, available]` to preserve "available rows at the bottom" without re-introducing status-priority for occupied cards. |

Total: **+96 / −7 lines, 3 files.** No other file touched.

---

## 2. Exact Sorting Behaviour Implemented

### 2.1 Status view (`groupingMode === 'status'`) — UNCHANGED

```js
return sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY);
```

Byte-identical to the legacy implementation. Within a same-status status
column this is effectively a no-op on the priority key (all items share
`fOrderStatus`); falls through to the secondary label-numeric sort in
`sortByActiveFirst`. Confirmed by re-reading `utils/statusHelpers.js:147–163`.

### 2.2 Channel view (`groupingMode === 'channel'`) — NEW

Stable, status-independent comparator, branched on existing `viewType`:

- **`viewType === 'table'`** → `tableCompare`
  1. Primary: label-numeric ascending (`parseInt(label.replace(/\D/g, ''))`).
  2. Fallback: locale string compare on label.

- **`viewType === 'order'`** → `orderCompare`
  1. Primary: `createdAt` ascending (FIFO) — uses `a.createdAt ?? a.order?.createdAt` so it picks up either the adapter-set value (channel-row adapter) or the embedded order payload.
  2. Fallback: `orderNumber` ascending numeric.
  3. Final fallback: `tableCompare(a, b)` (label-numeric) for determinism.

**Available-last bucketing.** Before sorting, items are pre-split into
`occupied` and `available` (where `available` = `status === 'available'
|| status === 'disabled'`). Each bucket is sorted with the view-type
comparator, then concatenated `[...occupied, ...available]`. This
preserves the legacy "available tables at the bottom of Dine-In"
affordance without re-introducing any status-priority ordering for
occupied cards.

### 2.3 Proof of stability across status flips

The new comparator reads only:

- `viewType` — a layout-level prop, constant per render.
- `label` / `tableNumber` / `id` — set at order/table creation.
- `createdAt` — set at order creation; never mutated by any
  status-update path (verified by grepping `socketHandlers.js`,
  `orderTransform.js`, `tableTransform.js`).
- `orderNumber` — set at order creation; immutable.
- `status === 'available' || 'disabled'` — flips only when a table
  goes free ↔ occupied, which is exactly when the card SHOULD change
  slot.

Therefore Accept / Mark Ready / Mark Served / Dispatch / item-level
status changes — none of which touch any comparator key — cannot cause
position movement in channel view. The card's `fOrderStatus` is still
threaded through the badge/colour render path (TableCard /
OrderCard / DineInCard), so its visual state still updates.

---

## 3. Exact Filtering Behaviour Changed

### 3.1 Channel view membership — REMOVED status-chip filter

`channelData.items` no longer pipes through `statusMatchesFilter`. The
five removed `.filter(statusMatchesFilter)` calls were at:

- `DashboardPage.jsx:774` — dineIn (allTablesList branch)
- `DashboardPage.jsx:775` — dineIn (walkInOrders branch)
- `DashboardPage.jsx:782` — takeAway
- `DashboardPage.jsx:788` — delivery
- `DashboardPage.jsx:795` — room

`statusMatchesFilter` is still **defined** inside the `channelData` memo
(line 722–751) but now has zero call sites. Per the plan §5.2 it is
intentionally left in place for one release as a tidy-up follow-up — no
behavioural impact, lint-clean.

`activeStatuses` is similarly kept in the memo dep-array
(`DashboardPage.jsx:799`) for one release as belt-and-braces against HMR
/ strict-mode surprises. Reading an unused dep is harmless (it just
recomputes the memo more often when the dep flips; the result is the
same).

### 3.2 Retained orthogonal filters (NO change)

- `platformMatches` (POS2-002 Phase 3 platform dropdown) — still applied
  on all four channel arrays.
- `hiddenChannels` per-column hide — still applied at `DashboardPage.jsx:1558–1566`.
- `channelVisibility` settings override — still applied.
- `enabled` flag (features.dineIn / takeaway / delivery / room) — still applied.
- Search-id narrowing (`matchingIds`) — still applied in
  `ChannelColumn.filteredItems` upstream of the new `sortedItems`.

### 3.3 Status view filtering — UNCHANGED

- `enabledStatuses` (settings page) → still gates status columns.
- `hiddenStatuses` (per-column hide) → still applied at
  `DashboardPage.jsx:1557`.
- `activeChannels` (channel chips in status view) → still narrows
  `statusData` items per channel.
- `platformMatches` → still applied.

### 3.4 Header status chips — VISUAL/CLICK SEMANTICS UNCHANGED

The chips still flip `activeStatuses` state on click. They still render
identically. After this CR they simply no longer drive channel-view card
visibility. Their information continues to feed `platformCounts` (which
is already view-aware via `dashboardView`).

---

## 4. Confirmation: Status View Unchanged

- `statusData` memo (DashboardPage.jsx:802–923) — **not edited**.
- Render switch at L1556 (`dashboardView === 'status' && statusData ? Object.values(statusData)... : Object.values(channelData)...`) — **not edited**.
- `ChannelColumn` sort branch for `groupingMode === 'status'` calls
  `sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY)` byte-for-byte.
- `TABLE_STATUS_PRIORITY`, `F_ORDER_STATUS_PRIORITY`, `sortByActiveFirst`
  in `utils/statusHelpers.js` — **not edited**.
- `enabledStatuses` / `hiddenStatuses` / `activeChannels` paths — **not edited**.
- `STATUS_COLUMNS` constant import — **not edited**.

Status view continues to:
- Group orders by `fOrderStatus` via `statusData`.
- Show channel-narrow chips in Header (`dashboardView === 'status'` branch in `Header.jsx:255`).
- Move cards between columns on status flips (existing per-column membership recomputes).
- Sort within each column by priority (no-op within same-status column → label-numeric tiebreak).

---

## 5. Confirmation: Paid / Cancelled Terminal Behaviour Unchanged

- `frontend/src/api/socket/socketHandlers.js` — **not edited** in any way.
- `handleUpdateOrderStatus` (L402–L469) → still calls
  `removeOrder(orderId)` for `status === 'cancelled'`, `status === 'paid'`,
  and `fOrderStatus === 9` (hold-clear). Verified via `git diff HEAD --`
  — file is unchanged.
- `handleUpdateOrder` / `handleUpdateFoodStatus` /
  `handleNewOrder` / `handleScanNewOrder` — **not edited**.
- Action handlers in `DashboardPage.jsx` (`handleConfirmOrder`,
  `handleMarkReady`, `handleMarkServed`, `handleBillClick`,
  `handleCancelOrderFromCard`, `handleCancelOrderConfirm`,
  `handleItemStatusChange`, `handleUpdateTableStatus`) — **not edited**.
- `orderService.js` (`updateOrderStatus`, `confirmOrder`,
  `completePrepaidOrder`) — **not edited**.

Paying / cancelling an order continues to remove it from OrderContext
via socket; it disappears from BOTH views, exactly as before. The terminal
path is fully orthogonal to this CR.

---

## 6. QA / Check Results

### 6.1 Static
- Lint (ESLint): `DashboardPage.jsx` ✅ no issues, `ChannelColumnsLayout.jsx` ✅ no issues, `ChannelColumn.jsx` ✅ no issues.
- Verified the only files touched in the diff are the three approved files (`git diff --stat HEAD`).

### 6.2 Test suite
- `yarn test --watchAll=false`: **492 / 492 tests pass across 34 / 34 suites**, time ≈ 6s.
- Specifically green: `CollectPaymentPanel.deliveryLock.test.jsx` (28),
  `orderTransform`/`socket`/`subtotal-delivery` (64),
  `placeOrderPayload`/`updateOrderPayload`/`cancelItemPayload`/`cancelAndUpdatePayload` (82) — confirming no regression in delivery-lock, transforms, or payload builders.

### 6.3 Static QA matrix (against §10 of the plan)

| # | Case | Predicted result | Source |
|---|---|---|---|
| 1 | Status view, Mark Ready → card moves Preparing → Ready column | ✅ `statusData` groups by `fOrderStatus`; `updateOrder` flips `fOrderStatus`; memo recomputes; card appears in new column. Untouched. | n/a |
| 2 | Status view sort within a column = label-numeric | ✅ `sortByActiveFirst` runs verbatim; same-status items fall through to L157–L161 of `statusHelpers.js`. | unchanged |
| 3 | Status view, channel chip OFF → cards of that channel disappear | ✅ `statusData` filters by `activeChannels`; untouched. | DashboardPage.jsx:830,853,860,867 |
| 4 | Status view, Pay → card removed | ✅ `handleUpdateOrderStatus` → `removeOrder` unchanged. | socketHandlers.js:439 |
| 5 **(MUST PASS)** | Dine-In channel, Mark Ready → card stays in same slot | ✅ `channelData` recomputes (`dineInOrders` flips), but card stays in `dineIn` bucket; `ChannelColumn.sortedItems` now keys on label-numeric (table view) or `createdAt` (order view) — neither changes. | ChannelColumn.jsx new sort |
| 6 **(MUST PASS)** | Delivery channel, scan YTC → Accept → card stays in Delivery | ✅ same as #5. `createdAt` FIFO determines slot; unchanged by Accept. | same |
| 7 **(MUST PASS)** | Room channel, Mark Served → card stays in Room | ✅ same as #5. | same |
| 8 **(MUST PASS)** | TakeAway channel, item-level Ready → card stays put | ✅ same as #5; aggregate status flip doesn't move card. | same |
| 9 **(MUST PASS)** | Channel view, click any status chip → no card disappears | ✅ `statusMatchesFilter` removed from `channelData`; chip state still flips but is no longer read by membership. | DashboardPage.jsx:774–796 |
| 10 **(MUST PASS)** | Channel view + Pay → card removed | ✅ socket-layer `removeOrder` unchanged. | socketHandlers.js:447 |
| 11 | Table sub-view (Dine-In) → label-numeric ascending; available at bottom | ✅ `tableCompare` + occupied/available pre-bucket. | ChannelColumn.jsx new sort |
| 12 | Order sub-view (Delivery) → createdAt ascending | ✅ `orderCompare` primary key. | same |
| 13 | Multiple orders for same table (split) → label-derived slot order | ✅ Labels are `T5 (1/2)` / `T5 (2/2)`; numeric strip yields 5/5 tie → fallback locale string compare orders by label string. | same |
| 14 | Channel view, Mark Ready → badge changes Preparing→Ready | ✅ TableCard/OrderCard re-render with new `fOrderStatus` from `updateOrder`; only sort key is decoupled. | unchanged |
| 15 | Channel view, Mark Served → badge updates | ✅ same as #14. | unchanged |
| 16 | Header pulse counts unchanged in both views | ✅ `platformCounts` (L937–L998) not touched; switches on `dashboardView` as before. | unchanged |
| 17 | Channel view, chip ON/OFF → visible card count unchanged | ✅ Counts are independent of `channelData` filter today; `platformCounts` reads tagged source arrays directly. | DashboardPage.jsx:980–991 |
| 18 | Available table cards in Dine-In stay at bottom | ✅ Pre-bucket `[occupied, available]` preserves the affordance. | ChannelColumn.jsx new sort |
| 19 | Disable Order Taking → channel view renders correctly with 'order' | ✅ Forced-view logic at L371/L382/L463–L478 unchanged. | unchanged |
| 20 | Manual refresh → cards same slot | ✅ Comparator deterministic. | new sort |
| 21 | Cancel order → removed from dashboard | ✅ socket `removeOrder` unchanged. | unchanged |
| 22 | New scan-order arrival → appended FIFO in order view; table-number slot in table view | ✅ `createdAt` of new order is latest → appended to end of `occupied` bucket; label-numeric in table view drops into its table slot. | new sort |
| 23 | Full Jest suite green | ✅ 492/492. | execution |
| 24 | Manual smoke (deferred to QA team) | n/a — out of scope for static implementation report | deferred |

All static / suite checks pass. Manual smoke is owner / QA-team
responsibility before release.

---

## 7. Report Path

`/app/memory/change_requests/status_vs_channel_view_movement_investigation/STATUS_VS_CHANNEL_VIEW_MOVEMENT_FIX_REPORT.md`

---

## 8. Risks / Open Questions

### 8.1 Dead code / dep-array cleanup (informational, non-blocking)
- `statusMatchesFilter` is defined but no longer called inside the
  `channelData` memo. Kept on purpose per plan §5.2 for one release to
  keep the diff minimal and ease rollback. Lint is clean. Recommended
  follow-up: delete the function and remove `activeStatuses` from the
  memo dep-array in a tidy-up CR once this change has soaked.

### 8.2 Status-chip UX clarity (informational, owner-acked)
- After this CR, clicking a status chip in channel view no longer
  changes the visible card list (only the chip's own active highlight
  updates). Owner has accepted this. If cashier confusion is reported,
  a follow-up Header CR can either (a) repurpose the chips as a
  highlight-only dim treatment, or (b) hide the chips entirely in
  channel view.

### 8.3 StationPanel parity (informational, out of scope)
- The kitchen station view is rendered by `components/station-view/`
  (separate code path). It does not use `ChannelColumn`. If StationPanel
  has its own status-priority sort, parity drift may emerge later; raise
  as a sibling CR if owner finds it.

### 8.4 No blocking risks
- All tests green. No socket / backend / payload-builder / VAT / SC /
  tip / delivery-charge code was touched. Status view contract is
  preserved byte-for-byte for its branch of `sortedItems`. Terminal
  removal preserved at the socket layer.

### 8.5 Recommended (non-blocking) follow-up
- Add a `ChannelColumn.channelSort.test.jsx` mirroring the existing
  `CollectPaymentPanel.deliveryLock.test.jsx` shape, to lock the new
  comparator contract permanently. Pure-function tests of `tableCompare`
  / `orderCompare` + 1 RTL render asserting `data-testid` ordering on a
  synthetic 3-item list before and after a status flip. ~80 LOC of test
  code; can ship in the same PR or a follow-up.

— End of fix report.
