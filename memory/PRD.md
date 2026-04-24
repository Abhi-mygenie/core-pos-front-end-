# Deployment Handover — Mygenie POS (Frontend)

## Task Scope (strict)
Deployment-only task. No code changes, no bug fixes, no testing. Goal: clone the specified repo/branch into `/app`, configure env vars, and bring the frontend up successfully on the Emergent preview URL.

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: `roomv1-` (trailing hyphen — confirmed exists in remote)
- Commit deployed (HEAD): `75f086cc06f22b2d037a06281956bc01d388adc8`
- Commit message: `Auto-generated changes`

## Environment / Stack
- Node.js v20.20.2
- Yarn 1.22.22 (npm NOT used)
- React 19.0.0, CRACO 7.1.0
- Preview URL: https://e50679cc-a840-41b8-bfea-7869bcd12df4.preview.emergentagent.com

## Deployment Steps Executed
1. Stopped running supervisor processes (`frontend`, `backend`).
2. Wiped `/app` completely (including old scaffolding).
3. Cloned `roomv1-` branch into `/app` (via `/tmp/repo_clone` → copied contents into `/app`, as `/app` mountpoint cannot be removed directly).
4. Created `/app/frontend/.env` with all variables supplied by the user.
5. Ran `yarn install` inside `/app/frontend` (completed in ~78s; no install errors).
6. Started frontend via `sudo supervisorctl start frontend`.
7. Verified: webpack compiled successfully, `curl localhost:3000` → 200, preview URL → 200, login page screenshot rendered (Mygenie logo + login form).

## Frontend `.env` (at /app/frontend/.env)
All values applied exactly as provided by the user. `REACT_APP_FIREBASE_VAPID_KEY` was stripped of its leading `\t2\t` as per user confirmation and stored as:
`BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-nssyqNG-EIJUu6WIA0MWJaouSUI`

Key variables:
- REACT_APP_BACKEND_URL=https://restaurant-pos-v2-1.preview.emergentagent.com
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
- WDS_SOCKET_PORT=443
- ENABLE_HEALTH_CHECK=false
- Firebase config (apiKey, authDomain, projectId, storageBucket, senderId, appId, measurementId, vapidKey)
- Google Maps key
- CRM API keys JSON (15 tenant entries)

## Supervisor
- Config file: `/etc/supervisor/conf.d/supervisord.conf` (READ-ONLY; not modified)
- `frontend`: RUNNING — `yarn start` (CRACO) on `0.0.0.0:3000`
- `backend`: STOPPED — This repo's `/app/backend` contains a `server.py` that was NOT part of the deployment scope. Supervisor still has a `backend` program defined. It is currently STOPPED. Leaving as-is per "minimum work required" rule. Start it only if explicitly required.
- `mongodb`, `code-server`, `nginx-code-proxy`: RUNNING (platform-managed).

## Build/Run Verification
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → **200**
- `curl -s -o /dev/null -w "%{http_code}" https://e50679cc-a840-41b8-bfea-7869bcd12df4.preview.emergentagent.com/` → **200**
- Playwright screenshot of preview URL → Mygenie login screen renders correctly (logo, tagline "Streamlined Hospitality. Exceptional Experience.", Email/Password inputs, LOG IN button, "Forgot Password?" link, footer © Mygenie 2025).
- Compile status: **Compiled with warnings** — only 1 ESLint warning (`react-hooks/exhaustive-deps` in `src/pages/LoadingPage.jsx:101`). Non-blocking.

## Missing / Risk Items (attention for next agent)
1. **VAPID key source formatting**: the user-provided value originally had leading `\t2\t` whitespace; stripped per user confirmation. If Firebase push notifications fail, re-verify the exact VAPID from the Firebase console.
2. **Backend program in supervisor**: repo ships a backend scaffolding but is not the deployment target. Kept STOPPED — do not enable unless instructed.
3. **ESLint warning** in `LoadingPage.jsx` — non-blocking; flagged for awareness only, not fixed (out of scope).
4. No test suites were executed (per instructions).
5. The repo contains additional folders (`v1/`, `v2/`, `v3/`, `tests/`, `test_reports/`) carried over from source control — not used for this deployment. Left untouched.

## Quick Operator Commands
```
# Restart frontend
sudo supervisorctl restart frontend

# Logs
tail -n 200 /var/log/supervisor/frontend.out.log
tail -n 200 /var/log/supervisor/frontend.err.log

# Reinstall deps (if node_modules is wiped)
cd /app/frontend && yarn install

# Local URL
http://localhost:3000

# Public URL
https://e50679cc-a840-41b8-bfea-7869bcd12df4.preview.emergentagent.com
```

## Status
DEPLOYMENT SUCCESSFUL. Frontend accessible on preview URL. No outstanding blockers.
