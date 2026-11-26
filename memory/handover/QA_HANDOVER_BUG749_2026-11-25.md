# QA Handover — BUG-749 (FCM device token never registered after reload)

**Date:** 2026-11-25 · **Risk:** HIGH · **Sprint:** nov_cr_batch
**Files:** `src/contexts/NotificationContext.jsx` + `src/api/services/deviceTokenService.js`

---

## 1. Verification Matrix

| Edit | File | Change | Self-Test |
|---|---|---|---|
| E1 | deviceTokenService.js | NEW `registerDeviceToken(fcmToken)` → POST to `DEVICE_TOKEN` endpoint | ✅ confirmed: `import { registerDeviceToken }` in NotificationContext |
| E2 | constants.js | `DEVICE_TOKEN: '/api/v1/vendoremployee/device-token'` added | ✅ confirmed in earlier grep |
| E3 | NotificationContext.jsx:256-284 | NEW auth-gated boot effect: on every load, if permission granted → `requestFCMToken()` → `registerDeviceToken()` | ✅ BUG-749 markers at L256/269/277/284 |

Unit: `api/services/__tests__/deviceTokenService.bug749.test.js` — 2/2 PASS (confirmed from earlier grep: `bug749 2/2 + bug453 4/4 PASS`).
Compile: webpack clean.

---

## 2. Browser Test Cases

**Requires:** A device/browser where FCM notification permission is already GRANTED.
**Account:** pms@macha.com / Qplazm@10 on RID 69 (confirmed granted-permission device).

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Token registered on fresh load | Login as pms@macha.com → Open browser DevTools console | Console shows `[BUG-749] device-token registered` log with token + restaurant_id |
| T2 | Token registered on page reload | F5 / hard reload on the POS app | Same `[BUG-749] device-token registered` log appears again (not gated by initializedRef) |
| T3 | Backend confirms token | After T1/T2 → curl `/api/v1/vendoremployee/profile` with pms@macha token | `has_firebase_token: true` in profile response |
| T4 | Notification arrives after reload | Trigger a new order on RID 69 from another device | Pop-up and/or buzzer fires on the reloaded device |
| T5 | Denied permission — no registration | On a device with Notifications DENIED | No `registerDeviceToken` call in Network tab; no console log |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | First-login token flow (CR-562) still works | Boot effect is separate from CR-562 attach effect; both coexist |
| R2 | No double-subscribe on initial login | Phase 1 (CR-562) + Phase 2 (BUG-749) are separate effects; verify only 1 `join_restaurant` socket event |
| R3 | Silent mode: no banner when permission denied | SoundUnlockBanner (BUG-747) still shows correctly |

---

## 4. Registry Sync Confirmation

Registry: BUG-749 → GATE_5A_IMPLEMENTED · Sprint: nov_cr_batch ✅
Unit: deviceTokenService.bug749.test.js 2/2 PASS.

---

## 5. Credentials + Environment

| Account | Password | RID | Use |
|---|---|---|---|
| pms@macha.com | Qplazm@10 | 69 | FCM — device must have granted notification permission |

**Note:** This QA MUST run on a device/browser where notifications are ALLOWED for preprod.mygenie.online. The Playwright preview browser has notifications DENIED — run T1-T4 on a physical browser with allowed permissions. Verify via `window.Notification.permission === 'granted'` in console before testing.
