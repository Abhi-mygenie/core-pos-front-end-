# Station Panel — Socket Refresh Deep-Dive Analysis

- **Type:** Read-only deep-dive + plan + gap analysis. NO code changes.
- **Scope:** Trace the existing initial-POS-load flow that powers the left-side BAR / KDS preparing-count panel, identify the exact files, functions and data shapes, then propose how to reuse the same pipeline on socket events.
- **Source of truth:** Current `roomv2` branch under `/app/frontend/src`.
- **Status:** ⏸️ **PARKED** by owner pending endpoint verification.

## ⏸️ Parked Notes (latest session)

**Why parked:** Endpoint mismatch between owner-provided curl and current code.
- Owner says the panel is fed by `GET /api/v1/vendoremployee/employee-menu` (Bearer-auth only, no params).
- Current `roomv2` code uses `POST /api/v1/vendoremployee/station-order-list` (form-data: `role_name`, `def_order_status=1`).
- `grep` confirmed: string `employee-menu` does NOT appear anywhere under `/app/frontend/src`.
- Live curl with the supplied token returned `{"errors":[{"code":"auth-001","message":"Unauthorized."}]}` → could not capture response shape.
- Owner will recheck and come back with: (a) fresh token, (b) sample response body, OR (c) a final decision to stick with `station-order-list`.

**Decisions already locked (when work resumes, do NOT re-ask these):**

| Setting | Locked value |
|---|---|
| GAP-C — unify `categoriesMap` derivation | (a) YES, single shared helper |
| GAP-D — extend `fetchMultipleStationsData` to take `categoriesMap` and reuse | (a) YES |
| GAP-G — refresh granularity | resolved by Q-3 = (a) refresh all `enabledStations` |
| Q-3 — refresh all enabled stations | (a) |
| Q-5 — concurrent in-flight handling | (a) debounce covers it |
| Q-6 — skip refresh while `stationViewEnabled === false` | (a) |
| Q-7 — silent auto-refresh (no spinner) | (a) |
| Q-8 — no cross-tab dedup | (a) |
| Q-9 — fix GAP-B (Settings save → live update) in same patch | (a) |
| Q-12 — V3 doc update | NOT inline; queued in `/app/memory/V3_DOC_UPDATES_PENDING.md` |
| Event matrix | STRICT rule per owner: refresh ONLY when status flips to **Ready (fOS=2)** or **Cancelled (fOS=3)**. Applies to: `NEW_ORDER`, `UPDATE_ORDER`, `UPDATE_ITEM_STATUS`, `UPDATE_FOOD_STATUS`. All other events → no refresh. Acknowledged consequence: new orders / item-additions / Served / Paid will NOT auto-refresh; manual ↻ button is the fallback. |

**Decisions still open when work resumes:**

| Open item | What's needed |
|---|---|
| Endpoint identity | Owner to confirm `employee-menu` vs `station-order-list` (with sample response if `employee-menu`) |
| Q-4 — debounce window | Owner to pick: (a) 400 ms only / (b) 400 ms + 2 s maxWait / (c) no debounce |
| Q-11 — failure handling | Owner to pick: (a) silent / (b) toast / (c) inline badge |

**Restart instructions for next session:**
1. Re-read this whole doc.
2. Resolve the endpoint identity first — without it, no implementation can be written safely.
3. Confirm Q-4 and Q-11.
4. Skip everything already in the locked-decisions table above.
5. Roll into `/app/memory/FOUR_REQUIREMENTS_IMPLEMENTATION_HANDOVER.md` once Reqs 2, 3, 4 are also locked.

---

---

## 0. Executive Summary

