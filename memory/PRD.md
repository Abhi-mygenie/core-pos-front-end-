# MyGenie POS Frontend — Deployment PRD

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `main`) directly into `/app` and run it as-is, with no code edits. Frontend-only deployment — no backend or database setup needed. Env variables to be added later by the user.

## Architecture
- **Frontend**: React 19.0.0 with CRACO (Create React App Configuration Override)
- **Backend**: FastAPI (default boilerplate, not part of the deployed repo's logic)
- **Process Manager**: Supervisor (frontend on port 3000, backend on port 8001)
- **External URL**: https://pos-app-preview-5.preview.emergentagent.com

## What's Been Implemented (2026-07-14)
1. Cloned repo contents into `/app`, preserving platform files (`.emergent`, `.git`, `.env`, `memory/`)
2. Installed dependencies via `yarn install` (no lockfile in repo — fresh resolve)
3. Added placeholder env variables to `/app/frontend/.env` to prevent hard crash (`REACT_APP_API_BASE_URL` is required at module load)
4. Frontend running via supervisor with hot reload enabled
5. All tests passed (6/6): server accessible, login page renders, no compilation errors

## Env Variables (Placeholders — User to Update)
- `REACT_APP_API_BASE_URL` — Main API endpoint (currently placeholder)
- `REACT_APP_SOCKET_URL` — WebSocket URL (currently placeholder)
- `REACT_APP_CRM_BASE_URL` — CRM API base (currently placeholder)
- `REACT_APP_GOOGLE_MAPS_KEY` — Google Maps key (empty)
- `REACT_APP_FIREBASE_*` — Firebase config (all empty)
- `REACT_APP_SHOW_AUDIT_TAB` — Audit tab visibility (false)

## Backlog / Next Steps
- **P0**: User provides real `.env` values for API, Firebase, Socket, CRM, Google Maps
- **P1**: Verify login flow works end-to-end with real API
- **P2**: Test all POS features (order entry, reports, settings) after env is configured
