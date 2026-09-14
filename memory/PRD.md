# MyGenie Core POS Frontend — Deployment PRD

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: PMS13
- Deployed: 2026-09-14

## Architecture
- React (CRA + craco) frontend only — no local backend or database
- All API calls go to external API: https://preprod.mygenie.online/
- Socket: https://presocket.mygenie.online
- Firebase for auth/messaging
- Hosted at: https://494d04b0-021e-423f-9a56-2f723085dc1f.preview.emergentagent.com

## What Was Done
- Cloned branch `PMS13` from repo into `/tmp/pos-repo`
- Synced `/tmp/pos-repo/memory/` → `/app/memory/` (full remote memory dir pulled)
- Replaced `/app/frontend/` contents with repo's `frontend/` directory
- Wrote `/app/frontend/.env` with all provided env variables
- Installed deps with `yarn install --ignore-engines` (Node 20 vs engine req >=22)
- Restarted supervisor frontend → compiles with 0 errors, 1 ESLint warning
- App confirmed live at port 3000, HTTP 200

## Env Variables (frontend/.env)
- REACT_APP_BACKEND_URL (platform proxy)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (full Firebase config)
- REACT_APP_CRM_BASE_URL / REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- REACT_APP_SHOW_AUDIT_TAB=true

## Preserved Platform Files
- /app/.emergent/
- /app/memory/
- /app/backend/
- /etc/supervisor/conf.d/ (unchanged, READONLY)

## Supervisor
- Program: `frontend` → `yarn start` → `craco start` from `/app/frontend`
- Port: 3000 (HOST=0.0.0.0 set by supervisor env)
- Status: RUNNING, compiled successfully

## Previous Branches Deployed
- audit8 (2025-09-08)
- PMS13 (2026-09-14) ← current
