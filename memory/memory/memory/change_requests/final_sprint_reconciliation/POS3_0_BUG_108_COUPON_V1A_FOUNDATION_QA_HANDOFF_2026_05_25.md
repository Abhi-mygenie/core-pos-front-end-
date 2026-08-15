# POS 3.0 BUG-108 — Coupon V1A Foundation QA Handoff

**Date:** 2026-05-25
**Persona:** Senior POS3.0 BUG-108 Coupon V1A Implementation Continuation Agent
**Status:** `bug_108_coupon_v1a_foundation_qa_handoff_ready_for_review_no_user_facing_flow`
**Phase:** V1A foundation only (no UI exposure, no commit-flow edits, kill switch still `false`)

---

## 1. What Was Built

Three pieces, all read-only / foundation-layer. **Zero user-visible behavior change.**

| # | Artifact | Purpose |
|---|----------|---------|
| 1 | `src/api/constants.js` (+5 lines under `API_ENDPOINTS`) | Two new constants — `COUPONS_AVAILABLE: '/pos/coupons/available'`, `COUPONS_VALIDATE: '/pos/coupons/validate'`. |
| 2 | `src/api/services/couponService.js` (new file) | `getAvailableCoupons({...})`, `validateCoupon({...})` wrappers over `crmApi`. |
| 3 | `src/api/transforms/couponTransform.js` (new file) | `fromAPI.{availableCoupons,validateCoupon}` + `toAPI.{channel,availableRequest,validateRequest,posCartItem(V1 stub)}`. |

Build: ✅ `yarn build` exit 0 (1 pre-existing unrelated ESLint warning).

---

## 2. QA Scope — What to Verify (V1A)

