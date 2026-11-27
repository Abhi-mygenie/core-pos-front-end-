# CR-515 — Rights: Reprint, Change Payment Method, Make Unpaid, Collect Pay-Later — Impact Analysis (Gate 2) — 2026-11-14

Code Reality: PARTIAL.
Conflict: OrderReportBetaPage.jsx (BUG-626/546, CR-423 open), AllOrdersReportPage.jsx (BUG-645).
Risk: HIGH (payment mutations). Backend-blocked: depends on OD-515-A.

## Owner decision (locked)
4 new rights: reprint, change payment method, make unpaid, collect pay-later. No right → button hidden.

## Probe findings
Backend catalogue (probe 07) already has: `update_payment` (23, "Permission to update payment"), `order_unpaid` (22, "View unpaid orders"), `print_icon` (96, "Print Bill icon"), `clear_payment` (26, "Permission to clear payments"), `printer` (11, backend "Print bill"). No `reprint` / `collect_paylater` key.

## Code reality per action
| Action | Order Report (`/reports/audit`, AllOrdersReportPage) | Orders (Beta) (`/reports-module/order-report-beta`) | Dashboard / Order Entry |
|---|---|---|---|
| Change payment method | GATED `update_payment` L619 | **UNGATED** L708-716 | — |
| Make unpaid | GATED `order_unpaid` L620 | **UNGATED** L718-732 | — |
| Reprint bill | (verify Gate 3) | **UNGATED** L734-746 | `print_icon` gates bill print (OrderEntry L360, cards) |
| Collect pay-later (Hold) | **UNGATED** Collect Bill drawer L777, L917 | not present (only payment link L759) | — |
| Reprint KOT | — | — | RePrintButton.jsx (ungated) |

## Owner review 2026-11-14 (round 2)
- Owner confirmed: front-end gating missing on Orders (Beta) (screenshot attached in chat).

- Owner screenshot (Role editor → Permissions, 2026-11-14) highlights existing rights: **Mark Unpaid** (`order_unpaid`, "Mark orders as unpaid / pay later"), **Update Payment** (`update_payment`, "Change payment method after billing"), **Mark Complimentary** (`complementary_food`). These already exist in `constants/permissionCatalog.js` L16, L17, L29 and in the backend catalogue.
- Agent reading (to confirm): change method → `update_payment`; make unpaid + collect pay-later → `order_unpaid`; reprint → existing print right (`print_icon` "Show Print Button" or `printer` "Print Bills", L81/L83) — OD-515-C OPEN.

- Owner 2026-11-14 round 3: **OD-515-B = c — Orders (Beta) + Order Report + dashboard bill print + order-screen KOT/bill reprint.** Blast radius grows to: OrderReportBetaPage, AllOrdersReportPage, OrderTable, CollectBillPanelDrawer, OrderCard, TableCard, ChannelColumn, DashboardPage (R5), OrderEntry (R5), RePrintButton.
- `printer` right (Print Bills) is not consumed anywhere in FE today; `print_icon` gates bill print on cards/OrderEntry.

- Owner 2026-11-14 round 3: **Reprint right — "move to P1"** (reprint gating deferred to P1; OD-515-C parked). Change method / unpaid / collect pay-later stay in Batch A.

## Open owner decisions
- OD-515-A: use existing keys (`update_payment`, `order_unpaid`, `print_icon`, `clear_payment`) or ask backend for 4 NEW keys? OPEN.
- OD-515-B: apply on Orders (Beta) only, or also Order Report page + dashboard bill print + KOT reprint? OPEN.

## Backend asks (only if OD-515-A = new keys)
- B-515-1: new module keys for reprint + collect pay-later (+ change method / unpaid if not reusing).
- B-515-2: server-side enforcement on change-order-payment-method, make-unpaid, bill-payment.
