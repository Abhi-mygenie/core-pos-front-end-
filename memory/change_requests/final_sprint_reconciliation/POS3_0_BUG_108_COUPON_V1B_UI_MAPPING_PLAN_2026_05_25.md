# POS 3.0 BUG-108 — Coupon V1B UI Mapping Plan

**Date:** 2026-05-25
**Status:** `bug_108_coupon_v1b_ui_mapping_plan_ready_review_blocking_implementation`
**Persona:** Senior POS3.0 BUG-108 Coupon V1B UI Mapping Planning Agent
**Mode:** Planning only — no code changes, no API calls, no data mutation.

---

## 1. Purpose

V1A delivered read-only foundation (`couponService.js`, `couponTransform.js`, two constants). Nothing is wired to the UI; `BUG108_FLAGS.couponLive` is still `false`.

V1B is the **risky** step: it edits `CollectPaymentPanel.jsx` (2696-line core billing surface) and fixes the latent Flow 3 key-mismatch bug in `orderTransform.js`. This document maps every UI surface, every state shape, every dataflow edge, and every regression risk **before** any code is touched, so the implementer can execute with full clarity.

This plan covers:
- Where `/available` is called (focus event)
- Where `/validate` is called (debounced auto-apply + manual Apply)
- How the type-ahead dropdown works (max 5, outside-window greying, manual-code fallback)
- How `selectedCoupon` is stored (canonical V1A shape, NOT legacy mock shape)
- How `computed_discount` flows into bill totals
- How `stackable_with_loyalty` is enforced (pre-call gate + CRM-side `STACKING_NOT_ALLOWED` handling)
- How CRM `error.code` + `pos_instruction` render
- Flow 4 commit payload field mapping (`coupon_code` / `coupon_discount` / `coupon_title` / `coupon_type`)
- Flow 3 latent key-mismatch fix (included in V1B)
- Print payload `coupon_discount` addition (Owner Q5 = A)
- `couponLive` flag behavior across V1B steps
- Regression risks across all 11 sibling sections of `CollectPaymentPanel`

---

## 2. Inputs Confirmed (Read-Only Inspection)

| # | File | Key findings |
|---|------|--------------|
| 1 | `src/utils/BUG108_FLAGS.js` | L35 `couponLive: false`. L44 `couponDisabledHelper: 'Coming soon'`. L45–46 manual/coupon mutex copy strings. Untouched by V1A. |
| 2 | `src/api/services/couponService.js` | Exports `getAvailableCoupons({customerId, orderTotal, channel})` and `validateCoupon({code, customerId, orderTotal, channel, loyaltyPointsUsed})`. Network catch returns `{ error: { code: 'NETWORK', detail } }`. V1A created. |
| 3 | `src/api/transforms/couponTransform.js` | `fromAPI.availableCoupons` → `{ coupons[], error }` with camelCase fields. `fromAPI.validateCoupon` → success branch `{ valid, computedDiscount, title, code, couponType, stackableWithLoyalty, ... }` or failure branch `{ valid:false, error:{code,detail}, posInstruction, timeWindowStatus }`. V1A created. |
| 4 | `src/components/order-entry/CollectPaymentPanel.jsx` | **Coupon state** L264–266 (`selectedCoupon`, `couponCode`, `couponError`). **Discount math** L517–532. **`couponDiscount` math** L521–526 reads `selectedCoupon.type / .discount / .maxDiscount` (LEGACY MOCK SHAPE — incompatible with V1A canonical shape). **`handleApplyCoupon`** L659–672 (no-op when `couponLive=false`). **`paymentData.discounts` emit** L777–793 (`couponDiscount`, `couponTitle: selectedCoupon?.code` ❌ swaps code into title slot; `couponType: selectedCoupon?.type` ❌ legacy field). **Print `handlePrintBill` overrides** L830–867 (has `couponCode` but **NO `couponDiscount`**). **Main coupon UI** L1046–1099. **Inline-mirror coupon UI (room service)** L1586–1633. |
| 5 | `src/api/transforms/orderTransform.js` | **Flow 1 (placeOrder)** L901–905 hardcoded zero. **Flow 2 (updateOrder)** L1017–1021 hardcoded zero. **Flow 3 (placeOrderWithPayment)** L1146–1150: `coupon_discount: discounts.coupon \|\| 0` ❌ KEY-MISMATCH (`discounts.coupon` does not exist; panel emits `discounts.couponDiscount`); `couponLive` gate ABSENT. **Flow 4 (collectBillExisting)** L1355–1357: properly reads `discounts.couponDiscount`, gated by `couponLive`. **Flow 5 (buildBillPrintPayload)** L1785: emits `coupon_code` only, no `coupon_discount`. |
| 6 | V1 Implementation Plan §2.4 (E-1 through E-10), §2.5 (E-11 through E-16), §2.6 (E-17/E-18) | File-by-file edit list cross-verified against current line numbers — still accurate (no drift since plan was authored on the same date as inspection). |

---

## 3. V1B UI Mapping — Surface-by-Surface

### 3.1 Where `/available` is called

**Trigger:** Cashier focuses the coupon input field.
**Surface(s):** Main coupon section (L1046–1099) **and** room-service inline-mirror (L1586–1633). Both inputs must trigger the same fetch.

**Implementation shape (V1B):**
```
useEffect runs on mount + when [customer?.id, restaurantSettings.isCoupon, BUG108_FLAGS.couponLive, billAmount] change.
  Guard: only fire if customer?.id && restaurantSettings.isCoupon && BUG108_FLAGS.couponLive.
  Internal "focus" trigger: an onFocus handler on BOTH coupon inputs sets a single
  `shouldFetchAvailable: true` flag, which the useEffect picks up and clears after the call.
  This ensures /available is called at most ONCE per CollectPaymentPanel-open session
  per customer + per billAmount-major-change.

Call site:  couponService.getAvailableCoupons({
              customerId: customer.id,
              orderTotal: Math.max(0, itemTotal - manualDiscount - presetDiscount),
              channel:    couponTransform.toAPI.channel(orderType),
            })

State writes:
  setAvailableCoupons(result.coupons)      // sorted by expectedDiscount DESC (CRM-sorted, but POS re-sorts defensively)
  setCouponLoading(false)
  if (result.error?.code === 'NETWORK') setCouponInstruction('Unable to load coupons. Try again.')
  else setCouponInstruction(null)
```

**Throttling:**
- Single fetch per focus event (CRM contract §3.9 — no rate-limit).
- Cache stays valid for the current `customer.id` + ±5% `orderTotal` window. Beyond ±5% or on customer change → refetch on next focus.
- No fetch when `couponLive=false` (UI stays in "Coming soon" mode — V1B Step 1 default).

**EC-1 (empty list):** Show `data-testid="coupon-empty-hint"` text *"No coupons available for this customer"*. Dropdown is suppressed.

---

### 3.2 Where `/validate` is called

Two call sites:

#### 3.2.1 Debounced auto-apply (primary path — type-ahead UX)
**Trigger:** Cashier types in the coupon input; 500ms after last keystroke, if there is a non-empty `couponCode` AND `availableCoupons.length > 0`.

