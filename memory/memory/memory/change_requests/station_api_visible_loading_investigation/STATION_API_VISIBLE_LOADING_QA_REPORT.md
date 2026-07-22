# Station API Visible Loading — QA REPORT

> CR: `station_api_visible_loading` — **Option 5.1 (single visible row) + Option D (visible failure)**
> Date: 2026-05-15
> Companion to: `STATION_API_VISIBLE_LOADING_INVESTIGATION.md`, `STATION_API_VISIBLE_LOADING_FIX_PLAN.md`, `STATION_API_VISIBLE_LOADING_FIX_REPORT.md`
> Mode: **Validation only. No code changes.**

---

## Verdict: **PASS** — all 8 test cases satisfied

The fix is correctly implemented end-to-end. Every code path required by the 8 owner test cases has been traced against the live `LoadingPage.jsx` and verified. One minor numerical observation (88 % vs 87 % display rounding) is noted as informational, not a failure.

---

## Method & method-gap disclosure

**Method:** Static code review with line-by-line trace of the eight test scenarios against `frontend/src/pages/LoadingPage.jsx` and the unchanged `stationService.js` / `StationContext.jsx`. Plus ESLint, Webpack hot-compile, and live preview-URL render check.

**Method gap (same as previous CR):** The screenshot tool's `page` proxy in this environment does not surface request/console events to the QA script, so I could not capture a real-user "log in → watch the bar tick 0 → 88 % → 100 %" timeline. The logic is small and pure with respect to its declared inputs, so static review is sufficient to validate each test case. A manual login session through Chromium DevTools is recommended for visual sign-off.

---

## Test-case results (1–8)

### Test 1 — Fresh POS load with station view enabled → **PASS**

Trace of `LoadingPage.jsx`:

1. Mount effect (L78-85) fires `loadAllData(ctrl)`; `ctrlRef.current = ctrl`.
2. Phase-1 loaders each settle and write to `loadingStatus` via `updateStatus`.
3. Progress effect (L95-171) re-runs after each `loadingStatus` change.
4. When 7 of 7 rows are terminal:
   - L109-116: `willAttemptStations = (cfg.enabled !== false && stations.length > 0) = true`. Stored in `willAttemptStationsRef.current`.
   - L119: `stationContributes = 1`. `total = 7 + 1 = 8`.
   - L124: `completed = 7` (because station row is still IDLE, not terminal).
   - L125: `progress = round(7/8 * 100) = 88`.
   - L131-138: `loadStationData(ctrlRef.current)` launched (mutex: `stationStatus.status === IDLE`).
5. While Phase 2 runs (`stationStatus.status === LOADING`), `phase2Done = false`, `allDone = false` → no navigation. ✅
6. **"Setting up kitchen stations…"** row visible — renderer at L740-784 gated on `willAttemptStationsRef.current`. ✅
7. Once `Promise.allSettled` resolves and writes SUCCESS to `stationStatus`, progress effect re-runs: `stationTerminal = true`, `completed = 8`, `progress = 100`, `phase2Done = true`, `allDone = true`, `anyError = false` → `setIsComplete(true)` + `setTimeout(navigate, 500)`. ✅

**Numerical note (informational):** the spec said "around 87 %"; the actual display is `Math.round(7/8 * 100) = 88` (JS round-half-up). Both wordings convey "below 100 %". The core property — "does not hit 100 % while station phase is in flight" — holds exactly.

### Test 2 — Station row success → **PASS**

Trace: at `loadStationData` L325-332, when all stations resolve and `errors.length === 0`:

```js
setStationStatus({
  status: LOADING_STATES.SUCCESS,
  loaded: stationsToLoad.length,
  total: stationsToLoad.length,
  elapsed: ((Date.now() - t0) / 1000).toFixed(1),
  startedAt: null,
});
```

Progress effect picks it up:
- `stationTerminal = true` (L121-123).
- `completed = 7 + 1 = 8` (L124).
- `progress = 100` (L125).
- `phase2Done = true`, `allDone = true`, `anyError = false` → navigate fires after 500 ms (L152-165). ✅

Visual: green icon + green text + count `"5 loaded · 2.1s"` (or similar) in the umbrella row.

### Test 3 — Station view disabled → **PASS**

Trace:

1. `localStorage.mygenie_station_view_config.enabled === false`.
2. After Phase 1 completes, progress effect L114: `willAttemptStations = (cfg.enabled !== false && stations.length > 0) = false`.
3. `willAttemptStationsRef.current = false`.
4. L119: `stationContributes = 0`. `total = 7`. `progress = round(7/7*100) = 100`. ✅
5. L131-138: `loadStationData` **NOT called** (gate fails on `willAttemptStations`). No HTTP request. ✅
6. L144: `phase2Done = !willAttemptStations || stationTerminal = true`. `allDone = true`. → navigate fires. ✅
7. Render condition L740 `{willAttemptStationsRef.current && ...}` is `false` → station row **hidden**. ✅

Identical UX to pre-CR behaviour for these users; bonus side-effect — no wasted HTTP burst from the `DEFAULT_STATION_VIEW_CONFIG.enabled = true` quirk flagged in the investigation §3.5.

