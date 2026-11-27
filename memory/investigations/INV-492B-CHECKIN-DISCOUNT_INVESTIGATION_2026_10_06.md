# INV-492B v2 — FULL INVESTIGATION: Check-in Discount + GST-on-Discounted-Price (Order #000325)

**Date:** 2026-10-06
**Reporter:** User — screenshot + clarification "GST on discounted price; 100% off = GST nullified"
**Role:** INVESTIGATION (no code edits)
**Steps used:** 9/10
**Related:** BUG-492 (Sub-A), BUG-493 (OD-493-01), BUG-491 Sub-A
**Evidence:** `evidence/INV-492B-CHECKIN-DISCOUNT/probe_000325_2026_10_06.json`

---

## 1. Summary

Three separate problems converge for order #000325. All are in the frontend — backend data is available.

| # | Problem | Current display | Correct display |
|---|---------|-----------------|-----------------|
| P1 | `charge.balance_due` ignores check-in discount | Room balance = **₹1,716** | ₹15 |
| P2 | `charge.sgst/cgst` computed on full price, not discounted price | SGST = **₹48**, CGST = **₹48** | SGST = ₹7.5, CGST = ₹7.5 |
| P3 | In-house BALANCE column (BUG-493 fix) and Bill panel are **inconsistent** | Table = ₹0, Bill = ₹1,716 | Both = ₹15 |

---

## 2. Probe Evidence

### Order #000325 (order_id 1232973)

| Field | Source | Value |
|-------|--------|-------|
| `charge.booking_charge` | LR API | ₹1,920 |
| `charge.sgst` | LR API | ₹48 ← on **full** price ₹1,920 |
| `charge.cgst` | LR API | ₹48 ← on **full** price ₹1,920 |
| `charge.balance_due` | LR API | ₹1,716 ← no discount deducted |
| `ri.room_discount_amount` | Folio | ₹1,620 (89% at check_in) |
| `ri.balance_payment` | Folio | ₹0 (= 1920 − 300 − 1620) |
| `ri.gst_tax` | Folio | **absent** — folio has no GST field |

### LR API never updates `charge.*` after check-in discounts

Confirmed from 60+ reservations — `charge.sgst/cgst/balance_due` always computed on `booking_charge` only:

| booking_charge | sgst | cgst | rate |
|----------------|------|------|------|
| ₹100–₹8,999 | booking × 2.5% | booking × 2.5% | **5% total** |
| ₹9,000+ | booking × 9% | booking × 9% | **18% total** |

These rates are static at booking time. A check-in discount **never changes them** in the LR API.

---

## 3. Root Cause — Three Layers

### Layer 1 — `charge.balance_due` ignores check-in discount

```
LR charge.balance_due = booking_charge + sgst + cgst - advance_payment
                      = 1920 + 48 + 48 - 300 = ₹1,716   ← STATIC, never updated

ri.balance_payment (folio) = room_price - advance - room_discount_amount
                           = 1920 - 300 - 1620 = ₹0     ← CORRECT (no GST)
```

`FolioCheckoutPanel` LEFT panel Room balance and RIGHT panel Checkout both use `charge.balance_due = ₹1,716`. Neither uses `ri.balance_payment`.

**Break point:** `roomInfoFromCharge` (frontDeskService.js L164) hard-sets `remainingRoomBalance = charge.balance_due`, overwriting `order.roomInfo.balancePayment = 0`.

---

### Layer 2 — `charge.sgst/cgst` computed on full price (wrong per owner rule)

**Owner rule:** GST = on discounted price. 100% discount → GST = 0.

For order #000325:
```
discounted_price     = 1920 - 1620 = ₹300/night
GST slab for ₹300/night (< ₹9,000) = 5% total
Correct SGST = 300 × 2.5% = ₹7.50
Correct CGST = 300 × 2.5% = ₹7.50

Current charge.sgst  = ₹48  ← on full ₹1,920 (wrong)
Current charge.cgst  = ₹48  ← on full ₹1,920 (wrong)
```

The Bill panel's LEFT section shows SGST ₹48, CGST ₹48. Both are wrong.

**No server field provides "GST on discounted price"** — the folio has no `gst_tax`. This GST must be computed frontend-side using `computeRoomGst(applicable, slabs, discounted_price, nights, 1)`.

---

### Layer 3 — Inconsistency between BALANCE column and Bill panel

| Surface | Formula | Value for #000325 |
|---------|---------|-------------------|
| In-house BALANCE column (pmsService, BUG-493 fix) | `bp === 0 ? 0 : bp + chargeGst` | **₹0** |
| Bill panel Room balance | `charge.balance_due - live_discount` | **₹1,716** |
| Bill panel Checkout | `charge.balance_due - live_discount` | **₹1,716** |

Same order, two different surfaces, completely different numbers. The table is showing what the backend considers the state (₹0). The Bill is showing stale LR data.

---

## 4. Correct Values for Order #000325

