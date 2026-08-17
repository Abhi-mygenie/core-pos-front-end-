# BUG-030 Implementation Plan

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Analysis File: /app/memory/bugs/BUG_ANALYSIS_030.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-030/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Planning: analysis_done

## Bug Summary
- After item cancellation, kitchen printer does not receive the expected cancelled KOT.

## Analysis Verdict
- Backend-owned behavior. User clarified the backend should generate the cancelled KOT automatically after item cancellation, using the same configuration-driven mechanism already used for cancel-order flow.

## Planning Decision
- Plan Status: Analysis Incomplete
- Reason:
  - This is not safely plannable as a frontend implementation task.
  - User clarified ownership is backend-side.
  - Current frontend already calls `cancel-food-item`; no frontend follow-up KOT path is the approved mechanism.
- Safe To Implement Without Clarification: No

## Pre-Change Approval Note
- Request Summary: Cancelled item should trigger backend-generated cancelled KOT to printer, controlled by backend/profile configuration similar to cancel-order behavior.
- Change Type: backend contract/implementation issue
- Affected Modules: Order Entry / Cart / Payment Workflow (trigger only)
- Downstream Impacted Modules: Printing / Bill / KOT Module
- Files Likely To Change:
  - No frontend file should be changed for the approved fix path.
- Related APIs:
  - `PUT /api/v2/vendoremployee/order/cancel-food-item`
- Payload Impact: No frontend payload change planned.
- Socket Impact: No frontend socket change planned.
- State Impact: None planned in frontend.
- UI Impact: None planned in frontend.
- Regression Risks:
  - frontend should not add a duplicate/manual cancelled-KOT trigger if backend already owns it
- Deferred/Open Decision Dependency: None
- Safe To Implement Without Clarification: No

If Safe To Implement Without Clarification = No:
- Stop the plan here.
- List the exact questions.
- Do not provide implementation steps that assume answers.

## Open Questions
- None for frontend planning.
- This bug should be sent back/handed off as a backend issue for backend analysis and fix planning.

## Safe To Implement?
- No

## Approval Gate
Implementation must NOT start until:
1. User explicitly approves this plan.
2. Google Sheet status becomes plan_approved.
