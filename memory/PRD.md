# MyGenie POS Frontend Deployment

## Original Problem Statement
Deploy the existing React frontend repo (https://github.com/Abhi-mygenie/core-pos-front-end-.git, branch PMS13) directly into `/app` and run it as-is, with no code edits.

## Architecture
- **Type**: Frontend-only React app (no backend/database needed for this deployment)
- **Framework**: React (Create React App) with CRACO config
- **Start command**: `craco start` via `yarn start`
- **Port**: 3000 (supervisor-managed)
- **Repo destination**: `/app/frontend/` (platform supervisor is hardcoded to this path)

## What Was Done (2026-09-14)
1. Backed up platform files: `/app/memory/`, `/app/.emergent/`
2. Cloned repo branch PMS13 → `/tmp/repo-stage/`
3. Replaced `/app/frontend/` contents with repo's `frontend/` subdirectory
4. Wrote all env variables to `/app/frontend/.env`
5. Ran `npm install --legacy-peer-deps` (lockfile: `package-lock.json`)
6. Restarted supervisor frontend — compiled with 1 ESLint warning only (no errors)
7. Verified HTTP 200 on port 3000; login page renders correctly

## Environment Variables Set
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (full Firebase config)
- REACT_APP_CRM_BASE_URL / REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true

## Status
- App running on port 3000
- Webpack compiled with 1 warning (ESLint react-hooks/exhaustive-deps — non-blocking)
- Login page renders; API calls go to preprod.mygenie.online

## Backlog / Next Steps
- P0: Verify login with real credentials against preprod API
- P1: Test all major POS flows (order entry, settlement, reports)
- P2: Production build (`npm run build`) if static hosting is needed
