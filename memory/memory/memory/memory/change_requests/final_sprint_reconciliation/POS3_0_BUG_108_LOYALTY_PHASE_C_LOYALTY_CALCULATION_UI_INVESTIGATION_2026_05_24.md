# POS 3.0 BUG-108 — Loyalty Phase C Loyalty Calculation UI Investigation

**Date:** 2026-05-24
**Persona:** Senior POS3.0 BUG-108 Loyalty Phase C Continuation Investigation Agent
**Mode:** Investigation only — no code changes, no backend changes, no data mutation, no API calls, no flag flips
**Predecessor status:** `bug_108_loyalty_phase_c_cfe1_kill_switched_wiring_agent_smoke_passed_ready_for_cfe2_live_wiring`

---

## 1. Status

```
bug_108_loyalty_phase_c_calculation_ui_investigated_superseded_by_frozen_plan
```

**SUPERSEDED** by: `POS3_0_BUG_108_LOYALTY_PHASE_C_LR_REDEMPTION_TRIGGER_CORRECTION_PLAN_FROZEN_2026_05_24.md`

Root cause findings (search endpoint missing `points_value`, no enrichment on CartPanel selection) are incorporated into the frozen plan. The fix approach has changed: POS now uses `POST /pos/max-redeemable` instead of frontend calculation.

---

## 2. Owner Screenshot / Issue Captured

**Source:** Owner-provided screenshot (2026-05-24) of the Collect Bill panel for a customer with an active Gold loyalty tier.

**Observed UI state:**
- **Left side:** Green checkmark (checkbox CHECKED) → **Loyalty** → `Gold` tier chip → `(4588 pts)`
- **Right side:** "**No points**" (in gray text)
- **Helper copy:** *"Loyalty discount will apply when you confirm payment."*
- **Bill Summary:** Shows item "Nuts Overload Salankatia x1 ₹349" — no loyalty discount line visible.

**Owner correction:**
This behavior is NOT accepted. Expected behavior:
- Show actual loyalty calculation/application preview before final payment confirmation.
- Show: available points, redeemable/capped points, loyalty discount amount, remaining points if calculable.
- Do NOT deduct CRM points at preview stage (only at final approved stage).
- "No points" must NOT appear when the customer has 4588 points.
- Copy must not imply "no calculation available" when POS can compute the discount from Phase B loyalty data.

---

## 3. Docs Read

| # | Doc | Read |
|---|-----|------|
| 1 | `POS3_0_BUG_108_LOYALTY_PHASE_C_CFE1_KILL_SWITCHED_WIRING_IMPLEMENTATION_REPORT_2026_05_23.md` | Full |
| 2 | `POS3_0_BUG_108_LOYALTY_PHASE_C_CFE1_KILL_SWITCHED_WIRING_AGENT_SMOKE_REPORT_2026_05_23.md` | Full |
| 3 | `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_API_CONTRACT_FREEZE_2026_05_23.md` | Full |
| 4 | `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_ONLY_PREPROD_PLAN_2026_05_23.md` | Full |
| 5 | `POS3_0_BUG_108_LOYALTY_CONTRACT_VERIFICATION_2026_05_23.md` | Full |

---

## 4. Code Areas Inspected

| File | Lines / Area | What was checked |
|------|-------------|------------------|
| `src/utils/BUG108_FLAGS.js` | Full (59 lines) | Flag values, copy strings |
| `src/components/order-entry/CollectPaymentPanel.jsx` | L28-42 (props), L520-555 (loyalty discount calc), L710-740 (redeem-on-confirm), L1200-1270 (main loyalty section), L1735-1800 (inline mirror), L1975-2005 (bill summary), L258-266 (state vars) | Full loyalty UI and calc surface |
| `src/api/transforms/customerTransform.js` | Full (260 lines) | `buildSyntheticLoyalty`, `searchResult`, `customerLookup`, `customerDetail` |
| `src/api/transforms/loyaltyTransform.js` | Full (121 lines) | State machine constants, request/response mappers |
| `src/api/services/loyaltyService.js` | Full (108 lines) | Kill switch guard, redeem wrapper |
| `src/api/transforms/orderTransform.js` | L1355-1375, L1770-1790 | Payload force-zero gates |
| `src/components/order-entry/OrderEntry.jsx` | L156, L179-198, L330-400 | Customer state, `enrichCustomerLoyaltyFromCRM`, table re-engage |
| `src/components/order-entry/CartPanel.jsx` | L772, L805 | `onCustomerChange` data shape |
| `src/api/services/customerService.js` | L36-50 | `lookupCustomer` → `fromAPI.customerLookup` |

