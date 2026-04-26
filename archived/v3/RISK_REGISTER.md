# Document Audit Status
- Source File: v2/RISK_REGISTER.md
- Reviewed By: Senior Software Architect and Documentation Audit Agent
- Review Type: Code-verified finalization audit
- Status: Partially Finalized
- Confidence: High for frontend/static risks; Medium where severity depends on backend/runtime behavior
- Code Areas Reviewed: `frontend/src/api/axios.js`, `frontend/src/api/crmAxios.js`, `frontend/src/api/constants.js`, `frontend/src/api/services/paymentService.js`, `frontend/src/api/services/orderService.js`, `frontend/src/api/socket/*`, `frontend/src/components/order-entry/*`, `frontend/src/components/modals/SplitBillModal.jsx`, `frontend/src/api/transforms/orderTransform.js`, `frontend/src/contexts/*`, `frontend/src/pages/LoadingPage.jsx`, `frontend/craco.config.js`, `frontend/src/components/cards/TableCard.jsx`, `frontend/src/__tests__/api/socket/updateOrderStatus.test.js`
- Notes: Revalidated current risk state at commit `32d91748ff963c7ecb8b9c98c102f1280a2fc179`. Build succeeded with one `LoadingPage.jsx` dependency warning; frontend start attempt found port 3000 already occupied.

# RISK_REGISTER — v3

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
| RISK-009 | Fire-and-forget HTTP + socket-first flow coupling | Refined | HIGH |
| RISK-010 | CRM 401 handling gap | Holds | MEDIUM |
| RISK-011 | Socket event category mismatch docs/constants vs handler behavior | Holds | MEDIUM |
| RISK-012 | `StationContext` value object not memoized | Holds | MEDIUM |
| RISK-013 | `update-food-status` workaround still active | Holds | MEDIUM |
| RISK-014 | No socket auth in client handshake | Holds | MEDIUM-HIGH |
| RISK-015 | FCM token/service-worker fragility | Holds | MEDIUM |
| RISK-016 | Dead/legacy code and naming drift | Refined | MEDIUM |
| RISK-017 | Two toast systems in tree | Reduced | LOW |
| RISK-018 | Tax/service-charge consistency across all print paths | Refined | MEDIUM |
| RISK-019 | Rounding logic duplication/drift | Holds | MEDIUM |
| RISK-020 | Engage-lock staleness on disconnect/reconnect | Holds | MEDIUM |
| RISK-021 | Stale comments contradict live `update-table` subscription | Holds | MEDIUM |
| RISK-022 | Aggregator realtime path dead/unwired | Holds | MEDIUM |
| RISK-024 | UI primitive/bundle size overhead | Reduced | LOW |
| RISK-025 | `LoadingPage` 100ms timer loop | Holds | LOW |
| RISK-026 | Excess console logging in production | Holds | LOW-MEDIUM |
| RISK-027 | StrictMode dev double invoke | Holds | LOW |
| RISK-028 | Legacy mock import remnants | Holds | LOW-MEDIUM |
| RISK-029 | `defaultOrderStatus='paid'` semantics unclear | Holds | MEDIUM |
| RISK-030 | Service charge toggle defaults ON | Holds | LOW |
| RISK-032 | Dead `mockOrderItems` usage in `TableCard` | Holds | LOW |
| RISK-033 | Stale socket handler tests vs current implementation | Holds | MEDIUM |
| RISK-034 | Rounding rule inconsistent between billing paths and `OrderEntry` local helper | Holds | MEDIUM |
| RISK-035 | Missing health-check plugin files behind enabled config | New | MEDIUM |
| RISK-036 | Runtime complimentary override not universal across auto-print paths | New | MEDIUM |
| RISK-037 | Delivery address persistence is backend-unconfirmed | New | HIGH |

---

## CRITICAL Risks

### RISK-001 — `paymentService.collectPayment()` still posts to undefined `CLEAR_BILL`

**Previous Documented Understanding**
- V2 marked this critical risk as holding.

**What Code Actually Does**
- `frontend/src/api/services/paymentService.js` calls `API_ENDPOINTS.CLEAR_BILL`.
- `frontend/src/api/constants.js` does not define `CLEAR_BILL`.

**Status**
- Holds

**Impact on Final Documentation**
- The service remains broken if wired in.

**Required V3 Update**
- Keep as highest-priority latent breakage.

---

### RISK-002 — Auth token stored in `localStorage`

