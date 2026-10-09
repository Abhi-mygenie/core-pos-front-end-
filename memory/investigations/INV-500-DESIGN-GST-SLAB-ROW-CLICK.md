# INV-500 — INVESTIGATION: GST Slab + Discount Design, Collect-Now Cap, Row-Click Bug

**Date:** 2026-10-06
**Reporter:** Owner (screenshots + verbal description)
**Role:** INVESTIGATION (no code edits)
**Scope:** 4 points — check-in GST/discount, Collect Now cap, left/right panel architecture, in-house row click bug
**Steps used:** 10/10
**Related:** BUG-496 (maxPct formula), BUG-498/499 (checkout discount — GATE_5A)

---

## SUMMARY OF FINDINGS

| # | Issue | Root Cause | Risk | Design decision needed? |
|---|-------|-----------|------|------------------------|
| F1 | GST strip doesn't recalculate on discount (slab crossing) | `gstBase` in strip = full `orderAmount`, discount not subtracted | CRITICAL | YES — OD-500-01 |
| F2 | `effectiveBalanceDue` uses full-price GST (no discount) | Same root cause as F1 — `base = orderAmount` not `discountedBase` | CRITICAL | NO (follows from F1) |
| F3 | Collect Now max = full room amount (ignores discount) | `max={form.orderAmount}` at CheckInPage L847 | HIGH | NO (follows from F1) |
| F4 | In-house row click → detail stub, not Bill | `toggleRow` hardcodes `kind='detail'`; RowExpansionStub uses stale LR data | MEDIUM | YES — OD-500-02 |
| F5 | RowExpansionStub missing check-in discount line | `row.discountAmount` never stored after folio enrich in pmsService | MEDIUM | NO (clear fix) |
| F6 | Architecture: all calculations to right panel | Design directive from owner — confirmed | — | LOCKED: OD-500-03 |

---

## FINDING 1+2+3 — GST Slab Crossing + effectiveBalanceDue + Collect Now

### Indian Hotel GST Slabs (active in `roomGstCalculator.js`)

```
Per-room per-night rate:
  < ₹1,000:   0% GST
  ₹1,000–₹7,500: 12% GST  (CGST 6% + SGST 6%)
  > ₹7,500:  18% GST  (CGST 9% + SGST 9%)
```

### Data Flow — Current (BROKEN)

```
Owner sets room discount 50% on ₹9,000 room (advance at booking = ₹1,000):

CheckInPage.jsx (right panel):

  gstBase (strip L928)   = form.orderAmount = ₹9,000  ← FULL price, no discount
  GST strip shows        = 18% of ₹9,000 = ₹1,620     ← WRONG SLAB (should be 12% on ₹4,500)
  SGST shown             = ₹810 ← wrong
  CGST shown             = ₹810 ← wrong
  
  effectiveBalanceDue (L254)
    base   = form.orderAmount = ₹9,000
    gst    = computeRoomGst(9000) = ₹1,620 (18% slab)
    advance= ₹1,000
    result = 9,000 + 1,620 − 1,000 = ₹9,620  ← WRONG

  roomDiscountRs (L263)  = min(floor(9000×50%), effectiveBalanceDue=9620)
                         = min(4500, 9620) = ₹4,500  ← discount ₹ is correct

  Collect Now max (L847) = form.orderAmount = ₹9,000  ← WRONG — no cap at post-discount balance

  Balance shown in right panel right now appears to show ₹5,120 
  (= ₹10,620 total − ₹4,500 discount − ₹1,000 advance — simple subtraction, wrong GST)
```

### What SHOULD happen (owner rule)

```
Owner's rule: "discount should not eat the GST of amount collected at booking"
+ "if amount crosses/drops 7500 the GST rise and drops 5-18%"

CORRECT calculation:
  discountedBase = max(0, orderAmount − roomDiscountRs)
                = max(0, 9000 − 4500) = ₹4,500

  newGST = computeRoomGst(discountedBase)   ← recalculate on DISCOUNTED base
         → ₹4,500/night < ₹7,500 → 12% slab
         → CGST = ₹270, SGST = ₹270, gstTotal = ₹540  ← SLAB CHANGES!

  newTotal = discountedBase + newGST = ₹4,500 + ₹540 = ₹5,040

  effectiveBalance = newTotal − advanceAtBooking = ₹5,040 − ₹1,000 = ₹4,040

  Collect Now max = ₹4,040 (remaining balance, cannot go negative)
  
  GST strip must show: 12% slab · SGST ₹270 · CGST ₹270 · Total incl. GST ₹5,040
```

### Example: slab-crossing numbers

| Scenario | Room | Discount | Discounted base | GST rate | New total | Balance |
|----------|------|----------|----------------|----------|-----------|---------|
| No discount | ₹9,000 | 0% | ₹9,000 | 18% | ₹10,620 | ₹9,620 (adv=₹1k) |
| 50% discount | ₹9,000 | 50%=₹4,500 | **₹4,500** | **12%** | ₹5,040 | **₹4,040** |
| 20% discount | ₹9,000 | 20%=₹1,800 | **₹7,200** | **12%** | ₹8,064 | **₹7,064** |
| 5% discount | ₹9,000 | 5%=₹450 | **₹8,550** | **18%** | ₹10,089 | **₹9,089** |

