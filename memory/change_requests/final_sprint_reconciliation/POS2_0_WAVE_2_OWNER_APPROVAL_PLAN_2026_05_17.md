# POS2.0 Wave 2 — Financial Core — Owner Approval Plan — 2026-05-17

## 1. Purpose

This document is created **before implementation** and **requires owner approval** before any code changes are made. It details the planned approach for all 6 bugs in Wave 2 — Financial Core.

---

## 2. Repo / Commit

| Field | Value |
|-------|-------|
| Repo URL | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` |
| Branch | `17-may` |
| Commit hash | `43136dc95d560d85d4f53e93b0d8e1ef934c774f` |
| Working tree | Clean |

---

## 3. Inputs Read

### Baseline Docs
- `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md`
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
- `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`

### Sprint / Phase Planning Docs
- `POS2_0_MASTER_IMPLEMENTATION_PLAN_2026_05_17.md`
- `POS2_0_MASTER_PLAN_AUDIT_AND_CORRECTION_2026_05_17.md`
- `POS2_0_CLEAN_SAFE_BUG_IMPLEMENTATION_PLAN_2026_05_17.md`
- `POS2_0_OWNER_DECISION_BUG_PLANNING_2026_05_17.md`
- `POS2_0_PHASE_2_OWNER_DECISION_CAPTURE_2026_05_17.md`
- `POS2_0_BACKEND_SOURCE_OF_TRUTH_BUG_PLANNING_2026_05_17.md`
- `POS2_0_PHASE_3_BACKEND_OWNER_QUESTION_CAPTURE_2026_05_17.md`
- `POS2_0_PHASE_3_OPEN_QUESTION_COMPLETION_ADDENDUM_2026_05_17.md`
- `POS2_0_REMAINING_BLOCKED_BUG_PLANNING_2026_05_17.md`
- `POS2_0_PHASE_4_BACKEND_QUESTION_CAPTURE_2026_05_17.md`

### Business Rules / Reconciliation
- `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`
- `BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md`

### Code Inspected (Read-Only)
- `orderTransform.js` — `calcOrderTotals` (L585-681), `placeOrderWithPayment` (L1001-1122), `updateOrder` (L940-994), `collectBillExisting` (L1130-1299), `transferToRoom` (L1308-1335), `buildBillPrintPayload` (L1360-1697)
- `CollectPaymentPanel.jsx` — tip gating (L269, L507), SC/tax section (L495-600), handlePayment (L649-733), tip input (L1028-1050), bill summary tip rows (L1462, L1681)
- `profileTransform.js` — full file (L1-357), `toBoolean`, `parseTaxPct`, `restaurant()` builder

---

## 4. Bugs Proposed For Implementation

| Bug | Plain English Issue | Proposed Fix | Files To Modify | Risk | Approval Status |
|-----|---------------------|--------------|-----------------|------|----------------|
| BUG-051 | Round-off uses conditional ceil/floor instead of always-ceil | Replace `fractional > 0.10 ? ceil : floor` with `Math.ceil` | `orderTransform.js`, `CollectPaymentPanel.jsx`, 2 test files | HIGH | pending_owner_approval |
| BUG-054 | VAT not prorated by discount (GST is, but VAT is missed) | Apply `(1 - discountRatio)` to `vatTax`/`vat` | `orderTransform.js`, `CollectPaymentPanel.jsx` | HIGH | pending_owner_approval |
| BUG-055 | Prepaid payload missing `order_discount_type` | Add `order_discount_type` key to `placeOrderWithPayment` + `updateOrder` | `orderTransform.js` | LOW | pending_owner_approval |
| BUG-075 | Tip shows on takeaway/delivery (should be dine-in/walk-in/room only) | Add `tipApplicable` gate mirroring SC pattern | `CollectPaymentPanel.jsx`, `orderTransform.js` | LOW-MEDIUM | pending_owner_approval |
| BUG-083 | Missing `delivery_charge_gst_amount` separate key in payloads | Add key to `calcOrderTotals` return + 4 payload builders (not transfer-to-room) | `orderTransform.js`, `buildBillPrintPayload` | MEDIUM | pending_owner_approval |
| BUG-052 | Round-off not gated by profile boolean (restaurant config) | Read profile field → pass to calcOrderTotals → gate `Math.ceil` | `profileTransform.js`, `orderTransform.js`, `CollectPaymentPanel.jsx` | MEDIUM | pending_owner_approval |

---

## 5. Per-Bug Approval Details

---

### BUG-051 — Round-off always-ceil

#### What is wrong in plain English
The round-off logic uses a "fractional > 0.10" rule from BUG-009 (old POS parity): if the decimal part is > ₹0.10 it rounds up (ceiling), otherwise rounds down (floor). Owner wants **always ceiling**.

#### What I will change
- **`orderTransform.js` L655-661**: Replace the fractional logic with `const orderAmount = rawTotal > 0 ? Math.ceil(rawTotal) : 0;`. Remove the `fractional` intermediate variable. Update the comment to record the BUG-051/ROUND-001 policy reversal.
- **`CollectPaymentPanel.jsx` L579-584**: Same replacement — `const finalTotal = rawFinalTotal > 0 ? Math.ceil(rawFinalTotal) : 0;`. Update comment.
- **Test files**: Re-baseline `qa_subtotal_delivery_validation.test.js` and `orderTransformFinancials.test.js` where round-off assertions exist.

#### Files I expect to modify

| File | What will change | Why this file |
|------|-----------------|---------------|
| `orderTransform.js` | L655-661 replace with `Math.ceil` | Payload-time round-off (single source of truth) |
| `CollectPaymentPanel.jsx` | L579-584 replace with `Math.ceil` | Live UI mirror for `effectiveTotal` and cash quick-pills |
| `qa_subtotal_delivery_validation.test.js` | Re-baseline `order_amount` assertions | Pinned tests need new expected values |
| `orderTransformFinancials.test.js` | Re-baseline if any round-off assertions | Same reason |

#### What I will NOT touch
- `profileTransform.js` (that is BUG-052, separate)
- Any SC/Tip/Delivery calculation
- `round_up` key format (stays as `String(absValue.toFixed(2))`)
- ROUND-002 scope rule (round-off still on Grand Total only; components keep 2-decimal precision)

#### Business rule protected
- Frozen ROUND-002: Round-off applies only to Grand Total. Preserved.
- Pending-freeze ROUND-001: Always-ceil. This is the implementation target.

#### Risk
HIGH — touches two hotspot files. Changes `order_amount` on every order with non-integer total. Cash quick-pills follow automatically. Backend may still use old rule until coordinated.

#### QA check after implementation
- ₹105.05 → `order_amount = 106`, `round_up = "0.95"`
- ₹105.15 → `order_amount = 106`, `round_up = "0.85"`
- ₹100.00 → `order_amount = 100`, `round_up = "0.00"`
- Cash pills reflect the ceiled total

#### Approval needed
**Options:** A. Approve for code-diff preview | B. Do not implement | C. Modify approach | D. Need clarification first

---

### BUG-054 — VAT discount proration

#### What is wrong in plain English
When an order has a discount, item-level GST is correctly prorated by `(1 - discountRatio)` but VAT is NOT prorated. So discounted VAT orders over-charge VAT.

#### What I will change
- **`orderTransform.js` L649-653**: After `itemGstPostDiscount`, add `const vatTaxPostDiscount = vatTax * (1 - discountRatio);` and use it instead of raw `vatTax` in `totalTax` and the return `vat_tax`.
- **`CollectPaymentPanel.jsx` L575**: Change `const vat = taxTotals.vat;` to `const vat = taxTotals.vat * (1 - discountRatio);`

#### Files I expect to modify

| File | What will change | Why this file |
|------|-----------------|---------------|
| `orderTransform.js` | L649-653 add VAT proration | Payload `vat_tax` field |
| `CollectPaymentPanel.jsx` | L575 apply discountRatio to VAT | Live UI VAT display |

#### What I will NOT touch
- GST proration (already correct)
- SC / Tip / Delivery tax math
- Non-VAT restaurants (unchanged — vatTax is 0)

#### Business rule protected
- Frozen TAX-003: VAT follows same tax formula as GST. This aligns the implementation.
- Frozen TOTALS-002: Subtotal formula unchanged.

#### Risk
HIGH — same hotspot files. Only affects VAT restaurants with discount > 0.

#### QA check after implementation
- VAT-only ₹1000 at 5%, no discount → `vat_tax = 50` (unchanged)
- VAT-only ₹1000 at 5%, ₹100 discount → `vat_tax = 45` (prorated)
- VAT-zero items with discount → `vat_tax = 0` (unchanged)

#### Approval needed
**Options:** A. Approve for code-diff preview | B. Do not implement | C. Modify approach | D. Need clarification first

---

### BUG-055 — Prepaid `order_discount_type` payload parity

#### What is wrong in plain English
The `placeOrderWithPayment` (prepaid) and `updateOrder` payloads do NOT include `order_discount_type`, while `collectBillExisting` (postpaid) does include it at L1273. This is a payload parity gap.

#### What I will change
- **`orderTransform.js` L1080-1085**: Add `order_discount_type: discounts.orderDiscountType || ''` after `order_discount`.
- **`orderTransform.js` L958-964**: Add same key to `updateOrder` payload.

#### Files I expect to modify

| File | What will change | Why this file |
|------|-----------------|---------------|
| `orderTransform.js` | L1080-1085 (placeOrderWithPayment) + L958-964 (updateOrder) add `order_discount_type` | Payload parity with `collectBillExisting` |

#### What I will NOT touch
- `CollectPaymentPanel.jsx` (already supplies the value at L702)
- `collectBillExisting` (already has it at L1273 — reference implementation)
- `transferToRoom` (different flow)

#### Business rule protected
- No frozen-rule conflict. Pure payload addition.

#### Risk
LOW — single key addition to two payload builders. No UI change. Backend already accepts this field on collect-bill.

#### QA check after implementation
- Prepaid Place+Pay with Percent discount → `order_discount_type = 'Percent'`
- Prepaid Place+Pay with Amount discount → `order_discount_type = 'Amount'`
- No discount → `order_discount_type = ''`
- Update-order payload has same key

#### Approval needed
**Options:** A. Approve for code-diff preview | B. Do not implement | C. Modify approach | D. Need clarification first

---

### BUG-075 — Tip orderType gate (dine-in + walk-in + room only)

#### What is wrong in plain English
Tip input and tip GST are visible and applied for ALL order types (including takeaway/delivery) when the restaurant feature flag is enabled. Owner confirmed tip should only apply for dine-in, walk-in, and room orders — mirroring the existing Service Charge pattern.

#### What I will change
1. **`CollectPaymentPanel.jsx`**: Add `tipApplicable` variable after L269:
   ```
   const tipApplicable = tipEnabled && (orderType === 'dineIn' || orderType === 'walkIn' || isRoom);
   ```
2. Replace all `tipEnabled` gates with `tipApplicable`:
   - L507: `const tip = tipApplicable ? ...` (instead of `tipEnabled`)
   - L1029: Tip input render gate
   - L1462: Bill summary tip row
   - L1681: Bill summary tip display row
3. **`orderTransform.js` `calcOrderTotals`**: No change needed. The function receives `tipAmount` from the caller. When `tipApplicable` is false, `tip = 0` flows through, making `tipGstAmt = 0` automatically.

#### Files I expect to modify

| File | What will change | Why this file |
|------|-----------------|---------------|
| `CollectPaymentPanel.jsx` | Add `tipApplicable` gate; replace `tipEnabled` with `tipApplicable` at L507/1029/1462/1681 | UI visibility + value gating |

#### What I will NOT touch
- `orderTransform.js` `calcOrderTotals` (receives tip=0 from caller when not applicable — no guard needed there)
- Payload builders (they receive whatever tip value flows through)
- SC logic (already has its own `scApplicable` gate)

#### Business rule protected
- Frozen TIP-001/TIP-002: Preserved. Feature flag still required.
- Pending-freeze TIP-003: This is the implementation target.
- Owner confirmed Option B (dine-in + walk-in + room) in Phase 2 Decision Capture.

#### Risk
LOW-MEDIUM — mirrors the established SC pattern from BUG-013. Single file change.

#### QA check after implementation
- Takeaway order → tip input hidden, `tip_amount: 0`, `tip_tax_amount: 0`
- Delivery order → same as above
- Dine-in order → tip input visible, tip flows through
- Walk-in order → same as dine-in
- Room order → same as dine-in

#### Approval needed
**Options:** A. Approve for code-diff preview | B. Do not implement | C. Modify approach | D. Need clarification first

---

### BUG-083 — Delivery GST key `delivery_charge_gst_amount`

#### What is wrong in plain English
Frontend computes delivery GST (`delGstAmt`) but only folds it into composite `gst_tax`. There is no separate `delivery_charge_gst_amount` key in the payload. Backend expects this key for separate persistence and print template rendering.

#### What I will change
1. **`orderTransform.js` `calcOrderTotals` return (L665-680)**: Add `delivery_charge_gst_amount: Math.round(delGstAmt * 100) / 100` to the return object.
2. **`orderTransform.js` `placeOrderWithPayment`**: The key flows through `...totals` spread. No explicit addition needed.
3. **`orderTransform.js` `updateOrder`**: `...combinedTotals` spread already covers it. No explicit addition needed.
4. **`orderTransform.js` `collectBillExisting`**: Add explicit `delivery_charge_gst_amount` key (this flow doesn't use calcOrderTotals — it receives values from CollectPaymentPanel).
5. **`orderTransform.js` `buildBillPrintPayload`**: Add `delivery_charge_gst_amount` key for print template.
6. **`orderTransform.js` `transferToRoom`**: NOT included (per owner answer Q-083-3: delivery/takeaway orders cannot be transferred to rooms).
7. **Non-delivery orders**: Key is **absent** from payload (per owner answer Q-083-6).
8. **Composite `gst_tax`**: **Unchanged** — continues to include delivery GST (per DEL-001 policy).

#### Files I expect to modify

| File | What will change | Why this file |
|------|-----------------|---------------|
| `orderTransform.js` | Add `delivery_charge_gst_amount` to `calcOrderTotals` return, `collectBillExisting`, `buildBillPrintPayload` | All payload endpoints per Q-083-3 |

#### What I will NOT touch
- `CollectPaymentPanel.jsx` (already computes `deliveryGst` at L537; would pass through to `collectBillExisting`)
- `transferToRoom` (not applicable for delivery orders)
- Composite `gst_tax` calculation (DEL-001: retains delivery GST)

#### Business rule protected
- Pending-freeze DEL-001: Composite `gst_tax` includes delivery GST AND separate key emitted. Preserved.
- Pending-freeze DEL-002: Key = `delivery_charge_gst_amount`. Confirmed by owner.
- Frozen TAX-008: Null rate → 0% preserved.

#### Risk
MEDIUM — adds a new key to multiple payload builders. No existing key changes. Absent for non-delivery = conditional logic needed.

#### QA check after implementation
- Delivery order with GST → `delivery_charge_gst_amount` present with correct value
- Dine-in order → key absent from payload
- Composite `gst_tax` unchanged for both
- Print payload includes the key for delivery

#### Approval needed
**Options:** A. Approve for code-diff preview | B. Do not implement | C. Modify approach | D. Need clarification first

---

### BUG-052 — Profile boolean gate for round-off

#### What is wrong in plain English
Round-off (`Math.ceil`) should only apply when a boolean field in the restaurant profile is `true`. When `false`, the raw total should be used without rounding. Owner confirmed: "we are already using key, it's boolean yes/no."

#### What I will change
**CONSTRAINT NOTE:** The exact API field name needs to be identified. From code inspection of `profileTransform.js`, the most likely candidate is `food_price_with_paisa` (already mapped at L218 as `checkInFlags.foodPriceWithPaisa`). However, this field is currently only in `checkInFlags` and unused elsewhere.

**Approach:**
1. **`profileTransform.js`**: Map the round-off boolean field at the restaurant root level (e.g., `roundOffEnabled: toBoolean(api.food_price_with_paisa)` or the correct API key).
2. **`CollectPaymentPanel.jsx`**: Read `restaurant.roundOffEnabled` and gate the `Math.ceil` with it. When false: `finalTotal = rawFinalTotal > 0 ? Math.round(rawFinalTotal) : 0` or just use `rawFinalTotal`.
3. **`orderTransform.js` `calcOrderTotals`**: Accept `roundOffEnabled` as an `extras` parameter and gate `Math.ceil`.

**IMPORTANT:** The exact field name is a constraint. If `food_price_with_paisa` is NOT the correct field, I need the owner to confirm the exact API key name.

#### Files I expect to modify

| File | What will change | Why this file |
|------|-----------------|---------------|
| `profileTransform.js` | Expose round-off boolean at restaurant root | Profile data source |
| `orderTransform.js` | Accept + use the boolean in `calcOrderTotals` | Payload-time gating |
| `CollectPaymentPanel.jsx` | Pass the boolean through and gate UI round-off | UI-time gating |

#### What I will NOT touch
- The base `Math.ceil` logic from BUG-051 (this wraps it with a config gate)
- Any other profile fields
- SC / Tip / Delivery calculations

#### Business rule protected
- Frozen ROUND-002: Round-off scope (Grand Total only) unchanged.
- BUG-051 must land first.

#### Risk
MEDIUM — requires correct field name identification. If field name is wrong, the gate won't work.

#### QA check after implementation
- Profile boolean = true → ceiling round-off applied (same as BUG-051)
- Profile boolean = false → raw total used (no rounding)

#### Approval needed
**⚠️ CONSTRAINT: Please confirm the exact API field name for the round-off boolean in the restaurant profile. Is it `food_price_with_paisa`, or a different key?**

**Options:** A. Approve for code-diff preview | B. Do not implement | C. Modify approach | D. Need clarification first

---

## 6. Recommended Implementation Order

1. **BUG-051** — Round-off rule reversal (base for BUG-052)
2. **BUG-054** — VAT proration (independent math, same files)
3. **BUG-055** — Payload key addition (mechanical)
4. **BUG-075** — Tip gate (mirrors SC pattern; independent)
5. **BUG-083** — Delivery GST key (adds new key to payloads)
6. **BUG-052** — Profile boolean gate (wraps BUG-051 with config; CONSTRAINT: field name must be confirmed)

---

## 7. Approval Summary

| Bug | Approval Needed | Owner Decision |
|-----|----------------|----------------|
| BUG-051 | Approach approval | _Pending_ |
| BUG-054 | Approach approval | _Pending_ |
| BUG-055 | Approach approval | _Pending_ |
| BUG-075 | Approach approval | _Pending_ |
| BUG-083 | Approach approval | _Pending_ |
| BUG-052 | Approach approval + **field name confirmation** | _Pending_ |

---

## 8. Final Status

`owner_approval_plan_created_pending_approval`

---

*— End of POS2.0 Wave 2 Owner Approval Plan —*
