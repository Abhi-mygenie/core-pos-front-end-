# MyGenie POS Frontend — Deployment Record

## Original Problem Statement
Deploy the existing React frontend repo (https://github.com/Abhi-mygenie/core-pos-front-end-.git, main branch)
directly into `/app` and run it as-is with no code edits.

## Architecture
- **Frontend**: React (CRA + CRACO) running on port 3000 via supervisor (`yarn start`)
- **Backend**: FastAPI placeholder on port 8001 (platform template, unused by this app)
- **Package Manager**: Yarn (`.yarnrc` → `ignore-engines true`)
- **Build Tool**: CRACO (Create React App Configuration Override)
- **Source**: `frontend/` subdirectory inside the GitHub repo

## What's Been Implemented

### 2026-11-14 — Redeploy / Sync
- Repo re-cloned from GitHub (main branch) to `/tmp/pos-repo`
- Repo's `frontend/` contents rsync'd into `/app/frontend/` (node_modules and .env excluded)
- Platform files preserved: `.emergent/`, `backend/`, `memory/`, `test_reports/`
- `/app/frontend/.env` updated with all required environment variables (see below)
- Firebase API key, VAPID key, Google Maps key added via secrets secure card
- `yarn install` run — all new packages installed (firebase, socket.io-client, jspdf, etc.)
- Supervisor restarted; webpack compiled with 1 lint warning only
- App accessible at preview URL — MyGenie login page confirmed visible

## Environment Variables (frontend/.env)
```
REACT_APP_BACKEND_URL=<platform preview URL>        # platform-managed
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
REACT_APP_FIREBASE_API_KEY=<set via secrets>
REACT_APP_FIREBASE_VAPID_KEY=<set via secrets>
REACT_APP_GOOGLE_MAPS_KEY=<set via secrets>
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
REACT_APP_SOCKET_URL=https://presocket.mygenie.online
REACT_APP_FIREBASE_AUTH_DOMAIN=mygenie-restaurant.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=mygenie-restaurant
REACT_APP_FIREBASE_STORAGE_BUCKET=mygenie-restaurant.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=969625631640
REACT_APP_FIREBASE_APP_ID=1:969625631640:web:2f2a2987f740b6fc8e09ed
REACT_APP_FIREBASE_MEASUREMENT_ID=G-WFK75QN54E
REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
REACT_APP_CRM_API_KEYS=<not yet set — CRM features pending>
CORS_ORIGINS=*
REACT_APP_SHOW_AUDIT_TAB=true
```

## Known Expectations / Limitations
- API calls go to `preprod.mygenie.online` — will fail if that backend is unreachable
- `REACT_APP_CRM_API_KEYS` not yet set; CRM-linked features will fail until supplied
- Socket connections to `presocket.mygenie.online` untested
- Login requires valid credentials against the preprod backend

## Prioritized Backlog
- **P0**: Supply `REACT_APP_CRM_API_KEYS` via secrets secure card
- **P1**: Verify login flow against preprod API with real credentials
- **P2**: Test socket connections and real-time order updates
- **P3**: Switch `REACT_APP_API_BASE_URL` to production URL when ready to go live
