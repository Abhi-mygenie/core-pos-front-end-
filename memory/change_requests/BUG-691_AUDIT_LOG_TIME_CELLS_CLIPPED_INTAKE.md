# BUG-691: Audit Log TIME cells clipped at "2026-"

**ID:** BUG-691
**Type:** BUG
**Area:** Reports / Analytics
**Priority:** P3
**Risk:** LOW (display clipping; data likely present)
**Severity:** P3 — LOW (cosmetic — timestamp truncated in cell)
**QA Severity:** MINOR (was tracked as MINOR-4 in QA Nov Sprint)
**Client:** ALL
**Assignee:** Abhishek (FE, not backend-blocked)
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
On the Audit Log report, some TIME column cells are clipped and show only `"2026-"` instead of the full timestamp.

## Classification
- **Bug** — column width / truncation issue
- **Source:** QA-FOUND (QA Nov Sprint, 2026-11-18, noted during CR-528 check)
- **Confidence:** CONFIRMED (observed in browser)

## Root Cause
Not yet traced. Likely a fixed/narrow TIME column width or `overflow` clipping the value.

## Evidence
- Source: `memory/test_reports/QA_REPORT_NOV_SPRINT_2026_11_18.md` §Batch 5 (CR-528 MINOR)
- Handover: §B MINOR-4.

## Blast Radius
- Audit Log table TIME column. Low.

## Proposed Fix (NOT YET APPROVED)
Widen TIME column / allow wrap so the full timestamp is visible.

## Open Questions
None.

## Duplicate Check
- **CR-528 / BUG-687:** RELATED — same Audit Log page; BUG-687 covers the layout/spec, this is a separate cell-clipping defect.
- **Verdict:** DISTINCT.