**Search terms verified:**
- `No points` → L1243, L1758 (display conditional)
- `Loyalty discount will apply` → `BUG108_COPY.loyaltyRedeemArmedHelper` at `BUG108_FLAGS.js:52`
- `loyaltyRedeemLive` → `BUG108_FLAGS.js:38` = `true` (C-FE-2 live-wired)
- `loyaltyRatioLive` → `BUG108_FLAGS.js:36` = `true` (C-FE-2 live-wired)
- `displayPoints` → L1216, L1742 (from `loyaltyBlob?.total_points`)
- `displayValue` → L1217, L1743 (from `loyaltyBlob?.points_value`)
- `customerPointsValue` → L530 (from `customer?.loyalty?.points_value ?? customer?.pointsValue ?? 0`)
- `previewLoyaltyDiscount` → L531 (gated on `customerPointsValue > 0`)
- `redemption` → L264 (useState, initially `null`)
- `redeemState` → L265 (useState, initially `IDLE`)

---

## 5. Current UI Logic

### 5.1 Flag state (current build)

```js
loyaltyRatioLive:   true   // C-FE-2 LIVE WIRING (flipped from false)
loyaltyPreviewLive: true
loyaltyRedeemLive:  true   // C-FE-2 LIVE WIRING (flipped from false)
```

Both redeem-path flags have been flipped to `true` in the current build.

### 5.2 Loyalty section render logic (main section, L1212-1270)

**Gate:** `customer && restaurantSettings?.isLoyalty` → section renders.

**Derived variables:**
```
loyaltyBlob     = customer?.loyalty
hasLoyaltyData  = loyaltyPreviewLive && loyaltyBlob && loyaltyBlob.loyalty_enabled !== false
displayPoints   = loyaltyBlob?.total_points || customer?.totalPoints || 0          → 4588
displayValue    = loyaltyBlob?.points_value || customer?.pointsValue || 0          → 0  ← ROOT CAUSE
displayTier     = loyaltyBlob?.tier || customer?.tier || ''                         → 'Gold'
previewAmount   = Math.min(displayValue, itemTotal - manualDiscount - presetDiscount) → 0
```

**Left side renders:**
- Checkbox: `checked={useLoyalty}` → **true** (user checked it)
- Disabled gate: `!loyaltyRatioLive || !loyaltyRedeemLive || !displayPoints || redeemState === APPLYING || APPLIED` → `false || false || false || false || false` → **not disabled** (checkbox enabled because `displayPoints = 4588`)
- Label: "Loyalty"
- Tier chip: `Gold` (because `hasLoyaltyData && displayTier`)
- Points: `(4588 pts)` (from `displayPoints`)

**Right side renders:**
```jsx
{hasLoyaltyData && displayValue > 0
  ? `₹${previewAmount > 0 ? previewAmount : displayValue} available`
  : "No points"}
```
Since `displayValue = 0`, the condition `displayValue > 0` is **false** → renders **"No points"**.

**Helper copy renders:**
```jsx
{redeemState === APPLIED && redemption
  ? `✓ Redeemed ...`
  : redeemState === APPLYING
    ? loyaltyRedeemApplyingHelper
    : useLoyalty
      ? loyaltyRedeemArmedHelper         ← HIT: "Loyalty discount will apply when you confirm payment."
      : 'Tick to redeem points on Pay.'}
```
Since `redeemState = IDLE`, `redemption = null`, and `useLoyalty = true`, it renders `loyaltyRedeemArmedHelper`.

