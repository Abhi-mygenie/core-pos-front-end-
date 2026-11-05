# BUG-428 — Implementation Plan (Gate 3)

**ID:** BUG-428  
**Date:** 2026-09-16  
**Risk:** MEDIUM (R5 hotspot — display only)  
**Gate 4 GO required before coding**

---

## Scope Lock

**Files WILL change:**
1. `src/components/order-entry/CollectPaymentPanel.jsx` (R5 hotspot — 1 JSX block, ~6 lines)

**Files will NOT touch:**
- `GuestFolioPage.jsx`
- `folioTransform.js`
- `pmsService.js`
- `PmsCheckoutDrawer.jsx`
- `orderTransform.js`
- `RoomCheckInModal.jsx`, `CheckInPage.jsx`

---

## Edit 1 — `src/components/order-entry/CollectPaymentPanel.jsx`

### Context: Current room breakdown block (L1828-1846)

```jsx
{showRoomBooking && (
  <div className="mt-1 mb-1 px-3 py-2 text-xs space-y-1 rounded-lg" style={{ backgroundColor: `${COLORS.primaryOrange}05` }}>
    <div className="flex justify-between">
      <span style={{ color: COLORS.grayText }}>Room Charge</span>
      <span style={{ color: COLORS.darkText }} data-testid="checkout-room-price">
        ₹{(roomInfo.roomPrice || 0).toLocaleString()}
      </span>
    </div>
    <div className="flex justify-between">
      <span style={{ color: COLORS.grayText }}>Advance Paid</span>
      <span style={{ color: COLORS.darkText }} data-testid="checkout-room-advance">
        −₹{(roomInfo.advancePayment || 0).toLocaleString()}
      </span>
    </div>
    <div className="flex justify-between font-bold pt-1 border-t" style={{ borderColor: COLORS.borderGray }}>
      <span style={{ color: COLORS.darkText }}>Balance</span>
      <span style={{ color: COLORS.primaryOrange }}>₹{roomBalance.toLocaleString()}</span>
    </div>
  </div>
)}
```

### Edit: Insert Lodging GST line between Room Charge and Advance Paid

**Find (the Advance Paid block — L1836-1840):**
```jsx
                  <div className="flex justify-between">
                    <span style={{ color: COLORS.grayText }}>Advance Paid</span>
                    <span style={{ color: COLORS.darkText }} data-testid="checkout-room-advance">
                      −₹{(roomInfo.advancePayment || 0).toLocaleString()}
                    </span>
                  </div>
```

**Replace with (Lodging GST line inserted before Advance Paid):**
```jsx
                  {/* BUG-428 OD-428-01/02/03: Lodging GST line — show when gstTax > 0 AND flag enabled */}
                  {(roomInfo.gstTax > 0) && (restaurant?.settings?.roomGstApplicable !== false) && (
                    <div className="flex justify-between" data-testid="checkout-room-gst">
                      <span style={{ color: COLORS.grayText }}>Lodging GST</span>
                      <span style={{ color: COLORS.darkText }}>+₹{(roomInfo.gstTax || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span style={{ color: COLORS.grayText }}>Advance Paid</span>
                    <span style={{ color: COLORS.darkText }} data-testid="checkout-room-advance">
                      −₹{(roomInfo.advancePayment || 0).toLocaleString()}
                    </span>
                  </div>
```

**Why `roomGstApplicable !== false`:** Consistent with BUG-338 guard at L276. If setting is `undefined` (not configured), GST is shown by default. Only hidden when explicitly set to `false`.

---

## Verification Matrix

| # | Edit | File | How to Verify | Manual/Auto |
|---|------|------|---------------|:---:|
| V1 | Lodging GST block inserted before Advance Paid | `CollectPaymentPanel.jsx` | Read L1835 area | Manual |
| V2 | Guard: `roomInfo.gstTax > 0` | Same | Read condition | Manual |
| V3 | Guard: `restaurant?.settings?.roomGstApplicable !== false` | Same | Read condition | Manual |
| V4 | data-testid="checkout-room-gst" present | Same | Read | Manual |
| V5 | BUG-428 code marker present | Same | grep | Manual |
| V6 | Browser (folio checkout): ROOM breakdown shows Room Charge ₹1,000 → Lodging GST +₹50 → Advance Paid −₹100 → Balance ₹950 | Browser | Open folio → Check Out | Manual |
| V7 | Browser (dashboard checkout): same breakdown visible | Browser | Dashboard → room order → checkout | Manual |
| V8 | Browser (dine-in): no regression — no Lodging GST line | Browser | Non-room order | Manual |
| V9 | Browser (delivery): no regression | Browser | Delivery order | Manual |
| V10 | Balance amount unchanged (₹950) — no formula change | Browser | Confirm balance still ₹950 | Manual |
| V11 | Webpack 0 new warnings | Terminal | yarn start log | Manual |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-428 → status: GATE_5A_IMPLEMENTED, sprint_key: pos_pms_1
- [ ] BUG_TRACKER.md: BUG-428 row updated
- [ ] FILE_OWNERSHIP.md: CollectPaymentPanel.jsx listed under BUG-428
- [ ] Code markers: // BUG-428 in every modified section
- [ ] Compile: webpack 0 new warnings
```

---

## Execution Sequence

1. View `CollectPaymentPanel.jsx` L1828-1846 to confirm exact current text
2. Apply Edit 1 (search-replace on the Advance Paid block)
3. Verify webpack compiles
4. Self-test V1–V11
5. Run R5 regression checklist (V6-V10)
6. EXIT GATE
7. Write QA Handover

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `restaurant` undefined at render (context not loaded) | VERY LOW | `?.` optional chain on `restaurant?.settings?.roomGstApplicable` | |
| `roomInfo` null when not a room order | VERY LOW | Block is inside `{showRoomBooking && ...}` which requires `isRoom && roomInfo` to be truthy | |
| Non-room flows accidentally show line | NONE | Guard: `showRoomBooking` outer condition + `isRoom &&` at parent | |
| Balance changes unexpectedly | NONE | This is purely display — `roomBalance` state/formula not touched | |
| Interacts with BUG-425 PmsCheckoutDrawer override | NONE | BUG-425 overrides the `roomBalance` value passed to `CollectPaymentPanel`; this edit only reads `roomInfo.gstTax` which is separate | |
