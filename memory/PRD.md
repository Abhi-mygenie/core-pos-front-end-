# MyGenie POS Frontend - PRD & Deployment Record

## Original Problem Statement
Deploy the MyGenie Core POS Frontend from GitHub repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch: `8-june`) as a frontend-only deployment on Emergent preview environment.

## Architecture
- **Type**: Frontend-only React SPA (Single Page Application)
- **Build Tool**: craco (Create React App Configuration Override)
- **UI Framework**: Radix UI + Tailwind CSS + shadcn/ui components
- **State Management**: React Context API (Auth, Menu, Order, Restaurant, Settings, Socket, Station, Table)
- **External APIs**:
  - `https://preprod.mygenie.online/` - Main API
  - `https://presocket.mygenie.online` - WebSocket server
  - `https://crm.mygenie.online/api` - CRM API
- **Firebase**: Authentication, messaging, analytics
- **Routing**: React Router v7

## What's Been Implemented (June 8, 2026)
1. ✅ Cloned repo from GitHub (branch: 8-june)
2. ✅ Configured all environment variables (Firebase, API URLs, Socket URL, CRM URL)
3. ✅ Installed all dependencies via yarn
4. ✅ Frontend compiled and running successfully
5. ✅ All tests passed (login page renders, all UI elements present, no console errors)
6. ✅ External APIs verified reachable

## Environment Variables
| Variable | Value |
|----------|-------|
| REACT_APP_BACKEND_URL | https://pos-app-preview-4.preview.emergentagent.com |
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

## Backlog
- P2: Address ESLint react-hooks/exhaustive-deps warnings in report mockup files
- P2: Update browserslist database (`npx update-browserslist-db@latest`)

## Next Tasks
- Test full login flow with valid credentials
- Verify post-login dashboard and POS functionality
