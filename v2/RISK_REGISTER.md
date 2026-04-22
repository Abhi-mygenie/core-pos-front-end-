# Document Audit Status
- Source File: memory/RISK_REGISTER.md
- Reviewed By: Senior Software Architect and Documentation Audit Agent
- Review Type: Code-verified finalization audit
- Status: Finalized
- Confidence: High
- Code Areas Reviewed: `frontend/src/api/axios.js`, `frontend/src/api/crmAxios.js`, `frontend/src/api/constants.js`, `frontend/src/api/services/paymentService.js`, `frontend/src/api/socket/*`, `frontend/src/components/order-entry/*`, `frontend/src/api/transforms/orderTransform.js`, `frontend/src/contexts/*`, `frontend/src/pages/LoadingPage.jsx`, `frontend/src/components/cards/TableCard.jsx`, `frontend/src/__tests__/api/socket/*`
- Notes: Risk statuses were updated against current branch `Piyush_QA` commit `19fc8ff05506057b6fab89a6201162fa34baedf2`. Earlier risk text was preserved only where still supported by code.

# RISK_REGISTER — v2

Severity scale:
- **CRITICAL** = security/data-loss/service-breaking risk
- **HIGH** = production-functional or major operational risk
- **MEDIUM** = maintainability / correctness / reliability risk
- **LOW** = minor but real drift or cleanup risk

Status scale:
- **Holds**
- **Refined**
- **Reduced**
- **Closed**
- **New**

---

## Risk Status Summary

| Risk ID | Topic | Current Status | Severity |
|---|---|---:|---:|
| RISK-001 | `CLEAR_BILL` undeclared in payment service | Holds | CRITICAL |
| RISK-002 | JWT in localStorage | Holds | CRITICAL |
| RISK-003 | No refresh-token flow | Holds | HIGH |
| RISK-004 | Hard redirect on 401 | Holds | HIGH |
| RISK-005 | `TBD` endpoints in constants | Holds | HIGH |
| RISK-006 | Sequential loading in `LoadingPage` | Holds | HIGH |
| RISK-007 | Very large hotspot files/components | Holds | HIGH |
| RISK-008 | Direct axios calls in UI | Holds | HIGH |
| RISK-009 | Fire-and-forget HTTP + socket-first flow coupling | Holds | HIGH |
| RISK-010 | CRM 401 handling gap | Holds | MEDIUM |
| RISK-011 | Socket event category mismatch docs/constants vs handler behavior | Holds | MEDIUM |
| RISK-012 | `StationContext` value object not memoized | Holds | MEDIUM |
| RISK-013 | `update-food-status` workaround still active | Holds | MEDIUM |
| RISK-014 | No socket auth in client handshake | Holds | MEDIUM-HIGH |
| RISK-015 | FCM token/service-worker fragility | Holds | MEDIUM |
| RISK-016 | Dead/legacy code and naming drift | Refined | MEDIUM |
| RISK-017 | Two toast systems in tree | Reduced | LOW |
| RISK-018 | Tax/service-charge consistency across all print paths | Refined | MEDIUM |
| RISK-019 | Rounding logic duplication/drift | Refined | MEDIUM |
| RISK-020 | Engage-lock staleness on disconnect/reconnect | Holds | MEDIUM |
| RISK-021 | Stale comments contradict live `update-table` subscription | Holds | MEDIUM |
| RISK-022 | Aggregator realtime path dead/unwired | Holds | MEDIUM |
| RISK-023 | Duplicate of toast-system risk | Closed | LOW |
| RISK-024 | UI primitive/bundle size overhead | Reduced | LOW |
| RISK-025 | `LoadingPage` 100ms timer loop | Holds | LOW |
| RISK-026 | Excess console logging in production | Holds | LOW-MEDIUM |
| RISK-027 | StrictMode dev double invoke | Holds | LOW |
| RISK-028 | Legacy mock import remnants | Refined | LOW-MEDIUM |
| RISK-029 | `defaultOrderStatus='paid'` semantics unclear | Holds | MEDIUM |
| RISK-030 | Service charge toggle defaults ON | Holds | LOW |
| RISK-031 | Old branch-name/document-traceability risk | Closed | LOW |
| RISK-032 | Dead `mockOrderItems` usage in `TableCard` | Holds | LOW |
| RISK-033 | Stale socket handler tests vs current implementation | New | MEDIUM |
| RISK-034 | Rounding rule inconsistent between billing paths and `OrderEntry` local helper | New | MEDIUM |

