# BACKEND_BRIEF_CR-562_2026-11-23

**Owner directive (2026-11-23):** Do the **token-refresh path** (keep it minimal — no architecture change
overnight). The POS profile call **stays a GET** and should additionally **return the firebase (FCM) device
token the backend stored at login**. We will plan the frontend (Gate 3) against your reply to this brief.

## Summary
- **Issue:** After a browser **reload** (no relogin), order pushes sometimes stop reaching the device. The
  order still arrives on the Socket.IO channel and renders on the dashboard, but **no FCM payload is delivered**,
  so the buzzer never rings. Root cause on the backend side: the device's FCM token is captured **only at
  login**; if that token rotates (Firebase rotates tokens; also on SW reinstall / cache clear) the backend keeps
  pushing to a **stale token** and the device receives nothing until the next relogin (which re-sends a token).
- **Classification:** CONTRACT_MISMATCH (needs a small backend change to the profile endpoint).
- **Frontend impact:** Missed order buzzers after reload → operators miss orders. Pairs with BUG-747 (FE autoplay
  re-unlock); BUG-747 fixes the "FCM arrived but audio blocked" case, CR-562 fixes the "FCM never arrived" case.
- **Priority/Risk:** P1 · **HIGH** (API contract + device-token persistence). Couples with P0 BUG-747 for a
  complete "silent after reload" fix.

## Endpoint
- **Method:** GET (must stay GET per owner)
- **URL:** `/api/v1/vendoremployee/profile`
- **Auth/context:** employee bearer `AUTH_TOKEN` (post `loginAsRestaurant`); restaurant context is implied by
  the token. Fires on **every** app boot/reload (ProtectedRoute → `/loading` → `LoadingPage.getProfile()`).

## Reproduction
1. Log in on the POS (device sends `fcm_token` in the login payload — see below). Push works, buzzer rings.
2. Leave the tab open a while (or force a token rotation / clear site data), then **reload** the page (no relogin).
3. Place a test order. Observed: order arrives via socket (`new_order_69` / `update-order`) and shows on the
   dashboard, but **no FCM payload** reaches the device and the buzzer does not ring.
- Evidence: `/app/memory/evidence/BUG-747/BUG-747_reload_no_fcm_socket_only_2026-11-23.png` (Event Log shows no
  `received` FCM event for the post-reload order; only socket console events).

## Payload / Response — current vs requested

**Current (today):**
- Login payload already carries the token (field name to reuse): `{ ..., "fcm_token": "<device token>" }`
  (FE `authTransform.loginRequest`). Backend stores it at login and uses it to push.
- `GET /vendoremployee/profile` sends **no token** and the response contains **no token field**.

**Requested contract (please confirm / adjust):**

1. **Response — return the stored token (owner's explicit ask).** Add the currently stored device/FCM token to
   the profile GET response so the FE can confirm the backend holds the right token (drift detection +
   diagnostics). Proposed: **top-level** `"fcm_token": "<stored token or null>"`. Please confirm field name +
   location, and that it is the **FCM device token** (not the CRM token / auth token).

2. **Refresh — accept the current token on the same GET (keeps it GET).** To actually refresh a rotated token
   without a relogin, let the FE pass the current device token on the same call as an **optional query param**:
   `GET /api/v1/vendoremployee/profile?fcm_token=<current token>`. Backend behavior:
   - If `fcm_token` present and non-empty → **upsert** it as this employee+restaurant's device token (same store
     used at login), then return it in the response (per #1).
   - If the param is **absent/empty** → **leave the stored token untouched** (do NOT clear it). This is important:
     the FE will omit the param whenever it has no fresh token (permission denied / messaging unsupported).
   - Still a GET, no request body, no new endpoint — least-change path.

   If you'd rather **not** mutate on a GET, the alternative is a dedicated lightweight write endpoint, e.g.
   `POST /api/v1/vendoremployee/device-token { "fcm_token": "<token>" }`; the FE would call it on boot and still
   read the stored token back from #1. **Owner preference is to keep it on the profile GET (#2).** Please pick.

## Backend decisions we need (to write the FE Gate 3 plan)
- **D1 — Transport:** OK to accept `fcm_token` as a query param on `GET /profile` and upsert it (recommended)?
  Or dedicated `POST /device-token`? (Owner prefers the GET param.)
- **D2 — Response field:** exact name/location of the returned token (recommend top-level `fcm_token`, nullable).
- **D3 — Multi-device:** is the token stored as a **single** value per employee+restaurant (last-write-wins) or a
  **set** of device tokens? If single, a reload on device B overwrites device A's token — is that acceptable, or
  should we register per device?
- **D4 — Scope:** is the token keyed per **employee**, per **restaurant**, or per **employee+restaurant**? (Affects
  push targeting.)
- **D5 — Empty-safety:** confirm a missing/empty `fcm_token` param is a **no-op** (never clears the stored token).
- **D6 — Same store as login:** confirm the profile upsert writes to the **same record/column** the login payload
  populates, so one device has one authoritative token.
- **D7 — (optional) last-seen:** do you want a `fcm_token_updated_at` / last-seen timestamp maintained?

## Evidence
- Screenshot: `/app/memory/evidence/BUG-747/BUG-747_reload_no_fcm_socket_only_2026-11-23.png`
- Investigation: `/app/memory/investigations/INV-BUZZER-20261123_INVESTIGATION_REPORT.md`
- Impact analysis: `/app/memory/impact/BUG-747_IMPACT_ANALYSIS.md` (§2b documents the no-FCM-after-reload mode)

## Frontend Workaround
- **Available:** NO reliable one. The only current "workaround" is a full **relogin**, which re-sends a token via
  the login payload — not acceptable as the operator fix. (BUG-747 FE autoplay re-unlock is being done in parallel
  but does not help when no FCM payload arrives.)

## Planned frontend work (Gate 3 — pending your reply, NOT yet implemented)
- Call `requestFCMToken()` on boot in `LoadingPage` (silent when permission already granted; yields nothing if
  denied/unsupported).
- Attach `fcm_token` to the profile GET per your chosen transport (D1), via `profileService`/`profileTransform`.
- Read the returned token (D2) to log/verify drift. No change to how the dashboard consumes profile data.

---
**CR-562** · Assignee (FE) Abhishek · Backend Gyan · Sprint nov_cr_batch · Client The Goan Kitchen (rid 69).
Related: **BUG-747** (FE autoplay re-unlock — complementary; the two together close "silent after reload").
