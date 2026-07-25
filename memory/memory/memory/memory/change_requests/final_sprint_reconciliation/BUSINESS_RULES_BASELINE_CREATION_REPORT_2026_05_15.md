# Business Rules Baseline Creation — Report

**Document Type:** Audit / Summary Report for the Baseline Creation Activity
**Date:** 2026-05-16 (filename retains the 2026-05-15 sprint reconciliation slug)
**Branch of Record:** `business-rules`
**Activity:** Creation of `BUSINESS_RULES_BASELINE_FINAL.md` and `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`

---

## 1. Executive Summary

Following the 2026-05-16 owner approval session covering 56 candidate business rules, this report documents the creation of the permanent business-rules baseline.

- **Frozen into baseline:** 32 rules
- **Held in pending register:** 24 rules + 9 verification gates + 12 linked implementation bugs
- **Code changes performed:** **NONE** (this activity is documentation-only)
- **Commits performed:** **NONE**
- **Source-of-truth retained:** the original reconciliation & implementation handoff document

The baseline document captures only rules that are owner-approved without amendment AND already match the code behaviour. Anything requiring a code change, runtime/print/backend verification, or further owner clarification was deliberately excluded and routed to the pending register.

---

## 2. Source Material Used

| Document | Path |
|---|---|
| Reconciliation & implementation handoff | `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULE_OWNER_APPROVAL_RECONCILIATION_AND_BUG_HANDOFF_2026_05_16.md` |
| Freeze candidate (input list of 56 rules) | `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_FREEZE_CANDIDATE_2026_05_15.md` |
| Owner approval sheet | `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_FREEZE_OWNER_APPROVAL_SHEET_2026_05_16.md` |
| Owner approval session log | `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_OWNER_APPROVAL_SESSION_2026_05_16.md` |
| Architecture decisions reference | `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` |
| Approval setup handover | `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULE_APPROVAL_SETUP_HANDOVER_2026_05_16.md` |

The reconciliation handoff document is the canonical structuring source; its Section 1 lists the rules eligible for freeze, while Sections 2–6 describe everything excluded from freeze.

---

## 3. Master Counts

| Category | Count |
|---|---|
| Total rules in freeze candidate | 56 |
| Section 1 — Approved, ready to freeze | 32 |
| Section 2 — Rejected (code bugs) | 2 |
| Section 3 — Approved-with-amendment (code alignment required) | 15 |
| Section 4 — Deferred (insufficient info) | 3 |
| Section 5 — Pending runtime / live-print / backend verification | 9 items |
| Section 6 — Implementation bugs | 12 |

Section 1 was promoted in full into the frozen baseline. Sections 2–5 were placed into the pending register. Section 6 is cross-referenced from the pending register.

---

## 4. What Was INCLUDED in the Baseline

The 32 rules below were promoted into `BUSINESS_RULES_BASELINE_FINAL.md`. The rationale for each is that the rule was: (a) owner-approved without amendment, and (b) already matches code behaviour (some are smoke-passed).

| # | Rule ID | Business Area |
|---|---|---|
| 1 | TAX-001 | Tax |
| 2 | TAX-002 | Tax |
| 3 | TAX-003 | Tax |
| 4 | TAX-005 | Tax |
| 5 | TAX-008 | Tax |
| 6 | SC-001 | Service Charge |
| 7 | SC-002 | Service Charge |
| 8 | SC-003 | Service Charge |
| 9 | SC-006 | Service Charge |
| 10 | DEL-004 | Delivery |
| 11 | DEL-005 | Delivery (Smoke passed) |
| 12 | TIP-001 | Tip |
| 13 | TIP-002 | Tip |
| 14 | ROUND-002 | Round-off |
| 15 | TOTALS-001 | Totals |
| 16 | TOTALS-002 | Totals |
| 17 | PAY-001 | Payment |
| 18 | PAY-002 | Payment |
| 19 | PAY-004 | Payment |
| 20 | PAY-007 | Payment (frozen as current-state, future backend coordination tracked in pending register) |
| 21 | PAY-008 | Payment |
| 22 | SCAN-001 | Scan & Order |
| 23 | DASH-001 | Dashboard (Smoke passed) |
| 24 | DASH-002 | Dashboard |
| 25 | DASH-003 | Dashboard |
| 26 | POLL-001 | Polling |
| 27 | POLL-004 | Polling |
| 28 | BOOT-001 | Boot |
| 29 | BOOT-002 | Boot |
| 30 | ROOM-001 | Room |
| 31 | MISC-001 | Ordering |
| 32 | MISC-002 | Ordering |

---

## 5. What Was EXCLUDED from the Baseline

