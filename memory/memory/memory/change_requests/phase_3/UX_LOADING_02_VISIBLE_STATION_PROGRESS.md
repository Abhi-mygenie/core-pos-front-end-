# UX-LOADING-02 — Parallel API Loading + Visible Station-Load Progress

**Phase:** 3 (post-sprint UX + performance improvement)
**Type:** UX / quality-of-life + latency reduction
**Raised:** 2026-05-04 (owner observations during Batch 3A review)
**Status:** `needs_owner_decision` — plan ready; awaiting option pick + go
**Risk:** Low-medium (hotspot file `LoadingPage.jsx`; protected surface: CR-001 Fix B2 return-to-URL logic)
**Scope:** Frontend only. No backend. No baseline change.

---

## 1. Two concerns in one CR

Both issues sit in the same file (`LoadingPage.jsx`) and share the same progress-bar machinery. Bundling them saves one round-trip of planning / QA / approval, but they can still be implemented as two separable commits inside this CR if owner prefers.

### Concern A — **Parallel API loading** (performance)

At `LoadingPage.jsx:345-355`, the 7 main APIs run **strictly sequentially** (literal comment in source: `// Load all APIs in sequence`):

```js
for (const key of keysToLoad) {
  if (ctrl.aborted) return;
  const loader = loaderMap[key];
  if (loader) await loader(ctrl, data);   // awaits each → next cannot start
}
```

Only two real dependencies exist:
- `profile` must finish first (provides `roleName` → used by `runningOrders`; `user` + `restaurant` state consumed downstream; CRM restaurant id set at L217-219).
- `products` must finish before Phase 2 `loadStationData()` (already enforced by Phase 1/2 split).

Everything else is independent. Running the independent 6 in parallel after `profile` completes yields a rough **~60–70% reduction in Phase 1 latency** (from ~3.5 s typical → ~1 s typical, assuming ~500 ms per API).

### Concern B — **Visible station-load progress** (UX)

At `LoadingPage.jsx:91-106`, `loadStationData()` runs **silently in Phase 2** after the main bar hits 100%. Users experience a 1–3 second "is it frozen?" gap where the bar is full but the screen hasn't navigated. The station-loading itself already uses `Promise.all` internally (L155), but its existence is invisible to the user.

Owner feedback (2026-05-04):
> *"Why don't we load station as a progress bar like other API calls — isn't this a better way?"*

Agreed. The silent gap is a UX bug even though the underlying code works.

---

## 2. Why the current design exists (and why it's fixable)

