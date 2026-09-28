# Re-pull Deployment Record — 2026-09-28

## Reason
Remote branch `21implement` has new commits. Fresh pull requested.

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 21implement

## What Was Preserved
- `/app/frontend/.env` — written fresh with all provided env vars
- `/app/backend/` — untouched
- `/app/.emergent/` — untouched
- `/app/memory/` — fully synced from repo branch

## What Was Re-pulled
- `/app/frontend/` — fully wiped and replaced with latest branch code (21implement)
- `/app/memory/` — fully replaced via rsync from repo

## Deployment Steps
1. Stopped supervisor frontend
2. Cleared `/app/frontend` (all source files, node_modules)
3. Copied `/tmp/pos-staging/frontend/` → `/app/frontend/`
4. Wrote `/app/frontend/.env` with all provided env variables
5. Synced `/tmp/pos-staging/memory/` → `/app/memory/` (rsync --delete)
6. `yarn install --ignore-engines` from `/app/frontend` — success (79s)
7. `sudo supervisorctl start frontend` — Compiled successfully, HTTP 200

## Result
- **LIVE**: Login page rendering, MyGenie branding visible
- Compiled with 0 fatal errors, 0 warnings (clean build)
- HTTP 200 on port 3000
- Hot reload active via webpack-dev-server

## Env Variables in /app/frontend/.env
- REACT_APP_BACKEND_URL=https://pos-frontend-live-1.preview.emergentagent.com
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (7 vars — API key, auth domain, project ID, storage bucket, messaging sender, app ID, measurement ID, VAPID key)
- REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
- REACT_APP_CRM_API_KEYS (3 tenant keys: 364, 475, 478 — note: 509 key was truncated in problem statement, omitted)
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true

## Known Notes
- REACT_APP_CRM_API_KEYS: tenant 509 key was cut off in the provided env vars — add manually when available
- `@emergentbase/overlay` not in repo deps → overlay degraded (non-fatal, platform cosmetic only)
- No lock file in repo — `yarn install` resolved fresh, generated yarn.lock
