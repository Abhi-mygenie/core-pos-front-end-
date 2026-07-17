# Handover Note — Dev Control Dashboard (2026-05-29)

**From session:** 2026-05-29 (deployment + dev-dashboard session)
**Status:** DELIVERED & VERIFIED on preprod preview URL.

---

## TL;DR

A fully isolated, read-only **pre-prod dev dashboard** was added at `/__dev/`.
Zero touch to existing app code. Env-gated via `REACT_APP_SHOW_DEV_DASHBOARD`.

**Live URL (preprod):**
```
https://insights-phase.preview.emergentagent.com/__dev/
```

---

## What was built

| Tab | Source | Rows |
|---|---|---|
| **Closure Debt** | `/__dev/data/closure_debt.json` (from `/app/memory/control/CLOSURE_DEBT_BURNDOWN.csv`) | 28 items × 20 cols |
| **Bug Tracker** | `/__dev/data/bug_tracker.json` (from `BUG_TRACKER.md`) | 62 entries (25 active + 29 intake + 8 prod hotfixes) |
| **CR Registry** | `/__dev/data/cr_registry.json` (from `CR_REGISTRY.md`) | 53 CRs across 6 sprint buckets |

Features per tab: severity/sprint/status filters, full-text search, CSV export of filtered rows, dark theme.

---

## Files added (all NEW, all isolated)

```
/app/frontend/public/__dev/index.html          (entry — loads React+Tailwind via jsDelivr CDN)
/app/frontend/public/__dev/dashboard.js        (single-file React app, JSX-in-browser via Babel-standalone)
/app/frontend/public/__dev/styles.css          (minimal custom CSS)
/app/frontend/public/__dev/README.md           (usage notes)
/app/frontend/public/__dev/data/config.json    (env-gate flag)
/app/frontend/public/__dev/data/closure_debt.json
/app/frontend/public/__dev/data/bug_tracker.json
/app/frontend/public/__dev/data/cr_registry.json
/app/scripts/gen_dev_dashboard_config.js       (standalone Node helper — reads REACT_APP_SHOW_DEV_DASHBOARD, writes config.json)
```

## Files modified
**NONE.** Confirmed via `git status` after build.

---

## Env-gating contract

The dashboard reads `/__dev/data/config.json`:
- `{ "enabled": true }`  → dashboard loads
- `{ "enabled": false }` → "Dashboard Not Enabled" page shown
- File missing      → "Dashboard Not Enabled" page shown (graceful 404 handling)

To toggle state from env var (manual deploy step):
```bash
REACT_APP_SHOW_DEV_DASHBOARD=true  node /app/scripts/gen_dev_dashboard_config.js   # enable
unset REACT_APP_SHOW_DEV_DASHBOARD  && node /app/scripts/gen_dev_dashboard_config.js   # disable
```

The script:
- Reads `process.env.REACT_APP_SHOW_DEV_DASHBOARD`
- Treats `true`/`1`/`yes` as enable; everything else (incl. missing) as disable
- **Never throws / always exits 0** — cannot fail a build
- Is **not** wired into `yarn build`; must be run manually pre-deploy

---

## Tech notes

- **React 18.3.1 UMD** via jsDelivr (React 19 dropped UMD builds — confirmed by CDN 404)
- **Tailwind 4 browser** via jsDelivr (`@tailwindcss/browser@4`)
- **Babel-standalone 7.25.7** for in-browser JSX compilation
- **Zero npm dependencies added** — `package.json` untouched
- Main app continues to use React 19 — the two never interact (separate runtime, separate window globals never exposed to main app)

---

## Verification performed

| Check | Result |
|---|---|
| `/__dev/` loads with HTTP 200 | ✅ |
| All 3 tabs render and switch correctly | ✅ |
| Severity-pill click filter works | ✅ |
| Search + sprint + status filters work | ✅ |
| CSV export downloads filtered rows | ✅ |
| `enabled: false` → "Not Enabled" gate shown | ✅ |
| Main app `/` still HTTP 200 | ✅ |
| `git status` shows zero modifications to `/app/frontend/src/**` | ✅ |
| `git status` shows zero modifications to `package.json`, `craco.config.js`, `App.js` | ✅ |

---

## Refresh procedure (for next agent)

When `/app/memory/control/CLOSURE_DEBT_BURNDOWN.csv`, `BUG_TRACKER.md`, or `CR_REGISTRY.md` change:

1. Re-extract data into the 3 JSON files under `/__dev/data/`
2. No build step needed — JSON files are fetched at runtime (`cache: no-store`)
3. Simply refresh the dashboard in browser

(Future enhancement: add a small Node refresher script under `/app/scripts/` that re-generates the JSON snapshots automatically.)

---

## What's intentionally NOT done

- Not wired into `package.json` `build` script (per "no touching existing code")
- Not protected behind login (per spec — env gate only)
- Not interactive — no write/edit operations (per spec — read-only v1)
- No auto-refresh of JSON from source docs — point-in-time snapshot

---

## Known characteristics (not bugs)

- **Babel-standalone "in-browser transformer" console warning** — expected; this is a dev tool and we accept the perf cost (~80 KB Babel + 1× JSX compile on page load).
- **Tailwind "should not be used in production" console warning** — expected; we're using the browser build deliberately for zero-build setup. The warning is about *main app* production patterns, not this internal tool.
- **Folder ships to prod** — by design (option (a)). Production visitors hitting `/__dev/` see the gate page since `REACT_APP_SHOW_DEV_DASHBOARD` is not set there.

---

## Files referenced

- Session Start: `/app/memory/control/sessions/SESSION_START_2026_05_29_DEV_DASHBOARD.md`
- Closure-debt CSV: `/app/memory/control/CLOSURE_DEBT_BURNDOWN.csv`
- Dashboard README: `/app/frontend/public/__dev/README.md`
- Generation script: `/app/scripts/gen_dev_dashboard_config.js`
