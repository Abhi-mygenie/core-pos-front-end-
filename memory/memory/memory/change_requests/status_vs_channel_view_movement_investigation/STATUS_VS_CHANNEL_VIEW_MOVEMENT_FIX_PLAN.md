# Status vs Channel View Movement Fix Plan

> **Scope:** Planning only. No code changes, no commits, no refactor.
> **Source investigation:** `STATUS_VS_CHANNEL_VIEW_MOVEMENT_INVESTIGATION.md`
> in this same folder.
> **Owner-approved behaviour ruleset:** see §3.

---

## 1. Summary

Make the dashboard's **column renderer view-aware** so that in channel view
the cards are placed by a **status-independent stable sort** and the
**status-chip filter does not remove cards from channel columns**. Status
view keeps its existing behaviour byte-for-byte. Socket handlers,
backend, payload builders, VAT/SC/tip/delivery-charge logic and the
terminal removal path are not touched.

The change is small and confined to three frontend files. A new
`groupingMode` prop ('channel' | 'status') threads from
`DashboardPage.jsx` → `ChannelColumnsLayout.jsx` → `ChannelColumn.jsx`.
That single signal drives:

- **Sorting** at `ChannelColumn.sortedItems`: status-view keeps
  `sortByActiveFirst(TABLE_STATUS_PRIORITY)`; channel-view switches to a
  stable status-independent comparator that depends on `viewType` (table →
  label-numeric ascending; order → `createdAt` ascending / FIFO).
- **Membership filter** at `channelData`: in channel view, `channelData`
  no longer applies `statusMatchesFilter` to its `items` arrays. The
  Header status chips still update `activeStatuses` but those chips no
  longer narrow the channel-view card list. Status-view filtering uses
  `enabledStatuses` + per-column hide, unchanged.

---

## 2. Confirmed Root Cause From Investigation

Three layered behaviours bleed status-axis semantics into channel view:

1. **In-column re-sort by status priority (dominant cause).**
   `ChannelColumn.jsx:64–66` calls
   `sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY)`
   unconditionally. `F_ORDER_STATUS_PRIORITY` keys on `fOrderStatus`, so
   any non-terminal status flip (Preparing 1 → Ready 2, etc.) re-orders
   the card inside its channel column. ChannelColumn does not know
   `dashboardView`.

2. **Status-chip filter applied to channel data.**
   `DashboardPage.jsx:774, 782, 788, 795` pass `channelData` items
   through `statusMatchesFilter` (L722–L751), which checks
   `activeStatuses` — the chips the cashier sees in the channel-view
   Header. If chips are narrowed, an order whose status transitions out
   of the active set disappears from the channel column.

3. **Terminal removal in the socket handler.**
   `socketHandlers.js:439–447` calls `removeOrder(orderId)` for paid (6),
   cancelled (3), and hold-clear (`fOrderStatus = 9`). This drops the
   order from BOTH views. **Owner has ruled this out of scope for the
   current fix** — see §3.

Status view itself works correctly today.

---

## 3. Owner Decisions Applied

| Decision | Source | Applied as |
|---|---|---|
| Status-wise view behaviour is unchanged | task brief §1 | No edits to `statusData`, no edits to `sortByActiveFirst`, no edits to status-view branch in render switch. |
| Channel-wise view: cards do NOT move/reorder on status change | task brief §2 | Branch in `ChannelColumn.sortedItems` keyed on `groupingMode === 'channel'`. |
| Channel-wise view: cards stay in their channel column | task brief §2 | Drop `statusMatchesFilter` from the four `channelData.items` arrays. |
| Channel-wise view: status badge updates normally | task brief §2 | No change required — cards already key their badges on `fOrderStatus`; only position/visibility was wrong. |
| Paid/cancelled terminal removal: unchanged | task brief §3 | Socket handler `handleUpdateOrderStatus` untouched. |
| No socket / backend / action-handler changes | task brief §3 | Confined to render-layer + `channelData` filter. |

Owner has also implicitly fixed two open questions from the
investigation:

| Investigation §11 open question | Owner decision |
|---|---|
| Q3 — status chips in channel view: REMOVE or HIGHLIGHT? | **REMOVE the filter** (Option A in investigation §8.3). Chips will no longer narrow channel-view visibility. |
| Q4 — channel-view sort stability key | **Table view → label-numeric; Order view → `createdAt` ascending (FIFO)**. |

