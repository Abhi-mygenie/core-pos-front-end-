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

---

## RESOLUTION — Backend Fix Delivered (2026-11-26)

**Status: RESOLVED on backend. Frontend ticket: CLOSED — no changes needed.**

### What Backend Did
- Refactored the cancellation SQL query inside `AppReportController.php` → `buildInsightsCancellationData()`
- Changed from `COALESCE`-based timestamp filter to `UNION ALL` branches — exposes range conditions directly to DB query planner
- Deployment files: `app/Http/Controllers/Api/V2/Vendoremployee/AppReportController.php` + `app/Support/UnpaidReason.php` (dependency) + `tests/Unit/InsightsCancellationQueryTest.php`
- No DB migration, no new index, no route change required

### Production Verification (restaurant 541 — The Palm House, 2026-11-26)
| Date range | Before (old query) | After (new query) |
|------------|-------------------|------------------|
| 30-day (Oct) | timeout / very slow | significantly reduced |
| Local dump profile (30d) | 25.075s | 6.053s |

### Preprod Status
- Preprod (t3a.small) still times out — **resource constraint, not a code issue**. Owner accepted handoff based on production verification. Preprod NOT marked passed.

### Frontend Impact
- **ZERO** — same endpoint (`POST /api/v2/vendoremployee/report/insights-dashboard`, `constants.js:147`), same request shape, same response envelope. No field changes.
- Existing loading/error states in `AuditLogMockup.jsx` are sufficient.
- BUG-699 (stale data under error shield) remains a separate FE item if wide-range loads still occasionally timeout on slower connections.

### Decision
- Frontend ticket: **CLOSE — no action**
- Backend ticket: **RESOLVED** — deployed to production
