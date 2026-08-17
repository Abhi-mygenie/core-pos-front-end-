# POS 3.0 BUG-108 — Loyalty Phase C Redeem-Only Preprod Plan

**Date:** 2026-05-23 (later)
**Sprint:** POS 3.0 — BUG-108 continues
**Persona:** Senior POS3.0 BUG-108 Loyalty Phase C Redeem-Only Preprod Planning Agent
**Authoritative CRM loyalty-read contract:** `/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md`
**Supersedes (Phase C API readiness only):** `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEMPTION_PLAN_2026_05_23.md`, `POS3_0_BUG_108_LOYALTY_PHASE_C_API_RECONCILIATION_UPDATE_2026_05_23.md`, `POS3_0_BUG_108_LOYALTY_PHASE_C_BACKEND_API_HANDOFF_2026_05_23.md`, `POS3_0_BUG_108_LOYALTY_PHASE_C_FULL_PREPROD_IMPLEMENTATION_PLAN_2026_05_23.md` (the latter is reduced in scope to redeem-only by this plan).

---

## 1. Status

```
bug_108_loyalty_phase_c_redeem_only_preprod_plan_waiting_owner_implementation_approval
```

Sub-status (operational):
- Inbound status from owner: `bug_108_loyalty_phase_c_redeem_only_preprod_planning_owner_corrected`
- This document elevates to: `bug_108_loyalty_phase_c_redeem_only_preprod_plan_waiting_owner_implementation_approval`

---

## 2. Owner Scope Correction Captured

**Verbatim correction received from owner (2026-05-23, later):**

> Reverse/rollback API is **deferred**. This phase focuses only on **loyalty redeem**.
> Do NOT include CRM reverse/rollback API design or implementation in this phase.
> Do NOT block this phase on reverse API.
> Do NOT build coupon. Do NOT build wallet.
> Do NOT update `/app/memory/final/`. Do NOT update baseline docs.
> Do NOT implement code in this planning pass.
> Pre-production allows full implementation and testing of redeem-only flow.

Net effect of correction on prior Phase C work:
- The earlier "Full Preprod Plan" (2026-05-23, §1) treated CRM reverse/rollback as a hard requirement and even rolled back the CRM team's prior "Q5 — no reversal needed" position. **That stance is hereby reverted by owner.** Reverse stays deferred (matches the CRM handoff §8.2 verbatim).
- Failure-mode design must compensate: redeem-only means no auto-reverse safety net, so the sequence must minimize the redeem→payment-fail window, and any orphan debit becomes a manual-recovery case (admin adjustment).

---

## 3. Phase B Closure Summary

Phase B (read-only loyalty + calculated preview) is **fully shipped and owner-smoke PASSED** on 2026-05-23.

Closure evidence:
- `POS3_0_BUG_108_LOYALTY_PHASE_B_IMPLEMENTATION_REPORT_2026_05_23.md` — implementation: PASS
- `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_IMPLEMENTATION_REPORT_2026_05_23.md` — pipeline defect: FIXED
- `POS3_0_BUG_108_CUSTOMER_MODAL_SEARCH_PARITY_IMPLEMENTATION_REPORT_2026_05_23.md` — CustomerModal Name/Phone typeahead + Member ID UX (Option C): FIXED
- `POS3_0_BUG_108_LOYALTY_PHASE_B_OWNER_SMOKE_PASS_REPORT_2026_05_23.md` — owner smoke: PASSED

What is currently live in the build:
- CRM 6-key loyalty blob (`tier`, `tier_label`, `total_points`, `ratio_per_point`, `points_value`, `loyalty_enabled`) consumed read-only.
- `BUG108_FLAGS.loyaltyPreviewLive = true`, `loyaltyRatioLive = false`, `couponLive = false`, `walletDebitLive = false`.
- Loyalty section shows tier + points + "₹X available" preview; checkbox disabled with helper "Redemption will be enabled in a future update."
- Force-zero guards intact in `orderTransform.js` at L908, L1026, L1153 (hardcoded zero) and L1356, L1768 (flag-gated zero).

BUG-108 remains OPEN until redeem-only Phase C ships and owner re-smokes.

---

## 4. Redeem-Only Phase C Scope

Enable real loyalty point redemption end-to-end on **preprod** while preserving Phase B's read-only fallback when the new flag is OFF.

In scope (this plan):
1. **CRM backend: ONE endpoint — `POST /api/pos/loyalty/redeem`** (commit-only; no reservation, no reverse). Atomic, idempotent, audit-logged.
2. **POS frontend: Redemption UI** — enable the existing loyalty checkbox under new `loyaltyRedeemLive` flag; loading state; double-click guard; inline errors; one Remove (cashier-initiated) only **before** payment confirm (no post-payment reverse).
3. **POS payload wiring**: populate `used_loyalty_point`, `loyalty_dicount_amount`, and a new `loyalty_redemption_id` field in the relevant POS payloads after a successful redeem.
4. **Sequence**: redeem fires **after payment success**, before final order/bill payload submit — the safest order given no reverse endpoint. (See §10 for full evaluation of A/B/C.)
5. **Failure handling without reverse**: orphan-debit detection, persistent cashier warning, redemption_id surface for support/manual recovery.
6. **Calculation**: pre-tax discount, `min(points_value, subtotal_after_other_discounts)`, integer points, 2-dp rupees.
7. **Audit**: CRM ledger row per redeem (already covered by §6 of audit table design); idempotency table on CRM side.
8. **Preprod QA**: full matrix of real-transaction tests against preprod CRM with seeded customers.

---

## 5. Explicit Non-Scope (Hard Boundary)

| Item | Reason |
|------|--------|
| `POST /pos/loyalty/reverse` (any reverse / rollback API) | Owner-deferred. Stays as CRM handoff §8.2 declared. Will be a separate future CR if/when reopened. |
| Auto-reverse on payment failure | Cannot exist without reverse endpoint. |
| Reservation / two-phase commit semantics | Deferred — commit-only redeem. |
| Coupon API integration (`/pos/coupons/*`) | CR-001C-C (separate). |
| Wallet debit / credit / reverse | CR-001C-W (separate). |
| Loyalty earn / accrual flow | Already CRM-internal. |
| Production release | Out of this CR; preprod only. Production deploy belongs to the joint batch with CR-001A Phase 2 + CR-001D after preprod sign-off. |
| `/app/memory/final/` | Untouched. |
| Baseline docs | Untouched. |
| `orderTransform.js` math beyond payload field flips | No tax / SC / total reordering. |
| Backend payment-gateway changes | Unchanged. |
| Dead-code cleanup (`mockCustomers.js`, legacy `customer?.loyaltyPoints`) | P3 backlog. |