### 5.3 Loyalty discount calculation (L530-534)

```js
const customerPointsValue = customer?.loyalty?.points_value ?? customer?.pointsValue ?? 0;
// → 0 (because points_value is 0)

const previewLoyaltyDiscount = (loyaltyRatioLive && loyaltyRedeemLive && useLoyalty && customerPointsValue > 0)
  ? Math.min(customerPointsValue, itemTotal - manualDiscount)
  : 0;
// → 0 (because customerPointsValue = 0, fails the > 0 check)

const loyaltyDiscount = redemption?.redeemedValue ?? previewLoyaltyDiscount;
// → 0 (redemption is null, previewLoyaltyDiscount is 0)
```

**Net result:** `loyaltyDiscount = 0` → Bill Summary shows NO loyalty discount line (L1982: `loyaltyDiscount > 0` is false).

### 5.4 Checkbox enabled but ineffective

The checkbox is enabled (`displayPoints = 4588 > 0`) and checked (`useLoyalty = true`), BUT:
- No preview discount is computed because `customerPointsValue = 0`
- No redeem API call fires at the checkbox stage (correct — fires on Pay click at L718-820)
- The Pay click at L719-725 also checks `customerPointsValue > 0` → would skip the redeem flow

**The entire loyalty flow is dead at runtime because `points_value = 0`.**

---

## 6. Root Cause

### 6.1 Immediate cause: `points_value = 0` in customer loyalty data

The `displayValue` variable (L1217) and `customerPointsValue` variable (L530) both derive from `customer?.loyalty?.points_value` / `customer?.pointsValue`. Both are 0 for this customer despite having `total_points = 4588`.

### 6.2 Data pipeline trace

| Step | Source | `total_points` | `points_value` | `ratio_per_point` |
|------|--------|----------------|-----------------|---------------------|
| CRM `/pos/customer-lookup` response | CRM preprod | 4588 (inferred from UI) | **0 or missing** (inferred from UI) | **unknown** |
| `fromAPI.customerLookup()` transform | `customerTransform.js:88` | `api.total_points \|\| 0` → 4588 | `api.points_value \|\| 0` → **0** | n/a (flat field) |
| `buildSyntheticLoyalty()` | `customerTransform.js:22-31` | 4588 | **0** | `(4588 && 0) ? ... : 0` → **0** |
| `enrichCustomerLoyaltyFromCRM()` merge | `OrderEntry.jsx:184-192` | merged into customer state | **0** (from enriched) | **0** (in synthetic blob) |
| CollectPaymentPanel `displayValue` | L1217 | 4588 (`displayPoints`) | **0** → "No points" | **0** (blob.ratio_per_point) |

### 6.3 Root cause classification

| Possible cause | Evidence | Verdict |
|---------------|----------|---------|
| Wrong variable | `displayValue` correctly reads `points_value` | Not root cause — variable is correct but value is 0 |
| Wrong flag gate | Flags are both `true`; gate is open | Not root cause |
| Wrong copy | "No points" is a fallback for `displayValue <= 0` | **Contributing cause** — should not show "No points" when points exist |
| Missing calculation | Preview calc uses `customerPointsValue` which is 0 | **Contributing cause** — no local fallback calc when `points_value` is 0 |
| Payload safety over-applied | Payload gates only apply at payment; don't affect preview display | Not root cause |
| C-FE-1 regression | C-FE-1 migrated reads correctly; same issue existed pre-C-FE-1 | **Not a regression** |
| **Pre-existing Phase C gap** | `points_value = 0` from CRM was a known risk (GAP-L2 through GAP-L5 in Contract Verification doc §9) | **PRIMARY ROOT CAUSE** |

### 6.4 Summary

