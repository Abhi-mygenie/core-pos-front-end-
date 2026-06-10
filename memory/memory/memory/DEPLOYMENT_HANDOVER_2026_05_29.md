# Deployment Handover — MyGenie POS Frontend

**Date:** 2026-05-29
**Agent:** Senior Deployment Agent (E1)
**Status:** DEPLOYED & RUNNING

---

## 1. Source

| Item | Value |
|---|---|
| Git Repo | https://github.com/Abhi-mygenie/core-pos-front-end-.git |
| Branch | `29-may` |
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

1. Cloned `29-may` branch to `/tmp/core-pos-repo`.
2. Stopped frontend supervisor service.
3. Copied all frontend files (src, public, plugins, config files, package.json) from repo to `/app/frontend/`, preserving Emergent platform files.
4. Copied memory folder from repo to `/app/memory/`.
5. Created `/app/frontend/.env` with all 14 variables listed in section 4.
6. Installed dependencies via `yarn install` (68.38s, lockfile saved).
7. Restarted frontend via `sudo supervisorctl restart frontend`.
8. Verified compilation: `webpack compiled with 1 warning` (ESLint warning only, non-blocking).
9. Verified screenshot: Login page renders with MyGenie branding.

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
REACT_APP_CRM_BASE_URL=https://insights-phase.preview.emergentagent.com/api
```

## 5. Service Status (post-deployment)

```
backend          RUNNING   (default Emergent backend — not used by this app)
frontend         RUNNING   (`yarn start` -> `craco start` on 0.0.0.0:3000)
mongodb          RUNNING   (untouched)
code-server      RUNNING   (untouched)
nginx-code-proxy RUNNING   (untouched)
```

Supervisor config (read-only) at `/etc/supervisor/conf.d/*.conf`. Frontend MUST stay on port 3000, backend on 8001.

## 6. Build / Run Verification

- `yarn install` — success (68.38s, lockfile saved)
- `craco start` — compiled with 1 non-blocking ESLint warning (OrderEntry.jsx:1311 useCallback dep)
- Screenshot confirms login page renders with MyGenie branding

## 7. Known / Non-blocking Notes

- ESLint warning in `OrderEntry.jsx` line 1311 — runtime not affected
- Webpack-dev-server deprecation warnings (informational only)
- Peer-dep warnings during `yarn install` (non-blocking)
- Health-check plugin disabled (`ENABLE_HEALTH_CHECK=false`)

## 8. Missing / Truncated Values

None. All env variables complete. `REACT_APP_BACKEND_URL` set to Emergent preview URL per user direction.

## 9. How to Restart / Redeploy

```bash
# Restart frontend only
sudo supervisorctl restart frontend

# Reinstall dependencies (yarn ONLY)
cd /app/frontend && yarn install

# View live logs
tail -n 100 /var/log/supervisor/frontend.out.log
tail -n 100 /var/log/supervisor/frontend.err.log

# Production build (if needed)
cd /app/frontend && yarn build
```

## 10. Live URLs

- **Public preview:** https://insights-phase.preview.emergentagent.com
- **Local (inside pod):** http://localhost:3000

## 11. Previous Session Context (from memory/)

The repo carries extensive memory from prior sessions:
- BUG-109/110/111 (QSR bugs) — all shipped and verified
- Audit Report Optimization CR — implemented
- CRM 2.0 integration — in progress
- Test credentials in PRD: owner@cafe103.com, vishal@pav.com, owner@palmhouse.com (all with Qplazm@10)

See `/app/memory/memory/` for full history.

---

**Handover ready.** Next agent: the app is live and serving the login page. Begin from section 9 commands if a restart is needed.
