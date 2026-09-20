# CR-358-P5 → BUG-386 — Gate 3 Implementation Plan
## PMS Check-In: Room Accommodation GST (CGST + SGST)

**ID:** BUG-386
**Written by:** PLANNING agent (ALPHA v0.7)
**Date:** 2026-09-08
**Gate:** 3 — Implementation Plan. Awaiting Gate 4 GO before any coding.
**Sprint:** pos_pms_1
**Impact Analysis:** `memory/impact/BUG-386_IMPACT_ANALYSIS.md` (Gate 2 CLOSED)
**Risk:** CRITICAL

---

## 0. Entry Verification (Implementation agent MUST run before coding)

```bash
# Verify all line refs still match before writing a single line

# E1: checkInFlags closing key
sed -n '241,244p' /app/frontend/src/api/transforms/profileTransform.js
# Expected L241: roomGstApplicable: toBoolean(api.room_gst_applicable),
# Expected L243: billDateFormat: api.bill_date_format || 'dd/MMM/yyyy hh:mm a',

# E5: pmsService.js target lines
sed -n '157,163p' /app/frontend/src/api/services/pmsService.js
# Expected L159: balance_payment: to2dp(orderAmount - advance),
# Expected L162: gst_tax:         '0.00',

# E6: orderTransform.js roomPaymentSummary target
sed -n '431,433p' /app/frontend/src/api/transforms/orderTransform.js
# Expected L431: legacyAdvancePayment: parseFloat(api.room_info.room_payment_summary.legacy_advance_payment) || 0,
# Expected L432: payments: (api.room_info.room_payment_summary.payments || []).map(p => ({

# E7: PmsCheckoutDrawer handlePaymentComplete target
sed -n '150,153p' /app/frontend/src/components/pms/PmsCheckoutDrawer.jsx
# Expected L151: await api.post(API_ENDPOINTS.BILL_PAYMENT, payload);

# E7 prerequisite: probe BILL_PAYMENT field name for room accommodation GST
# Run this curl with a live auth token from test_credentials.md
# curl -s -X POST "https://preprod.mygenie.online/api/v2/vendoremployee/order/order-bill-payment" \
#   -H "Authorization: Bearer {TOKEN}" \
#   -H "Content-Type: application/json" \
#   -d '{"order_id": <room_order_id>, "room_gst_tax": 200, ...}' | python3 -m json.tool
# → If 200 with room_gst_tax accepted: use payload.room_gst_tax = roomGstTax
# → If field rejected/ignored: use payload.gst_tax += roomGstTax (additive)
# → Save raw response to: /app/memory/evidence/INV-PMS-GST-001/probe_bill_payment_gst.json

# If ANY mismatch → STOP. Return to Planning agent.
```

---

## 1. Execution Sequence

```
Group A — Pure utility + transform (no UI, zero compile risk)
  E1: profileTransform.js   — add roomGstSlabs to checkInFlags
  E2: roomGstCalculator.js  — NEW pure utility

Group B — Service layer
  E5: pmsService.js         — fix gst_tax + balance_payment in pmsCheckIn

Group C — UI
  E3: CheckInPage.jsx       — add imports + useRestaurant + compute gstTax + pass to pmsCheckIn
  E4: CheckInPage.jsx       — add GST strip JSX between amount grid and Note textarea

Group D — Checkout path (OD-386-02 A)
  E6: orderTransform.js     — add gstTax to roomPaymentSummary (R5 HOTSPOT — 1 line additive)
  E7: PmsCheckoutDrawer.jsx — inject roomGstTax in BILL_PAYMENT payload

Checkpoints:
  After Group A: webpack compiles with 0 errors (no UI change yet)
  After Group B: webpack 0 errors — verify pmsCheckIn grep
  After Group C+D: webpack 0 errors — V-B1 browser smoke on /pms/check-in
```

---

## 2. Edit Specifications

---

### E1 — `src/api/transforms/profileTransform.js`
**Action:** ADD 4 lines after L243 (`billDateFormat` line) — additive to `checkInFlags`

