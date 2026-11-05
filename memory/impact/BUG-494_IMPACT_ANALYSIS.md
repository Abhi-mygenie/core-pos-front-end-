# BUG-494 — Impact Analysis (Gate 2)

**ID:** BUG-494
**Date:** 2026-10-06
**Author:** Planning agent
**Code Reality:** NONE for fixes. `order.roomInfo?.balancePayment` already read at L266 (handlePaid) but not used for display.
**Conflict Pre-check:**
- `FolioCheckoutPanel.jsx` last modified: BUG-492 (2026-10-06, today) — ACTIVE HOTSPOT
- Changes are in different line ranges: BUG-492 at L53-59/99/114-121/225-234/339; BUG-494 at L161-165 (SGST/CGST/balance) + L339 (update Sub-A override base)
- L339 is touched by BOTH BUG-492 Sub-A AND BUG-494 Sub-C → **EXECUTION CONFLICT** — BUG-494 must supersede BUG-492 Sub-A at L339
- No other items active on this file

---

## 1. Data Flow Trace — Break Points

```
getFolio(row.orderId) → order.roomInfo
  ├── balancePayment = ri.balance_payment  (folio, correct: already deducts check-in discount)
  ├── discountAmount = ri.room_discount_amount  (folio, check-in discount ₹)
  └── gstTax        = ri.gst_tax            (folio, ABSENT → 0)

row.charge  (LR API, STALE after check-in discount)
  ├── balance_due     = booking_charge + SGST_full + CGST_full - advance  ← WRONG
  ├── sgst            = computed on full booking_charge                    ← WRONG
  ├── cgst            = computed on full booking_charge                    ← WRONG
  ├── booking_charge  = original booking amount                            ✓
  ├── advance_payment = advance paid at booking                            ✓
  └── nights          = number of nights                                   ✓

FolioCheckoutPanel RoomSection (c = row.charge ?? {}):
  BREAK 1 L161: c.sgst  → shows GST on FULL price (wrong)
  BREAK 2 L162: c.cgst  → shows GST on FULL price (wrong)
  BREAK 3 L165: c.balance_due - roomDiscountRs → pre-discount balance (wrong)

FolioCheckoutPanel parent (order + row):
  BREAK 4 L339: BUG-492 Sub-A override = charge.balance_due - roomDiscountInfoRs
              → base is still STALE (ignores stored check-in discount)
```

---

## 2. Correct Formula (with ODs locked)

**Inputs available in FolioCheckoutPanel parent scope:**
| Variable | Source |
|----------|--------|
| `balancePayment` | `order.roomInfo?.balancePayment ?? null` |
| `discountAmount` | `order.roomInfo?.discountAmount ?? 0` |
| `bookingCharge` | `row.charge?.booking_charge ?? 0` |
| `nights` | `row.charge?.nights ?? 1` |
| `roomGstApplicable` | `restaurant?.checkInFlags?.roomGstApplicable` |
| `roomGstSlabs` | `restaurant?.checkInFlags?.roomGstSlabs` |
| `computeRoomGst` | **NEW import** from `@/utils/roomGstCalculator` |

**Computed values (new useMemo in parent scope):**
```javascript
// BUG-494: folio-based correct balance + GST on discounted price
const discountedPrice = Math.max(0, bookingCharge - discountAmount);
const gstOnDiscounted = roomGstApplicable
  ? computeRoomGst(roomGstApplicable, roomGstSlabs, discountedPrice * nights, nights, 1).gstTotal
  : 0;

// OD-INV492B-01 Option B: balancePayment=0 → everything settled → show 0
const baseBalance = balancePayment === 0
  ? 0
  : Math.max(0, (balancePayment ?? 0) + gstOnDiscounted);

// OD-494-01 Option B (locked below): SGST/CGST = 0 when bp=0 (math consistent)
const displaySgst = baseBalance === 0 ? 0 : gstOnDiscounted / 2;
const displayCgst = baseBalance === 0 ? 0 : gstOnDiscounted / 2;
// Note: exact halves per Indian GST (SGST = CGST = gstTotal/2)
// Use computeRoomGst().sgst / .cgst for precision (handles odd-paise)
```

