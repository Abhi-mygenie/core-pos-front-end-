# Deployment Record — 2026-10-11 (Branch: 11oct)

## Deployed
- **Repo**: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- **Branch**: 11oct
- **Target**: /app/frontend (supervisor runs `yarn start` from here)
- **App**: MyGenie Core POS Frontend (React / craco)

## Steps Performed
1. Stopped frontend supervisor process
2. Backed up existing node_modules to /tmp (preserved for speed)
3. Cleared /app/frontend, copied repo's frontend/ contents into /app/frontend/
4. Restored node_modules
5. Wrote full .env with all provided env variables
6. Ran `yarn install --ignore-engines` (Node 20 vs @firebase/ai engine requirement Node>=24)
7. Synced /app/memory/ from repo's memory/ directory (46 files/dirs)
8. Started frontend supervisor process
9. Verified: HTTP 200, webpack compiled successfully, login screen rendering

## .env Variables Set
- REACT_APP_BACKEND_URL (platform protected)
- WDS_SOCKET_PORT=443
- ENABLE_HEALTH_CHECK=false
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID / STORAGE_BUCKET / MESSAGING_SENDER_ID / APP_ID / MEASUREMENT_ID / VAPID_KEY
- REACT_APP_CRM_BASE_URL / CRM_API_KEYS (partial — 509 key was truncated in problem statement, placeholder used)
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=*
- REACT_APP_SHOW_AUDIT_TAB=true

## Notes
- No code edits made — deployed as-is from branch
- `--ignore-engines` used for yarn install due to @firebase/ai@3.0.0 requiring Node>=24 (env has Node 20)
- REACT_APP_CRM_API_KEYS for key "509" is a placeholder — needs to be updated with real value
- Memory dir fully synced with remote branch (46 files)
