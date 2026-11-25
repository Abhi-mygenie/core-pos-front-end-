# CR-385 — Gate 2.4 UX Flow (low-fi)
## PMS Front Desk Workstation (beta) · `/pms/front-desk-v2`

```
Gate:        2.4 — UX flow, boxes-and-arrows only. NO styling, NO colours, NO code.
Date:        2026-09-17
Inputs:      Intake (decisions OD-01…OD-15, R5-std-1/2/3, MV-01…MV-09), IA Rev 2.2 (§4, §5)
Owner rules: KPI tiles ARE the tabs · no page navigation for daily ops · Arrivals = not-yet-checked-in ·
             Departures = in-house due out · folio + checkout on ONE screen (no pop-up) · alert bar exists ·
             landing = Arrivals · never the words "Channel Manager" · options decided in the mockup, not here
Status:      DRAFT — owner review. Gate 2.4 closes only on explicit owner say-so.
```

Legend: `[ ]` button · `( )` chip/filter · `▸` click path · `⋮` kebab menu · `★` decided default · `MV-xx` = becomes a switch in the 2.5 mockup

---

## 1. Screen regions (always the same skeleton)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ A  HEADER   Good Morning · Wed 17 Sep · <Property>   ● synced 5 min ago   [Refresh] [+ New Booking]  BETA │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ B  KPI-TAB STRIP (4 tiles = 4 tabs; active tile highlighted)                          │
│    ┌ ARRIVALS ────┐ ┌ DEPARTURES ──┐ ┌ IN-HOUSE ────┐ ┌ ROOMS ───────────┐            │
│    │ 8            │ │ 5            │ │ 18           │ │ 72%   (MV-06)     │            │
│    │ 2 late·14 up │ │ 1 overdue    │ │ ₹12,400 due  │ │ 18/40·3 HK·1 OOO  │            │
│    └──────────────┘ └──────────────┘ └──────────────┘ └───────────────────┘            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ C  ALERT BAR  (only when something is urgent; 0 px when quiet)  (MV-07)              │
│    ⚠ 1 overdue departure · 2 late arrivals · Room 204 HK > 2h            [go ▸]     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ D  PANEL AREA — content of the active tile (full width)                              │
│    …one of §2 Arrivals / §3 Departures / §4 In-House / §5 Rooms…                     │
│    …OR §6 Folio + Checkout (full width, replaces the list, ← Back)  (MV-01)…         │
│                                                                                     │
│                                              ┌ E  SIDE PANEL (right, ~720px) ─────┐ │
│                                              │ Check-In form (MV-02)              │ │
│                                              │ list stays visible on the left     │ │
│                                              └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

Rules for the skeleton
- **A + B are always visible**, whatever is open below (list, folio+checkout, check-in).
- **C** appears only with urgent items; clicking an alert jumps to the right tile + chip (MV-07 click behaviour).
- **D** shows exactly one thing: a tab's list/board **or** the Folio+Checkout panel (§6).
- **E** slides over the right part of D for the Check-In form; the list stays visible and clickable behind it.
- Switching tiles never reloads data; **Refresh**, tab focus, and every completed action reload everything.
- `?tab=arrivals|departures|inhouse|rooms` opens that tile; no/invalid param → Arrivals (OD-06, OD-10).

---

## 2. ARRIVALS tab (default landing)

