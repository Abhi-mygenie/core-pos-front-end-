# Deployment Record — 2026-10-17 (Emergent E1)

## Summary
Deployed `core-pos-front-end-` repo (branch: `main`) into the Emergent platform preview pod.

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: main
- Commit: HEAD at time of clone (2026-10-17)

## What Was Done
1. Cloned repo to `/tmp/pos-staging/` from `main` branch
2. Backed up `/app/memory/` to `/tmp/memory_backup/`
3. Cleared `/app/frontend/` entirely
4. Copied `/tmp/pos-staging/frontend/` → `/app/frontend/`
5. Wrote all env vars to `/app/frontend/.env` (see env vars below)
6. Ran `yarn install --ignore-engines` in `/app/frontend/` (no lockfile in repo; fresh install)
7. Synced staged repo memory (`/tmp/pos-staging/memory/`) → `/app/memory/`
8. Restarted `frontend` supervisor process
9. Confirmed: `webpack compiled with 1 warning`, HTTP 200 on port 3000

## Platform Structure Preserved
- `/app/.emergent/` — platform config (untouched)
- `/app/backend/` — FastAPI placeholder (untouched)
- `/app/memory/` — synced from staged repo (57 files)
- `/app/test_reports/` — untouched
- Supervisor configs at `/etc/supervisor/conf.d/` — untouched (readonly, platform-managed)

## Env Vars Written to `/app/frontend/.env`
```
WDS_SOCKET_PORT=443
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
REACT_APP_CRM_API_KEYS={"364":"...","475":"...","478":"...","509":"..."}
REACT_APP_GOOGLE_MAPS_KEY=AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4
CORS_ORIGINS=*
REACT_APP_SHOW_AUDIT_TAB=true
REACT_APP_BACKEND_URL=https://pos-front-preview-10.preview.emergentagent.com
```

## Verification
- Build: `webpack compiled with 1 warning` (ESLint hooks warnings only — no errors)
- HTTP: `200 OK` on port 3000
- Page title: "MyGenie POS"
- Login page renders correctly with MyGenie logo, tagline, email/password fields

## Notes
- No lockfile in repo; yarn generated a fresh `yarn.lock` during install
- `@emergentbase/overlay` is a platform package not in the repo; the platform injects it via supervisor env vars; earlier compile errors were from the previous build cycle, not the current one
- `craco start` used (matches repo's `start` script)
- All API calls point to `preprod.mygenie.online` as configured
