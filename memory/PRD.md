# MyGenie POS Frontend - PRD

## Original Problem Statement
Deploy the MyGenie POS frontend React application from GitHub repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch: `5-june`) to the Emergent preview environment. Frontend-only deployment connecting to external APIs.

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI (shadcn/ui)
- **External APIs**: preprod.mygenie.online (API), presocket.mygenie.online (WebSocket), crm.mygenie.online (CRM)
- **Firebase**: Push notifications, analytics
- **Backend**: Default FastAPI placeholder (not used by the app)

## What's Been Implemented (June 7, 2026)
- Cloned repo from GitHub (branch: 5-june) into /app
- Configured all environment variables (Firebase, API URLs, Socket URL, CRM URL)
- Installed dependencies via yarn
- Frontend compiles and runs successfully on port 3000
- Login page renders with MyGenie branding, email/password form, remember me, forgot password

## Key Environment Variables
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
- Firebase config (API key, auth domain, project ID, etc.)

## Routes
- `/` - Login page
- `/loading` - Loading page (protected)
- `/dashboard` - Main dashboard (protected)
- `/reports/*` - Various report pages (protected)
- `/reports-module/*` - Reports module mockups (protected)

## Backlog
- P0: None - deployment complete
- P1: Test login flow with actual credentials against preprod API
- P2: Verify WebSocket connection to presocket.mygenie.online
- P2: Verify Firebase push notifications
