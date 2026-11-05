# BACKEND_BRIEF_BUG-454_2026_09_24

**Item:** BUG-454 — Notification buzzer silent: FCM push not delivered to POS browser
**Sprint:** `sep_bug_closure` · **Registry status:** `INVESTIGATED_ROOT_CAUSE_UPSTREAM`
**Source report:** `memory/BUG-454_INVESTIGATION_REPORT_2026_09_24_REVALIDATION.md` §11 (Addendum 2) + Addendum 3
**Template:** ALPHA v0.7 BACKEND HANDOFF TEMPLATE
**Secrets:** all tokens/passwords masked as `***` (R20)

---

## Summary
- **Issue:** For Scan & Order **1232776** (restaurant **506**, 2026-09-24 ≈ **19:49:11 local**) the socket `scan-new-order` event reached the POS browser instantly and drew the order pop-up, but **no FCM push reached the same browser** → buzzer silent.
- **Classification:** `BACKEND_BUG` (token storage/targeting — primary) · alternate `CONFIG_ISSUE` (push transport) pending owner test T1.
- **Frontend impact:** Buzzer is triggered **only** by FCM (`NotificationContext.processNotification → soundManager.play`, grep-verified — `src/api/socket/*` contains zero audio calls). Socket draws the pop-up only (owner-confirmed design, channels independent). **No FCM = no ring.** Staff see the order, hear nothing.
- **Priority/Risk:** **P1 / HIGH** — core order-alert flow, no frontend workaround (F5 "ring from socket" withdrawn by owner 2026-09-24).

### Owner-confirmed backend behaviour (2026-09-24)
> Backend stores **one `fcm_token` per employee — the most recent login overwrites it.**

Consequences:
1. Any later login of the same account on another browser/device **silently orphans** the earlier browser (socket keeps working, FCM never arrives). This explains the recurring "buzzer never rings on this machine" reports for shared accounts (e.g. `saurav (super owner)` used across Firefox / Chrome / UAT / phone).
2. Any `employee-logout` on another device deregisters "the employee's" token → same silent orphaning.
3. It does **not** by itself explain the reproduction below: Firefox performed a **fresh login** immediately before the order, so its token should have been the most recent. Questions 2 and 4 remain decisive for that case.

---

## Endpoint
| Method | URL | Role in the chain |
|---|---|---|
| POST | `/api/v1/auth/vendoremployee/login` | Frontend sends `fcm_token` in the request body (`src/api/transforms/authTransform.js:51`). Response echoes `firebase_token` and `zone_wise_topic` (`authTransform.js:20,22`). |
| POST | `/api/v2/vendoremployee/employee-logout` | CR-124 — server-side token invalidation + FCM deregister (`src/api/constants.js:9`). |
| — | Backend → Firebase Cloud Messaging send | Not a POS endpoint. This is where the failure is suspected. |

- **Auth/context:** employee `saurav (super owner)`, restaurant `506`, bearer token `***`, `fcm_token` `***`.
- **Host:** POS preview origin (`pos-front-staging-3.preview.emergentagent.com`), backend `preprod.mygenie.online`.

---

## Reproduction (owner, Firefox, 2026-09-24 — Addendum 2)
1. Firefox on preview host → **Logout → Login** again. Console shows FCM token obtained (`[Login] FCM result …`).
2. Firefox site permission: Notifications = **Allowed**. Sidebar: **Ringer On**.
3. Place a real Scan & Order for restaurant 506.
4. Console (same second):
   ```
   [Socket] Event received: new_order_506  ["scan-new-order", 1232776, 506, 7, {…}, "web"]
   [SocketHandler] scan-new-order received: orderId=1232776 … hasFullPayload=true
   [OrderContext] addOrder: Adding new order 1232776
   ```
   Pop-up appears.
5. **Absent:** `[Notification] ====== INCOMING NOTIFICATION ======`, `Foreground message`, `SW forwarded message`, any `[SoundManager] Play blocked / Playback error`. → No FCM arrived; no play was attempted.

Every browser-side precondition (permission, token, ringer, autoplay, media load) is satisfied and was independently verified (report §10–§11). The break is upstream of the frontend.

---

## Payload / Response
- **Request payload path:** not captured — login body contains the raw `fcm_token` (secret). Shape: `{ ..., "fcm_token": "***" }` per `authTransform.js:51`.
- **Actual response path:** n/a — the missing artefact is an FCM message, not an HTTP response.
- **Expected (positive control):** an FCM message to this browser's token shaped like the known-good sample in `memory/evidence/BUG-453/B0_fcm_payload_mapping_2026_02.md` (Chrome, Feb-2026, order 1232751):
  ```json
  { "notification": { "title": "Please confirm this order", "body": "Order ID: … \nOrder Type: dinein \nTable No: …" },
    "data": { "sound": "forty_five_sec_buzzer", "orderid": "1232751", "channel_id": "forty_five_sec_buzzer" } }
  ```