| Question from owner | Answer |
|---|---|
| Where is the panel today? | `frontend/src/components/station-view/StationPanel.jsx`; mounted in `frontend/src/pages/DashboardPage.jsx:1234` as `<StationPanel className="flex-shrink-0" />` (left rail). |
| What endpoint feeds it? | **`POST /api/v1/vendoremployee/station-order-list`** (form-data: `role_name=<station>`, `def_order_status=1`). One call per enabled station. NOT `employee-menu`. |
| How are the visible stations decided? | A 3-step pipeline: (1) products catalog → unique stations; (2) localStorage admin config (`mygenie_station_view_config.stations`); (3) intersection becomes the runtime `enabledStations`. |
| Is the panel refreshed today on socket events? | **No.** The only refresh is (a) initial load via `LoadingPage`, (b) the per-station manual Refresh icon in the panel header. Sockets update `OrderContext`/`TableContext` only. |
| What change is needed? | When relevant socket events fire, call **the same** `fetchStationData(...)` flow on the same `enabledStations`, push results via `setAllStationData(...)`. Recommended: debounce 400 ms, parallel fetch, gate on `stationViewEnabled`. |

---

## 1. Visual Map (from screenshots)

The screenshots show two stations rendered in order (top → bottom):

| Station header | Total preparing count | Inner sections |
|---|---|---|
| BAR (🍺) | 1 | "Cake" category → "Chocolate Delight Cake" qty 1 |
| KDS (🍳) | 4 | "Zorko Combo" category → 4 items each qty 1 |

Each station header has:
- Icon, Station Name, total preparing-count badge.
- Manual ↻ refresh button (visible to the right of the badge).

This visual maps **exactly** to `SingleStationPanel` in `StationPanel.jsx:134-219` and `CategorySection` in `StationPanel.jsx:70-129`.

---

## 2. End-to-End Data Pipeline (Initial POS Load)

### 2.1 Stage 1 — Discover all stations from products catalog

**File:** `frontend/src/pages/LoadingPage.jsx:104-161` (`loadStationData`).

```js
const products = data.products || [];                                    // line 107
const uniqueStations = stationService.extractUniqueStations(products);   // line 110
```

**Helper:** `frontend/src/api/services/stationService.js:24-37` (`extractUniqueStations`).

```js
export const extractUniqueStations = (products) => {
  if (!Array.isArray(products)) return [];
  const stationSet = new Set();
  products.forEach(product => {
    if (product.station) stationSet.add(product.station);
  });
  return Array.from(stationSet).sort();
};
```

This walks every product in the menu and collects the distinct `product.station` strings (e.g., `["BAR", "KDS", "GRILL"]`).

### 2.2 Stage 2 — Apply admin Visibility Settings

```js
setAvailableStations(uniqueStations);             // LoadingPage.jsx:115
initializeConfig(uniqueStations);                 // LoadingPage.jsx:118 → StationContext

const savedConfig = stationService.getStationViewConfig();    // line 121
const stationsToLoad = savedConfig.stations?.length > 0
  ? savedConfig.stations.filter(s => uniqueStations.includes(s))
  : uniqueStations;
```

**Source of admin settings — localStorage key `mygenie_station_view_config`** (`stationService.js:8`):
```json
{
  "enabled": true,
  "stations": ["BAR", "KDS"],
  "displayMode": "stacked"
}
```

**Where the user maintains it:** `frontend/src/pages/StatusConfigPage.jsx`, "Station View" card (lines 503-647). Toggles:
- `station-view-toggle` button (line 519) → `toggleStationViewEnabled` (line 240).
- Per-station card (`station-card-{id}`, line 609) → `toggleStation(stationId)` (line 249).
- Display mode (`display-mode-stacked|accordion`, line 565) → `setDisplayMode` (line 295).

**Persistence:** `saveConfiguration` (line 333):
```js
localStorage.setItem(STATION_VIEW_STORAGE_KEY, JSON.stringify(stationViewConfig));
```

**Hydration into runtime context:** `frontend/src/contexts/StationContext.jsx:36-62` (`initializeConfig`):
```js
const initializeConfig = useCallback((stations) => {
  const stored = localStorage.getItem(STATION_VIEW_STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    setStationViewEnabled(parsed.enabled !== false);
    setDisplayMode(parsed.displayMode || 'stacked');
    if (parsed.stations && parsed.stations.length > 0) {
      const validStations = parsed.stations.filter(s => stations.includes(s));
      setEnabledStations(validStations.length > 0 ? validStations : stations);
    } else {
      setEnabledStations(stations);
    }
  } else {
    setEnabledStations(stations);
    setStationViewEnabled(false);     // First-time default = OFF
    setDisplayMode('stacked');
  }
}, []);
```