```
discounted_price      = 1920 - 1620 = ₹300
gst_on_discounted     = 300 × 5%   = ₹15   (SGST ₹7.50 + CGST ₹7.50)
balance_payment       = ₹0         (folio: 1920 - 1620 - 300 = 0)

Correct Checkout      = balance_payment + gst_on_discounted
                      = 0 + 15 = ₹15

Correct Bill display:
  Booking amount    ₹1,920
  Room discount    -₹1,620   (89%)
  SGST              ₹7.50    (on ₹300)
  CGST              ₹7.50    (on ₹300)
  Already paid     -₹300.00
  Room balance      ₹15.00
  Checkout:         ₹15
```

---

## 5. OD-493-01 Impact — Needs Owner Clarification

OD-493-01 (Option B, locked 2026-10-06): "When `balance_payment = 0`, show ₹0 — GST waived."

This was confirmed for order #000324 (100% discount intent). But order #000325 also has `balance_payment = 0` (advance exactly covered the discounted room) yet is NOT a 100% discount:

| Order | Discount% input | discount_amount | discounted_price | bp | Correct |
|-------|----------------|-----------------|------------------|----|---------|
| #000324 | 100% | ₹1,000 | ₹500 | ₹0 | OD-493-01 says ₹0 |
| #000325 | 89% | ₹1,620 | ₹300 | ₹0 | gst_on_discounted = ₹15? |

**OD question:** When `balance_payment = 0` but discounted_price > 0 (advance happened to match discounted room exactly), should BALANCE and Checkout show:
- **Option C-i:** ₹0 (OD-493-01 Option B still applies — advance covered everything, GST waived)
- **Option C-ii:** `gst_on_discounted` (₹15 in this case — advance didn't cover GST)

---

## 6. Data Flow — What IS Available for Fix

All needed data is available once folio loads:

| Field needed | Available where | Key |
|-------------|-----------------|-----|
| discounted_price | `order.roomInfo.discountAmount` (folio) | `booking_charge - discountAmount` |
| balance_payment | `order.roomInfo.balancePayment` (folio) | `= 0` here |
| nights | `row.nights` (LR) | `= 1` |
| roomGstApplicable | `useRestaurant()` context | already in FolioCheckoutPanel |
| roomGstSlabs | `useSettings()` / profile | `computeRoomGst` needs this |

`FolioCheckoutPanel` already imports `useRestaurant` and `useSettings`. `computeRoomGst` is at `@/utils/roomGstCalculator`.

---

## 7. Fix Scope (for Planning agent, owner OD needed first)

**3 edit sites in `FolioCheckoutPanel.jsx` only:**

**E-1 (RIGHT panel — Checkout total):**
Replace `charge.balance_due` base with `balance_payment + gst_on_discounted`:
```javascript
// In FolioCheckoutPanel main scope, after roomDiscountInfoRs useMemo:
const chargeGst = useMemo(() => {
  const dp = Number(order?.roomInfo?.discountAmount) > 0
    ? Number(order.roomInfo.balancePayment != null
        ? order.roomInfo.balancePayment  // folio has balance
        : 0)
    : null;
  // compute gst on discounted price using slabs
  // roomGstApplicable + roomGstSlabs from context
  ...
}, [...])
```
(Exact implementation after OD answered)

**E-2 (LEFT panel — SGST/CGST lines):**
Display GST computed on discounted price, not `charge.sgst/cgst`.

**E-3 (LEFT panel — Room balance line):**
Use `balance_payment + gst_on_discounted - roomDiscountRs` as base.

**Files NOT to touch:** `pmsService.js` (BALANCE column separate), `frontDeskService.js`, `CollectPaymentPanel.jsx` (R5), `orderTransform.js` (R5).

---

## 8. Classification

**Classification:** FE_BUG
**Confidence:** HIGH (all data probe-confirmed)
**Backend ask:** NONE — all data available in folio + LR
**Planning skip eligible:** NO (3 edit sites, financial logic, OD needed)

---

## 9. Owner Decisions Needed Before Gate 2

**OD-INV492B-01 (OPEN):** When `balance_payment = 0` but the guest didn't get a 100% discount (advance merely equals the discounted room price), should BALANCE and Checkout show:
- **Option A:** `₹15` (GST on discounted price — technically correct)
- **Option B:** `₹0` (treat advance as covering everything including GST — simpler, consistent with OD-493-01)

*Example: room = ₹1,920, discount = ₹1,620 (89%), advance = ₹300, discounted_price = ₹300, GST on ₹300 = ₹15. Advance exactly covered discounted room but not the GST.*

---

## 10. Summary Table

| Surface | Currently shows | Correct (per probe + owner rule) |
|---------|-----------------|----------------------------------|
| In-house BALANCE column | ₹0 (BUG-493 fix, OD-493-01 B) | ₹0 or ₹15 (pending OD-INV492B-01) |
| Bill LEFT: SGST | ₹48 (on full ₹1,920) | ₹7.50 (on discounted ₹300) |
| Bill LEFT: CGST | ₹48 (on full ₹1,920) | ₹7.50 (on discounted ₹300) |
| Bill LEFT: Room balance | ₹1,716 | ₹15 (or ₹0 per OD) |
| Bill RIGHT: Checkout | ₹1,716 | ₹15 (or ₹0 per OD) |
