# INV-501 — INVESTIGATION: Login Page + In-House RowExpansionStub

**Date:** 2026-10-06
**Reporter:** Owner
**Role:** INVESTIGATION (no code edits)
**Scope:** LoginPage.jsx · GuestTable.jsx (RowExpansionStub) · pmsService.js (folio enrich)
**Supplementary:** INV-500 OD answers: OD-500-01 slabs={0-7500:5%, >7500:18%} · OD-500-02=(B) keep stub but show correct values · OD-500-03=yes (right panel) but move slower

---

## FINDING A — Login Page

### Visual state (screenshot): CORRECT layout
Logo · Email · Password · Remember Me · Forgot Password · LOG IN — all render correctly.

### Code trace: `LoginPage.jsx`

| # | Finding | Line | Severity |
|---|---------|------|---------|
| A1 | Copyright year **hardcoded "2025"** — should be current year or "2026" | L271 | MINOR |
| A2 | FCM token failure is caught and continues login — flow is correct | L52-79 | OK |
| A3 | Login navigates to `/loading` on success → loads profile → navigates to dashboard | L87-91 | OK |
| A4 | `handleForgotPassword` shows toast "Please contact your administrator" | L105-110 | NOTE (acceptable) |

### A1 Detail — hardcoded year

**Current (L271):**
```jsx
© Mygenie 2025. HOSIGENIE HOSPITALITY SERVICES PRIVATE LIMITED. All Rights Reserved.
```

**Fix:** Either `new Date().getFullYear()` or hardcode `2026`.

**Impact:** 1 line, 1 file, cosmetic.

---

## FINDING B — In-House RowExpansionStub (GuestTable.jsx L156-175)

### What the stub currently shows vs what it should

The stub uses only `row.charge.*` (from LR — Local Reservations API). LR has **no knowledge of check-in discounts**. The folio enrich in `pmsService.getInHouseGuests` already fetches the folio but stores very little on `row`.

| Field shown | Current source | Value for #000326 | Correct source | Correct value |
|-------------|---------------|-------------------|---------------|---------------|
| Booking (incl. GST) | `row.charge.total_with_gst` | ₹10,620 (full) | Keep as-is (booking total) | ₹10,620 ✓ (label should be "Booking amount" not "Booking incl. GST") |
| **Check-in discount** | **NOT SHOWN** | — | `row.discountAmount` (NEW) | −₹5,325 |
| SGST | `row.charge.sgst` | ₹167.5 (9% of ₹6,700 — WRONG) | Computed on discounted price | ₹112.50 (5% of ₹4,500 / 2) |
| CGST | `row.charge.cgst` | ₹167.5 (WRONG) | Computed on discounted price | ₹112.50 |
| Paid so far | `row.charge.advance_payment` | ₹1,375 (booking only) | `row.paidSoFar` (NEW from folio) | Full advance incl. check-in collect-now |
| **Balance due** | `row.charge.balance_due` | ₹5,660 (WRONG — stale, ignores discount) | `row.balance` (ALREADY computed in pmsService L155) | Correct (includes F&B + room) |

### Root causes

**B1 — balance_due is wrong in stub**

`RowExpansionStub` L171: `{fmtINR(row.charge?.balance_due)}`

But `row.balance` (computed by `pmsService.getInHouseGuests` Step 3, L155) is already the **correct folio-based balance**. It's used by the **Balance column** (via `joinRowBalances` → `balanceOf`). The stub uses the wrong source.

**Fix:** Replace `row.charge?.balance_due` with `row.balance` in the stub.

---

**B2 — check-in discount never stored on row**

`pmsService.getInHouseGuests` Step 3 (L100-155) fetches folio and stores only:
```javascript
row.transferredFnbBalance = ...
row.roomOrdersBalance     = ...
row.balance               = ...   // ✓ already correct
```

Missing:
```javascript
row.discountAmount = Number(ri.room_discount_amount ?? 0);   // NOT stored
row.paidSoFar      = Number(ri.advance_payment ?? 0);        // NOT stored (folio advance, includes check-in collect-now)
row.roomPrice      = Number(ri.room_price ?? 0);             // NOT stored
```