*Key: below ₹7,500 → 12%; above ₹7,500 → 18%. Crossing the boundary changes both SGST/CGST amounts.*

### Files + Lines affected (CheckInPage.jsx)

| Line | What | Fix |
|------|------|-----|
| L928 (GST strip) | `gstBase = amt` | `gstBase = max(0, amt − roomDiscountRs)` |
| L254-260 (effectiveBalanceDue) | `base = orderAmount` | `base = max(0, orderAmount − roomDiscountRs)` |
| L847 (Collect Now max) | `max={form.orderAmount}` | `max={effectiveBalance_after_discount}` |
| L900 (discount input max) | `max={effectiveBalanceDue}` — already uses effectiveBalanceDue, but effectiveBalanceDue itself is wrong | Fixed by fixing F2 above |

**Note on circular dependency**: `effectiveBalanceDue` currently uses `roomDiscountRs` doesn't — `roomDiscountRs` uses `effectiveBalanceDue` as cap. If we change `effectiveBalanceDue` to use `roomDiscountRs`, there's a circular dep. 

**Solution**: Break the cycle — `effectiveBalanceDue` computes using the ENTERED discount amount directly (not `roomDiscountRs`):
```javascript
const discountedBase = Math.max(0, orderAmount - roomDiscountAmountRaw); // raw input, not capped
const { gstTotal } = computeRoomGst(applicable, slabs, discountedBase, nights, 1);
effectiveBalanceDue = Math.max(0, discountedBase + gstTotal - advance);
```
And `roomDiscountRs` is still capped at `effectiveBalanceDue` (now the discounted one).

**Owner Decision needed — OD-500-01:**
> When a check-in discount is applied and it causes the room rate to cross a GST slab boundary (e.g., ₹9,000 @ 18% → ₹4,500 @ 12%), should the GST be recalculated at the new slab on the DISCOUNTED base?

**Recommended answer:** YES — GST must be calculated on the price the guest actually pays. The advance at booking was a deposit against the original rate; if the rate changes due to discount, the GST changes too.

---

## FINDING 4 — In-house Row Click: opens Detail, not Bill

### Code trace

```
GuestTable.jsx L68:
  <tr onClick={() => onToggle(String(row.id))}>  ← ROW CLICK

FrontDeskWorkstationPage.jsx L105:
  const toggleRow = (id) => {
    setExpanded({ rowId: id, kind: 'detail' });  ← always 'detail'
  };

InHousePanel.jsx L23:
  expandedKind === 'bill'    → <FolioCheckoutPanel>  ← ONLY via Bill button
  expandedKind === 'extend'  → <ExtendStayForm>
  default ('detail')         → <RowExpansionStub>    ← row click ends up here
```

`stayActions` (DeparturesPanel.jsx L17):
```javascript
h.onOpen(r.id, 'bill')  // Bill button → sets kind='bill' → FolioCheckoutPanel
```

**Owner's observation**: clicking on the row shows a summary stub, not the bill. Clicking "empty space" within the expanded stub does nothing.

**Owner Decision needed — OD-500-02:**
> For in-house guests, should clicking the row directly open the Bill panel (FolioCheckoutPanel), or should it continue showing the detail stub first?
>
> Option A: Row click → Bill directly (for in-house only)
> Option B: Row click → detail stub first, Bill button opens bill (current behavior)
> Option C: Row click → detail stub, but tapping the summary area within the stub opens Bill

**Recommended answer:** Option A for in-house tab. In-house guests are there to be billed, not re-checked-in. Direct bill is the primary action.

---

## FINDING 5 — RowExpansionStub missing check-in discount

### Code trace

`RowExpansionStub` (GuestTable.jsx L167-171):
```javascript
{fmtINR(row.charge?.total_with_gst)}   // LR data — original price, no discount
{fmtINR(row.charge?.advance_payment)}  // LR data
{fmtINR(row.charge?.sgst)}             // LR data — original GST
{fmtINR(row.charge?.cgst)}             // LR data
{fmtINR(row.charge?.balance_due)}      // LR data — no discount
```

`pmsService.getInHouseGuests` (L80-160) fetches folio (`get-single-order-new`) and stores:
```javascript
row.balance          = computed room balance (uses room_info.balance_payment)
row.transferredFnb   = F&B balance
row.roomOrdersBalance= room orders balance
```

**MISSING**: `row.discountAmount = Number(raw.room_info?.room_discount_amount ?? 0)` is never stored.

**Fix (no OD needed):**
Add to pmsService.js (after row.balance = ...):
```javascript
row.discountAmount = Number(ri.room_discount_amount ?? 0);
```

