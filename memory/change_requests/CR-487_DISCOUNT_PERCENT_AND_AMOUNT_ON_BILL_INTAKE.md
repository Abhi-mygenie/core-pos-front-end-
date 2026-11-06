# CR-487 — Printed bill — show discount % and discount ₹ amount

**ID:** CR-487  **Type:** CR  **Registered:** 2026-11-04  **Sprint:** nov_cr_batch
**Severity:** P1 (owner: "all p1")  **Risk:** CRITICAL  **Status:** GATE_1_INTAKE_COMPLETE — ODs OPEN
**Area:** Printing / Printer Agent
**Source:** OWNER-REPORTED (chat, 2026-11-04)  **Related:** BUG-592, CR-426, BUG-001

## Description
Bill should print both the discount percentage and the discount amount (e.g. "Discount (10%)  -₹56.00").

## Expected Behaviour
Every printed bill with a discount shows % and ₹; flat discounts show ₹ (and computed % if owner wants).

## Evidence
- Screenshot: not provided
- Steps to reproduce: n/a (feature request)
- Curl output: not applicable at intake
- Source: OWNER-REPORTED
- Confidence: REPORTED

## Duplicate Check
RELATED to BUG-592, CR-426, BUG-001

## Code Reality
PARTIAL — bill payload carries one discount value; BUG-592 shows % sometimes printed instead of ₹.

## Risk
- Risk: CRITICAL
- Reason: Print semantics + discount (R6)
- Fast Lane eligible: NO

## Blast Radius
MEDIUM (orderTransform.js print payload hotspot + CollectPaymentPanel print path; Printer Agent template may need change)

## Open Owner Decisions
- OD-487-01 Flat-₹ discounts: show computed % too, or ₹ only? — OPEN
- OD-487-02 Fix together with BUG-592 and CR-426 (same print payload) — agent recommendation
- OD-487-03 Printer Agent template change needed? — check at Gate 2

## Next
Planning Gate 2 (Impact Analysis) once ODs are answered.

## Owner Direction (2026-11-05)
- Bill print layout/content comes from the **Old POS Printer Agent team** → EXTERNAL DEPENDENCY. FE scope (if any) = ensure print payload carries discount % and ₹ amount.
- OPEN: OD-487-04 does Printer Agent team need any new field from FE payload (discount_percent)? · OD-487-05 CR-426 (GST % on bill) — same team? bundle?

## Owner (2026-11-05, round 4)
Owner: "there is no discount percentage, just received amount; now we don't touch billing logic at all." Bill content owned by Old POS Printer Agent team.
- OPEN: OD-487-06 is CR-487 (discount % + ₹ on bill) **withdrawn**, or kept and handed to Printer Agent team?

## Owner Decision (2026-11-05, round 5)
- OD-487-06 **LOCKED** — keep CR for **tracking only**; bill content owned by Old POS Printer Agent team; no FE billing logic change.


---
## SUBSUMED into CR-513 (owner 2026-11-06)
Owner: duplicate — all bill-data work for this item is planned and implemented under **CR-513** (one CR, one plan). See `impact/CR-513_IMPACT_ANALYSIS.md` §9-§12. No further gates for CR-487.