**Selection logic:**
```js
const typed = couponCode.trim().toUpperCase();
const filtered = availableCoupons
  .filter(c => c.withinWindowNow === true)            // skip outside-window
  .filter(c => c.code.startsWith(typed))              // prefix match
  .sort((a, b) => b.expectedDiscount - a.expectedDiscount);
const best = filtered[0];                              // EC-3: tie → API order (already preserved)
if (!best) return;                                     // no auto-apply
await couponService.validateCoupon({
  code:              best.code,
  customerId:        customer.id,
  orderTotal:        Math.max(0, itemTotal - manualDiscount - presetDiscount),
  channel:           couponTransform.toAPI.channel(orderType),
  loyaltyPointsUsed: useLoyalty ? (maxRedeemable?.maxPointsRedeemable || 0) : 0,
});
```

**On success:** `setSelectedCoupon(result)` — store the FULL `fromAPI.validateCoupon` success object. Clear `couponError` + `couponInstruction`.
**On failure:** `setSelectedCoupon(null)`. `setCouponError(errorCodeToCopy(result.error.code))`. `setCouponInstruction(result.posInstruction || null)`. **Do not retry automatically.**

#### 3.2.2 Manual Apply button (unknown-code fallback per Owner SQ-3)
**Trigger:** Cashier clicks the Apply button.

```js
const handleApplyCoupon = async () => {
  setCouponError(""); setCouponInstruction(null);
  if (!BUG108_FLAGS.couponLive) return;                 // belt-and-braces guard
  if (!customer?.id || !couponCode) return;
  setCouponLoading(true);
  const result = await couponService.validateCoupon({...});  // same args as 3.2.1
  setCouponLoading(false);
  // same success/failure handling as 3.2.1
};
```

**Debounce cancellation:** When Apply is clicked, the 500ms debounce timer for auto-apply is cleared to avoid double-fire.

**Owner Q3 + Q4 — cancel/refund behavior:**
- `/validate` is NON-mutating (CRM contract §3.1). Re-clicking Apply or removing/re-applying a coupon never consumes the per-customer allowance.
- Consumption happens only at `POST /api/pos/orders` (via POS Backend bridge) i.e., Flow 3 / Flow 4 commit. V1B Step 2 enables that path.

---

### 3.3 Type-ahead dropdown UX

**Anatomy:**
```
┌─ data-testid="coupon-section" ───────────────────────────────┐
│ 🎫 Coupon  [Enter code or pick…___________]   [ Apply ]      │
│   data-testid="coupon-input"               data-testid="apply-coupon-btn"
│                                                              │
│ ── dropdown (rendered only when input focused +              │
│    availableCoupons.length > 0 + !selectedCoupon) ──         │
│ data-testid="coupon-suggestions-dropdown"                    │
│   ┌────────────────────────────────────────────────────┐    │
│   │ SUMMER20     −₹100                       (auto)    │    │
│   │   data-testid="coupon-suggestion-SUMMER20"         │    │
│   │ BIRTHDAY50   −₹50                                  │    │
│   │   data-testid="coupon-suggestion-BIRTHDAY50"       │    │
│   │ HAPPY3PM     Available from 3:00 PM   (greyed)     │    │
│   │   data-testid="coupon-outside-window-hint"         │    │
│   │   (opacity 0.5, not clickable)                     │    │
│   └────────────────────────────────────────────────────┘    │
│                                                              │
│ ── empty / error / applied chip / instruction ──             │
│ data-testid="coupon-empty-hint"          (if list empty)     │
│ data-testid="coupon-error-text"          (if error)          │
│ data-testid="coupon-pos-instruction-text"(if posInstruction) │
│ data-testid="applied-coupon-chip"        (if selectedCoupon) │
└──────────────────────────────────────────────────────────────┘
```

**Behavior rules:**
- Max **5 items visible**, scrollable below (overflow-y-auto, max-h ~ 200px).
- Sort: descending by `expectedDiscount`.
- Outside-window (`withinWindowNow === false`):
  - Rendered with `opacity: 0.5`, `pointer-events: none`.
  - Right side shows formatted `nextWindowStart` (use existing `date-fns` formatter if available, else `new Date(...).toLocaleTimeString('en-IN', {hour:'numeric', minute:'2-digit'})`).
