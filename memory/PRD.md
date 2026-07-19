# Core POS Frontend - PRD

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `main`) directly into `/app` and run it as-is with no code edits.

## Architecture
- **Frontend**: React (CRA + CRACO) running on port 3000 via supervisor
- **Backend**: FastAPI (from repo) running on port 8001 via supervisor
- **Package Manager**: Yarn (yarn.lock detected)
- **Styling**: TailwindCSS + Radix UI + shadcn/ui components
- **State**: React Query, SWR, React Context
- **Integrations**: Firebase, Socket.io, Google Maps, Axios API layer

## What's Been Implemented (July 19, 2026)
- ✅ Cloned repo from GitHub `main` branch into `/app`
- ✅ Preserved platform files (.emergent/, .git/, memory/, .env files)
- ✅ Installed frontend dependencies via `yarn install --frozen-lockfile`
- ✅ Installed backend dependencies via `pip install -r requirements.txt`
- ✅ Added placeholder env vars (`REACT_APP_API_BASE_URL`, `REACT_APP_SOCKET_URL`, `REACT_APP_CRM_BASE_URL`) to prevent hard crashes
- ✅ Frontend compiles and serves successfully on port 3000
- ✅ Backend runs successfully on port 8001
- ✅ Login page renders correctly with MyGenie branding

## Env Variables (Placeholders - User to Replace)
- `REACT_APP_API_BASE_URL` - Main API base URL
- `REACT_APP_SOCKET_URL` - WebSocket server URL
- `REACT_APP_CRM_BASE_URL` - CRM API base URL
- `REACT_APP_FIREBASE_API_KEY` - Firebase config (not yet added)
- `REACT_APP_FIREBASE_AUTH_DOMAIN` - Firebase config (not yet added)
- `REACT_APP_FIREBASE_PROJECT_ID` - Firebase config (not yet added)
- `REACT_APP_FIREBASE_STORAGE_BUCKET` - Firebase config (not yet added)
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` - Firebase config (not yet added)
- `REACT_APP_FIREBASE_APP_ID` - Firebase config (not yet added)
- `REACT_APP_FIREBASE_MEASUREMENT_ID` - Firebase config (not yet added)
- `REACT_APP_FIREBASE_VAPID_KEY` - Firebase config (not yet added)
- `REACT_APP_GOOGLE_MAPS_KEY` - Google Maps API key (not yet added)
- `REACT_APP_SHOW_AUDIT_TAB` - Set to `true`/`false`

## Next Action Items
- P0: User to provide real `.env` values for API, Socket, CRM, Firebase, and Google Maps
- P1: Verify login flow works end-to-end once real API URL is set
- P2: Verify WebSocket connections once real socket URL is set
