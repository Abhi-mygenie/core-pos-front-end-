# MyGenie POS Frontend — Deployment Memory

## Original Problem Statement
Deploy the existing React frontend repo (https://github.com/Abhi-mygenie/core-pos-front-end-.git, branch: 14sep) directly into `/app` and run it as-is, with no code edits.

## Architecture
- **Frontend only**: React (CRA + craco) running on port 3000
- **Supervisor**: `yarn start` from `/app/frontend`
- **Backend**: Preserved at `/app/backend` (not used by this repo)
- **No backend or database** setup required

## What Was Done (2026-09-14)
1. Explored existing `/app` structure and backed up platform files
2. Stopped supervisor frontend process
3. Cleared `/app/frontend` and copied repo's `frontend/` contents in
4. Created `/app/frontend/.env` with all provided env variables
5. Ran `npm install --legacy-peer-deps` (package-lock.json detected)
6. Restarted supervisor frontend → compiled successfully
7. Verified: HTTP 200 on port 3000, login screen renders at preview URL

## Env Variables Configured
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (all keys set)
- REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
- REACT_APP_CRM_API_KEYS (3 tenant keys)
- REACT_APP_GOOGLE_MAPS_KEY
- WDS_SOCKET_PORT=443
- REACT_APP_SHOW_AUDIT_TAB=true

## Status
- App deployed and running ✓
- Login page visible at preview URL ✓
- Hot reload enabled via craco/webpack ✓
