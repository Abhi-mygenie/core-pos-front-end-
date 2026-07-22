# POS 3.0 BUG-108 — Coupon CRM Contract Review: Gaps & Questions

**Date:** 2026-05-25
**Persona:** Senior POS3.0 BUG-108 Coupon CRM Contract Review Agent
**Mode:** Contract review only — no code changes, no API calls, no data mutation.
**Inputs:**
- POS discovery: `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_COUPON_CRM_INTEGRATION_DISCOVERY_REPORT_2026_05_25.md`
- CRM contract: `/app/memory/crm/crm_1_0/handoff/CR_001C_C_COUPON_POS_API_HANDOFF_SUMMARY.md` (saved 2026-05-25 from artifact)

---

## 1. Status

```
bug_108_coupon_crm_contract_review_complete_questions_ready_for_crm
```

CRM contract `CR-001C-C` is delivered (V1 + V2 + V3-A/B/C, backend 211/211 QA pass). POS coupon shell exists but is kill-switched (`couponLive=false`) and was scoped for the original V1 owner-decision matrix only (flat/percentage order-level coupons). The new contract introduces **item / category / BOGO / BXG / every-Nth / happy-hour** scopes that POS has **no UI, payload, or schema** for today. Several **contract questions** must be resolved with CRM before a freeze, and several **owner questions** must be answered before scoping the implementation phases.

---

## 2. CRM Contract Summary

### 2.1 Endpoints (live)
| # | Method | Path | Purpose | Mutating? |
|---|---|---|---|---|
| 1 | `GET` | `/api/pos/coupons/available?customer_id=…&order_total=…&channel=…` | Discovery — list eligible coupons | No |
| 2 | `POST` | `/api/pos/coupons/validate` | Validate + compute discount; supports `items[]` for V2/V3 | **No** (read-only, idempotent any number of times) |
| 3 | `POST` | `/api/pos/orders` | Final order webhook — **side-effect** commit of coupon usage when `coupon_code` + `coupon_discount > 0` both present | Yes (side-effect only — not coupon-specific) |
| ~~4~~ | ~~POST~~ | ~~`/api/pos/coupons/apply`~~ | **DEPRECATED** — POS must NOT use |

### 2.2 Auth
- `verify_pos_auth` accepts **`X-API-Key`** (primary for POS) or `Authorization: Bearer` (JWT fallback). Resolves to restaurant owner `user`; scopes all coupon queries.
- API-key obtained via `GET /api/pos/api-key` (JWT auth) and regenerated via `POST /api/pos/api-key/regenerate`.

### 2.3 Architectural pattern
- **No direct POS-Frontend → CRM `POST /api/pos/orders` call.** CRM expects this from the POS Backend / order webhook bridge (same architectural pattern as Loyalty Phase C: "POS Backend forwards to CRM, POS Frontend never calls a mutating CRM endpoint directly").
- POS Frontend will call only `/api/pos/coupons/available` (GET) and `/api/pos/coupons/validate` (POST) — both **read-only**.
- Final commit of `coupon_usage` happens **only** when `coupon_code` + `coupon_discount > 0` reach CRM via `POST /api/pos/orders` (sent by POS Backend).
- **Idempotency** on `(user_id, order_id)` — POS Backend retries are safe; `idempotent_replay: true` flag returned.
- **One coupon per order** — stacking multiple coupons is not supported.

### 2.4 Coupon types supported by CRM
| `offer_type` | `discount_scope` | Cart items required? |
|---|---|---|
| `simple` | `order` | No |
| `simple` | `item` | **Yes** |
| `simple` | `category` | **Yes** |
| `bogo` | (V3-B) | **Yes** |
| `bxg` | (V3-B) | **Yes** |
| `nth_item` | (V3-C) | **Yes** |

### 2.5 Coupon payload fields on `POST /api/pos/orders` (CRM-accepted)
| Field | Required | Aliases CRM accepts |
|---|---|---|
| `coupon_code` | Yes | `couponCode`, `coupon` |
| `coupon_discount` (float, > 0 to commit) | Yes | `couponDiscount`, `coupon_amount`, `coupon_discount_amount` |
| `coupon_title` | No (informational) | `couponTitle`, `coupon_name` |
| `coupon_type` | No (informational) | `couponType` |
| `items[]` (OrderItem schema) | Strongly recommended; **required** for V2/V3 revalidation | — |