```
(Late 2) (Today 6 ★) (Upcoming 14)                        🔍 search guest / booking     Cancelled today: 1 (MV-03)
┌──────┬───────────────┬───────────┬────────┬────────┬─────────┬────┬─────────┬─────────────────────┐
│Source│ Guest         │ Room type │ Guests │ Nights │ Amount  │ SR │ Status  │ Action              │
├──────┼───────────────┼───────────┼────────┼────────┼─────────┼────┼─────────┼─────────────────────┤
│ MMT  │ A. Sharma  📞 │ Suite     │ 2A·1C  │ 3      │ ₹4,500  │ ●  │ Late    │ [Check In]  ⋮       │
│Direct│ R. Fernandes  │ Executive │ 2A     │ 1      │ ₹1,000  │    │ Pending │ [Check In]  ⋮       │
└──────┴───────────────┴───────────┴────────┴────────┴─────────┴────┴─────────┴─────────────────────┘
⋮ = Modify booking · Mark No-Show (Late/Today, OTA channels only) · Cancel booking
```
- Contains **only not-yet-checked-in** bookings. Once checked in → disappears here, appears in In-House.
- Chip counts = tile sub-line. "Today" is pre-selected; Late is red-tinted in the chip.
- Row click ▸ opens **§6 Folio+Checkout** in read-only mode? **No** — a pending booking has no folio yet. Row click ▸ expands nothing; the only surfaces are the Action buttons (kept simple, owner rule "don't make it complex").

Click paths
```
[Check In] ▸ E side panel opens with the booking pre-filled (Who → Stay → Room → GST → IDs → Advance → Note)
            ▸ [Confirm Check-In] ▸ toast "Checked in · Room 101" ▸ panel closes ▸ reload
            ▸ row leaves Arrivals, appears in In-House (and Departures if leaving today)
⋮ Modify   ▸ existing Modify dialog ▸ save ▸ reload
⋮ No-Show  ▸ existing No-Show dialog ▸ confirm ▸ reload (room inventory released)
⋮ Cancel   ▸ existing Cancel dialog ▸ confirm ▸ reload ▸ "Cancelled today: N" footer +1
[+ New Booking] (header) ▸ existing New Booking page (the one allowed navigation — complex form, out of scope)
```

---

## 3. DEPARTURES tab

```
(Overdue 1) (Today 4 ★) (Upcoming 13)                                    Checked out today: 3 → reports ↗
┌──────┬───────────────┬──────┬────────┬───────────┬─────────────┬─────────┬──────────────────────────┐
│ Room │ Guest         │Source│ Guests │ Check-out │ Balance due │ Status  │ Action                   │
├──────┼───────────────┼──────┼────────┼───────────┼─────────────┼─────────┼──────────────────────────┤
│ 204  │ P. Nair       │ BDC  │ 2A     │ OVERDUE   │ ₹2,150      │ Overdue │ [Check Out] [Extend] [Folio] │
│ 101  │ R. Fernandes  │Direct│ 2A     │ 17 Sep    │ ₹0 Clear    │ Due     │ [Check Out] [Extend] [Folio] │
└──────┴───────────────┴──────┴────────┴───────────┴─────────────┴─────────┴──────────────────────────┘
```
- Contains **only in-house guests due to leave** (overdue / today / upcoming). Checked-out guests → footer link only.
- **Balance due is the true folio balance** (room + GST + F&B − payments), not the booking amount (R5-Q4).

Click paths
```
[Check Out] ▸ §6 Folio+Checkout opens full-width, checkout column focused
[Folio]     ▸ §6 Folio+Checkout opens full-width, folio column focused (same screen)
[Extend]    ▸ existing Extend Stay dialog ▸ save ▸ reload ▸ row may move to Upcoming
```

---

## 4. IN-HOUSE tab

```
(All 18 ★) (Arrived today 6) (Leaving today 4) (Stayover 8)      🔍 search      Outstanding: ₹12,400 (MV-05)
┌──────┬───────────────┬───────────┬──────────┬───────────┬─────────────┬─────┬──────────────────────────────────┐
│ Room │ Guest         │ Phone     │ Check-in │ Check-out │ Balance due │ HK  │ Action                           │
├──────┼───────────────┼───────────┼──────────┼───────────┼─────────────┼─────┼──────────────────────────────────┤
│ 101  │ R. Fernandes  │ ***       │ 16 Sep   │ 17 Sep    │ ₹0          │  –  │ [Check Out] [Request HK] [Extend] [Folio] │
│ 305  │ S. Iyer       │ ***       │ 15 Sep   │ 19 Sep    │ ₹3,200      │ 🧹 │ [Check Out] [Mark Clean] [Extend] [Folio] │
└──────┴───────────────┴───────────┴──────────┴───────────┴─────────────┴─────┴──────────────────────────────────┘
```
- **HK column** = state of *this* room from the room board (badge, MV-04). The action button flips with the state: no HK flag → `[Request HK]`; HK flag set → `[Mark Clean]`. OOO is never offered on an occupied room.
- A guest leaving today appears **both** here and in Departures (standard, R5-std-2).

