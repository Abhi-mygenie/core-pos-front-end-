# CR-562 evidence

- Source: OWNER-REPORTED idea 2026-11-23 + agent code verification.
- Confidence: CONFIRMED premise.
- Verified in code:
  - `api/services/profileService.js:12` — PROFILE is a GET, no body.
  - `api/transforms/authTransform.js:52` — fcm_token sent ONLY on login.
  - `config/firebase.js` — token cached at localStorage.mygenie_fcm_token; requestFCMToken() only called in LoginPage.
  - Reload path: `components/guards/ProtectedRoute.jsx` (isLoaded=false → /loading) → `pages/LoadingPage.jsx` getProfile().
- Full evaluation: /app/memory/investigations/INV-BUZZER-20261123_INVESTIGATION_REPORT.md (§0c round 5).
