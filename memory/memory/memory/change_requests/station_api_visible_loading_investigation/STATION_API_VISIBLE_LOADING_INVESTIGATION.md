# Station API Visible Loading Investigation

> **Mode:** Investigation and analysis only. No code changes, no commits, no refactor.
> **Date:** 2026-05-15
> **Trigger:** Follow-up to the just-shipped POS-boot parallelisation CR. With Phase-1 now ~3.5 s faster, the silent Phase-2 station load is more perceptually obvious. Owner asks whether station/KDS loading should be made visible.

---

## 1. Summary

Today the Phase-1 boot APIs (now parallel after the previous CR) finish, the visible progress bar reaches **100 %**, and only THEN a Phase-2 step called `loadStationData()` runs **silently** to fetch per-station "what's cooking right now" data from `/api/v1/vendoremployee/station-order-list`. While this silent step is running, the user sees a "frozen 100 %" bar for **1–3 seconds** (one extra HTTP round-trip per station; runs all stations in parallel via `Promise.all`). Only after it resolves does the page navigate to `/dashboard`. This creates a "is it frozen?" perception — and it has two correctness wrinkles too:

1. **It blocks POS entry even when the user has Station View turned OFF** (the default for new users). The fetch loop is short-circuited via `if (savedConfig.enabled !== false)` so no network calls fire, but the wrapper function still resolves async — and the navigation timer is gated on the wrapper's promise.
2. **Failures are completely silent.** The `try/catch` at `LoadingPage.jsx:168-171` swallows any error with only a `console.error`. No toast, no error row, no UI cue.

A fully-fleshed Phase-3 CR for exactly this concern already exists at `change_requests/phase_3/UX_LOADING_02_VISIBLE_STATION_PROGRESS.md` with three implementation options (B1 / B2 / B3). It is paired with the parallelisation CR that just shipped. Owner approval is the only remaining gate.

---

## 2. Related CR / Docs Found

| Doc | Path | Relevance |
|---|---|---|
| **UX-LOADING-02 — Parallel API Loading + Visible Station-Load Progress** | `change_requests/phase_3/UX_LOADING_02_VISIBLE_STATION_PROGRESS.md` | Direct match. "Concern A" (parallelisation) was implemented in the previous CR. "Concern B" (visible station progress) is the exact subject of this investigation. Status: `needs_owner_decision` — three options (B1 / B2 / B3) already drafted, effort estimates included. |
| POS Boot API Parallelization Investigation | `change_requests/pos_boot_api_parallelization/POS_BOOT_API_PARALLELIZATION_INVESTIGATION.md` | Predecessor CR. Section §1 explicitly mentions "the 1-3 second silent Phase-2 tail" and flags it for a follow-up CR (now this one). |
| POS Boot API Parallelization Fix Report | `change_requests/pos_boot_api_parallelization/POS_BOOT_API_PARALLELIZATION_FIX_REPORT.md` | Confirms Phase-2 was intentionally left out of scope; this is the in-scope follow-up. |
| POS Boot API Parallelization QA Report | `change_requests/pos_boot_api_parallelization/POS_BOOT_API_PARALLELIZATION_QA_REPORT.md` | "Open items §3" reiterates: *"Now that Phase 1 is ~3.5 s faster, the 1-3 s silent Phase-2 tail will be more perceptually obvious to users."* |
| Phase-3 README | `change_requests/phase_3/README.md` | Lists UX-LOADING-02 alongside other Phase-3 polish items. |
| Batch-3A ESLint summary | `change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_3A_LOADINGPAGE_ESLINT_SUMMARY.md` | Earlier hygiene pass on `LoadingPage.jsx`; flags `// eslint-disable react-hooks/exhaustive-deps` on the same effect that owns Phase-2 launch. |

**This investigation re-validates the Phase-3 Concern-B options against current `15-may` HEAD** (post-parallelisation-CR). All findings remain valid; one small correctness gap (silent failure) is added that the Phase-3 doc didn't explicitly call out.

---

## 3. Current Station API Flow

### 3.1 The single station API call site

**One** backend endpoint is involved:

| Endpoint | Method | Body | Caller |
|---|---|---|---|
| `/api/v1/vendoremployee/station-order-list` | `POST` (multipart form) | `role_name=<stationName>` + `def_order_status=1` (Preparing) | `stationService.fetchStationData(stationName, categoriesMap)` at `api/services/stationService.js:179-291` |