### Test 4 — No stations discovered → **PASS**

Trace: same as Test 3 but the gate trips on `stations.length > 0` instead of `cfg.enabled !== false`.

1. After Phase 1, L112: `stations = extractUniqueStations(data.products || [])`. If no product carries a `station` field → `stations.length === 0`.
2. L114: `willAttemptStations = false`.
3. Steps 4-7 identical to Test 3 — denominator 7, no HTTP, no row, navigate.

(Note: `loadStationData` itself has a defensive `if (uniqueStations.length === 0)` branch at L195-208 that returns SUCCESS with `total: 0` — this code path is dead in the standard flow because the progress-effect gate prevents the call, but it remains as a safety net for any future refactor or direct invocation. Harmless.)

### Test 5 — Slow station API → **PASS**

Trace:

1. `loadStationData` enters LOADING at L228-235 with `startedAt = t0`.
2. `tick` interval (L72-77) updates every 100 ms while `!isComplete`.
3. `getCountText(stationStatus)` reads `startedAt` and renders live elapsed seconds (`"3 of 5 Loading… 1.2s"`).
4. Progress bar stays at `88 %` (`7/8`) for the entire slow window.
5. Bar fills to 100 % only when the batch resolves.

Visual: spinner with live elapsed counter — the "is it frozen?" perception is eliminated. ✅

### Test 6 — Station API failure → **PASS** (full triple-surface visibility)

Three independent surfaces validated against the code:

| Surface | Code location | Trace |
|---|---|---|
| **Red row** | L309-316 sets `stationStatus.status = ERROR` | Renderer at L741-783 paints red icon (`AlertCircle`) + red text + `rgba(239,68,68,0.1)` background. |
| **Destructive toast** | L317-321 | `title: "Failed to load kitchen stations"`, `description: "<N of M failed.> (<station list>)"`, `variant: "destructive"`. Fires for partial AND total failures. |
| **Error summary block** | L791-797 | Extended block now includes `Kitchen Stations: <error message>` in the same red-pill style as Phase-1 errors. |
| **Retry button visible** | L795-803 | Existing `isComplete && hasError` gate is satisfied because progress effect L147 sets `anyError = true`. Count label includes station: `Retry Failed (phase1Count + 1)`. |

`Promise.allSettled` semantics confirmed at L255: a single station rejection does NOT cancel the others; successful stations still hydrate `stationData` via `setAllStationData(stationDataObj)` at L303 (called BEFORE the error branch returns at L322, so partial successes are preserved).

Partial-vs-total error wording:
- Total: `"All kitchen stations failed to load."`
- Partial: `"3 of 5 kitchen stations failed to load."`

### Test 7 — Retry station failure → **PASS** (Profile NOT re-run when only station failed)

Trace of `handleRetry` (L580-625):

```js
const failedKeys = API_LOADING_ORDER.map(i => i.key).filter(k => loadingStatus[k].status === ERROR);
// → [] when only station failed

const stationFailed = stationStatus.status === LOADING_STATES.ERROR;
// → true

if (failedKeys.length > 0) { setLoadingStatus(... reset only failed ...); }
// → SKIPPED (failedKeys is empty)

if (stationFailed) {
  willAttemptStationsRef.current = false;
  setStationStatus(mkIdle());
}
// → Station phase reset to IDLE; willAttempt cache cleared

setIsComplete(false);
setHasError(false);

const ctrl = { aborted: false };
ctrlRef.current = ctrl;

if (failedKeys.length > 0) { loadAllData(ctrl, failedKeys); }
// → SKIPPED — loadAllData NOT called → loadProfile NOT called → profile NOT re-fetched ✅
```

After this, the progress effect re-runs (triggered by `setStationStatus` and `setLoadingStatus` changes):

- L110-116: `stationStatus.status === IDLE` AND `phase1Done` AND `!phase1HasError` → recompute `willAttemptStations` → it's `true` again → set ref to true.
- L131-138: Launch condition satisfied → `loadStationData(ctrlRef.current)` re-fires. ✅

**Profile and all other Phase-1 APIs are NOT re-fetched.** Verified.

For the mixed scenario (Phase-1 + station both failed): `failedKeys.length > 0` so `loadAllData(ctrl, failedKeys)` runs first with the existing two-tier flow (preserves profile-first barrier from previous CR). The station re-launch happens automatically via the progress effect after Phase-1 completes.

### Test 8 — Regression check → **PASS** (no surfaces affected)

