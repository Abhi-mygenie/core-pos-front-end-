# CR-351 — PMS Module: Property Management + Channel Manager Integration
## Room Redesign · Tape Chart · Self Check-in · AIOSELL Sync

**ID:** CR-358 *(renumbered from CR-351 — CR-351 is taken by "Local Printer Setup" IMPLEMENTED)*
**Date:** 2026-08-27
**Status:** INTAKE COMPLETE — DESIGN LOCKED & AUDITED — GATE 2 IMPACT ANALYSIS COMPLETE
**Impact Analysis:** `impact/CR-358_PMS_CHANNEL_MANAGER_IMPACT_ANALYSIS.md`
**Design Spec:** `plans/CR-351_DESIGN_SPEC_2026_08_27.md` (rename to CR-358 pending owner confirmation)
**Priority:** P1
**Risk:** HIGH (new module, AIOSELL API, self check-in, room state machine)
**Area:** Room Module (expanded to full PMS section)
**Sprint:** POS 5.2 (new sprint — this CR initiates it)
**Type:** Feature — New Module

---

## 1. Owner Brief (verbatim)

> "We have one room module where we check in any room. Now we want to integrate it with the channel manager. We want to redesign that check-in screen. From the channel manager we will get the bookings from the online channel, from the different OTAs. These bookings need to be shown. We can have a calendar view and other things. There should be an option to do a booking, like as a walk-in customer, which is different from check-in, and that flows back to the channel manager — that kind of syncing is required. Major focus is on UX — experience which should be easy to use."

---

## 2. Locked Decisions

| ID | Question | Decision |
|---|---|---|
| Q1 | Document verification mandatory? | **Toggle in local settings** (OFF=skip, ON=mandatory). Phase 2: server-side config |
| Q2 | OTA rate override mechanism | **Reason text box** — no PIN. Logged. Not pushed back to AIOSELL |
| Q3 | Self check-in delivery method | **WhatsApp / SMS link** to guest + **cashier tablet** can display for walk-up guests |
| Q4 | Housekeeping not enabled → room state | **Direct → AVAILABLE** after check-out |
| Q5 | Room assignment from AIOSELL | **Room Type only** — staff assigns specific room number at check-in |
| D1 | Walk-in vs phone booking flow | Walk-in = **Book + Check-In combined**. Phone/OTA = booking only; check-in on arrival |
| D2 | Channel manager | **AIOSELL** via core engine controller API. Same API handles future channel managers |
| D3 | Billing / folio | **Unchanged** — existing settlement module handles it. No changes to that flow |
| D4 | Tape chart rows | **Both** — grouped by Room Type, individual room numbers within each group |
| D5 | Device priority | **Both** tablet (1024px) and desktop |

---

## 3. New Sidebar Section

```
Rooms & Reservations (new sidebar section)
├── Front Desk           ← today's snapshot (arrivals/departures/occupancy)
├── Reservations         ← Tape Chart calendar
├── In-House Guests      ← currently checked-in guests
├── Room Status          ← housekeeper / operational board
└── Channel Manager      ← AIOSELL sync panel
```

Existing Room check-in modal is **replaced** by this full section.

---

## 4. Five Core Flows

### Flow 1 — OTA Booking (Automated, no staff action needed)
```
AIOSELL receives booking (Booking.com / Expedia / Airbnb / MakeMyTrip etc.)
  → Core Engine API → PMS creates Reservation
  → Status: CONFIRMED · Source: OTA badge · Room Type assigned · Room Number: UNASSIGNED
  → Appears on Tape Chart under Room Type row as grey "Unassigned" block
  → Appears on Front Desk → "Today's Arrivals"
  → Guest arrives → staff clicks → Check-In Flow (Flow 3)
```

### Flow 2 — Walk-In (Book + Check-In combined, same session)
```
[+ New Booking] →
  Step 1: Pick dates + room type (live availability from AIOSELL inventory)
  Step 2: Select specific room from available in that type
  Step 3: Guest details (name, phone, ID upload) + rate (editable, no lock)
  Step 4: Advance payment (optional)
  Fork: [Save as Booking] OR [Book & Check In Now]
    → Save: Reservation created, AIOSELL inventory updated
    → Book & Check In: pre-fills Check-In flow immediately
```

