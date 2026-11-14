# MyGenie POS Frontend — Deployment Record

## Original Problem Statement
Deploy the existing React frontend repo (https://github.com/Abhi-mygenie/core-pos-front-end-.git, main branch)
directly into `/app` and run it as-is with no code edits.

## Architecture
- **Frontend**: React (CRA + CRACO) running on port 3000 via supervisor (`yarn start`)
- **Backend**: FastAPI placeholder on port 8001 (platform template, unused by this app)
- **Package Manager**: Yarn (`.yarnrc` → `ignore-engines true`)
- **Build Tool**: CRACO (Create React App Configuration Override)
- **Source**: `frontend/` subdirectory inside the GitHub repo

## What's Been Implemented

### 2026-11-14 — Re-sync from new remote push (commit 5f40a4c2)
- Remote branch checked: `main` @ `5f40a4c2` ("Auto-generated changes")
- Fresh clone to `/root/pos-repo-new` (persistent, not /tmp)
- Repo's `frontend/` rsync'd into `/app/frontend/` — node_modules and .env excluded
- `/app/memory/` fully replaced with remote memory folder (change_requests/, control/, design_briefs/, backend_briefs/, etc. — hundreds of files)
- Platform files preserved throughout: `.emergent/`, `backend/`, supervisor configs
- `yarn install` re-run — lockfile saved, all deps in sync
- Supervisor frontend restarted; webpack compiled with 1 lint warning only
- App confirmed live on port 3000 — MyGenie login page visible

### 2026-11-14 — Initial deploy
- Repo cloned, frontend rsync'd, full .env written, yarn install, supervisor started

## Environment Variables (frontend/.env)
- `REACT_APP_BACKEND_URL` — platform preview URL (platform-managed, do not remove)
- `WDS_SOCKET_PORT=443`
- `ENABLE_HEALTH_CHECK=false`
- `REACT_APP_FIREBASE_API_KEY` — set via secrets secure card
- `REACT_APP_FIREBASE_VAPID_KEY` — set via secrets secure card
- `REACT_APP_GOOGLE_MAPS_KEY` — set via secrets secure card
- `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`
- `REACT_APP_SOCKET_URL=https://presocket.mygenie.online`
- `REACT_APP_FIREBASE_AUTH_DOMAIN=mygenie-restaurant.firebaseapp.com`
- `REACT_APP_FIREBASE_PROJECT_ID=mygenie-restaurant`
- `REACT_APP_FIREBASE_STORAGE_BUCKET=mygenie-restaurant.firebasestorage.app`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID=969625631640`
- `REACT_APP_FIREBASE_APP_ID=1:969625631640:web:2f2a2987f740b6fc8e09ed`
- `REACT_APP_FIREBASE_MEASUREMENT_ID=G-WFK75QN54E`
- `REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api`
- `REACT_APP_CRM_API_KEYS` — NOT YET SET (CRM features pending)
- `CORS_ORIGINS=*`
- `REACT_APP_SHOW_AUDIT_TAB=true`

## Re-sync Procedure (for future remote pushes)
1. `git clone https://github.com/Abhi-mygenie/core-pos-front-end-.git /root/pos-repo-new`
2. `rsync -av --delete --exclude=node_modules --exclude=.env /root/pos-repo-new/frontend/ /app/frontend/`
3. `rsync -av --delete /root/pos-repo-new/memory/ /app/memory/` then restore PRD.md on top
4. `cd /app/frontend && yarn install`
5. `sudo supervisorctl restart frontend`

## Prioritized Backlog
- **P0**: Supply `REACT_APP_CRM_API_KEYS` via secrets secure card
- **P1**: Verify login flow against preprod API with real credentials
- **P2**: Test socket connections to presocket.mygenie.online
- **P3**: Switch `REACT_APP_API_BASE_URL` to production URL when ready to go live
