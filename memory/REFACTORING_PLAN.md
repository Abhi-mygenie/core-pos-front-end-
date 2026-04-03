# MyGenie POS — Pre-Development Refactoring & Cleanup Plan
## Preparing the Codebase for Multi-Contributor Scale

> **Purpose:** Before the team resumes development, every item below must be addressed to ensure contributors can work on isolated features without merge conflicts, regressions, or architecture confusion.
> **Audit Reference:** `/app/memory/CODE_AUDIT.md` (25 issues identified)

---

## Table of Contents

1. [Tracker Dashboard](#tracker-dashboard)
2. [Phase 0: Developer Tooling & Conventions](#phase-0-developer-tooling--conventions)
3. [Phase 1: Critical Security & Stability Fixes](#phase-1-critical-security--stability-fixes)
4. [Phase 2: Directory Restructuring & Barrel Exports](#phase-2-directory-restructuring--barrel-exports)
5. [Phase 3: God Component Decomposition](#phase-3-god-component-decomposition)
6. [Phase 4: API Layer Discipline](#phase-4-api-layer-discipline)
7. [Phase 5: State Management Cleanup](#phase-5-state-management-cleanup)
8. [Phase 6: Styling & Inline Style Elimination](#phase-6-styling--inline-style-elimination)
9. [Phase 7: Code Hygiene & Dead Code Removal](#phase-7-code-hygiene--dead-code-removal)
10. [Phase 8: Performance Optimizations](#phase-8-performance-optimizations)
11. [Phase 9: Testing Foundation](#phase-9-testing-foundation)
12. [Phase 10: Observability & Monitoring](#phase-10-observability--monitoring)
13. [Appendix: File-Level Heatmap](#appendix-file-level-heatmap)

---

## Tracker Dashboard

> Update **Status** as work progresses: `OPEN` | `IN PROGRESS` | `DONE` | `DEFERRED`

| # | Task | Phase | Severity | Owner | Status | Notes |
|---|------|-------|----------|-------|--------|-------|
| T-01 | Add .prettierrc + .editorconfig | P0 | SETUP | — | OPEN | — |
| T-02 | Add lint-staged + husky pre-commit hooks | P0 | SETUP | — | OPEN | — |
| T-03 | Enforce @/ absolute imports everywhere | P0 | SETUP | — | OPEN | — |
| T-04 | Add CONTRIBUTING.md (coding conventions) | P0 | SETUP | — | OPEN | — |
| T-05 | Remove hardcoded preprod URL fallbacks | P1 | CRITICAL | — | DONE | CRIT-001. 4 files fixed (found extra in categoryTransform). 15 tests. |
| T-06 | Gate socket behind authentication | P1 | CRITICAL | — | DONE | CRIT-002. 13 tests (4 auth-gate + 6 existing behavior + 3 hook contracts). |
| T-07 | Add ProtectedRoute + ErrorBoundary | P1 | CRITICAL | — | DONE | CRIT-003. 18 tests. Wired in App.js, cleaned DashboardPage + LoadingPage. |
| T-08 | Fix duplicate EDIT_ORDER_ITEM key | P1 | CRITICAL | — | DONE | CRIT-004. 4 tests (incl. duplicate guard for all keys). |
| T-09 | Fix TBD endpoint in paymentService | P1 | CRITICAL | — | OPEN | CRIT-005 |
| T-10 | Remove window.__SOCKET_SERVICE__ in prod | P1 | MEDIUM | — | OPEN | MED-003 |
| T-11 | Remove _raw fields or gate behind NODE_ENV | P1 | MEDIUM | — | OPEN | MED-002 |
| T-12 | Create missing barrel exports (index.js) | P2 | HIGH | — | OPEN | modals, panels, reports |
| T-13 | Restructure features/ directory | P2 | HIGH | — | OPEN | See Phase 2 |
| T-14 | Add pages/index.js barrel | P2 | MEDIUM | — | OPEN | — |
| T-15 | Decompose CollectPaymentPanel (1044L) | P3 | HIGH | — | OPEN | Biggest file |
| T-16 | Decompose DashboardPage (845L) | P3 | HIGH | — | OPEN | HIGH-001 |
| T-17 | Decompose OrderEntry (857L) | P3 | HIGH | — | OPEN | HIGH-001 |
| T-18 | Decompose OrderDetailSheet (778L) | P3 | HIGH | — | OPEN | — |
| T-19 | Decompose Header (615L) | P3 | MEDIUM | — | OPEN | — |
| T-20 | Decompose CartPanel (578L) | P3 | MEDIUM | — | OPEN | — |
| T-21 | Decompose OrderTable (554L) | P3 | MEDIUM | — | OPEN | — |
| T-22 | Decompose Sidebar (417L) | P3 | LOW | — | OPEN | — |
| T-23 | Move raw API calls from components to services | P4 | HIGH | — | OPEN | 15+ violations |
| T-24 | Remove axios import from page/component files | P4 | HIGH | — | OPEN | DashboardPage, OrderEntry |
| T-25 | Extract inline transforms from reportService | P4 | MEDIUM | — | OPEN | MED-001 |
| T-26 | Fix array mutation in getAllOrders | P4 | MEDIUM | — | OPEN | MED-007 |
| T-27 | Deduplicate service vs context utilities | P5 | HIGH | — | OPEN | MED-004 |
| T-28 | Optimize context re-renders (React.memo) | P5 | HIGH | — | OPEN | HIGH-003 |
| T-29 | Add state persistence (sessionStorage) | P5 | HIGH | — | OPEN | HIGH-002 |
| T-30 | Parallelize LoadingPage API calls | P5 | MEDIUM | — | OPEN | MED-005 |
| T-31 | Remove excessive useCallback on stable refs | P5 | LOW | — | OPEN | LOW-007 |
| T-32 | Eliminate 1074 inline styles | P6 | HIGH | — | OPEN | New finding |
| T-33 | Centralize all hardcoded color hex values | P6 | MEDIUM | — | OPEN | 15+ scattered #hex |
| T-34 | Move mock data to __mocks__/ or delete | P7 | MEDIUM | — | OPEN | MED-006 |
| T-35 | Remove/replace 58 console.log statements | P7 | MEDIUM | — | OPEN | LOW-003 partial |
| T-36 | Resolve 12 TODO/TBD markers | P7 | LOW | — | OPEN | — |
| T-37 | Audit 3 eslint-disable suppressions | P7 | LOW | — | OPEN | LOW-005 |
| T-38 | Harden businessDay date comparison | P7 | MEDIUM | — | OPEN | MED-008 |
| T-39 | Add React.lazy + Suspense code splitting | P8 | MEDIUM | — | OPEN | LOW-006 |
| T-40 | Add API retry wrapper with backoff | P8 | HIGH | — | OPEN | HIGH-004 |
| T-41 | Create test infrastructure + first tests | P9 | HIGH | — | OPEN | LOW-002 |
| T-42 | Write transform unit tests | P9 | HIGH | — | OPEN | — |
| T-43 | Write businessDay utility tests | P9 | MEDIUM | — | OPEN | — |
| T-44 | Integrate Sentry / structured logger | P10 | MEDIUM | — | OPEN | LOW-003 |
| T-45 | Add basic a11y (ARIA labels, keyboard nav) | P10 | LOW | — | OPEN | LOW-004 |

### Summary

| Phase | Tasks | Open | Done |
|-------|-------|------|------|
| P0: Tooling | 4 | 4 | 0 |
| P1: Critical Fixes | 7 | 7 | 0 |
| P2: Directory Structure | 3 | 3 | 0 |
| P3: Component Decomposition | 8 | 8 | 0 |
| P4: API Layer | 4 | 4 | 0 |
| P5: State Management | 5 | 5 | 0 |
| P6: Styling | 2 | 2 | 0 |
| P7: Code Hygiene | 5 | 5 | 0 |
| P8: Performance | 2 | 2 | 0 |
| P9: Testing | 3 | 3 | 0 |
| P10: Observability | 2 | 2 | 0 |
| **Total** | **45** | **45** | **0** |

---

## Phase 0: Developer Tooling & Conventions

> **Goal:** Before any code refactoring, establish guardrails so every contributor writes code the same way. This prevents formatting merge conflicts and enforces quality gates.

### T-01: Add Prettier + EditorConfig

**Problem:** No formatting standard. Each contributor's IDE formats differently, causing noise in PRs.

**Files to create:**

```
/app/frontend/.prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "bracketSpacing": true,
  "jsxSingleQuote": false,
  "arrowParens": "always"
}
```

```
/app/frontend/.editorconfig
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

**Verification:** Run `npx prettier --check src/` — should pass with 0 errors after initial format.

---

### T-02: Add lint-staged + Husky Pre-commit Hooks

**Problem:** No automated quality check before commits. Broken code can be pushed.

**Action:**
- Install: `yarn add -D husky lint-staged prettier`
- Configure `lint-staged` in `package.json`:
```json
"lint-staged": {
  "src/**/*.{js,jsx}": ["prettier --write", "eslint --fix --max-warnings=0"]
}
```
- Add husky pre-commit hook that runs lint-staged

**Verification:** Attempt to commit a file with a `console.log` → hook blocks it.

---

### T-03: Enforce Absolute `@/` Imports Everywhere

**Problem:** Codebase mixes relative (`../../contexts`) and absolute (`@/`) imports. This causes confusion and makes file moves painful.

**Current state:**
- `jsconfig.json` and `craco.config.js` already support `@/` alias
- But only `index.js` uses it — everything else uses relative paths

**Action:**
- Convert all imports to `@/` pattern. Examples:
  - `from "../../contexts"` → `from "@/contexts"`
  - `from "../api/axios"` → `from "@/api/axios"`
  - `from "../../constants"` → `from "@/constants"`
- Add ESLint rule to enforce: `no-restricted-imports` for `../` patterns crossing module boundaries

**Verification:** `grep -rn 'from "\.\.\/' src/ | grep -v node_modules` should return 0 results (only same-directory relative imports allowed).

---

### T-04: Create CONTRIBUTING.md

**Problem:** No documented conventions. New contributors guess.

**Contents should cover:**
1. Import order: React → external libs → `@/` absolute → relative same-dir
2. File naming: PascalCase for components, camelCase for utilities/hooks/services
3. Component size limit: 300 lines max (if over, decompose)
4. API calls: ONLY through `src/api/services/` — never raw `api.get/post` in components
5. Colors: ONLY from `@/constants/colors.js` — no inline hex
6. State: Context for shared state, local `useState` for component-only state
7. Commit message format (conventional commits recommended)
8. PR checklist: No console.log, no eslint-disable, no inline styles > 3 properties

---

## Phase 1: Critical Security & Stability Fixes

> **Goal:** Remove vulnerabilities and add crash protection. These are non-negotiable for production.

### T-05: Remove Hardcoded Pre-Production URL Fallbacks (CRIT-001)

**Files:** `src/api/axios.js:5`, `src/api/socket/socketEvents.js:8`, `src/api/transforms/profileTransform.js:17`

**Action:** Remove all `|| 'https://preprod...'` fallbacks. Replace with:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
if (!API_BASE_URL) throw new Error('REACT_APP_API_BASE_URL is not configured');
```

**Verification:** Remove env var from `.env`, start app → should crash immediately with clear error message.

---

### T-06: Gate Socket Connection Behind Authentication (CRIT-002)

**Files:** `src/contexts/SocketContext.jsx`, `src/contexts/AppProviders.jsx`

**Action:** 
- Move `socketService.connect()` call from SocketProvider mount to AFTER successful auth (inside LoadingPage after profile fetch)
- Pass auth token as part of socket handshake: `socketService.connect({ auth: { token } })`

**Verification:** Open app without login → socket should NOT connect (check Network tab for WS connections).

---

### T-07: Add ProtectedRoute + ErrorBoundary (CRIT-003)

**Files to create:** `src/components/guards/ProtectedRoute.jsx`, `src/components/guards/ErrorBoundary.jsx`

**Action:**
- `ProtectedRoute`: Checks `isAuthenticated` from AuthContext. If false, redirect to `/login`
- `ErrorBoundary`: Class component wrapping the app. On error, shows recovery UI with "Refresh" button
- Wrap all authenticated routes in `<ProtectedRoute>`
- Wrap `<AppProviders>` in `<ErrorBoundary>`

**Verification:** 
- Navigate to `/dashboard` without auth → redirects to `/login`
- Throw intentional error in a component → ErrorBoundary catches it, shows recovery UI

---

### T-08: Fix Duplicate EDIT_ORDER_ITEM Key (CRIT-004)

**File:** `src/api/constants.js:39-40`

**Action:** Remove the duplicate. Rename if two operations exist (e.g., `EDIT_ORDER_ITEM_QTY`, `EDIT_ORDER_ITEM_NOTES`).

**Verification:** `grep -c "EDIT_ORDER_ITEM" src/api/constants.js` returns 1.

---

### T-09: Fix TBD Endpoint in paymentService (CRIT-005)

**File:** `src/api/services/paymentService.js:14`, `src/api/constants.js:38`

**Action:** Either wire `COLLECT_PAYMENT` to the correct endpoint (likely `CLEAR_BILL`), or add a guard:
```javascript
if (API_ENDPOINTS.COLLECT_PAYMENT === 'TBD') {
  throw new Error('COLLECT_PAYMENT endpoint not configured');
}
```

**Verification:** Call `collectPayment()` → throws descriptive error instead of silent 404.

---

### T-10: Remove `window.__SOCKET_SERVICE__` in Production (MED-003)

**File:** `src/api/socket/socketService.js:360-362`

**Action:** Wrap in dev check:
```javascript
if (process.env.NODE_ENV === 'development') {
  window.__SOCKET_SERVICE__ = socketService;
}
```

**Verification:** Production build → `window.__SOCKET_SERVICE__` is `undefined`.

---

### T-11: Gate `_raw` Field Behind Development Mode (MED-002)

**Files:** All files in `src/api/transforms/`

**Action:** In every transform function that includes `_raw: api`, replace with:
```javascript
...(process.env.NODE_ENV === 'development' ? { _raw: api } : {}),
```

**Verification:** Production build → no `_raw` property on any transformed object.

---

## Phase 2: Directory Restructuring & Barrel Exports

> **Goal:** Create clear module boundaries so contributors know exactly where to add new code. Each feature owns its directory.

### Current Structure (Flat, Ambiguous)
```
src/
  components/
    cards/          ← index.js ✓
    layout/         ← index.js ✓
    modals/         ← index.js ✗ MISSING
    order-entry/    ← index.js ✓
    panels/         ← index.js ✗ MISSING
    reports/        ← index.js ✗ MISSING
    sections/       ← index.js ✓
    ui/             ← shadcn (don't touch)
```

### T-12: Create Missing Barrel Exports

**Action:** Add `index.js` to:
- `src/components/modals/index.js`
- `src/components/panels/index.js`
- `src/components/reports/index.js`

Each should export all components from the directory for clean imports.

**Verification:** `import { FilterBar } from "@/components/reports"` works.

---

### T-13: Proposed Target Structure (Feature-Based)

```
src/
  api/                      ← KEEP AS-IS (well-structured)
    services/
    transforms/
    socket/
    axios.js
    constants.js

  features/                 ← NEW: Feature modules
    dashboard/
      DashboardPage.jsx     ← Extracted from pages/
      TableGrid.jsx         ← Extracted from DashboardPage
      OrderListView.jsx     ← Extracted from DashboardPage
      SearchController.jsx  ← Extracted from DashboardPage
      hooks/
        useDashboardSearch.js
        useTableEnrichment.js
    
    order-entry/            ← MOVE from components/order-entry/
      OrderEntry.jsx
      CartPanel.jsx
      CollectPaymentPanel.jsx
      modals/
        CancelFoodModal.jsx
        MergeTableModal.jsx
        ...
      hooks/
        useCart.js           ← Extract cart logic from OrderEntry
        useOrderPlacement.js ← Extract API calls from OrderEntry
    
    reports/                ← MOVE from components/reports/ + pages/
      AllOrdersReportPage.jsx
      OrderSummaryPage.jsx
      components/
        FilterBar.jsx
        OrderTable.jsx
        DatePicker.jsx
        ...
    
    auth/                   ← NEW feature module
      LoginPage.jsx
      ProtectedRoute.jsx
      hooks/
        useAuth.js

  components/               ← ONLY shared/reusable components
    ui/                     ← shadcn (don't touch)
    cards/
    layout/
    guards/
      ErrorBoundary.jsx

  contexts/                 ← KEEP (but optimize in Phase 5)
  hooks/                    ← KEEP (shared hooks only)
  constants/                ← KEEP
  utils/                    ← KEEP
  lib/                      ← KEEP
```

**Why this matters for team work:**
- Developer A works on `features/dashboard/` — isolated from Developer B on `features/order-entry/`
- Merge conflicts drop dramatically — each feature owns its directory
- Clear import boundaries: features import from `@/api`, `@/contexts`, `@/components/ui` but NOT from other features

**Verification:** Each feature module can have its own index.js barrel export. No circular dependencies.

---

### T-14: Add Pages Barrel Export

**Current:** `src/pages/index.js` exists but verify it exports all pages cleanly.

**Action:** Ensure all page components are properly re-exported.

---

## Phase 3: God Component Decomposition

> **Goal:** No file exceeds 300 lines. Every component has a single responsibility.

### Files Over 400 Lines (12 total — Heatmap)

| File | Lines | Priority | Decomposition Plan |
|------|-------|----------|-------------------|
| `CollectPaymentPanel.jsx` | **1044** | P0 | See T-15 |
| `OrderEntry.jsx` | **857** | P0 | See T-17 |
| `DashboardPage.jsx` | **845** | P0 | See T-16 |
| `OrderDetailSheet.jsx` | **778** | P1 | Extract tabs into sub-components |
| `Header.jsx` | **615** | P1 | See T-19 |
| `reportTransform.js` | **710** | P1 | Split by report type |
| `orderTransform.js` | **593** | P2 | Split fromAPI vs toAPI into separate files |
| `reportService.js` | **588** | P1 | Extract inline transforms (T-25) |
| `CartPanel.jsx` | **578** | P1 | See T-20 |
| `OrderTable.jsx` | **554** | P1 | Extract column defs, row renderers |
| `OrderSummaryPage.jsx` | **518** | P2 | Extract chart sections |
| `AllOrdersReportPage.jsx` | **484** | P2 | Extract filter logic into hook |
| `LoadingPage.jsx` | **453** | P2 | Extract loading step logic |
| `ItemCustomizationModal.jsx` | **453** | P2 | Extract variant/addon sections |
| `Sidebar.jsx` | **417** | P2 | Extract nav items, panel sections |

---

### T-15: Decompose CollectPaymentPanel (1044 lines)

**Current state:** Single component handles: tax calculation, discount logic, coupon validation, payment method selection, split payment, room transfer, bill summary, tip calculation — ALL in one file.

**Proposed decomposition:**
```
order-entry/payment/
  CollectPaymentPanel.jsx    ← Orchestrator (< 150 lines)
  BillSummary.jsx            ← Line items + tax breakdown
  DiscountSection.jsx        ← Coupon, discount type/value
  PaymentMethodPicker.jsx    ← Cash/Card/UPI/Split method
  SplitPaymentView.jsx       ← Split bill UI
  TipSection.jsx             ← Tip amount
  RoomTransferPicker.jsx     ← Transfer to room charges
  hooks/
    usePaymentCalculation.js ← Tax, discount, total logic
```

**Verification:** Each sub-component renders independently. Parent passes only required props.

---

### T-16: Decompose DashboardPage (845 lines)

**Proposed decomposition:**
```
features/dashboard/
  DashboardPage.jsx          ← Layout orchestrator (< 200 lines)
  TableGrid.jsx              ← Grid view of tables/rooms
  OrderListView.jsx          ← List view of delivery/takeaway
  DashboardSearchResults.jsx ← Search dropdown overlay
  hooks/
    useDashboardSearch.js    ← Search logic + results
    useTableEnrichment.js    ← Table + order merging logic
    useDashboardFilters.js   ← Channel/status filter state
```

**Verification:** Switching between grid/list view works. Search works. Table click opens OrderEntry.

---

### T-17: Decompose OrderEntry (857 lines)

**Proposed decomposition:**
```
features/order-entry/
  OrderEntry.jsx             ← Layout + panel orchestrator (< 200 lines)
  MenuBrowser.jsx            ← Category + product browsing + dietary filters
  hooks/
    useCart.js               ← Cart add/remove/qty logic (extracted from 20+ state vars)
    useOrderPlacement.js     ← Place/update order API calls
    useOrderActions.js       ← Transfer, merge, shift, cancel API calls
```

**Verification:** Add item to cart, place order, transfer food, cancel item — all still work.

---

### T-19: Decompose Header (615 lines)

**Problem:** Header receives **14+ props** (massive prop drilling). Contains channel filter, status filter, table filter, search, view toggle, and online indicator.

**Proposed decomposition:**
```
components/layout/
  Header.jsx                 ← Thin wrapper (< 100 lines)
  ChannelFilter.jsx          ← Delivery/TakeAway/DineIn/Room toggles
  StatusFilter.jsx           ← Confirm/Cooking/Ready/Running toggles
  TableFilter.jsx            ← All/Active tables toggle
  HeaderSearch.jsx           ← Search input + dropdown results
  ViewToggle.jsx             ← Grid/List view switch
```

**Additionally:** Consider moving filter state into a `DashboardFilterContext` or a `useDashboardFilters` hook to eliminate prop drilling through Header.

---

## Phase 4: API Layer Discipline

> **Goal:** Components NEVER import `axios` or `API_ENDPOINTS` directly. All API calls go through services.

### T-23: Move Raw API Calls from Components to Services

**Problem found:** 15+ raw `api.put/post(API_ENDPOINTS.X)` calls exist directly in `DashboardPage.jsx` and `OrderEntry.jsx`, bypassing the service layer.

**Violations identified:**
| File | Line | Call | Should Move To |
|------|------|------|----------------|
| `DashboardPage.jsx` | 502 | `api.put(CANCEL_ORDER)` | `orderService.cancelOrder()` |
| `DashboardPage.jsx` | 528 | `api.put(CANCEL_ORDER)` | `orderService.cancelOrder()` |
| `OrderEntry.jsx` | 273 | `api.put(UPDATE_ORDER)` | `orderService.updateOrder()` |
| `OrderEntry.jsx` | 287 | `api.post(PLACE_ORDER)` | `orderService.placeOrder()` |
| `OrderEntry.jsx` | 320 | `api.post(TRANSFER_FOOD)` | `orderService.transferFood()` |
| `OrderEntry.jsx` | 333 | `api.post(MERGE_ORDER)` | `orderService.mergeOrder()` |
| `OrderEntry.jsx` | 343 | `api.post(ORDER_TABLE_SWITCH)` | `tableService.switchTable()` |
| `OrderEntry.jsx` | 356 | `api.put(CANCEL_ITEM_FULL)` | `orderService.cancelItemFull()` |
| `OrderEntry.jsx` | 359 | `api.put(CANCEL_ITEM_PARTIAL)` | `orderService.cancelItemPartial()` |
| `OrderEntry.jsx` | 383 | `api.put(CANCEL_ORDER)` | `orderService.cancelOrder()` |
| `OrderEntry.jsx` | 393 | `api.post(ADD_CUSTOM_ITEM)` | `orderService.addCustomItem()` |
| `OrderEntry.jsx` | 564 | `api.post(ORDER_SHIFTED_ROOM)` | `roomService.shiftToRoom()` |
| `OrderEntry.jsx` | 574 | `api.post(PLACE_ORDER_AND_PAYMENT)` | `orderService.placeAndPay()` |
| `OrderEntry.jsx` | 581 | `api.post(CLEAR_BILL)` | `paymentService.clearBill()` |

**Action:**
1. Create missing service methods for each API call
2. Move transform logic (payload construction) to corresponding `toAPI` transform
3. Remove `import api from "@/api/axios"` and `import { API_ENDPOINTS }` from component files

**Verification:** `grep -rn "from.*api/axios" src/components/ src/pages/` returns 0 results.

---

### T-24: Remove Axios Import from Page/Component Files

**Rule to enforce:** Only files in `src/api/services/` may import `axios`. Add ESLint `no-restricted-imports` rule:
```javascript
'no-restricted-imports': ['error', {
  paths: [{
    name: '@/api/axios',
    message: 'Use service functions from @/api/services/ instead.'
  }]
}]
```

---

### T-25: Extract Inline Transforms from reportService (MED-001)

**File:** `src/api/services/reportService.js:389-491`

**Action:** Move 100+ lines of inline transformation logic into `reportTransform.js` as named functions (`reportFromAPI.orderLogOrder`, `reportFromAPI.orderLogItem`).

---

### T-26: Fix Array Mutation in getAllOrders (MED-007)

**File:** `src/api/services/reportService.js:565`

**Action:** Change `deduplicated._runningOrdersMap = runningOrdersMap` to return `{ orders: deduplicated, runningOrdersMap }`.

**Impact:** Update all callers of `getAllOrders()` to destructure the new return shape.

---

## Phase 5: State Management Cleanup

> **Goal:** Eliminate duplicate state logic, reduce re-renders, add persistence for crash recovery.

### T-27: Deduplicate Service vs Context Utilities (MED-004)

**Problem:** Both service files and context files define identical functions:

| Function | In Service | In Context | Keep Where |
|----------|-----------|------------|-----------|
| `getTableById` | `tableService.js` | `TableContext.jsx` | Context only |
| `filterByStatus` | `tableService.js` | `TableContext.jsx` | Context only |
| `searchTables` | `tableService.js` | `TableContext.jsx` | Context only |
| `getAvailableTables` | `tableService.js` | `TableContext.jsx` | Context only |
| `getOccupiedTables` | `tableService.js` | `TableContext.jsx` | Context only |
| `searchProducts` | `productService.js` | `MenuContext.jsx` | Context only |

**Rule:** Services = API calls + transforms. Contexts = in-memory queries on cached data. Never duplicate.

**Action:** Remove in-memory query functions from service files. Update all imports.

---

### T-28: Optimize Context Re-renders (HIGH-003)

**Problem:** OrderContext has 15+ computed values in `useMemo` that all recompute when `orders` array changes. All consumers re-render.

**Action:**
1. Add `React.memo()` to expensive list items: `TableCard`, `OrderCard`, `DineInCard`, `DeliveryCard`
2. Split OrderContext into two:
   - `OrderDataContext` — raw `orders` array + CRUD operations
   - `OrderDerivedContext` — computed values (`dineInOrders`, `tableOrders`, etc.)
3. Consider migrating to Zustand with selectors (longer-term)

**Verification:** Profile with React DevTools. Updating one order should NOT re-render all 100 table cards.

---

### T-29: Add State Persistence (HIGH-002)

**Action:**
1. Cart state → `sessionStorage` (survives refresh, clears on tab close)
2. Auth token → already in `localStorage` (keep as-is)
3. Active filters → `sessionStorage` (convenience)
4. Order data → re-fetched on refresh via LoadingPage (keep current approach)

**Verification:** Add items to cart → refresh browser → cart items still present.

---

### T-30: Parallelize LoadingPage API Calls (MED-005)

**Current:** Sequential `for...of` loop in LoadingPage.

**Action:**
```javascript
// Step 1: Profile first (needed for restaurantId)
const profile = await profileService.getProfile();

// Step 2: Everything else in parallel
const [categories, products, popular, tables, settings, orders] = await Promise.all([
  categoryService.getCategories(),
  productService.getProducts(...),
  productService.getPopularFood(...),
  tableService.getTables(),
  settingsService.getCancellationReasons(),
  orderService.getRunningOrders(...),
]);
```

**Verification:** Measure load time before/after. Should drop by 50%+.

---

### T-31: Remove Excessive useCallback on Stable References (LOW-007)

**File:** `src/contexts/MenuContext.jsx`

**Action:** Remove `useCallback` wrappers around `setCategories`, `setProducts`, `setPopularFood` — these are `useState` setters which are already referentially stable per React guarantees.

---

## Phase 6: Styling & Inline Style Elimination

> **Goal:** Consistent styling approach. No inline `style={{}}` except for truly dynamic values.

### T-32: Eliminate 1074 Inline Styles

**Current state:** `grep -c 'style={{' *.jsx` = **1074 occurrences** across the codebase.

**Action:**
1. Convert static inline styles to Tailwind classes (most cases)
2. For dynamic styles (e.g., `style={{ color: statusColor }}`), use Tailwind's arbitrary values: `text-[${color}]` or CSS variables
3. For complex dynamic styles, create utility classes in `index.css`

**Priority order:** Start with high-traffic components (`DashboardPage`, `OrderEntry`, `CollectPaymentPanel`)

---

### T-33: Centralize All Hardcoded Color Values

**Problem:** 15+ raw hex values (`#EF4444`, `#F59E0B`, `#8B5CF6`, `#3B82F6`) scattered across components instead of using `COLORS` from constants.

**Files affected:** `TableManagementView.jsx`, `shared.jsx`, `ProductForm.jsx`, `ProductList.jsx`, `statusHelpers.js:48`

**Action:** 
1. Add missing colors to `src/constants/colors.js`
2. Replace all hardcoded hex in components with `COLORS.x` references
3. Consider using Tailwind theme config to make colors available as classes

**Verification:** `grep -rn '"#[0-9A-Fa-f]' src/components/ src/pages/` returns 0 results (excluding constants).

---

## Phase 7: Code Hygiene & Dead Code Removal

> **Goal:** Clean slate for the team. No confusing artifacts.

### T-34: Remove/Relocate Mock Data Files (MED-006)

**Files:** `src/data/mockConstants.js`, `mockCustomers.js`, `mockMenu.js`, `mockOrders.js`, `mockTables.js`

**Action:** Move to `src/__mocks__/` if needed for testing, or delete if superseded by API transforms.

**Verification:** Production build tree-shakes these out. No component imports from `src/data/mock*`.

---

### T-35: Replace 58 Console Statements with Logger

**Action:**
1. Create `src/utils/logger.js` — thin wrapper that conditionally logs in dev, no-ops in production
2. Find-and-replace all `console.log/warn/error` with `logger.log/warn/error`

**Verification:** `grep -rn 'console\.' src/ | grep -v node_modules | grep -v logger.js` returns 0.

---

### T-36: Resolve All TODO/TBD/FIXME Markers

**12 markers found:**
- `CollectPaymentPanel.jsx:147` — TODO: Wire to API
- `OrderEntry.jsx:247` — TODO CHG-040: edit order item
- `constants.js:32-40` — Multiple TBD endpoints
- `paymentService.js:11` — TODO: Wire endpoint
- `customerTransform.js:55-58` — TBD endpoint + TODO

**Action:** For each, either:
- Wire to the correct endpoint if known
- Add a guard that throws descriptive error with ticket reference
- Remove if no longer applicable

---

### T-37: Audit 3 eslint-disable Suppressions (LOW-005)

**Locations:** `LoadingPage.jsx:64`, `OrderEntry.jsx:168`, `useSocketEvents.js:231`

**Action:** For each, either:
- Add the missing dependency (if safe)
- Extract the callback into a ref-based approach (as already done in `useSocketEvents.js:39`)
- Document why the suppression is necessary with a code comment

---

### T-38: Harden Business Day Date Comparison (MED-008)

**File:** `src/utils/businessDay.js:75`

**Action:** Replace string comparison with proper Date parsing:
```javascript
export const isWithinBusinessDay = (createdAt, start, end) => {
  if (!createdAt || !start || !end) return false;
  const ts = new Date(createdAt).getTime();
  return ts >= new Date(start).getTime() && ts <= new Date(end).getTime();
};
```

**Verification:** Test with ISO format dates, dates with 'T' separator, and edge cases around midnight.

---

## Phase 8: Performance Optimizations

### T-39: Add React.lazy + Suspense Code Splitting (LOW-006)

**File:** `src/App.js`

**Action:**
```javascript
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'));
const AllOrdersReportPage = React.lazy(() => import('@/pages/AllOrdersReportPage'));
const OrderSummaryPage = React.lazy(() => import('@/pages/OrderSummaryPage'));

// In routes:
<Suspense fallback={<LoadingSpinner />}>
  <Route path="/dashboard" element={<DashboardPage />} />
</Suspense>
```

**Verification:** Network tab shows separate JS chunks loaded on route navigation.

---

### T-40: Add API Retry Wrapper with Exponential Backoff (HIGH-004)

**Action:** Create `src/api/retry.js`:
- Wrap GET requests with 3 retries + exponential backoff
- POST/PUT requests get idempotency key header
- Add to Axios interceptor

**Verification:** Simulate network failure → request retries 3 times before failing.

---

## Phase 9: Testing Foundation

### T-41: Create Test Infrastructure

**Action:**
1. Configure Jest (already included via react-scripts)
2. Create `src/__tests__/` directory structure mirroring `src/`
3. Add `yarn test:coverage` script

---

### T-42: Write Transform Unit Tests (Priority 1)

**Why first:** Transforms are pure functions (input → output), easiest to test, highest impact (they map every API response).

**Files to test:**
- `orderTransform.js` — 593 lines, 108+ fields mapped
- `reportTransform.js` — 711 lines
- `tableTransform.js` — 167 lines
- `profileTransform.js` — 189 lines

**Verification:** `yarn test --coverage` shows > 80% coverage on transform files.

---

### T-43: Write Business Day Utility Tests

**File:** `src/utils/businessDay.js`

**Test cases:**
- Same-day restaurant (opens 10:00, closes 22:00)
- Overnight restaurant (opens 18:00, closes 03:00)
- Missing schedule fallback
- Edge: midnight boundary

---

## Phase 10: Observability & Monitoring

### T-44: Integrate Sentry / Structured Logger (LOW-003)

**Action:**
1. Install `@sentry/react`
2. Initialize in `index.js` with environment + release info
3. Attach to ErrorBoundary for automatic error reporting
4. Add breadcrumbs for API calls, socket events, navigation

---

### T-45: Add Basic Accessibility (LOW-004)

**Priority components:** TableCard, OrderCard, interactive elements in OrderEntry

**Action:**
1. Add `role`, `aria-label` to interactive cards
2. Add `tabIndex` for keyboard navigation
3. Ensure all buttons have accessible names

---

## Appendix: File-Level Heatmap

> Files sorted by line count. Red = needs decomposition. Yellow = review. Green = fine.

```
RED (> 500 lines — MUST decompose):
  1044  CollectPaymentPanel.jsx
   857  OrderEntry.jsx
   845  DashboardPage.jsx
   778  OrderDetailSheet.jsx
   711  reportTransform.js
   615  Header.jsx
   593  orderTransform.js
   588  reportService.js
   578  CartPanel.jsx
   554  OrderTable.jsx
   518  OrderSummaryPage.jsx

YELLOW (300-500 lines — review & consider):
   484  AllOrdersReportPage.jsx
   453  LoadingPage.jsx
   453  ItemCustomizationModal.jsx
   417  Sidebar.jsx
   365  socketService.js
   357  OrderCard.jsx
   351  socketHandlers.js
   321  ListFormViews.jsx

GREEN (< 300 lines — fine):
   All remaining files
```

---

## Execution Priority for Team Readiness

**Must complete BEFORE team starts:**
1. Phase 0 (Tooling) — 1 day
2. Phase 1 (Critical fixes) — 1-2 days
3. Phase 2 (Directory structure) — 1 day
4. Phase 4: T-23/T-24 only (API layer rule) — 1 day

**Can be done as first sprint work items (parallelizable across team):**
5. Phase 3 (Component decomposition) — assign one per developer
6. Phase 5 (State cleanup) — 1 developer
7. Phase 6 (Styling) — 1 developer
8. Phase 7 (Hygiene) — can be spread across PRs

**Can be done incrementally:**
9. Phases 8-10 (Performance, Testing, Monitoring)

---

*Created: February 2026*  
*Total items: 45*  
*Estimated effort: 2-3 weeks with 2-3 contributors*
