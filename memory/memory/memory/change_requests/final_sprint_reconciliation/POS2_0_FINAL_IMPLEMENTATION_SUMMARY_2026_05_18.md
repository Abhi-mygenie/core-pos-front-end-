# POS2.0 Sprint — Final Implementation Summary & QA Handoff

## 1. Sprint Overview

| Field | Value |
|---|---|
| Sprint | POS2.0 |
| Branch | `17-may` |
| Total Bugs | 37 |
| Implemented | 26 |
| Closed (no code) | 6 |
| Critical carry-forward | 1 (→ POS3.0) |
| Future sprint / pending | 4 (→ POS3.0) |
| Date closed | 2026-05-18 |

---

## 2. Final Bug Accounting (37 bugs)

| # | Bug ID | Final Status | Wave | Description |
|---|---|---|---|---|
| 1 | BUG-050 | ✅ Implemented | W4 | Dashboard reprint parity — use Collect Bill override path |
| 2 | BUG-051 | ✅ Implemented | W2 | Round-off switched to `Math.ceil` |
| 3 | BUG-052 | ✅ Implemented | W2 | Profile boolean gate for round-off |
| 4 | BUG-053 | ✅ Closed (no code) | — | No hardcoded SGST/CGST percentage found |
| 5 | BUG-054 | ✅ Implemented | W2 | VAT discount proration |
| 6 | BUG-055 | ✅ Implemented | W2 | Prepaid `order_discount_type` payload parity |
| 7 | BUG-056 | ✅ Implemented | W3 | Preset discount dropdown, mutually exclusive with manual |
| 8 | BUG-057 | ✅ Implemented | W4 | Print Bill button for prepaid on Collect Bill + order screen |
| 9 | BUG-058 | 🔴 Critical carry-forward | W7 | PayLater PAID badge + prepaid hold settle → POS3.0 |
| 10 | BUG-059 | ✅ Implemented | W4 | Audit Report Print Bill action for paid orders |
| 11 | BUG-060 | ✅ Implemented (temp FE fix) | W7 | Room transfer table clearing — backend follow-up noted |
| 12 | BUG-061 | ✅ Implemented | W7 | Room check-in time `createdAt` fallback |
| 13 | BUG-062 | ✅ Implemented | W1 | Hide To Room for takeaway/delivery |
| 14 | BUG-063 | ✅ Closed (no code) | — | Room bill print — required fields added prior, rest next phase |
| 15 | BUG-064 | 📋 Future sprint | — | Room transfer notification → POS3.0 |
| 16 | BUG-065 | ✅ Implemented | Post | CRM lookup on check-in + order screen data flow + read-only |
| 17 | BUG-066 | ✅ Implemented | W1 | Food transfer exclude rooms |
| 18 | BUG-067 | ✅ Implemented | W1 | Station toggle disabled when no stations |
| 19 | BUG-068 | ✅ Implemented | W6 | Socket reconnect rehydration merge |
| 20 | BUG-069 | 📋 Future sprint | — | Notification sequencing → POS3.0 |
| 21 | BUG-070 | ✅ Implemented | W5 | Room area grouping in Table/Channel View |
| 22 | BUG-071 | ✅ Implemented | W5 | Restaurant order ID on all human-visible surfaces |
| 23 | BUG-072 | ✅ Implemented | W1 | Notes visible on order card |
| 24 | BUG-073 | ✅ Implemented | W1 | Empty customization wrapper fix |
| 25 | BUG-074 | ✅ Implemented | Post | Remember Me checkbox initialization from localStorage |
| 26 | BUG-075 | ✅ Implemented | W2 | Tip gate — dine-in + walk-in + room only |
| 27 | BUG-076 | ✅ Closed (no code) | — | Duplicate of BUG-051 |
| 28 | BUG-077 | ✅ Closed (no code) | — | Mobile trim already working |
| 29 | BUG-078 | ✅ Implemented | W1 | CRM timeout toast + manual proceed |
| 30 | BUG-079 | ✅ Implemented | W1 | Polling removal threshold → 1 miss |
| 31 | BUG-080 | ✅ Implemented | W3 | Partial payments UI enforcement |
| 32 | BUG-081 | ✅ Closed (no code) | — | Snooze already 120000ms |
| 33 | BUG-082 | ✅ Implemented | W6 | Scan socket index-4 primitive string fix |
| 34 | BUG-083 | ✅ Implemented | W2 | Delivery GST `delivery_charge_gst_amount` key |
| 35 | BUG-084 | 📋 Future sprint | — | Per-component CGST/SGST → POS3.0 |
| 36 | BUG-085 | 📋 Pending backend | — | Print template GST slot → POS3.0 |
| 37 | BUG-086 | ✅ Closed (no code) | — | Room grand-total key confirmed correct |

