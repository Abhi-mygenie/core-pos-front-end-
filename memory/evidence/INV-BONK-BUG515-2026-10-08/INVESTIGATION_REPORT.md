# INVESTIGATION REPORT — In-House Row Balance + Display (bonk booking)
# Date: 2026-10-08 | Booking: MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D
# Steps: 9/10 | Role: INVESTIGATION

---

## 1. Summary

| Issue | Root Cause | Confidence | Classification |
|---|---|---|---|
| **Row balance ₹650 (should be ₹600)** | `pmsService.js L112` — `chargeGst` uses RACK GST (150) from LR charge snapshot. `ri.gst_tax` is **completely absent** from backend `room_info` response — backend does not store/return it. FE must compute post-discount GST from `ri.room_price`, `ri.room_discount_amount` and GST slabs. | HIGH | FE_BUG (BE data confirmed — FE-fixable) |
| **Expanded row shows ₹3,150 / ₹75 / ₹75 / ₹1,650 (all rack)** | `RowExpansionStub` reads `row.charge.*` (booking snapshot — rack). Backend does not update `charge.total_with_gst`, `charge.sgst`, `charge.cgst`, `charge.balance_due` for discounts. Discount data IS in `room_info` but not propagated to `row`. | HIGH | FE_BUG (FE-fixable) |

**User hypothesis about backend — CONFIRMED + CLARIFIED:**
The backend stores TWO separate data structures. The LR `charge` snapshot keeps rack values (only `advance_payment` is updated). The `room_info` in the order has the discount — but critically, **`gst_tax` is completely absent** from `room_info` (not in response keys at all). The FE can still fix everything using available `room_info` fields — no backend changes needed.

---

## 2. Owner's Expected Values

```
bc (room_price)     = 3000
room_discount       = 1000    (applied at check-in)
booking advance     = 1000    (paid at booking)
check-in collect    =  500    (paid at check-in)
total paid          = 1500

effective_room      = 3000 - 1000 = 2000
GST (5% of 2000)    = 100  →  SGST = 50, CGST = 50
total_incl_GST      = 2000 + 100 = 2100
balance_due         = 2100 - 1500 = 600
```

---

## 3. Live API Probes (Steps 4-7)

### Probe 1 — LR `charge` object (booking snapshot)

```
GET /api/v2/vendoremployee/aiosell/local-reservations
Booking: MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D

charge.rate_per_night:  3000   (rack)
charge.nights:          1      ← available!
charge.booking_charge:  3000   (rack)
charge.sgst:            75     (rack, 2.5% × 3000)
charge.cgst:            75     (rack)
charge.total_with_gst:  3150   (rack, 3000+150)
charge.advance_payment: 1500   ← CORRECT (backend updates payments)
charge.balance_due:     1650   (rack: 3150-1500)

rooms[0].room_discount_amount: None   ← discount NOT in LR rooms
rooms[0].gst_tax:              [not in keys]
rooms[0].order_id:             1233012
```

**Finding:** LR charge is a booking-time snapshot. Backend updates `advance_payment` for payments but NEVER updates `sgst`, `cgst`, `total_with_gst`, `balance_due` for check-in discounts.

### Probe 2 — Order `room_info` (folio API)

```
POST /api/v2/vendoremployee/get-single-order-new
{ order_id: 1233012 }

room_info.room_price:          3000.00   (rack — not adjusted for discount)
room_info.gst_tax:             [KEY ABSENT — not in response at all]
room_info.advance_payment:     1500.00   (correct)
room_info.balance_payment:     500.00    (room balance without GST: 2000-1500=500)
room_info.receive_balance:     None
room_info.room_discount_amount: 1000.00  ← CORRECT discount stored
room_info.room_discount_type:  Amount
room_info.room_discount_value: None
room_info.room_discount_at:    check_in
room_info.room_discount_detail: {check_in: {type:'Amount',value:'1000',amount:1000}}

room_info ALL keys: ['room_price','advance_payment','balance_payment',
  'room_discount_amount','room_discount_type','room_discount_reason',
  'room_discount_at','room_discount_detail']
```

**CRITICAL FINDING: `gst_tax` is completely absent from `room_info` keys.** The backend does not store or return `gst_tax` in `room_info`, even though `room_discount_amount` is stored correctly. BUG-491 Sub-A comment (pmsService.js L109) documented this known limitation.

---

## 4. User's Hypothesis — Verified

The user was correct: **backend stores two types of data**:

| Data source | What it contains | Updated on discount? | Updated on payment? |
|---|---|---|---|
| LR `charge` (booking snapshot) | Rack values (3150/75/75/1650) | ❌ NO | ✅ YES (`advance_payment`) |
| Order `room_info` (check-in data) | `room_price=3000`, `room_discount_amount=1000`, `balance_payment=500` | ✅ YES (discount stored) | ✅ YES (`advance_payment`) |

But: `room_info` is missing `gst_tax` entirely. Even BUG-514 (which sends `gst_tax=100` to the API) doesn't cause the backend to return it in `room_info`.

---

## 5. Data Flow — Where Balance ₹650 Comes From

