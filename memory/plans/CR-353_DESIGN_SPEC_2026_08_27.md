# CR-351 — PMS Module: Complete Design Specification
## Property Management System + Channel Manager Integration

**CR ID:** CR-351
**Design Session:** 2026-08-27
**Status:** GATE 2 COMPLETE — DESIGN LOCKED & AUDITED
**Mockups Location:** `/app/frontend/public/pms/`
**Live Preview Base:** `https://react-app-deploy-7.preview.emergentagent.com/pms/`
**Next Gate:** Gate 3 — Implementation Plan (requires AIOSELL API spec from backend team)

---

## 1. Context & Problem Statement

The existing app has a single `RoomCheckInModal.jsx` — a modal triggered from `DashboardPage.jsx` when a room order card is clicked. This is the **only** room management UI.

**CR-351 expands this into a full PMS section** with:
- Channel Manager integration (AIOSELL)
- Tape chart calendar (OTA bookings visible)
- Separate booking vs check-in flows
- Self check-in (guest-led, WhatsApp/SMS)
- Room status board
- Dedicated arrivals and departures list pages

The existing `CollectPaymentPanel.jsx` (which already handles room checkout when `isRoom=true`) is **unchanged** — it remains the checkout/billing flow. The new PMS screens are navigation layers on top of the existing checkout system.

---

## 2. All Locked Design Decisions

### Owner Decisions (Q&A Session)

| ID | Question | Decision | Rationale |
|---|---|---|---|
| Q1 | Document verification mandatory? | **Toggle in local settings** (OFF=skip, ON=mandatory). Phase 2: server-side config | Some properties don't need ID; flexibility required |
| Q2 | OTA rate override mechanism | **Reason text box** — no manager PIN. Logged locally. NOT pushed back to AIOSELL | Simple, no extra auth step needed |
| Q3 | Self check-in delivery method | **WhatsApp / SMS link** to guest + **cashier tablet** can display for walk-up guests | Two entry points cover all arrival scenarios |
| Q4 | Housekeeping not enabled → room state | **Direct → AVAILABLE** immediately after check-out | Smaller properties don't need HK gate |
| Q5 | Room assignment from AIOSELL | **Room Type only** — staff assigns specific room number at check-in | AIOSELL API sends `roomCode` (type) not room number |
| D1 | Walk-in vs phone booking flow | Walk-in = **combined Book + Check-In**. Phone/OTA booking = booking only; check-in on arrival | Walk-in guest is there NOW; phone guest isn't |
| D2 | Channel manager | **AIOSELL** via core engine controller API. Same API handles future channel managers | Owner's existing channel manager |
| D3 | Billing / folio | **Unchanged** — existing `CollectPaymentPanel.jsx` handles all billing | Already built, don't break what works |
| D4 | Tape chart rows | **Both** — grouped by Room Type header, individual room numbers within | Staff need both type-level and room-level view |
| D5 | Device priority | **Both** tablet (1024px) and desktop | Front desk has both |

### Design Decisions (Design Review Session)

| ID | Decision |
|---|---|
| DS-01 | Sidebar: 64px collapsed (icon only) — matches existing app pattern for fast switching |
| DS-02 | OTA source identification: **Option C** — white block + 4px left border in OTA brand colour + actual favicon logo |
| DS-03 | Source colour = thin accent only. Status colour = fill/background (Occupied=orange tint, Available=clean, HK=amber tint) |
| DS-04 | KPI tiles on front desk are clickable links (Arrivals tile → arrivals.html, Departures tile → departures.html) |
| DS-05 | Front desk arrivals capped at 6 rows; "View all N" link to dedicated page |
| DS-06 | "Check Out" button links to existing CollectPaymentPanel via departures page (Option A for checkout flow) |
| DS-07 | Self check-in has two entry points: (1) "Send link" button on every pending Check In row, (2) "Send Self Check-In Link" in check-in screen header |
| DS-08 | ID upload removed from New Booking form; belongs only at check-in. Green info strip clarifies this. |
| DS-09 | B2B/Corporate booking: "Individual / Corporate B2B" toggle added to New Booking; GST Number field conditional |
| DS-10 | AIOSELL API fields (occupancy.adults, occupancy.children, specialRequests, pah) must appear in the check-in screen and arrivals list |

