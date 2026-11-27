# INV — Check-In GST + Discount Investigation
# Date: 2026-10-08  |  Steps: 8/10  |  Role: INVESTIGATION

---

## 1. Summary

| Issue | Root Cause | Confidence | Classification |
|---|---|---|---|
| **A: `gst_tax=0` sent at check-in despite discount** | `buildCheckInFormData()` hardcodes `gst_tax='0'`. `displayGstTotal` from CheckInForm is never passed. | HIGH | FE_BUG |
| **B: Expanded row missing discount + new GST** | `RowExpansionStub` reads only `row.charge.*` (booking snapshot). No `room_info` or post-discount fields rendered. | HIGH | FE_BUG (display only) |

---

## 2. Issue A — `gst_tax` Not Sent at Check-In Time

### Call chain
```
CheckInForm.jsx (front-desk-v2 expansions)
  ↓ imports checkIn from frontDeskService.js
  ↓ confirm() L127 → checkIn({ ..., gstTax not passed ... })
                                        ↑
  frontDeskService.buildCheckInFormData(p)
    L104: fd.append('gst_tax', '0');   ← HARDCODED
```

### Code at break point

**frontDeskService.js L70 (comment explains intent):**
```js
// Money: room_price/order_amount/gst_tax/balance_payment = 0 →
//   the server prices from the reservation charge (BQ-385-08/09)
```

**frontDeskService.js L104 (the gap):**
```js
fd.append('gst_tax', '0');   // always '0' — even when roomDiscount > 0
```

