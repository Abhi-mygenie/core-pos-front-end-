# POS Boot API Parallelization — FIX REPORT

> CR: `pos_boot_api_parallelization` — **Option A1 (full parallel after profile)**
> Date: 2026-05-15
> Companion to: `POS_BOOT_API_PARALLELIZATION_INVESTIGATION.md`

---

## 1. Scope honoured

Only `/app/frontend/src/pages/LoadingPage.jsx` modified. No other file touched. Out-of-scope items confirmed NOT included:

- ❌ Phase-2 station visible progress (Concern B) — untouched.
- ❌ Toast coalescing — untouched (each loader still owns its toast).
- ❌ Telemetry / `performance.now()` — not added.
- ❌ Backend — untouched.
- ❌ Context APIs (`useAuth` / `useRestaurant` / `useMenu` / `useTables` / `useSettings` / `useOrders` / `useStations`) — untouched.
- ❌ `OrderEntry.jsx` — untouched.
- ❌ VAT / service-charge / tip / delivery-charge / dashboard — untouched.

---

## 2. Files changed

| File | Diff |
|---|---|
| `frontend/src/pages/LoadingPage.jsx` | **+51 / −7 lines** (single hunk replacement of `loadAllData` + 4-line inline-enrichment removal from `loadProducts`) |

`git diff --stat`:
```
 frontend/src/pages/LoadingPage.jsx | 58 ++++++++++++++++++++++++++++++++-----
 1 file changed, 51 insertions(+), 7 deletions(-)
```

---

## 3. Final load sequence

### Tier 1 — barrier (sequential)
1. **`profile`** — `profileService.getProfile()`. Populates `user`, `permissions`, `restaurant`, `crmRestaurantId` via `setUserData` / `setRestaurant` / `setCrmRestaurantId` (inside `loadProfile`, unchanged).

### Tier 2 — parallel via `Promise.allSettled` (6 calls, fire simultaneously)
2. **`categories`** — `categoryService.getCategories()`
3. **`products`** — `productService.getProducts(...)`
4. **`tables`** — `tableService.getTables()` (also calls `setTables` inside loader, unchanged)
5. **`cancellationReasons`** — `settingsService.getCancellationReasons(...)` (also calls `setCancellationReasons`)
6. **`popularFood`** — `productService.getPopularFood(...)`
7. **`runningOrders`** — `orderService.getRunningOrders(roleParam)` (reads `data.profile.permissions[0]` — safe because Tier 1 already populated it; also calls `setOrders`)

### Post-batch (synchronous, after `Promise.allSettled` resolves)
- **Category↔Product enrichment** (relocated from inside `loadProducts`): if both `data.categories` and `data.products` exist, run `categoryService.calculateItemCounts(data.categories, data.products)` and reassign back to `data.categories`.
- **Menu-context fan-out:** `setCategories(...)`, `setProducts(...)`, `setPopularFood(...)`.
- `loadedDataRef.current = data`.

Phase-2 `loadStationData()` is then dispatched by the existing progress effect (L92, unchanged) — out of this CR's scope.

---

## 4. Profile remains first — confirmed

`LoadingPage.jsx` L375–379:
```js
if (keysToLoad.includes('profile')) {
  if (ctrl.aborted) return;
  await loadProfile(ctrl, data);
  if (ctrl.aborted) return;
}
```

`profile` is awaited **before** any element of the Tier-2 batch is constructed. The Tier-2 array (L382–386) explicitly filters out `'profile'`, so it cannot accidentally re-enter the parallel batch:
```js
const parallelKeys = keysToLoad.filter(k => k !== 'profile');
```

Downstream consumers of profile data — most notably `loadRunningOrders` reading `data.profile.permissions[0]` (L323) — are guaranteed to see it because they're only invoked inside Tier 2.

---

## 5. Remaining APIs run in parallel — confirmed

`LoadingPage.jsx` L381–390:
```js
const parallelKeys = keysToLoad.filter(k => k !== 'profile');
const parallelLoaders = parallelKeys
  .map(key => loaderMap[key])
  .filter(Boolean)
  .map(loader => loader(ctrl, data));

if (parallelLoaders.length > 0) {
  await Promise.allSettled(parallelLoaders);
}
```

