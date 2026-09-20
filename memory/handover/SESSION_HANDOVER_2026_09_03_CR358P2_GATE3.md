# SESSION HANDOVER — CR-358-P2 Gate 3 Implementation Plan
**Date:** 2026-09-03 | **Role:** PLANNING (Gate 3 only — no code written)
**Status:** GATE 3 PLAN WRITTEN — awaiting owner **Gate 4 GO** + **SC-01 ack**

## Summary
Implementation Plan written for CR-358-P2 (S3 New Booking + S4 Check-In) from the closed Gate 2 IA and the approved v3 mockup. 8 exact edits across 5 files, frozen API contracts, 26-check verification matrix, post-code registry checklist.

## Key finding (R1 — code is truth)
IA said `App.js` needs zero changes. Reality: `/pms/new-booking` and `/pms/check-in` still mount `PmsPlaceholderPage`. Plan adds **SC-01**: +2 imports, 2 element swaps (4 lines), nothing else. Owner must ack SC-01 with Gate 4 GO. Logged OG-PMS-006; IA corrected in place.

## Plan shape
| File | Change |
|---|---|
| `aiosellTransform.js` | +`fromAPI.directReservation`, +`fromAPI.pendingArrival` (reuses `decodeMealPlan`) |
| `pmsService.js` | replace stubs → `getBookableRooms`, `getPmsReservations({startDate,endDate})`, `createDirectReservation`, **`pmsCheckIn`** (JSON, mandatory `booking_type`, `booking_id` omitted for WalkIn) |
| `NewBookingPage.jsx` NEW | guest/room-pill/stay form · Save as Booking → 201 → success card (Check In Now → `/pms/check-in?booking_id=`) · Walk-in CTA → S4 prefill via router state (no POST on S3) · no advance field |
| `CheckInPage.jsx` NEW | KPI strip · Walk-in banner · arrivals cards (pending, today−1..today+60) · prefilled form with advance · `pmsCheckIn` → `/pms/in-house` |
| `App.js` | SC-01 4-line route re-point |
NOT touched: Sidebar, roomService, RoomCheckInModal, CollectPaymentPanel, InHouse/ChannelManager pages, aiosellService, constants.

## Open for owner at Gate 4
- **SC-01** (blocking) — accept App.js 4-line edit
- A-01..A-07 presentation defaults (non-blocking; defaults apply if silent)

## Preconditions for IMPLEMENTATION
- `memory/test_credentials.md` is EMPTY — owner login alias needed for the R11 re-probe (plan §6 step 1). Without it, IMPL cannot verify §4 contracts before wiring.

## Registry Sync
- `registry.json`: CR-358-P2 → `GATE 3 — PLAN WRITTEN, awaiting Gate 4 GO (+SC-01 App.js ack)`, gate 3, 3/7 — SYNCED
- `CR_REGISTRY.md` row updated — SYNCED
- `OPEN_GAPS_REGISTER.md`: +OG-PMS-005 (picker occupancy), +OG-PMS-006 (stale IA App.js claim)
- `impact/CR-358-P2_IMPACT_ANALYSIS.md`: App.js row corrected

## Artifacts
- Plan: `memory/plans/CR-358-P2_IMPLEMENTATION_PLAN.md`
- Design contract: `frontend/public/cr358-p2-v3-mockup.html`

## Other open items
- CR-358-P1 / CR-360: QA PASS Gate 5b — awaiting Owner Smoke (Gate 6)

## Next Step
Owner: "Gate 4 GO, SC-01 accepted" (+ any A-0x overrides) → IMPLEMENTATION role → re-probe → Edits 1-8 → self-test §7 → EXIT GATE → QA handover.

*2026-09-03 | CR-358-P2 Gate 3 COMPLETE*
