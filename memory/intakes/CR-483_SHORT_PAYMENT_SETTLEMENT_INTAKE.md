# CR-483 — Settlement — record actual amount received (e.g. bill ₹763.77, paid ₹763) and account for the difference

**ID:** CR-483  **Type:** CR  **Registered:** 2026-11-04  **Sprint:** nov_cr_batch
**Severity:** P1 (owner: "all p1")  **Risk:** CRITICAL  **Status:** GATE_1_INTAKE_COMPLETE — ODs OPEN (owner to pick OD-483-01)
**Area:** Payments / Coupons / Credit
**Source:** OWNER-REPORTED (chat, 2026-11-04)  **Related:** CR-170, BUG-592

## Description
Customers sometimes pay a rounded-down amount (bill ₹763.77, customer pays ₹763 by UPI). Cashier needs a text box next to the payment method (as for Cash) to enter the actual amount received. Owner question: where does the difference go — should it be treated as discount?

## Expected Behaviour
Cashier enters actual received amount; order settles; the short amount is recorded under a defined bucket and visible in reports.

## Evidence
- Screenshot: `evidence/CR-483/owner_cpp_payment_method_2026_11_04.png` (Collect Payment — Cash has received box, UPI/Card do not)
- Steps to reproduce: n/a (feature request)
- Curl output: not applicable at intake
- Source: OWNER-REPORTED
- Confidence: REPORTED

## Duplicate Check
RELATED to CR-170, BUG-592

## Code Reality
PARTIAL — Cash has "Cash Received" box but handlePayment hard-blocks received < total (BUG-CASH-UNDERPAY guard, CollectPaymentPanel.jsx ~L1161). UPI/Card have no received-amount box (owner screenshot).

## Risk
- Risk: CRITICAL
- Reason: Settlement amount, payment payload, tax/report totals
- Fast Lane eligible: NO

## Blast Radius
MEDIUM (CollectPaymentPanel.jsx hotspot + orderTransform.js hotspot payload + settlement/audit reports); backend field likely needed

## Open Owner Decisions
- OD-483-01 Where the difference goes — OPEN. Agent options: (A, recommended) separate "Settlement adjustment / short-pay write-off" line: invoice, GST and discount stay unchanged, difference shown in Settlement/Audit report; (B) treat as discount — changes taxable value and GST after the bill is printed, re-printed bill differs, NOT recommended; (C) keep as customer due (credit)
- OD-483-02 Max allowed difference (e.g. ≤ ₹1 / ≤ ₹10 / configurable) — OPEN
- OD-483-03 Applies to UPI only, or Cash/Card/Split too — OPEN
- OD-483-04 Permission-gated (manager only above limit)? — OPEN
- OD-483-05 Backend field for adjustment amount — needs backend confirmation (R11 probe at Gate 2)

## Next
Planning Gate 2 (Impact Analysis) once ODs are answered.

## Owner Direction (2026-11-04, round 2)
- "Cash Received" box stays as-is — it is for change calculation only.
- NEW field **Settlement Amount** on ALL payment methods (Cash / UPI / Card / Split) = actual amount paid.
- Difference (Grand Total − Settlement Amount) is treated as **discount**.

## Agent Proposal (pending owner confirmation)
- OD-483-06 How the discount is applied — OPEN:
  - (A, recommended) **Post-tax "Settlement Discount"**: items, GST and taxable value unchanged; difference shown as a separate discount type in bill + Discount/Settlement reports. Exact paise, no GST recomputation, safe if bill already printed.
  - (B) Pre-tax discount back-calculated so final total = settlement amount: GST reduces, may miss exact paise, printed bill changes after print.
- Rules proposed: defaults to Grand Total (after CR-170 round-off); can only be LOWER than total (higher = tip/change); Cash change = Cash Received − Settlement Amount; Split: sum of split amounts = Settlement Amount; difference cap + manager permission above cap (OD-483-02/04); reprint shows "Settlement Discount −₹X".
- Backend: confirm payload field for settlement discount (separate key vs existing discount fields) — R11 probe at Gate 2.

## Owner Decisions (locked 2026-11-05, round 3)
- OD-483-06 **LOCKED: A** — post-tax "Settlement Discount"; items, taxable value, GST unchanged.
- OD-483-02 **LOCKED** — default cap ₹10; configurable per restaurant.
- OD-483-04 **LOCKED** — no special right; any user who can collect payment can use it (within cap).
- OD-483-03 **LOCKED** — applies to ALL payment methods (Cash, UPI, Card, Split, Credit, Pay Later, Room).
- Reprint shows "Settlement Discount −₹X" — **LOCKED YES**.
- Reports: under Discounts as its own discount type — **LOCKED**.
- OPEN: OD-483-07 reason mandatory when settlement < bill? · OD-483-08 relation to CR-484 (single Settlement Amount field allowing + / − — see CR-484).
- Backend: settlement-discount field in payment payload — OPEN (R11 probe).

## Owner Decisions (2026-11-05, round 4 — SUPERSEDES earlier CR-483/484 discount decisions)
- **No discount. Billing logic is NOT touched at all.** Bill amount, discount, GST, round-off unchanged.
- Field name: **"Received Amount"** (not "Settlement Amount"), on ALL payment methods; one field for split as well.
- If nothing entered → Received Amount = Bill Amount.
- Received Amount may be **lower or higher** than the bill, within a ± limit set in **restaurant settings — default 3%** (replaces the earlier ₹10 cap).
- No reason required (483-5 = NO). No special right.
- **Backend** computes **Reconciliation Amount = Received − Bill** and stores it; **Order Report** gets 2 new columns: **Received Amount**, **Reconciliation Amount**.
- SUPERSEDED: OD-483-06 "A post-tax Settlement Discount", reprint "Settlement Discount" line, "Discounts own type", ₹10 cap.
- Backend: new `received_amount` in collect-payment payload + reconciliation calc + 2 report fields — BLOCKER.
- OPEN: OD-483-09 merge CR-484 into CR-483 (same field/logic)?

## Owner Decisions (2026-11-05, round 5 — FROZEN)
- OD-483-09 **LOCKED** — CR-484 merged into CR-483.
- ± limit (default 3%, per restaurant) applies to **ALL** payment methods incl. Credit, Pay Later, Room.
- **INTAKE FROZEN.** Remaining: backend `received_amount` + reconciliation + 2 Order Report columns.

## Backend brief (2026-11-05)
- `backend_briefs/BACKEND_BRIEF_INTAKE_BATCH_2026_11_05.md` §B
