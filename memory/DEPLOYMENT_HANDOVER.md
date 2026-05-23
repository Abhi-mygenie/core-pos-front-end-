# Deployment Handover Note – Mygenie POS Frontend

## 1. Summary
- The Mygenie / Core POS React frontend has been **deployed successfully** into the Emergent environment.
- The login screen renders correctly at the external preview URL.
- HTTP status verified: `Local (localhost:3000) → 200`, `External preview → 200`.

## 2. Source
| Field | Value |
|-------|-------|
| Repository | https://github.com/Abhi-mygenie/core-pos-front-end-.git |
| Branch | `16-may` |
| Commit deployed | `bc43757` – "Auto-generated changes" |
| Cloned into | `/app` (repo contents copied directly into `/app`, `.emergent` preserved) |

## 3. Stack (verified in container)
| Tool | Version |
|------|---------|
| Node.js | v20.20.2 |
| Yarn | 1.22.22 |
| React | 19.0.0 |
| CRACO | 7.1.0 (devDependency) |
| Package manager enforced | **YARN ONLY** (do NOT use npm) |

## 4. Directory Layout (after deployment)
```
/app
├── .emergent/                 # platform (preserved)
├── .git/                      # repo .git (16-may branch)
├── frontend/                  # ← React app deployed here
│   ├── .env                   # created during deployment (see §5)
│   ├── craco.config.js
│   ├── package.json
│   ├── public/
│   ├── src/
│   └── node_modules/          # installed via yarn
├── backend/                   # scaffold from repo (FastAPI starter, not part of deployment scope)
│   ├── .env                   # minimal MONGO_URL/DB_NAME so supervisor backend service starts cleanly
│   ├── requirements.txt
│   └── server.py
├── memory/
├── archived/
├── tests/
└── README.md
```

## 5. Frontend Environment Variables (`/app/frontend/.env`)
All values provided in the deployment brief have been written verbatim:

| Variable | Value |
|----------|-------|
| `REACT_APP_BACKEND_URL` | `https://bug-104-credit.preview.emergentagent.com` |
| `WDS_SOCKET_PORT` | `443` |
| `ENABLE_HEALTH_CHECK` | `false` |
| `REACT_APP_API_BASE_URL` | `https://preprod.mygenie.online/` |
| `REACT_APP_SOCKET_URL` | `https://presocket.mygenie.online` |
| `REACT_APP_FIREBASE_API_KEY` | `AIzaSyCvn7MctrSgULjgiHqQSl4QfeP3dWxITwY` |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | `mygenie-restaurant.firebaseapp.com` |
| `REACT_APP_FIREBASE_PROJECT_ID` | `mygenie-restaurant` |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | `mygenie-restaurant.firebasestorage.app` |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | `969625631640` |
| `REACT_APP_FIREBASE_APP_ID` | `1:969625631640:web:2f2a2987f740b6fc8e09ed` |
| `REACT_APP_FIREBASE_MEASUREMENT_ID` | `G-WFK75QN54E` |
| `REACT_APP_FIREBASE_VAPID_KEY` | `BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-nssyqNG-EIJUu6WIA0MWJaouSUI` |
| `REACT_APP_CRM_BASE_URL` | `https://crm.mygenie.online/api` |
| `REACT_APP_CRM_API_KEYS` | JSON object containing 15 location → `dp_live_…` API key pairs (keys: 364, 475, 478, 509, 510, 523, 541, 595, 635, 669, 675, 687, 699, 709, 716) |
| `REACT_APP_GOOGLE_MAPS_KEY` | `AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4` |

Note: No values were truncated. `REACT_APP_FIREBASE_VAPID_KEY` was confirmed in full by the user.

## 6. Deployment Steps Performed
1. Wiped `/app` (kept only `.emergent` for platform integrity).
2. `git clone --branch 16-may https://github.com/Abhi-mygenie/core-pos-front-end-.git /tmp/repo`
3. Copied entire repo (including `.git`) into `/app`.
4. Created `/app/frontend/.env` with all required variables (§5).
5. Created minimal `/app/backend/.env` (`MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`) so the supervisor backend service doesn't crash on missing env (backend was part of the repo scaffold; out of deployment scope but service needed to come up cleanly).
6. `cd /app/frontend && yarn install --network-timeout 600000` → completed successfully in ~72s.
7. `sudo supervisorctl restart frontend backend` → both services RUNNING.
8. Verified compilation: `webpack compiled successfully`.
9. Verified HTTP: `localhost:3000 → 200`, external preview → `200`.
10. Visual verification: login screen ("Streamlined Hospitality. Exceptional Experience.") renders correctly.

## 7. Supervisor Configuration (read-only, not modified)
```
[program:frontend]
command=yarn start
directory=/app/frontend
environment=HOST="0.0.0.0",PORT="3000"
```
- Frontend served internally on `0.0.0.0:3000`, exposed externally at `https://bug-104-credit.preview.emergentagent.com`.
- Kubernetes ingress routes `/api/*` to backend (port 8001) and all other paths to frontend (port 3000).

## 8. Current Service Status
```
backend           RUNNING
frontend          RUNNING
mongodb           RUNNING
code-server       RUNNING
nginx-code-proxy  RUNNING
```

## 9. Known Warnings (non-blocking)
During `yarn install` the following peer-dependency warnings appeared. None block compilation or runtime:
- `react-day-picker@8.10.1` peer dep `react@^16/17/18` (project uses React 19).
- `@testing-library/react@14.3.1` peer dep `react@^18`.
- `recharts@3.8.1` peer dep `react-is`.
- Several deprecation warnings for transitive webpack/workbox/jest packages.

Webpack also emits non-blocking deprecation warnings at start (`DEP_WEBPACK_DEV_SERVER_ON_AFTER_SETUP_MIDDLEWARE`, etc.). These come from CRA 5 + Node 20 and do not affect operation.

## 10. Missing / Blocking Items
- **None.** No truncated secrets, no missing keys, no blocking dependencies.
- All env vars were supplied in full; `VAPID_KEY` confirmed by user.

## 11. How to Re-deploy / Restart
```bash
# After any .env change or dependency install
sudo supervisorctl restart frontend

# Re-install deps (yarn ONLY)
cd /app/frontend && yarn install --network-timeout 600000

# Live logs
tail -f /var/log/supervisor/frontend.out.log
tail -f /var/log/supervisor/frontend.err.log
```

## 12. URLs
- **Preview (external):** https://bug-104-credit.preview.emergentagent.com
- **Backend API base used by frontend:** https://preprod.mygenie.online/
- **Socket URL:** https://presocket.mygenie.online
- **CRM API base:** https://crm.mygenie.online/api

## 13. Next Agent Notes
- This deployment is **frontend-only**. The `/app/backend` folder is the default Emergent FastAPI scaffold from the repo and is **not** the real Mygenie backend. Real backend lives at `preprod.mygenie.online`.
- A banner is rendered by the app: *"Frontend Preview Only. Please wake servers to enable backend functionality."* — this is application-level UX from the repo and does NOT indicate a deployment issue.
- If future work requires switching env (preprod → prod), only the values in `/app/frontend/.env` need to change, followed by `sudo supervisorctl restart frontend`.
- Do **not** switch to npm. `yarn.lock` is the source of truth.
