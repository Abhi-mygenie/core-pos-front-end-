# Deployment Record — 2026-11-15 (Fresh Sync from GitHub)

## Summary
Full sync of `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch: main) into `/app`.

## What Was Done

### Phase 1 — Platform File Preservation
- Backed up `/app/.emergent/emergent.yml` (image: release-12112026-1, newer than repo's release-06112026-1)
- Backed up `/app/frontend/.env` (preserved REACT_APP_BACKEND_URL, ENABLE_HEALTH_CHECK)
- Backed up `/app/backend/.env` (preserved MONGO_URL, DB_NAME)

### Phase 2 — Repo Sync (rsync)
- Staged repo clone at `/tmp/repo-staging` (--depth=1)
- rsync'd 3,657 files from staging → `/app/`
  - Excluded: `.git`, `node_modules`, `.emergent`, `frontend/.env`, `backend/.env`, `test_reports`
- Fully replaced: `frontend/src/`, `frontend/public/`, `frontend/package.json`, `frontend/yarn.lock`, `memory/` (full history now in sync), `backend/server.py`, `backend/requirements.txt`

### Phase 3 — Platform Files Restored
- Restored `/app/.emergent/emergent.yml` with current (newer) image tag
- `/app/backend/.env` unchanged (MONGO_URL, DB_NAME preserved)

### Phase 4 — Frontend .env Written
All env vars from problem statement written to `/app/frontend/.env`:
- REACT_APP_BACKEND_URL (platform-managed, preserved)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (non-secret values populated; API key + VAPID key pending user entry)
- REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
- REACT_APP_GOOGLE_MAPS_KEY (pending user entry)
- CORS_ORIGINS=*, REACT_APP_SHOW_AUDIT_TAB=true

### Phase 5 — Dependency Install
- `yarn install` run in `/app/frontend/` (77s)
- Note: lockfile had stale entries from previous platform environment; yarn updated and saved new lockfile
- CRACO config handles ESM compat for firebase, recharts, d3-shape via webpack plugins

### Phase 6 — Supervisor Restart
- `sudo supervisorctl restart frontend`
- `webpack compiled with 1 warning` — compilation successful
- HTTP 200 on port 3000 confirmed

## Secrets Status
| Key | Status |
|-----|--------|
| REACT_APP_FIREBASE_API_KEY | Set (2026-11-15T07:00:53Z) |
| REACT_APP_FIREBASE_VAPID_KEY | Set (2026-11-15T07:00:53Z) |
| REACT_APP_GOOGLE_MAPS_KEY | Set (2026-11-15T07:00:53Z) |
| REACT_APP_CRM_API_KEYS | Placeholder `{}` — needs real values |
| All other Firebase fields | Set |

## Memory Dir Sync
Full `/app/memory/` is now in sync with GitHub main branch (3,600+ files synced including all investigation reports, change requests, backend briefs, deployment records, etc.)

## App Status
- Login page renders correctly at port 3000
- Branding: MyGenie — "Streamlined Hospitality. Exceptional Experience."
- Connects to `https://preprod.mygenie.online/` as API backend