### Flow 3 — Staff-Led Check-In
```
Find reservation (arrivals list / search by name / booking ID / room)
  → Reservation card opens — all OTA data pre-filled
  → Document step (if toggle ON): staff scans / uploads guest ID → OCR extracts fields → confirm
  → Document step (if toggle OFF): skipped entirely
  → Staff assigns specific room number (from available rooms in that type)
  → Rate:
      OTA booking → locked [AIOSELL badge] + [Override] → reason text box (logged, not pushed to AIOSELL)
      Walk-in / direct → fully editable
  → [CHECK IN GUEST] (large green full-width button)
  → Room → OCCUPIED · Tape chart block moves to specific room row · AIOSELL notified
```

### Flow 4 — Self Check-In (Guest-Led)
```
Trigger A: Guest receives WhatsApp/SMS with link at booking confirmation
Trigger B: Staff opens reservation → [Send Self Check-In Link] → WhatsApp/SMS sent
Trigger C: Cashier tablet shows QR code / link for walk-up guest

Guest flow (3 steps, mobile web — no app):
  Step 1: Scan ID (camera) OR upload photo
         → Only shown if Doc Toggle = ON
         → Skipped if Doc Toggle = OFF
  Step 2: Confirm booking details (pre-filled: name, room, dates, balance)
  Step 3: Confirmation screen (room number, check-out date, WiFi, balance due)

Backend: PMS marks CHECKED IN · Front desk gets live ping notification
Constraint: Room number MUST be pre-assigned by staff before self-CI link is activated
```

### Flow 5 — Check-Out
```
In-House list → find guest → [Check Out]
  → Folio (existing settlement module — no changes)
  → Collect payment
  → [CONFIRM CHECK OUT]
  → Housekeeping enabled?
      YES → Room → HOUSEKEEPING (blocked for new bookings)
             Phase 2: HK checklist before marking clean
             Staff taps [Mark Clean] → Room → AVAILABLE
      NO  → Room → AVAILABLE immediately
  → AIOSELL notified → room type available for new bookings
```

---

## 5. Screens (6 total)

### Screen 1 — Front Desk Dashboard
- 4 KPI cards: Occupancy %, Arrivals Today, Departures Today, In-House count
- Today's Arrivals list with OTA badge + one-tap [CHECK IN] per guest
- Today's Departures list with outstanding balance
- Channel Sync status widget (AIOSELL last sync timestamp + [Sync Now])

### Screen 2 — Reservations Calendar (Tape Chart)
- Gantt-style grid: rows = rooms (grouped by type), columns = dates
- Sticky first column (room details), sticky header row (dates)
- Navigation: Previous/Next week, view toggles (Month/Week/Day)
- Reservation blocks: absolute-positioned, colour-coded by OTA source
- UNASSIGNED section at top for OTA bookings without room assignment
- Click block → slide-over with guest details + actions
- Click empty cell → pre-filled New Booking form
- Drag block → reschedule with confirmation prompt
- OTA colour system (non-negotiable):
  - Booking.com: `#003580` (dark blue)
  - Expedia: `#FFC917` (yellow, dark text)
  - Airbnb: `#FF5A5F` (coral)
  - Walk-in: `#10B981` (emerald)
  - Phone/Direct: `#8B5CF6` (purple)

### Screen 3 — New Booking Form
- Split layout: Left = booking details, Right = room selector
- Date range → room type filter → available rooms shown with rate from AIOSELL
- Guest details: name, phone, ID type + number, ID upload
- Rate field: editable (walk-in) or locked with source badge (OTA)
- Advance payment field (optional)
- Fork buttons: [Save as Booking] / [Book & Check In Now]

### Screen 4 — Check-In Screen (redesigned)
- Split layout: Left = guest verification, Right = room assignment + summary
- Pre-filled from OTA/booking data
- Document section gated by settings toggle
- Rate display with override option (reason text) for OTA bookings
- Large green [CHECK IN GUEST] primary action

