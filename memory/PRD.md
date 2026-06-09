# MyGenie POS — PRD

## Original Problem Statement
Deploy React frontend POS application from GitHub repo (Abhi-mygenie/core-pos-front-end-, branch 9-june) to Emergent preview environment. Frontend-only app connecting to external APIs (preprod.mygenie.online, presocket.mygenie.online, crm.mygenie.online).

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI + Firebase
- **Backend**: Placeholder FastAPI (business logic on external APIs)
- **External APIs**: preprod.mygenie.online (main), presocket.mygenie.online (WebSocket), crm.mygenie.online/api (CRM)

## What's Been Implemented
- **2026-06-09**: Repo cloned, environment configured, frontend deployed and running on Emergent preview
- **2026-06-09**: CR-018 "Schedule Order" — full gate process (Gates 0–5 complete):
  - Gate 0: Registration (registry.json + CR_REGISTRY.md)
  - Gate 1: Intake document (13 owner decisions locked)
  - Gate 2: Impact Analysis (13 risks, 3 blockers identified)
  - Gate 3: Implementation Plan (5 phases, 15 steps, ~112 lines)
  - Gate 4: Code Gate / Scope Lock (6 files, 0 frozen-sprint conflicts)
  - Gate 5: Implementation + QA (all 15 steps verified PASS)
  - Files changed: orderTransform.js, OrderEntry.jsx, CartPanel.jsx, OrderCard.jsx, ScanOrderPopOut.jsx, DashboardPage.jsx
- **2026-06-09**: CR-017 "WhatsApp Payment Link" registry updated to match actual code state (IMPLEMENTED, 6/7)

## Prioritized Backlog
### P0
- Backend escalation: Running orders API must return scheduled orders (B1)

### P1
- CR-017: WhatsApp Payment Link — awaiting owner smoke (Gate 6)
- CR-018: Schedule Order — awaiting owner smoke (Gate 6) + backend B1 fix
- CR-018 Phase 2: Status View dedicated column, Header tab, updateOrder flag, QSR scheduling

### P2
- CR-016: Settlement History — Insights Module (registered, parked)
- BUG-121: Backend food_update socket payload incomplete (FE defended)
