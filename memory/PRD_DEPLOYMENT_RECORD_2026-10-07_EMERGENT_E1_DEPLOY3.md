# Deployment Record — 2026-10-07 (E1 Deploy 3)

## Task
Deploy the existing React frontend repo (core-pos-front-end) directly into /app and run it as-is with no code edits.

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 5oct-1

## Steps Taken
1. Cloned repo to /tmp/pos-repo (branch: 5oct-1)
2. Identified repo structure: React app lives at /tmp/pos-repo/frontend/
3. Stopped frontend supervisor
4. Cleared old /app/frontend contents (src, public, package.json, yarn.lock, node_modules, config files)
5. Rsync'd /tmp/pos-repo/frontend/ → /app/frontend/ (no code edits)
6. Created /app/frontend/.env with all provided env vars + platform REACT_APP_BACKEND_URL
7. Ran: cd /app/frontend && yarn install --ignore-engines (no lockfile in repo; --ignore-engines needed for @testing-library/jest-dom@7 on Node 20)
8. Synced /tmp/pos-repo/memory/ → /app/memory/ (full memory dir pulled from remote branch)
9. Started frontend supervisor: supervisorctl start frontend
10. Verified: HTTP 200 on port 3000, app compiles and loads login page

## Result
- Frontend: RUNNING on port 3000 via craco start
- App: MyGenie POS login screen rendered successfully
- Memory dir: Fully synced with remote branch 5oct-1

## Env Vars Set
- REACT_APP_BACKEND_URL (platform preview URL, preserved)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- All REACT_APP_FIREBASE_* keys
- REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
- REACT_APP_CRM_API_KEYS (partial — key "509" value was cut off in problem statement, placeholder used)
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true

## Notes
- No code edits made — pure deploy as-is
- REACT_APP_CRM_API_KEYS for outlet "509" has a placeholder value — supply the complete value when available
- Package manager: yarn (no lockfile in repo; generated fresh yarn.lock)
