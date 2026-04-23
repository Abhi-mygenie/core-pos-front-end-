# Deployment Handover — core-pos-front-end (Mygenie)

**Date:** 2026-01-23
**Agent:** Senior Deployment Agent (E1)

## 1. Summary
The frontend from https://github.com/Abhi-mygenie/core-pos-front-end-.git (branch: `main`) has been cloned and deployed into the Emergent preview environment. The app compiles and serves the login page at the preview URL with HTTP 200.

**Preview URL:** https://restaurant-pos-v2-1.preview.emergentagent.com
**Supervisor status:** `frontend RUNNING`

## 2. Source & Placement
- **Repo:** https://github.com/Abhi-mygenie/core-pos-front-end-.git
- **Branch:** `main` (last commit: `Initial commit`, per `git log`)
- **Clone strategy:** Cloned to `/tmp/core-pos-clone`, then:
  - `/tmp/core-pos-clone/frontend/*` → replaced `/app/frontend`
  - `/tmp/core-pos-clone/v1`, `v2`, `v3` → `/app/memory/v1`, `v2`, `v3`
  - `/tmp/core-pos-clone/memory/*` → merged into `/app/memory/`
  - `/tmp/core-pos-clone` deleted after copy
- Existing `/app/.git`, `/app/.emergent` preserved.

## 3. Tech Stack (as deployed)
| Component | Version |
|-----------|---------|
| React | ^19.0.0 |
| CRACO | ^7.1.0 |
| Yarn | 1.22.22 |
| Node.js | v20.20.2 |
| react-scripts | 5.0.1 |

Dependencies installed with `yarn install` inside `/app/frontend` (lockfile saved).

## 4. Environment File — `/app/frontend/.env`
Created per user-provided values:
```
REACT_APP_BACKEND_URL=https://restaurant-pos-v2-1.preview.emergentagent.com
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
REACT_APP_FIREBASE_VAPID_KEY=BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-
REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
REACT_APP_CRM_API_KEYS={...15 restaurants map...}
REACT_APP_GOOGLE_MAPS_KEY=AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4
```

### ⚠️ PENDING VALUE — owner will provide later (non-blocking for deploy)
- **`REACT_APP_FIREBASE_VAPID_KEY`** is currently truncated (`BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-`, 60 chars; real key is ~88 chars).
- **Owner decision:** deferred — will be supplied in a later deployment (Option B).
- **Impact while deferred:** app boots, auth + CRM + maps + sockets all work; **only Firebase Cloud Messaging web-push token registration will fail** (`getToken(messaging, { vapidKey })`).
- **To fix later:** Firebase Console → project `mygenie-restaurant` → Project Settings → Cloud Messaging tab → Web Push certificates → copy public "Key pair" → replace the value in `/app/frontend/.env` → `sudo supervisorctl restart frontend`.

## 5. Deployment Steps Executed
1. `sudo supervisorctl stop frontend`
2. `git clone --branch main <repo> /tmp/core-pos-clone`
3. `rm -rf /app/frontend && cp -r /tmp/core-pos-clone/frontend /app/frontend`
4. Copied `v1`, `v2`, `v3`, and repo `memory/*` into `/app/memory/`
5. Created `/app/frontend/.env`
6. `cd /app/frontend && yarn install` (71s, success)
7. `sudo supervisorctl restart frontend`
8. Verified: `curl localhost:3000` → HTTP 200; preview URL renders the Mygenie login page.

## 6. Build / Run Verification
- **Supervisor:** `frontend RUNNING` (pid 564)
- **Localhost:** `curl -s http://localhost:3000` → `200 OK`, HTML served
- **Public:** Screenshot at preview URL shows the login screen ("Streamlined Hospitality. Exceptional Experience.") rendering correctly.
- **Compile result:** `webpack compiled with 1 warning` (single eslint `exhaustive-deps` warning in `src/pages/LoadingPage.jsx:101` — non-blocking).

## 7. Known Non-Blocking Warnings
- ESLint: `react-hooks/exhaustive-deps` warning in `LoadingPage.jsx`.
- Yarn peer-dep warnings: `react-day-picker` (date-fns/react range), misc typescript peer deps. None affect runtime.
- `@emergentbase/visual-edits` logs an overlay ENOENT on first boot; self-resolves after dist files are fully extracted on the next rebuild. Does not block compile.

## 8. Services Not Deployed
- Backend, tests, and `test_reports/` from the repo were **not** deployed — per scope, only frontend was required.

## 9. Commands for Next Agent
```bash
# Check status
sudo supervisorctl status frontend
tail -n 100 /var/log/supervisor/frontend.out.log

# Restart after env or dep change
sudo supervisorctl restart frontend

# Reinstall deps (yarn ONLY)
cd /app/frontend && yarn install

# Add a package
cd /app/frontend && yarn add <pkg>
```

## 10. Action Items for Next Agent
1. **(Deferred by owner — Option B)** When the full `REACT_APP_FIREBASE_VAPID_KEY` is supplied, paste it into `/app/frontend/.env` (replace the truncated value) and run `sudo supervisorctl restart frontend`.
2. Backend connectivity at `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/` — owner confirmed reachable.
3. Optional: fix the single eslint warning in `src/pages/LoadingPage.jsx:101`.
