# POS Frontend Deployment — PRD

## Problem Statement
Deploy the existing React frontend repo directly from:
- Repo: `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch: `main`)
- Into the platform's `/app/frontend/` directory (supervisor runs `yarn start` from there, READONLY config)
- No code edits — deploy and run as-is

## Architecture
- **Frontend only** — React + CRACO (CRA + craco.config.js)
- **Start script**: `craco start` (via `yarn start` in supervisor)
- **Port**: 3000 bound to 0.0.0.0 (via supervisor HOST/PORT env)
- **Backend**: Platform default FastAPI backend retained at `/app/backend/`
- **Process manager**: Supervisor (READONLY conf at `/etc/supervisor/conf.d/supervisord.conf`)

## What Was Done (2026-07-23)
1. Cloned `https://github.com/Abhi-mygenie/core-pos-front-end-.git` into `/tmp/core-pos-staging`
2. Replaced `/app/frontend/` contents with repo's `frontend/` subfolder (in-place, no subfolder nesting)
3. Pulled full `/app/memory/` from repo (problem statement: "pull full memory dir")
4. Wrote `.env` with all required env vars (kept platform `REACT_APP_BACKEND_URL`)
5. Installed dependencies: `npm install --legacy-peer-deps` (repo has `package-lock.json`)
6. Restarted supervisor frontend → RUNNING, HTTP 200

## Environment Variables Set in `/app/frontend/.env`
- `REACT_APP_BACKEND_URL` — platform routing URL (preserved)
- `WDS_SOCKET_PORT=443`
- `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`
- `REACT_APP_SOCKET_URL=https://presocket.mygenie.online`
- `REACT_APP_FIREBASE_*` — Firebase config (project: mygenie-restaurant)
- `REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api`
- `REACT_APP_CRM_API_KEYS` — per-outlet DoorDash CRM API keys
- `REACT_APP_GOOGLE_MAPS_KEY`
- `CORS_ORIGINS=*`
- `REACT_APP_SHOW_AUDIT_TAB=true`

## Known Non-Blocking Items
- ESLint `react-hooks/exhaustive-deps` warnings in several components (compiled with 1 warning — no errors)
- Old supervisor stderr entries from pre-install restart cycles (stale, not from current process)
- `@emergentbase/visual-edits` section is commented out in craco.config.js — no action needed

## Backlog / Next Steps
- Supply real `.env` values if preprod API endpoints change
- Add `yarn.lock` or switch supervisor command to `npm start` if npm-only workflow is preferred
- Validate Firebase auth, Socket.IO, and CRM API connectivity against preprod endpoints

## PMS Governed Work — Status (2026-09-03)
Governance: `memory/control/AGENT_PROMPT_ALPHA.md` (gates 0→7, roles). Source of truth: `memory/control/registry.json`.
- **CR-358** (parent): Gate 3 phased plan approved. Closes after P1–P5 Owner Verified.
- **CR-358-P1** (Foundation + Channel Manager + In-House Guests): QA PASS Gate 5b → awaiting Owner Smoke (Gate 6).
- **CR-360** (In-House KPI tiles + View Bill): QA PASS Gate 5b → awaiting Owner Smoke (Gate 6).
- **CR-358-P2** (New Booking S3 + Check-In S4): **GATE 3 PLAN WRITTEN 2026-09-03** — `memory/plans/CR-358-P2_IMPLEMENTATION_PLAN.md` (8 edits / 5 files, 26-check matrix). Awaiting owner **Gate 4 GO + SC-01 ack** (App.js 4-line route re-point — IA claim of zero App.js changes was stale). Scope: NewBookingPage.jsx, CheckInPage.jsx (new); pmsService.js, aiosellTransform.js (extend); App.js (4 lines). Frozen: Sidebar.jsx, roomService.js, RoomCheckInModal.jsx, CollectPaymentPanel.jsx. Precondition for IMPL: `memory/test_credentials.md` is empty — owner login alias needed for R11 re-probe.
- Latest handover: `memory/handover/SESSION_HANDOVER_2026_09_03_CR358P2_GATE3.md`
