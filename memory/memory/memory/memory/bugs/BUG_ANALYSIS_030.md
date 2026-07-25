# BUG-030 Impact Analysis

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-030/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Analysis: intake_created

## User Reported Issue
- After cancelling an item, the expected cancelled KOT is not received at the kitchen/station.

## Evidence Reviewed
- Intake entry in `/app/memory/BUG_TEMPLATE.md`
- Evidence folder exists at `/app/memory/bugs/attachments/BUG-030/`
- No local attachment files were present in the evidence folder
- Intake notes also say the linked Drive folder was reachable but empty at intake time

## Module Mapping
- Primary Module: Order Entry / Cart / Payment Workflow
- Downstream Impacted Modules: Printing / Bill / KOT Module; Station / Kitchen Panel Module; Realtime Socket Module
- Module decision reference: `/app/memory/final/MODULE_DECISIONS_FINAL.md`

## Affected Route / Page
- Embedded workflow inside `/dashboard`

## Affected Screen / Flow
- Dashboard / Order Entry → cancel item flow → cancel-item API → downstream kitchen/KOT cancellation notification/print expectation

## Affected Code Areas
| File | Reason |
| --- | --- |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Owns item-cancel action and calls the cancel-item API. |
| `/app/frontend/src/api/transforms/orderTransform.js` | Builds cancel-item payload. |
| `/app/frontend/src/api/constants.js` | Defines cancel-item endpoint only; no separate cancelled-KOT endpoint is evident. |
| `/app/frontend/src/api/services/orderService.js` | Hosts print flows, but there is no explicit cancelled-KOT print path here. |
| `/app/frontend/src/api/socket/socketHandlers.js` | Cancels update runtime order state, but no kitchen-cancel print/event handling is evident in reviewed frontend socket handlers. |
| `/app/frontend/src/api/services/stationService.js` | Relevant downstream kitchen surface if the station UI is expected to reflect cancellation. |

## API Review
- Endpoints:
  - `PUT /api/v2/vendoremployee/order/cancel-food-item`
  - existing print endpoint `POST /api/v1/vendoremployee/order-temp-store` for manual KOT/Bill
- Payload builders:
  - `toAPI.cancelItem()`
- Response consumers:
  - `OrderEntry.handleCancelFood()`
  - socket follow-up updates order context afterward
- Soft-fail/hard-fail behavior:
  - cancel-item is a normal API success/failure path; no explicit chained print call exists in the reviewed frontend code.
- API contract risk:
  - High. If cancelled KOT emission is a backend-side side effect of `cancel-food-item`, this may be a backend / contract issue.
  - Medium if frontend is expected to call a print endpoint explicitly, because no such path is currently visible.

## Socket / Realtime Review
- Socket events:
  - order update / engage events after cancellation
- State sync behavior:
  - cancelled item/order state is reflected through order/socket flows
  - no reviewed socket handler appears to dispatch a distinct cancelled-KOT print action
- Socket risk:
  - Medium, but the stronger gap is absence of a visible frontend cancelled-KOT trigger.

## State / Data Flow
- Item cancellation begins in `OrderEntry.handleCancelFood()`.
- That path sends cancel payload and waits for order-engage/socket refresh.
- Local/frontend flow then closes the order screen.
- I did not find a frontend state branch that marks "cancelled KOT pending" or calls `printOrder(..., 'kot', ...)` as a follow-up to item cancellation.

## Relevant Final Documentation
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
- No final doc was found that documents a dedicated cancelled-KOT frontend trigger path.

## Current Code Behavior
- `OrderEntry.handleCancelFood()` only builds a cancel payload and calls `API_ENDPOINTS.CANCEL_ITEM`.
- The reviewed frontend print surface (`orderService.printOrder`) is used for KOT/Bill printing, but I found no code path that invokes it automatically after item cancellation.
- Socket handlers focus on order/table runtime updates and do not show a separate cancelled-KOT emission path.
- This means the current frontend visibly supports item cancellation state sync, but not an explicit cancellation-KOT dispatch path in the reviewed code.

## Expected Behavior
- Per intake, cancelling an item should result in a cancelled KOT being received by the kitchen/station.

## Root Cause Hypothesis
- Hypothesis: likely backend or missing-contract issue, with frontend absence as contributing evidence.
- The current frontend cancellation flow does not appear to trigger any explicit cancelled-KOT print/send action after `cancel-food-item` succeeds.
- If the business contract expects backend auto-generation of cancellation KOT from the cancel API, then the likely failure is backend-side.
- If the contract expects the frontend to issue a follow-up print/KOT call, that frontend path is currently missing from the reviewed implementation.

## Regression Risk Areas
- Item cancellation flow
- Kitchen/station notification expectations
- KOT printing semantics
- Socket timing after cancel
- Distinguishing item cancel from order cancel

## Docs / Code Mismatch
- None identified in final docs.
- There is, however, no explicit code-backed evidence of a frontend cancelled-KOT path in the reviewed files.

## Open Questions / Missing Information
- Is cancelled KOT supposed to be emitted by backend automatically after `cancel-food-item`, or by a separate frontend print call?
- Which kitchen surface was expected: printer, station panel, or another downstream system?
- No evidence file was available to distinguish "event not sent" vs "event sent but not displayed/printed".

## User Interaction Required
- Not required.

## Analysis Verdict
- Unclear

## Analysis Outcome
- Analysis Complete

## Ready For Next Stage?
- Yes

## Next Step
- If Analysis Outcome is Analysis Complete or Analysis Complete after user clarification:
  Next stage may continue based on status = analysis_done.
