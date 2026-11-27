# Deployment Record — 2026-11-27 (Emergent E1 Fresh Deploy 3)

## Session Summary
**Date:** 2026-11-27  
**Type:** Fresh clone + deploy from remote branch  
**Repo:** https://github.com/Abhi-mygenie/core-pos-front-end-.git (branch: main)  
**Agent:** Emergent E1  

## What Was Done
1. Collected 4 missing secrets securely via Emergent secrets card:
   - `REACT_APP_FIREBASE_API_KEY` ✓
   - `REACT_APP_FIREBASE_VAPID_KEY` ✓
   - `REACT_APP_GOOGLE_MAPS_KEY` ✓
   - `REACT_APP_CRM_API_KEYS` (placeholder used as instructed) ✓

2. Cloned repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` to `/tmp/pos-repo`

3. Deployed frontend:
   - Cleared `/app/frontend` contents (preserved platform `.env`)
   - Copied `/tmp/pos-repo/frontend/` → `/app/frontend/`
   - Created `/app/frontend/.env` with all required env vars (platform + app-specific)
   - Fresh `yarn install` (clean, from lockfile — no upgrades)
   - Restarted supervisor frontend process

4. Synced memory directory:
   - Copied `/tmp/pos-repo/memory/` → `/app/memory/` (76+ files)
   - Full sync complete

## Environment Variables Set in /app/frontend/.env
- `REACT_APP_BACKEND_URL` — platform-managed (Emergent preview URL)
- `WDS_SOCKET_PORT=443`
- `ENABLE_HEALTH_CHECK=false`
- `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`
- `REACT_APP_SOCKET_URL=https://presocket.mygenie.online`
- `REACT_APP_FIREBASE_AUTH_DOMAIN=mygenie-restaurant.firebaseapp.com`
- `REACT_APP_FIREBASE_PROJECT_ID=mygenie-restaurant`
- `REACT_APP_FIREBASE_STORAGE_BUCKET=mygenie-restaurant.firebasestorage.app`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID=969625631640`
- `REACT_APP_FIREBASE_APP_ID=1:969625631640:web:2f2a2987f740b6fc8e09ed`
- `REACT_APP_FIREBASE_MEASUREMENT_ID=G-WFK75QN54E`
- `REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api`
- `REACT_APP_SHOW_AUDIT_TAB=true`
- Secrets (injected by platform): `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_VAPID_KEY`, `REACT_APP_GOOGLE_MAPS_KEY`, `REACT_APP_CRM_API_KEYS`

## Verification
- Frontend process: RUNNING (supervisor)
- Webpack compiled with warnings only (no errors) — all lint warnings, not blocking
- App loads at preview URL: Login page with Mygenie logo ✓
- Memory dir: 77 files synced from remote branch ✓

## Notes
- Platform supervisor config is READONLY — frontend runs from `/app/frontend` via `craco start`
- CRA + CRACO stack, yarn 1.22.22, Node.js v24.19.0
- Backend left as-is (frontend-only deploy per instructions)
