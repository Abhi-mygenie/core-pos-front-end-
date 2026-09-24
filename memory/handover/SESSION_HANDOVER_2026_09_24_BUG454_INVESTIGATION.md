# SESSION HANDOVER — 2026-09-24 — BUG-454 INVESTIGATION (Role 6) — ROOT CAUSE UPSTREAM · BACKEND BRIEF SENT

## Summary
BUG-454 buzzer-silent investigation revalidated and closed out at the frontend boundary: **FCM push is not reaching the POS browser** — root cause is upstream (backend token storage/targeting, or Firefox push transport). Owner confirmed backend stores **one `fcm_token` per employee, last login overwrites**. Backend brief written and sent (Q1–Q5). Zero code changed. Doc drift from the previous session (report summary, tracker, intake, missing handover, missing brief) fixed.

## What was done
1. Re-read `control/AGENT_PROMPT_ALPHA.md` (v0.7), picked Role 6 INVESTIGATION.
2. Read BUG-453 + BUG-454 investigation reports, intake, registry, tracker; plain-English summary given to owner.
3. Code re-verified at HEAD (read-only):
   - `soundManager.play` called only from `contexts/NotificationContext.jsx:142` (FCM path).
   - `src/api/socket/*` (`socketHandlers.js`, `useSocketEvents.js`, `index.js`) — **zero** `soundManager` / `new Audio(` / `.play(` references; `handleScanNewOrder` only calls `addOrder`.
   - `requestFCMToken` called only from `pages/LoginPage.jsx:56` (never re-checked on boot).
   - `zone_wise_topic` mapped at `authTransform.js:22`, never subscribed client-side.
   - No BUG-454 code markers exist — nothing for BUG-454 has been implemented. Only BUG-453 (mute) shipped in Wave 1.
4. Confirmed owner alignment: socket = pop-up, FCM = buzzer, independent. Owner's "we fixed it and it still doesn't work" = BUG-453 fix (sound doesn't *stop*) was never meant to fix BUG-454 (sound doesn't *start*).
5. Doc audit of previous agent's claim "report and registry corrected": report §11 + registry were updated, but report §1/§6/Handover Summary, `BUG_TRACKER.md`, intake banner were stale; no backend brief; no session handover. All fixed this session.
6. Owner confirmed backend token model → **Model A: one token per employee, most recent wins** (OD-454-04).
7. Created `backend_briefs/BACKEND_BRIEF_BUG-454_2026_09_24.md` (v0.7 template, Q1–Q5, T1/T2, secrets masked). Owner sent Q1–Q5 to backend.

## Decisions recorded
| # | Decision | Verdict |
|---|---|---|
| OD-454-03 | F5 ring buzzer from socket | **WITHDRAWN** — channels independent by design |
| OD-454-04 | Backend token model | **CONFIRMED** one `fcm_token` per employee, last login overwrites |
| OD-454-05 | Multi-device token storage | **PENDING** backend reply Q1 |
| OD-454-01 / 02 | RC-2 scope · FCM `data.type` sample | OPEN, secondary |

## Files updated (docs only, no code)
- `BUG-454_INVESTIGATION_REPORT_2026_09_24_REVALIDATION.md` — §1 FINAL CONCLUSION box, §6 superseded note, §9 moved before §10, §12 Addendum 3 (owner token-model confirmation + code re-verification + OD table), Handover Summary rewritten to final conclusion.
- `backend_briefs/BACKEND_BRIEF_BUG-454_2026_09_24.md` — NEW.
- `control/registry.json` — BUG-454 `artifact_refs.backend_brief` added, notes += Addendum 3. Status unchanged `INVESTIGATED_ROOT_CAUSE_UPSTREAM`.
- `control/BUG_TRACKER.md` — BUG-454 "final RCA" row appended.
- `change_requests/BUG-454_SOUND_AUTOPLAY_BLOCKED_INTERMITTENT_INTAKE.md` — FINAL RCA banner + Next section.
- This handover.

## What's next
1. **Backend reply** → `backend_replies/BE_REPLY_BUG-454_<DATE>.md` (Q1–Q5). Decisive: Q2 send log + FCM return code for order 1232776 / restaurant 506 / 2026-09-24 ≈19:49:11.
2. **Owner T1** — Firebase Console → Cloud Messaging → Send test message → Firefox token. Arrives → backend not sending to this token (BACKEND_BUG). Doesn't arrive → Firefox push transport (ENVIRONMENT).
3. **Owner T2** — `pushManager.getSubscription()` endpoint check in Firefox console.
4. On backend reply: OD-454-05 (multi-device tokens — likely `device_id` in login body) → INTAKE/PLANNING if a frontend contract change is needed.
5. Frontend secondary items → PLANNING Gate 2 on owner GO: F2 stop per-play sound re-download (LOW), F4 Firefox autoplay unlock (Fast Lane eligible), F1 boot-time token re-check + banner (MEDIUM), F3 hosting cache/MIME/rename (devops).
6. Sprint `sep_bug_closure`: owner manual smoke (Gate 6) still pending for BUG-453 / CR-386 / BUG-451 / BUG-452.

## Environment
Frontend compiles (supervisor). No code touched. Preview host: see `frontend/.env` `REACT_APP_BACKEND_URL` (not printed). Credentials: none used.
