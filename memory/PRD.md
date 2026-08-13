# MyGenie Core POS Frontend — Deployment Record

## Original Problem Statement
Deploy the existing React frontend repo directly into `/app` and run it as-is, with no code edits.
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git (branch: main)
- Destination: /app/frontend (platform supervisor serves from /app/frontend)

## Architecture
- Frontend-only React app (CRA + CRACO)
- Supervisor: `yarn start` → `craco start` on 0.0.0.0:3000
- No backend changes

## Deployment Steps Done (2026-08-13)
1. Stopped frontend supervisor
2. Cleared /app/frontend contents (preserved node_modules temporarily)
3. Cloned repo to /tmp/pos-repo, copied /tmp/pos-repo/frontend/ → /app/frontend/
4. Wrote all env variables to /app/frontend/.env
5. Ran `npm install --legacy-peer-deps` (repo has package-lock.json)
6. Started frontend supervisor — compiled successfully

## Environment Variables Set (/app/frontend/.env)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (full Firebase config)
- REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
- REACT_APP_CRM_API_KEYS (partial — "509" key was truncated in problem statement, placeholder set)
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true
- REACT_APP_BACKEND_URL (platform URL)

## Status
- App compiles successfully (webpack compiled successfully)
- Login page visible and serving on port 3000
- Only non-fatal deprecation warnings in stderr

## Backlog / Known Issues
- P1: REACT_APP_CRM_API_KEYS for outlet "509" is a placeholder — user must supply the real value
- P1: API calls will fail until backend (preprod.mygenie.online) credentials are confirmed working
- P2: Firebase Messaging / push notifications — VAPID key is set, runtime depends on service worker
