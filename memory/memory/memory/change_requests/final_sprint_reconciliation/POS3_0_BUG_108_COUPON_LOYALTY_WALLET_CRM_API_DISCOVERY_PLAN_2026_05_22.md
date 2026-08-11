# POS 3.0 BUG-108 — Coupon / Loyalty / Wallet CRM API Discovery Plan

**Date:** 2026-05-22
**Prepared by:** Senior POS3.0 BUG-108 CRM Planning Agent
**Scope:** **PLANNING / DISCOVERY ONLY** — no code changes, no API implementation, no data mutation.
**Audience:** Owner + Backend/CRM team (decision input before implementation phase is scoped)

---

## 1. Status

```
bug_108_coupon_loyalty_wallet_crm_api_discovery_plan_ready_for_owner_review
```

This document inventories the current state of Coupon, Loyalty, and Wallet behavior in the POS 3.0 frontend, maps every mock vs. live data source, lists the POS payload fields already wired for downstream consumption, and surfaces the **6 critical owner questions** that must be answered before any CRM integration work begins.

---

## 2. Source Files Inspected (Read-Only)

| # | File | Purpose for this analysis |
|---|------|---------------------------|
| 1 | `src/components/order-entry/CollectPaymentPanel.jsx` | Owns the Coupon input, Loyalty checkbox, Wallet checkbox + amount selector, and the discount math that feeds the payment payload |
| 2 | `src/components/order-entry/CartPanel.jsx` | Inline discount/coupon affordances (mirror of CollectPaymentPanel) |
| 3 | `src/components/order-entry/OrderEntry.jsx` | Hosts `restaurantSettings` flags (`isCoupon`, `isLoyalty`, `isCustomerWallet`) |
| 4 | `src/components/panels/settings/ViewEditViews.jsx` | Settings UI toggles for the three feature flags |
| 5 | `src/api/services/customerService.js` | All CRM customer reads (search / lookup / detail) |
| 6 | `src/api/crmAxios.js` | CRM axios instance (X-API-Key, single login-issued `crm_token`) |
| 7 | `src/api/transforms/customerTransform.js` | CRM → frontend customer schema (loyalty / wallet fields surfaced here) |
| 8 | `src/api/transforms/profileTransform.js` | Maps backend `is_coupon` / `is_loyality` / `is_customer_wallet` flags |
| 9 | `src/api/transforms/orderTransform.js` | POS order/bill payload builders — emits `coupon_discount`, `used_loyalty_point`, `use_wallet_balance`, etc. |
| 10 | `src/api/services/orderService.js` | Endpoint wiring for PLACE_ORDER / BILL_PAYMENT (consumers of the payload fields) |
| 11 | `src/api/constants.js` | Endpoint registry — confirms **no** coupon/loyalty/wallet CRM endpoints are exposed |

---

## 3. Feature-Flag Surface

The three features are independently gated by **real** profile flags coming from the POS backend (`/api/v1/vendoremployee/profile`):

| Backend field | Frontend flag (`restaurantSettings.*`) | UI section gated |
|---------------|----------------------------------------|------------------|
| `is_coupon` | `isCoupon` | Coupon input row in CollectPaymentPanel + CartPanel |
| `is_loyality` *(API spelling)* | `isLoyalty` | Loyalty checkbox row |
| `is_customer_wallet` | `isCustomerWallet` | Wallet checkbox + amount input |

Flags are persistable from the Settings panel (`ViewEditViews.jsx`) and round-trip through `profileTransform.js`. **These flags are LIVE.** Only the data + redemption mechanics below are mocked.

---

## 4. Mock vs. Live Inventory

### 4.1 Coupons — **FULLY MOCKED**