- Click on a non-greyed row → behaves identically to manual Apply with that code.
- Cashier-clicks-outside or coupon-input-blur → hide dropdown (small 150ms delay so click-on-suggestion isn't swallowed).
- `selectedCoupon` non-null → dropdown is suppressed (the applied chip + Remove button replace it).
- Mutual exclusion (BUG-108 P1 Q10 preserved): when `manualDiscount > 0 || presetDiscount > 0`, the entire coupon block keeps current "blocked + helper text" treatment. Dropdown does NOT render in blocked state.

**Inline-mirror (room-service) parity (L1586–1633):**
- Same dropdown + same behavior. Smaller text class (`text-xs`) per existing style. Same `data-testid` prefix (no "-inline" suffix needed — both surfaces map to the same logical control).

---

### 3.4 How `selectedCoupon` is stored

**MUST migrate from legacy mock shape → V1A canonical shape:**

Legacy (current code, L521–526, L783–784, L1093):
```js
selectedCoupon = { code, type: 'percent'|'flat', discount, maxDiscount }
```

V1B canonical (from `couponTransform.fromAPI.validateCoupon`):
```js
selectedCoupon = {
  valid: true,
  couponId, code, title, couponType, discountScope,
  computedDiscount,        // ← REPLACES legacy .discount + .type math
  finalAmountPreview,      // informational only (CRM-computed total preview)
  stackableWithLoyalty,
  offerType,
}
```

**Migration impact (single source of truth):**
- `couponDiscount` (L521–526) becomes `selectedCoupon?.computedDiscount || 0`. The entire percent/flat ternary + `maxDiscount` cap is REMOVED — CRM does that math now.
- The `couponTitle` paymentData field (L783) becomes `selectedCoupon?.title || ''` (informational; was incorrectly carrying the code).
- The `couponType` paymentData field (L784) becomes `selectedCoupon?.couponType || ''` (was reading legacy `.type` which is `'percent'|'flat'` — incompatible with CRM contract values `'order'|'item'|'category'`).
- New paymentData field `couponCode: selectedCoupon?.code || ''` is added.
- The `<span>✓ {selectedCoupon.code} (-₹{couponDiscount})` chip (L1093, L1627) still works — `.code` is still the field name in canonical shape.

**State additions in V1B:**
```js
const [availableCoupons, setAvailableCoupons]   = useState([]);   // from /available
const [couponLoading, setCouponLoading]         = useState(false); // /validate in-flight indicator
const [couponInstruction, setCouponInstruction] = useState(null);  // CRM pos_instruction
const [showCouponDropdown, setShowCouponDropdown] = useState(false);// focus + non-empty list
```

Existing state (`selectedCoupon`, `couponCode`, `couponError`) kept.

---

### 3.5 How `computed_discount` affects bill totals

**Current dataflow (unchanged structurally):**
```
itemTotal
  − manualDiscount
  − presetDiscount
  − loyaltyDiscount              (Phase C, max-redeemable driven)
  − couponDiscount               ← V1B change point
  − walletDiscount
  = subtotalAfterDiscount        (then + SC + delivery + tip → tax → finalTotal)
```

**V1B change:**
- `couponDiscount` (line 521 area) is computed as:
  ```js
  const couponDiscount = (BUG108_FLAGS.couponLive && selectedCoupon)
    ? Math.max(0, parseFloat(selectedCoupon.computedDiscount) || 0)
    : 0;
  ```
- `totalDiscount` (line 532) — no change to formula; it just consumes the new `couponDiscount`.
- `walletDiscount` cap (line 528–529) — unchanged formula; the `itemTotal - manualDiscount - loyaltyDiscount - couponDiscount` cap already references `couponDiscount` correctly.

**Source of truth:** CRM's `computed_discount` is authoritative. POS does NOT recompute, NOT cap, NOT validate `finalAmountPreview`. This is the architectural pivot from V1A → V1B: pre-V1B, POS computed the discount; post-V1B, CRM does. POS only displays.

**Variance handling:** Per CRM contract §3.5, CRM logs `discount_mismatch: true` when commit-side recompute differs from POS-sent `coupon_discount` by more than `max(₹1, 1% × CRM-computed)`. This is **audit-only**; the order persists at the POS-sent value. No UI signal required in V1.

---

### 3.6 How `stackable_with_loyalty` is enforced

Two layers — both required.

#### 3.6.1 Pre-call layer (POS-side gate)
Before calling `/validate`, send `loyalty_points_used`:
```js
loyaltyPointsUsed: useLoyalty ? (maxRedeemable?.maxPointsRedeemable || 0) : 0
```
CRM uses this value to decide `STACKING_NOT_ALLOWED`. POS sends honestly; CRM rules.

#### 3.6.2 Post-response layer (CRM-side gate)
If CRM returns `error.code === 'STACKING_NOT_ALLOWED'`:
- `setCouponError(errorCodeToCopy('STACKING_NOT_ALLOWED'))` → *"Cannot combine coupon with loyalty points"*
- `setCouponInstruction(result.posInstruction || null)` (CRM may suggest "Remove loyalty to apply this coupon")
- `setSelectedCoupon(null)` — coupon NOT applied
- **Loyalty checkbox remains as-is.** Owner decision: cashier resolves the conflict (either remove loyalty then retry coupon, or accept loyalty and skip this coupon). No auto-unset of either.

#### 3.6.3 Reverse direction (loyalty toggled ON after coupon applied)
If `useLoyalty` flips from `false → true` while `selectedCoupon != null && !selectedCoupon.stackableWithLoyalty`:
- Show inline warning: *"This coupon cannot be combined with loyalty points. Remove one to proceed."*
- Both reductions remain visible in UI (defer decision to cashier).
- **On Pay click**, block submission with the same toast until either coupon or loyalty is removed.
- Implementation simplification: the same `STACKING_NOT_ALLOWED` error path can be re-triggered by calling `/validate` again with the new `loyaltyPointsUsed` value when loyalty is toggled, which is cleaner. The implementer chooses; spec is "user cannot Pay until conflict resolved."

**Stackable case:** If `selectedCoupon.stackableWithLoyalty === true`, both apply normally. CRM has already verified eligibility for this combination during `/validate`.

---

### 3.7 How CRM `error.code` and `pos_instruction` are shown

**Two distinct UI slots:**

| Slot | `data-testid` | Source | When shown |
|------|---------------|--------|-----------|
| Error text | `coupon-error-text` (already exists at L1090) | `errorCodeToCopy(result.error.code)` | When `result.valid === false` OR `result.error` truthy |
| Instruction text | `coupon-pos-instruction-text` (NEW) | `result.posInstruction` | When `result.posInstruction` is non-null (CRM provided contextual hint) |

**Helper function (new, in `couponTransform.js` OR co-located in `CollectPaymentPanel.jsx` per implementer preference):**

```js
const ERROR_CODE_COPY = {
  INVALID_CODE:                  'Invalid coupon code',
  EXPIRED:                       'Coupon has expired',
  INACTIVE:                      'Coupon is no longer active',
  MIN_ORDER_NOT_MET:             'Minimum order value not met',
  USAGE_LIMIT_REACHED:           'Coupon fully redeemed',
  CUSTOMER_USAGE_LIMIT_REACHED:  'You have used this coupon the maximum number of times',
  CUSTOMER_NOT_ELIGIBLE:         'Coupon not available for this customer',
  CHANNEL_NOT_VALID:             'Coupon not valid for this order type',
  STACKING_NOT_ALLOWED:          'Cannot combine coupon with loyalty points',
  OUTSIDE_TIME_WINDOW:           'Coupon not active right now',
  NETWORK:                       'Unable to validate coupon. Try again.',
  UNKNOWN:                       'Coupon could not be applied',
};
export const errorCodeToCopy = (code) => ERROR_CODE_COPY[code] || ERROR_CODE_COPY.UNKNOWN;
```

**Render order on coupon section:**
1. Helper text (existing — block/mutex helper)
2. Error text (existing testid)
3. POS instruction (new testid)
4. Applied-coupon chip (existing)

**Rendering rules:**
- Show only ONE error text at a time. CRM's structured `error.code` is the only source — never display `result.error.detail` (it's CRM internal/debug; per Contract Freeze §3.7).
- Show `pos_instruction` AS-IS — already English-only per Owner Q12.
- Clearing: any keystroke in the coupon input OR clicking Remove on an applied coupon clears both `couponError` and `couponInstruction`.

---

### 3.8 Flow 4 (collectBillExisting) commit-payload field mapping

This is the postpaid Collect Bill path — the V1B primary commit-flow target.

**Current state (orderTransform.js L1349–1357):**
```js
self_discount:    discounts.manual || 0,
coupon_discount:  BUG108_FLAGS.couponLive ? (discounts.couponDiscount || 0) : 0,
coupon_title:     BUG108_FLAGS.couponLive ? (discounts.couponTitle || '') : '',
coupon_type:      BUG108_FLAGS.couponLive ? (discounts.couponType || '') : '',
```

**V1B edits (E-15 in V1 plan):**
```js
self_discount:    discounts.manual || 0,
coupon_code:      BUG108_FLAGS.couponLive ? (discounts.couponCode  || '') : '',  // NEW (Owner SQ-1 = A)
coupon_discount:  BUG108_FLAGS.couponLive ? (discounts.couponDiscount || 0) : 0,
coupon_title:     BUG108_FLAGS.couponLive ? (discounts.couponTitle  || '') : '',
coupon_type:      BUG108_FLAGS.couponLive ? (discounts.couponType   || '') : '',
```

**Caller-side mapping (CollectPaymentPanel L777–793):**
```js
discounts: {
  ...
  couponDiscount:       couponDiscount,                              // unchanged
  couponCode:           selectedCoupon?.code || '',                  // NEW
  couponTitle:          selectedCoupon?.title || '',                 // CHANGED: was selectedCoupon?.code
  couponType:           selectedCoupon?.couponType || '',            // CHANGED: was selectedCoupon?.type
}
```

