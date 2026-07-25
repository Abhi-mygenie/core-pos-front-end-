# MyGenie POS Frontend - Deployment PRD

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `swiggy`) directly into `/app` and run it as-is, with no code edits.

## Architecture
- **Frontend**: React (CRA + CRACO) on port 3000
- **Backend**: FastAPI on port 8001 (from repo)
- **Process Manager**: Supervisor

## What's Been Implemented (2026-07-25)
- Cloned repo (branch `swiggy`) into platform structure
- Preserved platform files (`.emergent/`, supervisor configs, `.env` files)
- Installed frontend dependencies via `yarn install --ignore-engines`
- Added placeholder `.env` vars for `REACT_APP_API_BASE_URL`, `REACT_APP_SOCKET_URL`, Firebase config, etc.
- Frontend compiles and serves successfully on port 3000
- Backend running on port 8001

## Environment Variables (frontend/.env)
- `REACT_APP_API_BASE_URL` - **PLACEHOLDER** - needs real API URL
- `REACT_APP_SOCKET_URL` - **PLACEHOLDER** - needs real socket URL  
- `REACT_APP_FIREBASE_*` - **PLACEHOLDER** - needs real Firebase config
- `REACT_APP_GOOGLE_MAPS_KEY` - **PLACEHOLDER**
- `REACT_APP_CRM_BASE_URL` - **PLACEHOLDER**

## Backlog
- P0: User to provide real `.env` values for API/Socket/Firebase
- P1: Verify login flow works end-to-end with real backend
- P2: Verify all app routes and features function correctly
