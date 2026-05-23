# Station API Visible Loading Fix Plan

> **Mode:** Planning and impact analysis only. No code changes, no commits, no refactor.
> **Date:** 2026-05-15
> **Companion to:** `STATION_API_VISIBLE_LOADING_INVESTIGATION.md`, `change_requests/phase_3/UX_LOADING_02_VISIBLE_STATION_PROGRESS.md`
> **Owner direction applied:** prefer Option C (single visible row/spinner) + Option D (visible failure).

---

## 1. Summary

**Plan:** add ONE additional visible row in the existing loading list — labeled e.g. *"Setting up kitchen stations…"* — that participates in the progress-bar denominator so it stays under 100 % until the station-fetch batch (`Promise.all` over enabled stations) actually completes. On failure, surface a destructive toast AND turn the row red (red `AlertCircle` icon, "Failed" text, "Retry" button via the existing `handleRetry` path extended by one key). Keep navigation blocking on this row's terminal state (same blocking model as today; we just stop lying about progress). One file touched: `frontend/src/pages/LoadingPage.jsx`. Approximate effort: 1–1.5 hr implementation + 30 min QA. Diff size: roughly +40 / −5 lines. No backend, no contexts, no `StationPanel`, no `stationService`, no Phase-1 boot logic affected.

---

## 2. Current Behavior

Reference: `STATION_API_VISIBLE_LOADING_INVESTIGATION.md` §3, §5.

- Phase 1 (the 7 boot APIs) fills the progress bar from 0 to 100 % in ~1 s (after the previous parallelisation CR).
- The progress effect at `LoadingPage.jsx:75-112` then launches `loadStationData()` (L92).
- The bar is ALREADY at 100 % at this moment.
- `loadStationData()` (L115-172) silently runs for **1–3 s** while it:
  - Calls `extractUniqueStations(products)` (pure transform; cheap).
  - Calls `setAvailableStations` + `initializeConfig` (StationContext setters).
  - Fires N parallel `fetchStationData(station)` POSTs.
- Only after `loadStationData()` resolves does `setIsComplete(true)` fire and the page navigate to `/dashboard` 500 ms later.
- Failures are completely silent: the `try/catch` at L168-171 only `console.error`s; no toast, no row, no retry UI.

Net user experience: **bar reads 100 %, screen looks frozen for 1–3 s, then dashboard appears**. On station failure, the kitchen panel may render empty with no indication of why.

---

## 3. Related CR / Docs

