# CR-003 QA Handover: Paid & Hold Order Actions — Collect Bill from Hold, Change Payment Method, Mark as Unpaid

## QA Handover Status
- ready_for_qa_validation

## User Validation Status
- user_validated

## Source Documents
- CR Doc Path: `/app/memory/change_requests/CR_003_paid_hold_order_actions.md`
- Impact Analysis Doc Path: `/app/memory/change_requests/impact_analysis/CR_003_IMPACT_ANALYSIS.md`
- Implementation Plan / Handover Doc Path: `/app/memory/handover/CR_003_IMPLEMENTATION_HANDOVER.md`
- Implementation Summary Doc Path: `/app/memory/change_requests/implementation_summaries/CR_003_IMPLEMENTATION_SUMMARY.md`
- Sequencing Index: `/app/memory/handover/IMPLEMENTATION_SEQUENCE_INDEX.md`

## What Was Implemented
Three row-level financial-mutation actions on the Audit Report (`/reports/audit`):

1. **Hold tab → Collect Bill** (green pill) — opens a right-side drawer
   hosting the existing dashboard `CollectPaymentPanel` (full feature
   parity: Discount / Service Charge / Tip / payment method tiles / Pay
   button). Reuses `orderTransform.toAPI.collectBillExisting` payload
   builder + existing `BILL_PAYMENT` endpoint — no new payload shape, no
   new endpoint.
2. **Paid tab → Change Payment Method** (blue pill) — Cash/Card/UPI
   popover. Optimistic row update + Endpoint A
   (`change-order-payment-method`) + refetch on success.
3. **Paid tab → Mark as Unpaid** (amber pill) — Confirmation dialog +
   Endpoint B (`make-order-unpaid`) + optimistic Hold removal +
   refetch on success.

