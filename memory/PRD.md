# MyGenie POS Frontend - Deployment PRD

## Original Problem Statement
Deploy the frontend project from Git repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `24-may`) into the Emergent environment at `/app`. Frontend-only React project using CRACO, React 19, Yarn.

## Architecture
- **Frontend**: React 19.0.0 + CRACO v7.1.0 + Tailwind CSS
- **Package Manager**: Yarn 1.22.22
- **Node**: v20.20.2
- **Backend API**: External - `https://preprod.mygenie.online/`
- **Socket**: `https://presocket.mygenie.online`
- **Firebase**: Configured for push notifications and auth
- **CRM API**: `https://loyalty-trigger-fix.preview.emergentagent.com/api`

## What's Been Implemented (May 24, 2026)
- Cloned repo from `24-may` branch
- Copied all frontend source files (src, public, plugins, configs) into `/app/frontend`
- Created `.env` with all 14 environment variables
- Installed all dependencies via `yarn install`
- Frontend compiled successfully (1 minor ESLint warning - non-blocking)
- App accessible at `https://react-pos-build-11.preview.emergentagent.com`
- Login page rendering correctly with MyGenie branding

## Environment Variables Configured
| Variable | Value |
|----------|-------|
| REACT_APP_BACKEND_URL | https://react-pos-build-11.preview.emergentagent.com |
| WDS_SOCKET_PORT | 443 |
| ENABLE_HEALTH_CHECK | false |
| REACT_APP_API_BASE_URL | https://preprod.mygenie.online/ |
| REACT_APP_SOCKET_URL | https://presocket.mygenie.online |
| REACT_APP_FIREBASE_API_KEY | AIzaSyCvn7MctrSgULjgiHqQSl4QfeP3dWxITwY |
| REACT_APP_FIREBASE_AUTH_DOMAIN | mygenie-restaurant.firebaseapp.com |
| REACT_APP_FIREBASE_PROJECT_ID | mygenie-restaurant |
| REACT_APP_FIREBASE_STORAGE_BUCKET | mygenie-restaurant.firebasestorage.app |
| REACT_APP_FIREBASE_MESSAGING_SENDER_ID | 969625631640 |
| REACT_APP_FIREBASE_APP_ID | 1:969625631640:web:2f2a2987f740b6fc8e09ed |
| REACT_APP_FIREBASE_MEASUREMENT_ID | G-WFK75QN54E |
| REACT_APP_FIREBASE_VAPID_KEY | BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-nssyqNG-EIJUu6WIA0MWJaouSUI |
| REACT_APP_CRM_BASE_URL | https://loyalty-trigger-fix.preview.emergentagent.com/api |

## Key Notes for Next Agent
- Health check is **disabled** (`ENABLE_HEALTH_CHECK=false`)
- CRACO config has health check plugin code but it's gated behind the env flag
- Visual edits integration is commented out in `craco.config.js`
- The backend at `/app/backend/server.py` is the default Emergent scaffold (not part of this project)
- All API calls go to external preprod endpoints, not the local backend
- Only 1 ESLint warning exists (react-hooks/exhaustive-deps in OrderEntry.jsx line 1297)

## Supervisor Services
- `frontend` - yarn start on port 3000 (RUNNING)
- `backend` - FastAPI on port 8001 (RUNNING - default scaffold, not used by this app)

## Backlog
- P0: None - deployment complete
- P1: Login flow depends on external preprod API availability
- P2: ESLint warning cleanup in OrderEntry.jsx