Net result at runtime: `StationContext.enabledStations` = list of station names the panel will render and refresh.

### 2.3 Stage 3 — Build categoriesMap (id → name lookup)

**File:** `frontend/src/pages/LoadingPage.jsx:128-138`.

```js
const categories = data.categories || [];
const categoriesMap = {};
categories.forEach(cat => {
  if (cat.categoryId) {
    categoriesMap[cat.categoryId] = cat.categoryName;
    categoriesMap[String(cat.categoryId)] = cat.categoryName;
  }
});
```

This is needed because the per-item response inside `station-order-list` carries only `category_id`. Mapping to the human-readable `category_name` happens client-side.

### 2.4 Stage 4 — Fire `station-order-list` per enabled station (in parallel)

**File:** `LoadingPage.jsx:140-155`.

```js
if (savedConfig.enabled !== false && stationsToLoad.length > 0) {
  const stationDataPromises = stationsToLoad.map(station =>
    stationService.fetchStationData(station, categoriesMap)
  );
  const stationResults = await Promise.all(stationDataPromises);

  const stationDataObj = {};
  stationsToLoad.forEach((station, idx) => {
    stationDataObj[station] = stationResults[idx];
  });
  setAllStationData(stationDataObj);
}
```

**Service:** `frontend/src/api/services/stationService.js:122-203` (`fetchStationData`).

Outgoing request:
- **Method:** `POST`
- **URL:** `/api/v1/vendoremployee/station-order-list`
- **Content-Type:** `multipart/form-data` (built via `FormData`)
- **Body:**
  ```
  role_name=<STATION_NAME>           // e.g. "BAR" or "KDS"
  def_order_status=1                 // 1 = Preparing
  ```
- **Response:** expects `{ orders: [...] }` where each order has `order_details_food[]` and each food has `food_details.{name, category_id}` + `quantity` + `station`.

Aggregation logic (`stationService.js:138-181`):
- Walk `orders[].order_details_food[]`.
- Skip items whose `item.station` ≠ the requested `stationName` (defensive — backend should already filter by `role_name`).
- Bucket by `category_name` (from `categoriesMap.get(category_id)`); within bucket, count by `food_name`.
- Output a `stationData` object:
  ```js
  {
    stationName: "KDS",
    categories: [
      { name: "Zorko Combo", items: [{name, count}, ...], totalCount: 4 },
      { name: "Cake",        items: [{name, count}, ...], totalCount: 1 },
    ],
    totalItems: 5,
    orderCount: <N>,
    fetchedAt: "2026-04-25T12:00:00.000Z",
  }
  ```

### 2.5 Stage 5 — Render

**File:** `StationPanel.jsx:225-311`.
- Reads `{ enabledStations, stationData, stationViewEnabled, displayMode, isLoading }` from `useStations()`.
- Returns `null` if `!stationViewEnabled || !enabledStations.length` (line 282).
- Otherwise iterates `enabledStations` → renders one `<SingleStationPanel>` per station, passing the matching `stationData[stationName]`.

**Mount point in dashboard:** `DashboardPage.jsx:1234`:
```jsx
<StationPanel className="flex-shrink-0" />
```

### 2.6 Stage 6 — Existing manual refresh (the ↻ button)

**File:** `StationPanel.jsx:261-279` (`handleRefresh`). Re-uses the SAME pipeline:
```js
const handleRefresh = useCallback(async () => {
  if (!enabledStations?.length) return;
  const stationDataPromises = enabledStations.map(station =>
    fetchStationData(station, categoriesMap)
  );
  const results = await Promise.all(stationDataPromises);
  const newData = {};
  enabledStations.forEach((s, idx) => { newData[s] = results[idx]; });
  setAllStationData(newData);
}, [enabledStations, setAllStationData, categoriesMap]);
```

**Critical observation:** the manual refresh button is **identical** to the initial load pipeline (minus product-discovery). Whatever we wire on socket events should reuse exactly this code shape.

---

## 3. Key Files & Functions (Quick Reference)