---

## CRITICAL Risks

### RISK-001 — `paymentService.collectPayment()` still posts to undefined `CLEAR_BILL`
- **What code shows**
  - `frontend/src/api/services/paymentService.js` uses `API_ENDPOINTS.CLEAR_BILL`.
  - `frontend/src/api/constants.js` does not define `CLEAR_BILL`.
  - Active code uses `API_ENDPOINTS.BILL_PAYMENT` directly elsewhere.
- **Status**: Holds
- **Why it matters now**
  - The service remains broken if anyone starts using it.
  - Test/docs contradiction still exists.

### RISK-002 — Auth token stored in `localStorage`
- **What code shows**
  - Token is read from `localStorage` in `api/axios.js` and managed through auth service.
- **Status**: Holds
- **Why it matters now**
  - XSS-exposure risk remains unchanged.

---

## HIGH Risks

### RISK-003 — No refresh-token or session-renewal flow
- **What code shows**
  - 401 handling clears auth and redirects to `/`; no refresh attempt exists.
- **Status**: Holds

### RISK-004 — Hard redirect on 401 bypasses React logout lifecycle
- **What code shows**
  - `window.location.href = '/'` is still used in `api/axios.js`.
- **Status**: Holds

### RISK-005 — Production constants still contain `'TBD'` endpoints
- **What code shows**
  - `EDIT_ORDER_ITEM` and `EDIT_ORDER_ITEM_QTY` remain `'TBD'`.
- **Status**: Holds

### RISK-006 — Sequential loading still blocks faster dashboard hydration
- **What code shows**
  - `LoadingPage.loadAllData()` still loops sequentially over all loaders.
- **Status**: Holds

