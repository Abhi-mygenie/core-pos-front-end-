# MyGenie Restaurant POS — Product Requirements Document

## Original Problem Statement
Pull code from `https://github.com/Abhi-mygenie/core-pos-front-end-.git`, main branch. It is a React app with no backend. Build and run as it is. Conduct a comprehensive Senior CTO code audit for the "Refactor for Scaling" phase.

## Architecture
- **Frontend:** React 19 (CRA + CRACO), Tailwind CSS, Shadcn/UI, React Context API (7 providers), Socket.io-client
- **Backend:** External API at `preprod.mygenie.online` (not in this repo)
- **State Management:** React Context API (Auth, Socket, Restaurant, Menu, Table, Settings, Order)
- **API Layer:** Axios with interceptors, Service/Transform pattern, 31 active endpoints

## What's Been Implemented (Completed)
- [x] Repo cloned, built, running on port 3000
- [x] Documentation moved to `/app/memory/` (API_MAPPING.md, BACKEND_CLARIFICATIONS.md, ROLES_DEFINITION.md)
- [x] API endpoint gap analysis (31 endpoints, 23 undocumented) — `/app/memory/API_MAPPING_GAP_ANALYSIS.md`
- [x] Senior CTO Code Audit — delivered as chat response (Feb 2026)

## Audit Findings Summary (Feb 2026)
- **5 Critical Issues:** Hardcoded preprod URLs, unauthenticated socket, no route guards/error boundaries, duplicate key in constants, TBD endpoint called
- **5 High Priority Issues:** God components (845/857 lines), volatile state, 7-level context nesting, no API retry, no offline capability  
- **8 Medium Issues:** Inline transforms in reportService, _raw field leaks, debug globals, duplicate utilities, sequential loading, mock data, array mutation, fragile date comparison
- **7 Low Issues:** No TypeScript, no tests, no monitoring, no a11y, eslint suppressions, no code splitting, over-memoization
- **Current Score:** 6.5/10 | **Target:** 9.5/10

## Prioritized Backlog

### P0 — Must Fix Before Production
- [ ] Remove hardcoded preprod URL fallbacks (CRIT-001)
- [ ] Gate socket connection behind authentication (CRIT-002)
- [ ] Add ProtectedRoute + ErrorBoundary (CRIT-003)
- [ ] Fix duplicate EDIT_ORDER_ITEM key (CRIT-004)
- [ ] Fix TBD endpoint in paymentService (CRIT-005)

### P1 — High Priority
- [ ] Break up DashboardPage and OrderEntry god components (HIGH-001)
- [ ] Add state persistence layer (HIGH-002)
- [ ] Optimize context re-render performance (HIGH-003)
- [ ] Add API retry/recovery (HIGH-004)
- [ ] Offline capability / service worker (HIGH-005)
- [ ] API Documentation update (parked by user)

### P2 — Medium Priority
- [ ] Extract inline transforms from reportService (MED-001)
- [ ] Remove _raw field or gate behind dev mode (MED-002)
- [ ] Remove window.__SOCKET_SERVICE__ in production (MED-003)
- [ ] Deduplicate service/context utility functions (MED-004)
- [ ] Parallelize API loading on startup (MED-005)
- [ ] Remove/relocate mock data files (MED-006)
- [ ] Fix array mutation pattern in getAllOrders (MED-007)
- [ ] Harden business day date comparison (MED-008)

### P3 — Low Priority / Future
- [ ] TypeScript migration (LOW-001)
- [ ] Add test coverage (LOW-002)
- [ ] Integrate monitoring/Sentry (LOW-003)
- [ ] Accessibility improvements (LOW-004)
- [ ] Audit eslint-disable suppressions (LOW-005)
- [ ] Code splitting / lazy loading (LOW-006)
- [ ] Remove unnecessary useCallback/useMemo (LOW-007)

## Key Documents
- `/app/memory/CODE_AUDIT.md` — Full audit report with status tracker (update as fixes are applied)
- `/app/memory/PRD.md` — This file
- `/app/memory/API_MAPPING.md` — Legacy API documentation
- `/app/memory/API_MAPPING_GAP_ANALYSIS.md` — Gap analysis results

## Key Files Reference
- `/app/frontend/src/App.js` — Route definitions
- `/app/frontend/src/api/axios.js` — Axios instance + interceptors
- `/app/frontend/src/api/constants.js` — 31 endpoints + status mappings
- `/app/frontend/src/api/services/` — Service layer (12 files)
- `/app/frontend/src/api/transforms/` — Transform layer (10 files)
- `/app/frontend/src/api/socket/` — Socket service (5 files)
- `/app/frontend/src/contexts/` — 7 context providers
- `/app/frontend/src/pages/DashboardPage.jsx` — Main dashboard (845 lines)
- `/app/frontend/src/components/order-entry/OrderEntry.jsx` — Order entry (857 lines)
- `/app/memory/API_MAPPING.md` — Legacy API documentation
- `/app/memory/API_MAPPING_GAP_ANALYSIS.md` — Gap analysis results