It is called **once per enabled station** at boot, and re-called by:
- The Station Panel's own refresh button (`StationPanel.jsx:336-354`).
- The socket-refresh hook on live order updates (`hooks/useStationSocketRefresh.js`).
- The Status Config page when the user changes station selection (`pages/StatusConfigPage.jsx:475`).

Stations themselves are not discovered via an API — they're **derived client-side from the products list** by reading the `station` field on each product (`stationService.extractUniqueStations(products)` at L24-38). So station discovery is a pure transform that requires `products` to be loaded.

### 3.2 The boot flow (after the parallelisation CR)

```
Phase 1 (LoadingPage.jsx — visible in progress bar)
└── Tier 1 (barrier):  profile
└── Tier 2 (parallel via Promise.allSettled):
        ├── categories
        ├── products            ← needed to discover station names
        ├── tables
        ├── cancellationReasons
        ├── popularFood
        └── runningOrders
└── Post-batch enrichment + Menu/Tables/Settings/Orders context setters

[bar reads 100 %, navigation NOT yet triggered]

Phase 2 (loadStationData — SILENT)
├── extractUniqueStations(data.products)        ← derives station list
├── setAvailableStations + initializeConfig     ← Station context state
├── if (stationViewConfig.enabled !== false):
│   ├── stations.map(fetchStationData)          ← N parallel POST requests
│   └── setAllStationData(results)
└── (catch block: console.error only, no UI feedback)

[then setIsComplete(true), setTimeout(500ms), navigate('/dashboard')]
```

### 3.3 The progress-bar gate

`LoadingPage.jsx:75-112` computes `progress = round(completed / total * 100)` where `total = Object.values(loadingStatus).length === 7` (one row per Phase-1 API). Phase 2 is **not** included in this count. The effect at L85 detects `completed === total` and then conditionally awaits `loadStationData()` before calling `navigate(...)`. So:

- The progress bar **always tops out at 100 %** before Phase 2 has done anything visible.
- Navigation is gated on Phase-2 completion.
- The user sees a 1–3 s "100 %, frozen" tail.

### 3.4 Files involved

| File | Role |
|---|---|
| `frontend/src/pages/LoadingPage.jsx` | L92 launches `loadStationData()`; L115-172 implements it; L75-112 owns the progress effect that gates navigation on Phase-2's promise. |
| `frontend/src/api/services/stationService.js` | L24-38 `extractUniqueStations` (pure transform); L179-291 `fetchStationData` (the actual HTTP call); L101-112 `getStationViewConfig` (reads localStorage `mygenie_station_view_config`); L13-17 `DEFAULT_STATION_VIEW_CONFIG` (`enabled: true` by default — see §3.5). |
| `frontend/src/contexts/StationContext.jsx` | L13-162 — owns `availableStations`, `enabledStations`, `stationData`, `stationViewEnabled`, `isLoading`, `setAllStationData`, `initializeConfig`. L24: `stationViewEnabled` initial state is **`false`** (different from the service's `DEFAULT_STATION_VIEW_CONFIG.enabled` — see §3.5). |
| `frontend/src/components/station-view/StationPanel.jsx` | L300-372 — renders the kitchen-station UI; **early-returns `null` if `!stationViewEnabled || !enabledStations?.length`**; has its own refresh button at L336-354. |
| `frontend/src/hooks/useStationSocketRefresh.js` | Live re-fetch on socket events; self-guards on `stationViewEnabled`. |
| `frontend/src/pages/DashboardPage.jsx` | L23 imports `StationPanel`; L1511 renders it inside the dashboard layout. |
| `frontend/src/pages/StatusConfigPage.jsx` | Allows the user to enable/disable Station View and pick stations; calls `setAllStationData(...)` after changes. |
| `frontend/src/api/constants.js` | L253-261 `API_LOADING_ORDER` — the 7 Phase-1 keys; does NOT include any station entry. |

### 3.5 Subtle inconsistency worth flagging (not the focus of this CR)

- `stationService.DEFAULT_STATION_VIEW_CONFIG.enabled = true` (L14)
- `StationContext` `stationViewEnabled` initial state = **`false`** (L24)
- `initializeConfig` reads localStorage and falls back to `false` when no saved config exists (L52-57)

So a brand-new user without localStorage has `stationViewEnabled === false` in the context (Station Panel hidden), but the boot flow's `if (savedConfig.enabled !== false)` check at `LoadingPage.jsx:152` evaluates to **true** (because `getStationViewConfig` returns the service's default with `enabled: true`). Net effect: station HTTP calls fire on first login even though the panel won't render. This is wasted work but not the subject of this CR — flag for a separate hygiene follow-up.

