# CR-526 (+BUG-605) — Make Unpaid / Remove from credit in Audit, Order Beta, Credit Management — Impact Analysis (Gate 2) — 2026-11-15

Code Reality: PARTIAL — Audit Unpaid works; Order Beta button exists but dialog never opens (BUG-605); Credit Management has no action.
Risk: CRITICAL (credit ledger reversal, settlement). Backend-blocked: PARTIAL — FE buttons ready; settlement lock (OD-526-B) needs backend.
Conflict Pre-Check: `OrderReportBetaPage.jsx` — Batch A CR-515 Gate 3 edits Orders Beta buttons → same branch / after CR-515. `CreditCustomerDetailSheet.jsx` — CR-527 (this batch) adds Diner column in the same row → implement CR-527 + CR-526 together.

## Owner decisions (locked)
- Right: existing `order_unpaid` permission. No PIN.
- OD-526-A: Audit + Order Beta keep today/yesterday window (`utils/businessDay.js` L124-132). Credit Management: **no day limit**.
- OD-526-B: after waiter settlement for that day → Unpaid / Change Method **blocked** with "Day already settled". Needs backend signal + enforcement.
- OD-526-C: Credit Management = per-order "Remove from credit" in customer detail, reusing `make-order-unpaid` (backend reverses credit — probe 26: 420 → 0).

## Root cause BUG-605
`OrderReportBetaPage.jsx` L853-858 renders `MarkUnpaidConfirmDialog` with **no `open` prop** and `onClose` instead of `onCancel` (dialog API L59-70: `open`, `onCancel`). AlertDialog stays closed → "Unpaid does nothing". Audit (`AllOrdersReportPage.jsx` L1140-1146) uses the correct props.

## Probe evidence
- 26: `make-order-unpaid` on a TAB order reverses credit ledger.
- 22_*: `make-order-unpaid` returns 200 with no settlement check; R5 probe 34 (7 days of `get-settlement-report`, RID 541): waiter rows carry `today_settlement`, `balance_to_settle`, `pilferage`, but **no settled / locked flag or timestamp** → FE cannot derive "day settled".
- R5 probe 31: credit rows have `order_id`, `restaurant_order_id`, `credit_order_amount`, `payment_status` → enough to call `make-order-unpaid` per row.

## Impact
| File | Change |
|---|---|
| `pages/reports-module/OrderReportBetaPage.jsx` L853-858 | Pass `open={!!markUnpaidTarget}`, `onCancel` (BUG-605) |
| `components/credit/CreditCustomerDetailSheet.jsx` `CreditRow` L112-153 + head L155-165 | Add "Remove" action per credit row (gate `order_unpaid`); confirm via `MarkUnpaidConfirmDialog` with credit copy; refetch detail + list after success |
| `pages/CreditManagementPage.jsx` / `components/panels/CreditManagementPanel.jsx` | Refresh customer balance after removal (existing loader) |
| `MarkUnpaidConfirmDialog.jsx` | Reason dropdown (CR-542) |
| (after backend) Audit + Beta + Credit | Disable action + "Day already settled" when backend says the order's day is settled |

Edge (for Gate 2.5): Remove on rows that are FIFO-covered ("Covered"/"Partial" badge) — mockup proposes Open rows only.

## Not touched
`paymentMutationService.js` (reused), `creditService.js` fetch shape, CPP.

## Backend asks
- BB-02: settled-day signal per order/date (e.g. `is_settled` + `settled_at` on settlement rows or on order rows) for UI disable.
- BB-03: `make-order-unpaid` must reject when the order's business day is settled (error message "Day already settled").

## Open
- Gate 2.5: which credit rows show Remove (proposal: Open only).

## Gate 2.5 owner decisions (2026-11-15) — design APPROVED
- M3 + M4 approved.
- OD-526-D: **Remove** shows on **Open** credit rows only. Partial (part paid back) rows show Remove greyed with hint "Part already paid back". Covered rows: no button.
- Remove dialog title: "Remove order #<no> from credit?" + CR-542 reason.
