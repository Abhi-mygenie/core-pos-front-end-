# POS 3.0 BUG-108 — Loyalty Phase C LR Redemption Trigger Correction Plan (FROZEN)

**Date:** 2026-05-24
**Status:** `FROZEN — ready for implementation`
**Persona:** Senior POS3.0 BUG-108 Loyalty Phase C CRM-Calculated Redemption Flow Investigation Agent
**Mode:** Planning document only — no code changes

---

## 1. Status

```
bug_108_loyalty_phase_c_lr_redemption_trigger_correction_frozen_ready_for_implementation
```

---

## 2. Owner Directive (Verbatim)

> The loyalty logic should NOT be calculated by frontend business rules.
> Collect Bill should use CRM-provided calculation API.
> Actual CRM point deduction does NOT happen directly in Collect Bill.
> Actual redemption happens after bill collection when the final payload reaches CRM.
> POS Frontend should never call the mutating CRM redeem endpoint.
> Remove the direct CRM redeem call from handlePayment.
> Auto-apply max discount (no manual input).

**Owner decisions captured:**
- Checkbox behavior: **Auto-apply max** (owner choice C)
- Direct CRM redeem call: **Remove** (owner choice A)
- Flag consolidation: **Deferred** — correct values first, then decide

---

## 3. Corrected Architecture (FROZEN)

```
┌──────────────────────────────────────────────────────────────┐
│                         CRM Backend                           │
│                                                               │
│  POST /pos/max-redeemable          POST /pos/loyalty/redeem   │
│  ┌─────────────────────────┐       ┌───────────────────────┐  │
│  │ NON-MUTATING            │       │ MUTATING              │  │
│  │ Returns CRM-calculated: │       │ Deducts points        │  │
│  │ • max_points_redeemable │       │ Inserts audit record  │  │
│  │ • max_discount_value    │       │ Called by POS Backend  │  │
│  │ • ratio_per_point       │       │ NOT by POS Frontend   │  │
│  │ • tier                  │       └───────────┬───────────┘  │
│  │ • available_points      │                   │              │
│  │ • min_redemption_points │                   │              │
│  │ • loyalty_enabled       │                   │              │
│  │ • error codes           │                   │              │
│  └─────────────┬───────────┘                   │              │
│                │                               │              │
└────────────────┼───────────────────────────────┼──────────────┘
                 │                               │
            READ │ (POS Frontend)          REDEEM │ (POS Backend)
                 │                               │
┌────────────────▼───────────────┐  ┌────────────▼──────────────┐
│  POS Frontend                  │  │  POS Backend               │
│  (this codebase)               │  │  (preprod.mygenie.online)  │
│                                │  │                            │
│  1. Collect Bill opens         │  │  Receives bill-payment     │
│     → call /pos/max-redeemable │  │  payload with:             │
│     → get CRM-calculated vals  │  │  • used_loyalty_point      │
│                                │  │  • loyalty_dicount_amount  │
│  2. Display:                   │  │                            │
│     → tier, points, discount   │  │  Triggers CRM redemption   │
│     → error states             │  │  (existing process)        │
│                                │  │                            │
│  3. On Pay → send payload      │──│  Actual points deducted    │
│     → used_loyalty_point       │  │  here, not in POS Frontend │
│     → loyalty_dicount_amount   │  │                            │
│                                │  │                            │
│  ZERO frontend business logic  │  │  MUTATION HERE ONLY        │
│  ZERO calls to /loyalty/redeem │  │                            │
└────────────────────────────────┘  └────────────────────────────┘
```

---

## 4. Frozen API Contract — POST /pos/max-redeemable (corrected)

### 4.1 Request

```json
{
  "pos_id": "mygenie",
  "restaurant_id": "689",
  "customer_id": "5ebde664-c7b7-46b7-85ab-f5c5319161b9",
  "bill_amount": 1000
}
```

| Field | Type | Required | Source in POS |
|-------|------|----------|---------------|
| `pos_id` | string | YES | Hardcoded `"mygenie"` |
| `restaurant_id` | string | YES | `restaurant?.id` from profile |
| `customer_id` | string | YES (or `cust_mobile`) | `customer?.id` |
| `cust_mobile` | string | Fallback if no `customer_id` | `customer?.phone` |
| `bill_amount` | number | YES | `itemTotal - manualDiscount - presetDiscount` (pre-loyalty subtotal) |