The `.map(loader => loader(ctrl, data))` step **invokes each loader synchronously**, kicking off all 6 promises before `Promise.allSettled` is awaited. The JS event loop will issue all 6 HTTP requests on the next microtask, so the browser sees ~6 concurrent in-flight requests (subject only to the browser's per-origin connection limit, which is ≥6 for HTTP/1.1 and effectively unlimited under HTTP/2).

Expected wall-clock for Phase 1: roughly `t(profile) + max(t(categories), t(products), t(tables), t(cancellationReasons), t(popularFood), t(runningOrders))` ≈ ~1 s on a typical preprod connection, down from ~3–3.5 s today.

---

## 6. Error handling preserved — confirmed

Each loader retains its **own** `try/catch` block, its **own** `updateStatus(key, LOADING_STATES.ERROR, ...)` call, and its **own** `toast({title, description, variant: 'destructive'})` invocation. No loader's body was modified beyond the 4-line removal of the inline enrichment in `loadProducts` (lines L252-254 in pre-fix → replaced by a comment explaining the move).

`Promise.allSettled` was chosen over `Promise.all` precisely so that a rejection in any one loader does **not** short-circuit the others. Because every loader's `try/catch` catches its own error and resolves the outer promise normally, in practice `allSettled` will see all promises as `fulfilled` even on backend failures — but `allSettled` is still the correct contract-matching choice (defensive against any future loader that might rethrow).

`handleRetry` (L370–387, unchanged) re-enters `loadAllData` with the failed-key subset. The new `loadAllData`:
- If `profile` is in the failed subset → re-runs it as Tier 1.
- The remaining failed keys → re-run in parallel as Tier 2.
- If only `profile` failed and is being retried alone, Tier 2 is empty (`parallelLoaders.length === 0`) and the `Promise.allSettled` step is skipped.
- If only non-profile keys failed, Tier 1 is skipped entirely (the `if (keysToLoad.includes('profile'))` guard).

`ctrl.aborted` is honoured both **before** Tier 1 and **after** Tier 2 (L376, L378, L392), matching the original loop's abort behaviour.

---

## 7. Category / Product enrichment still works — confirmed

The `categoryService.calculateItemCounts(categories, products)` call was moved from L252–254 (inside `loadProducts`) to L399–401 (inside `loadAllData`, after `Promise.allSettled`).

Three properties of the new placement:

1. **Race-safe.** It only executes after BOTH `data.categories` and `data.products` have settled. The old placement ran inside `loadProducts` and only worked because `loadCategories` had previously been sequenced before `loadProducts` — that guarantee is gone under parallel fetch, hence the relocation.

2. **Partial-failure-safe.** Guarded by `if (data.categories && data.products) { ... }`. If either side errored on this run **and** was not loaded on a previous run, the enrichment is skipped — same defensive shape as the prior `if (data.categories)` guard.

3. **Retry-safe.** Because `loadedDataRef.current` survives across retries, a successful prior `categories` load combined with a successful retry of `products` will still result in an enriched `data.categories` on the retry's post-batch step. Same logic applies to the inverse case.

The enriched `data.categories` is then dispatched via `setCategories(data.categories)` on L404, unchanged from before — so the dashboard's per-category item-count badges continue to render exactly as today.

---

## 8. QA / check results

| Check | Result |
|---|---|
| ESLint on `LoadingPage.jsx` | ✅ **No issues found** |
| Webpack hot-recompile after edit | ✅ `Compiled successfully` (3 successive recompiles, all green) |
| Single-file scope (no scope creep) | ✅ `git diff --stat` → only `LoadingPage.jsx` modified |
| Profile barrier preserved | ✅ Awaited before Tier 2 array is constructed |
| Tier 2 truly parallel (6 concurrent calls) | ✅ All 6 loader invocations issued synchronously inside the `.map` before `Promise.allSettled` awaits |
| `Promise.allSettled` (not `Promise.all`) | ✅ Defensive against future loader changes |
| Per-loader try/catch + toast + ERROR status | ✅ Untouched in every loader body |
| Category/product enrichment runs post-batch | ✅ Moved to L399–401 with both-arrays guard |
| `handleRetry` two-tier semantics | ✅ Same `loadAllData` entry; Tier 1 skipped if `profile` not in failed keys, Tier 2 skipped if empty |
| `ctrl.aborted` honoured | ✅ Checked before Tier 1, after Tier 1, and after Tier 2 |
| CR-001 Fix B2 (return-to-URL) | ✅ Untouched (lives in the progress-completion effect, L95–104) |
| T-07 ProtectedRoute → LoadingPage contract | ✅ Untouched |
| `loadedDataRef.current` shape | ✅ Untouched |
| `LOADING_STATES` / `mkIdle` / `updateStatus` contract | ✅ Untouched |
| Setter order inside `loadProfile` | ✅ Untouched |
| `[LoadingPage]` debug `console.log` lines (Issue 3d diagnostic retention) | ✅ All retained |
| `mygenie_station_view_config` localStorage semantics | ✅ Untouched |
| `API_LOADING_ORDER` constant | ✅ Untouched (still used for the visible rows list and as the default `keysToLoad`) |

**Expected runtime improvement** (subject to live preprod verification): Phase-1 wall-clock from ~3–3.5 s to ~1 s on typical broadband (~60–70 % reduction). Phase-2 silent-tail unchanged (out of scope; see Concern B).

---

## 9. Risks accepted

Inherited from the investigation §9 — all mitigated:

- **Loading-state race:** none. `updateStatus` uses the functional `setLoadingStatus(prev => ...)` (L177–179) which is race-safe; each loader writes a distinct key.
- **Missing restaurant id:** eliminated by Tier-1 barrier.
- **Category/product mismatch:** eliminated by post-batch enrichment with both-arrays guard.
- **Settings late arrival:** acceptable; cancellation reasons are not on the critical render path.
- **Permissions / profile defaults:** preserved; all profile-derived setters fire inside `loadProfile` BEFORE Tier 2.
- **Partial API failure:** preserved; per-loader toasts + ERROR rows; `handleRetry` honours two-tier shape.
- **Abort during load:** preserved; checks before/after Tier 1 and after Tier 2.
- **Toast avalanche on broken network:** acceptable (out of scope per directive); 6 toasts may fire near-simultaneously on a fully broken backend.

---

## 10. What's NOT in this commit

Per directive:

- No Phase-2 station visible progress (Concern B).
- No toast coalescing.
- No telemetry / `performance.now()` instrumentation.
- No new tests.
- No commits.
- No backend / context / OrderEntry / dashboard / VAT / SC / tip / delivery-charge changes.

The working tree contains the single-file change ready for review. `git status` shows `frontend/src/pages/LoadingPage.jsx` modified.

— End of fix report.
