# POS 3.0 BUG-108 — Loyalty Phase C Redemption Plan

**Date:** 2026-05-23
**Sprint:** POS 3.0 — BUG-108 continues
**Status:** `bug_108_loyalty_phase_c_redemption_planned_waiting_owner_and_backend_api_approval`

---

## 1. Status

```
bug_108_loyalty_phase_c_redemption_planned_waiting_owner_and_backend_api_approval
```

**Implementation readiness verdict:** `backend_blocked` for live redemption (Phase C3). Phase C1 (frontend planning + backend handoff) ready now; Phase C2 (gated UI) can start after owner answers; Phase C3 (live redemption) blocked on backend delivering `POST /pos/loyalty/redeem` and `POST /pos/loyalty/reverse`.

---

## 2. Phase B Closure Summary

Phase B passed owner smoke on 2026-05-23 (`POS3_0_BUG_108_LOYALTY_PHASE_B_OWNER_SMOKE_PASS_REPORT_2026_05_23.md`). Read-only preview + customer pipeline + CustomerModal search parity + Option C all live. **BUG-108 is NOT fully closed** — real redemption is the remaining Phase C deliverable, and coupon + wallet remain parked as separate CRs.

---

## 3. Phase C Scope

Enable real loyalty redemption end-to-end while keeping Phase B's read-only preview behavior intact when the new flag is OFF.

In scope:
- Flag flip plan (`loyaltyRatioLive: false → true`) — gated, reversible.
- Cashier interaction: enable the loyalty checkbox/action that was disabled in Phase B.
- Math contract: loyalty discount applies pre-tax, capped, mutex with rules below.
- Payload routing: `used_loyalty_point` and `loyalty_dicount_amount` populated when redemption is committed.
- New CRM calls: `POST /pos/loyalty/redeem` (reserve/commit) + `POST /pos/loyalty/reverse` (rollback).
- Idempotency keys, retry policy, double-click guard, inline error rendering.
- Failure / rollback orchestration: payment fail after redemption → auto-reverse.
- Tax interaction & round-off verification.
- QA matrix.

Out of scope:
- Coupon API (separate CR).
- Wallet debit (separate CR; `walletDebitLive` stays false).
- Dead-code cleanup (P3).
- Loyalty earn / credit (CRM accrues automatically post-bill, no POS change).
- CRM admin UI for tier/ratio configuration.

---

## 4. Non-Scope (Hard Boundary)

- Coupon remains separate — `couponLive` stays `false` unless its own CR delivers.
- Wallet remains separate — `walletDebitLive` stays `false`.
- Dead-code cleanup parked at P3 (`data/mockCustomers.js`, `data/index.js` re-export, legacy `customer?.loyaltyPoints` singular field — see §5.2 below).
- No backend implementation by this agent — backend team must deliver the two new endpoints per the handoff doc.
- No accounting/GL changes — assumes CRM ledger handles points debit/credit.
- No new feature flags besides flipping the existing `loyaltyRatioLive`.

---

## 5. Current Code Inventory

### 5.1 What's already in place (from Phase B)

| Asset | Location | State |
|-------|----------|-------|
| `BUG108_FLAGS.loyaltyRatioLive` | `src/utils/BUG108_FLAGS.js:25` | `false` — controls payload force-zero + checkbox enable |
| `BUG108_FLAGS.loyaltyPreviewLive` | `src/utils/BUG108_FLAGS.js:26` | `true` — Phase B preview render |
| `loyaltyDiscount` math | `CollectPaymentPanel.jsx:507-509` | Gated by `loyaltyRatioLive`; currently returns 0 |
| `useLoyalty` checkbox state | `CollectPaymentPanel.jsx` | Toggles `useLoyalty`; `disabled={!loyaltyRatioLive || !displayPoints}` |
| `customer.loyalty` synthetic blob | `customerTransform.js:22-30` (`buildSyntheticLoyalty`) | `{ tier, tier_label, total_points, points_value, ratio_per_point, loyalty_enabled: true }` |
| Preview math (display-only) | `CollectPaymentPanel.jsx:1037-1041` (standard) + `1550-1554` (room mirror) | `previewAmount = min(displayValue, itemTotal - manualDiscount - presetDiscount)` |
| Helper text | `BUG108_COPY.loyaltyPreviewHelper` | "Redemption will be enabled in a future update." |
| Room-service inline mirror | `CollectPaymentPanel.jsx:1544-1582` | Reads same `customer` prop; parity confirmed |

