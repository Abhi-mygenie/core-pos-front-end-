# Deployment Record — 2026-11-27 (Emergent E1)

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 20261127_072659
- Destination: /app (repo contents synced directly)

## What Was Done
1. **Staged repo** — cloned branch `20261127_072659` to `/tmp/core-pos-staging`
2. **Synced frontend** — `rsync --delete` from repo `frontend/` → `/app/frontend/` (node_modules and .env excluded)
3. **Synced memory** — full `rsync --delete` from repo `memory/` → `/app/memory/` (76 files)
4. **Platform files preserved** — `.emergent/emergent.yml` (current image kept), `backend/.env`, `.git`, supervisor configs untouched
5. **Frontend .env written** — all env vars from problem statement set; 4 missing keys collected via secure secrets card:
   - `REACT_APP_FIREBASE_API_KEY` ✓
   - `REACT_APP_FIREBASE_VAPID_KEY` ✓
   - `REACT_APP_GOOGLE_MAPS_KEY` ✓
   - `REACT_APP_CRM_API_KEYS` ✓
6. **Dependencies installed** — `yarn install` in `/app/frontend` (locked versions, no upgrades)
7. **Supervisor restarted** — `frontend` process restarted; webpack compiled with 1 warning, 0 errors
8. **Verified** — HTTP 200 on port 3000; login screen renders correctly

## Env Variables Set
| Key | Value / Status |
|-----|---------------|
| REACT_APP_API_BASE_URL | https://preprod.mygenie.online/ |
| REACT_APP_SOCKET_URL | https://presocket.mygenie.online |
| REACT_APP_FIREBASE_AUTH_DOMAIN | mygenie-restaurant.firebaseapp.com |
| REACT_APP_FIREBASE_PROJECT_ID | mygenie-restaurant |
| REACT_APP_FIREBASE_STORAGE_BUCKET | mygenie-restaurant.firebasestorage.app |
| REACT_APP_FIREBASE_MESSAGING_SENDER_ID | 969625631640 |
| REACT_APP_FIREBASE_APP_ID | 1:969625631640:web:2f2a2987f740b6fc8e09ed |
| REACT_APP_FIREBASE_MEASUREMENT_ID | G-WFK75QN54E |
| REACT_APP_CRM_BASE_URL | https://crm.mygenie.online/api |
| REACT_APP_SHOW_AUDIT_TAB | true |
| CORS_ORIGINS | * |
| REACT_APP_FIREBASE_API_KEY | (secret — set via secure card) |
| REACT_APP_FIREBASE_VAPID_KEY | (secret — set via secure card) |
| REACT_APP_GOOGLE_MAPS_KEY | (secret — set via secure card) |
| REACT_APP_CRM_API_KEYS | (secret — set via secure card) |

## Memory Sync Status
- 76 files fully synced from branch `20261127_072659`
- `.push_branch_name` reads: `20261121-171645`

## Status
- Frontend: RUNNING (supervisor pid active)
- Webpack: compiled with 1 warning (react-hooks/exhaustive-deps), 0 errors
- App URL: https://core-pos-5--0qgnful4.preview.emergentagent.com
