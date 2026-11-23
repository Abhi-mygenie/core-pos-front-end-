# CR-562 — Refresh FCM Token on Reload via the Profile API

**Registered:** 2026-11-23
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE
**Client:** The Goan Kitchen (restaurant id 69)
**Assignee:** Gyan (auto-routed — Aggregator/Sockets AND backend-blocked)

---

## 1. Description / Requirement

Today the FCM device token is obtained and sent to the backend **only at login** (`LoginPage` →
`requestFCMToken()` → token in the login payload). On a reload no token is re-sent, so if the device token
rotated or the backend lost it, pushes stop arriving ("few times on relogin it doesn't ring and no FCM
payload"). 

**Requested behaviour:** piggyback FCM-token (re)registration on `GET /api/v1/vendoremployee/profile`,
which already fires on every reload (verified: `ProtectedRoute` → `/loading` → `LoadingPage.getProfile()`),
so the backend always holds the current token without needing a relogin.

---

## 2. Classification

- **Type:** CR (hardening; new wiring + backend change)
- **Severity:** P2 — Medium (agent-classified; intermittent, hardening). Owner to confirm at Gate 2.
- **Risk:** HIGH — API contract change (profile request body / new register path) + token/localStorage.
- **Area:** Aggregator / Sockets (FCM notifications)
- **Fast Lane:** NOT eligible (API contract + backend dependency)

---

## 3. Duplicate Check

- **Result: DISTINCT** (RELATED to BUG-747 and the buzzer cluster; investigation INV-BUZZER-20261123).

---

## 4. Evidence

- **Source:** OWNER-REPORTED idea (2026-11-23) + agent code verification.
- **Confidence:** CONFIRMED premise.
- Verified: `PROFILE` is a **GET** with no body (`profileService.js:12`); profile request sends no
  `fcm_token` today (only `authTransform.js:52` on login); token cached at `localStorage.mygenie_fcm_token`.
- Reload path confirmed: `components/guards/ProtectedRoute.jsx` (isLoaded=false → /loading) →
  `pages/LoadingPage.jsx` `getProfile()`.
- Analysis: `/app/memory/investigations/INV-BUZZER-20261123_INVESTIGATION_REPORT.md` (§0c round 5).
- Evidence folder: `/app/memory/evidence/CR-562/`.

---

## 5. Scope Notes / Caveats

- `PROFILE` is a GET → carrying `fcm_token` needs a query param, a switch to POST, or a dedicated register
  endpoint. **Backend must read + store the token** → BACKEND dependency (BACKEND_BRIEF needed).
- Frontend must call `requestFCMToken()` (runs `getToken`) on boot before the call to send a *valid* token;
  silent when permission already granted; yields nothing if permission never granted/denied.
- **Does NOT fix the reload-silence symptom** (that is BUG-747 / autoplay). This only hardens delivery.

---

## 6. Blast Radius

- `src/config/firebase.js` (token getter), `src/pages/LoadingPage.jsx` (call on boot),
  `src/api/services/profileService.js` + `src/api/transforms/profileTransform.js` (attach token) — proposed.
- **BACKEND:** profile endpoint must accept + persist `fcm_token`.
- **Estimated scope:** MEDIUM (3–4 FE files + backend). Hotspots: profile transform — YES.

---

## 7. Open Questions

- OD-562-01: Carry token on the profile call (query/POST) OR add a dedicated `register-device-token` endpoint?
- OD-562-02: Re-register on every reload, or only when the cached token differs from last-sent?

---

## 8. Related

- INV-BUZZER-20261123 (investigation)
- BUG-747 (autoplay re-unlock — the actual reload fix; complementary)
- `src/config/firebase.js`, `src/pages/LoadingPage.jsx`, `src/api/transforms/profileTransform.js`
