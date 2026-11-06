# BUG-606 — Role-Based Discount: Socket Not Delivering Discount Data

**ID:** BUG-606  **Type:** BUG  **Registered:** 2026-10-22  **Sprint:** oct_cr_batch  
**Severity:** P1  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE  
**TT source:** TT-026

## Description
Role-based discount data is not arriving via socket in real time. When the owner applies a role-based discount from their session, the cashier's CollectPaymentPanel does not update reactively — the socket event is not carrying the discount data.

## Owner input (verbatim)
"issue is in role based discount data is still not coming in socket"

## Evidence
- Source: OWNER-REPORTED via TT-026
- Confidence: CONFIRMED (owner reproduced)
- Screenshot: not provided

## Duplicate check
RELATED to BUG-595 (GATE_5A_IMPLEMENTED 2026-10-19): "Role-Based Discount Not Live in Cashier CPP — Requires Reopen After Owner Applies". BUG-595 fixed `initialDiscount` reactivity via `liveOrder?.orderDiscountJson`. Owner says data is STILL not coming — either BUG-595 fix is incomplete, or the socket payload itself is missing the discount field. DISTINCT from BUG-538 (permission wiring, GATE_1_INTAKE).

## Code Reality
PARTIAL — roleBaseDiscount flag exists (CPP L89, OrderEntry, profileTransform). BUG-595 fix in OrderEntry:1954 reads `liveOrder?.orderDiscountJson`. Socket payload may not include `orderDiscountJson` for role-based discount changes.

## Blast radius
SMALL — OrderContext.jsx socket handler + possibly orderTransform.js discount field mapping. ~2–3 files.

## Open decisions for Gate 2
- OD-606-01: Does the socket `update-order` event include `orderDiscountJson` in its payload? (Needs curl/socket probe)
- OD-606-02: Is the issue that the field is absent from the socket payload (backend), or that FE doesn't read it from the right path (FE bug)?
