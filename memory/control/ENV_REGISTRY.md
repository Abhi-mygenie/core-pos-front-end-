# ENV_REGISTRY.md — Environment Variable Registry
# Key names + purpose + owner only. Values are NEVER stored here.
# Created: 2026-09-08 (CR-370 C4)
# Last Updated: 2026-09-08 (CR-372-A F-SEC-07: REACT_APP_CRM_API_KEYS + CORS_ORIGINS removed from frontend/.env)
# Rule: Any new env var added to .env MUST be registered here before use in src/.

| Variable | Purpose | Owner | Required |
|---|---|---|---|
| REACT_APP_API_BASE_URL | Laravel backend base URL (has trailing slash — strip before concat) | Platform | YES |
| REACT_APP_SOCKET_URL | Socket.io server URL | Platform | YES |
| REACT_APP_BACKEND_URL | Emergent platform internal backend URL (not used by app logic — platform only) | Emergent | YES |
| REACT_APP_FIREBASE_API_KEY | Firebase auth initialisation | Firebase project `mygenie-restaurant` | YES |
| REACT_APP_FIREBASE_AUTH_DOMAIN | Firebase auth domain | Firebase project | YES |
| REACT_APP_FIREBASE_PROJECT_ID | Firebase project ID | Firebase project | YES |
| REACT_APP_FIREBASE_STORAGE_BUCKET | Firebase storage bucket | Firebase project | YES |
| REACT_APP_FIREBASE_MESSAGING_SENDER_ID | FCM sender ID | Firebase project | YES |
| REACT_APP_FIREBASE_APP_ID | Firebase app ID | Firebase project | YES |
| REACT_APP_FIREBASE_MEASUREMENT_ID | Firebase Analytics measurement ID | Firebase project | NO |
| REACT_APP_FIREBASE_VAPID_KEY | FCM web push VAPID key | Firebase project | YES |
| REACT_APP_CRM_BASE_URL | CRM API base URL | CRM service | YES |
| REACT_APP_GOOGLE_MAPS_KEY | Google Maps embed key | Google Cloud | YES |
| REACT_APP_SHOW_AUDIT_TAB | Feature flag — show Audit tab on S5/S6/S7/S9 (`true` = visible; omit or `false` = hidden) | Platform | NO |
| WDS_SOCKET_PORT | Webpack dev server socket port (443 for HTTPS proxy) | Platform | YES |
| ENABLE_HEALTH_CHECK | Platform health check toggle | Platform | NO |

---

## Removed / Deprecated / Pending Removal

> Rule: this table may only say REMOVED after the key is gone from `.env`. CR-372-A flips these two rows on execution.

| Variable | Removed | Reason |
|---|---|---|
| REACT_APP_CRM_API_KEYS | **REMOVED 2026-09-08** (CR-372-A F-SEC-07) | Unused in src/ — `crmAxios.js` has comment noting key removed from active use |
| CORS_ORIGINS | **REMOVED 2026-09-08** (CR-372-A F-SEC-07) | Frontend env var — has no effect on browser CORS; was misleading |
