# PRD — MyGenie POS Frontend

## Problem Statement
Deploy and maintain the MyGenie Core POS Frontend (React app) connecting to external APIs at preprod.mygenie.online, presocket.mygenie.online, crm.mygenie.online.

## Architecture
- **Frontend:** React 19 + Craco + Tailwind CSS + Radix UI + Recharts
- **Backend:** FastAPI placeholder (no business logic — all APIs are external)
- **Branch:** `5-june`

## What's Been Implemented

### 2026-06-07 — Session 1: Deployment
- Cloned repo from `5-june` branch, configured all env vars, frontend + backend running

### 2026-06-07 — Session 2: CR-013 Formula Audit
- Investigated S5 vs CR-013 formula divergence (29/174 orders on June 1)
- Owner decision: both formulas intentionally different → FE-PROPORTIONAL-001 CLOSED
- CR-013 + CR-013-AUDIT FROZEN

### 2026-06-07 — Session 3: S10 Gate ④ (Prep & Serve Time)
- Created `prepServeService.js` — timestamp-based item classification (Kitchen/Bar/Direct)
- Rewrote `PrepServeTimeMockup.jsx` — replaced all seed data with live API wiring
- Classification: Kitchen (ready_at - created_at > 30s), Bar (instant ready, serve later), Direct (no timestamps)
- Escalation Matrix = Coming Soon placeholder
- Verified on Pav: 339 orders, Kitchen:329, Bar:0, Direct:242
- Testing: 100% pass (all tabs, KPIs, charts, date pickers)

### 2026-06-07 — Audit Tab Enabled
- Added `REACT_APP_SHOW_AUDIT_TAB=true` to .env
- Unhides Audit tabs on S5/S6/S7/S9

## Prioritized Backlog

### P0
- S10 Gate ② owner review + Gate ⑤ data validation → freeze

### P1  
- BUG-095 Socket handler + dead code cleanup (planning complete)
- Backend gaps: BE-ADDON-001, BE-CANCELLED-TAX-001

### P2
- BUG-104 Credit/Tab module (owner scope needed)
- BUG-105 Settlement module (owner scope needed)
- Phase 3 mechanical reports (S11-S38)

## Test Credentials
- Shimla Food Court: owner@shimlaqohfoodcourt.com / Qplazm@10
- Pav: vishal@pav.com / Qplazm@10
- Cafe 103: owner@cafe103.com / Qplazm@10