### Screen 5 — Room Status Board
- Grid: 2-col mobile → 4-col tablet → 6-col desktop
- Each card: Room number, Type, Status, Guest name (if occupied), action button
- States: AVAILABLE (emerald) / BOOKED (blue-light) / OCCUPIED (blue) / HOUSEKEEPING (amber) / OUT OF ORDER (red)
- Staff can tap: [Mark Clean] on HK rooms / [Resolve] + note on OOO rooms
- Filter bar: All / Available / Occupied / Housekeeping / OOO

### Screen 6 — Channel Manager Panel
- AIOSELL connection status with live pulse indicator (green = active, red = error)
- Inventory summary: rooms available tonight / pushed to AIOSELL ✓
- Pending bookings sync queue
- Last sync timestamp (prominent)
- [↻ Sync All Now] + [View Sync Log]
- Placeholder rows for future channel managers (MakeMyTrip, Goibibo etc.)

---

## 6. Room State Machine

```
AVAILABLE → BOOKED (AIOSELL blocks room type inventory)
BOOKED    → OCCUPIED (check-in)
OCCUPIED  → HOUSEKEEPING (check-out, HK enabled)
OCCUPIED  → AVAILABLE (check-out, HK disabled)
HOUSEKEEPING → AVAILABLE (staff marks clean / Phase 2: HK checklist)
Any state → OUT OF ORDER (staff manual, anytime)
OUT OF ORDER → previous state (staff resolves)
```

---

## 7. Document Verification Rules

| Guest Type | If toggle ON | If toggle OFF |
|---|---|---|
| Indian National | Aadhaar OR Driving License (mandatory) | Skipped |
| Foreign National | Passport (mandatory) | Skipped |
| Corporate | Company ID + Aadhaar (mandatory) | Skipped |

- Capture modes: camera scan (OCR auto-extract) or file upload
- Applies to both staff-led and self check-in flows

---

## 8. Rate Override Rules

| Booking Source | Override Allowed? | Mechanism | Pushed to AIOSELL? |
|---|---|---|---|
| OTA (Booking.com, Expedia etc.) | Yes | Reason text box, logged | NO (local override only) |
| Walk-in / Direct / Phone | Yes, freely | Plain editable field | YES (as direct booking rate) |

---

## 9. WhatsApp / SMS Message Templates

**Booking confirmation (sent immediately):**
```
Hi [Name], your booking at [Hotel] is confirmed.
📅 [CheckIn] → [CheckOut] ([N] nights) · 🛏 [Room Type]
💰 Balance due: ₹[Amount]
Check in when you arrive: [Self-CI link]
```

**Room ready notification (sent when staff assigns room):**
```
Your room is ready! Room [Number], Floor [N].
Tap to complete check-in: [Self-CI link]
```

---

## 10. Phase Breakdown

| Feature | This Phase (CR-351) | Phase 2 |
|---|---|---|
| Front Desk Dashboard | ✅ | — |
| Tape Chart Calendar | ✅ | Drag-to-reschedule |
| New Booking form | ✅ | — |
| Staff-led Check-In (redesigned) | ✅ | — |
| Self Check-in (WhatsApp/SMS + tablet) | ✅ | — |
| Check-Out flow | ✅ | — |
| Room Status Board | ✅ (status only) | HK checklist |
| Channel Manager Panel (AIOSELL) | ✅ | Multi-channel picker |
| Document toggle (local settings) | ✅ | Server-side config |
| Rate override (reason text) | ✅ | Manager approval workflow |
| Folio / billing | Unchanged | — |

---

## 11. Artifacts

| Gate | Doc | Status |
|---|---|---|
| Gate 1 — Intake | This document | ✅ COMPLETE |
| Gate 2 — Design Review | `impact/CR-351_IMPACT_ANALYSIS.md` | ✅ COMPLETE (design session 2026-08-27) |
| Gate 3 — Implementation Plan | `plans/CR-351_IMPLEMENTATION_PLAN.md` | ⏳ Next session |
| Gate 4 — Implementation | — | — |
| Gate 5 — QA | — | — |
| Gate 6 — Owner Smoke | — | — |

---

*Intake session: 2026-08-27 | Design locked: 2026-08-27*
