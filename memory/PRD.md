# PRD — core-pos-front-end (MyGenie POS)

## Original Problem Statement
Clone and deploy a React-based POS frontend application from `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `6-july`) into `/app`, install dependencies, and run.

## Architecture
- **Frontend:** React 19 + CRACO + Tailwind CSS + Radix UI + Socket.io
- **Backend:** FastAPI (minimal, serves /api/ endpoints)
- **External APIs:** preprod.mygenie.online (main), presocket.mygenie.online (websocket), crm.mygenie.online (CRM)
- **Database:** MongoDB (backend only, minimal usage)

## User Personas
- Restaurant staff (cashiers, waiters, managers) using the POS terminal
- Restaurant owners viewing reports and settings

## Core Requirements
- Clone repo from GitHub (branch 6-july)
- Replace existing /app structure
- Install dependencies (yarn for frontend, pip for backend)
- Run on port 3000 (frontend) and 8001 (backend)
- Configure environment variables for external API connectivity

## What's Been Implemented (July 8, 2026)
- Cloned repository from GitHub branch `6-july`
- Preserved `.git` and `.emergent` platform folders
- Configured frontend `.env` with required API URLs (REACT_APP_API_BASE_URL, REACT_APP_SOCKET_URL, REACT_APP_CRM_BASE_URL)
- Configured backend `.env` with MongoDB connection
- Installed all frontend dependencies via yarn
- Installed all backend dependencies via pip
- Both services running via supervisor
- Frontend compiles with 1 warning (no errors)
- Login page fully functional and rendering correctly
- Testing: 100% pass rate (10/10 backend, all frontend checks pass)

## Prioritized Backlog
- P0: None (setup complete)
- P1: User to provide actual API credentials/env vars if needed
- P2: Firebase configuration (REACT_APP_FIREBASE_* vars) if push notifications needed
- P3: Google Maps key (REACT_APP_GOOGLE_MAPS_KEY) for delivery address features

## Next Tasks
- User to configure their actual API credentials in `/app/frontend/.env`
- Test login flow with real credentials against preprod.mygenie.online
