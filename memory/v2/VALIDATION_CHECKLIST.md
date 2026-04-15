# VALIDATED_ARCHITECTURE.md — Review Checklist

> **Reviewer**: _______________  
> **Date**: _______________  
> **Status Legend**: ⬜ = Not Reviewed | ✅ Passed | ⚠️ Partially Correct | ❌ Wrong Assumption | 🔍 Need Runtime Validation

---

## Section 1: Confirmed Architecture (High Confidence)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | **Order Lifecycle — End-to-End** | ⚠️ | See sub-items — some transitions incorrect |
| 1.1-T1 | State: No Order → Place Order → [running/preparing] | ⬜ | |
| 1.1-T2 | State: [running/preparing] → Update Order (add items) → [running/preparing] | ⬜ | |
| 1.1-T3 | State: Cancel Item → [running] (if items remain) | ⬜ | |
| 1.1-T4 | State: Cancel Item → [cancelled] (if last item) | ⚠️ | **PARTIALLY CORRECT** — reviewer flagged |
| 1.1-T5 | State: Cancel Order → [cancelled] → REMOVED from context | ⬜ | |
| 1.1-T6 | State: Collect Bill → [paid] → REMOVED from context | ⬜ | |
| 1.1-T7 | State: Place+Pay → [paid] → REMOVED from context (no intermediate state) | ❌ | **WRONG ASSUMPTION** — reviewer flagged |
| 1.1a | Place Order → POST `/place-order` | 🔍 | We use v2 API per latest code — need runtime validation |
| 1.1b | Update Order → PUT `/update-place-order` | 🔍 | We use v2 API per latest code — need runtime validation |
| 1.1c | Cancel Item → PUT `/cancel-food-item` | 🔍 | We use v2 API per latest code — need runtime validation |
| 1.1d | Cancel Order → PUT `/order-status-update` (v2) | 🔍 | We use v2 API per latest code — need runtime validation |
| 1.1e | Collect Bill → POST `/order-bill-payment` (v2) | 🔍 | We use v2 API per latest code — need runtime validation |
| 1.1f | Place+Pay → same `/place-order` endpoint with `payment_status='paid'` | 🔍 | We use v2 API per latest code — need runtime validation |
| 1.1g | Order Removal: `handleUpdateOrderStatus` status cancelled/paid → removeOrder | ⬜ | |
| 1.1h | Order Removal: `handleUpdateOrderStatus` fetch returns null → removeOrder | 🔍 | **Need runtime validation** — reviewer flagged |
| 1.1i | Order Removal: `handleCancelOrder` awaits `waitForOrderRemoval(orderId, 5000)` | 🔍 | **Need runtime validation** — reviewer flagged |
| 1.1j | No other code path removes orders; socket handler is sole removal mechanism | ⬜ | |
| 1.2 | **Socket Event Flow — Complete Map** | ⚠️ | **PARTIALLY CORRECT** — we don't call API, payload comes in socket |
| 1.2a | Channel subscription: `new_order_{restaurantId}` and `update_table_{restaurantId}` | ⬜ | |
| 1.2b | 7 events mapped: new-order, update-order, update-food-status, update-order-status, scan-new-order, delivery-assign-order, update-table | ⬜ | |
| 1.2c | `update-order-status` IGNORES socket's `fOrderStatus` — always fetches from GET API | 🔍 | **Need runtime validation** — verify so this can be reported to backend if needed |
| 1.2d | `new-order` is the ONLY event with inline order payload; all others are trigger-only | ⬜ | |
| 1.3 | **State Ownership — Definitive Map** | ⬜ | |
| 1.3a | Auth token owned by AuthContext | ⬜ | |
| 1.3b | User profile + permissions owned by AuthContext, written in LoadingPage only | ⬜ | |
| 1.3c | Restaurant config owned by RestaurantContext, written in LoadingPage only | ⬜ | |
| 1.3d | Categories & Products owned by MenuContext | ⬜ | |
| 1.3e | Tables + Rooms (unified) owned by TableContext | ⬜ | |
| 1.3f | Engaged lock set owned by TableContext | ⬜ | |
| 1.3g | Running orders (unified) owned by OrderContext | ⬜ | |
| 1.3h | Cancellation reasons owned by SettingsContext | ⬜ | |
| 1.3i | Socket connection status owned by SocketContext | ⬜ | |
| 1.3j | No context cross-writes — each context mutated only through own setters | ⬜ | |
| 1.4 | **API Interaction Patterns** | ⬜ | |
| 1.4a | Login → POST JSON to `/auth/vendoremployee/login` | ⬜ | |
| 1.4b | Profile → GET `/vendor-profile/profile` (v2) | ⬜ | |
| 1.4c | Place Order → POST multipart/form-data (FormData.append('data', JSON.stringify)) | ⬜ | |
| 1.4d | Update Order → PUT JSON body | ⬜ | |
| 1.4e | Content-Type asymmetry between Place (multipart) and Update (JSON) is intentional | ⬜ | |
| 1.4f | Single Order fetch → POST JSON to `/get-single-order-new` (v2) | ⬜ | |
| 1.5 | **Engaged Lock Mechanism — Complete Behavior** | ⬜ | |
| 1.5a | 4 LOCK sources: handleNewOrder, handleUpdateTable 'engage', handleUpdateTable 'free' (BUG-216), OrderEntry collectBill | ⬜ | |
| 1.5b | 3 UNLOCK sources: all via double requestAnimationFrame after GET enrich | ⬜ | |
| 1.5c | Block check in DashboardPage.handleTableClick via isTableEngaged() | ⬜ | |
| 1.5d | Timeout: waitForTableEngaged resolves false after 5000ms | ⬜ | |
| 1.5e | GAP: handleUpdateFoodStatus, handleScanNewOrder, handleDeliveryAssignOrder do NOT interact with engaged lock | ⬜ | |
| 1.6 | **Authentication — Complete** | ⬜ | |
| 1.6a | Token in localStorage['auth_token'] | ⬜ | |
| 1.6b | Injected as `Authorization: Bearer ${token}` via axios interceptor | ⬜ | |
| 1.6c | 401 → clear token → redirect to `/` | ⬜ | |
| 1.6d | ProtectedRoute checks `!!token` synchronously | ⬜ | |
| 1.6e | No refresh token, no token expiry check, no silent renewal | ⬜ | |
| 1.7 | **Printing — Confirmed NOT in Frontend** | ⬜ | |
| 1.7a | `print_kot` is a flag sent in payloads, not actual print logic | ⬜ | |
| 1.7b | `kotPrinted`, `billPrinted` are read-only booleans from API | ⬜ | |
| 1.7c | No `window.print()`, no PDF generation, no receipt template in codebase | ⬜ | |

