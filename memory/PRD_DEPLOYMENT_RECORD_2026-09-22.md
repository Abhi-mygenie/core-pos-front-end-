# MyGenie Core POS Frontend — Deployment Record

## Date: 2026-09-22

## Problem Statement
Deploy the existing React frontend repo (core-pos-front-end-) directly into /app/frontend and run it as-is, with no code edits.

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 22-impplement

## Architecture
- Frontend-only React app (no backend needed)
- React + CRACO build toolchain
- Supervisor runs `yarn start` from `/app/frontend` on port 3000
- Backend supervisor config preserved (runs from /app/backend on port 8001)

## What Was Done
1. Cloned repo to /tmp/repo-staging (branch: 22-impplement)
2. Stopped frontend supervisor process
3. Cleared /app/frontend/ contents (removed old platform frontend)
4. Copied repo's `frontend/` directory contents into /app/frontend/
5. Written .env with all provided env variables + platform REACT_APP_BACKEND_URL
6. Ran `yarn install --ignore-engines` (Node 20 vs jest-dom requiring 22)
7. Restarted frontend via supervisor
8. Verified: app compiles successfully and serves the MyGenie login UI on port 3000

## Env Variables Set (/app/frontend/.env)
- REACT_APP_BACKEND_URL (platform URL)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (full Firebase config)
- REACT_APP_CRM_BASE_URL + REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true

## Status
- App is RUNNING and serving MyGenie POS login screen
- Compiled successfully with `craco start`
- Hot reload active via supervisor autorestart

## Platform Files Preserved
- /app/.emergent/ (platform config)
- /app/backend/ (FastAPI backend, untouched)
- /app/memory/ (memory directory)
- /app/test_reports/
