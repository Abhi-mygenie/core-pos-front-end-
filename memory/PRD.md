# MyGenie Core POS Frontend - Deployment PRD

## Date: 2026-02-17

## Problem Statement
Deploy the existing React frontend repo (https://github.com/Abhi-mygenie/core-pos-front-end-.git, branch: main) directly into /app and run it as-is with no code edits.

## Architecture
- **Frontend**: React (CRA + CRACO) running at /app/frontend, served by supervisor on port 3000
- **Backend**: FastAPI (unchanged) running at /app/backend on port 8001
- **Process Manager**: Supervisor (readonly config)

## What Was Done
1. Cloned repo from GitHub (main branch) into /tmp/repo-staging
2. Replaced /app/frontend contents with repo's frontend/ directory
3. Wrote all provided env vars to /app/frontend/.env
4. Ran `npm install --legacy-peer-deps` (package-lock.json detected)
5. Restarted frontend via supervisor
6. Verified HTTP 200 on port 3000 - login screen renders correctly

## Environment Variables Set (/app/frontend/.env)
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (all Firebase config)
- REACT_APP_CRM_BASE_URL / REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- WDS_SOCKET_PORT=443
- REACT_APP_SHOW_AUDIT_TAB=true

## Status
- App running: YES (HTTP 200, login page visible)
- Compilation: webpack compiled with 1 warning (ESLint only, non-blocking)
- Backend: unchanged, still running on port 8001

## Backlog / Next Steps
- Supply real credentials to test login flow against preprod API
- Any env var changes → sudo supervisorctl restart frontend
