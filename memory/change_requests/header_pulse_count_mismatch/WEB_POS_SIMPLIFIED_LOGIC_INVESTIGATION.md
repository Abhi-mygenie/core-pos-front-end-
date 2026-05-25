# Web vs POS — The Whole Logic, Simplified

> **Mode:** Investigation only. No code changes. No commits.
> **Surfaces in scope (two, both share one axis):**
> 1. Header **pulse label** `Web N · POS M` (`PlatformCounterChip`)
> 2. Header **dropdown filter** `Platform: All / POS / Web · Scan`
>    (`PlatformDropdown`)
> **Out of scope:** any other counter/badge/sidebar.

---

## 1. The owner's correct mental model

There is **one** axis: **`orderFrom`**.

```
orderFrom === 'web'   →  Web bucket
orderFrom !== 'web'   →  POS bucket   (covers undefined / aggregator / kiosk / etc.)
```

That is the only question. It has nothing to do with:
- Dine-in vs takeaway vs delivery vs room (those are `orderType`).
- Walk-in vs table (those are `isWalkIn`).
- Pending vs Preparing vs Ready vs Served (those are `fOrderStatus`).
- Which status chips or channel chips are toggled in the header.
- Which row in the Platform dropdown is selected (independence).

Both the **label** (pulse counter) and the **filter** (dropdown
predicate) should reduce to this same one-line rule applied over the
same universe of "running orders".