| Aspect | State | Evidence |
|--------|-------|----------|
| Coupon catalog | **Hardcoded** in payment panel | `CollectPaymentPanel.jsx:644-647` defines `generalCoupons = [{code:'FLAT50',…}, {code:'SAVE10',…}]` |
| Customer-specific coupons | **Schema-referenced but never populated** | `customer?.coupons` is read at `CollectPaymentPanel.jsx:649`, but `customerTransform.fromAPI.customerDetail` / `customerLookup` **do not** map any `coupons` field → array is always `undefined` (falls back to `[]`) |
| Validation | **Client-side only** | `handleApplyCoupon` at `CollectPaymentPanel.jsx:639-664` matches code locally; no API call |
| Min-order rule | Local | `foundCoupon.minOrder` checked client-side |
| Percent vs. flat math | Local | `selectedCoupon.type === 'percent' ? …  : …` at lines 506-511 |
| Max-discount cap | Local | `Math.min(…, selectedCoupon.maxDiscount || Infinity)` |
| Per-customer entitlement check | **Not implemented** | No API to confirm "is this customer allowed to use this code" |
| Single-use enforcement | **Not implemented** | A customer can re-apply the same code on every order |
| Code usage logging | **Not implemented** | POS does emit `coupon_title` / `coupon_code` in the order payload, but there is no CRM "redeem coupon" call |

**Bottom line:** Coupons today are a cosmetic discount affordance. No backend authority, no audit trail at the CRM, no entitlement checks.

### 4.2 Loyalty — **READ LIVE, REDEEM MOCK**

| Aspect | State | Evidence |
|--------|-------|----------|
| `customer.loyaltyPoints` | **Live (read)** | `customerTransform.fromAPI.customerDetail` / `searchResult` / `customerLookup` map `api.total_points` → `totalPoints` and `loyalty` blob from CRM `/pos/customers/{id}` |
| `customer.loyalty` blob | Live (read) | `customerDetail` includes `loyalty: api.loyalty || null` |
| Redemption ratio | **Hardcoded 1:1** | `loyaltyDiscount = Math.min(customer.loyaltyPoints, itemTotal - manualDiscount)` — assumes 1 point = ₹1 (`CollectPaymentPanel.jsx:502-504`) |
| Apply UX | Single checkbox "use all available points" | No partial redemption UI |
| Earn rate | **Not surfaced in POS** | Loyalty earning is presumably calculated CRM-side post-order |
| Redeem confirmation | **No CRM API call** | POS only emits `used_loyalty_point` in the order payload; whether POS backend forwards a debit to CRM is **unverified from the POS code path** |
| Rollback on order cancel | **Not implemented** | If a paid order is later cancelled or marked unpaid, no compensating CRM call exists from POS |

**Bottom line:** Loyalty *balance* is real; loyalty *redemption* is fire-and-forget through the order payload. No POS-side authority over whether CRM accepts the redemption.

### 4.3 Wallet — **READ LIVE, DEBIT MOCK**

| Aspect | State | Evidence |
|--------|-------|----------|
| `customer.walletBalance` | **Live (read)** | `customerTransform.fromAPI.searchResult` / `customerLookup` / `customerDetail` map `api.wallet_balance` |
| Apply UX | Checkbox + editable amount field, capped at balance | `CollectPaymentPanel.jsx:1054-1059` |
| Debit math | **Local** | `walletDiscount = Math.min(walletAmount, itemTotal - manualDiscount - loyaltyDiscount - couponDiscount)` |
| Wallet debit API call | **None from POS** | POS only emits `use_wallet_balance` in PLACE_ORDER / BILL_PAYMENT payload; no direct CRM `debit-wallet` endpoint is called |
| Wallet credit (refund) on cancel | **Not implemented** | No compensating CRM call |
| Top-up flow | **Not present in POS** | Out of POS 3.0 scope |
| Concurrent-edit / race protection | **None** | If two POS terminals collect from the same wallet at once, last-write-wins risk exists |

**Bottom line:** Wallet balance is real; debit is delegated to the POS backend via payload fields. Whether POS backend re-calls CRM to reconcile the debit is **not visible from the frontend** and must be confirmed by the backend team.

---

## 5. Current POS Payload Fields (Already Wired)

