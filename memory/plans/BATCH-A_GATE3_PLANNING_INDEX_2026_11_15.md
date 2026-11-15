# BATCH-A — Gate 3 Planning Index — 2026-11-15

Role: PLANNING (Gate 3). Docs only — no code changed. Owner choices R13 (2026-11-15): plan only backend-free parts; plan on today's code, build after QA of open items; pay-later waits BA-09; deliver together; read-only preprod probes allowed (done — `evidence/BATCH-A-G3/`, token deleted).

## Plans
| Group | Items | Status | Plan |
|---|---|---|---|
| G6 Routes | CR-372-B | READY | `plans/BATCH-A_G6_ROUTES_IMPLEMENTATION_PLAN_2026_11_15.md` |
| G1 Cancel | BUG-674, CR-493, item-cancel right · BUG-670 | PARTIAL (9 edits ready; BUG-670 fully blocked BA-01) | `plans/BATCH-A_G1_CANCEL_IMPLEMENTATION_PLAN_2026_11_15.md` |
| G2 Rights | CR-492, CR-515 | PARTIAL (8 edits ready incl. comp reason M5b Option B; pay-later BA-09) | `plans/BATCH-A_G2_RIGHTS_IMPLEMENTATION_PLAN_2026_11_15.md` |
| G3 PIN & limits | CR-494 | NOT PLANNED — needs BA-11..15 | — |
| G4 Room comp | CR-495 | NOT PLANNED — needs Parth B-495-1..7 + half-board/meal-slot decision | — |
| G5 Alerts | CR-443 | NOT PLANNED — needs BA-19..22 | — |

## Prerequisites before any build
1. Gate 4 GO from owner.
2. QA pass: BUG-661 (App.js) · BUG-660/665/666 (CollectPaymentPanel) · BUG-662/656/CR-512 (OrderEntry) · BUG-664/665/666 (orderTransform). Recheck line numbers after.
3. BUG-639 (updateOrder `expandCompItems`) before or with G2 — part-comp reason on update path.

## Suggested execution order
1. **G6 Routes** — smallest, isolated (App.js), no backend. Ship first after BUG-661 QA.
2. **G1 Cancel — ready part** — transform note fix (E6) first (removes duplicate reason in note), then modal UI, then item-cancel right (E9).
3. **G2 Rights — ready part** — comp checkbox gating + Orders Beta buttons. Release only after R-1 (owners get `complementary_food`), else owners lose comp.
4. **G2 comp reason** (M5b Option B, approved) — same release as step 3.
5. **G1 blocked part** (BA-01/02/05) and **G2 pay-later** (BA-09) — when Gyan replies.
6. **G3 PIN** (CR-494) — after BA-11..15; it wraps cancel/comp/discount, so build after G1/G2.
7. **G4 Room comp** (CR-495) — after Parth reply; depends on G2 comp gating + G3 PIN.
8. **G5 Alerts** (CR-443) — last; listens to events from all the above.

## Release checks
R-1 comp right for owners (probe: RID 644 Owner has no `complementary_food`) · R-2 item cancel → `order_cancel` · R-3 `/local-printer-setup` login (confirm no printer device uses it unauthenticated).

## New backend asks this round
BA-23 auto-cancel reason + Insights double count · BA-24 refund-cancel note key confirm (owner rechecks).
