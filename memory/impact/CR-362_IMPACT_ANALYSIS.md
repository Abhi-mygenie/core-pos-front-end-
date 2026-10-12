# CR-362 Impact Analysis — Gate 2
## PMS — Booking Modification & Cancellation

**Date:** 2026-09-13
**Role:** PLANNING AGENT (ALPHA v0.7) — Gate 2 only
**Sprint:** pos_pms_1 | **Risk:** CRITICAL (money, inventory, OTA contract)

---

## Header

```
Code Reality:       NONE — zero CR-362 code exists in src/
Conflict Pre-Check: PARALLEL-SAFE — constants.js + pmsService.js both additive; execution order CR-362 → CR-365
```

---

## 1. Code Reality Check (Step 0)

Grep confirmed: `cancelReservation`, `modifyReservation`, `extendStay`, `CancelBookingDialog`,
`ModifyBookingDialog`, `ExtendStayDialog`, `Cancelled` tab in ArrivalsPage — **none exist**.

`AIOSELL_ENDPOINTS` in `constants.js` has: `LOCAL_RESERVATIONS`, `MARK_NO_SHOW`, `FETCH_RATES`.
Missing: `CANCEL_RESERVATION`, `MODIFY_RESERVATION`, `EXTEND_STAY`.

`bucketReservationOps` in `aiosellTransform.js` has 4 buckets: arrivalsToday/Upcoming/Late/checkedInToday.
Missing: `cancelled` bucket.

ArrivalsPage has 4 tabs: Today / Upcoming / Late / Checked In.
Missing: Cancelled (5th tab).

Row actions in ArrivalsPage: Check In + No-Show (booking.com/gommt only).
Missing: Cancel + Modify.

Row actions in DeparturesPage: Check Out + Receipt.
Missing: Extend Stay.

Row actions in InHouseGuestsPage: View Bill.
Missing: Extend Stay.

---

## 2. Conflict Pre-Check (Step 1)

| File | Last Modified By | Date | Open Conflict? |
|---|---|---|---|
| `api/constants.js` | CR-359 (additive) | 2026-09-02 | NO — additive |
| `api/services/pmsService.js` | BUG-396 E3 + CR-380 E-P1/P2 | 2026-09-14 | NO — additive new exports |
| `api/transforms/aiosellTransform.js` | BUG-377 (CR-358-P1) | 2026-09-02 | NO — additive bucket |
| `pages/pms/ArrivalsPage.jsx` | CR-358-P5 (No-Show dialog) | 2026-09-09 | NO — QA PASS |
| `pages/pms/DeparturesPage.jsx` | CR-358-P3 | 2026-09-04 | NO — QA PASS |
| `pages/pms/InHouseGuestsPage.jsx` | CR-360 | 2026-09-03 | NO — QA PASS |
| `pages/pms/ReservationsPage.jsx` | CR-358-P5 | 2026-09-09 | NO — QA PASS |
| `components/pms/CancelBookingDialog.jsx` | NOT CREATED | — | N/A — new file |
| `components/pms/ModifyBookingDialog.jsx` | NOT CREATED | — | N/A — new file |
| `components/pms/ExtendStayDialog.jsx` | NOT CREATED | — | N/A — new file |

**CR-365 conflict note:**
- `constants.js`: CR-365 also adds endpoints. **Parallel-safe** (different sections).
- `pmsService.js`: CR-365 intake says "hkService.js (NEW) or pmsService.js". Gate 3 for CR-365 MUST use `hkService.js` (new file) to eliminate conflict. If pmsService.js is chosen: **implement CR-362 first**.
- No shared page files. Zero execution-order dependency beyond the above.

**Execution order declared: CR-362 → then CR-365.**

---

## 3. Risk Classification

