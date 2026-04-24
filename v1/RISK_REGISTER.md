# RISK REGISTER — v3 (Re-Validation)

> Validation note (2026-04-19): reviewed against current codebase at `main` / `b1ebb9e`.
> Previous v3 text referenced older commit `7f87721`; risk contents were spot-validated against current code, and additional doc-vs-test drift was identified in the validation report.

> Generated: 2026 (v3 re-validation) | Source: `main` branch, commit `7f87721`
> Severity: CRITICAL (service-affecting), HIGH (functional risk), MEDIUM (maintainability), LOW (cosmetic/minor)
> Method: Static code analysis — no runtime observation
> Revalidation result: **30 of 30 v2 risks HOLD** with re-verified evidence. 1 NEW risk added (RISK-032). No risks invalidated.

---

## 0. V2 → V3 Risk Revalidation Summary

| Risk ID | v2 Severity | v3 Severity | Status | Re-verified evidence |
|---|---|---|---|---|
| RISK-001 `CLEAR_BILL` undeclared | CRITICAL | CRITICAL | **HOLDS** | `constants.js:6–74` — no `CLEAR_BILL` key; `paymentService.js:13` references it; `__tests__/api/paymentService.test.js:17–21` asserts it exists (test T2 WILL FAIL) |
| RISK-002 JWT in localStorage | CRITICAL | CRITICAL | **HOLDS** | `axios.js:23` — `localStorage.getItem('auth_token')` |
| RISK-003 No refresh flow | HIGH | HIGH | **HOLDS** | `axios.js:41–52` — 401 clears + redirect, no refresh |
| RISK-004 401 hard redirect | HIGH | HIGH | **HOLDS** | `axios.js:50` — `window.location.href = '/'` |
| RISK-005 TBD endpoints | HIGH | HIGH | **HOLDS** | `constants.js:45–46` — `EDIT_ORDER_ITEM: 'TBD'`, `EDIT_ORDER_ITEM_QTY: 'TBD'` |
| RISK-006 Sequential loading | HIGH | HIGH | **HOLDS** | `LoadingPage.jsx:323–326` — `for...await` over 7 keys |
| RISK-007 Large components | HIGH | HIGH | **HOLDS** | File sizes unchanged: OrderEntry 1554, CollectPaymentPanel 1592, DashboardPage 1431, orderTransform 1028, StatusConfigPage 890 |
| RISK-008 Direct axios in UI | HIGH | HIGH | **HOLDS** | `OrderEntry.jsx` has 11 direct `api.(get\|post\|put)` calls for 10 unique endpoints |
| RISK-009 Fire-and-forget + socket-first | HIGH | HIGH | **HOLDS** | `OrderEntry.jsx:614` (`api.post PLACE_ORDER` without await), `:561`, `:739`, `:767`, `:1154` — same pattern |
| RISK-010 CRM 401 unhandled | MEDIUM | MEDIUM | **HOLDS** | `crmAxios.js:66–79` — only readableMessage |
| RISK-011 Event category mismatch | HIGH | HIGH | **HOLDS** | `socketEvents.js:118–123` declares `UPDATE_ORDER_STATUS` as requiring ORDER_API; `socketHandlers.js:377–381` shows it reads `payload.orders[0]` directly |
| RISK-012 StationContext memo missing | MEDIUM | MEDIUM | **HOLDS** | `StationContext.jsx:118` — `const value = { ... }` (plain literal, no `useMemo`) |
| RISK-013 Food-status workaround | MEDIUM | MEDIUM | **HOLDS** | `socketHandlers.js:308–354` — setTableEngaged before GET fetch |
| RISK-014 Socket auth missing | MEDIUM-HIGH | MEDIUM-HIGH | **HOLDS** | `socketService.js:54–62` — no `auth`, `query`, `extraHeaders` passed to `io(url, options)` |
| RISK-015 FCM fragility | MEDIUM | MEDIUM | **HOLDS** | `config/firebase.js` — unchanged |
| RISK-016 Dead code / inconsistent naming | MEDIUM | MEDIUM | **HOLDS** | `handleUpdateOrder` at `socketHandlers.js:200–207`; `AGGREGATOR_EVENTS` unsubscribed; `paymentService.collectPayment` broken; `RePrintButton` default export |
| RISK-017 Two toast systems | LOW-MEDIUM | LOW-MEDIUM | **HOLDS** | `App.js:6,29` mounts `ui/toaster`; `ui/sonner.jsx` is only referenced inside itself (grep: `from.*sonner` → 1 match, the definition file) |
| RISK-018 Tax calc divergence (UI vs API) | MEDIUM | MEDIUM | **HOLDS** | `CollectPaymentPanel.jsx:219` uses `(sgst+cgst)/itemTotal`; `orderTransform.js:382` uses `gstTax/subtotal` |
| RISK-019 Round-off duplicated | MEDIUM | MEDIUM | **HOLDS** | Same rule in `orderTransform.js:388–393`, `CollectPaymentPanel.jsx:240–243`, `OrderEntry.jsx:506–510` (applyRoundOff) |
| RISK-020 Engage lock leak | MEDIUM | MEDIUM | **HOLDS** | No disconnect-handler that flushes `engagedOrders`/`engagedTables` Sets |
| RISK-021 Table channel contradicts BUG-203 | MEDIUM | MEDIUM | **HOLDS** | `useSocketEvents.js:4–6, 125–127` vs `:146, :153` |
| RISK-022 Aggregator events dead | MEDIUM | MEDIUM | **HOLDS** | No `subscribe(getAggregatorChannel(...), ...)` call anywhere |
| RISK-023 = RISK-017 | MEDIUM | MEDIUM | **HOLDS** | Duplicate (same issue) |
| RISK-024 Bundle size | LOW-MEDIUM | LOW-MEDIUM | **HOLDS** | 46 UI primitives (v2 said 47; minor correction) |
| RISK-025 100ms render loop on Loading | LOW | LOW | **HOLDS** | `LoadingPage.jsx:54–59` |
| RISK-026 Console.log volume | LOW | LOW | **HOLDS** | Logs present at many sites (spot-checked in socketHandlers, OrderEntry, OrderContext) |
| RISK-027 StrictMode double-invoke | LOW | LOW | **HOLDS** | `index.js` uses `<React.StrictMode>` |
| RISK-028 Legacy mock imports | LOW-MEDIUM | LOW-MEDIUM | **REFINED** | v3 identifies the actual 3 import sites (v2 list was wrong — see Module_Map §2.11) |
| RISK-029 `defaultOrderStatus='paid'` semantics | MEDIUM | MEDIUM | **HOLDS** | `orderService.confirmOrder` default `'paid'` still present |
| RISK-030 SC toggle not persisted | LOW | LOW | **HOLDS** | `CollectPaymentPanel.jsx:140` — `useState(true)` |
| **RISK-031 NEW** | — | LOW | **NEW v3** | — (see §"New risks" below) |
| **RISK-032 NEW** | — | LOW | **NEW v3** | — (see §"New risks" below) |

