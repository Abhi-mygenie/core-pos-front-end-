# Deployment Handover Note

## Deployment Status: SUCCESS

The frontend has been deployed and is running successfully in the Emergent environment.

## Source
- **Repo**: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- **Branch**: `6-may`
- **Cloned directly into**: `/app` (as required)
- **Latest commit**: `49413de Auto-generated changes`

## Stack Verified
- React 19.0.0
- CRACO v7.1.0
- Yarn 1.22.22
- Node.js v20.20.2
- Package manager: YARN ONLY (no npm used)

## Project Structure (in /app)
```
/app
├── frontend/        # React + CRACO app (deployed here)
├── backend/         # Minimal FastAPI (server.py + requirements.txt) — supervisor runs it
├── archived/
├── memory/
├── tests/
└── test_reports/
```

## Steps Performed (minimum required for deployment)
1. Wiped previous `/app` contents (preserved `.emergent/` folder for platform integration).
2. `git clone -b 6-may` directly into `/app`.
3. Created `/app/frontend/.env` with all 16 provided variables (REACT_APP_BACKEND_URL, Firebase keys, CRM keys, Google Maps key, etc.).
4. Created `/app/backend/.env` with `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, plus `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_TAB`, `GOOGLE_DRIVE_SCOPES`, `GOOGLE_SERVICE_ACCOUNT_FILE`.
5. Ran `yarn install` in `/app/frontend` (success, lockfile saved).
6. Ran `pip install -r requirements.txt` in `/app/backend`.
7. `sudo supervisorctl restart backend frontend`.

## Verification
- `supervisorctl status` → backend RUNNING, frontend RUNNING, mongodb RUNNING.
- `curl http://localhost:3000` → HTTP 200.
- `curl http://localhost:8001/api/` → HTTP 200.
- Public URL `https://insights-phase.preview.emergentagent.com` loads the Mygenie login page (logo, "Streamlined Hospitality. Exceptional Experience.", email/password form, LOG IN button) — confirmed via screenshot.
- Webpack: `Compiled successfully!`

## Environment Files
### `/app/frontend/.env`
All 16 keys from the brief set verbatim:
- REACT_APP_BACKEND_URL = https://insights-phase.preview.emergentagent.com
- WDS_SOCKET_PORT = 443
- ENABLE_HEALTH_CHECK = false
- REACT_APP_API_BASE_URL = https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL = https://presocket.mygenie.online
- REACT_APP_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID / STORAGE_BUCKET / MESSAGING_SENDER_ID / APP_ID / MEASUREMENT_ID / VAPID_KEY
- REACT_APP_CRM_BASE_URL = https://crm.mygenie.online/api
- REACT_APP_CRM_API_KEYS (full JSON map of dp_live_* keys)
- REACT_APP_GOOGLE_MAPS_KEY

### `/app/backend/.env`
- MONGO_URL, DB_NAME, CORS_ORIGINS (Emergent defaults preserved)
- GOOGLE_SERVICE_ACCOUNT_JSON (voice-bug-intake service account, full JSON kept on a single line as required)
- GOOGLE_SHEET_ID = 1d3KIARjVkvhcyHZc-ZD5QIAOy9ZoRAJfkWbEcy3Ah50
- GOOGLE_SHEET_TAB = Bugs
- GOOGLE_DRIVE_SCOPES = https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive.readonly
- GOOGLE_SERVICE_ACCOUNT_FILE = /app/memory/.intake-sa.json
  - NOTE: this file path is referenced in env but the actual file `/app/memory/.intake-sa.json` was not provided and is not present on disk. If any backend code depends on reading this file (the current `server.py` does not), drop the JSON content there. The JSON content is already available in `GOOGLE_SERVICE_ACCOUNT_JSON`.

## Supervisor Services
- `backend` → `uvicorn server:app --host 0.0.0.0 --port 8001 --reload` in `/app/backend`
- `frontend` → `yarn start` (CRACO dev server) in `/app/frontend`, host 0.0.0.0, port 3000
- `mongodb` → local mongod
- All start automatically on boot via supervisor; do **not** modify ports.

## Known Non-blocking Warnings (informational only)
- A few yarn peer-dependency warnings (react-day-picker, recharts, @testing-library/react) — do not affect runtime.
- Frontend stderr shows a one-time `[VisualEditsPlugin] Failed to read overlay: ENOENT ...visual-edit-overlay.js` and an old cache ENOENT during the very first crash loop before deps finished installing. Both cleared after restart; webpack now compiles cleanly.
- A "Frontend Preview Only. Please wake servers..." banner from the Emergent platform appears on the public URL — this is the platform overlay, not an app issue.

## Missing / Truncated Values (flag for next agent)
- **None blocking.** All required deployment values were provided in full.
- The `/app/memory/.intake-sa.json` file path is declared in env but the file is not on disk; only relevant if downstream code reads from `GOOGLE_SERVICE_ACCOUNT_FILE` directly instead of `GOOGLE_SERVICE_ACCOUNT_JSON`.

## How to Re-deploy / Recover
```bash
cd /app
# (only if you must reset)
# rm -rf /app/* /app/.git /app/.gitignore && cp -r /tmp/emergent_backup /app/.emergent
# git clone -b 6-may https://github.com/Abhi-mygenie/core-pos-front-end-.git .
cd /app/frontend && yarn install
cd /app/backend  && pip install -r requirements.txt
sudo supervisorctl restart backend frontend
sudo supervisorctl status
curl -I http://localhost:3000
curl -I http://localhost:8001/api/
```

## Out of Scope (per task rules)
- No code analysis, no bug fixing, no refactoring, no test agent, no test suite execution performed.
