# CR-385 — Design Gap Checklist (Gate 2.5 mockup review)

```
Date:      2026-09-18
Source:    owner feedback on clickable mockup `public/cr385-frontdesk-mockup.html` + agent review of all tabs
Status:    MOCKUP NOT YET EDITED — owner: "do not edit anything till I explicitly say I am giving feedback"
Round 2:   2026-09-18 — items 1–5 decided (§8). Search added (§10).
GO:        2026-09-18 — owner: "update docs and design then call design agent to present revised mock up" → **mockup v2 LIVE** (all [x] items applied; design_agent blueprint in `/app/design_guidelines.json`). Owner review next.
Legend:    [ ] open · [x] owner decided · [?] needs owner answer · [BE] backend question
Tick rule: an item is [x] only when the owner has decided; agent applies to mockup only after owner says "go"
```

---

## 0. Cross-cutting rules (owner-stated, apply everywhere)

- [x] **P1 — One interaction pattern: expand in place.** The guest row / room tile expands below itself. One open at a time. Sticky header (guest · Cancel/Confirm). Collapses on success → list refreshes. Applies to Check-In, Check Out, Extend, Modify, No-Show, room-tile actions. *(owner 2026-09-18: "we expand the tile… same design everywhere")*
- [x] **P2 — Check Out and Folio are the SAME screen.** One button **Check Out** → expanded row shows statement (left) + payment (right: Cash / Card / UPI / Split / Discount / Tip). Footer: `[Print] [Extend] [Collect ₹X & Check Out]`; ₹0 due → `[Check Out]`. No "Folio" button anywhere on the workstation. *(owner 2026-09-18)*
- [x] **P3 — Common guest row** (9 cells) on Arrivals / Departures / In-House: Room · Guest (name · booking · phone · SR icon · CRM ✔) · Source · Check-in (+relative) · Check-out (+nights) · Guests · ₹ · Status · Action. Only ₹ and Status change meaning per tab; only the Action set differs. *(owner 2026-09-18: "same columns")*
- [x] **P4 — One Print button.** Prints the bill today; prints the folio once CR-364-PRINT ships. No disabled button on a daily screen.
- [x] **P5 — Tiles smaller.** One-line tab strip (~48 px): `Arrivals 6 today · 2 late · 14 upcoming`. Not hero cards. *(owner: "tiles are too big")*
- [x] **P6 — Words "Channel Manager" never appear.** (intake)

---

## 1. Header / KPI-tab strip / alert bar

- [x] **H1** Tiles too big → P5.
- [x] **H2** Big number has no caption → `6 today` written out on Arrivals and Departures tiles.
- [ ] **H3** Rooms tile shows a self-computed 45% → use backend `occupancy_percent_physical` (exists in `dashboard-kpis`).
- [x] **H4 Alert bar** — owner question 2026-09-18: *"if the tile shows late arrivals, how does the user go to late arrivals?"* → **Answer/decision: every tile sub-line item is a link** — clicking `2 late` on the Arrivals tile opens Arrivals with the **Late** chip selected; `1 overdue` → Departures › Overdue; `5 HK` → Rooms › HK; `1 OOO` → Rooms › OOO. Clicking the big number → tab with the default chip. Therefore the alert bar shows only what tiles cannot (expired stays needing No-Show, overdue ≥ 1 day, HK > 2 h, OOO > 1 day), max 3 + "+N". Mockup must make sub-line items visibly clickable (underline on hover, red/amber colour).
- [x] **H5** Alert click → tab + chip **and expands the first matching row** (replaces MV-07 "open folio" variant).
- [ ] **H6** "synced X min ago" dot — keep; Sync/Fetch actions stay on the OTA page (FU-385-B verified).
- [ ] **H7** Retire switches Q1 (Rooms→Check-In: tile expands), Q2 (after checkout: row collapses, stay on tab), Q3 (row click: toggles the same expansion, read-only until Check Out pressed). Keep Q5 (walk-in button).

---

## 2. Arrivals tab

