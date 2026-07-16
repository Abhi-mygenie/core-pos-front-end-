# Core POS Frontend - Deployment PRD

## Original Problem Statement
Deploy existing React frontend repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
(branch `16-july-`) into `/app` and run it as-is, with no code edits.

## What's Been Implemented (2026-07-16)
- Backed up platform files (`/app/.emergent/emergent.yml`, `/app/backend/.env`, `/app/frontend/.env`)
- Cleared `/app` (preserving `.emergent` + `.git`) and cloned repo branch `16-july-` directly into `/app`
- Restored platform env files after clone
- Installed frontend dependencies via `yarn install` (detected from `packageManager` field in package.json)
- Registered with supervisor (existing readonly config runs `yarn start` in `/app/frontend`)
- Verified `craco start` compiles and app responds on port 3000
- User provided real `.env` values (Firebase, API base URLs, CRM keys, Google Maps key) - restarted, verified login page renders without runtime errors

## Architecture
- Frontend-only React app (CRA + CRACO), React 19, Tailwind, Radix UI, Firebase, socket.io-client, axios
- Backend/DB not part of this task (external APIs consumed at `preprod.mygenie.online`)
- Supervisor auto-restart + hot reload enabled

## Backlog / Notes
- P2: `REACT_APP_BACKEND_URL` appears twice in `/app/frontend/.env` (dotenv takes last value). Not modified per "no code edits" rule.
- P2: Non-fatal ESLint `react-hooks/exhaustive-deps` warnings in reports-module pages.
