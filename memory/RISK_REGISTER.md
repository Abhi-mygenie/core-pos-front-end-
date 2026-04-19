# RISK REGISTER — v2

> Generated: 2026 (v2 revision) | Source: `main` branch, static code analysis
> Severity: CRITICAL (service-affecting), HIGH (functional risk), MEDIUM (maintainability), LOW (cosmetic/minor)
> Change from v1: refreshed evidence, added v2-specific risks around engage protocol, aggregator dead code, dual toast systems, paymentService test contradiction.

---

## CRITICAL Risks

### RISK-001 — paymentService.js references undeclared `CLEAR_BILL` endpoint

- **Finding**: `paymentService.collectPayment()` invokes `api.post(API_ENDPOINTS.CLEAR_BILL, payload)`, but `CLEAR_BILL` is **not** a key in `api/constants.js`.
- **Evidence**:
  - `frontend/src/api/services/paymentService.js` line 13 — `api.post(API_ENDPOINTS.CLEAR_BILL, payload)`
  - `frontend/src/api/constants.js` lines 6–74 — no `CLEAR_BILL` key
  - `frontend/src/__tests__/api/paymentService.test.js` lines 17–22 — test asserts `API_ENDPOINTS.CLEAR_BILL` exists and matches `/^\/api\//`; this test currently **fails**.
- **Confidence**: HIGH
- **Impact**: CRITICAL — any caller of `paymentService.collectPayment` will POST to `undefined`, producing a runtime error and likely axios rejection.
- **Mitigating reality**: Search of the codebase shows the active bill-payment path in `OrderEntry.jsx → CollectPaymentPanel.onPaymentComplete` uses `orderTransform.toAPI.collectBillExisting` + direct `api.post(API_ENDPOINTS.BILL_PAYMENT)` — it does **not** go through `paymentService.collectPayment`. So the broken service appears to be dead code. If any future contributor wires it up, it will break.
- **Recommendation**:
  - Either add `CLEAR_BILL` to `constants.js` pointing to the intended `/api/v2/vendoremployee/order/order-bill-payment` (same as `BILL_PAYMENT`) and delete `BILL_PAYMENT` aliasing; OR
  - Remove `paymentService.js` and its tests altogether.
  - Either way, run the test suite so CI catches the contradiction.

### RISK-002 — JWT stored in `localStorage` (XSS exposure)

- **Finding**: Auth token is stored in `localStorage` under `auth_token` and attached via axios interceptor.
- **Evidence**: `authService.js` line 20 — `localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token)`; `api/axios.js` line 23 — `const token = localStorage.getItem('auth_token')`.
- **Confidence**: HIGH
- **Impact**: CRITICAL security — any XSS gadget (malicious dependency, reflected user content) can exfiltrate the token. Token lifetime is unknown but appears long-lived (see RISK-003).
- **Recommendation**: Consider httpOnly cookies or at least a strict CSP + dependency audit cadence. Short of refactor, ensure all user-provided strings rendered in the DOM are encoded (no `dangerouslySetInnerHTML` without sanitization).

### RISK-003 — No token refresh / expiry handling

- **Finding**: There is no refresh-token mechanism. On 401, the token is cleared and the app performs a hard redirect to `/`.
- **Evidence**: `api/axios.js` lines 41–52.
- **Confidence**: HIGH
- **Impact**: HIGH (UX and data integrity) — in a busy restaurant, token expiry mid-order loses unsaved cart state (OrderEntry state is not persisted anywhere).
- **Recommendation**: Implement refresh flow; alternatively, persist critical transient state (cart draft) before redirect.

### RISK-004 — Hard redirect on 401 bypasses React cleanup