- [x] **A1** Sub-line `2 late · 14 upcoming` hides today's count → `6 today · 2 late · 14 upcoming`.
- [x] **A2** "Late" is **date-based** (`checkin < today`, no check-in time exists in data) → badge `Late · 1 day` + tooltip "check-in date passed, guest not arrived".
- [x] **A3** Upcoming rows show booking ID + unlabelled date → explicit **Check-in** column with `in 4 days / today / 2 days ago`; sort by check-in.
- [x] **A4 Late one-night / expired stay rule:** `checkout ≤ today` → **no Check In**; primary action **Mark No-Show**; row leaves Arrivals after. Stays with nights remaining keep Check In (form adjusts dates to remaining nights).
- [x] **A5** Footer `Cancelled today: N · No-shows today: N` (no-show count derivable from `operational_status === 'no_show'`, OG-PMS-015 resolved).
- [x] **A6** Check-In opens in a side panel → expands below the row (P1). MV-02 gains **expand ★**; side/overlay kept only for comparison.
- [x] **A7** Row = common guest row (P3). Room cell shows `Suite · 230` if pre-assigned (`restaurantTableId`), else `Suite · —`. ₹ cell = booking amount + Prepaid / Pay-at-hotel badge (no folio before check-in).
- [x] **A8** Special-requests dot column → icon inside Guest cell.
- [x] **A9 No-Show for ALL bookings (owner: "need no show for all")** — see §7. Design: No-Show visible on every Late/Today row. **Owner 2026-09-18: owner will raise BQ-385-04 with backend himself; until then fallback NS2 = (b) button shown DISABLED for non-OTA with tooltip "No-show for this source is coming — backend pending".** Expired one-night Direct booking meanwhile: primary shows disabled No-Show + secondary **Cancel** so the row can still be cleared.
- [ ] **A10** [BE] "Late today after check-in time" needs a property `standard_checkin_time` setting — not in data; park as BQ-385-05 or fixed FE assumption (14:00).
- [ ] **A11** "Corporate booking (GSTIN)" checkbox renders detached in the mockup form → fix in rebuild.

---

## 3. Departures tab

- [x] **D1** Chips **Overdue · Today · Upcoming — KEEP Upcoming** *(owner 2026-09-18: 1b)*. Agent note kept for record: Upcoming = In-House stayovers (same people in two tabs) — accepted by owner.
- [x] **D2** Tile sub-line → `4 today · 1 overdue · 13 upcoming`.
- [x] **D3** Two buttons Check Out + Folio → one **Check Out** (P2).
- [x] **D4** Extend Stay modal → expands in place (P1).
- [x] **D5** Footer "Checked out today: 3 → reports" — **owner 2026-09-18: (a) accepted for now**; revisit in FU-385-D.
- [x] **D6** "Overdue" is date-based (checkout < today, no checkout time) → badge `Overdue · 1 day`. [BE] checkout-time setting → same BQ-385-05.
- [x] **D7** Row = common guest row (P3). ₹ = true balance from folio (LR `balance_payment` unreliable — IA §4.6).

---

## 4. In-House tab

- [x] **I1 Action density** — **owner 2026-09-18 (final): ONE approach — 3 buttons `Check Out · Request HK/Mark Clean · Extend` on the row at both widths. No responsive ⋮ fallback.** Row-button set is judged in the mockup together with the expand pattern; if it wraps at 1024 the owner decides there.
- [x] **I2** HK column → HK badge inside Status cell (P3). Show duration `HK · 2h 10m` (board has `room_operational_status_at` ✔).
- [x] **I3** Phone column → inside Guest cell (P3).
- [x] **I4** "Leaving today" chip = Departures-Today (same people) — accepted at intake (R5-std-2); keep.
- [x] **I5** Outstanding ₹ repeated in chips row → tile sub-line only (MV-05 ★ drop).
- [x] **I6** Overdue in-house rows → Status `Overdue · 1 day`, Check Out primary (same as Departures).
- [x] **I7** Check Out / Folio → one Check Out expand (P2); Extend → expand (P1).

---

## 5. Rooms tab

