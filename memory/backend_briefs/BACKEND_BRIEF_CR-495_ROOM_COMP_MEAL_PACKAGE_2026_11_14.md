# Backend Brief — CR-495 Meal Package at Check-In + Room Comp Limit — 2026-11-14

To: Parth (rooms / check-in) · cc Gyan (rights / PIN, CR-494) · FE: Abhishek
Batch: A · Priority: P0 · Risk: CRITICAL · Client: ALL
Source: `impact/CR-495_IMPACT_ANALYSIS.md`, `change_requests/BATCH_A_OWNER_DECISIONS_2026_11_14.md` (R6–R8)

## Why
Owner: "we don't have this currently for non-PMS outlets." Outlets that check guests in through the POS (no PMS / channel manager) have no meal package and no guest count anywhere, so the room comp limit cannot be computed.
Probe evidence (The Palm House, RID 541, read-only): `evidence/BATCH-A-IA/probes_2026_11_14/cr495_palmhouse/` — room order `room_info` = advance / balance / discount / price only; settings-list has no meal / package / comp keys.

## Owner rules (locked)
- Package chosen at check-in, walk-in included: Room only / Breakfast / Half board / Full board.
- OTA bookings: use the channel-manager meal plan automatically (PMS outlets).
- Scope (owner R10): NON-PMS AND PMS outlets in the SAME release.
- Room may comp any food item up to ₹ limit **per guest × guests checked in**, **separate limit per meal** (breakfast / lunch / dinner), reset per **business day** (restaurant schedule, not midnight).
- Above limit → PIN (CR-494 comp PIN). Room only → comp allowed with PIN.
- Comp needs `complementary_food` right; backend must enforce (see Batch A brief, CR-492).

## Backend asks
| # | Ask | Detail |
|---|---|---|
| B-495-1 | Meal package on check-in | Field on POS check-in (walk-in) for non-PMS outlets: `meal_package` = `room_only` / `breakfast` / `half_board` / `full_board`. Stored on booking/room; returned on room list, room order `room_info`, folio. |
| B-495-2 | Guest count | `guest_count` captured at check-in, editable during stay; returned with B-495-1. |
| B-495-3 | Limit settings | Restaurant settings keys: ₹ per guest per meal for each package (breakfast / lunch / dinner). Which meals apply per package: BB = breakfast, HB = breakfast + one main meal, FB = all three. |
| B-495-4 | Daily used counter | Server-side comp amount used per room, per meal, per business day. Returned to POS before comp and updated on comp save; shared across devices. |
| B-495-5 | Meal slot | How a comp is assigned to breakfast / lunch / dinner (time window per meal in settings, or chosen by cashier). Backend to propose. |
| B-495-6 | Enforcement | On comp save for a room order: if over remaining limit and no valid PIN → reject. |
| B-495-7 | OTA mapping (PMS outlets) | Map channel-manager meal plan / rateplan to the 4 packages. Same release as non-PMS. |

## Questions for backend
1. Existing check-in API: can `meal_package` + `guest_count` be added without breaking current check-in? (Owner rule: changes additive.)
2. Business-day boundary: reuse existing day-closure / restaurant schedule?
3. Half board: which main meal (lunch or dinner) — OPEN, owner to decide with backend at impact discussion.
4. B-495-5 meal slot assignment (time window vs cashier pick) — OPEN, owner + backend to discuss.

## FE scope (after backend keys land)
Package + guest count on CheckInForm / CheckInPage; remaining-limit display and PIN prompt in comp flow for room orders. Hotspots with open items: CheckInForm.jsx / CheckInPage.jsx, CollectPaymentPanel — Gate 3 must re-verify at HEAD.
