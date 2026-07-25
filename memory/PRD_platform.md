# Core POS Frontend — Deployment PRD

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `main`) directly into `/app` and run it as-is, with no code edits.

## Architecture / What Was Done (2026-07-21)
- Cloned repo from GitHub into `/tmp/repo-staging`
- Backed up platform files: `/app/frontend/.env`, `/app/.emergent/`
- Cleared `/app/frontend` source files (preserved `node_modules` location)
- Copied `frontend/` contents from repo into `/app/frontend/`
- Restored platform `.env` (with added placeholder env vars for all `REACT_APP_*` keys the app expects)
- Ran `yarn install --ignore-engines` (needed because `@testing-library/jest-dom@6.10.0` requires Node ≥ 22 but env has Node 20)
- Restarted supervisor frontend process
- App compiles with `webpack compiled with 1 warning` (no errors)
- App is served on port 3000 via `craco start`

## Tech Stack
- React (CRA + CRACO)
- Tailwind CSS
- Firebase (client SDK)
- Socket.io-client
- Axios (1.8.4)
- react-router-dom 7.5.1
- jsPDF, xlsx, recharts, @hello-pangea/dnd

## Supervisor Config
- Frontend: `yarn start` from `/app/frontend`, binds to `0.0.0.0:3000`
- `.env` path: `/app/frontend/.env`

## Required Env Variables (fill in before app is functional)
```
REACT_APP_API_BASE_URL=         # Laravel/backend API base URL — REQUIRED (app throws on empty)
REACT_APP_SOCKET_URL=           # Socket.io server URL
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_FIREBASE_MEASUREMENT_ID=
REACT_APP_FIREBASE_VAPID_KEY=
REACT_APP_GOOGLE_MAPS_KEY=
REACT_APP_CRM_BASE_URL=
REACT_APP_CRM_API_KEYS=
REACT_APP_SHOW_AUDIT_TAB=false
```

## Status
- Deployment: COMPLETE
- App compiles: YES (1 warning, 0 errors)
- App running: YES (supervisor-managed, port 3000)
- App functional: PENDING — needs `REACT_APP_API_BASE_URL` + Firebase credentials

## Backlog / Next Steps
- P0: Add real value for `REACT_APP_API_BASE_URL` in `/app/frontend/.env` then `sudo supervisorctl restart frontend`
- P1: Add Firebase config vars (required for auth/FCM push)
- P1: Add `REACT_APP_SOCKET_URL` for real-time features
- P2: Add Google Maps key, CRM keys