---

## 4. Relationship With POS Boot Loading

| Aspect | Status |
|---|---|
| Phase 1 (the 7 boot APIs) and Phase 2 (station loading) order | **Strictly serial.** Phase 2 only starts when `completed === total` and `!hasAnyError` (LoadingPage.jsx L84-92). |
| Does Phase 2 block navigation? | **Yes.** Navigation runs inside `loadStationData().then(...)` (L92-106). Even when the inner station fetches are skipped (`stationViewConfig.enabled === false`), the outer async function still has to resolve. |
| Can Phase 2 run earlier (e.g. concurrently with Phase 1)? | **No** for the inner fetches (need station names → need `products`). **Partially yes** for the wrapper: `setAvailableStations` / `initializeConfig` / categoriesMap building all need `products` + `categories`, so the earliest they can start is "after Tier-2 settles". The HTTP `fetchStationData(station)` calls themselves only need an auth token, so in theory they could be raced with non-products Tier-2 calls if station names were known up-front — they're not. |
| Can Phase 2 be made non-blocking (let dashboard render first, station data hydrates after)? | **Yes — safely.** `StationPanel` already conditionally renders only when `stationViewEnabled && enabledStations?.length` (L357), and it has its own internal `isLoading` flag (L306) + refresh button (L336-354). The Dashboard does NOT depend on station data for any other surface (verified by grepping `useStations` — only StationPanel + StatusConfigPage + the socket-refresh hook consume it). |
| Does Phase 2 share auth / restaurant id with Phase 1? | **Yes.** Uses the same `api/axios` instance with the auth-token interceptor that `loadProfile` populated. Tier-1 (profile) barrier is therefore sufficient. |

---

## 5. Current UI Visibility

**Phase 1 → fully visible.** 7 rows in the loading screen, each with its own status icon, count, and elapsed time (`LoadingPage.jsx:501` iterates `API_LOADING_ORDER.map(...)`).

**Phase 2 → completely invisible.** Specifically:

- **No row in the loading list.** `loadingStatus` is initialised from `API_LOADING_ORDER` (`LoadingPage.jsx:42-44`) which has only the 7 Phase-1 keys. There is no station entry.
- **No progress contribution.** The bar reaches 100 % before Phase 2 starts.
- **No spinner / label.** The `getStatusIcon` and `getCountText` helpers are only wired to `loadingStatus` rows.
- **Internal `[LoadingPage] Available stations: …` / `Station data loaded: …` console logs only** (L122, L137, L164) — invisible to non-developer users.
- **Failures swallowed.** The `try/catch` at L168-171 only prints `console.error`. No toast, no error row, no retry UI. Result: silent partial-data state where the kitchen panel just shows "no items" when there should be items.

What the user perceives:
1. Login → loading screen pumps from 0 → 100 % in ~1 s (post-parallelisation).
2. Bar reads "100 %" but the screen does not change.
3. After 1–3 s (longer for restaurants with many stations / slow backend), the dashboard appears.

That 1–3 s gap looks like the app froze.

---

## 6. Dependency Analysis

| Sub-step in Phase 2 | Needs | Earliest possible start |
|---|---|---|
| `extractUniqueStations(products)` | `data.products` | After `products` Tier-2 promise settles. |
| `setAvailableStations`, `initializeConfig` | result of `extractUniqueStations` | Same. |
| Build `categoriesMap` | `data.categories` | After `categories` Tier-2 promise settles. |
| `fetchStationData(stationName, categoriesMap)` HTTP call | auth token (Tier-1 profile) + station name (Tier-2 products) + categoriesMap (Tier-2 categories) | After both `products` AND `categories` have resolved. NOT after the full Tier-2 batch — just after those two. |

