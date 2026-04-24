# Deployment Handover — core-pos-front-end-

**Deployment Date:** 2026-04-23
**Deployed By:** E1 Deployment Agent
**Status:** ✅ RUNNING

---

## 1. Source

| Field          | Value                                                       |
|----------------|-------------------------------------------------------------|
| Repository     | https://github.com/Abhi-mygenie/core-pos-front-end-.git     |
| Branch         | `main`                                                      |
| Commit (HEAD)  | `62c647e` — "Auto-generated changes"                        |
| Clone location | `/app` (repo pulled as the root of `/app`)                  |

The repository ships with a full scaffold (`/app/backend`, `/app/frontend`, `/app/memory`, `/app/v1`, `/app/v2`, `/app/v3`, `/app/tests`, `/app/test_reports`).

---

## 2. Runtime Stack (as declared)

- Node.js: **v20.20.2**
- Yarn: **1.22.22** (npm is forbidden for this project)
- React: **19.0.0**
- Build tool: **CRACO v7.1.0**

Verified present in environment.

---

## 3. Environment Variables (`/app/frontend/.env`)

All values provided by user were written verbatim:

| Key                                    | Value / Notes                                                      |
|----------------------------------------|--------------------------------------------------------------------|
| `REACT_APP_BACKEND_URL`                | `https://roomv1-build.preview.emergentagent.com`            |
| `WDS_SOCKET_PORT`                      | `443`                                                              |
| `ENABLE_HEALTH_CHECK`                  | `false`                                                            |
| `REACT_APP_API_BASE_URL`               | `https://preprod.mygenie.online/`                                  |
| `REACT_APP_SOCKET_URL`                 | `https://presocket.mygenie.online`                                 |
| `REACT_APP_FIREBASE_API_KEY`           | set                                                                |
| `REACT_APP_FIREBASE_AUTH_DOMAIN`       | `mygenie-restaurant.firebaseapp.com`                               |
| `REACT_APP_FIREBASE_PROJECT_ID`        | `mygenie-restaurant`                                               |
| `REACT_APP_FIREBASE_STORAGE_BUCKET`    | `mygenie-restaurant.firebasestorage.app`                           |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | `969625631640`                                                   |
| `REACT_APP_FIREBASE_APP_ID`            | `1:969625631640:web:2f2a2987f740b6fc8e09ed`                        |
| `REACT_APP_FIREBASE_MEASUREMENT_ID`    | `G-WFK75QN54E`                                                     |
| `REACT_APP_FIREBASE_VAPID_KEY`         | set (user confirmed value is complete)                             |
| `REACT_APP_CRM_BASE_URL`               | `https://crm.mygenie.online/api`                                   |
| `REACT_APP_CRM_API_KEYS`               | JSON object with 15 property→key pairs — stored as a single line   |
| `REACT_APP_GOOGLE_MAPS_KEY`            | set                                                                |

No secrets are missing or truncated.

---

## 4. Deployment Steps Executed

1. Stopped supervisor services `frontend` and `backend`.
2. Wiped `/app` contents (preserved only `/app/.emergent`, the platform-managed directory).
3. `git clone -b main https://github.com/Abhi-mygenie/core-pos-front-end-.git` and moved the clone into `/app` (repo at `/app` root; frontend at `/app/frontend`).
4. Wrote `/app/frontend/.env` with the exact env values provided.
5. `cd /app/frontend && yarn install` → completed in ~69s, lockfile generated.
6. `sudo supervisorctl start frontend` → running.
7. Backend supervisor service kept **stopped** (per user instruction — this repo deploys frontend only).

---

## 5. Verification

| Check                                                     | Result                     |
|-----------------------------------------------------------|----------------------------|
| `yarn install` exit code                                  | 0 (success)                |
| Webpack compile                                           | Compiled successfully (1 non-blocking ESLint warning in `src/pages/LoadingPage.jsx` line 101) |
| `supervisorctl status frontend`                           | RUNNING                    |
| `curl http://localhost:3000/`                             | HTTP 200                   |
| `curl https://roomv1-build.preview.emergentagent.com/` | HTTP 200               |
| Browser screenshot                                        | Mygenie login page renders correctly with logo and form |

---

## 6. Supervisor Configuration (unchanged)

Supervisor config at `/etc/supervisor/conf.d/supervisord.conf` is a read-only platform file. The existing `frontend` program (`yarn start` in `/app/frontend`) matches the repo layout, so no changes were required.

- `frontend` → started, autostart=true
- `backend` → stopped manually (repo is frontend-only). It will auto-start on a supervisor full restart; the next agent should decide whether to deploy `/app/backend/server.py` or leave the program disabled.

---

## 7. Known Non-Blocking Warnings

- ESLint warning: `src/pages/LoadingPage.jsx:101` — `useEffect missing dependency 'loadStationData'`. Does not affect runtime.
- Standard webpack-dev-server deprecation warnings (`onBeforeSetupMiddleware`, `onAfterSetupMiddleware`) — cosmetic only.
- Peer-dependency warnings from `react-day-picker@8.10.1` (wants React 16–18; project uses React 19). Does not break build.
- "Frontend Preview Only. Please wake servers to enable backend functionality." banner appears because the `backend` supervisor program is stopped.

---

## 8. Missing / Blocking Items for Next Agent

**None.** Deployment is complete and the preview URL returns the app.

---

## 9. Useful Commands for Next Agent

```bash
# Service status
sudo supervisorctl status

# Restart frontend
sudo supervisorctl restart frontend

# Tail frontend logs
tail -f /var/log/supervisor/frontend.out.log
tail -f /var/log/supervisor/frontend.err.log

# Install a new dep (ALWAYS yarn, never npm)
cd /app/frontend && yarn add <package>

# Rebuild / re-pull
cd /app && git pull origin main
cd /app/frontend && yarn install && sudo supervisorctl restart frontend
```

---

## 10. Public URL

🔗 **https://roomv1-build.preview.emergentagent.com**