All three actions enforce permission gating, a 2-business-day mutation
window (anchored on report's selected date == device today or yesterday),
and an eligibility filter (no Aggregator / Room / SRM / transferToRoom;
Paid-tab pills additionally restricted to cash/card/upi rows).

## Files Changed
| File Path | Purpose |
| --- | --- |
| `/app/frontend/src/api/constants.js` | New endpoint constants `CHANGE_ORDER_PAYMENT_METHOD`, `MAKE_ORDER_UNPAID` |
| `/app/frontend/src/api/services/paymentMutationService.js` (NEW) | Service wrappers `changeOrderPaymentMethod()`, `makeOrderUnpaid()` |
| `/app/frontend/src/utils/businessDay.js` | New helper `isMutationAllowedForSelectedDate()` |
| `/app/frontend/src/components/reports/OrderTable.jsx` | Actions column + eligibility predicate + pill rendering |
| `/app/frontend/src/components/reports/PaymentMethodPicker.jsx` (NEW) | Cash/Card/UPI popover for Change Method |
| `/app/frontend/src/components/reports/MarkUnpaidConfirmDialog.jsx` (NEW) | Confirmation dialog for Mark-Unpaid |
| `/app/frontend/src/components/reports/CollectBillPanelDrawer.jsx` (NEW) | Right-side drawer hosting existing `CollectPaymentPanel` |
| `/app/frontend/src/pages/AllOrdersReportPage.jsx` | Page-level orchestration: permissions, window check, optimistic state, dialog/drawer mounts |

## Behavior To Validate In QA
| Area | Expected Behavior |
| --- | --- |
| Hold tab — Collect pill (eligibility) | Renders only on held rows that are NOT aggregator / Room / SRM / transferToRoom. Hidden on missing/running placeholders. |
| Hold tab — Collect pill (window) | Disabled (grey) with tooltip "Only available for today and yesterday" when selected date is older than yesterday. Enabled on Today / Yesterday. |
| Hold tab — Collect click | Opens right-side drawer; shows brief loading spinner while fetching held order detail; then renders dashboard `CollectPaymentPanel` with order #, items, computed bill, payment method tiles, Pay button. |
| Hold tab — Collect Pay success | Drawer closes, toast "Bill collected", report refetches, the held row disappears from Hold tab and reappears on Paid tab with the chosen payment method. |
| Hold tab — Collect Pay error | Drawer stays open; toast "Could not collect bill"; row restored on Hold; operator can retry. |
| Hold tab — Drawer ESC / backdrop click | Closes drawer (when not in-flight). When a Pay is in flight, ESC and backdrop are suppressed. |
| Paid tab — Change pill (eligibility) | Renders only when `paymentMethod` is `cash`/`card`/`upi`. Hidden on transferToRoom / TAB / online / aggregator. Hidden when user lacks `update_payment` permission. |
| Paid tab — Change pill (window) | Disabled with tooltip when selected date is outside 2-day window. |
| Paid tab — Change click | Opens popover anchored to button. Shows three tiles: Cash / Card / UPI. Current method has "Current" highlight. |
| Paid tab — Change selecting same | Popover just closes. No API call. |
| Paid tab — Change selecting different | Popover closes; row's payment badge updates immediately (optimistic); button shows spinner; Endpoint A fires; on success a toast "Payment method updated" appears and report refetches with authoritative value. |
| Paid tab — Change error | Row reverts to old method; toast "Could not update payment method"; spinner clears. |
| Paid tab — Unpaid pill (eligibility) | Same eligibility as Change pill. Hidden when user lacks `order_unpaid` permission. |
| Paid tab — Unpaid pill (window) | Same window rule as Change pill. |
| Paid tab — Unpaid click | Opens centered confirmation dialog: "Mark order #XXXXX as Unpaid?" with body about reappearing on dashboard. Cancel + Mark Unpaid buttons. |
| Paid tab — Unpaid confirm | Button shows "Marking…", row disappears from Paid tab optimistically, Endpoint B fires; on success dialog closes, toast "Order marked as unpaid", report refetches. Order should appear on Unpaid tab. |
| Paid tab — Unpaid error | Dialog stays open; row restored on Paid tab; toast error; operator can retry. |
| Paid tab — Unpaid Cancel | Dialog closes; no API call; row stays on Paid tab. |
| Permission gating — no `update_payment` | Change pill is HIDDEN (not just disabled) for that user. |
| Permission gating — no `order_unpaid` | Unpaid pill is HIDDEN. |
| 2-day window — date picker forward | (N/A — date picker doesn't allow future selections in current UI.) |
| 2-day window — today | All pills enabled (subject to permissions + eligibility). |
| 2-day window — yesterday | All pills enabled. |
| 2-day window — day before yesterday | All pills disabled with tooltip. |
| 2-day window — older dates | All pills disabled with tooltip. |
| Row click vs pill click | Clicking ANYWHERE on the row (outside the pills) opens the existing OrderDetailSheet — pills' `stopPropagation` prevents accidental sheet opening. |

## Regression Areas For QA
| Area | Why It Matters |
| --- | --- |
| `/reports/audit` All tab counts | Tab counts (All / Paid / Cancelled / Hold / Unpaid / Audit) must match data. |
| `/reports/audit` other tabs (All Orders, Cancelled, Credit, Merged, Unpaid, Aggregator, Audit) | None of these should show row action pills. The Actions column should not appear on these tabs. |
| `/reports/audit` PDF + CSV exports | Buttons must still render and produce the same output as before CR-003. |
| OrderDetailSheet | Row click still opens the side-sheet; sheet content unchanged. |
| `/reports/rooms` (CR-004) | Room Orders Report unchanged. Outstanding formula still correct. Lazy detail fetch still works. Summary bar still works. |
| Dashboard collect-bill flow | Operator running collect-bill on the dashboard for a held order (via OrderEntry) must still work IDENTICALLY. CR-003's drawer reuse of `CollectPaymentPanel` must NOT have broken the dashboard path. |
| Dashboard re-surface on Mark Unpaid | After Mark Unpaid is confirmed on the report, the order reappears as a running order on the dashboard (via the existing socket flow). Verify on a second terminal. |
| KOT / print flows | No changes — verify unchanged. |
| Aggregator orders (Zomato/Swiggy) | Action pills must NOT appear on aggregator paid rows. |
| Room/SRM/ROOM/transferToRoom orders | Action pills must NOT appear. |
| Login as a user WITHOUT `update_payment` | Change pill is HIDDEN. |
| Login as a user WITHOUT `order_unpaid` | Unpaid pill is HIDDEN. |

## API / Socket / Payload Areas To Check
| Area | Expected Result |
| --- | --- |
| `POST /api/v2/vendoremployee/change-order-payment-method` | Called only on a different-method selection. Body: `{ order_id: <numeric>, payment_method: 'cash'|'card'|'upi' }` (lowercase). |
| `POST /api/v2/vendoremployee/make-order-unpaid` | Called only after the user confirms in the dialog. Body: `{ order_id: <numeric> }`. |
| `POST /api/v2/vendoremployee/order/order-bill-payment` | Called from the Collect Bill drawer's Pay button. Payload IDENTICAL to dashboard's collect-bill payload (built via `orderTransform.toAPI.collectBillExisting`). |
| `POST /api/v2/vendoremployee/get-single-order-new` | Called when the Collect Bill drawer opens (to fetch held order detail). |
| Socket — `new_order_${restaurantId}` | Backend should emit on Mark-Unpaid; dashboard's existing handler picks it up and re-surfaces the order on other terminals. Frontend uses explicit refetch on the report page itself as the local fallback (verified). |

## Order Types / Channels To Test
| Channel | Required Test |
| --- | --- |
| Dine-in | Cash/Card/UPI Paid → both pills show, work end-to-end. Hold → Collect pill shows, collect-bill drawer renders correctly. |
| Takeaway | Same as dine-in. |
| Delivery | Same as dine-in. |
| Room (RM) | NO action pills. (Excluded by eligibility filter.) |
| SRM | NO action pills. (Excluded by eligibility filter.) |
| Scan & Order | Same as dine-in (when paid via cash/card/upi). |
| Aggregator (Zomato/Swiggy) | NO action pills. |
| TransferToRoom paid | NO action pills (treated as room-bound, excluded). |
| TAB / Credit | NO action pills (not in cash/card/upi allowlist). |
| Online | NO action pills (not in cash/card/upi allowlist). |

## Printing / KOT / Bill Checks
- No changes to KOT / print flows.
- Collect Bill drawer's `CollectPaymentPanel` Print Bill button reuses the
  existing dashboard print pipeline; should work as it does on dashboard.
- Change Method does NOT trigger reprint, invalidation, or any print-side
  effect (per CR OQ-Print).
- Mark as Unpaid does NOT trigger reprint, invalidation, or any print-side
  effect.

## Reporting / Analytics Checks
- Verify the All-tab summary `Total` and `Avg` recompute correctly after
  Change Method (the row stays counted) and after Mark-Unpaid (the row
  moves to Unpaid tab so Paid totals decrease).
- Verify Status counts in the per-tab badges (top of audit report) update
  on Mark-Unpaid + refetch.
- Daily revenue split (cash / card / upi) should reflect Change-Method
  results after refetch.

## Known Issues / Deferred Items
- **DEFERRED — Backend socket emission for Mark-Unpaid:** Pending backend
  team's addition of the emission on `new_order_${restaurantId}` after
  Endpoint B. Frontend's explicit refetch covers the report's own state
  in the meantime; cross-terminal re-surface depends on the existing
  dashboard handler.
- **DEFERRED — CR-001 audit-classification fall-through:** Pending
  running orders may surface as "Audit" instead of the Unpaid tab; tracked
  separately as a CR-001 follow-up.
- **DIAGNOSTIC LEFT IN PLACE (intentionally):** `console.log('[CR-003
  DIAGNOSTIC] …')` of the user's permissions on the audit page. Operator
  / QA can ignore; remove later via a one-line edit.
- **PRE-EXISTING (unrelated):**
  - `paymentService.collectPayment()` references the missing
    `API_ENDPOINTS.CLEAR_BILL` constant — latent bug; not on any
    CR-003 path.
  - `LoadingPage.jsx` line 111 — pre-existing ESLint warning.

## QA Instructions
- Validate ONLY the approved CR-003 scope listed above.
- Permissions test: log in as a non-Owner role to verify pill hide/show
  per `update_payment` and `order_unpaid` keys.
- Multi-terminal test for Mark-Unpaid re-surface (open dashboard on a
  second terminal, then mark-unpaid from the report on the first; the
  order should reappear as running on the second terminal — depending on
  backend socket emission rollout, otherwise covered by manual refresh).
- Cross-page regression test: `/reports/audit`, `/reports/rooms`,
  `OrderDetailSheet`, dashboard collect-bill flow.
- Do NOT treat unrelated pre-existing issues (CR-001 audit fall-through,
  `LoadingPage.jsx` warning, `paymentService.CLEAR_BILL` latent bug) as
  failures of this CR.
- If QA fails, produce a QA failure report including:
  - exact reproduction steps,
  - affected file/flow,
  - whether the failure is within CR-003's locked scope or in a deferred
    area.
- If QA passes, mark CR-003 as accepted and route the next CR (none in
  the queue per `IMPLEMENTATION_SEQUENCE_INDEX.md`) into the pipeline.

## Next Agent
- Change Request QA Validation Agent