### 5.2 What's broken / outdated that Phase C2 must fix

| Issue | Where | Fix |
|-------|-------|-----|
| `customer?.loyaltyPoints` (singular) — never set post-Phase B | `CollectPaymentPanel.jsx:507`, `:1795`, `:720`, `:781`, `:1617` | Replace with `customer?.loyalty?.points_value \|\| customer?.pointsValue` (matches Phase B contract) |
| Hard-coded zeros at `orderTransform.js:908, 1026, 1153` (place-order, prepaid, update-order) | These three payload sites never flip even when `loyaltyRatioLive=true` | Convert to `BUG108_FLAGS.loyaltyRatioLive ? (discounts.loyaltyPoints \|\| 0) : 0`, matching the bill-payment site at L1356 — but ONLY do so if the order-create path also debits loyalty (depends on Q3 timing decision below) |
| No idempotency key in payload | `orderTransform.js` payloads | Add `idempotency_key` + `loyalty_redemption_id` when committed |

### 5.3 Files Phase C2/C3 will need to touch (forecast)

1. `src/utils/BUG108_FLAGS.js` — flag flip + optional `loyaltyRedeemLive` two-stage flag if needed.
2. `src/api/services/loyaltyService.js` (NEW) — `redeemLoyalty`, `reverseLoyalty` wrappers.
3. `src/api/transforms/loyaltyTransform.js` (NEW) — request/response shape mappers.
4. `src/components/order-entry/CollectPaymentPanel.jsx` — wire checkbox to redemption call, fix `loyaltyPoints` field references, add loading/error states, add reverse-on-payment-fail orchestration.
5. `src/api/transforms/orderTransform.js` — populate `used_loyalty_point` + `loyalty_dicount_amount` fields when redemption succeeded.

Total: 5 files, all frontend.

---

## 6. Current Payload Inventory

| Endpoint | Where (file:line) | Field state today |
|----------|-------------------|-------------------|
| **Place Order** | `orderTransform.js:895-921` | `used_loyalty_point: 0` (hardcoded) · `use_wallet_balance: 0` · `coupon_discount: 0` |
| **Prepaid Payment** | `orderTransform.js:1018-1027` | Same — all zeros hardcoded |
| **Update Order** | `orderTransform.js:1146-1154` | `coupon_discount: discounts.coupon \|\| 0` · `used_loyalty_point: 0` (hardcoded) · `use_wallet_balance: 0` |
| **Bill Payment (Collect Bill)** | `orderTransform.js:1340-1357` | All three flag-gated: `coupon_discount: couponLive ? ... : 0` · `used_loyalty_point: loyaltyRatioLive ? ... : 0` · `use_wallet_balance: walletDebitLive ? ... : 0` |
| **Print payload** | `orderTransform.js:1768` | `loyalty_dicount_amount: loyaltyRatioLive ? overrides.loyaltyAmount : 0` |

**Implication:** the Bill Payment path is already wired for live redemption (just flip the flag). The other three (place / prepaid / update) need the same treatment if redemption can land before the bill-payment step (see Q3).

---

## 7. Loyalty Calculation Plan

### 7.1 Inputs

| Variable | Source |
|----------|--------|
| `total_points` | `customer.loyalty.total_points` (synthetic blob) |
| `points_value` | `customer.loyalty.points_value` (₹ equivalent computed by CRM as `round(total_points * ratio_per_point, 2)`) |
| `ratio_per_point` | `customer.loyalty.ratio_per_point` |
| `itemTotal` | `CollectPaymentPanel.jsx` — sum of billable line items pre-discount |
| `manualDiscount` | Existing |
| `presetDiscount` | Existing |
| `couponDiscount` | Always 0 in Phase C (couponLive=false) |

