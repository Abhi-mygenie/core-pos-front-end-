# POS Boot API Parallelization Investigation

> **Mode:** Investigation and planning only. No code changes, no commits, no refactor.
> **Date:** 2026-05-15
> **Trigger:** Owner observation that POS initial load feels slow because boot APIs appear to run sequentially.

---

## 1. Summary

POS boot loads **7 backend APIs** strictly **one after another** in a `for…of await` loop inside `LoadingPage.jsx` (the post-login splash screen that primes every shared React context before navigating the user to `/dashboard` or `/orders/...`). On a typical broadband connection with ~500 ms per API this means a Phase-1 latency of roughly **3–3.5 s** even though only **one** of the 7 APIs (`profile`) is a true dependency for the others; the remaining 6 could safely run in parallel and reduce Phase-1 wall-clock to roughly **~1 s** (a ~60–70 % reduction). After Phase-1, a hidden Phase-2 step (`loadStationData`) runs silently for 1–3 s with the progress bar already at 100 %, contributing additional perceived slowness.

`OrderEntry.jsx` itself does **not** make boot API calls — it consumes the contexts already populated by `LoadingPage`. So the entire optimisation surface is `LoadingPage.jsx`.

A Phase-3 CR for exactly this issue already exists (see §2). This investigation re-validates that CR against the current `15-may` branch HEAD and confirms the plan is still applicable.

---

## 2. Related CR / Phase 2 Docs Found

**Yes — directly relevant CR exists, not yet implemented.**

