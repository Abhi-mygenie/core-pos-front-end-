# BUG-419 — Corporate/B2B Billing Field Position in New Check-In Form
**ID:** BUG-419
**Date:** 2026-09-16
**Source:** OWNER-REPORTED (ss3 screenshot)
**Confidence:** CONFIRMED (code-traced)

## Description
In the new PMS Check-In page (`/pms/check-in`), the Corporate/B2B Billing checkbox appears BELOW the Adults/Children / Occupancy Register block. Owner wants it positioned immediately BELOW the Guest Name field (before Room Assignment), so staff can identify corporate bookings early in the form flow.

## Classification
- **Type:** BUG (UX layout deviation from intended design)
- **Severity:** P2 — MEDIUM (usability; no data impact)
- **Risk:** LOW (JSX reorder, no logic change)
- **Duplicate check:** DISTINCT — no prior item for this positioning
- **Fast Lane:** ELIGIBLE — 1 file, ≤10 lines moved, no API/state/logic change. **Owner approval required.**

## Evidence
- Screenshot: ss3 (owner, 2026-09-16) — form shows Corporate/B2B after Adults/Children block
- Code: `CheckInPage.jsx` L731–763 — Corporate/B2B block. Should be after L597 (after Name/Phone grid, before Room Assignment L600)
- Source: OWNER-REPORTED | Confidence: CONFIRMED

## Blast Radius
- `CheckInPage.jsx` — 1 file, JSX reorder only (~30 lines moved)
- Estimated scope: SMALL (1 file, no hotspot)

## Owner Decisions Needed
- OD-419-01: Exact position — right after Name+Phone row? Or after Room Assignment? Owner says "below name" — confirming: after Name/Phone, before Room Assignment.

## Next
Fast Lane eligible — awaiting Gate 4 GO (owner approval)
