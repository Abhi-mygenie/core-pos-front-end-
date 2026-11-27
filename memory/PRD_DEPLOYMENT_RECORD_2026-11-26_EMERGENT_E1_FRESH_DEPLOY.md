# Deployment Record — 2026-11-26 Emergent E1 Fresh Deploy

## Session Type
Fresh deployment of existing React frontend repo into Emergent preview environment.

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 20261125-150905
- Destination: /app/frontend (supervisor-managed, port 3000)

## Steps Performed

### Phase 1 — Platform files preserved
- `/app/.emergent/` — platform config (kept in place)
- `/app/backend/` — untouched (no backend changes required)
- `/app/frontend/.env` — preserved then updated with new env vars
- `/app/memory/` — synced from repo (74 files + platform .gitkeep = 75 total)

### Phase 2 — Repo cloned and synced
- Cloned repo to `/tmp/repo-inspect` for inspection
- Confirmed repo structure: `frontend/` subfolder maps directly to `/app/frontend/`
- Cleared old `/app/frontend/` contents (kept `.env`)
- Copied repo `frontend/` contents → `/app/frontend/`
- Synced repo `memory/` contents → `/app/memory/` (full memory dir pull)

### Phase 3 — Dependencies installed
- Package manager: yarn (yarn.lock present)
- Command: `yarn install --frozen-lockfile`
- Result: success, 75.88s

### Phase 4 — Environment configured
Non-secret vars appended to `/app/frontend/.env`:
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, MEASUREMENT_ID
- REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
- REACT_APP_SHOW_AUDIT_TAB=true

Secret vars collected via secure card (Emergent secrets system):
- REACT_APP_FIREBASE_API_KEY ✓
- REACT_APP_FIREBASE_VAPID_KEY ✓
- REACT_APP_GOOGLE_MAPS_KEY ✓
- REACT_APP_CRM_API_KEYS — placeholder (user to supply real value)

### Phase 5 — Started and verified
- Supervisor command: `yarn start` (craco start) from `/app/frontend`
- Port: 3000, bound to 0.0.0.0
- Compilation: webpack compiled with 1 warning (ESLint hook warnings only — non-fatal)
- HTTP check: localhost:3000 → 200 OK
- UI check: MyGenie POS login screen loads correctly

## Status
DEPLOYED — RUNNING

## Preview URL
https://pos-core-app--6gve4gt4.preview.emergentagent.com

## Notes
- No code edits made — deployed as-is per requirements
- REACT_APP_CRM_API_KEYS holds a placeholder; real JSON value to be updated via secrets card
- Backend and MongoDB not modified (frontend-only deploy)
- Memory dir in full sync with remote branch 20261125-150905
