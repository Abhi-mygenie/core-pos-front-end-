# MyGenie Core POS — Deployment Record

## Original Problem Statement
Deploy the existing React frontend repo (core-pos-front-end) directly into `/app` and run it as-is, with no code edits.

- Repo: `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
- Branch: `pms18sep`
- Destination: `/app/frontend` (repo's own `frontend/` subfolder maps to platform's expected location)

## Architecture
- **Frontend only**: React 19 + CRA (via react-scripts 5.0.1 + CRACO)
- **No backend changes**: Platform FastAPI backend at `/app/backend/` preserved
- **Supervisor**: `[program:frontend]` runs `yarn start` from `directory=/app/frontend`
- **Port**: 3000 (HOST=0.0.0.0)

## Deployment Steps Completed (Date: Sep 21 2025)

### Phase 1 — Backup
- Backed up `/app/backend/`, `/app/memory/`, `/app/.emergent/`, `/app/tests/`, `/app/test_reports/` to `/root/pos-backup/`

### Phase 2 — Fresh Clone
- Cloned `pms18sep` branch from `https://github.com/Abhi-mygenie/core-pos-front-end-.git` to `/root/pos-staging`
- Replaced `/app/frontend/` with the repo's `frontend/` folder contents
- Platform backend, memory, .emergent dirs preserved

### Phase 3 — Env Setup
- Created `/app/frontend/.env` with all provided env variables:
  - `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`
  - `REACT_APP_SOCKET_URL=https://presocket.mygenie.online`
  - All Firebase, CRM, Google Maps, and feature flag vars

### Phase 4 — Dependencies
- `yarn install --ignore-engines` (Node 20 vs @testing-library/jest-dom@7 engine conflict)
- Explicitly hoisted `babel-loader@^8.2.3`, `html-webpack-plugin@^5.5.0`, `@pmmmwh/react-refresh-webpack-plugin@^0.5.3` to top-level node_modules (yarn nesting issue with react-scripts internals)

### Phase 5 — Start
- `sudo supervisorctl restart frontend`
- Compiled with 1 ESLint warning only (`react-hooks/exhaustive-deps` — non-blocking)
- App live at: https://core-pos-deploy-20.preview.emergentagent.com

## Status
- **LIVE**: Login page rendering, API calls pointing to `preprod.mygenie.online`
- Backend: Platform backend preserved (FastAPI on port 8001)
- Hot reload: Active via webpack-dev-server

## Known Notes
- `@emergentbase/overlay` not present → overlay degraded (non-fatal, platform cosmetic only)
- ESLint warnings in reports module (exhaustive-deps) — non-blocking
- Node engine version: 20.20.2 (repo requires >=22 for jest-dom; ignored for dev server)

## Env Variables in /app/frontend/.env
- REACT_APP_BACKEND_URL (platform url)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL
- REACT_APP_SOCKET_URL
- REACT_APP_FIREBASE_* (6 vars)
- REACT_APP_CRM_BASE_URL, REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- REACT_APP_SHOW_AUDIT_TAB=true
