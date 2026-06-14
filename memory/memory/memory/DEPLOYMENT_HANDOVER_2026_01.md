# Deployment Handover Note — 2026-01 run

## Summary
The React frontend (Core POS / mygenie) was successfully deployed into the Emergent environment on the `5may` branch. The dev server is compiled and running; the login page is rendering at the public preview URL.

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: `5may`
- Cloned directly into `/app` (repo contents placed at `/app/...`, NOT into a sub-folder).
- Preserved platform-required folders: `.emergent/` and `/app/.git/` (Emergent's platform git, not the upstream repo's `.git`). The upstream `.git` was intentionally excluded during rsync so that the Emergent platform checkpoint git remains intact.

## Tech Stack
- React 19.0.0
- CRACO 7.1.0
- Yarn 1.22.22
- Node.js v20.20.2

## Deployment Steps Performed
1. Stopped `frontend` and `backend` supervisor services.
2. Cleared the previous boilerplate in `/app` (backend, frontend, memory, tests, etc.), while keeping `.emergent/` and `.git/`.
3. Shallow-cloned the `5may` branch into `/tmp/core-pos-peek` and `rsync`-ed it (excluding the upstream `.git`) into `/app`.
4. Wrote `/app/frontend/.env` with all provided `REACT_APP_*` variables.
5. Wrote `/app/backend/.env` with `MONGO_URL`, `DB_NAME`, CORS + the `GOOGLE_*` values.
6. Wrote Google service account JSON to `/app/memory/.intake-sa.json` (path referenced by `GOOGLE_SERVICE_ACCOUNT_FILE`).
7. Ran `yarn install` in `/app/frontend` (completed in ~77s, no errors; only deprecation / peer-dep warnings).
8. Ran `pip install -r requirements.txt` in `/app/backend` (deps already satisfied).
9. Started `backend` and `frontend` via `supervisorctl`.
10. Verified the preview URL renders the login page with the mygenie branding.

## Service Status (at handover)
```
backend      RUNNING
frontend     RUNNING   (craco start, CRA dev server)
mongodb      RUNNING
code-server  RUNNING
nginx-code-proxy  RUNNING
```
- Frontend compiled successfully with ONE non-blocking ESLint warning:
  `src/pages/LoadingPage.jsx Line 111:6: React Hook useEffect has a missing dependency: 'loadStationData'`
  → Cosmetic only; does not block the build.

## Public Preview URL
- https://insights-phase.preview.emergentagent.com

## Folder Layout Deployed
```
/app
├── .emergent/        (platform - preserved)
├── .git/             (platform's checkpoint git - preserved)
├── archived/
├── backend/          (FastAPI stub from repo)
├── frontend/         (React 19 + CRACO app - THE target deploy)
├── memory/
│   └── .intake-sa.json   (created at deploy time)
├── tests/
├── test_reports/
├── README.md
├── test_result.md
├── .gitignore
├── .gitconfig
└── end
```

## Environment Variables Applied

### /app/frontend/.env
| Key | Value |
|-----|-------|
| REACT_APP_BACKEND_URL | https://insights-phase.preview.emergentagent.com |
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
| REACT_APP_CRM_API_KEYS | {JSON object with 15 tenant → dp_live_* mappings — set} |
| REACT_APP_GOOGLE_MAPS_KEY | AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4 |

### /app/backend/.env
- `MONGO_URL=mongodb://localhost:27017`
- `DB_NAME=test_database`
- `CORS_ORIGINS=*`
- `GOOGLE_SERVICE_ACCOUNT_JSON=<full JSON>`
- `GOOGLE_SHEET_ID=1d3KIARjVkvhcyHZc-ZD5QIAOy9ZoRAJfkWbEcy3Ah50`
- `GOOGLE_SHEET_TAB=Bugs`
- `GOOGLE_DRIVE_SCOPES=https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive.readonly`
- `GOOGLE_SERVICE_ACCOUNT_FILE=/app/memory/.intake-sa.json`

### /app/memory/.intake-sa.json
Google service-account JSON file created and readable at the path above.

## Commands Reference
```bash
# install frontend deps
cd /app/frontend && yarn install

# install backend deps
cd /app/backend && pip install -r requirements.txt

# restart services
sudo supervisorctl restart frontend
sudo supervisorctl restart backend

# status
sudo supervisorctl status

# logs
tail -n 100 /var/log/supervisor/frontend.err.log
tail -n 100 /var/log/supervisor/frontend.out.log
tail -n 100 /var/log/supervisor/backend.err.log
```

## Notes / Caveats / Missing Info
- **No truncated or missing secret/key encountered** in the problem statement. All provided env values were applied as-is.
- The upstream repo's own `.git` directory was NOT copied into `/app` (the Emergent platform's `/app/.git` was preserved). If git-based operations against the upstream `Abhi-mygenie/core-pos-front-end-` remote are required from within `/app`, use the Emergent "Save to GitHub" feature, or re-initialize a remote manually.
- The repo includes its own `backend/` folder with a stub FastAPI app (`server.py`). It has been left in place and is running, but the task scope was frontend only — no changes were made to backend code.
- One ESLint warning in `src/pages/LoadingPage.jsx` (missing `loadStationData` dependency in `useEffect`) — non-blocking, build still succeeds.
- The preview page shows a "Frontend Preview Only. Please wake servers to enable backend functionality." banner generated by the app itself — this is produced by the app when its remote API (`preprod.mygenie.online`) is asleep, not an Emergent issue.

## Handover Status
Deployment: **SUCCESS**. Frontend dev server is compiled and serving the login page at the public preview URL. Ready for the next agent.
