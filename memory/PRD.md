# Core POS Frontend - PRD

## Original Problem Statement
Deploy React frontend POS application from GitHub repo (https://github.com/Abhi-mygenie/core-pos-front-end-.git, branch: 10-june). Frontend-only app connecting to external backend at https://preprod.mygenie.online/. Register and implement CR-019 (Restaurant Settings Wizard). Implement BUG-122/CR-018 post-delivery fixes from handover.

## Architecture
- **Frontend**: React 19 + CRA + Craco + TailwindCSS + Radix UI + shadcn components
- **External Backend**: https://preprod.mygenie.online/
- **Socket**: https://presocket.mygenie.online
- **Firebase**: Auth/Messaging/Analytics
- **CRM**: https://crm.mygenie.online/api

## What's Been Implemented

### Session — June 10, 2026

**CR-019: Restaurant Settings Self-Onboarding Wizard**
- Gates 0-5 complete (Registration → Intake → Impact Analysis → Implementation Plan → Code Gate → Implementation + QA)
- 6-step wizard at `/restaurant-settings` with left-rail stepper
- 3 new files + 3 modified, 18/18 tests passed
- Gate 6 (Owner Smoke) pending

**BUG-122 Post-Delivery Fixes (3 FE fixes)**
- Fix #1: Cancel X button on POS YTC OrderCard (OrderCard.jsx)
- Fix #2: Snooze web-only gate on TableCard (TableCard.jsx)
- Fix #3: schedule_at time fix + disable guard (CartPanel.jsx)
- All implemented, awaiting owner smoke

**BQ-019-1: first_login auto-redirect** — DEFERRED in Open Gaps Register

## Pending Owner Actions
- CR-019 Gate 6: Full smoke test of wizard
- BUG-122/CR-018: Smoke test 3 post-delivery fixes

## Backlog
- P0: Owner smoke tests (CR-019, BUG-122 fixes, CR-018 fix)
- P1: BQ-019-1 — Auto-redirect for first-time restaurants (backend signal needed)
- P2: localStorage draft persistence for wizard partial progress
- P2: Operating hours / tables / printers in wizard (separate APIs)
