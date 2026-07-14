# Dev Control Dashboard — `/__dev/`

A **read-only, fully isolated** dashboard for viewing the MyGenie POS control-layer data
(closure debt, bug tracker, CR registry) from a browser, without touching the main app.

## Access
```
https://<your-preprod-host>/__dev/
```

## How env-gating works

Single source of truth: `/app/frontend/public/__dev/data/config.json`

| `config.json` value | Behaviour |
|---|---|
| `{ "enabled": true }` | Dashboard loads normally |
| `{ "enabled": false }` | "Dashboard Not Enabled" page shown |
| File missing / 404 | "Dashboard Not Enabled" page shown |

### To enable in preprod
Either:
- **Manual:** edit `data/config.json` and set `"enabled": true`, or
- **From env var:** run `node /app/scripts/gen_dev_dashboard_config.js`
  - The helper script reads `REACT_APP_SHOW_DEV_DASHBOARD` from the OS env
  - If `=true` → writes `enabled: true`
  - If missing / any other value → writes `enabled: false`
  - The script **never fails the build** — it exits 0 even on errors

### To disable in prod
- Don't set `REACT_APP_SHOW_DEV_DASHBOARD` in production `.env`
- (Optional extra safety) `rm -rf /app/frontend/public/__dev/` from the production build artifact

## Zero-touch guarantee

This dashboard **does not import or modify** anything in `/app/frontend/src/`.
It does not register a React route, it does not appear in the main bundle.

Files in scope:
```
/app/frontend/public/__dev/index.html          ← entry (loads React + Tailwind via CDN)
/app/frontend/public/__dev/dashboard.js        ← single-file React app (Babel-standalone)
/app/frontend/public/__dev/styles.css          ← minimal custom CSS
/app/frontend/public/__dev/data/config.json    ← env-gate flag
/app/frontend/public/__dev/data/closure_debt.json
/app/frontend/public/__dev/data/bug_tracker.json
/app/frontend/public/__dev/data/cr_registry.json
/app/scripts/gen_dev_dashboard_config.js       ← optional standalone helper
```

Removing this whole folder + the script has **zero effect** on the main app.

## Data refresh

The JSON snapshots under `data/` are point-in-time. To refresh:

1. Update `/app/memory/control/CLOSURE_DEBT_BURNDOWN.csv` (or BUG_TRACKER.md / CR_REGISTRY.md)
2. Re-run the conversion (no script provided yet — done manually for this seed)
3. Or write a small refresher script following the same convention

## Tech

- React 19 via UMD CDN (`https://unpkg.com/react@19.0.0`)
- ReactDOM 19 via UMD CDN
- Babel-standalone for in-browser JSX compilation
- Tailwind via CDN (`https://cdn.tailwindcss.com`)
- **Zero npm dependencies added**

## Tabs

| Tab | Source | Rows |
|---|---|---|
| Closure Debt | `data/closure_debt.json` | 28 items with 6-artifact status × 20 cols |
| Bug Tracker | `data/bug_tracker.json` | ~60 bugs + 8 prod hotfixes |
| CR Registry | `data/cr_registry.json` | ~50 CRs across all sprints |

All tabs support filter + search + CSV export of filtered rows.

## v1.2 features (added 2026-05-30)

- **📎 Artifact References section** in every detail panel — lists the actual `.md` doc(s) backing each closure claim, grouped by artifact type (Intake / Impact / Plan / Code Gate / Impl Summary / QA Report / Owner Smoke). Each path has a copy-button.
- **Bug Tracker reconciliation** — 44 bugs that were stale-labeled "Intake Only" have been moved into reconciled sections:
  - "POS 2.0 — Closed (2026-05-18)" (~36 bugs)
  - "pos_final_1.0 — Closed (2026-05-12)" (~10 bugs)
  - "Older — Closed / Partial" (~28 bugs)
  - "True Intake / Blocked" (~11 bugs — the honest set)
- **Drift attribution** — each reconciled bug shows the canonical sprint summary doc that proves its closure.
- **CR Registry & Closure Debt** also get Artifact References sections automatically.

- **Click-to-expand row details** — click any row → inline detail panel slides open with full notes, files, blocker, and all 6 named artifact rows (Closure Debt) or full bug/CR detail
- **Cross-tab linking** — every detail panel ends with a "🔗 Cross-references" strip. If the same ID appears in another tab, click the link → switches tab, auto-fills search, auto-expands the matching row
- **Collapsible status groups** — "Group by" dropdown per tab (Severity / Sprint / Status / Section / Priority / Missing count). Groups collapse by default with mini severity-mix pills in the header
- **Closure Debt enrichment** — bug/CR detail panels automatically show severity + 6-artifact dot strip + missing count + effort-to-close when the ID is also in Closure Debt
- **Hotspot detection** — CR detail panel shows a red warning banner if the CR touches any file from `cross_sprint_dependency_flags` (e.g. `OrderEntry.jsx`)
- **Keyboard accessibility** — `Tab` to focus rows, `Enter` to toggle expansion, `Esc` to collapse all in current tab

## Last seed

- Date: 2026-05-29
- Source CSV: `/app/memory/control/CLOSURE_DEBT_BURNDOWN.csv`
- Source docs: `/app/memory/control/BUG_TRACKER.md`, `/app/memory/control/CR_REGISTRY.md`
