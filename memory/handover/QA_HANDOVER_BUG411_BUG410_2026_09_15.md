# QA Handover — BUG-411 + BUG-410
## Batch A: Payment Method Picker + Accommodation GST

**Date:** 2026-09-15
**Implementation agent:** IMPLEMENTATION (ALPHA v0.7)
**EXIT GATE:** 5/5 PASS (see below)

---

## 1. Registry Sync Confirmation

| Item | Status | Gate | Sprint |
|---|---|---|---|
| BUG-411 | GATE_5A_IMPLEMENTED | 5 | pos_pms_1 |
| BUG-410 | GATE_5A_IMPLEMENTED | 5 | pos_pms_1 |

Registry synced: **YES**
EXIT GATE: **5/5 PASS**

---

## 2. Files Changed

| File | Bug | Lines changed |
|---|---|---|
| `src/pages/pms/CheckInPage.jsx` | BUG-411 | +37 lines (E1–E7, 7 edit sites) |
| `src/components/modals/RoomCheckInModal.jsx` | BUG-410 | +45 lines (E1–E4, 4 edit sites) |
| `src/api/services/roomService.js` | BUG-410 | 1 line changed (E5) |

Compile: **PASS** (webpack compiled successfully, 0 new warnings)

---

## 3. Test Cases

### BUG-411 — Payment Method Picker

| # | Test | Steps | Expected | Priority |
|---|---|---|---|---|
| T1 | Picker appears on advance | Navigate /pms/check-in → Walk-in → Name=Test QA, Phone=9876543210, select room, Amount=1000, Advance=500 | Cash / Card / UPI buttons appear below advance | P0 |
| T2 | Picker hides on zero | Clear advance to 0 | Picker disappears | P0 |
| T3 | Confirm disabled without method | Advance=500, no method selected | Confirm Check-In button disabled | P0 |
| T4 | Confirm enabled after method | Click Cash | Button turns green, Confirm enabled | P0 |
| T5 | Network payload | Submit check-in with Advance=500, Cash selected → DevTools Network | `payment_method: "cash"` present in POST | P0 |
| T6 | Reset on new selection | Select Cash → click different arrival → Walk-in again | No method pre-selected (reset) | P1 |
| T7 | Zero advance: no method needed | Advance=0, no method → Confirm | Button enabled (method not required when advance=0) | P1 |

**Credentials:** owner@thegoankitchen.com / Qplazm@10
**URL:** /pms/check-in

### BUG-410 — Old Modal GST for Personal Bookings

| # | Test | Steps | Expected | Priority |
|---|---|---|---|---|
| T1 | GST strip shows for Walk-in | /dashboard → click room tile → Room Price=1000, Booking For=Personal | GST strip visible: CGST ₹25 + SGST ₹25 + Total ₹1,050 | P1 |
| T2 | GST strip hides at 0 price | Clear room price to 0 | GST strip disappears | P1 |
| T3 | Network payload | Submit Walk-in check-in with roomPrice=1000 → DevTools | `gst_tax: "50.00"` in POST (not `"0.00"`) | P1 |
| T4 | Corporate still works | Booking For=Corporate, Room Price=1000 | GST strip shows + GSTIN fields visible | P1 |
| T5 | No GST config | If property has no GST slabs | Strip shows "Not Applicable" | P2 |

**URL:** /dashboard → click room card (r1-r5)

---

## 4. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | Zero-advance check-in completes normally | formValid change must not break no-advance flow |
| R2 | Corporate check-in via old modal still works | BUG-410 must not break existing Corporate GST+GSTIN flow |
| R3 | New booking page unaffected | BUG-411 only touches CheckInPage |
| R4 | Arrivals list loads correctly | selectArrival reset changes must not break list behaviour |

---

## 5. Credentials + Environment

```
URL:      https://f66d5e4f-7aa2-4f84-ad4a-42a88864b5bd.preview.emergentagent.com
Login:    owner@thegoankitchen.com  /  Qplazm@10
Note:     Firebase auth — must login manually before testing
PMS Check-In: /pms/check-in
Dashboard (old modal): /dashboard → click room tile
```

---

*QA Handover written 2026-09-15 · IMPLEMENTATION agent (ALPHA v0.7)*
*Next: QA agent executes T1–T7 (BUG-411) + T1–T5 (BUG-410) + R1–R4*
