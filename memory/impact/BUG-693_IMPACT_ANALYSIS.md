# BUG-693 — Impact Analysis (Gate 2)

**ID:** BUG-693 · **Type:** BUG · **Area:** Other (login branding)
**Priority:** P3 · **Risk:** LOW · **QA Severity:** MINOR
**Stage:** Gate 2 — Impact Analysis only (no plan, no code)
**Author:** PLANNING agent · **Date:** 2026-11-18

## Code Reality
**FULL** — `frontend/src/pages/LoginPage.jsx` L127-132 renders
`<img src={GENIE_LOGO_URL} alt="Genie Logo" className="h-24 w-auto" data-testid="login-logo" />`.
`GENIE_LOGO_URL` is a constant (to be confirmed in Gate 3 — likely a **remote/CDN URL**, not a bundled asset). The `<img>` element itself is correct; a blank render means the `src` failed to load.
Root-cause candidate: remote logo URL unreachable / wrong in the deployed environment (network, CORS, or env-specific asset), or the constant resolves empty. **Env/asset issue, not markup.** (Note: in a later screenshot the logo DID render — so this is intermittent / environment-dependent.)

## Conflict Pre-Check
- `LoginPage.jsx` referenced in FILE_OWNERSHIP "NOT touched" lists → no competing open edit.
- Parallel-safe. No existing login-logo bug in registry.

## Data-flow trace
LoginPage render → `<img src={GENIE_LOGO_URL}>` → browser fetches URL → fails in QA env → blank image box. Break point: the external asset fetch.

## Affected files / lines
| File | Lines | Nature |
|------|-------|--------|
| `pages/LoginPage.jsx` | L127-132 + `GENIE_LOGO_URL` definition | verify URL resolves; consider bundling the logo as a static asset for reliability |

## Risk
LOW (branding only). Not Fast-Lane until source of `GENIE_LOGO_URL` confirmed.

## Owner decisions
- **OD-693-01:** Is the logo a static bundled asset or a per-restaurant/env URL? (Determines whether to bundle it or fix the URL/config.)

## Verification seeds
1. Login page shows the logo across reloads and environments.
2. Network tab: logo request returns 200 (not 403/404/CORS).
