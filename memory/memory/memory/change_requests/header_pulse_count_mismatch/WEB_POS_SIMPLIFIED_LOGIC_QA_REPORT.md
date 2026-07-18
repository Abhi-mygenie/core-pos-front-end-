# Web/POS Simplified Logic — QA REPORT

> CR: `header_pulse_count_mismatch`
> Date: 2026-05-15
> Companion to: `WEB_POS_SIMPLIFIED_LOGIC_INVESTIGATION.md`, `WEB_POS_SIMPLIFIED_LOGIC_FIX_REPORT.md`
> Mode: **Validation only. No code changes.**

---

## Verdict: **PASS** — all 8 QA checks pass on static review

The implementation satisfies every owner-locked rule from the investigation document. Validation was performed by reading the live source files and tracing every code path exercised by each check. No runtime test suite was executed (per the instruction "no code changes" / standing CR instruction "do not run test suites"); however, the logic is small, pure, and fully traceable end-to-end.

---

## QA scope & method

**Files audited:**

| File | Lines audited | Purpose |
|---|---|---|
| `frontend/src/contexts/OrderContext.jsx` | L9–10, L160–185, L333 | Verify `orders` is the unified flat array (the input to the pulse counter). |
| `frontend/src/utils/orderOrigin.js` | full file (60 LOC) | Verify `isWebOrigin` and `getRunningOrders` semantics. |
| `frontend/src/pages/DashboardPage.jsx` | L20–26, L755–766, L900–907, L953–961, L1505–1506 | Verify imports, two `platformMatches` predicates, `platformCounts` memo, and prop wiring to chip. |
| `frontend/src/components/layout/PlatformCounterChip.jsx` | full file (119 LOC) | Verify chip is presentational only — no internal narrowing. |

**Method:** Static code review (read-and-trace). Each check below names the lines that prove it.

---

## Check-by-check results

### Check 1 — Header Web/POS count equals actual running-order origin count → **PASS**

`DashboardPage.jsx` L953–961:
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

- Universe = `getRunningOrders(orders)` → every row in `orders` where `o.orderId` is truthy AND `o.fOrderStatus ∉ {3, 6}` (`orderOrigin.js` L54–58).
- Bucket = `orderFrom === 'web'` for Web, else POS (`orderOrigin.js` L37–38).
- `orders` is OrderContext's single unified state array (L9–10: *"Single unified array - includes all orders (tables, walk-ins, rooms)"*) — every running order appears exactly once.

Therefore `platformCounts.web + platformCounts.pos` equals the count of all running orders bucketed by `orderFrom`. Chip is wired from `platformCounts.web` / `platformCounts.pos` (L1505–1506). ✅

### Check 2 — Walk-in orders count only once → **PASS**

The pulse counter consumes raw `orders` from OrderContext (the flat unified array), **not** the derived per-channel selectors `dineInOrders` / `walkInOrders`. In the previous (buggy) implementation the input was `[...walkInOrders, ...dineInOrders, ...]` — and `walkInOrders` is a subset of `dineInOrders` (OrderContext L182–185: `dineInOrders.filter(o => o.isWalkIn)`), so walk-ins appeared twice. The new memo iterates `orders` directly: each walk-in row is one row in the unified array → counted once. ✅

### Check 3 — Room orders are included → **PASS**

Room orders live in `orders` (the unified array, per OrderContext L9–10 explicit comment). They never reach the pulse counter via `dineInOrders` (which filters `!o.isRoom`, OrderContext L162); but the new memo bypasses derived selectors entirely. `getRunningOrders` does **not** filter on `orderType` or `isRoom`, so room rows survive the universe filter and are bucketed by `orderFrom` like any other order. ✅

### Check 4 — Empty available tables do not count as POS → **PASS**

Two independent guards:

1. **Pulse counter:** Empty Available tables/rooms live in `apiTables`/room list — **not** in `orders` — so they're not iterated at all. Even if a synthetic row leaked into `orders`, `getRunningOrders` requires `o.orderId` (`orderOrigin.js` L57), which empty containers lack. ✅

2. **Platform dropdown predicate** (both copies, L760–765 and L902–907):
   ```js
   if (platform === null) return true;
   const hasOrder = !!(item?.orderId || item?.order?.orderId);
   if (!hasOrder) return false;            // ← excludes empty containers under both Web and POS
   return platform === 'web' ? isWebOrigin(item) : !isWebOrigin(item);
   ```
   When the dropdown is set to POS or Web, empty rows return `false` before `isWebOrigin` is consulted. They appear only under `Platform: All`. ✅

