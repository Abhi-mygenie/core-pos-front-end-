# Deployment Handover — core-pos-front-end- (CR-28-april)

## Deployment Status: SUCCESS

## Source
- **Repository**: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- **Branch deployed**: `CR-28-april`
- **HEAD commit**: `360474c Auto-generated changes`
- **Clone destination**: `/app` (cloned directly into /app as instructed; previous /app contents wiped)

## Stack (as deployed)
- React 19.0.0 (CRA + CRACO 7.1.0)
- Yarn 1.22.22 (npm NOT used)
- Node.js v20.20.2
- Frontend served via supervisor `frontend` program → `yarn start` on `0.0.0.0:3000`
- Placeholder FastAPI backend at `/app/backend/server.py` runs on `0.0.0.0:8001` (the React app does not use this; it talks to `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`)
- MongoDB running locally on default port 27017

## Steps Performed
1. Stopped supervisor `frontend` and `backend`.
2. Wiped contents of `/app` (could not remove the mountpoint itself; removed all entries in place).
3. `git clone -b CR-28-april https://github.com/Abhi-mygenie/core-pos-front-end-.git` into `/tmp` then moved contents into `/app`. Verified `git branch --show-current` = `CR-28-april`, HEAD = `360474c`.
4. Wrote `/app/frontend/.env` with the full env block provided in the task.
5. Wrote `/app/backend/.env` with `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, and Google sheet/scope vars.
6. Wrote Google service-account JSON to `/app/memory/.intake-sa.json` (path referenced by `GOOGLE_SERVICE_ACCOUNT_FILE`).
7. `cd /app/frontend && yarn install --network-timeout 600000` → completed in ~75s, lockfile saved, no errors.
8. `pip install -r /app/backend/requirements.txt` → all already satisfied.
9. `sudo supervisorctl start backend frontend`.

## Verification
- `sudo supervisorctl status` → all programs RUNNING.
- `curl http://localhost:3000/` → **200 OK**
- `curl http://localhost:8001/api/` → **200 OK** (`{"message":"Hello World"}`)
- Pod public URL `https://insights-phase.preview.emergentagent.com/` → **200 OK**, title `<title>MyGenie POS</title>`
- Pod public URL `/api/` → **200 OK**
- Build output: `webpack compiled with 1 warning` (1 non-blocking ESLint `react-hooks/exhaustive-deps` warning at `src/pages/LoadingPage.jsx:111`). App runs fine.

## Environment Files (final)
- `/app/frontend/.env` — contains the full block from the task (REACT_APP_BACKEND_URL, WDS_SOCKET_PORT, ENABLE_HEALTH_CHECK, REACT_APP_API_BASE_URL, REACT_APP_SOCKET_URL, all `REACT_APP_FIREBASE_*`, REACT_APP_CRM_BASE_URL, REACT_APP_CRM_API_KEYS, REACT_APP_GOOGLE_MAPS_KEY).
- `/app/backend/.env` — MONGO_URL, DB_NAME=`core_pos_frontend_db`, CORS_ORIGINS=`*`, GOOGLE_SHEET_ID, GOOGLE_SHEET_TAB, GOOGLE_DRIVE_SCOPES, GOOGLE_SERVICE_ACCOUNT_FILE.
- `/app/memory/.intake-sa.json` — Google service account JSON.

## Notes for the Next Deployment Agent
- **Preview URL discrepancy (informational, NOT blocking deployment)**: The task-provided `REACT_APP_BACKEND_URL=https://insights-phase.preview.emergentagent.com` does NOT route to this pod (returns the generic "Loading…" page). This pod is reachable at `https://insights-phase.preview.emergentagent.com`. The React app in this branch does not call `REACT_APP_BACKEND_URL` for data — it uses `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/` directly — so this does not affect the deployment functioning. If the next agent needs the public preview hostname to be `restaurant-pos-v2-1`, that mapping must be configured at the platform/ingress level (not inside the repo).
- **Yarn only.** Do not switch to npm; `yarn.lock` is the source of truth and was regenerated on install.
- Hot reload is on. Code edits do not need a supervisor restart. Restart only after `.env` edits or new dependency installs (`sudo supervisorctl restart frontend` / `backend`).
- Backend `server.py` is the default Emergent placeholder — present only to keep supervisor happy. The actual product backend is the external `preprod.mygenie.online` API.
- ESLint warning at `src/pages/LoadingPage.jsx:111` (`react-hooks/exhaustive-deps`) is the only build warning; non-blocking.
- Logs: `/var/log/supervisor/frontend.{out,err}.log`, `/var/log/supervisor/backend.{out,err}.log`.

## Missing / Truncated Values
None. All env values supplied in the task were complete and have been written verbatim. No deployment blockers.
