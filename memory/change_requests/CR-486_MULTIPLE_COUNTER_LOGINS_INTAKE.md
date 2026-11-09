# CR-486 — Multiple counter logins — two users operating simultaneously at the same counter

**ID:** CR-486  **Type:** CR  **Registered:** 2026-11-04  **Sprint:** nov_cr_batch
**Severity:** P1 (owner: "all p1")  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE — TRACKING ONLY (other team)
**Area:** Permissions / Security
**Source:** OWNER-REPORTED (chat, 2026-11-04)  **Related:** BUG-454

## Description
Allow two different user logins to operate simultaneously at the same counter. Owner: handled by a different team — register for tracking only.

## Expected Behaviour
TBD by owning team.

## Evidence
- Screenshot: not provided
- Steps to reproduce: n/a (feature request)
- Curl output: not applicable at intake
- Source: OWNER-REPORTED
- Confidence: REPORTED

## Duplicate Check
RELATED to BUG-454

## Code Reality
NONE

## Risk
- Risk: HIGH
- Reason: Auth/session, sockets, FCM token per employee
- Fast Lane eligible: NO

## Blast Radius
UNKNOWN (auth, sockets, notifications; backend-owned)

## Open Owner Decisions
- OD-486-01 Model: same device switch-user vs two devices both active — deferred to owning team
- Note: BUG-454 — backend keeps one fcm_token per employee (last login overwrites)

## Next
Planning Gate 2 (Impact Analysis) once ODs are answered.

## Owner (2026-11-05)
- OD-486-01 owner: will answer during Impact Analysis (Gate 2).

## (2026-11-05) INTAKE FROZEN as TRACKING — OD-486-01 answered at Gate 2.
