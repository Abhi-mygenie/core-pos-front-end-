# INVESTIGATION REPORT — In-House Expanded Row Wrong Values
# Date: 2026-10-08 | Steps: 8/10 | Role: INVESTIGATION

**Booking:** sunandmoon · MG-69-7162A8C2-83D5-4022-9681-200F5E78A3D5
**URL:** /pms/front-desk-v2?tab=inhouse

---

## 1. Summary

| Issue | Root Cause | Confidence | Classification |
|---|---|---|---|
| **A: Row balance column ₹650 vs expected ₹625** | `pmsService.js L112` — `chargeGst` uses rack GST (150) from booking snapshot instead of `ri.gst_tax` (125, post-discount) | HIGH | FE_BUG |
| **B: Expanded row — Booking/SGST/CGST/Balance all show rack values** | `GuestTable.jsx L167-171` — `RowExpansionStub` reads exclusively from `row.charge.*` (booking-time snapshot). Backend does NOT update `total_with_gst`, `sgst`, `cgst`, `balance_due` in `charge` when a check-in discount is applied. | HIGH | FE_BUG |

---

## 2. Owner's Expected Values

```
Booking data:
  bc (room_price) = 3000
  room_discount   =  500
  booking advance = 1000  (paid at booking)
  check-in collect= 1000  (paid at check-in)
  total paid      = 2000

Correct calculations:
  effective_room  = 3000 − 500   = 2500
  GST (5%)        = 2500 × 5%   = 125
  SGST (2.5%)     =              = 62.50
  CGST (2.5%)     =              = 62.50
  total_incl_GST  = 2500 + 125  = 2625
  balance_due     = 2625 − 2000 = 625
```

---

## 3. What the UI Actually Shows

| Field | Shown | Expected | Delta |
|---|---|---|---|
| Row balance (table column) | **₹650** | ₹625 | +₹25 |
| Booking (incl. GST) — expanded | **₹3,150** | ₹2,625 | +₹525 |
| Paid so far — expanded | ₹2,000 | ₹2,000 | ✓ correct |
| SGST — expanded | **₹75** | ₹62.50 | +₹12.50 |
| CGST — expanded | **₹75** | ₹62.50 | +₹12.50 |
| Balance due — expanded | **₹1,150** | ₹625 | +₹525 |

**Observation:** All wrong values are the **rack rate** equivalents (no discount applied). Only "Paid so far" is correct.

---

## 4. Data Flow Trace

### Source of `row.charge.*` (booking snapshot)

```
pmsService.getInHouseGuests() Step 2  [pmsService.js L44-75]
  └─ local-reservations API → res.charge (booking-time snapshot)
  └─ row.charge = match.res.charge                        [L68]

  charge object contains (RACK rate, frozen at booking creation):
    charge.total_with_gst = 3150    (3000 + 5%×3000 = 3000+150)
    charge.sgst            = 75     (2.5% × 3000)
    charge.cgst            = 75     (2.5% × 3000)
    charge.advance_payment = 2000   ← BACKEND UPDATES THIS on payment
    charge.balance_due     = 1150   (3150 − 2000)

  KEY FINDING: backend updates charge.advance_payment when payments
  received but does NOT update total_with_gst / sgst / cgst /
  balance_due when a check-in discount is applied.
```

### Source of `ri.*` — folio call (actual post-discount values)

```
pmsService.getInHouseGuests() Step 3  [pmsService.js L80-162]
  └─ API_ENDPOINTS.SINGLE_ORDER_NEW → order.room_info

  room_info (post-discount, actual state):
    ri.room_price          = 3000
    ri.room_discount_amount= 500    ← discount amount — AVAILABLE but NOT stored on row
    ri.gst_tax             = 125    ← post-discount GST (after BUG-514 fix) — NOT stored on row
                         OR= 150    ← rack GST (if checked in before BUG-514 fix)
    ri.balance_payment     = 500    ← room balance WITHOUT GST — used as bp
    ri.advance_payment     = 2000   ← total paid (1000+1000)

  What Step 3 DOES store on row:
    row.balance = roomBalance + F&B          [L157]
    row.transferredFnbBalance                [L155]
    row.roomOrdersBalance                    [L156]

  What Step 3 DOES NOT store on row (data read but discarded):
    ri.room_discount_amount  ← NOT on row
    ri.gst_tax               ← NOT on row
    ri.balance_payment (bp)  ← NOT on row
```

