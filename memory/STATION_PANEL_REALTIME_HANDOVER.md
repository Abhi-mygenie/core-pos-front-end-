# Station Panel — Real-Time Refresh (Implementation Handover)

> **Owner sign-off:** Locked rules below. Implementation agent must follow them exactly — no scope creep.
> **Created:** Apr 2026 · **Status:** Ready to implement · **Effort:** ~1.5h
> **Approach chosen:** Option 2 (socket-driven refetch with debounce). **Option 3 (optimistic) was explicitly rejected** — do not implement local mutation.

---

## 1. Background (read first — 2 min)

The Station Panel (`/app/frontend/src/components/station-view/StationPanel.jsx`) shows aggregated kitchen item counts grouped by station (BAR, KDS, GRILL, …) and category. Today, data is loaded **once on login** via `LoadingPage.loadStationData()` and only refreshed when the user clicks the per-station ⟳ button.

This handover wires the panel to existing socket events so it stays live when orders/items change.

### How data is currently fetched (no change to this layer)

1. **API:** `POST /api/v1/vendoremployee/station-order-list` (FormData: `role_name=<station>`, `def_order_status=1`)
2. **Transform:** `stationService.fetchStationData(stationName, categoriesMap)` reads `response.data.orders[].order_details_food[]`, filters by `item.station === stationName`, groups quantity by category → item name.
3. **Output:** `{ stationName, categories:[{name, totalCount, items:[{name,count}]}], totalItems }`
4. **Hydration:** `setAllStationData({ KDS: {...}, BAR: {...} })` into `StationContext`.
5. **Render:** `StationPanel` reads `useStations().stationData[stationName]`.

**Bug fix already shipped (Apr 2026):** `StatusConfigPage.saveConfiguration` now syncs `StationContext` state + refetches station data so panel updates without a full reload. Don't undo this.

---

## 2. Scope — Locked Decisions (DO NOT CHANGE)

### 2.1 Approach
- ✅ **Option 2** — listen to socket events, re-call `fetchStationData` for affected stations
- ❌ **Option 3 rejected** — no optimistic local mutation. We always refetch via the API. Reason: avoids duplicating the aggregator client-side, simpler rollback story, no echo dedup needed.

### 2.2 Event matrix (final)