- **Finding**: The 401 handler uses `window.location.href = '/'`, not React Router navigation. This also bypasses `AuthContext.logout()` (it only clears the two localStorage keys).
- **Evidence**: `api/axios.js` line 50.
- **Confidence**: HIGH
- **Impact**: HIGH — Context state is never cleared via `clear*` callbacks. Socket connection is only disconnected when `SocketContext` re-renders with `isAuthenticated=false`, which happens after the page reloads, so there is a brief window where the socket may attempt reconnect under the old credentials. Sound playback is cut by the full reload (side benefit).
- **Recommendation**: Replace with a React navigation path that invokes `logout()` then navigates to `/`. Or, after clearing localStorage, dispatch a CustomEvent that AuthContext listens for and triggers proper logout.

---

## HIGH Risks

### RISK-005 — TBD endpoints in production constants

- **Finding**: Two endpoints are the literal string `'TBD'`.
- **Evidence**: `api/constants.js` lines 44–45: `EDIT_ORDER_ITEM: 'TBD'`, `EDIT_ORDER_ITEM_QTY: 'TBD'`.
- **Confidence**: HIGH
- **Impact**: HIGH — any caller performs HTTP to `{REACT_APP_API_BASE_URL}/TBD`.
- **Current usage**: Not found in code — they appear unused. But they are not protected by any runtime guard.
- **Recommendation**: Delete the keys or keep them only if a feature is pending; add a jest test that fails if any endpoint equals `'TBD'` (the existing `constants.test.js` could be extended).

### RISK-006 — Sequential loading blocks Dashboard

- **Finding**: All 7 API calls in `LoadingPage.loadAllData` run sequentially in the declared order.
- **Evidence**: `LoadingPage.jsx` lines 318–337 — `for (const key of keysToLoad) { await loader(ctrl, data); }`
- **Confidence**: HIGH
- **Impact**: HIGH (UX) — only step 1 (profile) strictly must be first (to resolve CRM key + role for orders). Steps 2–6 could run in parallel. Worst-case 1–3s extra latency per login.
- **Recommendation**: Step 1 (profile) sequential, then run 2–7 with `Promise.allSettled`, with per-step status indicators updated independently. The existing per-step `updateStatus` already supports this; it's just scheduled sequentially today.

### RISK-007 — Large components with overlapping concerns

- **Finding**: `OrderEntry.jsx` (1554 LOC), `CollectPaymentPanel.jsx` (1592 LOC), `DashboardPage.jsx` (1431 LOC), `orderTransform.js` (1028 LOC), `StatusConfigPage.jsx` (890 LOC).
- **Evidence**: `wc -l` on each file.
- **Confidence**: HIGH
- **Impact**: HIGH (maintainability) — each of these mixes UI, state, business rules, and direct axios calls. Bug fix hotspots tend to concentrate here (BUG-210, 237, 252, 267, 270, 273, 276, 277, 281, etc. are all in OrderEntry/CollectPaymentPanel).
- **Recommendation**: Prioritize extraction of payment math and place/update/cancel flows into services/hooks in a follow-up refactor (explicitly out-of-scope here, per user instructions).

### RISK-008 — Direct axios calls in UI components bypass services

- **Finding**: `OrderEntry.jsx` calls `api.put` / `api.post` / `api.get` directly with `API_ENDPOINTS.*` for at least 10 endpoints (PLACE_ORDER, UPDATE_ORDER, BILL_PAYMENT, CANCEL_ITEM, ORDER_STATUS_UPDATE, TRANSFER_FOOD, MERGE_ORDER, ORDER_TABLE_SWITCH, ORDER_SHIFTED_ROOM, ADD_CUSTOM_ITEM).
- **Evidence**: `OrderEntry.jsx` imports `api` and `API_ENDPOINTS` and uses them inline (search in file).
- **Confidence**: HIGH
- **Impact**: HIGH — duplicate logic across components; harder to mock in tests; harder to add retries / telemetry.
- **Recommendation**: Consolidate into `orderService`, `tableService` (already has shift/merge/transfer transform functions) and adopt a one-service-per-domain rule.

### RISK-009 — Fire-and-forget HTTP with socket-first state

