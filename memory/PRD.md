# Mygenie Core POS – Frontend Deployment PRD

## Original Problem Statement
Deploy the existing React frontend repo directly into /app and run it as-is, with no code edits.
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 20261126_164747
- Destination: /app (repo contents pulled directly into /app, not a subfolder)

## Architecture
- **Frontend**: React 19 (CRA + CRACO), running via supervisor from `/app/frontend`
- **Backend**: FastAPI (minimal, platform stub) at `/app/backend`
- **Process Manager**: Supervisor → `yarn start` from `/app/frontend` on port 3000
- **API Target**: `https://preprod.mygenie.online/` (external)
- **Socket**: `https://presocket.mygenie.online`

## What's Been Implemented (2026-11-26)
- Cloned branch `20261126_164747` from `https://github.com/Abhi-mygenie/core-pos-front-end-.git` into `/staging/`
- Synced `/staging/frontend/` → `/app/frontend/` (all source files, excluding node_modules and .env)
- Synced `/staging/memory/` → `/app/memory/` (full memory/investigation reports)
- Preserved platform files: `.emergent/`, `backend/.env`, `frontend/.env` (REACT_APP_BACKEND_URL, WDS_SOCKET_PORT, ENABLE_HEALTH_CHECK)
- Created `/app/frontend/.env` with all env vars from problem statement
- Ran `yarn install` from lockfile (no upgrades)
- Frontend running on port 3000, responding 200, login page confirmed via screenshot
- All 4 missing secrets collected and injected via secrets manager:
  - REACT_APP_FIREBASE_API_KEY
  - REACT_APP_FIREBASE_VAPID_KEY
  - REACT_APP_GOOGLE_MAPS_KEY
  - REACT_APP_CRM_API_KEYS
- Frontend restarted to pick up new secrets

## Environment Variables (all set)
| Key | Status |
|-----|--------|
| REACT_APP_API_BASE_URL | set (https://preprod.mygenie.online/) |
| REACT_APP_SOCKET_URL | set |
| REACT_APP_FIREBASE_API_KEY | set via secrets |
| REACT_APP_FIREBASE_AUTH_DOMAIN | set |
| REACT_APP_FIREBASE_PROJECT_ID | set |
| REACT_APP_FIREBASE_STORAGE_BUCKET | set |
| REACT_APP_FIREBASE_MESSAGING_SENDER_ID | set |
| REACT_APP_FIREBASE_APP_ID | set |
| REACT_APP_FIREBASE_MEASUREMENT_ID | set |
| REACT_APP_FIREBASE_VAPID_KEY | set via secrets |
| REACT_APP_CRM_BASE_URL | set |
| REACT_APP_CRM_API_KEYS | set via secrets |
| REACT_APP_GOOGLE_MAPS_KEY | set via secrets |
| REACT_APP_SHOW_AUDIT_TAB | true |
| CORS_ORIGINS | * |

## Backlog / Next Steps
- P0: Verify login flow connects correctly to preprod API
- P0: Confirm Firebase push notifications working (VAPID key now set)
- P1: Deploy to production (publish)
- P1: Confirm Google Maps feature working in POS
- P2: Set up CI/CD for future branch deploys