So there is a small concurrency window: **station HTTP calls could start the instant `products` and `categories` both resolve, rather than waiting for the slowest Tier-2 call** (today it waits for `Promise.allSettled` to settle the whole batch + the post-batch enrichment dispatch). On preprod the slowest Tier-2 call (`/get-products-list` at ~6 s) is usually the one that gates everything — but in some restaurants `tables` or `runningOrders` could be slower than `products`, in which case raising station fetches "one notch earlier" gains a small win. **The complexity is not worth it for this CR** — it would tangle Phase 1 and Phase 2. Recommend keeping Phase-2 launch where it is.

**Can station APIs run "in parallel" with Phase-1 Tier-2?** Technically **no** for the fetches themselves (need station names from products), but the WRAPPER (`extractUniqueStations` + context setters + categoriesMap) could start as a side-effect of `loadProducts` completing. Still not worth the entanglement. Status quo placement is fine; the issue is purely **visibility / blocking semantics**, not execution order.

---

## 7. User Impact

### 7.1 What the user sees today

| Scenario | Today's experience |
|---|---|
| Owner with Station View **disabled** (default for new users) | Bar fills to 100 %, then a **1–3 s frozen tail** of unnecessary station-context wiring (no HTTP, but the wrapper still resolves async), then dashboard appears. Station Panel is hidden anyway. |
| Owner with Station View **enabled**, healthy network | Bar fills to 100 %, then a **1–3 s frozen tail** while station data fetches in the background, then dashboard appears with populated kitchen panel. |
| Owner with Station View **enabled**, slow network | Bar at 100 % for **3–10 s**. Indistinguishable from a hang. Frequent F5 / nav-back. |
| Owner with Station View **enabled**, station API fails | Bar at 100 %, eventual nav to dashboard, but kitchen panel shows "no items". **No toast, no error row, no indication a fetch failed.** Operator may scold the kitchen for no orders when in reality the call 500'd. |
| First-time login, no localStorage | Service's `DEFAULT_STATION_VIEW_CONFIG.enabled = true` causes station HTTP calls to fire even though `StationContext.stationViewEnabled` is `false` so the panel won't render → wasted bandwidth + wasted ~1–3 s wait. Flagged in §3.5. |

### 7.2 What can break / appear delayed if station data isn't ready

- **Nothing in the Dashboard except the StationPanel.** StationPanel early-returns `null` until `stationViewEnabled && enabledStations?.length` (StationPanel.jsx L357). Other dashboard surfaces (channel view, status view, header pulse, channel chips, search) do **not** read station data.
- **Order placement is unaffected.** OrderEntry does not depend on station data.
- **Printer / station mapping** in print payloads — the print payload builders derive `station` from individual product records (cached in MenuContext after Tier-2 `products` resolves). They do **not** depend on `stationData`. Verified by grep: `payload`/`print` code paths read `product.station`, not the live kitchen-station data.
- **Socket-driven station refresh** would still work once the page is open — `useStationSocketRefresh` re-fetches on order changes, independent of the initial boot fetch.

**Conclusion:** Station data freshness on first paint is purely a quality-of-life concern for the kitchen panel itself. Nothing else breaks.

---

## 8. Recommended Fix Plan

This section restates the Phase-3 doc's Concern-B options against the live code with one safety patch (option D) that wasn't in the original doc.

### 8.1 Option A (recommended) — Add visible row(s) for Phase 2 + decouple navigation

Two related changes in one CR, both confined to `LoadingPage.jsx`:

**A.1 Visibility:** Push N rows (one per station) into `loadingStatus` once `products` resolves and `extractUniqueStations` returns the list. Each row transitions IDLE → LOADING → SUCCESS / ERROR as `fetchStationData(station)` resolves. The progress bar's `total` count grows to `7 + N`, so it no longer hits 100 % prematurely. This is the Phase-3 doc's Option B2 (~3 hr effort).

**A.2 Non-blocking navigation:** Remove the `loadStationData().then(navigate)` chain. Navigate to `/dashboard` as soon as Phase 1 + station-discovery (the synchronous `extractUniqueStations` + context-state init) complete. The dashboard's `StationPanel` already has its own `isLoading` + refresh-button UI, so it can show its own "Loading kitchen…" state while the fetches resolve. The N parallel `fetchStationData` calls continue in the background; on resolution, `setAllStationData` (StationContext) propagates to `StationPanel`.

