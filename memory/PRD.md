# MyGenie Core POS Frontend — Deployment Record

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 21implement
- Deployed: 2026-09-25

## Architecture
- Frontend-only React app (no backend from repo used)
- Build tool: CRACO (craco start)
- Framework: React (CRA base with craco overlay)
- Location: /app/frontend/

## What Was Done
1. Cloned branch `21implement` to `/tmp/pos-repo`
2. Backed up platform `.env` and cleared `/app/frontend/` source files (preserved `node_modules/`)
3. Copied repo's `frontend/` directory into `/app/frontend/` via rsync
4. Created `/app/frontend/.env` with all provided env variables
5. Ran `yarn install --ignore-engines` (Node 20 vs jest-dom engine mismatch bypassed)
6. Restarted frontend supervisor — compiled with 1 lint warning, no errors
7. Verified HTTP 200 on port 3000 and login page renders

## Environment Variables Set
- REACT_APP_BACKEND_URL (platform preview URL)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- All Firebase config vars
- REACT_APP_CRM_BASE_URL / REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true
- ENABLE_HEALTH_CHECK=false

## Platform Files Preserved
- /app/backend/ (FastAPI backend — untouched)
- /app/.emergent/ (platform cron/config)
- /app/memory/ (this directory)
- Supervisor configs (readonly, not modified)

## Status
- Frontend: RUNNING on port 3000
- Login page: rendering correctly
- API calls will hit https://preprod.mygenie.online/ (external)