**Three display fixes using computed values:**
```javascript
// LEFT SGST/CGST (RoomSection, receive as props):
<Line label="SGST" value={fmtINR(displaySgst)} ... />   // was c.sgst
<Line label="CGST" value={fmtINR(displayCgst)} ... />   // was c.cgst

// LEFT Room balance (RoomSection):
<Line label="Room balance" value={fmtINR(Math.max(0, baseBalance - roomDiscountRs))} ... />
// was Math.max(0, c.balance_due - roomDiscountRs)

// RIGHT Checkout (parent, replaces BUG-492 Sub-A override):
balance_due: Math.max(0, baseBalance - roomDiscountInfoRs)
// was Math.max(0, Number(row.charge?.balance_due || 0) - roomDiscountInfoRs)
```

---

## 3. Owner Decisions

### OD-INV492B-01 — LOCKED = Option B (2026-10-06)
When `balance_payment = 0`, show ₹0 for Room balance and Checkout. Advance covers GST.

### OD-494-01 — LOCKING = Option B (derived from OD-INV492B-01)

**Question:** When bp=0, should SGST/CGST lines show ₹7.5/₹7.5 or ₹0/₹0?

**Resolution:** Option B (₹0/₹0) is required for mathematical consistency with OD-INV492B-01:
- If SGST=₹7.5, CGST=₹7.5 are shown with balance ₹0: sum = 1920−1620+7.5+7.5−300 = ₹15 ≠ ₹0 (inconsistent)
- If SGST=₹0, CGST=₹0 with balance ₹0: sum = 1920−1620+0+0−300 = ₹0 ✓ (consistent)

**OD-494-01 LOCKED = Option B: SGST = CGST = ₹0 when baseBalance = 0.**

---

## 4. Verification Matrix Seeds

| # | Scenario | Expected after fix |
|---|---------|-------------------|
| V-494-1 | #000325 (89% discount, bp=0) | SGST=₹0, CGST=₹0, Room balance=₹0, Checkout=₹0 |
| V-494-2 | #000324 (100% discount intent, bp=0) | SGST=₹0, CGST=₹0, Room balance=₹0, Checkout=₹0 |
| V-494-3 | #1232965 (₹200 discount, bp=₹750) | SGST=₹21.25, CGST=₹21.25, Room balance=₹792.5 |
| V-494-4 | #1232903 (no discount, bp=₹950) | SGST=₹26.25, CGST=₹26.25 (same as charge.sgst) |
| V-494-5 | Live session discount on top of stored | Checkout = baseBalance − liveDiscount |
| V-494-R1 | BUG-492 Sub-A: live discount entered | Still reduces Checkout correctly |
| V-494-R2 | BUG-491 Sub-B: Room balance live | Still updates with liveDiscountRs |

---

## 5. Affected Files

| File | Sub | Change type |
|------|-----|------------|
| `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` | A+B+C | ~10 lines: new import, 1 useMemo in parent, 2 new props to RoomSection, 3 display line changes + L339 override update |

**NOT touched:** CollectPaymentPanel.jsx (R5), orderTransform.js (R5), pmsService.js, CheckInPage.jsx, CheckInForm.jsx, frontDeskService.js

---

## 6. Risk

**CRITICAL** — room billing display. Modifies `roomInfo` prop to CollectPaymentPanel (R5-adjacent at L339). New import (`computeRoomGst`). All data available; no API change needed.

---

## 7. Downstream consumers

- `roomInfoFromCharge` (frontDeskService L164) — `balance_due` override at L339 is the only change; function itself is not modified
- BUG-492 Sub-B `discountOverMax` — uses `row.charge.balance_due` for its own calculation (separate from BUG-494); parallel-safe (different useMemo)
- BUG-490 `onChange` clamp — still uses `c.balance_due` (correct: prevents over-entry of the live session Amount discount); NOT changed

Gate 2 complete. Gate 3 pending owner GO.
