# Implementation Plan — BUG-410
## Old RoomCheckInModal: Add Accommodation GST for Personal Bookings

**Date:** 2026-09-15  
**Agent:** PLANNING (ALPHA v0.7)  
**Gate:** 3 — Implementation Plan  
**IA doc:** `impact/BUG-410_IMPACT_ANALYSIS.md`  
**Entry verification:** All target lines confirmed current (2026-09-15 re-check)

---

## Scope Lock

**Files WILL change:**
- `src/components/modals/RoomCheckInModal.jsx` — 4 edit sites
- `src/api/services/roomService.js` — 1 edit site

**Files WILL NOT touch:**
- `roomGstCalculator.js` — utility, correct as-is
- `profileTransform.js` — already maps roomGstApplicable + roomGstSlabs
- `CheckInPage.jsx` / `pmsService.js` — new flow, untouched
- `orderTransform.js`, any other file

---

## Execution Sequence

### E1 — Add `computeRoomGst` import

**File:** `src/components/modals/RoomCheckInModal.jsx`  
**After line 12** (`import { getDocuments, uploadDocument } ...`)

**Insert:**
```javascript
import { computeRoomGst } from '../../utils/roomGstCalculator'; // BUG-410
```

---

### E2 — Read `roomGstApplicable` + `roomGstSlabs` from flags

**File:** `src/components/modals/RoomCheckInModal.jsx`  
**After line 292** (closing brace of `flags` object `};`)

**Find (exact):**
```javascript
  const flags = restaurant?.checkInFlags || {
    guestDetails: false, bookingDetails: false, showUserGst: false,
  };
```

**Replace with:**
```javascript
  const flags = restaurant?.checkInFlags || {
    guestDetails: false, bookingDetails: false, showUserGst: false,
  };
  // BUG-410: accommodation GST slab config — same source as CheckInPage
  const roomGstApplicable = restaurant?.checkInFlags?.roomGstApplicable ?? false;
  const roomGstSlabs      = restaurant?.checkInFlags?.roomGstSlabs      ?? null;
```

---

### E3 — Compute `gstTax` and pass to `roomService.checkIn`

**File:** `src/components/modals/RoomCheckInModal.jsx`  
**Lines 699–729** — the `roomService.checkIn({...})` call

**Find (exact):**
```javascript
      await roomService.checkIn({
        name: name.trim(),
        phone: phone10, // BUG-092: normalized 10-digit
        email: email.trim(),
        customerId, // BUG-092: CRM customer_id (null if CRM failed)
        roomIds: selectedRoomIds,

        idType: idType,
        frontImage: frontImage || undefined,
        backImage: backImage || undefined,
        extraAdults: extraAdults.map((r) => ({
          name: r.name.trim(),
          idType: r.idType,
          frontImage: r.frontImage,
          backImage: r.backImage || undefined,
        })),
        childNames: childNames,

        bookingType: bookingType,
        bookingFor: bookingFor,
        checkinDate: toPayloadDateTime(checkinDate, checkinTime),
        checkoutDate: toPayloadDateTime(checkoutDate, checkoutTime),
        roomPrice: roomPrice,
        advancePayment: advancePayment || 0,
        balancePayment: balancePayment,
        paymentMethod: paymentMethod,  // BUG-027
        orderNote: orderNote.trim(),

        firmName: firmName.trim(),
        firmGst: firmGst.trim(),
      });
```

**Replace with:**
```javascript
      // BUG-410: compute accommodation GST for ALL booking types (not just Corporate)
      const stayNights = Math.max(1, Math.round((new Date(checkoutDate) - new Date(checkinDate)) / 86400000));
      const { gstTotal: gstTax } = computeRoomGst(roomGstApplicable, roomGstSlabs, Number(roomPrice), stayNights, 1);

      await roomService.checkIn({
        name: name.trim(),
        phone: phone10, // BUG-092: normalized 10-digit
        email: email.trim(),
        customerId, // BUG-092: CRM customer_id (null if CRM failed)
        roomIds: selectedRoomIds,

        idType: idType,
        frontImage: frontImage || undefined,
        backImage: backImage || undefined,
        extraAdults: extraAdults.map((r) => ({
          name: r.name.trim(),
          idType: r.idType,
          frontImage: r.frontImage,
          backImage: r.backImage || undefined,
        })),
        childNames: childNames,

        bookingType: bookingType,
        bookingFor: bookingFor,
        checkinDate: toPayloadDateTime(checkinDate, checkinTime),
        checkoutDate: toPayloadDateTime(checkoutDate, checkoutTime),
        roomPrice: roomPrice,
        advancePayment: advancePayment || 0,
        balancePayment: balancePayment,
        paymentMethod: paymentMethod,  // BUG-027
        orderNote: orderNote.trim(),
        gstTax, // BUG-410: accommodation GST computed for all booking types

        firmName: firmName.trim(),
        firmGst: firmGst.trim(),
      });
```

---

### E4 — Add GST accommodation strip in JSX

**File:** `src/components/modals/RoomCheckInModal.jsx`  
**After line 1415** (closing `</div>` of the Balance row grid, just before Special Request `InputField`)

