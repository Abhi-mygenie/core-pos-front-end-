# MyGenie POS Frontend — Deployment Record

## Original Problem Statement
Deploy the existing React frontend repo (https://github.com/Abhi-mygenie/core-pos-front-end-.git, branch: main) directly into /app and run as-is with no code edits. Preserve platform files, set env variables, and keep memory dir in sync with remote.

## Architecture
- **Stack**: React 19 + CRACO + Tailwind CSS + Radix UI + Firebase
- **Process Manager**: Supervisor (`yarn start` → `craco start` on port 3000)
- **Backend API**: External (https://preprod.mygenie.online/)
- **Socket**: External (https://presocket.mygenie.online)
- **Auth**: Firebase

## What's Been Implemented
- **2026-10-22 (Emergent E1 Multi-Bug Session)**:
  - BUG-600: Aggregator buzzer tone override (toneMapper.js + NotificationContext.jsx)
  - BUG-601: Aggregator variations via food_info wrapper (menuManagementService.js)
  - BUG-608: Number field last-char delete fix — 10 locations across 4 files
  - BUG-570: Sidebar backdrop blur removed (Sidebar.jsx)
  - BUG-593: CRM name merge on enrichment (OrderEntry.jsx)
  - BUG-602: Backend confirmed — order_note persists (no FE changes)
  - BUG-603: Backend confirmed — cancel_type kitchen stage preserved (no FE changes)
  - BUG-544: CLOSED — already resolved by prior PMS deliveries
  - 5 new bugs registered (BUG-609 through BUG-613)
  - CR-423 IA complete (6 report pages need export fixes)
  - BUG-604/605/606 reviewed (backend-blocked or needs owner input)
- **2026-10-22 (Emergent Re-deploy)**: Fresh clone from main branch, memory synced (2,438 files)

## Preserved Platform Files
- `/app/.emergent/` — platform config
- `/app/.git/` — platform git
- `/app/frontend/.env` — all env variables
- `/app/backend/.env` — MongoDB, CORS config

## Backlog
- P0: CR-423 (6 report export gaps), BUG-605 (Report Beta buttons — needs owner input)
- P1: CR-441 (prep time timeline — needs owner decisions)
- P2: BUG-609 (CRM dropdown — may be fixed by BUG-593), BUG-610-613 (backend performance)
- Backend-blocked: BUG-604, BUG-606, BUG-610, BUG-611, BUG-612, BUG-613

## Registry
- Total items: 961
- Source: `/app/memory/control/registry.json`
