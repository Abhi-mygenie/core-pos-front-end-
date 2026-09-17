# Session Handover — 2026-09-16
## CR-385 PMS Front Desk — Unified Workstation UX Revamp · INTAKE (extended discovery)

```
Session date:     2026-09-16
Role:             INTAKE AGENT (ALPHA v0.7) — extended discovery, UX pre-discussion
Status at close:  CR-385 GATE 1 INTAKE — OPEN. Owner has NOT closed the gate. No Gate 2 IA, no Gate 2.4/2.5, no code.
Next agent role:  INTAKE AGENT (continue) — present open questions ONE AT A TIME (see §7), record answers, do NOT close any gate unless owner says "close gate"
Workspace:        /app
Branch:           main (repo core-pos-front-end-)
```

**HARD RULES FROM OWNER (verbatim intent):**
1. *"Do not jump gate unless I explicitly tell to close gate."* Every gate advance needs the owner's explicit words.
2. *"First we will do a UX, then move to HTML."* Process for this CR: Intake → (owner closes) → Gate 2 Impact Analysis → **Gate 2.4 UX flow (low-fi)** → **Gate 2.5 HTML mockup** → Gate 3 plan → Gate 4 GO → code.
3. *"Show me the question and all the options with the details, one by one, and I'll try to freeze."* Next agent presents §7 questions **one per message**, each with full explanation + numbered options + ★ suggestion. Record each answer in the intake doc before the next question.
4. The words **"Channel Manager" must never appear in any UI/design** for this screen.
5. Nothing is frozen yet. "Locked" items in §5 are owner-confirmed directions, still revisitable until the owner says freeze.

---

## 1. What this CR is (read this first)

**Problem (owner, verbatim):** *"The front desk page is there. From there, 90% of operations happen — check-in, check-out, marking for housekeeping. But people are navigating back and forth, and it's not giving a nice experience. On the same screen, everything should be visible."*

**Why we are changing it:** `/pms/front-desk` today is a *dashboard of links*. Each daily operation forces full page navigation and context loss:

| Operation | Today | Jumps |
|---|---|---|
| Check-In | Front Desk → Arrivals page → Check-In page → submit → lands on In-House page | 3 |
| Check-Out | Front Desk (3-row preview) → In-House or Departures page → checkout drawer | 2–3 |
| Mark HK / OOO / Clean | Impossible from Front Desk → Room Status page | 1 always |
| See who arrives tomorrow | Impossible — tile is "Arrivals **Today**" only | — |

Staff perform these 50–200×/day. Additional owner findings during discovery: the Channel Sync card and Departures mini-widget on the right waste space; the KPI tiles are not clickable tabs; "Arrivals Today" hides upcoming arrivals.

**What we are building (Option B, owner-selected):** a **single-screen tabbed workstation** at the same URL. The 4 KPI tiles *are* the tabs. Every daily action happens inline (drawer / side panel), never by page navigation.

**Priority / Risk:** P1 · HIGH (navigation architecture, `App.js` hotspot, 5+ PMS pages recomposed). Fast Lane: NO. Gate 2.5 design freeze: MANDATORY (CR-011 Screen Freeze Protocol).

---

## 2. Documents (all current)

| Doc | Path | Content |
|---|---|---|
| Intake doc (primary, all decision rounds 1–5) | `/app/memory/change_requests/CR-385_PMS_FRONTDESK_UNIFIED_WORKSTATION_UX_REVAMP_INTAKE.md` | problem, scope, ODs, decision logs, N+1 inventory, backend questions, design rules |
| Data inventory | `/app/memory/impact/CR-385_DATA_INVENTORY.md` | every field available per panel; gaps |
| Registry | `/app/memory/control/registry.json` (id `CR-385`) | status, locked/open decisions, follow-ups |
| CR registry row | `/app/memory/control/CR_REGISTRY.md` | one-line status |
| Design tokens (for the eventual mockup) | `/app/memory/control/PMS_DESIGN_TOKENS.md` | Poppins, `#F26B33` orange, `#329937` green, `#1A1A1A`, `#888`, `#E5E5E5`, `#F7F7F7`; forbidden colours listed |
| Precedent for Gate 2.5 artefacts | `/app/memory/plans/CR-379_DESIGN_DECISIONS.md`, `/app/frontend/public/cr379-design-mockup.html` | format to copy when we get there |

---

## 3. Code reality (verified this session)

