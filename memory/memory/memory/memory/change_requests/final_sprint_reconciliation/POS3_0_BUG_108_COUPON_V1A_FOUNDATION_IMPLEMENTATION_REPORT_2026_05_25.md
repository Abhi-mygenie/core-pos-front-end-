# POS 3.0 BUG-108 — Coupon V1A Foundation Implementation Report

**Date:** 2026-05-25
**Persona:** Senior POS3.0 BUG-108 Coupon V1A Implementation Continuation Agent
**Status:** `bug_108_coupon_v1a_foundation_implemented_build_passing_ready_for_v1b`
**Phase:** V1A (safe foundation only — no UI, no commit-flow edits, no kill-switch flip)

---

## 1. Scope

V1A implements **only the read-only foundation pieces** from the saved V1 plan:
- `POS3_0_BUG_108_COUPON_PHASE_V1_IMPLEMENTATION_PLAN_2026_05_25.md` (§2.1 partial, §2.2, §2.3)

V1B (UI integration, `orderTransform.js` edits including the Flow 3 key-mismatch fix, kill-switch flip) is **deferred** to the next implementation pass per the continuation-agent rules.

---

## 2. Files Changed

| # | File | Action | Lines | Source plan ref |
|---|------|--------|-------|-----------------|
| 1 | `frontend/src/api/constants.js` | **Modified** | +5 lines under `API_ENDPOINTS` | §2.1 |
| 2 | `frontend/src/api/services/couponService.js` | **Created** (new) | ~95 lines | §2.2 |
| 3 | `frontend/src/api/transforms/couponTransform.js` | **Created** (new) | ~150 lines | §2.3 |

Verified via `git status` — exactly three intentional changes; no other files modified.
`yarn.lock` change is from the prior deployment task (pre-existing in this working tree), unrelated to V1A.

### 2.1 `constants.js` diff
```diff
   MAX_REDEEMABLE:    '/pos/max-redeemable',
+  // BUG-108 V1A Coupon CRM (CR-001C-C, 2026-05-25). Read-only, non-mutating.
+  // POS Frontend calls these directly via crmApi (X-API-Key). Gated by
+  // restaurantSettings.isCoupon + BUG108_FLAGS.couponLive at the caller site.
+  COUPONS_AVAILABLE: '/pos/coupons/available',                                // CRM: GET  /pos/coupons/available
+  COUPONS_VALIDATE:  '/pos/coupons/validate',                                 // CRM: POST /pos/coupons/validate
   PLACE_ORDER:       '/api/v2/vendoremployee/order/place-order',
```

Note: V1 plan §2.1 sample code referenced `CRM_ENDPOINTS`; actual codebase exports `API_ENDPOINTS` (single CRM+POS-BE map). Constants were added to the existing `API_ENDPOINTS` block per the project convention used by `loyaltyService.js`. No naming export change.

### 2.2 `couponService.js` (new)
- Uses `crmApi` default export (X-API-Key via existing `crmAxios` interceptor).
- Imports `API_ENDPOINTS` from `../constants` and `{ toAPI, fromAPI }` from `../transforms/couponTransform`.
- Two exported functions:
  - `getAvailableCoupons({ customerId, orderTotal, channel })` → GET `/pos/coupons/available`
  - `validateCoupon({ code, customerId, orderTotal, channel, loyaltyPointsUsed })` → POST `/pos/coupons/validate`
- Network-error catch returns `{ valid: false, error: { code: 'NETWORK', detail } }` / `{ coupons: [], error: { code: 'NETWORK', detail } }`.
- Side-effect free: no caller invokes these yet (V1A).

### 2.3 `couponTransform.js` (new)
- `fromAPI.availableCoupons(apiData)` — envelope-checked; maps `expected_discount`, `time_window.*`, `stackable_with_loyalty`, `pos_instruction` etc. into POS-canonical camelCase.
- `fromAPI.validateCoupon(apiData)` — handles both success (`valid: true`) and validation-failure (`valid: false` with `error.code` + `pos_instruction` + `time_window_status`) branches per CRM contract.
- `toAPI.channel(orderType)` — strict snake_case mapping: `dineIn → dine_in`, `takeAway → takeaway`, `delivery → delivery`, else `'pos'` (Owner Q1 frozen).
- `toAPI.availableRequest({ customerId, orderTotal, channel })` — GET param builder.
- `toAPI.validateRequest({ code, customerId, orderTotal, channel, loyaltyPointsUsed })` — POST body builder. Code is uppercased + trimmed. `items: null` (V1 scope = order-discount only). `order_time: new Date().toISOString()` (informational only).
- `toAPI.posCartItem(_cartLine)` — V1 stub returning `null` (V2 will implement the POSCartItem schema mapper).

