# BUG-033 Impact Analysis

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-033/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Analysis: intake_created

## User Reported Issue
- When an order is cancelled, the notification says "order updated" instead of "order cancelled".

## Evidence Reviewed
- Intake entry in `/app/memory/BUG_TEMPLATE.md`
- Evidence folder exists at `/app/memory/bugs/attachments/BUG-033/`
- No local attachment files were present in the evidence folder
- Intake notes also say the linked Drive folder was reachable but empty at intake time

## Module Mapping
- Primary Module: Notifications & Firebase Module
- Downstream Impacted Modules: Realtime Socket Module; Dashboard / POS Workspace Module; Order Entry / Cart / Payment Workflow
- Module decision reference: `/app/memory/final/MODULE_DECISIONS_FINAL.md`

## Affected Route / Page
- Cross-cutting notification surface in `/dashboard`

## Affected Screen / Flow
- Cancel order → notification received/shown in frontend → wrong cancellation message label

## Affected Code Areas
| File | Reason |
| --- | --- |
| `/app/frontend/src/contexts/NotificationContext.jsx` | Central notification ingestion logic; resolves title/body/sound from payload and inferred content. |
| `/app/frontend/src/utils/soundManager.js` | Downstream notification sound mapping, if wrong event typing also affects tone. |
| `/app/frontend/src/api/socket/socketHandlers.js` | Relevant because a wrongly named socket/update event can coexist with wrong notification wording. |
| `/app/frontend/src/pages/DashboardPage.jsx` | Hosts the notification banner surface. |
| `/app/frontend/src/components/layout/NotificationBanner.jsx` | Candidate UI display surface for notification text. |

## API Review
- Endpoints: not primary; this appears to be notification payload/event labeling.
- Payload builders: not a standard HTTP payload-builder issue in reviewed frontend code.
- Response consumers:
  - `NotificationContext.processNotification()`
- Soft-fail/hard-fail behavior:
  - Frontend shows whatever notification title/body/payload it receives or infers.
- API contract risk:
  - Medium to high, because the wrong message may originate upstream in Firebase/server payload rather than inside frontend text composition.

## Socket / Realtime Review
- Socket events are relevant contextually because cancellation state changes are socket-driven elsewhere.
- However, notification display in reviewed code is Firebase/notification-payload based, not built from socket handler text locally.
- If upstream sends a generic "updated" notification for cancel actions, frontend will show it.
- Socket risk: Medium, but the direct display issue likely sits in notification payload semantics.

## State / Data Flow
- `NotificationContext.processNotification()` reads `payload.notification` and `payload.data`.
- Title/body are taken directly from payload fields when present.
- If no explicit sound key exists, sound is inferred from content.
- There is no reviewed code that rewrites "order updated" into "order cancelled" based on cancellation semantics.

## Relevant Final Documentation
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` → Firebase is the canonical notifications platform.
- `/app/memory/final/MODULE_DECISIONS_FINAL.md` → Notifications & Firebase module + Realtime Socket module.

## Current Code Behavior
- `NotificationContext` trusts incoming notification title/body from payload data.
- It only infers sound from text content; it does not remap a generic update message into a cancellation-specific label.
- Therefore, if upstream payload says "order updated", frontend will display that text as-is.

## Expected Behavior
- Cancellation notifications should explicitly say the order was cancelled.

## Root Cause Hypothesis
- Hypothesis: notification payload/event-type mismatch, most likely upstream of the frontend display layer.
- Current frontend notification code does not generate the wrong phrase by itself; it primarily passes through payload content.
- So the likeliest cause is that the backend/Firebase notification for order cancellation is being emitted with a generic update title/body, and the frontend is faithfully rendering it.

## Regression Risk Areas
- All notification copy for order lifecycle events
- Sound inference, since content keywords also drive sound selection
- Any future fix that tries to rewrite payload text locally could drift from canonical notification contract

## Docs / Code Mismatch
- None identified.

## Open Questions / Missing Information
- No screenshot or raw notification payload was provided.
- The intake does not confirm whether this was a Firebase push notification, in-app banner, or another notification surface.

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
