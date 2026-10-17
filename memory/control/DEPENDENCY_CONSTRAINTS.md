# Dependency Constraints — MyGenie POS Frontend

**Location:** `control/DEPENDENCY_CONSTRAINTS.md`
**Enforced by:** Agent Prompt Rule R26 (v0.7+)
**Last Updated:** 2026-09-26

---

## Purpose

This file lists every `package.json` dependency that is version-locked for a **production-safety reason**. It is NOT a general changelog — only packages where an upgrade has proven to cause a production crash, data corruption, or a build regression belong here.

**Every agent must read this file before modifying `package.json`.**

---

## How to use

1. Before changing any version in `package.json`, grep this file for the package name.
2. If listed as `STATUS: FROZEN` → **do not upgrade without explicit owner approval + production build test**.
3. If you believe an upgrade is safe, document your evidence (build test result, chart page verification) and get owner approval before changing.

---

## FROZEN DEPENDENCIES

---

### `recharts` — FROZEN at `2.15.4` (2.x series)

| Field | Detail |
|---|---|
| **Current version** | `2.15.4` |
| **Constraint** | Stay on `2.x`. **Never upgrade to `3.x`** without a full production build regression. |
| **Status** | FROZEN |
| **Registered** | 2026-09-26 |
| **Bug reference** | BUG-465 |
| **Risk if violated** | P1 HIGH — ALL chart report pages crash in production with `TypeError: mR is not a function` (ErrorBoundary "Something went wrong"). Dev server works fine. Crash is invisible until production deployment. |

#### Root cause (full explanation)

`recharts 3.x` depends on `es-toolkit` for a CommonJS compat shim (`es-toolkit/compat/*`). Under Webpack 5 + Terser minification (`npm run build` / `craco build`), the CJS shim function is mangled into a broken binding, then called as a function on first chart render → runtime crash.

**recharts 2.x has ZERO `es-toolkit` dependency** → Terser crash cannot occur.

#### Attempt history

| Attempt | Fix | Result |
|---|---|---|
| 1 | Pin `es-toolkit` to `1.46.1` via `overrides` | FAIL — recharts 3.x requires `isPlainObject.mjs` added in es-toolkit 1.47.x; `1.46.1` breaks the build at compile time |
| 2 | Pin `es-toolkit` to `>=1.48.0` via `overrides` | FAIL on UAT — deployment script did not run `npm install`; stale `node_modules` retained old version; also overrides are npm-only (yarn ignores them) |
| 3 | Downgrade `recharts` to `2.15.4` | **PASS** — 7/7 chart pages verified in production build (`npm run build`). No `es-toolkit` dependency in 2.x. Production build `main.2b8a0639.js` confirmed clean. |

#### How to safely test if you need to upgrade

If a future recharts 3.x patch claims to fix the Terser issue:
1. Change version in `package.json`
2. `rm -rf node_modules package-lock.json && npm install --legacy-peer-deps`
3. `npm run build` — must exit 0
4. Serve the production build: `npx serve -s build -l 3001`
5. Login and load **ALL 30 chart pages** listed in `handover/QA_HANDOVER_BUG-465_2026_09_26.md §4`
6. Check browser console: **zero `TypeError: * is not a function`**
7. Only if all 30 pages pass → get owner approval → upgrade

#### Affected files (30 recharts importers)

```bash
grep -rn "from 'recharts'" src/ --include="*.jsx" --include="*.js" -l
```

All pages under `src/pages/reports-module/`, `src/components/inventory/widgets/`, and `src/pages/pms/RevenueDashboardPage.jsx`.

---

## WATCHED DEPENDENCIES (not frozen yet — monitor on upgrade)

| Package | Watch reason | Version at time of note |
|---|---|---|
| `react` | 19.0.0 — some Radix UI components have peer dep warnings against 19; monitor if Radix components break on upgrade | 19.0.0 |
| `@craco/craco` | 7.1.0 — pinned in package.json; incompatibility with newer `react-scripts` versions possible | 7.1.0 |
| `date-fns` | 4.1.0 — `react-day-picker@8.10.1` requires `^2.28.0 || ^3.0.0`; date-fns 4.x is a peer dep mismatch (currently bypassed with `--legacy-peer-deps`) | 4.1.0 |

---

## PRODUCTION BUILD RULE (applies to ALL package changes)

The dev server (`yarn start` / `npm start`) runs an **unminified** bundle. Terser minification issues, tree-shaking regressions, and chunk-size problems are **invisible** in dev. They only manifest in `npm run build`.

**Mandatory check after ANY `package.json` dependency change:**

```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# 2. Production build
npm run build    # must exit 0

# 3. Check for runtime issues
# Serve build/ and test affected pages in a browser
npx serve -s build -l 3001
```

This applies even for seemingly trivial version bumps (patch releases have introduced production crashes before — BUG-465).

---

## Change log

| Date | Package | Change | Reason | Approved by |
|---|---|---|---|---|
| 2026-09-26 | `recharts` | `3.6.0` → `2.15.4` | BUG-465: Terser crash in all chart pages production | Owner (verbal) |