---

## 6. Current Code Inventory (POS Frontend)

### 6.1 Existing flags (`src/utils/BUG108_FLAGS.js`)

```js
export const BUG108_FLAGS = {
  couponLive:         false,
  loyaltyRatioLive:   false,
  loyaltyPreviewLive: true,
  walletDebitLive:    false,
};
```

### 6.2 Existing loyalty surface

| Asset | Location | Current state |
|-------|----------|---------------|
| Loyalty discount math | `CollectPaymentPanel.jsx:~507` | Gated by `loyaltyRatioLive` → 0 today |
| `useLoyalty` checkbox | `CollectPaymentPanel.jsx` | `disabled` when `!loyaltyRatioLive` or no points |
| Synthetic loyalty blob | `customerTransform.js:22-31` (`buildSyntheticLoyalty`) | Live; produces 6-key shape from flat fields |
| Preview math | `CollectPaymentPanel.jsx:~1037-1041` + `~1550-1554` (room mirror) | `min(displayValue, itemTotal - manualDiscount - presetDiscount)` |
| Helper copy | `BUG108_COPY.loyaltyPreviewHelper` / `loyaltyDisabledHelper` | "Redemption will be enabled in a future update." / "Loyalty program unavailable" |
| Customer enrichment on order restore | `OrderEntry.jsx` `enrichCustomerLoyaltyFromCRM` | Lives; fire-and-forget CRM lookup |

### 6.3 Existing payload sites (`src/api/transforms/orderTransform.js`)

| Site | Line (approx) | Today | After redeem-only |
|------|---------------|-------|--------------------|
| Place Order | ~908 | `used_loyalty_point: 0` (hardcoded) | Stays `0` — redeem fires AFTER payment success, never at this site (see §10) |
| Prepaid Payment | ~1026 | Same | Same — redeem fires AFTER prepaid success (kept zero here) |
| Update Order | ~1153 | Same | Stays `0` — update-order does not redeem |
| Bill Payment | ~1356 | `loyaltyRatioLive ? used_loyalty_point : 0` | Flag flipped: `loyaltyRedeemLive && redemptionStaged ? value : 0` + `loyalty_redemption_id` field |
| Print | ~1768 | `loyaltyRatioLive ? loyalty_dicount_amount : 0` | Same pattern with `loyaltyRedeemLive` |

**Critical:** because redeem fires AFTER payment success (Q1 recommendation A in §10), the **payload that carries the redeem fields is the post-payment finalize payload**, not the pre-payment place-order payload. Concretely: today the Bill Payment site at L1356 is the natural carrier; if payment commits, we then redeem, then enrich the receipt/ledger payload before settlement closes. (See §15 for exact mapping.)

### 6.4 Legacy field cleanup (still parked at P3 but unblocks fewer regressions if we touch in C-FE-1)

| Reference | Where (approximate) | Action under redeem-only |
|-----------|---------------------|--------------------------|
| `customer?.loyaltyPoints` singular | `CollectPaymentPanel.jsx:507, 720, 781, 1617, 1795` | Replace with `customer?.loyalty?.total_points` / `customer?.totalPoints` and `customer?.loyalty?.points_value` / `customer?.pointsValue` (rupee math). Required for redeem to function. |

---

## 7. Current API Inventory

### 7.1 What is LIVE today (LX-A, GREEN-LIGHT, per CRM handoff §2)

| # | Endpoint | Auth | Used by POS today | Returns 6-key blob? |
|---|----------|------|-------------------|---------------------|
| 1 | `POST /api/pos/customer-lookup` | `X-API-Key` | YES (CustomerModal save, OrderEntry restore) | Flat `tier/total_points/points_value` only; POS builds synthetic blob via `buildSyntheticLoyalty` |
| 2 | `GET /api/pos/customers/{customer_id}` | `X-API-Key` | YES (customer detail page) | YES (CRM returns 6-key directly) |
| 3 | `GET /api/pos/customers/{customer_id}/loyalty` | `X-API-Key` | Available (not consumed at Collect Bill today; POS uses lookup) | YES |
| 4 | `GET /api/pos/customers?search=` | `X-API-Key` | YES (typeahead in CartPanel + CustomerModal) | Flat fields; synthetic blob via `buildSyntheticLoyalty` |

### 7.2 What does NOT exist (and must be built for this redeem-only phase)

| Endpoint | Status today | Required by this plan? |
|----------|--------------|------------------------|
| `POST /api/pos/loyalty/redeem` | Does not exist | **YES — must be built (Scope A)** |
| `POST /api/pos/loyalty/reverse` | Does not exist (CRM declined under "Q5 — no reversal needed") | **NO — out of scope** |
| `POST /api/pos/loyalty/health` | Does not exist | NO — not needed |

`grep -rn "loyalty/redeem\|loyalty/reverse" /app/frontend/src/` → **0 hits.** Confirms no frontend integration exists yet.

---

## 8. Redeem API Gap / Implementation Plan (Scope A — CRM Backend)

### 8.1 Endpoint header

| Item | Value |
|------|-------|
| Method + Path | `POST /api/pos/loyalty/redeem` |
| Auth | `X-API-Key: <crm_token>` (matches existing `/pos/customer-lookup` pattern) |
| Content-Type | `application/json` |
| Idempotent? | **YES** — keyed on `(restaurant_id, idempotency_key)` |
| Atomic? | **YES** — debit + audit insert in single transaction; failure rolls back both |
| Reservation? | **NO** — commit-only (one-shot) |
| Latency budget | p95 ≤ 400 ms on preprod |

### 8.2 Request body (required fields)

```json
{
  "restaurant_id":        "rest_xxx",
  "customer_id":          "bc92911c-c4a0-4ab3-bd56-3e7a9c0d1234",
  "customer_phone":       "9004020412",
  "order_id":             "ord_yyy",
  "temp_order_reference": null,
  "bill_amount":          1250.00,
  "eligible_amount":      720.00,
  "points_to_redeem":     86,
  "redeem_amount":        86.00,
  "idempotency_key":      "uuid-v4",
  "source":               "pos_collect_bill",
  "actor_user_id":        "user_abc"
}
```