```
pmsService.getInHouseGuests() Step 3 [L104-157]:

  ri = order.room_info
  rp = ri.room_price      = 3000
  gt = ri.gst_tax ?? 0    = 0    ← ABSENT → defaults to 0
  ap = ri.advance_payment = 1500
  bp = ri.balance_payment = 500   ← room balance (no GST): 2000-1500=500

  chargeGst = row.charge.sgst + row.charge.cgst  [L112]
            = 75 + 75 = 150   ← RACK values from booking snapshot

  roomBalance = bp + chargeGst   [L114]   ← bp path (bp not null)
              = 500 + 150 = 650  ← WRONG (should be 500 + 100 = 600)

  row.balance = 650  →  shown in table column
```

**Break point:** L112-114. `chargeGst = 150` (rack) used instead of `effectiveGst = 100` (post-discount). Since `ri.gst_tax` is absent, `gt = 0` and can't be used. FE must compute from `ri.room_price - ri.room_discount_amount`.

---

## 6. Data Flow — Where Expanded Row Gets Rack Values

```
RowExpansionStub [GuestTable.jsx L167-171]:
  Booking (incl. GST) → row.charge.total_with_gst = 3150  ← rack
  Paid so far         → row.charge.advance_payment = 1500 ✓ correct
  SGST                → row.charge.sgst = 75               ← rack
  CGST                → row.charge.cgst = 75               ← rack
  Balance due         → row.charge.balance_due = 1650      ← rack: 3150-1500

Discount data IS available in room_info (ri.room_discount_amount=1000,
ri.balance_payment=500) but is NOT stored on row during Step 3.
RowExpansionStub has no way to know about the discount.
```

---

## 7. Key Insight — FE-Only Fix, No Backend Changes Needed

Even though `ri.gst_tax` is absent, the FE has everything it needs to compute correct GST:

```
AVAILABLE in room_info:
  ri.room_price          = 3000  ✓
  ri.room_discount_amount = 1000 ✓
  → effectiveRoom = 3000 - 1000 = 2000

AVAILABLE on row.charge:
  charge.nights = 1              ✓

AVAILABLE as parameter to getInHouseGuests():
  roomGstApplicable              ✓
  (roomGstSlabs via restaurant)  ← need to pass slabs too — or derive from chargeGst rate

FE can compute:
  effectiveGst = computeRoomGst(slabs, effectiveRoom, nights) = 100
  roomBalance  = bp + effectiveGst = 500 + 100 = 600  ✓
```

Additionally, for the expanded row, FE can compute post-discount display values:
```
effectiveSgst   = effectiveGst / 2 = 50
effectiveCgst   = effectiveGst / 2 = 50
effectiveTotal  = effectiveRoom + effectiveGst = 2100
effectiveDue    = effectiveTotal - charge.advance_payment = 2100 - 1500 = 600
```

---

## 8. Fix Scope

| Fix | File | Lines | Change | Risk |
|---|---|---|---|---|
| **Gap A (balance)** | `pmsService.js` | ~5 | Import `computeRoomGst`; compute `effectiveGst` from `ri.room_price - ri.room_discount_amount`; use in `bp` path | CRITICAL (R6, financial balance) |
| **Gap B (expanded row)** | `pmsService.js` + `GuestTable.jsx` | ~15 | Enrich `row` with `roomDiscountAmount`, `effectiveGst`, `effectiveSgst/Cgst`; RowExpansionStub uses these when discount > 0 | MEDIUM (display only) |

**`roomGstSlabs` availability:** `getInHouseGuests()` already receives `roomGstApplicable` but NOT `roomGstSlabs`. Two options:
- (a) Pass `roomGstSlabs` as parameter alongside `roomGstApplicable` — cleaner
- (b) Derive GST rate from `chargeGst / (charge.booking_charge / charge.nights)` — avoids new parameter

Option (a) preferred. `getRowBalances()` in frontDeskService.js would need to forward the slabs.

**No backend changes needed** — all required data is present in room_info (`room_price`, `room_discount_amount`, `balance_payment`) and LR charge (`nights`, `advance_payment`).

---

## 9. Recommendations

```
Root cause: HIGH confidence (live API probed, code traced, arithmetic verified)
FE fix: YES — no backend changes needed
Planning skip: NO — Gap A is R6 financial, Gap B is 2 files
Retroactive candidates: NONE

Recommendation: Register as BUG-515, full gate cycle
  Gap A (balance): CRITICAL/R6 — pmsService.js only
  Gap B (display): MEDIUM — pmsService.js + GuestTable.jsx
  Both gaps share the same Step 3 enrichment edit → 1 intake

Handover to PLANNING (Gates 2-3)
"Investigation complete: pmsService.js L112 uses rack chargeGst=150
 instead of computed effectiveGst=100. FE-only fix from ri.room_price +
 ri.room_discount_amount + charge.nights + roomGstSlabs.
 No backend fix needed. Full gate cycle for R6 classification."
```

---

## 10. Evidence

| Artifact | Path |
|---|---|
| LR charge + rooms full probe | `evidence/INV-BONK-BUG515-2026-10-08/lr_full.txt` |
| room_info parsed | `evidence/INV-BONK-BUG515-2026-10-08/folio_parsed.txt` |