**The CRM `/pos/customer-lookup` endpoint returns `points_value = 0` (or omits it) for this Gold customer with 4588 points.** The `buildSyntheticLoyalty` helper dutifully records `{ points_value: 0, ratio_per_point: 0 }`. The UI then shows "No points" because it gates the right-side display on `displayValue > 0`. The preview discount calculation also yields 0 because it checks `customerPointsValue > 0`.

The code logic is internally consistent — the problem is that:
1. The CRM data doesn't include a usable `points_value` for this customer.
2. POS has NO fallback to compute `points_value` locally when it's missing.
3. The UI copy "No points" is contradictory when the customer clearly has 4588 points.

---

## 7. Correct Product Rule

**Preview calculation IS allowed; CRM point deduction is NOT allowed until final approved stage.**

Specifically:
- **ALLOWED at preview stage:** Calculate and display loyalty discount preview using available Phase B data (`total_points`, `ratio_per_point`, `points_value`, `loyalty_enabled`). Show available points, redeemable/capped points, loyalty discount amount, remaining points estimate.
- **NOT ALLOWED at preview stage:** Call the redeem API, deduct CRM points, mutate any backend data.
- **ALLOWED at final payment stage (redeem-on-confirm):** Call `/pos/loyalty/redeem`, use server-returned `redeemed_value` as authoritative discount, send payload fields.

The current build conflates "no `points_value` available" with "no preview possible." Even without `points_value`, POS can derive a preview from `total_points * ratio_per_point` (if available) or display the raw point count.

---

## 8. Calculation Source

### 8.1 Available Phase B fields for local preview calculation

| Field | Source path | Available at preview? | Value for this customer |
|-------|------------|----------------------|-------------------------|
| `total_points` | `customer.loyalty.total_points` / `customer.totalPoints` | YES | 4588 |
| `points_value` | `customer.loyalty.points_value` / `customer.pointsValue` | **NO — 0 or missing** | 0 |
| `ratio_per_point` | `customer.loyalty.ratio_per_point` | **DEPENDS** — synthetic blob derives from `pointsValue/totalPoints`; if `pointsValue = 0`, ratio is 0 | 0 (derived) |
| `loyalty_enabled` | `customer.loyalty.loyalty_enabled` | YES (synthetic blob defaults to `true`) | true |
| `tier` | `customer.loyalty.tier` / `customer.tier` | YES | 'Gold' |

### 8.2 Local calculation feasibility

**When `points_value > 0` and `ratio_per_point > 0` (normal case):**
```
eligible_amount   = max(0, itemTotal - manualDiscount - presetDiscount)
max_redeem_rupees = min(points_value, eligible_amount)
max_redeem_points = floor(max_redeem_rupees / ratio_per_point)
capped_points     = min(total_points, max_redeem_points)
preview_discount  = capped_points * ratio_per_point
```

**When `points_value = 0` but `total_points > 0` (current bug scenario):**

Two sub-cases:

A. **`ratio_per_point` is available from CRM** (e.g., customer loaded via `GET /pos/customers/{id}/loyalty` or `/pos/customers/{id}` which returns the full 6-key blob with CRM-computed ratio):
```
points_value_computed = total_points * ratio_per_point
// then use same formula as above
```

B. **`ratio_per_point` is also 0/missing** (e.g., customer loaded via lookup/search with synthetic blob — current scenario):
- POS cannot compute the rupee discount without a ratio.
- **Fallback option:** Use the global/tier default ratio. Per contract §5.1: per-tier override → restaurant `redemption_value` → `0.25` fallback.
- **Alternatively:** Call `GET /pos/customers/{id}/loyalty` (if customer ID is available) to fetch the CRM-computed 6-key blob with actual `ratio_per_point` and `points_value`.

### 8.3 Recommended calculation approach

