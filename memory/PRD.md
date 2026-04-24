# Deployment Handover — Mygenie Core POS Frontend

## Status: SUCCESSFUL DEPLOYMENT (build/run verified)

---

## 1. Source

- Repository: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: `roomv1-` (trailing hyphen is intentional — confirmed with user via screenshot)
- Cloned directly into: `/app`
- Current HEAD: `a7fc5b3 Auto-generated changes`

## 2. Environment (verified on this pod)

| Tool | Version |
|------|---------|
| Node.js | v20.20.2 |
| Yarn | 1.22.22 |
| React | 19.0.0 |
| CRACO | 7.1.0 (via react-scripts 5.0.1) |

- Package manager used: **Yarn only** (as required; no npm invoked).
- Lockfile: generated fresh via `yarn install` (repo had no `yarn.lock`). New `yarn.lock` is now committed to local working tree (not pushed).
- Install duration: ~68s. 0 errors; only peer-dep warnings (benign).

## 3. Service Layout

Managed by supervisor (`/etc/supervisor/conf.d/supervisord.conf` — READ-ONLY):
- `frontend`: `yarn start` → `craco start` in `/app/frontend`, binds `0.0.0.0:3000`
- `backend`: `uvicorn server:app` on `0.0.0.0:8001` in `/app/backend`
- `mongodb`: local MongoDB on 27017
- Kubernetes ingress routes `/api/*` → port 8001, everything else → port 3000.

Current status (verified):
```
backend    RUNNING
frontend   RUNNING   (webpack compiled successfully)
mongodb    RUNNING
```

## 4. Environment Files

### `/app/frontend/.env` (all values from user, written verbatim)
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
REACT_APP_FIREBASE_VAPID_KEY=BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-nssyqNG-EIJUu6WIA0MWJaouSUI
REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
REACT_APP_CRM_API_KEYS={...15 tenant keys...}
REACT_APP_GOOGLE_MAPS_KEY=AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4
```

### `/app/backend/.env` (created because repo shipped without one; required by `server.py` for MONGO_URL)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=*
```
Backend is a minimal placeholder FastAPI app (from repo) — present only to satisfy supervisor. Frontend uses external APIs (mygenie.online + preview URL in REACT_APP_BACKEND_URL), not this local backend.

## 5. Run-Verification

- `curl http://localhost:3000/` → HTTP 200, 6505 bytes
- `curl https://71564da1-69db-4cb5-9dac-be85ea6811d0.preview.emergentagent.com/` → HTTP 200
- Playwright screenshot: **Mygenie login page renders correctly** with logo, email/password fields, "LOG IN" button, "Streamlined Hospitality. Exceptional Experience." tagline, footer copyright.
- Webpack compiled successfully (1 benign ESLint warning: `LoadingPage.jsx:101` missing-dep on useEffect — NOT addressed per "no code changes" rule).

## 6. Actions Performed

1. Stopped `frontend` + `backend` supervisors.
2. Backed up `/app/.emergent/` (platform-critical), wiped `/app/*`, restored `.emergent`.
3. `git clone --branch "roomv1-" ... .` into `/app`.
4. Wrote `/app/frontend/.env` (verbatim user values).
5. Wrote `/app/backend/.env` with local MongoDB defaults (repo didn't ship one; supervisor-invoked backend requires `MONGO_URL`/`DB_NAME`).
6. `cd /app/frontend && yarn install` → success (68s).
7. `pip install -r /app/backend/requirements.txt` → success.
8. `supervisorctl start backend frontend` → both RUNNING, webpack compiled.

## 7. Notes / Caveats for Next Deployment Agent

- **Repo ships its own `.emergent/emergent.yml`**: it contains a stale `job_id`. We OVERWROTE it with this pod's platform-provided `.emergent` (only `env_image_name`). Do the same on future clones.
- **Repo contains extra top-level folders**: `v1/`, `v2/`, `v3/`, `tests/`, `memory/`, `test_reports/`, `test_result.md`. They are untouched; not required for runtime.
- **REACT_APP_BACKEND_URL points to a DIFFERENT preview URL** (`restaurant-pos-v2-1.preview.emergentagent.com`) than this pod's URL (`71564da1-...preview.emergentagent.com`). This is per user instruction — app is meant to call that external backend. If login/API fails at runtime, user's downstream service at `restaurant-pos-v2-1...` may need to be up. Not this pod's concern.
- **No secrets are truncated**; all env values were complete as provided. VAPID key corrected via follow-up user message (`BEvFMT...SUI`, not the API key value originally listed).
- **Yarn lockfile** was generated fresh (no lockfile in repo). If reproducibility matters, commit it upstream.
- **Do NOT run `npm install`** — will break React 19 + CRACO setup.
- **Hot reload is active** — code edits do not require supervisor restart. `.env` edits or dependency installs DO require `sudo supervisorctl restart frontend`.
- ESLint warning in `src/pages/LoadingPage.jsx` line 101 — LEFT UNTOUCHED per deployment-only scope.

## 8. Quick Commands

```bash
# status
sudo supervisorctl status

# restart frontend (after .env changes)
sudo supervisorctl restart frontend

# logs
tail -f /var/log/supervisor/frontend.out.log
tail -f /var/log/supervisor/frontend.err.log

# reinstall (if node_modules corrupt)
cd /app/frontend && rm -rf node_modules && yarn install
```

## 9. Pod URLs

- This pod (frontend served here): `https://71564da1-69db-4cb5-9dac-be85ea6811d0.preview.emergentagent.com`
- Target backend (configured in env): `https://restaurant-pos-v2-1.preview.emergentagent.com`
- Pre-prod API: `https://preprod.mygenie.online/`
- Socket: `https://presocket.mygenie.online`
- CRM: `https://crm.mygenie.online/api`

---
Handover complete. Frontend is live and rendering login page.