| File | Function / Symbol | Purpose |
|---|---|---|
| `frontend/src/pages/LoadingPage.jsx` | `loadStationData()` lines 104-161 | Discover stations → respect admin config → fetch → push to context |
| `frontend/src/api/services/stationService.js` | `extractUniqueStations(products)` line 24 | Build station list from menu catalog |
| | `getStationViewConfig()` line 101 | Read `mygenie_station_view_config` from localStorage |
| | `fetchStationData(stationName, categoriesMap)` line 122 | The `POST /station-order-list` call + aggregation |
| | `fetchMultipleStationsData(stations)` line 211 | Parallel fetch wrapper (NOT used by initial load — Loading page does its own `Promise.all`) |
| `frontend/src/contexts/StationContext.jsx` | `initializeConfig(stations)` line 36 | Hydrate `enabledStations` + `stationViewEnabled` + `displayMode` from localStorage |
| | `setAllStationData(data)` line 94 | Replace the entire `stationData` map (the panel reads this) |
| | `updateStationData(name, data)` line 84 | Replace one station's data |
| | `enabledStations` (state) | Runtime list of stations to render/refresh |
| | `stationViewEnabled` (state) | Master on/off — panel renders only when `true` |
| `frontend/src/components/station-view/StationPanel.jsx` | `StationPanel` line 225 | Container; reads context; per-station children |
| | `SingleStationPanel` line 134 | One station card with manual `onRefresh` |
| | `handleRefresh` line 261 | Manual ↻ button — **template for socket refresh** |
| `frontend/src/pages/DashboardPage.jsx` | line 1234 | Mounts `<StationPanel />` |
| `frontend/src/pages/StatusConfigPage.jsx` | "Station View" card lines 503-647 | Admin UI: enable/disable, pick stations, display mode |
| | `saveConfiguration()` line 331 | Writes `STATION_VIEW_STORAGE_KEY` to localStorage |
| `frontend/src/api/socket/useSocketEvents.js` | `handleOrderChannelEvent` line 60 | Routes socket frames to handlers (currently NO station refresh) |
| | `handleTableChannelEvent` line 105 | Routes table-channel frames |
| `frontend/src/api/socket/socketHandlers.js` | `handleNewOrder`, `handleOrderDataEvent`, `handleUpdateOrderStatus`, `handleUpdateFoodStatus`, `handleSplitOrder`, `handleUpdateTable`, `handleOrderEngage` | Currently update `OrderContext` / `TableContext` ONLY; NO station refresh |
| `frontend/src/api/socket/socketEvents.js` | `SOCKET_EVENTS` constants | `NEW_ORDER`, `UPDATE_ORDER`, `UPDATE_ORDER_TARGET`, `UPDATE_ORDER_SOURCE`, `UPDATE_ORDER_PAID`, `UPDATE_ITEM_STATUS`, `UPDATE_FOOD_STATUS`, `UPDATE_ORDER_STATUS`, `SCAN_NEW_ORDER`, `DELIVERY_ASSIGN_ORDER`, `SPLIT_ORDER`, `UPDATE_TABLE`, `ORDER_ENGAGE` |

---

## 4. API Contract (Confirmed From Code)

### 4.1 Endpoint
- `POST /api/v1/vendoremployee/station-order-list`
- Auth: standard Bearer (via `frontend/src/api/axios.js`).

### 4.2 Request body (`multipart/form-data`)
| Field | Value | Notes |
|---|---|---|
| `role_name` | station name string | e.g., `"KDS"`, `"BAR"`, `"GRILL"` |
| `def_order_status` | `"1"` | hardcoded to `1` (Preparing) |

### 4.3 Response (expected by `fetchStationData`)
```js
{
  orders: [
    {
      // ...other order fields...
      order_details_food: [
        {
          quantity: 1,
          station: "KDS",
          food_details: {
            name: "Chocolate Delight Cake",
            category_id: 12,
            // ...
          },
        },
        ...
      ],
    },
    ...
  ]
}
```

### 4.4 Client-side aggregation output
```js
{
  stationName: "KDS",
  categories: [
    { name: "Zorko Combo", items: [{name: "...", count: 1}, ...], totalCount: 4 },
    { name: "Cake",        items: [{name: "Chocolate Delight Cake", count: 1}], totalCount: 1 },
  ],
  totalItems: 5,
  orderCount: 3,
  fetchedAt: "2026-04-25T12:00:00.000Z",
}
```

