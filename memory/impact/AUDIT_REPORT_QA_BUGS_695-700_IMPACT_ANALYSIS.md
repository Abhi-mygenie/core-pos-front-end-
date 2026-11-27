# Impact Analysis (Gate 2) — Audit Report QA Bugs (BUG-695…700)

**Gate:** 2 — Impact Analysis
**Role:** PLANNING
**Date:** 2026-11-18
**Stage dispatch:** Impact Analysis ONLY (Gate 2). Implementation Plan (Gate 3) NOT written — awaiting owner review.
**Scope:** 6 defects found during CR-528/CR-546 QA (2026-11-18): BUG-695, BUG-696, BUG-697, BUG-698, BUG-699, BUG-700.
**Why one combined doc:** all 6 are defects on a single page (`AuditLogMockup.jsx`, v3 Audit Report) except BUG-696's service/backend angle; one IA avoids 6 near-duplicate files and lets Gate 3 batch the same-file edits safely.

---

## Header — Code Reality + Conflict Pre-Check

**Code Reality:** PARTIAL — the Audit Report v3 page exists and works; these are defects/omissions in existing code (not greenfield). Verified at HEAD this session:
- `frontend/src/pages/reports-module/AuditLogMockup.jsx` = 451 lines (component `AuditReportPage`).
- `frontend/src/api/services/insightsService.js` `fetchInsightsDashboard` = L600-606.
- `frontend/src/api/axios.js` shared instance `timeout: 60000` = L18.

