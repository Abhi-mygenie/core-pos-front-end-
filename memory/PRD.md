# Core POS Frontend Deployment - PRD

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `main`) directly into `/app` and run it as-is with no code edits.

## Architecture
- **Frontend**: React (CRA + Craco) running on port 3000 via supervisor
- **Backend**: FastAPI (existing platform backend, kept as-is)
- **No database changes** — frontend-only deployment

## What's Been Implemented (July 25, 2026)
- Cloned repo into staging dir, replaced `/app/frontend` with repo contents
- Preserved platform files: `.emergent/`, `.env` files (frontend + backend), supervisor configs
- Added placeholder env variables (`REACT_APP_API_BASE_URL`, Firebase, Google Maps, CRM, Socket) to prevent hard crashes
- Installed dependencies via `yarn install --ignore-engines`
- Frontend compiles and runs with 1 lint warning (non-blocking)
- App loads successfully showing MyGenie POS login page

## Env Variables (Placeholders)
All `REACT_APP_*` vars currently have placeholder values. User will supply real values later:
- `REACT_APP_API_BASE_URL` — MyGenie API endpoint
- `REACT_APP_SOCKET_URL` — WebSocket server
- `REACT_APP_FIREBASE_*` — Firebase config (auth, messaging, analytics)
- `REACT_APP_GOOGLE_MAPS_KEY` — Google Maps API key
- `REACT_APP_CRM_BASE_URL` / `REACT_APP_CRM_API_KEYS` — CRM integration

## Prioritized Backlog
- **P0**: User provides real `.env` values for API connectivity
- **P1**: Verify login flow works with real backend
- **P2**: Verify all POS features (orders, rooms, reports, etc.) work end-to-end
