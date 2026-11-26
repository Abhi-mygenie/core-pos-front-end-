# BUG-696: Audit Report cannot load 30D/FY ranges — insights-dashboard exceeds 60s timeout

**ID:** BUG-696
**Type:** BUG
**Area:** Reports / Analytics
**Priority:** P1
**Risk:** MEDIUM (report unusable for common wide ranges)
**Severity:** P1 — HIGH (feature works only for short ranges)
**QA Severity:** MAJOR
**Client:** ALL
**Assignee:** Gyan (backend latency root cause) → Abhishek (FE timeout option)
**Routing reason:** Root cause is external preprod `insights-dashboard` latency; FE can also raise the request timeout
**Source:** QA-FOUND (CR-528/CR-546 QA, 2026-11-18)
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
On the Audit Report, selecting the **30D** or **FY** preset shows the error shield "Failed to load report data — timeout of 60000ms exceeded". Short ranges (Today / 7D) load but take ~43s.

## Root Cause
External backend: `POST preprod /api/v2/vendoremployee/report/insights-dashboard` responds in ~43s even for 1–7 day ranges; wide ranges exceed the frontend's 60s axios timeout and abort (`net::ERR_ABORTED`).

## Evidence
- `test_reports/iteration_1.json` → backend_issues.critical + integration_issues.
- QA report: `memory/test_reports/CR-528_CR-546_QA_REPORT_2026-11-18.md`.

## Proposed Fix (NOT YET APPROVED)
- Backend (Gyan): optimise `insights-dashboard` latency. **Backend brief to be filed.**
- Frontend (optional): raise the request timeout for this report, and/or show a clearer long-running state. Do not clear stale data under the error shield.

## Impact on this QA
Blocked wide-range verification of CR-528/CR-546 drill-down data (short ranges for cafe103 had 0 post-print events).

## Duplicate Check
- No existing insights-dashboard timeout bug found. DISTINCT. RELATED to CR-528/CR-546 (same page).
