# New Issues Highlighted — Investigation Session 2026-09-16
## Pending Intake Registration (owner to call intake agent)

These were discovered during BUG-422/423 investigation. Not yet registered.
Owner may fold into existing CRs or register as new BUG IDs.

---

## HIGHLIGHT-1 — Folio LHS Missing "Room Orders" Section

**What is missing:**
The folio page (`/pms/folio/:id`) LHS currently shows:
- Guest & Stay Details
- Payments Received
- F&B Posted to Room (transferred orders only)

It is **missing a "Room Orders" section** for food/beverage ordered directly at the room's own table.

**What it should show (owner confirmed):**
| Column | Detail |
|--------|--------|
| Item name | e.g. jeera rice |
| Quantity | e.g. x1 |
| Rate | e.g. ₹100 |
| GST (if applicable) | e.g. SGST ₹3.50, CGST ₹3.50 |
| Total | e.g. ₹107 |
| Date | e.g. 16 Sept 2026 |
| **Room Orders Total** | sum of all items |

Row click → **expand inline** to show full item breakdown (owner confirmed Q2).

**Reference:** Dashboard checkout (Screen 3) correctly shows "ROOM ORDERS" section with item detail. Same data, different screen.

**Data source:**
`SINGLE_ORDER_NEW` returns `raw.items[]` — these are the room-native food items. Currently `folioTransform.fromAPI` maps only `raw.associated_order_list` (transferred orders). `raw.items[]` is not mapped for folio display.

Filter needed: exclude check-in marker items (same filter as `CollectPaymentPanel` `isCheckInMarker` guard).

**Suggested ID:** BUG-424
**Suggested severity:** P1 (key folio information missing)
**Risk:** MEDIUM (display only, no financial write)

---

## HIGHLIGHT-2 — PmsCheckoutDrawer ROOM Balance Excludes GST

**What is wrong:**
When checkout is opened from the folio page, the PmsCheckoutDrawer shows:
- ROOM: ₹1,000 ❌ (missing GST ₹50)
- Grand Total: ₹1,214 ❌ (should be ₹1,264)

Dashboard checkout (old module) correctly shows:
- ROOM: ₹1,050 ✅
- Grand Total: ₹1,264 ✅

**Root cause:**
`CollectPaymentPanel` computes `roomBalance = roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment`.

PmsCheckoutDrawer fetches fresh via `SINGLE_ORDER_NEW` → backend returns `remaining_room_balance = 1,000` (backend calculation excludes GST). CollectPaymentPanel **prefers this** over `balance_payment = 1,050`.

Dashboard checkout uses cached order data which may not have `room_payment_summary` → falls back to `balance_payment = 1,050` → shows correctly.

**Confirmed fix path:** Path A (owner confirmed 2026-09-16)
Override `roomInfo` inside PmsCheckoutDrawer before passing to CollectPaymentPanel:
Compute `remainingRoomBalance = roomPrice + gstTax − advancePayment − receiveBalance`
All four fields are available in `detail.roomInfo` (from `orderFromAPI.order(raw)`).
Does NOT touch `CollectPaymentPanel` (hotspot R5 avoided).

**Test scenarios required (owner noted — all must be tested):**
- Guest with advance paid (e.g. room ₹1,000 + GST ₹50 − advance ₹130 = ROOM ₹920)
- Guest with mid-stay payment received
- Guest with zero advance
- Guest with F&B posted (room + transferred + room-native)
- Guest checked in via old modal vs new CheckInPage

**Suggested ID:** BUG-425
**Suggested severity:** P1 (checkout shows wrong amount to cashier)
**Risk:** HIGH (financial display, checkout amount)
**Dependency:** BUG-423 (folio room balance formula) should go first or in same batch

---

## Decision Log — Investigation Session 2026-09-16

| # | Decision | Confirmed |
|---|----------|-----------|
| BUG-422 corrected | Old modal balance_payment MUST include GST. Fix: add gstTax useMemo to RoomCheckInModal + wire into balancePayment useMemo. New CheckInPage stays as-is (already correct). | ✅ Owner confirmed |
| BUG-423 false flag retracted | "Double-count" in checkout was two genuine separate orders (different dishes, same price). Not a bug. | ✅ Owner confirmed |
| G1 row click | Expand inline (no navigation) | ✅ Owner confirmed |
| G4 fix path | Path A — compute inside PmsCheckoutDrawer, don't touch CollectPaymentPanel | ✅ Owner confirmed |
| G4 testing | All scenarios must be tested when implemented | ✅ Owner confirmed |