---

## Section 2: Requires Runtime Validation

| # | Item | Status | Notes |
|---|------|--------|-------|
| RV-1 | **Backend recalculates financial totals or trusts frontend?** | ⬜ | Needs test: send wrong `order_amount`, check API response |
| RV-2 | **waitForTableEngaged timeout behavior** | ⬜ | Needs test: slow network, does table get stuck? |
| RV-3 | **new-order socket payload — full financial fields?** | ⬜ | Needs test: inspect socket payload for completeness |
| RV-4 | **Multiple running orders per same table_id?** | ⬜ | Needs test: group running orders by table_id |
| RV-5 | **order_in field reliable for room detection?** | ⬜ | Needs test: check order_in values across orders |

---

## Section 3: Requires Backend Confirmation

| # | Item | Status | Notes |
|---|------|--------|-------|
| BC-1 | **Socket Server Authentication** — no auth token in socket handshake | ⬜ | Security risk if unauthenticated |
| BC-2 | **update-table free** — backend sends `free` for cancel-item (BUG-216 workaround active) | ⬜ | |
| BC-3 | **order-bill-payment** — is this the canonical collect-bill endpoint? | ⬜ | Dead code references CLEAR_BILL |
| BC-4 | **Hold Orders Endpoint Bug** — `paid-paylater-order-list` returns same data as `paid-order-list` | ⬜ | |
| BC-5 | **f_order_status = 4** — what does status code 4 mean? | ⬜ | Gap in 1-9 status map |
| BC-6 | **cancel_type Derivation** — preparing → Pre-Serve, else → Post-Serve correct? | ⬜ | |
| BC-7 | **collectBillExisting Schema** — sends `total_gst_tax_amount` (absent in other payloads) | ⬜ | |