---

## 5. Socket Event Inventory (Already Wired — Empty Of Station Logic)

`frontend/src/api/socket/useSocketEvents.js:60-103` routes the following events from the order channel `new_order_<restaurantId>`:

| Event constant | Channel | Handler | Triggered by | Affects KDS/BAR preparing count? |
|---|---|---|---|---|
| `NEW_ORDER` | order | `handleNewOrder` | New order placed | YES — adds preparing items |
| `UPDATE_ORDER` | order | `handleOrderDataEvent('update-order')` | Items added / order edited | YES — preparing items added/removed |
| `UPDATE_ORDER_TARGET` | order | `handleOrderDataEvent('update-order-target')` | Merge/transfer destination | YES |
| `UPDATE_ORDER_SOURCE` | order | `handleOrderDataEvent('update-order-source')` | Merge/transfer source | YES |
| `UPDATE_ORDER_PAID` | order | `handleOrderDataEvent('update-order-paid')` | Order paid (terminal — removed from preparing) | YES (removes) |
| `UPDATE_ITEM_STATUS` | order | `handleOrderDataEvent('update-item-status')` | Per-item status flip (preparing → ready / served) | YES |
| `UPDATE_FOOD_STATUS` | order | `handleUpdateFoodStatus` | Legacy item status | YES |
| `UPDATE_ORDER_STATUS` | order | `handleUpdateOrderStatus` | Order-level status flip | YES |
| `SCAN_NEW_ORDER` | order | `handleScanNewOrder` | Aggregator scan-new (Swiggy/Zomato) | YES |
| `DELIVERY_ASSIGN_ORDER` | order | `handleDeliveryAssignOrder` | Rider assigned | NO — does not change preparing count |
| `SPLIT_ORDER` | order | `handleSplitOrder` | One order split into two | YES — items redistributed |
| `UPDATE_TABLE` | table channel `update_table_<rid>` | `handleUpdateTable` | Table engage/release | NO (status-only) |
| `ORDER_ENGAGE` | order-engage channel | `handleOrderEngage` | UI lock | NO |

**None of these handlers currently call `fetchStationData` / `setAllStationData`.**

---

## 6. Gaps Found in Current Implementation

### GAP-A — No socket-driven refresh
- The only ways the panel updates today are: (1) login → initial load, (2) manual ↻ button click.
- Cashier on a different terminal taking an order, marking ready, marking served → operator's panel stays stale until they hit ↻ or reload.

### GAP-B — Settings-save to runtime sync is broken (pre-existing, separate concern)
- When the admin opens `StatusConfigPage` and changes the selected stations, `saveConfiguration()` writes only to localStorage (line 331) — it does NOT call `initializeConfig()` again on `StationContext`.
- Result: enabling/disabling a station from Settings does NOT take effect on the running dashboard until the user refreshes the browser.
- This is a latent bug separate from the socket-refresh requirement, but worth noting because the socket refresh feature will exhibit a related symptom: socket refresh always pulls based on the runtime `enabledStations` state, which may diverge from the just-saved localStorage until reload.
- Flagged here so we can either fix it together or scope it out.

### GAP-C — `categoriesMap` is computed locally inside `LoadingPage.loadStationData` and inside `StationPanel.handleRefresh`, but is NOT shared.
- Initial load: `LoadingPage` computes from `data.categories` (loaded into `loadedDataRef`).
- Manual refresh: `StationPanel` reads `categories` from `useMenu()` and re-derives the map (`StationPanel.jsx:247-258`).
- Shapes differ (LoadingPage uses `categoryName` field; StationPanel uses `cat.name` — see `StationPanel.jsx:252`). This may already cause inconsistent category labels between initial load and manual refresh in some tenants.
- Socket refresh should pick the SAME source as manual refresh (`useMenu().categories`) — **flag for verification**.

### GAP-D — `fetchMultipleStationsData` exists but is unused
- `stationService.js:211-227` exports a parallel-fetch wrapper, but neither LoadingPage nor StationPanel uses it (both run their own `Promise.all`). Dead helper. Could be reused for socket refresh.