When both `customer_id` and `cust_mobile` are present, server prefers `customer_id`. POS should prefer `customer_id` when available.

### 4.2 Response — Happy path

```json
{
  "success": true,
  "message": "Max redeemable calculated",
  "data": {
    "max_points_redeemable": 664,
    "max_discount_value": 664.0,
    "ratio_per_point": 1.0,
    "tier": "Gold",
    "available_points": 4588,
    "min_redemption_points": 100,
    "loyalty_enabled": true
  }
}
```

| Field | Type | POS use |
|-------|------|---------|
| `max_points_redeemable` | int | Payload field `used_loyalty_point` |
| `max_discount_value` | float | Payload field `loyalty_dicount_amount` + bill summary display |
| `ratio_per_point` | float | Display/informational (tier-aware) |
| `tier` | string | Tier chip in loyalty card |
| `available_points` | int | Points display: "(4588 pts)" |
| `min_redemption_points` | int | Threshold messaging |
| `loyalty_enabled` | bool | UI gate |

### 4.3 Response — LOYALTY_DISABLED

```json
{
  "success": true,
  "data": {
    "max_points_redeemable": 0,
    "max_discount_value": 0.0,
    "ratio_per_point": 0.0,
    "tier": "Gold",
    "available_points": 4588,
    "min_redemption_points": 0,
    "loyalty_enabled": false,
    "error": { "code": "LOYALTY_DISABLED", "message": "Loyalty program is currently disabled." }
  }
}
```

### 4.4 Response — SETTINGS_MISSING

```json
{
  "success": true,
  "data": {
    "max_points_redeemable": 0,
    "max_discount_value": 0.0,
    "error": { "code": "SETTINGS_MISSING", "message": "Loyalty settings not configured for this restaurant." }
  }
}
```

### 4.5 Response — BELOW_MIN_REDEMPTION

```json
{
  "success": true,
  "data": {
    "max_points_redeemable": 0,
    "max_discount_value": 0.0,
    "ratio_per_point": 1.0,
    "tier": "Bronze",
    "available_points": 50,
    "min_redemption_points": 100,
    "loyalty_enabled": true,
    "error": { "code": "BELOW_MIN_REDEMPTION", "message": "Minimum 100 points required. Customer has 50." }
  }
}
```

### 4.6 Response — CUSTOMER_NOT_FOUND

```json
{
  "success": false,
  "data": {
    "registered": false,
    "error": { "code": "CUSTOMER_NOT_FOUND", "message": "Customer not found for this restaurant." }
  }
}
```

### 4.7 Response — INVALID_REQUEST

```json
{
  "success": false,
  "data": {
    "error": { "code": "INVALID_REQUEST", "message": "At least one of customer_id or cust_mobile is required." }
  }
}
```

### 4.8 HTTP-level errors

| HTTP | Meaning | POS action |
|------|---------|------------|
| 200 | All business outcomes | Branch on `data.error?.code` |
| 401 | Bad/missing X-API-Key | Hide loyalty; log |
| 422 | Schema violation | Hide loyalty; log |
| 5xx | Server error | Hide loyalty; show fallback |

### 4.9 Tier-awareness — VERIFIED

Confirmed via live testing (2026-05-24):

| Customer | Tier | Ratio | Points | Bill | max_discount | Ratio check |
|----------|------|-------|--------|------|-------------|-------------|
| abhishek jain (689) | Gold | 1.0 | 4588 | ₹500 | ₹500.0 (500 × 1.0) | ✅ |
| abhishek jain (689) | Gold | 1.0 | 4588 | ₹1000 | ₹664.0 (restaurant cap) | ✅ |
| Saurav Menon (478) | Bronze | 0.25 | 126 | ₹500 | ₹31.5 (126 × 0.25) | ✅ |

The old contract-freeze §13 note ("NOT yet tier-aware") is **superseded**. The endpoint is now tier-aware via `compute_max_redeemable` shared helper.

---

## 5. POS UI Contract (FROZEN)