**Conflict Pre-Check:**
| Item | File | Status | Conflict? |
|------|------|--------|-----------|
| CR-528 | AuditLogMockup.jsx | GATE_5A_IMPLEMENTED | NO — implemented, not in active edit; these bugs are additive fixes |
| CR-543 / CR-544 / CR-546 | AuditLogMockup.jsx | GATE_5A_IMPLEMENTED | NO — v3 already shipped |
| BUG-687 | AuditLogMockup.jsx | GATE_1_INTAKE | NO — spec-reconciliation (no code), recommend close as "works per v3" |
| **BUG-691** | AuditLogMockup.jsx (TIME column) | GATE_1_INTAKE | **PARALLEL-SAFE but SAME FILE** — sibling QA finding; must be batched/sequenced with this set at Gate 3 to avoid line-shift. (Note: in v3 the drill-down "Time" cell uses `fmtTime` → HH:MM at L147; BUG-691's "2026-" clip may already be resolved — Gate 3 must re-verify.) |
| BUG-696 | insightsService.js / axios.js | this set | axios.js is shared (BUG-197/198 own the header) — do NOT change global timeout (see R1) |

**Verdict:** CLEAN. No competing in-flight edits. Sequence note: at Gate 3, apply all `AuditLogMockup.jsx` edits (BUG-695/697/698/699/700 + BUG-691) in one pass, bottom-up, to avoid line-number drift.

**FILE_OWNERSHIP:** `AuditLogMockup.jsx` (CR-011 → v3 CR-543/544/546, not an R5 hotspot); `insightsService.js` (Insights agent, shared by Dashboard + all Insights reports); `axios.js` (shared global — sensitive).

**Risk roll-up:** 5 × LOW (BUG-695/697/699/700 cosmetic/testability; BUG-698 LOW + 1 owner decision), 1 × MEDIUM (BUG-696 — shared service + backend dependency).

---

## BUG-695 — Card 1 nested `<button>` (invalid HTML + console error) · Risk LOW

- **Data flow / location:** `AuditLogMockup.jsx` Card 1 header — outer toggle `<button data-testid="audit-card1-toggle">` (L347) wraps inner `<button data-testid="audit-card1-link">` (L362). React errors `<button> cannot be a descendant of <button>` on every render.
- **Downstream:** none — purely DOM structure of the card header.
- **Fix direction (Gate 3):** convert the outer toggle to `<div role="button" tabIndex={0}>` with keyboard handler, OR lift the "Cancellation Report" link out of the toggle into the right-side action group. Preserve both testids.
- **Owner decisions:** none.

## BUG-696 — Audit Report times out on 30D/FY (insights-dashboard ~43s vs 60s) · Risk MEDIUM

- **Data flow:** `AuditReportPage.fetchData` (L198-205) → `fetchInsightsDashboard(from,to)` (insightsService.js L600-606) → `api.post(INSIGHTS_DASHBOARD)` on the shared axios instance (`axios.js` L18 `timeout:60000`). Backend `/api/v2/vendoremployee/report/insights-dashboard` responds ~43s for 1-7 days; wide ranges exceed 60s → abort → error shield.
- **Downstream consumers (IMPORTANT):** `fetchInsightsDashboard` is also consumed by the Insights **Dashboard** (`transformDashboardResponse`, CR-049). The shared `api` instance backs **every** endpoint.
- **Root cause:** external backend latency (primary). FE timeout is a secondary limiter.
- **Fix direction (Gate 3):**
  1. **Backend (primary, Gyan):** optimise `insights-dashboard` latency. **Needs a backend brief** (not yet filed).
  2. **FE (secondary):** pass a per-request `{ timeout: <N> }` as the 3rd arg to `api.post` inside `fetchInsightsDashboard` **only** — do NOT raise the global `axios.js:60000` (R1). Also avoid showing stale data (see BUG-699).
- **Owner decisions:** OD-696-01 — acceptable max wait for this report (e.g. 90s/120s)? Confirm before setting a per-request timeout.

## BUG-697 — Active preset highlight ("7D") doesn't match applied range · Risk LOW

- **Location:** `AuditLogMockup.jsx` L171 `useState('7D')`; applied/shared range comes from `sharedFrom/sharedTo` (L166-170). On first load the chip shows 7D while the real range is the shared range (often Today).
- **Downstream:** cosmetic only (preset chip highlight). Shared range logic unaffected.
- **Fix direction (Gate 3):** initialise `activePreset` by matching the shared/applied range to a known preset, else `''` (no highlight).
- **Owner decisions:** none.

## BUG-698 — FY preset: no shared-range sync + previous-FY window · Risk LOW (1 decision)

- **Location:** `AuditLogMockup.jsx` L192 FY branch of `handlePreset` — sets local+applied dates via `computePresetRange('FY')` but omits `setSharedFrom/setSharedTo` (every other preset calls them). `computePresetRange('FY')` (datePresets util) returns the previous completed FY (2025-04-01…2026-03-31 in Nov 2026).
- **Downstream:** FY range not propagated to other Insights pages via shared context.
- **Fix direction (Gate 3):** add `setSharedFrom/setSharedTo` to the FY branch for parity. FY window change is gated on owner decision.
- **Owner decisions:** **OD-698-01 — should FY mean the current in-progress FY or the previous completed FY?** (Do not guess — Rule R3.) Changing `computePresetRange` would affect every report using FY.

## BUG-699 — Stale data remains under the error shield after timeout · Risk LOW

- **Location:** `fetchData` catch (L200-203) sets `error` but does not clear `rawData`; render gate `{analytics && ...}` (L334) keeps showing the prior range's KPIs/cards beneath `ReportLoadingShield`'s error (L332). Date inputs already show the new range → misleading.
- **Downstream:** none beyond this page's render.
- **Fix direction (Gate 3):** on error, either clear `rawData` (and `analytics`) or visibly mark displayed numbers as "last loaded range". Pairs with BUG-696.
- **Owner decisions:** OD-699-01 — on error, blank the data or keep-but-label? (recommend blank.)

## BUG-700 — Empty-state RiskBar / DrillDownTable lose testids · Risk LOW (testability)

- **Location:** `RiskBar` early return L93 ("No high-risk cancellations" — no `audit-card1-risk-bar`); `DrillDownTable` early return L123 ("No events" — no table testid e.g. `audit-card3-table`). Automated QA can't locate these regions at 0 events (exactly the cafe103 case).
- **Downstream:** QA automation only; no user-facing behaviour.
- **Fix direction (Gate 3):** add the respective `data-testid` to the empty-state wrapper of each.
- **Owner decisions:** none.

---

## Combined Blast Radius

| File | Bugs | Approx lines | Risk |
|------|------|--------------|------|
| `frontend/src/pages/reports-module/AuditLogMockup.jsx` | 695, 697, 698(FE), 699, 700 (+ sibling 691) | ~15-25 | LOW |
| `frontend/src/api/services/insightsService.js` | 696 (per-request timeout) | ~1-2 | MEDIUM (shared service) |
| `frontend/src/api/axios.js` | 696 — **DO NOT TOUCH** (global) | 0 | — |
| Backend `insights-dashboard` (Gyan) | 696 (primary) | n/a | MEDIUM |

**Files WILL change (at Gate 3):** `AuditLogMockup.jsx`, `insightsService.js` (per-request timeout only).
**Files WILL NOT touch:** `axios.js` (global), `reportExporter.js`, `InsightsCacheContext.jsx`, `datePresets.js` (unless OD-698-01 changes FY), any transform, any other report page.

---

## Owner Decision Queue

| # | Bug | Decision needed |
|---|-----|-----------------|
| OD-696-01 | BUG-696 | Acceptable max wait for the Audit Report (e.g. 90s / 120s) before timeout? |
| OD-698-01 | BUG-698 | FY = current in-progress FY or previous completed FY? (affects all FY reports) |
| OD-699-01 | BUG-699 | On load error, blank the stale data or keep-but-label it? (recommend blank) |

**Owner decisions RESOLVED 2026-11-18:**
- **OD-696-01** → backend brief FILED: `backend_briefs/BACKEND_BRIEF_BUG-696_2026-11-18.md` (Gyan). FE per-request timeout deferred pending backend outcome; global `axios.js:60000` untouched.
- **OD-698-01** → **PREVIOUS COMPLETED FY** (current behaviour correct). Gate 3: only add `setSharedFrom/setSharedTo` to the FY branch for shared-range parity; do NOT change `computePresetRange('FY')`.
- **OD-699-01** → clear stale data on error (blank). Confirmed NOT caused by missing backend data — trigger is the BUG-696 timeout; defect is FE not clearing `rawData` on error.

---

## Verification Matrix (seeds QA / Gate 3)

| # | Bug | Check | Method | Automated? |
|---|-----|-------|--------|:---:|
| V1 | 695 | No `<button> cannot be a descendant of <button>` console error on load; Card 1 link + toggle both still work | Browser console + click | NO |
| V2 | 696 | 30D/FY ranges load (within agreed timeout) OR clean long-running state; global axios timeout unchanged | Browser + grep axios.js:18 == 60000 | PARTIAL |
| V3 | 697 | First-load preset highlight matches the actual applied range | Browser | NO |
| V4 | 698 | FY preset updates shared range (other Insights pages inherit it); FY window per OD-698-01 | Browser + context | NO |
| V5 | 699 | After a forced error, no stale KPI/card numbers shown under the banner | Browser (throttle/timeout) | NO |
| V6 | 700 | Empty-state shows `audit-card1-risk-bar` and `audit-card3-table` testids at 0 events | DOM query (cafe103) | YES |
| V7 | all | Webpack 0 new warnings | dev server | YES |

---

```
Impact Analysis complete for 6 items (BUG-695…700). Gate 2 only — no Implementation Plan written.
Code reality: PARTIAL (v3 page exists; defects in existing code).
Conflict pre-check: CLEAN (batch same-file edits with sibling BUG-691 at Gate 3).
Scope: AuditLogMockup.jsx + insightsService.js (per-request timeout). WILL NOT touch axios.js global.
Owner decisions needed: OD-696-01, OD-698-01, OD-699-01 + backend brief for BUG-696.
Awaiting owner review → Gate 3 (Implementation Plan).
```
