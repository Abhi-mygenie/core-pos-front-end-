# BUG-014 — Owner Smoke Attestation (subsumed)

**Bug:** BUG-014
**Title:** GST Not Applied on Tip Amount
**Type:** Owner Smoke Sign-off via attestation (NOT verification)
**Date:** 2026-05-30
**Audit revision:** v2.9_2026_05_30

---

## Attestation

The project owner attests, on 2026-05-30, that the defect behaviour originally tracked under BUG-014 **no longer reproduces in the current production build**. The owner has waived code-level identification of the subsuming CR / commit.

This file functions as the Smoke Sign-off slot artifact for closure-debt scoring purposes. It is **not** equivalent to a normal Owner Smoke Sign-off (which requires a reproduction-and-verification step). The dashboard surfaces this distinction via the amber `SUBSUMED` pill on the bug row and the tooltip on the artifact dot.

## Honest gaps preserved

This attestation does NOT manufacture:
- A Code Gate (the actual fix's code-walk is not on record)
- An Implementation Summary (the actual fixing commit is not identified)
- A QA Report (no fresh QA cycle was run for this attestation)

Those three slots stay MISSING in the closure-debt register; this bug therefore sits at **5/7 completeness**, not 7/7.

## Reversal

If the subsuming CR is later identified, this attestation should be upgraded per the protocol described in:
- `/app/memory/control/SUBSUMED_BACKLOG_OWNER_ATTESTATION_2026_05_30.md`

---

*Filed by: Implementation Agent (E1 fork) on owner attestation, 2026-05-30.*
