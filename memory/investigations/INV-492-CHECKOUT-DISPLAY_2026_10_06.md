# INVESTIGATION — INV-492: Checkout Bill Panel Discount Display + % Cap Alert
**Date:** 2026-10-06
**Triggered by:** Owner screenshots (order #000324, denji, room r4, ₹1,500, advance ₹500)
**URL:** /pms/front-desk-v2?tab=inhouse
**Scope:** TWO owner-reported issues + ONE sub-A regression risk found

---

## 1. Summary

**Issue 1 (Discount info not shown in right panel):**
Root cause: DESIGN GAP — The right panel (CollectPaymentPanel) has no mechanism to show a discount. The info note (Sub-D) only appears when the cashier types a NEW discount in the current session. The Checkout button amount (`order.amount`) NEVER changes regardless of discount entered — it always shows ₹1,075. There is also NO pre-fill of any discount applied at check-in.

**Issue 2 (% input has no red alert when over maximum meaningful %):**
Root cause: MISSING FEATURE — The % input `max` is hardcoded to 100. There is no dynamic cap, no red alert, and no button-disable logic. When a cashier enters > 71% on this booking, the ₹ result is silently capped at balance_due (₹1,075) — the 72nd through 100th percent all produce the same ₹1,075, which is misleading.

**Sub-finding F3 (pmsService Sub-A, GST gap):**
`row.charge?.sgst` and `row.charge?.cgst` are NOT present in the local-reservations `charge` object (confirmed: `frontDeskTransform.js` passes `charge` through as-is with no sgst/cgst mapping). The `chargeGst` line in Sub-A always produces 0. BALANCE column shows `balance_payment` only, without GST. For order #000324, ₹0 is still correct (100% discount at check-in → balance_payment ≈ 0). For partial-discount orders (e.g., 1232970), BALANCE would be ₹335 SHORT of expected.

**Classification:**
- Issue 1: DESIGN_GAP (two sub-parts: no right-panel update + no pre-fill)
- Issue 2: MISSING_FEATURE
- F3: FE_BUG (Sub-A chargeGst always 0 — SEPARATE from this investigation; low-severity for ₹0 case)

**Confidence:** HIGH — full code trace, no ambiguity.
**Steps used:** 6/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Result |
|---|-----------|------|--------|
| H1 | Info note shows when discount entered, but screenshots show no discount typed yet | Code trace: `roomDiscountInfoRs` condition L299 | **CONFIRMED** — note requires `roomDiscount > 0` (state starts at 0 on open) |
| H2 | Right panel Checkout button reflects entered discount | Code trace: `total={order.amount \|\| 0}` L307 | **ELIMINATED** — total is permanent, never changes |
| H3 | `row.charge.sgst`/`cgst` available from local-reservations | `frontDeskTransform.js` trace: charge passed through as-is, no sgst/cgst mapped | **ELIMINATED** — these fields absent; chargeGst always 0 |
| H4 | % cap needs a dynamic maxPct + red alert | Code trace: `max={100}` hardcoded L92, no alert/disable logic anywhere | **CONFIRMED** — feature entirely missing |

---

## 3. Data Flow Trace

### Issue 1 — Right panel shows no discount

```
Cashier opens Bill (FolioCheckoutPanel mounts)
  → roomDiscount = useState(0)       ← L192, always 0 on mount
  → roomDiscountInfoRs = useMemo()   ← L202: if (!roomDiscount) return 0
  → info note: roomDiscountInfoRs > 0?  NO → hidden ← L299
  → CollectPaymentPanel total = order.amount || 0  ← L307: PERMANENT, never changes

Cashier types "500" in Amount discount input:
  → roomDiscount = 500 (state updated)
  → roomDiscountInfoRs = Math.min(500, balance_due=1075) = 500 > 0
  → info note: "Room discount applied: −₹500" ← APPEARS ✅
  → Room balance line (left panel): 1075 - 500 = ₹575 ← updates ✅
  → CollectPaymentPanel "Checkout ₹1,075" → UNCHANGED ← still ₹1,075 ✗ confusing

BREAK POINT A: No pre-fill from folio.
  → folio.room_info.room_discount_amount exists if discount at check-in
  → BUT roomDiscount state never initialized from this field
  → Panel opens blank every time regardless of check-in discount

BREAK POINT B: CollectPaymentPanel total ignores room discount entirely.
  → total={order.amount || 0} — order.amount = F&B + room total BEFORE discount
  → Cashier enters any discount → Checkout button stays "₹1,075"
  → The only visible feedback is: info note above CollectPaymentPanel
    + Room balance line on the left
```

### Issue 2 — % cap / red alert missing

```
Cashier switches to % mode, types "80"
  → max attr = 100 (hardcoded) ← L92
  → no validation against maxPct = floor(1075/1500 × 100) = 71
  → roomDiscountRs = Math.min(Math.floor(1500 × 80/100), 1075) = Math.min(1200, 1075) = 1075
  → same result as typing 100%: ₹1,075 capped
  → cashier sees "80%" but gets same ₹ as "71%" → MISLEADING
  → no alert, no warning, Checkout stays enabled

BREAK POINT: No `maxPct` computed. No alert rendered. No button-disable condition.
```

### Sub-finding F3 — chargeGst gap in Sub-A

```
pmsService.getInHouseGuests() Step 3:
  chargeGst = Number(row.charge?.sgst ?? 0) + Number(row.charge?.cgst ?? 0)

frontDeskTransform.fromFrontDeskSnapshot():
  const charge = x.charge ?? null;   ← L33: raw pass-through from local-reservations
  ...
  charge,                             ← L61: no sgst/cgst added by transform

local-reservations API charge object:
  { balance_due, booking_charge, nights, nights_detail, ... }
  ← sgst/cgst NOT fields in this object

→ row.charge?.sgst = undefined → 0
→ row.charge?.cgst = undefined → 0
→ chargeGst = 0 ALWAYS

Effect on BALANCE column:
  Order 1232970 (discount ₹2,680): balance_payment=2665, chargeGst=0 → BALANCE=2665 (expected 3000, SHORT by 335)
  Order #000324 (discount 100%):   balance_payment=0,    chargeGst=0 → BALANCE=0    (user confirms ✅ correct for this case)
```

---

## 4. Evidence Artifacts

**Saved to:** `/app/memory/evidence/INV-492-CHECKOUT-DISPLAY/`

**Code evidence:**
```
FolioCheckoutPanel.jsx L192:   const [roomDiscount, setRoomDiscount] = useState(0);    ← never initialized
FolioCheckoutPanel.jsx L299:   {roomDiscountInfoRs > 0 && ...}                         ← 0 on open → hidden
FolioCheckoutPanel.jsx L307:   total={order.amount || 0}                               ← permanent, ignores discount
FolioCheckoutPanel.jsx L92:    max={roomDiscountType === 'Percent' ? 100 : ...}        ← hardcoded 100, no maxPct
frontDeskTransform.js L33/61:  const charge = x.charge ?? null; ... charge,            ← sgst/cgst absent
pmsService.js L111:            chargeGst = Number(row.charge?.sgst ?? 0) + ...        ← always 0
```

---

## 5. Answering the Owner's Questions Directly

**Q1: "When Bill clicked for checkout it doesn't show any discount info"**

Correct observation. Two causes:
1. **At panel open**: No discount has been entered yet → `roomDiscount = 0` → info note hidden → normal behaviour.
2. **After entering a discount**: Info note does appear on the right panel above CollectPaymentPanel ("Room discount applied: −₹X"). The left "Room balance" line also updates live. HOWEVER, the big green **"Checkout ₹1,075"** button NEVER changes — it always shows the pre-discount total. This creates the impression that the discount has no effect on what the cashier collects.

**Root recommendation:** The `total` prop on CollectPaymentPanel should be updated to subtract the room discount: `total={Math.max(0, (order.amount || 0) - roomDiscountInfoRs)}`. This would make the Checkout button show "Checkout ₹575" when ₹500 discount is entered — instantly confirming the discount's effect to the cashier.

This REVERSES the OD-491-D-01 Option B decision. Owner must approve this change.

**Q2: "% should not exceed the mark — red alert + disable checkout button — maximum discount allowed % is X%"**

Correct requirement. Currently MISSING entirely. The feature needs:

```
maxPct = Math.floor((c.balance_due / c.booking_charge) * 100)
       = Math.floor((1075 / 1500) * 100)
       = Math.floor(71.67)
       = 71

IF roomDiscountType === 'Percent' AND roomDiscount > maxPct:
  → Show red alert: "Maximum discount: 71% (₹1,075). Entering above 71% has no additional effect."
  → Disable Checkout/Confirm button (data-testid="bill-checkout-btn" or equivalent)
  → Input border turns red
```

Note: Disabling the Checkout button for any % > maxPct is a strong UX signal. Alternatively, just showing the warning without disabling may be sufficient (the ₹ is already capped, no financial over-discount actually occurs). **Owner to decide: disable button OR warning-only.**

---

## 6. Recommendations

| # | Issue | Fix Type | Scope | OD needed? |
|---|-------|----------|-------|-----------|
| R1 | **Checkout button total never updates** — revise OD-491-D-01 | PLAN_CHANGE — update `total` prop in CollectPaymentPanel | FolioCheckoutPanel.jsx L307: 1 line | **YES — reverses OD-491-D-01 Option B** |
| R2 | **No pre-fill of check-in discount in checkout panel** | NEW FEATURE — init `roomDiscount` from `order.roomInfo?.roomDiscount` if available | FolioCheckoutPanel.jsx: ~5 lines (useEffect + state init) | NO — enhancement |
| R3 | **No maxPct + red alert + button disable** | NEW FEATURE — compute maxPct, add warning JSX, add disable condition | FolioCheckoutPanel.jsx (RoomSection + Statement/main): ~10 lines | **YES — owner to decide disable-button OR warning-only** |
| R4 | **Sub-A chargeGst always 0** — GST gap in BALANCE column | FE_BUG — must source sgst/cgst from the correct API field (NOT row.charge) | pmsService.js: requires investigation of correct GST source | PLANNING needed — separate item |

**Planning skip eligibility (R1+R3 combined):**
- Files: FolioCheckoutPanel.jsx only (1 file)
- Lines: ~12 lines total
- Not R5 hotspot: FolioCheckoutPanel is NOT on R5 list
- Financial: YES (discount affects Checkout amount) → needs owner approval
- **Recommendation: DIRECT_BUG_FIX with owner approval for R1 (reverting OD-491-D-01 + setting total = amount - roomDiscountInfoRs) + R3 (adding maxPct + alert)**

---

## 7. Owner Decisions Required

**OD-492-01 (Issue 1): Should the Checkout button total reflect the room discount?**
- Option A (recommended): `total={Math.max(0, (order.amount || 0) - roomDiscountInfoRs)}` → Checkout button shows reduced amount → unambiguous feedback
- Option B (current): Keep `total={order.amount}` → relying on info note + left panel → confusing UX confirmed by owner

**OD-492-02 (Issue 2): Should an over-max-% disable the Checkout button or show warning only?**
- Option A: Disable Checkout/Confirm button when `roomDiscount > maxPct` in Percent mode → strong UX, but cashier must fix the % to proceed
- Option B (recommended): Show red alert "Maximum: 71% — entering above has no additional effect" WITHOUT disabling → cashier can still checkout, just informed

---

## 8. Retroactive Candidates

NONE.

---

## Handover Summary

```
Root cause:
  Issue 1: DESIGN_GAP — roomDiscount starts at 0, info note requires >0,
           CollectPaymentPanel total permanently set to order.amount.
  Issue 2: MISSING_FEATURE — no maxPct, no red alert, no button disable.
  F3:      FE_BUG — Sub-A chargeGst always 0 (sgst/cgst absent from LR charge).
           Low severity for ₹0 case; HIGH severity for partial-discount BALANCE column.

Confidence: HIGH. Steps used: 6/10.

FE fix: YES — R1: 1 line (total prop), R3: ~10 lines (maxPct + alert).
Planning skip eligible: YES with owner approval (1 file, ≤12 lines, not hotspot).
Owner decisions: OD-492-01 (total prop) + OD-492-02 (disable vs warn).
Sub-A regression: Needs separate PLANNING — sgst/cgst source must be found.

Report: investigations/INV-492-CHECKOUT-DISPLAY_2026_10_06.md
```
