# Core POS Frontend — PRD

## Original Problem Statement
Deploy existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `main`) into `/app` and run as-is. Then implement CR-082 Socket Room-Join.

## Architecture
- **Frontend**: React 19 (CRA + CRACO) on port 3000 via supervisor
- **Backend**: External Laravel at `preprod.mygenie.online` (no local backend needed)
- **Socket**: Socket.IO at `presocket.mygenie.online`
- **Firebase**: Auth + Push Notifications
- **CRM**: Customer intelligence at `crm.mygenie.online`
- **Package Manager**: Yarn (yarn.lock)

## What's Been Implemented

### Session 1 — 2026-07-19: Deployment
- ✅ Cloned repo into `/app`, preserved platform files
- ✅ Installed dependencies, frontend compiles and runs
- ✅ Added placeholder env vars → user replaced with real values

### Session 2 — 2026-07-19: CR-082 Socket Room-Join (IMPLEMENTED)
- ✅ PLANNING: Validated impact analysis + wrote implementation plan (Gate 2+3)
- ✅ IMPLEMENTATION: 3 files, 7 edits, ~22 lines
  - `socketEvents.js`: +JOIN_EVENT, +JOINED_ACK_EVENT constants
  - `socketService.js`: +joinRestaurant() method, +restaurantId state, +re-join on connect, +clear on disconnect
  - `useSocketEvents.js`: +socketService.joinRestaurant(restaurantId) in subscription effect
- ✅ EXIT GATE: 5/5 PASS
- ✅ QA Handover written: `/app/memory/handover/QA_HANDOVER_CR082_2026_07_19.md`

## Open Items (Priority Order)

| # | Item | Priority | Status |
|---|---|---|---|
| 1 | CR-082 QA | P0 | QA handover ready — 8 test cases + 4 regression |
| 2 | CR-081 Phase A — Inventory Tab Bar | P1 | INTAKE |
| 3 | CR-081 Phase B — Dashboard | P1 | INTAKE |
| 4 | CR-077 Phase 2 — Partial Receive | P2 | Deferred |
| 5 | 77 items awaiting owner smoke (Gate 6) | — | Pending |

## Backend-Blocked (No FE action)
- CR-062, BUG-201, BUG-124, CR-076, CR-080
