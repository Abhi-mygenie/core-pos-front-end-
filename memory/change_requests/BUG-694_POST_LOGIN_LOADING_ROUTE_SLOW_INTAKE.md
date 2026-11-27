# BUG-694: Direct URL after fresh login routes through /loading for >10s

**ID:** BUG-694
**Type:** BUG
**Area:** Other
**Priority:** P2
**Risk:** MEDIUM (slow boot/routing after login; usability)
**Severity:** P2 — MEDIUM (>10s stall on direct-URL entry after login)
**QA Severity:** MINOR (was tracked as MINOR-7 in QA Nov Sprint)
**Client:** ALL
**Assignee:** Abhishek (FE, not backend-blocked)
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
Entering a direct URL right after a fresh login routes the user through `/loading` and stalls there for more than 10 seconds before the destination renders.

## Classification
- **Bug** — slow post-login boot/routing
- **Source:** QA-FOUND (QA Nov Sprint, 2026-11-18)
- **Confidence:** CONFIRMED (observed timing >10s)

## Root Cause
Not yet traced. Likely boot/bootstrap data fetch gating the route via `/loading` before hydration completes.

## Evidence
- Source: `memory/test_reports/QA_REPORT_NOV_SPRINT_2026_11_18.md` §Minor/observations
- Handover: §B MINOR-7.

## Blast Radius
- App boot/routing layer. Medium (affects first navigation after login).

## Proposed Fix (NOT YET APPROVED)
Investigate `/loading` gate and boot sequence; reduce/parallelize blocking fetches or render destination progressively.

## Open Questions
None.

## Duplicate Check
- No existing `/loading` slow-route bug found in registry.
- **Verdict:** DISTINCT.
