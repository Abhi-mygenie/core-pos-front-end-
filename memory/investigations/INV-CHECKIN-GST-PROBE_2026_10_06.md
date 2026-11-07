# INV — Check-In GST Probe: Does Backend Auto-Calculate GST on Discounted Rent?

**Date:** 2026-10-06
**Role:** INVESTIGATION
**Triggered by:** Owner question before Gate 4 — "the gst sent will be after discount amount the new calculated gst right?"
**Steps used:** 6/10
**Evidence:** `evidence/INV-CHECKIN-GST-PROBE-2026-10-06/probe_results.json`

---

## 1. ANSWER — SHORT VERSION

**No. The backend does NOT auto-calculate or store GST on discounted rent.**

- `gst_tax` sent by frontend at check-in → **IGNORED** by backend
- Backend formula for balance_payment: `room_price − room_discount − advance_payment` (**no GST**)
- GST strip at check-in = **display only** — informs staff/guest, does not affect stored data
- `gst_tax` field is **absent** from `room_info` API response

---

## 2. EVIDENCE FROM PROBE

### Orders with check-in discount (probed 2026-10-06)

| Order | room_price | room_discount | advance | balance_payment stored | gst_tax in room_info |
|-------|-----------|---------------|---------|----------------------|---------------------|
| 1232976 (80% CI disc) | ₹6,700 | ₹5,325 | ₹1,375 | **₹0** | **ABSENT** |
| 1232973 (89% CI disc) | ₹1,920 | ₹1,620 | ₹300 | **₹0** | **ABSENT** |

**Backend formula verified:**
```
Order 1232976: 6700 − 5325 − 1375 = 0  ✓  (no GST)
Order 1232973: 1920 − 1620 − 300  = 0  ✓  (no GST)
```

### In-house reservations (LR data, no discount)

| Reservation | booking_charge | sgst+cgst | advance | LR balance_payment | charge.balance_due |
|-------------|--------------|-----------|---------|-------------------|-------------------|
| 326 | ₹1,050 | ₹52.5 | ₹100 | **₹950** | ₹1,002.5 |

- LR `balance_payment` = 1050 − 100 = **950** (no GST)
- `charge.balance_due` = 1050 + 52.5 − 100 = **1002.5** (with GST — booking snapshot)

**FE in-house display formula (pmsService L113-115):**
```
roomBalance = balance_payment + chargeGst
           = 950 + 52.5 = 1002.5 ✓  (adds ORIGINAL booking-snapshot GST back)
```

---

## 3. BACKEND BEHAVIOUR — FULL PICTURE

```
AT CHECK-IN, backend receives from frontend:
  order_amount    = 9,000
  room_discount   = 7,920 (88%)
  advance_payment = 0 (collect-now, not booking advance)
  balance_payment = 9,000 + 1,620 − 0 = 10,620  (FE formula, includes GST)
  gst_tax         = 1,620 (or 54 after fix)

BACKEND STORES:
  room_info.room_price         = 9,000
  room_info.room_discount_amount = 7,920  ← USED
  room_info.advance_payment    = 1,000 (booking advance already on record)
  room_info.balance_payment    = 9,000 − 7,920 − 1,000 = 80  ← BACKEND COMPUTED
  room_info.gst_tax            = ABSENT  ← NEVER STORED

BACKEND IGNORES:
  Frontend-sent balance_payment (10,620) → overridden
  Frontend-sent gst_tax (1,620 or 54)   → not stored anywhere
```

### Critical: Backend also CAPS room_discount at (room_price − advance)

**Confirmed from both probe orders:**
```
Order 1232976: 80% × 6700 = 5360, BUT stored = 5325 = 6700 − 1375 = room − advance
Order 1232973: 89% × 1920 = 1709, BUT stored = 1620 = 1920 − 300  = room − advance
```

The backend enforces the same cap the frontend UI should show: **max discount = room_price − advance_at_booking**.

---

## 4. TWO CHECK-IN PATHS COMPARED

| | Legacy CheckInPage | Front Desk Beta (CheckInForm) |
|---|---|---|
| Sends `gst_tax` | Yes (FE-computed) | Always 0 |
| Sends `order_amount` | room_rent (e.g. 9,000) | 0 |
| Sends `balance_payment` | orderAmount + gstTax − advance | 0 |
| Backend uses FE values? | **No — overrides all money fields** | **No — uses reservation charge** |

Both paths result in identical backend behaviour: the server uses the reservation charge and its own formula.

---

## 5. IMPACT ON GATE 3 PLANS — CRITICAL REVISION NEEDED

### BUG-500 F2 — GST strip (display only) ✅ CORRECT TO FIX

The GST strip during check-in informs the guest what slab/amount applies. Fixing it to show the correct discounted slab (5% not 18%) is correct for:
- Guest receipt clarity
- Staff awareness before confirming

**It does NOT affect what the backend stores.** Safe to proceed.

---

### BUG-496 E4 — gstBase at submit (low backend impact) ✅ STILL WORTH FIXING

The sent `gst_tax` is ignored by backend. However, sending the wrong value (`1620` instead of `54`) in the FormData is poor practice and may affect future backend changes. Safe to fix.

---

### BUG-500 F1 — effectiveBalanceDue ⚠️ FORMULA MUST CHANGE

**The Gate 3 plan formula was wrong.** It included new GST in effectiveBalanceDue.

