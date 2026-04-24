# Deployment Handover — Core POS Frontend (roomv1-)

## Objective (from Deployment Agent task)
Deploy the `roomv1-` branch of `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
directly into `/app`, make the frontend run successfully under supervisor, and hand
over a clean note for the next Deployment Agent.

Scope was strictly: clone → configure env → install deps → run → verify.
No code changes, no bug fixes, no tests, no refactoring were performed.

---

## What was done (2026-04-24)
1. Stopped `frontend` + `backend` under supervisor.
2. Wiped `/app` completely (as instructed by user) — backed up `.emergent/` to
   `/tmp/.emergent_backup` before wiping (user approved wipe).
3. Cloned repo into `/app` directly (single-branch):
   ```
   git clone --branch 'roomv1-' --single-branch \
     https://github.com/Abhi-mygenie/core-pos-front-end-.git .
   ```
   - Current branch (verified): `roomv1-`
   - Head commit: `45bd3c3 Auto-generated changes`
4. Created `/app/frontend/.env` with all provided env values (see below).
5. Installed deps using **Yarn only**: `cd /app/frontend && yarn install`
   (72.9s, lockfile written; no npm used).
6. Started frontend via supervisor: `sudo supervisorctl start frontend`.
7. Verified:
   - `curl http://localhost:3000` → `HTTP 200`
   - `curl https://restaurant-pos-v2-1.preview.emergentagent.com` → `HTTP 200`
   - Visual screenshot load: Mygenie login page renders correctly
     ("Streamlined Hospitality. Exceptional Experience." + Email/Password/Login).
   - Webpack: `Compiled with warnings` (one non-blocking ESLint warning in
     `src/pages/LoadingPage.jsx:101` — `react-hooks/exhaustive-deps`. Not fixed
     because task is strictly deployment-only.)

---

## Stack (verified on this pod)
| Item | Version |
|------|---------|
| Node.js | v20.20.2 |
| Yarn | 1.22.22 |
| React | 19.0.0 |
| CRACO | 7.1.0 |
| Package manager | yarn (enforced — do NOT use npm) |

---

## Services / Supervisor
- `frontend` (yarn start / craco start) — **RUNNING** on `0.0.0.0:3000`.
- `backend` — stopped by this agent as part of the wipe; NOT required for this
  deployment (frontend-only task). The scaffold `/app/backend` was wiped;
  the repo shipped its own minimal `/app/backend/{server.py,requirements.txt}`
  but the backend was **not** installed or started (out of scope).
  The preview banner "Frontend Preview Only. Please wake servers…" is expected.
- Logs:
  - `/var/log/supervisor/frontend.out.log` — shows `webpack compiled successfully`.
  - `/var/log/supervisor/frontend.err.log` — only standard webpack-dev-server
    deprecation warnings.

Restart commands (for next agent):
```
sudo supervisorctl restart frontend
sudo supervisorctl status
```

---

## Environment variables (file: `/app/frontend/.env`)
All values were set exactly as provided by the user.

| Variable | Value |
|----------|-------|
| REACT_APP_BACKEND_URL | https://restaurant-pos-v2-1.preview.emergentagent.com |
| WDS_SOCKET_PORT | 443 |
| ENABLE_HEALTH_CHECK | false |
| REACT_APP_API_BASE_URL | https://preprod.mygenie.online/ |
| REACT_APP_SOCKET_URL | https://presocket.mygenie.online |
| REACT_APP_FIREBASE_API_KEY | AIzaSyCvn7MctrSgULjgiHqQSl4QfeP3dWxITwY |
| REACT_APP_FIREBASE_AUTH_DOMAIN | mygenie-restaurant.firebaseapp.com |
| REACT_APP_FIREBASE_PROJECT_ID | mygenie-restaurant |
| REACT_APP_FIREBASE_STORAGE_BUCKET | mygenie-restaurant.firebasestorage.app |
| REACT_APP_FIREBASE_MESSAGING_SENDER_ID | 969625631640 |
| REACT_APP_FIREBASE_APP_ID | 1:969625631640:web:2f2a2987f740b6fc8e09ed |
| REACT_APP_FIREBASE_MEASUREMENT_ID | G-WFK75QN54E |
| REACT_APP_FIREBASE_VAPID_KEY | BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-nssyqNG-EIJUu6WIA0MWJaouSUI |
| REACT_APP_CRM_BASE_URL | https://crm.mygenie.online/api |
| REACT_APP_CRM_API_KEYS | `{ "364": "...", ..., "716": "..." }` (15 tenant keys, see /app/frontend/.env) |
| REACT_APP_GOOGLE_MAPS_KEY | AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4 |

Note on `REACT_APP_FIREBASE_VAPID_KEY`: the value in the problem statement had
stray tab/`2` characters before the key (`\t2\tBEvFMTX...`). User approved using
the cleaned value `BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-nssyqNG-EIJUu6WIA0MWJaouSUI`.
If push notifications fail in runtime, please re-confirm this key with the user.

---

## Missing / blocking values
None at this time. Deployment completed end-to-end without any missing secret.
- All provided env values were accepted.
- Repo cloned publicly (no PAT required, as confirmed by user).
- VAPID key cleaning was confirmed by user in chat.

---

## Access URLs
- Preview (external): https://restaurant-pos-v2-1.preview.emergentagent.com
- Internal dev: http://localhost:3000

---

## Out of scope / NOT done (by design)
- No test suites were run.
- No testing_agent was invoked.
- No lint fixes / ESLint warning fix.
- No backend install/start.
- No code refactor, no dependency upgrade.
- No production build (`yarn build`) — running as dev server via supervisor
  per existing supervisor config.

---

## Next Action Items (for next Deployment Agent)
1. If the app must serve production assets instead of CRACO dev server, switch
   supervisor `frontend` command to run `yarn build` + a static server
   (e.g., `serve -s build -l 3000`). Current config is dev-server only.
2. If backend functionality is later required, install `/app/backend/requirements.txt`
   and start the `backend` supervisor program (currently stopped).
3. Optional cleanup: fix the single ESLint warning in
   `src/pages/LoadingPage.jsx:101` (missing dep `loadStationData`) — non-blocking.
4. Re-verify `REACT_APP_FIREBASE_VAPID_KEY` with the user if FCM push flows
   misbehave at runtime.
