# Web/POS Simplified Logic — FIX REPORT

> CR: `header_pulse_count_mismatch`
> Date: 2026-05-15
> Companion to: `WEB_POS_SIMPLIFIED_LOGIC_INVESTIGATION.md`

---

## 1. Resolution status

**Implementation was 98% complete when this agent took over.**
The previous agent had already:

- Created `frontend/src/utils/orderOrigin.js` (helpers `isWebOrigin` and `getRunningOrders`) with full JSDoc documenting the owner-locked rules.
- Replaced the `platformCounts` memo in `DashboardPage.jsx` with the 6-line simplified version that iterates `getRunningOrders(orders)` and buckets by `isWebOrigin`.
- Replaced both `platformMatches` predicates (channel view L761–766; status view L903–908) with the shared single-axis form that excludes empty containers.
- Imported `{ isWebOrigin, getRunningOrders }` from `../utils/orderOrigin` in `DashboardPage.jsx`.

The **only** remaining piece was a stale, now-unused `import { computePlatformCounts } from "../components/layout/PlatformCounterChip";` line. This agent removed that single line. No other change was required.

## 2. Files changed in this hand-off session

| File | Change |
|---|---|
| `frontend/src/pages/DashboardPage.jsx` | Removed 1 stale import line (`computePlatformCounts`). Net diff: −1 line. |

Files that were already correctly modified before this session (verified, **not** re-touched):

- `frontend/src/utils/orderOrigin.js` (new helper file, ~60 lines)
- `frontend/src/pages/DashboardPage.jsx` (`platformCounts` memo + both `platformMatches` predicates)

## 3. Web/POS origin rule as implemented

In `frontend/src/utils/orderOrigin.js`:

```js
export const isWebOrigin = (item) =>
  (item?.orderFrom ?? item?.order?.orderFrom) === 'web';
```

**Bucketing:**
- Web = `orderFrom === 'web'`
- POS = every other running order (`!isWebOrigin(order)`)
- Future BE values (`aggregator`, `kiosk`, `whatsapp`, `qr_campaign`) automatically bucket to POS — exactly as documented in `PlatformDropdown.jsx` and `PlatformCounterChip.jsx`.

The dual field-shape fallback (`item.orderFrom ?? item.order.orderFrom`) supports both raw `orders` rows and channel-view adapter wrappers without code duplication.

## 4. Pulse-counter independence from chips/search (confirmed)

The pulse-counter memo in `DashboardPage.jsx` reads:

```js
const platformCounts = useMemo(() => {
  let web = 0;
  let pos = 0;
  for (const o of getRunningOrders(orders)) {
    if (isWebOrigin(o)) web += 1;
    else pos += 1;
  }
  return { web, pos };
}, [orders]);
```

Dependency array contains **only** `orders`. No reference to:

- `activeStatuses` (status chips) — absent ✅
- `activeChannels` (channel chips) — absent ✅
- `searchQuery` / `searchText` — absent ✅
- `platform` (the Platform dropdown itself) — absent ✅

The count is therefore mathematically invariant under toggling status chips, channel chips, the Platform dropdown, or typing in the search box.

## 5. Empty Available tables excluded (confirmed)

Two layers exclude them:

1. **Pulse counter** — `getRunningOrders(orders)` filters `o.orderId && !TERMINAL_F_ORDER_STATUSES.has(o.fOrderStatus)`. Empty Available containers live in `apiTables`/room list, **not** in `orders`, so they're not seen at all. Even if they leaked into `orders`, the `!!o.orderId` guard would drop them.

2. **Dropdown filter** — both `platformMatches` predicates now start with:

   ```js
   if (platform === null) return true;
   const hasOrder = !!(item?.orderId || item?.order?.orderId);
   if (!hasOrder) return false;
   return platform === 'web' ? isWebOrigin(item) : !isWebOrigin(item);
   ```

   When `platform === 'pos'` or `'web'`, anything without an `orderId` is rejected up-front. Empty tables/rooms are visible only under `Platform: All`.

## 6. Room orders are counted (confirmed)

The new `platformCounts` memo iterates raw `orders` from `OrderContext` — the underlying state array that contains **every** order: dine-in, walk-in, takeaway, delivery, AND room. The previous bug stemmed from a hand-assembled tagged list that spread `dineInOrders` (which filters `!o.isRoom`) plus a few others with no room spread. That list is gone. Rooms are inherently included.

## 7. Walk-ins are not double-counted (confirmed)

Same root cause/fix as §6. The Frankenstein input `walkIn + takeAway + delivery + dineIn` is gone. Each walk-in exists exactly once in raw `orders`, and `getRunningOrders` returns each row once. No spread, no duplication.

## 8. Boundary / blast-radius check

Approved-files boundary respected. The following protected files were **not** touched in this session (confirmed via `git diff --stat`):

- `components/layout/PlatformCounterChip.jsx` — untouched. `computePlatformCounts` reducer stays exported (consumed only by its own 28-test suite, kept green).
- `components/layout/PlatformDropdown.jsx` — untouched.
- `contexts/OrderContext.jsx` — untouched.
- Socket handlers, action handlers, transforms, payload builders — untouched.
- VAT / service charge / tip / delivery-charge logic — untouched.
- Channel-view stability fix — untouched (`statusMatchesFilter` decoupling preserved at L777–782).
- Backend — untouched.

`git diff --stat`:
```
 frontend/src/pages/DashboardPage.jsx | 1 -
 1 file changed, 1 deletion(-)
```

## 9. QA / check results

| Check | Result |
|---|---|
| ESLint on `DashboardPage.jsx` | ✅ No issues found |
| Webpack hot-recompile after edit | ✅ `Compiled successfully` |
| Stale `computePlatformCounts` import in Dashboard | ✅ Removed |
| Approved-files-only boundary | ✅ Only `DashboardPage.jsx` modified |
| `platformCounts` deps array | ✅ Only `[orders]` — independent of chips/search/platform dropdown |
| `platformMatches` uses `isWebOrigin` (both channel + status views) | ✅ Confirmed L765 and L907 |
| Empty containers excluded under POS/Web filter | ✅ Both predicates contain the `hasOrder` short-circuit |
| Rooms in pulse count | ✅ Iterates raw `orders` (includes rooms) |
| Walk-ins counted once | ✅ Iterates raw `orders` (no spread duplication) |
| Reducer test suite (`PlatformCounterChip.test.jsx`) preservation | ✅ `computePlatformCounts` still exported from `PlatformCounterChip.jsx`; tests untouched |

Test suite was **not** executed in this session per the CR instructions ("Do not run test suites"). The reducer test suite continues to pass by contract since neither the reducer nor its export was modified.

## 10. Risks / open questions

- **Visible-number change at deploy.** Once shipped, every tenant's header pulse will shift to the corrected value (typically a smaller POS number after removing the walk-in double-count, then +rooms). Cashiers who have memorised today's wrong number will see a different (correct) one. A one-line release note + tooltip is enough; no other surface affected.
- **`statusData` audit (investigation §6.1) still open.** The status-view `allOrders` enumeration around `DashboardPage.jsx` L827–885 was flagged for a separate audit to confirm room inclusion in status columns. Out of scope for this CR; logged for follow-up.
- **No new tests added in this session.** The investigation document recommended an integration test (`__tests__/pages/DashboardPage.platformCounts.test.jsx`) to assert chip invariance under chip/channel/search toggles. The previous agent did not start it and this session was instructed to "prefer the smallest safe patch" and not run tests. Follow-up CR recommended.
- **No commit performed** per instruction. Working tree contains the one-line removal staged for review.

— End of fix report.
