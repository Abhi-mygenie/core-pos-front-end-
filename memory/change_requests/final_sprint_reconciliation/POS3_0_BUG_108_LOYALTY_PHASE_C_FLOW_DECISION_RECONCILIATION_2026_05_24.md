# POS 3.0 BUG-108 — Loyalty Phase C Flow Decision Reconciliation

**Date:** 2026-05-24
**Status:** `bug_108_loyalty_phase_c_flow_decision_reconciled_waiting_owner_final_scope_approval`
**Persona:** Senior POS3.0 BUG-108 Loyalty Phase C Flow Path Decision Reconciliation Agent
**Mode:** Reconciliation document only — no code changes, no data mutation

---

## 1. Status

```
bug_108_loyalty_phase_c_flow_decision_reconciled_implemented_and_verified
```

**Update 2026-05-24 (post-implementation):**
- Owner confirmed backend WILL process `used_loyalty_point` on place-order (prepaid).
- Flow 3 fix implemented and verified with owner-provided payload (prepaid: `used_loyalty_point: 1052`, `loyalty_points_used: 1052`).
- Flow 4 verified with owner-provided payload (postpaid: `used_loyalty_point: 663`, `loyalty_points_used: 663`).
- Both `used_loyalty_point` and `loyalty_points_used` now emitted on all flows.
- See implementation report: `POS3_0_BUG_108_LOYALTY_PHASE_C_ALL_PATHS_PAYLOAD_FIX_IMPLEMENTATION_REPORT_2026_05_24.md`.

---

## 2. Owner Answers Captured

### Q1: Does place-order backend process `used_loyalty_point`?

**Owner answer: NO.**

The POS Backend's `place-order` endpoint (`POST /api/v2/vendoremployee/order/place-order`) does NOT read or process the `used_loyalty_point` field. Loyalty redemption is wired only on the `order-bill-payment` endpoint (Flow 4). Sending `used_loyalty_point > 0` on `place-order` would be silently ignored — the customer's points would NOT be deducted by CRM.

**Implication:** The previously recommended Fix 1 (3-line change in `placeOrderWithPayment`) is **NOT sufficient** as a standalone fix. It would produce a cosmetically correct frontend payload but the backend would discard the loyalty signal, resulting in:
- Customer sees loyalty discount applied (UI shows ₹0 payable)
- Order is created with a discounted `order_amount`
- But CRM never deducts the customer's points (no redemption triggered)
- **Net effect: customer gets free food without points deducted** — worse than current state

### Q2: Should QSR support loyalty now?

**Owner answer:** Do not assume separate QSR loyalty UI. QSR can use "Full View" (the "Full Billing →" link) which opens the existing `CollectPaymentPanel` and routes through the normal payment flow.

**Owner intent:** No new QSR-specific loyalty code. Loyalty is available via CollectPaymentPanel. If QSR user wants loyalty, they click "Full Billing" → CollectPaymentPanel opens → loyalty card is visible if customer is set and CRM returns data.

---

## 3. Docs Read

1. Previous plan: `POS3_0_BUG_108_LOYALTY_PHASE_C_ALL_PAYLOAD_PATHS_GAP_PLAN_2026_05_24.md` (full re-read)
2. Frozen plan: `POS3_0_BUG_108_LOYALTY_PHASE_C_LR_REDEMPTION_TRIGGER_CORRECTION_PLAN_FROZEN_2026_05_24.md` (§3 architecture, §6 payload contract)
3. Implementation report: `POS3_0_BUG_108_LOYALTY_PHASE_C_POS_MAX_REDEEMABLE_IMPLEMENTATION_REPORT_2026_05_24.md` (§11 regression guardrails)
4. Collect bill verification: `POS3_0_BUG_108_LOYALTY_PHASE_C_COLLECT_BILL_PAYLOAD_VERIFICATION_2026_05_24.md`

---

## 4. Code Areas Rechecked

| File | Lines | Finding |
|------|-------|---------|
| `OrderEntry.jsx` L2202 | `onFullBilling={() => setShowPaymentPanel(true)}` | QSR "Full Billing" opens CollectPaymentPanel |
| `OrderEntry.jsx` L1464-1465 | `showPaymentPanel ? <CollectPaymentPanel ...>` | CollectPaymentPanel renders with full loyalty UI |
| `OrderEntry.jsx` L1717 | `} else if (!placedOrderId) {` | Fresh order branch → Flow 3 (`placeOrderWithPayment` at L1745) |
| `OrderEntry.jsx` L1818 | `} else {` | Placed order branch → Flow 4 (`collectBillExisting` at L1836) |
| `OrderEntry.jsx` L1126-1290 | `handleQsrCollectBill` | QSR fresh → `placeOrderWithPayment` (L1144); QSR placed → `collectBillExisting` (L1235) |
| `CartPanel.jsx` L579-587 | "Full Billing →" link → `onFullBilling()` | Confirmed: links to same CollectPaymentPanel |
| `CollectPaymentPanel.jsx` L517-518 | `loyaltyDiscount = maxRedeemable.maxDiscountValue` | Loyalty discount computed in CollectPaymentPanel regardless of which OrderEntry branch calls it |