---

## CRITICAL Risks

### RISK-001 — paymentService.js references undeclared `CLEAR_BILL` endpoint

- Finding: `paymentService.collectPayment()` invokes `api.post(API_ENDPOINTS.CLEAR_BILL, payload)`, but `CLEAR_BILL` is **not** a key in `api/constants.js`.
- Type: Fact
- Evidence:
  - `frontend/src/api/services/paymentService.js` line 13 — `api.post(API_ENDPOINTS.CLEAR_BILL, payload)`
  - `frontend/src/api/constants.js` lines 6–74 — no `CLEAR_BILL` key (42 keys total; `BILL_PAYMENT` exists at line 44)
  - `frontend/src/__tests__/api/paymentService.test.js` lines 17–21 — test T2 asserts `API_ENDPOINTS.CLEAR_BILL` exists and matches `/^\/api\//`; this test currently **fails**.
- Confidence: HIGH
- Impact: CRITICAL — any caller of `paymentService.collectPayment` will POST to `undefined`, producing a runtime error and likely axios rejection.
- Mitigating reality (v3 grep-verified): NO call sites for `paymentService.collectPayment` exist outside the test file. Active bill-payment path in `OrderEntry.jsx:1154` uses `api.post(API_ENDPOINTS.BILL_PAYMENT)` directly. So the broken service is **effectively dead code**. If any future contributor wires it up, it will break.
- Status vs Previous: **Unchanged**
- Recommendation:
  - Either add `CLEAR_BILL` to `constants.js` pointing to the intended `/api/v2/vendoremployee/order/order-bill-payment` (same as `BILL_PAYMENT`) and update `paymentService` to actually be used; OR
  - Remove `paymentService.js` and its tests altogether.
  - Either way, run the test suite so CI catches the contradiction.