### 2.1 Sequential-by-default isn't intentional; it's a safer default
The original `loadAllData` was probably written sequentially to:
- guarantee ordered console/toast output on errors
- avoid race conditions on `data.*` shared-ref mutations (currently every loader writes to `loadedDataRef.current` — safe as long as they don't collide on the same key)
- simplify retry logic (`handleRetry` at L368-385 re-runs failed keys in order)

None of these prevent parallelisation — they just mean the refactor needs to preserve ordering guarantees in error / retry paths.

### 2.2 Station-loading is Phase 2 because it's derived
- Station count is unknown until products load (L120 `stationService.extractUniqueStations(products)`)
- Progress-bar math requires a fixed `total` upfront
- Phase 2 is deliberately skipped on Phase 1 error (`hasAnyError === true`)
- `savedConfig.enabled === false` short-circuits Phase 2 entirely

All four constraints stay valid — the UX fix just needs to make Phase 2 **visibly tracked** rather than silent.

---

## 3. Option pick — Concern A (parallelisation)

### Option A1 — **Full parallel after profile** (recommended for A)

```js
// Pseudo-sketch:
await loadProfile(ctrl, data);                          // barrier
if (ctrl.aborted) return;
await Promise.all([                                     // parallel batch
  loadCategories(ctrl, data),
  loadProducts(ctrl, data),
  loadTables(ctrl, data),
  loadCancellationReasons(ctrl, data),
  loadPopularFood(ctrl, data),
  loadRunningOrders(ctrl, data),                        // uses profile.roleName ✓
]);
```

Benefits: maximum concurrency, minimal code change. Each loader is already self-contained (sets its own `updateStatus`, catches its own errors, pushes its own toast).

Considerations:
- Use `Promise.all` vs `Promise.allSettled` — `Promise.all` rejects fast on first error; `Promise.allSettled` runs all to completion even if some fail. **`Promise.allSettled` is the correct pick** because each loader already handles its own errors internally (via try/catch at the loader level) and writes `LOADING_STATES.ERROR` to its row — no exception bubbles up. Using `allSettled` defensively matches the existing "every row renders its own state" contract and plays well with `handleRetry` which expects any subset of rows to be in ERROR state.
- Toast avalanche risk: if network is truly broken, 6 toasts fire near-simultaneously. Mitigation: de-dup on identical toast message, or gate toasts on first error only. Small UX polish, not a blocker.
- Console-log ordering: `[LoadingPage] User Profile:` at L193 + subsequent DEBUG logs will interleave with the parallel batch. Acceptable; the profile log stays first because profile is still serialised.

### Option A2 — **Tiered parallel** (more conservative)

Define dependency tiers explicitly:
```js
Tier 1 (barrier):  [profile]
Tier 2 (parallel): [categories, products, tables, cancellationReasons, popularFood]
Tier 3 (parallel): [runningOrders]    // after profile (already in Tier 2 scope though)
```

Only marginally different from A1 in practice (runningOrders doesn't depend on anything in Tier 2). Recommend A1 unless a future dependency emerges.

### Option A3 — **Leave sequential; no change**

Do nothing on Concern A. Only address Concern B.

---

## 4. Option pick — Concern B (visible station progress)

*(unchanged from initial draft)*

### Option B1 — Two-stage progress bar (0→80% Phase 1, 80→100% Phase 2)
Smooth single bar, arbitrary 80/20 split. ~1.5 hr.

### Option B2 — **Dynamic row-per-station in the status list** ⭐ (recommended for B)
After products load, push N rows into `loadingStatus` (one per station). Each resolves ⏳→✅. ~2.5–3 hr.

### Option B3 — Spinner + label after Phase 1
"Setting up your kitchen stations…" spinner replaces the bar. ~50 min.

---

## 5. Recommended combined pick

| Combo | What you get | Effort | Risk |
|---|---|---|---|
| **A1 + B2** ⭐ | Fast login (~1 s Phase 1) + transparent station-by-station progress. "Right" answer. | ~3–4 hr | Low-medium |
| **A1 + B3** | Fast login + honest "setting up stations" spinner. Lightweight. | ~1.5–2 hr | Low |
| **A1 only** | Fast login, silent Phase 2 unchanged. | ~1 hr | Low |
| **A3 + B2** | Slow login but transparent progress throughout. | ~2.5–3 hr | Low-medium |
| **A3 + B3** | Slow login + Phase 2 spinner. Minimal change. | ~50 min | Very low |

**My recommendation: A1 + B2** if dev time available. **A1 + B3** is the best cost/value ratio.

---

## 6. Impact analysis (preliminary — full impact doc authored only after owner picks)

### 6.1 Files likely touched (Concern A)
- `/app/frontend/src/pages/LoadingPage.jsx` L345-355 (`loadAllData`) + L368-385 (`handleRetry` — verify retry still works with parallel batch)

### 6.2 Files likely touched (Concern B, depending on option)
- `/app/frontend/src/pages/LoadingPage.jsx` (primary)
- `/app/frontend/src/contexts/LoadingContext.jsx` or equivalent `useLoadingStatus` hook — only if B2 (dynamic row addition)

### 6.3 Baseline guardrails (both concerns)
- **FA-03 hotspot rule:** LoadingPage is hotspot. Single focused PR. Before/after screenshots + login-time measurements in QA.
- **CR-001 Fix B2:** return-to-URL logic at L99-104 (`location.state?.returnTo`) MUST remain untouched.
- **T-07 auth handoff:** ProtectedRoute → LoadingPage contract MUST remain untouched.
- **Batch 3A ESLint disable at L111:** may become removable after the refactor if `loadStationData` ends up wrapped in `useCallback`. Acceptable collateral.
- **API-02 transform-mediated payloads:** each loader already routes through service → transform. No change.
- **Module 11 (Status/Preferences):** `mygenie_station_view_config` localStorage read at L131 — untouched.
- **Order of `setUserData` / `setRestaurant` / `setCrmRestaurantId` / `setCategories` / `setProducts` / `setPopularFood`:** must remain profile-first, others any-order. Currently OK because parallel batch only runs after profile completes.

### 6.4 Accepted sprint behaviour that must be preserved
- All CR-001 status/tab/filter/export behaviour — preserved (Menu context dispatched at L359-362 still happens at end)
- CR-003 payment-method row-actions — preserved
- CR-004 Phase 1 + Phase 2 A/B/C — preserved
- CR-005 #1 / B2-split Phase 1 — preserved
- CR-006 A1 + B1 + FO-B1-01 — preserved
- CR-007 A2 merge/shift — preserved
- CR-008 Sub-CR #1 + #4 Phase A — preserved (stay-on-order-entry nonce in DashboardPage, not LoadingPage)
- A0a / A0b / Batch 1 / Batch 2 / Batch 3A resolutions — preserved
- `handleRetry` at L368-385 — must continue to work identically for failed-key re-run

### 6.5 What must NOT be done in this CR
- ❌ No change to `/app/memory/final/*`
- ❌ No new backend ask
- ❌ No change to `mygenie_station_view_config` semantics
- ❌ No unparking of any parked item
- ❌ No removal of `[LoadingPage]` debug console.log lines (Issue 3d diagnostic retention still active per L203-214 comment)
- ❌ No reordering of `setUserData` / `setRestaurant` / CRM-restaurant-id dispatch relative to other setters
- ❌ No change to `loadedDataRef.current` shape
- ❌ No change to `LOADING_STATES` / `mkIdle()` / `updateStatus` contract — only the calling pattern

---

## 7. Test plan (to be drafted after option pick)

Minimum verification:
1. Timing measurement — login on a typical restaurant, measure `window.performance.now()` delta from LoadingPage mount → dashboard navigation. Before vs after. Expect ≥50% reduction if A1 picked.
2. Manual smoke — fresh login on small restaurant (1-2 stations) and large restaurant (5+ stations). Progress bar should fill visibly in both cases.
3. Error handling — disconnect network after profile loads. Expect parallel batch to surface multiple ERROR rows; `handleRetry` to re-run only failed keys; eventual success.
4. Edge case — `savedConfig.enabled === false` → Phase 2 cleanly skipped.
5. Edge case — restaurant with 0 stations → no hang, proceeds to dashboard.
6. CR-001 Fix B2 regression — hard-refresh on `/orders/x` → LoadingPage → must return to `/orders/x` not `/dashboard`.
7. Auth barrier — `/profile` 401 → LoadingPage should still route through existing auth-error handling, not hang.
8. DevTools Network timeline — after A1, verify 6 parallel requests instead of 6 sequential.
9. DevTools Console — verify profile debug logs still print first (profile is still barrier).
10. Rapid logout during load — abort controller still honoured (L64 `ctrl.aborted`).

Runtime QA addendum on preprod once preprod wakes.

---

## 8. Estimated effort (combined)

| Combo | Impl | QA | Total |
|---|---|---|---|
| A1 + B2 | ~3 hr | ~1 hr | ~4 hr |
| A1 + B3 | ~1.5 hr | ~30 min | ~2 hr |
| A1 only | ~45 min | ~20 min | ~1 hr |
| A1 + B1 | ~2 hr | ~45 min | ~3 hr |

---

## 9. Dependencies

- None on backend (fully frontend).
- Independent of Batch 3B (paymentService CLEAR_BILL) and Batch 3C (TEST-INFRA-001).
- Can run before or after Batch 3B/3C — no ordering constraint.
- Batch 3A ESLint disable at `LoadingPage.jsx:111` may be redundant after this CR — if so, remove as part of this CR's cleanup.

---

## 10. Approval gate

> **Owner, please confirm:**
> 1. **Concern A (parallel API loading)** — pick A1 (recommended), A2, or A3 (skip)
> 2. **Concern B (visible station progress)** — pick B1, B2 (recommended), B3, or skip
> 3. **Ordering** — implement both in one commit, or split into two sequential commits within this CR?
>
> On approval, next agent will produce full impact-analysis doc + implementation plan in this folder (`UX_LOADING_02_IMPACT_ANALYSIS.md` + `UX_LOADING_02_IMPLEMENTATION_PLAN.md`) and seek a second gate before code edit.

---

## 11. Change log

| Date | Change | Author |
|---|---|---|
| 2026-05-04 | CR opened as Phase 3 item; 3 station-progress options (B1/B2/B3) drafted | Combined Hygiene Agent (Batch 3A side-observation) |
| 2026-05-04 | Concern A (parallelisation) added after owner observation that APIs are sequential; CR retitled; A1/A2/A3 options + combined recommendations table added | Combined Hygiene Agent (Batch 3A side-observation #2) |
