# CR-488 — Credit Management — print option for each bill (credit order)

**ID:** CR-488  **Type:** CR  **Registered:** 2026-11-05  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE
**Area:** Printing / Printer Agent  **Source:** OWNER-REPORTED (chat 2026-11-05)  **Related:** BUG-643, BUG-644

## Description
Owner: "need print option to print each bill" — in Credit Management, each credit bill (SS2 row / SS3 order details) should have a Print button.

## Evidence
- Owner screenshots SS2/SS3 (see BUG-643 evidence)
- Curl output: not captured (no test credentials in memory/test_credentials.md)
- Confidence: REPORTED

## Duplicate Check
DISTINCT — related: BUG-643, BUG-644

## Code Reality
NONE in credit — SS2 rows have only "View" (src/components/credit/CreditCustomerDetailSheet.jsx L133-147); OrderDetailSheet has no print action. Reusable reprint exists: components/order-entry/RePrintButton.jsx.

## Blast Radius
SMALL–MEDIUM (CreditCustomerDetailSheet.jsx / OrderDetailSheet.jsx + reprint service; print payload path)

## Open Owner Decisions
- OD-488-01 Placement: Print button on each SS2 row, in SS3 footer, or both — OPEN
- OD-488-02 Print = duplicate bill (reprint) via printer agent, or also browser/PDF — OPEN
- OD-488-03 Also "print statement" for full credit ledger? — OPEN

## Next
Planning Gate 2.

## Owner Decisions (2026-11-05)
- OD-488-02 **LOCKED: B** — print as PDF in browser (not thermal printer).
- OPEN: OD-488-01 placement (row / pop-up / both) · OD-488-03 "DUPLICATE" watermark? · OD-488-04 full credit statement print too?

## Owner Decisions (2026-11-05, round 4) — supersedes 488-02 "B browser PDF"
- OD-488-01 **LOCKED** — Print button in the **Order Details pop-up (SS3)**.
- OD-488-02 **LOCKED (revised)** — print the customer bill via the **Printer Agent** on 2-inch / 3-inch thermal (same as existing bill reprint). Reuse `RePrintButton.jsx` path. Not browser PDF.
- OD-488-04 — statement print already exists → out of scope.
- OPEN: OD-488-03 (re-explained) — should the reprinted copy be marked "DUPLICATE"?

## Owner Decision (2026-11-05, round 5 — FROZEN)
- OD-488-03 **LOCKED: YES** — second/re-printed bill must show **"DUPLICATE"**. (Check at Gate 2 whether Printer Agent template supports a duplicate flag.)
- **INTAKE FROZEN.**

## Backend brief (2026-11-05)
- `backend_briefs/BACKEND_BRIEF_INTAKE_BATCH_2026_11_05.md` §E
