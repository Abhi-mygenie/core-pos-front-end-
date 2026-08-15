# POS 3.0 BUG-108 — Loyalty Phase C All-Payload-Paths Gap Plan

**Date:** 2026-05-24
**Status:** `bug_108_loyalty_phase_c_all_payload_paths_planned_waiting_owner_fix_approval`
**Persona:** Senior POS3.0 BUG-108 Loyalty Phase C All-Payload-Paths Planning Agent
**Mode:** Planning document only — no code changes, no data mutation

---

## 1. Status

```
bug_108_loyalty_phase_c_all_payload_paths_fixed_and_verified
```

**Update 2026-05-24 (post-implementation):** All broken paths fixed. Owner-provided payloads verified for both Flow 3 (prepaid) and Flow 4 (postpaid). `loyalty_points_used` field added to all flows. See implementation report: `POS3_0_BUG_108_LOYALTY_PHASE_C_ALL_PATHS_PAYLOAD_FIX_IMPLEMENTATION_REPORT_2026_05_24.md`.

---

## 2. Docs Read

### Baseline Docs
1. `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` — §FA-01..FA-05, hotspot list
2. `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` — CR flow rules
3. `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` — doc status matrix
4. `/app/memory/final/FINAL_DOCS_SUMMARY.md` — cross-reference
5. `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` — agent constraints
6. `/app/memory/final/MODULE_DECISIONS_FINAL.md` — module ownership
7. `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` — resolved questions

### Accepted Overlay Docs
8. `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
9. `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
10. `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md`
11. `/app/memory/change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
12. `/app/memory/change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`

### Sprint Status
13. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_COMPLETE_SPRINT_STATUS_RECONCILIATION_2026_05_21.md`

### BUG-108 Phase C Docs
14. `POS3_0_BUG_108_LOYALTY_PHASE_C_LR_REDEMPTION_TRIGGER_CORRECTION_PLAN_FROZEN_2026_05_24.md` — authoritative frozen plan (661 lines, §1-§17)
15. `POS3_0_BUG_108_LOYALTY_PHASE_C_CRM_API_VERIFICATION_REPORT_2026_05_24.md`
16. `POS3_0_BUG_108_LOYALTY_PHASE_C_POS_IMPLEMENTATION_HANDOFF_AFTER_CRM_VERIFICATION_2026_05_24.md`
17. `POS3_0_BUG_108_LOYALTY_PHASE_C_POS_MAX_REDEEMABLE_IMPLEMENTATION_REPORT_2026_05_24.md` — implementation report (§11 explicitly states Prepaid/PlaceOrder/Update "UNCHANGED — hardcoded 0")
18. `POS3_0_BUG_108_LOYALTY_PHASE_C_POS_MAX_REDEEMABLE_QA_HANDOFF_2026_05_24.md`
19. `POS3_0_BUG_108_LOYALTY_PHASE_C_COLLECT_BILL_PAYLOAD_VERIFICATION_2026_05_24.md` — Flow 4 verification (PASS)

---

## 3. Code Areas Inspected

| File | Lines/Areas Inspected | Purpose |
|------|----------------------|---------|
| `src/api/transforms/orderTransform.js` | L845-943 (placeOrder), L950-1054 (updateOrder), L1061-1188 (placeOrderWithPayment), L1196-1381 (collectBillExisting), L1390-1417 (transferToRoom), L1442-1843 (buildBillPrintPayload), L623-734 (calcOrderTotals) | All 7 transform functions |
| `src/components/order-entry/CollectPaymentPanel.jsx` | L256-260 (maxRedeemable state), L517-532 (loyaltyDiscount calc), L676-723 (useEffect max-redeemable), L746-822 (handlePayment paymentData build), L830-870 (handlePrintBill overrides), L1103-1165 (inline loyalty UI), L1636-1695 (loyalty card UI), L1861-1870 (bill summary loyalty line) | Full loyalty integration surface |
| `src/components/order-entry/CartPanel.jsx` | L240-411 (QsrBillingSection), L374-410 (handleCollectBill paymentData build), L396 (loyaltyPoints: 0) | QSR billing path |
| `src/components/order-entry/OrderEntry.jsx` | L840-943 (updateOrder call), L908-943 (placeOrder call), L1122-1290 (handleQsrCollectBill), L1573-1817 (onPaymentComplete/Scenarios 1-2), L1685 (transferToRoom call) | All call sites |
| `src/components/reports/CollectBillPanelDrawer.jsx` | L160-199 (handlePaymentComplete), L171 (collectBillExisting call) | Audit hold-tab collect-bill path |
| `src/api/services/loyaltyService.js` | L59 (loyaltyRedeemLive gate), L100-150 (getMaxRedeemable) | Service functions |
| `src/api/transforms/loyaltyTransform.js` | L127-141 (maxRedeemableFromAPI) | Response mapper |
| `src/api/services/orderService.js` | L125-145 (printOrder/buildBillPrintPayload) | Print pathway |
| `src/utils/BUG108_FLAGS.js` | L34-40 (all flags) | Feature flags |
| `src/api/constants.js` | L47 (MAX_REDEEMABLE) | Endpoint constant |
| `src/api/transforms/reportTransform.js` | L441 (loyalty_points_used display) | Report display |

