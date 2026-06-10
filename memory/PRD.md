# Core POS Frontend - PRD

## Original Problem Statement
Deploy React frontend POS application from GitHub repo (https://github.com/Abhi-mygenie/core-pos-front-end-.git, branch: 10-june) into /app. Frontend-only app connecting to external backend at https://preprod.mygenie.online/.

## Architecture
- **Frontend**: React 19 + CRA + Craco + TailwindCSS + Radix UI + shadcn components
- **External Backend**: https://preprod.mygenie.online/
- **Socket**: https://presocket.mygenie.online
- **Firebase**: Auth/Messaging/Analytics
- **CRM**: https://crm.mygenie.online/api

## What's Been Implemented

### Session 1 — Deployment (June 10, 2026)
- Cloned repo from GitHub (branch: 10-june) into /app
- Configured all environment variables (Firebase, API URLs, Socket URL, CRM URL)
- Installed all dependencies (yarn install)
- Frontend running on port 3000 via supervisor (craco start)
- Backend running on port 8001 via supervisor (FastAPI)
- All tests passed: login page renders, branding correct, APIs accessible

### Session 2 — CR-019 Registration (June 10, 2026)
- Reviewed full control layer (CONTROL_DASHBOARD, CR_REGISTRY, INTAKE_WORKFLOW, REGISTRATION_GATE_POLICY, BASELINE_INDEX)
- Explored existing settings infrastructure (SettingsPanel, SettingsContext, settingsService, ViewEditViews, ListFormViews)
- Called GET settings-list API — mapped all ~50+ fields across basic/advanced/vendor sections
- Brainstormed 6-step wizard segregation with owner
- Built interactive HTML mockup at /mockup-wizard.html (all 6 steps clickable)
- Owner approved mockup and field segregation
- **Registered CR-019** in registry.json, CR_REGISTRY.md, CONTROL_DASHBOARD.md
- Created intake document: `/app/memory/memory/crs/intake/CR_019_INTAKE_2026_06_10.md`

## CR-019: Restaurant Settings Wizard — Status
- **Gate 0 (Registration):** COMPLETE
- **Gate 1 (Intake):** COMPLETE
- **Gate 2 (Impact Analysis):** PENDING
- **Gate 3 (Implementation Plan):** PENDING
- **Gate 4 (Code Gate):** PENDING
- **Gate 5 (Implementation + QA):** PENDING
- **Gate 6 (Owner Smoke):** PENDING

## Prioritized Backlog

### P0 — Next Up
- CR-019 Gate 2: Impact Analysis (file mapping, state impact, regression risk)
- CR-019 Gate 3: Implementation Plan (file-level change plan)
- CR-019 Gate 4: Code Gate (scope lock, diff preview, owner GO)

### P1 — Implementation
- CR-019 Gate 5: Build the 6-step wizard page
  - RestaurantSettingsPage.jsx (NEW)
  - restaurantSettingsService.js (NEW)
  - restaurantSettingsTransform.js (NEW)
  - App.js route, Sidebar.jsx entry, constants.js endpoints

### P2 — Future
- Auto-redirect first-time users to setup wizard
- Operating hours / table management / printer management within wizard
- Settings sync between wizard and existing SettingsPanel
