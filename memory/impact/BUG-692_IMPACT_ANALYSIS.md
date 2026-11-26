# BUG-692 — Impact Analysis (Gate 2)

**ID:** BUG-692 · **Type:** BUG · **Area:** Other (PWA / app shell)
**Priority:** P3 · **Risk:** LOW · **QA Severity:** MINOR
**Stage:** Gate 2 — Impact Analysis only (no plan, no code)
**Author:** PLANNING agent · **Date:** 2026-11-18

## Code Reality
**FULL** — banner is BUG-661/BUG-597 feature:
- `App.js` L116-143: banner (`data-testid="sw-update-banner"`) renders when `swUpdatePending || versionUpdatePending`; comment L116 states it is **intentionally persistent until "Update now" is tapped (OD-661-04)**.
- `hooks/useAppVersionCheck.js`: compares baked `process.env.REACT_APP_BUILD_ID` against `/version.json` `buildId` every 5 min; sets `updateAvailable=true` on mismatch. If `REACT_APP_BUILD_ID` is unset it returns early (no banner from this source).
Root-cause candidate: in the preview/dev deployment the baked `REACT_APP_BUILD_ID` does **not** match the served `version.json` buildId (or `swUpdatePending` from the service worker is set), so the (by-design persistent) banner shows on every page. Likely an **environment artifact**, not a logic defect — needs confirmation of `REACT_APP_BUILD_ID` vs `version.json` in the target environment.

## Conflict Pre-Check
- `App.js` + `useAppVersionCheck.js` owned by BUG-661 / BUG-597. RELATED: BUG-661 (opposite symptom — banner never shows). Reconcile together.
- Parallel-safe with others.

## Data-flow trace
boot → `useAppVersionCheck` fetch `/version.json` → buildId ≠ BUILD_ID → `versionUpdatePending=true` → persistent banner on every route (by design). Break point: whether the mismatch is a *real* new release or a build-id/env config gap.

## Affected files / lines
| File | Lines | Nature |
|------|-------|--------|
| `hooks/useAppVersionCheck.js` | whole | confirm BUILD_ID/version.json wiring in env |
| `App.js` | L116-143 | (only if owner wants dismiss-per-session instead of persist) |

## Risk
LOW. Likely config, not code. Not Fast-Lane until root confirmed.

## Owner decisions
- **OD-692-01:** Is the banner-on-every-page a real prod issue, or a preview-only build-id mismatch? If real: keep persistent (OD-661-04) or add a per-session dismiss?

## Verification seeds
1. Set matching `REACT_APP_BUILD_ID` + `version.json` → banner absent.
2. Genuine new build → banner shows once; "Update now" reloads and clears it.