- **Finding**: Place/update/cancel/collect flows fire HTTP in `.then/.catch` and rely on sockets (`waitForOrderEngaged`/`waitForTableEngaged`) to proceed. If the socket message is lost / never arrives, the UI hangs at the spinner until the `timeout` (5–10s) then silently redirects.
- **Evidence**: `OrderEntry.jsx` lines 557–602 (Update Order), 614–636 (Place Order), 1096–1136 (Prepaid Place+Pay), etc.
- **Confidence**: HIGH
- **Impact**: HIGH — If WebSocket is disconnected (network blip, proxy), the user experiences ambiguous behavior: the HTTP request may succeed but the socket event never arrives, leading to a stuck-looking UI and the user reasonably retrying.
- **Recommendation**: Add a resilience fallback — if timeout expires AND HTTP already succeeded, treat it as success (refresh orders). If HTTP failed, abort immediately (already done).

### RISK-010 — 401 on CRM calls is not specially handled

- **Finding**: `crmAxios.js` response interceptor only maps `readableMessage`. Unlike `axios.js`, it does **not** handle 401/403 at all.
- **Evidence**: `crmAxios.js` lines 66–79.
- **Confidence**: HIGH
- **Impact**: MEDIUM/HIGH — If the CRM key is revoked or stale, user sees per-call errors but stays logged into POS. Could leak internal messages.
- **Recommendation**: Add 401 handling (retry with fresh key, or notify user to re-login) and a generic backoff for 5xx.

### RISK-011 — `EVENTS_REQUIRING_ORDER_API` flag is misleading

- **Finding**: `socketEvents.js` declares `UPDATE_ORDER_STATUS` as "requires order API call", but `socketHandlers.handleUpdateOrderStatus` now reads `payload.orders[0]` directly — no GET API call is made.
- **Evidence**: `socketEvents.js` lines 118–123; `socketHandlers.js` lines 367–411 (post-v2).
- **Confidence**: HIGH
- **Impact**: MEDIUM (documentation/maintainability) — categorization does not match behavior; future devs may miss that the handler expects a payload now.
- **Recommendation**: Re-categorize the constant or remove the constant if nothing consumes it (only comments reference it).

---

## MEDIUM Risks

### RISK-012 — `StationContext` value object is NOT memoized

- **Finding**: `StationContext.jsx` defines `value = { ... }` directly in the body, not in `useMemo`. Every render of `StationProvider` produces a new reference.
- **Evidence**: `contexts/StationContext.jsx` lines 118–141.
- **Confidence**: HIGH
- **Impact**: MEDIUM — all subscribers re-render on every parent render.
- **Recommendation**: Wrap in `useMemo` with proper dependency list (matching the other 8 contexts).

### RISK-013 — `handleUpdateFoodStatus` still engages table via WORKAROUND

- **Finding**: The handler sets `setTableEngaged(tableId, true)` before a GET fetch, then releases after update. Comment says “WORKAROUND: backend does not emit update-table for item-level status changes”.
- **Evidence**: `socketHandlers.js` lines 308–354.
- **Confidence**: HIGH
- **Impact**: MEDIUM — User-facing table lock blink. If backend starts emitting `update-table` engage/free for food-status, both events may fight each other.
- **Recommendation**: Track whether backend emits `update-table` during Ready/Serve; remove workaround when confirmed.

### RISK-014 — Socket auth: no token in handshake

- **Finding**: `socketService.connect()` does not pass `auth`, `query`, or cookies. Reconnect uses the same logic. There is no evidence that the WebSocket identifies the user or the restaurant.
- **Evidence**: `socketService.js` lines 43–71, no `auth`/`query` option passed.
- **Confidence**: HIGH (code says so) / LOW (intent)
- **Impact**: HIGH if the WebSocket is meant to be authenticated — any client can connect and listen on `new_order_${restaurantId}` if the channel is predictable.
- **Recommendation**: Confirm with backend whether Socket.IO authenticates clients by another means (IP, session cookie, subdomain). If not, add auth to handshake.

### RISK-015 — FCM permission + token flow fragility

