# Core POS Frontend Deployment

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `main`) directly into `/app` and run it as-is with no code edits.

## Architecture
- **Frontend**: React (CRA + CRACO) running on port 3000 via supervisor
- **Repo Structure**: `frontend/` + `backend/` + `memory/` subdirectories
- **Package Manager**: Yarn (no lockfile in repo, generated on install with `--ignore-engines`)
- **Build Tool**: CRACO wrapping react-scripts

## What's Been Implemented (2026-07-22)
1. Cloned repo into `/app`, preserving platform files (`.emergent/`, `.env` files)
2. Installed all dependencies via `yarn install --ignore-engines`
3. Created placeholder `.env` with all required `REACT_APP_*` variables
4. Frontend running via supervisor on port 3000, compiles successfully
5. App renders login page (MyGenie POS)

## Environment Variables Needed (User to provide)
- `REACT_APP_API_BASE_URL` - MyGenie API backend URL
- `REACT_APP_CRM_BASE_URL` - CRM backend URL
- `REACT_APP_SOCKET_URL` - WebSocket server URL
- `REACT_APP_GOOGLE_MAPS_KEY` - Google Maps API key
- `REACT_APP_FIREBASE_*` - Firebase config (7 variables + VAPID key)

## Backlog
- P0: User provides real `.env` values for API connectivity
- P1: Backend deployment if needed
- P2: Firebase push notification setup