### 7.2 Capping formula (recommendation; owner Q2 decides)

```
maxRedeemableAmount  = min(points_value, itemTotal - manualDiscount - presetDiscount)
maxRedeemablePoints  = round(maxRedeemableAmount / ratio_per_point)
loyaltyDiscount      = useLoyalty ? maxRedeemableAmount : 0
loyaltyPointsRedeemed = useLoyalty ? maxRedeemablePoints : 0
```

This is the **before-tax** flavor (owner Q1=A recommended), so:

```
subtotalAfterDiscount = max(0, itemTotal - manualDiscount - presetDiscount - loyaltyDiscount)
serviceCharge         = compute on subtotalAfterDiscount (existing)
tax                   = compute on subtotalAfterDiscount + serviceCharge (existing)
grandTotal            = subtotalAfterDiscount + serviceCharge + tax + tip + deliveryCharge
```

No new tax rule. Loyalty discount slots into the existing `totalDiscount` sum (`CollectPaymentPanel.jsx:522`).

### 7.3 Edge cases

- `points_value === 0` → checkbox stays disabled even with `loyaltyRatioLive=true`.
- `loyalty_enabled === false` → checkbox stays disabled; helper = "Loyalty program unavailable".
- Manual discount >= itemTotal → capped at 0; checkbox effectively no-op.
- Round-off: `maxRedeemableAmount` rounded to 2 dp; points always integer (per CRM contract).

---

## 8. Tax / Discount Interaction Analysis

### 8.1 Order of operations (today, existing code)

```
itemTotal
  - manualDiscount
  - presetDiscount
  - loyaltyDiscount   ← Phase C activates this
  - couponDiscount     (always 0 today)
  - walletDiscount     (always 0 today; wallet is a discount-shaped payment method here)
= subtotalAfterDiscount
+ serviceCharge       (% of subtotalAfterDiscount, dine-in / walk-in / room only)
+ tax (SGST + CGST + VAT — per-line GST prorated by `discountRatio` against the new subtotal)
+ tip
+ deliveryCharge
+ deliveryGstAmount
+ packagingCharge
= grandTotal
```

### 8.2 Combinatorial table

| Combination | Allowed in Phase C? | Reason |
|-------------|---------------------|--------|
| manual + loyalty | **Default A (no, mutex)** but owner Q6 decides — current math at L507 sums them, so flipping to "allow combine" is the no-op path. Recommendation: keep current additive (combine) unless owner picks Q6=A. | Phase B never enabled redemption, so behavior here is fresh territory. Additive matches the math already in place. |
| coupon + loyalty | N/A (coupon disabled) | `couponLive=false` |
| loyalty + wallet | N/A (wallet disabled) | `walletDebitLive=false` |
| preset + loyalty | YES (additive, current behavior) | Preset is a member-tier auto-discount, complements loyalty |
| service charge applies on the post-loyalty subtotal | YES (existing) | No new SC rule |
| GST/VAT computed on post-loyalty subtotal | YES (existing) | Standard "discount before tax" |

### 8.3 Round-off

Existing `Math.round(... * 100) / 100` (2 dp) used throughout. Loyalty math follows the same precision. Final `grandTotal` rounding unchanged.

---

## 9. API Contract Needed

### 9.1 Redemption (commit / reserve)

| Field | Value |
|-------|-------|
| Method + Path | `POST /pos/loyalty/redeem` |
| Auth | `X-API-Key: <crm_token>` (same header as other CRM calls) |