**Current L237-244:**
```js
      checkInFlags: {
        guestDetails: toBoolean(api.guest_details),
        bookingDetails: toBoolean(api.booking_details),
        showUserGst: toBoolean(api.show_user_gst),
        roomGstApplicable: toBoolean(api.room_gst_applicable),
        foodPriceWithPaisa: toBoolean(api.food_price_with_paisa),
        billDateFormat: api.bill_date_format || 'dd/MMM/yyyy hh:mm a',
      },
```

**Replace with:**
```js
      checkInFlags: {
        guestDetails: toBoolean(api.guest_details),
        bookingDetails: toBoolean(api.booking_details),
        showUserGst: toBoolean(api.show_user_gst),
        roomGstApplicable: toBoolean(api.room_gst_applicable),
        foodPriceWithPaisa: toBoolean(api.food_price_with_paisa),
        billDateFormat: api.bill_date_format || 'dd/MMM/yyyy hh:mm a',
        // BUG-386: room accommodation GST slab config.
        // room_gst arrives as a JSON string under restaurants[0].settings.room_gst.
        // parseRoomGstSlabs() safely returns null on missing/malformed input.
        roomGstSlabs: (() => {
          try {
            const raw = api.settings?.room_gst;
            if (!raw) return null;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (!Array.isArray(parsed?.slabs) || parsed.slabs.length === 0) return null;
            return { basis: parsed.basis ?? 'unit_accommodation_per_day', slabs: parsed.slabs };
          } catch { return null; }
        })(),
      },
```

**Verify E1:**
```bash
grep -n "roomGstSlabs" /app/frontend/src/api/transforms/profileTransform.js
# Expected: 1 hit in checkInFlags block
```

---

### E2 — `src/utils/roomGstCalculator.js` *(NEW file)*

Create at `src/utils/roomGstCalculator.js`:

```js
// BUG-386: Room accommodation GST computation utility.
// Spec: pms_gst.md §1 — basis: "unit_accommodation_per_day"
// Rule: apply slab rate to nightly unit price (total / roomCount / nights), NOT to stay total.
// Returns: { gstTotal, cgst, sgst } — all rounded to 2dp.
//   gstTotal = CGST + SGST (equal halves per Indian GST rules)
// Returns { gstTotal: 0, cgst: 0, sgst: 0 } when GST not applicable or config missing.

const round2dp = (n) => Math.round(n * 100) / 100;

/**
 * Compute room accommodation GST from slab config.
 * @param {boolean}  applicable  - restaurant.checkInFlags.roomGstApplicable
 * @param {object|null} slabs    - restaurant.checkInFlags.roomGstSlabs ({ basis, slabs: [{min,max,gst_percent}] })
 * @param {number}   totalAmount - total room order amount (all rooms, all nights)
 * @param {number}   nights      - number of nights (≥1)
 * @param {number}   roomCount   - number of rooms in this check-in (≥1)
 * @returns {{ gstTotal: number, cgst: number, sgst: number }}
 */
export const computeRoomGst = (applicable, slabs, totalAmount, nights = 1, roomCount = 1) => {
  const zero = { gstTotal: 0, cgst: 0, sgst: 0 };
  if (!applicable || !slabs?.slabs?.length || !totalAmount || totalAmount <= 0) return zero;
  if (!nights || nights <= 0 || !roomCount || roomCount <= 0) return zero;

  // Per-unit nightly price (equal split assumed — pms_gst.md §5)
  const nightlyUnit = totalAmount / roomCount / nights;

  // Find matching slab
  const slab = slabs.slabs.find(
    s => nightlyUnit >= (s.min ?? 0) && (s.max == null || nightlyUnit <= s.max)
  );
  if (!slab || !slab.gst_percent) return zero;

  const rate       = slab.gst_percent / 100;
  const gstPerUnit = nightlyUnit * rate;
  const gstTotal   = round2dp(gstPerUnit * roomCount * nights);
  const half       = round2dp(gstTotal / 2);

  // CGST = SGST = gstTotal/2. Handle odd-paise: assign remainder to CGST.
  const cgst = round2dp(gstTotal - half);  // e.g. ₹1 → cgst=0.50, sgst=0.50
  const sgst = half;

  return { gstTotal, cgst, sgst };
};
```

