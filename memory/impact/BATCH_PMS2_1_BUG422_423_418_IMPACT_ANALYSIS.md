# Impact Analysis — BATCH-PMS2-1 (GST Cluster)
## BUG-422 + BUG-423 + BUG-418

**Gate:** 2 — Impact Analysis
**Date:** 2026-09-16
**Role:** PLANNING
**Code Reality:** PARTIAL for all three (code exists, formula gaps present)

---

## Conflict Pre-Check

| File | Open items touching same file | Risk |
|---|---|---|
| `RoomCheckInModal.jsx` | BUG-420 (BATCH-2 — CR-129 gap) | **CONFLICT** — execution order: BUG-422 impl FIRST, BUG-420 impl AFTER |
| `GuestFolioPage.jsx` | None | SAFE |
| `PmsCheckoutDrawer.jsx` | BUG-401 (GATE_5A_IMPLEMENTED, 2026-09-15) — already shipped | SAFE — extending, not conflicting |
| `CollectPaymentPanel.jsx` | Not in scope (see approach below) | SAFE — hotspot R5 avoided |

**Execution sequence locked:**
`BUG-422 impl → BUG-423 impl → BUG-418 impl → (then) BUG-420 impl (Batch 2)`

---

## §1 — BUG-422: Old RoomCheckInModal `balance_payment` Missing GST

### Code Reality: PARTIAL
BUG-410 (GATE_5A_IMPLEMENTED) added `computeRoomGst` import and `gstTax` field to the payload.
BUG-410 did NOT update the `balancePayment` useMemo formula.

### Data Flow Trace
```
RoomCheckInModal.jsx L294-296:
  roomGstApplicable = restaurant?.checkInFlags?.roomGstApplicable  (BUG-410)
  roomGstSlabs      = restaurant?.checkInFlags?.roomGstSlabs       (BUG-410)

L328:  const [nights, setNights] = useState(1);
L326:  const [checkinDate, ...]
L330:  const [checkoutDate, ...]
L333:  const [roomPrice, ...]
L334:  const [advancePayment, ...]

L363–367 — balancePayment useMemo (BREAK POINT):
  const o = Number(roomPrice) || 0;
  const a = Number(advancePayment) || 0;
  return (o - a).toFixed(2);           ← NO GST. e.g. ₹1,000 − ₹130 = ₹870

L704 (handleSubmit):
  const stayNights = Math.max(1, Math.round(
    (new Date(checkoutDate) - new Date(checkinDate)) / 86400000));
  const { gstTotal: gstTax } = computeRoomGst(
    roomGstApplicable, roomGstSlabs, Number(roomPrice), stayNights, 1);

L731: balancePayment: balancePayment  ← wrong value (no GST) sent to roomService
L734: gstTax,                         ← GST sent separately (correct)
```

**Result stored in backend:** `balance_payment = ₹870` (no GST). `gst_tax = ₹50` stored separately.

### Fix — 1 edit, 1 file

**E1 — `RoomCheckInModal.jsx` L363–367 — update `balancePayment` useMemo**

Current:
```js
const balancePayment = useMemo(() => {
  const o = Number(roomPrice) || 0;
  const a = Number(advancePayment) || 0;
  return (o - a).toFixed(2);
}, [roomPrice, advancePayment]);
```

Proposed (pending OD-422-01 GO):
```js
// BUG-422: include accommodation GST in balance_payment (mirrors pmsService.js L193)
const balancePayment = useMemo(() => {
  const o = Number(roomPrice) || 0;
  const a = Number(advancePayment) || 0;
  const n = Math.max(1, Math.round(
    (new Date(checkoutDate) - new Date(checkinDate)) / 86400000));
  const { gstTotal: g } = computeRoomGst(roomGstApplicable, roomGstSlabs, o, n, 1);
  return (o + g - a).toFixed(2);
}, [roomPrice, advancePayment, checkoutDate, checkinDate, roomGstApplicable, roomGstSlabs]);
```

`computeRoomGst` already imported (BUG-410). No new import needed.

This fixes BOTH the DISPLAYED value (L1421: `value={balancePayment}`) AND the SUBMITTED value (L731: `balancePayment: balancePayment`).

### Owner Decision (OD-422-01)
**"Old modal `balance_payment` should include GST — confirm?"**
Expected: YES. Mirrors new CheckInPage formula (pmsService.js L193, BUG-396).

### Risk Classification: CRITICAL (financial field sent to backend)
### Scope: SMALL — 1 file, 1 useMemo, ~6 lines changed
### Files WILL change: `RoomCheckInModal.jsx` (L363–367)
### Files WILL NOT touch: anything else

---

## §2 — BUG-423: Guest Folio Page Balance Excludes GST

### Code Reality: PARTIAL
`folioTransform.js` correctly fetches `roomPrice`, `gstTax`, `advancePayment`, `receiveBalance` as separate fields. `GuestFolioPage.jsx` correctly reads them. But the **balance formula** trusts the stored `balance_payment` value (which for old-modal guests = `room − advance`, no GST).

