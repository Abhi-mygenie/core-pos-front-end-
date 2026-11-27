# Merge Handover — Batch A per-CR plans (Gate 3) — 2026-11-15

Role: PLANNING (Gate 3). **Docs only — no app code, .env or platform files touched.** Stays at Gate 3.

## What changed
- 9 new per-CR plans in `plans/` (`BATCH-A_<ID>_IMPLEMENTATION_PLAN_2026_11_15.md`): CR-372-B, BUG-674, CR-493, CR-515, CR-492, BUG-670 (full); CR-494, CR-495, CR-443 (skeletons). Rows moved unchanged from the group plans. Each plan has a "Shared files" section.
- Group plans G1/G2/G6 marked **SUPERSEDED** (not deleted).
- Line numbers rechecked at HEAD `b5d7a42`. All match; path fixes: `pages/reports-module/OrderReportBetaPage.jsx`, `pages/AllOrdersReportPage.jsx`, CPP contexts import is L4.
- Decisions log: R16 added. Parth brief: Q3/Q4 answered by owner. Planning index: per-CR table, shared-file order, frozen list, build order.
- Registries: CR-372-B → `GATE_3_PLAN_FROZEN 2026-11-15`; CR-494/495/443 → `GATE_3_SKELETON`; BUG-674 / CR-492 status text updated (QA checks); plan paths now point at per-CR plans.

## Files changed
plans/BATCH-A_{CR-372-B,BUG-674,CR-493,CR-515,CR-492,BUG-670,CR-494,CR-495,CR-443}_IMPLEMENTATION_PLAN_2026_11_15.md (new) · plans/BATCH-A_G1_CANCEL_…, BATCH-A_G2_RIGHTS_…, BATCH-A_G6_ROUTES_… (header) · plans/BATCH-A_GATE3_PLANNING_INDEX_2026_11_15.md · change_requests/BATCH_A_OWNER_DECISIONS_2026_11_14.md · backend_briefs/BACKEND_BRIEF_CR-495_ROOM_COMP_MEAL_PACKAGE_2026_11_14.md · control/CR_REGISTRY.md · control/registry.json · this file.

## Next
1. Owner: approve drawing new mockups M8b (half-board second meal at check-in) and M5c (meal pick on room comp) at Gate 2.5.
2. On backend replies → save to `backend_replies/`, update tracker, convert BLOCKED rows, re-ask freeze per plan.
3. Gate 4 GO not given. Do not code.