- **Finding**: Token acquisition registers the service worker with Firebase config as query params. Browsers with strict CSP or SW registration failures will silently produce `{ token: null }`.
- **Evidence**: `config/firebase.js` lines 52–91.
- **Confidence**: MEDIUM
- **Impact**: MEDIUM — some users silently miss push notifications; the retry only happens if the user manually re-enables.
- **Recommendation**: Surface token-null status to user UI; provide a "Re-enable notifications" affordance.

### RISK-016 — Dead code and inconsistent naming

- **Finding**:
  - Legacy `handleUpdateOrder` kept “for rollback reference” (socketHandlers.js line 204–207).
  - `AGGREGATOR_EVENTS` + `EVENTS_REQUIRING_AGGREGATOR_API` declared but never subscribed (`useSocketEvents.js`).
  - `RePrintButton` default export is a non-functional UI (no onClick handlers).
  - `paymentService.collectPayment` (see RISK-001).
- **Evidence**: See respective files.
- **Confidence**: HIGH
- **Impact**: MEDIUM (maintainability, cognitive overhead).
- **Recommendation**: Remove in a cleanup PR; audit imports first.

### RISK-017 — Two toast systems coexist

- **Finding**: `components/ui/toaster.jsx` (shadcn Toast) + `components/ui/sonner.jsx` (Sonner). Both are in the tree: `App.js` mounts `<Toaster />` from `ui/toaster`.
- **Evidence**: `App.js` line 6, `package.json` has `sonner@^2.0.3`, `ui/sonner.jsx` exists.
- **Confidence**: HIGH
- **Impact**: LOW–MEDIUM — risk of inconsistent toast behavior if any component imports the Sonner variant. Not immediately functional but increases cognitive load.
- **Recommendation**: Pick one; delete the other after auditing imports.

### RISK-018 — Service charge / tax calculation divergence (UI vs API)

- **Finding**: `CollectPaymentPanel` applies SC% to `itemTotal` (pre-discount) and computes GST-on-SC using `(sgst+cgst)/itemTotal`. `orderTransform.calcOrderTotals` (used by place/update) applies SC% to `subtotal` (which equals itemTotal at that layer, since the transform does not know about discounts) and uses `gstTax/subtotal`. These are algebraically equivalent only for all-GST menus and no discount.
- **Evidence**: `orderTransform.js` lines 374–385; `CollectPaymentPanel.jsx` lines 210–222.
- **Confidence**: HIGH
- **Impact**: MEDIUM — For orders with mixed VAT/GST items and discounts, the panel's displayed total may differ slightly from the server-calculated total for the same order.
- **Recommendation**: Document the canonical rule (ideally agreed with backend) and make only one function the source of truth. Consider adding a jest unit test with mixed tax.

### RISK-019 — Round-off rule is brittle

- **Finding**: Round-off rule `diff >= 0.10 → ceil` else `floor` is duplicated in three places: `calcOrderTotals` (line 388–393), `CollectPaymentPanel` (`applyRoundOff` in OrderEntry lines 506–510, and inline in CollectPaymentPanel line 240–243), `buildBillPrintPayload` (via overrides or derived values).
- **Evidence**: See files.
- **Confidence**: HIGH
- **Impact**: MEDIUM — Drift risk if any of the three gets updated without the others.
- **Recommendation**: Extract into a shared util (e.g. `utils/money.js` `applyRoundOff(raw)`).

### RISK-020 — Order engage lock can leak on socket disconnect

- **Finding**: If the user triggers an update, the HTTP fires, but the socket never delivers `update-order-*` (e.g. server pushed but client was offline), `setOrderEngaged(id, false)` is never called. The next time the socket reconnects, there is no "replay" — the order may remain engaged indefinitely.
- **Evidence**: `handleOrderDataEvent`, `handleUpdateOrderStatus`, etc. only release engage within their own path; there is no disconnect-time reset of `engagedOrders`.
- **Confidence**: HIGH (behavior) / MEDIUM (impact likelihood)
- **Impact**: MEDIUM — in poor network conditions, card locks may persist. Only remedy is manual refresh (which re-fetches orders but does not clear `engagedOrders` either).
- **Recommendation**: On socket `reconnect`, clear `engagedOrders` and `engagedTables`. Add a TTL (e.g. 60s) beyond which engage auto-expires.

