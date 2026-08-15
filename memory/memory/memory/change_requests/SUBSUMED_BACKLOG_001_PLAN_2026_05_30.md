# Subsumed Backlog Owner Attestation 001 — Plan

**Doc:** SUBSUMED_BACKLOG_001_PLAN_2026_05_30.md
**Date:** 2026-05-30
**Audit revision:** v2.9_2026_05_30
**Owner GO:** Received 2026-05-30 (Q1=a · Q2=a · Q3=a)

---

## Problem

10 bugs sat in `INTAKE` status indefinitely (8 in `true_intake_or_blocked` + `intake_only_bugs` clusters; 1 in `production_hotfixes`; minus 2 the owner confirmed still open). Owner is confident their defect behaviour was eliminated by later CR / hotfix work but does **not** want to grep code to identify the subsuming CRs.

## Approach (3 steps, owner-attestation-only)

1. **Introduce new status** `CLOSED — SUBSUMED (owner-attested)` distinct from `OWNER VERIFIED`.
2. **Move 8 target bugs** from intake-flavoured sections → `older_closed_or_partial`.
3. **Generate minimal artifacts**:
   - Intake stub (Artifact #1 slot)
   - Owner Smoke Attestation file (Artifact #7 slot)
   - Leave Code Gate / Impl Summary / QA Report MISSING — preserves honest gap (5/7, not 7/7).
4. **Scanner v2.9** treats `*_SUBSUMED_OWNER_ATTESTATION*.md` as smoke_signoff slot AND flags refs with `subsumed_owner_attested: true`.
5. **Dashboard v2.9** renders amber `SUBSUMED` pill + Subsumption Attestation panel in the row-detail view; artifact rows show "subsumed · owner-attested" labels.

## Targets (8)

BUG-014, BUG-015, BUG-020, BUG-021, BUG-022, BUG-026, BUG-027, PROD-006.

## Out of scope

- BUG-040, BUG-041 (owner confirms genuinely open).
- All 25 active CRs in the CR Registry (per Q1=a — bug-side-only this batch).
- Pre-existing duplicate rows for BUG-040/041/044/085 across intake sections — separate cleanup.

## Honest-debt principles

- Owner attestation ≠ owner verification.
- Subsuming CR explicitly recorded as `"UNIDENTIFIED — code grep waived by owner"`.
- 5/7 completeness, not 7/7 — Code Gate, Impl Summary, QA stay MISSING.
- Reversal protocol documented in master registry — discoverable if subsuming CR turns up later.

Full execution log in `SUBSUMED_BACKLOG_001_REPORT_2026_05_30.md`.
