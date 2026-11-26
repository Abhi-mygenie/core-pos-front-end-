# Deployment Record — 2026-10-08 (Emergent E1 Deploy 5)

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 5oct-1
- Deployment target: /app/frontend (supervisor-managed, port 3000)

## Steps Performed
1. Cloned branch `5oct-1` to `/tmp/pos-repo`
2. Cleared stale files from `/app/frontend/` (preserved node_modules, .env, platform configs)
3. Copied `frontend/` from repo → `/app/frontend/`
4. Synced `memory/` from repo → `/app/memory/` (37 files)
5. Wrote all provided env variables to `/app/frontend/.env`
6. Ran `yarn install --ignore-engines` (Node 20 / engine compat workaround)
7. Installed missing packages: `xlsx`, `jspdf`, `jspdf-autotable`, `browser-image-compression`, `@hello-pangea/dnd`, `firebase`
8. Restarted frontend via `supervisorctl restart frontend`
9. Verified: webpack compiled with 1 warning (no errors), HTTP 200 on port 3000

## Result
- App: RUNNING — MyGenie POS login screen confirmed via screenshot
- Memory dir: fully synced with remote branch (37 files)
- All supervisor processes: RUNNING

## Env Variables Set
- REACT_APP_BACKEND_URL (platform)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (full Firebase config)
- REACT_APP_CRM_BASE_URL / REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true