- [x] **R1** Compact tile popover and RS-C side detail card break P1 → tile **expands** into a wide card in the grid (RS-A) or a detail strip under the row (RS-B). Drop popover / side-card variants.
- [x] **R2** Occupied tile "Folio" → **Check Out** (P2) + Request HK / Mark Clean.
- [x] **R3** Available tile **Book Room** → New Booking page — **owner 2026-09-18: (a) accepted for now.** NOTE → **FU-385-D: review ALL PMS screens (New Booking, Reservations, Tape Chart, Reports, OTA) with the same rules after the Front Desk screen is done.**
- [x] **R4** Booked tile Check In → tile expands with the Check-In form (P1).
- [x] **R5** HK duration on tiles `HK · 2h 10m` from `room_operational_status_at`; feeds alert "HK > 2h".
- [ ] **R6** Tile number → backend occupancy % (H3); MV-06 ★.
- [ ] **R7** "Mark All Clean" → confirmation expands under the toolbar listing rooms to clean / skipped (occupied-HK) instead of a toast only.
- [ ] **R8** Density (Comfortable/Compact) and grouping (number/type) — keep as switches MV-08 (RS-A vs RS-B) / MV-09.

---

## 6. Explanations requested by owner (items 2, 3, 5 of the last message)

### I1 — "Action density" (item 2)
Every In-House row currently has **four buttons**: `Check Out` `Request HK` `Extend` `Folio`. At 1024 px width they wrap to two lines and the row gets tall. After P2 (Folio removed) there are three. The question is whether **Extend Stay** — a rare action (a few times a week) — deserves a button on every row, or should sit behind the `⋮` menu like Modify/Cancel do on Arrivals:
- (a) 3 buttons on the row: `Check Out` `Request HK` `Extend`
- (b) 2 buttons + menu: `Check Out` `Request HK` `⋮ → Extend Stay` ★ (cleaner rows, frequent actions one tap, rare action two taps)

### R3 / D5 — "the two navigations that remain" (item 3)
The rule is *no page navigation for daily operations*. Two places in the mockup still leave the workstation:
1. **`+ New Booking`** (header) and **`Book Room`** (available tile) → open the existing New Booking page. Creating a booking is a long form (guest, dates, rates, rooms, OTA sync) — the intake scoped it out of the workstation.
2. **"Checked out today: 3 → reports"** (Departures footer) → opens the Rooms report page for departed guests. That's history, not an operation.
Question: are these two acceptable exceptions? (a) yes, both stay as links ★ (b) New Booking must also expand in place (large scope increase — 900+ line form) (c) drop the reports link entirely.

### H4 — Alert bar (item 5)
The alert bar is the strip under the tiles. Right now it lists four things: *1 overdue departure · 2 late arrivals · Room 207 HK > 2h · 1 unpaid departure today*. Two of those are **already on the tiles** (Departures tile shows "1 overdue"; Arrivals shows "2 late"), so the bar repeats the tiles and gets long on a busy day. Proposal: the bar shows only what a tile **cannot** show —
- a late arrival whose stay has **expired** (needs No-Show — A4),
- an in-house guest **overdue** by ≥1 day,
- a room in **HK for more than X hours** (X configurable; 2 h default),
- a room **OOO for more than a day**,
- maximum 3 items, then "+N more"; click → tab + chip + first row expanded (H5).
Options: (a) that filtered list ★ (b) show everything including tile duplicates (c) no alert bar — tiles carry the red counts.

---

## 7. No-Show for all bookings — the gap (item 4)

**Owner requirement:** every late/expired booking can be marked No-Show, regardless of source.

**Reality (verified):**
| Layer | Fact |
|---|---|
| Backend | `POST /aiosell/mark-no-show {booking_id, channel}` returns **422 "Mark no-show only supports booking.com and gommt. Got: direct"** (probe `probe_15_mark_no_show_direct.json`, CR-358-P5). The endpoint is a **channel-manager relay**: it tells the OTA the guest didn't show and releases OTA inventory. |
| Frontend | `ArrivalsPage.jsx` L21 `OTA_NO_SHOW_CHANNELS = ['booking.com','gommt']`; L342–344 hides the action for everything else. `NoShowDialog` text says "will notify {channel}". |
| Data | Backend sets `operational_status = 'no_show'` on the local reservation after success (OG-PMS-015). |
| Consequence | Direct, walk-in, Goibibo, Agoda, Expedia… bookings have **no No-Show path**. Only **Cancel**. |

