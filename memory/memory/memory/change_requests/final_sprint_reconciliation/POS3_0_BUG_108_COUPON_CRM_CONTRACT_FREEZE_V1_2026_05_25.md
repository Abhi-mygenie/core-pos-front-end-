# POS 3.0 BUG-108 — Coupon CRM Contract Freeze v1

**Date:** 2026-05-25
**Status:** `bug_108_coupon_crm_contract_frozen_ready_for_v1_implementation_planning`
**Persona:** Senior POS3.0 BUG-108 Coupon CRM Contract Freeze Agent
**Mode:** Planning / freeze document only — no code changes, no API calls, no data mutation.

---

## 1. Purpose

This document is the **single source of truth** consolidating:
- All 9 CRM answers from the contract review (`CR_001C_C_COUPON_POS_API_HANDOFF_SUMMARY.md`)
- All 9 owner decisions (Q1–Q6 + G-1 + New-Q1 + New-Q2 + Q6.a/b/c)
- The V1 / V2 / V3 phase boundaries
- Acknowledged gaps and follow-ons

Use this doc as the authoritative input for the **Phase 108-C-V1 implementation plan** and all subsequent V2/V3 plans.

---

## 2. Document Trail

| # | Document | Purpose |
|---|----------|---------|
| 1 | `POS3_0_BUG_108_COUPON_CRM_INTEGRATION_DISCOVERY_REPORT_2026_05_25.md` | POS coupon current-state discovery |
| 2 | `crm/crm_1_0/handoff/CR_001C_C_COUPON_POS_API_HANDOFF_SUMMARY.md` | CRM contract (V1+V2+V3-A/B/C, backend 211/211 QA pass) |
| 3 | `POS3_0_BUG_108_COUPON_CRM_CONTRACT_GAP_AND_QUESTIONS_2026_05_25.md` | Gap review + 14 CRM questions + 6 owner questions |
| 4 | **This document** | Frozen contract + owner decisions consolidated |
| 5 | (next) `POS3_0_BUG_108_COUPON_PHASE_V1_IMPLEMENTATION_PLAN_2026_05_25.md` | V1 file-by-file change plan + QA checklist |

---

## 3. CRM Contract — Frozen Summary

### 3.1 Endpoints (CRM-side, all live)

| # | Method | Path | Caller | Mutating? |
|---|--------|------|--------|-----------|
| 1 | `GET` | `/api/pos/coupons/available?customer_id=…&order_total=…&channel=…` | POS Frontend (`crmApi`) | No |
| 2 | `POST` | `/api/pos/coupons/validate` | POS Frontend (`crmApi`) | No |
| 3 | `POST` | `/api/pos/orders` | **POS Backend ONLY** — POS Frontend NEVER calls directly | Yes (commit side-effect when `coupon_code` + `coupon_discount > 0`) |
| ~~4~~ | ~~POST~~ | ~~`/api/pos/coupons/apply`~~ | **DEPRECATED — never use** | — |

### 3.2 Auth
- `X-API-Key` (primary) sourced from POS login response `crm_token`.
- Existing `crmAxios.js` interceptor handles this — no new auth code.

### 3.3 Field Conventions (frozen)

**On `/validate` request:**
- `code`, `customer_id` (mandatory — no guest support in Phase 1), `order_total`, `channel`, `loyalty_points_used` (integer points), `items[]` (POSCartItem schema — V2+), `order_time` (informational only)

**On `/validate` response (success):**
- `valid: true`, `computed_discount`, `final_amount_preview`, `coupon_id`, `coupon_type`, `discount_scope`, `offer_type`, `stackable_with_loyalty`, `time_window_status`, `benefit_items[]`, `pos_instruction` (only on failure)

**On `POST /api/pos/orders` from POS Backend:**
- `coupon_code` (REQUIRED for commit)
- `coupon_discount` (REQUIRED, float > 0 for commit)
- `coupon_title` (informational)
- `coupon_type` — **send `"order"`/`"item"`/`"category"` for V1/V2; OMIT field entirely for V3 BOGO/BXG/Nth** (per CRM Q3 answer)
- `items[]` (OrderItem schema — V2+)

