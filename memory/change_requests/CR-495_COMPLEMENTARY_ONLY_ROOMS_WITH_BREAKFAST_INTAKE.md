# CR-495 — Complementary Marking Only for Rooms with Breakfast Meal Plan

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH (prevents revenue leakage: comp food should only be for breakfast-included bookings)
**Risk:** HIGH (touches order flow + PMS integration, cross-module logic)
**Process required:** Full gate flow + regression. FAST LANE eligible? **NO**
**Sprint:** TBD

---

## Description

When marking food items as complementary for room orders ("To Room" flow), the complementary option should ONLY be available for rooms whose booking includes a breakfast/meal plan. Rooms booked without breakfast should not have the option to mark food as complementary.

**Expected behavior:**
- Room booked with breakfast meal plan → comp marking allowed for food items
- Room booked without breakfast (Room Only) → comp marking NOT available / disabled
- The check should use the `mealPlan` field from booking data (already available via `aiosellTransform.js` and `folioTransform.js`)

**Current behavior:** Complementary marking is available for all room orders regardless of the room's meal plan. Any room order can have items marked as comp.

---

## Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** Book a room WITHOUT breakfast → order food "To Room" → mark as complementary → succeeds (should not)
- **Confidence:** SUSPECTED (code-traced: `mealPlan` exists in transforms but is NOT checked in comp flow)

---

## Code Reality Check

**Code reality: NONE** — `mealPlan` field exists in `aiosellTransform.js:143` and `folioTransform.js:65`. Complementary marking in `CollectPaymentPanel.jsx` and `orderTransform.js` has NO meal plan check. The data is available but not used for gating.

---

## Duplicate Check

**RELATED** to:
- CR-492 (Complementary rights-based — INTAKE): permission gating, distinct from meal-plan gating
- CR-391 (Room settlement veg/non-veg charge — INTAKE): room billing, different scope

**Verdict: DISTINCT** — no existing item gates comp based on meal plan.

---

## Blast Radius

- Comp flow: `CollectPaymentPanel.jsx` (R5), `orderTransform.js` (R5)
- Room data: `OrderEntry.jsx` (table/room context), `pmsService.js`
- Need to thread `mealPlan` from room/booking data to the comp gating logic
- Estimated scope: MEDIUM (3-4 files, ~20-30 lines)

---

## Open Questions

- **OD-495-01:** Which meal plans qualify for complementary? Only "Breakfast" or also "Half Board" / "Full Board"?
- **OD-495-02:** Should the check be based on the `mealPlan` field from local-reservations API, or a simpler boolean from settings?
- **OD-495-03:** For walk-in rooms (no booking via channel manager), how is meal plan determined?
- **OD-495-04:** DEPENDS ON CR-492 (complementary_food permission) — should both gates apply (permission AND meal plan)?
