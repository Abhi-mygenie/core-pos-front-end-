# BUG-034 Impact Analysis

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-034/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Analysis: intake_created

## User Reported Issue
- Notification tone is inconsistent when placing/serving orders.

## Evidence Reviewed
- Intake entry in `/app/memory/BUG_TEMPLATE.md`
- Evidence folder exists at `/app/memory/bugs/attachments/BUG-034/`
- No local attachment files were present in the evidence folder
- Intake notes also say the linked Drive folder was reachable but empty at intake time

## Module Mapping
- Primary Module: Notifications & Firebase Module
- Downstream Impacted Modules: Realtime Socket Module; Dashboard / POS Workspace Module
- Module decision reference: `/app/memory/final/MODULE_DECISIONS_FINAL.md`

## Affected Route / Page
- Cross-cutting notification/audio behavior in `/dashboard`

## Affected Screen / Flow
- Order placed / order served notification arrives → notification audio plays → tone differs between events or message variants

## Affected Code Areas
| File | Reason |
| --- | --- |
| `/app/frontend/src/contexts/NotificationContext.jsx` | Resolves the notification sound key from payload content or explicit fields. |
| `/app/frontend/src/utils/soundManager.js` | Maps sound keys to actual audio files and playback behavior. |
| `/app/frontend/src/components/layout/NotificationTester.jsx` | Documents the intended frontend sound-key variants used in testing. |
| `/app/frontend/src/components/layout/Sidebar.jsx` | Contains sound enable/disable control that can influence operator perception, though not root cause. |

## API Review
- Endpoints: not primary; notification content/sound payload is the relevant contract.
- Payload builders: upstream notification sender, not visible in this frontend repo.
- Response consumers:
  - `NotificationContext.processNotification()`
- Soft-fail/hard-fail behavior:
  - If payload includes a sound key, frontend uses it directly.
  - If not, frontend infers sound from title/body text.
- API contract risk:
  - High. Inconsistent payload wording or explicit sound keys from upstream can directly produce inconsistent tones.

## Socket / Realtime Review
- Notification sound in reviewed code is not driven by socket handlers directly.
- It is driven by Firebase/service-worker foreground/background message processing.
- Socket risk: Low for the audio symptom itself.

## State / Data Flow
- `NotificationContext` resolves sound by priority:
  1. explicit `data.sound` or `data.notification_sound`
  2. inferred sound from title/body keywords
- `inferSoundFromContent()` intentionally maps different keywords to different sound keys, e.g.:
  - `new order` → `new_order`
  - `served` / `attend` → `attend_table`
  - `bill` / `payment` / `settle` → `settle_bill`
  - `cancelled` → `order_rejected`
- `soundManager.js` then maps each sound key to a different audio file.

## Relevant Final Documentation
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` → Firebase is the canonical notifications platform.
- `/app/memory/final/MODULE_DECISIONS_FINAL.md` → Notifications & Firebase module.

## Current Code Behavior
- Current frontend behavior is intentionally multi-tone, not homogeneous.
- Different event text or sound keys will resolve to different audio files.
- Even when upstream does not send an explicit sound key, `inferSoundFromContent()` still chooses different sounds based on message wording.
- Therefore, inconsistent tone across place vs serve events is fully explainable by current frontend logic.

## Expected Behavior
- Per intake, the notification tone should be consistent/homogeneous across these events.

## Root Cause Hypothesis
- Hypothesis: frontend behavior/policy mismatch.
- Current notification logic explicitly supports multiple distinct sounds for different notification meanings.
- If product now expects one consistent tone for place/serve notifications, then the inconsistency is not random drift; it is the direct result of current frontend mapping rules plus any upstream explicit sound keys.

## Regression Risk Areas
- All notification audio behavior
- Foreground/background parity
- Payload-key vs inferred-text precedence
- Any admin/operator expectations around event-specific urgency sounds

## Docs / Code Mismatch
- None identified in final docs.
- The intake expectation conflicts with current implemented multi-sound behavior, but final docs do not define one canonical single-tone policy.

## Open Questions / Missing Information
- The intake does not clarify whether one tone is desired for all notifications, or only for a subset such as place/serve.
- No sample recordings or raw payload examples were provided.

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