| Doc | Path | Status |
|---|---|---|
| Station API Visible Loading Investigation | `change_requests/station_api_visible_loading_investigation/STATION_API_VISIBLE_LOADING_INVESTIGATION.md` | The immediately-preceding investigation (this plan's input). |
| UX-LOADING-02 — Parallel API Loading + Visible Station-Load Progress | `change_requests/phase_3/UX_LOADING_02_VISIBLE_STATION_PROGRESS.md` | The original Phase-3 CR that bundled Concern A (parallelisation, already shipped) with Concern B (this work). Options B1 / B2 / B3 documented there. This plan picks B3 (= Option C below) per owner direction. |
| POS Boot API Parallelization CR (predecessor) | `change_requests/pos_boot_api_parallelization/POS_BOOT_API_PARALLELIZATION_INVESTIGATION.md`, `..._FIX_REPORT.md`, `..._QA_REPORT.md` | The just-shipped Phase-1 parallelisation. This plan is the explicit follow-up; will NOT modify those changes. |

---

## 4. Owner Direction Applied

| # | Constraint | How this plan honours it |
|---|---|---|
| 1 | Do not mix with POS boot API parallelisation | Single new entry in `loadingStatus`; the 7 Phase-1 keys, `API_LOADING_ORDER`, `loadAllData` two-tier flow, and `handleRetry` Phase-1 path are NOT modified beyond a one-line `handleRetry` extension to also re-run station on retry when its row is ERRORed. |
| 2 | Do not change the completed Phase-1 boot parallelisation unless absolutely required | Not required. Phase-1 code is untouched. |
| 3 | Do not change station API execution order unless clearly required | Not required. Station APIs still fire after Tier-2 settles, exactly as today. We only change *visibility* and *failure handling*. |
| 4 | Station calls already parallel internally | Confirmed (`Promise.all` at `LoadingPage.jsx:156`); kept as-is. |
| 5 | Focus on visibility, progress-bar correctness, failure visibility, UX | The entire plan. |
| 6 | Prefer small/safe UI improvement first | Single-row design (not per-station). One file. |
| 7 | Avoid complex per-station dynamic rows unless strong reason | We don't add them. One umbrella row only. (Per-station rows remain a possible follow-up if owner later wants more granularity.) |
| 8 | Do not implement in this task | Confirmed — this is a plan. |

**One mandatory UI requirement** from owner ("progress bar must not show misleading completed state while station loading is pending") is the central design driver and is satisfied by adding the station row to the progress denominator (§9).

---

## 5. Options Compared

| # | Option | Pros | Cons | Effort | Risk |
|---|---|---|---|---|---|
| 5.1 | **Single visible "Setting up kitchen stations…" row** *(Phase-3 doc Option B3; this plan's pick)* | Honest progress bar (denominator includes station phase). No frozen-100 % tail. One umbrella row, simple to reason about. Tiny diff. Keeps blocking semantics. Failures surface naturally as a red row + toast. | Doesn't show per-station breakdown — if 1 of 5 stations fails, operator sees one umbrella red row, not "BAR failed but KDS, GRILL, FRYER, COFFEE succeeded". Operator must consult the toast for detail. | ~1.5 hr impl + 30 min QA | **Low.** Single file, single state slice, single extra row. No new architectural primitive. |
| 5.2 | **Per-station dynamic rows** *(Phase-3 doc Option B2)* | Maximum transparency — per-station ⏳→✅/❌ progress. Operator can pinpoint which station failed. | Variable-denominator progress bar (rewinds when station list arrives). Higher complexity. Retry needs per-station logic. Tenants with >5 stations get a long loading list. Owner explicitly de-prioritised. | ~3 hr impl + 1 hr QA | Low-medium. More moving parts, more edge cases. |
| 5.3 | **Two-stage progress bar (0→80 % Phase 1, 80→100 % Phase 2)** *(Phase-3 doc Option B1)* | Single smooth bar, no extra row. | Arbitrary 80/20 split is fiction — Phase 2 can be longer than 20 % of total. Hides failure (single bar, no error state per stage). Doesn't surface failure visibly. | ~1.5 hr | Low but unsatisfying. |
| 5.4 | **Dashboard opens while StationPanel hydrates in-place** *(non-blocking)* | Fastest path to dashboard. `StationPanel` already has its own `isLoading` + refresh button — could handle this. | Adds a different UX inconsistency (operator sees half-loaded dashboard). Race window where actions can be taken before kitchen data arrives (low risk because no dashboard surface other than StationPanel reads stationData — confirmed in investigation §7.2 — but conceptually messier). Failure handling moves to dashboard, complicating retry UX. Owner asked us to evaluate but the strong preference was Option C + D. | ~2 hr impl + 1 hr QA | Medium. Larger surface (LoadingPage + StationPanel). New "did the kitchen finish loading?" state lives in two places. |
| 5.5 | **Keep current behaviour** | Zero risk. | Owner has explicitly flagged the frozen 100 % tail and silent failure as the problem. Status quo is rejected. | 0 hr | Loses the UX win the previous CR enabled. |

**Recommendation:** **5.1 (single visible row) + Option D (visible failure)** — the pairing owner has already indicated as the preferred starting direction.

---

## 6. Recommended Approach

### 6.1 What ships in this CR

1. **One new "phase-2" entry** in the loading screen's progress model:
   - Key: `stations` (new — but not added to `API_LOADING_ORDER`; see §6.2).
   - Label: *"Setting up kitchen stations…"* (final wording owner's call).
   - Status transitions: `IDLE → LOADING → SUCCESS | ERROR | SKIPPED`.
   - Counts: `loaded = N stations loaded`, `total = N enabled stations`. (When `stationViewConfig.enabled === false` or no stations discovered, status moves directly to `SKIPPED` with `total: 0`.)

2. **Progress bar denominator** includes the `stations` row only when station view is enabled AND at least one station was discovered. Bar tops out at `(7 SUCCESS/ERROR) / (7 + 1)` = ~88 % until the station row reaches its terminal state, then 100 %.

3. **Visible row** rendered in the loading list (alongside the existing 7), using the same `getStatusIcon` / `getCountText` helpers.

4. **Failure visibility (Option D):**
   - Toast on station-batch failure: `"Failed to load kitchen stations"` (description: `error.message`, variant: `destructive`).
   - Red `AlertCircle` icon + "Failed" text in the station row.
   - Existing `Retry` button (only rendered when `hasError === true` on the screen) extended to re-run the station phase too.

5. **Navigation gate** stays blocking: `setIsComplete(true)` + `navigate(/dashboard)` only fire once the station row is in a terminal state (SUCCESS / ERROR / SKIPPED). This keeps current blocking semantics; the only thing that changes is the bar never reads 100 % prematurely.

6. **`handleRetry` extension:** include the `stations` row in the failed-key set. If only the station row is failed, re-run `loadStationData()` only (Profile NOT re-run). If profile + station both failed, profile re-runs first (Tier-1 barrier), then Tier-2, then station phase. Existing semantics preserved.

### 6.2 Why a separate state slice, not pushing into `API_LOADING_ORDER`

`API_LOADING_ORDER` is read by `loadAllData` (defines `keysToLoad`) and by `handleRetry` (defines `failedKeys`) and by the visible-rows renderer (L501 `API_LOADING_ORDER.map(...)`). Adding `stations` to that array would:
- Make `loadAllData` try to call `loaderMap.stations` in the parallel Tier-2 batch (it can't — station discovery needs `products` resolved first).
- Risk silently shifting load order if anyone reorders the array later.

**Safer:** keep `API_LOADING_ORDER` strictly Phase-1 (untouched). Introduce a separate state field `stationStatus` (single object, same shape as one `loadingStatus` row), and a renderer that prints it as one additional row. Progress calc adds it as `+1` to numerator/denominator when relevant. Retry extension is a 3-line addition.

This isolates Phase-2 from Phase-1 mechanics — owner direction #1.

---

## 7. Files Proposed To Change

**One file only:**

| File | Purpose of change | Approx. diff |
|---|---|---|
| `frontend/src/pages/LoadingPage.jsx` | Add `stationStatus` state; render one extra row; include it in progress denominator; gate navigation on its terminal state; add toast + red row on failure; extend `handleRetry`; remove the now-unused `stationLoadingRef` if it becomes redundant. | ~+40 / −5 lines |

**Files explicitly NOT touched:**

- `frontend/src/contexts/StationContext.jsx` — no new state added; we reuse `setAvailableStations`, `initializeConfig`, `setAllStationData`.
- `frontend/src/api/services/stationService.js` — `fetchStationData`, `extractUniqueStations`, `getStationViewConfig` all unchanged.
- `frontend/src/components/station-view/StationPanel.jsx` — its internal `isLoading` is not used by this CR.
- `frontend/src/hooks/useStationSocketRefresh.js` — untouched.
- `frontend/src/pages/StatusConfigPage.jsx` — untouched.
- `frontend/src/api/constants.js` — `API_LOADING_ORDER` untouched; `LOADING_STATES` untouched.
- All Phase-1 loader functions (`loadProfile`, `loadCategories`, …) and `loadAllData` itself — untouched.
- Backend, OrderEntry, VAT, SC, tip, delivery, dashboard, payload builders, socket handlers, print/KOT, Web/POS pulse counter — all untouched.

---

## 8. Implementation Plan (do NOT implement now)

**Inside `LoadingPage.jsx`:**

1. **Add state** alongside the existing `loadingStatus` state:
   ```text
   const [stationStatus, setStationStatus] = useState({
     status: LOADING_STATES.IDLE,
     error: null,
     loaded: 0,
     total: 0,
     elapsed: null,
     startedAt: null,
   });
   ```

2. **Replace** the existing `loadStationData` (currently L115-172) so that it:
   - Starts: `setStationStatus({status: LOADING, startedAt: t0, …})`.
   - Performs `extractUniqueStations(products)` and computes `stationsToLoad` (same logic as today).
   - If `stationsToLoad.length === 0` OR `stationViewConfig.enabled === false` → set status to a new `SKIPPED` *or* reuse `SUCCESS` with `total: 0` (cleaner — see §8.5). Mark elapsed and return.
   - Otherwise fire `Promise.allSettled(stationsToLoad.map(fetchStationData))` (note: `allSettled`, not `all` — same defensive choice as Phase-1, so a single station failure doesn't kill the others).
   - Tally fulfilled vs rejected; call `setAllStationData(...)` with fulfilled results; if any rejection: surface toast + set status `ERROR` + record `error.message`. Otherwise status `SUCCESS`.
   - Always set `elapsed` and `startedAt: null`.

3. **Update progress effect** (currently L75-112) so that:
   - Phase-1 completion check becomes: `phase1Done = (every loadingStatus row is SUCCESS or ERROR)`.
   - `phase1HasError = (any loadingStatus row is ERROR)`.
   - When `phase1Done && !phase1HasError && stationStatus.status === IDLE` → trigger `loadStationData()`.
   - `phase2Done = (stationStatus.status === SUCCESS || ERROR || SKIPPED)`.
   - `phase2HasError = (stationStatus.status === ERROR)`.
   - **Progress bar value:**
     `total = 7 + (stationStatus.status === IDLE ? 0 : 1)` (station row only counts toward the bar once we know we're attempting it; this prevents the bar from briefly showing 7/8 = 87 % when we're going to skip stations).
     Actually simpler: **always** denominator `= 8` once we have decided to attempt station load, otherwise `= 7`. Or even simpler: denominator is `7 + (willAttemptStations ? 1 : 0)` where `willAttemptStations` is decided synchronously after products resolves (via `data.products?.length > 0 && stationViewConfig.enabled !== false`). The branch can be evaluated in the progress effect — it doesn't need its own state.
     - The numerator counts terminal-state rows including the station row.
   - **Navigation gate:** trigger `setIsComplete(true)` + the existing 500 ms `setTimeout(navigate)` only when `phase1Done && phase2Done`.
   - **`hasError`** is `phase1HasError || phase2HasError` (so the existing "Retry" button surfaces on station failure too).
   - Drop the `stationLoadingRef` mutex — `stationStatus.status !== IDLE` serves the same role.

4. **Render the new row** in the loading list. Where today there is `API_LOADING_ORDER.map(item => …)` (around L501), append a single additional `<div>` for the station row using the SAME visual shape — `getStatusIcon(stationStatus.status)` for the icon, `getCountText(stationStatus)` for the count text. Conditional render: only show the row if we're going to attempt stations (same `willAttemptStations` boolean).

5. **Extend `handleRetry`** (L411-429):
   - After computing `failedKeys` from `loadingStatus`, also check `stationStatus.status === ERROR`.
   - If yes, reset `setStationStatus({status: IDLE, …})` and call `loadStationData()` after `loadAllData(...)` returns.
   - If profile or any Tier-2 key also failed, `loadAllData(failedKeys)` runs first (with profile-first semantics intact via the existing Tier-1/Tier-2 split), then station phase re-runs as today via the progress effect.
   - **Profile is NOT re-run** unless profile itself was in `failedKeys`.

### 8.5 Naming of the "SKIPPED" state

`LOADING_STATES` today has `IDLE / LOADING / SUCCESS / ERROR` (in `api/constants.js`). Adding a new state risks rippling to other files (callers / tests). **Avoid.** Instead, when station phase is skipped (no stations OR station view disabled), record `status: LOADING_STATES.SUCCESS` with `total: 0` and `loaded: 0`. The `getCountText` helper already renders `"0 loaded · 0.0s"` cleanly. Done. No new constant.

---

## 9. Progress Bar / Loading UI Plan

| Today | After fix |
|---|---|
| Bar hits 100 % when 7/7 Phase-1 rows are terminal. | Bar uses denominator `7 + (willAttemptStations ? 1 : 0)`. Bar can read `7/8 = 87 %` for ~1–3 s while station phase is in flight; reaches `8/8 = 100 %` when station phase reaches terminal state. |
| Station phase invisible. | One additional row with `getStatusIcon(stationStatus.status)` (spinner while LOADING, green check on SUCCESS, red AlertCircle on ERROR) and `getCountText(stationStatus)` (`"3 of 5 Loading… 1.2s"` → `"5 loaded · 2.1s"`). |
| Frozen 100 % tail of 1–3 s | Eliminated. Bar is honest. |
| Failure invisible | Red row + destructive toast + "Retry" button surfaces (same Retry UI as today, just covers this row too). |
| Skipped phase (station view OFF / no stations) | No row rendered; denominator stays at 7. Bar tops out at 100 % when Phase-1 is done, exactly like today. |

---

## 10. Blocking vs Non-Blocking Decision

**Recommendation: blocking** (keep current navigation gate).

Why:
- Owner directive prefers Option C — a single visible row implies the user stays on the loading screen for those extra 1–3 s. That's fine because we've now made those seconds honest.
- Non-blocking (Option 5.4) introduces a second loading surface (StationPanel's own spinner) and a race window where operators could interact with the dashboard before the kitchen panel is ready. While no dashboard surface other than StationPanel reads stationData (verified in investigation §7.2), the conceptual complexity for ~1–3 s of saved time isn't worth it for the FIRST iteration.
- We retain full optionality: if owner later wants faster dashboard entry, a follow-up CR can lift the blocking gate (the StationPanel UI already has the hooks needed). Today's plan keeps that door open without entangling Phase-1 / Phase-2 semantics.
- The user's perception cost (1-3 s on the loading screen vs same time in the dashboard with a loading panel) is roughly equivalent. We pick the option with smaller blast radius.

---

## 11. Failure / Retry Plan

### 11.1 What user sees on station-batch failure

1. **Station row turns red.** Same `AlertCircle` icon + `text-red-500` styling as the existing 7 rows on failure. Count text reads `"Failed · X.Xs"`.
2. **Destructive toast.** `title: "Failed to load kitchen stations"`, `description: error.message || "Some stations could not be reached."`, `variant: "destructive"`.
3. **Bar stops at `7/8 = 87 %`** with red row visible — does NOT hit 100 % (because the station row is terminal but ERRORed, the existing `hasError` gate fires).
4. **Retry button surfaces** (today's existing behaviour at the bottom of the loading screen when `hasError === true`).
5. **Navigation does NOT auto-fire** while `hasError === true` (matches today's behaviour for Phase-1 errors). User picks Retry or — if owner prefers a more permissive default — we could allow nav-anyway (see Open Q in §15).

### 11.2 Behaviour with `Promise.allSettled` granularity

If 1 of 5 stations fails and 4 succeed, station-phase status will be ERROR (any rejection trips it), but `setAllStationData(...)` will still have been called with the 4 successful stations. So the dashboard's StationPanel renders the 4 healthy stations on retry / nav-anyway; the failed one comes back empty until a refresh. This matches what today's silent code already does — we just make the partial failure visible.

### 11.3 Retry semantics

- **Click Retry with only station ERROR:** re-run `loadStationData()` only. Profile NOT re-run. Phase-1 NOT re-run.
- **Click Retry with Phase-1 + station ERROR:** re-run Phase-1 failed subset (existing two-tier flow), then station phase re-runs automatically via the progress effect (because `stationStatus.status` is reset to IDLE on retry).
- **Click Retry with only Phase-1 ERROR:** station phase is currently in SUCCESS / SKIPPED state — it does NOT re-run. (Owner's question 6 answered: retry includes station only when station itself failed.)

### 11.4 Should station failure block POS entry?

**Default: yes** (matches today's Phase-1 ERROR behaviour). User must click Retry or refresh. This is conservative. A follow-up CR can introduce a "Skip and continue" button if owner finds the blocking too strict.

---

## 12. Impact Analysis

| Area | Impact |
|---|---|
| **POS boot loading screen** | One extra row when stations are being loaded. Bar denominator increases from 7 to 8. No change when station view disabled or no stations. |
| **Dashboard navigation timing** | Identical wall-clock to today (we still wait for station fetches to settle before navigating). What changes is the user's perception during those seconds: instead of frozen 100 %, they see honest 87 % → 100 % progression. |
| **StationPanel readiness** | Unchanged. By the time dashboard mounts, `stationData` is already populated (same as today). `StationPanel` continues to use its own internal `isLoading` only for refresh-button-driven re-fetches, not for initial paint. |
| **KDS/station order visibility** | Unchanged. Print payloads still read `product.station` from MenuContext, not from `stationData`. |
| **Station API failure** | Now surfaced via toast + red row + Retry, instead of swallowed. Fixes the "kitchen shows no items, operator scolds kitchen, actual problem was a 500" footgun. |
| **Slow network** | Spinner + elapsed-time counter on the station row makes it visibly clear that the app is doing work. No more "is it frozen?" perception. |
| **No station configured** (`extractUniqueStations` returns empty) | Station row rendered with `SUCCESS` + count `"0 loaded"`, navigation proceeds. (Or render is skipped entirely; planner picks during impl.) |
| **Station view disabled** (`stationViewConfig.enabled === false`) | Station row not rendered; bar denominator stays at 7; navigation proceeds the moment Phase-1 finishes (same as today). Bonus: also fixes a wasteful HTTP call burst on first-login that the investigation §3.5 flagged as a separate hygiene issue (because we'll evaluate `willAttemptStations` once and skip both UI and fetch). |
| **Duplicate station calls** | None. `loadStationData` still runs exactly once per boot; `useStationSocketRefresh` still independent. |
| **Progress calculation** | Bar denominator = `7 + (willAttemptStations ? 1 : 0)`. Mathematically honest. The `willAttemptStations` boolean is derived once from `data.products` + `stationViewConfig.enabled`. |
| **Other surfaces** | None affected. OrderEntry, VAT, SC, tip, delivery, payload builders, Web/POS pulse counter, channel-view stability, sockets, KOT/print — all untouched. |

---

## 13. Regression Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Delaying dashboard entry unnecessarily** | None — we don't add wall-clock time; we just make existing wait honest. | No mitigation needed. |
| **Duplicate station API calls** | Very low — `stationStatus.status !== IDLE` mutex replaces the existing `stationLoadingRef`. `useStationSocketRefresh` is independent. | Single source of truth via the new state. |
| **Station data race** with StationPanel mount | None — navigation still waits for station phase terminal state, so `stationData` is populated before dashboard renders. | Preserved by blocking semantics. |
| **False loading success** (bar shows 100 % while data still pending) | Eliminated by design — denominator includes the station row. | Core of the fix. |
| **Hidden station failure** | Eliminated by toast + red row + Retry button. | Option D delivers this. |
| **Broken KDS / station socket refresh** | None — `useStationSocketRefresh` and the StationPanel refresh button paths are not touched. | Verified. |
| **Progress denominator confusion** when station list arrives mid-flight | None — we use a single binary umbrella row, not per-station rows. The denominator is decided once. | This is exactly why we picked single-row over per-station. |
| **User confusion if station loads after dashboard** | N/A under blocking semantics. (Would be a Option-5.4 concern only.) | We chose blocking. |
| **`handleRetry` regression** | Low — additive change (3-line block). The existing Phase-1 failed-key flow is untouched. | QA case in §14. |
| **`stationLoadingRef` removal** breaking some edge case | Very low — the ref was used as an idempotency mutex within the progress effect; `stationStatus.status !== IDLE` is a stricter equivalent. | Easy to verify in QA. |
| **Eslint exhaustive-deps re-trip** on the progress effect | Low — already suppressed at L111. May need an updated comment. | Documentation only. |

---

## 14. QA Checklist (for the eventual fix CR — NOT for this planning task)

1. **Fresh POS load with stations enabled and present.** 7 + 1 rows visible. Bar progresses 0 → ~87 % during Phase-1 → 100 % when station row turns green. Navigate to dashboard. StationPanel populated.
2. **Fresh POS load with no stations** (`extractUniqueStations` returns `[]`). Station row rendered as SUCCESS with `0 loaded` count (or hidden). Bar reaches 100 %. Navigate to dashboard. StationPanel empty.
3. **Fresh POS load with station view disabled.** Station row NOT rendered. Bar denominator = 7. Same as today's behaviour for these users. No HTTP burst.
4. **Slow station API** (throttled). Station row shows live elapsed time. Bar stays at ~87 % visibly. No "frozen 100 %" perception.
5. **Station API failure** (simulate 500 on `/station-order-list`). Toast appears. Station row red. Retry button surfaces. Click Retry → re-runs station phase only. Profile NOT re-run.
6. **Partial station failure** (1 of N fails, others succeed). Same toast (umbrella). Row turns red. Dashboard navigates on Retry showing 4 stations populated, 1 empty.
7. **Retry station after Phase-1 also failed.** Retry button re-runs Phase-1 failed-subset (existing logic), then station phase auto-runs after.
8. **Dashboard opens without frozen 100 %.** Smoke check on a healthy backend.
9. **StationPanel opens correctly** after dashboard mount. No regression in `useStationSocketRefresh` or refresh-button.
10. **No duplicate station calls.** DevTools shows exactly N `/station-order-list` POSTs per boot.
11. **No regression in Phase-1 boot APIs.** All 7 rows still progress and resolve as before. Profile-first barrier preserved. `Promise.allSettled` semantics preserved.
12. **CR-001 Fix B2 (return-to-URL).** Hard-refresh on `/orders/x` → still lands on `/orders/x` after loading (now including station phase).
13. **Abort during station load** (logout / navigate-away). No setState-on-unmount warnings.
14. **`ctrl.aborted` honoured** before station HTTP fires (today the `loadStationData` function takes no `ctrl` — plan should thread `ctrl` through to short-circuit if user aborts during station phase).

---

## 15. Open Questions (true owner blockers only)

1. **Row label wording.** Suggested: *"Setting up kitchen stations…"*. Alternative: *"Kitchen Stations"* (parallels the Phase-1 row labels). Owner pick.
2. **Station-row icon when SKIPPED** (station view OFF / no stations). Hide the row entirely, OR show it as a muted "✓ Skipped" row? Recommend: hide.
3. **Station failure — blocking or permissive?** Default plan blocks (same as Phase-1 ERROR behaviour). If owner wants a "Continue anyway" escape hatch for station failures specifically, we add one extra button. Recommend: blocking, parity with Phase-1.
4. **Threading `ctrl.aborted` through `loadStationData`.** Today `loadStationData()` doesn't receive the abort controller; if user logs out during Phase-2 the HTTP requests still run to completion. Worth fixing in the same CR? Recommend: yes, 2-line addition.
5. **Renaming `stationLoadingRef`** vs deleting it. If we move to `stationStatus.status !== IDLE` as the mutex, the ref becomes redundant. Recommend: delete it.

None of these are P0; planner picked sensible defaults so implementation can proceed on owner approval.

---

— End of fix plan.
