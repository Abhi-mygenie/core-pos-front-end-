# PRD — MyGenie POS Frontend

## Original Problem Statement
Deploy existing React frontend repo and run as-is. Then implement CR-060 Table/Room Management CRUD wiring. Then fix BUG-185/186 Settlement Expected column.

## Architecture
- Frontend: React 19 (CRA + CRACO) on port 3000
- Backend: External Laravel at preprod.mygenie.online
- Process Manager: Supervisor
- Database: MongoDB (local, for platform use only — app data on preprod)

## What's Been Implemented

### 2026-07-14
- Repo deployed from GitHub (core-pos-front-end-, branch main)
- CR-060: Table/Room Management — 8 CRUD APIs wired, TableManagementView rewritten, TableBulkEditor created, sidebar comingSoon removed. QA 15/15 PASS.
- BUG-185: Settlement Expected column — replaced 9 instances of wrong FE formula with backend `balanceToSettle`. Awaiting QA.
- BUG-186: Partial Settlement — resolved as side-effect of BUG-185 fix. No additional code.

## Prioritized Backlog
- P0: BUG-185/186 QA verification on cafe103
- P0: CR-060 Gate 6 Owner Smoke
- P1: Settlement Report formula fix (3 lines — planned, owner-approved, deferred to next session)
- P1: CR-061 Expense Report (Gate 3 complete, awaiting Gate 4 GO)
- P1: CR-051 Customer Field Mandatoriness (Gate 3 complete)
- P1: CR-060 Phase 2 (QR codes, waiter permissions)
- P1: BUG-123 Place Order 401 redirect (Gate 2 complete, needs owner decisions)
- P2: Transfer Cash Modal (backend-blocked — /waiter/cash-transfer 404)