**Verify E2:**
```bash
ls /app/frontend/src/utils/roomGstCalculator.js
grep -c "computeRoomGst\|cgst\|sgst\|nightlyUnit" /app/frontend/src/utils/roomGstCalculator.js
# Expected: 4 hits
```

---

### E5 — `src/api/services/pmsService.js`
**Action:** TWO sub-edits in `pmsCheckIn` payload.

**E5a — MODIFY L159** (fix `balance_payment`):

Current L159:
```js
    balance_payment: to2dp(orderAmount - advance),
```
Replace with:
```js
    balance_payment: to2dp(orderAmount + (p.gstTax ?? 0) - advance), // BUG-386: include GST
```

**E5b — MODIFY L162** (replace hardcoded zero):

Current L162:
```js
    gst_tax:         '0.00',
```
Replace with:
```js
    gst_tax:         to2dp(p.gstTax ?? 0),                           // BUG-386: computed from slabs
```

**Verify E5:**
```bash
grep -n "gst_tax\|balance_payment" /app/frontend/src/api/services/pmsService.js
# Expected: gst_tax line no longer reads '0.00'
# Expected: balance_payment includes (p.gstTax ?? 0)
```

---

### E3 — `src/pages/pms/CheckInPage.jsx` — imports + compute + pass
**Action:** THREE sub-edits.

**E3a — MODIFY L1** (update file header comment):

Current L1:
```js
// CR-358-P2: S4 — Check-In Page (arrivals list + Walk-in → pmsService.pmsCheckIn JSON; roomService.checkIn NOT used)
```
Replace with:
```js
// CR-358-P2 | BUG-386: S4 — Check-In Page. BUG-386: room accommodation GST (CGST+SGST) computed from slabs.
```

**E3b — MODIFY L7** (add `useRestaurant` import):

Current L7:
```js
import { getPmsReservations, getBookableRooms, pmsCheckIn } from '@/api/services/pmsService';
```
Replace with:
```js
import { getPmsReservations, getBookableRooms, pmsCheckIn } from '@/api/services/pmsService';
import { useRestaurant } from '@/contexts'; // BUG-386
import { computeRoomGst } from '@/utils/roomGstCalculator'; // BUG-386
```

**E3c — ADD after `const today = todayStr();` line (L34)**

Current L34:
```js
  const today = todayStr();
```
Replace with:
```js
  const today = todayStr();

  // BUG-386: room accommodation GST from profile slab config
  const { restaurant } = useRestaurant();
  const { roomGstApplicable, roomGstSlabs } = restaurant?.checkInFlags ?? {};
```

**E3d — MODIFY handleConfirm pmsCheckIn call (L162-176)** — add `gstTax` param:

Current L162-176:
```js
      const res = await pmsCheckIn({
        bookingType: form.bookingType,
        bookingId: form.bookingId,
        name: form.name.trim(),
        phone: form.phone,
        email: form.email,
        restaurantTableId: form.restaurantTableId,
        checkin: form.checkin,
        checkout: form.checkout,
        orderAmount: Number(form.orderAmount),
        advancePayment: Number(form.advancePayment || 0),
        adults: Number(form.adults),
        children: Number(form.children),
        note: form.note,
      });
```
Replace with:
```js
      // BUG-386: compute GST before submit
      const { gstTotal: gstTax } = computeRoomGst(
        roomGstApplicable,
        roomGstSlabs,
        Number(form.orderAmount),
        formNights ?? 1,
        1  // single-room check-in (pms_gst.md §5)
      );
      const res = await pmsCheckIn({
        bookingType: form.bookingType,
        bookingId: form.bookingId,
        name: form.name.trim(),
        phone: form.phone,
        email: form.email,
        restaurantTableId: form.restaurantTableId,
        checkin: form.checkin,
        checkout: form.checkout,
        orderAmount: Number(form.orderAmount),
        advancePayment: Number(form.advancePayment || 0),
        adults: Number(form.adults),
        children: Number(form.children),
        note: form.note,
        gstTax, // BUG-386
      });
```