---

## 3. Design System

### Fonts
| Role | Font | Size examples |
|---|---|---|
| All body/UI | Poppins | 13px body, 18px page title, 14px card title |
| Monospace | Poppins mono / system-mono | Booking IDs, timestamps |

*Note: Poppins matches the existing app (`App.css` imports Poppins). NOT Manrope or IBM Plex Sans.*

### Colours (must match `src/constants/colors.js`)

| Token | Hex | Usage |
|---|---|---|
| `primaryOrange` | `#F26B33` | New Booking CTA, Refresh icon, Occupied left-border, KPI icons, Toggle active |
| `primaryGreen` | `#329937` | Check In button, Available left-border, Checked-In badge, Active nav item |
| `amber` | `#F4A11A` | Housekeeping left-border, Pending badge, SR indicator, Overdue text |
| `darkText` | `#1A1A1A` | All primary text |
| `lightBg` | `#FFFFFF` | Sidebar background |
| `sectionBg` | `#F7F7F7` | Page background, header backgrounds |
| `grayText` | `#666666` | Secondary labels, inactive nav items |
| `borderGray` | `#E5E5E5` | All card/table borders |
| `errorText` | `#EF4444` | Balance due (outstanding), Overdue status |

### OTA Source Colours (fixed — never change)

| OTA | Hex | Text colour | Badge text |
|---|---|---|---|
| Booking.com | `#003580` | white | BK |
| Expedia | `#FFCC00` | `#0F172A` dark | EX |
| Airbnb | `#FF5A5F` | white | AB |
| Walk-in | `#329937` (green) | white | WI |
| Direct/Phone | `#F26B33` (orange) | white | DR |

*In the UI: these colours appear ONLY as a 4px left border on tape chart blocks and source pills. NOT as card backgrounds.*

### Sidebar (identical to existing app)
- Width: 64px collapsed (icon only), 280px expanded
- Background: `#FFFFFF`
- Right border: `1px solid #E5E5E5`
- Active item: `background: rgba(50,153,55,.1); border-left: 3px solid #329937; color: #329937`
- Logo: `https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/dwikbb41_logo111.svg`
- New section in nav: **Rooms & Reservations** (placed between Credit Management and Daily Report)
- Sub-items: Front Desk · Reservations · In-House Guests · Room Status · Channel Manager

### Room Status Colours (from `ROOM_COLORS` in constants)
| State | Left border | Card tint | Badge |
|---|---|---|---|
| Available | `#329937` green | white/clean | "Available" green |
| Occupied | `#F26B33` orange | `rgba(242,107,51,.06)` | "Occupied" orange |
| Housekeeping | `#F4A11A` amber | `rgba(244,161,26,.08)` | "HK" amber |
| Out of Order | `#EF4444` red | `rgba(239,68,68,.05)` | "OOO" red |
| Booked | `#F4A11A` amber | white | "Booked" amber |
| Due Today | amber border | white | "Due Today" amber |

---

## 4. Screen Inventory (10 Screens)

### S1 — Front Desk (`/pms/front-desk.html`)
**Purpose:** Morning briefing. Command centre for today's operations.

**Key elements:**
- 4 KPI cards: Occupancy (with progress bar), Arrivals Today (clickable → arrivals.html), Departures (clickable → departures.html), In-House count
- Today's Arrivals table (capped at 6 rows)
  - Columns: SOURCE | GUEST | ROOM · GUESTS | BALANCE | STATUS | ACTION
  - SOURCE: OTA favicon + name pill
  - ROOM · GUESTS: `Standard · 2 nights / 2A · 1C + SR badge`
  - BALANCE: Amount (red) or "Prepaid" badge (green, when `pah=false`)
  - STATUS: "Pending" (amber) or "Checked In" (green)
  - ACTION: Green "Check In" button + "Send link" button (→ self check-in)
- Footer: "Showing 6 of N · View all N arrivals →"
- Right panel: Channel Sync widget (AIOSELL + OTA sync times) + Departures Today (3 urgent rows)

**SR badge:** Amber `SR` pill shown when `specialRequests` field is non-empty in AIOSELL payload.
**Prepaid indicator:** When `pah=false` in AIOSELL payload, BALANCE column shows green "Prepaid" badge instead of amount.

