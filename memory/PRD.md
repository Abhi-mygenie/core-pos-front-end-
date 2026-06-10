# Core POS Frontend - PRD

## Original Problem Statement
Deploy React frontend POS application from GitHub repo (https://github.com/Abhi-mygenie/core-pos-front-end-.git, branch: 10-june). Frontend-only app connecting to external backend at https://preprod.mygenie.online/. Then register and implement CR-019: Restaurant Settings Self-Onboarding Wizard.

## Architecture
- **Frontend**: React 19 + CRA + Craco + TailwindCSS + Radix UI + shadcn components
- **External Backend**: https://preprod.mygenie.online/
- **Socket**: https://presocket.mygenie.online
- **Firebase**: Auth/Messaging/Analytics
- **CRM**: https://crm.mygenie.online/api

## What's Been Implemented

### Session 1 — Deployment (June 10, 2026)
- Cloned repo, configured env vars, installed deps, all services running

### Session 2 — CR-019 Full Lifecycle (June 10, 2026)
- **Gate 0 (Registration):** CR-019 registered in registry.json, CR_REGISTRY.md, CONTROL_DASHBOARD.md
- **Gate 1 (Intake):** Full intake doc with 50+ fields mapped, 6-step wizard spec, API endpoints
- **Gate 2 (Impact Analysis):** 3 new files + 3 modified, zero regression risk
- **Gate 3 (Implementation Plan):** 6-phase plan with owner gate at each phase
- **Gate 4 (Code Gate):** Owner GO received — exact diffs approved
- **Gate 5 (Implementation + QA):** All 6 phases implemented. Testing: 18/18 passed (100%)
  - `restaurantSettingsService.js` — GET settings-list + POST update-settings
  - `restaurantSettingsTransform.js` — toBool/toYesNo, fromAPI, toAPI
  - `RestaurantSettingsPage.jsx` — 6-step wizard with stepper, validation, save
  - App.js route, Sidebar.jsx entry, constants.js endpoints
- **BQ-019-1:** first_login auto-redirect DEFERRED to Open Gaps Register

## CR-019 Gate Status
- Gate 0 ✅ | Gate 1 ✅ | Gate 2 ✅ | Gate 3 ✅ | Gate 4 ✅ | **Gate 5 ✅** | Gate 6 ⏳ (Owner Smoke)

## Backlog
- P0: CR-019 Gate 6 — Owner full smoke test
- P1: BQ-019-1 — Auto-redirect for first-time restaurants (backend signal needed)
- P2: localStorage draft persistence for partial wizard progress
- P2: Operating hours / tables / printers in wizard (separate APIs)