---

## 3. V1A Items Implemented

| # | Item | Plan ref | Status |
|---|------|----------|--------|
| 1 | Coupon endpoint constants (`COUPONS_AVAILABLE`, `COUPONS_VALIDATE`) | §2.1 | ✅ |
| 2 | `couponService.js` — `getAvailableCoupons` + `validateCoupon` wrappers | §2.2 | ✅ |
| 3 | `couponTransform.js` — `fromAPI.availableCoupons` + `fromAPI.validateCoupon` | §2.3 | ✅ |
| 4 | `toAPI.channel(orderType)` strict snake_case mapper | §2.3 | ✅ |
| 5 | `toAPI.availableRequest({...})` — `/available` GET params builder | §2.3 (inline in service) + extracted as named function in transform | ✅ |
| 6 | `toAPI.validateRequest({...})` — `/validate` POST body builder | §2.3 | ✅ |
| 7 | `toAPI.posCartItem(_cartLine)` V2 stub returning `null` | §2.3 | ✅ |
| 8 | Basic structured error mapping in service catch (`{ code: 'NETWORK', detail }`) and in `fromAPI.validateCoupon` (`{ code, detail }` envelope) | §2.2 + §2.3 | ✅ |
| 9 | `BUG108_FLAGS.couponLive` left at existing value (`false`) — caller-side gating intact | §2.6 / V1B | ✅ untouched |

---

## 4. Items Intentionally NOT Implemented (Out of V1A Scope)

Per V1 plan §2.4 / §2.5 / §2.6 — all UI integration and commit-flow edits are V1B:

| Plan ref | Item | Deferred to |
|----------|------|-------------|
| E-1..E-7 | `CollectPaymentPanel.jsx` state additions (`availableCoupons`, `couponLoading`, `couponInstruction`, `showCouponDropdown`); replace `couponDiscount` math; wire real `handleApplyCoupon`; on-focus `useEffect` for `getAvailableCoupons`; 500ms debounced auto-apply; updated `paymentData.discounts` emit; `handlePrintBill` overrides | **V1B (UI integration)** |
| E-8 / E-9 | Full type-ahead dropdown UX + room-service inline-mirror parity | **V1B** |
| E-10 | New `data-testid` additions (`coupon-suggestions-dropdown`, `coupon-suggestion-{code}`, `coupon-pos-instruction-text`, `coupon-outside-window-hint`) | **V1B** |
| E-11 / E-12 | `orderTransform.js` Flow 1 (`placeOrder`) + Flow 2 (`updateOrder`) — add `coupon_code: ''` field | **V1B** |
| **E-13** | **`orderTransform.js` Flow 3 (`placeOrderWithPayment`) — CRITICAL key-mismatch fix (`discounts.coupon` → `discounts.couponDiscount`) + add `couponLive` gate** | **V1B** |
| E-14 | `orderTransform.js` Flow 3 — `coupon_title` / `coupon_code` / `coupon_type` updates | **V1B** |
| E-15 | `orderTransform.js` Flow 4 (`collectBillExisting`) — `coupon_title` / `coupon_code` / `coupon_type` updates | **V1B** |
| E-16 | `orderTransform.js` Flow 5 (`buildBillPrintPayload`) — add `coupon_discount` field to print payload (Owner Q5 = A) | **V1B** |
| E-17 | `BUG108_FLAGS.couponLive` flip to `true` after Step 3 QA + later constant removal at V1 closure | **V1 Step 3 / V1 closure** |
| E-18 | Remove `couponDisabledHelper: 'Coming soon'` copy + dependent render paths | **V1 closure** |
| §5 table | Error code → cashier-facing message table rendering | **V1B (UI layer)** |
| Owner Q3 | Cashier-cancel pre-confirm warning toast for coupon-applied orders | **V1B** |

