# Deployment Record — 2026-10-07 (Emergent E1 Deploy #2)

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 5oct-1
- Destination: /app/frontend

## Steps Performed
1. Stopped frontend supervisor process
2. Cloned repo (branch 5oct-1) to /tmp/pos-repo
3. Replaced /app/frontend with repo's frontend/ directory (no code edits)
4. Synced /app/memory/ with repo's memory/ directory (34 files)
5. Created /app/frontend/.env with all provided env variables
6. Ran `yarn install --ignore-engines` (no lockfile in repo; Node 20 compat flag needed)
7. Restarted frontend supervisor: `sudo supervisorctl restart frontend`

## Platform Files Preserved
- /app/.emergent/ (platform config + cron)
- /app/backend/ (FastAPI backend + .env)
- /app/tests/
- /app/test_reports/
- Supervisor configs at /etc/supervisor/conf.d/ (readonly, untouched)

## Verification
- Supervisor status: RUNNING (pid 867)
- HTTP response on port 3000: 200 OK
- Compile result: `webpack compiled with 1 warning` (no errors)
- App screenshot: MyGenie POS login screen renders correctly

## Environment Variables Set
- REACT_APP_BACKEND_URL (platform preview URL)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (all Firebase config keys)
- REACT_APP_CRM_BASE_URL + REACT_APP_CRM_API_KEYS (partial — 509 key truncated in source)
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true

## Notes
- REACT_APP_CRM_API_KEYS: the `509` tenant key value was truncated in the problem statement; placeholder used. Update when full value is available.
- yarn.lock generated fresh during install (was absent from repo branch)
- Only 1 webpack warning (react-hooks/exhaustive-deps) — not a blocking error
