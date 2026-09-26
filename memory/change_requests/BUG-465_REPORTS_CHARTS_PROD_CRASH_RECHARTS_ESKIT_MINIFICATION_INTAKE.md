# BUG-465 — Reports Charts Crash in Production Build (recharts/es-toolkit Terser minification)

**Date:** 2026-09-26
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

---

## 2. Summary

All recharts-based report pages crash in the **production (minified) build** with `TypeError: mR is not a function`.
The dev server (`yarn start`) works correctly — the bug is invisible in preview/dev.

**Affected production URL:** `pos.mygenie.online`

---

## 3. Root Cause (from investigation)

`recharts@3.6.0` pulls a CommonJS compat shim from `es-toolkit@1.47.1` (`es-toolkit/compat/*`).
Under Webpack 5 + Terser minification (CRACO/CRA `craco build`), an internal recharts helper
is mangled into an undefined/self-referencing binding and called as a function on first chart render.

- **Dev bundle:** unminified — helper intact — **no crash**
- **Prod bundle:** minified `main.*.js` — helper mangled → `TypeError: mR is not a function`

Not browser-specific: reproduced on Chromium. Owner screenshots were Firefox — same root cause.

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

Trigger: Affects reports pages broadly; involves a `package.json` dependency override change +
clean reinstall (`rm -rf node_modules yarn.lock && yarn install`) + `craco build` regression.
Any change to `package.json` `overrides`/`resolutions` is a build-level change with LARGE blast
radius across all chart pages.

**Fast Lane eligible: NO** — dependency change, large blast radius, requires production build
regression across all chart report pages.

**Process required:** Full gate flow + regression on ALL chart pages in a production build.

---

## 7. Evidence

| Evidence | Detail |
|---|---|
| Screenshot | Not provided (prod crash ErrorBoundary "Something went wrong") |
| Investigation report | `/app/memory/PL_CHARTS_PROD_CRASH_INVESTIGATION_REPORT.md` |
| Crash stack (local prod build) | `TypeError: pR is not a function` at `yR … us … Hi … ho … Yd … Vd … Hd … Rd` |
| Crash stack (deployed prod) | `TypeError: mR is not a function` — same chain, different mangled name |
| Packages confirmed | `recharts@3.6.0`, `es-toolkit@1.47.1` (transitive, no override) |
| Build tool | `craco build` (webpack5 + Terser) |
| Source | Agent local prod build + owner's deployed prod |
| Confidence | CONFIRMED |

---

## 8. Blast Radius

```bash
grep -rn "from 'recharts'\|from \"recharts\"" /app/frontend/src/ --include="*.jsx" --include="*.js" | wc -l
# Result: 30 files
```

**Affected pages (all crash on chart mount):**
- `src/pages/reports-module/*` — 29 files (P&L, Sales, Expense Report, Purchase Report,
  Order Ledger, Item Sales, Settlement Report, Prep/Serve Time, Room Orders, and all other
  Insights mockup pages that mount a chart on load)
- `src/components/inventory/widgets/*` — inventory trend/cost widgets
- `src/pages/pms/RevenueDashboardPage.jsx`

**Dashboard page:** OK — defers chart loading, does not crash.

**Hotspot files touched:** NO — `package.json` override only; no `src/` hotspot files (R5 list).

**Blast radius: LARGE (30 files, all chart report pages)**
**Estimated scope: LARGE (6+ files affected by the crash)**

---

## 9. Recommended Fix

**Option 1 (recommended — lowest churn):**
Add to `package.json`:
```json
"overrides": {
  "es-toolkit": "1.46.1"
}
```
Then: `rm -rf node_modules yarn.lock && yarn install && craco build`

**Option 2:** Downgrade `recharts` from `3.6.0` → latest `2.x` (stable minified builds,
but API differences between v2 and v3 need verification across all 30 affected files).

**References:** recharts#7376, toss/es-toolkit#1740/#1756

---

## 10. Open Questions for Planning

| OD | Question | Agent recommendation |
|---|---|---|
| OD-465-01 | Option 1 (`es-toolkit` pin to `1.46.1`) vs Option 2 (`recharts` downgrade to `2.x`)? | **Option 1** — less churn, no API changes |
| OD-465-02 | Should regression cover all 30 chart files in a production build, or spot-check key pages? | Full regression on production build |

---

## 11. Next Step

→ **Planning Gate 2** — Impact Analysis (confirm exact `package.json` change, clean install
procedure, production build regression matrix across all 30 chart pages).

Awaiting owner: **"Gate 2 GO"**