Notes:
- `order_id` XOR `temp_order_reference` — exactly one. For "redeem-after-payment" sequence, `order_id` will be present (payment confirms order first).
- `eligible_amount` = `min(customer.points_value, subtotal_after_other_discounts)` — POS sends its computed cap so CRM can sanity-check.
- `redeem_amount = points_to_redeem * ratio_per_point` — CRM re-verifies and rejects mismatches > 0.01 with `amount_mismatch` (422).
- `source` ∈ {`pos_collect_bill`, `pos_prepaid`, `room_service`}.
- `actor_user_id` is the POS cashier id from the login token (best effort; nullable if unavailable).

### 8.3 Response (HTTP 200)

```json
{
  "success":           true,
  "redemption_id":     "red_zzz",
  "points_redeemed":   86,
  "discount_amount":   86.00,
  "previous_points":   86,
  "remaining_points":  0,
  "ratio_per_point":   1.0,
  "tier":              "Bronze",
  "audit_id":          "aud_aaa",
  "message":           "Redemption successful"
}
```

### 8.4 Backend validation matrix (required)

| Validation | Failure response | Code |
|------------|------------------|------|
| Schema / required fields | 400 | `invalid_request` |
| Auth token | 401 | `auth_failed` |
| Customer exists in CRM | 404 | `customer_not_found` |
| `loyalty_settings.loyalty_enabled === true` for restaurant | 422 | `loyalty_disabled` |
| `customer.loyalty.loyalty_enabled !== false` | 422 | `loyalty_disabled` |
| `points_to_redeem > 0 && integer` | 400 | `invalid_request` |
| `points_to_redeem ≤ customer.total_points` | 422 | `insufficient_points` |
| `redeem_amount` matches server math within ±0.01 | 422 | `amount_mismatch` |
| `redeem_amount ≤ eligible_amount` | 422 | `amount_exceeds_cap` |
| Per-restaurant max-redeem cap (if configured) | 422 | `amount_exceeds_cap` |
| Duplicate `idempotency_key` for same `restaurant_id` | 200 (cached) OR 409 | `idempotency_replay` (treated as 200 client-side) |
| Customer already has an active (uncompleted) redemption for `order_id` | 409 | `duplicate_redemption_for_order` |
| Rate limit | 429 | `rate_limited` |
| Internal | 500 | `internal_error` |

All error bodies:
```json
{ "success": false, "error_code": "...", "message": "Human-readable explanation" }
```

### 8.5 Backend implementation requirements (mandatory)

1. **Atomicity** — `BEGIN TRANSACTION; UPDATE customer SET total_points = total_points - N; INSERT INTO loyalty_audit_ledger ...; INSERT INTO loyalty_redemptions ...; COMMIT;`. Any failure rolls back all.
2. **Idempotency guard** — table `loyalty_idempotency(restaurant_id, idempotency_key, endpoint, response_status, response_body, created_at)` with unique constraint on `(restaurant_id, idempotency_key)`. Replay returns cached `response_body` with `response_status` and re-tagged as `idempotency_replay` if 200.
3. **Duplicate-redemption-per-order guard** — table `loyalty_redemptions(order_id)` indexed; reject second redeem with `duplicate_redemption_for_order` if a non-reversed entry exists.
4. **Customer balance validation** — row-level lock (`SELECT ... FOR UPDATE`) on `customer.total_points` during debit to prevent race.
5. **`loyalty_enabled` validation** — both restaurant flag and customer flag (if present) must be true.
6. **Max-redeem cap validation** — backend reads optional `redemption_cap_per_order` from `loyalty_settings`. If absent, falls back to `eligible_amount` echoed by POS.
7. **Audit record** — every committed redemption inserts:
   - `audit_id` (UUID PK)
   - `event_type = 'redeem'`
   - `redemption_id`, `customer_id`, `restaurant_id`
   - `points_delta = -N`, `amount_delta = -X`
   - `balance_after_points`, `balance_after_value`
   - `order_id`, `source`, `idempotency_key`, `actor_user_id`
   - `created_at` (timestamptz)
8. **Concurrency** — two simultaneous redeems for same customer with overlapping point amounts: one succeeds, second returns 422 `insufficient_points`.
9. **Logging** — every redemption logs `request body, response, latency, source IP, restaurant_id, user_id` (no secrets, no tokens).
10. **Insufficient-points error** — must include the actual `remaining_points` in the error body so POS can surface "You only have N points available."

### 8.6 Acceptance criteria for CRM redeem endpoint

- ≥ 30 unit-test fixtures covering boundary + negative cases — 100% PASS.
- Idempotency replay test: 5 identical parallel requests → exactly one debit.
- Insufficient-points test: 422 returned; `total_points` unchanged in DB.
- Concurrency test: two parallel redeems for same customer with combined > balance → one 200, one 422.
- Atomicity test: simulated audit-insert failure → 500 returned AND `total_points` unchanged.
- Latency p95 ≤ 400 ms at 10 RPS on preprod.
- Every 200 response leaves exactly one row each in `loyalty_redemptions` and `loyalty_audit_ledger`.
- Postman/curl collection delivered to POS team.
- One sample preprod customer per tier (Bronze/Silver/Gold) with seeded points.

---

## 9. POS Frontend Implementation Plan (Scope B)

### 9.1 File-level work plan

| File | Change |
|------|--------|
| `src/utils/BUG108_FLAGS.js` | Add `loyaltyRedeemLive: false` (new kill-switch for the redeem API path). Keep `loyaltyRatioLive` as the math gate; in C-FE-2 flip both to `true` on preprod. |
| `src/api/constants.js` | Add `LOYALTY_REDEEM` endpoint constant. |
| `src/api/services/loyaltyService.js` | **NEW** — `redeemLoyalty(payload)` wrapper: generates client-side `idempotency_key`, passes through CRM-timeout handling per BUG-078, parses `error_code` for typed errors. |
| `src/api/transforms/loyaltyTransform.js` | **NEW** — request/response shape mappers; map `error_code → user-facing copy`. |
| `src/components/order-entry/CollectPaymentPanel.jsx` | (a) Replace `customer?.loyaltyPoints` (singular) reads at 5 sites with `customer?.loyalty?.points_value` / `customer?.pointsValue` (rupees) and `customer?.loyalty?.total_points` / `customer?.totalPoints` (points). (b) Wire UI state machine (idle/redeem_in_flight/redeemed/redeem_error/orphan_warning). (c) Inline error region. (d) Surface `redemption_id` in receipt/print line. |
| `src/components/order-entry/OrderEntry.jsx` | Lift `redemption` state (id, points, amount, status) to OrderEntry context so room-service mirror reads same state; localStorage persistence for orphan-debit warnings. |
| `src/api/transforms/orderTransform.js` | At Bill Payment site (~L1356): replace `loyaltyRatioLive` gate with `(loyaltyRedeemLive && redemptionId) ? value : 0`; add `loyalty_redemption_id` field. At Print site (~L1768): same. Place-Order / Prepaid / Update-Order sites stay zero (no pre-payment redeem in redeem-after-payment sequence). |

