# MyGenie Core POS Frontend - Deployment Record

## Original Problem Statement
Deploy the existing React frontend repo directly into `/app` and run it as-is, with no code edits.

- **Repo**: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- **Branch**: 21implement
- **Destination**: `/app/frontend` (platform constraint: supervisor runs frontend from `/app/frontend`)

## Architecture

- **Frontend only**: React (CRA + CRACO) app
- **Start command**: `yarn start` → `craco start`
- **Port**: 3000 (bound to 0.0.0.0)
- **Process manager**: supervisor (`/etc/supervisor/conf.d/`)
- **Backend**: Platform backend preserved at `/app/backend` (not used by this frontend)

## Deployment Steps Completed

### Phase 1: Backup
- Platform files backed up to `/tmp/platform_backup/`
- Preserved: `/app/backend/`, `/app/.emergent/`, `/app/memory/`, `/app/tests/`, `/app/test_reports/`

### Phase 2: Clone & Deploy
- Cloned branch `21implement` from repo to `/tmp/repo_staging`
- Replaced `/app/frontend/` contents with repo's `frontend/` directory (no code edits)
- Synced full memory directory from repo to `/app/memory/`

### Phase 3: Environment Variables
- Written to `/app/frontend/.env`:
  - `REACT_APP_BACKEND_URL` (platform URL preserved)
  - `WDS_SOCKET_PORT=443`
  - `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`
  - `REACT_APP_SOCKET_URL=https://presocket.mygenie.online`
  - Firebase config (API key, auth domain, project ID, storage bucket, etc.)
  - `REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api`
  - `REACT_APP_CRM_API_KEYS` (multi-store keys)
  - `REACT_APP_GOOGLE_MAPS_KEY`
  - `REACT_APP_SHOW_AUDIT_TAB=true`

### Phase 4: Install Dependencies
- No lockfile in repo → used `yarn install --ignore-engines`
- `--ignore-engines` needed: `@testing-library/jest-dom@7.0.1` requires Node >=22, platform runs Node 20.20.2
- All packages installed successfully; lockfile generated at `/app/frontend/yarn.lock`

### Phase 5: Start & Verify
- `sudo supervisorctl restart frontend`
- Status: **RUNNING** (pid stable, uptime confirmed)
- Compiled with 1 warning (no errors) — `react-hooks/exhaustive-deps` in report pages
- App responds on port 3000 — login screen renders correctly

## What's Running
- **MyGenie POS Login Screen**: Mygenie logo, "Streamlined Hospitality. Exceptional Experience.", email/password fields, LOG IN button
- All API calls point to `https://preprod.mygenie.online/` (pre-prod backend)
- WebSocket connects to `https://presocket.mygenie.online`
- Firebase configured for `mygenie-restaurant` project

## Date
2026-10-01