- No unified/tabbed workstation code exists (`grep FrontDeskTabs|Workstation` → 0).
- Pages to be recomposed: `pages/pms/FrontDeskPage.jsx` (352 L), `ArrivalsPage.jsx` (372), `DeparturesPage.jsx` (311), `InHouseGuestsPage.jsx` (214), `RoomStatusPage.jsx` (344), `CheckInPage.jsx` (910 — form must render in-panel; route `/pms/check-in` stays because other screens deep-link to it).
- Reusable as-is: `components/pms/PmsCheckoutDrawer.jsx` (305, already a drawer, embeds `CollectPaymentPanel`), `ExtendStayDialog`, `ModifyBookingDialog`, `CancelBookingDialog`, `NoShowDialog`, `GuestDocsSection`.
- Data: **everything needed is already fetched** — `pmsService.getReservationOps()` buckets (−60/+30 d): `arrivalsLate / arrivalsToday / arrivalsUpcoming / checkedInToday / inHouse / depOverdue / depDueToday / depUpcoming / depCheckedOut / cancelled`; `getFrontDeskKpis()`; `getRoomStatusBoard()` (statuses available/occupied/occupied_hk/booked/hk/ooo + counts); `getInHouseGuests()` (true balance via per-guest folio call); `getGuestFolio(orderId)`.
- Gaps: no *floor* field on rooms (group by room type only); Arrivals/Departures rows carry booking amount, not balance due; HK state of an occupied room lives only on the room board (client join by room no).
- Sockets: `SOCKET_EVENTS` = POS order/table events only. **Zero PMS socket events or listeners exist.** → backend question BQ-385-01.
- Sidebar (`components/layout/Sidebar.jsx`) has separate links Front Desk / Arrivals / Departures / In-House / Room Status — owner: leave as-is, review later (FU-385-A).

---

## 4. Screen concept as understood today (not frozen)

```
┌ Header: Good Morning · Tue 16 Sep · <Property>   ● synced 5 min ago        [+ New Booking] ┐
├ KPI-TAB STRIP (one row, tiles are the tabs) ─────────────────────────────────────────────┤
│ [Arrivals 8   2 late · 14 upcoming] [Departures 5   1 overdue] [In-House 18] [Rooms 72%  18/40 · 3 HK · 1 OOO] │
├ (alert bar — only when something urgent; design open) ───────────────────────────────────┤
├ PANEL of active tile, full width ────────────────────────────────────────────────────────┤
│ Arrivals:   chips Late · Today · Upcoming            rows → Check-In (in-panel) / No-Show / Modify / Cancel │
│ Departures: chips Overdue · Today · Upcoming (+ footer "checked out today → reports")  rows → Check-Out drawer / Extend / Folio │
│ In-House:   chips All · Arrived today · Leaving today · Stayover   Outstanding ₹ total   rows → Check-Out / Extend / Request HK / Mark Clean / Folio │
│ Rooms:      chips All · Available · Occupied · Booked · HK · OOO · Mark All Clean · Auto-HK pill · density toggle · 3 layout variants to show │
└ Side panel (right): guest quick view / Check-In form / room detail — list stays visible ─┘
```
Removed: Channel Sync card (→ header dot), Departures mini-widget (→ Departures tile + alert bar). Right column gone; panels full width.

---

## 5. Decisions so far (owner-confirmed directions; revisitable until freeze)

| # | Decision | Owner words / round |
|---|---|---|
| OD-01 | 4 tabs: Arrivals / Departures / In-House / Rooms(Occupancy) | "ok for now" (R1) |
| OD-01+07 | **KPI tiles ARE the tabs; one strip; no second tab bar.** Tile content stays (label · big number · sub-line). No extra HK/OOO tiles. | R2 |
| OD-02 | Sidebar links stay as-is. Per-screen review + approval **after** Front Desk is implemented → **FU-385-A**. `Sidebar.jsx` out of blast radius. | R1 |
| OD-03 | **No page navigation for Check-In.** Side panel / expand / overlay pattern → decide via Q3 (§7). `CheckInPage.jsx` form extraction now IN scope. | R1 |
| OD-04 | Check-Out stays `PmsCheckoutDrawer` | default accepted |
| OD-05 | Rooms panel: **Hybrid density toggle** Comfortable (default, full info + CTAs) / Compact; choice persisted in localStorage | R3 |
| OD-06 | Landing tile = Arrivals, not remembered | R1, R5 |
| D-R2-02 | Channel Sync card **removed**. Header shows small green/red dot + "synced X min ago". Sync Now moves to the OTA config page (verify it exists → **FU-385-B**; if missing, separate small CR). **Never write "Channel Manager" in UI.** | R2, R5 |
| D-R2-03 | Departures mini-widget **removed**; space goes to panels | R2 + agent recommendation accepted in principle |
| D-R2-04 | Process: **Gate 2.4 UX flow before Gate 2.5 HTML** | R2 |
| D-R4-01 | Arrivals/Departures show **all** buckets, **today first**; tile labels drop "Today"; no backend change | R4 |
| R5-std-1 | **Arrivals = not-yet-checked-in only** (Late · Today · Upcoming). Checked-in guests → In-House. Cancelled → not on Arrivals (optional footer link). | owner asked standard → agent proposed → accepted |
| R5-std-2 | **Departures = in-house due out** (Overdue · Today · Upcoming). Checked-out → reports link only. Guest leaving today appears in both In-House and Departures (standard). | accepted |
| R5-std-3 | **In-House rows get BOTH Request HK and Mark Clean** (state-dependent). OOO never while occupied (server guard OD-P4-03). | "point 3 is both right" |
| R5-Q4 | Show **true balance due on Departures rows** (folio-based); booking amount on Arrivals | "ok with suggestion" |
| R5-Q4b | **CR-385 Phase 2 = backend aggregation** for every multi-call spot (inventory in intake doc §Round 5) | owner |
| R5-Q7 | **Alert bar is needed** (quick-action reminder, viewable). Design open → Q7a/b/c. | owner |
| R5-Q11 | Mockup: **40 rooms**, busy day, desktop 1440 + 1024 check | owner |
| Per-panel mini KPI strips | Drop (chips carry counts); In-House keeps Outstanding ₹ total | agent suggestion, not objected — confirm in Q5 context |