---

## 4. Flow Inventory Table

| Flow | Function | Endpoint | Trigger | Totals include loyalty? | Loyalty fields sent? | Customer/order identity? | Status | Notes |
|------|----------|----------|---------|------------------------|---------------------|------------------------|--------|-------|
| **Flow 1: Place Order (unpaid)** | `toAPI.placeOrder` | `POST /place-order` | Place Order button (no payment) | NO | `used_loyalty_point: 0` (hardcoded L908) | `cust_membership_id`, `cust_mobile` | **OUT_OF_SCOPE_EXPECTED_ZERO** | Unpaid order — loyalty applies at payment time, not placement |
| **Flow 2: Update Order** | `toAPI.updateOrder` | `PUT /update-place-order` | Update Order (add items) | NO | `used_loyalty_point: 0` (hardcoded L1026) | `cust_name` only | **OUT_OF_SCOPE_EXPECTED_ZERO** | Adds items to existing order — loyalty applies at payment, not update |
| **Flow 3: Prepaid (Place+Pay)** | `toAPI.placeOrderWithPayment` | `POST /place-order` | Collect Bill on fresh order (prepaid) | **YES — loyalty deducted from order_amount via calcOrderTotals(discountAmount: discounts.total)** | `used_loyalty_point: 0` (hardcoded L1153) | `cust_membership_id`, `cust_mobile` | **BROKEN** | **ROOT CAUSE: hardcoded 0 at L1153. Also missing `loyalty_redemption_id`.** |
| **Flow 4: Bill Payment (postpaid)** | `toAPI.collectBillExisting` | `POST /order-bill-payment` | Collect Bill on placed order | YES — discount_value includes loyalty | `used_loyalty_point: BUG108_FLAGS gated (L1358)`, `loyalty_redemption_id: null (L1361)` | `order_id` (backend resolves customer) | **PASS** | Fixed in Phase C implementation |
| **Flow 5: Bill Print** | `toAPI.buildBillPrintPayload` | `POST /order-temp-store` | Print Bill (manual or auto) | N/A (display only) | `loyalty_dicount_amount: BUG108_FLAGS gated (L1773)` | `order_id`, `custName`, `custPhone` | **PASS** | Correctly gated by loyaltyRatioLive, reads overrides.loyaltyAmount |
| **Flow 6: Transfer to Room** | `toAPI.transferToRoom` | `POST /order-shifted-room` | Transfer to Room button | NO loyalty-specific fields | No loyalty fields at all | `order_id` | **OUT_OF_SCOPE_EXPECTED_ZERO** | Room transfer is not a final settlement — room checkout (Flow 4) handles loyalty |
| **Flow 7: QSR Place+Pay (fresh)** | `toAPI.placeOrderWithPayment` (via `handleQsrCollectBill`) | `POST /place-order` | QSR "Place & Pay" | **YES — but only manual/preset discount (no loyalty in QSR billing)** | `used_loyalty_point: 0` (hardcoded L1153, inherited from Flow 3) | `cust_membership_id` (if customer set) | **BROKEN_SAME_AS_FLOW_3** | QSR uses same transform. Additional gap: QsrBillingSection has NO loyalty UI/max-redeemable integration. `paymentData.discounts.loyaltyPoints: 0` hardcoded at CartPanel L396. |
| **Flow 7B: QSR Collect-Bill (placed)** | `toAPI.collectBillExisting` (via `handleQsrCollectBill` else-branch) | `POST /order-bill-payment` | QSR pay on already-placed order | YES (inherits Flow 4) | `used_loyalty_point: BUG108_FLAGS gated` (inherits Flow 4) | `order_id` | **PASS** (inherits Flow 4) | Same transform as Flow 4 — no gap |
| **Flow 8: Hold-Tab Collect Bill (Audit Report)** | `toAPI.collectBillExisting` (via `CollectBillPanelDrawer`) | `POST /order-bill-payment` | Collect pill on held order in Audit Report | YES (inherits Flow 4) | Inherits Flow 4 gates | `order_id` | **PASS** (inherits Flow 4) | Uses CollectPaymentPanel which has max-redeemable integration |

