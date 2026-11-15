# Deployment Record — 2026-10-06 (Emergent Platform)

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 5oct-1
- Commit: c41d6b75

## What Was Done
1. Cloned branch `5oct-1` into `/tmp/repo-clone`
2. rsynced full repo contents into `/app` (excluding `node_modules`, `.env`, `test_reports`)
3. Restored `/app/backend/.env` (platform MONGO_URL / DB_NAME)
4. Wrote all provided env vars to `/app/frontend/.env`
5. Ran `yarn install --ignore-engines` in `/app/frontend/` (Node 20.20.2, `@testing-library/jest-dom@7` needs Node ≥22 — bypassed with flag, no code edits)
6. Restarted frontend supervisor — app compiles with 1 webpack DeprecationWarning, no fatal errors
7. Verified HTTP 200 on port 3000

## Env Variables Written to /app/frontend/.env
- REACT_APP_BACKEND_URL (platform URL)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- Firebase keys (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, MEASUREMENT_ID, VAPID_KEY)
- REACT_APP_CRM_BASE_URL / REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true

## Status
- App live at: https://core-pos-react-6.preview.emergentagent.com
- Login page rendered correctly (MyGenie branding, email/password form)
- Memory dir fully synced from remote branch 5oct-1