**Previous Documented Understanding**
- JWT/local token storage risk existed.

**What Code Actually Does**
- `api/axios.js` reads `auth_token` from `localStorage` and sets Bearer auth.
- `authService.js` also writes/removes localStorage auth keys.

**Status**
- Holds

**Impact on Final Documentation**
- XSS exposure risk remains.

**Required V3 Update**
- Keep as critical security risk.

---

## HIGH Risks

### RISK-003 / RISK-004 — No refresh token and hard 401 redirect

**Previous Documented Understanding**
- 401 clears auth and redirects.

**What Code Actually Does**
- `api/axios.js` removes `auth_token` and `remember_me`, sets `sessionStorage.auth_redirect`, and assigns `window.location.href = '/'`.
- No token refresh flow exists.

**Status**
- Holds

**Impact on Final Documentation**
- Session expiration remains abrupt and bypasses normal React logout lifecycle.

**Required V3 Update**
- Keep high priority.

---

### RISK-006 — Sequential loading blocks faster dashboard hydration

**Previous Documented Understanding**
- `LoadingPage.loadAllData()` loads APIs sequentially.

**What Code Actually Does**
- `loadAllData()` loops through `API_LOADING_ORDER` and awaits each loader in order.
- Build warning also reports missing `loadStationData` dependency in a `useEffect`.

**Status**
- Holds

**Impact on Final Documentation**
- Startup latency and hook dependency drift remain visible.

**Required V3 Update**
- Keep risk; include build warning.

---

### RISK-007 — Large hotspot files remain concentrated risk areas

**Previous Documented Understanding**
- Several files are oversized and multi-concern.

**What Code Actually Does**
- Current line counts: `OrderEntry.jsx` 1761, `CollectPaymentPanel.jsx` 1777, `DashboardPage.jsx` 1431, `orderTransform.js` 1209.

**Status**
- Holds

**Impact on Final Documentation**
- Billing/order flow changes remain high-risk due to file size and mixed responsibilities.

**Required V3 Update**
- Keep as high maintainability risk.

---

### RISK-009 — HTTP/socket coupling remains but is refined

**Previous Documented Understanding**
- Several flows fire HTTP and rely on socket engage/context arrival for UX completion.

**What Code Actually Does**
- New order/update/transfer/cancel flows still wait for table/order engage signals.
- Prepaid auto-print now awaits the HTTP promise to capture `order_id` before printing.
- Postpaid collect-bill auto-print waits for collect-bill response and uses current order data.

**Status**
- Refined

**Impact on Final Documentation**
- Some paths improved, but socket-coupled completion remains an operational risk.

**Required V3 Update**
- Keep high severity but acknowledge improved auto-print sequencing.

---

### RISK-037 — Delivery address persistence is backend-unconfirmed

**Previous Documented Understanding**
- Pending notes said frontend sends `delivery_address`, but backend persistence was unresolved.

**What Code Actually Does**
- `placeOrder()` and `placeOrderWithPayment()` always emit `delivery_address`: full object for delivery orders, `null` otherwise.
- Static frontend code cannot verify backend persistence or `get-single-order-new` return parity.

**Status**
- New

**Impact on Final Documentation**
- Delivery ops/print/report behavior may still depend on backend work outside frontend.

**Required V3 Update**
- Track as backend clarification/persistence risk.

---

## MEDIUM Risks

### RISK-011 — Socket event category constants do not match handler behavior

**Previous Documented Understanding**
- `EVENTS_REQUIRING_ORDER_API` included events that no longer fetch.

**What Code Actually Does**
- `EVENTS_REQUIRING_ORDER_API` includes `UPDATE_ORDER_STATUS`.
- `handleUpdateOrderStatus()` requires `payload.orders` and does not fetch.

**Status**
- Holds

**Impact on Final Documentation**
- Constants can mislead future refactors/tests.

**Required V3 Update**
- Keep medium risk.

---

### RISK-014 — Client socket handshake sends no auth data

**Previous Documented Understanding**
- Frontend does not send socket auth.

**What Code Actually Does**
- `socketService.connect()` passes only reconnection/timeout/transport options.

**Status**
- Holds

**Impact on Final Documentation**
- Security severity depends on backend protections not visible here.

**Required V3 Update**
- Keep as medium-high and needs backend clarification.

---

### RISK-018 — Tax/service-charge consistency improved but not universal

**Previous Documented Understanding**
- V2 marked this refined.