### 3.4 Architectural Pattern (mirrors Loyalty Phase C)
- POS Frontend → POS Backend → CRM bridge. No direct POS Frontend → CRM `/api/pos/orders`.
- POS Frontend calls only **read-only** CRM endpoints (`/available`, `/validate`).
- CRM commits coupon usage as a side-effect of `POST /api/pos/orders` (idempotent on `(user_id, order_id)`).

### 3.5 Variance Tracking
- POS-sent `coupon_discount` = source of truth for billing.
- CRM independently recomputes; logs `discount_mismatch: true` if variance > `max(₹1, 1% × CRM-computed)`. Uniform across all scopes (per CRM Q4 answer).
- Order **always persists** (HTTP 200) even if CRM revalidation fails at commit. `coupon_usage.recorded: false` returned.

### 3.6 Idempotency & Limits
- Idempotency: `(user_id, order_id)`. Same retry → same `coupon_usage` row.
- One coupon per order. No multi-coupon stacking.
- `stackable_with_loyalty=false` + `loyalty_points_used > 0` → `STACKING_NOT_ALLOWED` error.

### 3.7 Error Codes (27 codes — POS handles by `error.code`, NOT `message`)
V1: 9 / V2: 5 / V3-A: 1 / V3-B: 7 / V3-C: 5. POS displays `pos_instruction` (failure-only).

### 3.8 Data Hygiene (POS-owned)
- `food_id` matching is **case-sensitive, exact**. POS must send the byte-exact `food_id` stored in coupon's `eligible_food_ids`.
- Category matching is casefold-tolerant.
- POS must send the **base food's `food_id`**, never a variant-suffixed ID (CRM does not match variants).
- **Pre-launch QA gate:** sample-audit `food_id` casing consistency across POS catalog and coupon admin tool.

### 3.9 Operational Limits (Phase 1)
- **No reversal endpoint.** Cancelled coupon-applied orders permanently consume per-customer coupon allowance. Reversal API deferred to Phase 2 (no ETA from CRM).
- **No CRM rate limit.** POS uses 500ms debounce on `/validate`, single call on coupon-input focus for `/available`.
- **No exclusion visibility.** CRM silently drops excluded lines. POS may infer from `items[]` sent vs `eligible_match_summary` returned (Phase 2 enhancement, not V1).
- **No CRM admin UI for V3 (BOGO/BXG/Nth) coupon creation yet.** Blocker for V3 production launch — must be coordinated with CRM team before V3 implementation begins.

---

## 4. CRM Answers — Reference Table

| Q | Topic | CRM answer | POS impact |
|---|---|---|---|
| Q1 | Channel normalization | Owner: POS normalizes strictly | POS `toAPI.channel()` mapper required |
| Q2 | Guest / customer-less coupons | NOT supported. `customer_id` mandatory. | POS UI already gates on customer |
| Q3 | Missing-customer error code | No coupon-specific code. `customer_id` is opaque. | POS guarantees customer presence before calling CRM |
| Q4 | Final-order webhook ownership | Owner: confirmed POS Backend bridges | POS Frontend never calls `/api/pos/orders` directly |
| Q5 | `coupon_type` for advanced coupons | Send `"order"`/`"item"`/`"category"` for V1/V2; **OMIT** for V3 (safest) | POS Backend mapper must support **field omission** |
| Q6 | `discount_mismatch` threshold by scope | Uniform `max(₹1, 1% × CRM-computed)` | No per-scope special handling |
| Q7 | Phase 1 reversal behaviour | Rows stay, `total_used` stays, per-customer limit consumed permanently. Phase 2: no ETA. | POS surfaces cancel-warning to cashier |
| Q8 | Two items[] schemas | Owner: POS-internal mapping concern; not CRM's | POS handles POSCartItem ↔ OrderItem mapping |
| Q9 | Variant matching | Exact, case-sensitive on `food_id`. Send base food id. | POS data hygiene + catalog audit required |
| Q10 | Exclusion visibility | Not surfaced; POS must infer if needed | Deferred to V2+ enhancement |
| Q11 | `loyalty_points_used` units | Owner: POS will pass both representations as needed | POS sends integer points (matches loyalty contract) |
| Q12 | `pos_instruction` localisation | Owner: English-only Phase 1 | No localisation work |
| Q13 | Rate-limit / debounce | No CRM-enforced limit. 300–500ms debounce on `/validate` is fine. | POS uses 500ms debounce |
| Q14 | Outside-window UX | Show greyed-out with `next_window_start` hint | POS implements greyed-out treatment |