Request body:
```json
{
  "restaurant_id":        "rest_xxx",
  "customer_id":          "bc92911c-...",
  "customer_phone":       "9004020412",
  "order_id":             "ord_yyy",            // or temp ref if pre-place
  "temp_order_reference": null,                  // mutually exclusive with order_id
  "bill_amount":          1250.00,               // grandTotal at redemption time
  "points_to_redeem":     86,
  "redeem_amount":        86.00,                 // rupee equivalent at current ratio
  "idempotency_key":      "uuid-v4-...",
  "source":               "pos_collect_bill"     // pos_collect_bill | pos_prepaid | room_service
}
```

Response (200):
```json
{
  "success":         true,
  "redemption_id":   "red_zzz",
  "points_redeemed": 86,
  "discount_amount": 86.00,
  "remaining_points": 0,
  "ratio_per_point": 1.0,
  "message":         "Redemption successful"
}
```

Error responses: 400 (invalid points / phone), 404 (customer not found), 409 (idempotency replay returns original `redemption_id`), 422 (insufficient points), 500.

### 9.2 Reverse / Rollback

| Field | Value |
|-------|-------|
| Method + Path | `POST /pos/loyalty/reverse` |
| Auth | `X-API-Key` |

Request:
```json
{
  "restaurant_id":   "rest_xxx",
  "customer_id":     "bc92911c-...",
  "redemption_id":   "red_zzz",
  "order_id":        "ord_yyy",
  "reason":          "payment_failed",          // payment_failed | order_cancelled | manual
  "idempotency_key": "uuid-v4-..."
}
```

Response (200):
```json
{
  "success":            true,
  "reversal_id":        "rev_aaa",
  "points_restored":    86,
  "new_total_points":   86,
  "message":            "Reversal complete"
}
```

### 9.3 Acceptance criteria for CRM contract

- Both endpoints idempotent on `idempotency_key` (replay returns first response, not duplicate ledger entries).
- Atomic: redemption either fully debits or fully fails — no partial point debits.
- `remaining_points` returned so POS can re-render preview after redemption without a second `lookupCustomer` call.
- Reverse is total — partial reversal not in Phase C scope.
- Health check: `GET /pos/loyalty/health` returning 200 (optional, for boot probe).

---

## 10. Backend Gap List

| ID | Gap | Severity | Action |
|----|-----|----------|--------|
| **GAP-C1** | `POST /pos/loyalty/redeem` does not exist | **BLOCKER** | Backend must build per §9.1 |
| **GAP-C2** | `POST /pos/loyalty/reverse` does not exist | **BLOCKER** | Backend must build per §9.2 |
| **GAP-C3** | `customer.loyalty` blob does not carry `loyalty_enabled` (POS defaults `true`) | **WARNING** | Backend should add real value to `customerLookup` + `searchResult` |
| **GAP-C4** | No `max_usable_points` / `max_usable_amount` documented (carried from Phase B GAP-L7) | **WARNING** | Backend should clarify per-restaurant cap policy |
| **GAP-C5** | `ratio_per_point` per tier — is it server-canonical or POS-derived? | **WARNING** | Confirm: POS currently divides `points_value / total_points` as fallback; backend should be source of truth |
| **GAP-C6** | Idempotency replay semantics not documented | **WARNING** | Backend must return original response on duplicate `idempotency_key` |
| **GAP-C7** | Health endpoint `GET /pos/loyalty/health` | **OPTIONAL** | Useful for POS boot to determine if Phase C flag should be on |
| **GAP-C8** | What happens if order is cancelled AFTER bill payment? | **WARNING** | Need order-cancellation hook to call `reverse` — current POS cancel-order flow does not know about redemptions |

---

## 11. Failure / Rollback Plan

### 11.1 Sequence diagram (Phase C3 recommended — owner Q3=C "reserve before, confirm after")