---

## 5. Known Payload Reconciliation

### Why Flow 4 verification passed but Flow 3 payload failed

The Phase C implementation (POS_MAX_REDEEMABLE_IMPLEMENTATION_REPORT §11) explicitly limited the loyalty fix to `collectBillExisting` (Flow 4):

> "Place Order payload | UNCHANGED — used_loyalty_point: 0 hardcoded"
> "Prepaid Payment payload | UNCHANGED — hardcoded 0"
> "Update Order payload | UNCHANGED — hardcoded 0"

The implementation agent treated these paths as "regression guardrails" (leave unchanged), not realizing that the Prepaid path (Flow 3: `placeOrderWithPayment`) is a **payment-final path** — same as Flow 4, just combined with order creation. The loyalty discount IS deducted from `order_amount` via `calcOrderTotals(discountAmount: discounts.total)` (L1070), where `discounts.total` includes `loyaltyDiscount` from CollectPaymentPanel (L532), but `used_loyalty_point` stays hardcoded 0 at L1153.

This creates an **incoherent payload**: backend sees `order_amount: 0` but `used_loyalty_point: 0` and no discount explanation.

---

## 6. Flow-by-Flow Findings

### Flow 1: placeOrder (Unpaid)
- **File:** `orderTransform.js` L845-943
- **`used_loyalty_point:`** `0` (hardcoded L908)
- **`use_wallet_balance:`** `0` (hardcoded L909)
- **Loyalty in totals?** NO — `calcOrderTotals` receives no `discountAmount` (L857)
- **Verdict:** OUT_OF_SCOPE_EXPECTED_ZERO — this is an unpaid order placement. Loyalty applies at Collect Bill time (Flow 4) or at payment time (Flow 3). No incoherence because totals also don't include loyalty.

### Flow 2: updateOrder (Add Items)
- **File:** `orderTransform.js` L950-1054
- **`used_loyalty_point:`** `0` (hardcoded L1026)
- **`use_wallet_balance:`** `0` (hardcoded L1027)
- **Loyalty in totals?** NO — `calcOrderTotals` receives no `discountAmount` (L981)
- **Verdict:** OUT_OF_SCOPE_EXPECTED_ZERO — same reasoning as Flow 1. Adding items doesn't settle loyalty.

### Flow 3: placeOrderWithPayment (Prepaid) — **BROKEN**
- **File:** `orderTransform.js` L1061-1188
- **`used_loyalty_point:`** `0` (hardcoded L1153)
- **`use_wallet_balance:`** `0` (hardcoded L1154)
- **`loyalty_redemption_id:`** MISSING (not present in payload)
- **Loyalty in totals?** **YES** — `calcOrderTotals` L1069-1076 receives `discountAmount: parseFloat(discounts.total || 0)` where `discounts.total` = `manualDiscount + presetDiscount + loyaltyDiscount + couponDiscount + walletDiscount` (CollectPaymentPanel L532). When `useLoyalty=true`, `loyaltyDiscount = maxRedeemable.maxDiscountValue` (L517-518), which flows into `discounts.total` via `paymentData.discounts.total` (L780).
- **Root cause chain:**
  1. CollectPaymentPanel builds `paymentData.discounts.total` = 1087 (includes loyalty)
  2. CollectPaymentPanel builds `paymentData.discounts.loyaltyPointsRedeemed` = 1087 (L790)
  3. `placeOrderWithPayment` L1070: `discountAmount: parseFloat(discounts.total || 0)` = 1087
  4. `calcOrderTotals` L655: `postDiscount = Math.max(0, 1087 - 1087) = 0`
  5. `calcOrderTotals` returns `order_amount: 0`
  6. BUT L1153: `used_loyalty_point: 0` ← HARDCODED, ignores `discounts.loyaltyPointsRedeemed`
  7. Result: `order_amount: 0` + `used_loyalty_point: 0` = incoherent payload
