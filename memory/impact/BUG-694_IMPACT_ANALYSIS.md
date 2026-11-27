# BUG-694 — Impact Analysis (Gate 2)

**ID:** BUG-694 · **Type:** BUG · **Area:** Other (boot / routing)
**Priority:** P2 · **Risk:** MEDIUM · **QA Severity:** MINOR
**Stage:** Gate 2 — Impact Analysis only (no plan, no code)
**Author:** PLANNING agent · **Date:** 2026-11-18

## Code Reality
**FULL** — `frontend/src/App.js` L161: `/loading` → `<ProtectedRoute><LoadingPage/></ProtectedRoute>`. `frontend/src/pages/LoadingPage.jsx` (921 lines) runs a large boot sequence before navigating to `returnTo` (L162-179):
- Sequential `await` loaders: profile (L365), categories (L409), products (L424, BUG-451), popular foods (L458), aggregator list (L480), tables (L499), cancellation reasons (L515), running orders (L537), plus station data fetched with `Promise.allSettled` + 10s per-station timeout (L261-275).
Root cause candidate: the boot gate waits on **many loaders, several sequential**, before it will navigate; on a direct-URL entry after fresh login (cold cache) the slowest/sequential fetches push total >10s. Not a single bug — a boot-sequencing/parallelization cost.

## Conflict Pre-Check
- `LoadingPage.jsx` owned by BUG-451 / boot work; FILE_OWNERSHIP marks it "NOT touched" by recent CR-482/aggregator edits. No competing open edit.
- RELATED (none registered). Parallel-safe.
- **HIGH-care file:** boot sequence feeds the whole app; changes here are MEDIUM/HIGH risk.

## Data-flow trace
direct URL after login → ProtectedRoute → `/loading` → LoadingPage runs loader chain (some sequential awaits) → only after completion `navigate(returnTo, {replace:true})` → destination renders. Break point: navigation is gated on the full/slow loader chain.

## Affected files / lines
| File | Lines | Nature |
|------|-------|--------|
| `pages/LoadingPage.jsx` | loader chain L359-568 + navigate L162-179 | parallelize remaining sequential loaders / let non-critical loaders run after navigation |

## Risk
MEDIUM (boot/routing; touches app-wide data hydration). Full gate; not Fast-Lane.

## Owner decisions
- **OD-694-01:** Acceptable boot budget / which loaders are *blocking* vs may hydrate lazily after the destination renders? (Needed to scope what can move off the critical path.)

## Verification seeds
1. Measure direct-URL-after-login time → under agreed budget (e.g. <5s) on cold cache.
2. All data still present after navigation (no missing categories/orders).
3. Station-disabled path still skips station fetch.