**End-to-end contract (POS FE → POS BE → CRM):**
- POS FE sends `coupon_code`, `coupon_discount`, `coupon_title`, `coupon_type` on `POST …/order-bill-payment`.
- POS BE forwards these to CRM `POST /api/pos/orders` unmodified (per Owner Q4 frozen — POS BE bridges, FE never calls CRM commit endpoint).
- CRM commits `coupon_usage` row (idempotent on `(user_id, order_id)` per CRM §3.6).

**`coupon_type` value mapping for V1:** Always `'order'` (V1 supports only `discount_scope='order'`). Future V2 adds `'item'` / `'category'`; V3 OMITS the field entirely for BOGO/BXG/Nth (per CRM Q3 — POS BE mapper must support field omission, V3 prerequisite).

---

### 3.9 Whether Flow 3 (placeOrderWithPayment / prepaid) key-mismatch fix is included in V1B

**YES — V1B MUST land the Flow 3 fix in the same change as the `couponLive=true` flip.**

**Why:** The latent bug (L1148: `coupon_discount: discounts.coupon || 0`) is currently masked because `couponLive=false` zeroes the panel-side coupon math. The moment Step 3 flips `couponLive=true`, Flow 3 would silently drop the coupon discount on prepaid orders while Flow 4 (postpaid) would carry it correctly — producing inconsistent CRM `coupon_usage.recorded` records keyed by payment-collection style.

**V1B fix (E-13 + E-14 in V1 plan):**
```js
// Flow 3, orderTransform.js L1146–1150
self_discount:    discounts.manual || 0,
coupon_code:      BUG108_FLAGS.couponLive ? (discounts.couponCode  || '') : '',  // NEW
coupon_discount:  BUG108_FLAGS.couponLive ? (discounts.couponDiscount || 0) : 0,  // FIX: was discounts.coupon
coupon_title:     BUG108_FLAGS.couponLive ? (discounts.couponTitle  || '') : '',
coupon_type:      BUG108_FLAGS.couponLive ? (discounts.couponType   || '') : '',
```

**Field-by-field diff from current:**
| Field | Current (L1148–1150) | V1B |
|-------|----------------------|-----|
| `coupon_code` | absent | NEW — `discounts.couponCode \|\| ''` (gated) |
| `coupon_discount` | `discounts.coupon \|\| 0` ❌ (key-mismatch) | `discounts.couponDiscount \|\| 0` (gated) |
| `coupon_title` | `discounts.couponTitle \|\| ''` (ungated) | gated by `couponLive` for symmetry with Flow 4 |
| `coupon_type` | `discounts.couponType \|\| ''` (ungated) | gated by `couponLive` for symmetry with Flow 4 |

**Verification at QA gate:** T-15 in V1 plan §7.4 — Apply coupon in Flow 3 (prepaid Place+Pay) + UPI → confirm CRM `coupon_usage.recorded=true`.

**Flows 1 and 2 (placeOrder, updateOrder) — also touched:**
Per V1 plan E-11/E-12, add hardcoded `coupon_code: ''` field next to existing `coupon_discount: 0`, `coupon_title: null`, `coupon_type: null`. These flows never carry coupons (placement-time / item-add) so values stay hardcoded; the field is added for backend schema parity only.

---

### 3.10 How the print payload shows coupon discount

**Current (orderTransform.js L1785):**
```js
coupon_code: BUG108_FLAGS.couponLive ? (overrides.couponCode !== undefined ? overrides.couponCode : '') : '',
```
Only the code prints; no discount amount is sent.

**V1B (E-16 in V1 plan, Owner Q5 = A):**
```js
coupon_code:     BUG108_FLAGS.couponLive ? (overrides.couponCode !== undefined ? overrides.couponCode : '') : '',
coupon_discount: BUG108_FLAGS.couponLive ? (overrides.couponDiscount !== undefined ? overrides.couponDiscount : 0) : 0,  // NEW
```

**Caller-side override addition (CollectPaymentPanel L834–867):**
```js
const overrides = {
  ...
  couponCode:     selectedCoupon?.code || '',          // unchanged
  couponDiscount: couponDiscount,                      // NEW (Owner Q5)
  loyaltyAmount:  loyaltyDiscount,                     // existing
  ...
};
```

**Bill template impact:** The bill template (POS BE side, NOT in this repo) renders a `"Coupon <CODE>  −₹X"` line beneath the existing `"Discount"` line, mirroring the `loyalty_dicount_amount` print pattern (L1786). **Template change is a POS BE deliverable** — not in this plan's scope, but is a pre-launch gate per V1 plan §6.1 ("Print Bill button now shows Coupon −₹X when applied").

**Auto-print parity:** `handleAutoPrint` (Order placement print) — verify uses the same `buildBillPrintPayload` → so the new `coupon_discount` field flows automatically. No additional edits required.

**Force-zero discipline:** When `couponLive=false`, both `coupon_code` and `coupon_discount` print as empty/zero. Identical to today for `coupon_code`; new behavior for `coupon_discount`.

---

### 3.11 How `couponLive` flag controls visibility and safety

V1B uses the flag in **THREE distinct ways** at different steps:

#### 3.11.1 Step 1 — `couponLive = false` (default, today)
- New code is in place but **untriggered**.
- Coupon UI shows existing "Coming soon" helper. No dropdown rendered.
- `handleApplyCoupon` early-returns (existing belt-and-braces).
- `couponDiscount` math reads `selectedCoupon?.computedDiscount` — but `selectedCoupon` stays `null` because nothing can set it (Apply is no-op and auto-apply is gated by the same flag).
- Flow 3 / Flow 4 / Print payloads: `coupon_*` fields force-zero/empty.
- **Outcome:** UI behaves identical to V1A. Safe to merge to main.

#### 3.11.2 Step 2 — `couponLive = true` (post-merge, preprod QA window)
- All gates open atomically:
  - Coupon section helper text disappears ("Coming soon" removed by E-18 — but actually E-18 closure deferred to Step 4; in Step 2 the helper just stops showing because `!couponLive` branch is false).
  - Type-ahead dropdown becomes operational on focus.
  - `handleApplyCoupon` makes real CRM calls.
  - Auto-apply debounce becomes active.
  - Flow 3 / Flow 4 / Print payloads carry real `coupon_*` values.
- **Reversal:** flip back to `false` if QA finds a P0/P1 — entire feature is gated by one constant.

#### 3.11.3 Step 4 — V1 closure (remove the constant entirely)
- Constant `couponLive` removed from `BUG108_FLAGS.js`.
- All `BUG108_FLAGS.couponLive ? ... : ...` ternaries in `orderTransform.js` (Flows 3/4/Print) and `CollectPaymentPanel.jsx` (math, UI gating) become unconditional.
- `BUG108_COPY.couponDisabledHelper: 'Coming soon'` removed; the helper-text branch is dead-coded out.
- Mutex (manual discount ↔ coupon) gate stays in place; only the kill switch is gone.
- `restaurantSettings.isCoupon` (backend profile flag) remains as the only cascade gate.
- **Step 4 is NOT part of V1B Step 2 implementation.** It's a separate trivial PR after QA + owner sign-off.