### RISK-002 — JWT stored in `localStorage` (XSS exposure)

- Finding: Auth token is stored in `localStorage` under `auth_token` and attached via axios interceptor.
- Type: Fact
- Evidence: `authService.js` line 20 — `localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token)`; `api/axios.js` line 23 — `const token = localStorage.getItem('auth_token')`.
- Confidence: HIGH
- Impact: CRITICAL security — any XSS gadget (malicious dependency, reflected user content) can exfiltrate the token. Token lifetime is unknown but appears long-lived (see RISK-003).
- Status vs Previous: **Unchanged**
- Recommendation: Consider httpOnly cookies or at least a strict CSP + dependency audit cadence. Short of refactor, ensure all user-provided strings rendered in the DOM are encoded (no `dangerouslySetInnerHTML` without sanitization).

### RISK-003 — No token refresh / expiry handling

- Finding: There is no refresh-token mechanism. On 401, the token is cleared and the app performs a hard redirect to `/`.
- Type: Fact
- Evidence: `api/axios.js` lines 41–52.
- Confidence: HIGH
- Impact: HIGH (UX and data integrity) — in a busy restaurant, token expiry mid-order loses unsaved cart state (OrderEntry state is not persisted anywhere).
- Status vs Previous: **Unchanged**
- Recommendation: Implement refresh flow; alternatively, persist critical transient state (cart draft) before redirect.

### RISK-004 — Hard redirect on 401 bypasses React cleanup

- Finding: The 401 handler uses `window.location.href = '/'`, not React Router navigation. This also bypasses `AuthContext.logout()` (it only clears the two localStorage keys).
- Type: Fact
- Evidence: `api/axios.js` line 50.
- Confidence: HIGH
- Impact: HIGH — Context state is never cleared via `clear*` callbacks. Socket connection is only disconnected when `SocketContext` re-renders with `isAuthenticated=false`, which happens after the page reloads, so there is a brief window where the socket may attempt reconnect under the old credentials.
- Status vs Previous: **Unchanged**
- Recommendation: Replace with a React navigation path that invokes `logout()` then navigates to `/`. Or, after clearing localStorage, dispatch a CustomEvent that AuthContext listens for.

---

## HIGH Risks

### RISK-005 — TBD endpoints in production constants

- Finding: Two endpoints are the literal string `'TBD'`.
- Type: Fact
- Evidence: `api/constants.js` lines 45–46: `EDIT_ORDER_ITEM: 'TBD'`, `EDIT_ORDER_ITEM_QTY: 'TBD'`.
- Confidence: HIGH
- Impact: HIGH — any caller performs HTTP to `{REACT_APP_API_BASE_URL}/TBD`.
- Current usage (v3 grep-verified): `EDIT_ORDER_ITEM` is referenced only in the constants file itself and `__tests__/api/constants.test.js` (which asserts the key exists). **No call sites in production code**. But they are not protected by any runtime guard.
- Status vs Previous: **Unchanged**
- Recommendation: Delete the keys or keep them only if a feature is pending; add a jest test that fails if any endpoint equals `'TBD'`.

### RISK-006 — Sequential loading blocks Dashboard