**Gap items:**
- [ ] **NS1 [BE] BQ-385-04 — OWNER raises with backend directly (2026-09-18)** — backend to accept `mark-no-show` for **all** channels: for non-OTA / non-relay channels, set `operational_status = 'no_show'` locally and release the room without calling the channel manager. Ask also: does it release **local** inventory for the remaining nights (multi-night)?
- [x] **NS2** Fallback until BQ-385-04: **(b) No-Show shown disabled for non-OTA with tooltip** (owner 2026-09-18). Cancel remains available.
- [ ] **NS3** Dialog copy must not say "will notify {channel}" for Direct/walk-in → "Mark as no-show · releases the room".
- [ ] **NS4** No-show **advance/penalty**: a Direct booking with advance paid — is the advance forfeited/refunded? Not defined anywhere. [BE]/owner rule.
- [ ] **NS5** Where do no-shows go afterwards? Today: OTA reservations screen only. Proposal: footer count "No-shows today: N" (A5) linking to the reservations list filtered `no_show`.
- [ ] **NS6** Auto no-show at night audit (CR-363) vs manual — CR-363 will need the same all-channel rule; note dependency.

---

---

## 10. Search — missing piece (owner 2026-09-18)

**Owner:** "We should be able to search by room number, customer name or phone number. That whole piece is missing."

**Reality (verified):**
| Where | Today |
|---|---|
| Old Front Desk / Arrivals / Departures / Room Status pages | **no search at all** |
| Old In-House page | one local text box (`InHouseGuestsPage.jsx` L19–58): matches guest name, room, booking id, phone — **in-house guests only** |
| Mockup | a grey placeholder "🔍 search guest / booking" on Arrivals and In-House — **not functional, per-tab, not on Departures/Rooms** |
| Data already in memory on the workstation | every reservation in the −60/+30-day window (name, phone, booking id, room type, assigned room, dates, source, status) + all 40 rooms (number, status, current guest). **Everything needed for search is already loaded — no new API call.** |
| Not in memory | guests who departed more than 60 days ago; bookings beyond +30 days → would need a backend search (later) |

**Gap items:**
- [x] **S1 One global search in the header** (not one box per tab) — right of the greeting, always visible, `/` keyboard shortcut. Placeholder: *"Room, guest, phone or booking…"*.
- [x] **S2 Matches across all four states at once**, grouped, max 5 per group: **In-house** · **Arriving** · **Departing** · **Rooms** · **Recent (departed / cancelled / no-show)**. Each result line = room · guest · source · status · dates · balance (same cells as the common guest row).
- [x] **S3 Match rules:** room number (`102`, `r102`, `Suite 102`), guest name (any part, case-insensitive), phone (last digits are enough — `9810` matches `98•••••10`; masked display, unmasked matching), booking id (`BK-3002`, OTA reservation id).
- [x] **S4 Selecting a result** → switches to the right tab + chip, scrolls to the row and **expands it in place** (P1). Room result → Rooms tab with the tile expanded. Selecting an *arriving* guest expands the Check-In; an *in-house* guest expands Check Out (statement + payment).
- [x] **S5 Room number typed alone** (most common front-desk query: "who is in 204?") → Rooms result first with current guest, status, HK duration, balance; one tap → Check Out / Request HK.
- [x] **S6 Phone typed** → also offers **"+ New booking for this number"** when no match (CRM lookup `/pos/customers?search=` already exists for the Check-In form) — accepted navigation (R3).
- [ ] **S7 Beyond the loaded window** (old stays) → "Search past guests in Reservations ↗" link at the bottom of results (navigation, history — same class as D5). Backend search endpoint = later ask if needed (BQ-385-06, low).
- [x] **S8 Chips and search combine**: while a search is active, the tab tables filter to matching rows and the tiles show `3 of 18` so the user sees the filter is on; **Esc / ✕ clears**.
- [ ] **S9 No result** → "No guest or room matches 'xyz'" + the S6/S7 links.

**Where it sits in the layout (P5 small tiles):**
```
Good Morning · Wed 17 Sep · Property   [🔍 Room, guest, phone or booking…      /]   ● synced 5m  [Refresh] [+ New Booking]  BETA
```
Results drop down under the box (max ~8 lines visible, scroll), grouped headers; arrow keys + Enter.

