# Deployment Record — 2026-09-25

## Summary
Deployed `core-pos-front-end` React app (branch `21implement`) into the Emergent platform at `/app/frontend`.

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 21implement

## What Was Done
1. Cloned repo to `/tmp/pos-staging` (staging, branch `21implement`)
2. Cleared old `/app/frontend` contents (src, public, package.json, etc.)
3. Copied repo's `frontend/` contents into `/app/frontend/`
4. Wrote all env vars to `/app/frontend/.env`:
   - Preserved platform `REACT_APP_BACKEND_URL`
   - Added all app-specific vars (Firebase, API base URLs, CRM, Google Maps, Socket, etc.)
5. Ran `yarn install --ignore-engines` (Node 20 vs jest-dom@7 engine mismatch bypassed)
6. Restarted supervisor frontend
7. Synced `/app/memory/` from cloned repo

## Result
- Frontend compiles with 1 ESLint warning (react-hooks/exhaustive-deps) — no fatal errors
- App responds HTTP 200 on port 3000
- MyGenie POS login screen visible at preview URL

## Platform Notes
- Supervisor config (`/etc/supervisor/conf.d/supervisord.conf`) is READ-ONLY
- Frontend directory must remain at `/app/frontend` (supervisor hardcoded)
- Backend remains at `/app/backend` (unchanged)
- Memory dir fully synced from remote branch
