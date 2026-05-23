# MyGenie Core POS Frontend - PRD & Deployment Handover

## Project Overview
- **App**: MyGenie Core POS Frontend (Restaurant/Hospitality POS system)
- **Source Repo**: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- **Branch**: 23-may
- **Deployed Date**: 2026-01-23

## Tech Stack
- React 19.0.0
- CRACO v7.1.0 (Create React App Configuration Override)
- Yarn 1.22.22
- Node.js v20.20.2
- Tailwind CSS 3.4.17
- Radix UI components
- Firebase (auth, analytics, messaging)
- Socket.io client
- React Router DOM v7
- Recharts for data viz
- Axios for HTTP

## Architecture
- **Frontend Only** deployment on Emergent platform
- Backend API: `https://preprod.mygenie.online/` (external)
- Socket: `https://presocket.mygenie.online` (external)
- CRM: `https://crm.mygenie.online/api` (external)
- Firebase for auth/notifications
- Google Maps integration

## Deployment Details

### Agent URL
`https://704bf705-5ffc-46a9-a11f-112676a8f379.preview.emergentagent.com`

### Services Running
| Service | Status | Port |
|---------|--------|------|
| Frontend (craco start) | RUNNING | 3000 |
| Backend (FastAPI) | RUNNING | 8001 (default, unused by POS app) |
| MongoDB | RUNNING | 27017 (default, unused by POS app) |

### Environment Variables Set
All env variables configured in `/app/frontend/.env`:
- REACT_APP_BACKEND_URL (Emergent agent URL)
- WDS_SOCKET_PORT=443
- ENABLE_HEALTH_CHECK=false
- REACT_APP_API_BASE_URL (preprod.mygenie.online)
- REACT_APP_SOCKET_URL (presocket.mygenie.online)
- Firebase config (API key, auth domain, project ID, storage bucket, messaging sender ID, app ID, measurement ID, VAPID key)
- REACT_APP_CRM_BASE_URL
- REACT_APP_CRM_API_KEYS (JSON with 27 restaurant keys)
- REACT_APP_GOOGLE_MAPS_KEY

### What Was Done
1. Cloned repo from GitHub (branch: 23-may)
2. Copied frontend source files to `/app/frontend/`
3. Configured all environment variables in `.env`
4. Installed dependencies via `yarn install`
5. Started frontend via supervisor (`craco start`)
6. Verified: webpack compiled successfully, login page loads

### No Code Changes Required
The app compiled and ran without any code modifications.

### Known Warnings (Non-blocking)
- Webpack deprecation warnings for `onAfterSetupMiddleware`/`onBeforeSetupMiddleware` (standard with react-scripts 5.0.1)
- Peer dependency warnings for react-day-picker (expects React 18, using React 19)
- Missing TypeScript peer dependencies (project doesn't use TypeScript)

## What's Implemented
- Login page renders correctly with MyGenie branding
- All API endpoints point to preprod environment
- Firebase configured for authentication and push notifications
- Google Maps API key configured
- CRM API keys for 27 restaurants configured

## Backlog / Next Steps
- P0: Verify login flow works with valid credentials against preprod API
- P1: Test all POS flows (orders, billing, menu management)
- P2: Production deployment configuration
- P3: Performance optimization (production build)
