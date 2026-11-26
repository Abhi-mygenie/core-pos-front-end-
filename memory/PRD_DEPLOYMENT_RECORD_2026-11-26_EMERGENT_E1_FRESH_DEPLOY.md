# Deployment Record — 2026-11-26 Emergent E1 Fresh Deploy

## Date
2026-11-26

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: main
- Commit: HEAD (depth=1 clone)

## What Was Done
1. Cloned repo from GitHub (main branch) into /tmp/pos-repo
2. Synced repo frontend/ → /app/frontend/ (preserved platform .env, node_modules cleared)
3. Synced repo memory/ → /app/memory/ (75 files, fully in sync with remote)
4. Synced repo backend/ → /app/backend/ (preserved platform .env)
5. Set all env vars in /app/frontend/.env:
   - REACT_APP_API_BASE_URL, REACT_APP_SOCKET_URL
   - REACT_APP_FIREBASE_* (7 vars — auth domain, project id, storage, sender id, app id, measurement id)
   - REACT_APP_CRM_BASE_URL, REACT_APP_SHOW_AUDIT_TAB
   - REACT_APP_FIREBASE_API_KEY, REACT_APP_FIREBASE_VAPID_KEY, REACT_APP_GOOGLE_MAPS_KEY (via secrets)
   - REACT_APP_CRM_API_KEYS (placeholder — user to update with real keys)
   - NODE_OPTIONS=--max-old-space-size=4096 (required for large app)
6. yarn install --frozen-lockfile in /app/frontend/
7. Restarted supervisor frontend
8. App compiles with 1 warning (ESLint only), 0 errors

## Status
- Frontend: RUNNING on port 3000
- Backend: RUNNING on port 8001
- Memory dir: IN SYNC with remote branch (75 files)
- Login screen: Confirmed loading at preview URL

## Known Notes
- Node.js v24 + react-scripts produces benign `devServer.close is not a function` on SIGTERM (shutdown only, not startup) — app starts and serves correctly
- REACT_APP_CRM_API_KEYS is placeholder — update via Secrets tab when real keys ready
- WDS_SOCKET_PORT=443 managed by platform (already in .env)