### 5.1 Loyalty card — main section

**When max-redeemable returns happy path (`max_discount_value > 0`, no error code):**

```
[✅] Loyalty   Gold   (4588 pts)                    ₹664 discount
     664 pts redeemed · ratio ₹1.0/pt
```

- Checkbox: auto-checked, enabled
- Left: "Loyalty" + tier chip (`data.tier`) + available points (`data.available_points`)
- Right: `₹{max_discount_value} discount`
- Helper: `{max_points_redeemable} pts redeemed · ratio ₹{ratio_per_point}/pt`
- Bill Summary: shows "Loyalty Points (664 pts) -₹664" as discount line

**When BELOW_MIN_REDEMPTION:**

```
[☐] Loyalty   Bronze   (50 pts)                    Earn 50 more
     Minimum 100 points required
```

- Checkbox: disabled
- Left: "Loyalty" + tier + available points
- Right: `Earn {min - available} more`
- Helper: `Minimum {min_redemption_points} points required`

**When LOYALTY_DISABLED or SETTINGS_MISSING:**

- Loyalty section hidden entirely (or shown with "Loyalty program unavailable" if `restaurantSettings?.isLoyalty` is still true)

**When CUSTOMER_NOT_FOUND or INVALID_REQUEST:**

- Loyalty section hidden

**When API call fails (network/timeout/5xx):**

- Show available points from customer object if present (fallback)
- Disable checkbox
- Helper: "Unable to calculate loyalty discount"

### 5.2 Loyalty card — inline mirror (room service)

Same logic, compact layout.

### 5.3 Bill Summary

When `loyaltyDiscount > 0`:
```
Loyalty Points (664 pts)                    -₹664
```

### 5.4 "No points" — ELIMINATED

"No points" text NEVER appears when `available_points > 0`. The max-redeemable response always echoes `available_points`, so POS always knows the customer's balance.

---

## 6. POS Payload Contract (FROZEN)

### 6.1 Bill Payment payload fields

When loyalty is applied (checkbox checked + `max_discount_value > 0`):

| Payload field | Value | Source |
|---------------|-------|--------|
| `used_loyalty_point` | `max_points_redeemable` | From `/pos/max-redeemable` response |
| `loyalty_dicount_amount` (typo preserved) | `max_discount_value` | From `/pos/max-redeemable` response |
| `loyalty_redemption_id` | `null` | POS Backend generates during CRM call |

When loyalty is NOT applied (checkbox unchecked, or `max_discount_value = 0`, or error):

| Payload field | Value |
|---------------|-------|
| `used_loyalty_point` | `0` |
| `loyalty_dicount_amount` | `0` |
| `loyalty_redemption_id` | `null` |

### 6.2 Payload gate

```
loyaltyRatioLive && useLoyalty && maxRedeemable?.maxDiscountValue > 0
  → send CRM-calculated values
  → else send 0
```

`loyaltyRedeemLive` is no longer in the gate (it gated the now-removed direct CRM redeem call).

### 6.3 Print payload

| Print field | Value |
|-------------|-------|
| `loyalty_dicount_amount` | Same as bill payment: `max_discount_value` or `0` |

---

## 7. What to REMOVE from C-FE-2 (FROZEN)

### 7.1 Direct CRM redeem call — REMOVE

| File | Lines (approx) | What to remove |
|------|----------------|----------------|
| `CollectPaymentPanel.jsx` | L713-824 | Entire `redeemLoyalty()` call block inside `handlePayment` |
| `CollectPaymentPanel.jsx` | L11 area | `import { redeemLoyalty } from '../../api/services/loyaltyService'` |
| `CollectPaymentPanel.jsx` | L19 area | `import { buildRedeemIdempotencyKey } from '../../api/transforms/loyaltyTransform'` |

### 7.2 Redeem state machine — REMOVE