---

## 5. Break Point A — Row Balance (₹650 vs ₹625)

**File:** `pmsService.js L112-114`

```js
const chargeGst = Number(row.charge?.sgst ?? 0) + Number(row.charge?.cgst ?? 0);
//              = 75 + 75 = 150  ← RACK values from booking snapshot ← BREAK POINT
const roomBalance = bp != null
    ? (bp === 0 ? 0 : Math.max(0, bp + chargeGst))
//                              ↑ 500 + 150 = 650  (wrong, should be 500 + 125)
    : Math.max(0, rp + gt - ap - rb - Number(ri.room_discount_amount ?? 0));
```

**`gt = Number(ri.gst_tax ?? 0)` is already read at L106** but only used in the FALLBACK branch (L115: when `bp == null`). In the PRIMARY branch (`bp != null`), `chargeGst` (rack) is used instead of `gt` (post-discount).

**Why it was written this way:** BUG-491 Sub-A comment (L109): "ri.gst_tax is absent from room_info API". At the time of that fix, `gst_tax` was not reliably stored in room_info, so the proxy `chargeGst` (from booking snapshot) was used instead. After BUG-514, `gst_tax` IS now stored correctly in room_info.

**Arithmetic:**
- `chargeGst = 150` (rack), `bp = 500` → `roomBalance = 650` ← shown ✗
- `gt = 125` (post-discount, after BUG-514), `bp = 500` → `roomBalance = 625` ← correct ✓
- `gt = 150` (THIS booking, pre-BUG-514 check-in), `bp = 500` → `roomBalance = 650` ← still wrong

**Important:** For the specific booking in this report (checked in BEFORE BUG-514), `ri.gst_tax` stored by backend = 150 (rack), so fixing the formula to use `gt` instead of `chargeGst` would NOT fix this booking's display (both give 650). However for all future bookings after BUG-514, `ri.gst_tax = 125` → formula fix gives correct 625.

---

## 6. Break Point B — Expanded Row (all rack values)

**File:** `GuestTable.jsx L167-171` — `RowExpansionStub`

```jsx
{fmtINR(row.charge?.total_with_gst)}  // = 3150 (rack) ← should be 2625
{fmtINR(row.charge?.advance_payment)} // = 2000 ← correct (backend updates)
{fmtINR(row.charge?.sgst)}            // = 75 (rack) ← should be 62.50
{fmtINR(row.charge?.cgst)}            // = 75 (rack) ← should be 62.50
{fmtINR(row.charge?.balance_due)}     // = 1150 (rack) ← should be 625
```

All 4 wrong fields come from `row.charge.*`. The `charge` object from `local-reservations` is the **booking-time snapshot** — it is structurally read-only for discount-applied values. The backend only updates `charge.advance_payment` when payments are received.

**Data available but not surfaced to RowExpansionStub:**
The folio call in Step 3 (pmsService.js L80-160) fetches ALL the data needed to compute correct display values:

| Needed field | Available in Step 3 | Stored on row? |
|---|---|---|
| Post-discount room (2500) | `ri.room_price − ri.room_discount_amount = 3000−500 = 2500` | ❌ NO |
| Post-discount GST (125) | `ri.gst_tax = 125` (after BUG-514) | ❌ NO |
| Post-discount total (2625) | computable from above | ❌ NO |
| Total paid (2000) | `charge.advance_payment = 2000` ✓ | ✅ via charge |
| Balance due (625) | `ri.balance_payment + ri.gst_tax = 500+125` | ❌ NO |

**Root cause:** Step 3 computes the correct values for `row.balance` but does NOT enrich `row` with the per-discount display sub-components (`roomDiscountAmount`, `roomGstTax`, `effectiveTotal`, etc.). `RowExpansionStub` therefore has no access to post-discount data and falls back to `row.charge.*` (rack).

---

## 7. Fix Direction

### Gap A — pmsService.js L112

