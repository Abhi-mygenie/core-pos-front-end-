# Deployment Handover – core-pos-front-end- (branch: may4)

Date: 2026-05-04
Deployment Agent: E1 (Senior Deployment Agent)
Environment: Emergent preview (Kubernetes container)

---

## 1. Objective
Deploy the frontend from the Git repository
`https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `may4`)
into `/app` on Emergent and bring it up successfully behind the Emergent
preview URL.

Note: the problem statement referred to the branch as "strictly may4".
No branch literally named `strictly may4` exists on the remote. The only
branch matching the intent is `may4`, which is what was deployed.

---

## 2. Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch deployed: `may4`
- Head commit used: pulled via `git clone --depth 1 -b may4` on 2026-05-04
- Clone destination: directly into `/app` (contents moved from the clone,
  `.emergent` directory preserved as required by the platform).

---

## 3. Runtime / Tooling
- Node.js: v20.20.2 (image default)
- Yarn: 1.22.22 (yarn only — npm NOT used, as required)
- Python (backend): system `/root/.venv`
- React: 19.0.0
- CRACO: 7.1.0
- Dev server: `yarn start` (CRACO) via supervisor, bound to `0.0.0.0:3000`

---

## 4. File / Folder Layout after deployment
```
/app/
├── .emergent/              (preserved – platform managed)
├── .git/                   (from cloned repo)
├── archived/
├── backend/                (minimal FastAPI starter from repo)
│   ├── requirements.txt
│   ├── server.py
│   └── .env                (recreated – see section 5)
├── frontend/               (React 19 + CRACO app – main deliverable)
│   ├── package.json
│   ├── craco.config.js
│   ├── public/
│   ├── src/
│   ├── node_modules/       (populated via `yarn install`)
│   └── .env                (recreated – see section 5)
├── memory/
│   └── .intake-sa.json     (Google service-account JSON placed as required)
├── test_reports/
├── tests/
└── README.md
```

---

## 5. Environment variables

### 5.1 /app/frontend/.env  (set as provided in the problem statement)
| Key | Value |
|---|---|
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
| REACT_APP_CRM_API_KEYS | (full JSON object of 15 tenant→dp_live_* keys, as provided) |
| REACT_APP_GOOGLE_MAPS_KEY | AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4 |

### 5.2 /app/backend/.env
Protected keys kept intact + Google-related keys from the handover:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
GOOGLE_SHEET_ID=1d3KIARjVkvhcyHZc-ZD5QIAOy9ZoRAJfkWbEcy3Ah50
GOOGLE_SHEET_TAB=Bugs
GOOGLE_DRIVE_SCOPES=https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive.readonly
GOOGLE_SERVICE_ACCOUNT_FILE=/app/memory/.intake-sa.json
```

### 5.3 /app/memory/.intake-sa.json
Created from the `GOOGLE_SERVICE_ACCOUNT_JSON` value in the problem
statement (service account `bug-intake@voice-bug-intake.iam.gserviceaccount.com`).

---

## 6. Steps executed (exactly, in order)
1. Inspected `/app` and confirmed the Emergent supervisor expects
   `/app/frontend` and `/app/backend` directories.
2. `git ls-remote` to identify the correct branch (`may4`).
3. Shallow-cloned the repo to `/tmp/inspect` to verify structure.
4. Backed up `/app/.emergent` to `/tmp/_emergent_backup`.
5. Removed prior `/app` starter contents (`.git`, `backend`, `frontend`,
   `memory`, `tests`, `test_reports`, `test_result.md`, `yarn.lock`,
   `README.md`, `.gitignore`).
6. Moved every file/folder from `/tmp/inspect` into `/app` (including
   `.git`, `.gitignore`, `.gitconfig`) so the repo now lives directly
   under `/app`.
7. Restored `/app/.emergent`.
8. Wrote `/app/frontend/.env` with the 17 variables listed above.
9. Wrote `/app/backend/.env` and `/app/memory/.intake-sa.json`.
10. `cd /app/frontend && yarn install` (Yarn 1.22.22) — completed in ~78s.
11. `pip install -r /app/backend/requirements.txt` (backend already
    healthy; no changes to Python deps needed).
