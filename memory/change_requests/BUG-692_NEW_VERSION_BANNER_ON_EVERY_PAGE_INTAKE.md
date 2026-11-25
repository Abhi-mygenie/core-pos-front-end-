# BUG-692: "New version available" banner shows on every page

**ID:** BUG-692
**Type:** BUG
**Area:** Other
**Priority:** P3
**Risk:** LOW (PWA update banner persistence; no functional break)
**Severity:** P3 — LOW (nagging banner on all pages)
**QA Severity:** MINOR (was tracked as MINOR-5 in QA Nov Sprint)
**Client:** ALL
**Assignee:** Abhishek (FE, not backend-blocked)
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
The "New version available — Update now" banner is shown persistently on every page rather than once / until dismissed or updated.

## Classification
- **Bug** — PWA update banner shows too aggressively
- **Source:** QA-FOUND (QA Nov Sprint, 2026-11-18)
- **Confidence:** CONFIRMED (observed on multiple pages)

## Root Cause
Not yet traced. Service-worker update prompt likely re-rendered on every route without a dismiss/update-complete gate.

## Evidence
- Source: `memory/test_reports/QA_REPORT_NOV_SPRINT_2026_11_18.md` §Minor/observations
- Handover: §B MINOR-5.

## Blast Radius
- Global app shell / PWA update prompt. Low.

## Proposed Fix (NOT YET APPROVED)
Gate the banner so it shows once per detected update and clears after update/dismiss.

## Open Questions
None.

## Duplicate Check
- **BUG-661:** RELATED — "PWA manual update — banner never shows"; opposite symptom in the same update-banner feature. Reconcile together.
- **Verdict:** DISTINCT.
