# Deployment Record — 2026-09-24

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 21implement
- Destination: /app/frontend (platform supervisor constraint)

## What Was Done
1. Cloned branch `21implement` to /tmp/pos-repo
2. Cleared /app/frontend contents
3. Copied repo's frontend/ into /app/frontend/
4. Synced repo's memory/ into /app/memory/
5. Created /app/frontend/.env with all provided env variables
6. Ran `yarn install --ignore-engines` (Node 20 / jest-dom engine mismatch bypassed)
7. Restarted supervisor frontend process

## Result
- webpack compiled with 1 warning (no errors)
- App responding HTTP 200 on port 3000
- Login screen visible at https://react-app-deploy-15.preview.emergentagent.com

## Env Variables Set
- REACT_APP_BACKEND_URL (platform URL preserved)
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (all Firebase config keys)
- REACT_APP_CRM_BASE_URL + REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- REACT_APP_SHOW_AUDIT_TAB=true
- WDS_SOCKET_PORT=443
- CORS_ORIGINS=*

## Platform Files Preserved
- /app/.emergent/ (platform metadata)
- /app/backend/.env (MONGO_URL, DB_NAME)
- /app/test_reports/
- Supervisor configs (readonly, untouched)
