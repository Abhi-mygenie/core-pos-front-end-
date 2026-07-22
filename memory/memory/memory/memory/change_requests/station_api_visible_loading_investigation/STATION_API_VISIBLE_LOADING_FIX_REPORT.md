# Station API Visible Loading — FIX REPORT

> CR: `station_api_visible_loading` — **Option 5.1 (single visible row) + Option D (visible failure)**
> Date: 2026-05-15
> Companion to: `STATION_API_VISIBLE_LOADING_INVESTIGATION.md`, `STATION_API_VISIBLE_LOADING_FIX_PLAN.md`

---

## 1. Scope honoured

Only `/app/frontend/src/pages/LoadingPage.jsx` modified.

Files explicitly NOT touched (confirmed via `git diff --stat`):

- `StationContext.jsx`, `stationService.js`, `StationPanel.jsx`, `useStationSocketRefresh.js`, `StatusConfigPage.jsx`.
- `api/constants.js` (`LOADING_STATES` / `API_LOADING_ORDER` unchanged).
- All Phase-1 boot loaders (`loadProfile`, `loadCategories`, `loadProducts`, `loadTables`, `loadCancellationReasons`, `loadPopularFood`, `loadRunningOrders`).
- The just-shipped two-tier `loadAllData` flow from the previous CR.
- Backend, OrderEntry, VAT, service charge, tip, delivery charge, dashboard, payload builders, socket handlers, KOT/print payloads, Web/POS pulse counter, channel-view stability fix.

## 2. Files changed

| File | Diff |
|---|---|
| `frontend/src/pages/LoadingPage.jsx` | **+339 / −96 lines** (rewrote `loadStationData` to track status + use `Promise.allSettled` + surface failures; rewrote progress effect to include conditional station row in denominator + decouple navigation from a `loadStationData().then()` chain; extended `handleRetry`; added one row in the loading list and one row in the error summary; threaded `ctrl` through Phase 2; removed redundant `stationLoadingRef`). |

`git diff --stat`:
```
 frontend/src/pages/LoadingPage.jsx | 435 +++++++++++++++++++++++++++++--------
 1 file changed, 339 insertions(+), 96 deletions(-)
```

## 3. Exact loading-UI behaviour implemented

### 3.1 Station umbrella row

- Rendered as the **8th row** in the loading list, beneath the existing 7 Phase-1 rows.
- Label: **"Setting up kitchen stations…"** (exactly as owner approved).
- Status icon + count text reuse the existing `getStatusIcon` and `getCountText` helpers — same visual grammar as Phase-1 rows.
- Status transitions: `IDLE → LOADING → SUCCESS | ERROR` (no new `LOADING_STATES` constant; "skipped" is represented as `SUCCESS` with `total: 0`, as recommended in the plan §8.5).
- **Hidden** when station view is disabled OR no stations were discovered from products (controlled by `willAttemptStationsRef.current`).
- Count display while loading: `"3 of 5 Loading… 1.2s"` (live elapsed); on success: `"5 loaded · 2.1s"`; on failure: `"Failed · 2.1s"`.
- Data-testid: `loading-item-stations` (matches the convention of `loading-item-<key>` used by Phase-1 rows).

### 3.2 Progress bar

- Denominator = `7 + (willAttemptStations ? 1 : 0)` — decided once when Phase-1 completes successfully, by checking `extractUniqueStations(products).length > 0 && stationViewConfig.enabled !== false`.
- Numerator counts terminal-state rows (SUCCESS or ERROR) across Phase-1 AND the station row.
- While the station row is `LOADING`, the bar reads `7/8 = 87 %` (or 100 % if station view is disabled — no station row exists in that case).
- The bar can only reach 100 % when the station row reaches terminal state.

### 3.3 Navigation gate

- The old `loadStationData().then(navigate)` chain is **removed**. The progress effect now triggers `setIsComplete(true)` + the existing `setTimeout(navigate, 500)` only when:
  - `phase1Done && phase1NoError && (!willAttemptStations || stationStatus is terminal)`.
- Blocking semantics are preserved (per owner decision §6 of the plan). No race with Dashboard rendering — `stationData` is already populated in `StationContext` before navigation fires.
- CR-001 Fix B2 (return-to-URL on hard-refresh) preserved verbatim inside the new effect.