**CRITICAL**
- R6 trigger: `extendStay` sends `new_room_price` → backend updates `orders.room_info.room_price` + `balance_payment`. Financial data directly changed.
- OTA inventory: `notify_cm: true` pushes room availability to channel manager. If misconfigured, inventory drifts.
- R3 trigger: OTA booking cancellation on guest side is NOT handled by backend (OD-362-02 locked). FE must warn staff clearly. Business rule cannot be invented.

Full gate flow + owner approval at Gate 4 required. No fast lane.

---

## 4. Data Flow Trace

### 4A — Cancel Booking

```
Staff: ArrivalsPage or ReservationsPage → "Cancel" button
  → CancelBookingDialog opens
      - Reason dropdown → GET /api/v1/vendoremployee/cancellation-reasons (existing endpoint)
      - OTA warning banner (if channel = booking.com / gommt / goibibo / WalkIn=no)
      - Advance refund note: "Refund ₹{row.advance} to guest manually" (if advance > 0)
      - Confirm → pmsService.cancelReservation(reservationId, { reason, cancelled_by, notify_cm: true })
  → POST /api/v2/vendoremployee/aiosell/local-reservations/{id}/cancel
      Response: 200 → reservation status = cancelled
                409 → "Room already checked in — cannot cancel" (backend guard)
  → Success: remove row from Today/Upcoming/Late list
             row now appears in Cancelled tab
             toast: "Booking cancelled. Inventory updated."
  → After refetch: tape chart block disappears
```

Break point if FE does NOT warn about OTA: staff thinks it's fully cancelled but guest still has active Booking.com reservation.

### 4B — Modify Booking (pending only)

```
Staff: ArrivalsPage row → "Modify" button (Today/Upcoming/Late tabs)
  → ModifyBookingDialog opens
      - Checkin date picker (pre-filled with row.checkin)
      - Checkout date picker (pre-filled with row.checkout)
      - On date change → pmsService.getRatesData({ startDate: newCheckin, endDate: newCheckout })
          → shows available room rates (rate plan × nights)
      - Price field: editable, pre-filled from fetched rate
      - Reason text input
      - Confirm → pmsService.modifyReservation(reservationId, { checkin, checkout, amount_after_tax, reason })
  → PATCH /api/v2/vendoremployee/aiosell/local-reservations/{id}
      Body: { checkin?, checkout?, amount_after_tax?, reason }
      Response: 200 → updated reservation
                409 → "Cannot modify checked-in booking"
  → Success: toast, row dates update in Arrivals list, tape chart block resizes (refetch)
```

### 4C — Extend Stay (in-house)

```
Staff: DeparturesPage or InHouseGuestsPage row → "Extend Stay" button
  → ExtendStayDialog opens
      - Current checkout date displayed (read-only)
      - New checkout date picker (min: tomorrow)
      - On date change → pmsService.getRatesData({ startDate: row.checkout, endDate: newCheckout })
          → extension nights rate shown
      - New room price: auto-calculated (existing nights price + extension rate × nights)
            OR manual override input
      - Reason input
      - Confirm → pmsService.extendStay({ orderId: row.orderId, newCheckoutDate, newRoomPrice, reason })
  → POST /api/v2/vendoremployee/pos/room-extend-stay
      Body: { order_id, new_checkout_date, new_room_price, reason }
      Response: 200 → order + reservation + inventory updated (atomic on backend)
  → Success: toast "Stay extended to {newDate}", row checkout date updates
```

**R6 NOTE:** `new_room_price` changes `orders.room_info.room_price` + `balance_payment` on the backend. The price passed from FE is the TOTAL new room price (all nights combined), not just the extension. Gate 3 plan must specify exactly: is `new_room_price` = original + extension OR full replacement? Confirm with backend at Gate 3.

### 4D — Cancelled Tab

