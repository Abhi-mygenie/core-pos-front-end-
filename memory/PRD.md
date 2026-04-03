# Core POS Frontend - PRD

## Original Problem Statement
- Pull code from https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: April-phase-3-socket
- React app only (no backend)
- Build and run as is
- No testing agent required

## Project Overview
**MyGenie Restaurant POS System** - A Point of Sale frontend application for restaurant management.

## Tech Stack
- React 19
- CRACO (Create React App Configuration Override)
- Tailwind CSS
- Radix UI components
- Socket.io-client for real-time updates
- Axios for API calls
- React Router v7

## What's Been Implemented (April 3, 2026)
1. Cloned repository from `April-phase-3-socket` branch
2. Installed all dependencies via yarn
3. Disabled visual-edits plugin (causing webpack resolution issues)
4. Created `.env` file with external API URLs:
   - REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
   - REACT_APP_SOCKET_URL=https://presocket.mygenie.online
5. App running successfully on port 3000

## Current Status
- Frontend: RUNNING (localhost:3000)
- App displays MyGenie Restaurant POS login page
- Connected to external MyGenie API (preprod environment)

## Key Features (from codebase analysis)
- Login/Authentication
- Menu management (categories, products)
- Table management (table/room operations)
- Order management (place, update, cancel orders)
- Payment processing
- Real-time updates via Socket.io
- Reports (paid orders, cancelled orders, credit orders, etc.)

## Environment Configuration
```
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
REACT_APP_SOCKET_URL=https://presocket.mygenie.online
```

## Next Steps
- Login with valid credentials to test full functionality
- Preview URL routing issue may need platform support
