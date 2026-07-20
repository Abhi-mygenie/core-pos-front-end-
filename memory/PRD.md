# Core POS Frontend — PRD

## Original Problem Statement
Deploy existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `main`) into `/app` and run as-is. Then implement CR-082 Socket Room-Join.

## Architecture
- **Frontend**: React 19 (CRA + CRACO) on port 3000 via supervisor
- **Backend**: External Laravel at `preprod.mygenie.online` (no local backend needed)
- **Socket**: Socket.IO at `presocket.mygenie.online`
- **Firebase**: Auth + Push Notifications
- **CRM**: Customer intelligence at `crm.mygenie.online`

## What's Been Implemented

### 2026-07-19: Deployment
- ✅ Cloned repo, installed deps, frontend running

### 2026-07-19: CR-082 Implementation
- ✅ 3 files, 7 edits, ~22 lines. EXIT GATE 5/5 PASS.

### 2026-07-20: CR-082 QA
- ✅ 7/7 tests PASS, 0 blockers, coverage 3/3 files
- QA Report: `/app/memory/test_reports/CR-082_QA_REPORT_2026_07_20.md`

## Current Registry Status: CR-082 = QA PASS → Ready for Gate 6 (Owner Smoke)

## Open Items
| # | Item | Priority | Status |
|---|---|---|---|
| 1 | CR-082 Owner Smoke | P0 | Ready for Gate 6 |
| 2 | CR-081 Phase A — Inventory Tab Bar | P1 | INTAKE |
| 3 | CR-081 Phase B — Dashboard | P1 | INTAKE |
| 4 | CR-077 Phase 2 — Partial Receive | P2 | Deferred |
| 5 | 78 items awaiting owner smoke (Gate 6) | — | Pending |

## Backend-Blocked
- CR-062, BUG-201, BUG-124, CR-076, CR-080