**Net experience:** Bar fills smoothly to 100 % (now including the N station rows), the dashboard appears the moment Phase 1 + station discovery is done, and kitchen panel hydrates progressively right there with its own spinner. No more frozen 100 % tail; failures show a red row in the loading list AND a toast (per-loader contract from the previous CR).

### 8.2 Option B (smaller patch) — Just visible rows, keep blocking navigation

Same as A.1 above, but leave the navigation gate where it is. Bar advances honestly through Phase 2; navigation still waits for `Promise.all` of station fetches. Smaller diff (~1.5 hr effort, Phase-3 doc's Option B2 without B3 / A.2). Pros: tiny risk. Cons: still blocks dashboard entry on station-API latency.

### 8.3 Option C (smallest patch) — Spinner + label only

Phase-3 doc's Option B3 (~50 min). Replace the silent 100 % bar with `"Setting up your kitchen stations…"` + a spinner. No per-station rows. Lightweight but doesn't show partial progress or individual failures.

### 8.4 Option D (orthogonal safety patch — recommended ALONGSIDE A or B)

**Surface station load failures.** Today's `LoadingPage.jsx:168-171` swallows all errors. Change the catch to also `toast({title: "Failed to load kitchen stations", description: error.message, variant: "destructive"})` and (if Option A or B is taken) write `LOADING_STATES.ERROR` to the corresponding station row(s). 5-line change. Eliminates the worst silent-failure case from §7.1.

### 8.5 What's strictly NOT touched in any of the above

Per the standing protected-surface list (carried from the previous CR):

- ❌ No backend / API contract changes.
- ❌ No change to `categoryService.calculateItemCounts` or any Phase-1 logic.
- ❌ No change to `OrderEntry.jsx`, VAT, service charge, tip, delivery charge, dashboard, payload builders, channel-view stability fix, Web/POS pulse counter, CR-001 Fix B2 return-to-URL, T-07 ProtectedRoute handoff.
- ❌ No reorder of profile-derived setters inside `loadProfile`.
- ❌ No change to `LOADING_STATES` / `mkIdle` / `updateStatus` contract.
- ❌ No change to `loadedDataRef.current` shape.
- ❌ No change to `mygenie_station_view_config` semantics.
- ❌ No removal of `[LoadingPage]` debug `console.log` retention.
- ❌ No change to the just-shipped Phase-1 parallelisation.
- ❌ No touch of `StationContext` beyond using its existing setters.
- ❌ No touch of `StationPanel.jsx`, `useStationSocketRefresh.js`, `StatusConfigPage.jsx`.

### 8.6 Recommended combo

**Option A + Option D** (~3–3.5 hr effort).

- A.1 adds honest visible progress (per-station rows; bar reflects real work).
- A.2 removes the 1–3 s frozen tail by decoupling navigation; StationPanel handles its own hydration.
- D ensures any failure surfaces a toast + red row instead of a silent partial-data dashboard.

Fallback for tight time: **Option C + Option D** (~1 hr).

---

## 9. Regression Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Delaying POS entry unnecessarily** | Today this risk is live (1-3 s frozen tail). Option A.2 / Option C eliminates it; Option B leaves it. | Pick A or C. |
| **Hiding station/printer readiness issues** if we decouple navigation | Low. Print payload builders read `product.station` from MenuContext (Tier-2 result), not from `stationData`. Verified by grep. | None needed. |
| **Breaking KDS/printer mapping** | None. Printer / KOT routing logic is independent of `stationData` (which is the per-station "live orders" view, not the routing table). | None needed. |
| **Race with profile / restaurant id** | None — Tier-1 profile barrier remains in place; station fetches still happen after `products` + `categories`, which themselves run after profile. | Existing parallelisation contract. |
| **Duplicate station calls** | Low. `StationPanel` has its own refresh and `useStationSocketRefresh` reacts to sockets — neither fires automatically on dashboard mount. Only StatusConfigPage triggers explicit `setAllStationData(...)` and only after user action. | None needed. |
| **Confusing loading progress** if rows are added mid-flight | Low-medium. The bar denominator changes from 7 to 7+N once `products` resolves. Visually the bar can "rewind" from e.g. 100/7 to 86/(7+1). | Mitigation in Option A: set the station-row count BEFORE marking the products row SUCCESS, or compute progress only after products resolves. Easy. |
| **StationPanel's own `isLoading` state showing twice** (once in loading screen, once in dashboard) | Low. Cleaner if decoupled navigation triggers `setIsLoading(true)` in StationContext before navigation, and the in-flight fetches `setIsLoading(false)` on completion. No new state needed; existing setters cover this. | Documentation only. |
| **Eslint exhaustive-deps re-trip** on the modified progress effect | Low. The disable comment at L111 already covers it. | Keep the comment scoped. |
| **Hot retry behaviour** if a station fetch fails | Medium. Today there's no retry path for station failures. Option A introduces ERROR rows; the existing `handleRetry` (L411-429) iterates `API_LOADING_ORDER` which doesn't include stations. Need to either extend retry to station keys OR add a separate "Retry kitchen" button. | Decision for Phase-3 doc Option B2 already covers this — extend `handleRetry` to iterate the station-row keys too. |

---

## 10. QA Checklist

(For the eventual fix CR, not for this investigation.)

1. **Fresh POS load, station view OFF (default new user).** Bar fills smoothly; no frozen 100 % tail; navigate to dashboard immediately; no Station Panel rendered.
2. **Fresh POS load, station view ON, healthy network.** Bar shows 7 + N station rows; each station row turns green in ~500 ms-2 s; bar reaches 100 % only when all done OR (with Option A.2) navigation happens earlier and StationPanel hydrates in dashboard.
3. **Slow network (Slow 3G throttle).** Per-station rows visibly progress; no apparent freeze.
4. **One station API failure** (simulate 500). That station's row turns red; toast surfaces; other stations still resolve; dashboard still reachable.
5. **All station APIs failing.** All N rows red; toasts surface; (Option A.2) dashboard still reachable with empty StationPanel; (Option B) retry button reachable.
6. **`stationViewConfig.enabled === false`.** No station HTTP calls. No station rows added. Smooth 7-row bar; no frozen tail.
7. **First-time user with no localStorage.** Station Panel hidden (because `StationContext.stationViewEnabled = false` initial state). Either no station calls fire (after fixing the §3.5 inconsistency) or they fire silently in the background without blocking dashboard entry.
8. **KDS/printer behaviour.** Print payload `station` field still derived from `product.station`; KOT routing unchanged.
9. **Retry behaviour.** If station rows are added to `loadingStatus`, `handleRetry` re-runs only failed station rows. Profile is never re-run unless profile itself failed.
10. **No duplicate station calls.** DevTools shows exactly N `/station-order-list` POSTs per fresh boot (one per enabled station), plus refresh-button + socket-refresh calls later.
11. **CR-001 Fix B2 (return-to-URL).** Hard-refresh on `/orders/x` still lands on `/orders/x` after loading.
12. **`useStationSocketRefresh` still working** after dashboard mount.
13. **StatusConfigPage flow.** Toggling station view, picking stations, refreshing — all still work.
14. **Loading screen on retry.** Re-running only failed Phase-1 keys still works; station rows update only after all Tier-2 successes.

---

## 11. Open Questions

1. **Should station loading block POS entry?** (Today: yes; Recommendation: no — let StationPanel hydrate in-place.) Owner decision.
2. **Should station loading be visible (per-station rows) or just a spinner + label?** (Phase-3 doc Options B2 vs B3.) B2 is the better long-term answer; B3 is the smallest-patch fallback.
3. **Should station APIs run in parallel with Phase-1 Tier-2 APIs?** Not really practical — they need `products` + `categories` to be resolved first. Recommend keeping the launch where it is.
4. **Should station failure show a toast / red row, or allow silent POS entry?** Strong recommendation: show a toast + red row (Option D). Today's silent failure is a footgun.
5. **Should retry extend to station rows?** If we add station rows, the existing `handleRetry` should iterate them too. Trivial.
6. **Hygiene follow-up — fix the `DEFAULT_STATION_VIEW_CONFIG.enabled = true` vs `StationContext.stationViewEnabled = false` inconsistency** (§3.5). Currently causes wasted HTTP calls on first login. Separate small CR, not blocking.
7. **Should the loading-screen contract document that the bar can have a variable number of rows** (because stations are tenant-dependent)? Owner preference on the docstring at the top of `LoadingPage.jsx`.
8. **Telemetry?** Worth instrumenting `performance.now()` deltas around Phase 2 to measure the actual silent-tail length tenant-by-tenant? Optional.

---

— End of investigation.