```
1. Cashier ticks Loyalty checkbox → POS computes maxRedeemableAmount / points
2. POS calls POST /pos/loyalty/redeem with source=pos_collect_bill, idempotency_key=K1
   ├─ 200 success → store redemption_id locally, mark `redemptionStaged=true`
   ├─ 4xx/5xx     → show inline error, leave checkbox unchecked, no payload mutation
3. Cashier clicks Pay (or partial payment)
4. POS calls POST /bill-payment with used_loyalty_point + loyalty_dicount_amount + loyalty_redemption_id
   ├─ 200 success → done; render receipt with loyalty section
   ├─ 4xx/5xx     → enter REVERSE FLOW (step 5)
   ├─ network err → enter REVERSE FLOW with retry policy
5. REVERSE FLOW: POS calls POST /pos/loyalty/reverse with reason="payment_failed", idempotency_key=K2
   ├─ 200 → toast "Loyalty points refunded", reset state
   ├─ 4xx/5xx → P0 escalation banner "Loyalty rollback failed — contact support, redemption_id=...";
                store unresolved-reversal record in localStorage; expose retry button
```

### 11.2 If payment succeeds but redemption fails (Q3=A path)

If owner chooses **Q3=A (redeem only after payment success)**, the failure mode inverts:

```
1. Payment succeeds.
2. POS calls /pos/loyalty/redeem.
3. If redemption fails — payment already settled. Options:
   a. Show non-blocking toast "Loyalty points couldn't be redeemed for this bill — they remain on the account"
   b. Auto-retry up to N times with exponential backoff
   c. Log to a "pending redemptions" tray for manual retry
```

Recommendation: Q3=A is simpler but cashier-visible failures are worse UX. Q3=C is more robust but requires backend `redeem` to support reservation semantics.

### 11.3 If order is cancelled / refunded post-bill-payment

- POS cancel-order flow today does NOT call any CRM hook. Must add: if `orderData.loyalty_redemption_id` is set, call `reverse(reason='order_cancelled')`.
- Refund flow same — partial refund unsupported in Phase C (CRM has no partial reverse); full refund reverses full redemption.

---

## 12. Idempotency Plan

| Step | Idempotency key source |
|------|------------------------|
| Redeem | `uuid v4` generated client-side at the moment the cashier ticks the checkbox; stored in component state for the duration of the order |
| Reverse | New `uuid v4` per reverse attempt; stored in unresolved-reversal record if it fails |
| Retry | Same `idempotency_key` for the same logical action — backend returns original response |
| LocalStorage backup | Unresolved-reversal records persisted to `localStorage[bug108_pending_loyalty_reversals]` so a page refresh / restart still surfaces them |

Double-click guard: the redemption checkbox/button is `disabled={loyaltyRedemptionInFlight}` until the API responds.

---

## 13. UI / UX Plan

### 13.1 State machine for the loyalty section

| State | Visual | Cashier action |
|-------|--------|---------------|
| `idle` (Phase C flag on, customer has points) | Checkbox enabled, label "Apply Loyalty", helper "Up to ₹X available" | Tick → moves to `redeeming` |
| `redeeming` | Checkbox disabled + spinner, label "Redeeming…" | (none) |
| `redeemed` | Checkbox ticked + green check, label "₹86 applied (86 pts)", small "Remove" link | Click Remove → reverse |
| `reversing` | Same as `redeeming` | (none) |
| `redeem_error` | Checkbox unchecked, inline red error text | Retry or untick |
| `reverse_error` | Persistent warning banner "Loyalty rollback failed — redemption_id=red_zzz; please contact support" | Retry button |
| `flag_off` (Phase B fallback) | Phase B preview render (read-only, checkbox disabled) | (none) |

### 13.2 Inline errors only

- No duplicate toasts.
- Error rendered inside the loyalty section, beneath the helper text, in red.
- One persistent banner at the top of CollectPaymentPanel ONLY for unresolved reversals (P0 cashier attention required).

### 13.3 Mirror (room-service inline)

Same state machine. Mirror reads `redemptionStaged`, `redemptionId`, etc. from CollectPaymentPanel state (lifted state or context).

### 13.4 Receipt / Print

`loyalty_dicount_amount` field in print payload (line 1768) — already wired, just needs the override to be populated.

---

## 14. Feature Flag Plan

Single-flag flip with safety:

| Flag | Pre-C3 | C3-live | Notes |
|------|--------|---------|-------|
| `loyaltyPreviewLive` | `true` | `true` | Read-only preview remains when redemption is unavailable |
| `loyaltyRatioLive` | `false` | `true` | Controls payload force-zero + checkbox enable |
| **NEW** `loyaltyRedeemLive` (optional) | n/a | `true` | If we want a separate kill-switch for the redeem-API path independent of the math (allows quick rollback to Phase B behavior without removing all the new code) |

Recommendation: introduce `loyaltyRedeemLive` as a separate sub-flag so we can disable redemption API calls instantly without re-deploying. `loyaltyRatioLive` remains the math gate.

---

## 15. Implementation Phase Split

| Phase | Deliverable | Blocked on |
|-------|-------------|-----------|
| **C1** | This planning doc + backend handoff doc + owner Q1–Q8 answers | None — done with this doc |
| **C2** | Frontend implementation with `loyaltyRedeemLive=false`. Wire UI state machine, write service stubs that throw "Backend not live yet", fix `customer.loyaltyPoints` → `customer.loyalty.points_value` deviations, update payload sites at `orderTransform.js:908/1026/1153` to match L1356 pattern. Build PASS, no behavior change in production (flag off). | Owner Q1–Q8 answers |
| **C3** | Live redemption — flip `loyaltyRedeemLive=true` after backend delivers and CRM contract verified end-to-end with a staging restaurant. Owner sign-off required before flip. | Backend delivering GAP-C1 + GAP-C2 + idempotency contract; staging restaurant available |
| **C4** | Owner live smoke + accounting/tax verification. Reconcile a sample day's redeemed points against CRM ledger. Sign off and close BUG-108. | C3 live |

---

## 16. QA Plan

### Phase C2 (gated UI, no backend call)

1. Build PASS.
2. `loyaltyRedeemLive=false` → behavior identical to Phase B (preview only). Owner smoke from 2026-05-23 still passes.
3. `customer.loyaltyPoints` references replaced — no console errors when checkbox would otherwise enable.
4. Place-order / prepaid / update-order payloads carry `used_loyalty_point: 0` while flag is off (matches today).

### Phase C3 (live redemption)

5. Sapna 9004020412 (86 pts) — Standard Collect Bill flow:
   - Tick Loyalty → API call fires with idempotency_key → checkbox shows redeemed state with "₹86 applied".
   - Grand total reduces by ₹86 pre-tax.
   - GST recalculates correctly on post-discount subtotal.
   - Pay → `used_loyalty_point=86`, `loyalty_dicount_amount=86`, `loyalty_redemption_id=red_xxx` in payload.
   - CRM Sapna record shows 0 remaining points after settle.

6. Insufficient points: customer with 5 pts, bill ₹500 → checkbox shows "Apply Loyalty (₹5 available)" → tick → ₹5 applied.

7. Brand-new customer (no loyalty) → checkbox stays disabled — "Loyalty program unavailable" — no API call.

8. `loyalty_enabled: false` from CRM → checkbox disabled.

9. Double-click rapid tick → only one redeem call fires (in-flight guard).

10. Payment fails (mock 500 on bill-payment) → auto-reverse fires → toast + state resets → cashier can retry.

11. Reverse fails after payment fail → persistent banner; reload page → banner persists (from localStorage).

12. Cashier removes loyalty after redeeming → reverse fires → state returns to `idle`.

13. Order cancelled post-bill-payment with active redemption → reverse fires with `reason='order_cancelled'`.

14. Network drop during redeem → retry uses same idempotency_key → backend returns original response.

15. Room-service inline mirror — all the above repeat identically.

16. Manual discount + loyalty (per owner Q6) — additive vs. mutex per owner decision.

17. Preset discount + loyalty — additive (existing behavior).

18. Service charge unaffected by loyalty (% on post-discount subtotal).

19. GST / VAT prorated correctly on post-loyalty subtotal.

20. Round-off to 2 dp — no negative grand totals, no off-by-one paise.