---

## 5. Owner Decisions — Frozen

| # | Topic | Final answer | Notes |
|---|-------|--------------|-------|
| Q1 | Coupon module gate | `restaurantSettings.isCoupon` (from backend `is_coupon`). Phased by **coupon tier** (V1/V2/V3), not by POS flow. | Both Flow 3 + Flow 4 light up together once V1 ships (Flow 3 key-mismatch + flag gating co-fixed in V1) |
| Q2 | UI scope | Single unified planning doc; **3 phased implementations** V1 → V2 → V3 | Each phase independently shippable |
| Q3 | Cancellation policy | **(A)** Accept Phase-1 + cashier warning on cancel: "Coupon allowance consumed, cannot be refunded." | Mirrors loyalty cancellation behaviour |
| Q4 | QSR coupon support | **(A)** QSR coupon-free for fresh Place+Pay; QSR Collect-Bill on placed orders works via Full View → Flow 4 | No new code in `QsrBillingSection` |
| Q5 | Bill print | **(A)** Add `coupon_discount` to print payload + show "Coupon `<CODE>` −₹X" line on bill, mirroring loyalty's `loyalty_dicount_amount` pattern | Print template addition |
| **Q6** | **Suggested Coupons UX** | **Type-ahead autocomplete:** `/available` called on coupon-input focus, cached client-side, filtered as cashier types. Auto-apply highest-discount match (500ms debounce). Direct `/validate` fallback for codes not in suggested list. Outside-window coupons shown greyed out with `next_window_start` hint. | See §6 for detail |
| G-1 | Customer-required Phase 1 | **(A)** Accept. POS UI already gates coupon section on `customer` selection. | No code change |
| New-Q1 | Kill-switch after V1 | **(A)** Remove `BUG108_FLAGS.couponLive` entirely at V1 closure. Only `is_coupon` profile flag remains. | Cleanup task in V1 closure |
| New-Q2 | V1/V2/V3 phase boundaries | **Confirmed** as recommended (see §7) | — |

---

## 6. Q6 Suggested Coupons UX — Detailed Spec

### 6.1 User flow

```
1. Customer selected in OrderEntry (existing flow)
2. Cashier opens Collect Payment → coupon section visible (gated on `customer && isCoupon`)
3. Cashier focuses the coupon input
   → POS calls GET /api/pos/coupons/available?customer_id=...&order_total=...&channel=...
   → Response cached in component state
4. Cashier types — autocomplete dropdown filters cached list by `code.startsWith(typed)`
   → Outside-window coupons appear greyed out with "from {next_window_start}" hint, not selectable
5. Auto-apply trigger:
   → 500ms after cashier stops typing
   → POS picks the match with highest `expected_discount` (from /available response)
   → Calls POST /api/pos/coupons/validate with the picked code + customer + order_total + channel + items[] (V2+) + loyalty_points_used
   → Response.computed_discount applied to bill
   → UI shows "✓ {code} (−₹{computed_discount}) [Remove]"
6. Edge case — cashier types a code NOT in the suggested list:
   → Apply button calls /validate directly for that code
   → CRM returns either success (generic/global code that bypassed eligibility filter) OR error.code (e.g., INVALID_CODE, CUSTOMER_NOT_ELIGIBLE)
   → POS displays the error / pos_instruction
7. Remove → clears coupon, recomputes bill totals
```

### 6.2 API call rules

| Trigger | Endpoint | Throttle |
|---------|----------|----------|
| Coupon input focused | `GET /available` | Single call per focus event; cache valid until cashier leaves the section |
| Cashier stops typing (500ms debounce) | `POST /validate` | One call per debounced auto-apply |
| Cashier clicks Apply on unknown code | `POST /validate` | One call per click |
| Cashier removes coupon | (none) | Local state clear; no API call |

### 6.3 UI elements
- Coupon input (existing)
- Autocomplete dropdown below input (new)
- "✓ {code} (−₹{X}) [Remove]" applied-coupon chip (existing, repurposed)
- `pos_instruction` slot (new) — separate from existing `couponError`
- Greyed-out outside-window coupon row in dropdown (new)
- Cashier-cancel warning toast (new, for Q3): "Coupon allowance consumed — cannot be refunded"

