# MyGenie POS Frontend - PRD

## Original Problem Statement
Deploy the core-pos-front-end React application from GitHub repo (Abhi-mygenie/core-pos-front-end-, branch: 27-may) onto the Emergent preview environment. Frontend-only deployment connecting to external APIs.

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI + shadcn components
- **Backend**: FastAPI placeholder (health check only)
- **External APIs**: preprod.mygenie.online (main API), presocket.mygenie.online (WebSocket), Firebase (auth/notifications), CRM API
- **Preview URL**: https://pos-react-app-1.preview.emergentagent.com

## User Personas
- Restaurant staff (POS operators)
- Restaurant managers (reports, settings)

## Core Requirements
- Login page with email/password authentication
- Dashboard with order management
- Menu management with drag-and-drop
- Table management
- Room orders and reports
- Station view for kitchen/bar
- Socket-based real-time updates
- Firebase push notifications

## What's Been Implemented (May 27, 2026)
- [x] Cloned repo from GitHub (branch: 27-may)
- [x] Set up all environment variables (Firebase, API URLs, Socket URL, CRM URL)
- [x] Installed all frontend dependencies via yarn
- [x] Frontend running via CRACO on port 3000
- [x] Backend health check running on port 8001
- [x] All tests passing (100% backend, 100% frontend)

## Environment Variables Configured
- REACT_APP_BACKEND_URL (Emergent preview URL)
- REACT_APP_API_BASE_URL (preprod.mygenie.online)
- REACT_APP_SOCKET_URL (presocket.mygenie.online)
- REACT_APP_FIREBASE_* (all Firebase config)
- REACT_APP_CRM_BASE_URL (CRM API)

## Prioritized Backlog
- P0: None (deployment complete)
- P1: Verify login flow works end-to-end with real credentials
- P2: Test all POS features (order entry, table management, reports)

## Next Tasks
- User to test with real login credentials
- Verify WebSocket connection to presocket.mygenie.online
- Test full order flow
