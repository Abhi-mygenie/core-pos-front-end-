# MyGenie POS Frontend — PRD

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`) into `/app` and run as-is. Frontend-only — no backend setup. Env variables provided by owner.

## Architecture
- **Frontend**: React 19.0.0 with CRACO, Tailwind CSS, Radix UI, shadcn
- **Backend**: Laravel on preprod.mygenie.online (external)
- **Socket**: presocket.mygenie.online
- **Firebase**: Auth/notifications
- **CRM**: crm.mygenie.online/api
- **Process Manager**: Supervisor (frontend port 3000, backend port 8001)

## What's Been Implemented

### Session 1 (2026-07-14) — Previous Agent
- CR-060: Table/Room Management (QA 15/15 PASS)
- BUG-185: Settlement Expected column fix (uses `balanceToSettle`)
- BUG-186: Partial settlement fix (side-effect of BUG-185)
- Settlement Report formula partial fix (removed circular pilferage)

### Session 2 (2026-07-15) — This Agent
- Branch switch: `main` → `15-july` (fresh clone)
- **Settlement Report formula COMPLETE fix** — 3 lines now read `balance_to_settle` from API instead of FE formula
- **Status View Sort Investigation** — root cause found, fix specified

## Prioritized Backlog

### P0 — Critical
- **Status View Sort Fix**: Cards in wrong order within status columns. Fix: 1 file (`statusHelpers.js`), ~6 lines. Investigation complete, owner approval needed.

### P1 — High
- QA verification: BUG-185/186 + report formula on cafe103
- Backend: `ready_at` not always populated (breaks timeline + sort)

### P2 — Medium
- Transfer Cash Modal: Backend-blocked (404)
- BUG-182: Expense report wrong employee name (backend)
- Backend: `serve_at` inconsistent population

### P3 — Low
- 6 backend-blocked bugs from POS 3.0 (BUG-090→094, BUG-101)
- BUG-124: Socket payload missing fields (FE-defended)
- BUG-129: TAB orders premature status stamp (FE workaround)

## Next Tasks
1. Owner approves Status View sort fix → implement (1 file, 6 lines)
2. QA: Settlement panel + report on cafe103
3. QA: Status View sort after fix (vishal@pav.com)
