# POS Frontend Deployment

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `main`) directly into `/app` and run it as-is with no code edits.

## Architecture
- **Frontend**: React + Craco (Create React App wrapper), runs on port 3000
- **Supervisor**: `frontend` program → `yarn start` → `craco start` from `/app/frontend`
- **Backend**: FastAPI (kept running as supervisor config is readonly)
- **MongoDB**: Local instance (kept running)

## What Was Done (2026-07-22)
- Cloned repo's `frontend/` subfolder into `/app/frontend/` (supervisor expects this path)
- Backed up platform `.env` (`REACT_APP_BACKEND_URL`, `WDS_SOCKET_PORT=443`, `ENABLE_HEALTH_CHECK=false`) and restored after copy
- Installed all dependencies with `yarn install --ignore-engines` (Node 20.20.2 vs required >=22 for jest-dom)
- Restarted frontend supervisor → webpack compiled successfully (1 warning, no errors)
- App serves HTTP 200 on port 3000

## Required .env Variables (user to fill in)
```
REACT_APP_API_BASE_URL=           # Laravel backend API base URL (REQUIRED — app crashes without this)
REACT_APP_CRM_BASE_URL=           # CRM service base URL
REACT_APP_SOCKET_URL=             # WebSocket server URL
REACT_APP_GOOGLE_MAPS_KEY=        # Google Maps API key
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_FIREBASE_MEASUREMENT_ID=
REACT_APP_FIREBASE_VAPID_KEY=
REACT_APP_SHOW_AUDIT_TAB=         # true/false
```

## Platform-preserved env (already in /app/frontend/.env)
```
WDS_SOCKET_PORT=443               # Required for hot reload via platform proxy
ENABLE_HEALTH_CHECK=false
```

## How to Add Env Values
1. Edit `/app/frontend/.env` and add the required variables above
2. Run: `sudo supervisorctl restart frontend`
3. App will reload and function normally

## Notes
- Repo has `craco.config.js` with `@emergentbase/visual-edits` section already commented out
- `REACT_APP_BACKEND_URL` in `.env` is a platform variable — leave it as-is
- The `@testing-library/jest-dom@6.10.0` requires Node >=22 (we have 20.20.2) — bypassed with `--ignore-engines`; tests not affected for dev server
