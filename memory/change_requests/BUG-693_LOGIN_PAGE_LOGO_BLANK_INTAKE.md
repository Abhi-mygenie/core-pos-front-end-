# BUG-693: Login-page logo renders blank

**ID:** BUG-693
**Type:** BUG
**Area:** Other
**Priority:** P3
**Risk:** LOW (branding asset not rendering on login)
**Severity:** P3 — LOW (cosmetic — logo area blank)
**QA Severity:** MINOR (was tracked as MINOR-6 in QA Nov Sprint)
**Client:** ALL
**Assignee:** Abhishek (FE, not backend-blocked)
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
On the login page, the logo area renders blank (no image shown). (Note: observed in the QA environment; may be asset-path or env-dependent.)

## Classification
- **Bug** — login logo not rendering
- **Source:** QA-FOUND (QA Nov Sprint, 2026-11-18)
- **Confidence:** REPORTED (observed; asset/env cause unconfirmed)

## Root Cause
Not yet traced. Possible broken asset path, missing build asset, or env-specific logo URL.

## Evidence
- Source: `memory/test_reports/QA_REPORT_NOV_SPRINT_2026_11_18.md` §Minor/observations
- Handover: §B MINOR-6.

## Blast Radius
- Login page branding only. Low.

## Proposed Fix (NOT YET APPROVED)
Verify logo asset path/import and that the asset ships in the build; fix the reference.

## Open Questions
- OD-693-01: Is the logo sourced from a static asset or a per-restaurant/env URL?

## Duplicate Check
- No existing login-logo bug found in registry.
- **Verdict:** DISTINCT.