---

## Section 4: Provisional Operating Rules

| # | Item | Status | Notes |
|---|------|--------|-------|
| RULE-1 | **Financial Source of Truth** — assume backend TRUSTS frontend values (until RV-1) | ⬜ | |
| RULE-1a | **CollectPaymentPanel Problem** — recalculates locally, ignores orderFinancials from API | ⬜ | |
| RULE-2 | **Socket vs API Conflict** — GET API response is ALWAYS final authority | ⬜ | |
| RULE-3 | **Table Engage/Release** — maintain BUG-216 workaround: treat `free` as `engage` | ⬜ | |
| RULE-4 | **Socket Subscription Scope** — events lost during `/reports/*` navigation | ⬜ | |
| RULE-5 | **Order Payload Content-Type** — multipart for Place/Place+Pay, JSON for all others | ⬜ | |
| RULE-6 | **Addon/Variation Price** — `buildCartItem()` is canonical calculator for API payloads | ⬜ | |

---

## Section 5: Critical Contradictions

| # | Item | Status | Notes |
|---|------|--------|-------|
| CONTRA-1 | **Three Divergent Tax Calculations** — buildCartItem vs OrderEntry vs CollectPaymentPanel | ⬜ | Concrete example: item 100 + addon 20×2, qty 3, 5% tax → different results |
| CONTRA-2 | **CollectPaymentPanel Sends Local Totals, Not API Totals** — orderFinancials prop unused for bill calc | ⬜ | Financial discrepancy path |
| CONTRA-3 | **orderItemsByTableId (last-write) vs getOrderByTableId (first-match)** — opposite strategies | ⬜ | Diverges if multiple orders per table exist |
| CONTRA-4 | **Round-Off Sign Convention** — calcOrderTotals always ≥ 0 vs CollectPaymentPanel can be negative | ⬜ | Low impact: round_up hardcoded to 0 in collectBillExisting |
| CONTRA-5 | **update-food-status Has No Engage Lock** — no lock/unlock, can leave table stuck | ⬜ | Asymmetry depending on socket event order |

---

## Section 6: System Invariants

| # | Item | Status | Notes |
|---|------|--------|-------|
| INV-1a | Orders identified by `orderId` (numeric, globally unique) | ⬜ | |
| INV-1b | Order exists from addOrder() until removeOrder() — no TTL, no expiry | ⬜ | |
| INV-1c | ONLY removeOrder() removes orders, ONLY called from handleUpdateOrderStatus | ⬜ | |
| INV-1d | Order's `tableId` immutable after creation from API response | ⬜ | |
| INV-1e | Walk-in orders: `tableId === 0` or `isWalkIn === true` | ⬜ | |
| INV-2a | REST API sole authority for order data; sockets are triggers not sources | ⬜ | |
| INV-2b | Table data: API at load, then derived from socket events (update-table + syncTableStatus) | ⬜ | |
| INV-2c | updateTableStatus never creates tables — only modifies existing | ⬜ | |
| INV-3a | Order removal and table status clearing are separate operations (no transaction) | ⬜ | |
| INV-3b | removeOrder normalizes orderId to Number before filtering | ⬜ | |
| INV-3c | Removal of non-existent orderId is safe (no-op) | ⬜ | |
| INV-4a | Context state never directly mutated — all via setter functions | ⬜ | |
| INV-4b | Each context independent — no context reads another's internal state | ⬜ | |
| INV-4c | ordersRef / engagedTablesRef exist ONLY for synchronous polling, NOT a second source of truth | ⬜ | |
| INV-5a | Dashboard is eventually-consistent derived view, NOT transactionally consistent | ⬜ | |
| INV-5b | Dashboard re-derives on EVERY change to its dependencies | ⬜ | |
| INV-5c | Dashboard uses getOrderByTableId (first-match) for grid BUT orderItemsByTableId (last-match) for OrderEntry | ⬜ | |

