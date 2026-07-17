# BUG-031 Implementation Plan

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Analysis File: /app/memory/bugs/BUG_ANALYSIS_031.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-031/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Planning: analysis_done

## Bug Summary
- Custom/out-of-menu item is not appearing as an enabled menu item because backend is persisting it as disabled.

## Analysis Verdict
- Backend issue. User clarified current backend creates the menu item disabled when added from out-of-menu flow, and backend should keep it enabled.

## Planning Decision
- Plan Status: Analysis Incomplete
- Reason:
  - Approved fix path is backend-side, not frontend-side.
  - Frontend already posts the add-custom-item request and adds the returned item to the active cart.
  - No safe frontend implementation plan should be created for a backend persistence/state bug.
- Safe To Implement Without Clarification: No

## Pre-Change Approval Note
- Request Summary: Backend should persist out-of-menu created item as enabled instead of disabled.
- Change Type: backend issue
- Affected Modules: Menu / Category / Product Module (backend persistence)
- Downstream Impacted Modules: Order Entry / Cart / Payment Workflow
- Files Likely To Change:
  - No frontend file should be changed for the approved fix path.
- Related APIs:
  - `POST /api/v1/vendoremployee/add-single-product`
- Payload Impact: No frontend payload change planned.
- Socket Impact: No
- State Impact: None planned in frontend.
- UI Impact: None planned in frontend unless backend behavior changes later.
- Regression Risks:
  - frontend should not fake-enable items locally if backend remains authoritative
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
