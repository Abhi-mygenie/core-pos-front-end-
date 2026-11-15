# BUG-671 — Audit Report: Unpaid hidden for split / partly-paid orders — Impact Analysis (Gate 2) — 2026-11-15

Code Reality: PARTIAL — Unpaid action exists in Audit (CR-003) but is hidden for `partial`; Order Beta already shows it (L718).
Risk: HIGH (payment reversal on report; backend does the money). Backend-blocked: NO.
Conflict Pre-Check: `OrderTable.jsx` — no open Batch A edit. `OrderReportBetaPage.jsx` — Batch A CR-515 (Gate 3 plan: Orders Beta buttons) touches the same row-action block → implement BUG-671/CR-526 AFTER CR-515 lands or in the same branch; rebase on CR-515 lines.

## Owner decisions (locked)
- OD-671-A: split / partly-paid orders in Audit → show **Unpaid only**. Change Method for split = PHASE 2 (not in scope).
- Whole bill becomes unpaid; backend reverses the paid parts.

## Data flow
Audit Report (`AllOrdersReportPage.jsx`) → `OrderTable.jsx` row actions → `isOrderEligibleForRowActions(order, 'paid')` → `PAID_ACTIONS_ALLOWED_METHODS=['cash','card','upi']` (L248, check L256-259) → `partial` returns false → **both** Unpaid and Change Method hidden → `MarkUnpaidConfirmDialog` (L1140, correct `open`/`onCancel`) → `paymentMutationService.makeOrderUnpaid` (L99) → `POST /api/v2/vendoremployee/make-order-unpaid {order_id}`.

## Probe evidence (2026-11-14, cafe103)
- 20/21/22/23 `*_A_split`: split cash 220 + upi 200 → `partial` paid → `make-order-unpaid` 200, `partial_payments_deleted:2`, `waiter_collections_deleted:2`, order → status 5 unpaid. **Backend OK, FE-only fix.**
- Note: `transaction_id` (UPIREF671) stays on the unpaid row (25) — harmless, re-pay overwrites.

## Impact
| File | Change (Gate 3 to detail) |
|---|---|
| `components/reports/OrderTable.jsx` L248-259 | Split eligibility per action: Unpaid allowed for `partial`; Change Method keeps `cash/card/upi` only |
| (none else) | Dialog + service unchanged |

Downstream: Audit Paid tab refetch (existing `fetchOrders()`), dashboard running order re-appears via socket (existing). Settlement report numbers change via backend (existing behaviour for single-method unpaid).

## Not touched
`MarkUnpaidConfirmDialog.jsx` (except CR-542), `paymentMutationService.js`, `orderTransform.js`, CPP.

## Dependencies
- CR-542 (reason) will wrap this same action — ship together or BUG-671 first.
- OD-526-B settlement lock (backend) applies here too once available.

## Open
None.

## Gate 2.5 owner decisions (2026-11-15) — design APPROVED
- M1 approved as shown.
