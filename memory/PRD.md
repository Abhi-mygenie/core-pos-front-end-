# MyGenie Core POS Frontend — Deployment PRD

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: **PMS13** (current) | previously audit8 (2025-09-08)
- Deployed: 2026-09-14

## Architecture
- React (CRA + craco) frontend only — no local backend or database
- All API calls go to external API: https://preprod.mygenie.online/
- Socket: https://presocket.mygenie.online
- Firebase for auth/messaging
- Supervisor runs `yarn start` (craco start) from `/app/frontend`, port 3000

## What Was Done (2026-09-14 — branch PMS13)
- Cloned branch `PMS13` from repo into `/tmp/repo-stage`
- Replaced `/app/frontend/` contents with repo's `frontend/` subdirectory
- Wrote `/app/frontend/.env` with all provided env variables
- Installed deps with `npm install --legacy-peer-deps` (lockfile: `package-lock.json`)
- Cleared webpack cache to fix stale module resolution errors
- Restarted supervisor frontend → compiles with 1 ESLint warning only (no errors)
- Synced full remote `memory/` directory into `/app/memory/`
- App confirmed live at port 3000, HTTP 200, login page renders

## Env Variables (frontend/.env)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (full Firebase config)
- REACT_APP_CRM_BASE_URL / REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true

## Preserved Platform Files
- /app/.emergent/
- /app/memory/
- /app/backend/
- /app/.git (platform git)
- /etc/supervisor/conf.d/ (unchanged — readonly)

## Supervisor
- Program: `frontend` → `yarn start` from `/app/frontend`
- Port: 3000 (HOST=0.0.0.0 set by supervisor env)

## Backlog / Next Steps
- P0: Verify login with real credentials against preprod API
- P1: Test all major POS flows (order entry, settlement, reports)
- P2: Production build (`npm run build`) if static hosting is needed