1. **Primary:** Use `customer.loyalty.points_value` when > 0.
2. **Fallback 1:** If `points_value` is 0 but `total_points > 0` and `ratio_per_point > 0`: compute locally as `total_points * ratio_per_point`.
3. **Fallback 2:** If both `points_value` and `ratio_per_point` are 0 but `total_points > 0` and `customer.id` is available: fire async `GET /pos/customers/{id}/loyalty` to fetch authoritative blob (non-blocking, similar to `enrichCustomerLoyaltyFromCRM` pattern).
4. **Fallback 3 (last resort):** Apply hardcoded default ratio (0.25) from contract. Show as estimated: "~₹X estimated discount".
5. **Server redeem response:** At payment confirmation, use `data.redeemed_value` from the redeem API as authoritative — never re-derive client-side post-redeem.

---

## 9. Proposed Fix Options

### Option A: UI-only copy/value fix

**Scope:** Change "No points" display logic and helper text.

**Changes:**
- Right-side: when `displayValue <= 0 && displayPoints > 0`, show `"${displayPoints} pts available"` instead of `"No points"`.
- Helper: when `useLoyalty && displayValue <= 0`, show `"Points available. Discount amount will be confirmed on payment."` instead of current `loyaltyRedeemArmedHelper`.

**Risk:** Low — cosmetic only. Does not fix the discount preview calculation or Bill Summary.
**Files:** `CollectPaymentPanel.jsx` (L1243, L1758, ~L1254)

---

### Option B: Preview calculation fix while redeem flag false/true

**Scope:** Add fallback preview calculation when `points_value` is 0.

**Changes:**
1. In `CollectPaymentPanel.jsx` L530 area: when `customerPointsValue = 0` but `total_points > 0`, compute using `total_points * ratio_per_point`. If `ratio_per_point` is also 0, use fallback ratio (0.25) and mark as "estimated."
2. In `CollectPaymentPanel.jsx` L1217: use computed `displayValue` from fallback calc.
3. Update right-side text to show the fallback amount.
4. In `CollectPaymentPanel.jsx` L1247-1255: update helper to show preview details ("~₹X discount from Y pts").
5. Loyalty discount flows into Bill Summary via `loyaltyDiscount` already (L1982).

**Risk:** Medium — introduces local calculation that may differ from server's auto-cap. Preview is clearly labeled as "estimated" when using fallback ratio. Server response at redeem time is still authoritative.
**Files:** `CollectPaymentPanel.jsx` (L530, L1217, L1243, L1254, L1743, L1758)

---

### Option C: C-FE-2 live redeem flow fix (CRM data investigation)

**Scope:** Investigate CRM `/pos/customer-lookup` response for `points_value` field. Fix at CRM level.

**Changes:**
1. Verify CRM endpoint returns correct `points_value` for Gold customer with 4588 pts.
2. If CRM returns 0, fix on CRM side so `points_value = total_points * ratio_per_point`.
3. If CRM returns correctly but POS transform drops it, fix transform.

**Risk:** Low (fixes root cause) but requires CRM team coordination and is out of POS agent scope.
**Files:** CRM backend (out of POS scope); possibly `customerTransform.js` if transform issue.

---

### Option D: Combined B + C (RECOMMENDED)

**Scope:** Apply preview calculation fix (Option B) on POS side AND flag the CRM data investigation.

**Changes:**
1. All changes from Option B (local fallback preview).
2. Add `enrichCustomerLoyaltyFromCRM` enhancement: when `points_value = 0` and `customer.id` available, also call `GET /pos/customers/{id}/loyalty` for the authoritative 6-key blob.
3. CRM team investigates `points_value = 0` in `/pos/customer-lookup` response.
4. Once CRM returns correct `points_value`, the fallback calculation becomes a safety net only.

**Risk:** Low-Medium — POS-side fix unblocks the UI immediately; CRM fix addresses root data cause.
**Files (POS):** `CollectPaymentPanel.jsx`, possibly `OrderEntry.jsx` (loyalty enrichment enhancement)
**Files (CRM):** Out of scope — flagged for CRM team.

---

## 10. Recommended Fix