```
GET /api/v2/vendoremployee/aiosell/local-reservations?status=cancelled
  → aiosellTransform: fromReservationOps adds { cancelReason, cancelledAt } from r.cancel_reason / r.cancelled_at
  → bucketReservationOps adds:
      cancelled: list.filter(r => r.operationalStatus === 'cancelled').sort(byCheckin desc)
  → ArrivalsPage: 5th tab "Cancelled" renders cancelled rows
      - Shows: guest name, booking ID, channel, original checkin/checkout, cancel reason, cancelled_at date
      - No actions on cancelled rows
```

---

## 5. Affected Files

| # | File | Type | Change Summary | Risk |
|---|---|---|---|---|
| F1 | `api/constants.js` | MODIFY | +3 endpoints in `AIOSELL_ENDPOINTS`: `CANCEL_RESERVATION`, `MODIFY_RESERVATION`, `EXTEND_STAY` | LOW |
| F2 | `api/services/pmsService.js` | MODIFY | +4 exports: `cancelReservation(id, {reason, cancelled_by, notify_cm})`, `modifyReservation(id, {checkin, checkout, amount_after_tax, reason})`, `extendStay({orderId, newCheckoutDate, newRoomPrice, reason})`, `getCancelledReservations()` | HIGH |
| F3 | `api/transforms/aiosellTransform.js` | MODIFY | `fromReservationOps`: +`cancelReason`, `cancelledAt` fields. `bucketReservationOps`: +`cancelled` bucket (filter `operationalStatus === 'cancelled'`) | MEDIUM |
| F4 | `pages/pms/ArrivalsPage.jsx` | MODIFY | +Cancel + Modify buttons per pending row (Today/Upcoming/Late tabs); +Cancelled 5th tab; +CancelBookingDialog + ModifyBookingDialog mounts; No-Show button: existing, untouched | HIGH |
| F5 | `pages/pms/DeparturesPage.jsx` | MODIFY | +Extend Stay button per row (Overdue/Due/Upcoming tabs); +ExtendStayDialog mount | HIGH |
| F6 | `pages/pms/InHouseGuestsPage.jsx` | MODIFY | +Extend Stay button per row; +ExtendStayDialog mount | HIGH |
| F7 | `pages/pms/ReservationsPage.jsx` | MODIFY | +Cancel + Modify in `BlockPopover` (tape chart popover) alongside existing Check In + No-Show | HIGH |
| F8 | `components/pms/CancelBookingDialog.jsx` | NEW | Reason picker (CANCELLATION_REASONS) + OTA extranet warning (channel-gated) + advance refund note + confirm/cancel buttons | CRITICAL |
| F9 | `components/pms/ModifyBookingDialog.jsx` | NEW | Checkin/checkout date pickers + fetch-rates call + price selector + reason input + confirm | CRITICAL (R6) |
| F10 | `components/pms/ExtendStayDialog.jsx` | NEW | New checkout date picker + fetch-rates + new_room_price display/override + reason input + confirm | CRITICAL (R6) |

