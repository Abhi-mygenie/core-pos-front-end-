# Deployment Record — 2026-10-10 — Branch: 5oct-1

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 5oct-1
- Deployed by: Emergent E1

## What was done

### Phase 1: Prep
- Identified platform-critical files to preserve: `/app/.emergent/`, `/app/backend/`, `/app/memory/`, supervisor configs (READONLY)
- Noted supervisor is READONLY; frontend runs from `/app/frontend` at port 3000 via `yarn start` (craco)

### Phase 2: Clone
- Cloned repo to `/tmp/pos-repo` (branch 5oct-1)
- Confirmed repo structure mirrors the platform layout: `frontend/`, `memory/`, `backend/`, etc.
- React app lives at `frontend/` within the repo

### Phase 3: Memory Sync
- Synced `/tmp/pos-repo/memory/*` → `/app/memory/` (45 files, full sync confirmed)

### Phase 4: Frontend Deploy
- Cleared old `/app/frontend/` contents (src, public, package.json, plugins, webpack-shims, etc.)
- Copied all repo `frontend/` contents into `/app/frontend/`
- Created `/app/frontend/.env` with all env vars from problem statement + platform `REACT_APP_BACKEND_URL`

### Phase 5: Install
- Ran `yarn install --ignore-engines` (Node v20 incompatible with @firebase/ai@3.0.0 engine constraint — bypassed with flag)
- All packages installed successfully (57s)

### Phase 6: Start
- `sudo supervisorctl start frontend` → RUNNING (pid 1040)
- `webpack compiled successfully` — zero fatal errors
- App confirmed live at https://genie-pos-preview.preview.emergentagent.com — MyGenie login page rendered

## Env Variables Set
- REACT_APP_BACKEND_URL (platform URL)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (all 7 Firebase keys)
- REACT_APP_CRM_BASE_URL + REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true

## Status
- Frontend: RUNNING on port 3000
- Compilation: SUCCESS (no errors, non-fatal webpack deprecation warnings only)
- Memory dir: SYNCED (45 files from branch 5oct-1)