These fields are already emitted to the POS backend in PLACE_ORDER, BILL_PAYMENT, and print payloads. Any future CRM integration should **not** rename them without coordinated backend + frontend changes.

| Field (snake_case, backend) | Source | Emitted in |
|------------------------------|--------|------------|
| `coupon_discount` | `couponDiscount` (frontend) | PLACE_ORDER (`orderTransform.js:898, 1013, 1141, 1336`) |
| `coupon_title` | `selectedCoupon.code` | PLACE_ORDER, BILL_PAYMENT |
| `coupon_type` | `selectedCoupon.type` (`'percent'` \| `'flat'`) | PLACE_ORDER, BILL_PAYMENT |
| `coupon_code` | `selectedCoupon.code` | Transfer-to-room payload + print overrides (`orderTransform.js:1755`) |
| `used_loyalty_point` | `loyaltyDiscount` (₹, due to 1:1 ratio) | PLACE_ORDER, BILL_PAYMENT (`orderTransform.js:1347`) |
| `loyalty_dicount_amount` *(legacy misspelling preserved)* | `loyaltyDiscount` | Print overrides (`orderTransform.js:1756`) |
| `use_wallet_balance` | `walletDiscount` | PLACE_ORDER, BILL_PAYMENT (`orderTransform.js:1348`) |
| `wallet_used_amount` | `walletDiscount` | Print overrides (`orderTransform.js:1757`) |

**Critical observation:** there are **zero** discovery / validation / redemption calls — only post-hoc reporting fields embedded in the bill payload. Any CRM integration will need to add a **pre-payment validation step** and (likely) a **post-payment commit step** without breaking these existing field contracts.

---

## 6. CRM Endpoints Currently Exposed (For Reference)

From `api/constants.js` — the **only** CRM endpoints presently wired:

```
GET  /pos/customers?search=…          → customer search
POST /pos/customer-lookup             → phone-based lookup (returns wallet + points)
GET  /pos/customers/{id}              → full detail (loyalty blob, addresses)
POST /pos/customers                   → create
PUT  /pos/customers/{id}              → update
POST /pos/address-lookup              → address lookup
```

**Missing for BUG-108:**
- `GET /pos/coupons` (catalog)
- `POST /pos/coupons/validate` (apply-time check)
- `POST /pos/coupons/redeem` (commit on payment)
- `POST /pos/loyalty/validate` (confirm redeem-ability + ratio)
- `POST /pos/loyalty/redeem` (debit)
- `POST /pos/wallet/debit` (reserve / commit)
- `POST /pos/wallet/credit` (refund on cancel)
- `POST /pos/coupons/reverse` + `POST /pos/loyalty/reverse` + `POST /pos/wallet/reverse` (rollback hooks for cancelled / unpaid orders)

**None of these are assumed to exist** — the owner + CRM team must confirm what's already available, what's planned, and what naming conventions to use before any wiring work is scoped.

---

## 7. Six Critical Owner Questions

These must be answered before BUG-108 implementation can be safely scoped. Each question lists the consequence of each plausible answer so the owner can decide deliberately.

### Q1. Who owns the coupon master?

**Options:**
- **(a) POS backend** owns the coupon catalog; CRM only stores per-customer entitlement.
- **(b) CRM** owns both catalog + entitlement; POS just queries.
- **(c) Hybrid** — global codes in POS backend, customer-targeted codes in CRM.

**Why it matters:** Determines which service the frontend calls on the Coupon input (`handleApplyCoupon`) and where audit logs live.

**Recommended owner clarification:** Are coupon campaigns created/managed today in the CRM admin UI? If yes → (b) or (c). If POS settings panel is the source of truth → (a).

### Q2. Should coupon validation be apply-time only, or also pre-checkout?

**Options:**
- **(a) Apply-time only** — single validate call when user clicks "Apply" (current frontend UX).
- **(b) Apply-time + final-commit** — validate again at PLACE_ORDER / BILL_PAYMENT to defend against stale state across the (potentially minutes-long) edit window.
- **(c) Apply-time + commit + reversal** — full transactional lifecycle including rollback on cancel/unpaid.

