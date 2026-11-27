# BUG-442 — Cancel booking posts `cancelled_by: "staff"` for every user (audit trail lost)

**Registered:** 2026-09-22 (QA Role 4, CR-385 Phase 1) · **Type:** BUG · **Priority:** P2 · **Risk:** LOW (audit text only, no money/inventory) · **QA severity:** MINOR
**Duplicate check:** DISTINCT — RELATED CR-362 (origin), CR-385 M2 (copied the same target mapping per plan §1.2 "copy that mapping"), BUG-440/441 (same dialog family)
**Source:** QA-FOUND (`test_reports/iteration_14.json` R-M2-02: body `{"reason":"guest cancelled","cancelled_by":"staff","notify_cm":true}` while logged in as Owner) · **Confidence:** CONFIRMED (network capture + code read)
**Code reality:** EXISTS (CR-362 code; inherited by CR-385 ArrivalsPanel).

## Root cause (CODE_ERROR)
`ArrivalsPage.jsx` L273 / `ReservationsPage.jsx` L375 / CR-385 `FrontDeskWorkstationPage.jsx` (`cancelledBy={restaurant?.profile?.fullName}`) read `restaurant.profile.fullName` from `RestaurantContext`; that object has no `profile.fullName` (the `fullName` field lives on the **user** profile — `profileTransform.js` L89, exposed via `AuthContext.user`). The `?? 'staff'` fallback always wins.

## Fix proposal (not applied — QA role)
Use `user?.fullName ?? user?.firstName ?? 'staff'` from `useAuth()` at the three call sites (3 files, 3 lines). Fast Lane NOT eligible (3 files). Suggested routing: CR-385 Phase 1.5 (new panel) + owner decision for the two legacy pages (retire under FU-385-C or fix together with BUG-441).

## Evidence
`evidence/CR-385/phase1_qa_role4/` (R-M2-02 capture), `evidence/CR-385/phase1_qa/c1_cancel_222.json` (`"cancelled_by":"Owner"` there came from a session where the profile was loaded? — no: iteration_12 shows "Owner"; iteration_14 shows "staff" → value depends on whether `restaurant.profile` was hydrated; intermittent → still a defect: source field is wrong).