`ri` is `raw.room_info` — these fields ARE available from the folio response (confirmed by probes: order 1232976 has `room_discount_amount: "5325.00"` and `advance_payment: "1375.00"`).

**Fix:** In pmsService Step 3, add 3 lines to store these fields.

---

**B3 — SGST/CGST show full-price GST, not discounted**

`row.charge.sgst` and `row.charge.cgst` are from LR — they represent GST on the FULL room price before any discount. After check-in discount, these are wrong.

**Correct GST on discounted price** (using owner's actual slabs):
```
room_price = ₹6,700, discount = ₹5,325 → discounted_base = ₹1,375
₹1,375/night < ₹7,500 → 5% slab
SGST = CGST = ₹1,375 × 2.5% = ₹34.38 each
```

Computing this correctly in pmsService requires `roomGstSlabs` which the function already receives via `roomGstApplicable` but NOT the slabs themselves. However, `getRowBalances` (which calls `getInHouseGuests`) already passes `roomGstApplicable`.

**Simplest approach** (no complex slab computation needed in pmsService):
- Store `row.discountAmount` and `row.roomPrice` on row
- In `RowExpansionStub`: if `row.discountAmount > 0`, show a note "GST recalculated — see Bill" instead of stale GST values
- OR: pass `roomGstSlabs` to `getInHouseGuests` and compute in pmsService

**Recommended approach for RowExpansionStub:**
```
IF row.discountAmount > 0:
  Show: SGST + CGST = "see Bill ↗"  (informational only)
ELSE:
  Show: row.charge.sgst / row.charge.cgst  (same as before — no discount, no change)
```

---

**B4 — "Paid so far" shows booking advance only**

`row.charge.advance_payment` is from LR = advance at booking time only. Does NOT include Collect Now amount from check-in.

The folio's `room_info.advance_payment` = total advance paid including check-in collection.

Example: booking advance ₹1,000 + check-in collect ₹1,000 = folio `advance_payment` = ₹2,000. But LR shows ₹1,000.

**Fix:** Store `row.paidSoFar = Number(ri.advance_payment ?? 0)` in pmsService Step 3.

---

## PROPOSED STUB LAYOUT (after fixes)

```
Booking amount:     ₹6,700          (row.charge.booking_charge — LR, correct)
Check-in discount:  −₹5,325         (row.discountAmount — NEW from folio, shown only if > 0)
SGST:               ₹34.38 (est.)   OR "see Bill" if discount exists   
CGST:               ₹34.38 (est.)   OR "see Bill" if discount exists
Paid so far:        ₹1,375          (row.paidSoFar — NEW from folio ri.advance_payment)
Balance due:        ₹...            (row.balance — ALREADY computed, just use it)
```

---

## EXACT FILES + LINES TO CHANGE

### Change 1 — LoginPage.jsx L271 (copyright year)
**1 line, cosmetic**
```jsx
// Current:
© Mygenie 2025. HOSIGENIE HOSPITALITY SERVICES PRIVATE LIMITED. All Rights Reserved.

// After:
© Mygenie {new Date().getFullYear()}. HOSIGENIE HOSPITALITY SERVICES PRIVATE LIMITED. All Rights Reserved.
```

---

### Change 2 — pmsService.js: store 3 new fields on row (after L155)
**3 lines, additive, LOW risk**

After `row.balance = Math.round(...);`:
```javascript
row.discountAmount = Number(ri.room_discount_amount ?? 0);  // BUG-500: check-in discount ₹
row.paidSoFar      = Number(ri.advance_payment      ?? 0);  // BUG-500: folio total advance (incl. check-in collect)
row.roomPrice      = Number(ri.room_price            ?? 0);  // BUG-500: folio room price
```

`ri` is already in scope (`const ri = raw.room_info ?? {};`). No new imports needed.

---

### Change 3 — GuestTable.jsx RowExpansionStub (L167-171)
**~8 lines changed, MEDIUM risk (display logic)**

**Current:**
```jsx
<span className="text-[#767676]">Booking (incl. GST)</span><span ...>{fmtINR(row.charge?.total_with_gst)}</span>
<span className="text-[#767676]">Paid so far</span><span ...>{fmtINR(row.charge?.advance_payment)}</span>
<span className="text-[#767676]">SGST</span><span ...>{fmtINR(row.charge?.sgst)}</span>
<span className="text-[#767676]">CGST</span><span ...>{fmtINR(row.charge?.cgst)}</span>
<span className="text-[#767676]">Balance due</span><span ...>{fmtINR(row.charge?.balance_due)}</span>
```

**After:**
```jsx
<span className="text-[#767676]">Booking amount</span><span ...>{fmtINR(row.charge?.booking_charge)}</span>
{(row.discountAmount ?? 0) > 0 && <>
  <span className="text-[#767676]">Check-in discount</span>
  <span ... className="text-[#329937]">−{fmtINR(row.discountAmount)}</span>
</>}
<span className="text-[#767676]">SGST</span>
<span ...>{(row.discountAmount ?? 0) > 0 ? '— see Bill' : fmtINR(row.charge?.sgst)}</span>
<span className="text-[#767676]">CGST</span>
<span ...>{(row.discountAmount ?? 0) > 0 ? '— see Bill' : fmtINR(row.charge?.cgst)}</span>
<span className="text-[#767676]">Paid so far</span>
<span ...>{fmtINR(row.paidSoFar ?? row.charge?.advance_payment)}</span>
<span className="text-[#767676]">Balance due</span>
<span ... className="font-semibold">{fmtINR(row.balance ?? row.charge?.balance_due)}</span>
```

Note: fallback to `row.charge.*` if folio enrich hasn't run (graceful degradation — same as before for any failure path).

---

## OD-500-01 IMPACT ON CHECK-IN GST (CheckInPage.jsx)

With actual slabs (5% for <₹7,500, 18% for >₹7,500):

| Room ₹9,000 + discount | Discounted base | GST rate | New GST total |
|------------------------|----------------|----------|---------------|
| 0% discount | ₹9,000 | 18% | ₹1,620 |
| 20% discount | ₹7,200 | **12% → wait**: ₹7,200 < ₹7,500 → 5% | **₹360** (not 12%) |
| 50% discount | ₹4,500 | 5% | ₹450 |

**Actual slabs confirmed:**
```json
[{"min":0,"max":7500,"gst_percent":5},{"min":7500.01,"max":null,"gst_percent":18}]
```

So it's 5% below ₹7,500 and 18% above. My earlier "12%" was wrong.

**Example: room ₹9,000, 22.3% discount → discounted = ₹6,997 → crosses 7500 boundary → GST drops 18%→5%**

The CheckInPage.jsx GST strip (`gstBase = form.orderAmount`) doesn't recalculate when discount is entered. This is a separate bug for BUG-500/501 planning.

---

## SUMMARY — SCOPE FOR IMPLEMENTATION

| # | File | Change | Lines | Risk |
|---|------|--------|-------|------|
| C1 | `LoginPage.jsx` | Copyright year dynamic | 1 | LOW |
| C2 | `pmsService.js` | Store discountAmount + paidSoFar + roomPrice on row | 3 | LOW |
| C3 | `GuestTable.jsx` | RowExpansionStub: show discount, correct balance, correct paid | ~8 | MEDIUM |

**Total: 12 lines across 3 files. No new imports. No API changes.**

Both C2 + C3 use **graceful fallback** — if folio enrich hasn't run (step 3 failure), values fall back to `row.charge.*` (same as current behavior).

---

## NOT IN SCOPE (separate planning needed)

- CheckInPage.jsx GST strip recalculation on discount → BUG-500 Gate 2+3
- FolioCheckoutPanel right-panel restructure → OD-500-03 (deferred per owner)
- BUG-496/497 check-in maxPct formula → GATE_3_PLAN_COMPLETE, awaiting Gate 4

---

**Artifacts:** `investigations/INV-501-LOGIN-INHOUSE-STUB.md`
**Next:** Owner confirms C1+C2+C3 scope → Gate 4 GO for implementation
