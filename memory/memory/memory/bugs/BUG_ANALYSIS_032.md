# BUG-032 Impact Analysis

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-032/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Analysis: intake_created

## User Reported Issue
- The UI is displaying the back-end order ID instead of the restaurant-facing order ID.

## Evidence Reviewed
- Intake entry in `/app/memory/BUG_TEMPLATE.md`
- Evidence folder exists at `/app/memory/bugs/attachments/BUG-032/`
- No local attachment files were present in the evidence folder
- Intake notes also say the linked Drive folder was reachable but empty at intake time

## Module Mapping
- Primary Module: Dashboard / POS Workspace Module
- Downstream Impacted Modules: Order Entry / Cart / Payment Workflow; Reporting display conventions
- Module decision reference: `/app/memory/final/MODULE_DECISIONS_FINAL.md`

## Affected Route / Page
- Exact page not confirmed by evidence
- Most likely `/dashboard` card/list/order-entry surfaces

## Affected Screen / Flow
- Staff views an order identifier on-screen and sees backend/internal ID instead of restaurant order ID
- Exact component remains unconfirmed from evidence

## Affected Code Areas
| File | Reason |
| --- | --- |
| `/app/frontend/src/api/transforms/orderTransform.js` | Correctly maps `restaurant_order_id` into frontend `orderNumber`, so this is the main source-of-truth transform to compare against UI usage. |
| `/app/frontend/src/pages/DashboardPage.jsx` | Passes `orderNumber` through many dashboard table/order entry objects. |
| `/app/frontend/src/components/cards/OrderCard.jsx` | Uses `orderId` internally in actions/toasts; candidate display surface if wrong field is rendered somewhere nearby. |
| `/app/frontend/src/components/cards/TableCard.jsx` | Candidate dashboard display surface. |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Contains a hardcoded header display `#D-108219`, indicating potential ID-display drift in collect-bill screen. |

## API Review
- Endpoints: not the core issue; this is primarily a display-field selection problem.
- Payload builders: not applicable.
- Response consumers:
  - `fromAPI.order()` maps `api.id` to `orderId`
  - `fromAPI.order()` maps `api.restaurant_order_id` to `orderNumber`
- Soft-fail/hard-fail behavior:
  - Not a failure path; display mapping issue.
- API contract risk:
  - Low if the transform already carries the correct fields.

## Socket / Realtime Review
- Socket events deliver order payloads that are transformed by `fromAPI.order()`.
- Since `fromAPI.order()` preserves both `orderId` and `orderNumber`, realtime is unlikely to be the root problem unless a specific UI surface is reading the wrong field.
- Socket risk: Low.

## State / Data Flow
- Canonical transformed order shape contains:
  - `orderId` = backend/internal numeric id
  - `orderNumber` = `restaurant_order_id`
- That means downstream UI has enough data to show restaurant order ID if it chooses the right field.

## Relevant Final Documentation
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- No finalized doc conflict was found about order-id display policy.

## Current Code Behavior
- `orderTransform.fromAPI.order()` clearly maps `restaurant_order_id` to `orderNumber` and backend `id` to `orderId`.
- Many dashboard builders in `DashboardPage.jsx` carry `orderNumber` forward.
- `CollectPaymentPanel.jsx` currently shows a hardcoded header value `#D-108219`, which is already a display mismatch candidate unrelated to live transformed data.
- Card action toasts and print calls still reference backend `orderId`, but those are operational references, not necessarily the staff-facing display label described by the bug.

## Expected Behavior
- Staff-facing UI should display the restaurant order ID (`restaurant_order_id` / `orderNumber`) rather than backend internal `id`.

## Root Cause Hypothesis
- Hypothesis: frontend display-field selection issue.
- Current transform already exposes both IDs correctly, so the likely problem is one or more UI surfaces rendering `orderId`, a hardcoded value, or another non-restaurant-facing identifier instead of `orderNumber`.
- The strongest visible candidate from current code review is `CollectPaymentPanel`'s hardcoded header ID value, though the intake does not specify the exact screen.

## Regression Risk Areas
- Dashboard order cards/table cards
- Collect Payment / bill screens
- Any toasts, headers, or print-related labels that intentionally still use backend `orderId`
- Search/filter flows that may rely on `orderNumber`

## Docs / Code Mismatch
- Potential code/UI mismatch: `CollectPaymentPanel` uses a hardcoded visible ID token instead of clearly using live order data.
- A later implementation/QA/docs agent may need to update `/app/memory/final/DOC_UPDATES_PENDING.md` if this is confirmed as intended display policy drift.

## Open Questions / Missing Information
- The intake does not identify the exact screen/component where the wrong ID is shown.
- No screenshot was provided to confirm whether the observed wrong ID was `orderId`, a hardcoded token, or another field.

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
