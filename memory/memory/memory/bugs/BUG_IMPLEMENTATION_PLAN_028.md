# BUG-028 Implementation Plan

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Analysis File: /app/memory/bugs/BUG_ANALYSIS_028.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-028/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Planning: analysis_done

## Bug Summary
- Service charge is defaulting ON in Collect Payment even when the operator expectation is that the per-bill toggle should start unchecked. Takeaway and delivery are explicitly out of scope because service charge is not applicable there.

## Analysis Verdict
- Frontend bug. `CollectPaymentPanel` hardcodes `serviceChargeEnabled` to `true`, while the requested behavior is a default-OFF per-bill service-charge toggle for applicable order types.

## Planning Decision
- Plan Status: Ready
- Reason:
  - User clarified the source of truth is the in-panel Collect Payment checkbox behavior.
  - User clarified expected behavior is: show the section, but default it unchecked; manual enabling remains allowed.
  - Applicability remains unchanged: service charge is not applicable in takeaway or delivery, and that gate already exists in code.
- Safe To Implement Without Clarification: Yes

## Pre-Change Approval Note
- Request Summary: Keep service charge section visible for applicable orders, but default the per-bill toggle to OFF instead of ON. Manual enabling should remain allowed. Do not change takeaway/delivery non-applicability.
- Change Type: local UI/state-flow fix
- Affected Modules: Order Entry / Cart / Payment Workflow
- Downstream Impacted Modules: Printing / Bill / KOT Module
- Files Likely To Change:
  - `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- Related APIs:
  - `POST /api/v2/vendoremployee/order/order-bill-payment`
  - `POST /api/v1/vendoremployee/order-temp-store`
  - `POST /api/v2/vendoremployee/order/place-order`
- Payload Impact: Yes, only indirectly — service charge should no longer be included unless the cashier explicitly enables it for that bill.
- Socket Impact: No
- State Impact: `serviceChargeEnabled` default initialization in collect-bill flow.
- UI Impact: Service Charge section remains visible for applicable order types, but starts unchecked.
- Regression Risks:
  - dine-in / walk-in / room settlement totals
  - print payload parity with collect-bill UI
  - prepaid vs postpaid flows that reuse live payment values
- Deferred/Open Decision Dependency: No final-doc blocker, but this plan implies a UI/default behavior worth documenting later as pending docs guidance.
- Safe To Implement Without Clarification: Yes

## Files To Change
| File | Planned Change | Reason |
| --- | --- | --- |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Change the initial/default value of `serviceChargeEnabled` from hardcoded ON to default OFF while preserving manual toggle behavior and existing applicability gating. | This file owns the service-charge checkbox state, displayed bill rows, and values passed into payment/print flows. |

## Files To Inspect But Not Change
| File | Reason |
| --- | --- |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Verify payment/print override paths simply consume `paymentData.serviceCharge` and do not need additional logic changes when the toggle defaults OFF. |
| `/app/frontend/src/api/transforms/orderTransform.js` | Verify no contract change is required; payload builders should continue consuming the already-computed service charge value from the UI flow. |
| `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` | Confirm existing rule that service charge is not applicable to takeaway/delivery remains preserved. |

## Files / Areas Not To Touch
- takeaway/delivery service-charge gating logic
- socket handlers
- API endpoint constants
- service-charge percentage source from restaurant profile
- print payload structure beyond consuming the toggled value already supplied

## Step-by-Step Implementation Plan

### Step 1
- Change: Update `CollectPaymentPanel` so `serviceChargeEnabled` initializes to OFF instead of ON.
- Files affected:
  - `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- Expected result:
  - Applicable orders no longer start with service charge added automatically.
- Risk:
  - Existing operators may rely on auto-checked behavior, so manual toggle visibility must remain clear.

### Step 2
- Change: Preserve current applicability gate so takeaway and delivery still never show/apply service charge, and existing dine-in / walk-in / room gating remains unchanged.
- Files affected:
  - `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- Expected result:
  - No regression to BUG-013 / BUG-023 behavior.
- Risk:
  - Any accidental change to `scApplicable` would broaden/narrow service-charge order types incorrectly.

### Step 3
- Change: Verify the OFF default propagates consistently into payment submission and manual/auto bill print values only when cashier enables the toggle.
- Files affected:
  - `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
  - Inspect `/app/frontend/src/components/order-entry/OrderEntry.jsx`
  - Inspect `/app/frontend/src/api/transforms/orderTransform.js`
- Expected result:
  - UI total, payment payload, and print payload stay aligned with the checkbox state.
- Risk:
  - If any downstream path assumes service charge is always present for applicable order types, print/payment parity could drift.

## API / Socket Impact
- API changes: No
- Socket changes: No
- Payload changes: No contract change
- Existing payload fields remain the same; only the computed service-charge value entering those fields changes based on the new default-OFF checkbox state.

## State / UI Impact
- State/context changes:
  - Local `serviceChargeEnabled` default state only.
- UI behavior changes:
  - Service Charge section remains visible for applicable orders, but starts unchecked.
- Loading/error/empty state impact:
  - None.
- Existing behavior to preserve:
  - takeaway and delivery remain non-applicable
  - manual enabling remains allowed
  - payment/print values must follow the current checkbox state

## Regression Risk
- Risk area 1: collect-bill totals for dine-in / walk-in / room
- Risk area 2: print payload parity with UI totals
- Risk area 3: prepaid/postpaid payment completion flows

## Validation Plan For Implementation Agent
- Manual test cases:
  - Dine-in order: open Collect Payment and confirm Service Charge section is visible but unchecked by default.
  - Turn checkbox ON and confirm totals update correctly.
  - Walk-in/room applicable flows behave the same as dine-in.
  - Takeaway and delivery still do not apply service charge.
- API payload checks:
  - Confirm `service_tax` / related values remain `0` unless the checkbox is enabled.
- Socket checks:
  - No socket behavior change expected.
- UI checks:
  - Confirm section remains visible and toggleable for applicable orders.
- Regression checks:
  - Manual Print Bill and payment submission continue matching visible totals.

## Docs / Code Mismatch Or Pending Docs
- Does this plan likely require DOC_UPDATES_PENDING.md entry? Yes
- If yes, describe recommended pending doc update.
  - Record that the current approved financial rules preserve service-charge applicability gating (not takeaway/delivery), while the collect-bill UI default is now OFF and operator-controlled per bill.
- Do not directly update final docs.

## Open Questions
- None.

## Safe To Implement?
- Yes

## Approval Gate
Implementation must NOT start until:
1. User explicitly approves this plan.
2. Google Sheet status becomes plan_approved.
