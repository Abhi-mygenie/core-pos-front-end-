# MyGenie Core POS Frontend — Deployment Record

## Original Problem Statement
Deploy the existing React frontend repo directly into `/app` and run it as-is, with no code edits.

- Repo: `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
- Branch: `pms18sep`
- Destination: `/app/frontend` (platform supervisor runs `yarn start` from here)

## Architecture

- **Frontend**: React (CRA + CRACO) — runs on port 3000 via supervisor
- **Backend**: FastAPI — runs on port 8001 via supervisor (platform default, untouched)
- **DB**: MongoDB (platform default, untouched)

## What Was Done (Sep 20, 2026)

1. Backed up platform files: `/app/memory`, `/app/backend`, `/app/.emergent`, `/app/test_reports`, `/app/tests`
2. Stopped frontend supervisor process
3. Cleared `/app/frontend` entirely
4. Cloned `pms18sep` branch of `https://github.com/Abhi-mygenie/core-pos-front-end-.git` to `/tmp/core-pos-repo`
5. Copied repo's `frontend/` contents into `/app/frontend/`
6. Restored all platform files to `/app` root
7. Wrote `/app/frontend/.env` with all provided env vars
8. Ran `yarn install --ignore-engines` (Node 20 vs package requiring >=22, bypassed safely)
9. Started frontend via `sudo supervisorctl start frontend`
10. Verified: `Compiled successfully!` in logs, HTTP 200 on port 3000, login page renders

## Environment Variables (frontend/.env)

- REACT_APP_BACKEND_URL (platform URL)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (all Firebase keys set)
- REACT_APP_CRM_BASE_URL, REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- REACT_APP_SHOW_AUDIT_TAB=true

## Status

- App: RUNNING (supervisor, pid active)
- Compilation: SUCCESS (no errors)
- Login page: renders correctly

## Backlog / Notes

- REACT_APP_CRM_API_KEYS entry for key "509" is placeholder — update with real value when available
- API calls will route to preprod.mygenie.online — ensure credentials are valid for that env
- No backend changes made; FastAPI backend still runs (platform default)