Net: 7 files (5 modified, 2 new). Zero backend frontend-side.

### 9.2 UI state machine

```
[idle] ─cashier ticks loyalty checkbox→ [redeem_armed]
[redeem_armed] ─cashier clicks Pay→ payment flow runs
        ├─ payment SUCCESS → [redeem_in_flight] (call /pos/loyalty/redeem)
        │        ├─ 200 → [redeemed] (receipt + print include redemption_id)
        │        └─ error → [orphan_warning] (payment settled, points NOT debited)
        │                   → cashier sees inline banner "Loyalty redemption pending
        │                       — admin adjustment required. redemption_id: NONE,
        │                       points: 86, order: ord_xxx"
        │                   → record persisted to localStorage for support follow-up
        └─ payment FAILURE → [idle] (no API call; nothing to roll back)
[redeem_armed] ─cashier unticks checkbox→ [idle] (no API call yet — pre-payment only)
[redeemed] (terminal — receipt printed)
```

Notes:
- The checkbox is **enabled** only when:
  `loyaltyRatioLive === true` AND `loyaltyRedeemLive === true` AND `customer.loyalty.loyalty_enabled !== false` AND `customer.loyalty.total_points > 0` AND `points_value > 0`.
- "Untick after redeem" is **not allowed** under redeem-only — once `[redeemed]` is reached, there is no reverse to fire. The Remove link is **hidden** post-redemption.
- Cashier can untick **before** payment confirm (`[redeem_armed] → [idle]`) freely — no CRM call has been made.
- Double-click guard: single `inFlight` ref; checkbox + Pay button disabled during `[redeem_in_flight]`.

### 9.3 Visual contract

| State | Checkbox | Helper text | Visible to cashier |
|-------|----------|-------------|---------------------|
| `idle` | enabled (if eligible) | "Apply ₹X loyalty discount (Y pts)" | yes |
| `redeem_armed` | ticked, enabled | "₹X will be applied on payment success" | yes |
| `redeem_in_flight` | ticked, disabled, spinner | "Redeeming…" | yes |
| `redeemed` | ticked, disabled, green check | "₹X applied (Y pts) · redemption_id ABCD" | yes (also on receipt) |
| `redeem_error` | unticked, enabled | "Redemption failed: <reason>. Please retry." (red, inline) | yes |
| `orphan_warning` | n/a (post-payment) | Persistent yellow banner across CollectPaymentPanel: "Payment completed but loyalty redemption did not record. Admin adjustment required for order ord_xxx — Y pts pending refund." + dismiss button | yes |

### 9.4 Double-click guard

- Single `redeemInFlight` ref scoped to OrderEntry.
- Pay button disabled while `redeem_in_flight`.
- `idempotency_key` generated once per `[redeem_armed]` entry and reused across any retry.

### 9.5 Manual discount / coupon / wallet rules (clarified)

- **Manual discount + loyalty**: additive (matches existing `CollectPaymentPanel.jsx:~522` `totalDiscount` math). No mutex.
- **Coupon**: stays disabled (`couponLive=false`). No interaction.
- **Wallet**: stays disabled (`walletDebitLive=false`). No interaction.
- **Preset discount + loyalty**: additive (existing).

---

## 10. Redemption Flow Sequence Recommendation (Scope C)

Three sequence options evaluated.

### Option A — Redeem AFTER payment success (RECOMMENDED)

```
1. Cashier ticks loyalty → [redeem_armed] (UI only; CRM not called)
2. Cashier clicks Pay → POS submits bill-payment payload with used_loyalty_point=0
   (no redemption fields yet — payment must settle first)
3. Payment gateway returns success
4. POS calls /pos/loyalty/redeem (commit-only)
   ├─ 200 → POS amends/enriches the order receipt + print with redemption_id,
   │         then closes the bill. used_loyalty_point and loyalty_dicount_amount
   │         populated in the SUBSEQUENT settlement/closure payload (or, if the
   │         bill-payment payload supports a follow-up redemption tag, in that
   │         tag). Receipt is regenerated to show the loyalty line.
   └─ error → [orphan_warning]: payment is already settled with full amount;
              loyalty points NOT debited; cashier sees persistent banner; record
              persisted to localStorage; admin/manual support adjusts CRM ledger.
              No customer-visible refund needed — they paid full bill; only
              CRM-side correction is to debit their points retroactively or
              accept the loss.
```

Pros:
- **No orphan debits.** Points are never debited unless payment has settled.
- No reverse endpoint needed.
- The failure mode is "payment settled but points still on account" — recoverable via admin manual debit on CRM side.

Cons:
- Cashier-visible failure when redemption fails after payment success — but acceptable because customer has already paid full bill (no refund needed).
- Receipt regenerated post-payment (small UX wrinkle if printer prints immediately at payment).
- **Discount math implication:** the bill the customer paid is the FULL bill (no loyalty discount applied), and the loyalty is "absorbed" only in the CRM ledger post-fact. **This is wrong for cashier intent** — cashier expects the customer to pay LESS by the redeemed amount. → See §10.1 for the resolved approach.

### Option A-resolved — Redeem during collect-bill submit, BEFORE payment gateway, AFTER cashier confirms intent (HYBRID — actual recommendation)

```
1. Cashier ticks loyalty → POS computes eligible_amount and points_to_redeem,
   generates idempotency_key K1. UI shows "₹X will apply".
2. Cashier reviews discounted total, clicks Pay.
3. POS calls /pos/loyalty/redeem first (CRM debits points, returns redemption_id).
   ├─ 200 → POS proceeds to payment gateway with the discounted amount.
   │   ├─ Payment SUCCESS → bill closes with redemption_id in payload. Done.
   │   └─ Payment FAILURE → [orphan_warning]:
   │       - Points debited on CRM.
   │       - Customer has not paid (no funds transferred).
   │       - Cashier sees persistent banner: "Loyalty was redeemed but payment
   │         failed. Customer owes ₹X (discounted) OR ₹X+redeem_amount (full).
   │         Admin must reconcile. redemption_id: red_xxx. order: ord_xxx."
   │       - localStorage record persisted; banner survives refresh.
   │       - Cashier prompted to retry payment OR mark for admin reconciliation.
   └─ error → [redeem_error]: do not proceed to payment; cashier sees inline
              "Redemption failed: <reason>. Please retry or pay without loyalty."
```