## 7b. Round 3 — mockup v2 feedback (2026-09-18)
- [x] **T1** Tile sub-lines: **remove "upcoming"** from Arrivals and Departures tiles (owner). Tiles now read `Arrivals 6 · 6 today · 2 late` and `Departures 4 · 4 today · 1 overdue`. Upcoming stays as a chip inside each tab.
- [x] **T2 No redirection inside the workstation (owner 2026-09-18)** — fixed X1 Rooms occupied tile Check Out, X2 booked tile Check In, X3 RS-B rows: the tile/row now hosts the same Check Out / Check-In expansion **inside the Rooms tab**. X4 Walk-in expands at the top of the current tab (no switch). Kept as intentional "go to" navigation: tile sub-line links, alert bar items, search results.
- [x] **T3 In-House tile**: "outstanding ₹" removed → `18 guests · 5 leaving today · 6 arrived today` (all links).
- [x] **T4 Tab strip**: height 48 → 60 px (+25%); two-line tiles (title + number / links); Rooms tab 1.6× wider than the other three.
- [x] **T5 Expansion re-check (owner 2026-09-18 "recheck all expand parts")** — fixes: Check Out statement compacted (Guest&stay strip + Charges ledger + Payments + Balance) and **two columns kept at 1024** (statement | 360 px payment) so payment is never below the fold; Check-In header no longer duplicates Confirm (footer only), Adults/Children as two fields, dates as `17 Sep`; table dates `17 Sep` + relative (no wrapping at 1024); **room tile detail is state-specific** (available: ready since / rate / next arrival / last guest · booked: arriving guest / arrives / source / amount · HK: duration / assignee / last guest / next arrival · OOO: days / reason / since / blocked nights · occupied: guest / stay / balance / source).
- [x] **T6** Fixed after re-check: duplicate room detail block (appeared twice when the expanded tile was in the last grid row); In-House / Rooms tile sub-lines overflowing into the neighbour at 1024 (3rd link hidden at 1024, ellipsis). Testing agent run: `/app/test_reports/iteration_1.json` — 12 scenarios, all owner rules verified (no tab switch from Rooms, in-place expansions, two columns at 1024, search, states).
- [x] **T7 Tab strip round 4 (owner 2026-09-18)** — (1) Rooms tab now **2×** the width of the other three; **"N free" is always visible** (first link, green) because it drives bookings — never hidden at 1024. (2) **Red left edge** on a tile when it has trouble: Arrivals with late > 0, Departures with overdue > 0, Rooms with OOO > 0. (3) Rooms sub-line carries a trend hint `· yesterday 60%` (hidden at 1024; real data via `dashboard-kpis` date range — Phase 2 note).
- [x] **T8 Header (owner 2026-09-18)** — greeting addresses the **logged-in user** (`Good Afternoon, Priya`), restaurant name removed from the sub-line (date · shift). Search box narrowed to 380 px and **centred**; header side padding 24 px so `+ New Booking` has breathing space; left and right groups fixed-width so the search stays centred.
- [x] **T9 Header round 2 (owner 2026-09-18)** — (1) greeting/user block is a **user menu** (name · role · shift since · handover note · switch user · sign out); (3) sync dot + Refresh **merged into one button** `● synced 5 min ago ↻` (tooltip shows last refresh time); (4) **BETA badge removed** (beta is signalled by the sidebar label only).

---

## 11. Round 5 (2026-09-18) — "what else" M-list decisions + NEW BOOKING added to scope

**M-list (owner: "rest ok with recommended"):**
- [x] **IN (A — intake-required, missing):** M1 `Tomorrow` chip on Arrivals + Departures · M5 room picker shows clean rooms only, HK rooms greyed with duration · M6 ID block repeats per adult
- [x] **IN (B — design polish):** M2 column sort · M3 sticky table header · M4 post-checkout toast with `[Print bill] [Undo 10s]` · M9 loading skeleton + per-tile "—" + per-panel retry · M11 keyboard: `/` search, `Esc` close, `↑↓ Enter` rows
- [x] **PARKED (C — new features → follow-ups):** FU-385-E guest notes/handover (M7) · FU-385-F bulk-select rooms (M8) · FU-385-G late checkout by hours (M13) · FU-385-H date navigation (M14)
- [x] **Gate 3 notes (D):** M10 role gating (existing role system) · M12 alert dismiss = none

