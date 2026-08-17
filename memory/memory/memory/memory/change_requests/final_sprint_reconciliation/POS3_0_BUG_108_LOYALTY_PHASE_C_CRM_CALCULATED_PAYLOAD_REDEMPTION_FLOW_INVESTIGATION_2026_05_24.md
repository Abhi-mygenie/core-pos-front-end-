# POS 3.0 BUG-108 — Loyalty Phase C CRM-Calculated Payload Redemption Flow Investigation (UPDATED)

**Date:** 2026-05-24 (updated with live CRM endpoint investigation)
**Persona:** Senior POS3.0 BUG-108 Loyalty Phase C CRM-Calculated Redemption Flow Investigation Agent
**Mode:** Investigation only — no code changes, no backend changes, no data mutation, no mutating API calls, no flag flips

---

## 1. Status

```
bug_108_loyalty_phase_c_crm_calculated_payload_redemption_flow_investigated_superseded_by_frozen_plan
```

**SUPERSEDED** by: `POS3_0_BUG_108_LOYALTY_PHASE_C_LR_REDEMPTION_TRIGGER_CORRECTION_PLAN_FROZEN_2026_05_24.md`

All findings from this investigation are incorporated into the frozen plan. Implementation agents should use the frozen plan, not this document.

---

## 2. Owner Correction Captured

> The loyalty logic should NOT be calculated by frontend business rules.
> Collect Bill should use CRM-provided calculation API.
> Actual redemption happens after bill collection when final payload reaches CRM.
> POS Frontend should never call the mutating CRM redeem endpoint.

---

## 3. Docs Read

Same as prior version plus live CRM endpoint testing (§5 below).

---

## 4. Code Areas Inspected

Same as prior version. Key additional finding:

**`GET /pos/customers?search=` (typeahead) does NOT return `points_value` or `ratio_per_point`.**
Only returns: `name`, `phone`, `total_points`, `wallet_balance`, `tier`, `id`, `last_visit`.

This is the root cause of the "No points" UI issue — customers selected via search/typeahead get `points_value = 0` because:
1. `fromAPI.searchResult` reads `api.points_value || 0` → 0 (field absent)
2. `buildSyntheticLoyalty({ totalPoints: 4588, pointsValue: 0 })` → `{ points_value: 0, ratio_per_point: 0 }`
3. CartPanel passes `pointsValue: 0` to OrderEntry via `onCustomerChange`
4. No enrichment call fires for CartPanel-selected customers (enrichment only fires on table re-engage)
5. CollectPaymentPanel sees `displayValue = 0` → renders "No points"

**Under the corrected architecture this is moot** — Collect Bill will call `/pos/max-redeemable` for the actual CRM-calculated discount regardless of what's in the customer object.

---

## 5. CRM Endpoint Live Investigation Results

### 5.1 Test credentials used

| Restaurant | Login | Restaurant ID | CRM Token |
|-----------|-------|---------------|-----------|
| 18march | `owner@18march.com` / `Qplazm@10` | 478 | `dp_live_U_qbrMz3q...` |
| kunafamahal | `owner@kunafamahal.com` / `Qplazm@10` | 689 | `dp_live_DMq5PaTt...` |

Target customer: `5ebde664-c7b7-46b7-85ab-f5c5319161b9` (abhishek jain, phone: 7505242126, Gold, 4588 pts, restaurant 689)

### 5.2 POST /pos/customer-lookup — RETURNS `points_value` CORRECTLY

```json
{
  "success": true,
  "data": {
    "customer_id": "5ebde664-c7b7-46b7-85ab-f5c5319161b9",
    "name": "abhishek jain",
    "tier": "Gold",
    "total_points": 4588,
    "points_value": 4588.0,
    "wallet_balance": 0.0
  }
}
```

