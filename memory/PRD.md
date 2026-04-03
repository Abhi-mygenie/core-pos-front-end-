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
- [x] **Phase 1 Complete (Apr 2026):** All critical security & stability fixes (T-05 to T-11)
- [x] **Phase 2 Partial (Apr 2026):** Barrel exports added (T-12, T-14), T-13 deferred
- [x] **BUG-101 Fixed:** Infinite navigation loop on login
- [x] **58+ test cases** written for all fixes

## Audit Findings Summary (Feb 2026)
- **5 Critical Issues:** ~~Hardcoded preprod URLs~~, ~~unauthenticated socket~~, ~~no route guards/error boundaries~~, ~~duplicate key in constants~~, ~~TBD endpoint called~~ — **ALL FIXED**
- **5 High Priority Issues:** God components (845/857 lines), volatile state, 7-level context nesting, no API retry, no offline capability  
- **8 Medium Issues:** Inline transforms in reportService, ~~_raw field leaks~~, ~~debug globals~~, duplicate utilities, sequential loading, mock data, array mutation, fragile date comparison — **2 FIXED**
- **7 Low Issues:** No TypeScript, ~~no tests~~, no monitoring, no a11y, eslint suppressions, no code splitting, over-memoization — **1 FIXED (tests added)**
- **Current Score:** 7.5/10 | **Target:** 9.5/10

## Prioritized Backlog

### P0 — Must Fix Before Production ✅ COMPLETE
- [x] Remove hardcoded preprod URL fallbacks (CRIT-001) — T-05
- [x] Gate socket connection behind authentication (CRIT-002) — T-06
- [x] Add ProtectedRoute + ErrorBoundary (CRIT-003) — T-07
- [x] Fix duplicate EDIT_ORDER_ITEM key (CRIT-004) — T-08
- [x] Fix TBD endpoint in paymentService (CRIT-005) — T-09
- [x] Remove window.__SOCKET_SERVICE__ in production (MED-003) — T-10
- [x] Gate _raw field behind NODE_ENV (MED-002) — T-11
- [x] Fix infinite navigation loop (BUG-101)
- [x] Create barrel exports (T-12, T-14)

### P1 — High Priority (Next Up)
- [ ] Break up DashboardPage and OrderEntry god components (HIGH-001) — T-15 to T-22
- [ ] Add state persistence layer (HIGH-002) — T-29
- [ ] Optimize context re-render performance (HIGH-003) — T-28
- [ ] Add API retry/recovery (HIGH-004) — T-40
- [ ] Offline capability / service worker (HIGH-005)
- [ ] API Documentation update (parked by user)

### P2 — Medium Priority
- [ ] Extract inline transforms from reportService (MED-001) — T-25
- [x] ~~Remove _raw field or gate behind dev mode (MED-002)~~ — T-11 DONE
- [x] ~~Remove window.__SOCKET_SERVICE__ in production (MED-003)~~ — T-10 DONE
- [ ] Deduplicate service/context utility functions (MED-004) — T-27
- [ ] Parallelize API loading on startup (MED-005) — T-30
- [ ] Remove/relocate mock data files (MED-006) — T-34
- [ ] Fix array mutation pattern in getAllOrders (MED-007) — T-26
- [ ] Harden business day date comparison (MED-008) — T-38

### P3 — Low Priority / Future
- [ ] TypeScript migration (LOW-001)
- [x] ~~Add test coverage (LOW-002)~~ — 84+ tests written
- [ ] Integrate monitoring/Sentry (LOW-003) — T-44
- [ ] Accessibility improvements (LOW-004) — T-45
- [ ] Audit eslint-disable suppressions (LOW-005) — T-37
- [ ] Code splitting / lazy loading (LOW-006) — T-39
- [ ] Remove unnecessary useCallback/useMemo (LOW-007) — T-31

## Next Steps
1. Phase 0: Developer Tooling (T-01 to T-04) — prettier, husky, CONTRIBUTING.md
2. Phase 3: God Component Decomposition (T-15 to T-22) — break up large components

## Key Documents
- `/app/memory/CODE_AUDIT.md` — Full audit report with status tracker (25 issues)
- `/app/memory/REFACTORING_PLAN.md` — Pre-development refactoring & cleanup plan (45 tasks, 10 phases)
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