#### 3.11.4 Safety properties

| Property | Mechanism |
|----------|-----------|
| No mutating API call when flag is off | `handleApplyCoupon` early-return + auto-apply useEffect early-return + Flow 3/4 payload force-zero |
| No accidental coupon UI exposure | Coupon section gating already conditioned on `customer && restaurantSettings.isCoupon`; flag gate is additive |
| No data leak via print | Print payload force-zero (existing L1785 pattern, extended to `coupon_discount`) |
| Single-point reversal | One constant flip restores pre-V1B behavior |

---

## 4. Collect Bill UI Areas Affected

| # | Area | Lines (current) | Edit type | Risk |
|---|------|-----------------|-----------|------|
| 1 | Coupon state declarations | L264–266 | **Add** 4 new useState calls; KEEP existing 3 | Low — purely additive |
| 2 | `couponDiscount` math | L521–526 | **Rewrite** — replace 5-line percent/flat ternary with single-line `selectedCoupon?.computedDiscount` read | Medium — financial math change |
| 3 | `handleApplyCoupon` | L659–672 | **Rewrite** — replace 4-line no-op with async `/validate` call + error mapping | Medium — new async flow |
| 4 | Coupon useEffect (`/available` on focus) | NEW after L724 (post-maxRedeemable useEffect) | **Add** new useEffect | Medium — adds a network call to billing surface |
| 5 | Coupon useEffect (debounced auto-apply) | NEW after #4 | **Add** new useEffect with 500ms debounce ref | Medium — input timing |
| 6 | Stacking guard useEffect (loyalty toggled while coupon applied) | NEW after #5 | **Add** new useEffect watching `[useLoyalty, selectedCoupon?.stackableWithLoyalty]` | Low — UI warning only |
| 7 | `paymentData.discounts` emit | L777–793 | **Edit** — add `couponCode`; fix `couponTitle` source; fix `couponType` source | Medium — payload shape |
| 8 | `handlePrintBill` overrides | L834–867 | **Edit** — add `couponDiscount` override | Low — additive |
| 9 | Coupon UI block (main view) | L1046–1099 | **Rewrite** — replace input-only render with full type-ahead dropdown + applied chip + error + instruction slots | High — UI surface area |
| 10 | Coupon UI block (room-service inline-mirror) | L1586–1633 | **Rewrite** — same treatment, smaller text classes | High — UI surface area |
| 11 | New `data-testid` attributes | All new render branches | **Add** | Low — additive |

**Sibling sections NOT changed by V1B** (must remain pixel/byte-identical):
1. Discount input (manual + preset) L960–1042
2. Loyalty section L1102–1175 + room-service mirror
3. Wallet section L1178–1240
4. Service-charge toggle
5. Delivery-charge input
6. Tip input
7. Round-off display
8. Payment method selector
9. Split-payment modal
10. Cash quick-pills + change calculator
11. Card transaction ID
12. TAB/Credit search
13. PayLater branch
14. Transfer-to-room branch
15. Action buttons (Pay / Print Bill / Hold / Cancel)

---

## 5. Files Expected to Change in V1B

| # | File | Edits | Source plan ref |
|---|------|-------|-----------------|
| 1 | `src/components/order-entry/CollectPaymentPanel.jsx` | E-1..E-10 (state + math + handlers + UI + testids) | V1 plan §2.4 |
| 2 | `src/api/transforms/orderTransform.js` | E-11, E-12 (Flow 1/2 `coupon_code` parity) ; E-13, E-14 (Flow 3 KEY-MISMATCH FIX + field set) ; E-15 (Flow 4 `coupon_code` add) ; E-16 (Flow 5 print `coupon_discount` add) | V1 plan §2.5 |
| 3 | `src/utils/BUG108_FLAGS.js` | E-17 (`couponLive: true` flip — **gated behind Step 2 sign-off**, NOT in same PR as code edits) | V1 plan §2.6 |
| 4 | (Optional helper extraction) `src/api/transforms/couponTransform.js` | Add `errorCodeToCopy(code)` export co-located with transforms — OR — inline the map in `CollectPaymentPanel.jsx`. Implementer choice; the map itself is ~12 lines. | V1 plan §5 |

**Files NOT touched in V1B:**
- `src/api/services/couponService.js` (complete from V1A)
- `src/api/constants.js` (complete from V1A)
- `src/components/order-entry/CartPanel.jsx` (QSR stays coupon-free per Owner Q4)
- `src/api/transforms/customerTransform.js` (`customer.coupons` slot stays orphan)
- Anything in `/app/backend` (this is a stub; real POS BE is external Laravel)
- Anything in CRM
- Anything in `/app/memory/final/`

---

## 6. V1B Scope

| # | Item | Plan ref | Step |
|---|------|----------|------|
| 1 | New CollectPaymentPanel state: `availableCoupons`, `couponLoading`, `couponInstruction`, `showCouponDropdown` | E-1 | Step 1 |
| 2 | `couponDiscount` math migration to canonical `computedDiscount` | E-2 | Step 1 |
| 3 | `handleApplyCoupon` rewrite — real `/validate` call + error mapping | E-3 | Step 1 |
| 4 | useEffect: `/available` on coupon-input focus | E-4 | Step 1 |
| 5 | useEffect: 500ms debounced auto-apply of highest-`expectedDiscount` match | E-5 | Step 1 |
| 6 | `paymentData.discounts` emit corrections (`couponCode` add, `couponTitle` source fix, `couponType` source fix) | E-6 | Step 1 |
| 7 | `handlePrintBill` overrides — add `couponDiscount` | E-7 | Step 1 |
| 8 | Coupon UI block rewrite (main view): dropdown + applied chip + error + instruction + testids | E-8 + E-10 | Step 1 |
| 9 | Coupon UI block rewrite (room-service inline-mirror) | E-9 + E-10 | Step 1 |
| 10 | `orderTransform.js` Flow 1/2: add `coupon_code: ''` parity field | E-11, E-12 | Step 1 |
| 11 | `orderTransform.js` Flow 3 KEY-MISMATCH FIX + `couponLive` gating + `coupon_code` add | E-13, E-14 | Step 1 |
| 12 | `orderTransform.js` Flow 4: add `coupon_code` field | E-15 | Step 1 |
| 13 | `orderTransform.js` Flow 5 (print): add `coupon_discount` gated field | E-16 | Step 1 |
| 14 | Error code → cashier copy helper (`errorCodeToCopy(code)`) | §5 | Step 1 |
| 15 | Cashier-cancel warning toast (when cancelling a coupon-applied order, pre/post commit) | Owner Q3 = A | Step 1 |
| 16 | Step 2 `couponLive = true` flip | E-17 | Step 2 (separate PR, post-QA gate) |

---

## 7. Deferred Scope (explicitly NOT V1B)

