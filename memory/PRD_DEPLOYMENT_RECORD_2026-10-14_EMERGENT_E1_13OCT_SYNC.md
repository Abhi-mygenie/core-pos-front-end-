# Deployment Record — 2026-10-14 (branch: 13oct)

## Summary
Fresh sync of `core-pos-front-end` repo (branch `13oct`) into the Emergent platform pod.

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 13oct

## What Was Done
1. Cloned branch `13oct` into `/tmp/pos-repo`
2. rsync'd `frontend/` contents into `/app/frontend/` (excluded node_modules)
3. rsync'd `memory/` contents into `/app/memory/` (52 files synced)
4. Written `/app/frontend/.env` with all provided env vars + platform REACT_APP_BACKEND_URL
5. Clean `yarn install --ignore-engines` from scratch (old node_modules removed first)
6. Supervisor frontend restarted — `webpack compiled with 1 warning` (lint warnings only, no errors)
7. HTTP 200 confirmed on port 3000

## .env Variables Set
- REACT_APP_BACKEND_URL (platform-managed)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (full set)
- REACT_APP_CRM_BASE_URL / REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- REACT_APP_SHOW_AUDIT_TAB=true

## Status
- Frontend: RUNNING (pid 760) — MyGenie POS login page visible
- Memory dir: 52 files synced from remote branch
- No code edits made — deployed as-is from branch 13oct
