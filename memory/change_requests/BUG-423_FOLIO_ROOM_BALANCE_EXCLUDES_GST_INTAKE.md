# BUG-423 — Guest Folio Page: Room Balance Does Not Include GST
**ID:** BUG-423
**Date:** 2026-09-16
**Source:** OWNER-REPORTED (ss4/Issue 7 — folio for "dashboard" guest)
**Confidence:** CONFIRMED (code-traced)

## Description
The Guest Folio page (`GuestFolioPage.jsx`) displays Room Balance as the stored `balance_payment` (or `remaining_room_balance`) from the backend. When a guest is checked in via the OLD modal (which sends `balance_payment = room_price − advance`, no GST), the folio shows the wrong balance.

Example: "dashboard" guest — Room ₹1,000, GST ₹50, Advance ₹130.
- Folio shows: Room Balance ₹870 = ₹1,000 − ₹130 (no GST)
- Correct balance: ₹920 = ₹1,000 + ₹50 − ₹130

Owner says: "folio page shows wrong amount without adding the gst — which also working in dashboard to check out page (old one)"

The folio shows `gst_tax = ₹50` as a separate line but does NOT add it to the Room Balance figure.

## Classification
- **Type:** BUG
- **Severity:** P1 — HIGH (folio is the primary billing document; wrong balance shown to guest and staff)
- **Risk:** CRITICAL (financial display, R6 — folio is the basis for checkout amount)
- **Related:** BUG-401 (GATE_5A_IMPLEMENTED — checkout payload fix), CR-364 (folio page). DISTINCT — BUG-401 fixed the checkout payload; this bug is the folio display formula.
- **Duplicate check:** RELATED to BUG-401 and CR-364. DISTINCT gap.
- **Fast Lane:** YES eligible for formula-only fix (1 file, 1 line, no API change) — owner approval needed. However: touches financial field → CRITICAL → still needs full Gate cycle per R6.

## Evidence
- Screenshot: ss4 (owner, 2026-09-16) — folio for order 1232397 showing Room Balance ₹870, Total Balance Due ₹870 (GST ₹50 visible separately but not added)
- Code: `GuestFolioPage.jsx` L100: `roomBalance = folio.remainingRoomBalance || folio.balancePayment`
  - Both values = stored `balance_payment` from backend = ₹870 (no GST in stored value)
- Fix path: compute `roomBalance = max(0, folio.roomPrice + folio.gstTax - folio.advancePayment - folio.receiveBalance)` — uses already-fetched folio fields, no extra API call
- Source: AGENT-DISCOVERED (code trace) + OWNER-REPORTED | Confidence: CONFIRMED

## Blast Radius
- `GuestFolioPage.jsx` — L100 (1 line formula change)
- Estimated scope: SMALL (1 file)

## Owner Decisions Needed
- OD-423-01: Should Room Balance always be computed as `room_price + gst_tax − advance − amount_received` (FE formula), ignoring the stored `balance_payment`? This would self-correct even for guests checked in via old modal.
- OD-423-02: What should Total Balance Due show — just Room Balance, or Room Balance + F&B Posted?

## Next
Gate 2 — Impact Analysis