**Option D (Combined B + C)** — safest approach that addresses both the UI symptom and the data root cause.

**Rationale:**
- **Immediate:** POS computes a preview discount from available data (`total_points * ratio_per_point`, with 0.25 fallback). The cashier sees the discount preview. Bill Summary reflects it.
- **Correct:** Preview is clearly labeled as estimated when using fallback ratio. Server-returned `redeemed_value` remains authoritative at payment time.
- **Safe:** No CRM mutation. No redeem API call at preview stage. Payload force-zero gates still protect non-preview paths.
- **Sustainable:** CRM fix for `points_value` makes the fallback moot. POS fallback remains as a safety net.

**Key constraints:**
- "No points" must NEVER appear when customer has `total_points > 0`.
- Preview discount shown in Loyalty card AND Bill Summary.
- Payload stays force-zero until payment confirmation + redeem API success.
- Helper text must communicate the preview nature clearly.
- When server responds with actual `redeemed_value` at payment, override preview with server value.

---

## 11. Payload / CRM Impact

### 11.1 No CRM mutation in preview

- Preview calculation is **100% client-side** — no API calls, no point deductions.
- `redemption` state remains `null` during preview.
- Payload fields (`used_loyalty_point`, `loyalty_dicount_amount`, `loyalty_redemption_id`) remain gated by `redemption?.redeemedValue` / `discounts.loyaltyPointsRedeemed` — which are null/0 during preview.
- `orderTransform.js` payload force-zero gates are unchanged.

### 11.2 Final collect bill / payment flow

At payment confirmation (cashier clicks Pay):
1. If `useLoyalty = true` AND `customerPointsValue > 0` (or fallback-computed equivalent): fire `redeemLoyalty()`.
2. Server returns `redeemed_value`, `points_redeemed`, `transaction_id`.
3. `setRedemption(committedRedemption)` → overrides preview discount with server value.
4. Payload carries server-returned values (not preview-computed values).
5. `loyaltyDiscount = redemption.redeemedValue` (authoritative).

### 11.3 Concern: preview discount ≠ server discount

The server auto-caps based on `max_redemption_percent`, `max_redemption_amount`, `min_redemption_points` — settings POS doesn't know. The preview may show a higher discount than the server allows.

**Mitigation:**
- Label preview as "Up to ₹X" or "~₹X estimated".
- After redeem response, if `data.points_redeemed < points_to_redeem`, show info note "Capped to maximum allowed."
- Server value is ALWAYS authoritative post-redeem.

---

## 12. Files Likely To Change (NOT EDITED)

| File | Change type | Purpose |
|------|------------|---------|
| `src/components/order-entry/CollectPaymentPanel.jsx` | Edit | Fix right-side display, add fallback preview calc, update helper copy, ensure Bill Summary reflects preview |
| `src/utils/BUG108_FLAGS.js` | Edit (minor) | Add/update copy strings for preview state (e.g., `loyaltyPreviewDiscountHelper`) |
| `src/components/order-entry/OrderEntry.jsx` | Possible edit | Enhance `enrichCustomerLoyaltyFromCRM` to also call `/pos/customers/{id}/loyalty` when `points_value = 0` |
| `src/api/transforms/customerTransform.js` | Possible edit | Add fallback ratio-based `points_value` computation in `buildSyntheticLoyalty` |

**NOT to be edited:** `loyaltyTransform.js`, `loyaltyService.js`, `orderTransform.js`, `customerService.js`, backend files, `.env`, memory/final/ docs, baseline docs.

---

