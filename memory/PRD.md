# Core POS Frontend Deployment

## Problem Statement
Deploy existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `16-july-`) directly into `/app` and run as-is with no code edits.

## Architecture
- **Frontend**: React (CRA + Craco) on port 3000 via supervisor
- **Backend**: FastAPI on port 8001 via supervisor (from repo)
- **Database**: MongoDB (platform-managed)

## What's Been Implemented (2026-07-17)
- Phase 1: Backed up platform files (.emergent, .env files)
- Phase 2: Cloned repo contents into `/app`, restored platform files
- Phase 3: Installed dependencies via `yarn install` (frontend) and `pip install` (backend)
- Phase 4: Started dev server via supervisor (`yarn start` → `craco start`)
- Phase 5: Verified — webpack compiles successfully, HTTP 200 on port 3000

## Status
- Dev server running and compiling successfully
- Runtime error for missing `REACT_APP_API_BASE_URL` — expected until user provides env vars

## Required Environment Variables (for user to supply)
- REACT_APP_API_BASE_URL
- REACT_APP_SOCKET_URL
- REACT_APP_FIREBASE_API_KEY
- REACT_APP_FIREBASE_AUTH_DOMAIN
- REACT_APP_FIREBASE_PROJECT_ID
- REACT_APP_FIREBASE_STORAGE_BUCKET
- REACT_APP_FIREBASE_MESSAGING_SENDER_ID
- REACT_APP_FIREBASE_APP_ID
- REACT_APP_FIREBASE_MEASUREMENT_ID
- REACT_APP_FIREBASE_VAPID_KEY
- REACT_APP_GOOGLE_MAPS_KEY
- REACT_APP_CRM_BASE_URL
- REACT_APP_CRM_API_KEYS
- REACT_APP_SHOW_AUDIT_TAB

## Backlog
- P0: User to provide `.env` values to make app fully functional
- P1: Backend API connectivity verification once env vars are set