21. Print receipt shows "Loyalty: -₹86 (86 pts)" line.

22. Payload safety regression for Phase B: when `loyaltyRedeemLive=false`, all current Phase B QA cases still pass.

23. Coupon section still disabled (`couponLive=false`).

24. Wallet section still disabled (`walletDebitLive=false`).

25. Manual discount math unchanged (when loyalty checkbox unticked).

---

## 17. Owner Approval Questions

**Q1. Loyalty redemption should apply:**
- **A. Before tax as a discount** (matches existing `totalDiscount` math at `CollectPaymentPanel.jsx:522` — slots in alongside manual/preset) ← **recommended**
- B. After tax as a payment adjustment (changes effective tax base; requires more rework)
- C. Backend decides (POS sends `redeem_amount` and accepts whatever the backend applies)

**Q2. Maximum redeemable amount should be:**
- **A. CRM `points_value` capped at subtotal-after-other-discounts** (matches Phase B preview math: `min(points_value, itemTotal - manualDiscount - presetDiscount)`) ← **recommended**
- B. CRM `points_value` capped at final payable (post tax + SC)
- C. Cashier-entered points capped by CRM total

**Q3. Redemption API timing:**
- A. Redeem only after payment success (simpler; failure mode is "payment settled but points didn't debit")
- B. Redeem before final payment submit (current math-driven approach; failure mode requires reverse-on-payment-fail)
- **C. Reserve before payment, confirm after payment** (2-phase commit; cleanest semantics) ← **recommended IF backend supports reservation**
- If backend supports only one-shot redeem, fall back to **B** with auto-reverse on payment failure.

**Q4. If redemption succeeds but payment fails:**
- **A. Auto-call reverse API** (recommended; matches §11.1) ← **recommended**
- B. Keep redemption, show manual support warning
- C. Block payment retry until reverse succeeds

**Q5. Should cashier choose redeem amount?**
- A. Auto-apply max available (cashier has no control)
- **B. Checkbox applies max available (capped); cashier can untick** ← **recommended for Phase C**
- C. Cashier can enter custom points/amount (more flexible; needs input UI)

**Q6. Should loyalty combine with manual discount?**
- A. No — mutex like coupon vs manual discount (Q10 pattern)
- **B. Yes — additive (matches today's `totalDiscount` math at L522)** ← **recommended unless owner has a policy reason for mutex**

**Q7. Should loyalty combine with coupon when coupon CR ships later?**
- A. No
- B. Yes
- **C. Decide in the coupon CR** ← **recommended (defer)**

**Q8. Should wallet stay deferred?**
- **A. Yes — keep `walletDebitLive=false`** ← **recommended**
- B. No — bundle wallet into Phase C

---

## 18. Backend Handoff Document

Created: `POS3_0_BUG_108_LOYALTY_PHASE_C_BACKEND_API_HANDOFF_2026_05_23.md`

Contains the full API contract from §9 of this plan plus acceptance criteria, error matrix, and a CRM-team checklist.

---

## 19. Implementation Readiness Verdict

```
backend_blocked
```

Sub-status:
- Phase C1 (this doc + backend handoff): **READY now** (just created).
- Phase C2 (gated frontend): **waiting_owner_answers** to Q1–Q8.
- Phase C3 (live redemption): **backend_blocked** on GAP-C1 + GAP-C2.
- Phase C4 (owner smoke): depends on C3.

---

## 20. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No code changed by this plan | Confirmed |
| 2 | No backend changed | Confirmed |
| 3 | No data mutated | Confirmed |
| 4 | No redemption / reverse API invoked | Confirmed |
| 5 | `/app/memory/final/` untouched | Confirmed |
| 6 | Baseline docs untouched | Confirmed |
| 7 | Phase B owner smoke pass not invalidated | Confirmed |
| 8 | BUG-108 remains OPEN (not closed) until Phase C ships and owner smokes | Confirmed |

---

**End of BUG-108 Loyalty Phase C Redemption Plan.**