| File | Lines | What to remove |
|------|-------|----------------|
| `CollectPaymentPanel.jsx` | L264 | `const [redemption, setRedemption] = useState(null)` |
| `CollectPaymentPanel.jsx` | L265 | `const [redeemState, setRedeemState] = useState(LOYALTY_REDEEM_STATES.IDLE)` |
| `CollectPaymentPanel.jsx` | L266 | `const [redeemError, setRedeemError] = useState(null)` |
| `CollectPaymentPanel.jsx` | L534 | `const loyaltyDiscount = redemption?.redeemedValue ?? previewLoyaltyDiscount` — replace with max-redeemable value |
| `CollectPaymentPanel.jsx` | L1249-1256 | Redeem state machine driven helper text — replace with max-redeemable driven copy |
| `CollectPaymentPanel.jsx` | L1263-1267 | Inline error band for `redeemError` — replace with max-redeemable error code handling |

### 7.3 Orphan-debit localStorage — REMOVE

| File | Lines | What to remove |
|------|-------|----------------|
| `CollectPaymentPanel.jsx` | L770-787 | `localStorage` orphan-debit write block |
| `CollectPaymentPanel.jsx` | L19 import | `LOYALTY_LS_KEYS` import (if only used for orphan-debits) |

### 7.4 Payload force-zero gate simplification

| File | Line | Before | After |
|------|------|--------|-------|
| `orderTransform.js` | L1361 | `(loyaltyRatioLive && loyaltyRedeemLive) ? ... : 0` | `loyaltyRatioLive ? ... : 0` |
| `orderTransform.js` | L1364 | `(loyaltyRatioLive && loyaltyRedeemLive) ? ... : null` | `null` (always null — POS Backend generates) |
| `orderTransform.js` | L1778 | `(loyaltyRatioLive && loyaltyRedeemLive) ? ... : 0` | `loyaltyRatioLive ? ... : 0` |

### 7.5 Files to keep UNCHANGED (dead code, no harm)

| File | Reason to keep |
|------|----------------|
| `src/api/services/loyaltyService.js` | `redeemLoyalty()` wrapper — no callers, dead code. May be useful if architecture changes. |
| `src/api/transforms/loyaltyTransform.js` | State machine constants, request/response mappers — no callers from CollectPaymentPanel after removal. Keep for potential future use. |

---

## 8. What to ADD (FROZEN)

### 8.1 New service function

| File | Function | Purpose |
|------|----------|---------|
| `src/api/services/loyaltyService.js` | `getMaxRedeemable({ posId, restaurantId, customerId, custMobile, billAmount })` | Call `POST /pos/max-redeemable` via `crmApi`. Non-mutating. No kill switch needed. Returns parsed response. |

### 8.2 New constant

| File | Constant | Value |
|------|----------|-------|
| `src/api/constants.js` | `MAX_REDEEMABLE` | `'/pos/max-redeemable'` |

### 8.3 New transform

| File | Function | Purpose |
|------|----------|---------|
| `src/api/transforms/loyaltyTransform.js` | `fromAPI.maxRedeemable(responseBody)` | Map CRM response to POS state: `{ maxPointsRedeemable, maxDiscountValue, ratioPerPoint, tier, availablePoints, minRedemptionPoints, loyaltyEnabled, error }` |

### 8.4 New state in CollectPaymentPanel

| State | Type | Purpose |
|-------|------|---------|
| `maxRedeemable` | object \| null | Holds `/pos/max-redeemable` response |
| `maxRedeemableLoading` | boolean | Loading state for the API call |

### 8.5 New useEffect in CollectPaymentPanel

Trigger: when `customer?.id` (or `customer?.phone`) AND `itemTotal` are available, and `restaurantSettings?.isLoyalty` is true.

Debounce: re-call when `billAmount` changes (items added/removed, manual discount changed). Debounce 300-500ms.

Cancel: on customer change or component unmount.

---

## 9. Loyalty Discount Calculation Flow (FROZEN)

