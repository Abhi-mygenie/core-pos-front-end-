# CR-385 — Data Inventory (what information the workstation can show, per panel)

**Role:** PLANNING (Gate 2 input for Gate 2.5 UX discussion) · **Date:** 2026-09-16 · **Code reality:** all data below is ALREADY fetched by existing PMS pages — no backend change required for the workstation.

---

## A. Guest / booking row (Arrivals · Departures) — source `GET /aiosell/local-reservations` → `aiosellTransform.fromReservationOps`

| Field | Example | Available now |
|---|---|---|
| Booking ID / CM booking ID | `BK-2031`, `AIO-88` | ✅ |
| Channel / source | Direct, WalkIn, MakeMyTrip, Booking.com | ✅ |
| Guest name, phone, email | | ✅ |
| Check-in date, check-out date, nights | | ✅ |
| Room type (room code), rate plan, meal plan (CP/MAP/EP decoded) | | ✅ |
| Assigned room number(s) — one row per room line (multi-room bookings) | Rm 101, Rm 102 | ✅ |
| Adults / children per room | 2A · 1C | ✅ |
| Amount (after tax) | ₹4,500 | ✅ |
| PAH / Prepaid flag | PAY AT HOTEL badge | ✅ |
| Payment status of room order | paid / unpaid | ✅ |
| Special requests text | "early check-in" | ✅ |
| Operational status | pending / in_house / departed / cancelled | ✅ |
| Actual checked-in-at / checked-out-at timestamps | | ✅ |
| Cancel reason / cancelled at / by | | ✅ |
| Linked room order ID (→ Folio, Check-Out) | | ✅ (null until checked in) |

**Buckets already computed** (`bucketReservationOps`, window −60/+30 days): `arrivalsLate`, `arrivalsToday`, `arrivalsUpcoming`, `checkedInToday`, `inHouse`, `depOverdue`, `depDueToday`, `depUpcoming`, `depCheckedOut`, `cancelled`, `withSpecialRequests` count.

**Balance on the row:** LR rows carry `advance_payment` + `balance_payment` (unread by FE) — **present but NOT authoritative** (probe 2026-09-17: ₹900 vs ₹950 for identical folios; excludes F&B/room orders). True balance still needs the Folio call. See `CR-385_IMPACT_ANALYSIS.md` §4.6.

---

## B. In-House row — source `getInHouseGuests()` (room list + reservations + **per-guest folio call** for true balance)

| Field | Available now |
|---|---|
| Room number, guest name, phone | ✅ |
| Actual check-in timestamp, booked check-out date | ✅ |
| **Outstanding balance** = room price + GST − advance − received (accurate, folio-based) | ✅ (one extra API call per guest) |
| Parent order ID → Folio / Check-Out | ✅ |
| Channel, PAH — via reservation match | ✅ |
| Room condition (HK flag on occupied room) | ⚠️ not on this row today — lives in Room Status board (`occupied_hk`); can be joined by room number |

Panel-level numbers today: In-House count, Checkout Today, Outstanding Balance (₹, sum), Avg Nights.

---

## C. Room tile — source `GET /aiosell/room-status-board` → `roomStatusTransform`

| Field | Available now |
|---|---|
| Room number, title, room type code | ✅ |
| Display status: available / occupied / occupied_hk / booked / hk / ooo | ✅ |
| Manual status (hk / ooo / available) + "since" timestamp | ✅ |
| Occupied → guest name, booking ID, order ID | ✅ |
| Booked (arriving) → guest name, channel, booking ID, check-in–check-out | ✅ |
| Counts per status + Auto-HK-on-checkout setting | ✅ |
| **Not available:** floor / wing / bed type / rate — board has no floor field (grouping by *room type* is possible; by *floor* is not unless room numbers encode it) | ❌ |

Allowed actions (server-guarded): Mark HK · Mark Clean/Available · Mark OOO (not while occupied) · Back in Service · Request HK on occupied room · bulk Mark All Clean.

---

## D. Guest Folio (side-panel candidate) — source `getGuestFolio(orderId)`

Booking ID, order number, channel, PAH, guest name, phone, room no, room code, rate plan, meal plan, check-in/out dates, checked-in-at, nights, adults/children, **room price, GST tax, advance payment, received balance, payments[] (each payment with method)**, **associated food/room-service orders[]**, order note, special requests, is-checked-out flag.
→ This is the richest single object. A "guest quick view" drawer/expand can show it without navigating to the Folio page.

---

## E. Check-In form (what a Check-In drawer must contain) — `CheckInPage.jsx`, 910 lines

Sections: Guest Name* · Phone* (auto CRM lookup on 10 digits → CRM badge: stays, last stay, loyalty pts, store credit, documents on file) · Email · Check-in* / Check-out* / Nights · Room Assignment* (available rooms of that type) · Room Amount* · GST (Accommodation) block (auto or "not configured") · Company GSTIN toggle · Adults / Children · per-adult name + ID type + ID front/back image upload (`GuestDocsSection`) · Advance Payment + Advance Payment Method* · Note / special requests · Confirm Check-In.
Post-submit today: `navigate('/pms/in-house')` → must become in-place refresh.

## F. Check-Out drawer — `PmsCheckoutDrawer.jsx` (305 lines, already a drawer)
Loads room order → embeds `CollectPaymentPanel` (bill, payment split, print) → on success returns `{orderId}`. Reusable as-is from any panel.

## G. Small dialogs (reusable as-is)
Extend Stay (new checkout, nights, reason) · Modify Booking (dates/nights, reason) · Cancel Booking (reason) · No-Show.

---

## H. Header KPIs — `GET /aiosell/dashboard-kpis`
arrivals_count, departures_count, in_house_count, occupancy % (physical), total rooms, occupied tonight, available tonight, as-of date.

## I. Channel sync — `getAiosellStatus()` → last sync timestamp (for header dot).

---

## Gaps worth knowing before UX freeze
1. **Floor grouping not possible** from current data (no floor field). Room-type grouping is.
2. **Arrivals/Departures rows show booking amount, not balance due** — true balance needs a folio call (In-House already does this per guest).
3. **HK state of an occupied room** is only on the Room Status board — In-House panel must join by room number to show/act on it (client-side join, cheap).
4. **Check-In success navigation** must be re-wired to in-place refresh (small code change, but touches the 910-line page).