This is **the actual recommendation** because it gives the cashier the correct discounted bill to charge.

### Option B — Redeem BEFORE payment submit (rejected)

Same as A-resolved but with redeem fired even earlier (before cashier reviews discounted total). Adds no value; A-resolved is the same flow with cashier review step intact.

### Option C — Redeem during collect-bill finalization (rejected)

Equivalent to A-resolved if "finalization" = pre-gateway call. Same flow.

### Decision

**Recommended: A-resolved** — redeem fires after cashier confirms intent (clicks Pay) but BEFORE payment gateway. This:
- Gives correct discounted total to customer.
- Has a single clear failure mode (payment fails after debit → orphan-warning + manual admin reconciliation).
- Minimizes the orphan-debit window (debit → payment is typically < 5 s).
- Requires no reverse endpoint.

Owner Q1 (§19) asks for explicit confirmation. Recommended: **A** (which in our taxonomy = A-resolved above; we will document this as the chosen path on owner approval).

---

## 11. Failure Handling Without Reverse (Scope D)

Because reverse API is deferred, **the only safety net is operational discipline + admin manual recovery**.

### 11.1 Failure cases and handling

| # | Case | POS handling |
|---|------|--------------|
| 1 | **Redeem API fails** (4xx/5xx, network drop, timeout) | Do NOT apply discount. State returns to `[redeem_error]`. Cashier sees inline red error. No points debited (atomicity contract). Cashier can retry (same `idempotency_key`) or pay without loyalty. |
| 2 | **Redeem succeeds, then payment gateway fails** | Persistent yellow banner `[orphan_warning]`: "Loyalty redeemed but payment failed. redemption_id={X}. order_id={Y}. Customer owes {Z}. Admin reconciliation required." Record persisted to `localStorage[bug108_loyalty_orphan_debits]`. Banner survives refresh. Cashier can retry payment (same redemption_id reused) or escalate. |
| 3 | **Redeem succeeds, payment succeeds, order/settlement payload fails** | Same as #2 — orphan-warning banner with redemption_id and order ref; admin reconciles. |
| 4 | **Cashier closes browser between redeem and payment** | On next session, localStorage record surfaces as a persistent banner on app load. Cashier sees unresolved orphan debit; routed to admin reconciliation. |
| 5 | **Order cancelled AFTER successful redeem + payment** | Cancellation proceeds (existing flow). **No automatic reverse.** Cancel UI surfaces a non-blocking banner: "This order had loyalty redemption (redemption_id={X}, {N} pts). Customer's points are NOT refunded automatically — admin must adjust manually." Logged. |
| 6 | **Partial refund** | Same as #5 — out of scope; admin manual reconciliation. |
| 7 | **Duplicate redeem on same order (race)** | CRM returns 409 `duplicate_redemption_for_order`; POS surfaces "Loyalty already redeemed for this order." |
| 8 | **API timeout (no response)** | POS retries ONCE with the SAME `idempotency_key`. If second call also times out, state moves to `[orphan_warning]` (treat as "we don't know"; admin verifies CRM ledger). |

### 11.2 No silent retry without idempotency

Any retry uses the **same** `idempotency_key` generated at `[redeem_armed]`. New keys are NEVER generated for the same logical user intent. This guarantees CRM cannot double-debit.

### 11.3 redemption_id surfaced visibly

- Inline in CollectPaymentPanel during `[redeemed]`: "₹X applied (Y pts) · redemption_id ABCD".
- On printed receipt (line below tax): "Loyalty: -₹X (Y pts) · ref ABCD".
- In `localStorage.bug108_loyalty_orphan_debits` records (for warning persistence).
- In `loyalty_redemption_id` field on the bill-payment / settlement payload (so POS backend logs it).

### 11.4 Admin recovery path

Out of scope for POS code, but documented for admin:
1. CRM admin UI surfaces `loyalty_audit_ledger` rows.
2. Admin manually creates a compensating audit entry (`event_type='manual_credit'`, `points_delta=+N`, linked to original `redemption_id`).
3. Customer balance restored.

This is a CRM-side operational tool, not a POS endpoint. Listed here only to close the loop on the failure handling story.

---

## 12. Idempotency Plan

| Concern | Approach |
|---------|----------|
| Key generation | UUID v4 generated client-side at the moment cashier ticks the loyalty checkbox (`[idle] → [redeem_armed]`). Stored in component state for the duration of the order. |
| Key reuse | Same key reused for any retry of the SAME logical intent (including silent retry on timeout). |
| Key rotation | New key generated only when cashier unticks then re-ticks the checkbox (= new logical intent). |
| Server-side | CRM idempotency table `(restaurant_id, idempotency_key)` unique; duplicate call returns the original response with `error_code: 'idempotency_replay'` mapped to 200 at client. |
| Concurrency-safe | Client double-click guarded; server row-locks customer balance. |
| Persistence | `idempotency_key` persisted in localStorage with order ref so a page refresh between redeem and payment doesn't generate a duplicate. |
| TTL | Server-side 7 days. After 7 days, a replay with the same key creates a new operation (extremely rare). |

---

## 13. Audit / Data Mutation Plan

### 13.1 What gets mutated (CRM-side; POS does not write to CRM data directly)

| Table | Mutation |
|-------|----------|
| `customer.total_points` | Decremented atomically on commit |
| `loyalty_redemptions` | One row inserted per redeem (`redemption_id`, `state='committed'`) |
| `loyalty_audit_ledger` | One row inserted per redeem (`event_type='redeem'`, signed `points_delta`, `balance_after_points`) |
| `loyalty_idempotency` | One row inserted per unique `(restaurant_id, idempotency_key)` |

### 13.2 What does NOT get mutated

- No reverse rows (no reverse endpoint).
- No coupon tables.
- No wallet tables.
- No POS-side database writes outside the existing bill-payment / settlement flow.
- `/app/memory/final/` — untouched.
- Baseline docs — untouched.

### 13.3 Audit ledger schema (CRM-side; commit-only subset for this phase)

