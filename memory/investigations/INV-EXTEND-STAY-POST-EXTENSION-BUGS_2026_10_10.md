# INVESTIGATION REPORT — Extend Stay: Two Post-Extension Bugs

**Report ID:** INV-EXTEND-STAY-2026-10-10
**Date:** 2026-10-10
**Role:** INVESTIGATION (Role 6)
**Steps used:** 10 / 10
**Sandbox:** zero mutations — no code edited
**Confidence:** HIGH — all values arithmetically confirmed by live simulation
**Contract doc:** `extend_stay_charge_fe.md` (owner-uploaded, URL: customer-assets)

---

## 1. Context

BUG-533 was implemented 2026-10-10: ExtendStayForm now shows correct "Current bill" pre-confirm (rack crossed out → check-in discount → discounted total → balance). After confirming extension via "Confirm" button, two post-confirm issues were observed and investigated.

---

## 2. Issues Reported

**Issue A (Screenshot 1 — result panel after Confirm):**
- "Stay extended · new check-out 12 Oct" result page shows correct layout BUT **check-in discount line is absent**
- Booking charge ₹13,400 → SGST ₹335 → CGST ₹335 → Total ₹14,070 → Paid ₹2,000 → **Balance ₹11,020**
- Total and Balance are arithmetically inconsistent: ₹14,070 − ₹2,000 = ₹12,070 ≠ ₹11,020
- The ₹1,050 gap (= ₹1,000 discount + ₹50 GST saving) is invisible — no explanation line

**Issue B (Screenshot 2+3 — folio/bill after Done + row refresh):**
- InHouse balance column: **₹11,020** ✓ (correct)
- Folio "Bill · Room r4" shows: SGST ₹2,052 · CGST ₹2,052 · Room balance **₹14,504** ✗
- Gap vs balance column: ₹14,504 − ₹11,020 = ₹3,484

---

## 3. Contract (locked — from owner-supplied doc `extend_stay_charge_fe.md`)

| Field | Semantics |
|---|---|
| `charge.booking_charge` | **RACK** rent (pre-check-in-discount) — always, even after extend |
| `charge.room_discount_amount` | Check-in discount ₹ — NOT enlarged for added nights |
| `charge.sgst / cgst` | Tax on **effective** (post-discount) stay |
| `charge.balance_due` | **Server authority** — already net of check-in discount |

---

## 4. Root Cause A — Missing "Check-in discount" row in result panel

### Break point
`ExtendStayForm.jsx` result panel JSX (lines ~77-82):

```jsx
<span>Booking charge</span><span>{fmtINR(rc?.booking_charge)}</span>   // ₹13,400 rack
<span>SGST</span><span>{fmtINR(rc?.sgst)}</span>                       // ₹335
<span>CGST</span><span>{fmtINR(rc?.cgst)}</span>                       // ₹335
<span>Total (incl. GST)</span><span>{fmtINR(rc?.total_with_gst)}</span> // ₹14,070 rack total
<span>Paid so far</span><span>{fmtINR(rc?.advance_payment)}</span>      // ₹2,000
<span>Balance due</span><span>{fmtINR(rc?.balance_due)}</span>          // ₹11,020 ← correct
// ↑ NO "Check-in discount" row exists in this template
```

### Why `rc.total_with_gst = ₹14,070` but `rc.balance_due = ₹11,020`
Per contract: backend returns `total_with_gst` as **rack total** (no discount applied to this field) but computes `balance_due` as **net after discount** (server authority). The ₹1,050 gap is handled server-side only in `balance_due`.

### FE gap
The result panel has no row to display the check-in discount. `row.roomDiscountAmount = ₹1,000` IS available from `enrichedRow` (BUG-533 already hoists it via InHousePanel/DeparturesPanel). A single JSX row between "Booking charge" and "SGST" resolves the display.

**Important:** `rc.balance_due` must be used as-is — do NOT further subtract `room_discount_amount` from it (already net per contract).

### Classification
`FE_DISPLAY_GAP` — 1 JSX row missing · `ExtendStayForm.jsx` (NOT R5) · `row.roomDiscountAmount` available · ~2 lines

---

## 5. Root Cause B — Folio ₹14,504: Two Compounding Bugs

### Data values confirmed from screenshots

| Variable | Value | How confirmed |
|---|---|---|
| `row.charge.booking_charge` (`bc`) | ₹12,400 | Screenshot 3 "Booking amount ₹12,400" |
| `order.roomInfo.discountAmount` (`discountAmt`) | ₹1,000 | Screenshot 3 "Check-in discount −₹1,000" |
| `row.charge.nights` | 2 | Screenshot 3 "2 nights · avg. rate/night ₹6,200" |
| `order.roomInfo.balancePayment` (`bp`) | ₹10,400 | Back-calculated: ₹14,504 − ₹4,104 = ₹10,400 |
| `displaySgst / displayCgst` | ₹2,052 | Screenshot 3 |
| `baseBalance` (Room balance) | ₹14,504 | Screenshot 3 |

### Pre-fix: LR snapshot has discounted `booking_charge` (₹12,400)

The backend (pre-BE-fix) is writing the **discounted** amount into `charge.booking_charge` after extension (₹13,400 − ₹1,000 = ₹12,400), violating the contract. The FE fix must deploy **with** the backend fix.

### Bug B2 — `* nights` multiplier (`FolioCheckoutPanel.jsx:L248`)

