# Deployment Record — 2026-11-26 Emergent E1 Fresh Deploy (Session 2)

## Session Type
Fresh deployment of existing React frontend repo into Emergent preview environment.

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 20261126_164747
- Destination: /app/frontend (supervisor-managed, port 3000)

## Steps Performed

### Phase 1 — Platform files preserved
- `/app/.emergent/` — platform config (kept in place)
- `/app/backend/` — untouched
- `/app/frontend/.env` — REACT_APP_BACKEND_URL, WDS_SOCKET_PORT, ENABLE_HEALTH_CHECK preserved
- `/app/memory/` — backed up and re-synced from repo

### Phase 2 — Repo cloned and synced
- Cloned branch 20261126_164747 to `/staging/`
- Confirmed repo structure: `frontend/` subfolder maps to `/app/frontend/`
- Synced `/staging/frontend/` → `/app/frontend/` via rsync (excluding node_modules, .env)
- Synced `/staging/memory/` → `/app/memory/` (76 files total including subdirs)

### Phase 3 — Dependencies installed
- Package manager: yarn (yarn.lock present)
- Command: `yarn install` (no upgrades — installed as locked)
- Result: success (warnings only, no errors)

### Phase 4 — Environment configured
Non-secret vars in `/app/frontend/.env`:
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, MEASUREMENT_ID
- REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
- REACT_APP_SHOW_AUDIT_TAB=true
- CORS_ORIGINS=*

Secret vars collected via secure card (Emergent secrets system):
- REACT_APP_FIREBASE_API_KEY ✓
- REACT_APP_FIREBASE_VAPID_KEY ✓
- REACT_APP_GOOGLE_MAPS_KEY ✓
- REACT_APP_CRM_API_KEYS ✓

### Phase 5 — Verified
- Supervisor status: RUNNING (pid confirmed)
- HTTP 200 on localhost:3000
- Login page screenshot confirmed (Mygenie branding, email/password fields)
- Frontend restarted after secret injection — all env vars live

## Memory Dir Sync
- 76 items in /app/memory/ — fully in sync with remote branch 20261126_164747
- Includes all BUG-*, INV-*, PRD_DEPLOYMENT_RECORD*, CHANGELOG, ROADMAP, subdirs

## Status
DEPLOYED — app running, all keys set
