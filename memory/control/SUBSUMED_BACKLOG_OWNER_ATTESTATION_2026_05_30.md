# Subsumed Backlog — Owner Attestation Registry (2026-05-30)

**Doc:** SUBSUMED_BACKLOG_OWNER_ATTESTATION_2026_05_30.md
**Status:** ACTIVE — authoritative attestation record
**Audit revision:** v2.9_2026_05_30
**Owner GO:** Received 2026-05-30 (Q1=a, Q2=a, Q3=a)

---

## What this is

A formal record of 8 bugs that were **opened in early sprints, never explicitly closed, but whose underlying defect behaviour was eliminated by subsequent CR / hotfix work the owner is confident shipped**.

Owner has **explicitly waived** code re-investigation to identify the subsuming CR for each bug. This document is the audit trail that records:
1. The waiver (one-time, dated, owner-attested)
2. The new status semantics
3. The honest gap that remains (subsuming CR unidentified)

> **Subsumed ≠ Verified.** A subsumed bug carries an owner *attestation* (verbal acceptance), not owner *verification* (smoke-tested reproduction proves the fix). The dashboard renders these distinctly so future agents can never confuse the two.

---

## Status semantics

- **New status string:** `CLOSED — SUBSUMED (owner-attested)`
- **Category for closure-debt scoring:** archived from active register (counts toward `archived_count`)
- **Completeness target:** 5/7 — Intake stub + Owner Smoke Attestation file present; Code Gate / Implementation Summary / QA Report intentionally stay MISSING.
- **`subsumed_meta` schema** (injected into bug row):
  ```json
  {
    "owner_attested": true,
    "attested_date": "2026-05-30",
    "subsuming_cr": "UNIDENTIFIED — code grep waived by owner",
    "attestation_doc": "/app/memory/control/SUBSUMED_BACKLOG_OWNER_ATTESTATION_2026_05_30.md"
  }
  ```

---

## The 8 attested bugs

| # | ID | Title | Original sprint | Old status | New status |
|---|---|---|---|---|---|
| 1 | BUG-014 | GST Not Applied on Tip Amount | pos_final_1.0 era | INTAKE | CLOSED — SUBSUMED (owner-attested) |
| 2 | BUG-015 | Loyalty / Coupon / Wallet on Collect Bill — feature flags not gating | pos_final_1.0 era | INTAKE | CLOSED — SUBSUMED (owner-attested) |
| 3 | BUG-020 | Final Bill Total — Unwanted Round-Off (₹49.50 → ₹50) | pos_final_1.0 era | INTAKE | CLOSED — SUBSUMED (owner-attested) |
| 4 | BUG-021 | Runtime-Marked Complimentary Item prints actual price on postpaid auto-print | pos_final_1.0 era | INTAKE | CLOSED — SUBSUMED (owner-attested) |
| 5 | BUG-022 | Cancelled Item — no strikethrough in Collect Bill "ITEMS" list | pos_final_1.0 era | INTAKE | CLOSED — SUBSUMED (owner-attested) |
| 6 | BUG-026 | Station Panel — Variant/Add-on aggregation | pos_final_1.0 era | INTAKE | CLOSED — SUBSUMED (owner-attested) |
| 7 | BUG-027 | Room Check-In — "Advance" payment method not captured | pos_final_1.0 era | INTAKE | CLOSED — SUBSUMED (owner-attested) |
| 8 | PROD-006 | Takeaway print: custPhone empty when no phone entered | Production Hotfix | INTAKE | CLOSED — SUBSUMED (owner-attested) |

### Extension batch — v2.9.1 (2026-05-30 same day, owner Q1=a, Q2=a)

4 additional bugs reclassified using the same protocol. Three retain the default `"UNIDENTIFIED — code grep waived by owner"` subsuming-CR field. **BUG-106 carries an explicit owner-provided subsumption hint** (kept as free-text, not a verified CR ID).

| # | ID | Title | Original section | Old status | New status | Subsuming CR (per owner) |
|---|---|---|---|---|---|---|
| 9 | BUG-018 | Collect Bill UI — Ability to Mark an Item as Complimentary | older_closed_or_partial | PARTIAL DOCUMENTATION | CLOSED — SUBSUMED (owner-attested) | UNIDENTIFIED — code grep waived |
| 10 | BUG-104 | Credit/Tab Management module | active_recent_bugs | OWNER SCOPE NEEDED | CLOSED — SUBSUMED (owner-attested) | UNIDENTIFIED — code grep waived |
| 11 | BUG-106 | CRM Notes API integration | active_recent_bugs | CRM-BLOCKED | CLOSED — SUBSUMED (owner-attested) | **Absorbed during CRM Coupon/Loyalty module integration — CRM backend delivered concurrently with that work; code grep waived by owner** |
| 12 | BUG-108 | CRM Coupon/Loyalty/Wallet | active_recent_bugs | PARTIAL | CLOSED — SUBSUMED (owner-attested) | UNIDENTIFIED — code grep waived |

