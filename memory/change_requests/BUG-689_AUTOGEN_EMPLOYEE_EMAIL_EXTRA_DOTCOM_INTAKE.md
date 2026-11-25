# BUG-689: Auto-generated employee email gets an extra ".com" appended

**ID:** BUG-689
**Type:** BUG
**Area:** Settings / Configuration
**Priority:** P2
**Risk:** LOW (string formatting; may create malformed email)
**Severity:** P2 — MEDIUM (could produce an invalid email like `testqa@rubyzap.com`)
**QA Severity:** MINOR (was tracked as MINOR-2 in QA Nov Sprint)
**Client:** ALL
**Assignee:** Abhishek (FE, not backend-blocked)
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
When an employee is created, the auto-generated email appends an extra `.com` to the domain (e.g. first name "Testqa" → `testqa@rubyzap.com` with the domain doubled/`.com` appended).

## Classification
- **Bug** — email generation string handling
- **Source:** QA-FOUND (QA Nov Sprint, 2026-11-18, noted during BUG-229 PASS)
- **Confidence:** CONFIRMED (observed during employee creation)

## Root Cause
Not yet traced. Email-builder appears to append `.com` even when the domain already includes it.

## Evidence
- Source: `memory/test_reports/QA_REPORT_NOV_SPRINT_2026_11_18.md` §Batch 6 (BUG-229 note)
- Handover: §B MINOR-2.

## Blast Radius
- Employee setup email generation. Low–medium (malformed address risk).

## Proposed Fix (NOT YET APPROVED)
Trace employee email builder; strip/guard duplicate `.com` suffix.

## Open Questions
None.

## Duplicate Check
- **BUG-229 / BUG-230:** RELATED — both are the employee auto-email feature that passed QA; this is a newly-observed formatting defect.
- **Verdict:** DISTINCT.
