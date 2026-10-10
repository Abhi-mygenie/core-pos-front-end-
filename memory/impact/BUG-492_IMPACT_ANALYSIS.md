# BUG-492 — Impact Analysis (Gate 2)

**ID:** BUG-492
**Date:** 2026-10-06
**Author:** Planning agent
**Code Reality:** NONE — fixes absent from codebase (grep confirmed in intake doc)
**Conflict Pre-check:** FolioCheckoutPanel.jsx, CheckInPage.jsx, CheckInForm.jsx all last modified BUG-490/491 (2026-10-05). Parallel-safe: BUG-492 adds NEW computed values and JSX blocks; does not touch any of BUG-490/491's existing capped lines.

---

## Sub-A — Checkout total does not reflect room discount

### Root Cause

`FolioCheckoutPanel.jsx` L316:
```javascript
roomInfo={roomInfoFromCharge(order.roomInfo, row.charge)}
```
`roomInfoFromCharge` (frontDeskService.js L164) sets:
```javascript
roomPaymentSummary: { remainingRoomBalance: Number(charge?.balance_due ?? 0) }
```
`CollectPaymentPanel` (L199-202) uses `remainingRoomBalance` to compute and display the Checkout button amount. This value is **always `charge.balance_due` (pre-discount)** — never reduced by `roomDiscountInfoRs`.

### R11 Probe Result (2026-10-06)

- `preprod.mygenie.online/api/v2/vendoremployee/get-single-order-new` responds HTTP 200
- Order 1232965 (room_discount_amount=200, balance_payment=750) was processed on the server — confirms backend handles `room_discount` and `payment_amount` as independent fields
- Contract confirmed: backend applies `room_discount` to the booking record AND uses `payment_amount` as the actual amount collected. No double-application.
- Safe to send `payment_amount = charge.balance_due - roomDiscountInfoRs` alongside `room_discount = roomDiscountInfoRs`

### Fix Direction

Override `remainingRoomBalance` in the `roomInfo` prop (L316):
```javascript
roomInfo={roomInfoFromCharge(order.roomInfo, {
  ...row.charge,
  balance_due: Math.max(0, Number(row.charge?.balance_due || 0) - roomDiscountInfoRs)
})}
```
`roomDiscountInfoRs` is already in FolioCheckoutPanel main scope (L202-210). This is a **1-line JSX prop change** — no new state, no imports.

**Note:** `total={order.amount || 0}` is the F&B-only prop — NOT what drives the Checkout button. Do NOT touch it.

---

## Sub-B — % input has no dynamic cap, no alert, no button disable

### Root Cause

Three components hardcode `max={... ? 100 : ...}` for Percent mode. No `maxPct` formula. No alert. No disable.

| Component | Current max line | Line |
|-----------|-----------------|------|
| `FolioCheckoutPanel` (RoomSection) | `max={roomDiscountType === 'Percent' ? 100 : ...}` | L92 |
| `CheckInPage` | `max={ciRoomDiscountType === 'Percent' ? 100 : ...}` | L889 |
| `CheckInForm` | `max={ciRoomDiscountType === 'Percent' ? 100 : ...}` | L189 |

### maxPct Formula

```
maxPct = Math.floor(balance_due / booking_charge × 100)
```

Per component:
- **CheckInForm:** `Math.floor(Number(c.balance_due||0) / Number(c.booking_charge||1) * 100)` — `c = props.charge`
- **CheckInPage:** `Math.floor(effectiveBalanceDue / Number(form?.orderAmount||1) * 100)` — effectiveBalanceDue already computed at L254
- **FolioCheckoutPanel RoomSection:** `Math.floor(Number(c.balance_due||0) / Number(c.booking_charge||1) * 100)` — `c = row.charge ?? {}`

### Alert Text (OD-492-02 Option A)

When `discountOverMax = (roomDiscountType === 'Percent' && roomDiscount > maxPct)`:
```
"Maximum discount: {maxPct}% (₹{Math.floor(booking_charge × maxPct / 100)}). Entering above {maxPct}% has no additional effect."
```
Red styling: `text-[#B91C1C] bg-red-50 border border-red-200 rounded px-2 py-1`.

### Button Disable (OD-492-02 Option A)

- **CheckInForm:** `disabled={!ready || busy || discountOverMax}`
- **CheckInPage:** add `&& !discountOverMax` to `formValid` useMemo (or disabled prop)
- **FolioCheckoutPanel:** block `handlePaid` execution; show inline error when `discountOverMax`

### discountOverMax Architecture for FolioCheckoutPanel

`discountOverMax` must be known in BOTH RoomSection (for JSX alert) AND the parent FolioCheckoutPanel (to block handlePaid). Two options:

**Option A:** Compute twice — locally in RoomSection (for JSX) + in parent (for handlePaid guard). No extra props.
**Option B:** Compute once in parent, pass as prop to RoomSection.

→ **Option A selected** (simpler, avoids prop threading). Both computations are deterministic and identical.

---

## Affected Files

| File | Sub | Lines changed | Risk |
|------|-----|--------------|------|
| `FolioCheckoutPanel.jsx` | A + B | ~8 lines: L316 roomInfo override, L92 maxPct, L52-55 add maxPct/discountOverMax in RoomSection, alert JSX in RoomSection, discountOverMax useMemo in parent, handlePaid guard | HIGH (R5-adjacent) |
| `CheckInPage.jsx` | B | ~6 lines: maxPct/discountOverMax consts near L270, formValid condition, alert JSX near L889, L889 max attr | MEDIUM |
| `CheckInForm.jsx` | B | ~5 lines: maxPct/discountOverMax consts after L67, alert JSX near L223, L189 max attr, L223 disabled attr | MEDIUM |

**NOT touched:** `CollectPaymentPanel.jsx` (R5), `orderTransform.js` (R5), `frontDeskService.js`, `pmsService.js`.

---

## Risk Classification

**HIGH** — Sub-A modifies `roomInfo` prop passed to CollectPaymentPanel (R5-adjacent, drives payment amount); Sub-B touches confirm/checkout button disable logic in all 3 components. No formula change in financial payload. R11 probe confirms backend contract. Fast Lane: NOT eligible.

---

## Verification

| # | Check |
|---|-------|
| V-492-A1 | FolioCheckoutPanel: enter ₹500 discount on ₹1,075 balance → Checkout button shows ₹575 |
| V-492-A2 | No discount → Checkout button shows charge.balance_due (unchanged) |
| V-492-A3 | Payment completes successfully (backend accepts discounted payment_amount) |
| V-492-B1 | CheckInForm: enter 80% on 71%-max room → red alert appears, Confirm disabled |
| V-492-B2 | CheckInPage: same flow → red alert, button disabled |
| V-492-B3 | FolioCheckoutPanel: enter 80% → red alert in RoomSection, Checkout blocked |
| V-492-B4 | 71% → no alert, button enabled |
| V-492-B5 | Amount mode → no maxPct restriction (amount capped by BUG-490 onChange, no alert) |
| V-492-B6 | discountOverMax resets to false when type switched to Amount |

Gate 2 complete. Gate 3 ready.