**Option (simple):** Replace `chargeGst` with `gt` (= `ri.gst_tax`) in the `bp` path:
```js
// CURRENT:
const chargeGst = Number(row.charge?.sgst ?? 0) + Number(row.charge?.cgst ?? 0);
const roomBalance = bp != null ? (bp === 0 ? 0 : Math.max(0, bp + chargeGst)) : ...

// FIX: use ri.gst_tax (post-discount) when available, fall back to chargeGst
const roomGst     = gt > 0 ? gt : (Number(row.charge?.sgst ?? 0) + Number(row.charge?.cgst ?? 0));
const roomBalance = bp != null ? (bp === 0 ? 0 : Math.max(0, bp + roomGst)) : ...
```

Scope: 1 file, 2 lines, touches `row.balance` calculation → CRITICAL (R6 financial). Full gate cycle.

### Gap B — pmsService.js Step 3 + GuestTable.jsx RowExpansionStub

**Approach:** In Step 3, enrich `row` with post-discount display values from `room_info`:
```js
// In Step 3, after computing roomBalance:
row.roomDiscountAmount = Number(ri.room_discount_amount ?? 0); // new
row.roomGstTax        = gt;                                     // new — post-discount GST total
row.effectiveRoomBalance = bp;                                  // new — room balance (no GST)
```

Then in `RowExpansionStub`, compute and display post-discount values when `row.roomDiscountAmount > 0`:
```jsx
const hasDiscount = (row.roomDiscountAmount ?? 0) > 0;
const effectiveTotal = hasDiscount ? ... : row.charge?.total_with_gst;
...
```

Scope: 2 files (pmsService.js + GuestTable.jsx), ~15 lines. No hotspot files. MEDIUM risk (display only, no financial formula change in Gap B). Full gate cycle.

---

## 8. Impact on THIS Specific Booking

For `sunandmoon / MG-69-7162A8C2-...` (checked in BEFORE BUG-514 fix):
- `ri.gst_tax` stored by backend = **150** (rack, because FE sent 0 before BUG-514)
- Gap A fix: `gt = 150 → roomGst = 150 → roomBalance = 500 + 150 = 650` — **NO IMPROVEMENT** for this booking
- Gap B fix: would use `ri.gst_tax = 150` to compute SGST/CGST/total → shows 75/75/3150 — **STILL rack values** for this booking

**Conclusion for this booking:** Display will remain wrong until the guest checks out and re-checks in with BUG-514 fix applied. The data stored by the backend for this booking is the rack GST (150) — the FE cannot override what was stored.

**For ALL future bookings** (after BUG-514 fix applied, backend stores gst_tax=125):
- Gap A fix → row balance: 625 ✓
- Gap B fix → expanded row: Booking=2625, SGST=62.50, CGST=62.50, Balance=625 ✓

---

## 9. Recommendations

| Gap | Classification | Files | Lines | Risk | Planning skip? | Recommendation |
|---|---|---|---|---|---|---|
| A (row balance) | FE_BUG | pmsService.js | ~2 | CRITICAL (R6) | NO | Full gate cycle. Owner Gate 4 GO needed. |
| B (expanded row display) | FE_BUG | pmsService.js + GuestTable.jsx | ~15 | MEDIUM (display only) | NO (2 files) | Full gate cycle. Can be planned together with Gap A. |

**Suggest:** Register as one new BUG (BUG-515 or similar) covering both gaps. Gap B depends on Gap A (needs `row.roomGstTax` from the same Step 3 enrichment).

---

## 10. Evidence

| Item | Location |
|---|---|
| pmsService Step 3 balance formula | `pmsService.js L112-114` |
| RowExpansionStub charge.* reads | `GuestTable.jsx L167-171` |
| `gt` vs `chargeGst` divergence | `pmsService.js L106 (gt) vs L112 (chargeGst)` |
| BUG-491 Sub-A comment (original justification) | `pmsService.js L109-110` |
| `charge.advance_payment` updated by backend | LR API + screenshot (shows 2000 ✓) |
| Booking snapshot immutability | Architecture — backend does not update total_with_gst/sgst/cgst on discount |
| Investigation report | `evidence/INV-INHOUSE-DISPLAY-2026-10-08/INVESTIGATION_REPORT.md` |
