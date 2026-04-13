# MyGenie POS Frontend - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/core-pos-front-end-.git main branch. React frontend only. Run as is with provided env variables. No testing agent.

## Architecture
- **Type**: React Frontend (CRA with CRACO)
- **Stack**: React 19, Tailwind CSS, Radix UI, Firebase, Socket.io, Recharts
- **API Backend**: https://preprod.mygenie.online/ (external)
- **Socket**: https://presocket.mygenie.online (external)
- **Port**: 3000 (supervisor managed)

## What's Been Implemented (Jan 2026)
- Cloned repo from GitHub (main branch)
- Copied all frontend source files (src, public, plugins, configs)
- Set up .env with all provided environment variables (Firebase, API base URL, Socket URL)
- Installed all dependencies (socket.io-client, @hello-pangea/dnd, firebase)
- Frontend compiled and running successfully on port 3000
- Login page verified via screenshot

## Environment Variables Configured
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (all Firebase config keys)
- REACT_APP_BACKEND_URL (Emergent preview URL)
- WDS_SOCKET_PORT=443

## Backlog / Next Steps
- P0: None - app running as requested
- P1: Any feature modifications requested by user
- P2: Address ESLint warning in LoadingPage.jsx (minor, non-blocking)
