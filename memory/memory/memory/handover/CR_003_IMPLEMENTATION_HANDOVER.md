# CR-003 Implementation Handover

## Scope
Implementation handover for **CR-003 only**.

CR title:
**Paid & Hold Order Actions — Collect Bill from Hold, Change Payment Method, Mark as Unpaid**

Status:
- CR: approved for planning
- Impact analysis: approved for planning

Mode assumptions for implementation agent:
- Implement only CR-003
- Do not mix in CR-001 or CR-004 changes except where CR-003 depends on CR-001 already being merged

## Hard Dependency
**CR-001 must be merged first**.
Reason:
- CR-003 relies on correct Hold/Paid/Unpaid classification
- Room and aggregator leakage must already be controlled

## Request Summary
CR-003 adds three row-level actions to Audit Report:
1. **Hold tab → Collect Bill**
2. **Paid tab → Change Payment Method**
3. **Paid tab → Mark as Unpaid**

These are financial mutations and must be handled carefully.

## Final Locked Scope
### Included
- Hold tab rows get per-row **Collect Bill** button
- Paid tab rows get per-row **Change Payment Method** control
- Paid tab rows get per-row **Mark as Unpaid** action
- Permission gating on frontend using:
  - `update_payment`
  - `order_unpaid`
- 2-business-day mutation window:
  - today + previous business day only
  - older rows show disabled controls with tooltip
- Change Payment Method:
  - allowed values only: `cash`, `card`, `upi`
  - request body uses lowercase
  - display value should remain display-cased: `Cash`, `Card`, `UPI`
- Mark as Unpaid:
  - confirmation dialog required
  - backend emits socket event on existing order channel
  - frontend trusts backend socket flow
- Collect Bill from Hold:
  - reuse existing `CollectPaymentPanel`
  - present as modal overlay on report page
  - no dashboard navigation required
- Row-level only:
  - do not duplicate actions in `OrderDetailSheet`
- New wrappers should live in:
  - `/app/frontend/src/api/services/paymentMutationService.js`
  - but impact analysis asks implementation agent to quickly re-confirm this placement before locking

### Excluded
- No aggregator order actions
- No room / SRM / ROOM actions
- No admin setting toggle
- No PIN prompt
- No print/KOT side effect
- No split-payment special handling
- No side-sheet action duplication

## Affected Module(s)
- Primary: **Reports / Audit / Summary Module**
- Secondary: **Order Entry / Cart / Payment Workflow**
- Cross-cutting dependency: **Realtime Socket**
- Indirect runtime effect: **Dashboard / POS Workspace**

## Related APIs
### Endpoint A — Change Payment Method
- `POST /api/v2/vendoremployee/change-order-payment-method`
- body:
  - `order_id` = numeric DB id
  - `payment_method` = lowercase `cash` / `card` / `upi`

### Endpoint B — Mark as Unpaid
- `POST /api/v2/vendoremployee/make-order-unpaid`
- body:
  - `order_id` = numeric DB id

### Collect Bill from Hold
- Reuse existing collect-payment flow
- Do not invent a new endpoint

## State Impact
- `AllOrdersReportPage` local state will gain:
  - selected actionable row
  - collect-bill modal state
  - payment-method picker state
  - mark-unpaid confirmation state
- Report data refresh after mutations
- Do not proactively refresh dashboard running orders from report page; backend socket handles re-surfacing

## UI Impact
- `OrderTable` needs row-level actions column/cells
- Hold tab:
  - Collect Bill button
- Paid tab:
  - Change Method button
  - Mark Unpaid button
- No actions in other tabs
- No action duplication in side sheet
- Disabled vs hidden rules:
  - no permission → hide
  - outside 2-day window → show disabled with tooltip

## Key Confirmed Decisions
- Service wrappers go in new `paymentMutationService.js` (re-confirm once before locking)
- Numeric DB `id` is the endpoint `order_id`
- Takeaway / delivery / scan-&-order are in scope
- Aggregator and room/SRM are out of scope
- Display casing after method change should be `Cash` / `Card` / `UPI`
- 2-day window anchors on device “today” business day, not report selected date
- `OrderDetailSheet` does not duplicate actions
- Backend socket event is trusted after mark-unpaid
- Open side-sheet behavior on mutation is deferred to implementation planning judgment

## Important Code Truths / Risks
- `CollectPaymentPanel.jsx` is a hotspot and should be reused, not rewritten
- `DashboardPage.jsx` is a hotspot and should ideally not be directly edited
- `paymentService.collectPayment()` references stale constant usage per impact analysis; CR-003 should not rely on that wrapper directly
- Existing socket flow should be reused for mark-unpaid reappearance