12. `sudo supervisorctl restart frontend backend`.
13. Tailed supervisor logs until CRACO reported
    `Compiled with warnings.` / `webpack compiled with 1 warning`.
14. Verified HTTP 200 on both
    `http://localhost:3000` and
    `https://insights-phase.preview.emergentagent.com`.
15. Visual verification via headless browser screenshot — the Mygenie
    login page renders correctly (logo, tagline
    “Streamlined Hospitality. Exceptional Experience.”,
    email / password inputs, Log In button, Forgot Password link).

---

## 7. Current runtime status
| Service | Status | Notes |
|---|---|---|
| frontend | RUNNING | CRACO dev server on :3000, hot reload enabled |
| backend  | RUNNING | FastAPI starter on :8001 |
| mongodb  | RUNNING | Local mongod bound to all IPs |
| code-server / nginx-code-proxy | RUNNING | Emergent platform defaults |

Build output: `webpack compiled with 1 warning` — a single harmless
ESLint `react-hooks/exhaustive-deps` warning in
`src/pages/LoadingPage.jsx` line 111. It does NOT block compilation
and was left untouched (scope limited to deployment).

---

## 8. Public URL
https://insights-phase.preview.emergentagent.com
(routes `/api/*` → backend :8001, everything else → frontend :3000 –
platform managed; not modified.)

---

## 9. Known warnings / non-blocking items
- `[VisualEditsPlugin] Failed to read overlay: ... visual-edit-overlay.js`
  – missing file inside the Emergent visual-edits plugin directory;
  compile continues successfully. This is an Emergent platform plugin
  asset, not a repo file. Safe to ignore for deployment.
- Yarn peer-dependency warnings for `react-day-picker`, `recharts`,
  `typescript`, etc. None block the build.
- Multiple Webpack dev-server deprecation warnings (`onAfterSetupMiddleware`,
  `onBeforeSetupMiddleware`, `Compilation.assets frozen`). Informational
  only.

---

## 10. Missing / truncated values (flagged per rules)
All env values supplied in the problem statement were complete and
non-truncated. Nothing was missing. Specifically:
- `REACT_APP_FIREBASE_VAPID_KEY` – full value used.
- `REACT_APP_CRM_API_KEYS` – full JSON used for all 15 tenant IDs.
- `GOOGLE_SERVICE_ACCOUNT_JSON` – PEM private key is intact and valid
  (begins with `-----BEGIN PRIVATE KEY-----`, ends with
  `-----END PRIVATE KEY-----`).

No blockers were encountered due to missing secrets.

---

## 11. What was NOT done (explicitly, per the rules)
- No test agent invoked.
- No test suites executed.
- No source-code changes, refactoring, lint fixes, bug fixes, or
  architecture review.
- No dependency pins, package.json or requirements.txt edits.
- No new files beyond `.env` and the service-account JSON required
  for the runtime to start.

---

## 12. For the next Deployment Agent – quick checklist
1. Confirm `/app/.emergent` still exists (platform requirement).
2. If rotating secrets, update ONLY `/app/frontend/.env` (and
   `/app/backend/.env` for Google keys) and run:
   `sudo supervisorctl restart frontend backend`
3. If `yarn.lock` changes, run `cd /app/frontend && yarn install`
   before restarting.
4. Do NOT switch to npm.
5. Do NOT modify `/etc/supervisor/conf.d/supervisord.conf` (it is
   marked READONLY and already wired to `/app/frontend` and
   `/app/backend`).
6. If a different branch must be deployed, the cleanest path is:
   back up `.emergent`, wipe `/app`, `git clone -b <branch>
   https://github.com/Abhi-mygenie/core-pos-front-end-.git .`,
   restore `.emergent`, re-create the two `.env` files, re-create
   `/app/memory/.intake-sa.json`, `yarn install`, restart supervisor.

---

## 13. Final verification snapshot
- `curl -o /dev/null -w '%{http_code}' https://insights-phase.preview.emergentagent.com` → **200**
- `curl -o /dev/null -w '%{http_code}' http://localhost:3000` → **200**
- Browser screenshot: Mygenie login page renders end-to-end with
  logo, inputs and primary CTA.

Deployment: **SUCCESSFUL**.