Then in `RowExpansionStub`, add a line:
```jsx
{row.discountAmount > 0 && <>
  <span>Check-in discount</span><span>−{fmtINR(row.discountAmount)}</span>
</>}
```

---

## FINDING 6 — Architecture: Right Panel for Calculations

### Owner statement (2026-10-06):
> "we have decided - all the calculation will be shifted to right side panel - the left side will only show summary of everything as it shows"

### Current check-in page structure:
```
LEFT:   Guest details (name, phone, dates, room picker, ID docs, B2B GST)
RIGHT:  Stay summary (rate plan, nights, advance) 
        ─── Room bill summary ───
        ROOM DISCOUNT (OPTIONAL) ← already on right ✓
        COLLECT NOW ← already on right ✓
        GST strip ← currently inline in LEFT form area ← needs to move to RIGHT
```

The CHECK-IN page already has most calculations on the RIGHT. The main change needed is:
- GST strip (currently rendered as part of the left form IIFE) → move to right panel
- The right panel shows the correct discount + recalculated GST

### Current checkout (FolioCheckoutPanel) structure:
```
LEFT:  Room section (booking amount, SGST, CGST, discount input controls, room balance)
       Room orders, Transferred
RIGHT: CollectPaymentPanel

Owner directive: discount input + calculations → RIGHT
LEFT → read-only summary only
```

**OD-500-03 (LOCKED by owner):**
> All discount input controls and GST calculations → RIGHT panel
> LEFT panel → read-only display only (booking amount, check-in discount line, SGST, CGST, already paid, room balance)

This means the BUG-498/499 implementation MUST move discount controls to the right panel. The previous plan (PROPER_PLAN) was actually correct on this point — the "revised" plan kept controls on left per earlier misunderstanding.

---

## DESIGN BRIEF — Recommended Architecture

### Check-in right panel (correct flow):

```
RIGHT PANEL — Summary + Calculations:
┌──────────────────────────────────┐
│ ROOM BILL                        │
│ Rate/night:          ₹9,000      │
│ Booking charge:      ₹9,000      │
│ SGST (18%→12%*):     ₹810→₹270* │ ← recalculates when discount entered
│ CGST (18%→12%*):     ₹810→₹270* │
│ Total incl. GST:     ₹10,620→₹5,040*│
│ Already paid:        -₹1,000     │
│ Balance due:         ₹9,620→₹4,040*│
│                                  │
│ ROOM DISCOUNT (Optional)         │
│ [₹] [%]  [___50___]  = −₹4,500  │
│ ↑ GST recalculates LIVE          │
│                                  │
│ COLLECT NOW (Optional)           │
│ [___1,000___] Cash/Card/UPI      │
│ max = ₹4,040 (balance after disc)│
└──────────────────────────────────┘
* = after discount applied, slab crossing shown
```

### Checkout right panel (Bill):

```
RIGHT PANEL — CollectPaymentPanel + Room Discount:
┌──────────────────────────────────┐
│ ROOM DISCOUNT (Optional)         │ ← MOVED from left per OD-500-03
│ [Room] [Both] [F&B only]         │
│ [₹] [%]  [_______]  Reason      │
│ max % = floor(baseBalance/bc×100)│
│                                  │
│ CollectPaymentPanel              │
│   ...payment method, tip, etc... │
└──────────────────────────────────┘

LEFT PANEL — read-only summary:
  Booking amount         ₹9,000
  Check-in discount      −₹4,500 (80%)  ← read-only, from folio
  SGST                   ₹112.50
  CGST                   ₹112.50
  Already paid           −₹2,000
  Room balance           ₹...
  ─── Room orders ───
  ─── Transferred ───
```

---

## OPEN DESIGN DECISIONS NEEDED FROM OWNER

| ID | Question | Recommended answer |
|----|----------|-------------------|
| OD-500-01 | GST recalculate on discounted base, including slab crossing? | YES — guest pays GST on actual price |
| OD-500-02 | In-house row click → open Bill directly, or keep detail stub? | Option A: direct Bill for in-house |
| OD-500-03 | Discount controls to RIGHT panel at checkout | LOCKED — already decided |

---

## IMPACT (if OD-500-01 + OD-500-02 confirmed)

| File | Change | Risk |
|------|--------|------|
| `CheckInPage.jsx` | Fix effectiveBalanceDue + GST strip to use discounted base | CRITICAL |
| `CheckInPage.jsx` | Fix Collect Now max | HIGH |
| `pmsService.js` | Store row.discountAmount from folio enrich | LOW |
| `GuestTable.jsx` | RowExpansionStub: show check-in discount line | LOW |
| `FrontDeskWorkstationPage.jsx` | `toggleRow` → for inhouse tab: `openExpansion(id, 'bill')` | MEDIUM |
| `FolioCheckoutPanel.jsx` | Move discount controls to right panel (OD-500-03) | CRITICAL |

---

## Artifacts
- Investigation: `investigations/INV-500-DESIGN-GST-SLAB-ROW-CLICK.md`
- Awaiting owner OD-500-01, OD-500-02 answers before Gate 2
