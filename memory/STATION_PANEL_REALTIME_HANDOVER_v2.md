# Station Panel Realtime Refresh — Implementation Handover (v2)

> **Owner sign-off needed for §3 before next agent codes.**
> **Status:** Steps 1-7 implemented. Real-world testing surfaced 5 gaps. Steps 8-9 (real bug-fix + QA) pending.
> **Created:** 2026-04-26 · Supersedes `/app/memory/STATION_PANEL_REALTIME_HANDOVER.md` (v1) on the points called out below.
> **Predecessor doc:** `/app/memory/STATION_PANEL_REALTIME_HANDOVER.md` — read first for original spec, payload reference, debug logger contract.
> **Related bug:** `BUG-024` in `/app/memory/BUG_TEMPLATE.md` — backend item-cascade defect; partly explains stale data and is OUT OF SCOPE for this PR.

---

## 1. What is already shipped (Steps 1-7) — do not redo

### 1.1 Files

| File | Status |
|---|---|
| `frontend/src/hooks/useStationSocketRefresh.js` | NEW — created. ~226 lines. Lint clean. |
| `frontend/src/components/station-view/StationPanel.jsx` | MOD — added `import` + `useStationSocketRefresh()` call inside `StationPanelInner`. |
| `frontend/src/pages/StatusConfigPage.jsx` | MOD (earlier session) — sync StationContext + refetch after save. |
| `frontend/src/components/station-view/StationPanel.jsx` | MOD (earlier session) — density toggle (Comfortable / Compact / Ultra), persistence in `localStorage.mygenie_station_density`. **Owner has approved keeping the toggle.** |

### 1.2 Hook capabilities (currently working)

- ✅ Subscribes once to `getOrderChannel(restaurantId)` via `useSocket().subscribe(...)` (verified in console: `[StationRefresh] subscribing to channel new_order_478`).
- ✅ Coexists with `useSocketEvents` on the same channel (multi-handler verified).
- ✅ Filters per locked rules: 3 always-refresh + 3 ready/cancel-only (status === 2 || === 3).
- ✅ Per-station dirty Set + 500ms debounce (verified by code-trace).
- ✅ Reconnect-driven full refresh (`isConnected: false → true` flushes all enabled stations).
- ✅ Self-guards: skip when `stationViewEnabled === false`, no enabled stations, or socket not ready.
- ✅ Smart targeting via `extractAffectedStations(args, enabledStations)` reading `args[4].orders[*].order_details_food[*].station`.
- ✅ Cleanup on unmount (timer cleared + unsubscribed).
- ✅ Debug logging gated by `localStorage.STATION_DEBUG === 'true'`.

### 1.3 Locked decisions to preserve

- ❌ NO Option-3 optimistic local mutation. Kept rejected.
- ❌ NO polling fallback (Option 1). Kept deferred.
- ❌ NO server-pushed station deltas (Option 4 / REQ1). Backend-owned, parked.
- ✅ Smart per-station targeting when payload has `order_details_food[].station`.
- ✅ Fallback to all enabled stations when payload is missing.

---

## 2. What testing found — 5 gaps (validated against live data)

These are the empirical findings from real socket payloads + manual QA on order #731704 (restaurant 478, 26-Apr-2026). Source-of-truth payload captured in `BUG-024`.

### 🔴 GAP-A — Status filter logic is too narrow (false negatives)

**Finding:** Hook filters `update-order` / `update-food-status` / `update-item-status` on `args[3] === 2 || === 3`. Owner correctly pointed out this misses two scenarios:

1. **Re-fire / add-item-to-served-order:** Backend transitions `f_order_status: 5 → 1` when a new item is added to a Served order. Our filter rejects (`args[3] === 1` is not 2 or 3). Kitchen panel misses the new item. **Operationally unsafe.**

2. **Mark single item Ready:** Backend leaves `f_order_status` at the order's current value (often 5 or 1) because only the item-level changed. `args[3]` doesn't reflect the change. Filter rejects. Items don't disappear from kitchen panel.