---

## 6. Backend questions to brief when Gate 2 opens (not yet sent)

- **BQ-385-01 (Q10):** Does backend emit Socket.io events for PMS changes (new OTA booking via AIOSELL webhook, check-in, check-out, room status PATCH, payment)? FE has none today. Owner: *"we have a webhook… ideally everything is on webhook/sockets so we don't lose data; if not, highlight."* → Highlighted: **today nothing pushes PMS changes to the screen.**
- **BQ-385-02 (Phase 2):** aggregation endpoints — `front-desk-snapshot` (replaces 3 calls), `balance_due` on reservation rows (removes N folio calls for In-House and Departures), bulk room-status PATCH (replaces N sequential calls), `room_display_status` on reservation rows.

Backend brief template: `AGENT_PROMPT_ALPHA.md` → BACKEND HANDOFF TEMPLATE → `/app/memory/backend_briefs/BACKEND_BRIEF_CR-385_<DATE>.md`.

---

## 7. OPEN QUESTIONS — present ONE AT A TIME, in this order, with this text

> Presentation rule: one message = one question. Give the explanation, then numbered options, mark ★ suggestion. Wait for the owner's pick. Write the answer into the intake doc (new round) before asking the next. If the owner asks for more detail, expand — don't move on.

### Q3 — Where does the Check-In form open?
**Why it matters:** the Check-In form is the largest component in PMS (910 lines: phone → CRM badge with stays/loyalty/store credit/ID docs, dates, room pick, amount, GST, company GSTIN, adults/children with ID front/back uploads, advance payment + method, note). Owner rule: no page navigation. Question is whether a side panel gives good UX for that much content.
**Agent view:** yes if the panel is wide (~720px ≈ half screen) and sectioned in work order — *1 Who → 2 Stay → 3 Guests & IDs → 4 Payment → Confirm* — with the arrivals queue still visible on the left. Weak spot: ID photo previews get cramped → let the panel expand to full width with one click at that section. Full-screen overlay gives more room but hides the queue.
1. ★ Wide side panel (~720px), sectioned, expandable to full width at the ID section; list visible behind.
2. Full-screen overlay (KPI tiles stay on top; panel body replaced by the form).
3. Put both in the mockup; decide after feeling it.

### Q5 — Housekeeping: badge or filter chip?
**Why it matters:** owner said *"HK should be just a badge in the UI — am I thinking right?"*
**Agent view:** both do different jobs. A **badge** on a room tile / In-House row answers "what's the state of *this* room" — always visible, no click. The **HK chip** at the top of the Rooms panel answers "show me *all* rooms needing cleaning" — the housekeeper's morning list and the set that **Mark All Clean** acts on.
1. ★ Badge everywhere (room tiles + In-House rows) **and** keep the HK chip in the Rooms toolbar.
2. Badge only; no chip. The Rooms tile sub-line "3 HK" is the shortcut into the filtered list.
3. Badge only; no chip, no shortcut.

### Q6 — 4th tile "Rooms": what is the big number?
**Why it matters:** today the tile reads "Occupancy 72% · 18 of 25 rooms" and isn't clickable. As a tab it opens the room board; its sub-line can carry the HK/OOO visibility the owner asked about without extra tiles.
1. ★ **72%** occupancy · sub-line "18 of 40 occupied · 3 HK · 1 OOO" (HK amber, OOO red, only when non-zero).
2. **22** available-to-sell · sub-line "of 40 · 72% occupied · 3 HK · 1 OOO".
3. **18** occupied · sub-line "of 40 · 22 available · 3 HK · 1 OOO".

