# CR-003 Implementation Summary: Paid & Hold Order Actions — Collect Bill from Hold, Change Payment Method, Mark as Unpaid

## Status
- implemented_user_validated

## Source Documents
- CR Doc Path: `/app/memory/change_requests/CR_003_paid_hold_order_actions.md`
- Impact Analysis Doc Path: `/app/memory/change_requests/impact_analysis/CR_003_IMPACT_ANALYSIS.md`
- Implementation Plan / Handover Doc Path: `/app/memory/handover/CR_003_IMPLEMENTATION_HANDOVER.md`
- Sequencing Index: `/app/memory/handover/IMPLEMENTATION_SEQUENCE_INDEX.md`

## Implementation Summary
Three row-level financial-mutation actions were added to the Audit Report
(`/reports/audit`):

1. **Hold tab → Collect Bill** — per-row green "Collect" pill opens a
   right-side drawer hosting the existing dashboard `CollectPaymentPanel`,
   so the operator can settle a held (paylater) order with the same UI,
   adjustments (Discount / Service Charge / Tip), payment method picker,
   bill summary, and Pay button as the dashboard collect-bill flow. The
   payload is built via the existing `orderTransform.toAPI.collectBillExisting`
   builder and POSTed to the existing `BILL_PAYMENT` endpoint — no parallel
   implementation, no new payload shape.

2. **Paid tab → Change Payment Method** — per-row blue "Change" pill opens
   a Cash / Card / UPI mini-popover. On selection the row's payment badge
   updates optimistically, `POST /change-order-payment-method` is called,
   and the report refetches on success (or rolls back on error).

3. **Paid tab → Mark as Unpaid** — per-row amber "Unpaid" pill opens a
   confirmation dialog. On confirm `POST /make-order-unpaid` is called;
   the row is optimistically removed from the Paid tab and a success
   toast is shown. The dashboard's existing socket listener
   (`new_order_${restaurantId}`) handles re-surfacing the order on other
   terminals.

All three actions enforce:
- **Permission gating** (frontend check; defense-in-depth alongside backend).
  - Change Payment Method   → `update_payment`
  - Mark as Unpaid          → `order_unpaid`
  - Collect Bill            → inherits the existing collect-payment role gate.