**Fix specification:**
| Event | Old filter | NEW filter | Why |
|---|---|---|---|
| `new-order` | Always | Always | unchanged |
| `scan-new-order` | Always | Always | unchanged |
| `update-order-status` | Always | Always | unchanged |
| `update-order` | `args[3] ∈ {2, 3}` | **`args[3] ∈ {1, 2, 3}`** | catches re-fire (status flip 5→1) |
| `update-food-status` | `args[3] ∈ {2, 3}` | **Always** (drop status filter) | `args[3]` is order-level; useless for item-only changes |
| `update-item-status` | `args[3] ∈ {2, 3}` | **Always** (drop status filter) | same reason |

### 🔴 GAP-B — Missing event in subscription set: `update-order-paid`

**Finding:** Backend emits `update-order-paid` for "Mark Order Ready" of complementary / zero-amount orders (see BUG-024 side-bug). Our locked rules ignore this event entirely. Kitchen panel never refetches in this path even after backend fixes its cascade bug.

**Fix specification:**
- Add `update-order-paid` to a NEW filter bucket: refresh only when `args[3] === 2 || === 3` (Mark Ready or Cancel cases). Skip on plain payment events where status remains operational.

| Event | Filter |
|---|---|
| `update-order-paid` | **NEW — `args[3] ∈ {2, 3}` only** |

**Why this filter (not always-refresh):** in normal payment events, the order is already past Preparing (typically status=6 Paid). Items are already out of kitchen panel. Refreshing would be a no-op fetch — wasted bandwidth. Limiting to {2, 3} keeps the hook lean.

### 🟡 GAP-C — `extractAffectedStations` blind to v2 payload shape

**Finding:** Helper reads `args[4].orders[*].order_details_food[*].station`. The v2 payload of `update-order-paid` (and possibly other newer events) uses **`orderDetails`** instead of `order_details_food`. The helper returns 0 affected → falls back to "refresh all enabled stations" → **inefficient but not broken**. Smart targeting silently degrades for v2 events.

**Fix specification:**
- Update `extractAffectedStations` to try BOTH field names: `order_details_food` (v1) THEN `orderDetails` (v2).
- Pseudo:
  ```js
  const items = order?.order_details_food || order?.orderDetails || [];
  ```

### 🟢 GAP-D — Logging clarity for debugging

**Finding:** When users captured payloads, it was hard to tell which event hit which filter branch. Current logs use generic terms like `mark dirty` / `skip (status filter)`.

**Fix specification (LOW priority):**
- Tag each log line with the rule that fired, e.g.:
  - `[StationRefresh] PASS-ALWAYS new-order → mark dirty stations=[KDS]`
  - `[StationRefresh] PASS-STATUS update-order status=2 → mark dirty stations=[KDS,BAR]`
  - `[StationRefresh] DROP-STATUS update-order status=5 — kept stale`
  - `[StationRefresh] DROP-IGNORED split-order`

This is QA-friendly and helps diagnose future drift between frontend filter and backend event vocabulary.

### 🔴 GAP-E (BACKEND, captured separately as BUG-024) — Item cascade missing

**Finding:** Backend marks order Ready (`f_order_status: 2`) but does NOT cascade `food_status: 2` to items. Items remain in `food_status: 1` state. Station-order-list API correctly returns them. Kitchen panel correctly shows them. **The data itself is wrong.**

