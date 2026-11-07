# CR-484 — Card payments — handle bank charges (MDR) over the bill amount

**ID:** CR-484  **Type:** CR  **Registered:** 2026-11-04  **Sprint:** nov_cr_batch
**Severity:** P1 (owner: "all p1")  **Risk:** CRITICAL  **Status:** GATE_1_INTAKE_COMPLETE — ODs OPEN (owner to pick OD-484-01)
**Area:** Payments / Coupons / Credit
**Source:** OWNER-REPORTED (chat, 2026-11-04)  **Related:** CR-170

## Description
Bank deducts/charges extra on card transactions, so the amount the bank charges differs from what the customer pays on the bill. Owner originally raised as "round-off option for card payments". Needs a defined way to handle it.

## Expected Behaviour
Restaurant can see/account for card bank charges so bill amount, card charge and amount actually credited reconcile.

## Evidence
- Screenshot: not provided
- Steps to reproduce: n/a (feature request)
- Curl output: not applicable at intake
- Source: OWNER-REPORTED
- Confidence: REPORTED

## Duplicate Check
RELATED to CR-170

## Code Reality
NONE — card flow captures only last-4 transaction id; round-off (CR-170) applies to grand total for all methods; no bank-charge concept.

## Risk
- Risk: CRITICAL
- Reason: Money, settlement amount, possibly tax on surcharge
- Fast Lane eligible: NO

## Blast Radius
MEDIUM (CollectPaymentPanel.jsx hotspot, restaurant settings, settlement report); backend likely needed

## Open Owner Decisions
- OD-484-01 Who bears the charge — OPEN. Agent options: (A, recommended) restaurant absorbs: configure bank charge % per restaurant, POS records gross / bank charge / net expected credit per card payment for reconciliation in Settlement report; bill unchanged; (B) pass to customer as a separate "card charge" line on the bill (note: card networks/banks in India generally do not allow surcharging card customers — owner to confirm with bank; GST on surcharge to be decided); (C) setting to choose A or B
- OD-484-02 Charge % fixed per restaurant or per card type (debit/credit/Amex) — OPEN
- OD-484-03 Applies to split payments card portion — OPEN

## Next
Planning Gate 2 (Impact Analysis) once ODs are answered.

## Owner Direction (2026-11-05, round 3) — PROPOSED, to confirm
Owner proposal: **bill stays the same amount**; the single **Settlement Amount** field (CR-483) may be **less (−) or more (+)** than the bill; add one more field **Reconciliation Amount** (separate from order collection) to capture bank card charges — **no discount** for card charges.
- 484-1: A (restaurant view / reconciliation — not a customer surcharge on the bill).
- 484-2: rate per card type — not needed for our logic (no rate config).
- 484-3: A (no GST on charge — not billed to customer).
- 484-4: split — only one Settlement Amount field for the whole payment (same as CR-483).
Agent interpretation (pending confirmation, OD-484-05):
- Settlement < Bill → difference = Settlement Discount (CR-483, cap ₹10).
- Settlement > Bill (card charged more by bank) → difference recorded as **Reconciliation Amount** (bank charge), NOT discount, NOT revenue, no GST; bill and GST unchanged.
- Reconciliation Amount shown in Settlement/Payment reports for bank matching.
- OPEN: OD-484-05 confirm interpretation · OD-484-06 is Reconciliation Amount auto = Settlement − Bill, or manually entered · OD-484-07 cap/limit for + side · Backend field.

## Owner Decisions (2026-11-05, round 4 — SUPERSEDES earlier CR-483/484 discount decisions)
- 484-A **CONFIRMED** — bill unchanged; card bank charge captured via the same **Received Amount** field (higher than bill).
- 484-B — Reconciliation Amount computed by **backend**; Order Report +2 columns (Received, Reconciliation).
- 484-C — ± limit per restaurant setting, **default 3%**.
- Logic is identical to CR-483 → proposed **SUBSUMED into CR-483** (OD-483-09, owner to confirm).

## Owner Decision (2026-11-05, round 5)
- **SUBSUMED into CR-483** (owner OK). No separate work.
