# MyGenie POS Frontend — PRD

## Problem Statement
Deploy the MyGenie POS frontend from GitHub repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `27-may`) into `/app` on the Emergent platform.

## Architecture
- **Frontend**: React 19 + CRA + craco (port 3000, supervisor-managed)
- **External APIs**: `https://preprod.mygenie.online/` (backend), `https://presocket.mygenie.online` (socket)
- **Firebase**: Web SDK configured for `mygenie-restaurant` project
- **CRM**: `https://preprod-crm-build.preview.emergentagent.com/api`
- **Backend**: Placeholder FastAPI server (not part of app logic)

## Environment Variables (14 total)
- REACT_APP_BACKEND_URL (Emergent preview URL)
- WDS_SOCKET_PORT=443
- ENABLE_HEALTH_CHECK=false
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- Firebase config (7 vars): API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, MEASUREMENT_ID, VAPID_KEY
- REACT_APP_CRM_BASE_URL

## What's Been Implemented — 2026-05-27
- Cloned repo (branch 27-may) into /app
- Created /app/frontend/.env with all 14 supplied environment variables
- Installed all frontend dependencies via yarn
- Frontend compiles and runs successfully (1 pre-existing ESLint warning only)
- Login page verified: MyGenie logo, email/password fields, Remember me, Forgot Password, LOG IN button
- Testing agent verified 100% pass rate on all frontend checks

## Backlog / Next Action Items
- P0: No blocking issues — deployment complete
- P1: Login testing with real credentials (requires preprod account)
- P2: Address pre-existing ESLint warning in OrderEntry.jsx (useCallback dependency)