---

### S2 — Reservations Calendar (`/pms/reservations.html`)
**Purpose:** Visual tape chart (Gantt) of all reservations. Primary room management tool.

**Key elements:**
- Navigation: Month / Week / Day toggle; date range prev/next; All Sources filter; + New Booking
- OTA Legend row: favicons + names for each source
- UNASSIGNED section at top: OTA bookings from AIOSELL where room number not yet assigned (dashed border blocks)
- Room groups: Standard Double, Deluxe, Suite (each collapsible)
- Group header shows occupancy count: `STANDARD DOUBLE (4/12 OCCUPIED)`
- Reservation blocks: white bg + 4px left border in OTA colour + favicon + guest name + guest count (`2A`) + `SR` badge if applicable
- Checked-in rooms: light green tint on cell background + `In` tag
- "Available" room rows: subtle green tint on cells

**Tape chart block content:** `[favicon] Guest, R. · Nights [2A] [SR]`

**Interaction:** Click block → slide-over with full details. Click empty cell → New Booking pre-filled with that room/date.

---

### S3 — New Booking (`/pms/new-booking.html`)
**Purpose:** Create a new booking (walk-in or advance/phone booking). No ID capture here.

**Key elements (left form):**
- Stay Details: Check-in date, Check-out date, Nights, Guests (combined for room filtering)
- Guest Details: Name, Phone, Email, Adults, Children (separate dropdowns)
- Special Requests (optional textarea)
- **Booking For toggle**: Individual | Corporate / B2B
  - Corporate shows: Company Name + GST Number fields + GST invoice note
- **ID note**: Green info bar — "ID document will be captured at check-in (if required by settings)"
- Advance Payment (optional): Amount + Payment Mode

**Key elements (right panel):**
- Room selector: grouped by type, rate shown, selected room highlighted in green
- Booking Summary: room total, GST, total, advance paid, balance due

**CTA buttons:**
- Primary (orange): "Book & Check In Now" → navigates to check-in.html with data pre-filled
- Secondary: "Save as Booking (Check-in later)" → saves reservation, returns to front desk

**What's NOT here (intentional):** ID upload, ID number, ID type — all deferred to check-in.

---

### S4 — Staff Check-In (`/pms/check-in.html`)
**Purpose:** Staff processes a guest arriving for their reservation.

**Header:**
- ← Back to front desk
- Source badge: `[favicon] Booking.com · BK-88213 · CM: AAABBB123`
- "Send Self Check-In Link" button (top right) → `self-checkin.html`

**Left panel — Guest Verification:**
- Guest Information card: Name, Phone, Email — all pre-filled from AIOSELL payload
- "Pre-filled from Booking.com" label
- Occupancy: Adults (pre-filled from `occupancy.adults`) + Children (pre-filled from `occupancy.children`)
- Special Requests: amber box with icon + "Pre-filled from Booking.com" label
- Document Verification card (conditional — shown when Settings toggle ON):
  - ID Type dropdown + ID Number field
  - File upload area OR "Scan via Camera" button
  - Shows uploaded file thumbnail with re-upload option

**Right panel — Room + Rate + Summary:**
- Room Assignment: Booked type (pre-filled) + grid of available specific rooms (staff selects)
- Rate section:
  - OTA booking: locked rate with `[🔒 AIOSELL]` badge + `[Override]` button → reason text box
  - Walk-in: fully editable
  - PAH badge: "PAY AT HOTEL" amber pill OR "PREPAID" green pill
  - Rate Plan: `BK-STANDARD-NR-101` grey pill (from `rateplanCode`)
- Booking Summary: all charges + balance due
- **CTA**: Full-width green `CHECK IN GUEST` button (52px tall)

---

### S5 — Self Check-In (`/pms/self-checkin.html`)
**Purpose:** Guest-led check-in on their phone (WhatsApp/SMS link) or cashier tablet.

**Entry points:**
1. Booking confirmation → WhatsApp/SMS message with link (automated)
2. Staff sends link from check-in.html header
3. Staff taps "Send link" on front desk arrivals row

**Flow (3 steps, mobile web, no app download):**