### Key Routing Discovery

When QSR "Full Billing" opens CollectPaymentPanel, the subsequent `onPaymentComplete` handler (L1573) branches:

| Condition | Branch | Payload function | Flow | Loyalty status |
|-----------|--------|-----------------|------|----------------|
| `paymentData.isTransferToRoom` | Transfer to Room | `transferToRoom` | Flow 6 | OUT_OF_SCOPE |
| `!placedOrderId` (fresh order) | Place+Pay | `placeOrderWithPayment` | **Flow 3** | **BACKEND-BLOCKED** |
| `placedOrderId` (placed order) | Collect Bill | `collectBillExisting` | **Flow 4** | **PASS** |

**Therefore:** QSR "Full View" for a **fresh order** (items not yet placed) still routes to Flow 3 — the backend-blocked path. Only when items are already placed does it route to Flow 4.

This means: for loyalty to work via "Full View", the cashier must **first place the order** (Place Order button, unpaid), **then** open Collect Bill → the placed order branch routes to Flow 4 where loyalty IS processed by the backend.

---

## 5. Flow 3 Backend Support Finding

**CONFIRMED: POS Backend `place-order` endpoint does NOT process `used_loyalty_point`.**

This means:
- Sending `used_loyalty_point > 0` on `place-order` would be silently ignored
- CRM redemption is NOT triggered on this code path
- Customer would receive the loyalty discount (reduced `order_amount`) but their points would NOT be deducted
- This would be **worse** than the current state (currently `order_amount` is incoherently 0, but at least the backend doesn't process a fake free order since the actual payment collection happens separately)

**Wait — critical clarification on Flow 3 and `order_amount: 0`:**

Reviewing the user's original payload: `order_amount: 0` with `payment_type: "prepaid"`, `payment_status: "paid"`. This IS a final order — the place-order endpoint creates the order AND marks it paid in one shot. The backend does create an order with `order_amount: 0` — the customer IS getting free food. The `used_loyalty_point: 0` just means CRM doesn't know WHY.

**Current broken state:** Customer gets ₹0 order + no points deducted (double loss for restaurant).
**If Fix 1 applied without backend support:** Same result — `used_loyalty_point: 753` sent but backend ignores it. Customer still gets ₹0 order + no points deducted.

**The root problem is that `order_amount: 0` is already being sent.** The loyalty discount is already deducted from the totals. The missing `used_loyalty_point` just means the backend can't trigger CRM. But the order is already created at ₹0.

---

## 6. Updated Flow Classification Table

| Flow | Previous Status | Updated Status | Reason | Action |
|------|----------------|----------------|--------|--------|
| **Flow 1: Place Order (unpaid)** | OUT_OF_SCOPE_EXPECTED_ZERO | **OUT_OF_SCOPE_EXPECTED_ZERO** (unchanged) | Unpaid — no loyalty at placement | None |
| **Flow 2: Update Order** | OUT_OF_SCOPE_EXPECTED_ZERO | **OUT_OF_SCOPE_EXPECTED_ZERO** (unchanged) | Item addition — no payment | None |
| **Flow 3: Prepaid (Place+Pay)** | BROKEN | **BACKEND_BLOCKED — loyalty must be hidden/disabled on this path** | Backend `place-order` does NOT process `used_loyalty_point`. Sending it is useless. Currently loyalty discount reduces `order_amount` to 0 without CRM redemption — restaurant loses money. | **IMMEDIATE: Hide/disable loyalty on prepaid fresh-order path. FUTURE: Backend CR to support loyalty on place-order, OR route loyalty orders through two-step (place then collect-bill).** |
| **Flow 4: Bill Payment (postpaid)** | PASS | **PASS** (unchanged) | Fully working. Backend processes `used_loyalty_point`. | None — continue joint QA |
| **Flow 5: Bill Print** | PASS | **PASS** (unchanged) | Print-only field, correctly gated | None |
| **Flow 6: Transfer to Room** | OUT_OF_SCOPE | **OUT_OF_SCOPE** (unchanged) | Not a final settlement | None |
| **Flow 7: QSR Fresh Place+Pay** | BROKEN_SAME_AS_FLOW_3 | **BACKEND_BLOCKED_SAME_AS_FLOW_3** | Same backend limitation — place-order doesn't process loyalty | **Same as Flow 3: hide/disable loyalty in QSR quick-billing.** |
| **Flow 7B: QSR Placed Collect-Bill** | PASS | **PASS** (unchanged) | Uses Flow 4 transform | None |
| **Flow 7C: QSR Full View (fresh order)** | Not previously classified | **BACKEND_BLOCKED_SAME_AS_FLOW_3** | Full View opens CollectPaymentPanel, but fresh-order branch routes to `placeOrderWithPayment` (Flow 3). Backend won't process loyalty. | **See §8: loyalty UI should be hidden when no placed items (fresh order on prepaid path).** |
| **Flow 7D: QSR Full View (placed order)** | Not previously classified | **PASS** (inherits Flow 4) | Full View opens CollectPaymentPanel, placed-order branch routes to `collectBillExisting` (Flow 4). | None |
| **Flow 8: Hold-Tab Collect Bill** | PASS | **PASS** (unchanged) | Uses Flow 4 transform | None |

---

## 7. QSR Clarification

### 7.1 QSR Full View / Placed-Order Collect Bill

**Status: PASS**

When a QSR user clicks "Full Billing →" on an order that has already been placed (items exist in backend), CollectPaymentPanel opens. On payment, `onPaymentComplete` (L1573) takes the `else` branch (L1818) → `collectBillExisting` → Flow 4. Backend processes `used_loyalty_point`. Loyalty works correctly.

**User flow:** Add items → Place Order (unpaid) → Click "Full Billing" → CollectPaymentPanel with loyalty → Pay → Flow 4 → CRM redemption triggered.

### 7.2 QSR Fresh Place+Pay

**Status: BACKEND_BLOCKED_SAME_AS_FLOW_3**

Two sub-paths:
1. **QSR quick-billing "Place & Pay" button:** Calls `handleQsrCollectBill` → `placeOrderWithPayment` (L1144). `QsrBillingSection` has no loyalty UI, so `discounts.loyaltyPoints: 0`. No loyalty issue currently because loyalty isn't applied. BUT if loyalty were ever added to QSR billing, it would hit the same backend block.

2. **QSR "Full View" on fresh order:** Opens CollectPaymentPanel (with loyalty UI visible). But `onPaymentComplete` takes the `!placedOrderId` branch (L1717) → `placeOrderWithPayment`. Backend won't process `used_loyalty_point`. **This is dangerous**: the cashier sees loyalty applied, pays, but CRM doesn't deduct points.

### 7.3 Owner Intent Reconciliation

Owner said: *"QSR can use Full View and then use the normal loyalty flow there."*

**The "normal loyalty flow" that works is Flow 4 (placed order → collect-bill).** For this to work in QSR:
- Cashier must first **Place Order** (without payment)
- Then open **Full Billing** → CollectPaymentPanel
- Then pay → this routes to Flow 4 (placed order branch)

If the cashier uses "Full View" on a fresh order without placing first, it routes to Flow 3 (backend-blocked).

**Safest interpretation:** The owner's intent is satisfied by the existing two-step workflow: Place Order → Full Billing → Collect Bill. No new code needed for QSR.

---

## 8. Immediate Safe Scope Recommendation

### Option A — RECOMMENDED: Hide/Disable Loyalty on Prepaid/Fresh-Order Path

**Rationale:** Since backend `place-order` does NOT process `used_loyalty_point`, allowing loyalty on this path creates a dangerous state where the customer gets discounted/free food but points are never deducted. The safest immediate action is to **prevent loyalty from being applied when the payment will route through Flow 3**.

**Implementation approach (minimal):**

In `CollectPaymentPanel.jsx`, add a prop or derive a boolean that indicates "this payment will route to Flow 3 (fresh order prepaid)" vs "this payment will route to Flow 4 (placed order collect-bill)".

The boolean already exists: `hasPlacedItems` (prop passed at L1473). When `hasPlacedItems=false`, the payment will route to `placeOrderWithPayment` (Flow 3). When `hasPlacedItems=true`, it routes to `collectBillExisting` (Flow 4).

**Change:** In CollectPaymentPanel, gate the loyalty UI and loyalty discount on `hasPlacedItems`:
- When `hasPlacedItems=false` (Flow 3 path): hide loyalty card, set `loyaltyDiscount=0`, skip `getMaxRedeemable` call
- When `hasPlacedItems=true` (Flow 4 path): current behavior unchanged (loyalty works)

**Scope:** ~5-10 lines in CollectPaymentPanel.jsx. Zero changes to orderTransform.js. Zero new imports.

**Effect:**
- Flow 4 (postpaid collect-bill): UNCHANGED — loyalty works
- Flow 3 (prepaid place+pay): Loyalty hidden — no discount applied, no incoherent payload
- QSR Full View (fresh): Loyalty hidden — cashier sees a note to place first
- QSR Full View (placed): Loyalty works via Flow 4

**Additional safety:** In `orderTransform.js` `placeOrderWithPayment` L1152-1154, keep `used_loyalty_point: 0` hardcoded (do NOT apply Fix 1 from previous plan). This ensures even if the UI gate is bypassed, the payload stays safe.

### Why NOT Option B/C/D?

| Option | Description | Why not |
|--------|-------------|---------|
| B (Allow UI, don't submit) | Show loyalty but strip it from payload | Confusing UX — cashier sees discount but order is charged full price |
| C (Backend CR now) | Wire loyalty on `place-order` endpoint | Out of POS Frontend scope. Backend team responsibility. Can be a follow-up. |
| D (Route loyalty orders to Flow 4) | Force two-step place-then-collect | Requires changing the payment routing logic in OrderEntry. Higher risk. Also, the two-step flow already exists — cashier can choose to Place Order first, then Collect Bill. |

---

## 9. Backend CR Recommendation

**YES — a Backend CR is recommended for future support of loyalty on the prepaid/place-order path.**

### Proposed Backend CR: BE-LOYALTY-001

| Field | Value |
|-------|-------|
| **Title** | Support `used_loyalty_point` on `place-order` (prepaid) endpoint |
| **Priority** | P2 (not blocking — Flow 4 works for all loyalty use cases today) |
| **Description** | When `place-order` receives `payment_type: "prepaid"` and `used_loyalty_point > 0`, trigger CRM redemption (same as `order-bill-payment` does today). |
| **Fields to process** | `used_loyalty_point`, `loyalty_redemption_id` (nullable — backend generates) |
| **Acceptance criteria** | Preprod curl with `used_loyalty_point > 0` on `place-order` results in CRM point deduction |
| **Depends on** | CRM `POST /pos/loyalty/redeem` already working (confirmed in Phase C verification) |
| **POS Frontend follow-up** | After backend confirms, remove the `hasPlacedItems` UI gate and apply the original Fix 1 (3-line change in `placeOrderWithPayment`) |

**This is NOT blocking for current release.** All loyalty use cases work today via Flow 4 (two-step: place order unpaid → collect bill).

---

## 10. Updated QA Plan

### Immediate QA Scope (after Option A implementation)

#### Test 1: Flow 4 — Bill Payment with Loyalty (PRIMARY — existing, regression)
1. Login as owner@kunafamahal.com
2. Select customer abhishek jain (Gold, 4588 pts)
3. Add items, Place Order (unpaid)
4. Open Collect Bill → verify loyalty card visible
5. Verify `used_loyalty_point` = CRM max_points_redeemable in payload
6. Verify CRM redemption triggered (points deducted)
7. **Expected: PASS (unchanged)**

#### Test 2: Flow 4 — Bill Payment without Loyalty (regression)
1. Place order without customer
2. Collect Bill → verify loyalty section hidden
3. Verify `used_loyalty_point: 0`
4. **Expected: PASS (unchanged)**

#### Test 3: Flow 3 — Prepaid Fresh Order (LOYALTY HIDDEN)
1. Select customer abhishek jain
2. Add items to cart (fresh order, no prior Place Order)
3. Open Collect Bill (prepaid path)
4. **Verify: loyalty card NOT shown** (because `hasPlacedItems=false`)
5. Pay → verify `used_loyalty_point: 0` in payload
6. Verify `order_amount` reflects full item total + tax (no loyalty deduction)
7. **Expected: PASS (loyalty correctly blocked)**

#### Test 4: Flow 3 — Prepaid Fresh Order without Customer (regression)
1. Fresh order, no customer, prepaid
2. Verify no loyalty UI, no discount
3. Verify `used_loyalty_point: 0`
4. **Expected: PASS (unchanged)**

#### Test 5: QSR Fresh Place+Pay (QSR quick billing)
1. Enable QSR mode
2. Add items, click "Place & Pay"
3. Verify no loyalty UI in QSR billing
4. Verify `used_loyalty_point: 0`
5. **Expected: PASS (QSR has no loyalty UI)**

#### Test 6: QSR Full View — Fresh Order
1. QSR mode ON, add items
2. Click "Full Billing →"
3. **Verify: loyalty card NOT shown** (fresh order, `hasPlacedItems=false`)
4. Pay → verify routes to Flow 3 with `used_loyalty_point: 0`
5. **Expected: PASS (loyalty correctly blocked)**

#### Test 7: QSR Full View — Placed Order (loyalty works)
1. QSR mode ON, add items
2. **First click Place Order** (unpaid)
3. Then click "Full Billing →"
4. Verify loyalty card IS shown (placed order, `hasPlacedItems=true`)
5. Pay → verify routes to Flow 4 with `used_loyalty_point` = CRM value
6. **Expected: PASS (Flow 4 loyalty works)**

#### Test 8: Two-Step Loyalty Workflow (recommended UX)
1. Normal (non-QSR) mode
2. Select customer, add items
3. Place Order (unpaid)
4. Click "Collect Bill" on cart
5. Verify loyalty card visible, max-redeemable values displayed
6. Pay → verify Flow 4 payload with `used_loyalty_point > 0`
7. **Expected: PASS (this is the supported loyalty workflow)**

#### Test 9: Manual/Preset Discount on Prepaid (regression)
1. Fresh order, no customer
2. Apply manual discount
3. Prepaid pay
4. Verify `self_discount` correct, `used_loyalty_point: 0`
5. Verify `order_amount` correctly reflects manual discount only
6. **Expected: PASS (manual discount unchanged)**

#### Test 10: loyaltyRatioLive=false (kill switch)
1. Set flag to false
2. Verify loyalty hidden everywhere (Flow 3, Flow 4, QSR)
3. All payloads: `used_loyalty_point: 0`
4. **Expected: PASS**

---

## 11. Owner Questions

### Q1: Prepaid/Place-and-Pay loyalty scope (DECISION REQUIRED)

Since backend `place-order` does NOT process `used_loyalty_point`, for prepaid/fresh orders POS should:

**A. (RECOMMENDED — immediate safety) Hide/disable loyalty in Collect Bill when the order is not yet placed (prepaid path).**
- Loyalty only works through two-step: Place Order (unpaid) → Collect Bill → Flow 4
- No backend change needed
- No risk of customers getting free food without point deduction
- QSR users click "Full Billing" after placing order to use loyalty

**B. Keep current state (do nothing).**
- Current bug persists: loyalty discount zeroes `order_amount` but `used_loyalty_point: 0`
- Restaurant loses money when loyalty is used on prepaid path
- NOT RECOMMENDED

**C. Start Backend CR (BE-LOYALTY-001) to wire `used_loyalty_point` on `place-order`.**
- Allows prepaid + loyalty in a single step (Flow 3)
- Requires backend team effort
- Can be done as follow-up after option A is implemented for safety

**D. Both A and C — immediate safety gate + future backend support.**
- RECOMMENDED if owner wants prepaid loyalty eventually
- A ships now (5-10 lines), C ships later (backend team)

### Q2: QSR loyalty scope (CONFIRMATION REQUIRED)

Please confirm:

**A. (RECOMMENDED) QSR loyalty is available only via "Full View" → Place Order first → Collect Bill (Flow 4).**
- No separate QSR loyalty UI needed
- No code change needed for QSR specifically (option A above handles the fresh-order gate)
- QSR quick-billing "Place & Pay" remains loyalty-free

**B. Build separate QSR loyalty later (future CR).**
- Only if QSR counter-service needs one-step loyalty
- Would require QSR billing section changes + backend support (same backend CR)

---

## 12. Implementation Readiness Verdict

```
waiting_owner_final_scope_approval
```

**Breakdown:**
- Flow 4 (Bill Payment): **READY for joint QA** — no changes needed
- Flow 3 (Prepaid): **Waiting owner approval of Option A** (hide loyalty on fresh-order path)
- QSR: **Waiting owner confirmation of QSR loyalty scope** (Option A: Full View + placed order only)
- Backend CR: **Waiting owner decision** on whether to start BE-LOYALTY-001 for future prepaid loyalty

**If owner approves Option A + QSR Option A:**
- Implementation scope: ~5-10 lines in CollectPaymentPanel.jsx (gate loyalty on `hasPlacedItems`)
- Zero changes to orderTransform.js
- Zero backend changes
- Ready for immediate implementation + QA

---

## 13. Confirmations

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

**End of BUG-108 Loyalty Phase C Flow Decision Reconciliation.**