### Check 5 — Toggling status chips does not change Web/POS pulse → **PASS**

`platformCounts` memo dep array: `[orders]` only (L961). It does **not** reference `activeStatuses`, `statusMatchesFilter`, or any status-chip state. Toggling a status chip mutates `activeStatuses` (used by `channelData`/`statusData`), but `useMemo` re-evaluation of `platformCounts` is keyed only on `orders`. The chip value is mathematically invariant. ✅

### Check 6 — Toggling channel chips does not change Web/POS pulse → **PASS**

Same memo dep array `[orders]`. No reference to `activeChannels`. Channel chips drive the `activeChannels` state consumed by `channelData`/`statusData`, never by `platformCounts`. ✅

### Check 7 — Search does not change Web/POS pulse → **PASS**

Same memo dep array `[orders]`. No reference to `searchQuery` / `searchText` / `searchResults`. The search box updates separate state used elsewhere. `platformCounts` does not re-run on search input. ✅

### Check 8 — Platform dropdown POS/Web filters only real orders → **PASS**

Both `platformMatches` predicates (channel-view L760–765 and status-view L902–907) explicitly short-circuit with `hasOrder` BEFORE checking `isWebOrigin`. Empty tables/rooms (no `orderId`) are rejected under both `platform === 'pos'` and `platform === 'web'`. Real orders pass through to the origin check. The two predicates are textually identical, eliminating drift risk. ✅

---

## Regression scan

Confirmed **no** regression in the protected surfaces (read-only verification, files untouched per fix report):

| Surface | Status |
|---|---|
| `PlatformCounterChip.jsx` (presentational chip + reducer) | Untouched; reducer remains exported for its own 28-test suite. Chip renders only `webCount`/`posCount` props — no internal narrowing. |
| `PlatformDropdown.jsx` | Untouched. |
| `OrderContext.jsx` (`orders` state, derived selectors) | Untouched. Pulse consumes raw `orders`; derived selectors still feed `channelData`/`statusData`. |
| Socket handlers / action handlers | Untouched. |
| API transforms / payload builders | Untouched (`orderFrom` field normalisation in `orderTransform.js` was already in place). |
| VAT / service charge / tip / delivery-charge math | Untouched. |
| Channel-view stability fix (status-chip decoupling at L777–782) | Preserved — `platformMatches` is orthogonal and additive. |
| Backend | Untouched. |
| ESLint on `DashboardPage.jsx` | Clean (`No issues found`). |
| Webpack | `Compiled successfully` (hot recompile after the final stale-import removal). |

**No regression observed.**

---

## Observations / informational notes (not failures)

1. **Stale header comment in `PlatformCounterChip.jsx` L7–11** still describes the OLD contract: *"Counter respects status chips, channel column hide, and search."* The actual `computePlatformCounts` reducer is independent of those (and the dashboard no longer calls it — the inline memo replaces it). The chip is presentational only. The runtime behaviour is correct under the new contract; only the documentation in this file is now stale. This file is on the do-not-touch list for this CR; suggest a tiny doc-only follow-up to align the comment with the new owner-locked contract.

2. **No integration test for invariance was added.** The investigation document recommended `__tests__/pages/DashboardPage.platformCounts.test.jsx` to assert chip invariance under chip/channel/search toggles. The fix CR opted for "smallest safe patch" and skipped the new test file. The existing 28-test `PlatformCounterChip.test.jsx` continues to cover the pure reducer (untouched). Follow-up CR recommended.

3. **`statusData` `allOrders` room enumeration audit (investigation §6.1)** still open as flagged by the fix report. Out of QA scope.

4. **Runtime test suite was not executed** per the CR instruction. Static analysis is sufficient to validate the 8 checks because the logic surface is small (one memo, two predicates, two helper functions) and is pure with respect to its declared inputs.

---

## Files referenced in this QA

- `/app/frontend/src/contexts/OrderContext.jsx`
- `/app/frontend/src/utils/orderOrigin.js`
- `/app/frontend/src/pages/DashboardPage.jsx`
- `/app/frontend/src/components/layout/PlatformCounterChip.jsx`

— End of QA report.
