# Deployment Record — 2026-10-17 (Emergent E1 Deploy 2)

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: main
- Deployed: 2026-10-17

## What Was Done
1. Stopped frontend supervisor process
2. Cloned repo (main branch) into /tmp/pos-staging
3. Replaced /app/frontend with repo's frontend/ directory (no code edits)
4. Replaced /app/memory with repo's memory/ directory (57 files, per user instruction)
5. Wrote /app/frontend/.env with all provided env variables + preserved REACT_APP_BACKEND_URL
6. Ran `yarn install` from /app/frontend (yarn@1.22.22, CRACO/CRA setup)
7. Restarted frontend supervisor process
8. Verified: compiled successfully, HTTP 200 on port 3000

## Preserved Platform Files
- /app/.emergent/
- /app/backend/
- /app/tests/
- /app/test_reports/
- Supervisor configs (/etc/supervisor/conf.d/) — not modified
- REACT_APP_BACKEND_URL in /app/frontend/.env

## Env Variables Set
- REACT_APP_BACKEND_URL (platform preview URL, preserved)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID / STORAGE_BUCKET / MESSAGING_SENDER_ID / APP_ID / MEASUREMENT_ID / VAPID_KEY
- REACT_APP_CRM_BASE_URL / CRM_API_KEYS (note: CRM_API_KEYS value was truncated in source — "509" entry has placeholder value)
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true

## Notes
- No yarn.lock in repo — yarn generated one on install
- Deprecation warnings from webpack (non-fatal, app compiles cleanly)
- Backend unchanged (frontend-only deployment)