---

## 7. V1 / V2 / V3 Phase Decomposition

### 7.1 Phase V1 — Simple order coupons + type-ahead UX + time-window + print parity + Flow 3 fix

**Coupon types supported:**
- `offer_type='simple'`, `discount_scope='order'` only
- `time_window` simple-order coupons (server enforces; POS handles `OUTSIDE_TIME_WINDOW` error + greyed-out UX)

**POS Frontend deliverables:**
1. New endpoint constants in `api/constants.js`: `COUPONS_AVAILABLE: '/pos/coupons/available'`, `COUPONS_VALIDATE: '/pos/coupons/validate'`
2. New `src/api/services/couponService.js`: `getAvailableCoupons()`, `validateCoupon()`
3. New `src/api/transforms/couponTransform.js`: `fromAPI.availableCoupons`, `fromAPI.validateCoupon`, `toAPI.channel(orderType)`, `toAPI.posCartItem(cartLine)` (POSCartItem builder — V2 wires it, V1 sends `null`)
4. `CollectPaymentPanel.jsx`:
   - Type-ahead autocomplete dropdown (Q6 spec)
   - Auto-apply max-discount with 500ms debounce
   - Greyed-out outside-window coupons with `next_window_start` hint
   - `pos_instruction` display slot
   - Existing inline-mirror (room service) gets same treatment
5. `orderTransform.js`:
   - **Fix Flow 3 key-mismatch:** L1148 read `discounts.couponDiscount` (not `discounts.coupon`)
   - **Add `couponLive` gate to Flow 3** at L1148-1150
   - **Remove `couponLive` kill switch entirely** at V1 closure (post QA-pass): gate everything on `restaurantSettings.isCoupon`
   - Print payload: add `coupon_discount` field (mirrors `loyalty_dicount_amount`), keep existing `coupon_code`
6. `CartPanel.jsx` (QSR): no change — QSR remains coupon-free
7. Cashier-cancel warning for coupon-applied orders

**POS Backend deliverables (audit + light touch):**
- Verify `place-order` and `order-bill-payment` endpoints forward `coupon_code`, `coupon_discount`, `coupon_title`, `coupon_type` to CRM `POST /api/pos/orders` unstripped
- Handle field omission for `coupon_type` when not provided (V3 pre-req, but cleanest to land in V1)

**Pre-launch QA gates:**
- Sample audit of `food_id` casing across POS catalog vs coupon admin
- Verify CRM `coupon_usage.recorded: true` in test orders
- Verify cancel-warning toast surfaces

**Out of scope for V1:**
- Item/category coupons (V2)
- BOGO/BXG/Every-Nth (V3)
- `items[]` to `/validate` (V2)
- `benefit_items` UI preview (V3)
- Exclusion-inference UX (deferred Phase 2+ enhancement)

### 7.2 Phase V2 — Item / category coupons + `items[]`

**Coupon types added:**
- `offer_type='simple'`, `discount_scope='item'` or `'category'`

**POS Frontend deliverables:**
1. `couponTransform.toAPI.posCartItem(cartLine)` — full implementation (was stubbed in V1)
2. `CollectPaymentPanel.handleApplyCoupon` (and auto-apply path) — send `items[]` to `/validate` when coupon's `requires_cart_validation: true`
3. UI hints: "Eligible for: Coffee, Pizza" (from `eligible_match_hint`)
4. Error handling: `MISSING_ITEMS_FOR_ITEM_COUPON`, `NO_ELIGIBLE_ITEMS_IN_CART`, `MIN_ITEM_QTY_NOT_MET`

**POS Backend deliverables (HARD BLOCKER — audit required):**
1. Verify `place-order` and `order-bill-payment` forward `items[]` (OrderItem schema: `pos_food_id`, `item_category`, `item_name`, `item_qty`, `item_price`) to CRM `POST /api/pos/orders`
2. Confirm OrderItem field aliases CRM accepts work end-to-end

