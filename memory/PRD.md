# PRD — MyGenie POS Frontend Deployment

## Problem Statement
Deploy the existing React frontend repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `socket-issue`) directly into `/app` and run it as-is with no code edits. Frontend-only; env variables to be supplied later by user; run dev version.

## What Was Done (2026-06)
- Backed up platform files (.emergent, backend/.env, frontend/.env, memory, test_reports) — copy kept at /app/.platform_backup
- Cleared /app and cloned repo branch `socket-issue` directly into /app (repo .git is at /app/.git)
- Repo layout matches platform: /app/frontend (CRA + craco, yarn.lock) and /app/backend
- Restored platform .env files; installed deps with `yarn install --frozen-lockfile` (no upgrades)
- Running under supervisor (`yarn start`, HOST=0.0.0.0, PORT=3000); compiled with lint warnings only
- Verified HTTP 200 and page renders (title: MyGenie POS)

## Known/Expected State
- Runtime error on load: `REACT_APP_API_BASE_URL is not set` — expected until user supplies env values
- Env vars the app reads: REACT_APP_API_BASE_URL, REACT_APP_SOCKET_URL, REACT_APP_CRM_BASE_URL, REACT_APP_CRM_API_KEYS, REACT_APP_GOOGLE_MAPS_KEY, REACT_APP_SHOW_AUDIT_TAB, REACT_APP_FIREBASE_* (API_KEY, APP_ID, AUTH_DOMAIN, MEASUREMENT_ID, MESSAGING_SENDER_ID, PROJECT_ID, STORAGE_BUCKET, VAPID_KEY)

## Next Tasks
- P0: User to provide env values → add to /app/frontend/.env → restart frontend
- P1: Verify app flows (login, POS screens, socket connection) once envs are in place
