# Deployment Record — 2026-10-08 (Emergent E1 Deploy 4)

## Summary
Deployed `core-pos-front-end-` repo (branch: `5oct-1`) into `/app/frontend` on the Emergent platform.

## What Was Done

### Phase 1 — Prepare
- Backed up `/app/frontend/.env` (preserved `REACT_APP_BACKEND_URL`)
- Backed up `/app/memory/` (restored after clone)

### Phase 2 — Clone
- Cloned `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `5oct-1`) into `/tmp/pos-repo`
- Copied `/tmp/pos-repo/frontend/` → `/app/frontend/` (replaced existing platform frontend)
- Synced `/tmp/pos-repo/memory/` → `/app/memory/` (full memory dir pulled)

### Phase 3 — Dependencies
- Package manager: yarn (no lockfile in repo → fresh yarn.lock generated)
- Installed with `yarn install --ignore-engines` (Node 20 compat flag for @testing-library/jest-dom@7)
- 911 packages installed

### Phase 4 — Run
- Start command: `craco start` (via `yarn start`)
- Supervisor program: `frontend`, directory `/app/frontend`, port 3000
- Supervisor status: RUNNING

### Phase 5 — Verification
- HTTP 200 on port 3000 ✓
- App renders MyGenie POS login screen ✓
- 15 REACT_APP env vars configured ✓
- 36 memory files synced ✓

## Env Variables Set
- `REACT_APP_BACKEND_URL` (platform URL — preserved)
- `WDS_SOCKET_PORT=443`
- `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`
- `REACT_APP_SOCKET_URL=https://presocket.mygenie.online`
- All Firebase keys configured
- `REACT_APP_CRM_BASE_URL`, `REACT_APP_CRM_API_KEYS`
- `REACT_APP_GOOGLE_MAPS_KEY`
- `REACT_APP_SHOW_AUDIT_TAB=true`