**Pre-launch QA gates:**
- Item-scope coupon end-to-end test (CRM-side: `coupon_usage.recorded: true`, `benefit_items` correct)
- Category-scope coupon end-to-end test
- `discount_mismatch` audit on a sample of 50+ orders

### 7.3 Phase V3 — BOGO / BXG / Every-Nth

**Coupon types added:**
- `offer_type='bogo'`, `'bxg'`, `'nth_item'`

**HARD BLOCKER:** CRM admin UI for V3 coupon creation must ship before V3 implementation begins.

**POS Frontend deliverables:**
1. `CollectPaymentPanel` adds:
   - `benefit_items[]` preview ("Free items: 1× Coffee")
   - `buy_match_summary` / `get_match_summary` display
   - `applied_applications` counter ("Offer applied 2× = ₹200 off")
2. Error handling: `MISSING_ITEMS_FOR_BXGY_COUPON`, `BUY_REQUIREMENT_NOT_MET`, `GET_REQUIREMENT_NOT_MET`, `NO_ELIGIBLE_BUY_ITEMS_IN_CART`, `NTH_REQUIREMENT_NOT_MET`, etc.
3. Confirm POS does NOT auto-add items (CRM contract §16)
4. POS Backend: send `coupon_type` field **omitted** (per CRM Q3) on `POST /api/pos/orders` for V3 types

**Pre-launch QA gates:**
- BOGO end-to-end
- BXG end-to-end
- Every-Nth end-to-end (`floor(qty / N)` math validation)
- Time-window + BOGO composition test
- POS auto-add discipline check

---

## 8. Acknowledged Gaps — Carried Forward (Owner to Address)

These were called out earlier; owner said "I will answer these first". Captured here for visibility:

| # | Gap | Phase impact |
|---|-----|--------------|
| 1 | V3 + missing CRM admin UI for BOGO/BXG/Nth coupon creation | V3 blocker — coordinate with CRM before V3 starts |
| 2 | QSR coupon-free decision intersection with Flow 3 latent bug | Resolved by V1 fixing Flow 3 (both fresh QSR and non-QSR Flow 3 work post-V1; QSR UI just doesn't expose coupon entry) |
| 3 | Print "Coupon −₹X" addition | No gap — clean V1 deliverable |
| 4 | Eager-populate vs no CRM rate limit | Resolved by Q6 = lazy-load (on focus, not on customer selection) |
| 5 | Customer-required walk-in friction monitoring | Operational — cashier feedback in V1 post-launch |
| 6 | Variant `food_id` case-exact match → pre-launch catalog audit needed | V1 + V2 + V3 QA gate — audit before flag flip |
| 7 | Exclusion silent skip → cashier training note | Documentation deliverable for V1 launch |
| 8 | POS Backend mapper unaudited → hard blocker for V2 launch | V2 prerequisite; not blocking V1 (V1 doesn't send `items[]`) |

---

## 9. Implementation Readiness Verdict

```
bug_108_coupon_crm_contract_frozen_ready_for_v1_implementation_planning
```

- CRM contract: **frozen** (211/211 backend QA pass, all 9 POS questions answered, no further CRM dependency for V1)
- Owner decisions: **frozen** (all 9 owner questions answered)
- POS Backend mapper audit: **not required for V1** (V1 doesn't send `items[]`); **required for V2**
- POS Frontend V1 scope: **fully defined**, no open decisions

**Next step:** Produce `POS3_0_BUG_108_COUPON_PHASE_V1_IMPLEMENTATION_PLAN_2026_05_25.md` with file-by-file change plan, regression checklist, QA test cases.

---

## 10. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No code changed | **Confirmed** |
| 2 | No frontend changed | **Confirmed** |
| 3 | No backend changed | **Confirmed** |
| 4 | No CRM changed | **Confirmed** |
| 5 | No data mutated | **Confirmed** |
| 6 | No mutating API called | **Confirmed** |
| 7 | `/app/memory/final/` untouched | **Confirmed** |
| 8 | Baseline docs untouched | **Confirmed** |
| 9 | CRM contract file saved in `/app/memory/crm/crm_1_0/handoff/` | **Confirmed** |
| 10 | Deprecated `/api/pos/coupons/apply` endpoint excluded from all phases | **Confirmed** |

---

**End of BUG-108 Coupon CRM Contract Freeze v1.**
