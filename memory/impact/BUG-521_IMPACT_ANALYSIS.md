# BUG-521 — IMPACT ANALYSIS (Gate 2)

**ID:** BUG-521
**Date:** 2026-10-09
**Agent:** PLANNING (Gate 2)
**Severity:** P2 | **Risk:** MEDIUM (UX — financial operation without visible feedback)
**Related:** BUG-519 (cause — E-519-3 removed it), BUG-499 (original F&B preview author)
**Code Reality:** CONFIRMED ABSENT — `bill-fnb-discount-preview` testid + `foodDiscountRs > 0` JSX block completely removed from Statement component in BUG-519

---

## Duplicate Check: DISTINCT
BUG-519 removed the preview intentionally (plan E-519-3 said "Remove F&B preview JSX block"). This is a planning gap in BUG-519 — the preview should have been MOVED to the right panel, not deleted. Registering as separate fix.

---

## 1. What Is Wrong

**Before BUG-519** (`Statement` component, pre-implementation):
```jsx
{/* BUG-499: F&B discount preview when Both/food selected (OD-499-02) */}
{foodDiscountRs > 0 && (
  <div className="text-[11px] text-[#329937] mt-1" data-testid="bill-fnb-discount-preview">
    {roomApplyTo === 'both' ? 'F&B (50% split)' : 'F&B'} discount: −{fmtINR(foodDiscountRs)}
  </div>
)}
```

This line was visible on the LEFT panel and told the cashier: "F&B (split) discount: −₹17".

**After BUG-519** (current state):
- The line is gone completely
- When "Both" is selected with 17%:
  - LEFT shows: "Room discount: −₹255" ✅ (via OD-519-01 read-only line, working)
  - RIGHT shows: "Room discount applied: −₹255" ✅ (green info line, working)
  - **NOWHERE** shows the F&B side: "F&B (split): −₹17" ❌
- The cashier sees no indication that the food total will be reduced
- Grand total in CollectPaymentPanel shows ₹248 (full food) even though the actual payment will be ₹231

**User-reported symptom:** "showing two discount box — even selected both — on both not applied"  
The "not applied" perception is because the food side is silent — no visual confirmation.

---

## 2. Data Flow Trace

```
roomDiscount=17, roomApplyTo='both', roomDiscountType='Percent'
↓
foodDiscountRs = floor(order.amount × 8.5/100) = 17
↓
BUG-519 E-519-3 removed the F&B preview from Statement
↓
LEFT panel (bill-left Statement):
  Shows: Booking ₹3,000, Check-in disc −₹1,000, Room disc −₹255, SGST/CGST, Balance ₹345
  Missing: "F&B (split) discount: −₹17"  ← ABSENT

RIGHT panel bill-right:
  Shows: RoomDiscountControls + "Room discount applied: −₹255" + CollectPaymentPanel
  Missing: "F&B (split) discount: −₹17"  ← ABSENT

CollectPaymentPanel (bill-right):
  Shows: Food Total ₹248 (ignores total prop) — no discount visible
  GRAND TOTAL: ₹248 + ₹345 = ₹593 (doesn't reflect food discount)
↓
User presses Checkout → handlePaid fires → silently deducts 17 from payment_amount
Backend receives: payment_amount=231, order_discount=17
Cashier collected ₹248 but system records ₹231
```

**The silent deduction is the core UX problem.** The cashier must KNOW the food discount is being applied.

---

## 3. Fix Location Decision (OD-521-01)

**BUG-519 design intent:** RIGHT panel = all operations, LEFT panel = read-only summary.

The F&B preview should follow this intent and go to the RIGHT panel. Specifically: inside the `RoomDiscountControls` section, below the input row, as a green info line — symmetrical to the left panel's "Room discount: −₹255".

**Options:**

| Option | Location | Pros | Cons |
|---|---|---|---|
| **a** (recommended) | RIGHT panel — inside `RoomDiscountControls`, below the discount input block | Consistent with BUG-519 "all ops on right" intent; cashier sees both room and food side together | Requires adding `foodDiscountRs` prop to `RoomDiscountControls` |
| **b** | LEFT panel — restore in `Statement` below the "Room discount" line | Symmetric with room discount line already shown there | Contradicts BUG-519 design (left = read-only static) |

**Recommendation: Option a** — Right panel keeps all discount information and operations together. The cashier looks right for discounts, sees both room and food sides.

**Exact placement (Option a):** Below the input row inside `RoomDiscountControls`, visible only when `roomApplyTo !== 'room' && foodDiscountRs > 0`:
```jsx
{roomApplyTo !== 'room' && foodDiscountRs > 0 && (
  <div className="text-[11px] text-[#329937] mt-1" data-testid="bill-fnb-discount-preview">
    {roomApplyTo === 'both' ? 'F&B (split)' : 'F&B'} discount: −{fmtINR(foodDiscountRs)}
  </div>
)}
```

This requires adding `foodDiscountRs` as a prop to `RoomDiscountControls`.

---

## 4. Risk Classification

**MEDIUM** — UI feedback only, no financial formula changed. BUT practically CRITICAL for cashier trust: without the preview, cashier doesn't know food discount is applied, may charge wrong amount, or disputes with customer.

**Blast radius:** SMALL — 1 file, 2 edit sites:
1. `RoomDiscountControls` component: add `foodDiscountRs` prop + preview JSX (~5 lines)
2. `RoomDiscountControls` call site in render: pass `foodDiscountRs={foodDiscountRs}` prop

---

## 5. Affected Files

| File | Lines | Change scope |
|---|---|---|
| `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` | RoomDiscountControls component (L41–130) + call site in render (L388–402) | Add `foodDiscountRs` prop + preview JSX |

**Files will NOT touch:** `Statement`, `RoomSection`, `orderTransform.js`, `CollectPaymentPanel.jsx`, any other file.

---

## 6. Owner Decisions (GATE 2 OPEN)

| ID | Question | Options | Recommendation |
|---|---|---|---|
| OD-521-01 | Where to show the F&B split preview — right panel (inside RoomDiscountControls) or left panel (restore in Statement)? | a) Right panel — inside RoomDiscountControls below the input (aligns with BUG-519 design) ; b) Left panel — restore in Statement below Room discount line | **a** — right panel consistent with BUG-519 intent |

---

## 7. Conflict Pre-Check

| File | Last modifier | Date | Open items | Conflict |
|---|---|---|---|---|
| `FolioCheckoutPanel.jsx` | BUG-519 (same session) | 2026-10-09 | BUG-520 (planned before this — touches handlePaid, different section) | NONE — BUG-521 touches RoomDiscountControls component only; BUG-520 touches handlePaid only. Parallel-safe IF BUG-520 implemented first |

**Execution order:** BUG-520 THEN BUG-521 (BUG-520 is payload/financial, BUG-521 is UI — independent but prefer financial first)

---

## 8. Additional Context — "Two discount boxes" (Not a bug, clarification)

Owner mentioned "showing two discount box." The two areas are:
1. **ROOM DISCOUNT** section (RoomDiscountControls) — for room-level discount split
2. **ADJUSTMENTS > Discount** in CollectPaymentPanel — the existing F&B-only discount mechanism (unrelated to room)

These serve DIFFERENT purposes and both should remain visible. BUG-521 fix adds the F&B split preview INSIDE the ROOM DISCOUNT section, making it clear that "Both" mode is applying to F&B. The two boxes are by design.

---

**Gate 2 Status:** OPEN — awaiting OD-521-01 answer before Gate 3 can proceed.