- **CollectPaymentPanel correctly populates `discounts.loyaltyPointsRedeemed`** at L790. The data IS available — Flow 3's transform simply ignores it.

### Flow 4: collectBillExisting (Bill Payment) — **PASS**
- **File:** `orderTransform.js` L1196-1381
- **`used_loyalty_point:`** `BUG108_FLAGS.loyaltyRatioLive ? (discounts.loyaltyPointsRedeemed || 0) : 0` (L1358-1360)
- **`loyalty_redemption_id:`** `null` (L1361)
- **`discount_value:`** `discounts.total || 0` (L1352) — includes loyalty
- **Loyalty in totals?** YES — `discount_value` carries total discount; financial fields computed in CollectPaymentPanel and passed through
- **Verdict:** PASS — correctly wired. Verified by owner-provided payload (order 868917: `used_loyalty_point: 753`, `discount_value: 753`).

### Flow 5: buildBillPrintPayload (Print) — **PASS**
- **File:** `orderTransform.js` L1442-1843
- **`loyalty_dicount_amount:`** `BUG108_FLAGS.loyaltyRatioLive ? (overrides.loyaltyAmount !== undefined ? overrides.loyaltyAmount : 0) : 0` (L1773)
- **Overrides source:** CollectPaymentPanel `handlePrintBill` L852: `loyaltyAmount: loyaltyDiscount` (the live max-redeemable value)
- **Verdict:** PASS — correctly gated and sourced from `overrides.loyaltyAmount`.

