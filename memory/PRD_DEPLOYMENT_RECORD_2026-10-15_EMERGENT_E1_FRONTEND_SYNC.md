# Deployment Record — 2026-10-15 (Frontend Sync from GitHub)

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: main
- Destination: /app/frontend

## What Was Done
1. Cloned repo into /tmp/repo-preview (shallow clone, main branch)
2. Stopped frontend supervisor process
3. Removed old /app/frontend contents (including stale node_modules)
4. Copied repo's frontend/ directory into /app/frontend/ (0 diffs in src/)
5. Wrote all provided env variables to /app/frontend/.env
6. Synced /app/memory from repo (53 files)
7. Ran `yarn install` (911 packages, including craco, firebase, socket.io-client)
8. Started frontend via supervisor → compiled successfully

## Platform Files Preserved
- /app/.emergent (supervisor cron, emergent.yml)
- /app/backend/.env (MONGO_URL, DB_NAME)
- REACT_APP_BACKEND_URL retained in /app/frontend/.env

## Env Variables Set
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (all Firebase config vars)
- REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
- REACT_APP_GOOGLE_MAPS_KEY=AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true

## Verification
- webpack compiled with 1 warning (ESLint hooks warnings — not errors)
- Frontend running: pid 867, RUNNING, port 3000
- Login page rendering correctly (MyGenie branding visible)
- /app/frontend/src identical to repo (0 diffs)
- /app/memory synced: 53 files from remote main branch