**SCOPE CHANGE — New Booking (owner 2026-09-18: "New Booking page needs to be included in scope")**
- Intake addendum required (Gate 1 doc gets §"Addendum 2026-09-18"); IA re-validation at Hard Gate 2.6 must add the new file. Registry updated.
- Source facts (`pages/pms/NewBookingPage.jsx`, 331 L — stays untouched, OD-385-12): one form = Guest (name*, phone* 10 digits, email, adults*, children) · Room selection (bookable rooms grid, excludes occupied/OOO) · Stay & Amount (check-in*, nights, check-out*, room amount*, meal plan, notes) · summary · Booking type (Direct = save now / Walk-in = check in immediately). Save → `createDirectReservation` → success card with "Check in now" (navigates to Check-In). Walk-in → navigates to Check-In with prefilled state. **Same size class as the Check-In form → fits expand-in-place.**
- [x] **NB1** `+ New Booking` (header) and `Book Room` (available tile) open a **New Booking expansion**: header → at the top of the current panel (any tab, like walk-in today); tile → under the tile row with the room preselected. No page navigation.
- [x] **NB2** Layout 3 columns: **Guest** (name, phone, email, adults/children, CRM returning-guest banner) · **Stay** (check-in, check-out, nights, meal plan, notes) · **Room & amount** (room picker filtered by type/dates, amount, GST preview, summary). Footer: `[Cancel] [Save booking] [Save & Check in now]`.
- [x] **NB3** `Save booking` → toast, row appears in Arrivals (Today or Upcoming), expansion closes, tab unchanged. `Save & Check in now` → expansion **morphs into the Check-In form** prefilled (replaces today's walk-in navigation); on confirm guest lands in In-House.
- [x] **NB4** Walk-in = New Booking with "Check in now" → **Q5 switch retired**, header Walk-in button removed.
- [x] **NB5** [BE] → brief `backend_briefs/BACKEND_BRIEF_CR-385_ADDENDUM_2026-09-18.md` (BQ-385-06 Q1–Q4); mockup shows reserved/HK rooms greyed as the client-side stop-gap.  Room availability for **future dates**: today's page lists rooms bookable *now* (`getBookableRooms`), not by date range → double-booking risk for future bookings. Ask backend for availability by date range (BQ-385-06) or filter client-side from LR window (rooms with overlapping pending/in-house stays) — Gate 3 decision.
- [x] **NB6** Existing OD kept: local booking pushes inventory to OTAs (backend side); show `inventory_push_warning` in toast if returned.
- [x] **T10 Mockup v2.5 (2026-09-18)** — applied: New Booking expansion (header → top of current tab; `Book Room` tile → under tile, room preselected; `Save` → Arrivals; `Save & Check in now` → morphs into Check-In); Q5/Walk-in retired; **M1** Tomorrow chip (Arrivals, Departures); **M2** click-to-sort headers with ▲▼; **M3** sticky headers; **M4** checkout toast `[Print bill] [Undo 10s]`; **M5** room picker = clean rooms, HK greyed with duration, reserved struck-through (Check-In + New Booking); **M6** ID block per adult; **M9** `loading` state (skeleton rows) added to State switches; **M11** keyboard `/` `Esc` `↑↓` `Enter` (focused row outlined).

## 8. Owner decisions recorded this round
| # | Item | Decision |
|---|---|---|
| 1 | D1 Departures Upcoming | **keep (b)** |
| 2 | I1 action density | **(a) 3 buttons if space permits; Extend → ⋮ only when the row would wrap (1024)** |
| 3 | R3/D5 remaining navigations | **(a) accepted for now** → FU-385-D review all screens after Front Desk |
| 4 | No-Show for all | **required**; owner asks backend (BQ-385-04); until then **NS2 (b) disabled + tooltip** |
| 5 | H4 alert bar | **tile sub-line items are clickable links to tab+chip**; alert bar = non-tile items only, max 3 |
| 6 | Search missing | **global header search** (room / name / phone / booking) over data already loaded; result → tab + expanded row (§10) |

## 9. Mockup switch plan after "go"
- Retire: MV-01, MV-03, Q1, Q2, Q3, MV-07 "open folio", MV-08 RS-C.
- Keep: MV-02 (**expand ★** / side / overlay), MV-04, MV-05, MV-06, MV-07 dismiss, MV-08 (RS-A / RS-B), MV-09, Q5, states.
- New: none needed — I1, H4, NS2 decided. Decided items become fixed behaviour in the mockup (not switches).
