# HANDOVER — BUG-661 (manual update banner + no white screen) → next agent

**Date:** 2026-11-09 · **From:** INVESTIGATION (review) → INTAKE v2 → PLANNING (Gate 2 + Gate 3) · **To:** next agent (target branch)
**Working ID in this bundle:** BUG-661 (supersedes BUG-621) · **Severity:** P0 (owner) · **Risk:** HIGH · **Fast Lane:** NOT eligible · **Gate 4 GO:** NOT given

## 0. FIRST ACTIONS (mandatory, in order)
1. **Check registry on THIS branch** — `grep -n "BUG-621\|BUG-597\|BUG-622" /app/memory/control/registry.json /app/memory/control/BUG_TRACKER.md`
2. **Duplicate check** — search registry/tracker for: `update banner`, `SwUpdateBanner`, `version.json`, `white screen`, `skipWaiting`, `PWA update`. Report findings to owner (expected related: BUG-597, BUG-621 v1, BUG-622).
3. **Assign a NEW ID (owner instruction):** take the **next free `BUG-<n>`** in this branch's registry (highest BUG number + 1). Do NOT reuse 621.
   - Rename in all bundle docs: `BUG-661` → `BUG-<n>`; file names `BUG-661_*` → `BUG-<n>_*`; planned code markers `// BUG-661` → `// BUG-<n>`.
   - Keep a "Supersedes / reopens BUG-621" line in each doc; Related: BUG-597, BUG-622, BUG-621.
   - In this branch's registry: add new item `BUG-<n>` (use `registry/BUG-661_registry_entry.json` as template — change id, keep decisions/files); on existing BUG-621 (if present) add note `SUPERSEDED_BY BUG-<n> (2026-11-09)` — do not change its gate history.
   - BUG_TRACKER.md: insert row from `registry/BUG-661_BUG_TRACKER_row.md` (renamed) after the highest BUG row; validate `registry.json` parses.
4. **Save docs** to these paths (renamed):
   - `investigations/BUG-<n>_INVESTIGATION_REPORT_2026_11_09.md` (uploaded original) + `investigations/BUG-<n>_INVESTIGATION_REVIEW_2026_11_09.md`
   - `change_requests/BUG-<n>_PWA_MANUAL_UPDATE_BANNER_INTAKE.md` (v1 history + v2 section)
   - `impact/BUG-<n>_IMPACT_ANALYSIS.md` · `plans/BUG-<n>_IMPLEMENTATION_PLAN.md`
   - `handover/HANDOVER_BUG621V2_TO_IMPLEMENTATION_2026_11_09.md` (this file, note new ID at top) + `handover/SESSION_HANDOVER_2026_11_09_BUG621_INVESTIGATION.md`
5. **Entry verification** against code on this branch (plan §4 step 1): craco L3 + plugin block; `App.js` L84, L115-153, L160; `NotificationContext.jsx` L213-277, L317-322; `public/index.html` L15; `src/index.js` L6-11; `ErrorBoundary.jsx` L14-24. If drift → re-anchor, tell owner.
6. **Explain the plan to owner in plain words** (§3) and **ask Gate 4 GO** (§5). **No code before GO.**

## 1. Problem (owner)
1. "Update available" banner never shows on PWA/browser when a new version releases.
2. After release, PWA can white-screen / freeze until fully closed.
Expected: persistent, non-dismissible **"New version available — Update now"** banner on **every page**; user updates **manually**; never a white screen.

## 2. Root cause (investigation CLOSED)
- Banner: depends on a new SW entering `waiting`; `firebase-messaging-sw.js` never changes per release → no `waiting` → banner never triggers. Secondary: detection gated by `isAuthenticated` (NotificationContext L214); `controllerchange` reload has no `hadController` guard.
- White screen: stale `index.html` → deleted hashed bundles 404 → React never boots; ErrorBoundary is inside the failed bundle; sticky `?retry=1`.

## 3. Plan summary (explain to owner)
| F | File | What |
|---|---|---|
| F1 | `craco.config.js` | Build id baked into app + `build/version.json` emitted on every `yarn build` (dev = `dev`) |
| F2 | `public/version.json` NEW | `{"buildId":"dev"}` — change to `dev2` in preview to simulate a release |
| F3 | `src/hooks/useAppVersionCheck.js` NEW | Compare app id vs `version.json` on open, on return to app, every 5 min; works logged out |
| F4 | `src/App.js` | Existing banner design kept; text "New version available" / "Update now"; 10 s auto-reload removed; stays until tapped |
| F5 | `NotificationContext.jsx` | SW update detection moved out of login gate; no reload on first notification grant; listener cleanup |
| F6 | `public/index.html` | Boot guard: bundle fails → reload once with fresh copy (no loop) |
| F7 | `src/index.js` | Marks app booted (clears guard) |
| F8 | `ErrorBoundary.jsx` | Chunk-error retry: once per 60 s via sessionStorage (no sticky `?retry=1`) |
Hosting (owner's own deployment): nginx snippet in plan §3 — `index.html`/`version.json` no-cache, `/static/` immutable.
**Banner on every page (owner question):** yes — rendered at App root (App.js L160) outside routes, z-index 9999 (nothing in app higher). Only exception: crash/error screen. Verified by new check **V13** (login, dashboard, order entry, Collect Bill, reports, PMS, settings, open dialog).

## 4. Owner decisions (all resolved)
OD-661-01 no auto-reload · 02 foreground re-check · 03 not needed · 04 manual persistent banner · 05 no keep-old-files · 06 version.json check · 07 ErrorBoundary guard YES · 08 every 5 min · 09 keep existing banner design · 10 own deployment · Severity P0. (Rename OD prefix to `OD-<n>-xx` with mapping note.)

## 5. Gate 4 ask (use exactly, with new ID)
```
OWNER APPROVAL REQUIRED
Reason: Gate 4 GO for BUG-<n> (supersedes BUG-621) — every release / all clients, 8 files incl. build config
Risk: HIGH (Severity P0)
Proposed next step: Apply F1–F8, restart frontend, local yarn build check, self-test V1–V13, registry sync
I will not proceed until owner approves.
```

## 6. Context
- No credentials needed for this bug (FE-only; preview test by editing `public/version.json`).
- `craco.config.js` change requires `sudo supervisorctl restart frontend`.
- After local `yarn build` check, delete `/app/frontend/build`.
- Post-code checklist: plan §7 (registry, tracker, FILE_OWNERSHIP, markers, QA handover incl. nginx snippet for DevOps, flag BUG-597 for closure).