A running order is just:
- `orderId` exists (i.e. it's a real order, not an empty table/room slot)
- `fOrderStatus ∉ {3 cancelled, 6 paid}` (i.e. it is not terminal)

That's it. Two booleans on `orders`, count by `orderFrom`.

---

## 2. What the code does today (the gap)

### Gap A — Pulse counter wires up a Frankenstein input

`pages/DashboardPage.jsx:945–1006` (`platformCounts` memo) calls the
correct reducer (`computePlatformCounts`) but feeds it a
**hand-assembled tagged list** that does NOT equal "all running
orders". The reducer is fine; the input is wrong.

```js
const tagged = [
  ...walkInOrders.map(o => ({...o, _channelId: 'dineIn'})),
  ...takeAwayOrders.map(o => ({...o, _channelId: 'takeAway'})),
  ...deliveryOrders.map(o => ({...o, _channelId: 'delivery'})),
  ...dineInOrders.map(o => ({...o, _channelId: 'dineIn'})),
];
// then narrowed by statusOk / channelOk / searchOk
```

Two structural defects (already documented in the prior
investigation, restated here for one-stop reading):

1. **Walk-ins are double-counted.** `walkInOrders` is a *subset* of
   `dineInOrders` (`OrderContext.jsx:160–185`); both spreads emit the
   same walk-in order. Inflates POS by `walkin_count`.
2. **Room orders are missing.** `dineInOrders` filters `!o.isRoom`,
   and no `roomOrders` spread exists. Deflates POS by `room_count`.

Plus a third defect from the *philosophical* angle owner just
articulated:

3. **The counter narrows by status chips, channel chips, and search.**
   The contract at `PlatformCounterChip.jsx:7–11` says it should — but
   the owner now says it should NOT. The counter is meant to answer
   "how many running orders are coming in from each origin right now",
   independent of any UI narrowing. Narrowing the counter by chips is
   misleading: turn off the "Served" chip in channel view and the POS
   number drops, even though the orders still physically exist. This
   is the very paradox the chip dropdown already explicitly avoids
   (item #4 of its docstring: "Counter IGNORES the Platform dropdown
   itself"). The other narrowings should follow the same independence
   principle.

#### Live preprod evidence (recaptured)

| Surface | Value |
|---|---|
| Pulse chip says | **Web 0 · POS 10** |
| Column badges sum | Dine-In 5 + Delivery 2 + Room 2 = **9** |
| Correct value (orderFrom-only count over running orders) | **Web 0 · POS 9** |

Math:
```
buggy   = walkIn (3) + dineInOrders (5, includes walk-ins again)
        + delivery (2) + takeAway (0)                              = 10
correct = all running orders bucketed by orderFrom                 = 9
```

### Gap B — Dropdown filter is correct-by-coincidence, but inconsistent

`pages/DashboardPage.jsx:758–764` (channel view) and L900–905 (status
view) define the same predicate **twice**:

```js
const platformMatches = (item) => {
  if (platform === null) return true;
  const orderFrom = item.order?.orderFrom ?? item.orderFrom;
  if (platform === 'pos') return orderFrom !== 'web';
  if (platform === 'web') return orderFrom === 'web';
  return true;
};
```

Two findings:

1. **Empty / Available tables leak into the POS bucket.** The comment
   at L755–757 acknowledges this: empty rows have `orderFrom ===
   undefined`, and `undefined !== 'web'` is true → they show up under
   POS, vanish under Web/Scan. That's a UX foot-gun: empty tables are
   *containers* (no order origin yet), not POS orders. Under the
   simplified mental model they should be HIDDEN by BOTH origin
   filters and shown only when `platform === null`.

2. **The predicate is duplicated 3 times** (channel view, status view,
   pulse-chip reducer). Three independent implementations of "the
   same axis" is a future-divergence risk. A single shared
   `getOrderOrigin(order)` helper or `isWebOrder(order)` predicate
   would prevent drift.

### Gap C — There is no shared definition of "the running-order universe"

Today, multiple consumers reinvent "give me the running orders" in
different ways:

| Consumer | Universe definition | Bugged? |
|---|---|---|
| `channelData` (cards on screen) | `[tables w/o rooms/walkIns] + walkIns + takeAways + deliveries + rooms` | ✅ Correct |
| `statusData` (status-view cards) | flat over `orders.flatMap` per status | ✅ Correct (uses `allOrders` derived from per-channel spreads at L827–L885; rooms not enumerated explicitly here either — needs a separate confirmation pass, listed in §6 as audit item) |
| `platformCounts.tagged` (pulse) | walkIn × 2 + takeAway + delivery + dineIn (no rooms) | ❌ Bug A+B above |

Three places, three definitions, one of them wrong. The reducer at
`PlatformCounterChip.jsx:53–65` is correct, but it never gets the
right input.

---

## 3. The simplified design (what should change — NOT implemented)

Two minimal primitives, used by both surfaces:

### 3.1 Primitive 1 — `isWebOrigin(order)`

A pure boolean. Put it next to the existing predicates in a tiny
helper module (or inline; doesn't matter):

```js
// Robust against where the data layer lands the field — same fallback
// chain the existing predicates already use.
export const isWebOrigin = (order) =>
  (order?.orderFrom ?? order?.order?.orderFrom) === 'web';
```

That's it. Future BE values (`aggregator`, `kiosk`, `whatsapp`,
`qr_campaign`) automatically land in the **POS** bucket — exactly the
"future-proof" semantics already documented in
`PlatformDropdown.jsx:25–26` and `PlatformCounterChip.jsx:40–44`.

### 3.2 Primitive 2 — `getRunningOrders(orders)`

Single source of truth for the universe:

```js
const TERMINAL_STATUSES = new Set([3, 6]); // cancelled, paid

export const getRunningOrders = (orders) => {
  if (!Array.isArray(orders)) return [];
  return orders.filter(o =>
    o &&
    o.orderId &&                              // not an empty container
    !TERMINAL_STATUSES.has(o.fOrderStatus)    // not terminal
  );
};
```

This takes the raw `orders` array from `OrderContext` (which already
contains EVERY order — table dine-ins, walk-ins, takeaways,
deliveries, AND rooms — see `OrderContext.jsx:60` where `orders`
is the underlying state, before the per-channel `.filter()` derived
selectors at L161–L185 split it).

> Why this is automatically correct:
> - Walk-ins: a walk-in is one order in `orders`. Counted once. ✅
> - Rooms: a room order is one order in `orders` with `isRoom === true`.
>   Counted once. ✅
> - Dine-ins / takeaways / deliveries: same — counted once each. ✅
> - Empty Available tables / rooms: they have no `orderId` in
>   `orders` (they live in `apiTables`/room list, not in the orders
>   array). Skipped. ✅
> - Terminal orders: skipped via the `fOrderStatus` set. ✅
> - Status chip / channel chip / search narrowing: NOT applied (by
>   design, per owner's mental model). ✅

### 3.3 Surface 1 — Pulse counter, simplified

Replace the entire `platformCounts` memo (DashboardPage.jsx:945–1006,
~60 lines) with:

```js
const platformCounts = useMemo(() => {
  let web = 0, pos = 0;
  for (const o of getRunningOrders(orders)) {
    if (isWebOrigin(o)) web += 1; else pos += 1;
  }
  return { web, pos };
}, [orders]);
```

Five lines. No tagged spread, no statusOk, no channelOk, no searchOk,
no view-axis branching.

`computePlatformCounts` in `PlatformCounterChip.jsx` can either:
- (a) stay as-is (it's still a correct reducer; it just won't be the
  call site anymore — pulse computes inline using the primitives), or
- (b) be deleted in a follow-up tidy-up CR once nothing references it.

Recommend (a) for this CR — preserves the existing 28-test
`PlatformCounterChip.test.jsx` suite unchanged.

### 3.4 Surface 2 — Dropdown filter, simplified

Replace both `platformMatches` definitions (channelData L758–764 and
statusData L900–905) with a single inline use of `isWebOrigin`:

```js
const platformMatches = (item) => {
  if (platform === null) return true;
  // An "item" can be an order, a table-row carrying .order, a walk-in,
  // a room entry. Empty containers (no order at all) → exclude under
  // BOTH 'pos' and 'web' (they have no origin).
  const hasOrder = !!(item?.orderId || item?.order?.orderId);
  if (!hasOrder) return false;
  return platform === 'web' ? isWebOrigin(item) : !isWebOrigin(item);
};
```

Single canonical definition. Two semantic changes vs today:

1. Empty Available tables / rooms **no longer appear in the POS
   bucket**. They appear only under "Platform: All". This is more
   intuitive — an empty table has no origin to filter by.
2. Future BE origin values (kiosk / aggregator) auto-bucket to POS via
   `!isWebOrigin`, identical to the documented contract.

This is one definition, used in both views (channel + status), via
shared closure on `platform`. The `useMemo` dep-arrays of `channelData`
and `statusData` already include `platform`; nothing else changes.

---

## 4. Side-by-side: today vs proposed

| Aspect | Today | Proposed |
|---|---|---|
| Number of "platform" predicate copies | 3 (channelData, statusData, computePlatformCounts) | 1 (`isWebOrigin`) |
| Counter operates on | Frankenstein tagged list (walkIn×2 + takeAway + delivery + dineIn, no rooms) | Flat `orders` array via `getRunningOrders` |
| Counter narrows by status chips | Yes | No (counter is independent) |
| Counter narrows by channel chips | Yes | No (counter is independent) |
| Counter narrows by search box | Yes | No (counter is independent) |
| Counter narrows by Platform dropdown | No (explicit independence) | No (unchanged) |
| Empty Available tables in POS bucket | Yes (when Platform=POS, they show) | No (no orderId → excluded by both origin filters) |
| Future BE origin values (kiosk / aggregator) | Bucketed to POS | Bucketed to POS (unchanged contract) |
| Lines of code in counter memo | ~60 | ~5 |
| Existing pure-function reducer tests | 28 in `PlatformCounterChip.test.jsx` | Stay green (reducer untouched) |
| Existing dropdown predicate tests | `PlatformDropdown.test.jsx` (pure-function copy of predicate) | Refactor to test `isWebOrigin`; predicate tests stay green |

---

## 5. Files that would change (when owner approves the fix CR)

Only **one** functional file plus optionally a tiny new helper file.

| File | Change |
|---|---|
| `pages/DashboardPage.jsx` | (a) Replace `platformCounts` memo (L945–L1006) with the 5-line version using primitives. (b) Replace both `platformMatches` instances (L758–764 and L900–905) with the shared one-liner. Net: ~−70 / +20 lines. |
| New: `utils/orderOrigin.js` (optional but recommended) | Export `isWebOrigin` and `getRunningOrders`. Tiny — ~15 lines including JSDoc. Alternative: inline both in DashboardPage to keep diff smaller. Owner preference. |
| `__tests__/pages/DashboardPage.platformCounts.test.jsx` (new) | Integration test: render Dashboard with a controlled mock of `useOrders().orders` and assert chip equals expected web/pos values; assert chip is invariant under chip-toggle / channel-toggle / search-typing. ~40 LOC. |

**Do NOT touch:**

- `components/layout/PlatformCounterChip.jsx` — reducer stays as a
  documented historical artefact and continues to pass its 28 tests.
  No behavioural change; just no longer the call site after the fix.
- `components/layout/PlatformDropdown.jsx` — UI only, no logic
  involved. No change.
- `contexts/OrderContext.jsx` — `orders` is already the single source
  of truth. No new selector needed (the design uses raw `orders`, not
  derived per-channel selectors).
- Anything else: socket handlers, action handlers, transforms, payload
  builders, VAT / SC / tip / delivery-charge math, channel-view
  stability fix, status-view dashboard, backend.

---

## 6. Items to audit after the simplification (non-blocking)

> Once §3 lands, these surfaces should be re-checked to make sure
> nothing else has built on top of the duplicated/buggy predicate. Not
> needed for this CR.

1. **`statusData` `allOrders` enumeration** (`DashboardPage.jsx:827–
   885`) — does it include rooms? It uses the per-channel selectors
   plus an `allRoomsList.forEach` block; needs a quick read to
   confirm rooms reach the status columns. (Out of this report's
   scope; flagged.)
2. **Per-status chip badges in the Header** (e.g. "Preparing 3") —
   what list do they iterate? If they iterate `dineInOrders +
   walkInOrders + ...` they share Bug A. Quick grep + fix if
   confirmed.
3. **`useRefreshAllData`** post-refresh log — informational only, but
   may mis-report running counts.
4. **Sidebar / Reports** — anywhere that prints "active orders today"
   needs to use the same `getRunningOrders` primitive to stay aligned.

---

## 7. Direct answers to the owner's question

1. **"Is the whole logic wrong?"** — Yes for the **pulse counter**:
   the input list is wrong (Bug A + Bug B) AND it narrows by unrelated
   axes (status chips, channel chips, search) it shouldn't. The
   reducer itself is right, but it never sees the correct input.
   For the **dropdown filter**: the predicate is correct on the
   `orderFrom` axis but is **duplicated three times** and lets empty
   Available tables leak into the POS bucket because they have
   `orderFrom === undefined`.

2. **"What key should we use?"** — Exactly the one you named:
   `orderFrom`. Either `orderFrom === 'web'` or `orderFrom !== 'web'`
   — no other field. The transform already normalises the backend
   `order_from` into this field (`api/transforms/orderTransform.js`).

3. **"What is the simple definition?"** — Two boolean primitives:
   ```
   isWebOrigin(order)        = (order.orderFrom === 'web')
   getRunningOrders(orders)  = orders.filter(o => o.orderId
                                                && !TERMINAL.has(o.fOrderStatus))
   ```
   Both surfaces (label + filter) compose these two functions; nothing
   else.

4. **"Where is the gap?"** — Three places:
   - Pulse counter universe (`DashboardPage.jsx:988–993`) — wrong list.
   - Pulse counter narrowing (`statusOk/channelOk/searchOk` calls at
     L955–984) — shouldn't be applied at all.
   - Dropdown predicate is duplicated three times (L758, L900, and
     conceptually in `computePlatformCounts`) — single source of truth
     needed; also leaks empty tables into POS bucket.

5. **"What needs to change?"** — Replace the pulse-counter memo with
   a 5-line `isWebOrigin` × `getRunningOrders` loop, and dedupe the
   dropdown predicate to a single shared definition that excludes
   empty containers from both origin filters. Total: ~−70 / +20 lines
   in one file, plus one optional helper module and one new
   integration test. Reducer (`computePlatformCounts`) untouched.

6. **"What can go wrong?"** — Visible chip value will change for
   every tenant the moment the fix ships. Cashiers who have learned
   today's wrong number will see a different (correct) one.
   Release-note + a single sentence in the in-app tooltip is enough.
   No backend, no payload, no math impact.

7. **"How much work?"** — small. ~30 lines of code change in one
   file, ~40 lines of new test, no migrations, no backend, no other
   surface affected. Could ship as a one-PR CR after owner approval.

---

## 8. Open questions (for owner)

1. **Empty Available tables** — under "Platform: All" they're shown
   (good). Under "Platform: POS" today they're also shown (because
   `undefined !== 'web'`). Proposal: hide them under both POS and
   Web/Scan since they have no origin yet. **Confirm: drop them
   from both filtered views?**
2. **Pulse independence from chips/search** — confirm the counter
   should NOT respect status chips, channel chips, or search after
   the fix. (Current contract says it should; the simplified design
   says it shouldn't. Owner just articulated the latter. Want this
   captured as a contract change.)
3. **Future origin values** (aggregator / kiosk / whatsapp /
   qr_campaign) — confirm they continue to bucket to POS until each
   gets its own dropdown row. (Same as today's documented contract;
   just re-confirming.)
4. **Naming of the shared helpers** — `isWebOrigin` /
   `getRunningOrders` (recommended) or alternatives like
   `isWebOrder` (collides with the existing `isWebOrder` field
   in `orderTransform.js`, ambiguous) / `getActiveOrders` (collides
   with "active" in many places)? Picking `isWebOrigin` +
   `getRunningOrders` to avoid collision.

— End of investigation.
