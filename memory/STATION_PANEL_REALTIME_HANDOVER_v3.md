# Station Panel Realtime Refresh — Implementation Handover (v3, FINAL)

> **Status:** Approval-locked. Ready for implementation agent. No further owner sign-off needed.
> **Created:** 2026-04-26 · **Supersedes:** v2 (`STATION_PANEL_REALTIME_HANDOVER_v2.md`) on §2.2, §3, §4 — all decisions in v2's "approval-gated" section have been answered by owner via empirical capture.
> **Predecessor docs:** `STATION_PANEL_REALTIME_HANDOVER.md` (v1, original spec) · `STATION_PANEL_REALTIME_HANDOVER_v2.md` (v2, gap discovery)
> **Related backend bug:** `BUG-024` in `BUG_TEMPLATE.md` — out of scope; assumed backend will fix.

---

## 0. TL;DR for the implementation agent

Modify ONE file: `/app/frontend/src/hooks/useStationSocketRefresh.js`.

Change four things:
1. **Always-refresh** on `new-order`, `scan-new-order`, `update-order-status`, `update-order`, `update-item-status`, `update-food-status` (drop all `args[3]` status filters).
2. **Add `update-order-paid`** to the refresh set, gated to `args[3] ∈ {2, 3}` only.
3. **Switch payload field** in `extractAffectedStations` from `order.order_details_food` → `order.orderDetails`.
4. **Tag debug logs** with `PASS-ALWAYS / PASS-STATUS / DROP-STATUS / DROP-IGNORED` prefixes.

Do not touch any other file. Do not change architecture, density toggle, socket layer, or context. Manual QA only — Jest tests deferred.

---

## 1. Empirical evidence (captured on 2026-04-26, order #731715, restaurant 478)

The owner ran a 4-step manual test on the live preview and captured the actual socket payloads. **All decisions in this doc are based on these payloads, not speculation.**

### 1.1 Captured event log

| # | Action | Event observed | `args[3]` | Item-level evidence | Hook behaviour today |
|---|---|---|---|---|---|
| **A** | Place 2-item KDS order | `new-order` | n/a | 2 items, both `food_status:1` | ✅ Refresh fires |
| **B** | Mark 1 item Ready (item 1903006) | **`update-item-status`** | **`1`** (other item still preparing → order still Preparing) | item 1903006 → `food_status:2 ready_at`; item 1903007 → `food_status:1` | ❌ `skip (status filter) update-item-status status=1` |
| **C** | Mark whole order Ready | **`update-order-paid`** | **`2`** (Ready) | item 1903006 → already Ready; item 1903007 → **still `food_status:1`** (BUG-024 cascade failure); `ready_order_details:[1]` only contains 1903006 | ❌ `ignore (not in refresh set) update-order-paid` |
| **D** | Add 3rd item to (Ready) order | **`update-order`** | **`1`** (Preparing — backend correctly flipped 2→1) | 3 items: 1903006=Ready, 1903007=Preparing, 1903008=NEW Preparing; `order_edit_count:1` | ❌ `skip (status filter) update-order status=1` |

**Net miss rate today: 100%** — hook fired 0 refreshes across 3 user-facing actions.

### 1.2 Key learnings from captured data

