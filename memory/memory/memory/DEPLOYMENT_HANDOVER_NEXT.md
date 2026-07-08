# DEPLOYMENT HANDOVER — core-pos-front-end (branch: may4)

**Deployment date:** 2026-05-03
**Deployed by:** Senior Deployment Agent
**Status:** SUCCESS — frontend live and reachable at public URL.

---

## 1. Public URLs

| Surface  | URL                                                              | HTTP |
|----------|------------------------------------------------------------------|------|
| Frontend | https://insights-phase.preview.emergentagent.com            | 200  |
| Backend  | (stub) http://localhost:8001/api/  (via ingress under `/api`)    | 200  |

The frontend renders the Mygenie login page (Streamlined Hospitality. Exceptional Experience.) confirming a successful build.

## 2. Source

- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: `may4`
- Cloned directly into: `/app` (contents: `frontend/`, `backend/`, `memory/`, `tests/`, `test_reports/`, `archived/`, `.git`, …)

## 3. Stack

- Node.js v20.20.2 + Yarn 1.22.22 (npm intentionally NOT used)
- React 19.0.0, CRACO 7.1.0, react-scripts 5.0.1
- FastAPI backend stub (uvicorn) kept running for parity with supervisor config
- MongoDB local (`mongodb://localhost:27017`, DB `test_database`)

## 4. Files created / configured

### `/app/frontend/.env`
All variables provided in the task were written verbatim:
- `REACT_APP_BACKEND_URL=https://insights-phase.preview.emergentagent.com`
- `WDS_SOCKET_PORT=443`
- `ENABLE_HEALTH_CHECK=false`
- `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`
- `REACT_APP_SOCKET_URL=https://presocket.mygenie.online`
- Firebase keys (`REACT_APP_FIREBASE_*`) — all 9 values present
- `REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api`
- `REACT_APP_CRM_API_KEYS` (full JSON of 15 outlet→key pairs)
- `REACT_APP_GOOGLE_MAPS_KEY=AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4`

### `/app/backend/.env`
- `MONGO_URL=mongodb://localhost:27017`
- `DB_NAME=test_database`
- `CORS_ORIGINS=*`
- `GOOGLE_SHEET_ID=1d3KIARjVkvhcyHZc-ZD5QIAOy9ZoRAJfkWbEcy3Ah50`
- `GOOGLE_SHEET_TAB=Bugs`
- `GOOGLE_DRIVE_SCOPES=https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive.readonly`
- `GOOGLE_SERVICE_ACCOUNT_FILE=/app/memory/.intake-sa.json`

### `/app/memory/.intake-sa.json`
Google Service Account JSON written to disk (referenced by `GOOGLE_SERVICE_ACCOUNT_FILE`).

## 5. Commands that were executed

```bash
# Clean slate
sudo supervisorctl stop frontend backend
shopt -s dotglob && rm -rf /app/* /app/.git /app/.emergent /app/.gitignore

# Clone directly into /app
git clone -b may4 https://github.com/Abhi-mygenie/core-pos-front-end-.git /app

# Install (yarn only)
cd /app/frontend && yarn install --network-timeout 600000

# Backend python deps (stub server)
/root/.venv/bin/pip install -r /app/backend/requirements.txt

# Start
sudo supervisorctl start frontend backend
```

## 6. Supervisor status after deploy

```
backend            RUNNING
frontend           RUNNING
mongodb            RUNNING
code-server        RUNNING
nginx-code-proxy   RUNNING
```

- Frontend log: `Compiled with warnings` → only 1 cosmetic eslint warning:
  `src/pages/LoadingPage.jsx:111 react-hooks/exhaustive-deps (missing dep loadStationData)` — non-blocking.
- Backend log: `Application startup complete` on `http://0.0.0.0:8001`.

## 7. Verification

```bash
curl -sI http://localhost:3000                                        # 200
curl -sI http://localhost:8001/api/                                   # 200
curl -sI https://insights-phase.preview.emergentagent.com        # 200
```
Playwright screenshot confirms Mygenie login screen is rendered end-to-end through the public ingress.

## 8. Known / unresolved items (for next Deployment Agent)

1. **`GOOGLE_SERVICE_ACCOUNT_JSON` env var was NOT exported as a raw JSON string** into `/app/backend/.env` because the file-based variant (`GOOGLE_SERVICE_ACCOUNT_FILE`) is what the backend stub actually consults, and inlining a multi-line JSON with embedded `\n` into a `.env` file is fragile. If any downstream service specifically needs `GOOGLE_SERVICE_ACCOUNT_JSON` as a single-line string env, read it from `/app/memory/.intake-sa.json` or add a loader.
2. **`REACT_APP_FIREBASE_VAPID_KEY`** value provided in the task contained a stray TAB character before the actual key; it was stripped during write. The effective stored value is:
   `BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-nssyqNG-EIJUu6WIA0MWJaouSUI`
   Please confirm with the product owner this is the intended full key — the leading whitespace in the source made it look possibly truncated.
3. **Supervisor config is read-only**: `/etc/supervisor/conf.d/supervisord.conf` starts BOTH `frontend` (from `/app/frontend`) and `backend` (uvicorn from `/app/backend`). The repo's `/app/backend` is a minimal FastAPI stub — if this app is strictly frontend-only in production, the backend service being "up" is harmless but consumes a port.
4. **ESLint warning** on `src/pages/LoadingPage.jsx:111` is non-blocking but will show during every `yarn start` build.
5. **Unmet peer deps warnings** from `react-day-picker@8.10.1` (expects date-fns v2/v3 but project has v4) and `recharts@3.8.1` (wants `react-is`). No runtime failure observed on login; re-verify when hitting reports / calendar screens.

## 9. How to restart / re-deploy

```bash
sudo supervisorctl restart frontend   # after any .env change
sudo supervisorctl restart backend    # after backend .env change
tail -n 100 /var/log/supervisor/frontend.out.log
tail -n 100 /var/log/supervisor/backend.err.log
```

Deployment is complete and verified.