Step 1 — Verify ID:
- Shows booking preview (OTA badge, guest name, dates, room type)
- Camera viewfinder with corner brackets + scanning animation
- OCR auto-extracts: Name, ID No., Type, DOB
- Green "ID Detected" confirmation box
- Skip: If Settings toggle OFF, this step is skipped entirely

Step 2 — Confirm Details:
- Pre-filled from booking: name, room, dates, balance due
- Single "Confirm →" button

Step 3 — Success:
- Dark room-number card (large font, room number, floor)
- Check-out date, WiFi credentials, Balance Due, Reception number
- "View Full Booking Details" secondary button

**Note:** Room number must be pre-assigned by staff before the self-CI link is activated. Guest cannot self-assign a room.

**No sidebar** — this is guest-facing.

---

### S6 — In-House Guests (`/pms/in-house.html`)
**Purpose:** See all currently checked-in guests. Folio access. Check-out trigger.

**Header:** Search bar + Filter button

**4 KPI cards:** In-House count · Checkout Today · Outstanding Balance (red) · Avg Nights

**Table columns:**
`ROOM | GUEST | SOURCE | CHECK-IN | CHECK-OUT | BALANCE | ACTIONS`

- Row 112 (check-out today): amber/gold highlight row + "Due by 11 AM" + dark "Check Out" button
- SOURCE: favicon badge (28×28px)
- BALANCE: red amount or grey ₹0
- ACTIONS: `[📄 View Bill]` + `[Check Out →]` (links to departures.html)

**View Bill action:**
- Opens a slide-over panel from the right (350px wide)
- Shows: guest name, room, dates, charge breakdown (room charges, GST, food & beverages)
- Folio total, advance paid, balance due
- Actions: Print · Send to WhatsApp · Check Out

---

### S7 — Room Status Board (`/pms/room-status.html`)
**Purpose:** At-a-glance operational view. Housekeeper and front desk.

**Filter tabs:** All / Available / Occupied / HK / OOO

**Legend:** Colour-coded left border explanation + "View = open guest folio"

**Grid:** 6 columns on desktop

**Card compact layout (per room):**
```
[Room Number]   [Status badge]
Room type
Context line (guest name, vacated time, issue note)
[Action button]
```

**Actions per status:**
| Status | Left border colour | Action button |
|---|---|---|
| Available | Green `#329937` | `[+ Book]` → new-booking.html |
| Occupied | Orange `#F26B33` | `[View Folio]` → opens folio panel |
| Housekeeping | Amber `#F4A11A` | `[Mark Clean]` → JS: changes card to Available |
| Out of Order | Red `#EF4444` | `[Resolve]` → JS: opens note, then Available |
| Booked (upcoming) | Amber (same as HK) | `[Reservation]` → reservations.html |
| Due Today | Amber border | `[Folio]` + `[Out]` → departures.html |

**Folio slide-over** (same JS panel as in-house.html):
- Triggers on "View Folio" click
- Shows calculated charges (room rate × nights, GST 12%, food estimate)
- Actions: Print · WhatsApp · Check Out

**Interactive filters:** JS `filterRooms()` — hides cards that don't match selected status.

---

### S8 — Channel Manager (`/pms/channel-manager.html`)
**Purpose:** AIOSELL connection status, OTA inventory, sync queue, sync log.

**Key elements:**
- AIOSELL master card: green pulsing indicator + "Connected · Live" + last sync timestamp + active channel count
- OTA Channels list: each with favicon, sync time, booking count, revenue, Active/Inactive status
  - Active: green pulse dot
  - Inactive (MakeMyTrip, Goibibo): grey dot + `[Connect]` button
- Right panel:
  - Inventory bars: Standard Double / Deluxe / Suite free tonight (orange bar = occupied portion)
  - Pending Sync Queue: amber cards with spinner for in-flight syncs
  - Today's stats: total bookings, from OTAs, direct/walk-in, total revenue
- Sync Log: monospace table — timestamp | SUCCESS/RETRY/ERROR | description

---

### S9 — Arrivals (`/pms/arrivals.html`)
**Purpose:** Full paginated list of all arrivals for today (40+). The dedicated page linked from front desk tile.

**Header:** Title + back arrow + search + + New Booking

**5 KPI cards:** Total · Pending · Checked In · Late · With SR

