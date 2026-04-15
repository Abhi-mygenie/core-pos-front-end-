# RISK REGISTER

> Generated: July 2025 | Source: `main` branch, static code analysis
> Severity: CRITICAL (service-affecting), HIGH (functional risk), MEDIUM (maintainability), LOW (cosmetic/minor)

---

## CRITICAL Risks

### RISK-001: paymentService.js References Undefined Endpoint

- **Finding**: `paymentService.collectPayment()` calls `API_ENDPOINTS.CLEAR_BILL` which does **not exist** in `api/constants.js`
- **Evidence**: `api/services/paymentService.js` line 13 uses `API_ENDPOINTS.CLEAR_BILL`; `api/constants.js` has no `CLEAR_BILL` key
- **Confidence**: HIGH
- **Impact**: CRITICAL — Any code path calling `paymentService.collectPayment()` will throw a runtime error (`undefined` URL → axios request to `undefined`)
- **Current State**: It's unclear if this service is actually invoked anywhere. The CollectPaymentPanel in OrderEntry may use `orderTransform.toAPI.collectBillExisting` + direct `api.post()` instead, bypassing this broken service.
- **Recommendation**: Audit all references to `paymentService.collectPayment`. Either add `CLEAR_BILL` endpoint to constants or remove the dead service.

### RISK-002: Token Stored in localStorage — XSS Vulnerability

- **Finding**: JWT auth token is stored in `localStorage` and attached via request interceptor
- **Evidence**: `authService.js` line 20, `axios.js` line 23
- **Confidence**: HIGH
- **Impact**: CRITICAL for security — Any XSS exploit can steal the token
- **Recommendation**: Consider httpOnly cookies for token storage, or at minimum add CSP headers and input sanitization

### RISK-003: No Token Refresh / Token Expiry Handling

- **Finding**: There is no refresh token mechanism. When a token expires, a 401 response triggers a **hard page redirect** to `/` (not a React navigation)
- **Evidence**: `axios.js` lines 41-52 — `window.location.href = '/'`
- **Confidence**: HIGH
- **Impact**: HIGH — Users lose all in-memory state on token expiry. In a busy restaurant, this means losing any unsaved order work.
- **Recommendation**: Implement token refresh flow or at minimum, persist critical state before redirect

### RISK-004: Hard Redirect on 401 Bypasses React Cleanup

- **Finding**: The 401 handler uses `window.location.href = '/'` instead of React Router navigation
- **Evidence**: `axios.js` line 50
- **Confidence**: HIGH
- **Impact**: HIGH — Context state is NOT properly cleaned up (no `logout()` call), socket connections not properly closed, potential memory leaks
- **Recommendation**: Use React-based navigation and trigger proper `logout()` flow

---

## HIGH Risks

### RISK-005: TBD Endpoints in Production Constants

- **Finding**: Two endpoints are literal string `'TBD'`: `EDIT_ORDER_ITEM` and `EDIT_ORDER_ITEM_QTY`
- **Evidence**: `api/constants.js` lines 44-45
- **Confidence**: HIGH
- **Impact**: HIGH — Any code referencing these will make requests to `https://preprod.mygenie.online/TBD`
- **Recommendation**: Either implement or remove. Add build-time validation for TBD strings.

### RISK-006: Sequential Loading Blocks Dashboard

- **Finding**: All 7 API calls in LoadingPage run sequentially. If one fails, user must retry before proceeding.
- **Evidence**: `LoadingPage.jsx` lines 318-337 — `for (const key of keysToLoad) { await loader(ctrl, data); }`
- **Confidence**: HIGH
- **Impact**: HIGH for UX — Profile must be first (dependency), but the remaining 6 could run in parallel, saving 1-3 seconds
- **Recommendation**: Run Profile first, then parallelize Categories + Products + Tables + Settings + Popular Food + Running Orders

### RISK-007: Socket Reconnection Has Hard Limit

- **Finding**: Socket reconnection has max 10 attempts with delay capped at 30s. After 10 failures, status becomes `ERROR` permanently until manual reconnect.
- **Evidence**: `socketEvents.js` lines 14-15 — `RECONNECTION_ATTEMPTS: 10, RECONNECTION_DELAY_MAX: 30000`
- **Confidence**: HIGH
- **Impact**: HIGH — In poor network conditions, the POS becomes disconnected from real-time updates with no automatic recovery. The user must manually click reconnect or refresh.
- **Recommendation**: Consider infinite reconnection with exponential backoff, or auto-reconnect on visibility change

### RISK-008: StationContext Default Contradicts StationService Default

- **Finding**: `stationService.DEFAULT_STATION_VIEW_CONFIG` has `enabled: true`, but `StationContext.stationViewEnabled` initializes to `false`
- **Evidence**: `stationService.js` line 15 vs `StationContext.jsx` line 24
- **Confidence**: HIGH
- **Impact**: HIGH — On first login (no localStorage), station view could behave unexpectedly depending on which default wins. The context default (`false`) wins since it controls the React state.
- **Recommendation**: Consolidate defaults to a single source of truth

