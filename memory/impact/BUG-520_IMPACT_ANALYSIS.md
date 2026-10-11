# BUG-520 — IMPACT ANALYSIS (Gate 2)

**ID:** BUG-520
**Date:** 2026-10-09
**Agent:** PLANNING (Gate 2)
**Severity:** P1 | **Risk:** CRITICAL (R6 — financial payload, wrong keys sent to checkout API)
**Related:** BUG-499 (origin), BUG-518, BUG-519
**Code Reality:** PARTIAL — `order_discount` + `order_discount_type` sent correctly; `discount_value` + `discount_type` missing; `order_discount` overwrites CollectPaymentPanel's own food discount

---

## Duplicate Check: DISTINCT
No other open item covers this specific payload gap. BUG-499 implemented the food discount deduction but missed two keys required by the API contract (`fe_discount_curls.md` §6–§7).

---

## 1. What Is Wrong

### Sub-A — Missing `discount_value` and `discount_type` (CONFIRMED / CRITICAL)

**API contract** (`fe_discount_curls.md` §6 Curl D — Both):
```json
"order_discount": 30,
"order_discount_type": "Percent",
"discount_value": 15,       ← half-% applied to food side
"discount_type": "Percent"  ← type string
```

**Current code** (`FolioCheckoutPanel.jsx` `handlePaid` L334–339):
```js
if (foodDiscountRs > 0) {
  payload.payment_amount = ...;
  payload.grant_amount   = payload.payment_amount;
  payload.order_amount   = payload.payment_amount;
  payload.order_discount      = foodDiscountRs;       // ✅ ₹ amount correct
  payload.order_discount_type = roomDiscountType;      // ✅ 'Percent'/'Amount'
  // ❌ discount_value not set → stays at 0 (from collectBillExisting with no manual CPP discount)
  // ❌ discount_type not set  → stays at '' (same)
}
```

`collectBillExisting` (orderTransform.js L1686–1692) builds `discount_value` and `discount_type` from `discounts.preset`/`discounts.discountType` — which are 0/'' when the user has NOT applied a discount via CollectPaymentPanel's Adjustments dropdown. Our block never adds the correct `discount_value`/`discount_type` for the room-discount food side.

**Values needed:**
| roomDiscountType | discount_value | discount_type |
|---|---|---|
| 'Percent' + Both mode | `roomDiscount / 2` (the half-% actually applied to food) | 'Percent' |
| 'Amount' + Both mode | `foodDiscountRs` (₹ amount) | 'Amount' |
| 'Percent' + F&B only mode | `roomDiscount` (full % applied) | 'Percent' |
| 'Amount' + F&B only mode | `foodDiscountRs` | 'Amount' |

**Note:** In F&B only mode (`roomApplyTo === 'food'`), `roomDiscount` is reset to 0 on click, so `foodDiscountRs = 0` and this block never fires — no fix needed for F&B only mode.

---

### Sub-B — `order_discount` overwrites CollectPaymentPanel's own food discount (CONFIRMED / HIGH)

`collectBillExisting` (L1689) sets:
```js
order_discount: (discounts.manual || 0) + (discounts.preset || 0)
```
If the cashier selected a 10% discount via CollectPaymentPanel ADJUSTMENTS → `order_discount = 20` (on ₹200 F&B).

Then our code at L338:
```js
payload.order_discount = foodDiscountRs;   // e.g., 17 — OVERWRITES the 20
```

The cashier's manually-applied food discount is silently lost. Backend receives `order_discount = 17` instead of `order_discount = 20 + 17 = 37` or `20`.

**Owner Decision Required (OD-520-01):**

| Option | Behavior | When Both active + CPP manual discount set |
|---|---|---|
| **a** (recommended) | Room discount food side ONLY | foodDiscountRs sent; CPP discount is blocked/ignored (not stackable) |
| **b** | CPP discount wins | foodDiscountRs ignored when CPP discount > 0; CPP discount sent as-is |
| **c** | Stack (combine) | order_discount = foodDiscountRs + (CPP manual discount); not recommended (double discount risk) |