### Q7a — Alert bar: what counts as urgent? (pick all that apply)
**Why it matters:** owner wants a quick-action reminder visible from every tab, replacing the removed Departures widget. Appears only when non-empty (zero pixels on a quiet day).
1. ★ Overdue departures (past checkout, still in-house)
2. ★ Late arrivals (booked for a past date, never arrived — no-show risk)
3. ★ Rooms in HK longer than N hours (default N = 2h — owner to confirm N)
4. Rooms out of order
5. ★ Today's departures with unpaid balance
6. New OTA booking received since last look (depends on BQ-385-01)

### Q7b — Alert bar: what happens on click?
1. ★ Jump to that tile with the matching filter applied (e.g. Departures → Overdue).
2. Open the guest/room side panel directly for that item.
3. Both: click the text → filtered list; click the guest name → side panel.

### Q7c — Alert bar: can staff dismiss it?
1. ★ No dismiss — stays until the item is resolved; bar vanishes by itself when nothing is urgent.
2. Dismiss per alert for this session only.
3. Snooze 30 min per alert.

### Q9 — Room board layout
**Why it matters:** 40 rooms must be scannable and actionable. Data has **no floor/wing field** — grouping by *room type* is possible, by floor is not (unless room numbers encode it).
1. **RS-A Card grid** — today's tiles evolved; 5–6 per row; actions on the card; Compact mode = chips with actions on click. Best for one-tap actions; ~15 visible at once.
2. **RS-B Grouped rows** — one row per room (number · type · status pill · guest · since · actions), grouped by room type or status; reads like a housekeeping sheet; all 40 scannable.
3. **RS-C Board + detail** — tight colour board of all 40 rooms left, click → details/actions right. Best "whole property at a glance".
4. ★ Build all three in the mockup; pick after seeing them with 40 rooms.

### Q9b — Room grouping
1. ★ Flat, sorted by room number, with a "Group by room type" switch.
2. Always grouped by room type.
3. Flat only.

### Q10 — Live updates (BQ-385-01 goes to backend regardless)
**Why it matters:** owner wants no lost data; today only refresh-on-focus exists and there are no PMS socket events.
1. ★ Refresh on focus + Refresh button + refresh after every action now; switch to socket push once backend confirms PMS events.
2. Add 60-second polling now as a safety net until sockets exist.
3. Wait for the backend answer before deciding.

### Q2 — Guest quick-view side panel (not yet answered)
**Why it matters:** the folio object already carries dates, room, balance due, payments with method, food orders, special requests, phone — enough for a "quick view" without navigating to the Folio page.
1. ★ One click on any guest row (Arrivals / Departures / In-House) opens a right side panel with those details + action buttons (Check-In / Check-Out / Extend / Request HK / Folio). Replaces "View" buttons and most Folio jumps.
2. Row expands in place (accordion) with the same details.
3. Keep rows as today; Folio link only.

### Q5b — Per-panel mini KPI strips (confirm)
Old pages each had their own KPI row (Arrivals 5 tiles, Departures 4, In-House 4). Inside the workstation that would be two rows of numbers under the KPI-tab strip.
1. ★ Drop them; sub-filter chips carry counts; In-House keeps an "Outstanding ₹ total" at the right of its chip row.
2. Keep them.
3. Keep only In-House Outstanding ₹.

### Q13 — Cancelled bookings visibility on Arrivals
1. ★ Small footer text link "Cancelled today: N" (opens the cancelled list in the panel).
2. Keep a "Cancelled" chip.
3. Not on this screen at all.

---

## 8. After all answers are recorded (still no gate jump)

1. Re-summarise all decisions to the owner; ask *explicitly*: "Freeze intake decisions and close Gate 1?"
2. Only on explicit close → PLANNING role: Gate 2 Impact Analysis (`/app/memory/impact/CR-385_IMPACT_ANALYSIS.md`, use the data inventory) + backend brief for BQ-385-01/02.
3. Then Gate 2.4 UX flow (low-fi, text/ASCII boxes-and-arrows, no styling) → owner approves → Gate 2.5 HTML mockup at `/app/frontend/public/cr385-frontdesk-mockup.html` (40 rooms, busy day, 3 room-board variants, Check-In panel + overlay variants if Q3-3), decisions frozen in `/app/memory/plans/CR-385_DESIGN_DECISIONS.md`.
4. No `src/` code before Gate 4 GO.

---

## 9. Follow-ups registered
| ID | Item | When |
|---|---|---|
| FU-385-A | Sidebar PMS links review (remove / re-point / keep), per-screen owner approval | after CR-385 QA PASS |
| FU-385-B | Verify "Sync Now" exists on the OTA config page before removing the card from Front Desk | Gate 2.4 |
| Phase 2 | Backend aggregation endpoints (BQ-385-02) | after Phase 1 ships |

## 10. Unrelated open items carried from earlier sessions (not touched today)
BUG-408 (room payment splits "0" — backend blocked), BUG-409 (parked), CR-377 QA pending, BUG-393 verify inside CR-377 QA.