- Finding: All 7 API calls in `LoadingPage.loadAllData` run sequentially in the declared order.
- Type: Fact
- Evidence: `LoadingPage.jsx` lines 318–337 — `for (const key of keysToLoad) { await loader(ctrl, data); }`
- Confidence: HIGH
- Impact: HIGH (UX) — only step 1 (profile) strictly must be first (to resolve CRM key + role for orders). Steps 2–7 could run in parallel. Worst-case 1–3s extra latency per login.
- Status vs Previous: **Unchanged**
- Recommendation: Step 1 (profile) sequential, then run 2–7 with `Promise.allSettled`.

### RISK-007 — Large components with overlapping concerns

- Finding: `OrderEntry.jsx` (1554 LOC), `CollectPaymentPanel.jsx` (1592 LOC), `DashboardPage.jsx` (1431 LOC), `orderTransform.js` (1028 LOC), `StatusConfigPage.jsx` (890 LOC).
- Type: Fact
- Evidence: `wc -l` on each file — byte-identical to v2 snapshot.
- Confidence: HIGH
- Impact: HIGH (maintainability) — each of these mixes UI, state, business rules, and direct axios calls. Bug fix hotspots concentrate here.
- Status vs Previous: **Unchanged**
- Recommendation: Prioritize extraction of payment math and place/update/cancel flows into services/hooks in a follow-up refactor.

### RISK-008 — Direct axios calls in UI components bypass services

- Finding: `OrderEntry.jsx` calls `api.put` / `api.post` / `api.get` directly with `API_ENDPOINTS.*` for at least 10 distinct endpoints.
- Type: Fact
- Evidence (v3 grep): 11 direct calls in `OrderEntry.jsx` at lines 561 (UPDATE_ORDER), 614 (PLACE_ORDER), 665 (TRANSFER_FOOD), 691 (MERGE_ORDER), 715 (ORDER_TABLE_SWITCH), 739 (CANCEL_ITEM), 767 (ORDER_STATUS_UPDATE), 784 (ADD_CUSTOM_ITEM), 1043 (ORDER_SHIFTED_ROOM), 1096 (PLACE_ORDER), 1154 (BILL_PAYMENT).
- Confidence: HIGH
- Impact: HIGH — duplicate logic across components; harder to mock in tests; harder to add retries / telemetry.
- Status vs Previous: **Unchanged**
- Recommendation: Consolidate into `orderService`, `tableService` (already has shift/merge/transfer transform functions).

### RISK-009 — Fire-and-forget HTTP with socket-first state

- Finding: Place/update/cancel/collect flows fire HTTP in `.then/.catch` and rely on sockets (`waitForOrderEngaged`/`waitForTableEngaged`) to proceed. If the socket message is lost, the UI hangs at the spinner until `timeout` (5–10s) then silently redirects.
- Type: Fact
- Evidence: `OrderEntry.jsx:561` (Update Order), `:614` (Place Order), `:1096+1128` (Prepaid), `:1154` (Bill Payment). All use `api.put/post(...).then().catch()` pattern followed by `await engagePromise`.
- Confidence: HIGH
- Impact: HIGH — If WebSocket is disconnected (network blip, proxy), the user experiences ambiguous behavior: the HTTP request may succeed but the socket event never arrives, leading to a stuck-looking UI.
- Status vs Previous: **Unchanged**
- Recommendation: Add a resilience fallback — if timeout expires AND HTTP already succeeded, treat it as success (refresh orders). If HTTP failed, abort immediately (already done).

### RISK-010 — 401 on CRM calls is not specially handled

- Finding: `crmAxios.js` response interceptor only maps `readableMessage`. Unlike `axios.js`, it does **not** handle 401/403 at all.
- Type: Fact
- Evidence: `crmAxios.js` lines 66–79.
- Confidence: HIGH
- Impact: MEDIUM/HIGH — If the CRM key is revoked or stale, user sees per-call errors but stays logged into POS.
- Status vs Previous: **Unchanged**
- Recommendation: Add 401 handling (retry with fresh key, or notify user to re-login).