```
1. Customer selected (any path: search, lookup, re-engage)
   → customer.id / customer.phone available
   → customer.total_points may or may not be available (irrelevant — max-redeemable provides it)

2. Collect Bill panel mounts / bill amount changes
   → call POST /pos/max-redeemable {
       pos_id: "mygenie",
       restaurant_id: restaurant.id,
       customer_id: customer.id,         // preferred
       cust_mobile: customer.phone,      // fallback
       bill_amount: itemTotal - manualDiscount - presetDiscount
     }

3. Response received:
   → if no error.code:
       loyaltyDiscount = data.max_discount_value
       useLoyalty = true (auto-apply)
       UI shows discount
   → if error.code = BELOW_MIN_REDEMPTION:
       loyaltyDiscount = 0
       useLoyalty = false
       UI shows threshold message
   → if error.code = LOYALTY_DISABLED | SETTINGS_MISSING:
       hide loyalty section
   → if error.code = CUSTOMER_NOT_FOUND | INVALID_REQUEST:
       hide loyalty section
   → if API fails (network/5xx):
       loyaltyDiscount = 0
       show fallback "Unable to calculate"

4. Bill Summary reflects loyaltyDiscount in totalDiscount calculation
   → subtotalAfterDiscount = itemTotal - manualDiscount - presetDiscount - loyaltyDiscount
   → tax computed on subtotalAfterDiscount (existing logic, unchanged)

5. Cashier clicks Pay:
   → paymentData.discounts.loyaltyPoints = maxRedeemable.maxDiscountValue
   → paymentData.discounts.loyaltyPointsRedeemed = maxRedeemable.maxPointsRedeemable
   → paymentData.discounts.loyaltyRedemptionId = null
   → NO call to /pos/loyalty/redeem
   → payload goes to POS Backend
   → POS Backend handles actual CRM redemption
```

---

## 10. When to Re-call /pos/max-redeemable

| Trigger | Action |
|---------|--------|
| Customer selected/changed | Call (new customer) |
| Item added/removed (bill amount changes) | Re-call (debounced 300-500ms) |
| Manual discount changed | Re-call (debounced) |
| Preset discount changed | Re-call (debounced) |
| Coupon applied/removed (future) | Re-call (debounced) |
| Collect Bill panel mounts with existing customer | Call |
| Customer deselected | Clear `maxRedeemable` state |

bill_amount input to max-redeemable = `itemTotal - manualDiscount - presetDiscount` (pre-loyalty subtotal). This ensures loyalty is calculated on the amount AFTER other discounts.

---

## 11. Error Code → POS Action Mapping (FROZEN)

| `data.error.code` | `success` | POS UI action | Checkbox | Helper text |
|--------------------|-----------|---------------|----------|-------------|
| (none) | `true` | Show discount | Enabled, auto-checked | `"{max_points_redeemable} pts · ₹{max_discount_value} discount"` |
| `BELOW_MIN_REDEMPTION` | `true` | Show threshold msg | Disabled | `"Earn {min - available} more points to redeem"` |
| `LOYALTY_DISABLED` | `true` | Hide loyalty section | — | — |
| `SETTINGS_MISSING` | `true` | Hide loyalty section | — | — |
| `CUSTOMER_NOT_FOUND` | `false` | Hide loyalty section | — | — |
| `INVALID_REQUEST` | `false` | Hide loyalty section; log | — | — |

---

## 12. Live Test Data (for implementation agent)

| Field | Value |
|-------|-------|
| Restaurant | kunafamahal (689) |
| Login | `owner@kunafamahal.com` / `Qplazm@10` |
| Customer | abhishek jain |
| Customer ID | `5ebde664-c7b7-46b7-85ab-f5c5319161b9` |
| Phone | `7505242126` |
| Tier | Gold |
| Total points | 4588 |
| Ratio | 1.0 |
| Restaurant cap | ₹664 |
| Min redemption | 100 pts |
| CRM Base | `https://insights-phase.preview.emergentagent.com/api` |
| Endpoint | `POST /pos/max-redeemable` |
| Auth | `X-API-Key` from login response `crm_token` |

---

## 13. Superseded Documents

This plan supersedes the following Phase C documents insofar as they describe direct POS→CRM redemption:

