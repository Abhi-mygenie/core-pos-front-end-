# Deployment Record — 2026-11-15 (Emergent E1 Fresh Deploy)

## Session Summary
Fresh deployment of the core-pos-front-end repo into the Emergent platform.

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: main (commit: 5df13be)

## What Was Done
1. Cloned repo into /tmp/pos-repo (main branch)
2. rsynced /tmp/pos-repo/frontend/ → /app/frontend/ (excluded .env, node_modules)
3. rsynced /tmp/pos-repo/memory/ → /app/memory/ (full sync, --delete)
4. Appended all missing app env vars to /app/frontend/.env
5. Removed stale node_modules from old placeholder app
6. Fresh yarn install (70s, 1 warning — exhaustive-deps lint only)
7. Restarted frontend supervisor → RUNNING pid 353
8. Webpack compiled with 1 warning (no errors)

## Env Variables Set
### Platform-managed (preserved)
- REACT_APP_BACKEND_URL
- WDS_SOCKET_PORT=443
- ENABLE_HEALTH_CHECK=false

### Secrets-managed (injected via Emergent secrets UI)
- REACT_APP_FIREBASE_API_KEY
- REACT_APP_FIREBASE_VAPID_KEY
- REACT_APP_GOOGLE_MAPS_KEY

### App vars (appended to .env)
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_AUTH_DOMAIN=mygenie-restaurant.firebaseapp.com
- REACT_APP_FIREBASE_PROJECT_ID=mygenie-restaurant
- REACT_APP_FIREBASE_STORAGE_BUCKET=mygenie-restaurant.firebasestorage.app
- REACT_APP_FIREBASE_MESSAGING_SENDER_ID=969625631640
- REACT_APP_FIREBASE_APP_ID=1:969625631640:web:2f2a2987f740b6fc8e09ed
- REACT_APP_FIREBASE_MEASUREMENT_ID=G-WFK75QN54E
- REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
- REACT_APP_SHOW_AUDIT_TAB=true

### Deferred (user to supply later)
- REACT_APP_CRM_API_KEYS (masked in source; user chose to skip)

## Verification
- Supervisor: RUNNING
- Webpack: compiled with 1 warning (lint only)
- Screenshot: MyGenie login page rendering correctly
- Memory dir: fully synced from remote branch main