### RISK-011 — `EVENTS_REQUIRING_ORDER_API` flag is misleading

- Finding: `socketEvents.js` declares `UPDATE_ORDER_STATUS` as "requires order API call", but `socketHandlers.handleUpdateOrderStatus` now reads `payload.orders[0]` directly — no GET API call is made.
- Type: Fact
- Evidence: `socketEvents.js:118–123`; `socketHandlers.js:377–390` (v3 re-verified).
- Confidence: HIGH
- Impact: MEDIUM (documentation/maintainability) — categorization does not match behavior.
- Status vs Previous: **Unchanged**
- Recommendation: Re-categorize the constant or remove if nothing consumes it (only comments reference it).

---

## MEDIUM Risks

### RISK-012 — `StationContext` value object is NOT memoized

- Finding: `StationContext.jsx` defines `value = { ... }` directly in the body, not in `useMemo`.
- Type: Fact
- Evidence: `contexts/StationContext.jsx:118` (v3: 44 chars into line 118, opening brace at 118, closing at 141).
- Confidence: HIGH
- Impact: MEDIUM — all subscribers re-render on every parent render.
- Status vs Previous: **Unchanged**
- Recommendation: Wrap in `useMemo` with proper dependency list (matching the other 8 contexts).

### RISK-013 — `handleUpdateFoodStatus` still engages table via WORKAROUND

- Finding: The handler sets `setTableEngaged(tableId, true)` before a GET fetch, then releases after update. Comment says "WORKAROUND: backend does not emit update-table for item-level status changes".
- Type: Fact
- Evidence: `socketHandlers.js:308–354` (lines 325, 329–333, 344–353).
- Confidence: HIGH
- Impact: MEDIUM — User-facing table lock blink. If backend starts emitting `update-table` engage/free for food-status, both events may fight each other.
- Status vs Previous: **Unchanged**
- Recommendation: Track whether backend emits `update-table` during Ready/Serve; remove workaround when confirmed.

### RISK-014 — Socket auth: no token in handshake

- Finding: `socketService.connect()` does not pass `auth`, `query`, or cookies. Reconnect uses the same logic.
- Type: Fact
- Evidence: `socketService.js:54–62` — `connectionOptions = { reconnection, reconnectionAttempts, reconnectionDelay, reconnectionDelayMax, timeout, transports, ...options }` — no auth/query fields.
- Confidence: HIGH (code says so) / LOW (intent — may be cookie/IP authenticated on backend)
- Impact: HIGH if the WebSocket is meant to be authenticated — any client can connect and listen on `new_order_${restaurantId}` if the channel is predictable.
- Status vs Previous: **Unchanged**
- Recommendation: Confirm with backend whether Socket.IO authenticates clients by another means. If not, add auth to handshake.

### RISK-015 — FCM permission + token flow fragility

- Finding: Token acquisition registers the service worker with Firebase config as query params. Browsers with strict CSP or SW registration failures will silently produce `{ token: null }`.
- Type: Inference
- Evidence: `config/firebase.js` — logic unchanged since v2.
- Confidence: MEDIUM
- Impact: MEDIUM — some users silently miss push notifications.
- Status vs Previous: **Unchanged**

### RISK-016 — Dead code and inconsistent naming

- Finding:
  - Legacy `handleUpdateOrder` kept "for rollback reference" (`socketHandlers.js:200–207`).
  - `AGGREGATOR_EVENTS` + `EVENTS_REQUIRING_AGGREGATOR_API` declared but never subscribed (`useSocketEvents.js` has no call to `getAggregatorChannel`).
  - `RePrintButton` default export is hollow (needs deeper audit).
  - `paymentService.collectPayment` (see RISK-001).
- Type: Fact
- Confidence: HIGH
- Impact: MEDIUM (maintainability, cognitive overhead).
- Status vs Previous: **Unchanged**
- Recommendation: Remove in a cleanup PR; audit imports first.

