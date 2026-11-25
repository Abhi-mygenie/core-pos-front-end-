# BUG-418 — Checkout Drawer Bill Does Not Display Room GST (Display Gap from BUG-401)
**ID:** BUG-418
**Date:** 2026-09-16
**Source:** OWNER-REPORTED (ss2 screenshot)
**Confidence:** CONFIRMED (code-traced)

## Description
The PMS Checkout Drawer (`PmsCheckoutDrawer` → `CollectPaymentPanel`) shows GRAND TOTAL without including Lodging GST. For a room with price ₹1,000 and GST ₹50, the bill shows ₹1,000 instead of ₹1,050. The cashier collects ₹1,000 but the backend payload contains `room_gst_tax = 50`.

## Classification
- **Type:** BUG
- **Severity:** P1 — HIGH (financial display; cashier sees wrong total)
- **Risk:** CRITICAL (money display, billing, R6)
- **Related:** BUG-401 (GATE_5A_IMPLEMENTED — that fix added GST to payload only, not display)
- **Duplicate check:** RELATED to BUG-401 (same area). DISTINCT — BUG-401 fixed the payload; this bug is the remaining display gap.
- **Fast Lane:** NO (financial display, multi-file)

## Evidence
- Screenshot: ss2 (owner, 2026-09-16) — Checkout drawer for aoi r4: TAXES section empty, GRAND TOTAL ₹1,000, GST ₹50 not shown
- Code trace: `PmsCheckoutDrawer.jsx` L158 reads `roomGstTax` but never passes it to `CollectPaymentPanel`
- `CollectPaymentPanel` L731-734: `effectiveTotal = finalTotal + roomBalance` (no GST component)
- Source: AGENT-DISCOVERED (code trace) + OWNER-REPORTED | Confidence: CONFIRMED

## Blast Radius
- `PmsCheckoutDrawer.jsx` — L260-283 (CollectPaymentPanel invocation)
- `CollectPaymentPanel.jsx` — grand total computation (hotspot R5)
- Estimated scope: MEDIUM (2 files, 1 is hotspot)

## Owner Decisions Needed
- OD-418-01: Should the Grand Total in the checkout drawer show `room_balance + gst_tax` (e.g., ₹1,050)? Or should GST appear as a separate line item?
- OD-418-02: Should the Checkout button text read "Checkout ₹1,050" (total incl. GST) or stay as ₹1,000 (room balance only)?

## Next
Gate 2 — Impact Analysis