**CheckInForm.jsx confirm() L127-141 (what's passed):**
```js
const res = await checkIn({
    bookingType: ..., bookingId: ..., ...,
    collectNow: collectAmt,           // ← collect field mapped to advance_payment in builder
    // roomDiscount: roomDiscountRs,   ← passed (BUG-489)
    // gstTax: displayGstTotal         ← NEVER PASSED
});
```

**What's already computed in CheckInForm.jsx (correct value available):**
```js
// L103-113: useMemo correctly computes post-discount GST using BUG-511 formula
const { gstTotal: displayGstTotal, ... } = useMemo(() => {
    const computeBase = extraRoom < gstOnAdvFloor ? gstBase - gstOnAdvFloor : gstBase; // BUG-511
    return { ...computeRoomGst(roomGstApplicable, roomGstSlabs, computeBase, formNights, 1) };
}, [...]);
// displayGstTotal = ₹35 (correct post-discount GST for the example booking)
```

### Contrast with CheckInPage.jsx (correct implementation)

**CheckInPage.jsx L315-322 (works correctly):**
```js
const gstBase = Math.max(0, Number(form.orderAmount) - roomDiscountRs); // BUG-496
const { gstTotal: gstTax } = computeRoomGst(roomGstApplicable, roomGstSlabs, gstBase, formNights, 1);
...
await pmsCheckIn({ ..., gstTax, ... });  // ← gstTax passed correctly
```

### API doc evidence (owner-provided capture)

**What was sent:**
```
gst_tax = 0   (wrong)
room_discount = 5965
```

**What was stored by backend:**
```json
"gst_tax": 335   // backend used rack GST from charge snapshot
"balance_payment": 35
```

**What FE should send (per API doc "FE should-send" table):**
```
gst_tax = 35   (post-discount GST from the green box displayGstTotal)
```

### Backend contract (from API doc)
> BE (after additive deploy): Online/Direct: if `room_discount > 0` AND request `gst_tax > 0`,
> backend stores FE `gst_tax` instead of charge rack GST.

**Current state:** FE sends `gst_tax=0` → backend always uses rack GST (335) → wrong GST stored.

### Fix direction (FE side)
In `CheckInForm.jsx confirm()`, add `gstTax: displayGstTotal` to the checkIn call.
In `buildCheckInFormData(p)`, replace hardcoded `'0'` with conditional:
```js
fd.append('gst_tax', String(to2(p.gstTax ?? 0)));
// Same pattern as pmsService.pmsCheckIn L285
```

**Note:** BE deploy also required for the new `gst_tax` to be stored. FE fix alone won't change stored value until BE ships the conditional.

### `collectNow` mapping (correct — no gap here)
`frontDeskService.js L100`: `fd.append('advance_payment', String(to2(p.collectNow)))`.
The collect-now amount goes to `advance_payment` (D17 fixed: server merges booking carry). This is intentional and correct — `collectNow` IS being forwarded.

---

## 3. Issue B — Expanded Row Missing Discount + Post-Discount GST

### Component rendering chain
```
ArrivalsPanel.jsx → GuestTable.jsx → RowExpansionStub (default expandedKind)
```

**RowExpansionStub (GuestTable.jsx L156-186):**
```jsx
const c = row.charge ?? {};
// Renders:
// Booking (incl. GST) → c.total_with_gst     (rack rate booking snapshot)
// Paid so far         → c.advance_payment     (booking carry)
// SGST                → c.sgst                (rack GST split)
// CGST                → c.cgst                (rack GST split)
// Balance due         → c.balance_due         (rack balance)
```

**`row.charge` source — pmsService.js L68:**
```js
row.charge = match.res.charge ?? null;  // from local-reservations → res.charge (booking snapshot)
```

### What `row.charge` contains
The `charge` object is populated from the `local-reservations` API (`res.charge`). This is the **booking-time snapshot** — fixed at reservation creation:
```json
{
  "rate_per_night": 6700,
  "booking_charge": 6700,
  "sgst": 167.5,         ← rack GST
  "cgst": 167.5,         ← rack GST
  "total_with_gst": 7035,
  "advance_payment": 700,
  "balance_due": 6335
}
```

### What's missing from `row.charge`
- `room_discount_amount` — not in charge snapshot (charge is pre-discount)
- `room_discount_type` / `room_discount_value` — not in charge
- Post-discount GST (₹35) — not in charge
- Post-discount total (₹735) — not in charge

### Where the post-discount data lives
After check-in, the order's `room_info` contains updated data:
```json
{
  "room_discount_amount": 5965,
  "room_discount_type": "Amount",
  "gst_tax": 335,         ← currently rack GST (because gst_tax=0 was sent)
  "balance_payment": 35
}
```

**But `RowExpansionStub` never reads `room_info`** — it only reads `row.charge`.

### Scope of the display gap
| What's visible in expanded row | What's missing |
|---|---|
| Rack booking charge, SGST, CGST (from `charge.*`) | Room discount applied at check-in |
| Advance payment (carry) | Post-discount GST |
| Rack balance due | Post-discount total incl. GST |

### Why `row.charge` doesn't update after check-in
`getArrivals()` / local-reservations API returns `res.charge` which is a booking-level field (not order-level). It's calculated at reservation creation. After check-in, the reservation's `charge` object is not updated to reflect the discount — the discount data lives on the order (`room_info`).

### Fix direction
`RowExpansionStub` needs to conditionally render post-discount data if available. Two approaches:
- **Option A**: Enrich `row` with `room_info.room_discount_amount` + `room_info.gst_tax` during the local-reservations data transform (similar to `getInHouseGuests` Step 2 enrichment)
- **Option B**: Add a conditional display block in `RowExpansionStub` — if `row.roomDiscountAmount > 0`, show a "Discount applied" row with the discounted total

Both options require the `room_discount_amount` field to be present in the `local-reservations` API response's `rooms[]` array (or fetched from the order).

**Note:** Issue B is partly blocked by Issue A. Even if the UI is fixed to show the discount, the stored `gst_tax=335` (rack) makes the "post-discount GST" field misleading until Issue A is also fixed.

---

## 4. Data Flow Trace (Issue A)

```
User: enters discount ₹5,965 → displayGstTotal = ₹35 (BUG-511 formula, correct)
  │
  └─ confirm() in CheckInForm.jsx:
       checkIn({
           roomDiscount: 5965,     ✅ sent
           collectNow:   0,        ✅ (no collect at max, BUG-513 fixed)
           // gstTax:    MISSING    ❌
       })
  │
  └─ buildCheckInFormData():
       fd.append('gst_tax', '0')  ← L104 hardcoded
  │
  └─ POST user-group-check-in:
       gst_tax = 0  (wrong)
  │
  └─ Backend: gst_tax=0 so uses charge.sgst+cgst = 335 (rack)
       Stores: gst_tax=335, balance_payment=35
```

---

## 5. Planning Skip Eligibility

| Issue | Lines | Files | Hotspot? | Financial? | Skip eligible? |
|---|---|---|---|---|---|
| A: gst_tax=0 | ~2 | 1 (frontDeskService.js) + 1 (CheckInForm.jsx) | NO | YES (R6 tax) | NO — financial, 2 files |
| B: expanded row display | ~10-15 | GuestTable.jsx | NO | NO | Owner decides — display only |

**Recommendation: full Gate 2-3 cycle for Issue A. Issue B can be planned separately post-Issue A.**

---

## 6. Evidence Artifacts

| File | Location |
|---|---|
| `frontDeskService.js` | `src/api/services/frontDeskService.js` L70, L104 |
| `CheckInForm.jsx` | `src/components/pms/frontdesk/CheckInForm.jsx` L103-113, L127-141 |
| `GuestTable.jsx` | `src/components/pms/frontdesk/GuestTable.jsx` L156-186 |
| `pmsService.js` | `src/api/services/pmsService.js` L283-285 (correct pattern) |
| `CheckInPage.jsx` | `src/pages/pms/CheckInPage.jsx` L313-322 (correct pattern) |
| API doc capture | `user grp.md` (owner-provided) |

---

## 7. Retroactive Candidates

None — no registry status drift found.