| ID | Finding | Implication |
|---|---|---|
| **L1** | `update-item-status` is the live item-level event today (NOT `update-food-status`) | Subscribe; drop status filter |
| **L2** | `update-order-paid` is the live "Mark Order Ready" event for postpaid orders (BUG-024's "complementary-only" hypothesis was wrong) | Subscribe; gate to `{2, 3}` |
| **L3** | `update-order` fires with `args[3]=1` when adding an item to a Ready order (the actual trigger — not the speculative 5→1 re-fire) | Drop status filter |
| **L4** | `args[3]` on `update-item-status` carries ORDER-level status (1), NOT item-level (which was 2). Filtering by `args[3]` for this event is structurally wrong. | Always-refresh |
| **L5** | All socket payloads use `orderDetails` (v2). `order_details_food` (v1) is REST-only. | Switch field name in helper |
| **L6** | BUG-024 is real: order header flips to `f_order_status:2` but item-level `food_status` does NOT cascade. Item 1903007 stuck at `food_status:1` even after Mark Order Ready. | Out of scope; backend-owned |
| **L7** | `update-food-status` and `update-order-status` were not observed firing in this test. Wired in code but appear inactive on current backend. | Subscribe defensively (free) |

---

## 2. What is already shipped (do NOT redo)

### 2.1 Files in production

| File | Status | Notes |
|---|---|---|
| `frontend/src/hooks/useStationSocketRefresh.js` | ~226 lines, lint clean | Hook itself works; only filter rules need fixing |
| `frontend/src/components/station-view/StationPanel.jsx` | Hook mounted in `StationPanelInner` | Plus owner-approved density toggle (Comfortable / Compact / Ultra) — keep |
| `frontend/src/pages/StatusConfigPage.jsx` | Earlier session — sync StationContext + refetch after save | Do not touch |

### 2.2 Hook capabilities working correctly today

- ✅ Single subscription to `getOrderChannel(restaurantId)` via `useSocket().subscribe(...)`
- ✅ Coexists with `useSocketEvents` on the same channel (multi-handler verified)
- ✅ Per-station dirty `Set` + 500ms debounce (5 events → 1 fetch)
- ✅ Reconnect-driven full refresh (`isConnected: false → true`)
- ✅ Self-guards: skip when `stationViewEnabled === false`, no enabled stations, or socket not ready
- ✅ Smart per-station targeting via `extractAffectedStations(args, enabledStations)` (degraded today due to L5; fix in §3.3)
- ✅ Cleanup on unmount (timer cleared + unsubscribed)
- ✅ Debug logging gated by `localStorage.STATION_DEBUG === 'true'`

### 2.3 Locked architecture decisions (preserve)

- ❌ NO optimistic local mutation (Option 3, owner-rejected)
- ❌ NO polling fallback (Option 1, deferred)
- ❌ NO server-pushed station deltas (Option 4 / REQ1, backend-owned, parked)
- ✅ Smart per-station targeting when payload has items
- ✅ Fallback to all enabled stations when payload is missing
- ✅ Density toggle in `StationPanel.jsx` — owner-approved, keep

---

## 3. What to implement (final, owner-approved spec)

### 3.1 Final event matrix (locked — replaces v1 §2.2 and v2 §2)

| # | Event | Current filter (BUG) | **Final filter** | Source |
|---|---|---|---|---|
| 1 | `new-order` | Always | **Always** | unchanged |
| 2 | `scan-new-order` | Always | **Always** | unchanged |
| 3 | `update-order-status` | Always | **Always** | unchanged |
| 4 | `update-order` | `args[3] ∈ {2, 3}` | **Always (drop status filter)** | L3 — fires with `args[3]=1` on add-item flow |
| 5 | `update-item-status` | `args[3] ∈ {2, 3}` | **Always (drop status filter)** | L1, L4 — `args[3]` is order-level not item-level |
| 6 | `update-food-status` | `args[3] ∈ {2, 3}` | **Always (drop status filter)** | L7 defensive — wired but not observed |
| 7 | `update-order-paid` | IGNORED | **NEW — `args[3] ∈ {2, 3}` only** | L2 — actual Mark-Ready/Cancel event today; skips Settle-Bill (status 6) |
| 8 | `split-order` | IGNORED | **IGNORED** | unchanged |
| 9 | `update-order-target` | IGNORED | **IGNORED** | unchanged |
| 10 | `update-order-source` | IGNORED | **IGNORED** | unchanged |
| 11 | `delivery-assign-order` | IGNORED | **IGNORED** | unchanged |

**Owner decision rationale (recorded for posterity):**
- Always-refresh on the 6 items in rows 1-6 because: REST `station-order-list?def_order_status=1` is the source of truth; refetch is cheap (debounced); item-level `food_status` filtering on socket payloads is unsafe given current backend semantics (L4) and BUG-024 (L6).
- `update-order-paid` gated to `{2, 3}` (NOT always, NOT `{1, 2, 3}`) because: this is the only event with a clean payment-vs-mark-ready distinction (`6` = real payment). `{2, 3}` skips genuine Settle-Bill events (cheap insurance) while catching Mark-Ready (status 2) and Cancel (status 3).

### 3.2 Code change — filter rules

**File:** `/app/frontend/src/hooks/useStationSocketRefresh.js`

**Replace the constants block (currently ~lines 38-53):**

```js
// ---------------------------------------------------------------------------
// Constants — locked per HANDOVER_v3 §3.1
// Empirically validated against captured payloads (order #731715, 2026-04-26).
// ---------------------------------------------------------------------------
const DEBOUNCE_MS = 500;
const READY = 2;
const CANCELLED = 3;

// Always refresh — drop status filter for these.
// `args[3]` is order-level f_order_status; for item events it does not reflect
// the actual item-level change. For order events it can carry status=1
// (Preparing) on legitimate flows like add-item-to-Ready-order.
const REFRESH_ALWAYS = [
  SOCKET_EVENTS.NEW_ORDER,            // 'new-order'
  SOCKET_EVENTS.SCAN_NEW_ORDER,       // 'scan-new-order'
  SOCKET_EVENTS.UPDATE_ORDER_STATUS,  // 'update-order-status'
  SOCKET_EVENTS.UPDATE_ORDER,         // 'update-order'    — was status-gated, now always
  SOCKET_EVENTS.UPDATE_ITEM_STATUS,   // 'update-item-status' — was status-gated, now always
  SOCKET_EVENTS.UPDATE_FOOD_STATUS,   // 'update-food-status' — was status-gated, now always
];

// Refresh only when args[3] is Ready (2) or Cancelled (3).
// `update-order-paid` is the ONLY event that carries a meaningful order-level
// status distinction today (status=6 means real payment → kitchen unaffected).
const REFRESH_ON_READY_OR_CANCEL = [
  SOCKET_EVENTS.UPDATE_ORDER_PAID,    // 'update-order-paid' — NEW addition
];
```

**Replace the routing logic in `handleOrderChannelEvent` (currently ~lines 163-190):**

```js
const handleOrderChannelEvent = useCallback((...args) => {
  const eventName = args?.[0];
  const fOrderStatus = args?.[3];

  const isAlways = REFRESH_ALWAYS.includes(eventName);
  const isStatusGated = REFRESH_ON_READY_OR_CANCEL.includes(eventName);

  if (!isAlways && !isStatusGated) {
    debugLog('DROP-IGNORED', eventName);
    return;
  }

  if (isStatusGated && fOrderStatus !== READY && fOrderStatus !== CANCELLED) {
    debugLog('DROP-STATUS', eventName, 'status=' + fOrderStatus);
    return;
  }

  const affected = extractAffectedStations(args, enabledStations);
  if (affected.length === 0) {
    debugLog('DROP-NOSTATIONS', eventName);
    return;
  }

  affected.forEach((s) => dirtyRef.current.add(s));
  if (isAlways) {
    debugLog('PASS-ALWAYS', eventName, '→ stations=' + JSON.stringify(affected));
  } else {
    debugLog('PASS-STATUS', eventName, 'status=' + fOrderStatus,
             '→ stations=' + JSON.stringify(affected));
  }
  scheduleFlush();
}, [enabledStations, scheduleFlush]);
```

### 3.3 Code change — payload helper (G4 / L5)

**Replace `extractAffectedStations` (currently ~lines 72-88):**

```js
// ---------------------------------------------------------------------------
// Pure helper — extracts affected station names from the socket payload.
// Reads v2 field `orderDetails` (confirmed in captured payloads, 2026-04-26).
// REST API still uses v1 `order_details_food` — that is consumed by
// `stationService.fetchStationData`, NOT here.
// Falls back to all enabledStations when payload is missing or carries no
// station fields (e.g. update-food-status, update-order-status, scan-new-order
// have no payload at args[4]).
// ---------------------------------------------------------------------------
export const extractAffectedStations = (args, enabledStations) => {
  const affected = new Set();
  const payload = args?.[4];
  const orders = payload?.orders || [];

  orders.forEach((order) => {
    const items = order?.orderDetails || [];
    items.forEach((food) => {
      if (food?.station && enabledStations.includes(food.station)) {
        affected.add(food.station);
      }
    });
  });

  return affected.size > 0 ? [...affected] : [...enabledStations];
};
```

### 3.4 Code change — keep existing helpers/logic intact

Do NOT modify any of the following — they are correct as-is:
- `flush` callback (parallel `fetchStationData` + `updateStationData`)
- `scheduleFlush` debounce
- `useEffect` channel subscription block (lines ~197-238)
- Reconnect handler block (lines ~245-255)
- Cleanup unmount effect (lines ~258-265)
- `categoriesMap` memo
- `debugLog` helper
- All imports

### 3.5 Tagged debug logs (optional but approved)

The new tag taxonomy (already shown inline above):
- `PASS-ALWAYS <event> → stations=[…]`
- `PASS-STATUS <event> status=<n> → stations=[…]`
- `DROP-STATUS <event> status=<n>`
- `DROP-IGNORED <event>`
- `DROP-NOSTATIONS <event>`

Existing logs that stay unchanged:
- `flush →` / `flush done` / `flush error`
- `subscribing to channel <name>`
- `unsubscribing from channel <name>`
- `subscription skipped — disabled or no stations`
- `subscription deferred — socket/restaurant not ready`
- `reconnect detected — full refresh`

---

## 4. Files NOT to modify

| File | Reason |
|---|---|
| `frontend/src/components/station-view/StationPanel.jsx` | Hook already mounted; density toggle is owner-approved |
| `frontend/src/api/socket/socketEvents.js` | All required constants exist (`UPDATE_ORDER_PAID`, etc.) |
| `frontend/src/api/socket/socketHandlers.js` | Pure consumer — do not touch handler registry |
| `frontend/src/api/socket/socketService.js` | Singleton transport — no change |
| `frontend/src/api/socket/useSocketEvents.js` | Dashboard subscriptions — orthogonal |
| `frontend/src/contexts/SocketContext.jsx` | Channel subscription manager — no change |
| `frontend/src/contexts/StationContext.jsx` | State owner — `updateStationData` already exposed |
| `frontend/src/api/services/stationService.js` | REST helper; uses v1 `order_details_food` correctly |
| `frontend/src/pages/LoadingPage.jsx` | Initial-load path unchanged |
| `frontend/src/pages/StatusConfigPage.jsx` | Visibility-settings path unchanged |
| Order/Dashboard/Card components | Unaffected by station refresh |

---

## 5. Out of scope (assumed backend will fix)

### 5.1 BUG-024 — `food_status` cascade missing on Mark Order Ready
- Captured smoking gun: order #731715, item 1903007 stuck at `food_status:1` even though `f_order_status:2`.
- After our hook fix, the panel will refresh correctly, but `station-order-list?def_order_status=1` (REST) will still return the ghost item until backend cascades `food_status` and moves item out of `orderDetails` into `ready_order_details`.
- **Operational impact during interim:** kitchen may see stale items after Mark Ready. Document in QA report; do NOT attempt frontend workaround.
- **Auto-resolves once backend ships:** our hook already refetches on the right events; correct data → correct UI.

### 5.2 BUG-024-B — backend uses `update-order-paid` event name for Mark-Ready
- Confirmed via captured payload of order #731715: postpaid order with `payment_status:"unpaid"` emitted `update-order-paid` for Mark Ready.
- Our `{2, 3}` gate on this event accommodates current naming.
- If backend later switches to canonical `update-order-status`, our existing always-refresh on that event handles it transparently — no code change needed.

### 5.3 Other items deferred
- ❌ Jest unit tests for the hook (effort > value while payload semantics still moving)
- ❌ Tab-visibility throttling
- ❌ Polling fallback
- ❌ Optimistic local mutation
- ❌ Server-pushed station deltas (Option 4 / REQ1)

---

## 6. Manual QA plan (run after implementation, before sign-off)

### 6.1 Replay the captured 4-step session on a live test order

| # | Action | Expected event | Expected hook log | Expected panel result | BUG-024 caveat |
|---|---|---|---|---|---|
| 1 | Place 2-item KDS order | `new-order` | `PASS-ALWAYS new-order → stations=["KDS"]` | KDS panel shows 2 items | n/a |
| 2 | Mark 1 item Ready | `update-item-status` | `PASS-ALWAYS update-item-status → stations=["KDS"]` | KDS panel shows 1 item | n/a (item-level cascade works) |
| 3 | Mark whole order Ready | `update-order-paid args[3]=2` | `PASS-STATUS update-order-paid status=2 → stations=["KDS"]` | KDS panel shows 0 items | **If BUG-024 not yet shipped: panel may still show 1 ghost item. Document & move on.** |
| 4 | Add 3rd item to Ready order | `update-order args[3]=1` | `PASS-ALWAYS update-order → stations=["KDS"]` | KDS panel shows N+1 items | n/a |

### 6.2 Negative tests

| # | Action | Expected event | Expected hook log | Expected panel result |
|---|---|---|---|---|
| 5 | Settle Bill on a postpaid Ready order (real payment) | `update-order-paid args[3]=6` | `DROP-STATUS update-order-paid status=6` | No refetch fires |
| 6 | Switch table on an order | `update-order-target` | `DROP-IGNORED update-order-target` | No refetch fires |
| 7 | Place 5 KDS orders within 200 ms (burst) | 5 × `new-order` | 5 × `PASS-ALWAYS …`, but only **1** `flush →` line | Single network request to `station-order-list` |
| 8 | Toggle Station View OFF in Status Config | n/a | `subscription skipped — disabled or no stations` | No subscriptions, no fetches |
| 9 | Disconnect Wi-Fi 30 s, reconnect | `connect` | `reconnect detected — full refresh` | All enabled stations refetched |

### 6.3 Hygiene checks

- [ ] `mcp_lint_javascript` clean on the modified file
- [ ] No console errors during steady-state operation (run the app for 2 min with `STATION_DEBUG=true`)
- [ ] Density toggle still works (Comfortable / Compact / Ultra cycle, persistence in `localStorage.mygenie_station_density`)
- [ ] `useSocketEvents` (dashboard) still receives all events normally (no regression)
- [ ] Page reload — initial `loadStationData` from `LoadingPage` still populates panel

### 6.4 Document in test report

Append to `BUG_TEMPLATE.md` BUG-024 entry: "Frontend hook v3 verified — refreshes correctly on captured events; ghost item visibility is end-to-end backend issue."

---

## 7. Acceptance criteria

- [ ] §3.1 event matrix implemented exactly.
- [ ] `update-order` filter widened (no longer `{2, 3}`).
- [ ] `update-item-status` filter dropped.
- [ ] `update-food-status` filter dropped.
- [ ] `update-order-paid` added with `args[3] ∈ {2, 3}` filter.
- [ ] `extractAffectedStations` reads `orderDetails` (v2). `order_details_food` reference removed from this function.
- [ ] Tagged debug logs implemented (`PASS-ALWAYS / PASS-STATUS / DROP-STATUS / DROP-IGNORED / DROP-NOSTATIONS`).
- [ ] All 9 manual QA scenarios run and documented.
- [ ] Lint clean.
- [ ] No regressions in `useSocketEvents` (dashboard).
- [ ] Density toggle still works.
- [ ] No other files modified.

---

## 8. Rollback plan

Single file changed. Revert with `git checkout` on `useStationSocketRefresh.js`. No state migration, no localStorage keys added/removed, no API surface change, no socket-layer change.

---

## 9. Risks & edge cases

| # | Risk | Mitigation |
|---|---|---|
| 1 | Backend ships a new event we don't handle | Existing `[useSocketEvents] Unknown order event:` log surfaces it; reconcile when seen |
| 2 | New event reuses `args[3]` differently | Empirically capture and adjust filter constants in a follow-up |
| 3 | High-volume kitchen >100 events/min | 500 ms debounce already collapses bursts; profile only if Network tab shows pain |
| 4 | `update-order-paid` carries `2`/`3` for actual paid orders (unlikely) | We'd refetch needlessly — cheap, debounced, no correctness issue |
| 5 | BUG-024 not fixed in backend → kitchen sees ghost items even after our hook fires correctly | Document in QA report; out of scope; auto-resolves when backend ships |
| 6 | `update-food-status` becomes active again on backend with different `args[3]` semantics | We always-refresh on it; safe regardless of `args[3]` value |

---

## 10. Estimated effort

| Phase | Time |
|---|---|
| Code changes (constants block + routing logic + helper + logs) | 30 min |
| Lint + smoke compile | 5 min |
| Manual QA (9 scenarios) | 30 min |
| Document QA outcome in this file (Verified section) | 10 min |
| **Total** | **~75 min** |

---

## 11. Related references

- v1 handover: `/app/memory/STATION_PANEL_REALTIME_HANDOVER.md` — original spec, payload table, debug logger contract
- v2 handover: `/app/memory/STATION_PANEL_REALTIME_HANDOVER_v2.md` — gap discovery (now superseded; preserved for context)
- Deep dive: `/app/memory/STATION_PANEL_SOCKET_REFRESH_DEEPDIVE.md` — architectural notes
- Backend defect: `/app/memory/BUG_TEMPLATE.md` → BUG-024 (and BUG-024-B side bug)
- Captured live payloads (smoking guns): order #731715 events A/B/C/D, restaurant 478, 2026-04-26 — full DevTools snapshots in owner's session log; key fields cited inline in §1.1
- Architecture: kitchen-panel data source is `def_order_status=1` station-order-list endpoint; filters at item-level (`food_status === 1`) — explains why BUG-024 produces ghost items

---

## 12. Sign-off

- **Owner approvals captured:** §3.1 event matrix, §3.2 routing logic, §3.3 payload field switch, §3.5 tagged logs, §5 BUG-024 out-of-scope.
- **Pre-approval gate clearance:** v2 §3 questions (1-4) all answered via empirical capture, not assumption.
- **Implementation agent:** proceed directly to code changes per §3.2-§3.5; follow §6 QA plan; record outcome in §13.

---

## 13. Verified (filled by implementation agent after QA)

```
Date:                          2026-04-26
Implementation agent:          E1 (deployment-agent → implementation-agent flow)
Files changed:
  - frontend/src/hooks/useStationSocketRefresh.js  (v3 — 4 edits per §3.2-§3.5)
  - frontend/src/components/cards/OrderCard.jsx    (v3.1 — see §14)
  - frontend/src/api/services/stationService.js    (v3.1 — see §14)
QA scenarios passed:           Quick smoke only (owner request)
                               NOT all 9 scenarios run; full QA parked.
                               Owner accepted as-is.
BUG-024 status at QA time:     OPEN — backend cascade still pending
                               (defended by v3.1 B2 filter — see §14)
Lint:                          clean (1 pre-existing warning in
                               LoadingPage.jsx unrelated to our changes)
Compile:                       clean (webpack compiled successfully via
                               hot-reload throughout the session)
Notes:
  - Empirical validation done DURING discovery, not after implementation:
    captured 4 distinct socket events on order #731715 (new-order,
    update-item-status, update-order-paid, update-order). Each event
    pre-fix logged "skip" / "ignore" with 100% miss rate; post-fix
    confirmed by matching tagged log lines (PASS-ALWAYS / PASS-STATUS).
  - Two scope expansions shipped beyond strict v3 — see §14.
  - Three new bugs filed during this session: BUG-025 (cancelled-item
    not in order card), BUG-026 (variant aggregation in station panel),
    BUG-027 (room check-in advance payment-method missing). All in
    /app/memory/BUG_TEMPLATE.md. None block this handover.
  - Backend-side BUG-024 and B1 (def_order_status filter) remain open
    on backend team. Frontend hook + B2 filter are correct independently.
```

---

## 14. Scope Amendment Log (v3.1 — Apr-26-2026)

Two changes shipped **outside the strict v3 scope** of "useStationSocketRefresh.js only", explicitly approved by owner during the same session. Both are surgical, low-risk, and address gaps surfaced by empirical capture that the v3 spec did not anticipate.

### 14.1 OrderCard per-item status chip — gate widened (v3.1.A)

**File:** `frontend/src/components/cards/OrderCard.jsx`

**Problem (empirically captured)**
- Per-item status chip (orange "Preparing ○" / green "Ready ⊙") missing on order cards in dashboard Preparing/Ready columns.
- Root cause: chip gate `showItemAction = isDineIn && actionConfig` (L434) where `isDineIn = orderType === "dineIn"` (strict equality, L62).
- When `orderType` arrived as raw `'WalkIn'` / `'walkIn'` / `'pos'` (un-normalized in some paths), the gate failed silently → no chip rendered.
- Asymmetry confirmed: same file at L218 already had a `walkIn` fallback for the order-type icon — proving the codebase had previously seen this issue, only patched icon, not the chip gate.

**Owner-approved spec**
- Show per-item chip for any order type EXCEPT takeaway and delivery (i.e., dine-in, walk-in, POS, room, and any unknown future value get the chip).

**Fix applied (Option B — surgical, minimal blast radius)**
- Added new flag at L66-69: `const isItemActionable = !isTakeAway && !isDelivery;`
- Changed L434 gate from `isDineIn && actionConfig` → `isItemActionable && actionConfig`.
- **`isDineIn` definition itself NOT touched** — preserved for label (L166), merge button (L320), shift-table (L335), food-transfer (L441), padding (L397/L437). Strict `dineIn` semantics intact for those.

**Effect**
| Order type | Before | After |
|---|---|---|
| Dine-In | chip shown | chip shown |
| Walk-In (raw or normalized) | chip missing | chip shown |
| POS | chip missing | chip shown |
| Room | chip missing | chip shown |
| Takeaway | chip hidden | chip hidden |
| Delivery | chip hidden | chip hidden |

### 14.2 stationService — defensive item-level filter (v3.1.B)

**File:** `frontend/src/api/services/stationService.js`

**Problem (empirically captured — order #731715)**
- After Mark Order Ready, kitchen panel showed 4 ghost items (should be 0).
- Root cause chain (TWO bugs together):
  - **B1 (backend):** `POST /api/v1/vendoremployee/station-order-list?def_order_status=1` returned a fully-Ready order. Captured payload showed `f_order_status: 2`, `station_order_status: { KDS: 2 }`, `status_counts: { Cooking: 0, Ready: 1 }` — backend's own counts confirm the order shouldn't have been in the response.
  - **B2 (frontend):** `stationService.fetchStationData` aggregation (L142+) had only `item.station === stationName` filter; no `item.food_status === 1` filter. Every returned item got counted regardless of state.
- Either fix alone breaks the ghost. Frontend B2 ships now; backend B1 remains open for backend team.

**Owner-approved spec**
- Apply frontend defensive filter only. Skip B1 backend coordination for now; revalidate after B2 ships.

**Fix applied**
- Added one conditional at the top of `foodItems.forEach` callback (L143-150):
  ```js
  if (item.food_status !== undefined && item.food_status !== 1) return;
  ```
- Items with `food_status: 2` (Ready), `3` (Cancelled), `5` (Served), etc. are silently skipped from kitchen aggregation.
- Items WITHOUT a `food_status` field at all (theoretical legacy edge-case) still pass — preserves backward compatibility.

**Effect**
| `food_status` value | Before | After |
|---|---|---|
| 1 (Preparing) | counted | counted |
| 2 (Ready) | counted (ghost) | skipped |
| 3 (Cancelled) | counted (ghost) | skipped |
| 5 (Served) | counted (ghost) | skipped |
| undefined (legacy) | counted | counted (legacy safety) |

**Defence-in-depth note**: the filter is correct even if backend ships B1 perfectly — the defensive layer adds zero functional cost and protects the kitchen panel from any future backend regression.

### 14.3 What v3.1 explicitly does NOT change

- ❌ `isDineIn` definition itself (preserved strict, only the chip gate uses the new flag)
- ❌ Transform layer (`orderTransform.js`)
- ❌ Socket layer (`socketEvents.js`, `socketHandlers.js`, `socketService.js`, `SocketContext.jsx`, `useSocketEvents.js`)
- ❌ StationContext, LoadingPage, StatusConfigPage
- ❌ Density toggle (owner-approved earlier, untouched)
- ❌ Any other order-card field (price, customer name, address, KOT print, transfer, merge, etc.)
- ❌ BUG-024 backend cascade (stays out of scope)
- ❌ BUG-025 (cancelled item not in card), BUG-026 (variant aggregation), BUG-027 (room advance payment-method) — all filed as separate tickets

### 14.4 Rollback

- v3.1.A: `git checkout` `OrderCard.jsx` (2 lines change)
- v3.1.B: `git checkout` `stationService.js` (1 conditional + comment)
- v3 hook: `git checkout` `useStationSocketRefresh.js` (~30 LOC change)
- Each independently revertable. No state migration, no localStorage keys touched, no API contract change.

### 14.5 Final file change summary

| File | Lines changed | Scope |
|---|---|---|
| `frontend/src/hooks/useStationSocketRefresh.js` | ~30 (4 edits per v3 §3.2-§3.5) | v3 |
| `frontend/src/components/cards/OrderCard.jsx` | ~6 (1 new const + 1 gate update) | v3.1.A |
| `frontend/src/api/services/stationService.js` | ~9 (1 conditional + 8-line comment) | v3.1.B |
| **Total** | **3 files, ~45 LOC** | v3 + v3.1 |

---

**End of v3 handover. This document is self-contained — implementation agent does not need to consult v1 or v2 unless investigating context. All decisions are empirically validated and owner-locked.**
