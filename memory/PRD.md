# MyGenie POS Frontend - Deployment Record

## Project
Deploy the `core-pos-front-end` React app (branch: `printer`) into the platform's `/app/frontend` directory and run it via supervisor.

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: `printer`

## Architecture
- Frontend-only React app (CRA + CRACO)
- Deployed into: `/app/frontend`
- Process manager: supervisord (`yarn start` → `craco start`)
- Port: 3000 (bound to 0.0.0.0)
- Backend: External (`REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`)
- Socket: External (`REACT_APP_SOCKET_URL=https://presocket.mygenie.online`)

## What Was Done (2026-08-09)
1. Cloned repo branch `printer` to `/tmp/core-pos-repo`
2. Stopped frontend supervisor
3. Cleared `/app/frontend` contents (preserved platform `.env` structure)
4. Copied `/tmp/core-pos-repo/frontend/` → `/app/frontend/`
5. Wrote all env variables to `/app/frontend/.env`
6. Ran `yarn install --ignore-engines` (package-lock.json repo; yarn supervisor command)
7. Restarted frontend supervisor
8. Verified: `Compiled successfully` — app live on port 3000

## Env Variables Set
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (full Firebase config)
- REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
- REACT_APP_CRM_API_KEYS (JSON with 4 outlet keys)
- REACT_APP_GOOGLE_MAPS_KEY
- REACT_APP_SHOW_AUDIT_TAB=true
- WDS_SOCKET_PORT=443

## Status
LIVE - Login page rendering at https://frontend-pos-ready.preview.emergentagent.com