**Why it matters:** (a) is cheapest but allows race conditions (coupon expires between apply and checkout, customer applies same code on two terminals). (c) is what real loyalty CRMs require.

**Recommended owner clarification:** What is the business cost of a coupon being double-redeemed or used after expiry? If low, (a) is OK. If material, (c) is mandatory.

### Q3. What is the canonical loyalty redemption ratio, and where does it live?

**Current state:** Frontend hardcodes **1 point = ₹1** (`CollectPaymentPanel.jsx:502-503`).

**Options:**
- **(a) Keep hardcoded 1:1** — never changes, no API needed.
- **(b) Per-restaurant from POS settings** — add field to profile API, multiply locally.
- **(c) Per-customer from CRM `/pos/customers/{id}`** — already returns a `loyalty` blob (currently unused); ratio could ride there.
- **(d) Dynamic per-tier** — Bronze 1:1, Silver 1:1.2, Gold 1:1.5, etc. (requires CRM-driven calculation).

**Why it matters:** Today, any change to the ratio is a code release. (c) and (d) require a contract for the `loyalty` blob's structure.

**Recommended owner clarification:** Does the CRM admin already support per-tier rates? If yes → align with (c)/(d). Otherwise (b) is the smallest reversible step.

### Q4. When does a wallet debit become real?

**Options:**
- **(a) At apply** — reserve immediately when user checks "Use Wallet"; user can lose money if they back out.
- **(b) At PLACE_ORDER** — debit on order creation; refund on cancel via a separate CRM call.
- **(c) At BILL_PAYMENT (payment success)** — debit only when bill is settled; safest but allows race conditions across terminals during the order edit window.
- **(d) Two-phase (reserve at apply, commit at payment, release on timeout/cancel)** — full reservation pattern.

**Why it matters:** This is the single biggest source of accounting drift between POS and CRM. The frontend today implies (b) or (c) (the amount is emitted in the order payload), but POS-backend → CRM behavior is **unverified**.

**Recommended owner clarification:** Has the backend team confirmed whether POS backend currently forwards `use_wallet_balance` to a CRM debit endpoint? If no, every "wallet payment" today is silent fiction.

### Q5. How are reversals handled?

**Triggers that should reverse a coupon / loyalty / wallet usage:**
1. Order cancellation (`CANCEL_ITEM` for the only/last item, or full-order cancel).
2. Mark-order-unpaid (`MAKE_ORDER_UNPAID`, CR-003).
3. Change-payment-method (CR-003) — if user switches from "Wallet + Cash" to "Cash only".

**Options:**
- **(a) No reversal** — once debited, always debited (accounting nightmare).
- **(b) Manual CRM admin reversal** — POS logs the cancel; CRM admin user fixes balances by hand.
- **(c) Automatic reverse-API calls** — POS calls `/pos/wallet/credit`, `/pos/loyalty/credit`, `/pos/coupons/reverse` on each reversal trigger.

**Why it matters:** Without (c), every cancelled wallet-paid order is a customer-service ticket waiting to happen.

**Recommended owner clarification:** What's the current frequency of cancels involving wallet/loyalty/coupon? If non-zero, (c) is required.

### Q6. Customer-specific coupon entitlements — separate endpoint, or part of customer lookup?

**Current state:** Frontend already reads `customer?.coupons` (`CollectPaymentPanel.jsx:649`), but the customer transform never populates it. The schema slot exists; the API contract doesn't.

**Options:**
- **(a) Inline in `/pos/customer-lookup` and `/pos/customers/{id}`** — small payload growth; one fewer roundtrip. Acceptable while customers have <10 active coupons each.
- **(b) Separate `/pos/customers/{id}/coupons` endpoint** — cleaner contract, supports pagination and time-bound filters; one extra call per checkout.
- **(c) Bulk `/pos/coupons/available?customer_id=…&order_total=…`** — server pre-filters by min-order and validity window; minimizes client logic.

