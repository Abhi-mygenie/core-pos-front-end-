# MyGenie Core POS Frontend — Deployment Record

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: main
- Deployed: 2026-08-18

## Architecture
- Frontend-only React app (CRA + craco) running on port 3000 via supervisor
- Backend supervisor entry left intact (platform requirement); not used by this app
- API calls go to REACT_APP_API_BASE_URL (https://preprod.mygenie.online/)

## What Was Done
1. Cloned repo into /tmp/pos-stage
2. rsynced frontend/ → /app/frontend/ (excluding node_modules)
3. rsynced memory/ → /app/memory/
4. Wrote /app/frontend/.env with all provided env variables
5. yarn install --ignore-engines (Node 20 vs @testing-library/jest-dom engine requirement)
6. supervisor start frontend → compiled successfully (1 lint warning, no errors)

## Environment Variables Set
- REACT_APP_BACKEND_URL (platform routing)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (full Firebase config)
- REACT_APP_CRM_BASE_URL / REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true

## Status
- App compiles and runs: CONFIRMED
- Login page renders: CONFIRMED
- Hot reload: enabled via supervisor autorestart
