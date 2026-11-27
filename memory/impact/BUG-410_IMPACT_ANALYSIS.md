# Impact Analysis — BUG-410
## Old RoomCheckInModal: No Accommodation GST for Personal Bookings

**Date:** 2026-09-15  **Agent:** PLANNING (ALPHA v0.7)  **Stage:** Gate 2
**Code Reality:** NONE — gst_tax hardcoded '0.00' in roomService.js; no computeRoomGst in modal
**Duplicate check:** DISTINCT from BUG-386 (which fixed new CheckInPage)
**Conflict pre-check:** RoomCheckInModal.jsx last modified BUG-351/CR-350 (Aug 2026) in L611/L675 — different sections. roomService.js last modified CR-162 (L173) — different section. Zero conflicts.

---

## Risk Classification

**Risk: HIGH**  
Trigger: Financial/tax — accommodation GST is not calculated or sent for Walk-in/Individual bookings via old modal. `gst_tax` always = '0.00' regardless of property GST config.

---

## Data Flow Trace

```
RoomCheckInModal handleSubmit (any bookingFor)
  → roomService.checkIn({ roomPrice: 1000, ... })
      → roomService.js L118: fd.append('gst_tax', '0.00')   ← HARDCODED
          → POST /pos/user-group-check-in   gst_tax='0.00'
              → room_info.gst_tax = 0 in all orders via old modal
              → Folio: Lodging GST = ₹0 (wrong — should be ₹50 at 5% slab)
              → Night Audit: room_gst_collected = 0

FIX CHAIN:
  RoomCheckInModal: compute gstTax using computeRoomGst() at submit time
  → pass gstTax to roomService.checkIn({ gstTax: 50, ... })
  → roomService.js: fd.append('gst_tax', to2dp(params.gstTax ?? 0))  ← use passed value
  → Backend receives correct gst_tax=50.00

Reference: CheckInPage.jsx already does this correctly:
  computeRoomGst(roomGstApplicable, roomGstSlabs, gstBase, formNights, 1)
  → passes gstTax to pmsCheckIn
```

**Old modal already reads `restaurant.checkInFlags`** at L290 — `roomGstApplicable` + `roomGstSlabs` are available via the same flags object. No new profile data needed.

---

## Affected Files

### WILL CHANGE — `src/components/modals/RoomCheckInModal.jsx`

| Edit | Location | Current | Change |
|---|---|---|---|
| E1 | Line ~6 (imports) | No computeRoomGst import | Add: `import { computeRoomGst } from '@/utils/roomGstCalculator'` |
| E2 | Line ~290 (flags object) | `flags.guestDetails, flags.bookingDetails, flags.showUserGst` | Add: also read `flags.roomGstApplicable` and `flags.roomGstSlabs` from `restaurant.checkInFlags` |
| E3 | Line ~699 (handleSubmit roomService.checkIn call) | `gstTax` param not present | Add: compute `const gstTax = computeRoomGst(flags.roomGstApplicable, flags.roomGstSlabs, Number(roomPrice), Number(nights) || 1, 1).gstTotal` before the checkIn call; pass `gstTax` |
| E4 | Line ~1408 (JSX — after advance row, inside bookingDetails section) | No GST strip | Add: GST accommodation strip — same pattern as CheckInPage ci-gst-strip (CGST/SGST/Total incl. GST), shown when roomPrice > 0 and bookingDetails is visible |

### WILL CHANGE — `src/api/services/roomService.js`

| Edit | Location | Current | Change |
|---|---|---|---|
| E5 | Line 118 | `fd.append('gst_tax', '0.00')` | Change to: `fd.append('gst_tax', to2dp(params.gstTax ?? 0))` |

**~5 edit sites, ~45 lines total**

### WILL NOT TOUCH
- `roomGstCalculator.js` — utility, correct as-is
- `profileTransform.js` — already maps roomGstApplicable + roomGstSlabs correctly
- `CheckInPage.jsx` / `pmsService.js` — separate new flow, no change
- `orderTransform.js` — no change

---

## Scope Lock Note

`gstBlockVisible` (Corporate GSTIN block) is unchanged — that controls B2B GSTIN, not accommodation GST. The two are separate:
- `gstBlockVisible` → GSTIN input for corporate invoice (Corporate only) — keep as-is
- `computeRoomGst` call → accommodation slab GST (all booking types) — this is the fix

---

## Verification Matrix

| # | Test | How to verify |
|---|---|---|
| V1 | Walk-in + roomPrice=1000 → GST strip shows CGST=₹25, SGST=₹25, Total=₹1,050 | Browser UI |
| V2 | Submit → network payload `gst_tax=50.00` | DevTools Network |
| V3 | Property with no GST slab → strip shows 'Not Applicable', gst_tax=0.00 | Browser UI |
| V4 | Corporate booking → still shows GSTIN field + GST strip | Browser UI |
| V5 | Post check-in: folio Lodging GST = ₹50 | Folio page |

---

## Owner Decisions: NONE

Fix is unconditional — all personal bookings via old modal should compute and send accommodation GST based on the same slab config the new CheckInPage already uses.

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-410 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: RoomCheckInModal.jsx + roomService.js BUG-410
- [ ] Code marker: `// BUG-410` in every modified section
- [ ] webpack: 0 new warnings

*IA written 2026-09-15 · PLANNING agent (ALPHA v0.7)*