### 5.1 Excluded — Rejected Rules (2)
Owner declared the documented rule wrong; the corrected rule cannot be frozen until code is fixed.

| Rule ID | Reason for Exclusion | Tracked In |
|---|---|---|
| TIP-003 | Tip/tip GST must NOT apply on Takeaway/Delivery — current code may still apply it. | Pending register Part A1, BUG-001 |
| ROUND-001 | Round-off must always be ceiling, never floor — code uses a conditional. | Pending register Part A2, BUG-002 |

### 5.2 Excluded — Approved-With-Amendment Rules (15)
Owner approved the amended form; the implementation must verify and correct the code before freeze.

TAX-004, TAX-006, TAX-007, SC-005, DEL-001, DEL-002, DEL-003, PAY-003, PAY-009, SCAN-002, SCAN-003, TOTALS-003, POLL-002, POLL-003, ROOM-002.

> Tracked in pending register Part B (B1–B15) with linked bug references.

### 5.3 Excluded — Deferred Rules (3)
Owner could not decide without further information.

| Rule ID | Reason for Exclusion | Tracked In |
|---|---|---|
| TOTALS-004 | Room order grand-total composition needs runtime + backend confirmation. | Pending register Part C1 |
| PAY-006 | Transfer-to-room payload content needs runtime capture. | Pending register Part C2 |
| SC-004 / PAY-005 | Alleged SC GST double-count on print needs payload comparison from owner. | Pending register Part C3 |

### 5.4 Excluded — Pending Verification Gates (9)
Not bugs; awaiting runtime / live-print / backend confirmation.

DASH-004, PRINT-001, PRINT-002, ROOM-002 (runtime), TOTALS-004 (backend + runtime), PAY-006 (runtime), SC-004/PAY-005 (print payload comparison), PAY-007 (future backend coordination on `'sucess'` typo), POLL-003 (backend confirmation on status-8/9 exclusion).

> Tracked in pending register Part D.

### 5.5 Cross-Referenced — Implementation Bugs (12)
Listed for traceability only; details remain in the reconciliation handoff Section 6.

BUG-001 … BUG-012. See pending register Part E.

---

## 6. Rationale & Methodology

1. **Single source of truth:** The reconciliation handoff document was treated as the canonical post-approval source. Only Section 1 of that document was eligible for the frozen baseline; everything else was, by definition, blocked.
2. **No silent resolution:** Where the owner deferred, asked a question, or required verification, no answer was invented. Those items were copied verbatim into the pending register.
3. **No invented logic:** Every rule statement in the baseline matches the wording in the reconciliation handoff. Cosmetic edits (heading structure, grouping by area, currency symbols, light punctuation) were applied for readability without altering meaning.
4. **No code reading or verification was performed in this activity.** The categorization of each rule as "code-validated" or "needs alignment" was inherited directly from the owner approval session and the reconciliation document's section assignments.
5. **No commits, no register updates, no code changes** — strictly per the owner's no-action constraints.

---

## 7. Files Created by This Activity

| File | Purpose |
|---|---|
| `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md` | Permanent frozen baseline of 32 owner-approved, code-validated rules. |
| `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md` | Tracking register for the 24 unfrozen rules + 9 verification gates + 12 linked bugs. |
| `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_BASELINE_CREATION_REPORT_2026_05_15.md` | This report — audit trail of what was included, excluded, and why. |

No other files were created or modified.

---

## 8. Open Items for Downstream Agents

The following remain open and must be addressed by the next agent(s), but **were not part of this documentation activity**:

- Implementation Agent: BUG-001 through BUG-012 per the reconciliation handoff Section 6 start checklist.
- QA / Runtime Agent: capture runtime payloads for ROOM-002, TOTALS-004, PAY-006; runtime verification for DASH-004; live-print verification for PRINT-001, PRINT-002.
- Backend Coordination: confirm permanence of `'sucess'` (PAY-007) and status-8/9 exclusion (POLL-003).
- Owner: provide the SC-004 / PAY-005 print payload + bill comparison.

When all gates clear for any individual rule, the rule may be promoted from the pending register into the frozen baseline per the promotion criteria in `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md` Section "Promotion Criteria".

---

## 9. Sign-Off

- **Activity scope:** Documentation creation only.
- **Code touched:** None.
- **Tests run:** None (not applicable).
- **Commits:** None.
- **Branch state at completion:** Unchanged except for three new markdown files.

This report attests that the baseline files were produced solely from previously approved owner inputs and from the reconciliation handoff, with no invented logic, no silent resolution of open questions, and no code changes.

---

*— End of Baseline Creation Report —*