**What Code Actually Does**
- Manual print and collect-bill auto-print override paths reuse UI values.
- Fallback print path can recompute in `buildBillPrintPayload()`.

**Status**
- Refined

**Impact on Final Documentation**
- Risk narrowed to no-override paths, not closed.

**Required V3 Update**
- Keep medium risk.

---

### RISK-019 / RISK-034 — Rounding logic duplication/drift remains

**Previous Documented Understanding**
- V2 identified `OrderEntry.applyRoundOff()` mismatch.

**What Code Actually Does**
- Mismatch still exists.

**Status**
- Holds

**Impact on Final Documentation**
- User-facing totals can differ between pre-placement local totals and collect-bill/payload totals.

**Required V3 Update**
- Keep as medium correctness risk.

---

### RISK-033 — Stale socket handler tests vs current implementation

**Previous Documented Understanding**
- V2 added stale tests as risk.

**What Code Actually Does**
- `updateOrderStatus.test.js` expects API-fetch behavior, while handler requires socket payload and returns early without it.

**Status**
- Holds

**Impact on Final Documentation**
- Automated tests can misguide future developers/agents.

**Required V3 Update**
- Keep medium risk.

---

### RISK-035 — Missing health-check plugin files behind enabled config

**Previous Documented Understanding**
- V2 treated health-check plugin as resolved/present.

**What Code Actually Does**
- `craco.config.js` conditionally requires missing plugin files when `ENABLE_HEALTH_CHECK=true`.
- Current build succeeds because health check is not enabled.

**Status**
- New

**Impact on Final Documentation**
- Enabling health checks could break start/build configuration.

**Required V3 Update**
- Add risk and clarify current plugin absence.

---

### RISK-036 — Runtime complimentary override not universal across auto-print paths

**Previous Documented Understanding**
- Pending docs highlighted runtime complimentary print override.

**What Code Actually Does**
- Manual print and postpaid collect-bill auto-print pass runtime IDs.
- Prepaid new-order auto-print override object does not include `runtimeComplimentaryFoodIds`.

**Status**
- New

**Impact on Final Documentation**
- Prepaid runtime complimentary print parity is not fully proven from code.

**Required V3 Update**
- Track as partial implementation risk.

---

## LOW / LOW-MEDIUM Risks

### RISK-017 — Two toast systems in tree

**Previous Documented Understanding**
- shadcn toaster active; Sonner unused.

**What Code Actually Does**
- `App.js` mounts shadcn `Toaster`.
- `components/ui/sonner.jsx` and package remain unused.

**Status**
- Reduced

**Impact on Final Documentation**
- Cognitive-load/dead-code risk only.

**Required V3 Update**
- Keep low.

---

### RISK-028 / RISK-032 — Mock import remnants

**Previous Documented Understanding**
- Some mock artifacts are dead, some reference data active.

**What Code Actually Does**
- `TableCard.jsx` imports `mockOrderItems` and assigns `orderData`, which is not used further.
- `notePresets` and `mockCustomerPreferences` remain exported runtime/reference data.

**Status**
- Holds

**Impact on Final Documentation**
- Cleanup guidance must be granular.

**Required V3 Update**
- Keep low-medium.

---

## Highest-Priority Remaining Risks

1. **RISK-001** — broken `paymentService.collectPayment()` if wired later.
2. **RISK-002 / RISK-003 / RISK-004** — auth/session storage and expiry behavior.
3. **RISK-006 / RISK-009** — startup latency and socket-coupled flow completion.
4. **RISK-037** — frontend sends delivery address but backend persistence remains unverified.
5. **RISK-018 / RISK-019 / RISK-034 / RISK-036** — financial/print consistency drift across edge paths.
6. **RISK-033 / RISK-035** — stale tests and missing health-check plugin files undermine maintenance confidence.

---

## Final Audit Notes

- Current build is successful, but the `LoadingPage.jsx` hook warning is still visible.
- Biggest correction from v2: health-check plugin files are absent despite conditional CRACO references.
- Biggest improvement since v2: postpaid collect-bill auto-print and split-bill final-total display are now implemented.
- Highest-confidence unresolved mismatches remain: undefined `CLEAR_BILL`, stale socket tests/comments, final rounding duplication, and service-charge toggle default ON.

## What Changed From v2
- Added RISK-035, RISK-036, and RISK-037.
- Refined RISK-009 due improved HTTP/order-id sequencing.
- Preserved existing high-priority auth, loading, rounding, stale-test, and broken-service risks.