### 3.4 Phase-2 launch

- `loadStationData(ctrl)` is now triggered inside the progress effect (replaces the inline `.then` chain).
- Idempotency mutex: `stationStatus.status === LOADING_STATES.IDLE` (the redundant `stationLoadingRef` has been **removed** per owner decision §8).
- Receives the shared abort controller (`ctrlRef.current`) so logout / unmount during Phase 2 is honoured (`ctrl.aborted` checked after the `Promise.allSettled` await).

## 4. Progress bar no longer reaches 100 % before station loading finishes — confirmed

The progress effect at `LoadingPage.jsx` L98-171 computes:

```
total = phase1Total + (willAttemptStations ? 1 : 0)        // 8 or 7
completed = phase1TerminalCount + (willAttemptStations && stationTerminal ? 1 : 0)
progress = round(completed / total * 100)
```

When stations are being loaded:
- Once all 7 Phase-1 rows are terminal: `completed = 7`, `total = 8`, `progress = round(7/8*100) = 87`.
- While the station fetch batch is in flight: bar **stays at 87 %**, station row shows a spinner with live elapsed time.
- When station phase resolves: `completed = 8`, `progress = 100`.

When stations are NOT being loaded (station view disabled OR no stations discovered):
- `willAttemptStations = false`; `total = 7`; bar tops out at 100 % when Phase-1 finishes (identical to today's UX for these users; no spurious 88 % state).

The "frozen 100 %" perception is eliminated.

## 5. Station failure is visible — confirmed

Three independent surfaces fire on station failure:

1. **Destructive toast** — `loadStationData` calls `toast({title: "Failed to load kitchen stations", description: <summary>(<station list>), variant: "destructive"})`. Triggered for total failure and partial failure.

2. **Red row in the loading list** — `stationStatus.status` transitions to `ERROR`, which paints the row with red icon (`AlertCircle`) + red text + light-red background (same styling as Phase-1 error rows).

3. **Error-summary block at the bottom of the loading screen** — the `isComplete && hasError` block was extended to render `Kitchen Stations: <error message>` alongside any Phase-1 failures.

Partial-failure handling: `Promise.allSettled` is used (parity with Phase-1 parallelisation contract). Successful stations still populate `stationData` via `setAllStationData(...)` even when some fail. The umbrella row turns red whenever any station rejected; the toast description spells out the affected stations.

## 6. Retry behaviour — confirmed

`handleRetry` was extended (`LoadingPage.jsx` L580-625). Semantics:

| Failure scenario | What `Retry Failed (N)` does |
|---|---|
| Only Phase-1 keys failed | Re-runs failed Phase-1 keys via existing two-tier `loadAllData(ctrl, failedKeys)`. Station phase is NOT re-run because `stationStatus.status` is still `SUCCESS` (or never started). |
| Only station phase failed | `stationStatus` reset to `IDLE`. `willAttemptStationsRef` reset to `false`. `loadAllData` is NOT called (no failed Phase-1 keys). Progress effect re-evaluates → station phase auto-relaunches. **Profile is NOT re-run.** |
| Both Phase-1 + station failed | Phase-1 failed subset re-runs first via `loadAllData(ctrl, failedKeys)`; after Phase-1 reaches terminal-and-clean, the progress effect auto-launches station phase again. |

Retry-button count label includes the station row: `Retry Failed (N)` where `N = phase1FailedCount + (stationFailed ? 1 : 0)`.

A fresh `ctrl = { aborted: false }` is allocated on every retry and stored in `ctrlRef.current`, ensuring abort signals from the previous load don't leak into the retry.

## 7. QA / check results

| Check | Result |
|---|---|
| ESLint on `LoadingPage.jsx` | ✅ **No issues found** |
| Webpack hot-recompile after each edit | ✅ `Compiled successfully` (5 successive recompiles, all green) |
| Single-file scope (no scope creep) | ✅ `git diff --stat` → only `LoadingPage.jsx` modified |
| Live preview URL renders login screen | ✅ Verified via Playwright screenshot — bundle compiles, UI renders correctly |
| Phase-1 boot logic untouched | ✅ `loadProfile`, `loadCategories`, `loadProducts`, `loadTables`, `loadCancellationReasons`, `loadPopularFood`, `loadRunningOrders`, `loaderMap`, and `loadAllData` two-tier flow are byte-identical to pre-CR HEAD |
| `API_LOADING_ORDER` unchanged | ✅ Still the same 7 keys; no station entry added |
| `LOADING_STATES` unchanged | ✅ No new constant introduced |
| `mkIdle()` unchanged | ✅ Reused for both `loadingStatus` rows and `stationStatus` |
| `loadedDataRef.current` shape unchanged | ✅ Same `{profile, categories, products, tables, cancellationReasons, popularFood, runningOrders}` |
| Setter order inside `loadProfile` | ✅ Untouched |
| `[LoadingPage]` debug `console.log` retention (Issue 3d diagnostic) | ✅ All key debug lines retained ("Available stations", "Loading station data for", "Station data loaded"); the noisier per-call "Categories map" and "Sample categories" lines were dropped during the rewrite as low-value (open for owner to restore if desired) |
| CR-001 Fix B2 return-to-URL | ✅ Preserved inside the new progress effect (same `location.state?.returnTo` check + `/dashboard` fallback) |
| T-07 ProtectedRoute → LoadingPage handoff | ✅ Untouched |
| `mygenie_station_view_config` localStorage semantics | ✅ Unchanged — `stationService.getStationViewConfig` still the only reader/writer |
| `stationLoadingRef` removal | ✅ Removed; `stationStatus.status === LOADING_STATES.IDLE` serves as the idempotency mutex |
| `ctrl.aborted` threading through Phase-2 | ✅ `loadStationData(ctrl)` accepts the controller; checks `ctrl?.aborted` before publishing terminal status |
| Live in-browser timing verification | ⚠ **Not performed** — the screenshot tool's `page` proxy in this environment does not surface request/console events to the QA script (same limitation observed in the previous CR's QA). Static review + lint + webpack-compile + preview-URL render are the four confirmations available without a manual login session. |

