# MyGenie POS Frontend — PRD

## Original Problem Statement
Deploy the MyGenie POS frontend React application from GitHub repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch: `5-june`) to the Emergent preview environment. Frontend-only deployment connecting to external APIs. Then implement POS 4.0 bug fixes.

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI (shadcn/ui)
- **External APIs**: preprod.mygenie.online (API), presocket.mygenie.online (WebSocket), crm.mygenie.online (CRM)
- **Firebase**: Push notifications, analytics
- **Backend**: Default FastAPI placeholder (not used by the app)

## What's Been Implemented

### Session 1 — 2026-06-07: Deployment + POS 4.0 Bugs
- Cloned repo from GitHub (branch: 5-june), configured all env variables, app running
- Synced CR Registry (CR-014, CR-015) and Bug Tracker (BUG-112 to BUG-118) from intake branch
- **BUG-112** (Phase 1): Auto-print timing — waitForOrderReady 3000→500ms + early HTTP check
- **BUG-113**: Split payment UI — removed circular auto-fill, moved to onBlur
- **BUG-114**: Category discount fields — threaded id/name through paymentData, validated on preprod

## Prioritized Backlog

### P0 — Next Session
- BUG-115: Audit Report cancelled rendering (needs runtime validation)
- BUG-116: Out-of-kitchen socket realtime (discovery complete)
- BUG-117: Audit side-sheet discount text (needs runtime validation)
- BUG-118: Nth-item/BOGO coupon (intake, needs investigation)

### P1 — Deferred
- BUG-112 Phase 2: Socket-first print for table orders (table matching approach)
- CR-014: Menu Management API Migration
- CR-015: Settlement Module

## Key Files
- `OrderEntry.jsx` — payment flows, auto-print logic
- `CollectPaymentPanel.jsx` — payment UI, split payments, discounts
- `orderTransform.js` — API payload builders
- `OrderContext.jsx` — order state management, ordersRef
- Handover: `/app/memory/control/NEXT_AGENT_HANDOVER_2026_06_07_POS4_BUG_SESSION.md`