**Filter tabs:** All / Pending / Checked In / Late

**Table columns:**
`SOURCE | GUEST | ROOM TYPE | GUESTS | NIGHTS | BALANCE | SR | STATUS | ACTION`
- SR column: small amber dot circle — shows only if `specialRequests` non-empty
- Late row: red background tint + "Expected 10:00 AM — LATE" in red

**Pagination:** Page X of Y (10 rows/page)

---

### S10 — Departures (`/pms/departures.html`)
**Purpose:** Full paginated list of all departures for today (30+). The dedicated page linked from front desk tile.

**Header:** Title + back arrow + search

**4 KPI cards:** Total Due · Overdue (red) · Due Now (amber) · Checked Out (green)

**Filter tabs:** All / Overdue / Due Now / Checked Out

**Table columns:**
`ROOM | GUEST | SOURCE | GUESTS | CHECK-OUT | BALANCE | FOLIO | STATUS | ACTION`
- FOLIO column: "Open" (amber) or "Clear" (green) badge — tells staff if payment is outstanding
- Overdue rows: red background tint
- Checked-out rows: greyed out (0.65 opacity)
- ACTION: `[Folio]` + `[Check Out]` (dark button)

---

## 5. UX Flows

### Flow 1 — OTA Booking (Automated, no staff action)
```
AIOSELL webhook receives booking from OTA
  → POST to core engine controller API
  → PMS creates Reservation in system
  · status: CONFIRMED
  · source: OTA (Booking.com / Expedia / Airbnb / etc.)
  · room type assigned (from roomCode)
  · room number: UNASSIGNED
  → Appears on Tape Chart (UNASSIGNED section, dashed block)
  → Appears on Front Desk "Today's Arrivals" list
  → WhatsApp/SMS sent to guest with self check-in link
  
  Guest arrives → staff finds in arrivals list → clicks [Check In] → Flow 3
  OR guest self check-ins → Flow 4
```

### Flow 2 — Walk-In Booking (Combined Book + Check-In)
```
Staff taps [+ New Booking]
  → New Booking form opens (/pms/new-booking.html)
  → Stay Details: select dates → nights auto-calculated
  → Guest Details: name, phone, email, adults, children
  → Optional: special requests, advance payment, corporate GST
  → Select specific room from right panel (availability from AIOSELL)
  → [Book & Check In Now] → navigates to Check-In screen with data pre-filled
  → Check-In screen: ID capture (if settings ON), room confirmed, rate editable
  → [CHECK IN GUEST] → room status: OCCUPIED
  → AIOSELL notified: room type inventory reduced
```

### Flow 3 — Staff-Led Check-In
```
Staff finds reservation (front desk arrivals / arrivals.html / search)
  → Clicks [Check In] → /pms/check-in.html
  → Booking info pre-filled from AIOSELL data:
      guest name, phone, email
      occupancy (adults, children)
      special requests
      rate (locked with AIOSELL badge)
      pah flag → PAY AT HOTEL or PREPAID badge
      rateplanCode shown
      cmBookingId shown alongside bookingId
  → Document step (if Settings toggle ON):
      scan ID via camera (OCR extracts name, ID number) 
      OR upload file
  → Staff assigns specific room from available rooms grid
  → If OTA booking: rate locked; [Override] → enter reason text
  → [CHECK IN GUEST] (large green button)
  → Room: OCCUPIED on status board
  → Tape chart block: moves from UNASSIGNED → specific room row
  → AIOSELL notified (room type availability reduced)
```

### Flow 4 — Self Check-In (Guest-Led)
```
Entry A: Guest receives WhatsApp/SMS link (automated on booking confirmation)
Entry B: Staff taps [Send link] on front desk arrivals row
Entry C: Staff taps "Send Self Check-In Link" in check-in.html header

Guest opens link on phone → /pms/self-checkin.html

  IF Doc Toggle = ON:
    Step 1: Scan ID (camera) OR upload photo
            OCR extracts name, ID number, type
            Guest confirms extracted data
  IF Doc Toggle = OFF:
    Step 1 skipped entirely

  Step 2: Confirm booking details
          (name, room number, dates, balance due — all pre-filled)

  Step 3: Success screen
          Room number (large), check-out date, WiFi, balance, reception

  Backend: PMS marks CHECKED IN
  Front desk: live ping notification "Sharma, R. → Room 103 self-checked in"

  CONSTRAINT: Room number must be pre-assigned by staff before link activates.
              Guest CANNOT self-assign a room.
```