### RISK-021 — Table channel subscribed despite BUG-203 comments

- **Finding**: Code comments claim BUG-203 (April 2026) removed table-channel subscription, but `useSocketEvents.js` still subscribes. Either the fix was reverted or the comments are stale.
- **Evidence**: `socketHandlers.js` lines 4–6 comment, `useSocketEvents.js` lines 4–6, 125–127 vs 146, 153.
- **Confidence**: HIGH
- **Impact**: MEDIUM — may cause duplicate table-status updates (both derived-from-order and directly-from-table-channel) leading to flicker or transient inconsistent state.
- **Recommendation**: Reconcile. If the table channel is authoritative for engage, document; if not, remove the subscription.

### RISK-022 — Aggregator (Swiggy/Zomato) events are dead

- **Finding**: `AGGREGATOR_EVENTS` (`aggrigator-order`, `aggrigator-order-update`) and their categorization exist but no channel subscription is wired.
- **Evidence**: `socketEvents.js` lines 83–87; `useSocketEvents.js` has no aggregator channel.
- **Confidence**: HIGH
- **Impact**: MEDIUM — aggregator orders will never update in real-time; users must manually refresh.
- **Recommendation**: If aggregator sync is expected to be live, subscribe; otherwise remove the declarations.

### RISK-023 — Two toast systems (see RISK-017)

*(Listed here as MEDIUM for completeness — same as RISK-017)*

### RISK-024 — 47 Radix UI + shadcn primitives compiled in; bundle size

- **Finding**: The project ships ~47 shadcn components (`src/components/ui/*`). Actual usage may be a subset, but CRA 5 default build does not tree-shake individual files unless they are unused across the entire graph.
- **Evidence**: `ls src/components/ui | wc -l`
- **Confidence**: MEDIUM
- **Impact**: LOW/MEDIUM (bundle size)
- **Recommendation**: Audit `ui/*` usage; delete unused; or migrate to Vite/Next.js for better tree-shaking (out-of-scope now).

---

## LOW Risks

### RISK-025 — `setInterval(100ms)` render loop on LoadingPage

- **Finding**: `LoadingPage` ticks `setTick(t=>t+1)` every 100ms while loading. Re-renders every 100ms are fine on modern hardware but wasteful.
- **Evidence**: `LoadingPage.jsx` lines 54–59.
- **Confidence**: HIGH
- **Impact**: LOW — cosmetic; no functional issue.
- **Recommendation**: Reduce to 250ms or use rAF.

### RISK-026 — `console.log` at high volume in production

- **Finding**: Dozens of `console.log(...)`, `console.info(...)` and debug logs in socket handlers, order-entry, and collect-payment flows. These run in production.
- **Evidence**: global grep.
- **Confidence**: HIGH
- **Impact**: LOW (perf on slow devices) and SECURITY (logs may leak payloads, customer phone, payment info).
- **Recommendation**: Wrap in debug flag; strip via babel plugin in prod.

### RISK-027 — `StrictMode` double-invoke of effects

- **Finding**: App wraps children in `<React.StrictMode>`. The socket singleton has `initializedRef` to guard double-connect, but some effects may still run twice (e.g. FCM SW registration) in development.
- **Evidence**: `index.js`, `SocketContext.jsx` lines 25–54.
- **Confidence**: MEDIUM
- **Impact**: LOW (dev only).

### RISK-028 — Legacy mock imports still present

- **Finding**: `data/mock*` files are imported in panel/modal components. Not clear at static analysis whether runtime reads them or only in tests.
- **Evidence**: `ls src/data/*`, grep shows imports in multiple places.
- **Confidence**: MEDIUM
- **Impact**: LOW/MEDIUM — if runtime branches accidentally fall through to mocks, user sees placeholder data.
- **Recommendation**: Audit and delete mock fallbacks from production paths.