| Doc | Location | Status |
|---|---|---|
| **UX-LOADING-02 — Parallel API Loading + Visible Station-Load Progress** | `/app/memory/change_requests/phase_3/UX_LOADING_02_VISIBLE_STATION_PROGRESS.md` | `needs_owner_decision` — plan ready; awaiting option pick + go. Two concerns bundled: **Concern A** = parallelisation (this investigation's topic); **Concern B** = visible Phase-2 station progress (related but separable). |

**Secondary touch-points found:**

| Doc | Relevance |
|---|---|
| `change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_3A_LOADINGPAGE_ESLINT_SUMMARY.md` | Recent ESLint hygiene pass on the same file. Includes one `// eslint-disable-next-line react-hooks/exhaustive-deps` at L111 that may become removable after parallelisation. |
| `current-state/API_USAGE_MAP.md` | Documents which APIs each surface calls. Confirms LoadingPage as the single boot entry-point. |
| `change_requests/CR_004_PHASE2_*` | Mentions `Promise.all` in dashboard refresh flow (already parallel there); confirms the pattern is accepted elsewhere in the codebase. |

The Phase-3 doc already contains: a fully-fleshed option matrix (A1 / A2 / A3), Promise.all vs Promise.allSettled discussion, baseline-guardrail list, test plan, effort estimate, and approval gate. This investigation report restates the technical findings against the live `15-may` branch and keeps the same recommendations.

---

## 3. Current POS Boot API Flow

### 3.1 Entry point
`/app/frontend/src/pages/LoadingPage.jsx` mounts after login (via `ProtectedRoute` → CR-001 Fix B2 return-to-URL logic).
- `useEffect` at L62–69 fires `loadAllData(ctrl)`.

### 3.2 Sequential loop (the hotspot)
`loadAllData` at L346–365:
```js
// Load all APIs in sequence    ← literal comment on L345
for (const key of keysToLoad) {
  if (ctrl.aborted) return;
  const loader = loaderMap[key];
  if (loader) await loader(ctrl, data);    // awaits each → next cannot start
}
```

### 3.3 Exact ordered list (`API_LOADING_ORDER` in `api/constants.js` L253–261)

| # | Key | Backend endpoint | Loader fn (LoadingPage.jsx) | Real call site (service) |
|---|---|---|---|---|
| 1 | `profile` | `PROFILE` | L185–226 | `profileService.getProfile()` |
| 2 | `categories` | `CATEGORIES` | L228–241 | `categoryService.getCategories()` |
| 3 | `products` | `PRODUCTS` | L243–261 | `productService.getProducts({limit:500,offset:1,type:'all'})` |
| 4 | `tables` | `TABLES` | L263–277 | `tableService.getTables()` |
| 5 | `cancellationReasons` | `CANCELLATION_REASONS` | L279–294 | `settingsService.getCancellationReasons({limit:100,offset:1})` |
| 6 | `popularFood` | `POPULAR_FOOD` | L296–311 | `productService.getPopularFood({limit:50,offset:1,type:'all'})` |
| 7 | `runningOrders` | `RUNNING_ORDERS` | L313–332 | `orderService.getRunningOrders(roleParam)` |

After the 7 sequential APIs:
- L359–362 fan out `setCategories(...)`, `setProducts(...)`, `setPopularFood(...)` into the Menu context (single batch).
- L92 then calls **Phase 2** `loadStationData()` (L115–172), which **is** internally parallel (`Promise.all` at L156) but runs silently after the visible bar already reads 100 %.

### 3.4 OrderEntry / Dashboard load — no extra boot calls
`OrderEntry.jsx` only fetches a single per-order payload (`fetchSingleOrderForSocket`) on demand. `DashboardPage.jsx` uses context state populated by LoadingPage. There is **no separate POS boot path** outside `LoadingPage.jsx`.

---

## 4. Sequential vs Parallel Analysis

| API | Why sequential today | Truly dependent? | Verdict |
|---|---|---|---|
| `profile` | First in the list; provides `roleName`, `restaurant.id`, CRM key. | **Yes** — every downstream consumer reads from it. | **Must remain sequential (barrier).** |
| `categories` | Sequenced before `products` so `categoryService.calculateItemCounts(categories, products)` can run inside `loadProducts` (L252–253) and enrich categories with per-category item counts. | **Partial.** `categories` itself doesn't need anything else. The `calculateItemCounts` enrichment needs BOTH categories AND products. | **Can be parallel-fetched** with `products`; the cross-enrichment step at L252–253 can run AFTER both promises resolve. |
| `products` | Same as categories — paired by enrichment step. | Same as above. | **Can be parallel** with `categories`. |
| `tables` | None. | **No.** | **Can run in parallel.** |
| `cancellationReasons` | None. | **No.** | **Can run in parallel.** |
| `popularFood` | None. | **No.** | **Can run in parallel.** |
| `runningOrders` | Reads `data.profile.permissions[0]` for `roleParam` (L321). | **Yes — depends on `profile` only.** | **Can be parallel** with categories/products/tables/cancellationReasons/popularFood once `profile` has resolved. |

**Summary:** 1 barrier (`profile`) + 6 parallel.

---

## 5. Dependency Map

```
Tier 1 (barrier)
└── profile
        ├── provides: user, permissions, restaurant, CRM key
        └── unblocks: runningOrders (needs permissions[0])
                       (and downstream context setters that read profile.restaurant)

Tier 2 (independent, can all run together once profile resolves)
├── categories         ← no input deps
├── products           ← no input deps; cross-enriches `categories` via
│                        categoryService.calculateItemCounts AFTER both resolve
├── tables             ← independent
├── cancellationReasons← independent
├── popularFood        ← independent
└── runningOrders      ← reads data.profile.permissions[0]  (Tier-1 dep satisfied)

Post-Tier-2 (synchronous fan-out)
├── setCategories(...)   ← fed enriched list
├── setProducts(...)
├── setPopularFood(...)
└── (other setters already happen inside their loader: setTables, setCancellationReasons,
     setOrders, setUserData, setRestaurant, setCrmRestaurantId)

Phase 2 (already parallel internally; runs after Tier-2 + setters)
└── loadStationData → N station fetches via Promise.all  (L156)
```

The category↔product enrichment is a **post-fetch in-memory operation**; it does not need to be sequenced before either API call. Today's code happens to enrich inside `loadProducts` because it runs *after* `loadCategories` in the loop. In a parallel batch the enrichment line moves to *after* the `Promise.allSettled` and operates on both resolved arrays — net behaviour identical.

---

## 6. Files / Functions Involved

| File | Lines | What's there |
|---|---|---|
| `frontend/src/pages/LoadingPage.jsx` | **L62–69** | `useEffect` boot trigger. |
| | **L75–112** | Progress-bar effect; navigation; Phase-2 launch at L92. |
| | **L115–172** | `loadStationData` (Phase 2 — already parallel internally). |
| | **L174–180** | `updateStatus` setter. |
| | **L185–226** | `loadProfile` — barrier. |
| | **L228–241** | `loadCategories`. |
| | **L243–261** | `loadProducts` (+ inline enrichment at L252–253). |
| | **L263–277** | `loadTables`. |
| | **L279–294** | `loadCancellationReasons`. |
| | **L296–311** | `loadPopularFood`. |
| | **L313–332** | `loadRunningOrders` (reads `profile.permissions[0]`). |
| | **L335–343** | `loaderMap` lookup. |
| | **L345–365** | **`loadAllData` — sequential `for...of await` loop. THE HOTSPOT.** |
| | **L367–385** | `handleRetry` — re-runs only failed keys; must continue to work after the refactor. |
| `frontend/src/api/constants.js` | **L253–261** | `API_LOADING_ORDER` array (order is informational once we parallelise; the list itself stays). |
| `frontend/src/api/services/profileService.js` | full | `getProfile()`. |
| `frontend/src/api/services/categoryService.js` | full + `calculateItemCounts` | enrichment helper. |
| `frontend/src/api/services/productService.js` | full | `getProducts`, `getPopularFood`. |
| `frontend/src/api/services/tableService.js` | full | `getTables`. |
| `frontend/src/api/services/settingsService.js` | full | `getCancellationReasons`. |
| `frontend/src/api/services/orderService.js` | full | `getRunningOrders`. |
| `frontend/src/contexts/{Auth,Restaurant,Menu,Tables,Settings,Orders,Stations}Context.jsx` | setter signatures | consumed by loaders; no change required. |

**No backend file is involved.**

---

## 7. Current Performance / Loading Risk

### 7.1 Wall-clock breakdown (typical preprod numbers)

| Phase | Today | After parallelisation (proposed) |
|---|---|---|
| Phase 1 — 7 sequential APIs | ~3.0 – 3.5 s | ~1.0 – 1.3 s (governed by slowest of: profile, then max(other 6)) |
| Phase 2 — station data | 1 – 3 s **silent** | 1 – 3 s, optionally visible via Concern B (separate scope) |
| Total perceived | ~4 – 6 s, with a 1 – 3 s "frozen 100 %" tail | ~2 – 4 s with the same tail |

### 7.2 Likely slowdown sources today

1. **The `await` in the loop** — the JS engine cannot start API #2 until API #1's promise resolves. With 7 APIs on a 500 ms-ish path this serialises ~3.5 s of latency that could overlap.
2. **TCP / HTTP-2 multiplexing is wasted** — modern browsers will happily pipeline 6+ in-flight requests; the loop prevents that.
3. **Phase-2 silent gap** — bar shows 100 %, screen still hasn't navigated. Looks like a freeze even though the kitchen-station fetch is genuinely running. Out of scope for *this* CR but mentioned for completeness; tracked in the same Phase-3 doc as "Concern B".

### 7.3 Duplicate fetches / repeated calls

**No duplicate boot fetches observed.** Each loader is called exactly once per `loadAllData` invocation. `handleRetry` only re-runs the subset of keys in ERROR state. `OrderEntry.jsx` and `DashboardPage.jsx` consume contexts, not the network.

### 7.4 One subtle pattern worth flagging (not a bug, but a sequencing artefact)

`loadProducts` mutates `data.categories` in place at L252–253 to add item-counts. If `categories` had errored earlier, `data.categories` is `undefined` and the enrichment is skipped (the `if (data.categories)` guard at L252 protects this). In a parallel design this enrichment must happen **after** both promises settle, with the same guard. Trivial to preserve.

---

## 8. Recommended Fix Plan

This is the **Option A1** plan already documented in the Phase-3 CR (`UX_LOADING_02_VISIBLE_STATION_PROGRESS.md` §3). Restating concisely against the live code:

### 8.1 The shape of the fix

Replace the single `for…of` loop at `LoadingPage.jsx:345-355` with a **two-tier flow**:

```text
Tier 1: await loadProfile(ctrl, data)
        if (ctrl.aborted) return
        if (loaderMap.profile errored) → bail to error state, do NOT start Tier 2

Tier 2: await Promise.allSettled([
          loadCategories(ctrl, data),
          loadProducts(ctrl, data),
          loadTables(ctrl, data),
          loadCancellationReasons(ctrl, data),
          loadPopularFood(ctrl, data),
          loadRunningOrders(ctrl, data),    // safe — profile already in `data`
        ])

After Tier 2 (preserved from today):
  if (data.categories && data.products) {
    data.categories = categoryService.calculateItemCounts(data.categories, data.products);
  }
  if (data.categories) setCategories(data.categories);
  if (data.products) setProducts(data.products);
  if (data.popularFood) setPopularFood(data.popularFood);
```

### 8.2 Why `Promise.allSettled` and not `Promise.all`

Each loader **already catches its own errors internally** (every `try/catch` at L186–225, L231–240, L246–260, L266–276, L282–293, L299–310, L316–331), writes `LOADING_STATES.ERROR` to its own row, and surfaces a toast. No exception ever bubbles up. `Promise.allSettled` matches that "each row owns its state" contract; `Promise.all` would short-circuit on the first rejection and lose progress visibility on the others.

### 8.3 `handleRetry` (L367–385) — compatibility

`handleRetry` calls `loadAllData({ aborted: false }, failedKeys)`. After the refactor:
- If `failedKeys` includes `profile` → run profile alone first; then conditionally run the rest in parallel.
- If `failedKeys` does NOT include `profile` → run the rest in parallel directly.
A small `keysToLoad.includes('profile')` branch in the new loader handles both cases.

### 8.4 Files to touch (single focused PR, frontend only)

| File | Change |
|---|---|
| `frontend/src/pages/LoadingPage.jsx` | Replace `loadAllData` body at L345–365 (new two-tier flow). Re-check `handleRetry` at L367–385 still works (likely a 1-line guard). |

That's it. **No other file** needs editing for Concern A.

### 8.5 Optional: tiny helper extraction (not required)

To keep `LoadingPage.jsx` flat, a tiny `runParallelLoaders(loaders, ctrl, data)` helper could live in the same file. Not mandatory.

### 8.6 What NOT to do in this CR

Carried verbatim from the Phase-3 CR (§6.5):
- ❌ No change to `/app/memory/final/*`.
- ❌ No backend ask.
- ❌ No reorder / removal of `setUserData` / `setRestaurant` / `setCrmRestaurantId` dispatch within `loadProfile`.
- ❌ No change to `LOADING_STATES`, `mkIdle`, `updateStatus` contract.
- ❌ No change to `loadedDataRef.current` shape.
- ❌ No change to `mygenie_station_view_config` semantics.
- ❌ No touch of CR-001 Fix B2 (return-to-URL) at L95–104.
- ❌ No touch of T-07 (ProtectedRoute → LoadingPage handoff).
- ❌ No removal of `[LoadingPage]` debug `console.log` lines (Issue 3d diagnostic retention still active).
- ❌ No bundling of Concern B (visible station progress) into this CR unless owner explicitly opts in to A1 + B2 / A1 + B3.

---

## 9. Regression Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Loading-state race** — two loaders racing to setState on the same key. | Very low — each loader writes a different `key` in `loadingStatus`. `updateStatus` uses functional `setLoadingStatus(prev => …)` (L176–179) which is race-safe. | None needed beyond keeping the existing functional updater. |
| **Missing restaurant id** in `runningOrders` (or any setter that reads profile) if profile loader is moved into the parallel batch. | Eliminated by keeping `profile` as a strict Tier-1 barrier. | Two-tier design enforces this. |
| **Category/product count mismatch** if enrichment runs before both arrive. | Eliminated by moving the `calculateItemCounts` line to AFTER `Promise.allSettled`, with the existing `if (data.categories && data.products)` guard. | Documented in §8.1. |
| **Settings arriving late** — `cancellationReasons` (today's only "settings" boot call) is consumed by the cancel-order modal; it's not on the critical render path. | No regression; this API arriving 200 ms later than today is invisible. | None needed. |
| **Permissions / profile defaults** consumed by setters that race the parallel batch. | None — all profile-derived setters fire inside `loadProfile` itself BEFORE Tier 2 begins. | Preserve current setter order inside `loadProfile`. |
| **Error-handling change** — today errors print in order; in parallel they may interleave. | UX-only. Each row still independently shows its ERROR state. Toast order may differ. | Acceptable. Optional: de-dup toasts. |
| **Partial API failure** — what does `handleRetry` re-run? | Same `failedKeys` filter; the new loader needs the 1-line `includes('profile')` branch. | §8.3. |
| **Abort during parallel batch** — `ctrl.aborted` check after `Promise.allSettled`. | Each loader already checks `ctrl.aborted` inside its try block (e.g. L233, L248, L268, …). Worst case: a few setters fire after unmount, which React tolerates silently because the page is gone and refs are cleared. | Existing checks are sufficient. |
| **CR-001 Fix B2 (return-to-URL)** regression. | None — that logic is in the progress-completion effect (L95–104), untouched by this CR. | Hard-refresh on `/orders/x` regression test. |
| **Batch 3A ESLint disable** at L111 may become removable. | Acceptable cleanup; not a regression. | Optional follow-up. |

---

## 10. QA Checklist

1. **Fresh POS load (cold).** Login → LoadingPage → all 7 rows reach ✅ → navigate to `/dashboard`. Wall-clock should drop from ~3.5 s to ~1 s on a typical-latency connection.
2. **Reload (warm).** Same flow but with HTTP cache primed. No double-fire of any endpoint.
3. **Slow-network (DevTools throttle Slow 3G).** All 6 Tier-2 rows light up "loading" simultaneously and complete out of order. No hang. Bar advances as each settles.
4. **One API failure (e.g. simulate 500 on `/popularFood`).** Only that row goes ERROR; the others reach SUCCESS; `handleRetry` button appears; clicking it re-runs only the failed key.
5. **`profile` API failure.** Tier 1 fails → Tier 2 must NOT start. Existing error UI shows; retry re-runs profile + (if profile succeeds on retry) Tier 2 in parallel.
6. **Restaurant switch.** Not applicable today (single-tenant per session) — flag confirmed in Phase-3 doc.
7. **Product / category display.** Dashboard and OrderEntry render menu correctly; item-count badges per category are populated (proves enrichment ran post-Promise.allSettled).
8. **Settings / profile values.** Restaurant settings, cancellation reasons, role permissions all available downstream.
9. **Order placement after load.** OrderEntry can place a new order — proves `tables`, `products`, `categories`, `profile` all reached their contexts.
10. **No duplicate calls.** DevTools Network panel shows exactly 7 boot requests on the LoadingPage (plus N station requests in Phase 2).
11. **DevTools timeline** confirms 6 parallel requests in Tier 2 (waterfall starts at near-identical timestamps).
12. **Console logs.** `[LoadingPage] User Profile:` still prints first (profile is still the barrier). Other `[LoadingPage]` debug lines interleave — acceptable.
13. **Abort during load.** Rapid logout or navigate-away during Tier 2 → no React "setState on unmounted" warnings; `ctrl.aborted` short-circuits each loader.
14. **CR-001 Fix B2 regression.** Hard-refresh on `/orders/123` → LoadingPage → land back on `/orders/123`, not `/dashboard`.
15. **`handleRetry` after partial failure** re-runs only failed keys; no regression of the existing retry contract.

---

## 11. Open Questions

1. **Option pick.** Phase-3 doc offers **A1 (full parallel after profile)**, A2 (tiered), A3 (no change). Recommend **A1**. Owner sign-off required.
2. **Concern B bundling.** Should this CR address Phase 2 silent gap as well (B1 / B2 / B3 from the same Phase-3 doc), or keep parallelisation as a single-purpose CR? Recommend keeping them separable (smaller PRs); ship A1 first, then a follow-up CR for Concern B.
3. **`Promise.all` vs `Promise.allSettled`.** Recommendation is `allSettled` (each loader already owns its error state). Confirm.
4. **Toast avalanche on broken network.** When 6 calls fail simultaneously, 6 toasts fire. Acceptable, or should toasts coalesce ("Some data failed to load")? Phase-3 doc flags this as a minor polish, not a blocker.
5. **Telemetry.** Should we instrument `window.performance.now()` deltas in Phase 1 to validate the speed-up in production telemetry? Optional.
6. **`API_LOADING_ORDER` semantics.** After parallelisation, the "order" in the constant becomes informational (only used by the visible rows list and by `handleRetry`). Keep it as a display-order ranking? Recommend yes — it's still the canonical list of boot keys.
7. **Concern B follow-up** to remove the "frozen 100 %" Phase 2 gap — addressable in a separate CR but worth deciding together because users will perceive the 1–3 s station tail more sharply once Phase 1 is fast.

---

— End of investigation.
