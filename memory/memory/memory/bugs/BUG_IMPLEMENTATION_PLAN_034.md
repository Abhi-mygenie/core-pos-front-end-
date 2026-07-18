# BUG-034 Implementation Plan

## Source
- Intake Bug: /app/memory/BUG_TEMPLATE.md
- Analysis File: /app/memory/bugs/BUG_ANALYSIS_034.md
- Evidence Folder: /app/memory/bugs/attachments/BUG-034/
- Final Docs Folder: /app/memory/final
- Google Sheet Status Before Planning: analysis_done

## Bug Summary
- Same notification appears to trigger sound playback twice at runtime.

## Analysis Verdict
- Frontend runtime bug hypothesis. User clarified this is no longer a “single-tone policy” issue; the likely issue is duplicate sound playback for one notification, which needs runtime-path inspection in frontend notification handling.

## Planning Decision
- Plan Status: Ready
- Reason:
  - User clarified the actual symptom: duplicate sound for the same notification.
  - Current frontend has multiple notification entry paths (`onForegroundMessage`, service-worker forwarded messages, and `processNotification`) that can plausibly double-play a sound.
  - This is now specific enough for a safe frontend implementation plan.
- Safe To Implement Without Clarification: Yes

## Pre-Change Approval Note
- Request Summary: Prevent the same incoming notification from playing sound twice.
- Change Type: frontend runtime fix
- Affected Modules: Notifications & Firebase Module
- Downstream Impacted Modules: Dashboard / POS Workspace Module
- Files Likely To Change:
  - `/app/frontend/src/contexts/NotificationContext.jsx`
  - Possibly `/app/frontend/src/utils/soundManager.js`
- Related APIs:
  - Firebase foreground message handling
  - service-worker forwarded background notification handling
- Payload Impact: No contract change planned.
- Socket Impact: No
- State Impact:
  - notification deduping / last-played tracking may be required in NotificationContext
- UI Impact:
  - notification sound should play once per notification instead of twice
- Regression Risks:
  - foreground/background notification parity
  - silent notification handling
  - notifications list still recording the event only once if dedupe is applied broadly
- Deferred/Open Decision Dependency: None
- Safe To Implement Without Clarification: Yes

## Files To Change
| File | Planned Change | Reason |
| --- | --- | --- |
| `/app/frontend/src/contexts/NotificationContext.jsx` | Add runtime dedupe/guard so the same notification payload does not trigger sound playback twice when processed from overlapping paths. | This file owns notification ingestion and currently plays sound inside `processNotification()`. |
| `/app/frontend/src/utils/soundManager.js` | Only if needed, add defensive duplicate-play protection or replay guard at audio layer without changing sound mappings. | Useful only if NotificationContext-level dedupe is insufficient. |

## Files To Inspect But Not Change
| File | Reason |
| --- | --- |
| `/app/frontend/src/config/firebase.js` | Verify message source shape and whether duplicate frontend subscriptions are likely. |
| `/app/frontend/public/firebase-messaging-sw.js` | Verify service worker forwarding path so duplicate foreground + SW processing can be identified. |
| `/app/frontend/src/components/layout/NotificationTester.jsx` | Ensure any manual testing/demo helper still aligns with notification sound expectations; no behavior change planned here by default. |

## Files / Areas Not To Touch
- sound-key mapping policy unless duplicate root cause requires it
- unrelated notification copy logic
- socket handlers
- backend/Firebase payload structure

## Step-by-Step Implementation Plan

### Step 1
- Change: Trace all notification sound entry points and identify where the same payload can reach `processNotification()` more than once.
- Files affected:
  - `/app/frontend/src/contexts/NotificationContext.jsx`
  - inspect service-worker and firebase setup files
- Expected result:
  - Confirm whether duplicate playback comes from foreground + SW overlap, repeated listener registration, or audio-layer replay.
- Risk:
  - Fixing the wrong layer may hide symptoms without removing the real duplicate path.

### Step 2
- Change: Add NotificationContext-level dedupe so one logical notification only plays sound once within a safe time/window or identity key, while still allowing distinct notifications through.
- Files affected:
  - `/app/frontend/src/contexts/NotificationContext.jsx`
- Expected result:
  - Same notification no longer produces double sound.
- Risk:
  - Over-aggressive dedupe could suppress legitimate rapid notifications.

### Step 3
- Change: If NotificationContext dedupe alone is insufficient, add a narrow audio replay guard in `soundManager` for immediate duplicate same-sound playback caused by the same event.
- Files affected:
  - `/app/frontend/src/utils/soundManager.js`
- Expected result:
  - Defensive protection against repeated same-event audio triggers.
- Risk:
  - Broad audio suppression could hide valid back-to-back events.

## API / Socket Impact
- API changes: No
- Socket changes: No
- Payload changes: No
- No API/socket contract change is planned.

## State / UI Impact
- State/context changes:
  - Possible ephemeral dedupe state/ref in NotificationContext.
- UI behavior changes:
  - Sound plays once per notification instead of twice.
- Loading/error/empty state impact:
  - None expected.
- Existing behavior to preserve:
  - notifications still appear in list/banner
  - distinct notifications still each play their intended sound
  - silent notification path still suppresses sound

## Regression Risk
- Risk area 1: foreground/background notification handling overlap
- Risk area 2: duplicate suppression accidentally blocking valid rapid notifications
- Risk area 3: soundManager replay behavior

## Validation Plan For Implementation Agent
- Manual test cases:
  - Trigger one notification and confirm sound plays once.
  - Trigger two different notifications close together and confirm both still play.
  - Trigger background/SW-forwarded notification and confirm no double playback.
- API payload checks:
  - None
- Socket checks:
  - None
- UI checks:
  - Notification entry still appears in banner/list once per event.
- Regression checks:
  - silent notification still stops/suppresses sound correctly.

## Docs / Code Mismatch Or Pending Docs
- Does this plan likely require DOC_UPDATES_PENDING.md entry? No
- Do not directly update final docs.

## Open Questions
- None.

## Safe To Implement?
- Yes

## Approval Gate
Implementation must NOT start until:
1. User explicitly approves this plan.
2. Google Sheet status becomes plan_approved.
