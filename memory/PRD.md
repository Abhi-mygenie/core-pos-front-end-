# MyGenie Core POS Frontend — Deployment PRD

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: pms18sep (latest)
- Deployed: 2026-09-18

## Architecture
- React (CRA + craco) frontend only — no local backend or database
- All API calls go to external API: https://preprod.mygenie.online/
- Socket: https://presocket.mygenie.online
- Firebase for auth/messaging
- Hosted at: https://pos-front-staging-2.preview.emergentagent.com

## What Was Done
- 2026-09-14: Cloned branch `PMS13` from repo into `/tmp/pos-repo`
- 2026-09-15: Cloned branch `16sep`, synced remote memory dir to `/app/memory/`
- 2026-09-17: Cloned branch `PMS17`, synced remote memory dir
- 2026-09-18: Cloned branch `pms18sep`, synced remote memory dir to `/app/memory/`
- Replaced `/app/frontend/` contents with repo's `frontend/` directory (branch pms18sep)
- Wrote `/app/frontend/.env` with all provided env variables
- Installed deps with `yarn install --ignore-engines` (Node 20 vs required 22 for jest-dom)
- Restarted supervisor frontend → compiles with 0 fatal errors
- App confirmed live at port 3000, HTTP 200, login page visible

## Env Variables (frontend/.env)
- REACT_APP_BACKEND_URL (platform proxy)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (full Firebase config)
- REACT_APP_CRM_BASE_URL / REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true
- ENABLE_HEALTH_CHECK=false

## Preserved Platform Files
- /app/.emergent/ (preserved)
- /app/memory/ (synced from repo branch)
- /app/backend/ (untouched)
- /etc/supervisor/conf.d/ (unchanged, READONLY)

## Supervisor
- Program: `frontend` → `yarn start` → `craco start` from `/app/frontend`
- Port: 3000 (HOST=0.0.0.0 set by supervisor env)
- Status: RUNNING, compiled successfully

## Previous Branches Deployed
- audit8 (2025-09-08)
- PMS13 (2026-09-14)
- 16sep (2026-09-15)
- PMS17 (2026-09-17)
- pms18sep (2026-09-18) ← current
