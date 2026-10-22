# BUG-492 — Checkout Bill Panel: Discount not reflected in Checkout total + % input exceeds meaningful cap without alert

**ID:** BUG-492
**Type:** BUG (batch — 2 sub-issues, both ODs LOCKED)
**Date:** 2026-10-06
**Registered by:** Intake agent (session 2026-10-06)
**Status:** GATE_1_INTAKE
**Sprint:** oct_bug_batch
**Risk:** HIGH
**Severity:** P1
**Related:** BUG-491 (Sub-D introduced info note; OD-491-D-01 Option B — now revised by OD-492-01), BUG-490 (% cap logic), CR-407 (room discount feature parent)

---

## Description

After the room discount feature (CR-407 + BUG-489 + BUG-490 + BUG-491) was implemented, two display/UX gaps remain in the checkout Bill panel and in all three discount entry points.

---

## Sub-issues

### Sub-A — Checkout total (CollectPaymentPanel) does not reflect entered room discount

**Owner symptom (OD-492-01 LOCKED = YES):** When a cashier enters a room discount (e.g., ₹500) in the left Bill panel, the right panel's "Checkout ₹1,075" button never updates. The cashier cannot see how much to actually collect from the guest after the discount.

**Root cause (code trace):**
`FolioCheckoutPanel.jsx` passes `roomInfo={roomInfoFromCharge(order.roomInfo, row.charge)}` to CollectPaymentPanel. `roomInfoFromCharge` (frontDeskService.js L164) sets:
```javascript
roomPaymentSummary: { remainingRoomBalance: Number(charge?.balance_due ?? 0) }
```
CollectPaymentPanel uses `roomInfo.roomPaymentSummary.remainingRoomBalance` to display the Checkout amount. This value is **always `charge.balance_due` (pre-discount)** — it never accounts for `roomDiscountInfoRs` entered in the current session.

**Fix direction:** Override `remainingRoomBalance` in the `roomInfo` prop to be `charge.balance_due - roomDiscountInfoRs` (capped at 0). This will make the Checkout button show the actual amount to collect after discount.

**Note:** `total={order.amount || 0}` prop is the F&B-only component and is NOT what drives the Checkout button amount (that is `remainingRoomBalance` from roomInfo). The fix should NOT touch the `total` prop.

**OD-492-01:** LOCKED = YES (reflect discount in Checkout total)

---

### Sub-B — % input has no dynamic cap alert and no button disable when over the meaningful maximum

**Owner symptom (OD-492-02 LOCKED = Option A):** When a cashier enters a percentage higher than the meaningful maximum (e.g., 80% on a ₹1,500 room with ₹500 advance → meaningful max = 71%), the system silently caps the ₹ amount at balance_due (₹1,075). There is no red alert, no visual warning, and the Confirm/Checkout button remains enabled. This is misleading: the cashier sees "80%" but is effectively applying 71%.

**Root cause (code trace):**
Three components have `max={roomDiscountType === 'Percent' ? 100 : ...}` hardcoded to 100 for Percent mode:
- `CheckInForm.jsx` L189 — hardcoded `100`
- `CheckInPage.jsx` L889 — hardcoded `100`
- `FolioCheckoutPanel.jsx` (RoomSection) L92 — hardcoded `100`

There is no `maxPct` computation, no red border/alert, and no disable condition on any of the three confirm/checkout buttons.

**Meaningful max % formula:**
```
maxPct = Math.floor((balance_due / booking_charge) * 100)
Example: Math.floor((1075 / 1500) * 100) = 71
```

**Fix direction (per component):**
- **CheckInForm**: Compute `maxPct` from `c.balance_due`/`c.booking_charge`, show red alert when `ciRoomDiscountType === 'Percent' && ciRoomDiscountAmt > maxPct`, add `!discountOverMax` to `disabled` on "Confirm check-in" button
- **CheckInPage**: Compute `maxPct` from `effectiveBalanceDue`/`form.orderAmount`, add `!discountOverMax` to `formValid` condition or button disabled prop
- **FolioCheckoutPanel**: Compute `maxPct` from `c.balance_due`/`c.booking_charge` in RoomSection; pass `discountOverMax` flag up to parent; block `handlePaid` execution and show error when over max; add red border to % input