### RISK-009: Stale Closure Risk in useSocketEvents

- **Finding**: `useSocketEvents` uses `actionsRef` to avoid stale closures, which is correct. However, `handleOrderChannelEvent`, `handleTableChannelEvent`, and `handleOrderEngageChannelEvent` are wrapped in `useCallback` with **empty deps** `[]`, relying entirely on `actionsRef.current`.
- **Evidence**: `useSocketEvents.js` lines 58-118
- **Confidence**: MEDIUM — The ref pattern is standard, but any future addition of direct state reads inside these callbacks (without going through ref) would introduce stale closures silently.
- **Impact**: HIGH if broken — Incorrect order/table state updates
- **Recommendation**: Add a comment documenting the pattern's constraint

### RISK-010: `_runningOrdersMap` Attached to Array

- **Finding**: `reportService.getAllOrders()` attaches `_runningOrdersMap` as a custom property on the result array
- **Evidence**: `reportService.js` line 565 — `deduplicated._runningOrdersMap = runningOrdersMap`
- **Confidence**: HIGH
- **Impact**: HIGH — This non-standard pattern will be lost if the array is spread (`[...arr]`), mapped, or serialized. Any consumer that doesn't know about this convention will miss the data.
- **Recommendation**: Return `{ orders: [...], runningOrdersMap: {...} }` object instead

### RISK-010a: `orderItemsByTableId` Breaking Change — Single Object → Array (July 2025)

- **Finding**: `OrderContext.orderItemsByTableId` changed from returning a **single object** per tableId to an **array of objects** per tableId (to support split orders — 1 table → N concurrent orders)
- **Evidence**: `OrderContext.jsx` lines 249-278 — `map[order.tableId].push(entry)` instead of `map[order.tableId] = entry`
- **Confidence**: HIGH
- **Impact**: HIGH — Any consumer still accessing `orderItemsByTableId[tableId].orderId` (object access) will get `undefined` since it's now an array. Known updated consumers: `DashboardPage.jsx`, `DineInCard.jsx`. Any custom or future component that wasn't updated will silently break.
- **Recommendation**: Search codebase for all `orderItemsByTableId` consumers and verify array handling. Consider a TypeScript type or JSDoc annotation.

### RISK-010b: `partial_payments` Always Sent in Prepaid Orders (July 2025)

- **Finding**: `placeOrderWithPayment` now **always** includes `partial_payments` array with all 3 modes (cash, card, upi), even for single-method payments. Unused modes get `payment_amount: 0`.
- **Evidence**: `orderTransform.js` `placeOrderWithPayment` lines 578-607
- **Confidence**: HIGH
- **Impact**: MEDIUM — Backend must accept 0-amount partial payment entries without error. If backend validates that partial_payments amounts sum to total, single-method payments may fail.
- **Recommendation**: Verify backend handles 0-amount partial payment entries correctly

### RISK-010c: `null` → Empty String in Prepaid Payload (July 2025)

- **Finding**: Multiple optional fields in `placeOrderWithPayment` changed from `null` to `''`: `transaction_id`, `discount_type`, `coupon_title`, `coupon_type`, `paid_room`, `room_id`, `address_id`, `discount_member_category_name`, `usage_id`. Also `tip_amount` changed from numeric `0` to string `'0'`, `delivery_charge` now stringified.
- **Evidence**: `orderTransform.js` diff lines 618-648
- **Confidence**: HIGH
- **Impact**: MEDIUM — Backend SQL/NoSQL queries checking `IS NULL` will behave differently with empty string. Type coercion issues possible for `tip_amount` string.
- **Recommendation**: Verify backend handles `''` and `'0'` correctly for these fields

---

## MEDIUM Risks

### RISK-011: Monolithic Components (3 files > 1000 lines)

- **Finding**: DashboardPage (1376), OrderEntry (1298), CollectPaymentPanel (1235) are all > 1000 lines
- **Evidence**: File line counts
- **Confidence**: HIGH
- **Impact**: MEDIUM — Hard to maintain, test, and reason about. Merge conflicts likely with multiple developers.
- **Recommendation**: Extract sub-components and custom hooks

### RISK-012: stationService Hardcodes API URL

- **Finding**: `stationService.fetchStationData` uses a hardcoded URL string `/api/v1/vendoremployee/station-order-list` instead of `API_ENDPOINTS`
- **Evidence**: `stationService.js` line 131
- **Confidence**: HIGH
- **Impact**: MEDIUM — Breaks the centralized endpoint management pattern. Easy to miss during URL changes.
- **Recommendation**: Add to `API_ENDPOINTS` in `constants.js`

### RISK-013: Known Backend Bug — Hold Orders Endpoint

- **Finding**: Code comment explicitly documents: "ISSUE-001 — This endpoint returns same data as paid-order-list (backend bug)"
- **Evidence**: `reportService.js` line 172, line 545 (skip holdOrders in All tab to avoid duplicates)
- **Confidence**: HIGH — Documented by developers
- **Impact**: MEDIUM — Hold/PayLater tab shows same data as Paid tab. Workaround in place (skipped in All tab).
- **Recommendation**: Track backend fix. Remove workaround when fixed.

