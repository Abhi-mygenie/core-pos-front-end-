# PRD - MyGenie POS Frontend Deployment

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `main`) directly into `/app` and run it as-is with no code edits.

## Architecture
- **Frontend**: React (CRA + Craco) running on port 3000 via supervisor
- **Backend**: FastAPI placeholder (not used by this frontend - connects to external APIs)
- **External APIs**: preprod.mygenie.online, presocket.mygenie.online, Firebase, Google Maps, CRM

## What's Been Implemented (2026-07-30)
- Cloned repo from GitHub into `/app`
- Preserved platform files (`.emergent`, supervisor configs, backend `.env`)
- Created frontend `.env` with all user-provided env variables (Firebase, Google Maps, CRM, Socket, API keys)
- Installed dependencies via `yarn install --ignore-engines`
- Frontend compiles successfully (1 non-fatal warning)
- App is live and serving the MyGenie POS login page

## Status: DEPLOYED & RUNNING ✓