```sql
CREATE TABLE loyalty_audit_ledger (
  audit_id              UUID PRIMARY KEY,
  restaurant_id         UUID NOT NULL,
  customer_id           UUID NOT NULL,
  event_type            TEXT NOT NULL CHECK (event_type IN ('redeem','accrual','manual_credit','manual_debit')),
  redemption_id         UUID,
  points_delta          INTEGER NOT NULL,        -- negative for redeem
  amount_delta          NUMERIC(10,2) NOT NULL,  -- negative for redeem
  balance_after_points  INTEGER NOT NULL,
  balance_after_value   NUMERIC(10,2) NOT NULL,
  order_id              TEXT,
  source                TEXT,
  idempotency_key       TEXT INDEXED,
  actor_user_id         UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Note: `event_type` excludes `reverse` and `expire` for this phase — they are not built.

### 13.4 POS-side localStorage records (orphan warnings)

```
localStorage.bug108_loyalty_orphan_debits = [
  {
    redemption_id, customer_id, customer_name, customer_phone,
    order_id, points_redeemed, discount_amount, idempotency_key,
    payment_state: 'failed' | 'gateway_timeout' | 'unknown',
    created_at, last_seen_at
  }
]
```

Banner persists until cashier dismisses (with audit log entry of dismissal).

---

## 14. Calculation + Tax Plan (Scope E)

### 14.1 Inputs (all from CRM 6-key blob already live)

| Variable | Source |
|----------|--------|
| `total_points` | `customer.loyalty.total_points` |
| `points_value` | `customer.loyalty.points_value` |
| `ratio_per_point` | `customer.loyalty.ratio_per_point` |
| `loyalty_enabled` | `customer.loyalty.loyalty_enabled` |
| `itemTotal` | Existing — sum of billable line items pre-discount |
| `manualDiscount` | Existing |
| `presetDiscount` | Existing |

### 14.2 Calculation (pre-tax, RECOMMENDED — owner Q3)

```
eligible_amount      = max(0, itemTotal - manualDiscount - presetDiscount)
max_redeem_amount    = min(points_value, eligible_amount)
max_redeem_points    = round(max_redeem_amount / ratio_per_point)
                       (capped at total_points)
                       (server re-verifies and may adjust)

If cashier ticks loyalty:
  redeem_amount        = max_redeem_amount      (auto-applied; owner Q2 = A)
  points_to_redeem     = max_redeem_points
  loyaltyDiscount      = redeem_amount

Else:
  loyaltyDiscount      = 0
```

### 14.3 Tax interaction (pre-tax discount slot)

```
subtotalAfterDiscount = max(0, itemTotal - manualDiscount - presetDiscount - loyaltyDiscount)
serviceCharge         = compute on subtotalAfterDiscount (existing; only dine-in / walk-in / room)
tax                   = compute on subtotalAfterDiscount + serviceCharge (existing; per-line GST prorated)
grandTotal            = subtotalAfterDiscount + serviceCharge + tax + tip + deliveryCharge + deliveryGstAmount + packagingCharge
```

No new tax rule. Loyalty slots into existing `totalDiscount` sum at `CollectPaymentPanel.jsx:~522`.

### 14.4 Round-off

- All monetary values rounded to 2 dp via existing `Math.round(... * 100) / 100`.
- `points_to_redeem` always integer (per CRM contract).
- `redeem_amount = points_to_redeem * ratio_per_point` rounded to 2 dp.
- POS-side `redeem_amount` MUST be within ±0.01 of server's recompute (validated).

### 14.5 Edge cases

| Case | Behavior |
|------|----------|
| `points_value === 0` | Checkbox disabled, no API call |
| `loyalty_enabled === false` (from CRM lookup) | Checkbox disabled; helper "Loyalty program unavailable" |
| `manualDiscount ≥ itemTotal` | `eligible_amount = 0`, checkbox effectively no-op (disabled state) |
| Bill amount `0` (free order) | Checkbox disabled |
| Negative `total_points` (data anomaly) | Treat as 0; checkbox disabled |

---

## 15. Payload Mapping Plan

### 15.1 Payload field summary

| Field | Type | Send value | Source |
|-------|------|------------|--------|
| `used_loyalty_point` | int | `points_to_redeem` on success; else `0` | Redeem response `points_redeemed` |
| `loyalty_dicount_amount` (typo intentional) | float | `discount_amount` on success; else `0` | Redeem response `discount_amount` |
| `loyalty_redemption_id` | string (new field) | `redemption_id` on success; else `null` | Redeem response `redemption_id` |

### 15.2 Per-site mapping under redeem-after-confirm sequence

| Site | File:line (approx) | Pre-redeem (redeem_armed) | Post-redeem-success (paid_with_redemption) | Orphan |
|------|--------------------|---------------------------|---------------------------------------------|--------|
| Place Order | `orderTransform.js:908` | `used_loyalty_point: 0`, no redemption field | Stays `0` (Place Order happens before loyalty in this sequence) | n/a |
| Prepaid Payment | `orderTransform.js:1026` | `0` | `points_to_redeem`, `discount_amount`, `redemption_id` (if redeem fired before this) | `0` + warning banner |
| Update Order | `orderTransform.js:1153` | `0` | `0` (update-order doesn't carry redeem fields) | n/a |
| Bill Payment | `orderTransform.js:1356` | `0` | `points_to_redeem`, `discount_amount`, `redemption_id` (PRIMARY carrier) | `0` + warning |
| Print | `orderTransform.js:1768` | `0` | `discount_amount`, plus receipt line "Loyalty: -₹X (Y pts) · ref ABCD" | `0` |

### 15.3 Critical: do NOT correct the typo

`loyalty_dicount_amount` (missing 's' in "discount") matches the existing POS backend field name. Correcting the typo breaks the contract.

### 15.4 Field gating logic (`orderTransform.js`)

```js
// Today (Phase B / Pipeline Fix):
const usedLoyaltyPoint  = BUG108_FLAGS.loyaltyRatioLive ? (discounts.loyaltyPoints || 0) : 0;
const loyaltyDicountAmt = BUG108_FLAGS.loyaltyRatioLive ? (overrides.loyaltyAmount || 0) : 0;

// After redeem-only Phase C (flag combo):
const redeemActive = BUG108_FLAGS.loyaltyRatioLive
                  && BUG108_FLAGS.loyaltyRedeemLive
                  && redemption?.id
                  && redemption?.state === 'committed';