- **Actual:** nothing received by the Firefox browser for order 1232776.
- **Positive control meaning:** the backend FCM pipeline works for at least one (Chrome) token. The gap is specific to this token / session / targeting.

---

## Evidence
- Owner console screenshots (Firefox) — described in report §2 and §11; not stored (profile data).
- `memory/evidence/BUG-454/BUG-454_preview_headers.txt` — preview sound hosting headers (playback layer ruled out as cause of *this* case).
- `memory/evidence/BUG-454/BUG-454_PREVIEW_ff_vs_chrome_media_probe.json` — all sounds load and play in Firefox/Chrome on preview.
- `memory/evidence/BUG-453/B0_fcm_payload_mapping_2026_02.md` — positive control (real FCM payload received in Chrome).
- Code trace: `src/contexts/NotificationContext.jsx:142` is the only `soundManager.play` call site; `src/api/socket/socketHandlers.js:545 handleScanNewOrder` only calls `addOrder`.

---

## Questions for backend (please answer each)
1. **Token storage model — CONFIRMED by owner: one `fcm_token` per employee, last login wins.** Please confirm from code/DB and state the table/column. Is a multi-device model (one token per device/browser, list per employee) feasible? This is the structural fix for shared accounts.
2. **Send log for the reproduction:** restaurant `506`, order `1232776`, 2026-09-24 ≈ 19:49:11 local — was an FCM send attempted for the "Please confirm this order" notification? To which token(s) (last 6 chars only)? What did FCM return (`success` / `NotRegistered` / `InvalidRegistration` / `UNREGISTERED` / other)? Was the token on file at that moment the one sent by the Firefox login seconds earlier?
3. **Targeting:** is the confirm-order push sent **per token** or via **`zone_wise_topic`**? Note: the frontend receives `zone_wise_topic` at login but **never subscribes to it** (only `authTransform.js:22` maps it; no `subscribeToTopic` anywhere in `src/`). If sends are topic-based, the backend must subscribe the token server-side at login — does it, and did it for this token?
4. **Token validation on save:** Firefox tokens resolve to a different push endpoint (`updates.push.services.mozilla.com`) than Chrome (`fcm.googleapis.com`). Does the backend validate, truncate, or reject tokens on save? Is the full token (may exceed 160 chars) stored intact?
5. **Logout semantics:** does `employee-logout` deregister *the employee's* token (Model A — kills all devices) or only the token sent in that logout request?

---

## Frontend Workaround
- **Available: NO.** F5 (trigger buzzer from socket `scan-new-order`) **withdrawn** by owner 2026-09-24 — socket and FCM stay independent by design.
- Planned frontend hardening (Planning Gate 2-3) that does **not** fix this reproduction:
  - **F1** — re-check permission + re-register FCM token on every authenticated boot, "alerts disabled" banner. Mitigates stale-token sessions **only if** the backend accepts re-registration (still last-login-wins → does not solve shared accounts).
  - **F2** — stop per-play re-download of sound files (fixes "rang late / rang once, not again").
  - **F4** — Firefox autoplay unlock on first gesture (fixes first ring after cold reload).

---

## Owner-side parallel tests (run alongside the backend reply)
| Test | Outcome A | Outcome B |
|---|---|---|
| **T1** — Firebase Console → Cloud Messaging → *Send test message* → paste this Firefox's token (mask afterwards) | Notification shows in Firefox → push transport OK → **backend is not sending to this token** → `BACKEND_BUG` confirmed | Nothing arrives → Firefox push transport blocked (network / `push.services.mozilla.com` / profile) → `ENVIRONMENT` |
| **T2** — Firefox console: `(await navigator.serviceWorker.getRegistrations())[0]?.pushManager.getSubscription().then(s => s?.endpoint.split('/').slice(0,3).join('/'))` | `https://updates.push.services.mozilla.com` → subscription exists | `null` → token orphaned from its push subscription |

---

## Requested outcome
- Answers to Q1–Q5 with evidence (send log lines, masked token suffixes, FCM response codes).
- Decision on multi-device token storage (Q1) — owner decision `OD-454-03` to be opened at Planning if backend proposes a contract change (e.g. `device_id` in login body).
- Reply file: `memory/backend_replies/BE_REPLY_BUG-454_<DATE>.md`
