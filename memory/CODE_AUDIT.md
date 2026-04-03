# MyGenie Restaurant POS — Senior CTO Code Audit Report
## Phase: Refactor for Scaling (Target: 10,000+ concurrent users)
### Audit Date: February 2026 | Auditor: Senior CTO Review

---

## Quick Navigation
- [Audit Tracker (Status Board)](#audit-tracker-status-board)
- [Critical Issues](#-1-critical-issues-must-fix-before-production)
- [High Priority Issues](#-2-high-priority-issues)
- [Medium Issues](#-3-medium-issues)
- [Low Issues / Improvements](#-4-low-issues--improvements)
- [Architectural Overview](#-architectural-overview--anti-patterns-summary)
- [What's Done Well](#whats-done-well-credit-where-due)

---

## Audit Tracker (Status Board)

> Update the **Status** and **Fixed Date** columns as each issue is resolved.  
> Statuses: `OPEN` | `IN PROGRESS` | `FIXED` | `WONT FIX` | `DEFERRED`

### Critical Issues

| ID | Title | Severity | Status | Assigned To | Fixed Date | Verified | Notes |
|----|-------|----------|--------|-------------|------------|----------|-------|
| CRIT-001 | Hardcoded Pre-Production URLs as Fallbacks | CRITICAL | FIXED | — | Feb 2026 | 15/15 tests pass | axios.js, socketEvents.js, profileTransform.js, categoryTransform.js (4th location found) |
| CRIT-002 | Socket Connects Before Authentication | CRITICAL | FIXED | — | Feb 2026 | 13/13 tests pass | SocketContext.jsx — auth-gated via useAuth() |
| CRIT-003 | No Route Protection / No React Error Boundary | CRITICAL | FIXED | — | Feb 2026 | 18/18 tests pass | ProtectedRoute + ErrorBoundary added, wired in App.js |
| CRIT-004 | Duplicate Key Definition in API Constants | CRITICAL | FIXED | — | Feb 2026 | 4/4 tests pass | Renamed to EDIT_ORDER_ITEM + EDIT_ORDER_ITEM_QTY |
| CRIT-005 | paymentService.js Calls a 'TBD' Endpoint | CRITICAL | OPEN | — | — | — | COLLECT_PAYMENT = 'TBD' |

### High Priority Issues

| ID | Title | Severity | Status | Assigned To | Fixed Date | Verified | Notes |
|----|-------|----------|--------|-------------|------------|----------|-------|
| HIGH-001 | God Components (DashboardPage 845L, OrderEntry 857L) | HIGH | OPEN | — | — | — | Break into feature modules |
| HIGH-002 | All Application State in Volatile React Memory | HIGH | OPEN | — | — | — | No persistence layer |
| HIGH-003 | 7-Level Context Provider Nesting / Re-render Cascades | HIGH | OPEN | — | — | — | AppProviders.jsx, OrderContext |
| HIGH-004 | No Retry/Recovery on API Calls | HIGH | OPEN | — | — | — | All services — single call, no retry |
| HIGH-005 | No Offline Capability / No Service Worker | HIGH | OPEN | — | — | — | Architecture-level |

### Medium Issues

| ID | Title | Severity | Status | Assigned To | Fixed Date | Verified | Notes |
|----|-------|----------|--------|-------------|------------|----------|-------|
| MED-001 | reportService.js Breaks Service/Transform Separation | MEDIUM | OPEN | — | — | — | getOrderLogsReport 100+ inline lines |
| MED-002 | _raw Field Leaks Full API Response in All Transforms | MEDIUM | OPEN | — | — | — | Double memory, potential PII leak |
| MED-003 | window.__SOCKET_SERVICE__ Exposed Globally | MEDIUM | OPEN | — | — | — | socketService.js:361 |
| MED-004 | Duplicate Utility Functions Between Services and Contexts | MEDIUM | OPEN | — | — | — | tableService vs TableContext, etc. |
| MED-005 | Sequential API Loading on Startup | MEDIUM | OPEN | — | — | — | LoadingPage — for loop |
| MED-006 | Mock Data Files Ship with Production | MEDIUM | OPEN | — | — | — | src/data/mock*.js |
| MED-007 | Array Mutation Anti-pattern in reportService.js | MEDIUM | OPEN | — | — | — | _runningOrdersMap on array |
| MED-008 | Business Day Comparison Relies on String Comparison | MEDIUM | OPEN | — | — | — | businessDay.js:75 |

### Low Issues / Improvements

| ID | Title | Severity | Status | Assigned To | Fixed Date | Verified | Notes |
|----|-------|----------|--------|-------------|------------|----------|-------|
| LOW-001 | No TypeScript | LOW | OPEN | — | — | — | Entire codebase .js/.jsx |
| LOW-002 | Zero Test Coverage | LOW | OPEN | — | — | — | No test files anywhere |
| LOW-003 | No Monitoring / Structured Logging | LOW | OPEN | — | — | — | Console.log only |
| LOW-004 | No Accessibility (a11y) | LOW | OPEN | — | — | — | No ARIA, no keyboard nav |
| LOW-005 | Multiple eslint-disable Suppressions | LOW | OPEN | — | — | — | Hiding potential stale closure bugs |
| LOW-006 | No Code Splitting / Lazy Loading | LOW | OPEN | — | — | — | All pages imported eagerly |
| LOW-007 | Excessive useCallback/useMemo on Stable References | LOW | OPEN | — | — | — | MenuContext unnecessary wrappers |

### Summary Counters

| Severity | Total | Open | In Progress | Fixed | Won't Fix | Deferred |
|----------|-------|------|-------------|-------|-----------|----------|
| CRITICAL | 5 | 1 | 0 | 4 | 0 | 0 |
| HIGH | 5 | 5 | 0 | 0 | 0 | 0 |
| MEDIUM | 8 | 8 | 0 | 0 | 0 | 0 |
| LOW | 7 | 7 | 0 | 0 | 0 | 0 |
| **TOTAL** | **25** | **21** | **0** | **4** | **0** | **0** |

**Current Code Quality Score: 6.5 / 10**  
**Target Score: 9.5 / 10**

---

## Detailed Findings

---

## 🔴 1. CRITICAL ISSUES (Must fix before production)

---

### CRIT-001: Hardcoded Pre-Production URLs as Fallbacks

**Root cause:** Environment variables have hardcoded fallback defaults pointing to pre-production infrastructure.

**Where it occurs:**
- `src/api/axios.js:5` — `'https://preprod.mygenie.online'` as API fallback
- `src/api/socket/socketEvents.js:8` — `'https://presocket.mygenie.online'` as socket fallback
- `src/api/transforms/profileTransform.js:17` — `'https://preprod.mygenie.online/storage/'` as image base URL

**Impact:** If any environment variable is missing in production deployment, traffic silently routes to pre-production. This means: (a) production users hitting a test server, (b) data leakage across environments, (c) potential data corruption in preprod.

**Suggested fix:** Remove all fallback defaults. Fail fast if `REACT_APP_API_BASE_URL` or `REACT_APP_SOCKET_URL` is undefined. Add build-time validation that rejects builds without required env vars.

---

### CRIT-002: Socket Connects Before Authentication

**Root cause:** `SocketProvider` (line 34) calls `socketService.connect()` immediately on mount — before any auth check. The comment explicitly says _"no auth required for socket"_.

**Where it occurs:** `src/contexts/SocketContext.jsx:29-51`, `src/contexts/AppProviders.jsx:13-14` (Socket wraps everything and mounts before auth completes)

**Impact:** Unauthenticated users (or attackers) can establish WebSocket connections to the server, potentially receiving real-time order data from all restaurants. This is a security vulnerability and a server resource drain.

**Suggested fix:** Move socket initialization to post-authentication. Socket should only connect after a valid token is confirmed (e.g., after LoadingPage's profile fetch succeeds). Pass restaurantId as part of the connection handshake.

---

### CRIT-003: No Route Protection / No React Error Boundary

**Root cause:** `App.js` defines routes with zero guards. Authentication check is a `useEffect` redirect _inside_ `DashboardPage` (line 111), which means the component renders fully before redirecting.

**Where it occurs:** `src/App.js:8-28` — all routes are naked. No `<ProtectedRoute>` wrapper. No `<ErrorBoundary>` anywhere in the component tree.

**Impact:**
- Flash of authenticated content before redirect (data leak)
- Any JavaScript error in any component crashes the entire app — for a POS, this means an active order-taking session crashes with **zero recovery**. Staff must hard-refresh and re-login, losing all unsaved cart data.

**Suggested fix:** (a) Add a `<ProtectedRoute>` HOC that checks `isAuthenticated` before rendering child routes. (b) Wrap `AppProviders`/`App` in a `<ErrorBoundary>` that catches render errors and shows a recovery UI (with Retry button) instead of a white screen.

---

### CRIT-004: Duplicate Key Definition in API Constants

**Root cause:** JavaScript object keys must be unique; duplicate silently overwrites.

**Where it occurs:** `src/api/constants.js:39-40` — `EDIT_ORDER_ITEM` is defined **twice**, both as `'TBD'`.

```javascript
EDIT_ORDER_ITEM:   'TBD',   // CHG-040: Edit placed item qty/notes
EDIT_ORDER_ITEM:   'TBD',   // CHG-040 future: Edit placed item qty
```

**Impact:** Silent overwrite. When someone fills in one `EDIT_ORDER_ITEM`, the other remains `'TBD'` and silently wins. This will cause runtime API failures on the wrong endpoint.

**Suggested fix:** Remove the duplicate. If two distinct operations exist, name them differently (e.g., `EDIT_ORDER_ITEM_QTY`, `EDIT_ORDER_ITEM_NOTES`).

---

### CRIT-005: `paymentService.js` Calls a 'TBD' Endpoint

**Root cause:** `COLLECT_PAYMENT` endpoint is literally the string `'TBD'` (constants.js line 38).

**Where it occurs:** `src/api/services/paymentService.js:14` — `api.post(API_ENDPOINTS.COLLECT_PAYMENT, payload)`

**Impact:** Any code path that triggers `collectPayment()` will fire a POST to `https://preprod.mygenie.online/TBD` — resulting in a 404 error at best, or an unintended route match at worst. In a POS, a payment failure path must never silently break.

**Suggested fix:** Either wire to the correct endpoint (`CLEAR_BILL` exists and appears to be the replacement), or throw an explicit `Error('COLLECT_PAYMENT endpoint not configured')` to fail loudly during development.

---

## 🟠 2. HIGH PRIORITY ISSUES

---

### HIGH-001: God Components — DashboardPage (845 lines), OrderEntry (857 lines)

**Root cause:** These two files each own too much: state management, business logic, API orchestration, search, rendering multiple view modes, and modal coordination — all in a single file.

**Where it occurs:**
- `src/pages/DashboardPage.jsx` — 845 lines, 25+ state variables, search logic, table enrichment, order confirmation/cancellation, grid+list rendering
- `src/components/order-entry/OrderEntry.jsx` — 857 lines, cart management, product adaptation, order placement, payment, 8+ modal states

**Impact:** Impossible to test in isolation. Any change risks regressions across unrelated features. Onboarding new developers takes weeks to understand these files. At 10K scale with more features, these will grow to 2000+ lines.

**Suggested fix:** Extract into feature-based modules:
- DashboardPage → `TableGrid`, `OrderListView`, `SearchController`, `DashboardHeader` as separate components
- OrderEntry → `CartManager` (hook), `MenuBrowser`, `OrderActions`, `PaymentFlow` as separate components/hooks

---

### HIGH-002: All Application State in Volatile React Memory

**Root cause:** All 7 contexts (`AuthContext`, `OrderContext`, `TableContext`, `MenuContext`, `RestaurantContext`, `SettingsContext`, `SocketContext`) store data exclusively in React state (useState). No persistence layer.

**Where it occurs:** All files in `src/contexts/`

**Impact:** A browser refresh, an accidental tab close, or a React error boundary recovery = **complete loss of all running order data, cart contents, and session state**. The `beforeunload` warning in DashboardPage (line 121-131) is the only defense — and it doesn't work on mobile browsers or programmatic navigations.

**Suggested fix:** Add a persistence layer for critical data: `sessionStorage` for cart/order state (survives refresh), IndexedDB for offline capability. Consider React Query or SWR for server-state synchronization with built-in caching.

---

### HIGH-003: 7-Level Context Provider Nesting with Full Re-render Cascades

**Root cause:** `AppProviders.jsx` nests 7 providers. Each provider's state change triggers re-renders down the entire tree. Computed values in OrderContext (e.g., `dineInOrders`, `tableOrders`, `orderItemsByTableId`) recalculate on every `orders` array mutation.

**Where it occurs:** `src/contexts/AppProviders.jsx`, `src/contexts/OrderContext.jsx:109-171`

**Impact:** At 100 tables with 50 running orders, a single socket event that updates one order triggers: OrderContext re-render → all `useMemo` recomputes → DashboardPage re-render → all 100 TableCards re-render. At 10K concurrent sessions this is a performance cliff.

**Suggested fix:**
- Split frequently-changing state (orders) from rarely-changing state (menu, settings) into separate context trees
- Use `React.memo` on expensive list items (TableCard, OrderCard)
- Consider a proper state manager (Zustand or Jotai) with selector-based subscriptions that only re-render affected components

---

### HIGH-004: No Retry/Recovery on API Calls

**Root cause:** All service functions (`authService`, `profileService`, `productService`, etc.) make a single API call with no retry. The only retry logic exists in `socketHandlers.js:fetchOrderWithRetry`.

**Where it occurs:** All files in `src/api/services/`

**Impact:** In a restaurant environment with often-unstable WiFi, a single failed API call during order placement or payment collection means a lost transaction. Staff must manually retry, with no feedback about whether the order was partially committed on the server.

**Suggested fix:** Add a retry wrapper (with exponential backoff) at the Axios interceptor level for idempotent operations (GET, PUT). For non-idempotent operations (POST place-order), implement idempotency keys to prevent duplicate submissions.

---

### HIGH-005: No Offline Capability / No Service Worker

**Root cause:** The app is a pure online SPA with no service worker, no cache strategy, and no offline data store.

**Where it occurs:** Architecture-level — no `serviceWorker.js` or PWA configuration.

**Impact:** A POS system that goes blank when WiFi drops is a revenue blocker. Restaurant staff need to continue taking orders during brief outages. At 10K users, statistically some percentage will always be experiencing connectivity issues.

**Suggested fix:** Phase 1: Add a service worker for asset caching (app shell works offline). Phase 2: Implement offline order queue — orders placed offline are stored in IndexedDB and synced when connection restores.

---

## 🟡 3. MEDIUM ISSUES

---

### MED-001: `reportService.js` Breaks the Service/Transform Separation Pattern

**Root cause:** `getOrderLogsReport()` (lines 389-491) contains 100+ lines of inline data transformation logic that should live in `reportTransform.js`.

**Where it occurs:** `src/api/services/reportService.js:389-491`

**Impact:** Inconsistency with the rest of the codebase where every service delegates transformation to its corresponding transform file. Makes it harder to find and fix data mapping bugs. When the API response format changes, developers won't know to look in the service file.

**Suggested fix:** Extract the inline transform into `reportTransform.js` as `reportFromAPI.orderLogOrder()`, following the existing pattern.

---

### MED-002: `_raw` Field Leaks Full API Response in All Transforms

**Root cause:** Every transform function attaches `_raw: api` to the output object, preserving the entire raw API response.

**Where it occurs:** `src/api/transforms/reportTransform.js` (lines 179, 228, 262, 297, 358, 428, 619), `src/api/services/reportService.js:478`

**Impact:** In production, this means every order object in React state carries a full duplicate of the API response. (a) Double memory usage. (b) If any component accidentally renders `_raw`, it could display sensitive fields (internal IDs, PII, internal status codes). (c) If state is serialized (logging, error reporting), it sends full API payloads.

**Suggested fix:** Remove `_raw` entirely, or gate it behind `process.env.NODE_ENV === 'development'`.

---

### MED-003: `window.__SOCKET_SERVICE__` Exposed Globally

**Root cause:** Debug convenience — `socketService.js:361` exposes the entire socket service instance on `window`.

**Where it occurs:** `src/api/socket/socketService.js:360-362`

**Impact:** Any JavaScript in the page (including injected scripts, browser extensions, or XSS payloads) can call `window.__SOCKET_SERVICE__.emit()`, `disconnect()`, or read `getDebugInfo()`. In a restaurant POS, this could be exploited to inject fake orders or disconnect the socket.

**Suggested fix:** Remove or gate behind `process.env.NODE_ENV === 'development'`.

---

### MED-004: Duplicate Utility Functions Between Services and Contexts

**Root cause:** Both the service layer and context layer implement identical filtering/search functions.

**Where it occurs:**
- `tableService.js` has `getTableById`, `filterByStatus`, `searchTables`, `getAvailableTables`, `getOccupiedTables`
- `TableContext.jsx` has identical `getTableById`, `filterByStatus`, `searchTables`, `getAvailableTables`, `getOccupiedTables`
- Same pattern in `productService.js` vs `MenuContext.jsx`

**Impact:** DRY violation. When business logic changes (e.g., status names), you must update two files. Developers won't know which to use, leading to inconsistent behavior.

**Suggested fix:** Keep utilities in one place only. Context should be the single source of truth for in-memory operations. Services should only handle API calls + transforms.

---

### MED-005: Sequential API Loading on Startup

**Root cause:** `LoadingPage` loads all 7 APIs sequentially using `for...of` loop (`loadAllData`, lines 233-251).

**Where it occurs:** `src/pages/LoadingPage.jsx:233-251`

**Impact:** Total loading time = sum of all API response times. If each takes 500ms, that's 3.5 seconds minimum. Profile must be first (it determines restaurantId), but categories + products + tables + settings + popular food could all fire in parallel after profile completes.

**Suggested fix:** Load Profile first, then fire remaining 6 APIs in parallel with `Promise.all`. This could cut loading time by 60%+.

---

### MED-006: Mock Data Files Ship with Production

**Root cause:** Mock files created during development were never removed.

**Where it occurs:** `src/data/mockConstants.js`, `src/data/mockCustomers.js`, `src/data/mockMenu.js`, `src/data/mockOrders.js`, `src/data/mockTables.js`

**Impact:** Increases bundle size. If accidentally imported, production code runs against fake data. Creates confusion about what data is real vs. mock.

**Suggested fix:** Move to a `__mocks__` directory excluded from production builds, or delete if no longer needed.

---

### MED-007: Array Mutation Anti-pattern in `reportService.js`

**Root cause:** `getAllOrders()` attaches a non-standard property to an array: `deduplicated._runningOrdersMap = runningOrdersMap` (line 565).

**Where it occurs:** `src/api/services/reportService.js:565`

**Impact:** (a) Won't survive `JSON.stringify()` / `JSON.parse()` roundtrip. (b) TypeScript will flag it. (c) Any `Array.from()`, spread, or `.slice()` drops the property. (d) Unexpected behavior for any consumer.

**Suggested fix:** Return a proper object: `{ orders: deduplicated, runningOrdersMap }`.

---

### MED-008: Business Day Comparison Relies on String Comparison

**Root cause:** `isWithinBusinessDay()` uses `>=` / `<=` on date strings.

**Where it occurs:** `src/utils/businessDay.js:75`

**Impact:** Only works because format is "YYYY-MM-DD HH:MM:SS" (lexicographic order matches chronological). If any API returns ISO format with 'T' separator, or different timezone offsets, the comparison silently breaks — filtering orders incorrectly.

**Suggested fix:** Parse to `Date` objects or timestamps for comparison. Normalize all incoming date strings to a canonical format first.

---

## 🟢 4. LOW ISSUES / IMPROVEMENTS

---

### LOW-001: No TypeScript

**Root cause:** Project was scaffolded with Create React App JavaScript template.

**Where it occurs:** Entire codebase — all `.js` / `.jsx` files.

**Impact:** For a POS handling financial transactions with complex API shapes (108+ field order objects), lack of type safety means: (a) transform bugs caught only at runtime, (b) API contract changes break silently, (c) refactoring is high-risk without types. At 10K scale with multiple developers, this becomes a maintenance tax.

**Suggested fix:** Incremental migration — start with `.d.ts` declaration files for API types and transform interfaces, then migrate critical paths (transforms, services) to `.ts`.

---

### LOW-002: Zero Test Coverage

**Root cause:** No test framework configured or test files created.

**Where it occurs:** No `__tests__` directories, no `.test.js` files anywhere.

**Impact:** Every deployment is a gamble. Transform functions (which map 100+ field API responses) are the highest-risk area — a single field name change in the API can break the entire dashboard without any test catching it.

**Suggested fix:** Prioritize tests for: (a) Transform functions (pure functions, easy to test), (b) Business day calculations, (c) Cart total calculations, (d) Permission checks.

---

### LOW-003: No Monitoring / Structured Logging

**Root cause:** All logging uses `console.log/warn/error`.

**Where it occurs:** Throughout — especially `socketHandlers.js`, `socketService.js`, `OrderContext.jsx`, `reportService.js`.

**Impact:** In production with 10K users, debugging issues is blind. No error aggregation, no performance metrics, no real-time alerts when socket disconnects spike or API calls fail.

**Suggested fix:** Integrate Sentry (or equivalent) for error tracking. Replace console logging with a structured logger that includes context (restaurantId, userId, orderId).

---

### LOW-004: No Accessibility (a11y)

**Root cause:** No ARIA attributes, no keyboard navigation, no focus management.

**Where it occurs:** All components — especially `TableCard`, `OrderCard`, interactive elements in `OrderEntry`.

**Impact:** Not usable with screen readers. No keyboard-only navigation. May violate ADA/WCAG compliance requirements depending on deployment region.

**Suggested fix:** Add `role`, `aria-label`, `tabIndex` attributes. Ensure all interactive elements are keyboard-accessible.

---

### LOW-005: Multiple `eslint-disable` Suppressions Hiding Potential Bugs

**Root cause:** React hooks exhaustive deps rule disabled in several places.

**Where it occurs:** `LoadingPage.jsx:64`, `OrderEntry.jsx:168`, `useSocketEvents.js:231`

**Impact:** Missing dependencies in effect hooks can cause stale closures — functions capturing old state values. This leads to subtle bugs where handlers operate on outdated data (e.g., stale cart items after a rapid add/remove sequence).

**Suggested fix:** Audit each suppression. In most cases, extracting handlers into `useCallback` with proper deps or using refs (as done in `useSocketEvents.js:39`) is the correct fix.

---

### LOW-006: No Code Splitting / Lazy Loading

**Root cause:** All page components imported eagerly in `App.js`.

**Where it occurs:** `src/App.js:3-4`

**Impact:** Entire app JavaScript loads upfront. As the codebase grows (new reports pages, settings pages, admin views), initial bundle size will increase, slowing first paint.

**Suggested fix:** Use `React.lazy()` + `<Suspense>` for route-level code splitting. Dashboard, Reports, and OrderEntry can be separate chunks.

---

### LOW-007: Excessive `useCallback`/`useMemo` on Stable References

**Root cause:** Over-optimization — wrapping setters and simple functions in `useCallback` unnecessarily.

**Where it occurs:** `MenuContext.jsx` wraps `setCategories`, `setProducts`, `setPopularFood` in `useCallback`. These are `useState` setters which are already referentially stable.

**Impact:** Adds cognitive overhead and noise. Makes developers think these might change, when they never do. No performance benefit.

**Suggested fix:** Remove unnecessary wrappers. Only use `useCallback`/`useMemo` when the function is passed as a prop to memoized children or has expensive computation.

---

## 🏗 Architectural Overview & Anti-Patterns Summary

| Concern | Current State | Risk Level |
|---------|--------------|-----------|
| **Security** | Token in localStorage, socket unauthenticated, debug globals exposed | CRITICAL |
| **Resilience** | No error boundaries, no retry, no offline mode | CRITICAL |
| **State Management** | 7 nested contexts, volatile memory only, re-render cascades | HIGH |
| **Component Architecture** | 2 god components (800+ lines each), tight coupling | HIGH |
| **API Layer** | Clean service/transform separation (good), but broken by reportService inline transforms | MEDIUM |
| **Testing** | Zero tests | MEDIUM |
| **Observability** | Console.log only, no monitoring, no structured logging | MEDIUM |
| **Performance** | Sequential loading, no code splitting, no memoization strategy | LOW (at current scale) |
| **Developer Experience** | No TypeScript, no storybook, mock data mixed with production | LOW |

---

## What's Done Well (Credit Where Due)

- **Service/Transform pattern** is solid and consistent (except MED-001)
- **Socket architecture** (event constants, handler registry, channel-based routing) is well-structured
- **Constants centralization** (API endpoints, status mappings, loading order) prevents magic strings
- **Business day utility** solves a real complex problem cleanly
- **Computed values in OrderContext** (dineInOrders, walkInOrders, orderItemsByTableId) demonstrate good derived state thinking
- **Consistent code style and documentation** — JSDoc comments throughout
- **Data-testid attributes** present on key interactive elements

---

## Recommended Fix Order (Effort vs Impact)

### Sprint 1 — Quick Wins (1-2 days)
1. CRIT-001: Remove hardcoded URLs (30 min)
2. CRIT-004: Fix duplicate key (5 min)
3. CRIT-005: Fix TBD endpoint (15 min)
4. MED-003: Remove window global (5 min)
5. MED-002: Gate _raw behind dev mode (30 min)
6. MED-006: Relocate mock data (15 min)

### Sprint 2 — Security & Stability (3-5 days)
1. CRIT-002: Auth-gated socket connection
2. CRIT-003: ProtectedRoute + ErrorBoundary
3. HIGH-004: API retry wrapper
4. MED-005: Parallel API loading
5. MED-008: Harden date comparison

### Sprint 3 — Architecture (1-2 weeks)
1. HIGH-001: Break up god components
2. HIGH-003: Optimize context re-renders
3. MED-001: Extract inline transforms
4. MED-004: Deduplicate service/context utilities
5. MED-007: Fix array mutation pattern

### Sprint 4 — Scale & Quality (2-4 weeks)
1. HIGH-002: State persistence layer
2. HIGH-005: Service worker / offline
3. LOW-001: TypeScript migration (start)
4. LOW-002: Test coverage (transforms first)
5. LOW-003: Monitoring integration

### Backlog
- LOW-004: Accessibility
- LOW-005: eslint audit
- LOW-006: Code splitting
- LOW-007: Remove unnecessary memoization

---

*Last updated: February 2026*
*Document version: 1.0*
*Companion document: `/app/memory/REFACTORING_PLAN.md` — Full 45-task, 10-phase refactoring plan with execution priority*
