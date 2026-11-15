# CR-542 — Mandatory reason on every Make Unpaid — Impact Analysis (Gate 2) — 2026-11-15

Code Reality: NONE — `make-order-unpaid` sends `{order_id}` only (`paymentMutationService.js` L99-106); dialog has no reason field.
Risk: HIGH (audit trail on money reversal). Backend-blocked: YES (reason list + param).
Conflict Pre-Check: `MarkUnpaidConfirmDialog.jsx` is shared by Audit, Order Beta, Room Orders "Remove from Room" (`RoomOrdersReportPage.jsx` L376) and Credit (CR-526). Batch A CR-493 (mandatory cancel reason) uses the same `cancellation-reasons` list pattern → reuse its "no reasons configured" block once CR-493 lands.

## Owner decisions (locked)
- R1: P0, analysed with CR-526.
- OD-542-A: reason = dropdown of backend-configured reasons (same list as cancellation reasons, new `item_type` **Unpaid**) + "Other" with free text. Mandatory.

## Data flow (today)
`GET /api/v1/vendoremployee/cancellation-reasons` (constants L112) → `settingsTransform.cancellationReasonsList` (L31-49: `itemType`, `isForOrder`, `isForItem`) → probe 07: `item_type` ∈ {Order, Food}. No `Unpaid` type yet.

## Impact
| File | Change |
|---|---|
| `api/transforms/settingsTransform.js` L31-49 | Add `isForUnpaid` (`item_type === 'Unpaid'`) |
| `components/reports/MarkUnpaidConfirmDialog.jsx` | Reason select + "Other" textarea; confirm disabled until chosen (Other → text required) |
| `api/services/paymentMutationService.js` L99 | `makeOrderUnpaid(orderId, reason)` → body `{order_id, reason}` (+ `reason_id` if backend wants) |
| Callers: `AllOrdersReportPage.jsx` L1140, `OrderReportBetaPage.jsx` L853, `CreditCustomerDetailSheet.jsx` (CR-526), `RoomOrdersReportPage.jsx` (Remove from Room) | Pass reason through |

Scope note: owner said "every Make Unpaid". Room Orders "Remove from Room" uses the same endpoint → included by default (shown in mockup M3 note); owner can exclude at Gate 2.5.

## Backend asks
- BB-04: new reason `item_type = 'Unpaid'` in cancellation-reasons list + admin screen.
- BB-05: `make-order-unpaid` accepts + stores `reason` (text) and/or `reason_id`; returns it in order logs / reports.

## Open
None (room scope confirm at Gate 2.5).

## Gate 2.5 owner decisions (2026-11-15) — design APPROVED
- M3 approved. OD-542-B: reason is **also required** for Room Orders "Remove from Room" → all 4 callers in scope.

## API Contract — FINAL v1 LOCKED 2026-11-15

`contracts/BATCH-B_CR-542_API_CONTRACT_2026_11_15.md`