Net effect of extension batch:
- `active_recent_bugs` section: 25 → **22** rows (3 moved out, BUG-018 was already in `older_closed_or_partial`).
- Closure Debt active register: 33 → **32** (BUG-106 was tracked there at 6/7 — now archived).

> **Note on BUG-106's subsuming-CR hint:** This is the owner's attestation, not a code-verified link. The dashboard still renders it under the same amber `SUBSUMED` pill as the other 11 — distinct from `OWNER VERIFIED`. The hint exists for future agents to use as a starting point if they want to grep for the real subsuming commit.

### Extension batch — v2.10 — CR Registry attestations (2026-05-30, owner Q1=a, Q2=keep+flag)

Same protocol extended to the **CR Registry**. 5 CRM 2.0 CRs attested as subsumed; pre-existing `SUBSUMED into CR-002` rows visually reclassified from grey → green.

| # | ID | Title | Sprint | Old status | New status | Refs caveat |
|---|---|---|---|---|---|---|
| 13 | CR-003 | Tab | CRM 2.0 | NOT_STARTED | CLOSED — SUBSUMED (owner-attested) | over-matched-by-scanner |
| 14 | CR-004 | Up-sell | CRM 2.0 | NOT_STARTED | CLOSED — SUBSUMED (owner-attested) | over-matched-by-scanner |
| 15 | CR-005 | Wallet | CRM 2.0 | NOT_STARTED | CLOSED — SUBSUMED (owner-attested) | over-matched-by-scanner |
| 16 | CR-008 | Integrations | CRM 2.0 | NOT_STARTED | CLOSED — SUBSUMED (owner-attested) | over-matched-by-scanner |
| 17 | CR-009 | BUG-108 Carryover | CRM 2.0 | NOT_FORMALIZED | CLOSED — SUBSUMED (owner-attested) | over-matched-by-scanner |

Net effect of CR batch:
- CR Registry active count: 26 → **20**
- CR Registry SHIPPED count: 27 → **33** (5 new + 1 reclassification effect)
- Scanner over-match flagged via `refs_quality: "over-matched-by-scanner"` on these 5 rows.
- `CR_STATUS_CATEGORY` map now routes both `SUBSUMED into CR-002` AND `CLOSED — SUBSUMED (owner-attested)` to the `SHIPPED` bucket so the active-count badge drops correctly.

### Visual fix shipped with v2.10

`SUBSUMED` strings in the StatusPill regex moved from `status-NOT_STARTED` (grey) → `status-CLOSED` (green). This finally aligns the visual class of CR-001/006/007 (the original `SUBSUMED into CR-002` rows) with their true closed semantics — they previously rendered grey, confusing the "items needing attention" picture.

---

## Explicitly OUT of scope

| ID | Reason |
|---|---|
| BUG-040 | Audit Report Excel/CSV export format — owner confirms still open (pos_final_1.0) |
| BUG-041 | Audit Report PDF download — owner confirms still open (pos_final_1.0) |
| All 25 active CRs (POS2-*, BUG-090..108, CR-003..009, etc.) | Out of scope for this batch per Q1=a |

---

## Owner attestation statement

> *I, the project owner, attest that the 8 bug items listed above describe defect behaviour that no longer reproduces in the current production build. I have made the deliberate trade-off to **waive code-level identification of the subsuming CR(s)** rather than spend additional engineering time on backward investigation. I accept that the audit trail therefore carries a permanent "subsuming CR unidentified" gap on each of these bugs, and I accept the lower completeness score (5/7 rather than 7/7) that this waiver produces.*
>
> *— Owner, 2026-05-30, async ("a") attestation*

---

## Reversal protocol

If at any later point the subsuming CR / commit / sprint is identified (e.g. during another audit or while investigating an adjacent bug), the agent **must**:

1. Update the bug's `subsumed_meta.subsuming_cr` field from `"UNIDENTIFIED — code grep waived by owner"` to the discovered CR/commit ID.
2. Add a `status_history` entry: `{from: "CLOSED — SUBSUMED (owner-attested)", to: "CLOSED — OWNER VERIFIED", reason: "Subsuming CR identified: <CR_ID>. Owner attestation upgraded to verification."}`.
3. Append a verification-upgrade row to this registry doc.
4. Optionally re-run scanner to refresh completeness (could move 5/7 → 7/7 if real Code Gate + Impl Summary + QA can now be attached).

Until then, these bugs stay at 5/7 with the honest amber `SUBSUMED` pill.

---

## Scanner / dashboard contract

- **Scanner v2.9** treats any file matching `*_SUBSUMED_OWNER_ATTESTATION*.md` as the `smoke_signoff` slot for its target bug AND flags the ref with `subsumed_owner_attested: true`.
- **Dashboard v2.9** renders an amber `SUBSUMED` pill next to the bug status when `subsumed_meta.owner_attested === true`. Tooltip discloses the waiver.

---

*Authored by: Implementation Agent (E1 fork), 2026-05-30. Master registry — do not edit without owner approval.*
