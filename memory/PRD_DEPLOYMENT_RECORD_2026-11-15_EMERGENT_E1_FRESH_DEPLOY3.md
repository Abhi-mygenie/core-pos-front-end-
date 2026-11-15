# PRD — MyGenie POS Frontend Fresh Deploy (2026-11-15)

## Problem Statement
Deploy existing React frontend repo (https://github.com/Abhi-mygenie/core-pos-front-end-.git, branch: main) directly into /app as-is with no code edits.

## What Was Done
1. **Phase 1 — Backup**: Preserved platform files (.emergent/, frontend/.env, backend/.env)
2. **Phase 2 — Clone & Swap**: Cloned repo to staging → cleared /app → moved repo contents in → restored platform files
3. **Phase 3 — Dependencies**: `yarn install` for frontend, `pip install` for backend — exact lockfile versions
4. **Phase 4 — Env Setup**: Added all user env vars to frontend/.env; collected missing secrets (Firebase API Key, VAPID Key, Google Maps Key) via secure card
5. **Phase 5 — Verify**: Frontend compiles successfully (webpack, craco), serves login page, backend running

## Architecture
- Frontend: React 19 + CRA (craco) + Tailwind + shadcn/radix + Firebase + Socket.io
- Backend: FastAPI + MongoDB (existing, untouched)
- Process manager: supervisor (frontend port 3000, backend port 8001)

## Memory Dir Sync
- Confirmed: `git diff origin/main -- memory/` shows zero differences
- 3,092 files fully in sync with remote branch

## Keys Status
- ✅ Set: REACT_APP_FIREBASE_API_KEY, REACT_APP_FIREBASE_VAPID_KEY, REACT_APP_GOOGLE_MAPS_KEY
- ❌ Still missing: REACT_APP_CRM_API_KEYS (user did not enter)

## Next Actions
- P0: Add REACT_APP_CRM_API_KEYS when ready
- P1: Test login flow end-to-end with valid credentials
- P2: Verify push notifications (VAPID key) and Google Maps integration