**Why it matters:** Determines how the frontend's existing `customer.coupons` schema slot gets populated, and whether the coupon input UI can show "Suggested Coupons" chips above the input.

**Recommended owner clarification:** Is the typical customer expected to have 0-3 active coupons (any option works) or 10+ (push for (b) or (c))?

---

## 8. Risks / Constraints For Owner

1. **No multi-terminal locking today.** Wallet/loyalty are read at customer lookup and decremented locally. Two cashiers settling the same customer's bill simultaneously can overspend the wallet. Any CRM integration must add either optimistic locking (version field) or transactional reserve semantics.
2. **Coupon hardcoded catalog is in production code.** Removing `generalCoupons` (`CollectPaymentPanel.jsx:644-647`) will break any cashier muscle-memory for `FLAT50` / `SAVE10` unless the CRM seeded the same codes.
3. **Loyalty ratio change is silent.** Switching from 1:1 to 1:1.2 in code without communication will under-redeem points and surface as a customer complaint.
4. **Field-name lock-in.** The POS payload uses `loyalty_dicount_amount` (legacy misspelling) and `coupon_title`. Renaming requires coordinated backend release — out of scope for BUG-108 frontend work.
5. **Print parity.** Any redemption value displayed at apply-time must match the printed bill. Today the print uses overrides passed from CollectPaymentPanel — adding a CRM round-trip between apply and print must not introduce a divergence window.
6. **Settings UI is honored.** Coupon / Loyalty / Wallet sections are hidden when the respective flag is off — implementation must continue to honor this even after CRM wiring (don't call CRM endpoints when the flag is disabled).

---

## 9. Proposed Phased Approach (For Owner Sign-Off, Not For Implementation Yet)

| Phase | Scope | Pre-req |
|-------|-------|---------|
| **108-P0** | Owner decisions on Q1-Q6 above; CRM team confirms which endpoints exist / will be built | This document |
| **108-P1 (Read parity)** | Populate `customer.coupons` from CRM if (a)/(b)/(c) decided in Q6. Replace `generalCoupons` hardcode with CRM-served catalog. **No redemption changes yet** — frontend still applies discounts locally and emits existing payload fields. | P0 |
| **108-P2 (Validate)** | Add `validate` calls on Apply Coupon / Apply Loyalty (per Q2). Surface server messages in `couponError` slot. | P1 + endpoints |
| **108-P3 (Commit)** | Add `commit` calls at BILL_PAYMENT / PLACE_ORDER per Q4. Adopt two-phase pattern if Q4=d. | P2 |
| **108-P4 (Reverse)** | Wire reversal API calls into cancel-item / cancel-order / make-unpaid / change-payment paths per Q5. | P3 |
| **108-P5 (Polish)** | Suggested-coupons chips above input (Q6=c), per-tier loyalty ratio display (Q3=c/d), multi-terminal locking guardrails. | P4 |

Each phase is independently deployable and rollback-safe **as long as the existing POS payload fields (`coupon_discount`, `used_loyalty_point`, `use_wallet_balance`, etc.) keep flowing**. Removing those fields is **out of scope** for this entire bug.

---

## 10. What This Document Does NOT Do

- ❌ Does **not** modify any frontend code.
- ❌ Does **not** wire any new API call.
- ❌ Does **not** assume which CRM endpoints exist — every endpoint listed in §6 ("missing") is a **proposal**, not a contract.
- ❌ Does **not** mutate customer/wallet/loyalty data anywhere.
- ❌ Does **not** estimate implementation effort — that requires Q1-Q6 answers first.

---

## 11. Decision Asks From Owner

Please reply with answers (or "needs more info") for **Q1 through Q6 in §7**. Once received, the next agent can produce:
1. A scoped API contract document (per-endpoint request/response shapes).
2. A frontend implementation plan with phase-by-phase file diffs.
3. A QA checklist analogous to the BUG-104 Phase 2A QA Handoff.

Until owner answers are in, **no implementation work should begin on BUG-108.**

---

**End of BUG-108 CRM API Discovery Plan.**