| # | Item | Phase |
|---|------|-------|
| 1 | `BUG108_FLAGS.couponLive` constant removal + `'Coming soon'` copy deletion + dead-code cleanup | V1 closure (Step 4) |
| 2 | Item / category coupons (`discount_scope='item' / 'category'`) | V2 |
| 3 | `items[]` payload to `/validate` + `POSCartItem` mapper implementation | V2 |
| 4 | POS Backend mapper audit + `items[]` forwarding | V2 prereq |
| 5 | BOGO / BXG / Every-Nth coupons (`offer_type='bogo'/'bxg'/'nth_item'`) | V3 |
| 6 | `benefit_items` UI preview ("Free items: 1× Coffee") | V3 |
| 7 | `coupon_type` OMISSION on V3 commit payload | V3 prereq (POS BE mapper) |
| 8 | QSR fresh Place+Pay coupon UI (CartPanel) | Owner Q4 = A — permanently deferred |
| 9 | Room / hotel coupon flow (`transferToRoom`) | Out of phase 1 |
| 10 | Coupon reversal / refund endpoint | CRM Phase 2 (no ETA) |
| 11 | Direct Frontend → CRM `POST /api/pos/orders` commit | Permanently NOT — Owner Q4 = yes, POS BE bridges |
| 12 | Deprecated `/api/pos/coupons/apply` endpoint | Permanently NOT |
| 13 | Backend mapper changes (Laravel PHP) | POS BE team — not in this repo's scope |
| 14 | Wallet / Loyalty / reverse flow changes | Out of BUG-108 V1B |
| 15 | Exclusion-inference UX ("Eligible for: Coffee, Pizza") | V2+ enhancement |
| 16 | i18n / non-English `pos_instruction` rendering | Phase 2 (Owner Q12 = English-only V1) |
| 17 | CRM `coupon_usage.recorded` / `discount_mismatch` flag threading back to POS UI | V1 optional enhancement (cashier-cancel toast may use it if available; otherwise toast is local-only) |

---

## 8. Regression Risks (CollectPaymentPanel)

Ranked by severity. Each must have a corresponding QA test in §9.

| # | Risk | Mitigation | Severity |
|---|------|------------|----------|
| R-1 | **`couponDiscount` math change breaks bill totals.** Migration from legacy `selectedCoupon.type/.discount/.maxDiscount` → canonical `.computedDiscount`. If `selectedCoupon` retains the legacy shape anywhere (e.g., stale state from a hot-reload during dev), `couponDiscount` becomes 0 silently. | Audit: NO setter writes legacy shape anywhere post-V1B (search for `selectedCoupon = { code, type:` patterns and remove). The only setter site is `handleApplyCoupon` + auto-apply effect, both writing canonical shape. | **HIGH** |
| R-2 | **Flow 3 fix changes prepaid order payloads.** Today prepaid Flow 3 always sends `coupon_discount: 0` (key-mismatch). After fix, it sends real value when `couponLive=true`. POS BE / CRM must handle this end-to-end. | T-15 in V1 plan §7.4 — verify CRM `coupon_usage.recorded=true` on prepaid Place+Pay with coupon. | **HIGH** |
| R-3 | **Manual-discount ↔ coupon mutex (BUG-108 P1 Q10) accidentally broken.** Current logic at L1051 (`couponBlocked = !couponLive \|\| isManualActive`) and L1591 (inline). Rewriting the UI block must preserve this. | Keep the `isManualActive` derivation + the `couponBlocked` short-circuit. Add it as a render-level guard around the dropdown too (no dropdown when `couponBlocked=true`). | HIGH |
| R-4 | **Type-ahead dropdown blocks clicks on Apply button / Remove button.** Stacking-context / z-index conflicts. | Use absolute positioning + max-height + explicit z-index on the dropdown container. Click-outside-to-close uses `onBlur` with 150ms delay. | HIGH |
| R-5 | **`/available` called on every keystroke or every render.** Without correct useEffect dep array, this thrashes CRM. | Strict deps: `[customer?.id, restaurantSettings?.isCoupon, BUG108_FLAGS.couponLive, billAmountBucket]` where `billAmountBucket = Math.floor(billAmount / 50) * 50` (only refetch every ₹50 step). Add an explicit `onFocus → fetch-if-stale` pattern instead of constant useEffect. | HIGH |
| R-6 | **Loyalty + coupon stacking warning duplicates with existing Phase C loyalty warnings.** Multiple inline warnings can collide visually. | Single error slot precedence: `STACKING_NOT_ALLOWED > ...other errors`. Stacking warning rendered only in coupon section, not loyalty section. | MEDIUM |
| R-7 | **Print payload `coupon_discount` may double-count if POS BE also pulls from `coupon_title`.** | Coordinate with POS BE: spec is that BE forwards POS-FE-sent `coupon_discount` verbatim to print. No backend math change. | MEDIUM |
| R-8 | **Inline-mirror (room service) `couponCode` state shared with main view.** Today both surfaces share `selectedCoupon` / `couponCode` — that's intentional. V1B must preserve shared state (one applied coupon per panel session, not per surface). | Do NOT introduce per-surface state. Both render branches read/write the same useState hooks. | MEDIUM |
| R-9 | **CRM `error.detail` accidentally leaked to cashier.** If implementer maps `error.detail` directly to UI instead of using `errorCodeToCopy(error.code)`. | Render contract: ONLY `errorCodeToCopy(result.error.code)`. Never `result.error.detail`. | MEDIUM |
| R-10 | **`channel` field encodes unsupported orderType.** CollectPaymentPanel sees `orderType='walkIn'`; `couponTransform.toAPI.channel('walkIn')` returns `'pos'`. CRM accepts `'pos'` as generic; OK. But if any new orderType ships (e.g., `'preOrder'`), behavior is silently `'pos'`. | Document the fallback. Add a console.warn if orderType is non-mapped + couponLive (debugging aid only; no UI impact). | LOW |
| R-11 | **`/available` fired before customer fully loaded.** When customer is changing or partial, `customer.id` could briefly be undefined → CRM error 400. | Pre-call guard: `if (!customer?.id) return;` already required by useEffect. Trust this; CRM 400 also handled by network catch returning `{coupons:[],error:{NETWORK}}`. | LOW |
| R-12 | **Auto-apply fires while cashier is still typing → applies wrong coupon.** 500ms debounce should handle this, but a fast typist completing a typo could trigger apply on partial input. | 500ms debounce as spec. Selecting from dropdown still calls `/validate` directly so the cashier has full control. Manual Apply override always wins. | LOW |
| R-13 | **`handlePrintBill` `couponDiscount` override leak when `couponLive=false`.** Defensive: print payload should still force-zero. | Existing `orderTransform.js` L1785 force-zero via `couponLive` gate covers this — new `coupon_discount` field gets same gate. | LOW |
| R-14 | **Bundle size bloat.** New UI block + helpers ≈ +3 kB raw, ~+1 kB gzipped. | Acceptable; no further optimisation needed. | LOW |
| R-15 | **`react-hooks/exhaustive-deps` ESLint warnings from new useEffects.** | Use deps correctly. Pre-existing warning at `OrderEntry.jsx:1297` is unrelated to V1B. | LOW |
| R-16 | **Inline-mirror render branch divergence over time.** Two visually similar coupon UIs maintained separately. | V1B accepts the duplication (V1 plan §2.4 / §2.4.1 endorses it). Future refactor can extract a `<CouponInput>` sub-component, but NOT in V1B (scope discipline). | INFO |

