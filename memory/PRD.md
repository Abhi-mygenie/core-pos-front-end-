# POS Frontend Deployment PRD

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `main`) directly into `/app` and run it as-is, with no code edits.

## Architecture

- **Stack**: React (CRA via craco), deployed to `/app/frontend/`
- **Process Manager**: supervisor → `yarn start` from `/app/frontend/`
- **Port**: 3000 (0.0.0.0)
- **API**: `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`
- **Backend**: No backend changes; platform backend unchanged at `/app/backend/`

## Deployment Steps Completed

### Phase 1 – Prepare
- Preserved platform files: `/app/.emergent/`, `/app/backend/`, `/app/memory/` (pre-existing)

### Phase 2 – Clone
- Cloned `main` branch to `/tmp/core-pos-staging`
- Repo structure confirmed: `frontend/` subdir contains the React app
- Rsynced `frontend/` → `/app/frontend/` (excluding `.env` and `node_modules`)
- Rsynced `memory/` → `/app/memory/` (merged — 83 files)

### Phase 3 – Install Dependencies
- Package manager detected: `package-lock.json` → **npm**
- Ran `npm install --legacy-peer-deps` in `/app/frontend/`
- Installed 1,626 packages

### Phase 4 – Run
- Supervisor restarted: `sudo supervisorctl restart frontend`
- Compiled successfully (`craco start` via `yarn start`)

### Phase 5 – Verify
- HTTP 200 on port 3000 ✓
- Login screen renders correctly ✓
- Hot reload active ✓

## Environment Variables (`/app/frontend/.env`)
- REACT_APP_BACKEND_URL (platform URL preserved)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL, Firebase vars, CRM vars, Google Maps key, etc.

## What's Been Implemented
- Date: 2026-08-13
- Full repo cloned and deployed as-is (no code edits)
- All env vars written to `/app/frontend/.env`
- Memory dir fully populated (83 files from repo)

## Backlog / P0
- Supply correct REACT_APP_CRM_API_KEYS["509"] value (was truncated in problem statement)
- Validate login against `https://preprod.mygenie.online/` backend