**Out of scope for this PR.** Documented in `BUG_TEMPLATE.md` as BUG-024. Once backend fixes cascade, our hook will auto-correct (because we'll receive a fresh socket event and refetch — items will be gone from `/station-order-list` results).

---

## 3. Approval-gated decisions for next agent

Before coding, confirm with owner:

### 3.1 Should `update-order` filter expand to {1, 2, 3} or stay at {2, 3}?
**My recommendation: {1, 2, 3}.** Catches re-fire/add-item operationally critical scenario. False-positive cost is low (rare event, debounced).

### 3.2 Should `update-order-paid` be added with {2, 3} filter, or always-refresh, or kept ignored?
**My recommendation: add with {2, 3} filter.** Limits to Mark Ready / Cancel of complementary orders without spamming on actual payment events.

### 3.3 Should `update-order-source` be added?
**My recommendation: skip for now.** No live evidence yet that it carries kitchen-relevant changes. Add later if QA captures a missed scenario.

### 3.4 Defer Jest tests again, or write them now?
**My recommendation: defer.** Same as v1 — manual smoke test (12 scenarios from v1 doc §8) covers the surface. Jest tests +1h, low marginal value once payload shapes are confirmed.

---

## 4. Implementation plan (after approval)

### Step 8 — Fix the filter rules (the actual bug fix)

**File:** `/app/frontend/src/hooks/useStationSocketRefresh.js`

**Changes:**

```js
// Constants section — replace the 2 arrays:
const REFRESH_ALWAYS = [
  SOCKET_EVENTS.NEW_ORDER,
  SOCKET_EVENTS.SCAN_NEW_ORDER,
  SOCKET_EVENTS.UPDATE_ORDER_STATUS,
  SOCKET_EVENTS.UPDATE_FOOD_STATUS,    // moved up — drop status filter
  SOCKET_EVENTS.UPDATE_ITEM_STATUS,    // moved up — drop status filter
];

const REFRESH_ON_PREPARING_READY_OR_CANCEL = [
  SOCKET_EVENTS.UPDATE_ORDER,          // status ∈ {1, 2, 3}
  SOCKET_EVENTS.UPDATE_ORDER_PAID,     // NEW — status ∈ {2, 3} only (see special case)
];

const PREPARING = 1;
const READY = 2;
const CANCELLED = 3;
```

**`handleOrderChannelEvent` filter logic:**
```js
const isAlways = REFRESH_ALWAYS.includes(eventName);
const isStatusGated = REFRESH_ON_PREPARING_READY_OR_CANCEL.includes(eventName);

if (!isAlways && !isStatusGated) {
  debugLog('DROP-IGNORED', eventName);
  return;
}

// Status filter for the gated bucket
if (isStatusGated) {
  // update-order: status ∈ {1, 2, 3}
  // update-order-paid: status ∈ {2, 3} only (skip plain payment with status 6)
  const allowed = eventName === SOCKET_EVENTS.UPDATE_ORDER_PAID
    ? [READY, CANCELLED]
    : [PREPARING, READY, CANCELLED];

  if (!allowed.includes(fOrderStatus)) {
    debugLog('DROP-STATUS', eventName, 'status=', fOrderStatus);
    return;
  }
}
```

### Step 9 — Fix `extractAffectedStations` for v2 payload shape

**Same file. Replace the helper:**

```js
export const extractAffectedStations = (args, enabledStations) => {
  const affected = new Set();
  const payload = args?.[4];
  const orders = payload?.orders || [];

  orders.forEach((order) => {
    // v1 shape: order_details_food[]
    // v2 shape: orderDetails[] (e.g., update-order-paid)
    const items = order?.order_details_food || order?.orderDetails || [];
    items.forEach((food) => {
      if (food?.station && enabledStations.includes(food.station)) {
        affected.add(food.station);
      }
    });
  });

  return affected.size > 0 ? [...affected] : [...enabledStations];
};
```

### Step 10 — Improve debug logs (optional, low priority)

Add a small helper for tagged logs:
```js
const trace = (rule, eventName, extra = {}) => {
  debugLog(rule, eventName, JSON.stringify(extra));
};
// usage: trace('PASS-ALWAYS', eventName, { stations: affected });
//        trace('DROP-STATUS', eventName, { status: fOrderStatus });
```

### Step 11 — Manual QA (12 scenarios)

Run the test plan from `/app/memory/STATION_PANEL_REALTIME_HANDOVER.md` §5.2. Critical retests:
- **T2 (re-fire):** Add an item to a Served order. Expect Station Panel to refresh and show the new item.
- **T3 (Mark Ready):** Mark a single item Ready. Expect refresh; **note: until backend fixes BUG-024, item may still appear** because `food_status` won't have flipped. The HOOK is correct; the BACKEND lies. Document this in QA report.
- **T4 (Cancel):** Same as above.
- **T11 (burst):** Place 5 KDS orders rapidly. Expect 1 fetch.

### Step 12 — Document QA outcome

Append a "Verified" sub-section to this handover with date + sign-off.

---

## 5. Files NOT to modify

- `LoadingPage.jsx`, `StatusConfigPage.jsx` — already-shipped fixes, do not touch.
- `StationContext.jsx`, `stationService.js` — orthogonal, no change needed.
- `socketEvents.js`, `socketHandlers.js`, `socketService.js`, `SocketContext.jsx` — pure subscription consumer; do not modify socket layer.
- The density toggle in `StationPanel.jsx` — owner-approved feature, keep.

---

## 6. Risks / edge cases

| # | Risk | Mitigation |
|---|---|---|
| 1 | Backend ships a NEW event (e.g. v3 something) we don't handle | Doc says reconcile every 1-2 sprints by inspecting `[useSocketEvents] Unknown order event:` logs. |
| 2 | New event uses `args[3]` differently | Empirically capture & update filter constants. |
| 3 | High-volume kitchens see >100 events/min | 500ms debounce already collapses bursts; profile if needed. Threshold: keep an eye on Network panel during peak. |
| 4 | `update-order-paid` status semantics differ across order types | We assume status ∈ {2, 3} for kitchen-relevant events. If actual paid event also carries 2/3 (unlikely), we'd refetch needlessly — cheap, debounced, no correctness issue. |
| 5 | BUG-024 not fixed in backend → kitchen sees ghost items even after our hook fires correctly | Document in QA report. Operationally, surface a one-line note in the panel UI ("Some items may be stale until backend fix") — out of scope for this PR. |

---

## 7. Acceptance criteria

- [ ] §3 decisions confirmed by owner before code.
- [ ] Filter logic matches §4 exactly.
- [ ] `extractAffectedStations` handles both `order_details_food` and `orderDetails`.
- [ ] `update-order-paid` subscribed; status filter `∈ {2, 3}` applied.
- [ ] `update-order` filter widened to `∈ {1, 2, 3}`.
- [ ] `update-food-status` and `update-item-status` lose their status filter.
- [ ] All 12 manual QA scenarios run; results documented.
- [ ] T2 (re-fire) verified — adds new item to Served order → kitchen panel refreshes (confirmed via Network tab).
- [ ] T3 (Mark Ready) — kitchen panel refetches; if items remain visible, BUG-024 referenced as cause (not a hook bug).
- [ ] T11 (burst) — 5 events → 1 fetch verified.
- [ ] Lint clean (`mcp_lint_javascript`).
- [ ] No console errors during steady-state operation.
- [ ] Existing density toggle still works.
- [ ] `useSocketEvents` (dashboard subscriptions) untouched.

---

## 8. Rollback plan

Single hook + helper. Revert the 2 commits or replace with v1's filter constants. No state migration needed.

---

## 9. Related references

- v1 handover: `/app/memory/STATION_PANEL_REALTIME_HANDOVER.md` — original spec, payload table, debug logger contract.
- Backend-owned defect: `/app/memory/BUG_TEMPLATE.md` → BUG-024.
- Captured live payload: BUG-024 entry includes the full `update-order-paid` JSON for order 731704 (smoking-gun reference).
- Architecture FYI: kitchen-panel data source is the `def_order_status=1` station-order-list endpoint; it filters at item-level (`food_status === 1`), explaining why a Served order's items can still surface.

---

**End of v2 handover. Implementation agent: read v1 first, then this delta. Pause for owner approval on §3 before writing code.**