### Explicitly excluded by user task directive
- Advanced V2/V3 UI
- BOGO/BXG/Nth rich UI
- QSR separate coupon UI
- Room/hotel coupon
- Coupon reversal / refund
- Deprecated `/api/pos/coupons/apply` endpoint
- Backend mapper changes
- Direct Frontend → CRM `/api/pos/orders` commit
- Wallet / Loyalty / reverse changes

---

## 5. Build Result

```
cd /app/frontend && CI=false yarn build
```

| Metric | Value |
|--------|-------|
| Exit code | `0` (success) |
| Result | **Compiled with warnings** |
| Duration | 25.34s |
| `main.<hash>.js` (gzipped) | 475.36 kB |
| `main.<hash>.css` (gzipped) | 16.76 kB |
| Errors | 0 |
| Warnings | 1 (pre-existing) |

### Pre-existing warning (unrelated to V1A)
```
src/components/order-entry/OrderEntry.jsx
  Line 1297:6:  React Hook useCallback has an unnecessary dependency: 'printOrder'.
                react-hooks/exhaustive-deps
```
This warning predates V1A (also observed during the 2026-05-25 deployment task on the same `25-may` branch). Not introduced by V1A.

---

## 6. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | `BUG108_FLAGS.couponLive` remains controlled by the existing flag (still `false` — untouched) | ✅ Confirmed |
| 2 | No backend code changed (`/app/backend` untouched) | ✅ Confirmed |
| 3 | No CRM code changed | ✅ Confirmed |
| 4 | No data mutated | ✅ Confirmed |
| 5 | No mutating API called (V1A is code-only; service functions are not invoked by any caller yet) | ✅ Confirmed |
| 6 | `/app/memory/final/` untouched | ✅ Confirmed |
| 7 | Baseline docs (ARCHITECTURE_DECISIONS_FINAL.md, CHANGE_REQUEST_PLAYBOOK.md, IMPLEMENTATION_AGENT_RULES.md, MODULE_DECISIONS_FINAL.md, BUSINESS_RULES_BASELINE_FINAL.md, FINAL_DOCS_*) untouched | ✅ Confirmed |
| 8 | Deprecated `/api/pos/coupons/apply` excluded from all V1A files | ✅ Confirmed |
| 9 | No user-facing coupon flow exposed/enabled in V1A (no caller invokes new service; `couponLive=false`; UI unchanged) | ✅ Confirmed |
| 10 | Files limited to V1 plan §2.1, §2.2, §2.3 (foundation only) | ✅ Confirmed |
| 11 | No QSR / room / hotel / wallet / reverse changes | ✅ Confirmed |
| 12 | No direct Frontend → CRM `/api/pos/orders` call introduced | ✅ Confirmed |

---

## 7. Verification Commands

```bash
# Files changed (V1A working tree)
cd /app && git status --short
#  M frontend/src/api/constants.js
#  ?? frontend/src/api/services/couponService.js
#  ?? frontend/src/api/transforms/couponTransform.js

# Build
cd /app/frontend && CI=false yarn build
# → exit 0, Compiled with warnings (1 pre-existing OrderEntry.jsx warning)

# Confirm BUG108_FLAGS untouched
grep -n "couponLive" /app/frontend/src/utils/BUG108_FLAGS.js
# → 10:   - couponLive       → `GET /pos/coupons/available` + `POST /pos/coupons/validate`
# → 35:   couponLive: false,
```

---

## 8. Next Phase (V1B — NOT executed in this run)

When the V1B continuation agent is invoked, it should pick up:
1. E-1..E-10 — `CollectPaymentPanel.jsx` state + type-ahead UI + room-service inline-mirror parity + testids
2. E-11..E-16 — `orderTransform.js` Flow 1/2/3/4/5 edits (including the **critical Flow 3 key-mismatch fix at L1148**)
3. Step 3 QA → flip `BUG108_FLAGS.couponLive = true`
4. V1 closure (separate task) — remove `couponLive` constant entirely + "Coming soon" copy paths

---

**End of BUG-108 Coupon V1A Foundation Implementation Report.**