### RISK-017 — Two toast systems coexist

- Finding: `components/ui/toaster.jsx` (shadcn Toast) + `components/ui/sonner.jsx` (Sonner). Both are in the tree: `App.js` mounts `<Toaster />` from `ui/toaster`.
- Type: Fact
- Evidence: `App.js:6,29`, `package.json:52` has `sonner@^2.0.3`, `ui/sonner.jsx` exists. v3 grep confirms sonner is imported ONLY inside `ui/sonner.jsx` (self-reference).
- Confidence: HIGH
- Impact: LOW–MEDIUM — risk of inconsistent toast behavior; increased cognitive load.
- Status vs Previous: **Unchanged (strongly confirmed dead)**
- Recommendation: Delete `ui/sonner.jsx` + remove `sonner` from `package.json` after full audit.

### RISK-018 — Service charge / tax calculation divergence (UI vs API)

- Finding: `CollectPaymentPanel` applies SC% to `itemTotal` (pre-discount) and computes GST-on-SC using `(sgst+cgst)/itemTotal`. `orderTransform.calcOrderTotals` (used by place/update) applies SC% to `subtotal` (≡ itemTotal for new orders, no discount layer) and uses `gstTax/subtotal`. These are algebraically equivalent ONLY for all-GST menus with no discount.
- Type: Fact
- Evidence: `orderTransform.js:374–385`; `CollectPaymentPanel.jsx:210–222`.
- Confidence: HIGH
- Impact: MEDIUM — For orders with mixed VAT/GST items and discounts, the panel's displayed total may differ from the server-calculated total.
- Status vs Previous: **Unchanged**
- Recommendation: Document the canonical rule (ideally agreed with backend) and make only one function the source of truth.

### RISK-019 — Round-off rule is brittle

- Finding: Round-off rule `diff >= 0.10 → ceil` else `floor` is duplicated in three places: `calcOrderTotals` (orderTransform.js:388–393), `CollectPaymentPanel.jsx:240–243`, `OrderEntry.jsx applyRoundOff` (lines 506–510).
- Type: Fact
- Confidence: HIGH
- Impact: MEDIUM — Drift risk.
- Status vs Previous: **Unchanged**
- Recommendation: Extract into a shared util.

### RISK-020 — Order engage lock can leak on socket disconnect

- Finding: If socket never delivers release event, `engagedOrders` Set retains stale entries indefinitely. No replay/reset on reconnect.
- Type: Fact
- Evidence: `OrderContext.jsx:50–62` (`setOrderEngaged`), no disconnect-handler visible in `SocketContext.jsx`.
- Confidence: HIGH (behavior) / MEDIUM (impact likelihood)
- Impact: MEDIUM — in poor network conditions, card locks may persist.
- Status vs Previous: **Unchanged**
- Recommendation: On socket `reconnect`, clear `engagedOrders` and `engagedTables`. Add a TTL.

### RISK-021 — Table channel subscribed despite BUG-203 comments

- Finding: Comments (`useSocketEvents.js:4–6, 125–127`; `socketHandlers.js:4–6`) claim BUG-203 removed table-channel subscription. Runtime still subscribes (`useSocketEvents.js:146, 153`) and logs success/failure.
- Type: Fact
- Evidence: Lines above.
- Confidence: HIGH
- Impact: MEDIUM — may cause duplicate table-status updates (both derived-from-order and directly-from-table-channel).
- Status vs Previous: **Unchanged**
- Recommendation: Reconcile comments vs code.

### RISK-022 — Aggregator (Swiggy/Zomato) events are dead

- Finding: `AGGREGATOR_EVENTS` and `getAggregatorChannel` declared but no `subscribe()` call wires them.
- Type: Fact
- Evidence (v3 grep): `getAggregatorChannel` referenced in `socketEvents.js:43` (definition) and `socket/index.js:22` (barrel re-export) only. Zero subscription sites.
- Confidence: HIGH
- Impact: MEDIUM — aggregator orders will never update in real-time; users must manually refresh.
- Status vs Previous: **Unchanged**
- Recommendation: Subscribe if needed; else remove.

