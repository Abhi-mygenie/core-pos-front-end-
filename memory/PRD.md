# Core POS Front-End (MyGenie) - PRD

## Problem Statement
Deploy the Core POS Front-End from GitHub repo (branch: 9-june) into /app with proper environment configuration.

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI + shadcn/ui components
- **Backend**: Minimal FastAPI stub (no business logic - all APIs are external)
- **External APIs**: preprod.mygenie.online (main API), presocket.mygenie.online (WebSocket), crm.mygenie.online (CRM)
- **Firebase**: Push notifications and analytics configured

## Tech Stack
- React 19, CRACO, Tailwind CSS 3, Radix UI, Recharts, Socket.io, Firebase 12, React Router DOM 7
- FastAPI (stub only), MongoDB (not used by frontend)

## What's Been Implemented (June 9, 2026)
- ✅ Cloned repo from GitHub (branch: 9-june) into /app
- ✅ Configured all environment variables (14 env vars including Firebase, API URLs, Socket, CRM)
- ✅ Installed frontend dependencies via yarn
- ✅ Frontend compiles and serves successfully (only lint warnings)
- ✅ Login page renders correctly with MyGenie branding
- ✅ Backend FastAPI stub running on port 8001
- ✅ All tests passed (100% backend, 100% frontend)

## Environment Variables
- REACT_APP_BACKEND_URL (preview URL)
- REACT_APP_API_BASE_URL (preprod.mygenie.online)
- REACT_APP_SOCKET_URL (presocket.mygenie.online)
- REACT_APP_CRM_BASE_URL (crm.mygenie.online/api)
- Firebase config (API key, Auth domain, Project ID, Storage bucket, Messaging sender ID, App ID, Measurement ID, VAPID key)

## Prioritized Backlog
- P0: None (deployment complete)
- P1: Custom domain configuration if needed
- P2: Production build optimization