Click paths
```
[Request HK] ▸ immediate ▸ toast ▸ reload ▸ badge appears; Rooms tile "HK" count +1
[Mark Clean] ▸ immediate ▸ toast ▸ reload ▸ badge clears
[Check Out] / [Folio] ▸ §6 Folio+Checkout
[Extend]    ▸ existing Extend Stay dialog
```

---

## 5. ROOMS tab

```
(All 40 ★) (Available 12) (Occupied 18) (Booked 6) (HK 3) (OOO 1)   [Mark All Clean (3)]   Auto-HK on checkout: ON
Density: (Comfortable ★) (Compact)        Group by: (Room number ★) (Room type)  (MV-09)      Layout RS-A/B/C (MV-08)

Comfortable tile                          Compact tile (MV-08)
┌──────────────────────────┐              ┌──────┐
│ 101            OCCUPIED  │              │ 101  │ ← colour bar only; click ▸ actions popover / detail panel (MV-08 RS-C)
│ Suite · R. Fernandes     │              └──────┘
│ BK-2031 · checked in     │
│ [Request HK] [Folio]     │
└──────────────────────────┘
```
Per-state actions on a tile (unchanged from today's board, copied)
```
available  ▸ [Book Room] (→ New Booking page) [Needs HK] [Mark OOO]
booked     ▸ [Check In] (→ E side panel, booking pre-filled)
occupied   ▸ [Request HK] [Folio]            (OOO disabled)
occupied·HK▸ [Mark Clean] [Folio]            (OOO disabled)
hk         ▸ [Mark Clean] [Mark OOO]
ooo        ▸ [Back in Service] [Needs HK]
[Mark All Clean] ▸ cleans every HK room that is NOT occupied; warns how many occupied-HK rooms were skipped
```
- Density choice is remembered per browser (OD-05). Board failure → tile shows "—", this tab shows "Room status unavailable · Retry"; other tabs keep working (OD-11).

---

## 6. FOLIO + CHECKOUT — one screen, no pop-up (OD-15)

Opens **full-width in D** (MV-01 ★ variant), A + B stay visible. Reached from any `[Check Out]` / `[Folio]` on Departures, In-House, checked-in Arrivals row, occupied room tile.

```
← Back to Departures      Folio · Room 204 · P. Nair · BDC-77812 · Booking.com · PAY AT HOTEL · Overdue
┌ FOLIO ─────────────────────────────────────────┐ ┌ CHECKOUT ──────────────────────────────┐
│ Guest & Stay   16 Sep → 17 Sep · 1 night · 2A  │ │  (existing payment panel, unchanged)   │
│ Room charges   ₹1,000 + GST ₹50                │ │  Total due            ₹2,150           │
│ Payments       Advance ₹100 (UPI, 16 Sep)      │ │  Method  (Cash)(Card)(UPI)  split …    │
│ F&B posted     3 orders · ₹1,200               │ │  Received  [________]                  │
│ Room orders    1 · ₹0                          │ │  [Print Bill]   [Collect & Check Out]  │
│ ─────────────────────────────────────────────  │ └────────────────────────────────────────┘
│ BALANCE DUE                       ₹2,150       │
└────────────────────────────────────────────────┘
[Print Folio — pending backend (CR-364-PRINT)]   [Extend Stay]
```
Click paths
```
[Collect & Check Out] ▸ payment posted ▸ toast "Checked out · Room 204" ▸ back to the tab you came from ▸ reload
                      ▸ room becomes HK automatically if Auto-HK is ON (visible on Rooms tile)
[Print Bill]          ▸ prints the bill (works today)
[Print Folio]         ▸ disabled until backend answers CR-364-PRINT
[Extend Stay]         ▸ existing dialog ▸ save ▸ folio refreshes in place
← Back                ▸ returns to the list, nothing lost
Departed guest        ▸ Checkout column hidden; folio read-only + print buttons
```

---

## 7. CHECK-IN side panel (E) — OD-03, MV-02

```
List stays visible ◂──────────────▸ ┌ Check-In · A. Sharma · MMT · BK-2031 ───────── ✕ ┐
                                    │ Returning guest · 3 stays · 120 pts (CRM badge)     │
                                    │ WHO   name* · phone* · email · corporate GST toggle │
                                    │ STAY  check-in* · check-out* · nights · adults/kids │
                                    │ ROOM  room of this type* (available only) · amount* │
                                    │ GST   auto slab / "not configured"                  │
                                    │ IDs   ID type · front/back photo (per adult)        │ ← widens for photos (MV-02)
                                    │ PAY   advance · method* (if advance > 0)            │
                                    │ NOTE  special requests                              │
                                    │                    [Cancel]  [Confirm Check-In]     │
                                    └─────────────────────────────────────────────────────┘
```
- Same fields and rules as today's Check-In page (copied, not changed). Walk-in without booking stays on New Booking / Check-In page (unchanged).
- Opens from Arrivals `[Check In]` and Rooms booked-tile `[Check In]`.

---

## 8. What stays visible per tab (space budget)

| Open thing | Header A | Tiles B | Alert C | List/board D | Side panel E |
|---|---|---|---|---|---|
| Any tab list | ✔ | ✔ | if urgent | ✔ full width | – |
| Check-In | ✔ | ✔ | if urgent | ✔ (left part, still clickable) | ✔ ~720 px |
| Folio+Checkout | ✔ | ✔ | if urgent | replaced by §6 | – |
| Dialogs (Extend/Modify/Cancel/No-Show) | ✔ | ✔ | ✔ | dimmed behind small modal | – |

Removed from today's Front Desk: Channel Sync card (→ header dot + "synced X min ago"), Departures mini-widget (→ Departures tile + alert bar), right column. Sync/Fetch actions live on the OTA configuration page (FU-385-B verified).

---

## 9. One busy-day walk-through (for the mockup's dummy data, Q11 = 40 rooms)

```
08:55  Land on Arrivals (Today 6). Alert bar: "1 overdue departure · 2 late arrivals".
09:00  Click alert ▸ Departures (Overdue) ▸ Room 204 [Check Out] ▸ §6 ▸ balance ₹2,150 ▸ UPI ▸ [Collect & Check Out]
       ▸ back on Departures ▸ Room 204 gone ▸ Rooms tile HK 3 → 4 (auto-HK).
09:10  Rooms tab ▸ (HK 4) ▸ [Mark All Clean] ▸ 3 cleaned, 1 occupied-HK skipped (warning).
10:30  Arrivals ▸ A. Sharma (Late) [Check In] ▸ side panel ▸ IDs photographed ▸ advance ₹500 cash ▸ Confirm
       ▸ In-House 18 → 19 ▸ Arrivals Late 2 → 1.
11:00  In-House ▸ S. Iyer [Request HK] ▸ badge 🧹 ▸ later [Mark Clean].
12:00  Arrivals ▸ R. Fernandes ⋮ Modify ▸ +1 night ▸ Departures Today 4 → 3, Upcoming +1.
15:00  New OTA booking arrives (webhook) — appears on next Refresh / tab focus (until BQ-385-01 is answered).
```

---

## 10. Owner review questions (≤5)

See chat. Answers are recorded in §11 when given; Gate 2.4 closes only on explicit owner close.

## 11. Decision log (Gate 2.4)
| # | Question | Owner answer | Date |
|---|---|---|---|
| — | — | — | — |