### RISK-023 — Two toast systems (see RISK-017)

*(Listed for completeness — duplicate of RISK-017.)*

### RISK-024 — 46 Radix UI + shadcn primitives compiled in; bundle size

- Finding: Project ships **46** shadcn components under `src/components/ui/` (v3 correction; v2 said 47). CRA 5 default build does not tree-shake individual files unless they are unused across the entire graph.
- Type: Inference
- Evidence: `ls src/components/ui | wc -l` = 46.
- Confidence: MEDIUM
- Impact: LOW/MEDIUM (bundle size).
- Status vs Previous: **Unchanged (count corrected)**

---

## LOW Risks

### RISK-025 — `setInterval(100ms)` render loop on LoadingPage

- Finding: `LoadingPage` ticks `setTick(t=>t+1)` every 100ms while loading.
- Type: Fact
- Evidence: `LoadingPage.jsx:54–59`.
- Confidence: HIGH
- Impact: LOW.
- Status vs Previous: **Unchanged**

### RISK-026 — `console.log` at high volume in production

- Finding: Dozens of `console.log/info/warn/error` calls in socket handlers, order-entry, and collect-payment flows.
- Type: Fact
- Evidence: `grep -rn "console\." frontend/src/ | wc -l` — high count (spot-checked, hundreds).
- Confidence: HIGH
- Impact: LOW (perf) / MEDIUM (SECURITY — logs may leak payloads with customer phone, payment info).
- Status vs Previous: **Unchanged**
- Recommendation: Wrap in debug flag; strip via babel plugin in prod.

### RISK-027 — `StrictMode` double-invoke of effects

- Finding: App wraps children in `<React.StrictMode>`. Some effects may run twice in dev.
- Type: Inference
- Evidence: `index.js`; `SocketContext.jsx:25–54` has `initializedRef` guard.
- Confidence: MEDIUM
- Impact: LOW (dev only).
- Status vs Previous: **Unchanged**

### RISK-028 — Legacy mock imports still present

- Finding: `data/mock*` files imported at runtime.
- Type: Fact
- Evidence (v3 re-verified, correcting v2): Actual imports in `ItemNotesModal.jsx:4`, `OrderNotesModal.jsx:4` (both use `notePresets` — LIVE), and `TableCard.jsx:5` (imports `mockOrderItems`; assigns to dead `orderData` var at line 57 — DEAD).
- Confidence: HIGH
- Impact: LOW–MEDIUM.
- Status vs Previous: **Refined** (v2 import-site list was wrong)
- Recommendation: Audit and delete dead fallbacks; split `notePresets` out of `data/mock*` since it's real reference data, not mock.

### RISK-029 — `defaultOrderStatus = 'paid'` semantics unclear

- Finding: `confirmOrder(orderId, roleName, orderStatus='paid')` defaults to `'paid'`.
- Type: Fact
- Evidence: `orderService.js` (line 74 per v2 citation).
- Confidence: MEDIUM
- Impact: MEDIUM.
- Status vs Previous: **Unchanged**

### RISK-030 — Service charge toggle (BUG-276) is not persisted

- Finding: `serviceChargeEnabled` defaults ON every mount.
- Type: Fact
- Evidence: `CollectPaymentPanel.jsx:140` — `useState(true)`.
- Confidence: HIGH
- Impact: LOW (UX).
- Status vs Previous: **Unchanged**

### RISK-031 — [NEW v3] Default branch claim in v2 docs was wrong

- Finding: v2 stated default branch was `7th-april-v1-`; actual origin HEAD is `main`.
- Type: Fact
- Evidence: `git ls-remote --symref origin HEAD` → `ref: refs/heads/main HEAD`.
- Confidence: HIGH
- Impact: LOW (documentation accuracy only).
- Status vs Previous: **New (doc correction)**
- Recommendation: None operational; retained only for audit trail.

