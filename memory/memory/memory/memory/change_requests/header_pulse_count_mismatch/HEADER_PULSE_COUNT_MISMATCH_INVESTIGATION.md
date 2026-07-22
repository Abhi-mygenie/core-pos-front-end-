# Dashboard Header Pulse Counter — "Web N · POS M" Mismatch Investigation

> **Mode:** Investigation only. No code changes, no commits.
> **Branch:** `15-may` HEAD.
> **Surface:** Dashboard header pulse chip
> (`data-testid="dashboard-platform-counter"`) showing **Web N · POS M**.
> **Reported symptom:** "Numbers don't match — usually less than the
> number of orders I see on screen."

---

## 1. Executive summary

The pulse chip's count is **provably wrong by construction** in the
current code. There are two independent bugs in the order-tagging step
of `platformCounts` (`pages/DashboardPage.jsx:945–1006`). They can pull
the displayed number either UP or DOWN relative to the visible cards,
depending on each tenant's mix of walk-in / room orders.

### Live preprod evidence (captured 2026-05-15 02:10 IST)

| Surface | Value |
|---|---|
| Header pulse chip | **Web 0 · POS 10** |
| Column `activeCount` badges (sum of "Dine-In 5 + Delivery 2 + Room 2") | **9** |
| Visible occupied cards (manually counted) | **9** |

**Mismatch: header shows 10, columns / screen show 9.**

The math that produces 10:
```
walkInOrders            = 3   (wc-822188, wc-819009, wc-868386)
dineInOrders            = 5   (includes the 3 walk-ins above + 2 Table-1 orders)
deliveryOrders          = 2
takeAwayOrders          = 0
allRoomsList orders     = 2   (r1, e3)   ← NOT counted

platformCounts.tagged   = walkIn + takeAway + delivery + dineIn
                        = 3 + 0 + 2 + 5 = 10   ← what the chip shows
True running orders     = 3 (walk-in) + 2 (table dine-in) + 2 (delivery)
                        + 0 (takeaway) + 2 (room) = 9   ← what is on screen
```

So the chip says **10** while the visible card count is **9**. The
discrepancy formula simplifies to:

```
platformCounts_total  =  visible_total  -  room_count  +  walkin_count
                      =  9              -  2           +  3            = 10
```

Two opposing errors, both rooted in the same `tagged` array.

---

## 2. The two bugs

### Bug A — Walk-ins are DOUBLE-COUNTED

Source: `pages/DashboardPage.jsx:988–993`

```js
const tagged = [
  ...walkInOrders.map((o) => ({ ...o, _channelId: 'dineIn' })),
  ...takeAwayOrders.map((o) => ({ ...o, _channelId: 'takeAway' })),
  ...deliveryOrders.map((o) => ({ ...o, _channelId: 'delivery' })),
  ...dineInOrders.map((o) => ({ ...o, _channelId: 'dineIn' })),
];
```

This iterates both `walkInOrders` and `dineInOrders`.

But in `contexts/OrderContext.jsx:160–185`, those selectors are:

```js
const dineInOrders = useMemo(() =>
  orders.filter(o => o.orderType === 'dineIn' && !o.isRoom), [orders]);
const walkInOrders = useMemo(() =>
  dineInOrders.filter(o => o.isWalkIn), [dineInOrders]);   // ← SUBSET
const tableOrders  = useMemo(() =>
  dineInOrders.filter(o => !o.isWalkIn), [dineInOrders]);
```

Critical fact: **`walkInOrders` is a subset of `dineInOrders`** — both
selectors filter the same `orders` array and walk-ins satisfy both
`orderType === 'dineIn'` and `isWalkIn === true`. The tagged spread
therefore adds every walk-in **twice** (once via the first spread, once
via the fourth).

In the preprod sample today this inflates the running count by
exactly 3 (the number of walk-ins).

### Bug B — Room orders are NEVER counted

