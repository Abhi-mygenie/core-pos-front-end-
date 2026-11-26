# BUG-690: Add-on list does not auto-refresh after creating an add-on

**ID:** BUG-690
**Type:** BUG
**Area:** Menu / Order Entry
**Priority:** P3
**Risk:** LOW (stale list until manual refresh)
**Severity:** P3 — LOW (cosmetic/UX; data is saved)
**QA Severity:** MINOR (was tracked as MINOR-3 in QA Nov Sprint)
**Client:** ALL
**Assignee:** Abhishek (FE, not backend-blocked)
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
After creating a new add-on, the add-on list does not refresh immediately; the new add-on appears only after a manual refresh/navigation.

## Classification
- **Bug** — missing list refresh after create
- **Source:** QA-FOUND (QA Nov Sprint, 2026-11-18, noted during BUG-669 PASS)
- **Confidence:** CONFIRMED (observed during add-on create)

## Root Cause
Not yet traced. Create handler likely doesn't re-fetch/invalidate the add-on list.

## Evidence
- Source: `memory/test_reports/QA_REPORT_NOV_SPRINT_2026_11_18.md` §Batch 6 (BUG-669 note)
- Handover: §B MINOR-3.

## Blast Radius
- Add-on management screen. Low.

## Proposed Fix (NOT YET APPROVED)
Re-fetch or optimistically insert the new add-on into the list after a successful create.

## Open Questions
None.

## Duplicate Check
- **BUG-669:** RELATED — observed while verifying BUG-669 (add-on validation).
- **Verdict:** DISTINCT.