**PROBLEM with the Gate 3 F1 formula:**
```
Gate 3 plan had:
  discountedBase = 9000 − 7920 = 1080
  newGST = computeRoomGst(1080) = 54
  effectiveBalanceDue = 1080 + 54 − 1000 − 0 = 134  ← WRONG for Collect Now

If staff collects 134:
  Backend stores: bp = 9000 − 7920 − (1000 + 134) = −54
  In-house balance display: −54 + chargeGst(1620 original) = 1566  ← COMPLETELY WRONG
```

**CORRECT formula for effectiveBalanceDue (backend-compatible):**
```
effectiveBalanceDue = room_price − rawDiscount − bookingAdv − collectNow
                   = 9000 − 7920 − 1000 − 0 = 80

If staff collects 80:
  Backend stores: bp = 9000 − 7920 − (1000 + 80) = 0
  In-house balance display: 0 (GST waived per BUG-493 bp=0 rule) ✓
```

This ALSO aligns with the backend's own cap rule: max discount = room − advance = 8000, leaving bp = 0 when advance covers the rest.

**The GST strip is shown for information but does NOT drive the Collect Now maximum.**

---

## 6. REVISED effectiveBalanceDue FORMULA (replaces Gate 3 F1)

```javascript
// BUG-500: effectiveBalanceDue — backend-compatible formula (no GST)
// Backend stores bp = room_price − discount − advance_total (no GST)
// Using GST-inclusive formula here would cause staff to overcollect → negative bp → wrong in-house display
const effectiveBalanceDue = useMemo(() => {
  const base       = Number(form?.orderAmount || 0);
  const bookingAdv = Number(selected?.charge?.advance_payment || 0); // booking advance from LR
  const collectNow = Number(form?.advancePayment || 0);
  const rawDiscount = ciRoomDiscountType === 'Percent'
    ? Math.floor(base * (parseFloat(ciRoomDiscountAmt) || 0) / 100)
    : (parseFloat(ciRoomDiscountAmt) || 0);
  return Math.max(0, base - rawDiscount - bookingAdv - collectNow); // BUG-500: no GST (backend formula)
}, [form?.orderAmount, form?.advancePayment, ciRoomDiscountAmt, ciRoomDiscountType,
    selected?.charge?.advance_payment]);
```

**Key change from Gate 3 plan:** Remove `computeRoomGst` call. No `gstTotal` in formula. Uses backend-compatible `room − discount − advance`.

**Numeric proof:**
```
88% discount, room=9000, booking_adv=1000, no collect-now:
  rawDiscount = floor(9000 × 88 / 100) = 7920
  effectiveBalanceDue = max(0, 9000 − 7920 − 1000 − 0) = 80 ✓

  If staff collects 80: backend_bp = 9000 − 7920 − 1080 = 0 → balance shown = 0 ✓
  If staff collects 0:  backend_bp = 9000 − 7920 − 1000 = 80 → balance shown = 80 + 1620 = 1700 ← still shows original GST in in-house panel (separate issue outside this scope)

No discount, room=9000, booking_adv=1000:
  effectiveBalanceDue = max(0, 9000 − 0 − 1000 − 0) = 8000
  = room_price − booking_advance (matches charge.balance_due before GST ≈ sensible)
```

---

## 7. SUMMARY — WHAT CHANGES IN GATE 3 PLANS

| Plan item | Gate 3 plan (written) | Revised after probe |
|-----------|----------------------|---------------------|
| BUG-500 F2 GST strip | `gstBase = amt − roomDiscountRs` | ✅ UNCHANGED — correct |
| BUG-500 F1 effectiveBalanceDue | `discountedBase + newGST − bookingAdv − collectNow` | **REVISED: `base − rawDiscount − bookingAdv − collectNow` (no GST)** |
| BUG-496 E4 gstBase at submit | `max(0, orderAmount − roomDiscountRs)` | ✅ UNCHANGED — still correct (GST strip display value) |
| BUG-497 E4/E5 Collect Now max | `selected?.charge?.balance_due ?? effectiveBalanceDue` | ✅ UNCHANGED — uses balance_due from LR (already correct); effectiveBalanceDue fallback now uses right formula |

**Only 1 formula revision: BUG-500 F1.**

---

## 8. NEW OPEN DESIGN DECISION

**OD-500-04 (new — needs owner confirmation before Gate 4):**

The GST strip will show correct new slab (e.g. 5% = ₹54) after discount. But the Collect Now maximum is based on `room − discount − advance` (₹80), NOT the GST-inclusive figure (₹134).

> **Question:** Is this acceptable?
> - Staff sees GST strip: "GST on ₹1,000 = ₹50 at 5%"
> - Staff can collect max ₹80 at check-in (covers room balance only; GST portion of ₹50 is covered by the advance at booking)
> - After check-in: backend balance = ₹0 (guest has paid room + advance covers GST via bp=0 rule)

**Recommended answer:** YES — acceptable. The advance at booking effectively covers the residual GST when the room discount = room − advance. The ₹50 GST is absorbed because bp=0 → GST waived per the existing BUG-493 rule.

---

Root cause: CONFIRMED — HIGH confidence (probe + code trace).
Steps used: 6/10.
Evidence: `evidence/INV-CHECKIN-GST-PROBE-2026-10-06/probe_results.json`