`dineInOrders` filter (above) explicitly drops `isRoom === true`.
Rooms have `orderType === 'dineIn'` (spatially they're dine-in) but
their orders carry `isRoom === true`, so they're filtered out of
`dineInOrders`.

The tagged list has **no spread for rooms**. There is no
`roomOrders` selector in `OrderContext` to spread either — the only way
the rest of the file accesses room orders is through `getOrdersByTableId(roomTableId)`
inside the `allRoomsList` memo (`pages/DashboardPage.jsx:624–660`).

Therefore room orders contribute **0** to `platformCounts`, regardless
of how many rooms have running orders.

In the preprod sample today this deflates the running count by exactly
2 (the number of room orders: r1, e3).

### Net effect

```
correct_total      = walkIn + tableDineIn + takeAway + delivery + room
buggy_total        = walkIn × 2 + tableDineIn + takeAway + delivery
                   = correct_total + walkIn - room
```

In words:
- If `walkin_count > room_count` → chip shows MORE than reality
  (today's preprod: 3 walk-ins > 2 rooms → chip shows +1).
- If `walkin_count < room_count` → chip shows LESS than reality
  (the user's reported "usually less" symptom — typical for room-heavy
  tenants like hotels with few walk-ins).
- If `walkin_count == room_count` → chip looks correct by coincidence.

This explains the user's note that the mismatch is "usually less" —
their tenants run more rooms than walk-ins, so Bug B (rooms missing)
overpowers Bug A (walk-ins doubled).

---

## 3. The intended business logic (per code comments + chip docstring)

`components/layout/PlatformCounterChip.jsx:1–20` and
`pages/DashboardPage.jsx:933–944` document the contract:

1. **Counter respects status chips** (`activeStatuses` /
   `hiddenStatuses`, view-aware via `dashboardView`).
2. **Counter respects channel column hide** (`hiddenChannels` /
   `activeChannels`, view-aware).
3. **Counter respects the search box.**
4. **Counter IGNORES the Platform dropdown itself** (independence
   guarantee — avoids the circular "Web 4 · POS 0" artifact when the
   operator has filtered Platform = Web).
5. **Excludes terminal statuses** (`fOrderStatus ∈ {3, 6}` — cancelled,
   paid) and orders without an `orderId`.
6. **Bucketing:** `orderFrom === 'web'` → `web`; everything else → `pos`
   (future BE values like `'aggregator'` or `'kiosk'` are also POS).

The "what counts as a running order" universe is defined as:
- All in-flight dine-in (both table-anchored and walk-in)
- All in-flight take-away
- All in-flight delivery
- All in-flight room orders

The actual implementation matches the contract for items 1–6 **except**
for the universe definition: the `tagged` spread enumerates the wrong
set of underlying selectors.

---

## 4. Code path trace — three counter surfaces

There are three different "counters" surfaced on the dashboard. Only
**one** is wrong.

| # | Counter | File / line | Source list | Status today |
|---|---|---|---|---|
| 1 | Per-column count badge (e.g. "Dine-In 5", "Delivery 2", "Room 2") | `components/dashboard/ChannelColumn.jsx:142–146` (`activeCount`) | `channel.items.filter(status NOT in ['available','reserved','disabled']).length` — items come from `channelData` per-channel array | ✅ Correct (matches visible cards) |
| 2 | Header platform pulse chip "Web N · POS M" | `pages/DashboardPage.jsx:945–1006` (`platformCounts`) → `components/layout/PlatformCounterChip.jsx` (`computePlatformCounts`) | `walkInOrders + takeAwayOrders + deliveryOrders + dineInOrders` (the bug) | ❌ **Wrong** — Bug A and Bug B above |
| 3 | Status chip count badges (e.g. "Preparing 0", "Served 9") | (rendered inside `components/layout/Header.jsx` chip block) | — separate computation per chip, out of scope for this CR | ⚠ Should be audited as a follow-up — may share the bug if it iterates the same lists. |

**`channelData` (used by per-column badge) is correct because:**
- It spreads `walkInOrders` only via `walkInOrders.map(adaptWalkIn)`
  for the Dine-In bucket.
- It spreads table-anchored dine-ins via `allTablesList.filter(t =>
  !t.isRoom && !t.isWalkIn).map(enrichTable)`, which only emits one
  card per occupied table (with per-order split inside).
- It spreads rooms via `allRoomsList.filter(...)`.

So `channelData` does NOT include walk-ins twice, AND does NOT miss
rooms. That's why "Dine-In 5 + Delivery 2 + Room 2 = 9" matches the
visible cards exactly.

The pulse chip uses a separately-constructed `tagged` list that does
NOT mirror `channelData`'s sourcing — that's the divergence.

---

## 5. Why the bug went unnoticed

1. **Pure-function tests of `computePlatformCounts`** only test the
   reducer (lines 53–65 of `PlatformCounterChip.jsx`). They feed it
   synthetic order arrays. They do NOT test the upstream tagged-spread
   in DashboardPage, which is where the bug lives.
2. **No integration test** asserts equality between `Σ activeCount` and
   `web + pos`.
3. The preprod fixture happens to have `walkin_count - room_count = +1`,
   so the chip is off by only 1 — easy to miss unless you compare.
4. The chip is read-only (no drill-down), so a wrong number doesn't
   immediately break a workflow.

---

## 6. What it would take to fix (PLAN — NOT IMPLEMENTED)

> Reminder: investigation-only CR. Implementation deferred until owner
> approves. This section is here so the owner can scope effort.

Three small changes are needed; all in `pages/DashboardPage.jsx`. No
changes to `PlatformCounterChip.jsx`, `OrderContext.jsx`, transforms,
sockets, or any non-dashboard file.

### 6.1 De-duplicate `dineInOrders` vs `walkInOrders`

Replace the tagged spread (`DashboardPage.jsx:988–993`) so that the
dine-in axis is sourced only once. Two equivalent shapes:

**Option A** — keep both spreads but split table dine-ins via
`OrderContext.tableOrders`:
```js
const { tableOrders } = useOrders();
const tagged = [
  ...walkInOrders.map((o) => ({ ...o, _channelId: 'dineIn' })),
  ...tableOrders .map((o) => ({ ...o, _channelId: 'dineIn' })),
  ...takeAwayOrders.map(...),
  ...deliveryOrders.map(...),
];
```

**Option B** — drop the walk-in spread and rely on `dineInOrders`
alone:
```js
const tagged = [
  ...dineInOrders.map((o) => ({ ...o, _channelId: 'dineIn' })),
  ...takeAwayOrders.map(...),
  ...deliveryOrders.map(...),
];
```
Both options eliminate the duplicate. Option A keeps the explicit
walk-in spread for symmetry with `channelData`; Option B is the
minimal change. Owner pick.

### 6.2 Add a room-orders spread

Use the existing `allRoomsList` memo (it already filters by
`platformMatches` in `channelData`, but for the pulse the contract
says to IGNORE the Platform dropdown — so an unfiltered source is
preferred). The clean primitive is `orders.filter(o => o.isRoom)`,
exposed either as a new memo in `OrderContext` (recommended) or
computed locally:

```js
const roomOrders = useMemo(() =>
  orders.filter(o => o.isRoom && !TERMINAL.includes(o.fOrderStatus)),
  [orders]);
// ...inside tagged:
...roomOrders.map((o) => ({ ...o, _channelId: 'room' })),
```

If a `roomOrders` selector is added to `OrderContext`, both
`platformCounts` and the dashboard refresh path can share it. Worth
a quick chat with the contexts team to confirm naming — perhaps
`roomOrders` slots naturally next to `dineInOrders` / `walkInOrders`
in the existing API.

### 6.3 Make the channel-id mapping reflect the dine-in vs walk-in
split (cosmetic; not a math fix)

Today, both walk-ins and dine-ins map to `_channelId === 'dineIn'`.
That's correct for `channelOk` (since walk-ins fold under Dine-In in
channel view per `channelIdFor`). No change strictly needed for the
counter math, but a `_channelId === 'walkIn'` vs `'dineIn'` distinction
could enable future per-sub-channel analytics. **Out of scope** for the
counter fix.

### 6.4 Add a regression test

`__tests__/pages/DashboardPage.platformCounts.test.js` (new file):
- Mock `useOrders` to return a known mix of: 2 walk-ins, 3 table dine-
  ins, 1 take-away, 4 deliveries, 2 room orders.
- Render `<DashboardPage />` with minimal context wrapping.
- Assert `dashboard-platform-counter-pos` `data-count` attribute equals
  `2 + 3 + 1 + 4 + 2 = 12` (assuming all are POS, none cancelled or
  paid).
- Variant: same setup with 1 web walk-in and 1 web delivery → assert
  `web=2, pos=10`.

Estimated effort: **~25 lines of test, ~15 lines of code fix.** Total
patch size well under 50 lines, fully covered by parameterised tests.

---

## 7. Other counters that may share the same root cause (audit list)

Before implementing 6.1–6.3, audit these surfaces. They likely have a
similar bug pattern if they iterate the same set of selectors:

| Surface | File | Likely bug? |
|---|---|---|
| Header status chip count badges (e.g. "Preparing 3") | `components/layout/Header.jsx` (search for `activeStatuses` mapping with order list iteration) | UNKNOWN — needs trace |
| Dashboard sidebar "running orders" pill (if any) | sidebar / `Sidebar.jsx` | UNKNOWN — needs trace |
| `useRefreshAllData` post-refresh status summary log | `hooks/useRefreshAllData.js` | UNKNOWN — needs trace |
| KOT / Bill print summary footer | `components/order-entry/*Panel.jsx` | Likely fine (operates on the active order, not the running set) |

Investigation of those is **out of scope for this CR**. Listed here so
the owner can decide whether to fold them into a single "running-order
universe" CR or fix them piecemeal.

---

## 8. Risk assessment (for the eventual fix CR)

| Risk | Likelihood | Mitigation |
|---|---|---|
| Adding rooms changes the pulse number visibly to cashiers who learned the wrong value | High — by definition the value changes once Bug B is fixed | Release note: "Pulse now reflects the true running-order universe including room orders." |
| `orders.filter(o => o.isRoom)` returns orders without `tableId` association — could there be orphans? | Low — every order in the array carries `orderId`; `computePlatformCounts` already drops `!orderId` rows | None needed |
| Status chip / channel chip narrowing semantics in channel view vs status view | None — `statusOk` and `channelOk` predicates are the same regardless of which underlying list the spread drew from | Test 6.4 verifies parity |
| Performance of an extra `orders.filter(o => o.isRoom)` memo | None — `orders` is already memoised in OrderContext | n/a |
| Test suite regression | Low — pure-function `computePlatformCounts` tests don't touch the tagged spread; new integration test will be additive | Run full suite (492) after the fix |
| Backwards-compatibility | None — no external consumer of `platformCounts`; it is local to `DashboardPage.jsx` | n/a |

---

## 9. Open questions for owner

1. **Naming preference for the new selector** — `roomOrders` in
   `OrderContext` (recommended, symmetric with `dineInOrders` /
   `walkInOrders`) or a local memo inside `DashboardPage`?
2. **Status chip count audit** — should we fold the header status chip
   count bug (if it exists) into the same CR, or treat it separately?
3. **Should the pulse chip become drill-downable?** — out of scope for
   the math fix, but if the owner wants Web/POS clicks to filter the
   columns, that's a separate UX CR. The math fix is independent.
4. **Re-bucketing future BE values** (`'aggregator'`, `'kiosk'`) — the
   contract docs already say "non-web ⇒ POS" until a new chip is
   added. Confirm this remains the policy.

---

## 10. Final answers (canonical)

1. **Is the business logic working?** **No.** Two independent bugs in
   the order-tagging step of `platformCounts` produce systematically
   wrong counts.
2. **What's the bug?**
   - **Bug A:** Walk-in orders are double-counted because
     `dineInOrders` (which the spread iterates) is a superset of
     `walkInOrders` (which is also spread). Inflates POS count by
     `walkin_count`.
   - **Bug B:** Room orders are entirely missing from the spread.
     `dineInOrders` filters `!isRoom`, and there is no separate
     room-orders spread. Deflates POS count by `room_count`.
3. **What does the user see?**
   - On preprod today: chip says POS=10, columns/visible say 9 (+1
     because 3 walk-ins > 2 rooms).
   - On hotel-style tenants with many rooms / few walk-ins: chip will
     systematically UNDERCOUNT (the reported "usually less" symptom).
4. **What's correct?**
   - The column header badges ("Dine-In 5", "Delivery 2", "Room 2") and
     the visible cards are CORRECT — they come from `channelData`,
     which is built right.
   - The pulse chip is the wrong number.
5. **What to fix (when owner approves):** see §6 — ~15 LOC change in
   `DashboardPage.jsx` plus a ~25 LOC regression test. Fully scoped.
6. **What NOT to touch:** `PlatformCounterChip.jsx` itself (the reducer
   is correct), `OrderContext` selectors used elsewhere, socket
   handlers, transforms, payload builders, VAT / SC / tip / delivery
   charge math, channel-view stability fix, status-view dashboard,
   backend.

— End of investigation.