### Data Flow Trace
```
folioTransform.fromAPI() — all pass-through (R6):
  roomPrice      = num(ri.room_price)        = ₹1,000  ✅
  gstTax         = num(ri.gst_tax)           = ₹50     ✅
  advancePayment = num(ri.advance_payment)   = ₹130    ✅
  receiveBalance = num(ri.receive_balance)   = ₹0      ✅
  balancePayment = num(ri.balance_payment)   = ₹870    ← stored wrong (old modal)
  remainingRoomBalance = num(rps.remaining_room_balance) = ₹870 or 0

GuestFolioPage.jsx L100 (BREAK POINT):
  roomBalance = folio.remainingRoomBalance || folio.balancePayment
              = ₹870                         ← trusts stored value, missing GST

L312: Total Balance Due = roomBalance + fnbTotal = ₹870 (wrong — should be ₹920)
```

### Fix — 1 edit, 1 file

**E1 — `GuestFolioPage.jsx` L100 — recompute roomBalance from first principles**

Current:
```js
const roomBalance = folio ? (folio.remainingRoomBalance || folio.balancePayment) : 0;
```

Proposed (pending OD-423-01):
```js
// BUG-423: compute balance FE-side to self-correct regardless of stored balance_payment.
// Uses already-fetched fields — no extra API call. R6: pass-through arithmetic only.
const roomBalance = folio
  ? Math.max(0, folio.roomPrice + folio.gstTax - folio.advancePayment - folio.receiveBalance)
  : 0;
```

**Why this is safe (R6):** This is not a new business rule — it is a FE formula that derives the correct balance from already-fetched components. The backend owns `room_price`, `gst_tax`, `advance_payment`, `receive_balance` as source of truth. We do NOT invent any number.

**Self-correcting:** Works for ALL bookings regardless of how `balance_payment` was stored.

### Owner Decisions
- **OD-423-01**: "Folio balance computed FE-side as `room_price + gst_tax − advance_payment − amount_received` — confirm?" → Expected YES
- **OD-423-02**: "Total Balance Due = Room Balance + F&B Posted — confirm?" → Current code `roomBalance + fnbTotal` (L312). Already correct — confirm no change needed.

### Risk Classification: CRITICAL (financial display — folio is billing document)
### Scope: SMALL — 1 file, 1 line
### Files WILL change: `GuestFolioPage.jsx` (L100)
### Files WILL NOT touch: `folioTransform.js`, `pmsService.js`, any API

---

## §3 — BUG-418: Checkout Drawer Grand Total Excludes Room GST

### Code Reality: PARTIAL
BUG-401 (GATE_5A_IMPLEMENTED, 2026-09-15) correctly reads `roomInfo.gstTax` from `orderTransform` and injects it into the BILL_PAYMENT API payload. The DISPLAYED total in `CollectPaymentPanel` was NOT updated.

### Data Flow Trace
```
PmsCheckoutDrawer — open event:
  POST /get-single-order-new { order_id } →
  orderTransform.fromAPI.order() →
  detail.roomInfo.gstTax = parseFloat(api.room_info.gst_tax)  ← ₹50 (BUG-401 fix)
  detail.roomInfo.balancePayment = api.room_info.balance_payment ← ₹870 (stored wrong)
  detail.roomInfo.advancePayment = api.room_info.advance_payment ← ₹130
  detail.roomInfo.roomPrice      = api.room_info.room_price       ← ₹1,000
  detail.roomInfo.receiveBalance = api.room_info.receive_balance  ← ₹0

PmsCheckoutDrawer.jsx L158:
  const roomGstTax = detail.roomInfo?.gstTax ?? 0;  ← reads ₹50 (BUG-401)

PmsCheckoutDrawer.jsx L260-283 — CollectPaymentPanel props (BREAK POINT):
  total={detail.amount || 0}          ← ₹0 (no food items on room-only order)
  roomInfo={detail.roomInfo}          ← roomInfo with balancePayment = ₹870

CollectPaymentPanel.jsx L195-202:
  roomBalance = roomInfo.roomPaymentSummary?.remainingRoomBalance
                ?? roomInfo.balancePayment ?? 0
              = ₹870  ← still wrong (stored value, no GST)

CollectPaymentPanel.jsx L731-734:
  effectiveTotal = finalTotal + roomBalance = ₹0 + ₹870 = ₹870
  ← Cashier sees ₹870. Correct total should be ₹920 (room + gst − advance).

PmsCheckoutDrawer payload (L159):
  payload.room_gst_tax = 50           ← ONLY in payload, hidden from display
```

### Fix Approach — 1 edit, 1 file (PmsCheckoutDrawer only, NO CollectPaymentPanel change)

Instead of touching the hotspot `CollectPaymentPanel.jsx` (R5 — 3050 lines), we override `roomInfo.balancePayment` in the drawer before passing to CollectPaymentPanel, using the same FE formula as BUG-423:

**E1 — `PmsCheckoutDrawer.jsx` — compute corrected balance before passing to CollectPaymentPanel**