### GAP-E — No debounce / coalescing
- During a busy minute, many socket events can land. Naive "refresh on every event" → up to ~10 calls/min/station. Could compound RISK-006 (sequential loading) under load.

### GAP-F — Stale `categoriesMap` on socket refresh
- If a new product is added in another session (rare), the locally cached `categoriesMap` won't include the new `category_id`. Aggregator will fall back to `"Other"`. Not a blocker, but worth deciding.

### GAP-G — Per-station vs all-stations refresh strategy
- The socket payload often contains `order_details_food[].station` — we COULD derive only the affected stations and refresh just those. Less load, more code.
- Alternative: refresh ALL `enabledStations` on every relevant event (matches the manual ↻ pattern exactly). Simpler, slightly heavier.

### GAP-H — Concurrent in-flight refresh handling
- If event N arrives while event N-1's fetch is still in flight, we could:
  - (a) cancel the in-flight request and start fresh (latest wins),
  - (b) ignore the new event until the in-flight resolves,
  - (c) queue the new event and serialize.
- Today the manual ↻ button doesn't guard at all. Recommended for the new socket flow: the debounce already provides natural coalescing — pick (b) or (c).

### GAP-I — Visibility gating: should socket refresh fire when `stationViewEnabled === false`?
- Current `StationPanel` returns `null` early when off. Refreshing in the background while the panel is hidden is wasted HTTP.
- Recommended: skip socket refresh when `stationViewEnabled === false`. User toggles on → trigger an immediate one-shot refresh.

### GAP-J — Loading indicator UX during socket refresh
- The existing `isLoading` flag in `StationContext` (line 30) is currently stuck at `false` (no consumer toggles it during refresh). Manual ↻ also doesn't toggle it — only `setAllStationData` runs.
- For socket-driven refresh, do we want the spinning ↻ icon to animate (matches manual refresh visual feedback), or stay invisible to avoid distraction?

---

## 7. Proposed Plan (Reuse the Initial-Load Pipeline)

### 7.1 Architectural shape
1. Add a new **single, idempotent** action `refreshAllStations()` to `StationContext`. Internally identical to `StationPanel.handleRefresh` but lives at the context layer (so socket handlers can call it without wiring a component ref).
2. Subscribe to socket events in a small new hook **OR** call `refreshAllStations()` directly from the existing `socketHandlers.js` after each relevant order action.
3. Wrap the call in a 400 ms trailing debounce held inside the hook/module to coalesce burst events.
4. Gate on `stationViewEnabled === true` and `enabledStations.length > 0`.

### 7.2 Files to touch (estimated, no code yet)

| File | Change | Rough size |
|---|---|---|
| `frontend/src/contexts/StationContext.jsx` | Add `refreshAllStations()` action + thin debounce util | +30 lines |
| `frontend/src/api/socket/socketHandlers.js` | After order context updates, invoke a registered `onOrderActivity()` callback | +5–10 lines per handler (or one centralized hook) |
| `frontend/src/api/socket/useSocketEvents.js` | (Optional) thin glue: subscribe `useStationRefreshOnSocket()` once at app level | +10 lines |
| `frontend/src/pages/DashboardPage.jsx` | (Optional) mount the new hook if we put it at page level | +1 line |

### 7.3 Recommended event matrix (based on §5)

| Event | Default trigger refresh? | Reason |
|---|---|---|
| `NEW_ORDER` | YES | Adds preparing items |
| `UPDATE_ORDER` | YES | Items added/removed |
| `UPDATE_ORDER_TARGET` | YES | Items moved across orders |
| `UPDATE_ORDER_SOURCE` | YES | Items moved across orders |
| `UPDATE_ORDER_PAID` | YES | Terminal — removes from preparing |
| `UPDATE_ITEM_STATUS` | YES | Item status flips (preparing → ready → served) |
| `UPDATE_FOOD_STATUS` | YES | Legacy item status |
| `UPDATE_ORDER_STATUS` | YES | Order-level status |
| `SCAN_NEW_ORDER` | YES | Aggregator new order |
| `SPLIT_ORDER` | YES | Items redistributed |
| `DELIVERY_ASSIGN_ORDER` | NO | Rider assignment doesn't change KDS/BAR counts |
| `UPDATE_TABLE` | NO (default) | Table engage/release; per requirement "if relevant" — recommend skipping unless owner says otherwise |
| `ORDER_ENGAGE` | NO | UI lock only |