### Flow 6: transferToRoom — **OUT_OF_SCOPE**
- **File:** `orderTransform.js` L1390-1417
- **Loyalty fields?** NONE — no `used_loyalty_point`, no `loyalty_dicount_amount`, no `loyalty_redemption_id`
- **Loyalty in totals?** Not directly — `transferToRoom` passes through `finalTotal` from CollectPaymentPanel which MAY include loyalty discount in the total.
- **Verdict:** OUT_OF_SCOPE — room transfer is not a final settlement. Loyalty applies when the room is checked out (via Flow 4 collectBillExisting on the room order). However, **potential edge case**: if loyalty discount reduces finalTotal, the room folio records a lower transfer amount. This is architecturally correct (the customer's bill WAS lower) but backend may not know WHY. **NEEDS_OWNER_DECISION** on whether transferToRoom should carry `used_loyalty_point` for audit tracing.

### Flow 7: QSR Place+Pay — **BROKEN_SAME_AS_FLOW_3**
- **Call site:** `OrderEntry.jsx` L1126-1290 (`handleQsrCollectBill`)
- **Fresh order path (L1136):** calls `toAPI.placeOrderWithPayment` (L1144) — inherits Flow 3's hardcoded `used_loyalty_point: 0`
- **Already-placed path (L1230):** calls `toAPI.collectBillExisting` (L1235) — inherits Flow 4's PASS
- **ADDITIONAL QSR GAP:** `QsrBillingSection` (CartPanel.jsx L240-411) has **NO loyalty UI at all**:
  - No `maxRedeemable` state or API call
  - No `useLoyalty` checkbox
  - `paymentData.discounts.loyaltyPoints: 0` hardcoded at L396
  - `paymentData.discounts.loyaltyPointsRedeemed` NOT present (undefined)
  - No customer identity passed to paymentData
- **Impact for fresh QSR orders:** Even though Flow 3 fix would wire `used_loyalty_point` from `discounts.loyaltyPointsRedeemed`, QSR's `paymentData` never populates that field. So fixing Flow 3 alone won't fix QSR.
- **Classification: BROKEN_SAME_AS_FLOW_3** for transform-level, but **ADDITIONAL QSR-specific gap** at UI/paymentData level.

### Flow 8: Hold-Tab Collect Bill (Audit Report) — **PASS**
- **Call site:** `CollectBillPanelDrawer.jsx` L171
- **Transform:** `toAPI.collectBillExisting` — inherits Flow 4's PASS
- **CollectPaymentPanel rendered:** YES (L268) — has full max-redeemable integration
- **Verdict:** PASS

---

## 7. QSR / Quick Service Findings

### 7.1 QSR Screen/Component Identification

| Component | File | Role |
|-----------|------|------|
| `QsrBillingSection` | `CartPanel.jsx` L240-411 | QSR-specific compact billing UI |
| `handleQsrCollectBill` | `OrderEntry.jsx` L1126-1290 | QSR payment handler (branches to placeOrderWithPayment or collectBillExisting) |
| `StatusConfigPage` QSR toggle | `StatusConfigPage.jsx` L798-881 | QSR mode ON/OFF toggle |
| `qsrModePrefs.js` | `utils/qsrModePrefs.js` | localStorage persistence |

### 7.2 QSR Uses placeOrderWithPayment?
**YES** — for fresh orders (no placed items), `handleQsrCollectBill` calls `toAPI.placeOrderWithPayment` at OrderEntry.jsx L1144.

### 7.3 QSR Passes Same paymentData.discounts?
**NO** — QSR's `QsrBillingSection` builds its OWN `paymentData` at CartPanel.jsx L376-409, which:
- **Hardcodes** `loyaltyPoints: 0` (L396)
- **Does NOT include** `loyaltyPointsRedeemed` key at all
- **Does NOT include** `loyaltyRedemptionId` key
- **Does NOT include** `walletBalance` with any CRM value

### 7.4 QSR Receives maxRedeemable?
**NO** — `QsrBillingSection` has no `maxRedeemable` state, no `getMaxRedeemable` call, no loyalty UI. It is purely manual/preset discount.

### 7.5 QSR Payload Currently Sends:
- `used_loyalty_point`: `0` (hardcoded in transform L1153 AND hardcoded in QSR paymentData L396)
- `loyalty_redemption_id`: MISSING (transform doesn't include it for Flow 3)
- loyalty discount field: `0`

### 7.6 QSR Totals Subtract Loyalty While Loyalty Payload Remains Zero?
**NO** — QSR's `totalDiscount` (CartPanel L331) only includes `manualDiscount + presetDiscount`. No loyalty amount is in the discount. So QSR does NOT have the incoherent totals problem that Flow 3 has. However, this means **QSR customers get NO loyalty benefit at all**.

### 7.7 QSR Classification
**BROKEN_SAME_AS_FLOW_3** at the transform level (inherits hardcoded `used_loyalty_point: 0`).
**ADDITIONAL QSR-specific gap** at the UI level: no loyalty UI, no max-redeemable call, no customer loyalty display. Even fixing Flow 3's transform won't enable loyalty for QSR without adding loyalty UI to `QsrBillingSection` OR routing QSR through CollectPaymentPanel for the payment step.

### 7.8 QSR Scope Decision Needed
**NEEDS_OWNER_DECISION**: Should QSR support loyalty at all? Two options:
- **Option A (minimal):** Fix Flow 3 transform only. QSR remains loyalty-free (no UI). Acceptable if QSR is counter-service where loyalty doesn't apply.
- **Option B (full):** Add loyalty UI to QsrBillingSection. Requires max-redeemable integration, customer identity, loyalty checkbox, etc. Significant scope.

---

## 8. Field Mapping Matrix

| Field | Flow 1 (Place) | Flow 2 (Update) | Flow 3 (Prepaid) | Flow 4 (Bill Pay) | Flow 7 (QSR Fresh) | Flow 5 (Print) | Required by CRM? | Notes |
|-------|----------------|-----------------|-------------------|--------------------|--------------------|----------------|-------------------|-------|
| `used_loyalty_point` | `0` (expected) | `0` (expected) | **`0` (BUG)** | `value` ✅ | **`0` (BUG — inherited + no data)** | N/A | **YES** — triggers redemption | Broken in Flow 3 & 7 |
| `loyalty_dicount_amount` | N/A | N/A | N/A | N/A (by design) | N/A | `value` ✅ | Print-only field | Only in print payload |
| `loyalty_redemption_id` | N/A | N/A | **MISSING (BUG)** | `null` ✅ | **MISSING (inherited)** | N/A | YES — POS Backend fills | Missing from Flow 3 & 7 |
| `discount_value` | N/A | N/A | N/A | `total` ✅ | N/A | N/A | Flow 4 only | Flow 3 uses `...totals` instead |
| `order_amount` | computed | computed | **0 (incoherent)** | via payment_amount | computed (no loyalty) | N/A | YES | Flow 3 zeroed by loyalty but no signal |
| `order_discount` | `0` | `0` | `value` | `value` | `value` | N/A | YES | Works correctly |
| `cust_membership_id` | present | N/A | present | N/A (via order_id) | present (if customer set) | N/A | Identifies customer | — |
| `cust_mobile` | present | N/A | present | N/A (via order_id) | present (if customer set) | N/A | Identifies customer | — |
| `order_id` | N/A (new) | present | N/A (new) | present | N/A (new) | present | YES | New orders get ID from response |

---

## 9. Broken Paths

### 9.1 Flow 3: placeOrderWithPayment — **BROKEN**
- **Root cause:** `used_loyalty_point: 0` hardcoded at `orderTransform.js` L1153
- **Missing field:** `loyalty_redemption_id` not present in payload
- **Incoherence:** `order_amount` reduced by loyalty via `calcOrderTotals(discountAmount: discounts.total)` but no loyalty signal sent to backend
- **Impact:** POS Backend receives `order_amount: 0` + `used_loyalty_point: 0` — cannot trigger CRM redemption, customer points not deducted

### 9.2 Flow 7 (QSR fresh): placeOrderWithPayment via handleQsrCollectBill — **BROKEN_SAME_AS_FLOW_3 + ADDITIONAL GAP**
- **Transform-level:** Same as Flow 3 (inherits hardcoded 0)
- **UI-level gap:** QsrBillingSection has no loyalty UI/max-redeemable integration
- **paymentData gap:** `discounts.loyaltyPoints: 0` hardcoded, `discounts.loyaltyPointsRedeemed` undefined
- **Impact:** QSR customers cannot use loyalty at all

---

## 10. Expected-Zero Paths

| Flow | Reason | Coherent? |
|------|--------|-----------|
| Flow 1 (placeOrder) | Unpaid order — no payment = no loyalty settlement | YES — totals also exclude loyalty |
| Flow 2 (updateOrder) | Item addition — no payment = no loyalty settlement | YES — totals also exclude loyalty |
| Flow 6 (transferToRoom) | Not a final settlement — room checkout handles loyalty | YES (with caveat — see §6 Flow 6) |

---

## 11. Required Fix Plan

### Fix 1: Flow 3 — placeOrderWithPayment (CRITICAL)

**File:** `src/api/transforms/orderTransform.js`
**Location:** Lines 1152-1154 inside `placeOrderWithPayment`

**Before:**
```javascript
      // Loyalty & Wallet
      used_loyalty_point:         0,
      use_wallet_balance:         0,
```

**After:**
```javascript
      // Loyalty & Wallet — BUG-108 Phase C payload parity with collectBillExisting:
      // CRM-calculated values from /pos/max-redeemable, gated by loyaltyRatioLive.
      // POS Backend handles actual CRM redemption.
      used_loyalty_point:           BUG108_FLAGS.loyaltyRatioLive
                                      ? (discounts.loyaltyPointsRedeemed || 0)
                                      : 0,
      loyalty_redemption_id:        null,  // POS Backend generates during CRM call
      use_wallet_balance:           BUG108_FLAGS.walletDebitLive ? (discounts.walletBalance || 0) : 0,
```

**Rationale:**
- Mirrors exactly what `collectBillExisting` does at L1358-1362
- `discounts.loyaltyPointsRedeemed` IS already populated by CollectPaymentPanel at L790
- `loyalty_redemption_id: null` matches Flow 4 — POS Backend generates this
- `walletDebitLive` gate added for future-proofing (currently `false`, so no behavior change)
- `BUG108_FLAGS` import already exists at L9

**Scope:** 3-line change. Zero new imports. Zero new dependencies.

### Fix 2: QSR Loyalty — NEEDS_OWNER_DECISION

**Two options:**

**Option A — Minimal (QSR remains loyalty-free):**
No code change needed. QSR's `totalDiscount` doesn't include loyalty, so `order_amount` is coherent (not reduced by loyalty). `used_loyalty_point: 0` is accurate because QSR didn't apply loyalty. After Fix 1, the transform supports loyalty IF the caller passes the data — QSR callers simply don't.

**Option B — Full (QSR gets loyalty):**
Requires adding to `QsrBillingSection` (CartPanel.jsx):
1. `maxRedeemable` state + `getMaxRedeemable` useEffect (same as CollectPaymentPanel)
2. Loyalty checkbox UI
3. `loyaltyDiscount` in discount calculation
4. `loyaltyPointsRedeemed` in `paymentData.discounts`
5. Customer identity propagation

This is a **significant scope expansion** (~100-150 lines of new code in CartPanel.jsx).

**Recommendation:** Option A for immediate fix. Option B deferred to a follow-up CR if owner wants QSR loyalty.

---

## 12. Non-Scope

| Item | Reason |
|------|--------|
| Flow 1 (placeOrder) loyalty fields | Unpaid order — loyalty applies at payment time |
| Flow 2 (updateOrder) loyalty fields | Item addition — loyalty applies at payment time |
| Flow 6 (transferToRoom) loyalty fields | Room transfer → room checkout handles loyalty |
| `reportTransform.js` `loyalty_points_used` display | Read-only report display — not a payload |
| `loyaltyService.redeemLoyalty()` function | Dead code — no callers. Kept per frozen plan §7.5 |
| `loyaltyTransform.js` redeem mappers | Dead code — no callers. Kept per frozen plan §7.5 |
| CRM redemption logic | POS Backend responsibility — frozen architecture |

---

## 13. Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Fix 1 sends `used_loyalty_point > 0` on a `place-order` endpoint that previously always received 0 — backend might not handle it | **MEDIUM** | Backend already handles `used_loyalty_point` on `order-bill-payment` (Flow 4). The `place-order` endpoint should relay the same field to CRM. **Needs backend confirmation** that `place-order` endpoint reads `used_loyalty_point` and triggers CRM redemption. |
| 2 | `loyalty_redemption_id: null` is a new field on `place-order` — backend might reject unknown field | **LOW** | Backend typically ignores unknown fields (JSON payload). But should be confirmed. |
| 3 | QSR users expect loyalty but can't use it | **LOW** (if Option A) | Document that QSR mode does not support loyalty. Owner can request QSR loyalty as a follow-up. |
| 4 | `discounts.total` for Flow 3 includes loyalty in `calcOrderTotals.discountAmount` even when `used_loyalty_point` was 0 — after fix, both are aligned | **ZERO** (fix resolves) | Post-fix, both `order_amount` and `used_loyalty_point` reflect loyalty consistently. |

---

## 14. QA Plan

### Flow 3 — Normal Prepaid with Loyalty
1. Login as owner@kunafamahal.com
2. Select customer abhishek jain (Gold, 4588 pts)
3. Add items to cart
4. Open Collect Bill (prepaid path — fresh order, no placed items)
5. Verify loyalty card shows with CRM-calculated max discount
6. Verify `useLoyalty` checkbox is auto-checked
7. Confirm payment
8. **Capture network payload** — verify:
   - `used_loyalty_point` = CRM's `max_points_redeemable` (NOT 0)
   - `loyalty_redemption_id` = `null`
   - `order_amount` correctly reflects loyalty deduction
   - `payment_type` = `"prepaid"`
   - `cust_membership_id` present
9. Verify order created successfully (HTTP 200)

### Flow 3 — Prepaid without Loyalty (regression)
1. Place order without customer (no loyalty card shown)
2. Verify `used_loyalty_point: 0` in payload
3. Verify `order_amount` is full item total + tax

### Flow 3 — Partial Loyalty Discount (non-zero payable)
1. Select customer with loyalty points < item total
2. Verify `order_amount > 0`
3. Verify `used_loyalty_point > 0`
4. Verify `order_amount + loyalty_discount ≈ item_total + tax`

### Flow 3 — Full Loyalty Discount (zero payable)
1. Select customer with loyalty points >= item total
2. Verify `order_amount: 0`
3. Verify `used_loyalty_point = max_points_redeemable`
4. Verify payload is coherent

### QSR Place+Pay (Option A — no loyalty)
1. Enable QSR mode in Status Config
2. Add items, pay
3. Verify `used_loyalty_point: 0` (expected — QSR has no loyalty UI)
4. Verify `order_amount` reflects only manual/preset discount, NOT loyalty

### QSR Place+Pay without Loyalty (regression)
1. Same as above — verify no regression in QSR billing math

### Flow 4 — Bill Payment with Loyalty (regression)
1. Place order (unpaid), then Collect Bill
2. Verify loyalty card, CRM values, payload
3. Verify `used_loyalty_point` matches CRM `max_points_redeemable`
4. Regression: confirm nothing changed

### Flow 4 — Bill Payment without Loyalty (regression)
1. Place order without customer, Collect Bill
2. Verify `used_loyalty_point: 0`
3. Regression: unchanged

### loyaltyRatioLive=false (kill switch regression)
1. Temporarily set `loyaltyRatioLive: false` in BUG108_FLAGS.js
2. Verify all paths send `used_loyalty_point: 0`
3. Verify loyalty UI hidden/disabled
4. Restore flag

### Coupon/Manual/Wallet Unchanged
1. Apply manual discount on prepaid order
2. Verify `self_discount`, `discount_type` correct
3. Verify `coupon_discount: 0` (couponLive=false)
4. Verify `use_wallet_balance: 0` (walletDebitLive=false)

### GST/VAT Proration Correctness
1. Partial loyalty discount on items with GST
2. Verify `gst_tax` is prorated correctly (GST × (1 - discountRatio))
3. Compare Flow 3 payload GST with Flow 4 payload GST for same items/discount

### No Direct Redeem Call
1. Monitor network during all tests
2. Verify NO call to `/pos/loyalty/redeem`
3. Verify only `/pos/max-redeemable` called (non-mutating)

---

## 15. Owner Questions

### Q1: Does the `place-order` backend endpoint process `used_loyalty_point`?

**Context:** Flow 4 (`order-bill-payment`) confirmed to handle `used_loyalty_point` and trigger CRM redemption. Flow 3 (`place-order` with `payment_type: "prepaid"`) currently always sends 0.

**Question:** When `place-order` receives `used_loyalty_point > 0`, will the POS Backend:
- a) Read the field and trigger CRM redemption (same as `order-bill-payment`)?
- b) Ignore the field (loyalty not wired on this endpoint)?
- c) Error/reject?

