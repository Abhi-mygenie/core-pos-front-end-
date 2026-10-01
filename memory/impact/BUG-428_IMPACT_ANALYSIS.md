# BUG-428 — Impact Analysis (Gate 2)

**ID:** BUG-428  
**Date:** 2026-09-16  
**Planning session:** 2026-09-16  
**Code Reality:** CONFIRMED GAP — `roomInfo.gstTax` is mapped and available at L1833 area. The JSX block (L1829-1846) has 3 hardcoded rows with no GST line between them. One conditional JSX block needed.  
**Conflict Pre-Check:** MEDIUM — `CollectPaymentPanel.jsx` is an R5 hotspot with high layering. Last touch for the room breakdown section was BUG-360/BUG-425/BUG-338. All IMPLEMENTED/CLOSED. No open items on this file.

---

## Risk Classification

- **Risk:** MEDIUM  
- **Reason:** Balance amount is numerically correct (BUG-425 already fixed). This is a display-only gap — adds 1 visual line item. However file is R5 hotspot, so full plan + regression checklist required.  
- **Fast Lane:** NOT eligible (R5 hotspot)

---

## Owner Decisions Applied

| ID | Decision | Source |
|----|----------|--------|
| OD-428-01 | Add Lodging GST as a line item in ROOM breakdown (between Room Charge and Advance Paid) | Intake |
| OD-428-02 | Show only if `roomInfo.gstTax > 0` | Intake |
| OD-428-03 | Also gate on `roomGstApplicable` flag (consistent with existing BUG-338 logic at L276) | Owner 2026-09-16 ("flag needs to be included and bound") |
| OD-428-04 | `restaurant?.settings?.roomGstApplicable` path used (consistent with CollectPaymentPanel existing pattern at L276) | Planning decision — consistent with file's existing pattern |

---

## Data Flow Trace

```
API:       POST SINGLE_ORDER_NEW → room_info.gst_tax
Transform: orderTransform.js L409: gstTax: parseFloat(api.room_info.gst_tax) || 0
           → roomInfo.gstTax mapped correctly
Prop:      CollectPaymentPanel receives `roomInfo` prop (line 40)
State:     roomInfo.gstTax is available at the JSX render point (L1829-1846)
JSX:       L1829-1846 renders: Room Charge → Advance Paid → Balance
           MISSING: Lodging GST line between Room Charge and Advance Paid
Flag:      restaurant?.settings?.roomGstApplicable already used at L276 (BUG-338)
           restaurant available via useRestaurant() at L79 — no new import needed

BREAK POINT: JSX L1835 area — no conditional GST line rendered
```

---

## roomGstApplicable Flag Availability

CollectPaymentPanel already has:
- `const { ..., restaurant, ... } = useRestaurant();` at **L79** — no new import needed
- `restaurant?.settings?.roomGstApplicable` already checked at **L276** (BUG-338)

So for BUG-428, the flag is ALREADY available in scope. The fix is purely JSX addition.

---

## R5 Hotspot Analysis

`CollectPaymentPanel.jsx` is listed in Rule R5. This change:
- Adds 1 JSX conditional block (display only)
- Does NOT touch any formula, state, prop, financial computation, or API payload
- Does NOT touch: grand total calculation, payment method logic, bill print, settlement, coupon, discount, loyalty
- Regression risk: LOW for non-room flows (the new block is inside `{showRoomBooking && (...)}` — only renders for room orders)
- Regression risk: LOW for room flows — only adds visual line, balance amount unchanged

---

## Affected Files

| File | Change | Risk |
|------|--------|------|
| `src/components/order-entry/CollectPaymentPanel.jsx` | 1 JSX conditional block (6 lines) between Room Charge and Advance Paid | MEDIUM (R5 hotspot, display only) |

**Files NOT touched:** `GuestFolioPage.jsx`, `folioTransform.js`, `pmsService.js`, `PmsCheckoutDrawer.jsx`, `orderTransform.js`

---

## Regression Checklist (R5 required)

Because CollectPaymentPanel.jsx is R5, QA must verify:

| Flow | Expected behavior |
|------|------------------|
| Room checkout (GST enabled, gstTax > 0) | Lodging GST line appears |
| Room checkout (GST enabled, gstTax = 0) | Lodging GST line hidden |
| Room checkout (roomGstApplicable = false) | Lodging GST line hidden |
| Dine-in checkout | No regression — block is inside `isRoom &&` guard |
| Delivery checkout | No regression |
| Walk-in (non-room) checkout | No regression |
| Split bill | No regression |
| Room checkout balance amount | Unchanged (BUG-425 fix preserved) |