V1A is a **non-functional-impact** change set. The QA goal here is **regression protection only**, not feature verification (feature verification is V1B's job).

### 2.1 Regression — verify nothing broke

| Test | Expected |
|------|----------|
| App loads (`/login`, `/orders`, `/order-entry`) | Unchanged from pre-V1A baseline |
| Existing CollectPaymentPanel coupon section | Still shows "Coming soon" helper (because `BUG108_FLAGS.couponLive=false` — unchanged) |
| Existing loyalty flows | Unchanged (`LOYALTY_REDEEM`, `MAX_REDEEMABLE` constants unmoved) |
| Existing order flows (Flow 1/2/3/4 placeOrder, updateOrder, placeOrderWithPayment, collectBillExisting) | Network payloads bit-identical to pre-V1A — no coupon fields newly populated, all existing fields stable |
| Print bill | No new `coupon_discount` field in payload (still V1B) |
| Existing data-testids | All present, none removed/renamed |
| Bundle size | `main.05b4f8ab.js` gzipped 475.36 kB (≤1 kB delta from baseline expected — only ~2.5 kB raw source added) |

### 2.2 Module-level — verify the foundation compiles & imports cleanly

| Test | How | Expected |
|------|-----|----------|
| `couponService` imports resolve | `node -e "require('./build/static/js/main.*.js')"` OR inspect `build/static/js/main.*.js` for absence of `couponService` (tree-shaken since unused) | Build passes; tree-shaking removes the new modules from prod bundle since nothing imports them |
| `couponTransform.toAPI.channel` mapping | Unit-test stub (optional, not blocking) | `dineIn`→`dine_in`, `takeAway`→`takeaway`, `delivery`→`delivery`, `''` or `undefined`→`'pos'` |
| `couponTransform.toAPI.validateRequest` body shape | Unit-test stub (optional) | `{ code:'SUMMER20'(uppercase+trimmed), customer_id:'<cid>', order_total:<float>, channel:<str>, loyalty_points_used:<int>, items: null, order_time:<ISO string> }` |
| `couponTransform.fromAPI.validateCoupon` failure branch | Unit-test stub (optional) | `{ valid:false, error:{code,detail}, posInstruction, timeWindowStatus }` |

### 2.3 Negative — verify V1A did **NOT** flip the user-facing flow

| Negative test | Expected |
|---------------|----------|
| Apply a coupon code in CollectPaymentPanel | Should still be a no-op (E-3 not done; `couponLive=false`) |
| Network tab during `/order-bill-payment` after typing a coupon code | `coupon_discount: 0`, `coupon_title: ''`, `coupon_type: ''` — unchanged from pre-V1A |
| Network tab — any `/pos/coupons/available` or `/pos/coupons/validate` call | **Should NOT see any traffic** — no caller invokes the new service yet |
| Type-ahead dropdown / coupon suggestions | Should NOT appear (V1B feature) |
| Outside-window coupon greying | Should NOT appear (V1B feature) |
| `BUG108_FLAGS.couponLive` runtime value | Still `false` |

### 2.4 Owner / data-mutation safety

| Check | Expected |
|-------|----------|
| MongoDB / CRM database state | Unchanged — no migrations, no scripts run |
| CRM `/api/pos/orders` commit-side `coupon_usage` rows | Unchanged — no new commits made by V1A |
| Loyalty redemption rows | Unchanged |
| Wallet balance | Unchanged |

---

## 3. Out of Scope for V1A QA

The following are **deferred to V1B QA** (see V1 plan §7):
- Type-ahead UX tests (T-1..T-8)
- Time-window UX tests (T-9..T-11)
- Loyalty stacking tests (T-12..T-13)
- Payload + CRM verification tests (T-14..T-19)
- Field-name verification (T-20..T-22)
- Flow 3 key-mismatch fix verification (E-13)
- Print payload `coupon_discount` verification (E-16)

DO NOT run any of these against V1A — they will all fail because the UI and `orderTransform.js` edits haven't landed yet.

---

## 4. Verification Commands

```bash
# Confirm V1A files only
cd /app && git status --short | grep -E "constants\.js|coupon(Service|Transform)"
# Expected exact output (modulo ordering):
#   M frontend/src/api/constants.js
#   ?? frontend/src/api/services/couponService.js
#   ?? frontend/src/api/transforms/couponTransform.js

# Confirm BUG108_FLAGS.couponLive untouched
grep -n "couponLive:" /app/frontend/src/utils/BUG108_FLAGS.js
# Expected:  35:   couponLive: false,

# Confirm no caller imports couponService (V1A safety property)
grep -rn "from .*services/couponService\|require.*services/couponService" /app/frontend/src --include="*.js" --include="*.jsx"
# Expected: zero matches outside couponService.js itself
# (couponService.js imports couponTransform — that's allowed; what we're checking is
#  that no UI component / view imports couponService yet.)

# Confirm no caller imports couponTransform
grep -rn "from .*transforms/couponTransform\|require.*transforms/couponTransform" /app/frontend/src --include="*.js" --include="*.jsx"
# Expected: exactly 1 match — inside couponService.js — and zero matches elsewhere.

# Build
cd /app/frontend && CI=false yarn build
# Expected: Compiled with warnings (1 pre-existing unrelated). Exit 0.

# Confirm orderTransform.js Flow 3 latent key-mismatch is STILL present (V1B job to fix)
grep -n "discounts.coupon \\|\\| 0\\|discounts\\.couponDiscount" /app/frontend/src/api/transforms/orderTransform.js | head -10
# V1A should NOT have touched this line — V1B fix pending.
```

---

## 5. Sign-Off Criteria for V1A

QA may sign off V1A when ALL of the following are true:

- [ ] Production build (`yarn build`) succeeds with exit 0
- [ ] Bundle size delta vs pre-V1A baseline is ≤ 1 kB (gzipped main) — confirms tree-shaking of unused modules
- [ ] `BUG108_FLAGS.couponLive` is still `false` (grep confirmation)
- [ ] No UI component imports `couponService` or `couponTransform` (grep confirmation)
- [ ] All existing flows (Loyalty, Wallet, Discount, Tip, Split, TAB, transferToRoom, room balance, QSR Full View, Hold-Tab Collect Bill, Print Bill) behave identically to pre-V1A
- [ ] No new `/pos/coupons/*` network traffic observed during any user action
- [ ] All existing `data-testid` attributes still present
- [ ] CRM database unchanged
- [ ] POS Backend database unchanged

**Owner smoke is NOT required for V1A** — V1A introduces zero user-visible behavior. Owner smoke is scheduled at V1B Step 3 (flag-flip gate) per V1 plan §4.

---

## 6. Known Issues / Open Items

| # | Item | Owner | Severity | Resolution |
|---|------|-------|----------|------------|
| K-1 | Pre-existing ESLint warning at `OrderEntry.jsx:1297` (`useCallback`/`printOrder`) | Frontend | LOW | Carry forward — unrelated to BUG-108; existed before V1A |
| K-2 | V1 plan §2.1 sample code referenced `CRM_ENDPOINTS`, actual code uses `API_ENDPOINTS` | — | INFO | Resolved — constants added inside existing `API_ENDPOINTS` (same export name as `loyaltyService.js` uses) |
| K-3 | `toAPI.posCartItem` is a V1 stub returning `null` | Frontend (V2) | INFO | Documented in code header; V2 implements full schema |
| K-4 | Flow 3 (`placeOrderWithPayment`) key-mismatch latent bug (`discounts.coupon` vs `discounts.couponDiscount`) | Frontend (V1B) | HIGH (latent, currently masked by `couponLive=false`) | V1B E-13 will fix in same PR as kill-switch flip |
| K-5 | `BUG108_FLAGS.couponLive` flag flip + later removal | Frontend (V1B / V1 closure) | INFO | V1 plan Step 3 + Step 4 |

---

## 7. Continuation Agent Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | `/app/memory/final/` untouched | ✅ |
| 2 | Baseline docs (`ARCHITECTURE_DECISIONS_FINAL`, `CHANGE_REQUEST_PLAYBOOK`, `IMPLEMENTATION_AGENT_RULES`, `MODULE_DECISIONS_FINAL`, `BUSINESS_RULES_BASELINE_FINAL`, `FINAL_DOCS_*`, `OPEN_QUESTIONS_FINAL_RESOLUTION`) untouched | ✅ |
| 3 | Sprint reconciliation doc (`POS3_0_COMPLETE_SPRINT_STATUS_RECONCILIATION_*`) untouched | ✅ |
| 4 | Contract Freeze v1 (`POS3_0_BUG_108_COUPON_CRM_CONTRACT_FREEZE_V1_2026_05_25.md`) untouched | ✅ |
| 5 | Frontend Payload Mapping Discovery doc untouched | ✅ |
| 6 | V1 Implementation Plan doc untouched | ✅ |
| 7 | PRD.md untouched | ✅ |
| 8 | No backend / CRM / database mutation | ✅ |
| 9 | No mutating API called | ✅ |
| 10 | No code outside V1 plan §2.1 + §2.2 + §2.3 changed | ✅ |
| 11 | `BUG108_FLAGS.couponLive` left at existing value (`false`) | ✅ |
| 12 | No user-facing coupon flow exposed | ✅ |

---

**End of BUG-108 Coupon V1A Foundation QA Handoff.**
