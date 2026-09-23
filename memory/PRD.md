# Mygenie Core POS Frontend — Deployment Record

## Problem Statement
Deploy the existing React frontend repo (branch: 21implement) from https://github.com/Abhi-mygenie/core-pos-front-end-.git directly into `/app` and run it as-is, with no code edits.

## Architecture
- **Frontend only**: React (CRA + craco) running on port 3000 via supervisor
- **Backend**: Unchanged FastAPI at /app/backend (identical to repo)
- **No database changes required** for the POS frontend

## What Was Done

### 2026-09-23 — Initial Deployment
1. **Staged clone**: `git clone --branch 21implement <repo> /tmp/pos-staging`
2. **Replaced /app/frontend**: Cleared existing frontend, copied repo's `frontend/` contents into `/app/frontend/`
3. **Environment setup**: Created `/app/frontend/.env` with all provided env vars + preserved platform vars (`REACT_APP_BACKEND_URL`, `ENABLE_HEALTH_CHECK`)
4. **Dependency install**: `yarn install --ignore-engines` (Node 20 vs @testing-library/jest-dom@7 engine requirement)
5. **Supervisor restart**: `sudo supervisorctl restart frontend`
6. **Verified**: HTTP 200 on port 3000, webpack compiled with 1 warning (ESLint only)

## Repo Structure (branch: 21implement)
- `frontend/` → deployed to `/app/frontend/`
- `backend/` → identical to existing `/app/backend/` (no change needed)
- `memory/` → preserved platform memory

## Key Technologies
- React 18 + craco (Create React App + custom webpack config)
- Firebase auth, Socket.io, jspdf, react-router-dom 7.5.1
- Tailwind CSS + Radix UI + shadcn components

## Environment Variables (in /app/frontend/.env)
- REACT_APP_BACKEND_URL (platform)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (all Firebase config keys)
- REACT_APP_CRM_BASE_URL, REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- REACT_APP_SHOW_AUDIT_TAB=true

## Known Notes
- `REACT_APP_CRM_API_KEYS` value for key "509" was truncated in the problem statement — set to empty string placeholder
- Supervisor config is READONLY; frontend runs from `/app/frontend` as configured
- ESLint react-hooks/exhaustive-deps warnings are non-blocking (app compiles and runs)

## Backlog / Next Steps
- Provide complete `REACT_APP_CRM_API_KEYS` value for outlet 509
- Supply any additional `.env` values once known
- Test full login flow with preprod.mygenie.online credentials