**Find (exact):**
```jsx
                <div className="grid grid-cols-2 gap-2">
                  <InputField
                    label="Balance"
                    readOnly
                    value={balancePayment}
                    data-testid="checkin-balance"
                  />
                  <div />
                </div>

                <InputField
                  icon={FileText}
                  label="Special Request"
```

**Replace with:**
```jsx
                <div className="grid grid-cols-2 gap-2">
                  <InputField
                    label="Balance"
                    readOnly
                    value={balancePayment}
                    data-testid="checkin-balance"
                  />
                  <div />
                </div>

                {/* BUG-410: GST accommodation strip — all booking types (not just Corporate) */}
                {Number(roomPrice) > 0 && (() => {
                  const stayN = Math.max(1, Math.round((new Date(checkoutDate) - new Date(checkinDate)) / 86400000));
                  const { gstTotal, cgst, sgst } = computeRoomGst(roomGstApplicable, roomGstSlabs, Number(roomPrice), stayN, 1);
                  const rate = roomGstSlabs?.slabs?.find(s => (Number(roomPrice) / stayN) >= (s.min ?? 0) && (s.max == null || (Number(roomPrice) / stayN) <= s.max))?.gst_percent ?? 0;
                  const hasGst = roomGstApplicable && roomGstSlabs && gstTotal > 0;
                  if (!hasGst && roomGstApplicable) return null;
                  const fmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  return (
                    <div
                      data-testid="modal-gst-strip"
                      className={`rounded-lg border px-3 py-2.5 text-[12px] ${
                        hasGst ? 'bg-[#F0FDF4] border-[#A7F3D0]' : 'bg-[#FAFAFA] border-[#E5E5E5]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold text-[11px] uppercase tracking-wide ${
                          hasGst ? 'text-[#166534]' : 'text-[#888]'
                        }`}>GST (Accommodation)</span>
                        {hasGst
                          ? <span className="text-[10px] font-bold bg-[#22C55E] text-white px-2 py-0.5 rounded-full">{rate}% Slab</span>
                          : <span className="text-[10px] font-semibold bg-[#E5E5E5] text-[#888] px-2 py-0.5 rounded-full">Not Applicable</span>
                        }
                      </div>
                      {hasGst && (
                        <>
                          <div className="flex justify-between text-[#374151]"><span>CGST ({rate/2}%)</span><span>₹{fmt(cgst)}</span></div>
                          <div className="flex justify-between text-[#374151] mt-0.5"><span>SGST ({rate/2}%)</span><span>₹{fmt(sgst)}</span></div>
                          <div className="flex justify-between font-bold text-[#1A1A1A] border-t border-[#A7F3D0] pt-1.5 mt-1.5">
                            <span>Total incl. GST</span>
                            <span className="text-[#15803D]">₹{fmt(Number(roomPrice) + gstTotal)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                <InputField
                  icon={FileText}
                  label="Special Request"
```

---

### E5 — Use passed `gstTax` in `roomService.checkIn`

**File:** `src/api/services/roomService.js`  
**Line 118**

**Find (exact):**
```javascript
  fd.append('gst_tax', '0.00');
```

**Replace with:**
```javascript
  fd.append('gst_tax', to2dp(params.gstTax ?? 0)); // BUG-410: use computed accommodation GST (was hardcoded '0.00')
```

---

## Verification Matrix

| Edit | File | Verification | Self-test |
|---|---|---|---|
| E1 | RoomCheckInModal.jsx | `computeRoomGst` import present | Code read |
| E2 | RoomCheckInModal.jsx | `roomGstApplicable` and `roomGstSlabs` constants present | Code read |
| E3 | RoomCheckInModal.jsx | `stayNights` + `gstTax` computed before checkIn call | Code read |
| E4 | RoomCheckInModal.jsx | GST strip visible with Room Price=1000, 1 night → shows CGST=₹25, SGST=₹25 | Browser |
| E5 | roomService.js | Network payload `gst_tax=50.00` for Walk-in with roomPrice=1000 | DevTools |
| V3 | Browser | Property with no GST slab → strip not shown or 'Not Applicable', gst_tax=0.00 | Browser |
| V4 | Browser | Corporate booking → GST strip still shows alongside GSTIN block | Browser |
| V5 | Folio | Post-check-in via old modal: folio Lodging GST = ₹50 | Folio page |

---

## Risk Register

| Risk | Mitigation |
|---|---|
| `checkinDate` / `checkoutDate` format mismatch (datetime vs date string) | `new Date(checkoutDate)` handles both ISO date and datetime strings; Math.max(1,...) guards against 0 |
| `roomGstSlabs` null on property without GST config | `computeRoomGst` returns `{gstTotal:0, cgst:0, sgst:0}` when slabs is null — `gst_tax=0.00` sent (safe) |
| `gstBlockVisible` (Corporate GSTIN) interaction | Unchanged — the two blocks are independent. GST strip = accommodation tax. GSTIN block = B2B invoice. |

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-410 → status: GATE_5A_IMPLEMENTED, gate: 5
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: RoomCheckInModal.jsx + roomService.js — BUG-410
- [ ] Code markers: `// BUG-410` in E1, E2, E3, E4, E5
- [ ] webpack: 0 new warnings

*Plan written 2026-09-15 · PLANNING agent (ALPHA v0.7)*
