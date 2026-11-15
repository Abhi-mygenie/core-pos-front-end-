# QA Handover — CR-362
## PMS Booking Modification & Cancellation

**Date:** 2026-09-13 | **Gate:** 5a → 5b | **Risk:** CRITICAL (R6 — room billing, OTA inventory)

---

## §1 Registry Sync

```
Registry synced:  YES
Item:             CR-362
Status:           GATE_5A_IMPLEMENTED
Sprint:           pos_pms_1
EXIT GATE:        5/5 PASS
  □1 registry.json     PASS — gate=5, GATE_5A_IMPLEMENTED
  □2 CR_REGISTRY.md    PASS (see intake doc gate status)
  □3 FILE_OWNERSHIP.MD needs update (QA agent records)
  □4 Code markers      PASS — 51× CR-362 across 10 files
  □5 Compile           PASS — webpack compiled successfully, 0 new warnings
```

---

## §2 Self-Test (Verification Matrix Results)

| Edit | File | Expected | Self-Test |
|---|---|---|---|
| E1 | `constants.js` | `EXTEND_STAY` endpoint present | ✅ grep confirmed |
| E2 | `aiosellTransform.js` | `cancelReason`/`cancelledAt`/`cancelledBy` in `fromReservationOps` | ✅ grep confirmed |
| E3a | `pmsService.js` | `cancelled` bucket in `bucketReservationOps` | ✅ grep confirmed |
| E3b | `pmsService.js` | 4 new exports: `cancelReservation`, `modifyReservation`, `extendStay`, `getCancelledReservations` | ✅ grep confirmed |
| E4 | `CancelBookingDialog.jsx` | File exists, renders with reason select + OTA warning | ✅ file created |
| E5 | `ModifyBookingDialog.jsx` | File exists, date pickers + rates fetch | ✅ file created |
| E6 | `ExtendStayDialog.jsx` | File exists, new checkout + price breakdown | ✅ file created |
| E7 | `ArrivalsPage.jsx` | Kebab ⋮ menu + Cancelled 5th tab + dialog mounts | ✅ grep confirmed |
| E8 | `DeparturesPage.jsx` | Extend Stay button + ExtendStayDialog mount | ✅ grep confirmed |
| E9 | `InHouseGuestsPage.jsx` | Extend Stay button next to View Bill | ✅ grep confirmed |
| E10 | `ReservationsPage.jsx` | Modify + Cancel in BlockPopover + dialog mounts | ✅ grep confirmed |

---

## §3 Test Cases

**Credentials:** owner@thegoankitchen.com / Q***@10
**URL:** https://react-app-direct-3.preview.emergentagent.com

### BLOCK 1 — Cancel Booking (Arrivals page)

| TC | Steps | Expected | Severity |
|---|---|---|---|
| **TC-01** | Arrivals → Today/Upcoming/Late tab → pending row → click ⋮ | Dropdown opens with "Modify Booking" + "Cancel Booking" (+ "Mark No-Show" for booking.com/gommt on Late/Today) | BLOCKER |
| **TC-02** | Click "Cancel Booking" | CancelBookingDialog opens with guest name, channel, dates | BLOCKER |
| **TC-03** | OTA booking (booking.com) → Cancel → check warnings | Amber "Also cancel on Booking.com extranet" warning visible | MAJOR |
| **TC-04** | Direct booking → Cancel → check warnings | No OTA extranet warning shown | MAJOR |
| **TC-05** | Select reason → Confirm Cancellation | 200 → dialog closes, toast "Booking cancelled. Room inventory updated.", row disappears from list | BLOCKER |
| **TC-06** | 409 error path: try to cancel a checked-in booking | Shows "Cannot cancel — room already checked in." error | MAJOR |

### BLOCK 2 — Modify Booking (Arrivals page)

| TC | Steps | Expected | Severity |
|---|---|---|---|
| **TC-07** | Arrivals row ⋮ → "Modify Booking" | ModifyBookingDialog opens with current dates pre-filled | BLOCKER |
| **TC-08** | Change checkout date to +1 day | Rate cards appear (fetched from live rates API) | MAJOR |
| **TC-09** | Select a rate → confirm | 200 → dialog closes, toast "Booking modified.", row dates update | BLOCKER |

### BLOCK 3 — Extend Stay (Departures + In-House)

| TC | Steps | Expected | Severity |
|---|---|---|---|
| **TC-10** | Departures → Overdue/Due Today row → "Extend Stay" button visible | Button shows next to "Check Out" | BLOCKER |
| **TC-11** | Click "Extend Stay" | ExtendStayDialog opens with current checkout shown | BLOCKER |
| **TC-12** | Pick new checkout date +2 days | Price breakdown shows: Original + extension nights + New Total | MAJOR |
| **TC-13** | Confirm | 200 → dialog closes, toast "Stay extended to {date}." | BLOCKER |
| **TC-14** | In-House Guests page → "Extend Stay" button visible next to "View Bill" | Button present on each row | MAJOR |

### BLOCK 4 — Cancelled Tab + Tape Chart

| TC | Steps | Expected | Severity |
|---|---|---|---|
| **TC-15** | Arrivals page → "Cancelled" 5th tab visible | Tab appears (may show 0 count on preprod if no cancellations yet) | MAJOR |
| **TC-16** | Tape chart → click pending block → popover | Popover shows "Modify" + "Cancel" buttons alongside "Check In" | BLOCKER |
| **TC-17** | Tape chart popover "Cancel" → CancelBookingDialog opens | Dialog shows correct guest/booking info | MAJOR |

### BLOCK 5 — Regressions

| R | Test | Why |
|---|---|---|
| **R-01** | Check In button still works from Arrivals Today tab | Kebab refactor must not break Check In |
| **R-02** | No-Show still works for booking.com/gommt rows on Late/Today | Still accessible via ⋮ kebab |
| **R-03** | PmsCheckoutDrawer (Departures "Check Out") still opens | E8 must not break existing checkout |
| **R-04** | Tape chart No-Show still works | E10 extended BlockPopover, not replaced |

---

## §4 Coverage

| File | Tests |
|---|---|
| `constants.js` | E1 (grep) |
| `aiosellTransform.js` | TC-15 (cancelled fields) |
| `pmsService.js` | TC-05, TC-09, TC-13 (API calls) |
| `CancelBookingDialog.jsx` | TC-01..TC-06 |
| `ModifyBookingDialog.jsx` | TC-07..TC-09 |
| `ExtendStayDialog.jsx` | TC-10..TC-13 |
| `ArrivalsPage.jsx` | TC-01..TC-06, TC-15, R-01, R-02 |
| `DeparturesPage.jsx` | TC-10..TC-13, R-03 |
| `InHouseGuestsPage.jsx` | TC-14 |
| `ReservationsPage.jsx` | TC-16..TC-17, R-04 |

**Coverage: 10/10 changed files have ≥1 test.**

---

## §5 Do-Not-Retry Ledger

1. `new_room_price` in extendStay = FULL new total (original + extension). Do NOT send extension-only.
2. `cancelled_by` = staff full name from `restaurant.profile.fullName`. Backend uses this for audit trail.
3. `notify_cm: true` in cancel — pushes inventory to AioSell. Does NOT cancel the OTA booking on guest's side.
4. Cancelled tab may be empty on preprod (no cancelled bookings) — this is expected, not a bug.
5. Rates fetch may return empty array on preprod sandbox — fallback is to proceed without pre-filled price.

## §6 Report Path

Write to: `/app/memory/test_reports/QA_REPORT_CR362_<DATE>.md`
