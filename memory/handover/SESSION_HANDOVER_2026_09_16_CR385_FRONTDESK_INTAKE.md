# Session Handover — 2026-09-16
## CR-385 PMS Front Desk — Unified Workstation UX Revamp · INTAKE (extended discovery)

```
Session date:     2026-09-16
Role:             INTAKE AGENT (ALPHA v0.7) — extended discovery (6 decision rounds)
Status at close:  CR-385 GATE 1 INTAKE — CLOSED by owner ("close intake gate", round 6). No Gate 2 IA, no Gate 2.4/2.5, no code yet.
Next agent role:  PLANNING (Gate 2 Impact Analysis). FIRST: re-open this handover + intake doc, summarise to owner, ask doubts if anything is missing; proceed to Gate 2 only if owner confirms all is in place.
Workspace:        /app
Branch:           main (repo core-pos-front-end-)
```

**HARD RULES FROM OWNER (verbatim intent):**
1. *"Do not jump gate unless I explicitly tell to close gate."* Gate 1 is closed. Gates 2, 2.4, 2.5, 3, 4 each still need the owner's explicit close.
2. *"First we will do a UX, then move to HTML."* Process: Gate 2 Impact Analysis → **Gate 2.4 UX flow (low-fi)** → **Gate 2.5 HTML mockup with switchable variants** → Gate 3 plan → Gate 4 GO → code.
3. *"I want to see options in mock."* Owner will NOT decide UX options on paper. Every open UX question (§7, MV-01…MV-09) must appear in the Gate 2.5 mockup as a **live switch** (radio/toggle in a mockup control bar), ★ recommendation pre-selected. Owner freezes per item by looking.
4. *"Don't make it complex."* When asking the owner anything: ≤5 questions per message, lettered options, one-line explanations. Never numbered lists inside a question (the chat tool splits them into separate prompts).
5. The words **"Channel Manager" must never appear in any UI/design** for this screen.
6. Q10 live updates = refresh on focus + Refresh button + after every action, **provisional** — re-discuss when backend replies to BQ-385-01.

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

## 4. Screen concept at intake close (detail variants in §7)

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

## 5. Decisions so far (owner-confirmed at intake close; UX detail variants live in §7)

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

## 6. Backend questions to brief in Gate 2 (not yet sent)

- **BQ-385-01 (Q10):** Does backend emit Socket.io events for PMS changes (new OTA booking via AIOSELL webhook, check-in, check-out, room status PATCH, payment)? FE has none today. Owner: *"we have a webhook… ideally everything is on webhook/sockets so we don't lose data; if not, highlight."* → Highlighted: **today nothing pushes PMS changes to the screen.**
- **BQ-385-02 (Phase 2):** aggregation endpoints — `front-desk-snapshot` (replaces 3 calls), `balance_due` on reservation rows (removes N folio calls for In-House and Departures), bulk room-status PATCH (replaces N sequential calls), `room_display_status` on reservation rows.

Backend brief template: `AGENT_PROMPT_ALPHA.md` → BACKEND HANDOFF TEMPLATE → `/app/memory/backend_briefs/BACKEND_BRIEF_CR-385_<DATE>.md`.

---

## 7. UX QUESTIONS → MOCKUP VARIANTS (owner: "I want to see options in mock")

Owner declined to decide these on paper (round 6). Each becomes a **switchable variant in the Gate 2.5 HTML mockup**; ★ = default-selected. Explanations kept here so the mockup control bar can show a one-line hint per switch.