Proposed (pending OD-418-01 + OD-418-02):
```js
// BUG-418: balance_payment stored by old modal excludes GST.
// Recompute from first principles (same formula as BUG-423 GuestFolioPage).
// Avoids touching CollectPaymentPanel (hotspot R5).
const correctedRoomBalance = detail.roomInfo
  ? Math.max(0,
      (detail.roomInfo.roomPrice     || 0)
    + (detail.roomInfo.gstTax        || 0)
    - (detail.roomInfo.advancePayment|| 0)
    - (detail.roomInfo.receiveBalance|| 0))
  : 0;
```

Then in the CollectPaymentPanel invocation (L271):
```js
roomInfo={detail.roomInfo ? {
  ...detail.roomInfo,
  balancePayment: correctedRoomBalance,       // BUG-418
  roomPaymentSummary: detail.roomInfo.roomPaymentSummary
    ? { ...detail.roomInfo.roomPaymentSummary,
        remainingRoomBalance: correctedRoomBalance }  // BUG-418
    : null,
} : null}
```

`CollectPaymentPanel` prefers `roomPaymentSummary.remainingRoomBalance` over `balancePayment`. Overriding both ensures the correct value wins.

**Key safety property:** Once BUG-422 is shipped (old modal stores correct `balance_payment`), the recomputed value will equal the stored value — no double-counting risk. Until BUG-422 ships, the FE formula corrects legacy data.

### Owner Decisions
- **OD-418-01**: "Grand Total in checkout should show room balance INCLUDING GST (as one combined figure, not separate GST line) — confirm?" → Expected YES
- **OD-418-02**: "Checkout button label amount should include GST (e.g., 'Checkout ₹920') — confirm?" → CollectPaymentPanel drives this from `effectiveTotal`. Once `roomBalance` is corrected, it will automatically show ₹920. Owner confirms acceptable.

### Risk Classification: CRITICAL (financial display — amount shown to cashier at checkout)
### Scope: SMALL — 1 file, ~10 lines in PmsCheckoutDrawer (hotspot R5 NOT touched)
### Files WILL change: `PmsCheckoutDrawer.jsx` (L158-172 and L260-283)
### Files WILL NOT touch: `CollectPaymentPanel.jsx` (hotspot R5), `orderTransform.js`, any API

---

## §4 — Consolidated Verification Matrix

| Edit # | File | Change | How to Verify |
|---|---|---|---|
| E1 | `RoomCheckInModal.jsx` L363-367 | `balancePayment` useMemo adds GST | Old modal check-in: room ₹1,000 + advance ₹100. Displayed balance = ₹950 (₹1,000+₹50−₹100). Network: `balance_payment: "950.00"` |
| E2 | `GuestFolioPage.jsx` L100 | roomBalance formula uses roomPrice+gstTax−advance−received | Folio for guest with room ₹1,000 + gst ₹50 + advance ₹130: shows Room Balance ₹920, Total Balance Due ₹920 |
| E3 | `PmsCheckoutDrawer.jsx` | correctedRoomBalance passed as roomInfo.balancePayment | Open checkout for same guest: Grand Total = ₹920. Checkout button says ₹920 |
| R1 | All three | GST-inclusive balance consistent across folio + checkout | Folio shows ₹920, checkout drawer shows ₹920 — same number |
| R2 | `RoomCheckInModal.jsx` | BUG-410 gstTax still sent correctly | Network payload still has `gst_tax: 50` (no regression) |
| R3 | `GuestFolioPage.jsx` | F&B total still aggregated correctly | Room with F&B: Total Balance Due = Room Balance + F&B Posted |

---

## §5 — Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-422, BUG-423, BUG-418 → status: IMPLEMENTED, sprint_key: pos_pms_2
- [ ] BUG_TRACKER.md: rows updated
- [ ] FILE_OWNERSHIP.md: RoomCheckInModal.jsx (BUG-422), GuestFolioPage.jsx (BUG-423), PmsCheckoutDrawer.jsx (BUG-418)
- [ ] Code markers: // BUG-422, // BUG-423, // BUG-418 in each modified file
```

---

## §6 — Open Owner Decisions Summary

| OD | Question | Blocking? |
|---|---|---|
| **OD-422-01** | Old modal `balance_payment` = room+gst−advance — confirm GO? | YES — blocks BUG-422 impl |
| **OD-423-01** | Folio balance computed FE-side (ignores stored value) — confirm GO? | YES — blocks BUG-423 impl |
| **OD-423-02** | Total Balance Due = Room Balance + F&B Posted — confirm no change needed? | CONFIRM |
| **OD-418-01** | Checkout shows GST bundled in Room Balance (not separate line) — confirm? | YES — blocks BUG-418 impl |
| **OD-418-02** | Checkout button shows corrected total (₹920 not ₹870) — confirm acceptable? | YES — blocks BUG-418 impl |

*Once owner locks all 5 ODs → send to Gate 4 GO → Implementation*