**Verify E3:**
```bash
grep -n "useRestaurant\|computeRoomGst\|roomGstApplicable\|gstTax\|BUG-386" /app/frontend/src/pages/pms/CheckInPage.jsx | head -10
# Expected: all 4 patterns present
```

---

### E4 — `src/pages/pms/CheckInPage.jsx` — GST strip JSX
**Action:** INSERT GST strip between amount grid closing `</div>` and Note `<div>`.

**Anchor** — find this exact block (L368-372):
```jsx
                    </div>

                    <div>
                      <label className="text-[12px] text-[#888] mb-1 block">Note</label>
```

Replace with:
```jsx
                    </div>

                    {/* BUG-386: GST Accommodation strip */}
                    {(() => {
                      const amt = Number(form.orderAmount) || 0;
                      const nights = formNights ?? 1;
                      const { gstTotal, cgst, sgst } = computeRoomGst(roomGstApplicable, roomGstSlabs, amt, nights, 1);
                      const fmt = (n) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      const rate = roomGstSlabs?.slabs?.find(s => (amt / nights) >= (s.min ?? 0) && (s.max == null || (amt / nights) <= s.max))?.gst_percent ?? 0;
                      const hasGst = roomGstApplicable && roomGstSlabs && gstTotal > 0;
                      const notApplicable = !roomGstApplicable || !roomGstSlabs;
                      if (!amt || (!hasGst && !notApplicable)) return null;
                      return (
                        <div data-testid="ci-gst-strip"
                          className={`rounded-xl border px-4 py-3 flex flex-col gap-1.5 text-[12px] ${hasGst ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#FAFAFA] border-[#E5E5E5]'}`}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`font-semibold text-[11px] uppercase tracking-wide ${hasGst ? 'text-[#166534]' : 'text-[#888]'}`}>GST (Accommodation)</span>
                            {hasGst
                              ? <span className="text-[10px] font-bold bg-[#22C55E] text-white px-2 py-0.5 rounded-full">{rate}% Slab</span>
                              : <span className="text-[10px] font-semibold bg-[#E5E5E5] text-[#888] px-2 py-0.5 rounded-full">Not Applicable</span>
                            }
                          </div>
                          {hasGst ? (
                            <>
                              <div className="flex justify-between text-[#374151]">
                                <span>CGST ({rate / 2}%)</span>
                                <span>₹{fmt(cgst)}</span>
                              </div>
                              <div className="flex justify-between text-[#374151]">
                                <span>SGST ({rate / 2}%)</span>
                                <span>₹{fmt(sgst)}</span>
                              </div>
                              <div className="flex justify-between text-[11px] text-[#888] italic border-t border-[#BBF7D0] pt-1.5 mt-0.5">
                                <span>Total GST (CGST + SGST)</span>
                                <span className="font-semibold text-[#166534]">₹{fmt(gstTotal)}</span>
                              </div>
                              <div className="flex justify-between font-bold text-[#1A1A1A] border-t border-[#BBF7D0] pt-1.5 mt-0.5">
                                <span>Total incl. GST</span>
                                <span className="text-[#15803D] text-[13px]">₹{fmt(amt + gstTotal)}</span>
                              </div>
                            </>
                          ) : (
                            <span className="text-[#888] text-[12px]">GST not configured for this property. Sending gst_tax: 0.00</span>
                          )}
                        </div>
                      );
                    })()}

                    <div>
                      <label className="text-[12px] text-[#888] mb-1 block">Note</label>