### 2.6 POSCartItem schema (`/validate` items[])
`food_id`, `item_id`, `category_id`, `category_name`, `item_category`, `name`, `quantity`, `unit_price`, `line_total` — aliases accepted (`foodId`, `qty`, `price`, etc.).

### 2.7 OrderItem schema (`/api/pos/orders` items[])
Different schema than POSCartItem. CRM maps internally:
- `pos_food_id` → `food_id` + `item_id`
- `item_category` → category
- `item_name` → name
- `item_qty` → quantity
- `item_price` → unit_price

### 2.8 Error contract
27 structured codes (V1: 9, V2: 5, V3-A: 1, V3-B: 7, V3-C: 5). POS must parse `data.error.code`, NOT string-match `data.message`. `pos_instruction` returned **only on failure** for cashier hints (e.g., "Add 1 more coffee to qualify").

### 2.9 Time-window
Server clock is authoritative. POS `order_time` is informational/echoed only. `time_window.within_window_now` + `time_window.next_window_start` returned on `/available` for outside-window coupons (POS greys them out).

### 2.10 Discount source of truth
**POS-sent `coupon_discount` is the source of truth for billing.** CRM independently recomputes and records both values; if variance > `max(₹1, 1% × CRM-computed)`, `coupon_usage.discount_mismatch: true` is flagged (audit only — does not block).

### 2.11 Variance / failure behavior
- Order **always persists** (HTTP 200) even if CRM revalidation fails at final commit. `coupon_usage.recorded: false` is returned in the response.
- `coupons.total_used` NOT incremented on failure or replay.

### 2.12 Items lines ignored by coupon engine
- `unit_price < 0` (e.g., discount lines) silently dropped.
- Non-dict items skipped.

### 2.13 Loyalty stacking
`stackable_with_loyalty: false` + `loyalty_points_used > 0` → `STACKING_NOT_ALLOWED` error from `/validate`.

---

## 3. POS Current-State Summary

(From the 2026-05-25 discovery report — abbreviated.)

| Aspect | Current state |
|---|---|
| Feature flag | `BUG108_FLAGS.couponLive = false` (kill switch) |
| Profile flag | `restaurantSettings.isCoupon` (from `is_coupon` backend field) |
| UI in `CollectPaymentPanel.jsx` | Coupon input + Apply button (disabled, "Coming soon") at main panel + inline-mirror |
| UI in `QsrBillingSection` (CartPanel) | **None** — QSR has no coupon UI |
| Coupon math | `couponDiscount` always `0` because `couponLive=false`. Legacy `generalCoupons` mock catalog removed. |
| Apply handler | `handleApplyCoupon` early-returns when `couponLive=false`. No CRM call. |
| `customer.coupons` schema slot | Referenced but never populated by `customerTransform.js` |
| Flow 1 (`placeOrder`) coupon fields | Hardcoded `coupon_discount: 0, coupon_title: null, coupon_type: null` |
| Flow 2 (`updateOrder`) coupon fields | Hardcoded `coupon_discount: 0, coupon_title: null, coupon_type: null` |
| Flow 3 (`placeOrderWithPayment` / prepaid) | Reads `discounts.coupon` (key mismatch — panel emits `couponDiscount`); **NOT `couponLive`-gated**; effectively always 0 |
| Flow 4 (`collectBillExisting`) | Force-zeroed via `couponLive` gate at `orderTransform.js` L1355–L1357 |
| Flow 5 (`buildBillPrintPayload`) | Emits `coupon_code` only (force-empty when `couponLive=false`); no `coupon_discount` value field |
| Flow 6 (`transferToRoom`) | No coupon fields at all |
| Flow 7 (QSR fresh place+pay) | Caller hardcodes `couponDiscount: 0, couponTitle: '', couponType: ''` |
| CRM endpoint constants | **No coupon endpoints** in `api/constants.js` (only loyalty + customer + max-redeemable) |
| CRM service functions | **No coupon functions** in `api/services/customerService.js` or `loyaltyService.js` |
| `crmAxios` config | `baseURL = REACT_APP_CRM_BASE_URL`, currently `https://insights-phase.preview.emergentagent.com/api`. Header: `X-API-Key` from login response `crm_token`. Paths used today: `/pos/customers`, `/pos/customer-lookup`, etc. (relative — baseURL prefix supplies `/api`). |
| POS Frontend `/api/pos/orders` direct call | **None.** POS calls POS Backend `/api/v2/vendoremployee/order/place-order` + `…/order-bill-payment`. Coupon final commit therefore depends on POS Backend mapper bridging to CRM `/api/pos/orders`. |
| Reports display | `reportTransform.js` L442 reads historical `order.coupon_discount` (display-only) |