**If (a):** Fix 1 is sufficient — implement and deploy.
**If (b):** Backend team needs to wire `used_loyalty_point` handling on `place-order` endpoint. Fix 1 is still correct from POS Frontend perspective.
**If (c):** Need backend fix first.

### Q2: Should QSR support loyalty?

**Context:** QSR mode has no loyalty UI. After Fix 1, the transform supports loyalty if the caller passes data, but QSR callers don't.

**Options:**
- **A (Minimal):** QSR remains loyalty-free. No additional work.
- **B (Full):** Add loyalty UI to QSR billing. ~100-150 lines new code. Separate CR.

---

## 16. Implementation Readiness Verdict

```
ready_for_flow3_payload_fix — waiting_backend_confirmation_for_place_order_endpoint
```

**Fix 1 (Flow 3 transform)** is a clean, surgical 3-line change with no new dependencies. The data is already available (`discounts.loyaltyPointsRedeemed` populated by CollectPaymentPanel L790). The fix mirrors the proven Flow 4 pattern exactly.

**Implementation can proceed immediately.** Backend confirmation (Q1) determines whether the fix is end-to-end effective or needs a companion backend change.

**QSR loyalty (Fix 2)** is deferred pending owner decision (Q2).

---

## 17. Confirmations

| # | Confirmation | Status |
|---|-------------|--------|
| 1 | No code changed | **Confirmed** |
| 2 | No frontend changed | **Confirmed** |
| 3 | No backend changed | **Confirmed** |
| 4 | No data mutated | **Confirmed** |
| 5 | No mutating API called | **Confirmed** |
| 6 | No direct redeem API called | **Confirmed** |
| 7 | `/app/memory/final/` untouched | **Confirmed** |
| 8 | Baseline docs untouched | **Confirmed** |

---

**End of BUG-108 Loyalty Phase C All-Payload-Paths Gap Plan.**