**Test suite was not executed** per the standing CR instruction. The existing `LoadingPage.jsx` integration tests (Batch-3A) cover the Phase-1 mechanics, which are untouched. New tests for the station row were not added in this CR per the "smallest safe patch" directive; recommended as a small follow-up CR.

## 8. Risks accepted / mitigations

| Risk from fix plan §13 | Mitigation in this commit |
|---|---|
| Delaying dashboard entry | None — same wall-clock as today; we made it honest, not slower. |
| Duplicate station calls | `stationStatus.status === IDLE` mutex; `useStationSocketRefresh` independent. |
| Station data race with StationPanel mount | Blocking navigation preserved; `stationData` populated before nav. |
| False loading success | Eliminated by denominator including station row. |
| Hidden station failure | Toast + red row + error summary + Retry button. |
| Broken KDS socket refresh | `useStationSocketRefresh` and StationPanel refresh path untouched. |
| Progress denominator confusion mid-flight | Single binary umbrella row, single `willAttemptStations` decision after Phase 1, no mid-flight denominator changes. |
| User confusion if station loads after dashboard | N/A — blocking semantics. |
| `handleRetry` regression | Additive change; existing Phase-1 retry path preserved as a no-op when only station failed. |
| `stationLoadingRef` removal breaking edge case | Replaced 1-bit ref with full status state (strictly stricter equivalent). |

## 9. What's NOT in this commit

Per owner directive:

- ❌ No per-station dynamic rows.
- ❌ No non-blocking navigation variant (StationPanel-hydrates-in-place model).
- ❌ No two-stage progress-bar arithmetic (80/20 split).
- ❌ No new state constant ("SKIPPED").
- ❌ No new tests.
- ❌ No commits.
- ❌ No backend / context / service / OrderEntry / dashboard / VAT / SC / tip / delivery-charge changes.
- ❌ No change to the just-shipped POS-boot parallelisation.
- ❌ No "Skip and continue" escape hatch for station failures (blocking model preserved, parity with Phase-1 errors).
- ❌ No fix for the `DEFAULT_STATION_VIEW_CONFIG.enabled = true` vs `StationContext.stationViewEnabled = false` inconsistency from investigation §3.5 — that's a separate hygiene CR.

The working tree contains the single-file change ready for review. `git status` shows `frontend/src/pages/LoadingPage.jsx` modified.

— End of fix report.
