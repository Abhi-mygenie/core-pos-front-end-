# MyGenie POS Frontend - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/core-pos-front-end-.git branch `13-Apirl-V1`. React frontend only. Run as-is with provided environment variables.

## Architecture
- **Frontend**: React 19 with Craco, Tailwind CSS, Radix UI components, Firebase, Socket.io
- **API Backend**: External - `https://preprod.mygenie.online/`
- **Socket**: External - `https://presocket.mygenie.online`
- **Auth**: Firebase (Google Auth domain: mygenie-restaurant.firebaseapp.com)

## What's Been Implemented (Jan 13, 2026)
- Cloned repo from GitHub (branch: 13-Apirl-V1)
- Copied source files to /app/frontend
- Installed all dependencies (firebase, socket.io-client, @hello-pangea/dnd, radix-ui extras)
- Configured environment variables (API base URL, Socket URL, Firebase config)
- Frontend running successfully on port 3000 with login page displaying

## Tech Stack
- React 19, Craco, Tailwind CSS 3, Radix UI, Recharts, React Router DOM v7
- Firebase 12.12, Socket.io-client 4.8, @hello-pangea/dnd
- Zod, React Hook Form, Lucide React, Sonner

## Environment Variables
- REACT_APP_API_BASE_URL: https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL: https://presocket.mygenie.online
- Firebase config (API key, auth domain, project ID, storage bucket, messaging sender ID, app ID, measurement ID)

## Backlog
- No modifications requested - running as-is from the repo