### Flow 5 — Check-Out
```
Staff finds guest (Front Desk departures / departures.html / in-house.html)
  → Clicks [Check Out] → triggers existing CollectPaymentPanel (isRoom=true)
  → CollectPaymentPanel (UNCHANGED from existing app):
      Shows "Checkout" button (not "Collect Payment")
      Handles: room balance + food orders + associated transfers + tips + service charge
      Collect payment via cash/UPI/card
  → [Checkout / Pay ₹X] → payment processed
  
  Housekeeping enabled (Settings toggle)?
    YES: Room → HOUSEKEEPING status (blocked for new bookings)
         Phase 2: HK checklist before marking clean
         Staff taps [Mark Clean] on room-status.html → Room → AVAILABLE
    NO:  Room → AVAILABLE immediately
    
  AIOSELL notified → room type availability increased for new bookings
```

---

## 6. AIOSELL API Field Mapping

### Reservation POST payload (AIOSELL → PMS webhook)
```json
{
  "action": "book",
  "channel": "Booking.com",
  "bookingId": "111222333",       → Shown in Check-In header as booking reference
  "cmBookingId": "AAABBBCCC",    → Shown in Check-In header as CM reference
  "bookedOn": "2022-12-08",
  "checkin": "2025-12-10",        → Pre-fills Check-in date
  "checkout": "2025-12-12",       → Pre-fills Check-out date
  "segment": "OTA",
  "specialRequests": "Airport Taxi Required",  → SR badge on arrivals list; pre-fills Check-In
  "pah": false,                   → false=PREPAID (green badge); true=PAY AT HOTEL (amber badge)
  
  "guest": {
    "firstName": "Akshay",        → Guest name in check-in + arrivals
    "lastName": "Kumar",
    "email": "...",               → Pre-fills email field in check-in
    "phone": "9988776655",        → Pre-fills phone field in check-in
    "address": { ... }            → Shown in guest info (collapsible)
  },
  
  "rooms": [{
    "roomCode": "SUITE",          → Room Type column in arrivals/tape chart
    "rateplanCode": "SUITE-D-101", → Rate Plan badge in check-in screen
    "occupancy": {
      "adults": 1,               → Adults field in check-in; "2A" in arrivals GUESTS column
      "children": 0              → Children field in check-in; "1C" in arrivals GUESTS column
    },
    "prices": [{ "date": "...", "sellRate": 537.5 }]  → Rate (locked in check-in)
  }],
  
  "amount": {
    "amountAfterTax": 13789,     → Balance shown in arrivals
    "commission": 2462,          → Channel Manager panel (reconciliation)
    "tcs": 61, "tds": 12        → Channel Manager panel
  }
}
```

### Where each field appears in UI

| API Field | Front Desk | Arrivals | Tape Chart | Check-In | Channel Manager |
|---|---|---|---|---|---|
| `channel` | Source pill (favicon) | Source column | Block left-border colour | Header badge | OTA channel list |
| `bookingId` | — | — | — | Header `BK-88213` | Sync log |
| `cmBookingId` | — | — | — | Header `CM: AAA...` | Sync log |
| `specialRequests` | SR amber badge | SR dot column | SR badge on block | Pre-filled amber box | — |
| `pah` | "Prepaid" badge in balance | Balance column | — | PAY AT HOTEL / PREPAID badge | — |
| `guest.firstName/lastName` | Guest name | Guest column | Block text | Guest info (read-only) | — |
| `guest.phone` | Phone (secondary) | Phone (secondary) | — | Phone field (read-only) | — |
| `guest.email` | — | — | — | Email field (read-only) | — |
| `rooms[].roomCode` | Room Type | Room Type column | Group header | Booked Room Type | Inventory bars |
| `rooms[].rateplanCode` | — | — | — | Rate Plan badge | — |
| `rooms[].occupancy.adults` | "2A" in GUESTS | GUESTS column `2A·1C` | `2A` on block | Adults field (read-only) | — |
| `rooms[].occupancy.children` | "1C" in GUESTS | GUESTS column | — | Children field | — |
| `rooms[].prices[].sellRate` | — | — | — | Rate field (locked, AIOSELL badge) | Rate push |
| `amount.amountAfterTax` | Balance column | Balance column | — | Balance Due in summary | Today stats |
| `amount.commission` | — | — | — | — | OTA revenue (minus commission) |

