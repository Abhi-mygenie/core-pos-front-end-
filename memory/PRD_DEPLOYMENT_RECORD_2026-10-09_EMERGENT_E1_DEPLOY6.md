# Deployment Record — 2026-10-09 (Emergent E1 Deploy 6)

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 5oct-1
- Destination: /app/frontend (supervisor-managed, port 3000)

## Steps Performed

### Phase 1 — Preserve
- Preserved REACT_APP_BACKEND_URL from /app/frontend/.env (platform URL)
- Stopped frontend supervisor process

### Phase 2 — Deploy
- Cloned branch `5oct-1` to /tmp/repo-staging
- Cleared /app/frontend source files (node_modules preserved for speed)
- rsync'd /tmp/repo-staging/frontend/ → /app/frontend/ (no code edits)
- rsync'd /tmp/repo-staging/memory/ → /app/memory/ (--delete; repo wins; full sync)

### Phase 3 — .env
All provided env vars written to /app/frontend/.env:
- REACT_APP_BACKEND_URL (platform URL — preserved)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, MEASUREMENT_ID, VAPID_KEY
- REACT_APP_CRM_BASE_URL + REACT_APP_CRM_API_KEYS (364/475/478/509)
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true

### Phase 4 — Dependencies
- Package manager: yarn (no lockfile in repo — fresh yarn.lock generated)
- yarn install --ignore-engines (Node 20 / @testing-library/jest-dom@7 engine constraint bypassed)
- All packages installed successfully

### Phase 5 — Start & Verify
- Started frontend via `supervisorctl start frontend`
- webpack compiled with 1 warning (react-hooks/exhaustive-deps lint warnings only — no errors)
- HTTP 200 on port 3000 confirmed
- MyGenie POS login screen rendering: "Streamlined Hospitality. Exceptional Experience."

## Memory Dir Sync
- /app/memory/ fully in sync with remote branch 5oct-1 (rsync --delete, repo wins)
- All files from remote memory dir present in /app/memory/

## Platform Files Preserved
- /app/.emergent/ (platform config + cron)
- /app/backend/ (FastAPI backend + .env — MONGO_URL / DB_NAME intact)
- /app/tests/
- /app/test_reports/
- Supervisor config (readonly, unchanged)
