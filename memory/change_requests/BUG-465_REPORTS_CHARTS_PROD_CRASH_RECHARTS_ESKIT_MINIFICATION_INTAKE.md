# BUG-465 — Reports Charts Crash in Production Build (recharts/es-toolkit Terser minification)

**Date:** 2026-09-26
**Updated:** 2026-09-26 (v2 — production uses npm; going forward npm is the canonical build tool)
**Role:** INTAKE
**Sprint:** sep_bug_closure
**Gate:** 1

---

## 1. Classification

| Field | Value |
|---|---|
| ID | BUG-465 |
| Type | BUG |
| Severity | **P1 — HIGH** |
| Risk | **HIGH** |
| Status | GATE_1_INTAKE |
| Source | AGENT-DISCOVERED (investigation report `PL_CHARTS_PROD_CRASH_INVESTIGATION_REPORT.md`) |
| Confidence | CONFIRMED — local `craco build` reproduced the crash; stack trace matches deployed prod |
| Build tool (prod) | **npm** — `npm install` + `npm run build` (`craco build`) |
| Build tool (dev/preview) | yarn — `yarn start` (platform supervisor, read-only config) |

---

## 2. Summary

All recharts-based report pages crash in the **production (minified) build** with
`TypeError: mR is not a function`. The dev server works correctly — the bug is invisible
in preview/dev.

**Affected production URL:** `pos.mygenie.online`

**Why it worked for 3 months and broke recently:**
No lockfile is committed to the repo. Every `npm install` resolves transitive dependencies
to the latest compatible version. `es-toolkit` released `1.47.1` recently — this introduced
a compat shim that Terser cannot safely minify. The next production deploy after that release
silently upgraded `es-toolkit` → crash introduced. All previous deploys had `1.46.x` → worked.

---

## 3. Root Cause (from investigation)

`recharts@3.6.0` pulls a CommonJS compat shim from `es-toolkit@1.47.1` (`es-toolkit/compat/*`).
Under Webpack 5 + Terser minification (`npm run build` → `craco build`), an internal recharts
helper is mangled into an undefined/self-referencing binding and called as a function on first
chart render.

- **Dev bundle** (`npm start` / `yarn start`): unminified — helper intact — **no crash**
- **Prod bundle** (`npm run build`): minified `main.*.js` — helper mangled → `TypeError: mR is not a function`

Not browser-specific: reproduced on Chromium. Owner screenshots were Firefox — same root cause.

**npm vs yarn is NOT the cause.** Without a committed lockfile, both resolve `es-toolkit` to
`1.47.1` (latest). The crash is in the Terser minification step, which runs identically under
both package managers.

---

## 4. Duplicate Check

**DISTINCT** — no existing BUG or CR in `registry.json` or `BUG_TRACKER.md` references recharts,
es-toolkit, production minification crash, or `mR is not a function`. Zero grep hits.

---

## 5. Severity Justification

**P1 — HIGH:** All chart report pages crash in production with no workaround. Core reporting
feature broken for every user on `pos.mygenie.online`. Dev/preview appears fine, masking the issue.
Blast radius: LARGE (30 files, all chart-heavy report pages).

Not P0 because: no money loss, no order loss, no data corruption — display/reporting only.

---

## 6. Risk Classification

**Risk: HIGH**

Trigger: Affects all report pages; involves a `package.json` `overrides` change +
clean install (`rm -rf node_modules package-lock.json && npm install`) + `npm run build`
regression. Any `overrides` change is a build-level change with LARGE blast radius.

**Fast Lane eligible: NO** — dependency change, large blast radius, requires production build
regression across all chart pages in a minified build.

**Process required:** Full gate flow + regression on ALL chart pages in a production build
(`npm run build`).

---

## 7. Evidence

| Evidence | Detail |
|---|---|
| Screenshot | Not provided (prod crash: ErrorBoundary "Something went wrong") |
| Investigation report | `/app/memory/PL_CHARTS_PROD_CRASH_INVESTIGATION_REPORT.md` |
| Crash stack (local prod build) | `TypeError: pR is not a function` at `yR … us … Hi … ho … Yd … Vd … Hd … Rd` |
| Crash stack (deployed prod) | `TypeError: mR is not a function` — same chain, different mangled name |
| Packages confirmed | `recharts@3.6.0`, `es-toolkit@1.47.1` (transitive, no override) |
| Build tool | `npm run build` → `craco build` (webpack5 + Terser) |
| Source | Agent local prod build + owner's deployed prod |
| Confidence | CONFIRMED |

