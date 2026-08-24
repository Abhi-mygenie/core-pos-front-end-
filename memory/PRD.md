# Core POS Frontend — Deployment Log

## Deployment Date
2026-08-24

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: main
- Deployed to: /app/frontend/ (platform constraint — supervisor points to this dir)

## What Was Done
1. Cloned repo to /tmp/pos-staging
2. Identified repo structure: React CRA/craco app lives in frontend/ subdir of repo
3. Synced repo's frontend/ → /app/frontend/ (replaced all code, kept node_modules/.env)
4. Synced repo's memory/ → /app/memory/ (full memory dir pull as requested)
5. Wrote all provided env vars to /app/frontend/.env
6. Ran `npm install --legacy-peer-deps` (repo uses package-lock.json)
7. Restarted frontend via supervisor

## Architecture
- Frontend only: React + CRA + craco, port 3000
- Backend: FastAPI (unchanged, not in use by this frontend)
- No code edits made — deployed as-is

## Env Variables Set
- REACT_APP_BACKEND_URL (platform URL preserved)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (all firebase vars)
- REACT_APP_CRM_BASE_URL / REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true

## Status
- App compiles: YES (webpack compiled with 1 warning — react-hooks/exhaustive-deps, expected)
- App responds on port 3000: YES (HTTP 200)
- Login page loads: YES (mygenie branding visible)
- API calls to preprod.mygenie.online: depends on backend availability (expected)

## Backlog / Next Steps
- Supply real env values when backend URLs change
- REACT_APP_CRM_API_KEYS entry for restaurant 509 was truncated in problem statement — placeholder used
- Hot reload: works via supervisor autorestart