**OD-492-02:** LOCKED = Option A (disable checkout button + red alert)

---

## Duplicate Check

- BUG-491 Sub-D: RELATED PARENT — introduced info note (OD-491-D-01 Option B). BUG-492 Sub-A reverses that for the Checkout total (new OD-492-01).
- BUG-490: RELATED — introduced % input cap (max attr + onChange). BUG-492 Sub-B adds semantic validation on top of the cap.
- CR-407: RELATED PARENT — introduced the room discount feature.
- **Duplicate check: DISTINCT — Related: BUG-491, BUG-490, CR-407**

---

## Code Reality

**NONE** — neither fix exists in the codebase.

```bash
grep -n "remainingRoomBalance.*discount\|maxPct\|discountOverMax\|over.*max\|percent.*alert" \
  src/components/pms/frontdesk/FolioCheckoutPanel.jsx \
  src/pages/pms/CheckInPage.jsx \
  src/components/pms/frontdesk/CheckInForm.jsx → 0 hits
```

---

## Severity

**P1 — HIGH**
- Sub-A: Cashier cannot see how much to collect from guest after discount → must manually calculate → error-prone at checkout
- Sub-B: Entering 80% on a booking looks like a bigger discount than 71% but has identical effect → cashier confusion, potential disputes with guests

---

## Risk Classification

**HIGH**
- Sub-A: Modifies `roomInfo` prop passed to CollectPaymentPanel (R5 hotspot adjacent). The `remainingRoomBalance` override determines what the cashier is prompted to pay. Must verify backend handles `payment_amount = balance_due - discount` correctly alongside `room_discount` payload. **Requires curl-probe before implementation** (R11).
- Sub-B: Input validation + button disable logic across 3 files. No financial formula change. Intermediate risk.
- Fast Lane: NOT eligible (3 files, financial-adjacent, CollectPaymentPanel R5-adjacent)

---

## Evidence

- **Screenshots (owner-provided, 2026-10-06):** 4 screenshots showing:
  1. CheckInForm with 100% discount, balance ₹0, Confirm check-in enabled (no maxPct alert)
  2. Same scrolled — "Ready to check in" + "Confirm check-in" button green (not disabled despite 100% > 71%)
  3. In-house Bill panel open (order #000324) — right panel "Checkout ₹1,075" ignoring any discount
  4. Bill scrolled — GRAND TOTAL ₹1,075, Checkout ₹1,075 unchanged
- **Code trace:** `roomInfoFromCharge` L164 + FolioCheckoutPanel L316 + CollectPaymentPanel roomPaymentSummary
- **Source:** OWNER-REPORTED + AGENT-CONFIRMED (static trace)
- **Confidence:** CONFIRMED

---

## Blast Radius

| File | Sub | Change |
|------|-----|--------|
| `components/pms/frontdesk/FolioCheckoutPanel.jsx` | A + B | Sub-A: override `remainingRoomBalance` in roomInfo prop (~2 lines). Sub-B: `maxPct` compute in RoomSection, red alert JSX, `discountOverMax` state/flag, block `handlePaid` (~8 lines) |
| `pages/pms/CheckInPage.jsx` | B only | `maxPct` compute, red alert, add to `formValid` or disable prop (~5 lines) |
| `components/pms/frontdesk/CheckInForm.jsx` | B only | `maxPct` compute, red alert, modify `disabled` on confirm button (~4 lines) |

- **3 files, none are R5 hotspots** (CollectPaymentPanel IS R5 but is NOT modified)
- **Blast radius: MEDIUM**

---

## Open Owner Decisions

All ODs **LOCKED**:

| OD | Decision |
|----|---------|
| OD-492-01 | YES — Checkout total must reflect room discount (show reduced amount to collect) |
| OD-492-02 | Option A — Disable Checkout/Confirm button when % > maxPct AND show red alert |

**Gate 3 can proceed for both sub-issues once planning agent confirms backend payment contract (R11 probe required for Sub-A).**

---

## Next

Planning Gate 2 → Gate 3 → Gate 4 GO → Implementation.
Same sprint (oct_bug_batch) as BUG-490/491.
