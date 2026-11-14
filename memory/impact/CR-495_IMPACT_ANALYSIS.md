# CR-495 — Meal Package at Check-In + Room Comp Limit — Impact Analysis (Gate 2) — 2026-11-14

Code Reality: PARTIAL — `mealPlan` read in aiosellTransform, folioTransform, ArrivalsPage, CheckInPage, GuestFolioPage, NewBookingPage; not used in comp flow. No package choice at walk-in check-in.
Risk: CRITICAL (room billing + comp; R6). Backend-blocked: YES. **Probe BLOCKED:** cafe103 has `room = "No"` — no rooms to probe.
Assignee: Parth.

## Owner decision (locked)
Package at check-in (walk-in too): breakfast / half board / full board. OTA: use channel-manager meal plan. Room may comp any food up to ₹ limit per guest × guests checked in, per day (resets daily). Limit per package (backend key). Above → PIN. Half/full board lunch+dinner comp yes; tracking TBD at impact.

## Findings (code only)
- Check-in UI: CheckInForm.jsx / CheckInPage.jsx (both hold many open GATE_5A items — BUG-511/512/527 etc.).
- Room order comp entry: same CPP comp checkbox as CR-492.

## Open owner decisions
- OD-495-A: "day" for the limit = calendar day or business day (restaurant schedule)? OPEN.
- OD-495-B: half/full board — separate ₹ limit per meal (breakfast/lunch/dinner) or one daily pool? OPEN (tracking TBD).
- OD-495-C: comp on a room order with no package (room only) → hidden, or allowed with PIN? OPEN.
- OD-495-D: PMS restaurant + login for probes. OPEN — needed before Gate 3.

## Probe — The Palm House (RID 541), owner-provided login, read-only (2026-11-14)
Evidence: `evidence/BATCH-A-IA/probes_2026_11_14/cr495_palmhouse/`
- Profile: `room=Yes`, `pay_via_room=Yes`, `room_billing_included=Yes`, `complementary=No`. Owner role lacks `complementary_food`.
- Settings-list: no meal / package / board / comp keys.
- `local-reservations` (Oct 15–Nov 30): 0 reservations → no meal_plan / rateplan_code data to inspect.
- Room list: rooms occupied via POS check-in (e.g. room 101, order 1573033). That room order's `room_info` = advance/balance/discount/price only — **no meal plan, no guest count**.
- Conclusion: B-495-1 (package on check-in + returned on room order) and guest count per room are both missing; daily comp limit cannot be computed today.
- OD-495-D closed (probe done).

## Backend asks
- B-495-1: meal package field on check-in (walk-in) + returned on booking/room.
- B-495-2: per-package ₹/guest/day limit keys.
- B-495-3: per-room daily comp used amount (server-side counter).
- B-495-4: OTA meal-plan mapping to the 3 packages.
