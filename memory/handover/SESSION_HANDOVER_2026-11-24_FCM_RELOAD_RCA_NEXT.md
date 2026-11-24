# SESSION HANDOVER → NEXT AGENT — 2026-11-24 — FCM reload buzzer (CR-562 / BUG-747 / NEW RCA)

**Branch:** notification-fix · **Client:** The Goan Kitchen (rid 69) · **Test acct:** pms@macha.com / Qplazm@10
**Read first:** `memory/investigations/INV-FCM-RELOAD-NO-SUBSCRIPTION-20261123.md` (full RCA + fix direction),
`memory/plans/CR-562-FU_BUG-747_IMPLEMENTATION_PLAN.md`, `memory/control/AGENT_PROMPT_ALPHA.md` (role workflow).

## TL;DR of where we are
Operator problem: **order buzzer does NOT ring after a browser reload** (rings only right after a fresh login).
Two rounds done; the real root cause is now identified but **the real fix is NOT yet implemented.**

### Round 1 — SHIPPED & in this branch (CR-562 re-open + BUG-747), verified by unit tests + preview smoke
- `config/firebase.js` — `whenMessagingReady` promise (settles in `.finally`); `requestFCMToken` +
  `onForegroundMessage` (now async) await it.
- `contexts/NotificationContext.jsx` — foreground listener now re-attaches async-safely on reload (fixes a race);
  NEW ungated effect for autoplay unlock (gesture + visibilitychange) + renders `<SoundUnlockBanner/>`.
- `utils/soundManager.js` — `setBlockedHandler` observer. NEW `components/notifications/SoundUnlockBanner.jsx`.
- Tests: `__tests__/config/firebase.cr562race.test.js`, `__tests__/utils/soundManager.bug747.test.js` (4/4 PASS).
- registry.json / CR_REGISTRY / BUG_TRACKER / FILE_OWNERSHIP updated; CR-562 + BUG-747 = IMPLEMENTED.
- **These fixes are necessary but NOT sufficient** — they make the listener attach + audio unlock, but don't make
  the device RECEIVE a push after reload.

### Round 2 — NEW RCA (owner-supplied production logs + code trace) — THE REAL BREAK, NOT yet fixed
Backend logs for order 1579106/rid69 show the backend IS sending the buzzer, but:
- **Only employee 5843 "poki owner" has `has_firebase_token:true`; the other 5 employees (incl. 5840 "macha owner",
  likely the watching device) have `has_firebase_token:false`.** Push is dispatched only to 5843; `fcm_accepted` but
  `delivery_confirmed:false`.
- **BREAK-1 (PRIMARY — token registration):** the watching device never registers an FCM token with the backend.
  Token reaches backend only via (a) login payload `fcmToken` (set only if permission granted at login) or (b)
  reload profile GET `?fcm_token=` — which fires only if `Notification.permission==='granted'` AND `requestFCMToken()`
  wins a **3s `Promise.race`** (`LoadingPage.jsx:371-377`). On a cold reload SW+getToken usually take >3s → token is
  discarded → backend never refreshed; the late token is written to `localStorage` but **never sent to backend**.
- **BREAK-2 (SECONDARY):** foreground `onMessage` needs an in-session `getToken`; 5843's stored token is likely stale.

## NEXT STEPS (do this)
Role = PLANNING → IMPLEMENTATION (owner is urgent; FCM must stay the ring source — socket-ring fallback is OUT).
Frontend-only fix (reuses the existing backend GET upsert — likely NO `firebase.js` edit needed):
1. **Decouple token registration from the 3s boot race:** when `requestFCMToken()` resolves (even after the boot
   barrier), if a token exists and differs from last-sent, POST it to the backend (reuse
   `profileService.getProfile(token)` upsert or add a dedicated refresh call). Never silently drop a resolved token.
2. **"Process like login" on every authenticated boot:** run the full bring-up and register the current device's
   token for the current employee; if permission is `default`, drive the BUG-747 "enable alerts" banner (one tap →
   prompt → register) instead of skipping. This also establishes the in-session `getToken` subscription (fixes BREAK-2).
3. Verify with owner on a real device: after reload, confirm `has_firebase_token:true` for the logged-in employee in
   backend logs and that the buzzer rings on a real inbound order.
Governance: `firebase.js` is under OD-AUDIT-02 (no edit without owner Gate 4 GO) — the proposed fix likely avoids it
(changes land in LoadingPage/NotificationContext + a token-send helper). Confirm scope at Gate 2.

## Env / running
Frontend runs via supervisor (`yarn start`/craco, 0.0.0.0:3000) against REAL preprod backend
(`REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`). Secret keys (Firebase API/VAPID, CRM, Maps) are set in
`frontend/.env` (gitignored). QA is on LIVE data — read-only smoke; coordinate for real test orders.
