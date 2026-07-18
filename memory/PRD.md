# PRD — Core POS Frontend Deployment

## Problem Statement
Deploy the existing React frontend repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `main`) directly into `/app` and run it as-is with no code edits. Env variables to be supplied by user later. Run dev version.

## Architecture / What Was Done (June 2026)
- Backed up platform files (.emergent, frontend/.env, backend/.env, old .git → /root/platform_backup)
- Cleared /app and cloned repo main branch directly into /app (repo's own .git now in /app)
- Repo already matches platform layout: /app/frontend (CRA + craco), /app/backend (FastAPI template)
- Restored .emergent, frontend/.env (REACT_APP_BACKEND_URL, WDS_SOCKET_PORT), backend/.env (MONGO_URL, DB_NAME)
- yarn install --frozen-lockfile in /app/frontend (no dependency changes)
- Running under supervisor: frontend = `yarn start` (craco, port 3000), backend = uvicorn 8001
- Verified: webpack compiles (lint warnings only), HTTP 200 on localhost:3000, preview URL, and /api/

## Env Vars Required by Repo (user to supply in /app/frontend/.env)
REACT_APP_API_BASE_URL (app throws at boot without it), REACT_APP_CRM_BASE_URL, REACT_APP_SOCKET_URL, REACT_APP_GOOGLE_MAPS_KEY, REACT_APP_SHOW_AUDIT_TAB, REACT_APP_FIREBASE_* (API_KEY, APP_ID, AUTH_DOMAIN, MEASUREMENT_ID, MESSAGING_SENDER_ID, PROJECT_ID, STORAGE_BUCKET, VAPID_KEY)

## Next Tasks
- P0: User supplies env values → add to /app/frontend/.env → restart frontend
- P1: Verify app UI loads fully once API base URL is set
