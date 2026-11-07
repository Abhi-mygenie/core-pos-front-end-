# BUG-421 — In-House Page Balance Column Shows Booking Amount, Not Outstanding Balance
**ID:** BUG-421
**Date:** 2026-09-16
**Source:** OWNER-REPORTED (ss5 screenshot)
**Confidence:** CONFIRMED (code-traced)

## Description
The In-House Guests page (`/pms/in-house`) Balance column shows `amount_after_tax` from the local-reservations API, which equals the **total booking amount** (≈ room price). It does NOT deduct advance paid. Example: joli (r5) has Advance ₹100, room ₹1,000 — balance column shows ₹1,000 instead of ₹900.

## Classification
- **Type:** BUG
- **Severity:** P1 — HIGH (financial display; staff sees wrong outstanding balance)
- **Risk:** HIGH (financial display, informs checkout decisions)
- **Related:** BUG-378 (IMPLEMENTED — fixed room/phone/dates showing "—"). BUG-378 introduced `amount_after_tax` as the balance field. DISTINCT — BUG-378 fixed the "—" issue; this bug is about the wrong field value.
- **Duplicate check:** RELATED to BUG-378. DISTINCT gap.
- **Fast Lane:** NO (financial field, needs API investigation)

## Evidence
- Screenshot: ss5 (owner, 2026-09-16) — In-House page: r3/r4/r5/r1 all show ₹1,000 balance; joli (r5) should show ₹900 (advance ₹100 deducted)
- Code: `pmsService.js` L64: `row.balance = match.res.amount_after_tax` — booking total, not outstanding
- Source: AGENT-DISCOVERED (code trace) + OWNER-REPORTED | Confidence: CONFIRMED

## Blast Radius
- `pmsService.js` — L64 (1 line change)
- Possibly needs local-reservations API investigation — does it provide `balance_payment` or similar field?
- Estimated scope: SMALL (1–2 files)

## Owner Decisions Needed
- OD-421-01: Should balance column show `room_price + gst − advance` (total incl. GST minus advance), or just `room_price − advance`?
- OD-421-02: If the correct field is not in local-reservations, is it acceptable to fetch balance per row (1 extra API call per guest) or prefer approximation?

## Next
Gate 2 — Impact Analysis (investigate local-reservations response for balance field)
