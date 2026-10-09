# Deployment Record — 2026-10-07 (Emergent E1)

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 5oct-1
- Deployed by: E1 (Emergent Agent)

## What was done
1. Cloned branch `5oct-1` to `/tmp/repo-inspect` for inspection
2. Stopped frontend supervisor process
3. Cleared `/app/frontend` (preserved `node_modules` for speed)
4. `rsync`'d repo's `frontend/` into `/app/frontend/`
5. Wrote `/app/frontend/.env` with all provided env variables:
   - REACT_APP_BACKEND_URL (platform protected)
   - WDS_SOCKET_PORT=443
   - REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
   - REACT_APP_SOCKET_URL=https://presocket.mygenie.online
   - Firebase config (API key, auth domain, project, storage, sender, app id, measurement id, vapid key)
   - REACT_APP_CRM_BASE_URL + REACT_APP_CRM_API_KEYS
   - REACT_APP_GOOGLE_MAPS_KEY
   - CORS_ORIGINS=*
   - REACT_APP_SHOW_AUDIT_TAB=true
6. Synced repo's `memory/` into `/app/memory/` via rsync
7. Ran `yarn install --ignore-engines` (no lockfile in repo; Node 20 compat flag needed for @testing-library/jest-dom@7)
8. Restarted frontend via supervisor (`yarn start` → `craco start`)

## Result
- Compiled with 1 warning (ESLint hooks, non-fatal)
- HTTP 200 on port 3000
- App renders: MyGenie POS login page visible

## Platform notes
- Supervisor config is READ-ONLY; frontend runs from `/app/frontend` via `yarn start`
- Backend/MongoDB scaffold preserved (untouched)
- Memory dir fully synced from remote branch 5oct-1