```js
const discountedPrice = Math.max(0, bc - discountAmt);
// After BE fix: bc=₹13,400 (rack), discountAmt=₹1,000 → discountedPrice=₹12,400 ✓

const gst = computeRoomGst(applicable, slabs, discountedPrice * nights, nights, 1);
//                                              ↑ BUG: discountedPrice is TOTAL (all nights)
//                                                     multiplying by nights again double-counts
```

`computeRoomGst` divides `totalAmount` by `nights` to derive `nightlyUnit`:
```
nightlyUnit = (discountedPrice × nights) / nights = discountedPrice
```
For 2 nights: `nightlyUnit = ₹12,400` (wrong — should be ₹6,200).
This triggers the 18% slab (> ₹7,500 threshold) instead of 5%.

**Fix:** `discountedPrice` instead of `discountedPrice * nights`.

### Bug B2b — `gstRate` denominator (`FolioCheckoutPanel.jsx:L253`)

```js
const gstRate = gst.gstTotal / (discountedPrice * nights);
// After fix: gst.gstTotal/discountedPrice
```

Affects `maxCheckoutDiscount` — the cap on any additional room discount the cashier can apply at checkout. Wrong rate halves the effective rate for 2-night bookings.

### Simulation results (programmatically verified)

```
bp = ₹10,400 (order.roomInfo.balancePayment)

STATE 1 — CURRENT (LR has discounted bc=₹12,400, * nights bug present):
  discountedPrice = ₹12,400 − ₹1,000 = ₹11,400   ← double discount
  computeRoomGst(₹11,400 × 2 = ₹22,800, nights=2)
    nightlyUnit = ₹11,400  →  18% slab
    gstTotal = ₹4,104  →  sgst = cgst = ₹2,052
  base = ₹10,400 + ₹4,104 = ₹14,504             ← matches screenshot ✓

STATE 2 — BE FIX ONLY (bc=₹13,400 rack, * nights bug still present):
  discountedPrice = ₹13,400 − ₹1,000 = ₹12,400   ← single discount ✓
  computeRoomGst(₹12,400 × 2 = ₹24,800, nights=2)
    nightlyUnit = ₹12,400  →  18% slab           ← STILL wrong slab
    gstTotal = ₹4,464  →  sgst = cgst = ₹2,232
  base = ₹10,400 + ₹4,464 = ₹14,864             ← different wrong value

STATE 3 — BOTH FIXES (BE rack + * nights removed):
  discountedPrice = ₹12,400
  computeRoomGst(₹12,400, nights=2)              ← no * nights
    nightlyUnit = ₹6,200  →  5% slab             ← correct ✓
    gstTotal = ₹620  →  sgst = cgst = ₹310
  base = ₹10,400 + ₹620 = ₹11,020               ← correct ✓
```

**CRITICAL:** BE fix alone → ₹14,864 (still wrong). FE fix alone → ~₹10,970 (slightly wrong, double-discount still present). **Both must co-deploy.**

### Why balance column (₹11,020) is correct

pmsService uses `room_info.room_price` (RACK, ₹13,400) — never reads `charge.booking_charge`:
```js
rp = ri.room_price = ₹13,400          // rack, from room_info
discountRs = ri.room_discount_amount = ₹1,000
effectiveRoom = ₹13,400 − ₹1,000 = ₹12,400  // single discount ✓
computeRoomGst(slabs, ₹12,400, nights=2)
  nightlyUnit = ₹6,200  →  5%  →  gstTotal = ₹620 ✓
roomBalance = ₹10,400 + ₹620 = ₹11,020 ✓
```

---

## 6. Fixes Required

| ID | Fix | File | Lines | R5? | Deploy dependency |
|---|---|---|---|---|---|
| **BUG-534** | Add "Check-in discount" row to result panel | `ExtendStayForm.jsx` | +2 lines | NO | None — independent |
| **BUG-535** | `discountedPrice * nights` → `discountedPrice` (L248 + L253) | `FolioCheckoutPanel.jsx` | 2 lines | NO | **Must co-deploy with BE fix** |
| **BE brief** | LR `charge.booking_charge` = rack (per contract). Fix in `AiosellReservationChargeService.php` + `AiosellLocalReservationService.php` | Backend | — | — | Must co-deploy with BUG-535 |

---

## 7. Evidence Artifacts

| Artifact | Location |
|---|---|
| Contract doc | `extend_stay_charge_fe.md` (owner-uploaded 2026-10-10) |
| Screenshots (3) | Owner-provided 2026-10-10 — stored in this report |
| Simulation node script | Run inline, results in §5 |
| FolioCheckoutPanel formula | `FolioCheckoutPanel.jsx:L238-262` |
| pmsService balance path | `pmsService.js:L105-122` |
| computeRoomGst | `src/utils/roomGstCalculator.js:L19-45` |

---

## 8. Handover

```
"Root causes: (A) ExtendStayForm result panel has no 'Check-in discount' row —
rc.balance_due is correct (₹11,020), rc.total_with_gst is rack (₹14,070);
FE needs 1 display row using row.roomDiscountAmount. (B) FolioCheckoutPanel L248:
discountedPrice * nights double-counts nights in computeRoomGst call → nightlyUnit
= ₹12,400 (wrong) instead of ₹6,200 (correct) → 18% slab instead of 5% → gstTotal
₹4,464 instead of ₹620 → base ₹14,504/₹14,864 instead of ₹11,020. Fix L248 + L253.
BE must co-deploy rack booking_charge to LR snapshot. FE fix alone insufficient.
Confidence: HIGH. Steps: 10/10. FE fix: BUG-534 (2 lines, independent) +
BUG-535 (2 lines, co-deploy BE). Register BUG-534 and BUG-535."
```
