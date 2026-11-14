# Deployment Record — 2026-10-12 (Emergent E1)

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: main
- Commit: 39d8abe (latest at time of deploy)

## Deployment Summary
- Platform: Emergent Agent Cloud (Kubernetes preview)
- Frontend dir: /app/frontend
- Package manager: yarn (no lockfile in repo; yarn install generated yarn.lock)
- Start command: yarn start (via craco, supervisor-managed)
- Port: 3000 (HOST=0.0.0.0)

## Env Variables Set
All REACT_APP_* variables written to /app/frontend/.env:
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (full set)
- REACT_APP_CRM_BASE_URL, REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- REACT_APP_SHOW_AUDIT_TAB=true
- WDS_SOCKET_PORT=443
- Platform REACT_APP_BACKEND_URL preserved

## Status
- Compiled successfully (1 lint warning only — non-blocking)
- App serving on port 3000, login screen rendering
- Memory dir synced: 2128 files from repo
- No code edits made — deployed as-is
