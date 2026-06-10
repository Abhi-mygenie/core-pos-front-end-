# Deployment Handover — MyGenie POS Frontend

## Date: 2026-05-20

## Source
- **Repo**: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- **Branch**: `20-may`

## Environment
- **Node.js**: v20.20.2
- **Yarn**: 1.22.22
- **CRACO**: v7.1.0
- **React**: 19.0.0
- **Preview URL**: https://insights-phase.preview.emergentagent.com

## What Was Done
1. Cloned the `20-may` branch from the source repo
2. Copied all frontend project files (src, public, plugins, configs) into `/app/frontend`
3. Created `.env` with all 16 environment variables as specified
4. Ran `yarn install` — completed successfully (peer dependency warnings only, no errors)
5. Restarted frontend via supervisor — compiled successfully with 1 eslint warning (non-blocking)
6. Verified the app loads at the preview URL — login page renders correctly

## Build Status
- **Compilation**: SUCCESS (with 1 non-blocking eslint warning in `OrderEntry.jsx` line 1259)
- **Runtime**: RUNNING via supervisor
- **Frontend accessible**: YES — login page loads correctly

## Environment Variables Configured
| Variable | Status |
|----------|--------|
| REACT_APP_BACKEND_URL | Set (preview URL) |
| WDS_SOCKET_PORT | 443 |
| ENABLE_HEALTH_CHECK | false |
| REACT_APP_API_BASE_URL | https://preprod.mygenie.online/ |
| REACT_APP_SOCKET_URL | https://presocket.mygenie.online |
| REACT_APP_FIREBASE_API_KEY | Set |
| REACT_APP_FIREBASE_AUTH_DOMAIN | Set |
| REACT_APP_FIREBASE_PROJECT_ID | Set |
| REACT_APP_FIREBASE_STORAGE_BUCKET | Set |
| REACT_APP_FIREBASE_MESSAGING_SENDER_ID | Set |
| REACT_APP_FIREBASE_APP_ID | Set |
| REACT_APP_FIREBASE_MEASUREMENT_ID | Set |
| REACT_APP_FIREBASE_VAPID_KEY | Set |
| REACT_APP_CRM_BASE_URL | Set |
| REACT_APP_CRM_API_KEYS | Set (JSON with 27 restaurant keys) |
| REACT_APP_GOOGLE_MAPS_KEY | Set |

## No Code Changes Made
Zero code modifications were required. The project compiled and ran as-is from the repository.

## Known Warnings (Non-Blocking)
1. **ESLint warning**: `OrderEntry.jsx` line 1259 — unnecessary dependency in `useCallback` hook
2. **Deprecation warnings**: Webpack dev server `onAfterSetupMiddleware`/`onBeforeSetupMiddleware` deprecated in favor of `setupMiddlewares`
3. **Peer dependency warnings**: `react-day-picker` expects React 16-18, project uses React 19 (functional)

## Notes for Next Agent
- Backend is external at `https://preprod.mygenie.online/` — no backend setup needed in this environment
- Socket connection to `https://presocket.mygenie.online` for real-time features
- Firebase configured for push notifications (VAPID key set)
- CRM API keys configured for 27 restaurant IDs
- Health check is disabled (`ENABLE_HEALTH_CHECK=false`)
