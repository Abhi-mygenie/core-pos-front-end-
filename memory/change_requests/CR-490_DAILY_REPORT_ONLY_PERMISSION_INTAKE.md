# CR-490 — Report permission split — a user can be given Daily Report access only, with no other reports/insights

**ID:** CR-490  **Type:** CR  **Registered:** 2026-11-05  **Sprint:** nov_cr_batch
**Severity:** P1 (default per owner batch)  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE — BACKEND DEPENDENCY (new permission key)
**Area:** Permissions / Security  **Source:** OWNER-REPORTED (chat 2026-11-05)  **Related:** CR-071, CR-069, CR-068

## Description
Owner: "there is already a CR for role gating; need another CR specific to make a user only daily reports rights, nothing else in report". Granular report rights so a role can see Daily Report and nothing else under Reports/Insights.

## Evidence
- Screenshot: not provided · Curl: not applicable at intake · Confidence: REPORTED

## Duplicate Check
RELATED — CR-071, CR-069, CR-068. Not a duplicate: existing role-gating CRs (CR-068 cancellation, CR-071 app-wide, deferred) do not cover this specific rule.

## Code Reality
NONE (granular) — Sidebar.jsx L41-52 SIDEBAR_PERMISSIONS: `reports` and `insights` both gated by single `report` permission → all-or-nothing. No per-report permission. CR-071 (app-wide role gating) is DEFERRED; this is a scoped carve-out.

## Risk
HIGH — permissions/order edit; Fast Lane: NO

## Blast Radius
MEDIUM (Sidebar.jsx menu filter + reports routes in App.js guard (direct URL access) + Role permission matrix UI); backend: new permission key(s)

## Open Owner Decisions
- OD-490-01 Model: (A) one new key `daily_report` (only Daily Report) or (B) per-report permission keys for all reports — OPEN (A matches ask)
- OD-490-02 "Daily Report" = Reports → Daily Report screen only (all its tabs)? Includes Day Closure? — OPEN
- OD-490-03 Route guard: block direct URL access to other reports — agent recommends YES
- OD-490-04 Backend to add permission key to role matrix — needs confirmation

## Next
Owner ODs + backend confirmation → Planning Gate 2.

## Owner Decisions (locked 2026-11-05)
- OD-490-01 **LOCKED: A** — one new permission key (e.g. `daily_report`) granting Daily Report only.
- OD-490-02 **REVISED 2026-11-07: Order Report screen only** (`/reports/audit` = `AllOrdersReportPage`). NOT Sales Summary. Day Closure already has its own separate right — out of scope.
- OD-490-03 **LOCKED: YES** — route guard blocks direct URL access to all other Reports/Insights pages for such users.
- OD-490-04 backend permission key — CLOSED: `show_daily_report` (module ID 106).

## Owner Decisions (locked 2026-11-05, round 3)
- All Order Report tabs visible: **YES** · Excel/PDF export: **YES** · Insights section hidden: **YES**.
All owner ODs CLOSED. Remaining: backend `daily_report` permission key — **CLOSED** (show_daily_report, ID 106).

## (2026-11-05) INTAKE FROZEN — backend dependency only.

## (2026-11-07) OD-490-02 REVISED — visible screen = Order Report (`/reports/audit`), NOT Sales Summary. Owner directive: "Order Report also should be visible not Sales Summary". IA REFRESHED and CLOSED.

## (2026-11-07) GATE 2 CLOSED — IA refreshed at `impact/CR-490_IMPACT_ANALYSIS_REFRESHED_2026_11_07.md`. R11 probe done, backend confirmed (show_daily_report ID 106). 5 edits / 4 files. Next: Gate 3.

## Backend brief (2026-11-05)
- `backend_briefs/BACKEND_BRIEF_INTAKE_BATCH_2026_11_05.md` §D