---

## 9. QA Plan Summary

Full test matrix exists in V1 plan §7. Below is the V1B-Step-2 condensed plan with traceability.

### 9.1 Functional (against `couponLive=true`)
| Test | Maps to | Surface |
|------|---------|---------|
| T-1: 3 eligible coupons → dropdown shows 3 sorted by discount desc | V1 plan §7.1 T-1 | Main + inline-mirror |
| T-2: 0 eligible coupons → empty hint | T-2 | Both |
| T-3: Type "SU" → filters to SU* | T-3 | Both |
| T-4: Pause 500ms → highest-discount auto-applies | T-4 | Both |
| T-5: Unknown code "RANDOM" → manual Apply → `INVALID_CODE` error | T-5 | Both |
| T-6: Highest match outside-window → skipped → next-best auto-applies | T-6 | Both |
| T-7: Two coupons tie discount → API-order pick | T-7 | Both |
| T-8: Remove applied coupon → bill recomputes | T-8 | Both |
| T-9: Outside-window coupon greyed + next-window time label | T-9 | Both |
| T-10: Outside-window row not clickable | T-10 | Both |
| T-11: Outside-window code typed + Apply → `OUTSIDE_TIME_WINDOW` error + instruction | T-11 | Both |
| T-12: `stackableWithLoyalty=false` + loyalty ON → `STACKING_NOT_ALLOWED` | T-12 | Both |
| T-13: `stackableWithLoyalty=true` + loyalty ON → both apply | T-13 | Both |

### 9.2 Payload (DevTools Network)
| Test | Maps to | What to verify |
|------|---------|----------------|
| T-14: Flow 4 (postpaid + cash) → CRM `coupon_usage.recorded=true` | T-14 | `coupon_code`, `coupon_discount`, `coupon_title`, `coupon_type` populated on `…/order-bill-payment` |
| T-15: Flow 3 (prepaid + UPI) → CRM `coupon_usage.recorded=true` | T-15 | **Flow 3 key-mismatch fix verification** — `coupon_discount` non-zero on `…/place-order` (prepaid variant) |
| T-16: Split payment (cash + UPI) with coupon → CRM commit OK | T-16 | Same as T-14 |
| T-17: Apply coupon then close panel without Pay → NO commit, NO `/validate` re-call beyond expected | T-17 | `/validate` is non-mutating; closing doesn't burn allowance |
| T-18: Apply + commit + cancel order → cashier-warning toast | T-18 (Owner Q3) | Toast `"Coupon allowance consumed — cannot be refunded"` |
| T-19: Apply + manual Print Bill → bill output has "Coupon `<CODE>` −₹X" line | T-19 | Print payload `coupon_discount` flows to printer (POS BE template change is precondition) |
| T-20: Flow 4 payload `coupon_code` populated | T-20 | DevTools Network — new field present |
| T-21: Flow 3 payload `coupon_code` populated + `coupon_discount` non-zero | T-21 | **Flow 3 key-mismatch fix verification** |
| T-22: POS BE logs show coupon_* fields forwarded to CRM | T-22 (POS BE side) | BE team smoke |

### 9.3 Regression (sibling sections — must be byte-identical to pre-V1B)
| Area | Test |
|------|------|
| Manual discount (% / ₹) | Apply 10% discount → coupon section blocked + helper text correct |
| Preset discount | Apply preset → coupon blocked |
| Loyalty redemption | Phase C max-redeemable continues to work alongside V1B coupon |
| Wallet section | Visible read-only when `walletDebitLive=false` — unchanged |
| Service-charge toggle | Unchanged |
| Tip input | Unchanged |
| Delivery charge | Unchanged |
| Round-off display | Unchanged |
| Cash quick-pills + change | Unchanged |
| Split payment modal | Unchanged + coupon flows through (T-16) |
| TAB/PayLater branches | Unchanged |
| transferToRoom branch | NO coupon fields emitted (out of V1 scope) — verify Flow 6 unchanged |
| Hold-Tab Collect Bill (BUG-042-A) | Unchanged + coupon flows through Flow 4 (inherits) |
| QSR Full View → Collect Bill | Unchanged + coupon flows through Flow 4 (inherits) |
| QSR fresh Place+Pay (CartPanel) | NO coupon UI (Owner Q4=A) — verify CartPanel hardcoded zeros preserved |
| All existing data-testids | Present and unchanged (full inventory diff vs pre-V1B) |

### 9.4 Negative / safety
- With `couponLive=false`: NO `/available` and NO `/validate` network traffic, regardless of cashier action.
- With `couponLive=true` but `restaurantSettings.isCoupon=false`: coupon section hidden; no traffic.
- With `couponLive=true` but `customer=null`: coupon section hidden (existing guard at L1049).

### 9.5 Sign-off criteria for V1B Step 2 → Step 3
- All T-1..T-22 pass.
- Owner smoke pass (cash, UPI, card, split — minimum 10 orders).
- CRM dashboard shows `coupon_usage.recorded=true` rows.
- Zero P0/P1 regressions across §9.3.

---

## 10. Implementation Readiness Verdict

```
bug_108_coupon_v1b_ui_mapping_complete_ready_for_implementation_pending_owner_review
```

| Pre-implementation gate | Status |
|--------------------------|--------|
| V1A foundation merged + build green | ✅ (2026-05-25) |
| V1 Implementation Plan owner-approved | ✅ (frozen 2026-05-25) |
| CRM contract frozen | ✅ |
| POS Backend mapper forwards `coupon_*` fields end-to-end | ⚠️ Pending verification (T-22). Recommended: BE team smoke 1 cash-method `/order-bill-payment` order with `coupon_code='TEST_DRY'`, `coupon_discount=0.01` before Step 2 flag-flip. |
| Print template renders `coupon_discount` line | ⚠️ Pending POS BE template addition. NOT blocking V1B Step 1 code merge (force-zero with `couponLive=false`), but blocks Step 2 user-visible feature claim. |
| `food_id` case-exact audit for V1 | N/A — V1 is order-scope only, no `items[]` matching |
| Regression test matrix authored | ✅ (§9) |
| Latent Flow 3 fix included | ✅ (§3.9) |
| Kill-switch behavior documented across all 3 steps | ✅ (§3.11) |

**Recommendation:** Proceed with V1B Step 1 (code merge with `couponLive=false`) as the next implementation pass. This is reversible by a single one-line flip. Step 2 (flag flip to `true`) is gated behind POS BE end-to-end smoke verification and owner sign-off, per V1 plan §4.

---