| Document | What is superseded |
|----------|-------------------|
| `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_ONLY_PREPROD_PLAN_2026_05_23.md` | §9 (UI state machine with redeem_in_flight), §10 (A-resolved sequence with direct redeem call), §11 (orphan-debit handling) |
| `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_API_CONTRACT_FREEZE_2026_05_23.md` | §9.1 (billing flow step 4-7 — direct POS redeem call), §9.4 (orphan-debit handling) |
| `POS3_0_BUG_108_LOYALTY_PHASE_C_CFE1_KILL_SWITCHED_WIRING_IMPLEMENTATION_REPORT_2026_05_23.md` | §5 (service wrapper behavior — `redeemLoyalty` no longer called), §6 (UI state machine — no longer wired) |
| `POS3_0_BUG_108_LOYALTY_PHASE_C_LOYALTY_CALCULATION_UI_INVESTIGATION_2026_05_24.md` | §8 (calculation source — now `/pos/max-redeemable` instead of Phase B data), §9 (fix options A-D — replaced by this plan) |

**What is NOT superseded:**
- Phase B work (read-only loyalty preview, customer pipeline fix) — still valid
- CRM LX-A handoff (read endpoints) — still valid for customer data
- CRM CR-001C-LR contract (redeem endpoint) — still valid, but called by POS Backend, not POS Frontend
- Payload field names (`used_loyalty_point`, `loyalty_dicount_amount`) — still valid

---

## 14. Confirmations

| # | Confirmation | Status |
|---|-------------|--------|
| 1 | No code changed | Confirmed |
| 2 | No backend changed | Confirmed |
| 3 | No data mutated | Confirmed |
| 4 | No mutating API called | Confirmed — only read endpoints + non-mutating max-redeemable |
| 5 | No feature flags flipped | Confirmed |
| 6 | `/app/memory/final/` untouched | Confirmed |
| 7 | Baseline docs untouched | Confirmed |
| 8 | CRM corrected max-redeemable response analyzed and validated | Confirmed |
| 9 | Tier-awareness verified via live testing | Confirmed |

---

## 15. CRM Corrected Response Samples (Verbatim — 2026-05-24)

Attached verbatim from CRM agent output. These are the AUTHORITATIVE response shapes POS must handle. All use real restaurant 689 / abhishek jain data.

Restaurant config:
```
customer_id      = 5ebde664-c7b7-46b7-85ab-f5c5319161b9
cust_mobile      = 7505242126
total_points     = 4588      tier = Gold
redemption_value = 1.0       gold_redemption_value = (not set)
min_redemption_points = 100
max_redemption_percent = 100
max_redemption_amount  = 664
loyalty_enabled = true
```

HTTP status is 200 for every case. POS branches on `data.error.code`. 422/401 only for HTTP-level errors (Pydantic schema / bad auth).

### 15.1 Happy path (Gold, ₹1000 bill, ratio=1.0)

Request:
```json
{ "pos_id": "mygenie", "restaurant_id": "689", "customer_id": "5ebde664-c7b7-46b7-85ab-f5c5319161b9", "bill_amount": 1000 }
```

Response:
```json
{ "success": true, "message": "Max redeemable calculated", "data": { "max_points_redeemable": 664, "max_discount_value": 664.0, "ratio_per_point": 1.0, "tier": "Gold", "available_points": 4588, "min_redemption_points": 100, "loyalty_enabled": true } }
```

Cap: `min(bill × 100%, 664, 4588 × 1.0) = 664`.

### 15.2 Tier-aware override (hypothetical: gold_redemption_value = 1.5)

Response:
```json
{ "success": true, "message": "Max redeemable calculated", "data": { "max_points_redeemable": 442, "max_discount_value": 663.0, "ratio_per_point": 1.5, "tier": "Gold", "available_points": 4588, "min_redemption_points": 100, "loyalty_enabled": true } }
```

`int(664 / 1.5) = 442 pts`. `442 × 1.5 = 663.0`. Guaranteed by shared `compute_max_redeemable` helper.

### 15.3 Backward-compatible cust_mobile request

Request:
```json
{ "pos_id": "mygenie", "restaurant_id": "689", "cust_mobile": "7505242126", "bill_amount": 1000 }
```

Response: identical to §15.1. When both `customer_id` and `cust_mobile` present, server prefers `customer_id`.

### 15.4 LOYALTY_DISABLED

```json
{ "success": true, "message": "Loyalty program is disabled.", "data": { "max_points_redeemable": 0, "max_discount_value": 0.0, "ratio_per_point": 0.0, "tier": "Gold", "available_points": 4588, "min_redemption_points": 0, "loyalty_enabled": false, "error": { "code": "LOYALTY_DISABLED", "message": "Loyalty program is currently disabled." } } }
```