## Primary Files To Change
1. `/app/frontend/src/api/constants.js`
2. `/app/frontend/src/api/services/paymentMutationService.js` (NEW)
3. `/app/frontend/src/pages/AllOrdersReportPage.jsx`
4. `/app/frontend/src/components/reports/OrderTable.jsx`
5. `/app/frontend/src/components/reports/CollectBillModal.jsx` (NEW)
6. `/app/frontend/src/components/reports/PaymentMethodPicker.jsx` (NEW)
7. `/app/frontend/src/components/reports/MarkUnpaidConfirmDialog.jsx` (NEW or inline dialog)
8. `/app/frontend/src/api/socket/socketHandlers.js` or related socket wiring only if required by actual event payload

## File-Level Change Plan

### 1) `/app/frontend/src/api/constants.js`
- Intended change:
  - add endpoint constants for A and B
- Risk:
  - Low

### 2) `/app/frontend/src/api/services/paymentMutationService.js` (NEW)
- Intended change:
  - add wrappers:
    - `changeOrderPaymentMethod(orderId, paymentMethod)`
    - `makeOrderUnpaid(orderId)`
- Risk:
  - Medium
- Notes:
  - reuse axios auth interceptor
  - generic error path is acceptable initially

### 3) `/app/frontend/src/pages/AllOrdersReportPage.jsx`
- Intended change:
  - own action orchestration
  - open/close report-page collect-bill modal
  - trigger mutation handlers
  - refresh report data after success
  - respect permission + 2-day window rules
- Risk:
  - High

### 4) `/app/frontend/src/components/reports/OrderTable.jsx`
- Intended change:
  - add action cell(s) only where needed
  - isolate button click from row click via `stopPropagation`
  - hide/disable properly
- Risk:
  - Medium

### 5) `/app/frontend/src/components/reports/CollectBillModal.jsx` (NEW)
- Intended change:
  - wrapper around existing `CollectPaymentPanel`
  - fetch single order as needed
  - build the minimal compatible prop contract expected by panel
  - close + refresh on success
- Risk:
  - High due to `CollectPaymentPanel` contract complexity

### 6) `/app/frontend/src/components/reports/PaymentMethodPicker.jsx` (NEW)
- Intended change:
  - small popover/mini modal with Cash/Card/UPI
- Risk:
  - Low

### 7) `/app/frontend/src/components/reports/MarkUnpaidConfirmDialog.jsx` (NEW or inline)
- Intended change:
  - confirmation dialog only
- Risk:
  - Low

### 8) Socket wiring files (only if needed)
- Intended change:
  - adapt to backend emitted event shape if existing handler path does not already cover it
- Risk:
  - Medium
- Notes:
  - avoid expanding hotspot logic unless actual event shape forces it

## Recommended Implementation Sequence
1. Verify CR-001 is merged
2. Add endpoint constants and payment-mutation service wrappers
3. Add row action UI in table for Hold and Paid tabs
4. Build method-picker flow
5. Build mark-unpaid confirmation flow
6. Build collect-bill modal wrapper around existing panel
7. Hook success paths to report refresh
8. Verify socket-driven unpaid reappearance behavior

## Regression Risks
- Financial mutation regression
- `CollectPaymentPanel` reuse outside native parent
- Wrong endpoint id field usage
- Socket event mismatch after mark-unpaid
- Incorrect hidden vs disabled behavior
- Paid/Hold/Unpaid counts drifting after mutation

## Things That Must Remain Unchanged
- No aggregator actions
- No room mutation actions
- No print side effects
- No admin toggle
- No PIN flow
- No side-sheet action duplication
- No direct dashboard navigation for collect bill

## Testing Checklist
- Happy path tested:
  - Hold → Collect Bill opens modal and completes successfully
  - Paid → Change Payment Method updates row in place
  - Paid → Mark Unpaid removes row and report refreshes
- Error path tested:
  - endpoint A failure rolls back UI and shows toast
  - endpoint B failure leaves row intact and shows toast
  - collect-bill modal failure remains recoverable
- Permission-gated path tested:
  - missing `update_payment` hides change-method control
  - missing `order_unpaid` hides mark-unpaid control
- Socket/reload/re-entry behavior tested:
  - mark-unpaid reappearance path verified with backend event or fallback handling as applicable
- Related print/payment/room path tested:
  - no print side effect
  - no room-order action leakage
- Regression surfaces checked:
  - `/reports/audit`
  - `CollectPaymentPanel`
  - dashboard running order visibility

## Minimal Validation Cases
1. Hold row shows Collect Bill button only on allowed rows
2. Paid row shows Change Method and Mark Unpaid only when permission exists
3. Old rows show controls disabled, not hidden
4. Aggregator and room rows show no controls
5. Change Method sends numeric DB `id`, lowercase method, then shows display-cased badge
6. Mark Unpaid confirmation appears before call
7. Mark Unpaid success removes row from Paid tab and report refreshes
8. Collect Bill modal closes and refreshes report on success
9. Side-sheet does not duplicate actions

## Notes For Implementation Agent
- Re-confirm service wrapper placement once, then proceed.
- Keep changes outside hotspot internals wherever possible.
- If the open side sheet shows a mutated order, choose a conservative behavior (close or refetch) and document it.