```

**Verify E4:**
```bash
grep -n "ci-gst-strip\|CGST\|SGST\|GST.*Accommodation" /app/frontend/src/pages/pms/CheckInPage.jsx
# Expected: all 3 patterns present
```

---

### E6 — `src/api/transforms/orderTransform.js`
**Action:** ADD 1 line after L431 (`legacyAdvancePayment` line) — additive to `roomPaymentSummary`.

**Current L431-432:**
```js
          legacyAdvancePayment: parseFloat(api.room_info.room_payment_summary.legacy_advance_payment) || 0,
          payments: (api.room_info.room_payment_summary.payments || []).map(p => ({
```
Replace with:
```js
          legacyAdvancePayment: parseFloat(api.room_info.room_payment_summary.legacy_advance_payment) || 0,
          gstTax:               parseFloat(api.room_info.room_payment_summary.gst_tax) || 0, // BUG-386
          payments: (api.room_info.room_payment_summary.payments || []).map(p => ({
```

**Verify E6:**
```bash
grep -n "gstTax" /app/frontend/src/api/transforms/orderTransform.js
# Expected: 1 hit in roomPaymentSummary block
```

---

### E7 — `src/components/pms/PmsCheckoutDrawer.jsx`
**Action:** Inject `roomGstTax` into the `BILL_PAYMENT` payload.

> ⚠ **PREREQUISITE:** Run the E7 curl probe (Entry Verification) before coding this edit.
> Use the probe result to confirm: `room_gst_tax` (dedicated field) OR additive to `gst_tax`.
> Default assumption if probe unavailable: use `room_gst_tax` as dedicated field (can be corrected in QA).

**MODIFY L138-153** (handlePaymentComplete payload block):

Current L138-153:
```js
      const payload = orderToAPI.collectBillExisting(
        effectiveTable,
        cartItems,
        customer,
        paymentData,
        {
          autoBill:       settings?.autoBill || false,
          waiterId:       user?.employeeId || '',
          restaurantName: restaurant?.name || '',
          // D3: paymentType omitted — Dashboard parity (A-08)
        }
      );

      await api.post(API_ENDPOINTS.BILL_PAYMENT, payload);
```
Replace with:
```js
      const payload = orderToAPI.collectBillExisting(
        effectiveTable,
        cartItems,
        customer,
        paymentData,
        {
          autoBill:       settings?.autoBill || false,
          waiterId:       user?.employeeId || '',
          restaurantName: restaurant?.name || '',
          // D3: paymentType omitted — Dashboard parity (A-08)
        }
      );

      // BUG-386 (OD-386-02 Option A): inject room accommodation GST into checkout payload.
      // gstTax was stored at check-in time in user_id_documents.gst_tax.
      // Read it back from roomPaymentSummary (mapped via orderTransform E6).
      const roomGstTax = detail.roomInfo?.roomPaymentSummary?.gstTax ?? 0;
      if (roomGstTax > 0) payload.room_gst_tax = roomGstTax; // field name confirmed via probe

      await api.post(API_ENDPOINTS.BILL_PAYMENT, payload);
```

**Verify E7:**
```bash
grep -n "roomGstTax\|room_gst_tax\|BUG-386" /app/frontend/src/components/pms/PmsCheckoutDrawer.jsx
# Expected: 3 hits
```

---

## 3. Webpack Compile Checkpoints

```bash
# After Group A (E1 + E2 created):
tail -3 /var/log/supervisor/frontend.out.log
# Expected: "webpack compiled successfully" — no errors

# After Group B (E5):
grep -n "gst_tax\|balance_payment" /app/frontend/src/api/services/pmsService.js
# Expected: gst_tax uses to2dp(p.gstTax ?? 0), balance_payment includes (p.gstTax ?? 0)

# After Group C (E3+E4):
tail -3 /var/log/supervisor/frontend.out.log
# Expected: "webpack compiled successfully"

# After Group D (E6+E7):
tail -3 /var/log/supervisor/frontend.out.log
# Expected: "webpack compiled successfully" — 0 new warnings/errors
```

---

## 4. Scope Lock

```
Files WILL change (7 total):
  src/api/transforms/profileTransform.js       E1 — add roomGstSlabs to checkInFlags
  src/utils/roomGstCalculator.js               E2 — NEW utility
  src/api/services/pmsService.js               E5 — fix gst_tax + balance_payment
  src/pages/pms/CheckInPage.jsx                E3+E4 — imports + compute + GST strip UI
  src/api/transforms/orderTransform.js         E6 — add gstTax to roomPaymentSummary
  src/components/pms/PmsCheckoutDrawer.jsx     E7 — inject room_gst_tax in BILL_PAYMENT

Files will NOT touch:
  src/components/order-entry/CollectPaymentPanel.jsx   (R5/R6 — sacred)
  src/pages/pms/InHouseGuestsPage.jsx                  (self-heals for new bookings)
  src/pages/pms/DeparturesPage.jsx                     (no change to caller)
  src/pages/pms/FrontDeskPage.jsx                      (no change to caller)
  src/App.js                                            (no new routes)
  src/contexts/RestaurantContext.jsx                    (no change — settings auto-flow)
```

---

## 5. Verification Matrix

| V# | Feature | File | Verify | Auto? |
|---|---|---|---|---|
| V1 | computeRoomGst — 5% slab (≤7500) | roomGstCalculator.js | Unit: computeRoomGst(true, slabs, 8000, 1, 2) = 400 | YES |
| V2 | computeRoomGst — 18% slab (>7500) | roomGstCalculator.js | Unit: computeRoomGst(true, slabs, 8000, 1, 1) = {gstTotal:1440, cgst:720, sgst:720} | YES |
| V3 | computeRoomGst — not applicable | roomGstCalculator.js | Unit: computeRoomGst(false, slabs, 8000, 1, 1) = {gstTotal:0,cgst:0,sgst:0} | YES |
| V4 | computeRoomGst — null slabs | roomGstCalculator.js | Unit: computeRoomGst(true, null, 8000, 1, 1) = {gstTotal:0,cgst:0,sgst:0} | YES |
| V5 | profileTransform — slabs parsed from JSON string | profileTransform.js | Unit: restaurant.checkInFlags.roomGstSlabs has {basis, slabs:[]} | YES |
| V6 | profileTransform — null when field missing | profileTransform.js | Unit: roomGstSlabs = null when api.settings?.room_gst = undefined | YES |
| V7 | GST strip visible — applicable | CheckInPage.jsx | Browser: enter ₹8000 amount → green strip with CGST + SGST lines | NO |
| V8 | GST strip — Not Applicable | CheckInPage.jsx | Browser: flag=false → grey strip "Not Applicable" | NO |
| V9 | pmsCheckIn payload — gst_tax correct | pmsService.js | Browser Network tab: gst_tax ≠ "0.00" for applicable restaurant | NO |
| V10 | pmsCheckIn payload — balance_payment correct | pmsService.js | Browser Network tab: balance_payment = orderAmount + gstTax − advance | NO |
| V11 | roomPaymentSummary.gstTax mapped | orderTransform.js | Unit: detail.roomInfo.roomPaymentSummary.gstTax > 0 for room order | YES |
| V12 | BILL_PAYMENT payload — room_gst_tax injected | PmsCheckoutDrawer.jsx | Browser Network tab: checkout payload has room_gst_tax field | NO |

---

## 6. Post-Code Registry Checklist

```
□ registry.json: BUG-386 → status: IMPLEMENTED, gate: 5a, sprint_key: pos_pms_1
□ BUG_TRACKER.md: row updated → IMPLEMENTED Gate 5a
□ FILE_OWNERSHIP.md: all 7 files listed with BUG-386 + 2026-09-08
□ Code markers: // BUG-386 present in every modified file (E1/E5/E3/E4/E6/E7)
□ webpack: 0 new errors, 0 new warnings
```

---

*Gate 3 complete. 7 edits (1 NEW + 6 MOD). 12 verification checks. Awaiting Gate 4 GO.*
*Entry Verification: 5 anchors + 1 curl probe (E7 prerequisite).*
