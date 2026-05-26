# Core POS Frontend - Deployment PRD

## Original Problem Statement
Deploy the `core-pos-front-end-` repository (branch `27-may`) from https://github.com/Abhi-mygenie/core-pos-front-end-.git into `/app`, configure environment variables (Firebase, API base URLs, CRM, sockets), install dependencies, and run frontend.

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI + Firebase + socket.io-client (port 3000)
- **Backend**: FastAPI + MongoDB (port 8001, default boilerplate, used for status checks only)
- **External APIs**: MyGenie Preprod (`https://preprod.mygenie.online/`), CRM (`https://crm.mygenie.online/api`), Sockets (`https://presocket.mygenie.online`)
- **Title**: MyGenie POS - "Streamlined Hospitality. Exceptional Experience."

## Deployment Setup Completed (2026-05-26)
- Cloned `core-pos-front-end-` repo (branch `27-may`) directly into `/app`
- Wiped previous boilerplate (preserved `.git`/`.emergent`)
- Installed all frontend dependencies via `yarn install` (CRACO + React 19 deps)
- Installed backend Python dependencies via `pip install -r requirements.txt`
- Configured `/app/frontend/.env` with all 13 required env variables (REACT_APP_BACKEND_URL = Emergent preview URL, Firebase keys, API base URL, CRM URL, Socket URL, etc.)
- Configured `/app/backend/.env` with MONGO_URL + DB_NAME
- Both `frontend` & `backend` running under supervisor; login screen rendering correctly at preview URL.

## Verification
- `curl http://localhost:3000` → 200
- `curl http://localhost:8001/api/` → 200
- Screenshot confirms `MyGenie POS` login page (logo + email/password form + LOG IN button) loads on preview URL.

## Next Action Items
- User to validate login flow end-to-end against `preprod.mygenie.online` backend
- Confirm Firebase auth/push notification flows (VAPID key configured)
- Verify socket.io connection to `presocket.mygenie.online`

## Backlog (P1/P2)
- No application-level changes requested; this was deployment-only task.