Investigation §11 items 1, 2 (terminal-status policy) are owner-acked as
"keep current behaviour" → no code touches the socket path.

---

## 4. Files Proposed To Change

| File | Why | Rough edit size |
|---|---|---|
| `frontend/src/pages/DashboardPage.jsx` | (a) Pass `groupingMode={dashboardView}` to `<ChannelColumnsLayout/>`. (b) In the `channelData` memo, remove `.filter(statusMatchesFilter)` from the four channel `items` arrays (dineIn, takeAway, delivery, room). Keep `platformMatches` filtering intact (orthogonal to this CR). | ~+1 / −4 |
| `frontend/src/components/dashboard/ChannelColumnsLayout.jsx` | Accept a new `groupingMode` prop and forward it to each `<ChannelColumn/>`. No logic change. | ~+2 |
| `frontend/src/components/dashboard/ChannelColumn.jsx` | Accept `groupingMode` prop. Branch in `sortedItems` memo: channel mode → stable status-independent comparator (gated by existing `viewType`); status mode → existing `sortByActiveFirst`. | ~+18 / −2 |

**No other file** is touched. No socket handlers, no action handlers, no
contexts, no transforms, no payload builders, no `utils/statusHelpers.js`
exports, no `constants/`, no tests need new logic (existing tests should
remain green; new tests are recommended in §10 as a follow-up rather
than as part of this CR).

---

## 5. Proposed Code Plan

Step-by-step, in execution order.

### 5.1 `DashboardPage.jsx` — prop pass-through

At `DashboardPage.jsx:1554` add `groupingMode={dashboardView}` to the
`<ChannelColumnsLayout/>` props.

### 5.2 `DashboardPage.jsx` — drop status-filter from `channelData`

In the `channelData` memo (L662–L799), remove the `.filter(statusMatchesFilter)`
chain from the four `items` builders at L774, L782, L788, L795. **Keep
the `platformMatches` filter** — it implements an orthogonal contract
(POS2-002 Phase 3 platform dropdown) that the owner has not relaxed.

