# BUG-028 Implementation Summary

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Analysis File: /app/memory/bugs/BUG_ANALYSIS_028.md
- Plan File: /app/memory/bugs/BUG_IMPLEMENTATION_PLAN_028.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-028/
- Google Sheet Status Before Implementation: plan_approved

## Baseline Build/Run Before Change
- Baseline install completed: Yes (yarn install — installed missing @hello-pangea/dnd)
- Baseline build completed: Yes (webpack compiled with 1 warning, no errors)
- Baseline app run completed: Yes (frontend RUNNING)
- Notes: Missing @hello-pangea/dnd package was installed; all other packages were present.

## Implementation Status
- Completed

## Bug Summary
- Service charge was defaulting ON in Collect Payment Panel even when operator expectation is that it should start unchecked. Changed `serviceChargeEnabled` initial state from `true` to `false`.

## Files Modified
| File | Change Made | Reason |
| --- | --- | --- |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Changed `useState(true)` to `useState(false)` for `serviceChargeEnabled` with BUG-028 comment | This file owns the service-charge checkbox state and its default value |

## Files Inspected But Not Changed
| File | Reason |
| --- | --- |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Verified payment/print override paths consume paymentData.serviceCharge unchanged |
| `/app/frontend/src/api/transforms/orderTransform.js` | Verified no contract change required — payload builders consume UI-computed SC value |

## What Was Changed
- `CollectPaymentPanel.jsx` line ~205: `useState(true)` → `useState(false)` for `serviceChargeEnabled`

## What Was Not Changed
- takeaway/delivery service-charge applicability gating (scApplicable) — unchanged
- Manual toggle behaviour — cashier can still enable SC per bill
- Payment/print payload builders — unchanged
- Socket handlers — unchanged

## API / Socket Impact
- API changes: No
- Socket changes: No
- Payload changes: Indirect — service charge no longer included in payload unless cashier explicitly enables it
- Details: No contract shape change; the value flowing into payment/print is now 0 by default unless toggled

## State / UI Impact
- State/context changes: serviceChargeEnabled initial state changed from true to false
- UI behavior changes: Service charge section remains visible and toggleable for applicable orders but starts unchecked
- Existing behavior preserved: Takeaway/delivery non-applicability, manual toggle, percentage display

## Post-Implementation Validation
- Build completed after change: Yes
- App run completed after change: Yes
- Manual validation performed: Compiler verified — no errors, 1 pre-existing warning
- API payload checks: Not verified live (no access to live backend from this environment)
- Socket checks: N/A — no socket change
- UI checks: Code verified — useState(false) correctly initialises state
- Runtime/console errors: None
- Regression checks: Applicability gating code path unchanged

## Validation Not Performed
- Live browser test against actual backend (environment uses preprod API)
- Manual checkbox toggle in browser (requires login)

## Regression Areas For QA Agent
- Dine-in/walk-in/room: confirm SC section visible but unchecked by default
- Toggle ON: confirm totals update correctly when SC is manually enabled
- Takeaway/delivery: confirm SC section still not shown
- Payment submission with SC OFF: confirm service_tax = 0 in payload
- Payment submission with SC ON: confirm service_tax computed correctly
- Print Bill: confirm print payload parity with UI totals

## Pending / Blocked Items
- None

## Docs / Pending Documentation
- Does this require DOC_UPDATES_PENDING.md later? Yes
- Recommended note: Record that the collect-bill UI now defaults SC OFF; operator must enable per bill. Applicability gating (dineIn/walkIn/room only) unchanged.

## Next Step
- QA Agent should validate this implementation and create:
  /app/memory/bugs/BUG_QA_REPORT_028.md
