# Deployment Record — 2026-10-05 (Emergent Platform)

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 5oct-1
- Deployed into: /app/frontend (supervisor-managed, `yarn start` → `craco start`)

## What Was Done
1. Cloned repo branch `5oct-1` to /tmp/repo-check
2. Backed up platform files: backend/, memory/, tests/, .env files
3. Replaced /app/frontend contents with repo's frontend/ subfolder contents
4. Merged /app/memory with repo memory/ (full sync confirmed)
5. Created /app/frontend/.env with all provided env vars + preserved platform vars
6. Ran `yarn install --ignore-engines` (no lockfile in repo; Node 20.20.2 vs jest-dom@7 req >=22)
7. Restarted supervisor frontend process

## Status
- Frontend: RUNNING (HTTP 200, port 3000)
- Memory dir: FULLY IN SYNC with remote branch 5oct-1
- App: MyGenie POS login page rendering correctly

## Env Vars Applied
- REACT_APP_BACKEND_URL (platform)
- ENABLE_HEALTH_CHECK=false (platform)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (all Firebase config)
- REACT_APP_CRM_BASE_URL + REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true