### 7.4 Pseudocode (illustrative — not for implementation yet)
```js
// inside StationContext (illustrative)
const refreshTimer = useRef(null);
const refreshAllStations = useCallback(() => {
  if (!stationViewEnabled || enabledStations.length === 0) return;
  if (refreshTimer.current) clearTimeout(refreshTimer.current);
  refreshTimer.current = setTimeout(async () => {
    refreshTimer.current = null;
    const cMap = buildCategoriesMap(menuCategories); // from useMenu
    const results = await Promise.all(
      enabledStations.map(s => fetchStationData(s, cMap))
    );
    const next = {};
    enabledStations.forEach((s, i) => { next[s] = results[i]; });
    setAllStationData(next);
  }, 400);
}, [stationViewEnabled, enabledStations, menuCategories, setAllStationData]);
```

### 7.5 Acceptance criteria (draft — refine after answers)

1. On `NEW_ORDER`/`UPDATE_ORDER*`/`UPDATE_*_STATUS`/`SPLIT_ORDER`/`SCAN_NEW_ORDER`, panel refreshes within ~500 ms (debounce + HTTP).
2. Burst of 5 events in <400 ms collapses to ONE refresh (debounce confirmation).
3. Panel is unaffected when `stationViewEnabled === false` (no HTTP fired).
4. Panel always reflects the same shape as manual ↻ (no visual divergence).
5. No regression in existing `OrderContext` / `TableContext` behavior.
6. No errors when a tenant has zero `enabledStations`.

---

## 8. Risk / Impact

- **LOW** if event matrix is correct and debounce lands.
- **MEDIUM** without debounce — burst events could hammer `/station-order-list`.
- **MEDIUM** if `categoriesMap` derivation diverges (GAP-C) → category labels could differ.
- **LOW** if `stationViewEnabled` is honored — no waste on tenants who disable the panel.
- **NIL** for billing / print / payment paths — orthogonal to all V3 financial decisions.

---

## 9. V3 Documentation Implication

- No existing AD covers this. Post-approval, suggest adding **`AD-Station-Refresh`** to `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md` capturing:
  - Decision: panel refresh is frontend-driven, fires on a defined set of socket events, debounced 400 ms.
  - Source endpoint: `POST /api/v1/vendoremployee/station-order-list`.
  - Authority over `enabledStations`: localStorage `mygenie_station_view_config` + product-catalog discovery.
- No risk-register changes required unless GAP-B / GAP-C are folded into scope.

---

## 10. Questions That Need Owner Approval (Answer Each)

### Q-1 — Endpoint confirmation
- The endpoint is `POST /api/v1/vendoremployee/station-order-list` (NOT `employee-menu`). Confirm we should use this one for socket refresh.
- (a) YES — same endpoint as initial load, no change.
- (b) NO — switch to a different endpoint. (If yes, please share endpoint + sample request/response.)

> **Your answer:** _______________________________________

### Q-2 — Event matrix (use defaults from §7.3 unless overridden)

| Event | Default | Override (Y / N) |
|---|---|---|
| `NEW_ORDER` | YES | ___ |
| `UPDATE_ORDER` | YES | ___ |
| `UPDATE_ORDER_TARGET` | YES | ___ |
| `UPDATE_ORDER_SOURCE` | YES | ___ |
| `UPDATE_ORDER_PAID` | YES | ___ |
| `UPDATE_ITEM_STATUS` | YES | ___ |
| `UPDATE_FOOD_STATUS` | YES | ___ |
| `UPDATE_ORDER_STATUS` | YES | ___ |
| `SCAN_NEW_ORDER` | YES | ___ |
| `SPLIT_ORDER` | YES | ___ |
| `DELIVERY_ASSIGN_ORDER` | NO | ___ |
| `UPDATE_TABLE` | NO | ___ |
| `ORDER_ENGAGE` | NO | ___ |

> **Your answer:** _______________________________________