- **2-business-day mutation window**, anchored on the report's selected
  date. The window is page-level (not per-row) because the Audit Report
  already filters its visible rows to the selected business day. Outside
  the window, the pills are rendered but disabled with a tooltip ("Only
  available for today and yesterday").
- **Eligibility filter** — Aggregator (Zomato/Swiggy), Room/SRM, and
  `paymentMethod === 'transferToRoom'` rows do NOT receive the new pills.
  The Paid-tab action pills are additionally restricted to rows whose
  current `paymentMethod` is `cash` / `card` / `upi`.

## Files Modified
| File Path | Change Summary | Reason |
| --- | --- | --- |
| `/app/frontend/src/api/constants.js` | Added 2 endpoint constants: `CHANGE_ORDER_PAYMENT_METHOD`, `MAKE_ORDER_UNPAID` | Phase 3.1 — endpoint plumbing |
| `/app/frontend/src/api/services/paymentMutationService.js` (NEW) | New service wrappers `changeOrderPaymentMethod()` and `makeOrderUnpaid()`, plus `ALLOWED_PAYMENT_METHODS` constant. Strict input validation (numeric integer `order_id`, lowercase `cash`/`card`/`upi`). Reuses the global axios auth interceptor. | Phase 3.1 — keep new wrappers separate from the legacy `paymentService.js` (which references a stale `CLEAR_BILL` constant) |
| `/app/frontend/src/utils/businessDay.js` | Added `isMutationAllowedForSelectedDate(selectedDate, now?)` helper. Returns `true` only when selected date is device today or device yesterday | Phase 3.2 — page-level 2-day window guardrail |
| `/app/frontend/src/components/reports/OrderTable.jsx` | Added Actions column for Hold + Paid tabs. Added `isOrderEligibleForRowActions(order, tabId)` predicate (Aggregator / Room / SRM / transferToRoom excluded; Paid-tab actions restricted to cash/card/upi). New `actionsConfig` prop. New `renderActionsCell` helper. Hold tab renders a green "Collect" pill. Paid tab renders a blue "Change" pill (via `<PaymentMethodPicker />`) + amber "Unpaid" pill | Phase 3.3 — row action UI |
| `/app/frontend/src/components/reports/PaymentMethodPicker.jsx` (NEW) | Self-contained Radix popover anchored to the Change-Method trigger. Cash / Card / UPI tiles; current method highlighted with "Current" badge; pending state replaces icon with a spinner | Phase 3.4 — Change Method UI |
| `/app/frontend/src/components/reports/MarkUnpaidConfirmDialog.jsx` (NEW) | Controlled `AlertDialog` confirming the destructive action. Locked while pending; ESC/overlay close suppressed during in-flight call | Phase 3.5 — Mark Unpaid confirmation |
| `/app/frontend/src/components/reports/CollectBillPanelDrawer.jsx` (NEW) | Right-side fixed drawer (matches `OrderDetailSheet` styling). Internally fetches the held order via raw `SINGLE_ORDER_NEW`, transforms via `orderTransform.fromAPI.order` (canonical socket transform), stamps `placed: true` on every cart item, and renders the existing dashboard `CollectPaymentPanel`. On `onPaymentComplete(paymentData)` it builds the payload via `orderTransform.toAPI.collectBillExisting` and POSTs to `BILL_PAYMENT` — same builder + endpoint + payload shape the dashboard uses today | Phase 3.6 — Collect Bill UI |
| `/app/frontend/src/pages/AllOrdersReportPage.jsx` | Page-level orchestration: imports `useAuth` + `useToast`; computes `isWithinMutationWindow`, `canChangeMethod`, `canMarkUnpaid`; wires `actionsConfig` into the table; manages optimistic state (`paymentMethodOverrides`, `pendingChangeMethodIds`, `optimisticUnpaidIds`, `optimisticCollectedIds`); applies overrides + removals to a derived `displayOrders`; mounts `<MarkUnpaidConfirmDialog />` and `<CollectBillPanelDrawer />`; refetch + clear-overrides path on success | All phases — orchestration |

## Scope Implemented
- New `CHANGE_ORDER_PAYMENT_METHOD` and `MAKE_ORDER_UNPAID` endpoint constants.
- New `changeOrderPaymentMethod` and `makeOrderUnpaid` service wrappers.
- New `isMutationAllowedForSelectedDate` 2-day window helper.
- Hold tab — per-row "Collect" pill (eligibility-gated).
- Paid tab — per-row "Change" + "Unpaid" pills (eligibility + permission + window-gated).
- Cash/Card/UPI mini popover for Change Method.
- AlertDialog for Mark as Unpaid.
- Right-side drawer hosting the existing `CollectPaymentPanel` for
  Collect Bill from Hold (full feature parity with dashboard collect-bill —
  Discount, Service Charge, Tip, payment method tiles, Pay button).
- Optimistic UI updates with rollback on error (per action).
- Toast wiring for success / error on every action.
- Refetch on success → row reclassification (Hold → Paid, Paid → Unpaid).
- Frontend role gating using existing `useAuth().hasPermission()`.

## Out Of Scope / Not Touched
- No backend changes. (Backend socket emission for Mark-Unpaid is a backend
  team responsibility per CR doc CS-A11; frontend currently relies on
  explicit refetch as the fallback and the dashboard's existing socket
  subscription for cross-terminal re-surface.)
- No changes to `CollectPaymentPanel.jsx` (reused as-is).
- No changes to `DashboardPage.jsx`.
- No changes to `OrderDetailSheet.jsx` (CR explicitly forbids action duplication in the side sheet).
- No changes to the legacy `paymentService.js` (latent `CLEAR_BILL` bug remains
  out of scope per playbook + CR's "no unrelated refactors" rule).
- No changes to `ExportButtons.jsx`, KOT/print flows, aggregator order paths,
  room-orders flows (`/reports/rooms`).
- No PIN prompt, no admin-toggle, no `reason` capture (per CR-locked
  decisions OQ-A3 / OQ-B5 / OQ-C5 / OQ-Setting / OQ-B3 / OQ-C4).
- No split-payment special handling (per CR OQ-9: POS architecturally creates a
  separate order per split, so no special handling is needed).
- Aggregator (Zomato/Swiggy) Paid orders intentionally show NO action pills.
- Room / SRM / `paymentMethod === 'ROOM'` / `paymentMethod === 'transferToRoom'`
  orders intentionally show NO action pills.
- Pre-existing `LoadingPage.jsx` ESLint warning untouched.
- Pre-existing CR-001 audit-classification fall-through (running/pending
  unpaid orders surface as "Audit") — out of CR-003 scope; tracked
  separately by user as a CR-001 follow-up.

## API Changes
- **No new endpoints.** Three pre-existing endpoints used:
  - `POST /api/v2/vendoremployee/change-order-payment-method` — Endpoint A
  - `POST /api/v2/vendoremployee/make-order-unpaid` — Endpoint B
  - `POST /api/v2/vendoremployee/order/order-bill-payment` — Collect Bill (reuse)
  - `POST /api/v2/vendoremployee/get-single-order-new` — fetch held-order detail (reuse)

## Socket Changes
- **No new socket subscriptions added by the report page.** The dashboard's
  existing `new_order_${restaurantId}` channel handler covers the
  cross-terminal re-surface after Mark-Unpaid (per CR doc CS-A11 fallback).

## Payload / Data Changes
- Endpoint A payload: `{ order_id: <numeric DB id>, payment_method: 'cash'|'card'|'upi' }`. Lowercase enforced.
- Endpoint B payload: `{ order_id: <numeric DB id> }`.
- Collect Bill payload: **identical to the dashboard's collect-bill payload**
  (built via `orderTransform.toAPI.collectBillExisting`). No parallel
  payload shape.

## UI / UX Changes
- New row-level actions column on Hold and Paid tabs.
- Three new pill buttons (Collect, Change, Unpaid) with hide/disable rules.
- New popover (PaymentMethodPicker), new dialog (MarkUnpaidConfirmDialog),
  new drawer (CollectBillPanelDrawer hosting CollectPaymentPanel).
- Toasts for success / error on every action.
- Optimistic UI updates (badge swap, row removal) for snappier feel.
- All other audit-report UI surfaces unchanged.

## Backward Compatibility Notes
- All new code paths are additive. Existing tabs / rows / detail-sheet /
  exports continue to work identically when the new pills are not engaged.
- Service wrappers live in a NEW file (`paymentMutationService.js`) — the
  legacy `paymentService.js` was not touched.
- `OrderTable` accepts an OPTIONAL new `actionsConfig` prop; existing
  callers (none other than `AllOrdersReportPage`) are unaffected.

## Deviations From Approved Plan
- **Phase 3.6 implementation deviated from the original "mini modal" sketch
  the user briefly approved before pivoting** — at the user's explicit
  follow-up request, we discarded the mini modal in favour of reusing the
  existing dashboard `CollectPaymentPanel` inside a right-side drawer. The
  deviation matches the impact-analysis preferred path (full feature
  parity, identical payload shape) and is therefore lower risk than the
  mini-modal alternative.
- A one-shot diagnostic `console.log` of the logged-in user's permissions
  was added to `AllOrdersReportPage.jsx` at the user's request and is
  intentionally retained for now (per user instruction).
- No other deviations.

## Validation Performed
| Check | Result | Notes |
| --- | --- | --- |
| ESLint on 8 CR-003 files | Passed | All clean |
| Webpack compile | Passed | Only pre-existing unrelated `LoadingPage.jsx` warning |
| Manual playwright smoke — Audit page loads | Passed | 10 orders render, correct counts |
| Manual playwright smoke — Paid tab Change/Unpaid pills | Passed | Both pills render on cash/card/upi rows; hidden on transferToRoom |
| Manual playwright smoke — PaymentMethodPicker popover | Passed | Cash/Card/UPI tiles, "Current" highlight, click-different fires API |
| Manual playwright smoke — MarkUnpaidConfirmDialog | Passed | Title shows order #, Cancel + Mark Unpaid buttons render |
| Manual playwright smoke — Collect Bill drawer | Passed | Drawer slides in, embedded CollectPaymentPanel renders Bill Summary, Adjustments, Payment Method tiles, Pay button |
| User end-to-end validation — Phase 3.4 Change Method | Passed | User confirmed |
| User end-to-end validation — Phase 3.5 Mark Unpaid | Passed | User confirmed |
| User end-to-end validation — Phase 3.6 Collect Bill | Passed | Order 002905 successfully moved Hold → Paid (cash) ₹289 |
| Permissions diagnostic for Owner role | Passed | `update_payment: true`, `order_unpaid: true` confirmed |
| Regression — `/reports/audit` other tabs | Passed | No regression |
| Regression — `/reports/rooms` (CR-004) | Passed | Room Orders Report loads, summary bar OK, room rows render |
| Regression — OrderDetailSheet | Passed | Still opens on row click |
| Regression — PDF/CSV exports | Passed | Buttons still render |

## User Validation
- Status: Passed
- User confirmation: Validated each phase end-to-end (3.4 Change Method,
  3.5 Mark Unpaid, 3.6 Collect Bill all confirmed working). Permissions
  diagnostic confirmed `update_payment` + `order_unpaid` are present on
  the Owner role.
- Date/session context: Current implementation session (CR-28-april branch).

## Known Issues / Deferred Items
- **DEFERRED — Backend socket emission for Mark-Unpaid (`make-order-unpaid`):**
  Per CR CS-A11, backend will emit on `new_order_${restaurantId}` when the
  endpoint is hit, so other terminals re-surface the order. Frontend is
  already designed to consume this via the existing dashboard listener;
  until backend rolls out the emission, frontend explicitly refetches the
  audit report on success — verified working. Backend change is part of
  this CR's scope on the backend team's side; frontend is unblocked.
- **DEFERRED — Audit-classification fall-through (CR-001 follow-up):**
  Some running/pending unpaid orders are classified as "Audit" instead of
  surfacing on the Unpaid tab when their `payment_status` is something
  other than the literal string `'unpaid'`. User has chosen to park this
  and re-open as a CR-001 follow-up bug.
- **DIAGNOSTIC LEFT IN PLACE (per user instruction):** A one-time
  `console.log('[CR-003 DIAGNOSTIC] …')` of the logged-in user's
  permissions inside `AllOrdersReportPage.jsx`. Trivial to remove when
  no longer needed.
- **PRE-EXISTING (unrelated to CR-003):**
  - `paymentService.collectPayment()` references the missing
    `API_ENDPOINTS.CLEAR_BILL` constant — latent bug; not invoked by any
    CR-003 path.
  - `LoadingPage.jsx` line 111 — `react-hooks/exhaustive-deps` ESLint
    warning carried from earlier work.

## Ready For QA Handover?
- Yes — see `/app/memory/change_requests/qa_handover/CR_003_QA_HANDOVER.md`.

## Next Agent
- Change Request QA Validation Agent