| MV | Question | Variants (★ default) | One-line why |
|---|---|---|---|
| MV-01 | Q2 — click a guest row | ★ right side panel with folio details + actions, list visible · expand in place · none (Folio link only) | folio object already has dates, room, balance due, payments, food orders, requests |
| MV-02 | Q3 — Check-In form location | ★ wide side panel ~720px, sectioned Who→Stay→IDs→Payment, expands to full width at ID photos · full-screen overlay | 910-line form, must not navigate; ID photo previews need width |
| MV-03 | Q13 — cancelled bookings on Arrivals | ★ footer link "Cancelled today: N" · Cancelled chip · not on screen | Arrivals = not-yet-checked-in only |
| MV-04 | Q5 — housekeeping indicator | ★ badge on tiles/rows + HK chip in Rooms toolbar · badge + Rooms-tile "3 HK" shortcut · badge only | badge = state of this room; chip = housekeeper's list / Mark All Clean |
| MV-05 | Q5b — old per-page mini KPI rows | ★ drop, chips carry counts, In-House keeps Outstanding ₹ · keep · Outstanding ₹ only | avoid two rows of numbers under the KPI-tab strip |
| MV-06 | Q6 — Rooms tile big number | ★ 72% occupancy + "18 of 40 · 3 HK · 1 OOO" · available-to-sell count · occupied count | sub-line gives HK/OOO visibility without extra tiles |
| MV-07 | Q7 — alert bar | urgent set ★ overdue departures + late arrivals + HK > 2h + unpaid today's departures (optional: OOO, new OTA booking) · click ★ jump to tile+filter / open panel / both · dismiss ★ none / session / snooze 30m | replaces Departures widget; visible from every tab; zero pixels when quiet |
| MV-08 | Q9 — room board layout | RS-A card grid (actions on card, Compact mode) · RS-B grouped rows (housekeeping sheet) · RS-C colour board + detail panel — **all three built**, no default | 40 rooms must be scannable and actionable |
| MV-09 | Q9b — room grouping | ★ flat by room number + "group by room type" switch · always by type · flat only | no floor field in data |

**Locked (not a variant):** Q10 live updates = option a (refresh on focus + Refresh button + after every action), provisional until backend answers BQ-385-01.

---

## 8. Next steps (each gate needs explicit owner close)

1. **Next agent, first message:** summarise §1, §4, §5, §7 to the owner in plain language (≤5 questions if any doubt). If owner says all in place → start Gate 2.
2. **Gate 2 — PLANNING:** Impact Analysis at `/app/memory/impact/CR-385_IMPACT_ANALYSIS.md` (use `CR-385_DATA_INVENTORY.md`): per-panel data source, component extraction boundaries (`ArrivalsPage`/`DeparturesPage`/`InHouseGuestsPage`/`RoomStatusPage` → panels; `CheckInPage` form body → drawer; success callback replaces `navigate('/pms/in-house')`), `App.js` route impact, `FILE_OWNERSHIP` conflict pre-check (CR-362/365/381 touched these pages). Write backend brief `backend_briefs/BACKEND_BRIEF_CR-385_<DATE>.md` for BQ-385-01 (PMS socket events) + BQ-385-02 (Phase 2 aggregation). Owner closes Gate 2.
3. **Gate 2.4 — UX flow (low-fi):** boxes-and-arrows of the screen (header · KPI-tab strip · alert bar · panel · side panel), click paths for Check-In / Check-Out / HK / Extend, what stays visible per tab. No styling. Owner approves.
4. **Gate 2.5 — HTML mockup:** `/app/frontend/public/cr385-frontdesk-mockup.html`, tokens from `PMS_DESIGN_TOKENS.md`, **40 rooms, busy day** (8 arrivals incl. 2 late, 5 departures incl. 1 overdue, ~18 in-house, 3 HK, 1 OOO), desktop 1440 + 1024 check. **Control bar with switches MV-01…MV-09.** Owner freezes each → `/app/memory/plans/CR-385_DESIGN_DECISIONS.md` (format: CR-379 precedent). Owner closes Gate 2.5.
5. Gate 3 plan → Gate 4 GO → code. Nothing in `src/` before Gate 4.

---

## 9. Follow-ups registered
| ID | Item | When |
|---|---|---|
| FU-385-A | Sidebar PMS links review (remove / re-point / keep), per-screen owner approval | after CR-385 QA PASS |
| FU-385-B | Verify "Sync Now" exists on the OTA config page before removing the card from Front Desk | Gate 2.4 |
| Phase 2 | Backend aggregation endpoints (BQ-385-02) | after Phase 1 ships |

## 10. Unrelated open items carried from earlier sessions (not touched today)
BUG-408 (room payment splits "0" — backend blocked), BUG-409 (parked), CR-377 QA pending, BUG-393 verify inside CR-377 QA.