---

## 3. Wave-by-Wave Implementation Summary

### Wave 1 — Quick Wins (7 bugs)
BUG-062, BUG-073, BUG-066, BUG-067, BUG-079, BUG-078, BUG-072
- All 7 implemented and owner-verified
- Files: `CollectPaymentPanel.jsx`, `CartPanel.jsx`, `TransferFoodModal.jsx`, `StatusConfigPage.jsx`, `useOrderPollingReconciliation.js`, `customerService.js`, `OrderCard.jsx`

### Wave 2 — Financial Core (6 bugs)
BUG-051, BUG-054, BUG-055, BUG-075, BUG-083, BUG-052
- All 6 implemented — highest risk wave (financial calculations)
- Files: `orderTransform.js`, `CollectPaymentPanel.jsx`, `profileTransform.js`

### Wave 3 — Payment / Discount (2 bugs)
BUG-080, BUG-056
- Both implemented
- Files: `CollectPaymentPanel.jsx`

### Wave 4 — Print Cluster (3 bugs)
BUG-050, BUG-057, BUG-059
- All 3 implemented
- Files: `OrderCard.jsx`, `TableCard.jsx`, `OrderEntry.jsx`, `orderTransform.js`, `OrderTable.jsx`, `OrderDetailSheet.jsx`

### Wave 5 — Dashboard Presentation (2 bugs)
BUG-070, BUG-071
- Both implemented
- Files: `DashboardPage.jsx`, `ChannelColumnsLayout.jsx`, `ChannelColumn.jsx`, `OrderCard.jsx`, `OrderEntry.jsx`, `TableCard.jsx`, `OrderTable.jsx`, `OrderDetailSheet.jsx`

### Wave 6 — Socket / Realtime (2 bugs)
BUG-068, BUG-082
- Both implemented
- Files: `socketHandlers.js`, `useSocketEvents.js`, `OrderContext.jsx`, `socketEvents.js`

### Wave 7 — Constraint Resolution (3 bugs — 2 done, 1 carry-forward)
BUG-060 ✅, BUG-061 ✅, BUG-058 🔴
- BUG-060: Temporary FE fix (optimistic clearing + terminal check in `handleUpdateFoodStatus`)
- BUG-061: `createdAt` fallback for in-house room check-in time
- BUG-058: Deferred — PayLater PAID badge needs backend contract clarification
- Files: `OrderEntry.jsx`, `socketHandlers.js`, `RoomRowCard.jsx`, `orderTransform.js`, `CollectBillPanelDrawer.jsx`, `OrderCard.jsx`, `TableCard.jsx`, `ScanOrderPopOut.jsx`, `DashboardPage.jsx`

### Post-Wave Fixes (2 bugs)
BUG-065 ✅, BUG-074 ✅
- BUG-065: CRM customer lookup on room check-in + order screen data flow + read-only fields for room orders
- BUG-074: Remember Me checkbox initialization
- Files: `RoomCheckInModal.jsx`, `OrderEntry.jsx`, `CartPanel.jsx`, `LoginPage.jsx`

---

## 4. QA Handoff — Implemented Bugs (26)

**QA status: NOT YET PASSED. Owner smoke-tested individual waves. Full regression QA pending.**