### RISK-029 — `defaultOrderStatus = 'paid'` semantics unclear

- **Finding**: `RestaurantContext` exposes `defaultOrderStatus` derived from profile `def_ord_status`; `confirmOrder(orderId, roleName, orderStatus='paid')` defaults to `'paid'`. Some restaurants may effectively auto-settle on confirm.
- **Evidence**: `profileTransform.js` line 119 (not re-read here); `orderService.js` line 74.
- **Confidence**: MEDIUM
- **Impact**: MEDIUM (potential for silent auto-settlement in some restaurant configs).
- **Recommendation**: Document; add test that exercises the `confirmOrder` payload for each of the 7 statuses.

### RISK-030 — Service charge toggle (BUG-276) is not persisted

- **Finding**: The per-order `serviceChargeEnabled` toggle defaults ON every time the panel opens; the previous value is not remembered.
- **Evidence**: `CollectPaymentPanel.jsx` line 140.
- **Confidence**: HIGH
- **Impact**: LOW (UX only) — staff must uncheck SC every time if they don't want it for this specific order flow.
- **Recommendation**: Persist the last N sessions' preference in localStorage if this is intended behavior; else keep as-is and document.

---

## Security-Specific Risks (pointer to details above)

- RISK-002 (token in localStorage)
- RISK-010 (CRM 401 unhandled)
- RISK-014 (no WebSocket auth)
- RISK-026 (logs may leak PII / payment info)

---

## Operational Risks

- RISK-006 (sequential API loading)
- RISK-009 (fire-and-forget; socket-hang silent failure)
- RISK-020 (engage lock leak on socket loss)
- RISK-021 (table channel contradiction)
- RISK-022 (aggregator dead)

---

## Maintainability Risks

- RISK-007 (large components)
- RISK-008 (direct axios in UI)
- RISK-012 (StationContext memo missing)
- RISK-016 (dead code)
- RISK-017 / RISK-023 (two toast systems)
- RISK-019 (duplicated round-off logic)

---

## v1 → v2 Changes Summary

| Risk | v1 severity | v2 severity | Notes |
|---|---|---|---|
| RISK-001 CLEAR_BILL | CRITICAL | CRITICAL (upgraded evidence) | Now there's a **failing test** asserting the endpoint exists |
| RISK-002 localStorage token | CRITICAL | CRITICAL | Unchanged |
| RISK-003 no refresh | HIGH | HIGH | Unchanged |
| RISK-004 hard redirect | HIGH | HIGH | Unchanged |
| RISK-005 TBD endpoints | HIGH | HIGH | Unchanged |
| RISK-006 sequential load | HIGH | HIGH | Unchanged |
| RISK-007 large components | new | HIGH | OrderEntry/CollectPaymentPanel grew significantly |
| RISK-008 direct axios | new | HIGH | New |
| RISK-009 socket-first UX | new | HIGH | v2 engage protocol makes this more visible |
| RISK-010 CRM 401 | MEDIUM | MEDIUM | Unchanged |
| RISK-011 event category mismatch | new | HIGH | New (because `update-order-status` handler changed) |
| RISK-012 Station memo | new | MEDIUM | New |
| RISK-013 food-status workaround | new | MEDIUM | Comment says it’s a workaround |
| RISK-014 socket auth | new | MEDIUM-HIGH | New |
| RISK-018 tax divergence | new | MEDIUM | v2-specific with BUG-281 |
| RISK-019 round-off duplicated | new | MEDIUM | New |
| RISK-020 engage leak | new | MEDIUM | v2 engage protocol |
| RISK-021 table channel contradiction | new | MEDIUM | v2 only |
| RISK-022 aggregator dead | new | MEDIUM | Pre-existed, called out now |
| RISK-026 console logs | new | LOW | New |
| RISK-030 SC toggle not persisted | new | LOW | BUG-276 specific |
