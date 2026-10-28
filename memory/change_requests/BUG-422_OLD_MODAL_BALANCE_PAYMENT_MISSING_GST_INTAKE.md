# BUG-422 — Old RoomCheckInModal: balance_payment Sent Without GST (BUG-410 Remaining Gap)
**ID:** BUG-422
**Date:** 2026-09-16
**Source:** OWNER-REPORTED (ss1 + verbal, Issue 6)
**Confidence:** CONFIRMED (code-traced)

## Description
In the OLD check-in modal (`RoomCheckInModal.jsx`), the `balance_payment` field sent to the backend is computed as `room_price − advance` — it does NOT include accommodation GST. This means folio data stored for guests checked in via this modal will have a `balance_payment` that is ₹(gst_amount) lower than correct.

BUG-410 (GATE_5A_IMPLEMENTED, 2026-09-15) added `computeRoomGst` to RoomCheckInModal and sends `gst_tax` correctly. However, `balancePayment` formula at line 363 was NOT updated.

**Correct formula:** `balance_payment = room_price + gst_tax − advance`
**Current formula:** `balance_payment = room_price − advance` ← missing GST

Owner says the existing dashboard check-in deducts advance correctly (✅ advance deduction works). The gap is that GST is not included in the balance.

## Classification
- **Type:** BUG
- **Severity:** P1 — HIGH (financial field sent to backend; affects folio balance, night audit reconciliation)
- **Risk:** CRITICAL (money, room billing, balance_payment is financial field R6)
- **Related:** BUG-410 (GATE_5A_IMPLEMENTED — added gst_tax to old modal but left balancePayment formula unchanged). DISTINCT gap.
- **Duplicate check:** RELATED to BUG-410. DISTINCT — BUG-410 scope did not cover balancePayment formula.
- **Fast Lane:** NO (CRITICAL financial field)

## Evidence
- Code: `RoomCheckInModal.jsx` L363–367:
  ```js
  const balancePayment = useMemo(() => {
    return (Number(roomPrice) - Number(advancePayment)).toFixed(2); // ← NO GST
  }, [roomPrice, advancePayment]);
  ```
- Compare: `pmsService.js` L193 (new CheckInPage): `orderAmount + gstTax - advance` ← correct
- "Dashboard" guest folio shows ₹870 = ₹1,000 − ₹130 (no GST) — confirmed by owner screenshot
- Source: AGENT-DISCOVERED (code trace) + OWNER-REPORTED | Confidence: CONFIRMED

## Blast Radius
- `RoomCheckInModal.jsx` — L363-367 (1 formula, ~2 lines, hotspot)
- Estimated scope: SMALL (1 file, 1 formula)

## Owner Decisions Needed
- OD-422-01: CONFIRMED from owner: balance_payment should include GST? (consistent with new CheckInPage BUG-396 formula)

## Next
Gate 2 — Impact Analysis
