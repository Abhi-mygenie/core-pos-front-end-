# Core POS Front-End — Deployment PRD

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `15-july`) directly into `/app` and run it as-is with no code edits.

## Architecture
- **Stack**: React 19, CRA + CRACO, Tailwind CSS, Radix UI, React Router, Axios, Socket.io, Firebase, Recharts
- **Process Manager**: Supervisor (`yarn start` → `craco start` on port 3000)
- **Backend**: Disabled per user request (frontend-only deployment)

## What's Been Implemented (Jul 15, 2026)
1. Backed up platform files (`.emergent/`, `.git/`, `.env` files, `memory/`, `test_reports/`)
2. Cloned repo (branch `15-july`) into staging, copied contents to `/app`
3. Restored all platform-specific files
4. Ran `yarn install` — all dependencies installed successfully
5. Started frontend via supervisor — compiles with zero fatal errors, HTTP 200 on port 3000
6. Runtime error for missing `REACT_APP_API_BASE_URL` is **expected** until user provides env values

## Required Environment Variables (user to supply)
| Variable | Purpose |
|---|---|
| `REACT_APP_API_BASE_URL` | Main API base URL (required) |
| `REACT_APP_SOCKET_URL` | WebSocket server URL |
| `REACT_APP_CRM_BASE_URL` | CRM API base URL |
| `REACT_APP_GOOGLE_MAPS_KEY` | Google Maps API key |
| `REACT_APP_FIREBASE_API_KEY` | Firebase config |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase config |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase config |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Firebase config |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Firebase config |
| `REACT_APP_FIREBASE_APP_ID` | Firebase config |
| `REACT_APP_FIREBASE_MEASUREMENT_ID` | Firebase analytics |
| `REACT_APP_FIREBASE_VAPID_KEY` | Firebase push notifications |
| `REACT_APP_SHOW_AUDIT_TAB` | Feature flag (true/false) |

## Backlog / Next Steps
- P0: User adds `.env` values → app fully functional
- P1: Verify all features work end-to-end with real API
- P2: Production build (`yarn build`) and static hosting if needed