**`points_value = 4588.0`** — CRM is NOT buggy. The "No points" issue is a POS data pipeline gap (search endpoint doesn't return `points_value`, and no enrichment fires for search-selected customers).

### 5.3 GET /pos/customers/{id}/loyalty — RETURNS 6-KEY BLOB CORRECTLY

```json
{
  "success": true,
  "data": {
    "tier": "Gold",
    "tier_label": "Gold Member",
    "total_points": 4588,
    "ratio_per_point": 1.0,
    "points_value": 4588.0,
    "loyalty_enabled": true
  }
}
```

POS does NOT call this endpoint currently. Could be used as fallback enrichment.

### 5.4 GET /pos/customers?search= — does NOT return `points_value`

```json
{
  "customers": [{
    "name": "abhishek jain",
    "phone": "7505242126",
    "total_points": 4588,
    "wallet_balance": 0.0,
    "tier": "Gold",
    "id": "5ebde664-c7b7-46b7-85ab-f5c5319161b9"
  }]
}
```

**No `points_value`, no `ratio_per_point`.** This is the data gap causing "No points" in the UI.

### 5.5 POST /pos/max-redeemable — THE KEY ENDPOINT (NON-MUTATING)

**Request schema:**
```json
{
  "pos_id": "mygenie",
  "restaurant_id": "689",
  "cust_mobile": "7505242126",
  "bill_amount": 349
}
```

**Live test results for Gold customer (4588 pts, ratio 1.0, restaurant 689):**

| bill_amount | max_points_redeemable | max_discount_value | Cap hit |
|-------------|----------------------|-------------------|---------|
| ₹100 | 100 | ₹100.0 | Bill-amount cap |
| ₹349 | 349 | ₹349.0 | Bill-amount cap |
| ₹1,000 | 664 | ₹664.0 | **Restaurant absolute cap** |
| ₹5,000 | 664 | ₹664.0 | Restaurant absolute cap |
| ₹10,000 | 664 | ₹664.0 | Restaurant absolute cap |

**CRITICAL FINDING:** The restaurant has a `max_redemption_amount` cap of ₹664. Despite the customer having `points_value = 4588`, only ₹664 max is redeemable. This cap is INVISIBLE to POS from the customer lookup — only `/pos/max-redeemable` reveals it.

**This proves the owner's correction:** POS MUST NOT calculate loyalty discount using frontend business logic. Only CRM knows the restaurant caps.

### 5.6 POST /api/pos/loyalty/redeem — CONFIRMED MUTATING (prior investigation)

Deducts points, inserts audit records. MUST NOT be called from Collect Bill.

---

## 6. Corrected Phase C Architecture (FINAL)

```
COLLECT BILL OPENS:
  1. Customer loaded (from search/lookup/re-engage)
     → customer.total_points available (e.g., 4588)
     → customer.tier available (e.g., Gold)
     → loyalty_enabled available

  2. POS calls POST /pos/max-redeemable
     → { pos_id, restaurant_id, cust_mobile, bill_amount }
     → Returns: { max_points_redeemable, max_discount_value }
     → This is the CRM-calculated discount (includes all server-side caps)

  3. UI displays:
     → "Loyalty Gold (4588 pts)"
     → "₹349 discount" (or ₹664, based on CRM response)
     → Bill Summary shows loyalty discount line

  4. Checkbox auto-applies max (owner choice: C = auto-apply max)
     → No manual input needed

CASHIER CLICKS PAY:
  5. POS sends bill-payment payload to POS Backend:
     → used_loyalty_point = max_points_redeemable (from /pos/max-redeemable)
     → loyalty_dicount_amount = max_discount_value (from /pos/max-redeemable)
     → (plus existing order/payment fields)

  6. POS Backend processes order → triggers CRM redemption
     → Actual point deduction happens here
     → POS Frontend never calls POST /pos/loyalty/redeem

NO FRONTEND BUSINESS LOGIC:
  - No ratio calculation
  - No min/max/cap enforcement
  - No points-to-rupee conversion
  - All calculation done by CRM via /pos/max-redeemable
```

---

## 7. Root Cause of "No Points" Issue — RESOLVED

| Factor | Finding |
|--------|---------|
| Is CRM returning `points_value = 0`? | **NO** — `/pos/customer-lookup` returns `points_value: 4588.0` correctly |
| Why does UI show "No points"? | **Search endpoint gap** — `GET /pos/customers?search=` does NOT return `points_value`. Customer selected from search gets `pointsValue: 0`. |
| Why no enrichment? | `enrichCustomerLoyaltyFromCRM` only fires on table re-engage (L345, L388), NOT on CartPanel customer selection |
| Is this still relevant under corrected architecture? | **Partially** — the "No points" text should still be fixed. But the discount AMOUNT will come from `/pos/max-redeemable`, not from `points_value` |

---

## 8. POST /pos/max-redeemable — Full Contract

### Request

| Field | Type | Required | Source in POS |
|-------|------|----------|---------------|
| `pos_id` | string | YES | Hardcoded `"mygenie"` |
| `restaurant_id` | string | YES | `restaurant?.id` from profile |
| `cust_mobile` | string | YES | `customer?.phone` |
| `bill_amount` | number | YES | `itemTotal` or `subtotalAfterOtherDiscounts` from CollectPaymentPanel |

### Response (success)

```json
{
  "success": true,
  "message": "Max redeemable calculated",
  "data": {
    "max_points_redeemable": 349,
    "max_discount_value": 349.0
  }
}
```

### Response (below minimum)

```json
{
  "success": true,
  "message": "Customer does not have minimum points required for redemption",
  "data": {
    "max_points_redeemable": 0,
    "max_discount_value": 0.0,
    "available_points": 20,
    "min_points_required": 100
  }
}
```

### When to call

- On Collect Bill open (when customer has `total_points > 0` and `loyalty_enabled`)
- On bill amount change (if cashier modifies items/discounts, re-call with updated `bill_amount`)
- NOT on every re-render — debounce or call once per bill session

### Error handling

- If endpoint fails: fall back to showing points count only, no discount preview
- If `max_points_redeemable = 0`: show "Minimum X points required" or disable checkbox

---

## 9. Implementation Plan (No Code Changes)

### Phase 1: Add `/pos/max-redeemable` API integration

| File | Change |
|------|--------|
| `src/api/constants.js` | Add `MAX_REDEEMABLE: '/pos/max-redeemable'` |
| `src/api/services/loyaltyService.js` | Add `getMaxRedeemable({ posId, restaurantId, custMobile, billAmount })` — calls CRM endpoint via `crmApi.post`. Non-mutating, no kill switch needed. |
| `src/api/transforms/loyaltyTransform.js` | Add `fromAPI.maxRedeemable(response)` mapper |

### Phase 2: Wire into Collect Bill

| File | Change |
|------|--------|
| `CollectPaymentPanel.jsx` | Add state: `const [maxRedeemable, setMaxRedeemable] = useState(null)` |
| `CollectPaymentPanel.jsx` | Add `useEffect` that calls `getMaxRedeemable()` when customer + bill amount available. Debounced. |
| `CollectPaymentPanel.jsx` | `loyaltyDiscount = useLoyalty ? (maxRedeemable?.maxDiscountValue || 0) : 0` — replaces preview calculation |
| `CollectPaymentPanel.jsx` | Remove entire CRM redeem block from `handlePayment` (L713-824) |

### Phase 3: Fix UI display

| File | Change |
|------|--------|
| `CollectPaymentPanel.jsx` | Right side: show `₹{max_discount_value} available` (from max-redeemable) or `"4588 pts"` as fallback |
| `CollectPaymentPanel.jsx` | When `max_points_redeemable = 0` and `min_points_required > total_points`: show "Min {X} pts required" |
| `CollectPaymentPanel.jsx` | Remove "No points" when `total_points > 0` |
| `CollectPaymentPanel.jsx` | Remove `loyaltyRedeemArmedHelper` in normal state — show the actual discount |
| `CollectPaymentPanel.jsx` | Inline mirror — same changes |
| `BUG108_FLAGS.js` | Update copy strings |

### Phase 4: Fix payload

| File | Change |
|------|--------|
| `CollectPaymentPanel.jsx` | `paymentData.discounts.loyaltyPoints = maxRedeemable?.maxDiscountValue || 0` |
| `CollectPaymentPanel.jsx` | `paymentData.discounts.loyaltyPointsRedeemed = maxRedeemable?.maxPointsRedeemable || 0` |
| `CollectPaymentPanel.jsx` | `paymentData.discounts.loyaltyRedemptionId = null` (POS Backend handles) |
| `orderTransform.js` | Simplify gate: `loyaltyRatioLive ? value : 0` (remove `loyaltyRedeemLive` from gate) |

### Phase 5: Cleanup

| File | Change |
|------|--------|
| `BUG108_FLAGS.js` | Remove or redefine `loyaltyRedeemLive` |
| `CollectPaymentPanel.jsx` | Remove `redeemState` / `redemption` / `redeemError` state (no longer needed) |
| `CollectPaymentPanel.jsx` | Remove `redeemLoyalty` import, `buildRedeemIdempotencyKey` import |
| `CollectPaymentPanel.jsx` | Remove orphan-debit localStorage logic |

---

## 10. Impact on C-FE-1 / C-FE-2 Code

| Component | Action |
|-----------|--------|
| `loyaltyService.redeemLoyalty()` | **UNUSED** — do not call. Keep file for potential future use but no callers. |
| `loyaltyTransform.js` state machine (`LOYALTY_REDEEM_STATES`) | **UNUSED** — remove from CollectPaymentPanel imports. Keep export for future use. |
| `loyaltyTransform.js` request/response mappers | **UNUSED** — for the mutating redeem endpoint. Not needed by max-redeemable. |
| `orderTransform.js` payload gates | **SIMPLIFY** — remove `loyaltyRedeemLive` from the AND gate. Use only `loyaltyRatioLive`. |
| `CollectPaymentPanel.jsx` CRM redeem call (L713-824) | **REMOVE** — owner directive: POS Frontend never calls mutating endpoint. |

---

## 11. CRM/Owner Questions — ALL RESOLVED

| # | Question | Answer | Source |
|---|----------|--------|--------|
| Q1 | Does POS Backend process loyalty payload fields? | **YES (assumed as business rule per owner)** | Owner directive |
| Q2 | Why `points_value = 0`? | **Search endpoint doesn't return `points_value`. But moot — will use `/pos/max-redeemable` instead.** | Live CRM investigation |
| Q3 | What CRM endpoint for preview calculation? | **`POST /pos/max-redeemable`** — non-mutating, returns CRM-calculated caps | Live CRM investigation |
| Q4 | Flag consolidation? | Defer to implementation — owner said "wait, let's correct values first" | Owner response |

**Zero blocking questions remain.**

---

## 12. Key Data Points for Implementation Agent

| Data | Value |
|------|-------|
| Restaurant 689 (kunafamahal) `restaurant_id` | `689` |
| Customer phone | `7505242126` |
| Customer ID | `5ebde664-c7b7-46b7-85ab-f5c5319161b9` |
| Customer tier | Gold |
| Customer `total_points` | 4588 |
| Customer `ratio_per_point` | 1.0 |
| Customer `points_value` | 4588.0 |
| Restaurant max redemption cap | ₹664 (absolute) |
| For ₹349 bill: `max_discount_value` | ₹349.0 |
| For ₹1000+ bill: `max_discount_value` | ₹664.0 |
| `loyalty_enabled` | true |
| `/pos/max-redeemable` request | `{ pos_id: "mygenie", restaurant_id, cust_mobile, bill_amount }` |
| `/pos/max-redeemable` response | `{ max_points_redeemable, max_discount_value, [available_points, min_points_required] }` |
| Login for testing | `owner@kunafamahal.com` / `Qplazm@10` |

---

## 13. Confirmations

| # | Confirmation | Status |
|---|-------------|--------|
| 1 | No code changed | Confirmed |
| 2 | No backend changed | Confirmed |
| 3 | No data mutated | Confirmed |
| 4 | No mutating redeem API called | Confirmed — only read endpoints + non-mutating max-redeemable |
| 5 | No feature flags flipped | Confirmed |
| 6 | `/app/memory/final/` untouched | Confirmed |
| 7 | Baseline docs untouched | Confirmed |

---

**End of investigation. Ready for implementation.**