---

## 7. Navigation Map (All Links Verified)

```
/pms/front-desk.html
  ├── [Arrivals tile click]      → /pms/arrivals.html
  ├── [Departures tile click]    → /pms/departures.html
  ├── [+ New Booking button]     → /pms/new-booking.html
  ├── [Check In buttons]         → /pms/check-in.html
  ├── [Send link buttons]        → /pms/self-checkin.html
  ├── [View all N arrivals]      → /pms/arrivals.html
  ├── [View all N departures]    → /pms/departures.html
  └── [Departures Check Out]     → /pms/departures.html

/pms/arrivals.html
  ├── [← back]                   → /pms/front-desk.html
  ├── [+ New Booking]            → /pms/new-booking.html
  └── [Check In buttons]         → /pms/check-in.html

/pms/departures.html
  └── [← back]                   → /pms/front-desk.html
  (Check Out buttons → trigger existing CollectPaymentPanel in real app)

/pms/new-booking.html
  ├── [← back]                   → /pms/front-desk.html
  ├── [Book & Check In Now]      → /pms/check-in.html
  └── [Cancel]                   → /pms/front-desk.html

/pms/check-in.html
  ├── [← back]                   → /pms/front-desk.html
  └── [Send Self Check-In Link]  → /pms/self-checkin.html

/pms/self-checkin.html
  (no navigation — guest-facing, standalone)

/pms/in-house.html
  ├── [View Bill buttons]         → JS folio slide-over panel
  └── [Check Out buttons]         → /pms/departures.html

/pms/room-status.html
  ├── [+ Book buttons]            → /pms/new-booking.html
  ├── [View Folio buttons]        → JS folio slide-over panel
  ├── [Reservation button]        → /pms/reservations.html
  ├── [Mark Clean / Resolve]      → JS status change (in-page)
  └── [Out button on Due Today]   → /pms/departures.html

/pms/reservations.html
  └── [+ New Booking]             → /pms/new-booking.html

/pms/channel-manager.html
  (internal sync actions only, no page navigation)

All sidebar items link to corresponding pages via data-lucide icons (collapsed sidebar).
```

---

## 8. Component Patterns

### Source Pill
```html
<!-- OTA -->
<div class="src-pill">
  <img src="https://www.google.com/s2/favicons?domain=booking.com&sz=13">
  Booking.com
</div>

<!-- Walk-in -->
<div class="src-pill">
  <i data-lucide="user-plus" style="color:#329937"></i> Walk-in
</div>

<!-- Direct/Phone -->
<div class="src-pill">
  <i data-lucide="phone" style="color:#F26B33"></i> Direct
</div>
```

### Tape Chart Block (Option C — white + 4px OTA left border)
```html
<div class="res-block" style="border-left-color:#003580;">
  <img src="[favicon]" style="width:13px;">
  <span style="flex:1">Sharma, R.</span>
  <span class="guest-count">2A</span>
  <span class="sr-badge">SR</span>  <!-- only if specialRequests non-empty -->
  <span class="checked-in-tag">In</span>  <!-- only if checked in -->
</div>
```

### Status Badges
```html
<span class="badge-pending">Pending</span>       <!-- amber -->
<span class="badge-in">Checked In</span>         <!-- green -->
<span class="badge-prepaid">Prepaid</span>       <!-- green (when pah=false) -->
<span class="badge-late">Late</span>             <!-- red -->
<span class="badge-overdue">Overdue</span>       <!-- red -->
<span class="sr-badge">SR</span>                 <!-- amber pill for special requests -->
```

### Folio Slide-Over Panel (reused across room-status + in-house)
- Overlay: `position:fixed; inset:0; background:rgba(0,0,0,.3); z-index:100`
- Panel: `position:fixed; right:0; width:360px; z-index:101`
- Close: click overlay or × button
- Content: guest name, dates, charge breakdown, balance due
- Actions: Print · WhatsApp · Check Out