const usedLoyaltyPoint  = redeemActive ? redemption.points_redeemed   : 0;
const loyaltyDicountAmt = redeemActive ? redemption.discount_amount   : 0;
const loyaltyRedemptionId = redeemActive ? redemption.redemption_id  : null;
```

---

## 16. Feature Flag / Environment Plan

### 16.1 Flags (after this CR ships)

| Flag | Current | C-FE-1 (built but off) | C-FE-2 (preprod live) | Prod |
|------|---------|------------------------|------------------------|------|
| `loyaltyPreviewLive` | `true` | `true` (unchanged) | `true` | `true` (after joint prod batch) |
| `loyaltyRatioLive` | `false` | `false` | `true` (preprod) | TBD (separate sign-off) |
| `loyaltyRedeemLive` (NEW) | n/a | `false` (introduced; OFF) | `true` (preprod) | TBD |
| `couponLive` | `false` | `false` | `false` | `false` (separate CR) |
| `walletDebitLive` | `false` | `false` | `false` | `false` (separate CR) |

`loyaltyRedeemLive` exists as a separate kill-switch from `loyaltyRatioLive` so we can disable the API path independently without removing the math gate. Both must be `true` for redemption to fire.

### 16.2 Environment scoping

- **Local dev**: both flags `false` (default).
- **Preprod**: both flags `true` for joint testing (manual edit + redeploy).
- **Production**: both flags **stay `false`** until separate prod sign-off batch with CR-001A Phase 2 + CR-001D.

### 16.3 No `.env` flag toggling in this CR

Flags live in `src/utils/BUG108_FLAGS.js`. Toggling preprod requires a build-time change + redeploy. (Future enhancement could surface via `process.env.REACT_APP_LOYALTY_REDEEM_LIVE` — not in scope.)

---

## 17. QA Plan (Scope F — Preprod)

### 17.1 Preprod readiness checklist

- [ ] CRM preprod has `POST /api/pos/loyalty/redeem` deployed
- [ ] `loyalty_redemptions`, `loyalty_audit_ledger`, `loyalty_idempotency` tables migrated on preprod
- [ ] Preprod test restaurant seeded with:
  - Bronze customer (120 pts, ratio 0.25, value ₹30)
  - Silver customer (620 pts, ratio 1.0, value ₹620)
  - Gold customer (480 pts, ratio 1.5, value ₹720)
  - Customer with 0 pts (boundary)
  - Customer with `loyalty_enabled=false` (boundary)
- [ ] POS preprod build deployed with `loyaltyRatioLive=true`, `loyaltyRedeemLive=true`
- [ ] POS preprod has valid `X-API-Key` via existing login flow
- [ ] Postman / curl collection for redeem endpoint delivered
- [ ] CRM-side query tool for `loyalty_audit_ledger` available to QA (manual SQL or admin UI)

### 17.2 Real-transaction QA matrix (must all PASS before owner smoke)

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Bronze (120 pts) bill ₹1000 → tick loyalty → click Pay | Redeem fires, 120 pts debited, ₹30 discount, customer pays ₹970 (pre-tax view), payload carries `used_loyalty_point=120 loyalty_dicount_amount=30 loyalty_redemption_id=red_xxx`. CRM ledger row exists. Remaining = 0 pts. |
| 2 | Silver (620 pts) bill ₹400 | Capped at ₹400; `points_to_redeem=400`, `discount_amount=400`; customer pays ₹0 (excluding tax). Remaining = 220 pts. |
| 3 | Gold (480 pts, ratio 1.5) bill ₹500 | Capped at ₹500 by subtotal; `points_to_redeem=334` (server-rounded via `ceil(500/1.5)` or `floor` per server policy — confirm in QA), `discount_amount` matches server's recompute. |
| 4 | Customer with 0 pts | Checkbox disabled. No API call possible. |
| 5 | Customer with `loyalty_enabled=false` | Checkbox disabled; helper "Loyalty program unavailable". No API call. |
| 6 | Tick → un-tick (before payment) | No API call fired. State returns `[idle]`. |
| 7 | Tick → click Pay → CRM 500 timeout | Single retry with same `idempotency_key`. If still fails → `[orphan_warning]` state with banner. Payment NOT submitted. Cashier can retry or pay without loyalty. |
| 8 | Double-click Pay rapidly | Only one redeem API call fires. Idempotency guard on server confirms exactly one ledger row. |
| 9 | Redeem succeeds, payment fails | `[orphan_warning]` banner appears, redemption_id surfaced, localStorage record persisted. Page refresh — banner persists. |
| 10 | Redeem succeeds, settlement payload fails (network drop after gateway success) | Same as #9; banner; admin must reconcile. |
| 11 | Insufficient points: cashier requests 200 pts for a Bronze (120 pts) | Server returns 422 `insufficient_points` with `remaining_points=120` in body. POS shows inline "You only have 120 pts." State returns `[redeem_error]`. |
| 12 | Concurrent redeem on two devices (same customer, same time) | One device gets 200, other gets 422 `insufficient_points` or `duplicate_redemption_for_order`. No double debit. |
| 13 | Cashier closes browser between redeem and payment | On reopen, localStorage banner shows orphan record. |
| 14 | Order cancelled post-payment with active redemption | Cancel proceeds; warning banner appears: "This order had loyalty redemption — NOT reversed automatically. Admin must adjust." |
| 15 | Manual discount + loyalty (additive) | Both apply; tax computed on post-both subtotal. |
| 16 | Preset discount + loyalty | Additive (existing). |
| 17 | Service charge | Computed on post-discount subtotal (existing). |
| 18 | GST / VAT | Prorated on post-loyalty subtotal (existing). |
| 19 | Round-off | No negative grand totals; no off-by-one paise. |
| 20 | Print receipt | Shows "Loyalty: -₹X (Y pts) · ref ABCD". |
| 21 | Room-service inline mirror | All above repeat identically; mirror reads same state. |
| 22 | Phase B fallback (`loyaltyRedeemLive=false`) | Behavior identical to today's preview-only Phase B. Owner smoke from 2026-05-23 still passes. |
| 23 | `idempotency_replay` (deliberate dupe `idempotency_key`) | CRM returns cached response; POS UI shows same `[redeemed]` state without double debit. CRM ledger has exactly one row. |
| 24 | Coupon section | Still "Coming soon" (`couponLive=false`); no interaction with loyalty. |
| 25 | Wallet section | Still disabled (`walletDebitLive=false`); no interaction. |
| 26 | Phase B regression: Sapna typeahead + table re-engage + CustomerModal save flows | All Phase B smoke tests still PASS. |
| 27 | Payload verification: bill-payment payload to POS backend | Confirms `used_loyalty_point`, `loyalty_dicount_amount`, `loyalty_redemption_id` carry redeem values. Other unrelated fields unchanged. |
| 28 | CRM remaining balance | `GET /pos/customer-lookup` for the customer post-redeem shows `total_points` decreased by the redeemed amount. Confirms server is source of truth. |
| 29 | Audit record verification (manual SQL on preprod) | One row per redeem in `loyalty_audit_ledger` with correct `points_delta`, `balance_after_points`, `idempotency_key`, `order_id`, `source`. |
| 30 | `amount_mismatch` test (POS sends inconsistent `redeem_amount`) | Server returns 422 `amount_mismatch`; POS shows server's amount and offers retry. |
| 31 | `loyalty_disabled` test (restaurant flag off) | Server returns 422 `loyalty_disabled`; POS hides loyalty UI for that restaurant. |
| 32 | Negative cap test: bill `0` (free order) | Checkbox disabled. |

### 17.3 Owner smoke (after QA matrix passes)

Same matrix narrowed to: rows 1, 2, 7, 9, 11, 15, 20, 21, 22, 26 — owner runs through these in person on preprod with a small set of real transactions.

---

## 18. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| R1 | CRM double-debit on concurrent calls | Low | High | Row-level lock + idempotency table + concurrency unit test |
| R2 | Orphan debit (redeem succeeds, payment fails) | **Med** | **Med-High** | Persistent banner + localStorage record + admin manual recovery path documented. Accepted risk per owner correction. |
| R3 | Cashier confusion when reverse not available | Med | Low-Med | UI explicitly says "Loyalty already redeemed — admin must adjust" on orphan/cancel cases; no false hope of automatic reverse. |
| R4 | Tax math drift | Low | High | Phase C2 keeps math identical to Phase B; only `loyaltyDiscount` value changes; existing tax tests cover. |
| R5 | Phase B regression | Low | High | C-FE-1 build with `loyaltyRedeemLive=false` MUST match Phase B owner smoke exactly. |
| R6 | Network drop mid-redeem → ambiguous state | Low-Med | Med | Idempotency key + single retry on timeout + `[orphan_warning]` fallback if both calls time out. |
| R7 | CRM `ratio_per_point` drift between read and redeem | Low | Med | Both sides call the same `core.loyalty.build_pos_loyalty_blob` helper per CRM handoff §2. |
| R8 | Print receipt regression | Low | Low | Visual diff + new line conditionally added. |
| R9 | Owner-deferred reverse becomes a frequent ops issue | Med (over weeks) | Low (per-incident) | Monitor `loyalty_orphan_debits` localStorage records and admin reconciliation queue; escalate to owner if >1% of redemptions need manual fix. |
| R10 | Preprod test customers polluted by repeated runs | High | Low | Per-run unique `idempotency_key`s; seed-reset script available; one customer per tier set aside for QA. |

---

## 19. Owner Questions

Only the minimum set required to unblock redeem-only preprod implementation.

**Q1. Redeem timing (which sequence?)**
- A. Redeem AFTER cashier confirms intent and BEFORE payment gateway (A-resolved in §10). Cashier sees discounted total; orphan-warning only fires if payment fails after debit. ← **RECOMMENDED**
- B. Redeem BEFORE cashier confirms (auto-apply at checkbox tick). Adds no value vs A.
- C. Redeem AFTER payment gateway success (cleanest no-orphan, but customer paid full bill and discount becomes a CRM-side credit only — wrong cashier UX).

**Q2. Redemption amount (how much by default?)**
- A. Apply max available capped amount (`min(points_value, subtotal_after_other_discounts)`) ← **RECOMMENDED** (matches Phase B preview math; simplest UI)
- B. Cashier enters amount/points (extra input UI; more flexible)
- C. Both (toggleable)

**Q3. Loyalty discount treatment in calculation order**
- A. Before tax (slots into existing `totalDiscount` math at `CollectPaymentPanel.jsx:~522`) ← **RECOMMENDED** (matches current preview math; minimal disruption)
- B. After tax (changes effective tax base; requires more rework)
- C. Follow current POS discount convention (= A; same outcome)

**Q4. If redeem succeeds but payment / order submit fails**
- A. Show persistent manual-recovery warning banner with `redemption_id`, persist to localStorage, log for admin reconciliation ← **RECOMMENDED** (only viable option without reverse)
- B. Auto-refund later when reverse exists (deferred; not in this CR)
- C. Block this flow entirely (would cripple the feature)

**Q5. Production release**
- A. NOT approved until preprod QA matrix passes + owner preprod smoke passes ← **RECOMMENDED**
- B. Approved after build (rejected — preprod gate is non-negotiable)

---

## 20. Implementation Readiness Verdict

```
split_backend_frontend_required
```

Sub-status:
- **CRM redeem API (Scope A — §8)**: Ready for CRM team to scope, ticket, and implement. Full spec provided. **Owner Q1–Q5 answers do NOT block CRM scoping** — the contract is independent of the sequence choice. CRM team can begin immediately.
- **POS frontend kill-switched wiring (C-FE-1)**: Ready to start in parallel — `loyaltyRedeemLive=false` everywhere, service stub throws "API not ready", UI state machine + legacy field cleanup + payload field plumbing. Build PASS gate. **Awaits owner Q1–Q5 answers before merge.**
- **POS frontend live wiring (C-FE-2)**: Blocked on (a) CRM redeem API live on preprod, (b) owner Q1–Q5 answers, (c) C-FE-1 merged.
- **Joint preprod QA (C-QA-1)**: Blocked on C-FE-2 + CRM preprod readiness checklist (§17.1).
- **Owner preprod smoke (C-OWNER-1)**: Blocked on C-QA-1 pass.
- **Production release**: Out of this CR's scope; gated separately.

To advance to `ready_for_redeem_only_preprod_implementation`, owner must answer Q1–Q5.

---

## 21. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No code changed in this planning pass | Confirmed |
| 2 | No backend changed in this planning pass (CRM redeem API is scoped, not built) | Confirmed |
| 3 | No data mutated in this planning pass | Confirmed |
| 4 | Reverse API explicitly deferred — not designed, not implemented, not blocking | Confirmed |
| 5 | Coupon API explicitly out of scope | Confirmed |
| 6 | Wallet API explicitly out of scope | Confirmed |
| 7 | `/app/memory/final/` untouched | Confirmed |
| 8 | Baseline docs untouched | Confirmed |
| 9 | Phase B work intact (read-only preview + customer pipeline + CustomerModal parity all preserved) | Confirmed |
| 10 | This plan supersedes the prior "Full Preprod Implementation Plan" only insofar as the reverse-API requirement is reverted to deferred; other §§ (calc, payload, audit, idempotency) carry forward in narrower form | Confirmed |
| 11 | Failure handling explicitly designed for no-reverse world (manual recovery + persistent warning + localStorage record) | Confirmed |
| 12 | No silent retry without idempotency | Confirmed |
| 13 | Production release explicitly outside this CR | Confirmed |

---

**End of BUG-108 Loyalty Phase C Redeem-Only Preprod Plan.**
