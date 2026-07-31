# MyGenie Core POS Frontend Deployment

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `main`) directly into `/app` and run as-is with no code edits.

## Architecture
- **Frontend**: React (CRA + Craco) on port 3000, managed by supervisor
- **Backend**: FastAPI on port 8001 (repo's existing stub)
- **External APIs**: Firebase Auth, preprod.mygenie.online API, CRM API, Google Maps, Socket.io

## What's Been Implemented (2026-07-31)
- Cloned repo into `/app`, preserving platform files (.emergent, supervisor, .env)
- Installed frontend dependencies via `yarn install --ignore-engines`
- Installed backend dependencies via `pip install`
- Configured `.env` with real credentials (Firebase, API base URL, socket, CRM, Google Maps)
- Registered with supervisor; dev server compiles and serves on port 3000
- Webpack compiles with only lint warnings (no fatal errors)

## Env Variables Configured
- REACT_APP_API_BASE_URL, REACT_APP_CRM_BASE_URL, REACT_APP_SOCKET_URL
- Firebase config (API key, auth domain, project ID, storage bucket, etc.)
- REACT_APP_GOOGLE_MAPS_KEY, REACT_APP_SHOW_AUDIT_TAB

## Next Action Items
- P0: Verify login flow works end-to-end with real credentials
- P1: Add any missing env vars as needed when features fail
- P2: Set up production build (`yarn build`) if needed