### RISK-007 — Large hotspot files remain concentrated risk areas
- **What code shows**
  - `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `DashboardPage.jsx`, and `orderTransform.js` remain very large and multi-concern.
- **Status**: Holds

### RISK-008 — UI components still make direct axios calls
- **What code shows**
  - `OrderEntry.jsx` still calls `api.get/post/put` directly for multiple critical flows.
- **Status**: Holds

### RISK-009 — HTTP success is still coupled to socket arrival for UX completion
- **What code shows**
  - Several flows fire HTTP and then wait for order/table engage signals before redirect/continuation.
- **Status**: Holds
- **Refinement**
  - Prepaid flow now additionally waits for HTTP response before auto-print, which improves one path, but the broader coupling risk still remains.

---

## MEDIUM Risks

### RISK-010 — CRM 401/authorization failures are still not specially handled
- **What code shows**
  - `crmAxios.js` only maps readable error text.
- **Status**: Holds

### RISK-011 — Socket event categorization constants do not fully match handler behavior
- **What code shows**
  - `EVENTS_REQUIRING_ORDER_API` still includes `UPDATE_ORDER_STATUS`.
  - `handleUpdateOrderStatus()` now expects socket payload and does not fetch.
- **Status**: Holds

### RISK-012 — `StationContext` value object is not memoized
- **What code shows**
  - Provider returns a fresh plain object each render.
- **Status**: Holds

### RISK-013 — `update-food-status` workaround remains active
- **What code shows**
  - Handler still manually engages table because backend table socket is not assumed for this event.
- **Status**: Holds

### RISK-014 — Client socket handshake still sends no auth data
- **What code shows**
  - No `auth`, `query`, or extra headers in `socketService.connect()`.
- **Status**: Holds
- **Refinement**
  - Severity depends on backend protections not visible here.

### RISK-015 — FCM path still depends on browser permission + SW registration success
- **What code shows**
  - FCM token acquisition remains sensitive to denied notification permission and service-worker registration success.
- **Status**: Holds

### RISK-016 — Dead/legacy code and stale comments remain
- **What code shows**
  - `handleUpdateOrder()` is still a legacy wrapper.
  - `paymentService.collectPayment` remains broken.
  - Stale comments still claim `update-table` subscription was removed.
- **Status**: Refined
- **Why refined**
  - Not all previously cited code is equally “dead”; some is legacy-but-live wrapper code.

### RISK-018 — Tax/service-charge consistency is improved but not universal
- **What code shows**
  - Collect-bill paths now reuse UI tax values via overrides.
  - Fallback print recomputation still exists in `buildBillPrintPayload()` when overrides are absent.
- **Status**: Refined
- **Why refined**
  - Risk is narrower than before, but not closed.

### RISK-019 — Rounding logic duplication/drift remains
- **What code shows**
  - `CollectPaymentPanel` and `orderTransform` share the new rule.
  - `OrderEntry.applyRoundOff()` still uses the older logic.
- **Status**: Refined

### RISK-020 — Engage locks can still become stale across disconnect/reconnect
- **What code shows**
  - Engage Sets are in-memory only; no reconnect flush/rebuild logic is present.
- **Status**: Holds

### RISK-021 — Live code still contradicts inline comments about table channel removal
- **What code shows**
  - Subscription exists; removal comments remain.
- **Status**: Holds

### RISK-022 — Aggregator realtime path remains unwired
- **What code shows**
  - Aggregator channel helpers/constants exist, but no subscription path is wired in `useSocketEvents`.
- **Status**: Holds

### RISK-029 — `defaultOrderStatus` semantics remain potentially risky
- **What code shows**
  - `RestaurantContext` defaults to `'paid'` if profile value is absent.
  - `DashboardPage` uses `defaultOrderStatus` for confirm-order action.
- **Status**: Holds

### RISK-033 — Socket tests are stale against current handler implementation
- **What code shows**
  - `updateOrderStatus.test.js` still expects API-fetch fallback behavior.
  - Handler now requires `payload.orders` and returns early when absent.
- **Status**: New
- **Why it matters now**
  - Automated tests can mislead future refactors and false-fail/false-guide maintainers.

### RISK-034 — Rounding rule differs between current billing logic and local pre-placement totals
- **What code shows**
  - `OrderEntry.applyRoundOff()` uses different logic than `CollectPaymentPanel` / `calcOrderTotals()`.
- **Status**: New
- **Why it matters now**
  - The user may see a different rounded total before placement than in collect-bill / payload math.

---

## LOW / LOW-MEDIUM Risks

### RISK-017 — Two toast systems in tree
- **What code shows**
  - shadcn toaster is mounted and active.
  - Sonner file/package remain but are unused.
- **Status**: Reduced
- **Why reduced**
  - This is now primarily dead-code/cognitive-load risk, not an active runtime split.

### RISK-023 — Duplicate toast-system risk entry
- **Status**: Closed
- **Why closed**
  - It duplicated RISK-017 and should not remain separate in final tracking.

### RISK-024 — Bundle/component volume overhead
- **Status**: Reduced
- **Why reduced**
  - Still a valid maintainability/perf consideration, but less urgent than correctness/security items.

### RISK-025 — 100ms `LoadingPage` tick loop
- **Status**: Holds

### RISK-026 — High console-log volume
- **Status**: Holds
- **Refinement**
  - Risk includes noise, performance cost, and possible payload/PII exposure in logs.

### RISK-027 — StrictMode double invoke in dev
- **Status**: Holds

### RISK-028 — Legacy mock import remnants
- **What code shows**
  - `TableCard.jsx` still imports `mockOrderItems` for a dead local variable.
  - `notePresets` remain legitimate runtime reference data.
- **Status**: Refined

### RISK-030 — Service charge toggle still defaults ON
- **Status**: Holds

### RISK-031 — Old branch-name / traceability risk in previous docs
- **Status**: Closed
- **Why closed**
  - v2 documentation is now re-anchored to the current audited branch/commit.

### RISK-032 — Dead `mockOrderItems` assignment in `TableCard`
- **Status**: Holds

---

## Highest-Priority Remaining Risks

1. **RISK-001** — broken dead service that can fail immediately if wired in later
2. **RISK-002 / RISK-003 / RISK-004** — auth/session security and session-loss behavior
3. **RISK-006 / RISK-009** — operational latency and socket-coupled UX completion
4. **RISK-014** — socket auth ambiguity
5. **RISK-018 / RISK-019 / RISK-034** — financial-calculation consistency drift
6. **RISK-033** — stale tests undermining trust in socket coverage

---

## Final Audit Notes

- The biggest status change since earlier documentation is that service-charge implementation risk was **reduced in scope**, because post-discount service-charge math is now present in core billing paths.
- The biggest newly visible risk is **test drift**, not just code drift.
- The highest-confidence unresolved implementation mismatches are:
  - broken `paymentService.collectPayment`,
  - stale `update-table removed` comments,
  - rounding inconsistency between paths,
  - hardcoded-on service-charge toggle default.
