# BUG-033 Implementation Plan

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Analysis File: /app/memory/bugs/BUG_ANALYSIS_033.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-033/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Planning: analysis_done

## Bug Summary
- Cancellation notification says “Order Updated” instead of a cancellation-specific message.

## Analysis Verdict
- Backend bug. User clarified this should be checked/fixed from backend.

## Planning Decision
- Plan Status: Analysis Incomplete
- Reason:
  - Approved ownership is backend/Firebase payload generation, not frontend display logic.
  - Frontend should not invent a local rewrite policy for canonical notification copy when backend is expected to send the correct event text.
- Safe To Implement Without Clarification: No

## Pre-Change Approval Note
- Request Summary: Backend/Firebase notification payload for cancellation should send cancellation-specific copy instead of generic update wording.
- Change Type: backend notification contract issue
- Affected Modules: Notifications & Firebase Module
- Downstream Impacted Modules: Dashboard / POS Workspace Module
- Files Likely To Change:
  - No frontend file should be changed for the approved fix path.
- Related APIs:
  - Upstream notification payload generation (backend/Firebase side)
- Payload Impact: Backend notification payload content
- Socket Impact: No frontend socket change planned.
- State Impact: None planned in frontend.
- UI Impact: Frontend should simply render corrected upstream copy.
- Regression Risks:
  - frontend should not introduce hardcoded copy rewrites that diverge from backend notification contract
- Deferred/Open Decision Dependency: Firebase remains canonical notifications platform.
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
