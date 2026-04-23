# PRD — core-pos-front-end- (Deployment Record)

## Original Problem Statement
Deploy the frontend project from `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `main`) into the Emergent environment. Clone directly into `/app`. Use yarn only. React 19 + CRACO 7 + Node 20. No test agents, no test suites, minimum changes necessary to get the frontend running.

## Deployment Task — Done (2026-04-23)
- Repo cloned at branch `main` (HEAD `62c647e`) directly into `/app`.
- `/app/frontend/.env` populated with all 16 variables supplied by user (CRM API keys JSON preserved as single line).
- `yarn install` completed (1.22.22).
- Frontend supervisor service RUNNING; compiled successfully.
- Preview URL `https://restaurant-pos-v2-1.preview.emergentagent.com` returns HTTP 200, login page renders.
- Backend supervisor program stopped (repo is frontend-only per user).

## Architecture (as received)
- React 19.0.0 + CRACO 7.1.0 + TailwindCSS + shadcn/ui
- Firebase SDK (v12) for auth/analytics/messaging
- socket.io-client for realtime
- Google Maps JS SDK
- Talks to: `REACT_APP_API_BASE_URL`, `REACT_APP_SOCKET_URL`, `REACT_APP_CRM_BASE_URL` (external Mygenie services).

## What's Implemented (by this agent)
- Clean clone + env wiring + yarn install + supervisor start. Nothing else.

## Next Action Items (Backlog / For Next Agent)
- P1: Decide on `/app/backend/server.py` — start it, or keep the backend supervisor program disabled permanently.
- P1: Dismiss "Wake up servers" banner source (it is driven by `ENABLE_HEALTH_CHECK`/backend reachability inside the app code).
- P2: Clean up ESLint warning in `src/pages/LoadingPage.jsx:101`.
- P2: Evaluate upgrading `react-day-picker` for React 19 compatibility.

## File Locations
- Repo root: `/app`
- Frontend: `/app/frontend`
- Frontend env: `/app/frontend/.env`
- Deployment handover: `/app/memory/deployment_handover.md`
