# BUG-028 Impact Analysis

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-028/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Analysis: intake_created

## User Reported Issue
- While collecting bill on the POS, service charge is being added even when the reporter says the "auto service charge" control/config is off.

## Evidence Reviewed
- Intake entry in `/app/memory/BUG_TEMPLATE.md`
- Evidence folder exists at `/app/memory/bugs/attachments/BUG-028/`
- No local attachment files were present in the evidence folder
- Intake notes also say the linked Drive folder was reachable but empty at intake time

## Module Mapping
- Primary Module: Order Entry / Cart / Payment Workflow
- Downstream Impacted Modules: Printing / Bill / KOT Module; Dashboard / POS Workspace Module
- Module decision reference: `/app/memory/final/MODULE_DECISIONS_FINAL.md` → Order Entry / Cart / Payment Workflow, Printing / Bill / KOT Module

## Affected Route / Page
- Embedded workflow inside `/dashboard`

## Affected Screen / Flow
- Dashboard → Order Card / Table Card → Order Entry → Collect Payment / Checkout → Bill Summary / Adjustments service-charge control

## Affected Code Areas
| File | Reason |
| --- | --- |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Owns collect-bill settlement math, service-charge applicability, and the local `serviceChargeEnabled` toggle default/value. |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Hosts the Collect Payment panel and passes order type / placed-order context into settlement flow. |
| `/app/frontend/src/api/transforms/orderTransform.js` | Mirrors service-charge logic into payload builders and bill-print payload fallback paths. |
| `/app/frontend/src/components/cards/OrderCard.jsx` | Can trigger bill/settle flows from dashboard cards, so any perceived auto-added charge may be observed downstream from this entry point. |
| `/app/frontend/src/components/cards/TableCard.jsx` | Same risk surface as OrderCard for table/grid mode. |

## API Review
- Endpoints:
  - `POST /api/v2/vendoremployee/order/order-bill-payment`
  - `POST /api/v1/vendoremployee/order-temp-store`
  - `POST /api/v2/vendoremployee/order/place-order` (prepaid path if the report actually came from Place+Pay)
- Payload builders:
  - `toAPI.collectBillExisting`
  - `toAPI.placeOrderWithPayment`
  - `toAPI.buildBillPrintPayload`
- Response consumers:
  - `OrderEntry.onPaymentComplete`
  - dashboard card settle / bill actions
- Soft-fail/hard-fail behavior:
  - This appears to be a frontend-calculation / default-state issue, not an HTTP failure path.
- API contract risk:
  - If the issue is only the default UI toggle state, API contract risk is low.
  - If the reporter meant a restaurant/profile-level configuration instead of the per-bill toggle, contract risk is medium because profile-driven feature gating may be involved.

## Socket / Realtime Review
- Socket events: None required to produce the initial service-charge row on the collect-bill screen.
- State sync behavior: Socket refresh may hydrate order data later, but current service-charge math is local to the payment panel.
- Socket risk: Low for the reported symptom.

## State / Data Flow
- `CollectPaymentPanel.jsx` owns local `serviceChargeEnabled` state.
- Current implementation initializes `serviceChargeEnabled` to `true` unconditionally.
- Effective charge then depends on three factors in code:
  - `restaurant?.features?.serviceCharge`
  - `restaurant?.serviceChargePercentage`
  - `scApplicable` (`dineIn`, `walkIn`, or room)
- No code evidence was found for a separate persisted "auto service charge off" value being read into the collect-bill panel.

## Relevant Final Documentation
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
- No final doc was found that defines a distinct persisted "auto service charge" configuration contract for the collect-bill default toggle state.

## Current Code Behavior
- `CollectPaymentPanel.jsx` sets `const [serviceChargeEnabled, setServiceChargeEnabled] = useState(true);`.
- Service charge is computed when `scApplicable && serviceChargeEnabled && serviceChargePercentage > 0`.
- This means the collect-bill screen defaults the per-order toggle to ON whenever service charge is enabled in restaurant profile and the order type is eligible.
- Existing code already prevents service charge for takeaway/delivery in the main collect-bill path via `scApplicable = orderType === 'dineIn' || orderType === 'walkIn' || isRoom`.
- I did not find code in the reviewed files that hydrates `serviceChargeEnabled` from restaurant settings/localStorage/profile config.

## Expected Behavior
- Per intake, if the relevant "auto service charge" control is off, service charge should not be added by default during bill collection.

## Root Cause Hypothesis
- Hypothesis: frontend default-state issue.
- The most likely cause is that `CollectPaymentPanel` hardcodes the per-bill service-charge toggle to `true`, so the bill always starts with service charge enabled for eligible order types, regardless of the operator expectation described in the intake.
- A secondary ambiguity remains: the intake wording may refer to a different configuration surface than the in-panel toggle. If so, the problem could also be a config-to-UI state mapping gap rather than just a bad default.

## Regression Risk Areas
- Service-charge behavior across dine-in, walk-in, and room flows
- Parity between collect-bill math and print payloads
- Prepaid vs postpaid settlement flows
- Any logic already fixed by BUG-006, BUG-013, and BUG-023

## Docs / Code Mismatch
- None identified in final docs.
- However, the intake expectation suggests a config-driven default that is not evident in current code.
- If product confirms such a config exists, a later implementation/QA/docs agent may need to update `/app/memory/final/DOC_UPDATES_PENDING.md`.

## Open Questions / Missing Information
- Which exact control did the reporter mean by "auto service charge off"?
  - restaurant feature flag
  - restaurant percentage/config
  - in-panel checkbox/toggle
  - another admin setting
- Which order type reproduced the issue?
- Was this observed before payment on Collect Payment screen, or only in printed bill / saved payment outcome?

## User Interaction Required
- Not required.

## Analysis Verdict
- Frontend bug

## Analysis Outcome
- Analysis Complete

## Ready For Next Stage?
- Yes

## Next Step
- If Analysis Outcome is Analysis Complete or Analysis Complete after user clarification:
  Next stage may continue based on status = analysis_done.