### 15.5 SETTINGS_MISSING

```json
{ "success": true, "message": "Loyalty settings not configured.", "data": { "max_points_redeemable": 0, "max_discount_value": 0.0, "error": { "code": "SETTINGS_MISSING", "message": "Loyalty settings not configured for this restaurant." } } }
```

No more silent hardcoded fallback defaults. POS treats identically to LOYALTY_DISABLED.

### 15.6 BELOW_MIN_REDEMPTION

```json
{ "success": true, "message": "Customer below minimum redemption threshold.", "data": { "max_points_redeemable": 0, "max_discount_value": 0.0, "ratio_per_point": 1.0, "tier": "Bronze", "available_points": 50, "min_redemption_points": 100, "loyalty_enabled": true, "error": { "code": "BELOW_MIN_REDEMPTION", "message": "Minimum 100 points required. Customer has 50." } } }
```

POS displays: "Earn 50 more points to redeem" using echoed fields.

### 15.7 CUSTOMER_NOT_FOUND

```json
{ "success": false, "message": "Customer not found.", "data": { "registered": false, "error": { "code": "CUSTOMER_NOT_FOUND", "message": "Customer not found for this restaurant." } } }
```

Note: `success=false` — input doesn't resolve.

### 15.8 INVALID_REQUEST

```json
{ "success": false, "message": "Customer identifier required.", "data": { "error": { "code": "INVALID_REQUEST", "message": "At least one of customer_id or cust_mobile is required." } } }
```

---

## 16. POS Verification Summary — CRM Corrected Output Fit

| CRM corrected feature | Plan coverage | Status |
|----------------------|---------------|--------|
| Tier-aware `ratio_per_point` in response | §4.2, §4.9 | ✅ Covered |
| `tier` in response | §4.2, §5.1 | ✅ Covered |
| `available_points` always echoed | §4.2, §5.1, §5.4 | ✅ Covered — eliminates "No points" |
| `min_redemption_points` always echoed | §4.2, §5.1 | ✅ Covered — threshold messaging |
| `loyalty_enabled` in response | §4.2, §11 | ✅ Covered — UI gate |
| Structured `error.code` | §4.3-4.7, §11 | ✅ All 5 codes mapped |
| `customer_id` in request | §4.1 | ✅ Preferred over `cust_mobile` |
| `SETTINGS_MISSING` (no silent defaults) | §4.4, §11 | ✅ Treated as LOYALTY_DISABLED |
| Backward-compat `cust_mobile` | §4.1 | ✅ Fallback when no customer_id |
| Single call gives everything POS needs | §6, §9 | ✅ Zero extra round calls |

**Zero gaps. Zero feedback items. Plan is fully aligned with CRM corrected output.**

---

## 17. Document Trail

| Document | Status | Role |
|----------|--------|------|
| This document | **FROZEN** | Authoritative implementation plan |
| `POS3_0_BUG_108_LOYALTY_PHASE_C_CRM_CALCULATED_PAYLOAD_REDEMPTION_FLOW_INVESTIGATION_2026_05_24.md` | Superseded by this plan | Investigation (findings incorporated here) |
| `POS3_0_BUG_108_LOYALTY_PHASE_C_LOYALTY_CALCULATION_UI_INVESTIGATION_2026_05_24.md` | Superseded by this plan | Initial UI investigation (root cause incorporated here) |
| `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_ONLY_PREPROD_PLAN_2026_05_23.md` | Partially superseded (§9, §10, §11) | Original Phase C plan — direct redeem portions replaced |
| `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_API_CONTRACT_FREEZE_2026_05_23.md` | Still valid for POS Backend reference | CRM redeem endpoint contract — called by POS Backend, not Frontend |
| `POS3_0_BUG_108_LOYALTY_PHASE_C_CFE1_KILL_SWITCHED_WIRING_IMPLEMENTATION_REPORT_2026_05_23.md` | Partially superseded | C-FE-1 wiring — redeem service/state machine portions to be removed |

---

**End of BUG-108 Loyalty Phase C LR Redemption Trigger Correction Plan. FROZEN — ready for implementation.**
