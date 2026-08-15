# Deployment Handover — MyGenie POS Frontend

**Date:** 2026-05-26
**Agent:** Senior Deployment Agent (E1)
**Status:** ✅ DEPLOYED & RUNNING

---

## 1. Source

| Item | Value |
|---|---|
| Git Repo | https://github.com/Abhi-mygenie/core-pos-front-end-.git |
| Branch | `27-may` |
| HEAD commit | `02aa6b4 Auto-generated changes` |
| Clone location | `/app` (repo content placed directly into `/app`, preserving Emergent's `/app/.git`) |

## 2. Tech Stack (as deployed)

| Tool | Version |
|---|---|
| Node.js | v20.20.2 |
| Yarn | 1.22.22 |
| React | 19.0.0 |
| CRACO | 7.1.0 (`@craco/craco`) |
| Package manager | Yarn ONLY (npm forbidden) |

App name: **MyGenie POS** (HOSIGENIE HOSPITALITY SERVICES PRIVATE LIMITED).

## 3. Deployment Steps Performed

1. Stopped Emergent default `backend` and `frontend` services (`sudo supervisorctl stop backend frontend`). Backend kept **STOPPED** (frontend-only deployment).
2. Cloned `27-may` branch to `/tmp/core-pos-repo`.
3. Wiped `/app` (everything except `/app/.git` — Emergent platform git). The repo's own `.git` was discarded; everything else (`.emergent`, `memory`, `backend`, `frontend`, `tests`, `test_reports`, configs, etc.) was copied directly into `/app`.
4. Created `/app/frontend/.env` with all variables listed in §4.
5. Installed dependencies inside `/app/frontend` via `yarn install` (no `npm`). Lockfile saved successfully in 74.89s. Only non-blocking peer-dependency warnings.
6. Started frontend via supervisor: `sudo supervisorctl start frontend`.
7. Verified compile, local (`http://localhost:3000` → 200) and public preview (`https://insights-phase.preview.emergentagent.com` → 200) responses. Login screen renders with MyGenie branding.

## 4. Environment Variables (`/app/frontend/.env`)

```
REACT_APP_BACKEND_URL=https://insights-phase.preview.emergentagent.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
REACT_APP_SOCKET_URL=https://presocket.mygenie.online
REACT_APP_FIREBASE_API_KEY=AIzaSyCvn7MctrSgULjgiHqQSl4QfeP3dWxITwY
REACT_APP_FIREBASE_AUTH_DOMAIN=mygenie-restaurant.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=mygenie-restaurant
REACT_APP_FIREBASE_STORAGE_BUCKET=mygenie-restaurant.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=969625631640
REACT_APP_FIREBASE_APP_ID=1:969625631640:web:2f2a2987f740b6fc8e09ed
REACT_APP_FIREBASE_MEASUREMENT_ID=G-WFK75QN54E
REACT_APP_FIREBASE_VAPID_KEY=BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-nssyqNG-EIJUu6WIA0MWJaouSUI
REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
```

`REACT_APP_BACKEND_URL` was supplied as the Emergent preview URL (per user direction). All other values are taken verbatim from the user-provided env table.

## 5. Service Status (post-deployment)

```
backend          STOPPED   (intentionally — frontend-only deployment)
frontend         RUNNING   pid 700  (`yarn start` → `craco start` on 0.0.0.0:3000)
mongodb          RUNNING   (untouched)
code-server      RUNNING   (untouched)
nginx-code-proxy RUNNING   (untouched)
```

Supervisor config (read-only) lives at `/etc/supervisor/conf.d/*.conf`. Do NOT change ports — frontend MUST stay on 3000, backend on 8001.

## 6. Build / Run Verification

- `yarn install` — success (74.89s, lockfile saved).
- `craco start` — `Compiled successfully` (1 non-blocking ESLint warning in `src/components/order-entry/OrderEntry.jsx:1301` about `useCallback` dependency — **left untouched** as per scope).
- `curl https://insights-phase.preview.emergentagent.com` → `HTTP 200`.
- Playwright screenshot confirms login page renders with MyGenie branding (title: "MyGenie POS").

## 7. Known / Non-blocking Notes

- ESLint warning in `OrderEntry.jsx` line 1301 — runtime is not affected.
- Webpack-dev-server deprecation warnings (`onAfterSetupMiddleware`, `onBeforeSetupMiddleware`) — informational only.
- Peer-dep warnings during `yarn install` (react-day-picker, recharts, @testing-library/react, etc.) — non-blocking.
- Health-check plugin is disabled (`ENABLE_HEALTH_CHECK=false`), as instructed by env table.

## 8. Missing / Truncated Values

None. All env variables from the user-supplied table were present and complete. `REACT_APP_BACKEND_URL` (left blank in the table) was filled with the Emergent preview URL per user direction.

## 9. How to Restart / Redeploy

```bash
# Restart frontend only (after .env or dependency change)
sudo supervisorctl restart frontend

# Reinstall dependencies (use yarn ONLY)
cd /app/frontend && yarn install

# View live logs
tail -n 100 /var/log/supervisor/frontend.out.log
tail -n 100 /var/log/supervisor/frontend.err.log

# Production build (if needed in future)
cd /app/frontend && yarn build
```

## 10. Live URLs

- **Public preview:** https://insights-phase.preview.emergentagent.com
- **Local (inside pod):** http://localhost:3000

---

**Handover ready.** Next deployment agent: the app is live and serving. Begin from §9 commands if a restart is needed.