`statusMatchesFilter` itself can stay in the file for now (it is also
used inside `statusData`'s `platformMatches` block indirectly? — verify:
the function is defined inside the `channelData` memo and currently has
no other callers. Once removed from the four arrays it becomes dead and
can be deleted in a tidy-up follow-up. **Do not delete it in this CR**
to keep diff minimal and ease rollback.

Dependency-array review: `channelData`'s deps list (L799) already
includes `activeStatuses`. After §5.2 the dep is no longer read inside
the memo body. **Keep it in the array for one release** to avoid
behavioural surprises in HMR / strict-mode double-invocation; queue dep-
list cleanup for the same tidy-up follow-up. (Reading an unused dep is
harmless other than recomputing the memo more often, which is fine.)

### 5.3 `ChannelColumnsLayout.jsx` — accept and forward `groupingMode`

Add `groupingMode` to the destructured props (default `'channel'` for
safety) and pass it through to every `<ChannelColumn/>` render site.

### 5.4 `ChannelColumn.jsx` — view-aware `sortedItems`

Accept `groupingMode` prop (default `'channel'`).

Replace the current `sortedItems` memo body with a branch:

```js
const sortedItems = useMemo(() => {
  if (groupingMode === 'status') {
    // Status view: existing behaviour byte-for-byte.
    return sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY);
  }
  // Channel view: status-independent stable sort, view-type aware.
  return [...filteredItems].sort(channelStableCompare);
}, [filteredItems, groupingMode]);
```

`channelStableCompare` rules (see §6 below):

- `viewType === 'table'` → label-numeric ascending, fallback string compare.
- `viewType === 'order'` → `createdAt` ascending (FIFO); fallback to
  `orderNumber` ascending; fallback to label-numeric to keep determinism.

Comparator should be defined locally in the file (or imported from a
tiny helper) but **must not import from `statusHelpers.js`'s
status-priority constants** to keep the channel-view sort orthogonal to
status forever.

### 5.5 No other changes

- No edit to `sortByActiveFirst`, `TABLE_STATUS_PRIORITY`,
  `F_ORDER_STATUS_PRIORITY` (status view continues to need them).
- No edit to `Header.jsx` chips — the chips still set `activeStatuses`;
  they simply stop driving channel-view visibility. Their tooltips /
  labels are unchanged. (Owner may want a follow-up to repurpose the
  chips in channel view, but that's a separate UX request.)
- No edit to `platformCounts`. Counter math is already view-aware via
  `dashboardView` (DashboardPage.jsx:947–965).
- No edit to socket handlers.
- No edit to backend, transforms, payload builders, VAT/SC/tip math.

---

## 6. Sorting Plan

### 6.1 Status view (unchanged)
Use `sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY)`:

- Primary key: status priority (7→5→2→1→10→8→9→available last).
- Secondary key: label-numeric ascending.
- Within a status column all items share the same `fOrderStatus`, so the
  primary key is a no-op and the column effectively sorts by label-
  numeric. This is what status view does today; no regression.

### 6.2 Channel view (new, stable, status-independent)

Comparator: `channelStableCompare(a, b)` defined inside `ChannelColumn`.

```text
viewType === 'table':
  1. Compare label-numeric (parseInt strip) ascending.
  2. Fallback: locale string compare on label.

viewType === 'order':
  1. Compare createdAt ascending (FIFO). Use ISO-string comparison
     directly on createdAt (transform already stores it as ISO).
  2. Fallback: orderNumber ascending (numeric).
  3. Fallback: label-numeric to guarantee determinism.
```

Rationale:
- **Table view** — cashier mental model is table number on the floor.
  Card slot stability matters more than recency.
- **Order view** — kitchen / dispatch FIFO mental model. Oldest order
  at the top, never re-ordered by status change. This matches the
  current real-world workflow ("the oldest order at the top is the next
  one to be handled").

**Available tables**: today `TABLE_STATUS_PRIORITY` pushes available
tables to the bottom (rank 99). The new channel-view sort drops this
distinction → available cards interleave with occupied. Investigation
§11 didn't flag this as a blocker, but it is a visible behavioural
change. **Mitigation:** keep an "available last" tertiary nudge inside
the channel-view comparator without re-introducing any status-priority
ordering for *occupied* cards. Implementation: pre-bucket `filteredItems`
into `[occupied, available]` (using the existing `status === 'available'
|| 'disabled'` test — no new state derivation), sort each bucket with the
view-type comparator, then concat. This preserves the "available rows
sink to the bottom of Dine-In" behaviour without coupling occupied
cards' positions to their status. See §9 risk row 6.

### 6.3 Why this is provably stable across status flips
The new comparator only reads:

- `viewType` (a render prop, not an order field) — constant per render.
- `label`, `id`, `tableNumber` — set at order creation, never mutated by
  a status update path.
- `createdAt` — set at order creation, never mutated by a status update.
- `orderNumber` — set at order creation, never mutated.
- `status === 'available' || 'disabled'` (only for the available-bucket
  pre-split) — flips only when a table goes from free to occupied or
  vice-versa, which is exactly when the card SHOULD change slot.

Therefore an Accept / Mark Ready / Mark Served / Dispatch action — none
of which touch any of the comparator's keys — cannot cause a position
change. Verified by static reading of `socketHandlers.js`.

---

## 7. Filtering Plan

### 7.1 Status view (unchanged)

- `activeChannels` (chips in status view) → narrows `statusData` items
  by channel. Unchanged.
- `enabledStatuses` (settings page) → gates which status columns appear.
  Unchanged.
- `hiddenStatuses` (per-column hide) → hides a specific status column.
  Unchanged.
- `platformMatches` → applied. Unchanged.

### 7.2 Channel view (new)

- `activeStatuses` (chips in channel view) → **no longer applied to
  `channelData` membership**. The chips still flip the state variable
  and continue to feed `platformCounts` (which the Header chip uses for
  its own count badge). Chip clicks no longer cause cards to appear /
  disappear in channel columns.
- `hiddenChannels` (per-column hide) → hides a specific channel column.
  Unchanged.
- `channelVisibility` (settings override) → unchanged.
- `platformMatches` → still applied. Unchanged.
- Search-id narrowing (`matchingIds`) → still applied in
  `ChannelColumn.filteredItems`. Unchanged.
- Terminal removal (paid / cancelled / hold-clear) → still applied at
  the socket-handler / OrderContext layer. Unchanged.

### 7.3 Chip count-badge consistency in channel view

After §7.2 the channel-view status chip is decoupled from card
visibility. Implication: the chip's count badge can read either
- **Option A (no chip narrowing of visibility, no chip narrowing of counts)** — easiest, fully decoupled. Recommended.
- Option B (chips narrow counts only) — chips become a "drill-down
  preview" affordance without removing cards.

Owner intent ("status chips should not remove cards") is unambiguous on
visibility. Counts can stay as they are today via `platformCounts`,
which is already view-aware. **No code change required for counts in
this CR.**

---

## 8. Impact Analysis

### 8.1 Impact on status-wise view
Zero functional change. The status branch in
`ChannelColumn.sortedItems` is the existing `sortByActiveFirst(...)`
verbatim. `statusData` memo and its filters remain identical. Status
view chips remain `activeChannels`. Per-column hide remains
`hiddenStatuses`.

### 8.2 Impact on channel-wise dine-in view
- Cards no longer re-sort on status change.
- Cards no longer disappear when cashier toggles a status chip.
- Available tables remain at the bottom of the column (mitigation in
  §6.2).
- Walk-in folds into Dine-In as today — unaffected.
- TableCard and OrderCard badges/colours/icons continue to reflect
  `fOrderStatus` correctly (re-render on `updateOrder` is unchanged).

### 8.3 Impact on channel-wise delivery view
- Scan / web delivery orders stay in Delivery column across Accept →
  Preparing → Ready → Dispatch transitions.
- POS2-002 Phase 3 platform filter (POS / Web) continues to narrow the
  list (`platformMatches` kept).
- `createdAt` FIFO matches dispatcher mental model.

### 8.4 Impact on room channel view
- Room orders stay in Room column on status flips.
- Multi-order rooms (per-order entries via `flatMap` in DashboardPage
  L640–L657) continue to render. `id` keys remain unique, so React
  reconciliation is unaffected.
- `ROOM_CARD_TOTAL` math untouched.

### 8.5 Impact on takeaway channel view
- Takeaway orders stay in TakeAway column on status flips.
- FIFO ordering applies in order view; label-numeric in table view
  (note: TakeAway cards in *table view* are effectively order cards —
  `viewType` is the layout-level switch, not a per-channel switch; this
  is consistent with current behaviour).

### 8.6 Impact on table view vs order view sorting
- Both views use the new stable comparator in channel mode.
- Table view → label-numeric primary key. No status leak.
- Order view → `createdAt` primary key. No status leak.
- Tests should cover both sub-cases of channel-view sort.

### 8.7 Impact on status-chip counts/badges
- `platformCounts` (header "Web N · POS M" pulse) is unchanged.
- The Header status-chip *labels* and *click semantics* are unchanged.
- Chip filtering no longer reduces channel-view card list.
- If the owner later wants the chips to additionally reduce the count
  badge, that's a Header-only change for a follow-up CR.

### 8.8 Impact on paid/cancelled terminal status
Zero. The socket handler at `socketHandlers.js:439–447` continues to
call `removeOrder` for terminal transitions. Both channel and status
views see the order disappear, exactly as today. Owner has confirmed
this is intentional for the current CR.

### 8.9 Risk of duplicate/stale cards
- **Duplicates** — source arrays (`walkInOrders`, `dineInOrders`,
  `takeAwayOrders`, `deliveryOrders`, `allRoomsList`) are mutually
  exclusive; `id` keys are channel-prefixed. Removing the status filter
  does not create new duplication. Risk: NONE.
- **Stale status** — `updateOrder(orderId, order)` in the socket handler
  replaces the entire order object in OrderContext. `channelData`
  recomputes (its dep array reads `dineInOrders`, etc., which are
  context-derived). Cards re-render with the new `fOrderStatus`.
  Badges/colours update. The only thing that DOESN'T change is the
  card's POSITION — which is precisely the goal. Risk: NONE.

### 8.10 Risk of breaking existing `statusData` behaviour
The `statusData` memo, its filters, and its branch in the render switch
are untouched. The `groupingMode === 'status'` branch in
`ChannelColumn.sortedItems` invokes the existing `sortByActiveFirst`
verbatim. Risk: NONE.

---

## 9. Regression Risks

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| 1 | Status view loses status-priority sort | None — explicitly preserved in the `'status'` branch | Run status-view QA matrix (§10 cases 1–4) before sign-off. |
| 2 | Channel view sort breaks for items with missing `createdAt` / `label` | Low — comparator has 2-step fallback (createdAt → orderNumber → label-numeric for order; label-numeric → string for table) | Add defensive `?? ''` / `?? 0` in the comparator; unit-test with synthetic items where `createdAt` is undefined. |
| 3 | Channel chips appear to "do nothing" to cashiers expecting cards to disappear | Behavioural change owner has explicitly chosen | Optional follow-up: visually de-emphasise chips that no longer drive visibility (e.g., remove "active" highlight or relabel) — out of scope for this CR. |
| 4 | Chip count badges become inconsistent with visible card count | Low — counts are independent of channelData filter; existing computation already excludes terminal statuses | Verify in QA case 12 (§10). If owner wants counts to align, that's a Header-side follow-up. |
| 5 | Available rows lose their "always at the bottom" placement in Dine-In channel view | Medium without mitigation | Pre-bucket `[occupied, available]` as per §6.2; concat after sorting each bucket. Keeps current visual contract without re-introducing status priority. |
| 6 | Settings-page `enabledStatuses` accidentally narrowing channel view | None today — `enabledStatuses` is read only inside `statusData`. After the fix it stays that way. | No code touches enabledStatuses; documented in QA case 11. |
| 7 | Cashier loses ability to narrow by status entirely | True — the chips no longer narrow visibility. Owner-accepted. | Document in release notes; optionally switch chip behaviour to "dim non-matching" in a follow-up. |
| 8 | StationPanel (kitchen view) parity drift | Low — StationPanel renders independently of `ChannelColumn`/`ChannelColumnsLayout`. Confirm in pre-merge sanity grep. | Quick grep `sortByActiveFirst` and `statusMatchesFilter` in `components/station-view/`; if found, document as known parity gap and queue a sibling CR. |
| 9 | Cross-tab / cross-device socket update changes a sorted card's position briefly | None — comparator keys (label, createdAt, orderNumber) don't change on socket update | Verified by static reading of socketHandlers.js. |
| 10 | Manual refresh button re-shuffles cards | None — refresh re-fetches the same source arrays; comparator is deterministic | n/a |
| 11 | HMR / strict-mode double-invocation regressing `channelData` due to stale `activeStatuses` dep | None — dep-array kept for one release as per §5.2 belt-and-braces | n/a |
| 12 | Test suite regression | Low — existing 492 tests are mostly transforms/payloads; no test directly asserts the current channel-view re-sort. Confirm by running the suite locally pre-merge. | Recommend adding a `ChannelColumn.channelSort.test.jsx` to lock the new contract — non-blocking. |

---

## 10. QA Checklist

> Cases marked **(MUST PASS)** are owner-approved acceptance criteria.

### Status view — must not regress
1. **(MUST PASS)** Status view, order in Preparing column, click Mark
   Ready → card moves from Preparing column to Ready column.
2. Status view, sort within a column remains label-numeric (no visible
   re-ordering on identical-status cards).
3. Status view, click channel chip OFF → orders of that channel
   disappear from all status columns.
4. Status view + click Pay on a card → card removed from all running
   dashboard columns (existing terminal-removal behaviour).

### Channel view — primary acceptance criteria
5. **(MUST PASS)** Dine-In channel, order in Preparing → click Mark
   Ready → card stays in same slot in Dine-In column, badge changes to
   Ready, no visible re-ordering.
6. **(MUST PASS)** Delivery channel, scan order in YTC → click Accept →
   card stays in Delivery column, badge changes to Preparing.
7. **(MUST PASS)** Room channel, order in Ready → click Mark Served →
   card stays in Room column, badge changes to Served.
8. **(MUST PASS)** TakeAway channel, order in Preparing → click item-
   level Ready → card stays put; if aggregate order status flips to
   Ready, badge updates but slot does not move.
9. **(MUST PASS)** Channel view, click any status chip in Header → no
   card disappears from any channel column. Repeat with each chip
   toggled OFF, then re-toggle ON; visibility is stable.
10. **(MUST PASS)** Channel view + click Pay on a card → card removed
    (terminal behaviour unchanged).

### Sort sub-cases
11. Channel view + table sub-view (Dine-In channel) → cards sort by
    table number ascending; available tables at the bottom.
12. Channel view + order sub-view (Delivery channel) → cards sort by
    `createdAt` ascending (oldest first); newest order appended at the
    end of the column.
13. Channel view + multiple orders for the same table (split scenario) →
    each per-order card keeps its label-derived slot (e.g.
    "T5 (1/2)" before "T5 (2/2)").

### Status label / badge update
14. Channel view, on Mark Ready → badge text changes from "Preparing" to
    "Ready"; icon and colour update; card position UNCHANGED.
15. Channel view, on Mark Served → badge updates; card position
    UNCHANGED.

### Counts / chips
16. Header chip count badges (Web N · POS M) unchanged in both views.
17. Header status chips in channel view: clicking ON/OFF does not
    affect the count of cards visible in channel columns. (Counts
    themselves may or may not narrow — confirm against existing
    `platformCounts` semantics.)

### Negative
18. Available table cards in Dine-In channel stay at the end of the
    column.
19. Disabling Order Taking → channel view still renders correctly with
    `'order'` enforcement.
20. Manual refresh button → all cards re-render at the same slots they
    occupied before the refresh.

### Cross-channel safety
21. Cancelling an order in any channel removes it from the dashboard
    (current terminal behaviour preserved).
22. New scan-order arrival via socket appears at the end of its
    channel column in order view (FIFO append); inserted at its
    table-number slot in table view.

### Regression sanity
23. Run existing Jest suite (492 tests) — all green.
24. Manual smoke: dine-in flow Accept → Mark Ready → Mark Served →
    Collect Bill across both views, swapping `dashboardView` mid-flow.

---

## 11. Implementation Guardrails

**Do NOT touch:**

- `frontend/src/api/socket/*` — all five files (`index.js`,
  `socketEvents.js`, `socketHandlers.js`, `socketService.js`,
  `useSocketEvents.js`).
- `frontend/src/api/services/orderService.js` — Accept / Ready / Serve /
  cancel API call functions.
- `frontend/src/api/transforms/*.js` — `orderTransform.js`,
  `tableTransform.js`, etc. (`isWebOrder`, `delivery_charge`,
  `order_from` normalisation must stay byte-identical).
- `frontend/src/contexts/*` — `OrderContext`, `TableContext`,
  `RestaurantContext` — they expose `updateOrder` / `removeOrder` /
  `updateTableStatus`; usage is unchanged.
- `frontend/src/components/cards/TableCard.jsx`,
  `OrderCard.jsx`, `DineInCard.jsx`, `DeliveryCard.jsx` — cards
  already read `fOrderStatus` and re-render correctly; no edit needed.
- `frontend/src/components/layout/Header.jsx` — chip click handlers
  still flip `activeStatuses` / `activeChannels`; **do not change** the
  chip click semantics in this CR. Chip visual treatment changes are a
  follow-up.
- `frontend/src/utils/statusHelpers.js` — `TABLE_STATUS_PRIORITY`,
  `F_ORDER_STATUS_PRIORITY`, `sortByActiveFirst`. Still used by status
  view.
- `frontend/src/components/order-entry/*` — including
  `CartPanel.jsx`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx`. VAT /
  service charge / tip / delivery-charge math and the recently-shipped
  delivery-lock predicate must stay byte-identical.
- `frontend/src/components/station-view/*` — out of scope. If parity
  drift is found, raise as a sibling CR.
- Backend (`backend/server.py`, `requirements.txt`). Not relevant.
- Test files that exist today. Adding NEW tests for the channel-view
  sort is optional and recommended but not blocking for this CR.

**Do NOT introduce:**

- New context or state hoisting (the existing `dashboardView` state is
  enough).
- A shared "sort strategy" helper outside the dashboard folder — keep
  the comparator local to `ChannelColumn.jsx` to avoid coupling.
- Any change to `data-testid` patterns (QA scripts depend on them:
  `channel-column-<id>`, `filter-status-<id>`, etc.).
- Any change to feature flags (`USE_CHANNEL_LAYOUT`,
  `USE_STATUS_VIEW`).

---

## 12. Open Questions

None that block implementation.

The two minor follow-up topics flagged for owner attention (non-blocking):

1. **Chip visual treatment in channel view after the fix.** Today's
   chip click changes the visible card list; after the fix it won't.
   Owner may want the chips to either (a) silently retain their visual
   "active" toggle (current proposal, zero extra code), (b) repurpose
   as a "dim non-matching" affordance (separate Header CR), or
   (c) hide the chips entirely in channel view (Header CR). The current
   plan defaults to (a) — zero Header change.

2. **Optional `ChannelColumn.channelSort.test.jsx`** to lock the new
   comparator contract (similar to the recently-shipped
   `CollectPaymentPanel.deliveryLock.test.jsx`). Strongly recommended
   but not blocking; can ship in the same PR or a follow-up.

— End of plan.