**Recommendation: Option a** — The two discount mechanisms are for different purposes. "Both" mode is a room-level operation; CPP Adjustments > Discount is for ad-hoc F&B discounts. Stacking is likely unintentional. If owner wants separate F&B discount, they should use F&B-only mode + CPP Discount dropdown.

---

## 2. Data Flow Trace

```
User enters % in RoomDiscountControls → roomDiscount=17
↓
foodDiscountRs useMemo → floor(order.amount × 8.5/100) = 17
↓
handlePaid called (user presses "Checkout" in CollectPaymentPanel)
↓
collectBillExisting(table, items, customer, paymentData, opts)
  → paymentData.finalTotal = 593 (food 248 + room 345)
  → paymentData.roomBalance = 345
  → fbOnlyTotal = 593 - 345 = 248
  → payload.payment_amount = 248
  → payload.grant_amount   = 248    (F&B only, R6 — correct per BUG-484)
  → payload.order_discount = 0      (no CPP discount applied)
  → payload.discount_value = 0      ← ❌ wrong (should be 8.5)
  → payload.discount_type  = ''     ← ❌ wrong (should be 'Percent')
↓
Our food discount block fires (foodDiscountRs=17 > 0):
  → payload.payment_amount = 248 - 17 = 231   ✅
  → payload.grant_amount   = 231               ✅ (F&B-only pattern consistent with BUG-484)
  → payload.order_amount   = 231               ✅
  → payload.order_discount = 17                ✅
  → payload.order_discount_type = 'Percent'    ✅
  → payload.discount_value = ← MISSING         ❌ (stays 0)
  → payload.discount_type  = ← MISSING         ❌ (stays '')
↓
payBill(payload) → POST /api/v2/.../order-bill-payment
  backend receives: order_discount=17 ✅, order_discount_type='Percent' ✅
                    discount_value=0 ❌, discount_type='' ❌
```

---

## 3. Risk Classification

**CRITICAL / R6** — Incorrect keys sent to the checkout settlement API. The backend stores what FE sends (`fe_discount_curls.md`: "BE stores the ₹ FE sends — does NOT split 'Both', does NOT recompute % from UI"). Missing `discount_value` may cause incorrect settlement recording, audit mismatch, or BE validation issues.

**Blast radius:** SMALL — 1 file, 1 function (`handlePaid`), 5–8 lines to add/modify.

---

## 4. Affected Files

| File | Lines | Change scope |
|---|---|---|
| `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` | L334–339 (handlePaid food discount block) | Add `discount_value` + `discount_type`; resolve Sub-B per OD-520-01 |

**Files will NOT touch:** `orderTransform.js`, `CollectPaymentPanel.jsx`, `folioTransform.js`, any other file.

---

## 5. Owner Decisions (GATE 2 OPEN)

| ID | Question | Options | Recommendation |
|---|---|---|---|
| OD-520-01 | When "Both" mode is active AND cashier also applies CollectPaymentPanel ADJUSTMENTS > Discount: should they stack, or should one take priority? | a) Room discount food side ONLY (block CPP discount when foodDiscountRs>0); b) CPP discount wins (ignore foodDiscountRs when CPP has manual discount); c) Stack combined | **a** — prevent double food discounting |

**Scope of conflict:** Only if cashier selects "Both" in RoomDiscountControls AND ALSO picks a food discount from the ADJUSTMENTS dropdown in CollectPaymentPanel. Normal use (only one or the other) is unaffected.

---

## 6. Conflict Pre-Check

| File | Last modifier | Date | Open items | Conflict |
|---|---|---|---|---|
| `FolioCheckoutPanel.jsx` | BUG-519 (same session) | 2026-10-09 | BUG-521 (planned after) | NONE — this is an additive patch to `handlePaid` only; BUG-521 touches different section (Statement/RoomDiscountControls) |

---

## 7. Retroactive Candidates
NONE — no code exists for `discount_value`/`discount_type` in the food discount block.

---

**Gate 2 Status:** OPEN — awaiting OD-520-01 answer before Gate 3 can proceed.
