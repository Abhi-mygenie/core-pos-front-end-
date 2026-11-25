# BACKEND_BRIEF_BUG-749_2026-11-24

**Owner directive (2026-11-24):** Build a **dedicated device-token registration endpoint** (OD-749-02). The POS
will call it on **every authenticated boot/reload** (and after `login-as-restaurant`) to (re)register the current
device's FCM token, so the backend always holds a live token for the logged-in employee. This is the fix for
devices that show `has_firebase_token:false` after a reload. We will plan the frontend (Gate 2/3) against your
reply to this brief.

## Summary
- **Issue:** After a browser **reload** (no relogin), the watched device's FCM token is never (re)registered with
  the backend, so the backend has **no token** for that employee and can never push the order buzzer to it. The
  order still arrives on Socket.IO and renders, but no FCM payload is delivered → no ring until relogin.
- **Backend-side root cause:** the device token is captured **only at login** (`fcm_token` in the login payload)
  or via the CR-562 profile-GET upsert, which on a cold reload is skipped (permission gate) or dropped (a 3s
  client race). There is **no dedicated path** for the client to register the current token at any time.
- **Classification:** CONTRACT_MISMATCH (new backend endpoint required).
- **Frontend impact:** Missed order buzzers after reload → operators miss orders. Pairs with CR-562 (messaging
  race, shipped) and BUG-747 (autoplay, shipped); this item closes the **token-registration** gap.
- **Priority/Risk:** **P0** · **HIGH** (device-token persistence + push targeting).

## Evidence
- **Backend logs (owner-supplied), order 1579106 / rid 69:** `RECIPIENTS_RESOLVED` lists 6 employees; only 5843
  "poki owner" has `has_firebase_token:true`. The watched device (`pms@macha.com`, employee **5840** "macha
  owner") has `has_firebase_token:false`. `FIREBASE_DISPATCH_RESULT` dispatched only to 5843 → `fcm_accepted`,
  `delivery_confirmed:false`. Quoted in `investigations/INV-FCM-RELOAD-NO-SUBSCRIPTION-20261123.md` §8.
- **Screenshot:** `evidence/BUG-747/BUG-747_reload_no_fcm_socket_only_2026-11-23.png` (post-reload order on socket
  only, no FCM `received`).

## Requested Endpoint (please confirm / adjust)
- **Method:** `POST`
- **Proposed URL:** `/api/v1/vendoremployee/device-token`  *(confirm exact path/version)*
- **Auth/context:** employee bearer `AUTH_TOKEN` (post `login-as-restaurant` for admin/CS; normal employee token
  otherwise). The authenticated token identifies the employee + restaurant — the client does **not** send
  employee/restaurant ids.
- **Request body:**
  ```json
  { "fcm_token": "<current Firebase device token>" }
  ```
- **Behavior:** **upsert** the token into the **same store/column the login payload populates**
  (`vendor_employees.firebase_token` per the CR-562-confirmed contract); one token per employee, last-write-wins
  (unless D3 says otherwise). Return a small confirmation.
- **Proposed response:**
  ```json
  { "status": "ok", "fcm_token": "<stored token>" }
  ```

## Call pattern the FE will use (so you can size it)
- Fired on **every authenticated boot/reload** when a device token is available — **including after
  `login-as-restaurant`** (OD-749-05). Per owner decision **OD-749-04 there is NO client-side dedupe** — the FE
  will send the current token on every reload even if unchanged, so the endpoint must be **cheap + idempotent**.
- NOT called when notification permission is denied/`default` or messaging is unsupported (no token to send; the
  FE shows a one-tap "Enable alerts" banner in the `default` case — OD-749-03).

## Backend decisions we need (to write the FE plan)
- **D1 — Path/method:** confirm `POST /api/v1/vendoremployee/device-token` (name/version) and bearer auth.
- **D2 — Same store as login:** confirm the upsert writes the **same record/column** the login `fcm_token`
  populates, so one device/employee has one authoritative token (no split source of truth).
- **D3 — Multi-device:** single token per employee (last-write-wins) or a **set** of device tokens? If single, a
  reload on device B overwrites device A — acceptable, or should it be keyed per device?
- **D4 — Scope/targeting:** token keyed per **employee**, per **restaurant**, or **employee+restaurant**? (The
  logs resolve recipients per employee — confirm so pushes target the right row.)
- **D5 — Idempotency/rate:** confirm re-sending the same token on every reload is a safe no-op update (OD-749-04 =
  no client dedupe). Any rate limit we should respect?
- **D6 — Response:** exact success shape + whether you echo the stored token back (useful for FE drift logging).
- **D7 — Relation to logout/deregister:** `LOGOUT` (`/api/v2/vendoremployee/employee-logout`) already does "FCM
  deregister". Confirm this register endpoint is its counterpart and does not conflict (e.g., does logout clear
  the same column this endpoint writes?).
- **D8 — (optional) last-seen:** maintain `fcm_token_updated_at` / last-seen timestamp?

## Frontend Workaround
- **Available:** NO reliable one — only a full **relogin** re-registers a token (via the login payload), which is
  not an acceptable operator fix.

## Planned frontend work (pending your reply — NOT yet planned past intake, no gate entered)
- On every authenticated boot/reload, run the login-style FCM bring-up (SW register + `getToken`) when permission
  is `granted`; `default` → one-tap "Enable alerts" banner (OD-749-03); then **POST the current token** to this
  endpoint (OD-749-02), including after `login-as-restaurant` (OD-749-05), with no client dedupe (OD-749-04).
- Files (FE): `LoadingPage.jsx`, `NotificationContext.jsx`, `SoundUnlockBanner.jsx`, a small token-send service.
  `config/firebase.js` NOT touched.

---
**BUG-749** · Assignee FE **Abhishek** · Backend **Gyan** · Sprint nov_cr_batch · Client The Goan Kitchen (rid 69).
Related: **CR-562** (profile-GET token refresh + messaging race, shipped), **BUG-747** (autoplay re-unlock,
shipped), **BUG-748** (messaging-init race IA, folded into CR-562). Intake:
`change_requests/BUG-749_FCM_TOKEN_NOT_REGISTERED_AFTER_RELOAD_INTAKE.md`.