| Socket event | Channel | Action | Filter |
|---|---|---|---|
| `new-order` | `new_order_${restaurantId}` | **Refresh** | Always |
| `scan-new-order` | `new_order_${restaurantId}` | **Refresh** | Always |
| `update-order-status` | `new_order_${restaurantId}` | **Refresh** | Always |
| `update-order` | `new_order_${restaurantId}` | **Refresh** | **Only when `fOrderStatus === 2` (Ready) OR `fOrderStatus === 3` (Cancelled)** |
| `update-food-status` | `new_order_${restaurantId}` | **Refresh** | **Only when `fOrderStatus === 2` (Ready) OR `fOrderStatus === 3` (Cancelled)** |
| `update-item-status` | `new_order_${restaurantId}` | **Refresh** | **Only when `fOrderStatus === 2` (Ready) OR `fOrderStatus === 3` (Cancelled)** |
| `split-order` | `new_order_${restaurantId}` | **IGNORE** | — (food item status doesn't change in split) |
| `update-order-paid` | `new_order_${restaurantId}` | **IGNORE** | — |
| `update-order-target` | `new_order_${restaurantId}` | **IGNORE** | — (routing metadata only) |
| `update-order-source` | `new_order_${restaurantId}` | **IGNORE** | — (routing metadata only) |
| `delivery-assign-order` | `new_order_${restaurantId}` | **IGNORE** | — |
| `update-table` | `update_table_${restaurantId}` | **IGNORE** | — (table state, not KOT items) |
| `order-engage` | `order-engage_${restaurantId}` | **IGNORE** | — (UI lock indicator) |
| `aggrigator-order` / `aggrigator-order-update` | `aggregator_order_${restaurantId}` | **IGNORE** | — (separate flow) |

### 2.3 Status code reference (from `/app/frontend/src/api/constants.js` `F_ORDER_STATUS`)

| Code | Meaning | Effect on station panel |
|---|---|---|
| 7 | YTC (Yet to Confirm) | Not in panel (panel filters status=1 only) |
| 1 | **Preparing** | **Item is IN the panel** |
| 2 | Ready | Item leaves the panel |
| 3 | Cancelled | Item leaves the panel |
| 8 | Running | Not in panel |
| 5 | Served | Not in panel |
| 6 | Paid | Not in panel |
| 9 | Pending Payment | Not in panel |
| 10 | Reserved | Not in panel |

### 2.4 Debounce + Reconnect rules
- **Debounce:** 500ms per-station dirty set. Multiple events for same station within 500ms = 1 refetch.
- **Reconnect:** On `socket connect` event, mark all enabled stations dirty and flush — guarantees panel state catches up after kitchen tablet sleeps / Wi-Fi drops.
- **Disabled panel:** If `stationViewEnabled === false` or `enabledStations.length === 0`, do not register listeners (early return).

---

## 3. Socket payload reference

All "Refresh" events arrive with this shape (array, indexed):

```
[eventName, orderId, restaurantId, fOrderStatus, payload?, extra?]
   [0]         [1]         [2]            [3]        [4]      [5]
```

Reference: `/app/frontend/src/api/socket/socketHandlers.js` line 140, 213, 293, 358, 416.

- **`message[3]`** = `fOrderStatus` — this is the field we filter on for `update-order`, `update-food-status`, `update-item-status`.
- **`message[4]` (payload)** = present for `EVENTS_WITH_PAYLOAD` (`new-order`, `update-order`, `update-item-status` etc.) and contains `{ orders: [{ order_details_food: [{station, ...}, ...] }, ...] }`.
- **For events without payload** (`update-food-status`, `update-order-status`, `scan-new-order`), we do **not** know which station was affected. → **Refresh ALL enabled stations** in this case (still cheap because of debounce).

### Smart per-station targeting (when payload available)
If `message[4].orders[*].order_details_food[*].station` is present, only mark those stations dirty. Saves N HTTP calls when only one station is affected.

```js
const extractAffectedStations = (payload, enabledStations) => {
  const affected = new Set();
  const orders = payload?.[4]?.orders || [];
  orders.forEach(o => {
    (o.order_details_food || []).forEach(food => {
      if (food.station && enabledStations.includes(food.station)) {
        affected.add(food.station);
      }
    });
  });
  // Fallback: if we couldn't determine, refresh all enabled
  return affected.size > 0 ? [...affected] : enabledStations;
};
```

---

## 4. Implementation Plan

### 4.1 Files to create

| File | Purpose |
|---|---|
| `/app/frontend/src/hooks/useStationSocketRefresh.js` | New hook — registers listeners, owns dirty set + debounce timer, fetches and updates context |
| `/app/frontend/src/__tests__/hooks/useStationSocketRefresh.test.js` | Jest tests — see §5 |

### 4.2 Files to modify

| File | Change |
|---|---|
| `/app/frontend/src/components/station-view/StationPanel.jsx` | Call `useStationSocketRefresh()` from inside `StationPanelInner` (after the `if (!enabled) return null` guard). One line. |

### 4.3 Skeleton (reference only — implementation agent should refine)

```js
// /app/frontend/src/hooks/useStationSocketRefresh.js
import { useEffect, useRef, useCallback } from 'react';
import { useStations, useMenu } from '../contexts';
import { useSocketEvents } from '../api/socket';   // confirm exact import path
import { fetchStationData } from '../api/services/stationService';
import { SOCKET_EVENTS } from '../api/socket/socketEvents';

const DEBOUNCE_MS = 500;
const REFRESH_ALWAYS = [
  SOCKET_EVENTS.NEW_ORDER,            // 'new-order'
  SOCKET_EVENTS.SCAN_NEW_ORDER,       // 'scan-new-order'
  SOCKET_EVENTS.UPDATE_ORDER_STATUS,  // 'update-order-status'
];
const REFRESH_ON_READY_OR_CANCEL = [
  SOCKET_EVENTS.UPDATE_ORDER,         // 'update-order'
  SOCKET_EVENTS.UPDATE_FOOD_STATUS,   // 'update-food-status'
  SOCKET_EVENTS.UPDATE_ITEM_STATUS,   // 'update-item-status'
];
const READY = 2;
const CANCELLED = 3;

export const useStationSocketRefresh = () => {
  const { enabledStations, stationViewEnabled, setAllStationData, stationData } = useStations();
  const { categories } = useMenu();
  const dirtyRef = useRef(new Set());
  const timerRef = useRef(null);

  const categoriesMap = /* same memo logic as in StationPanel */;

  const flush = useCallback(async () => {
    const stations = [...dirtyRef.current];
    dirtyRef.current.clear();
    timerRef.current = null;
    if (!stations.length) return;
    const results = await Promise.all(
      stations.map(s => fetchStationData(s, categoriesMap))
    );
    // Merge into existing stationData (don't blow away other stations)
    setAllStationData(prev => {
      const next = { ...prev };
      stations.forEach((s, i) => { next[s] = results[i]; });
      return next;
    });
  }, [categoriesMap, setAllStationData]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, DEBOUNCE_MS);
  }, [flush]);

  const handleEvent = useCallback((eventName, message) => {
    const fOrderStatus = message?.[3];
    const isReadyOrCancel = fOrderStatus === READY || fOrderStatus === CANCELLED;

    // Filter rule
    if (REFRESH_ON_READY_OR_CANCEL.includes(eventName) && !isReadyOrCancel) return;
    if (!REFRESH_ALWAYS.includes(eventName) && !REFRESH_ON_READY_OR_CANCEL.includes(eventName)) return;

    // Determine affected stations from payload (if present)
    const affected = extractAffectedStations(message, enabledStations);
    affected.forEach(s => dirtyRef.current.add(s));
    scheduleFlush();
  }, [enabledStations, scheduleFlush]);

  useEffect(() => {
    if (!stationViewEnabled || !enabledStations?.length) return;

    const subscriptions = [...REFRESH_ALWAYS, ...REFRESH_ON_READY_OR_CANCEL].map(ev => {
      const fn = (msg) => handleEvent(ev, msg);
      // Wire via your existing socket abstraction — confirm method name
      socket.on(ev, fn);
      return [ev, fn];
    });

    // Reconnect → full refresh
    const onReconnect = () => {
      enabledStations.forEach(s => dirtyRef.current.add(s));
      scheduleFlush();
    };
    socket.on('connect', onReconnect);

    return () => {
      subscriptions.forEach(([ev, fn]) => socket.off(ev, fn));
      socket.off('connect', onReconnect);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stationViewEnabled, enabledStations, handleEvent, scheduleFlush]);
};
```

### 4.4 Wiring in StationPanel

```js
// /app/frontend/src/components/station-view/StationPanel.jsx (in StationPanelInner)
import { useStationSocketRefresh } from '../../hooks/useStationSocketRefresh';

const StationPanelInner = (...) => {
  useStationSocketRefresh();   // ← one line, no other changes
  // ... existing JSX
};
```

### 4.5 ⚠️ Pitfalls / things to verify before coding

1. **Confirm the existing socket subscription pattern.** `useSocketEvents` is already used in `DashboardPage`. Check `/app/frontend/src/api/socket/socketService.js` for the canonical `socket.on/off` API. Don't open a second connection — reuse the singleton.
2. **Confirm `setAllStationData` accepts a function updater.** Look at `StationContext.jsx:94`. If it currently only takes an object, switch to `setStationData(prev => ...)` exposed from the context, or use `updateStationData` (already exposed at line 84).
3. **`message` shape:** double-check whether your socket layer hands you the raw array `[name, id, restId, status, ...]` or already destructures it. Look at `socketHandlers.js:140-160` for the canonical extraction.
4. **`enabledStations` is async-loaded.** First mount may have `enabledStations=[]`. The early-return `if (!stationViewEnabled || !enabledStations.length) return;` guards this. The `useEffect` re-runs when `enabledStations` populates, so listeners attach at that moment.
5. **Don't refetch when station view is OFF.** The early return handles this.
6. **Disable on tab hidden?** Out of scope for this PR. Add later if profiling shows wasted fetches.

---

## 5. Test Plan

Implementation agent must add Jest tests covering these cases. Use existing test pattern from `/app/frontend/src/__tests__/api/socket/socketEvents.test.js`.

### 5.1 Unit tests (`useStationSocketRefresh.test.js`)

| # | Scenario | Expected |
|---|---|---|
| 1 | `new-order` event arrives → fetch is called once after 500ms for affected stations | ✅ |
| 2 | `scan-new-order` arrives → fetch called for affected stations (or all if no payload) | ✅ |
| 3 | `update-order-status` arrives (any status) → fetch called for all enabled stations | ✅ |
| 4 | `update-order` arrives with `fOrderStatus=1` (Preparing) → **NO fetch** | ❌ no fetch |
| 5 | `update-order` arrives with `fOrderStatus=2` (Ready) → fetch called | ✅ |
| 6 | `update-order` arrives with `fOrderStatus=3` (Cancelled) → fetch called | ✅ |
| 7 | `update-food-status` with `fOrderStatus=2` → fetch called | ✅ |
| 8 | `update-food-status` with `fOrderStatus=5` (Served) → **NO fetch** | ❌ no fetch |
| 9 | `update-item-status` with `fOrderStatus=3` → fetch called | ✅ |
| 10 | `split-order` arrives → **NO fetch** | ❌ no fetch |
| 11 | `update-order-paid` arrives → **NO fetch** | ❌ no fetch |
| 12 | 5 events for KDS within 200ms → exactly **1 fetch** for KDS after 500ms (debounce) | ✅ 1 call |
| 13 | Events affecting BAR + KDS within 200ms → exactly 1 fetch each (parallel) | ✅ 2 calls |
| 14 | Payload with `order_details_food[].station = 'KDS'` only → BAR not refetched | ✅ KDS only |
| 15 | Payload missing → all enabled stations refetched | ✅ fallback |
| 16 | `stationViewEnabled = false` → listeners not registered | ✅ no listener |
| 17 | `enabledStations = []` → listeners not registered | ✅ no listener |
| 18 | Hook unmount → listeners cleaned up, pending timer cancelled | ✅ |
| 19 | `connect` event after disconnect → all enabled stations refetched | ✅ |

### 5.2 Manual verification (smoke test)

1. Login → Dashboard with Station Panel visible (BAR + KDS).
2. From a separate device/tab, place a new order containing items for KDS.
3. Within ~1s, KDS panel count increments. BAR panel unchanged.
4. Mark an item Ready from another device. Within ~1s, item leaves KDS panel.
5. Disconnect Wi-Fi for 30s, reconnect → panel re-syncs after `connect` event.
6. Toggle "Station View" OFF in Status Config → no fetches fire even when orders change (verify in Network tab).

---

## 6. Acceptance Criteria

- [ ] All events in §2.2 mapped exactly as specified.
- [ ] Status filter `(status === 2 || status === 3)` applied only to `update-order`, `update-food-status`, `update-item-status`.
- [ ] Per-station debounce of 500ms.
- [ ] Smart targeting via `extractAffectedStations` when payload is available.
- [ ] Fallback to "all enabled stations" when payload is missing.
- [ ] Reconnect handler refetches all enabled stations.
- [ ] No listeners registered when station view is disabled.
- [ ] Clean unmount (no memory leaks).
- [ ] All 19 unit tests pass.
- [ ] Manual smoke test passes (§5.2).
- [ ] No regression in existing socket events for orders/tables (`DashboardPage` flow untouched).

---

## 7. Out of Scope (do not do these)

- ❌ Optimistic local mutation (Option 3) — explicitly rejected by owner.
- ❌ Polling fallback (Option 1) — defer until profiling shows missed events.
- ❌ Server-pushed station deltas (Option 4 / REQ1) — backend not ready.
- ❌ Tab-visibility throttling — defer to performance pass.
- ❌ Refactoring `fetchStationData` aggregation logic.
- ❌ Changing the API endpoint or its contract.
- ❌ Removing the `Density` toggle button — owner is keeping it.

---

## 8. Rollback Plan

Single hook + one-line wire-up. Revert by deleting `useStationSocketRefresh.js` and the one import/call in `StationPanel.jsx`. No data migration, no localStorage changes, no API surface change.

---

## 9. Related Docs / Code

- `/app/frontend/src/components/station-view/StationPanel.jsx` — panel UI + density toggle (Apr 2026 prototype, owner-approved)
- `/app/frontend/src/api/services/stationService.js` — fetchStationData transform
- `/app/frontend/src/api/socket/socketEvents.js` — canonical event list
- `/app/frontend/src/api/socket/socketHandlers.js` — payload shapes (lines 140, 213, 293, 358, 416)
- `/app/frontend/src/contexts/StationContext.jsx` — state owner, `setAllStationData` / `updateStationData` setters
- `/app/frontend/src/api/constants.js:125` — `F_ORDER_STATUS` enum
- `/app/memory/PRD.md` — REQ1 (parked) is the long-term replacement (server-pushed deltas)

---

**End of handover. Implementation agent: read all sections, then implement §4 in order. Don't deviate from §2 (locked rules) without owner sign-off.**