---

## 8. Blast Radius

```bash
grep -rn "from 'recharts'\|from \"recharts\"" /app/frontend/src/ --include="*.jsx" --include="*.js" | wc -l
# Result: 30 files
```

**Affected pages (all crash on chart mount in production build):**
- `src/pages/reports-module/*` — 29 files (P&L, Sales, Expense Report, Purchase Report,
  Order Ledger, Item Sales, Settlement Report, Prep/Serve Time, Room Orders, and all other
  Insights mockup pages that mount a chart on load)
- `src/components/inventory/widgets/*` — inventory trend/cost widgets
- `src/pages/pms/RevenueDashboardPage.jsx`

**Dashboard page:** OK — defers chart loading, does not crash.

**Hotspot files touched:** NO — `package.json` change only; no `src/` hotspot files (R5 list).

**Blast radius: LARGE (30 files, all chart report pages)**

---

## 9. Recommended Fix

### Fix for BUG-465

**Option 1 — Recommended (lowest churn):**
Add to `package.json` (npm `overrides` field — works with npm 8.3+):
```json
"overrides": {
  "es-toolkit": "1.46.1"
}
```
Then clean install and rebuild:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Option 2:** Downgrade `recharts` from `3.6.0` → latest `2.x` (stable minified builds,
but API differences between v2 and v3 need verification across all 30 affected files —
higher churn, not recommended).

**References:** recharts#7376, toss/es-toolkit#1740/#1756

> **Note on yarn `resolutions`:** yarn uses a different field (`"resolutions"` not `"overrides"`).
> Since production uses npm, `"overrides"` is the correct field. If the dev environment also
> switches to npm (see §10 below), no dual-field workaround is needed.

---

## 10. Going Forward — npm as Canonical Build Tool (owner decision 2026-09-26)

**Owner direction:** Use npm (not yarn) going forward for all builds — dev and production.

### What this means

| Context | Before | After |
|---|---|---|
| Production build | `npm run build` | `npm run build` (unchanged) |
| Production install | `npm install` | `npm install` (unchanged) |
| Local / CI install | `yarn install` (inconsistent) | `npm install` |
| Local dev server | `yarn start` | `npm start` |
| Lockfile committed | None | **`package-lock.json`** (commit after clean install) |
| Platform dev server | `yarn start` via supervisor (read-only config) | Unchanged — platform supervisor cannot be edited |

### Why this matters

- Removes npm vs yarn discrepancy between dev and prod
- `package-lock.json` committed → transitive deps pinned → no more silent version floats
- `es-toolkit` fix via `"overrides"` (npm) is now the single source of truth — no need for yarn `"resolutions"`
- Future deploys reproduce exact locked versions every time

### Action items for Planning (OD-465-03)

1. Apply `overrides` fix to `package.json`
2. Run `rm -rf node_modules package-lock.json && npm install`
3. Commit the generated `package-lock.json` to the repo
4. Verify `npm run build` succeeds (exit 0, no new warnings)
5. Run regression on all chart pages in the production build

---

## 11. Open Decisions for Planning

| OD | Question | Agent recommendation | Status |
|---|---|---|---|
| OD-465-01 | Option 1 (`es-toolkit` pin to `1.46.1`) vs Option 2 (`recharts` downgrade to `2.x`)? | **Option 1** — less churn, no API changes | OPEN |
| OD-465-02 | Regression scope — all 30 chart files in prod build, or spot-check key pages? | Full regression on production build | OPEN |
| OD-465-03 | Confirm: commit `package-lock.json` after fix so deps are locked going forward? | **YES** — prevents future silent version floats | **OWNER DIRECTION: YES (2026-09-26)** |

---

## 12. Next Step

→ **Planning Gate 2** — Impact Analysis:
  - Exact `package.json` `overrides` change
  - Clean install procedure (`npm install`)
  - Commit `package-lock.json`
  - Production build regression matrix (all 30 chart pages, `npm run build`)

Awaiting owner: **"Gate 2 GO"**