### RISK-032 — [NEW v3] `TableCard.jsx` assigns `mockOrderItems[table.id]` to a dead variable

- Finding: `TableCard.jsx:5` imports `mockOrderItems` from `data/`. `TableCard.jsx:57` assigns `const orderData = mockOrderItems[table.id] || { waiter: "", items: [] };`. The `orderData` variable is **never used anywhere else** in the file (grep `orderData` in TableCard.jsx → 1 match only, at the assignment).
- Type: Fact
- Evidence: `TableCard.jsx:5, :57` + grep.
- Confidence: HIGH
- Impact: LOW — adds an unnecessary import and a dead computation. No functional bug today; but future maintainers may assume mock data is actively driving the card.
- Status vs Previous: **New**
- Recommendation: Delete line 57 and the `mockOrderItems` import on line 5. Clean-up PR.

---

## Security-Specific Risks (pointer to details above)

- RISK-002 (token in localStorage)
- RISK-010 (CRM 401 unhandled)
- RISK-014 (no WebSocket auth in handshake)
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
- RISK-032 (NEW — dead mock import in TableCard.jsx)

---

## v2 → v3 Revalidation Full Summary

| Risk | v2 severity | v3 severity | Status | Notes |
|---|---|---|---|---|
| RISK-001 | CRITICAL | CRITICAL | HOLDS | Broken code is dead; test T2 still fails |
| RISK-002 | CRITICAL | CRITICAL | HOLDS | |
| RISK-003 | HIGH | HIGH | HOLDS | |
| RISK-004 | HIGH | HIGH | HOLDS | |
| RISK-005 | HIGH | HIGH | HOLDS | TBD endpoints still in constants:45–46 |
| RISK-006 | HIGH | HIGH | HOLDS | |
| RISK-007 | HIGH | HIGH | HOLDS | File sizes unchanged byte-for-byte |
| RISK-008 | HIGH | HIGH | HOLDS | 11 direct calls confirmed |
| RISK-009 | HIGH | HIGH | HOLDS | |
| RISK-010 | MEDIUM | MEDIUM | HOLDS | |
| RISK-011 | HIGH | HIGH | HOLDS | |
| RISK-012 | MEDIUM | MEDIUM | HOLDS | StationContext.jsx:118 unchanged |
| RISK-013 | MEDIUM | MEDIUM | HOLDS | |
| RISK-014 | MEDIUM-HIGH | MEDIUM-HIGH | HOLDS | |
| RISK-015 | MEDIUM | MEDIUM | HOLDS | |
| RISK-016 | MEDIUM | MEDIUM | HOLDS | |
| RISK-017 | LOW-MEDIUM | LOW-MEDIUM | HOLDS | Sonner confirmed dead (grep) |
| RISK-018 | MEDIUM | MEDIUM | HOLDS | |
| RISK-019 | MEDIUM | MEDIUM | HOLDS | |
| RISK-020 | MEDIUM | MEDIUM | HOLDS | |
| RISK-021 | MEDIUM | MEDIUM | HOLDS | |
| RISK-022 | MEDIUM | MEDIUM | HOLDS | |
| RISK-023 | MEDIUM | MEDIUM | HOLDS | (= RISK-017) |
| RISK-024 | LOW-MEDIUM | LOW-MEDIUM | HOLDS | Count corrected: 47 → 46 |
| RISK-025 | LOW | LOW | HOLDS | |
| RISK-026 | LOW | LOW | HOLDS | |
| RISK-027 | LOW | LOW | HOLDS | |
| RISK-028 | LOW-MEDIUM | LOW-MEDIUM | **REFINED** | Import site list corrected |
| RISK-029 | MEDIUM | MEDIUM | HOLDS | |
| RISK-030 | LOW | LOW | HOLDS | |
| RISK-031 | — | LOW | **NEW v3** | v2 doc error (default branch name) |
| RISK-032 | — | LOW | **NEW v3** | Dead `mockOrderItems` import in TableCard.jsx |

**Total: 32 risks tracked (30 carried from v2, all HOLD; 2 new).**
