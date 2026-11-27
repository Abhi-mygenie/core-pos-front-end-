# BATCH-A — Gate 3 Planning Index — 2026-11-15

Role: PLANNING (Gate 3). Docs only — no code changed. Owner choices R13 (2026-11-15): plan only backend-free parts; plan on today's code, build after QA of open items; pay-later waits BA-09; deliver together; read-only preprod probes allowed (done — `evidence/BATCH-A-G3/`, token deleted).
**2026-11-15 (later):** owner asked for one plan per CR, with each plan frozen. The group plans G1/G2/G6 are **superseded** and kept for history. Line numbers were rechecked at HEAD `b5d7a42`.

## Per-CR plans
| CR | Plan | Status | Blocking |
|---|---|---|---|
| CR-372-B | `plans/BATCH-A_CR-372-B_IMPLEMENTATION_PLAN_2026_11_15.md` | **FROZEN 2026-11-15** | none |
| BUG-674 | `plans/BATCH-A_BUG-674_IMPLEMENTATION_PLAN_2026_11_15.md` | PARTIAL | BA-01/02 (B2), BA-24 (B7) · B3/B4 = QA checks (R16) |
| CR-493 | `plans/BATCH-A_CR-493_IMPLEMENTATION_PLAN_2026_11_15.md` | PARTIAL | BA-05 (B5), BA-23 (B6) |
| CR-515 | `plans/BATCH-A_CR-515_IMPLEMENTATION_PLAN_2026_11_15.md` | PARTIAL | BA-09 (G2-B1) |
| CR-492 | `plans/BATCH-A_CR-492_IMPLEMENTATION_PLAN_2026_11_15.md` | READY FE | BA-08 (B3) · B2/BA-07 = QA check (R16) |
| BUG-670 | `plans/BATCH-A_BUG-670_IMPLEMENTATION_PLAN_2026_11_15.md` | BLOCKED | BA-01 |
| CR-494 | `plans/BATCH-A_CR-494_IMPLEMENTATION_PLAN_2026_11_15.md` | SKELETON | BA-11..15 |
| CR-495 | `plans/BATCH-A_CR-495_IMPLEMENTATION_PLAN_2026_11_15.md` | SKELETON | B-495-1..7 + new mockups M8b/M5c (R16 decisions made) |
| CR-443 | `plans/BATCH-A_CR-443_IMPLEMENTATION_PLAN_2026_11_15.md` | SKELETON | BA-19..22 |

Superseded: `BATCH-A_G6_ROUTES_…`, `BATCH-A_G1_CANCEL_…`, `BATCH-A_G2_RIGHTS_…_IMPLEMENTATION_PLAN_2026_11_15.md`.

## Shared-file order (Batch A)
| File | Order |
|---|---|
| CancelOrderModal.jsx | BUG-674 E2 + CR-493 E1/E3 (one pass) → CR-494 |
| CancelFoodModal.jsx | CR-493 → BUG-670 → CR-494 |
| orderTransform.js | BUG-674 E6 → BUG-670 → CR-494 |
| OrderEntry.jsx | BUG-674 E7 → CR-515 E9 → BUG-670 → CR-494 |
| DashboardPage.jsx | BUG-674 E8 → CR-494 |
| OrderReportBetaPage.jsx | CR-515 E7/E8 → BUG-674 B2 |
| CollectPaymentPanel.jsx | CR-492 → CR-494 → CR-495 |
| CollectBillPanelDrawer.jsx | CR-492 (no edit) → CR-515 B1 |
| App.js | CR-372-B alone |

## Prerequisites before any build
1. Gate 4 GO from owner.
2. QA pass: BUG-661 (App.js) · BUG-660/665/666 (CollectPaymentPanel) · BUG-662/656/CR-512 (OrderEntry) · BUG-664/665/666 (orderTransform). Recheck line numbers after.
3. BUG-639 (updateOrder `expandCompItems`) before or with CR-492.

## Suggested execution order
1. CR-372-B · 2. BUG-674 (E6 first) · 3. CR-493 · 4. CR-515 (E9, E7/E8) · 5. CR-492 (release after R-1) · 6. BUG-670 + blocked rows as replies land · 7. CR-494 · 8. CR-495 · 9. CR-443.

## Frozen list
| CR | Frozen | Plan |
|---|---|---|
| CR-372-B | 2026-11-15 (R16) | `plans/BATCH-A_CR-372-B_IMPLEMENTATION_PLAN_2026_11_15.md` |

## Final build order
Frozen so far: 1. CR-372-B (after BUG-661 QA + Gate 4 GO). The rest follow the suggested order above as each plan freezes. This list is final only when all 9 plans are frozen.

## API contracts (R19)
One FE↔backend contract per CR in `contracts/`. Base document (R21): `backend_briefs/BACKEND_BRIEF_BATCH-A_2026_11_15.html` — brief, contract links and reply checklist per CR. Names LOCKED; a backend reply that renames/changes fields is rejected. A plan can freeze only when its checklist is all ✅.

## Release checks
R-1 comp right for owners (RID 644 Owner has no `complementary_food`) · R-2 item cancel → `order_cancel` · R-3 `/local-printer-setup` login.

## New backend asks this round
BA-23 auto-cancel reason + Insights double count · BA-24 refund-cancel note key confirm (owner rechecks).
