# MyGenie POS Frontend Deployment PRD

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `17-july`) directly into `/app` and run it as-is with no code edits.

## Architecture
- **Frontend**: React (CRA + CRACO) running on port 3000 via supervisor
- **Backend**: Not applicable (frontend-only deployment)
- **Database**: Not applicable

## What's Been Implemented (Jul 17, 2026)
- Cloned repo branch `17-july` into staging directory
- Replaced `/app/frontend/` with repo's `frontend/` contents
- Preserved platform files: `.emergent/`, `backend/`, `memory/`, `.env`, supervisor configs
- Installed dependencies via `yarn install`
- Frontend running via supervisor with `craco start`
- Compiled successfully with 1 non-fatal warning (React hooks exhaustive-deps)
- App loads MyGenie POS login page correctly

## Environment Variables
- `.env` contains Firebase config, API URLs, Google Maps key, CRM keys
- User will add/update env values as needed

## Backlog
- P0: User to supply correct `.env` values for API calls to work
- P1: Backend setup if needed for API proxying
- P2: Production build (`yarn build`) for optimized deployment