---

## 9. Phase 2 — Deferred Items

| Feature | Current State | Phase 2 |
|---|---|---|
| Housekeeping checklist | Status change only (Mark Clean button) | Full checklist modal before marking clean |
| Document toggle | Local settings (localStorage) | Server-side config per property |
| OTA rate override | Reason text only | Manager PIN + audit trail |
| Drag-to-reschedule on tape chart | Visual only (no drag) | Drag-and-drop with AIOSELL push |
| Multi-channel picker | MakeMyTrip / Goibibo placeholders | Connect flow via AIOSELL |
| Bulk check-in | Not designed | Select multiple arrivals + batch check-in |
| Guest repeat visit | Not shown | CRM lookup badge on returning guest |
| Digital key delivery | Not designed | SMS/WhatsApp room key after check-in |

---

## 10. Implementation Dependencies (Gate 3 Blockers)

| Dependency | Status | Owner | Notes |
|---|---|---|---|
| AIOSELL controller API spec | **PENDING** | Backend team | Required before pmsService.js can be written |
| AIOSELL webhook endpoint URL | **PENDING** | Backend team | Must be created + shared with AIOSELL team |
| Room Type master data endpoint | Confirm from existing backend | Backend | `GET /rooms/types` or similar |
| WhatsApp/SMS send API | Exists in app (existing integration) | — | Reuse existing pattern |
| Document OCR | TBD — camera API or 3rd party | Gate 3 decision | Options: browser MediaDevices API, or external OCR |
| Self check-in public route auth | Needs token-based URL (bookingId + HMAC) | Backend | Security: prevent unauthorized check-ins |

---

## 11. Files Created in This Design Session

All mockup files are in `/app/frontend/public/pms/`:

| File | Screen | Live URL |
|---|---|---|
| `front-desk.html` | Front Desk Dashboard | `/pms/front-desk.html` |
| `reservations.html` | Tape Chart Calendar | `/pms/reservations.html` |
| `new-booking.html` | New Booking Form | `/pms/new-booking.html` |
| `check-in.html` | Staff Check-In | `/pms/check-in.html` |
| `self-checkin.html` | Guest Self Check-In | `/pms/self-checkin.html` |
| `in-house.html` | In-House Guests | `/pms/in-house.html` |
| `room-status.html` | Room Status Board | `/pms/room-status.html` |
| `channel-manager.html` | Channel Manager | `/pms/channel-manager.html` |
| `arrivals.html` | Today's Arrivals (full) | `/pms/arrivals.html` |
| `departures.html` | Today's Departures (full) | `/pms/departures.html` |

These are static HTML mockups (Tailwind CDN + Google Fonts + Lucide). They are **not** React components yet. Gate 3 will produce the React implementation plan based on these designs.

---

## 12. Design Audit Sign-Off (2026-08-28)

Full design audit completed across all 10 screens. No outstanding visual defects.

**Verified:**
- ✅ All sidebars collapsed to 64px (consistent across all pages)
- ✅ STATUS column properly sized — "Pending" badge not clipped
- ✅ Self check-in entry visible on every pending row ("Send link" text + send icon)
- ✅ "View Bill" on in-house list opens live folio panel (JS slide-over)
- ✅ "Check Out" buttons link to departures.html
- ✅ B2B/Corporate fields in new booking (conditional on toggle)
- ✅ No ID capture in New Booking (deferred to check-in)
- ✅ Adults + Children shown in all guest-facing columns
- ✅ Special Requests SR badge visible on front desk and arrivals
- ✅ Prepaid badge shown when `pah=false`
- ✅ PAH + Rate Plan visible in check-in screen
- ✅ Room status board: all 5 states (Occupied/Available/HK/OOO/Booked) working
- ✅ Room status filter tabs working (JS)
- ✅ Folio panels working (JS) on room-status and in-house
- ✅ Mark Clean / Resolve work as JS state changes
- ✅ All navigation links verified (see §7)

---

*Design locked: 2026-08-27 | Audit complete: 2026-08-28*
*Next: Gate 3 — Implementation Plan (blocked on AIOSELL API spec)*
