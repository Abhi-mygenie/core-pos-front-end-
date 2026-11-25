# MyGenie Core POS — Deployment Record
**Date:** 2026-11-25  
**Session type:** Fresh deployment from remote repo

---

## Source
- **Repo:** https://github.com/Abhi-mygenie/core-pos-front-end-.git
- **Branch:** main
- **Destination:** /app/frontend (platform-aware deployment; supervisor serves from /app/frontend/)

---

## Architecture
- **Frontend only:** React (CRA + craco), TypeScript-free, yarn workspace
- **Backend:** Platform-managed (unchanged — no business logic needed)
- **Database:** Not used by frontend
- **API target:** https://preprod.mygenie.online/ (REACT_APP_API_BASE_URL)
- **Socket:** https://presocket.mygenie.online (REACT_APP_SOCKET_URL)
- **Firebase:** mygenie-restaurant project (auth + FCM push notifications)
- **CRM:** https://crm.mygenie.online/api

---

## What Was Done

### Phase 1 — Platform files preserved
- Backed up /app/frontend/.env
- Kept /app/backend/, /app/.emergent/, supervisor configs intact

### Phase 2 — Repo sync
- Cloned repo to /tmp/pos-frontend-staging
- rsync'd /tmp/pos-frontend-staging/frontend/ → /app/frontend/ (excluding .env, node_modules)
- rsync'd /tmp/pos-frontend-staging/memory/ → /app/memory/ (full sync, 75 files)

### Phase 3 — Dependencies
- Deleted stale platform node_modules
- Fresh `yarn install` from repo's yarn.lock (exact versions, no upgrades)
- 953 packages installed; firebase, libphonenumber-js, xlsx, jspdf, jspdf-autotable all present

### Phase 4 — Environment
- Preserved platform keys: REACT_APP_BACKEND_URL, WDS_SOCKET_PORT, ENABLE_HEALTH_CHECK
- Added non-sensitive vars to /app/frontend/.env
- Collected 4 sensitive keys via secrets_request (stored securely in platform secret store):
  - REACT_APP_FIREBASE_API_KEY
  - REACT_APP_FIREBASE_VAPID_KEY
  - REACT_APP_GOOGLE_MAPS_KEY
  - REACT_APP_CRM_API_KEYS

### Phase 5 — Verified
- `webpack compiled with 1 warning` (ESLint exhaustive-deps warnings only — no errors)
- HTTP 200 on port 3000
- Supervisor: RUNNING
- Login screen renders correctly with MyGenie branding

---

## Environment Variables (all set)
| Key | Location | Value |
|-----|----------|-------|
| REACT_APP_API_BASE_URL | frontend/.env | https://preprod.mygenie.online/ |
| REACT_APP_SOCKET_URL | frontend/.env | https://presocket.mygenie.online |
| REACT_APP_FIREBASE_AUTH_DOMAIN | frontend/.env | mygenie-restaurant.firebaseapp.com |
| REACT_APP_FIREBASE_PROJECT_ID | frontend/.env | mygenie-restaurant |
| REACT_APP_FIREBASE_STORAGE_BUCKET | frontend/.env | mygenie-restaurant.firebasestorage.app |
| REACT_APP_FIREBASE_MESSAGING_SENDER_ID | frontend/.env | 969625631640 |
| REACT_APP_FIREBASE_APP_ID | frontend/.env | 1:969625631640:web:2f2a2987f740b6fc8e09ed |
| REACT_APP_FIREBASE_MEASUREMENT_ID | frontend/.env | G-WFK75QN54E |
| REACT_APP_CRM_BASE_URL | frontend/.env | https://crm.mygenie.online/api |
| REACT_APP_SHOW_AUDIT_TAB | frontend/.env | true |
| REACT_APP_FIREBASE_API_KEY | secrets store | set |
| REACT_APP_FIREBASE_VAPID_KEY | secrets store | set |
| REACT_APP_GOOGLE_MAPS_KEY | secrets store | set |
| REACT_APP_CRM_API_KEYS | secrets store | set (placeholder) |

---

## Known Issues / Notes
- `TypeError: devServer.close is not a function` — Node.js 24 + react-scripts 5.0.1 shutdown-signal mismatch. Harmless: only fires on SIGTERM, not during normal operation. App runs correctly.
- REACT_APP_CRM_API_KEYS stored as placeholder — update via secrets card when real keys are ready.
- Memory directory fully synced from repo (75 files including all investigation reports, bug reports, QA reports).

---

## Backlog / Next Steps
- P0: Provide real REACT_APP_CRM_API_KEYS JSON value via secrets card
- P1: Confirm Firebase auth and FCM push notifications work end-to-end in preview
- P1: Deploy to production (publish)
- P2: Verify Google Maps renders correctly on any map-dependent pages
