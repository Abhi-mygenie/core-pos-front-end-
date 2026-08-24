# CR-029 — Impact Analysis (Gate 2)

**Date:** 2026-06-11 · **Status:** ANALYSIS COMPLETE — Gate 3 needs owner choice (badge vs toggle, default scope)

## 1. Current Predicate Landscape
| Location | Predicate | Rooms |
|---|---|---|
| `orderLedgerService.js:32` | `isRoomOrderForReport` (verbatim copy) | EXCLUDE |
| `AllOrdersReportPage.jsx:40` | `isRoomOrderForReport` (original) | EXCLUDE |
| `SalesMockup` / `PaymentsMockup` | inherit via orderLedgerService | EXCLUDE |
| `insightsService.getItemSalesAggregated` | none | INCLUDE |
| `insightsService.getDashboardAggregated` | none (Room is a channel) | INCLUDE |
| `CancellationsMockup` | none | INCLUDE |
| Room Orders Report (CR-004) | rooms only | dedicated screen |

## 2. Proposed Change Shape
1. New `frontend/src/utils/orderPredicates.js`: export `isRoomOrder(raw|transformed)` handling BOTH shapes (orders_table fields and transformed row fields) + the `payment_method='ROOM' with order_in=null` edge + decide `transferToRoom` membership (owner: is transferToRoom "room scope"? today it passes room-exclusion but is excluded from Ledger Paid).
2. Apply per owner-chosen default; add screen-header badge component ("Excl. rooms" / "Incl. rooms") or a toggle persisted per screen.

## 3. Affected Files
`insightsService.js` (2 aggregators), `orderLedgerService.js`, `AllOrdersReportPage.jsx`, `CancellationsMockup.jsx`, headers of `SalesMockup/PaymentsMockup/DashboardMockup/ItemSalesHybridMockup`, NEW `orderPredicates.js`.

## 4. Number Shifts (owner must expect, from replication)
If rooms EXCLUDED everywhere (option a): Dashboard/Items drop by Mar ₹1,78,172 / Apr ₹1,43,603 / May ₹1,01,081 and align with Sales. Channel-mix "Room" slice disappears from Dashboard (Room Orders Report covers it).

## 5. Regression Risk
- MEDIUM. fStatus-6 gates untouched, but Dashboard channel tile, Top Items (room items drop out), customer tile counts all shift.
- Frozen-screen protocol: S7 (Sales) / S8 (Payments) are FROZEN per control layer — badge addition needs freeze-log entries (`CR_011_SCREEN_FREEZE_LOG.md`).

## 6. Test Strategy
Replication harness already computes both scopes per month (`dashboard.room_rev`); QA asserts post-change Dashboard === current Dashboard − room_rev per month (option a), all four months, both restaurants.
