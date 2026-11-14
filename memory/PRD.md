# MyGenie Core POS Frontend — PRD

## Problem Statement
Deploy the existing React frontend repo (https://github.com/Abhi-mygenie/core-pos-front-end-.git, branch: main) directly into `/app` and run it as-is with no code edits.

## Architecture
- **Frontend only** — React (CRA + CRACO), runs under supervisor at `/app/frontend/` on port 3000
- **Backend** — Platform FastAPI stub preserved at `/app/backend/` (unused by this app)
- **External APIs** — `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`, Firebase, Socket.IO, CRM, Google Maps

## What's Been Implemented (2026-11-14)

### Phase 1 — Prepare
- Backed up platform `.env` (`REACT_APP_BACKEND_URL`, `WDS_SOCKET_PORT`, `ENABLE_HEALTH_CHECK`)
- Platform dirs preserved: `/app/backend/`, `/app/.emergent/`, `/app/memory/`, `/app/.git/`

### Phase 2 — Clone & Overlay
- Cloned repo `core-pos-front-end-` → staged at `/tmp/pos-repo/`
- Rsynced repo `frontend/` → `/app/frontend/` (excluding `.env`, `node_modules`, `yarn.lock`)
- New files from repo: `eslint.config.js`, `scripts/`, `webpack-shims/`, updated `src/`, `public/`, `craco.config.js`

### Phase 3 — Dependencies
- Added platform overlay packages back to `package.json` devDependencies:
  - `@emergentbase/overlay@0.1.31`
  - `@emergentbase/visual-edits@1.0.17`
- Ran `yarn install` — all 69+ dependencies resolved (73s), `yarn.lock` saved
- Key packages: `firebase ^13`, `socket.io-client ^4.8`, `@hello-pangea/dnd ^18`, `jspdf ^4`, `xlsx ^0.18`, `libphonenumber-js ^1.13`, `recharts 2.15.4`

### Phase 4 — Environment
- Merged platform vars + POS-specific vars into `/app/frontend/.env`:
  - `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`
  - `REACT_APP_SOCKET_URL=https://presocket.mygenie.online`
  - Firebase config (API key & VAPID key pending user input)
  - `REACT_APP_CRM_BASE_URL`, `REACT_APP_GOOGLE_MAPS_KEY` (Maps key pending)
  - `REACT_APP_SHOW_AUDIT_TAB=true`

### Phase 5 — Memory Sync
- Rsynced `/tmp/pos-repo/memory/` → `/app/memory/` — 65 files synced including all BUG/CR investigation reports, QA reports, changelogs, screen references

### Phase 6 — Verification
- Frontend supervisor restarted; compiled with **0 errors, 1 ESLint warning**
- App confirmed live at preview URL — login screen renders correctly

## Environment Variables Status
| Variable | Status |
|---|---|
| REACT_APP_API_BASE_URL | Set |
| REACT_APP_SOCKET_URL | Set |
| REACT_APP_FIREBASE_AUTH_DOMAIN | Set |
| REACT_APP_FIREBASE_PROJECT_ID | Set |
| REACT_APP_FIREBASE_STORAGE_BUCKET | Set |
| REACT_APP_FIREBASE_MESSAGING_SENDER_ID | Set |
| REACT_APP_FIREBASE_APP_ID | Set |
| REACT_APP_FIREBASE_MEASUREMENT_ID | Set |
| REACT_APP_CRM_BASE_URL | Set |
| REACT_APP_SHOW_AUDIT_TAB | Set |
| REACT_APP_FIREBASE_API_KEY | Set (2026-11-14) |
| REACT_APP_FIREBASE_VAPID_KEY | Set (2026-11-14) |
| REACT_APP_GOOGLE_MAPS_KEY | Set (2026-11-14) |
| **REACT_APP_CRM_API_KEYS** | **Placeholder `{}` — user to provide full JSON** |

## Backlog / Next Steps
- P0: User to supply FIREBASE_API_KEY, FIREBASE_VAPID_KEY, GOOGLE_MAPS_KEY, CRM_API_KEYS via secrets panel
- P1: Restart frontend after keys are saved so Firebase auth and Maps features activate
- P2: Provide REACT_APP_CRM_API_KEYS full JSON (the redacted object from problem statement)
- P3: Deploy to production when ready