---

## Section 7: Clarified Definitions

| # | Item | Status | Notes |
|---|------|--------|-------|
| DEF-1 | **"Engaged"** — frontend-only per-table UI lock in Set<tableId>, NOT a backend state | ⬜ | |
| DEF-1a | Engaged only prevents dashboard click-through, NOT API calls or socket updates | ⬜ | |
| DEF-1b | Double requestAnimationFrame pattern for safe unlock after paint | ⬜ | |
| DEF-2 | **"Source of Truth" for Financials** — NO single source; pipeline of 3 stages (Preview → Submission → API Echo) | ⬜ | |
| DEF-2a | Stage 2 has TWO independent calculators (buildCartItem vs CollectPaymentPanel) | ⬜ | |
| DEF-3 | **"Socket Event" vs "API Enrichment"** — two distinct phases of update cycle | ⬜ | |
| DEF-3a | Socket = minimal trigger (near-instant, LOW trust) | ⬜ | |
| DEF-3b | API Enrichment = full GET (200-1000ms, HIGH trust, 1 retry) | ⬜ | |
| DEF-3c | Gap between socket and API enrichment = "engaged" window | ⬜ | |

---

## Section 8: Refined Financial Rule

| # | Item | Status | Notes |
|---|------|--------|-------|
| 8.1 | **Pipeline A (Order Placement)**: buildCartItem → calcOrderTotals → API | ⬜ | |
| 8.1a | Pipeline A: base + addons + variations, per-item tax, order-level rounding | ⬜ | |
| 8.2 | **Pipeline B (Collect Bill)**: getItemLinePrice → taxTotals → handlePayment → API | ⬜ | |
| 8.2a | Pipeline B: separate code path, NO shared code with Pipeline A | ⬜ | |
| 8.3 | **Divergence Table** — addon model, variation model, tax scope, discount support, round-off, GST field names all differ | ⬜ | |
| RULE-8a | Never assume Pipeline A and B produce same result | ⬜ | |
| RULE-8b | When modifying financial logic, identify which pipeline | ⬜ | |
| RULE-8c | After financial change, test all 3 scenarios independently | ⬜ | |
| RULE-8d | Until CONTRA-2 resolved, compare payment_amount vs order_amount vs API amount | ⬜ | |
| RULE-8e | orderFinancials (API echo) should be DISPLAY truth; recommended future direction for CollectPaymentPanel | ⬜ | |

---

## Summary

| Section | Total Items | ✅ Passed | ⚠️ Partial | ❌ Wrong | 🔍 Runtime | ⬜ Pending |
|---------|------------|-----------|------------|---------|-----------|-----------|
| 1. Confirmed Architecture | 42 | | | | | 42 |
| 2. Runtime Validation | 5 | | | | | 5 |
| 3. Backend Confirmation | 7 | | | | | 7 |
| 4. Operating Rules | 7 | | | | | 7 |
| 5. Contradictions | 5 | | | | | 5 |
| 6. System Invariants | 17 | | | | | 17 |
| 7. Definitions | 9 | | | | | 9 |
| 8. Financial Rules | 10 | | | | | 10 |
| **TOTAL** | **102** | | | | | **102** |