**Files NOT touched:**
`CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `orderTransform.js`, `CheckInPage.jsx`,
`App.js` (no new routes — all dialogs are inline modals), `Sidebar.jsx`,
`PmsCheckoutDrawer.jsx`, `RoomCheckInModal.jsx`, `roomStatusTransform.js`

---

## 6. Owner Decisions — All Locked ✅

*(From Intake doc, all locked 2026-09-13)*

| OD | Decision |
|---|---|
| OD-362-01 | Show "Refund ₹{advance} manually" note. No API refund. |
| OD-362-02 | Local cancel allowed. `notify_cm: true`. OTA extranet warning shown for OTA channels. |
| OD-362-03 | Live `fetch-rates` for new dates. Staff sees rate → confirms. |
| OD-362-04 | No permission gating in v1. |
| OD-362-05 | Reuse `CANCELLATION_REASONS` endpoint. |
| OD-362-06 | No early checkout feature. Existing PmsCheckoutDrawer handles it. |

---

## 7. Open Questions for Gate 3

*(All 3 answered by owner 2026-09-13 — Gate 3 fully unblocked)*

| Q | Answer | FE implementation |
|---|---|---|
| **Q1 ✅** `new_room_price` in extend-stay | **New full total** (original + extension nights combined). Example: ₹5,000 existing + ₹2,500 extra night = send ₹7,500. Backend replaces. | ExtendStayDialog shows `currentPrice + (fetchedRate × extraNights)` as new total |
| **Q2 ✅** `cancelled_by` in cancel booking | **Logged-in staff full name** → `restaurant.profile.fullName` (same pattern as food cancel audit trail — `emp_f_name + emp_l_name` from profileTransform.js:89) | CancelBookingDialog reads from RestaurantContext/AuthContext |
| **Q3 ✅** `amount_after_tax` in modify booking | **New full stay total** (fetched rate × new number of nights). FE fetches live rates, multiplies by new nights, sends total. | ModifyBookingDialog shows new total to staff for confirmation before sending |

---

## 8. Verification Matrix (seeds QA)

| # | File | Verification | Method |
|---|---|---|---|
| 1 | `constants.js` F1 | 3 new endpoint constants present | Code grep |
| 2 | `pmsService.js` F2 | 4 new exports callable; correct HTTP method + URL | Code trace |
| 3 | `aiosellTransform.js` F3 | `cancelled` bucket populated; `cancelReason`/`cancelledAt` mapped | Code trace + live cancel test |
| 4 | `ArrivalsPage.jsx` F4 | Cancel button → dialog opens; OTA warning visible for booking.com; refund note shows if advance > 0; post-cancel row disappears | Browser (preprod) |
| 5 | `ArrivalsPage.jsx` F4 | Modify button → dialog opens; date change fetches rates; confirm → checkin/checkout updated | Browser (preprod) |
| 6 | `ArrivalsPage.jsx` F4 | Cancelled 5th tab shows cancelled bookings with reason | Browser (preprod) — needs sandbox seed |
| 7 | `DeparturesPage.jsx` F5 | Extend Stay button → dialog → new checkout + price → confirm → toast | Browser (preprod) |
| 8 | `ReservationsPage.jsx` F7 | Tape block popover shows Cancel + Modify options | Browser (preprod) |
| 9 | `CancelBookingDialog.jsx` F8 | 409 from backend (checked-in booking) → shows error, does not close dialog | Browser |
| 10 | `ExtendStayDialog.jsx` F10 | `new_room_price` payload value matches expected (pending Q1 clarification) | Network tab |

---

## 9. Registry Checklist (for Implementation Agent)

```
- [ ] registry.json: CR-362 → status: GATE_5A_IMPLEMENTED, sprint_key: pos_pms_1
- [ ] CR_REGISTRY.md: row updated to Gate 5
- [ ] FILE_OWNERSHIP.md: F1..F10 entries added with CR-362 + date
- [ ] Code markers: // CR-362 in every modified/new file
- [ ] Compile: webpack 0 new warnings
```

---

---

## 10. Gate 2.5 — Design Decisions (LOCKED 2026-09-13)

**Design comparison page:** `public/cr362-design-comparison.html`

| Decision | Question | Owner Choice | Locked |
|---|---|---|---|
| **D1** | Arrivals row — how to fit Cancel + Modify + No-Show? | **Option A — Kebab `⋮` dropdown.** Check In stays green primary. All secondary actions (Modify / Cancel / No-Show) collapse into `⋮` overflow menu. Max 2 elements per row always. | ✅ |
| **D2** | Modify Booking + Extend Stay UI format | **Modal Dialog** (not slide-over drawer). Compact — date pickers + rate fetch + confirm in a standard dialog. Consistent with `NoShowDialog` pattern. | ✅ |
| **D3** | Cancelled tab columns | **Approved as shown:** Channel · Guest · Room Type · Was Booked (dates) · Reason · Cancelled By · Date Cancelled. Read-only, no action buttons. | ✅ |

**Gate 2.5 CLOSED. Ready for Gate 3 GO.**
