# INVESTIGATION REPORT — Reports charts crash in production ("mR is not a function")
Date: 2026-09-26 | Role: INVESTIGATION | Confidence: HIGH | Steps used: ~8/10

## 1. Summary
- **Root cause:** `recharts@3.6.0` pulls CommonJS compat shims from `es-toolkit@1.47.1`
  (`es-toolkit/compat/*`). Under the production **Terser minification** (CRACO/CRA `craco build`),
  a recharts-internal helper is mangled into a self-referencing/undefined binding and is called as a
  function during the first chart render → `TypeError: <minified> is not a function`
  (`mR` in deployed prod, `pR`/`yR` in a fresh local prod build — same helper, different mangled name).
- **Classification:** FE build/dependency bug (third-party — recharts 3.x + es-toolkit interop).
- **Manifests only in the PRODUCTION (minified) build.** The dev server bundle (`bundle.js`,
  unminified) does NOT crash — which is why the preview looked fine but `pos.mygenie.online`
  (minified `main.570fa32e.js`) crashes. NOT browser-specific (repro on Chromium; owner's screenshots were Firefox).

## 2. Hypotheses Tested
| # | Hypothesis | Method | Result |
|---|-----------|--------|--------|
| 1 | P&L page logic/data bug | Load `/reports-module/profit-loss` on preview (dev build), cafe103, all date presets | ELIMINATED — renders perfectly, KPIs/chart/table all correct |
| 2 | Firefox-specific | Owner screenshots are Firefox; reproduced on **Chromium** prod build | ELIMINATED — crashes on Chromium too |
| 3 | Production-minified recharts crash | `yarn/craco build` locally → serve minified build on preview URL → load P&L | **CONFIRMED** — ErrorBoundary "Something went wrong", `TypeError: pR is not a function`, recharts-internal stack (`us,Hi,ho,Yd,Vd,Hd,Rd` — identical chain to prod's `mR`) |
| 4 | Blast radius = P&L only | Loaded other recharts routes on prod build | Charts pages crash broadly: `sales` CRASH, `expense-report` CRASH, `dashboard` (defers charts) OK |

## 3. Data Flow / Break Point
`PLReportPage` render → `recharts` `<ResponsiveContainer>`/`<BarChart>` mount →
recharts internal helper (from `es-toolkit/compat` CJS shim) → minified as non-function →
`TypeError: pR is not a function` → React reconciler unwinds → app `ErrorBoundary` → "Something went wrong".
BREAK POINT: recharts internal, inside the production Terser-minified `main.*.js`.

## 4. Evidence
- Local prod build console: `error: [ErrorBoundary] Caught error: TypeError: pR is not a function`
  stack `at yR ... at us (…) at Hi (…) at ho (…) at Yd/Vd/Hd/Rd` — matches deployed prod stack
  (`vR,R,bK,us,Hi,ho,Yd,Vd,Hd,Rd`, `mR is not a function`).
- Versions: `recharts 3.6.0`, transitive `es-toolkit 1.47.1` (no overrides), build via `craco build` (webpack5 + Terser).
- recharts pages affected (production): 29 files import recharts under `src/pages/reports-module/*`,
  `src/components/inventory/widgets/*`, `src/pages/pms/RevenueDashboardPage.jsx`. Any page that mounts a chart on load crashes.

## 5. Recommendations (FE fix — needs PLANNING gate, NOT planning-skip eligible)
This is a dependency/build change with a **large blast radius (all chart reports)** → full gate + regression.
Options (in order of preference):
1. **Pin `es-toolkit` via package.json `overrides` to a known-stable version** (reported stable: `1.46.1`),
   then clean install (`rm -rf node_modules yarn.lock && yarn install`) and rebuild. Lowest-churn fix.
2. Alternatively downgrade `recharts` to the latest `2.x` (stable minified builds, but API differences to verify).
3. (Not applicable to CRA) Vite optimizeDeps exclude — this app is CRA/CRACO, not Vite.
- After fix: **regression across ALL chart report pages** (P&L, Sales, Expense Report, Purchase Report,
  Insights mockups, PMS Revenue Dashboard, inventory trend/cost widgets) in a **production build**, not just dev.
- References: recharts#7376, toss/es-toolkit#1740/#1756.

## 6. Second finding (separate item — see backend brief)
"Failed to load wastage data" is UNRELATED: backend route `inventory/top-wasted-items` returns 404 on preprod.
See `/app/memory/backend_briefs/BACKEND_BRIEF_top-wasted-items-404_2026-09-26.md`.

## 7. Registration note (R0)
Both are owner-reported and currently UNREGISTERED. Recommend INTAKE to register:
- BUG (P1, HIGH): "Reports charts crash in production build — recharts/es-toolkit minification".
- BUG (P1, MEDIUM): "Wastage Top Items 404 (backend route missing)".
