# CR-540 — Revenue Leakage Controls (Cancels, Discounts, Comps)

**Classification:** CR · **Client:** ALL · **Assignee:** Abhishek (waiting on Gyan for backend) · **Priority:** TBD (owner) · **Status:** INTAKE
**Source:** Agent suggestion accepted by owner 2026-11-14 (Batch A Q&A, B10 = single CR)
**Related:** CR-494, CR-443, CR-515, CR-497

## Description
Bundle of controls to reduce revenue leakage from cancellations, discounts and complimentary items:
1. Cancel after bill-print / after serve: always PIN + reason.
2. Daily per-user caps (₹ + count) for cancels and discounts; above cap → PIN, not hard block.
3. Discount cap per role (e.g. staff ≤10%, manager ≤25%); above → PIN.
4. Instant owner alert for cancel/discount above ₹X and any post-bill change.
5. "Cancellations & Discounts by Employee" daily report (who, how much, reason, PIN used).
6. Flag repeat comps/discounts to the same customer phone number.
7. Reprint audit log (user + time per reprint).
8. End-of-day leakage summary: cancels, discounts, comps as % of sales.

## Overlap
- 1, 2 largely covered by CR-494 decisions; 4 by CR-443; 7 by CR-515. Impact analysis to split out only the net-new pieces (3, 5, 6, 8).

## Open Questions
- OD-540-01: Priority?
- OD-540-02: Which of the 8 are in scope for phase 1?