### Wave 1 QA Checklist
- [ ] Takeaway/delivery → To Room button hidden; dine-in/walk-in → visible
- [ ] Empty customization → no blank line; partial customization → still renders
- [ ] Food transfer modal → rooms not in destination list
- [ ] Station toggle → disabled when no stations; enabled when stations exist
- [ ] Remove server-side order → disappears after 1 poll (~60s)
- [ ] CRM timeout → toast shows; cashier can proceed manually
- [ ] Order card → notes visible when present; absent → no blank space

### Wave 2 QA Checklist
- [ ] Round-off: 105.05 → 106, 105.15 → 106, 100.00 → 100
- [ ] Round-off toggle OFF in profile → raw total used
- [ ] VAT: discounted VAT order recalculates correctly; non-discounted unchanged
- [ ] Discount type: prepaid/update payloads include `order_discount_type`
- [ ] Tip: hidden/zero on takeaway+delivery; visible on dine-in+walk-in+room
- [ ] Delivery GST: `delivery_charge_gst_amount` present for delivery; absent for non-delivery

### Wave 3 QA Checklist
- [ ] Disabled payment mode → not selectable in split UI; payload still has 3 entries
- [ ] Preset discount dropdown → populates from categories; mutually exclusive with manual
- [ ] Selecting preset clears manual input; entering manual clears preset

### Wave 4 QA Checklist
- [ ] Dashboard reprint after discount/tip → matches Collect Bill bill exactly
- [ ] Prepaid order → Print Bill visible on Collect Bill panel + order screen
- [ ] Audit Report → Print Bill on Paid rows; no print on Cancelled rows

### Wave 5 QA Checklist
- [ ] Table View → rooms grouped by area; non-sectioned rooms → "Default" section
- [ ] Channel View → area headers in Dine-In and Room columns
- [ ] Card chip/toast → shows restaurant_order_id (not DB id)
- [ ] `data-testid` → still uses DB orderId

### Wave 6 QA Checklist
- [ ] Disconnect → miss events → reconnect → orders rehydrated without refresh
- [ ] No duplicate orders after reconnect
- [ ] Web order scan popup triggers correctly with new index-4 primitive
- [ ] POS orders do not trigger web popup

### Wave 7 QA Checklist
- [ ] Table order → Pay → To Room → source table immediately "Available" + no order card
- [ ] Table order → Pay → Cash → table correctly freed (regression)
- [ ] Rooms Report → Unpaid → in-house room → check-in time shows
- [ ] Rooms Report → Paid → checked-out room → check-in time still shows (regression)

### Post-Wave QA Checklist
- [ ] Room check-in → type name (2+ chars) → CRM dropdown appears
- [ ] Room check-in → type phone (3+ digits) → CRM dropdown appears
- [ ] Select CRM customer → name + phone + email auto-fill
- [ ] Room order → Order Screen → name + phone pre-populated, read-only, no dropdown
- [ ] Room order → Order Screen → phone shows 10-digit national format (no +91)
- [ ] Login → credentials auto-filled → Remember Me checkbox ticked
- [ ] Non-room orders → name + phone editable as before (regression)

---

## 5. Closure Reports Reference

| Wave | Report Path |
|---|---|
| Wave 1 | `POS2_0_WAVE_1_IMPLEMENTATION_REPORT_2026_05_17.md` |
| Wave 2 | `POS2_0_WAVE_2_IMPLEMENTATION_REPORT_2026_05_17.md` |
| Wave 3 | `POS2_0_WAVE_3_IMPLEMENTATION_REPORT_2026_05_17.md` |
| Wave 4 | `POS2_0_WAVE_4_CLOSURE_REPORT_2026_05_17.md` |
| Wave 5 | `POS2_0_WAVE_5_CLOSURE_REPORT_2026_05_17.md` |
| Wave 6 | `POS2_0_WAVE_6_CLOSURE_REPORT_2026_05_17.md` |
| Wave 7 | `POS2_0_WAVE_7_CLOSURE_REPORT_2026_05_18.md` |
| BUG-065 | `POS2_0_BUG_065_IMPLEMENTATION_REPORT_2026_05_18.md` |

---

*— POS2.0 Sprint Closed — 2026-05-18 —*
