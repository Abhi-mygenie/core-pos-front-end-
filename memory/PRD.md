# MyGenie Core POS Frontend - Deployment PRD

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `main`) directly into `/app` and run it as-is with no code edits.

## Architecture
- **Frontend**: React (CRA + Craco) running on port 3000 via supervisor
- **Backend**: FastAPI on port 8001 (template, not used by this repo)
- **Process Manager**: Supervisor
- **Source Repo**: https://github.com/Abhi-mygenie/core-pos-front-end-.git

## What's Been Implemented (2026-07-25)
- Cloned repo into `/app` preserving platform structure
- Backed up and restored platform files (.emergent, .env files)
- Installed dependencies with `yarn install --ignore-engines`
- Added placeholder env variables for `REACT_APP_API_BASE_URL` and other required vars
- Frontend compiles and renders successfully (login page visible)

## Placeholder Env Variables (need real values)
- `REACT_APP_API_BASE_URL` - MyGenie API backend URL
- `REACT_APP_SOCKET_URL` - Socket.IO server URL
- `REACT_APP_CRM_BASE_URL` - CRM base URL
- `REACT_APP_GOOGLE_MAPS_KEY` - Google Maps API key
- `REACT_APP_FIREBASE_*` - Firebase configuration (7 keys)

## Next Actions (P0)
- User supplies real `.env` values for API and Firebase
- Verify login and full app functionality with real backend

## Backlog
- P1: Connect to real MyGenie backend API
- P2: Configure Firebase for push notifications
- P2: Set up production build (`yarn build`)
