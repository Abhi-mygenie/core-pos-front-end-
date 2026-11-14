# Deployment Record — 2026-10-18 (Emergent E1 Fresh Deploy)

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: main
- Deployed by: Emergent E1

## What Was Done
1. Cloned `main` branch to `/tmp/pos-staging`
2. Stopped frontend supervisor
3. Cleared `/app/frontend/` and replaced with repo's `frontend/` directory
4. Synced full `/app/memory/` from repo's `memory/` directory (rsync)
5. Wrote `/app/frontend/.env` with all user-supplied env variables + platform REACT_APP_BACKEND_URL
6. Ran `yarn install` (no lockfile in repo — resolved fresh; `.yarnrc` has `ignore-engines true`)
7. Restarted frontend via supervisor — compiled successfully on port 3000

## Env Variables Set
- REACT_APP_BACKEND_URL=https://pos-frontend-app-6.preview.emergentagent.com
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID / STORAGE_BUCKET / MESSAGING_SENDER_ID / APP_ID / MEASUREMENT_ID / VAPID_KEY
- REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
- REACT_APP_GOOGLE_MAPS_KEY=...
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true
- ENABLE_HEALTH_CHECK=false

## Status
- Frontend: RUNNING on port 3000 (pid 894)
- App renders: MyGenie POS login screen confirmed via screenshot
- Memory dir: 59 files (58 from remote + test_credentials.md)
- No code edits made — deployed as-is