---

## 4. Gaps Between CRM Contract and POS Current State

### 4.1 POS Frontend gaps

| # | Gap | Severity | Notes |
|---|---|---|---|
| F-1 | **No CRM endpoint constants for coupons** | High | Must add `COUPONS_AVAILABLE: '/pos/coupons/available'` and `COUPONS_VALIDATE: '/pos/coupons/validate'` to `api/constants.js`. Path prefix `/api` comes from `REACT_APP_CRM_BASE_URL`. |
| F-2 | **No `couponService` / no transform** | High | Need `getAvailableCoupons({ customerId, orderTotal, channel })` + `validateCoupon({ code, customerId, orderTotal, channel, loyaltyPointsUsed, items, orderTime })` + `fromAPI.availableCoupons(...)` + `fromAPI.validateCoupon(...)` mappers. Pattern mirrors `loyaltyService.getMaxRedeemable` + `loyaltyTransform.maxRedeemableFromAPI`. |
| F-3 | **`handleApplyCoupon` is a no-op** | High | Today: early-returns when `couponLive=false`. Must call `validateCoupon` and parse 27 error codes (`INVALID_CODE`, `EXPIRED`, `MIN_ORDER_NOT_MET`, `STACKING_NOT_ALLOWED`, `OUTSIDE_TIME_WINDOW`, `BUY_REQUIREMENT_NOT_MET`, etc.). |
| F-4 | **No "available coupons" discovery surface** | Medium | `customer.coupons` schema slot exists but empty. New UI need: chip list / dropdown of suggested coupons above the input. |
| F-5 | **No `items[]` ever built/sent to CRM** | High | Currently `paymentData.cartItems` / cart entries exist in POS state but are not formatted for `POSCartItem` (CRM expects `food_id`, `quantity`, `unit_price`, `category_name`). Mapper needed. |
| F-6 | **No `channel` field** | Medium | CRM expects `pos` / `dine_in` / `takeaway` / `delivery`. POS has `orderType` (`dinein`, `takeaway`, `delivery`, `pos`, `WalkIn`). Mapping function needed. |
| F-7 | **No `pos_instruction` display slot** | Medium | Today only `couponError` exists. CRM returns `pos_instruction` on failure (e.g., "Add 1 more coffee to qualify"). Needs its own slot/styling. |
| F-8 | **No support for advanced coupon types in UI** | Medium | CRM supports `bogo` / `bxg` / `nth_item` / `time_window`. POS UI today has only a single Apply input (no benefit-items preview, no buy/get summary, no time-window status banner, no greyed-out "Available from {time}" treatment for outside-window coupons). |
| F-9 | **Flow 3 key-mismatch latent bug + missing gate** | Medium (from discovery §14 Risk #2/#3) | `orderTransform.js` L1148 reads `discounts.coupon` but panel emits `discounts.couponDiscount`. Also Flow 3 is not `couponLive`-gated. Must be co-fixed when flag is flipped. |
| F-10 | **Print payload missing `coupon_discount` value** | Low | `buildBillPrintPayload` emits only `coupon_code` (force-empty). Bill print would not show "-₹X" discount line; only the code. |
| F-11 | **No `stackable_with_loyalty` enforcement** | Medium | When `useLoyalty=true` AND coupon `stackable_with_loyalty=false`, POS UI must either prevent coupon selection OR pass `loyalty_points_used > 0` to `/validate` and surface the `STACKING_NOT_ALLOWED` error. |
| F-12 | **QSR has no coupon UI** | Medium | `QsrBillingSection` (CartPanel) hardcodes coupon fields to 0. Owner-direction needed (carried from discovery Q5). |
| F-13 | **No CRM auto-add restriction enforcement** | Low | CRM mandates "POS must NOT auto-add items" for BOGO/BXG. POS must not silently add the "get" item to the cart — only show `pos_instruction`. Today POS has no auto-add logic, so this is a documentation/discipline requirement rather than code. |
| F-14 | **No `coupon_usage.recorded` post-order surfacing** | Low | CRM returns `coupon_usage.recorded: true/false` and `discount_mismatch` flag in the order response. POS Frontend should surface a non-blocking warning to the cashier if `recorded: false` (audit visibility). Currently POS does not inspect this. |
| F-15 | **`reportTransform.js` already reads `coupon_discount`** | Low (informational) | Historical-bill display path will continue to work because POS payload field name matches CRM. No change needed. |

### 4.2 POS Backend mapper gaps (out of POS Frontend scope but blocking)

| # | Gap | Severity | Notes |
|---|---|---|---|
| B-1 | **POS Backend mapper for coupon fields on `/api/pos/orders` bridge unverified** | High | Same audit class as Loyalty Phase C `loyalty_points_used` pass-through. Need confirmation that POS Backend (preprod.mygenie.online) forwards `coupon_code`, `coupon_discount`, `coupon_title`, `coupon_type` from `place-order` / `order-bill-payment` payloads to CRM `POST /api/pos/orders` unstripped. |
| B-2 | **POS Backend mapper for `items[]` (OrderItem schema)** | High | CRM expects `pos_food_id`, `item_category`, `item_name`, `item_qty`, `item_price`. POS Backend mapper must convert the existing food-list shape to this. Without items, V2/V3 coupons cannot revalidate at final commit. |
| B-3 | **POS Backend `order_id` propagation for idempotency** | Medium | CRM idempotency is `(user_id, order_id)`. POS Backend must pass a stable `order_id` to CRM; retries must use the same value. Likely already in place from existing order flow — needs verification. |
| B-4 | **POS Backend reading `coupon_usage` response block** | Low | If POS Frontend wants to surface `coupon_usage.recorded` / `discount_mismatch` warnings, POS Backend must thread the CRM response block back to the frontend in the `place-order` / `order-bill-payment` response. |

### 4.3 CRM contract questions (open before freeze)

Listed in §5 below.

### 4.4 Owner / product decisions

Listed in §6 below.

---

## 5. Questions to Send Back to CRM

### CRM-Q1. `/api/pos/coupons/available` channel parameter naming
The contract specifies channels `pos`, `dine_in`, `takeaway`, `delivery`. POS internally uses `dinein` (no underscore), `WalkIn` (capitalised), etc.
**Q:** Are channel values strictly the four listed (snake_case), or do CRM-accepted aliases exist (e.g., `dinein` → `dine_in`, `walkin` → `pos`)? If strict, POS will normalize on the fly; please confirm the canonical list.

### CRM-Q2. `customer_id` requirement for "open" / non-customer coupons
The contract requires `customer_id` for both `/available` and `/validate`. POS frequently runs walk-in / takeaway flows where no CRM customer has been selected.
**Q:** Is `customer_id` truly mandatory in all cases, or is there a `guest`/`anonymous` sentinel value (or omission) supported? If mandatory, will POS show coupons only when a customer is selected? (POS today already gates the entire coupon UI on `customer && restaurantSettings.isCoupon`, so this is consistent — but please confirm.)

### CRM-Q3. CRM `error.code` for "no customer" / "customer not found"
The 27-code error table covers `CUSTOMER_NOT_ELIGIBLE` and `CUSTOMER_USAGE_LIMIT_REACHED`. The loyalty contract has `CUSTOMER_NOT_FOUND` and `INVALID_REQUEST`.
**Q:** Are there equivalent codes for the coupon API (e.g., for missing `customer_id` or unknown customer), or does the contract assume POS will never call `/validate` without a valid customer?

### CRM-Q4. Final-order webhook path
The contract states the final commit is via `POST /api/pos/orders`. POS Frontend today calls POS Backend endpoints (`/api/v2/vendoremployee/order/place-order`, `…/order-bill-payment`) which then forward to CRM.
**Q:** Confirm: POS Frontend should NOT call `/api/pos/orders` directly under any circumstance? All coupon final commits happen through POS Backend → CRM bridge? (Mirrors the frozen Loyalty Phase C architecture.)

### CRM-Q5. `coupon_type` value enumeration on final commit
On `POST /api/pos/orders`, CRM accepts `coupon_type` with values `"order"`, `"item"`, `"category"` per the OrderItem block sample. But the validate response carries `offer_type` (`simple`, `bogo`, `bxg`, `nth_item`) AND `coupon_type` (`order`, `item`, `category` etc.).
**Q:** Which `coupon_type` value should POS send on `POST /api/pos/orders` for BOGO/BXG/Every-Nth coupons (e.g., is it always `"item"`, or should POS pass `offer_type` instead)? Please clarify the mapping.

### CRM-Q6. `discount_mismatch` thresholds for V2/V3
Threshold is `max(₹1, 1% × CRM-computed)`.
**Q:** Does this threshold apply identically to V2 (item / category), V3-B (BOGO/BXG), V3-C (Every-Nth)? Or are there scope-specific tolerances? POS will display the variance warning if `discount_mismatch=true`.

### CRM-Q7. Reversal / refund on order cancellation
The contract states "Coupon reversal/refund: Not implemented; no undo mechanism for committed coupon usage."
**Q:** When a POS order is cancelled (full order cancel) or moved to unpaid via `MAKE_ORDER_UNPAID` (CR-003) after `coupon_usage.recorded=true`, what is the expected behavior?
- (a) `coupon_usage` row stays; customer's per-customer limit is consumed permanently.
- (b) CRM provides a future reversal endpoint (timeline?).
- (c) POS must avoid sending the order to CRM at all when it knows cancellation will follow.

This is operationally important — accounting impact.

### CRM-Q8. `items[]` schema divergence between `/validate` (POSCartItem) and `/api/pos/orders` (OrderItem)
Two different schemas for the same conceptual data.
**Q:** Is there any plan to unify these, or must POS build two distinct mappers (one for validate, one for final-order via Backend bridge)? If they remain distinct, please confirm field-by-field semantics for both — particularly how `food_id` vs `pos_food_id` map for variants.

### CRM-Q9. Variant / add-on handling
Contract §16 states "Variant/add-on matching: Not supported. Coupon engine matches by `food_id`/`item_id`/`category`; variants and add-ons are not considered for eligibility."
**Q:** For variant items in POS (e.g., "Pizza Margherita" with size variant "Large"), should POS send the base `food_id` only, or a variant-specific ID? If a coupon targets "Pizza" and the cart has only "Pizza Large", will it match? Please confirm the matching key POS should use.

### CRM-Q10. `excluded_item_ids` / `excluded_category_ids` visibility
Contract §16 states these are backend-only with no admin UI.
**Q:** Will the `/available` response include any indication that exclusions are active? POS may need to display "some items in this cart are not eligible for this coupon".

### CRM-Q11. `stackable_with_loyalty` direction
The contract states POS should pass `loyalty_points_used > 0` to `/validate` and handle `STACKING_NOT_ALLOWED`. POS today computes `loyaltyDiscount` (₹) from `/pos/max-redeemable`, not `points_used` directly.
**Q:** Is `loyalty_points_used` in the `/validate` body intended as **points (integer)** or **₹ amount (float)**? The field name suggests points but the loyalty Phase C frozen contract uses both `used_loyalty_point` (int points) and `loyalty_points_used` (also int). POS will pass `maxRedeemable.maxPointsRedeemable` (int) — please confirm.

### CRM-Q12. `pos_instruction` localisation
**Q:** Are `pos_instruction` strings always English (server-default), or can they be localised per restaurant locale? POS today does not translate cashier-facing strings, but this could become a future consideration.

### CRM-Q13. Rate-limiting / throttling on `/available` + `/validate`
**Q:** Is there any rate limit POS should be aware of? POS will likely re-call `/validate` on each cart change (debounced) — mirrors the `/pos/max-redeemable` debounce pattern. Should we use the same 300–500ms debounce or is more conservative throttling required?

### CRM-Q14. `/api/pos/coupons/available` for outside-window coupons — UX intent
Contract returns outside-window coupons with `within_window_now: false`.
**Q:** Should POS include outside-window coupons in the "suggested coupons" list (greyed out per the doc) or completely hide them? The contract implies greyed-out; please confirm this is the intended UX.

---

## 6. Owner / Product Questions

### Owner-Q1. Phase ordering
Owner decision from prior discovery (carried over) was tentatively: **Flow 4 (postpaid Collect Bill) first, Flow 3 (prepaid) second**. CRM contract supports both via the same `/validate` path.
**Q:** Confirm rollout: enable `couponLive=true` first for Flow 4 only (then Flow 3 once Flow 3's key-mismatch + gate fix is QA-validated)? Or simultaneous?

### Owner-Q2. Advanced coupon types — initial UI scope
CRM supports `bogo` / `bxg` / `nth_item` / `time_window`. POS UI today is single-input + Apply only.
**Q:** Should the first POS coupon release support **all** offer types (including BOGO/BXG/Every-Nth/Time-Window) — requiring chip-list discovery UI + benefit-items preview + pos_instruction display — or **V1 simple order coupons only** (matches existing UI) with V2/V3 deferred to a follow-on CR?

- **(A) Full V1 + V2 + V3-A/B/C** — bigger UI scope, full benefit of CRM contract.
- **(B) V1 simple order coupons only first** — minimal UI change, defer V2/V3.
- **(C) V1 + V2 (item/category)** — pos can send `items[]` to `/validate` but no BOGO/BXG/Nth UI yet.

### Owner-Q3. Cancellation / reversal policy
Per CRM-Q7, CRM has no reversal endpoint today. If the answer from CRM is (a) (usage stays committed), POS must educate cashiers.
**Q:** Acceptable behavior on cancelled orders?
- (A) Coupon usage stays committed (CRM today). POS will log a non-blocking warning.
- (B) Block coupon application on payment flows that can later be reversed (e.g., on credit/tab orders).
- (C) Defer decision; reverse-engineer once CRM ships a reversal API.

### Owner-Q4. QSR coupon support
Carried over from discovery Q5.
**Q:** Final answer?
- (A) **No** — QSR remains coupon-free (recommended; matches §16 of the discovery report).
- (B) **Yes** — add coupon UI to `QsrBillingSection` in a follow-on CR.

### Owner-Q5. Bill-print parity
Print payload today emits only `coupon_code` (force-empty when flag false).
**Q:** Should bill print show a "Coupon `<CODE>` -₹X" line when a coupon is applied? If yes, POS will add `coupon_discount` to the print payload as a new field (mirrors loyalty print field `loyalty_dicount_amount`).

### Owner-Q6. `customer.coupons` schema slot
Discovery noted this slot is referenced but never populated.
**Q:** Should we remove the orphan slot from `customerTransform.js`, or populate it from `/api/pos/coupons/available` as a side-effect of customer selection? The latter creates a "suggested coupons" UX on customer selection.

---

## 7. Recommended First Implementation Phase

**Phase 108-C-P1 (read-only wiring, kill switch stays OFF)** — gated by CRM-Q1–Q14 answers + Owner-Q1–Q6 answers:

1. Add endpoint constants to `api/constants.js`:
   - `COUPONS_AVAILABLE: '/pos/coupons/available'`
   - `COUPONS_VALIDATE: '/pos/coupons/validate'`
2. Create `src/api/services/couponService.js` with `getAvailableCoupons()` and `validateCoupon()` — both calling `crmApi` (using existing `X-API-Key` interceptor).
3. Create `src/api/transforms/couponTransform.js` with `fromAPI.availableCoupons` + `fromAPI.validateCoupon` + `toAPI.posCartItem` (cart-line → POSCartItem schema) + `toAPI.channel` (POS `orderType` → CRM `channel`).
4. **Do NOT flip `couponLive=true` yet.** Payload force-zero remains active.
5. **Do NOT call** these new services from `CollectPaymentPanel` yet.
6. Smoke-test the new service + transform via a unit / dry-run only (no live cashier exposure).

**Why this scope first:** zero user-visible change, zero payload change, builds the read-only foundation. Implementation of `handleApplyCoupon` → validate-call, error-code mapping, items[] passing, pos_instruction display, and the Flow 3 key-mismatch fix happens in P2 after CRM/owner answers are in.

---

## 8. What Should NOT Be Implemented Yet

- **Do not flip `BUG108_FLAGS.couponLive=true`** until: (a) CRM contract questions are frozen, (b) owner answers Owner-Q1–Q6, (c) POS Backend mapper verifies coupon-fields + `items[]` pass-through to `POST /api/pos/orders` (mirrors B-1/B-2 above).
- **Do not wire `handleApplyCoupon` to call CRM** until error-code handling, `pos_instruction` UI slot, and channel mapping are designed.
- **Do not fix the Flow 3 key-mismatch** in isolation — must be co-fixed when adding the `couponLive` gate to Flow 3 (avoid a half-state where Flow 3 leaks coupon data without flag protection).
- **Do not add BOGO / BXG / Every-Nth UI** until Owner-Q2 is answered (scope decision).
- **Do not add coupon UI to QSR** until Owner-Q4 is answered.
- **Do not call CRM `POST /api/pos/orders` from POS Frontend** — that is POS Backend's responsibility per the frozen Loyalty Phase C architectural pattern. Confirm via CRM-Q4.
- **Do not use the deprecated `POST /api/pos/coupons/apply`** endpoint. Period. (CRM contract §13 is explicit.)
- **Do not auto-add "get" items** for BOGO/BXG. POS must only display `pos_instruction`.
- **Do not modify `/app/memory/final/`** or baseline docs as part of this review.

---

## 9. Implementation Readiness Verdict

```
waiting_crm_contract_questions + waiting_owner_decisions
```

- CRM contract V1+V2+V3-A/B/C is **delivered and QA-passed (211/211)**. This is a major unblocker vs. the discovery state from 2026-05-25 (which was `bug_108_coupon_crm_blocked_missing_crm_contract`).
- However, **14 contract questions** to CRM and **6 owner decisions** must be answered before implementation phases can be scoped.
- POS Backend mapper audit (B-1 through B-4) is a parallel-track blocker — same magnitude as the Loyalty Phase C mapper audit. Cannot be skipped.

Effective state: **contract is reviewable and understood, but not yet freezeable.** Next step is to route CRM-Q1–CRM-Q14 to the CRM team and Owner-Q1–Owner-Q6 to the product owner. Once answered, this document gets a follow-up "Contract Freeze" doc and a P1 implementation plan can begin.

---

## 10. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No code changed | **Confirmed** |
| 2 | No frontend changed | **Confirmed** |
| 3 | No backend changed | **Confirmed** |
| 4 | No CRM changed | **Confirmed** |
| 5 | No data mutated | **Confirmed** |
| 6 | No mutating API called | **Confirmed** (only file reads + one HTTPS GET to download the CRM contract artifact into `/app/memory/crm/crm_1_0/handoff/`, which is a read-only public asset URL) |
| 7 | `/app/memory/final/` untouched | **Confirmed** |
| 8 | Baseline docs untouched | **Confirmed** |
| 9 | CRM contract file saved to `/app/memory/` | **Confirmed** at `/app/memory/crm/crm_1_0/handoff/CR_001C_C_COUPON_POS_API_HANDOFF_SUMMARY.md` (733 lines, ~32 KB) |
| 10 | Deprecated `/api/pos/coupons/apply` endpoint will NOT be used | **Confirmed** |

---

**End of BUG-108 Coupon CRM Contract Review: Gaps & Questions.**