### RISK-014: Known Socket Bug — BUG-217

- **Finding**: "Backend sends status 6 (paid) for cancel item — should send update-order"
- **Evidence**: `socketHandlers.js` line 363
- **Confidence**: HIGH — Documented by developers
- **Impact**: MEDIUM — Workaround in place (ignoring socket status, fetching from API instead)
- **Recommendation**: Track backend fix

### RISK-015: Known Socket Bug — BUG-203

- **Finding**: "Table socket not firing for update-food-status". Workaround: manually engage/lock table during update-food-status event.
- **Evidence**: `socketHandlers.js` lines 297-306
- **Confidence**: HIGH — Documented by developers
- **Impact**: MEDIUM — Extra table engage/release cycles. Workaround works but adds complexity.
- **Recommendation**: Track backend fix

### RISK-016: FormData vs JSON Inconsistency in Place Order

- **Finding**: `toAPI.placeOrder` comment says "multipart/form-data" but returns a plain object (not FormData). `toAPI.updateOrder` says "application/json". Actual content-type handling is unclear without seeing the calling code.
- **Evidence**: `orderTransform.js` lines 448-449, 509
- **Confidence**: MEDIUM
- **Impact**: MEDIUM — May work if caller wraps in FormData, but the transform itself doesn't enforce this
- **Recommendation**: Clarify who is responsible for content-type (transform or caller)

### RISK-017: No Input Sanitization on Customer Data

- **Finding**: Customer name, phone, notes are passed directly to API payloads without sanitization
- **Evidence**: `orderTransform.js` lines 464-470 (placeOrder), `customerService.js` (create/update)
- **Confidence**: HIGH
- **Impact**: MEDIUM — Backend should validate, but defense-in-depth is missing on frontend
- **Recommendation**: Add basic sanitization for user inputs
- **PARTIAL MITIGATION (July 2025)**: Phone fields now capped to 10 numeric digits via `.replace(/\D/g, '').slice(0, 10)` in `CartPanel.jsx`, `CustomerModal.jsx`, `AddressFormModal.jsx`. TakeAway/Delivery orders now require name/phone/address before submission. Card payments require 4-digit transaction ID. TAB/Credit requires name + 10-digit phone. However, **name fields still have no sanitization** (no XSS filtering, no length cap).

### RISK-018: Google Maps Key Exposed But Unused

- **Finding**: `REACT_APP_GOOGLE_MAPS_KEY` is configured but no code in the analyzed source references it
- **Evidence**: Grep of entire src/ shows no usage of this env var
- **Confidence**: MEDIUM — Could be used by address autocomplete in a way I didn't detect
- **Impact**: LOW-MEDIUM — Unnecessary API key exposure if truly unused
- **Recommendation**: Verify usage; remove if unused

---

## LOW Risks

### RISK-019: ProtectedRoute Checks Token Existence, Not Validity

- **Finding**: `ProtectedRoute` checks `!!token` but doesn't verify token hasn't expired
- **Evidence**: `ProtectedRoute.jsx` line 10
- **Confidence**: HIGH
- **Impact**: LOW — 401 interceptor handles expired tokens at API call time
- **Recommendation**: Acceptable for now; token validation would be a nice-to-have

### RISK-020: Mock Data Files Present

- **Finding**: `data/` directory contains mock files (mockOrders, mockMenu, mockTables, etc.) that appear unused in production code
- **Evidence**: `data/` directory with 6 files
- **Confidence**: MEDIUM — May be used in tests
- **Impact**: LOW — Dead code increases bundle size slightly
- **Recommendation**: Tree-shake or move to test directory

### RISK-021: Console Logging in Production

- **Finding**: Extensive `console.log` statements throughout socket handlers, services, and contexts
- **Evidence**: `socketHandlers.js`, `NotificationContext.jsx`, `stationService.js`, `orderService.js`
- **Confidence**: HIGH
- **Impact**: LOW — Performance and information disclosure concern
- **Recommendation**: Add log-level management or strip in production builds

### RISK-022: `@emergentbase/visual-edits` Dev Dependency

- **Finding**: Dev dependency points to a `.tgz` file on `assets.emergent.sh`, which is an external CDN
- **Evidence**: `package.json` line 85
- **Confidence**: HIGH
- **Impact**: LOW — Dev dependency only, not in production bundle
- **Recommendation**: Verify this is intentional and the CDN is trusted

---

## Risk Summary

| Severity | Count | Key Concerns |
|---|---|---|
| CRITICAL | 4 | Broken endpoint, XSS token storage, no token refresh, hard redirect |
| HIGH | 9 | TBD endpoints, sequential loading, socket reconnect limit, stale closures, array mutation, **orderItemsByTableId breaking change (new)**, **partial_payments always sent (new)**, **null→'' payload change (new)** |
| MEDIUM | 8 | Monolithic components (growing larger), hardcoded URLs, known backend bugs, sanitization (partially mitigated) |
| LOW | 4 | Mock data, console logging, token validation, dev dependencies |