| Surface | Verification | Status |
|---|---|---|
| Phase-1 boot APIs (`loadProfile`, `loadCategories`, `loadProducts`, `loadTables`, `loadCancellationReasons`, `loadPopularFood`, `loadRunningOrders`) | Bodies byte-identical to pre-CR (post-Phase-1-parallelisation HEAD) | ✅ |
| `loadAllData` two-tier flow | Untouched | ✅ |
| `API_LOADING_ORDER` constant | Untouched (still the same 7 entries; no station entry added) | ✅ |
| `LOADING_STATES` constant | Untouched (no new state introduced) | ✅ |
| `mkIdle()` helper | Untouched (reused by both `loadingStatus` rows and `stationStatus`) | ✅ |
| `loadedDataRef.current` shape | Unchanged | ✅ |
| `StationPanel.jsx` | Untouched — KDS data appears after successful station load via existing `setAllStationData(...)` consumer | ✅ |
| `useStationSocketRefresh.js` | Untouched — live socket-driven re-fetch on order updates still operates after dashboard mount | ✅ |
| `StatusConfigPage.jsx` | Untouched | ✅ |
| `StationContext.jsx` | Untouched — `setAvailableStations`, `initializeConfig`, `setAllStationData` all consumed read-only | ✅ |
| `stationService.js` | Untouched — `extractUniqueStations`, `fetchStationData`, `getStationViewConfig` consumed read-only | ✅ |
| No duplicate station calls | `stationStatus.status === IDLE` mutex (replaces former `stationLoadingRef`). Verified by tracing the launch condition at L131-138 — fires exactly once per fresh load OR per Retry click. `useStationSocketRefresh` is independent and self-guarded on `stationViewEnabled`. | ✅ |
| OrderEntry, VAT, service charge, tip, delivery charge | Unchanged (no edits to those files; no shared state with the modified surfaces) | ✅ |
| Dashboard logic | Unchanged | ✅ |
| Payload builders, socket handlers, KOT/print payloads | Unchanged | ✅ |
| Web/POS pulse counter, channel-view stability | Unchanged | ✅ |
| CR-001 Fix B2 (return-to-URL) | Preserved verbatim inside the new progress effect (L155-164) | ✅ |
| T-07 ProtectedRoute → LoadingPage handoff | Untouched | ✅ |
| ESLint on `LoadingPage.jsx` | Clean (`No issues found`) | ✅ |
| Webpack hot-recompile | `Compiled successfully` after every edit | ✅ |
| Live preview-URL bundle render | Login screen renders correctly via Playwright screenshot | ✅ |

---

## Summary table

| # | Test case | Verdict | Evidence |
|---|---|---|---|
| 1 | Fresh load, station view enabled — bar stays ≤88 %, navigates only after success | **PASS** | Trace `LoadingPage.jsx` L95-171 |
| 2 | Station row success — 100 %, dashboard opens | **PASS** | Trace L325-332 + L149-165 |
| 3 | Station view disabled — row hidden, no station HTTP, denominator 7 | **PASS** | Trace L109-116 + L131-138 + L740 |
| 4 | No stations discovered — row hidden, no HTTP | **PASS** | Same gates as #3 |
| 5 | Slow station API — visible "Setting up kitchen stations…" with live elapsed | **PASS** | Trace `tick` (L72-77) + `getCountText` |
| 6 | Station API failure — red row + toast + error summary + Retry | **PASS** | Trace `loadStationData` L305-322 + renderer L741-803 |
| 7 | Retry only station — Profile NOT re-run | **PASS** | Trace `handleRetry` L580-625 |
| 8 | Regression — Phase-1 / contexts / services / OrderEntry / VAT / dashboard / sockets / KOT untouched | **PASS** | `git diff --stat` (1 file modified), code review |

---

## Informational notes (not failures)

1. **88 % vs 87 % display.** Plan and fix-report text used "~87 %" colloquially; the actual displayed value while station is loading is **`Math.round(7/8 * 100) = 88 %`** because `Math.round` in JS rounds 0.5 up. Both wordings convey "below 100 %"; functional property holds exactly.

2. **Defensive dead code path.** `loadStationData` contains an early-return at L195-208 for `uniqueStations.length === 0`. Under the standard flow this is unreachable because the progress-effect gate prevents the call when there are no stations. Kept as a safety net for future refactors. Harmless.

3. **Removed verbose debug logs.** During the rewrite the noisier `[LoadingPage] Categories map:` and `[LoadingPage] Sample categories:` console lines were dropped (they printed every boot regardless of need). The signal lines (`Available stations`, `Loading station data for`, `Station data loaded`) are retained. If owner wants the verbose lines back, trivial to restore.

4. **`stationLoadingRef` removed cleanly.** Replaced by `stationStatus.status === LOADING_STATES.IDLE` as the idempotency mutex. Verified by grepping — no orphaned references.

5. **`willAttemptStationsRef` declared between `useEffect`s** (L92, between the mount effect L75-85 and the progress effect L95-171). Unusual placement but legal — React's rules-of-hooks require consistent order across renders, and the order here is fixed. ESLint passes.

6. **Live in-browser timing capture was not feasible** in this environment (same limitation reported in previous CR's QA). Static review covers every test case end-to-end. Recommend a manual Chromium DevTools session to visually confirm the 88 % → 100 % progression and to exercise a real station-failure with the toast.

7. **No new tests added** in this CR per the smallest-safe-patch directive. A small follow-up CR could add `__tests__/pages/LoadingPage.stationRow.test.jsx` for the four key state transitions (IDLE → LOADING → SUCCESS, IDLE → LOADING → ERROR, IDLE → skipped, retry-only-station).

---

— End of QA report.