## 13. QA Plan

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Gold customer with 4588 pts, `points_value=0` from CRM | Right side: "~₹X available" (fallback calc). Helper: preview discount info. Bill Summary: shows loyalty discount line. Checkbox: enabled, checkable. |
| 2 | Gold customer with 4588 pts, `points_value=6882` from CRM | Right side: "₹X available" (capped by subtotal). Same as normal. |
| 3 | Customer with 0 pts | Checkbox disabled. Right side: "No points". Helper: "Loyalty program unavailable" or similar. |
| 4 | Customer with `loyalty_enabled=false` | `hasLoyaltyData = false`. Section renders with disabled state. |
| 5 | Bill subtotal (₹349) < `points_value` (e.g., ₹6882) | Preview discount capped at ₹349 (subtotal). |
| 6 | Bill subtotal (₹10000) > `points_value` (e.g., ₹6882) | Preview discount = ₹6882 (points_value). |
| 7 | `loyaltyRedeemLive = false` (kill switch) | Phase B behavior: preview only, no redeem flow. "No points" issue still visible if `points_value=0` — separate fix needed. |
| 8 | `loyaltyRedeemLive = true`, click Pay | Redeem API fires (if `customerPointsValue > 0` after fix). Server response overrides preview. |
| 9 | Total/tax/payable correctness with preview discount | `totalDiscount` includes `previewLoyaltyDiscount`. Tax computed on `subtotalAfterDiscount`. No negative totals. |
| 10 | Payload: preview stage (before Pay click) | `used_loyalty_point = 0`, `loyalty_dicount_amount = 0`, `loyalty_redemption_id = null` — force-zero gates intact. |
| 11 | Payload: after successful redeem | `used_loyalty_point = server.points_redeemed`, `loyalty_dicount_amount = server.redeemed_value`, `loyalty_redemption_id = server.transaction_id`. |
| 12 | No API call at preview | Network tab: zero calls to `/pos/loyalty/redeem` until Pay click. |
| 13 | Inline mirror (room service) | Same fix applied to inline mirror section (L1741-1772). |

---

## 14. Owner Questions

**Q1. Right-side Loyalty card value — what should it show?**
- A. Redeemable points count only (e.g., "4588 pts")
- B. Redeemable rupee discount only (e.g., "₹6882 available")
- C. Both points and rupee discount (e.g., "₹6882 available (4588 pts)")
- **Recommended: C** — provides complete information at a glance.

**Q2. Helper copy when preview is active — what should it say?**
- A. "Loyalty discount will be applied on final payment confirmation."
- B. "Available loyalty discount preview. Points will be deducted only after final payment."
- C. Custom owner copy
- **Recommended: B** — clearly communicates preview nature and deduction timing.

**Q3. Should preview discount affect current Bill Summary before final confirmation?**
- A. Yes, show it as a discount line in Bill Summary (labeled as "Loyalty Points" with the preview amount)
- B. No, show preview only in the Loyalty card, not in Bill Summary until final confirm
- C. Show separately as "Loyalty discount to apply: -₹X" (distinct from applied discounts)
- **Recommended: A** — unless POS total pipeline cannot handle a preview discount cleanly. If concerns about payload safety, choose C.

---

## 15. Implementation Readiness Verdict

```
ready_for_ui_calculation_fix
```

**AND** `waiting_owner_answers` for Q1-Q3 (non-blocking for development start — answers primarily affect copy and display format, not the underlying fix logic).

Sub-status:
- **UI calculation fix (Option B):** Unblocked — can start immediately. Core logic (fallback calc, right-side display, helper text) is clear regardless of Q1-Q3 answers.
- **CRM data investigation (Option C piece):** Separate track — flag for CRM team to check why `points_value = 0` for this customer.
- **No backend contract change needed:** The fix is entirely POS frontend display + local calculation.

---

## 16. Confirmations

| # | Confirmation | Status |
|---|-------------|--------|
| 1 | No code changed | Confirmed — investigation only |
| 2 | No backend changed | Confirmed |
| 3 | No data mutated | Confirmed |
| 4 | No redeem API called | Confirmed |
| 5 | No feature flags flipped | Confirmed |
| 6 | `/app/memory/final/` untouched | Confirmed |
| 7 | Baseline docs untouched | Confirmed |

---

**End of POS3.0 BUG-108 Loyalty Phase C Loyalty Calculation UI Investigation.**
