# MyGenie POS Frontend - PRD

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core1-temp.git`, branch `main`) directly into `/app` and run it as-is with no code edits. Frontend-only (React) — no backend or database setup needed.

## Architecture
- **Stack**: React (CRA with CRACO), TailwindCSS
- **Process Manager**: Supervisor (frontend on port 3000, bound to 0.0.0.0)
- **External APIs**: Firebase Auth/Storage/Messaging, Google Maps, CRM API, Socket.io
- **Structure**: `/app/frontend/` (React app), `/app/backend/` (minimal FastAPI), `/app/memory/` (project docs)

## Completed
- [2026-02-15] Full code sync from `core1-temp.git` main branch
  - Frontend `src/`, `public/`, `scripts/`, config files all in sync
  - Memory directory fully synced (158 new files from remote)
  - Dependencies installed via `yarn install`
  - `.env` configured with platform URL + user-provided environment variables
  - App compiles and runs successfully (webpack compiled with warnings only)
  - Login page renders correctly at preview URL
  - HTTP 200 verified

## Environment Variables
- `REACT_APP_BACKEND_URL` — Set to Emergent preview URL
- `WDS_SOCKET_PORT=443` — WebSocket port for hot reload
- `REACT_APP_API_BASE_URL` — MyGenie preprod API
- `REACT_APP_SOCKET_URL` — MyGenie socket server
- Firebase keys — Auth domain, project ID, storage bucket, messaging sender ID, app ID, measurement ID (API key and VAPID key need real values)
- CRM keys — Base URL set, API keys need real values
- Google Maps key — Needs real value
- `CORS_ORIGINS=*`
- `REACT_APP_SHOW_AUDIT_TAB=true`

## Pending
- P0: User to supply real values for masked/placeholder keys (Firebase API key, Firebase VAPID key, CRM API keys, Google Maps key) via secrets tool
