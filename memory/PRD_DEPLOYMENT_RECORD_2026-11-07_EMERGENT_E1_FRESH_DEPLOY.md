# Deployment Record — 2026-11-07 (Emergent E1 Fresh Deploy)

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: main
- Cloned: /tmp/core-pos-staging → synced into /app/frontend via rsync

## What Was Done
1. Cloned the repo to /tmp/core-pos-staging
2. Rsync'd frontend/ contents into /app/frontend (preserving node_modules, .env)
3. Rsync'd memory/ contents from repo into /app/memory (full sync as requested)
4. Created /app/frontend/.env with all required env variables
5. Ran `yarn install` from /app/frontend — installed all new packages (firebase, xlsx, jspdf, etc.)
6. Restarted frontend via supervisor — compiled with 0 errors, 1 warning (eslint)
7. App confirmed running: HTTP 200 on port 3000, Mygenie POS login screen visible

## Environment Variables Set (/app/frontend/.env)
- REACT_APP_BACKEND_URL=https://mygenie-pos-ui-9--7zshdpqb.preview.emergentagent.com
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
- REACT_APP_CRM_API_KEYS= (empty — user to supply)
- REACT_APP_GOOGLE_MAPS_KEY= (empty — user to supply)
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true

## Build Output
- webpack compiled with 1 warning (react-hooks/exhaustive-deps ESLint — no code changes needed)
- 0 fatal errors

## Status
DEPLOYED AND RUNNING