## 11. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No code changed | ✅ |
| 2 | No frontend changed | ✅ |
| 3 | No backend changed | ✅ |
| 4 | No CRM changed | ✅ |
| 5 | No data mutated | ✅ |
| 6 | No mutating API called | ✅ (only read-only file inspection) |
| 7 | `/app/memory/final/` untouched | ✅ |
| 8 | Baseline docs untouched (CHANGE_REQUEST_PLAYBOOK, MODULE_DECISIONS_FINAL, IMPLEMENTATION_AGENT_RULES, ARCHITECTURE_DECISIONS_FINAL, BUSINESS_RULES_BASELINE_FINAL, FINAL_DOCS_*, OPEN_QUESTIONS_FINAL_RESOLUTION) | ✅ |
| 9 | V1A foundation files (`couponService.js`, `couponTransform.js`, constants additions) untouched | ✅ |
| 10 | V1 Implementation Plan + Contract Freeze + Payload Mapping Discovery untouched | ✅ |
| 11 | PRD.md untouched | ✅ |
| 12 | Deferred items not planned: BOGO/BXG/Nth UI, QSR coupon UI, room/hotel coupon, reversal/refund, backend mapper changes, deprecated `/api/pos/coupons/apply`, direct frontend `/api/pos/orders` | ✅ |
| 13 | V1B scope strictly traceable to V1 Implementation Plan §2.4 + §2.5 + §2.6 (E-1..E-18) | ✅ |
| 14 | Flow 3 key-mismatch fix correctly scoped to land in same change as `couponLive` flip-on path | ✅ |

---

## 12. Final V1B Decisions (2026-05-25) — Implementation Contract

This section consolidates owner answers to the 6 blockers raised during V1B mapping review. **These supersede any default mentioned earlier in this document where they differ.**

| # | Decision | Owner answer | Implementation impact |
|---|----------|--------------|----------------------|
| **B-1** | Cashier-cancel warning toast trigger paths | **(c) Post-commit + post-Hold only.** Deferred to V1B end (not initial code merge). | Toast NOT shown when CollectPaymentPanel closes without Pay (no allowance consumed). Toast shown only after CRM has committed the coupon — i.e., (1) cashier cancels order from OrderEntry after payment success, OR (2) cashier Holds an order that already carries a committed coupon. Implementation scheduled as the LAST item in V1B Step 1, after all UI + payload edits land. |
| **B-2** | Loyalty + non-stackable coupon — reverse direction (cashier toggles loyalty ON after coupon applied) | **(a) Auto-remove coupon** + toast "Coupon removed — incompatible with loyalty" | `useEffect` on `[useLoyalty]` change: if `selectedCoupon && !selectedCoupon.stackableWithLoyalty && useLoyalty`, call `setSelectedCoupon(null)` + show toast via existing `sonner` import. NO Pay-button block. NO "remove one to proceed" warning render. |
| **B-3** | Dropdown row click behavior | **(b) Apply silently** — do NOT populate input field | On click of a dropdown suggestion row, directly call `validateCoupon({ code: row.code, ... })`. Leave `couponCode` state empty (or whatever cashier already typed). Applied chip displays the code — that's the confirmation feedback. |
| **B-4** | Multiple coupons match typed prefix | **(a) Auto-apply highest `expectedDiscount`** regardless of match count | Simplest rule preserved. Cashier always retains override path: type the exact unwanted code's full alternative, OR Remove-and-reselect via dropdown. |
| **B-5** | `/available` refetch frequency per panel session | **(c) Every focus event, cached, capped at MAX 3 calls per session** | Implement a `couponAvailableCallCount` ref initialized to 0 on panel mount. Each coupon-input focus: if `couponAvailableCallCount < 3` AND cache is stale (customer changed OR no prior fetch), call `/available` and increment. After 3, focus events use cached `availableCoupons` only. Reset to 0 when CollectPaymentPanel unmounts/remounts. |
| **B-6** | `orderType` → CRM `channel` mapping | **Never send `'pos'`.** Mapping below: | See §12.1. |

### 12.1 Final Channel Map (B-6 resolved)

CRM's `'pos'` channel value is reserved for the future web/pos platform (separate POS surface). **This POS Frontend must NEVER send `'pos'`.**

```js
// V1B will REPLACE couponTransform.js CHANNEL_MAP + toAPI.channel fallback:
const CHANNEL_MAP = {
  dineIn:      'dine_in',
  walkIn:      'dine_in',   // counter-order, in-premises consumption
  takeAway:    'takeaway',
  delivery:    'delivery',
  roomService: 'dine_in',   // in-premises consumption (room-dining)
};

// Fallback for any unknown / future orderType — defensive default:
toAPI.channel = (orderType) => CHANNEL_MAP[orderType] || 'dine_in';
```

**Notes:**
- `isRoom=true` orders (room-service via `transferToRoom`) — V1 does NOT emit coupon fields on the `transferToRoom` Flow 6 payload (out of V1 scope per V1 plan §1). But if a room-service order goes through the Collect Bill path (Flow 4 — e.g., guest pays at checkout), the `/validate` call sends `channel='dine_in'`. Owner-confirmed.
- `walkIn` — counter-orders treated as `'dine_in'` (consumed in-premises). Owner-confirmed.
- `'pos'` channel deferred to future contract extension when web/pos platform is added. Not a V1B concern.

### 12.2 V1A `couponTransform.js` channel-map gap

The V1A file (`src/api/transforms/couponTransform.js`) currently has the old mapping with `'pos'` fallback. **V1B Step 1 will edit it surgically** as part of the same PR — this is a 3-line `search_replace` and does NOT count as scope creep from V1A:

```diff
 const CHANNEL_MAP = {
-  dineIn:   'dine_in',
-  takeAway: 'takeaway',
-  delivery: 'delivery',
+  dineIn:      'dine_in',
+  walkIn:      'dine_in',
+  takeAway:    'takeaway',
+  delivery:    'delivery',
+  roomService: 'dine_in',
 };
 ...
-  channel: (orderType) => CHANNEL_MAP[orderType] || 'pos',
+  channel: (orderType) => CHANNEL_MAP[orderType] || 'dine_in',
```

### 12.3 Decisions explicitly NOT made (carried as implementer choice)

- **C-1 to C-8** in the blocker assessment (helper location, Portal vs absolute, debounce ref pattern, max-height, blur delay, loading spinner pattern, toast library) — implementer picks at code time.
- Cashier-cancel toast wording — defaults to `"Coupon allowance consumed — cannot be refunded"` per Owner Q3 = A from Contract Freeze §5.

### 12.4 V1B Implementation Readiness — final verdict

```
bug_108_coupon_v1b_planning_clean_ready_for_implementation
```

Manual rollback acknowledged: if anything breaks post-Step-2 flag-flip, `BUG108_FLAGS.couponLive = false` one-line revert restores pre-V1B behavior. No formal owner-smoke gate required; implementer proceeds when ready.

**External team coordination items (I-1..I-6 from blocker assessment)** can be chased in parallel — they affect Step 2 user-visible feature claims but do NOT block Step 1 code merge with `couponLive=false`.

---

**End of BUG-108 Coupon V1B UI Mapping Plan.**
