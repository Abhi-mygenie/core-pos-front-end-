# BATCH-A · CR-495 (Meal package at check-in + room comp limit) — Implementation Plan (Gate 3) — SKELETON — 2026-11-15

> Status: **GATE_3_SKELETON — NOT FROZEN**. Fill once Parth replies to **B-495-1..7** and owner decides half-board meal + meal-slot rule.
> Risk: CRITICAL (room billing + comp). Mockups: M8 `#m8` (check-in), M5 `#m5` (room comp line).
> Decisions (locked): package at check-in incl. walk-in (Room only / Breakfast / Half board / Full board) · OTA = channel meal plan · PMS + non-PMS same release · guest count at check-in, editable · limit = ₹/guest × guests, separate per meal, per business day · above limit → PIN (CR-494) · room only → comp with PIN · needs `complementary_food` right (CR-492).
> R16 (2026-11-15): half-board second meal = **guest chooses lunch or dinner at check-in** · meal slot = **cashier picks the meal for each comp**.
> **Gate 2.5 needed:** both are new screen choices not in M8/M5 → new mockups **M8b** (second-meal choice on check-in, shown when Half board) and **M5c** (meal pick on room comp) must be approved before these rows are planned.

## 1. Code reality — HEAD `b5d7a42` 2026-11-15 (Code Reality: PARTIAL — `mealPlan` read in aiosellTransform, folioTransform, ArrivalsPage, CheckInPage, GuestFolioPage, NewBookingPage; not used in comp)
Check-in UI: `components/pms/frontdesk/CheckInForm.jsx`, CheckInPage.jsx. Room comp entry: CPP comp checkbox (CR-492). Probe RID 541: room order `room_info` has no meal plan / guest count; no settings keys.

## 2. Conflict pre-check
CheckInForm / CheckInPage hold open GATE_5A items (BUG-511/512/527) → recheck when filling.

## 3. Shared files (Batch A)
| File | Other Batch A CRs | Order |
|---|---|---|
| CollectPaymentPanel.jsx | CR-492, CR-494 | CR-492 → CR-494 → CR-495 |
| CheckInForm.jsx / CheckInPage.jsx | none in Batch A | after BUG-511/512/527 QA |

## 4. Exact edits
TBD.

## 5. BLOCKED edits
| # | Needs | What will change |
|---|---|---|
| G4-B1 | **B-495-1, B-495-2** | Package + guest count fields on CheckInForm (M8) |
| G4-B2 | **B-495-3** | Limit keys per package/meal |
| G4-B3 | **B-495-4** | Remaining-limit display on room comp line (M5) |
| G4-B4 | **B-495-5** + mockup **M5c (approved R17)** · meal outside package → comp PIN (R18) | Cashier picks breakfast/lunch/dinner on each room comp (R16); backend stores per meal |
| G4-B5 | **B-495-6** | Over-limit → CR-494 comp PIN |
| G4-B6 | **B-495-7** | OTA mapping (PMS) — display only |
| G4-B7 | **B-495-1** + mockup **M8b (approved R17)** | Half board → guest's second meal (lunch/dinner) chosen at check-in (R16); stored with package |

## 6–10
TBD after reply.

## 11. Mockup links
M8 → G4-B1 · M8b → G4-B7 · M5 → G4-B3/B5 · M5c → G4-B4. M8b + M5c: `design/BATCH-A_GATE2_5_MOCKUPS_2026_11_14.html#m8b` / `#m5c` (merged 2026-11-15; addendum file superseded) — **APPROVED 2026-11-15 (R17)**. Default meal = none (cashier must pick). Meal outside the package → allowed with comp PIN (R18).