### Q-3 — Refresh granularity
- (a) Refresh **all** `enabledStations` on every relevant event (matches manual ↻ exactly). RECOMMENDED — simplest, safest.
- (b) Derive affected station(s) from socket payload (`order_details_food[].station`) and refresh only those. More code, less HTTP.

> **Your answer:** _______________________________________

### Q-4 — Debounce window
- (a) 400 ms trailing debounce (recommended).
- (b) 200 ms / 300 ms / 500 ms / 1000 ms.
- (c) No debounce — fire immediately on every event.

> **Your answer:** _______________________________________

### Q-5 — Concurrent in-flight handling (GAP-H)
- (a) Debounce covers it; if a fetch is in flight when a new event lands, the next debounce window will catch up. RECOMMENDED.
- (b) Cancel in-flight, fire fresh ("latest wins").
- (c) Queue & serialize.

> **Your answer:** _______________________________________

### Q-6 — Visibility gating (GAP-I)
- (a) Skip socket refresh when `stationViewEnabled === false`. RECOMMENDED.
- (b) Always refresh in the background even when hidden (so the panel is fresh the moment user enables it).

> **Your answer:** _______________________________________

### Q-7 — Visual feedback during socket refresh (GAP-J)
- (a) Stay silent — no spinner during automatic refreshes. RECOMMENDED for cashier UX (avoid distraction).
- (b) Animate the per-station ↻ icon during the refresh fetch (consistent with manual refresh).
- (c) Show a small subtle indicator (e.g., the count badge briefly pulses).

> **Your answer:** _______________________________________

### Q-8 — Cross-tab behavior
- If the cashier has two tabs open, both will refresh on every relevant event (each subscribes to sockets independently).
- (a) Acceptable — same as manual ↻ today. RECOMMENDED.
- (b) De-duplicate using `BroadcastChannel` so only one tab fetches.

> **Your answer:** _______________________________________

### Q-9 — Settings-save sync (GAP-B, separate but related)
- Today, changing selected stations in `StatusConfigPage` and clicking Save does NOT live-update `StationContext` until reload. Should we fix this as part of the same work?
- (a) YES — include the fix; on Save, re-call `initializeConfig(uniqueStations)` so runtime context picks up the change immediately.
- (b) NO — out of scope; track separately.

> **Your answer:** _______________________________________

### Q-10 — `categoriesMap` source unification (GAP-C)
- LoadingPage uses `cat.categoryName`; StationPanel manual refresh uses `cat.name`. Different fields could lead to divergent labels.
- (a) YES — unify on `MenuContext.categories` with one shared helper. RECOMMENDED.
- (b) NO — leave as is, just match LoadingPage's behavior in the new socket refresh.

> **Your answer:** _______________________________________

### Q-11 — Failure handling
- HTTP 5xx / network failure on socket-driven refresh:
  - (a) Silent fail; keep stale data; next event will retry. RECOMMENDED.
  - (b) Toast error.
  - (c) Show small inline error badge on the affected station header.

> **Your answer:** _______________________________________

### Q-12 — V3 doc update
- (a) YES — add `AD-Station-Refresh` to `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md` and `/app/v3/RISK_REGISTER.md` (close gap). RECOMMENDED.
- (b) NO — implementation only.

> **Your answer:** _______________________________________

---

## 11. What Happens Next

- Once you mark answers (just `(a)` / `(b)` against each question is enough; defaults will be assumed for any unanswered RECOMMENDED items), I will produce **`/app/memory/THREE_REQUIREMENTS_IMPLEMENTATION_HANDOVER.md`** with:
  - exact file ranges to edit,
  - the full implementation pseudocode,
  - per-question test cases (manual + socket simulation script + curl-style verification),
  - rollback / kill-switch plan,
  - V3 doc patch (if Q-12 = a),
  - acceptance checklist tied to your answers.
- The document for Req 2 (Add button visibility) and Req 3 (Room bill print) is already in `/app/memory/THREE_REQUIREMENTS_V3_VALIDATION_GAPS.md` (v2). You can answer those whenever convenient — they don't block this Req-1 plan.

---

_End of deep-dive analysis. No code or production docs modified._
