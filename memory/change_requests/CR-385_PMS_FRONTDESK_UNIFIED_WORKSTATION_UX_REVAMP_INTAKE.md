# CR-385 — PMS Front Desk: Unified Tabbed Workstation UX Revamp

**ID:** CR-385
**Type:** Change Request
**Date registered:** 2026-09-16
**Source:** OWNER-REPORTED (session 2026-09-16 — verbal description)
**Agent role at registration:** INTAKE (ALPHA v0.7)
**Sprint (assigned):** pos_pms_2

---

## Classification

| Field | Value |
|---|---|
| **Priority** | P1 |
| **Risk** | HIGH |
| **Severity trigger** | Navigation architecture change across 5+ PMS pages — 90% of front-desk daily operations affected |
| **Fast Lane eligible** | NO — LARGE blast radius, navigation architecture, multi-file |
| **Gate 2.5 (Design Freeze)** | YES — MANDATORY per CR-011 Screen Freeze Protocol. No code before owner approves mockup. |
| **Gate** | 2 — PLANNING (in progress) |
| **Status** | GATE 2 IN PROGRESS. OD rounds 1+2 answered 2026-09-16. KPI tiles = tabs (one strip). Open: OD-05, OD-08. New sub-gate 2.4 (UX flow) before 2.5. Gate advances only on explicit owner close. |

---

## Problem Statement (owner-reported)

> "The front desk page is there. From there, 90% of operations happen — check-in, check-out, marking for housekeeping. But people are navigating back and forth, and it's not giving a nice experience. On the same screen, everything should be visible."

### Root cause (agent-identified)

The current Front Desk (`/pms/front-desk`) is a **dashboard of links**, not a workstation. Every primary operation forces full page navigation:

| Operation | Current path | Navigation jumps |
|---|---|---|
| **Check-In** | Front Desk → Arrivals page → Check-In page → submit | 3 jumps |
| **Check-Out** | Front Desk → (3-row preview only) → In-House page OR Departures page → Checkout drawer | 2–3 jumps |
| **Mark HK / OOO** | Front Desk → impossible. Must navigate to Room Status page | Always 1 full jump |

Staff loses context on every action. No single view shows Arrivals + In-House + Room Status together.

---

## Approved Design Direction

**Owner selected Option B (2026-09-16):**

> **Tabbed Workstation** — single URL (`/pms/front-desk`), all panels within one frame. Tabs switch context without leaving the page. Details to be finalised at Gate 2.

### Confirmed scope of Option B
- Single URL: `/pms/front-desk`
- Tab strip within the page body (not sidebar navigation)
- Minimum tabs (candidate set — to be locked at Gate 2):
  - **Arrivals** — full arrivals list with inline Check-In action
  - **In-House** — live guest list with inline Checkout + Extend Stay
  - **Departures** — due/overdue list with inline Checkout
  - **Room Status** — room grid with inline HK / OOO / Available marking
- ~~KPI strip remains at top, tabs separate~~ **REVISED Gate 2 R2:** the 4 KPI tiles (Occupancy / Arrivals / Departures / In-House) **are** the tabs — one KPI-tab strip, no second tab bar
- New Booking CTA button always visible in header
- Channel Sync card: candidate for removal (D-385-R2-02); Departures mini-widget: rethink at UX step (D-385-R2-03)

### What does NOT change (scope lock — Gate 2 to confirm)
| Page | Decision | Reason |
|---|---|---|
| `CheckInPage.jsx` | ~~Stays as-is~~ **REVISED at Gate 2 (OD-385-03):** form body extracted for in-workstation rendering; `/pms/check-in` route kept | Owner: "no new page navigation" |
| `GuestFolioPage.jsx` | Stays as-is | Dedicated folio view |
| `ReservationsPage.jsx` (Tape Chart) | Stays as-is | Separate planning tool |
| `ChannelManagerPage.jsx` | Stays as-is | Separate AIOSELL config |
| `NightAuditPage.jsx` | Stays as-is | Separate reporting |
| `RevenueDashboardPage.jsx` | Stays as-is | Separate analytics |
| `NewBookingPage.jsx` | Stays as-is | Complex booking form |

---

## Code Reality Check

```bash
grep -rn "FrontDeskTabs|UnifiedFrontDesk|WorkstationPage|tabbed.*frontdesk" /app/frontend/src/
# Result: 0 hits
```

**Code Reality: NONE** — no unified/tabbed workstation code exists. All current pages are standalone full-page components.

---

## Duplicate Check

| Check | Result |
|---|---|
| Search "front desk revamp / unified / workstation / tabbed PMS" in CR_REGISTRY | **0 hits** |
| CR-358 (all phases P1–P5) | RELATED — built the individual pages this CR absorbs/replaces visually. P1–P5 code stays, just re-composed. |
| CR-362 / CR-365 / CR-381 | RELATED — in-house operations (cancel/modify/extend/HK) these are actions that will surface in the new tabs |
| All other CRs | DISTINCT |

**Duplicate check: DISTINCT. Related: CR-358-P1/P2/P3/P4/P5, CR-362, CR-365**

---

## Severity Rationale

**P1** — The front desk workstation is the **daily operational backbone** of any hotel property.

- Front desk staff perform Check-In / Check-Out / HK marking **50–200 times per day**
- Every navigation jump costs 3–5 seconds + context reload
- Current architecture forces 2–3 full page navigations per operation
- No single view exists showing room status alongside guest queue
- A fragmented multi-page flow is a P1 UX deficiency for a primary workflow module

Agent classification: **P1 HIGH**. Owner confirmed 2026-09-16.

---

## Risk Classification

| Field | Value |
|---|---|
| **Risk** | HIGH |
| **Trigger** | Navigation architecture change (App.js routes), multi-file component composition, 5+ PMS pages restructured |
| **Financial/billing touch** | NO — no order flow, no payment logic, no tax |
| **Hotspot files touched** | `App.js` (route re-point) — HIGH-RISK per R5 list |
| **Process required** | Full gate flow + **Gate 2.5 Design Freeze (MANDATORY)** |

---

## Evidence

| Field | Value |
|---|---|
| Source | OWNER-REPORTED (verbal, session 2026-09-16) |
| Confidence | CONFIRMED — agent verified full page inventory (10 PMS pages, all standalone) |
| Screenshot | Not provided — existing pages are functional, problem is navigation architecture |
| Steps to reproduce | Login → PMS → Front Desk → try to Check-In, Check-Out, mark HK from one screen → impossible without navigating away |
| Code evidence | `FrontDeskPage.jsx` — navigation via `useNavigate()` for every action (arrivals, departures, in-house all link to separate pages) |

---

## Blast Radius

```bash
grep -rn "FrontDeskPage|ArrivalsPage|DeparturesPage|InHouseGuestsPage|RoomStatusPage" /app/frontend/src/ | wc -l
# Result: 17 references
```

| File | Change type |
|---|---|
| `pages/pms/FrontDeskPage.jsx` | MAJOR rewrite — becomes tabbed workstation host |
| `pages/pms/ArrivalsPage.jsx` | Extract list + action logic → reuse as tab panel |
| `pages/pms/DeparturesPage.jsx` | Extract list + action logic → reuse as tab panel |
| `pages/pms/InHouseGuestsPage.jsx` | Extract list + action logic → reuse as tab panel |
| `pages/pms/RoomStatusPage.jsx` | Extract grid + action logic → reuse as tab panel |
| `App.js` | Route re-point (existing 4 routes may consolidate under front-desk) |
| `components/layout/Sidebar.jsx` | OD-385-02 — sidebar links decision (Gate 2) |

**Blast radius: LARGE (~7 files, all PMS core pages)**
**Hotspot files: YES — `App.js`**

---

## Owner Decisions Open (to be answered at Gate 2)

| OD ID | Question | Default if no answer |
|---|---|---|
| **OD-385-01** | Final tab set — confirm: Arrivals / In-House / Departures / Room Status? Any tab to add or remove? | These 4 tabs |
| **OD-385-02** | Sidebar links — do Arrivals / In-House / Departures / Room Status sidebar items stay visible, get hidden, or point to the workstation tab? | Remove individual links, keep "Front Desk" as single PMS entry point |
| **OD-385-03** | Check-In action — from Arrivals tab, clicking "Check-In" opens full `CheckInPage.jsx` (navigate away) OR a slide-over drawer (stays in workstation)? | Navigate to CheckInPage.jsx (complex form, safer) |
| **OD-385-04** | Check-Out action — already a drawer (`PmsCheckoutDrawer.jsx`) — stays as drawer within workstation? | YES — keep as drawer |
| **OD-385-05** | Room Status tab — full grid (all rooms, same as current `RoomStatusPage`) or compact view? | Full grid |
| **OD-385-06** | Default tab on landing — which tab opens first? | Arrivals |
| **OD-385-07** | KPI strip — keep 4 tiles (Occupancy / Arrivals / Departures / In-House) or redesign? | Keep, minor enhancement only |

---

## Gate 2 — Owner Decisions Log (2026-09-16, round 1)

| OD ID | Owner answer | Status | Agent note |
|---|---|---|---|
| **OD-385-01** | "ok for now" — 4 tabs: Arrivals / In-House / Departures / Room Status | **LOCKED (provisional)** | May be revisited after mockup review. |
| **OD-385-02** | Keep sidebar links **as-is for now**. Sidebar modification is a separate follow-up — review + approval needed per screen, after the Front Desk screen is finalised and implemented. | **DEFERRED → FU-385-A** | `Sidebar.jsx` REMOVED from CR-385 blast radius. Follow-up item FU-385-A registered below. |
| **OD-385-03** | **No new page navigation** for Check-In. Explore side drawer / expand-below-row / similar. | **DIRECTION LOCKED — pattern open** | ⚠️ Scope change: `CheckInPage.jsx` (910 lines, CRM + ID docs + GST + advance payment) was "stays as-is / out of scope". Owner direction now requires its form to render *inside* the workstation. See "OD-03 impact" below. Pattern (drawer vs expand-below) to be decided at Gate 2.5 via mockup. |
| **OD-385-04** | (no answer) | **DEFAULT ACCEPTED** | Check-Out stays as `PmsCheckoutDrawer` (305 lines, already a drawer). Consistent with OD-03 "no navigation". |
| **OD-385-05** | "Need to understand what is full grid vs compact" | **OPEN — explained below** | Awaiting owner pick after reading explanation. |
| **OD-385-06** | **Arrivals** is default tab | **LOCKED** | — |
| **OD-385-07** | "Check whether the KPI strip covers all kinds of rooms or anything is missing" | **OPEN — gap analysis below** | Awaiting owner pick (Option A / B / C). |

### OD-385-03 impact (Check-In without page navigation)

Current `CheckInPage.jsx` facts (verified):
- 910 lines, full-page layout with its own `Sidebar`, header, `useSearchParams` (`booking_id`), and `navigate('/pms/in-house')` on success (line 341).
- It is the **largest single component in the PMS module**. Rendering it inside a drawer requires: (a) extracting the form body from the page shell, (b) replacing post-submit `navigate()` with an `onSuccess` callback, (c) replacing `booking_id` URL param with a prop.
- `/pms/check-in` route must **remain** (Room Status "booked" tile and Arrivals page still deep-link to it; also New Booking flow). So the extraction is *reuse*, not *removal*.

Candidate in-page patterns (to be mocked at Gate 2.5 — owner picks one):
| Pattern | Fits Check-In form? | Trade-off |
|---|---|---|
| **P1 — Wide right drawer** (~720px, same shell as `PmsCheckoutDrawer`) | YES — form is vertical, scrolls | Consistent with Check-Out; list stays visible behind. Recommended. |
| **P2 — Expand below row** (accordion inside Arrivals table) | PARTIAL — 910-line form makes the table very tall; other rows pushed off-screen | Best for short actions (Extend Stay, Cancel), not for full Check-In. |
| **P3 — Full-height overlay panel** (covers workstation body, KPI strip + tabs still visible) | YES | Loses the "list visible behind" benefit but gives maximum form width. |

Blast radius update: `CheckInPage.jsx` **ADDED** (MAJOR — extract form body). `Sidebar.jsx` **REMOVED** (deferred to FU-385-A). Net still ~7 files, LARGE.

### OD-385-05 explained — Full grid vs Compact

Both terms refer to how the **Room Status tab** shows rooms. Current `RoomStatusPage.jsx` (verified):

| | **Full grid (current page, as-is)** | **Compact view (new, smaller tiles)** |
|---|---|---|
| Tile size | Large card: room no (20px), room type, status badge, guest name + booking id, "since" timestamp, **2–3 action buttons per tile** | Small chip/tile: room no + colour bar + status badge only. Actions appear on hover/click (popover) or in a side detail panel |
| Rooms per row | 5 on wide screens (`xl:grid-cols-5`) | ~10–12 per row |
| Rooms visible without scrolling (1080p) | ~15 | ~60–80 |
| Actions | One tap — button is right on the tile (Mark Clean / OOO / Request HK / Check In / Book Room / View Folio) | Two taps — click tile → then action |
| Filter chips (All / Occupied / Booked / HK / OOO / Available) + Mark All Clean + Auto-HK pill | Kept | Kept |
| Code effort | LOW — reuse `RoomTile` as-is | MEDIUM — new compact tile + popover/detail panel |
| Best for | Properties ≤ 30 rooms; staff want one-tap HK/OOO | Properties 40+ rooms; staff want the whole floor visible at a glance |

**Agent recommendation:** Full grid (default) *unless* the target property has 40+ rooms. A hybrid is also possible: Full grid by default with a **density toggle** (Comfortable / Compact) in the toolbar — small extra cost. Owner to pick: **Full / Compact / Hybrid toggle**.

### OD-385-07 gap analysis — Does the KPI strip cover all room states?

Current 4 tiles and their data sources (verified in `FrontDeskPage.jsx` + `aiosellTransform.fromDashboardKpis`):

| Tile | Source field(s) | What it shows |
|---|---|---|
| Occupancy | `occupancy_percent_physical`, `occupied`, `total_rooms` | % + "X of Y rooms" |
| Arrivals Today | `arrivals_count` + ops buckets | count + "checked in · pending" |
| Departures | `departures_count` + ops buckets | count + "N overdue" (red) |
| In-House | `in_house_count` | count |

Room states that exist in the system (`roomStatusTransform.DISPLAY_STATUSES`): `available`, `occupied`, `occupied_hk`, `booked`, `hk`, `ooo`.

**Gaps — states with NO KPI tile today:**
| Missing state | Why it matters at front desk | Data already available? |
|---|---|---|
| **HK (needs housekeeping)** | Core daily op (owner named it explicitly). Staff can't see "how many rooms are dirty" without opening Room Status. | YES — `board.counts.hk` (from `GET room-status-board`, already fetched by Room Status tab) |
| **OOO (out of order)** | Affects sellable inventory; invisible today | YES — `board.counts.ooo` |
| **Available / Ready to sell** | Only shown as small text inside the Channel Sync card ("Available tonight: X / Y") — not a tile | YES — `availableTonight` (KPIs) or `board.counts.available` |
| **Booked (reserved, not yet arrived)** | Partially covered by "Arrivals pending" | YES — `board.counts.booked` |
| **Occupied·HK (stayover, HK in progress)** | Sub-state of occupied; minor | YES — `board.counts.occupied_hk` |

Also noted: **no KPI tile is a "Rooms" tile** — all 4 are guest-flow tiles; room-condition tiles are absent entirely.

Options for owner:
| Option | Tiles | Note |
|---|---|---|
| **A — Keep 4** | Occupancy / Arrivals / Departures / In-House | No change. HK/OOO only visible in Room Status tab. |
| **B — 6 tiles** (recommended) | Occupancy / Arrivals / Departures / In-House / **Housekeeping (HK)** / **Out of Order (OOO)** | Adds the two operational room-condition states. Clicking HK/OOO tile switches to Room Status tab with that filter pre-applied. Data already fetched — zero new API. |
| **C — 4 + room strip** | Keep 4 guest tiles; add a slim **room-state bar** under them: `Available N · Occupied N · Booked N · HK N · OOO N` (coloured dots, matches Room Status filter colours) | Covers *all 6* states in one line; each segment jumps to Room Status filter. Slightly more visual weight. |

Cost: B and C both LOW (board data already loaded by Room Status tab; lift it to workstation level). No backend change.

### Follow-up items registered
| ID | Item | Trigger |
|---|---|---|
| **FU-385-A** | Sidebar PMS links review (Arrivals / In-House / Departures / Room Status) — remove / re-point / keep. Per-screen review + owner approval required. | After CR-385 Gate 5b QA PASS. Do not bundle into CR-385. |

## Gate 2 — Owner Decisions Log (2026-09-16, round 2)

### D-385-R2-01 — KPI tiles ARE the tabs (supersedes OD-385-07 options A/B/C)
Owner: *"KPI is fine as it is written, but these are also clickable tabs. We should have only tabs and a KPI mix, not different tabs. When we click on these tabs, the information for these tabs should be visible."*

**Locked:**
- **ONE strip, not two.** No separate tab bar under the KPI strip. The 4 KPI tiles double as the tab selectors (a "KPI-tab" strip). Active tile is visually highlighted; its panel renders below.
- Tile content stays as today (label + big number + sub-line). OD-385-07 → **RESOLVED: keep 4 tiles, make them tabs.** Options B/C (extra HK/OOO tiles) are **dropped** for now.
- Tile → panel mapping (agent proposal, to confirm at UX step):

| KPI-tab tile | Panel shown below | Source page being absorbed |
|---|---|---|
| Arrivals Today *(default, OD-06)* | Arrivals list + inline Check-In (OD-03) | `ArrivalsPage.jsx` |
| Departures | Due/overdue list + inline Check-Out drawer (OD-04) | `DeparturesPage.jsx` |
| In-House | Live guest list + Check-Out / Extend / Modify / Cancel | `InHouseGuestsPage.jsx` |
| **Occupancy** | **Room Status board** (grid + HK/OOO/Available actions) | `RoomStatusPage.jsx` |

⚠️ Open point **OD-385-08**: the 4th tile is labelled "Occupancy" (a %), but the panel behind it would be the Room Status board. Owner to confirm one of: (a) keep label "Occupancy", panel = Room Status; (b) relabel tile to "Rooms" / "Room Status" showing occupancy % + "X of Y" inside; (c) Room Status accessed differently. **Resolve at UX step, not now.**

Consequence: OD-385-01 (tab set) and OD-385-07 (KPI) merge into a single decision — the 4 KPI-tabs above.

### D-385-R2-02 — Channel Sync card (right column) — candidate for REMOVAL from Front Desk
Owner: *"I see a Channel Sync button on the right-hand side. I don't think we need that, right?"*

Facts (verified `FrontDeskPage.jsx` L270–285): card shows "AIOSELL · synced X min ago", "Available tonight: X / Y", and a **Sync Now** button (pull bookings + push inventory). Added under CR-358-P3 OD-P3-11(c).
- Agent view: Sync Now is an *admin/config* action, not a front-desk daily op. Natural home is `ChannelManagerPage.jsx` (already the AIOSELL config screen).
- Nothing else on Front Desk depends on the card; `getChannelSyncStatus()` call can be dropped from the workstation load (one API call fewer).
- Status: **REMOVE — pending final confirmation at UX step.** If removed, verify Sync Now exists (or is added) on Channel Manager so the capability is not lost. Registered as **FU-385-B**.

### D-385-R2-03 — "Departures Today" mini-widget — RETHINK at UX step
Owner: *"Not sure if we need that also… it's just a small widget, it looks nice, but when we are revamping the page we might have to check the space."*

- With Departures becoming a full KPI-tab panel, the 3-row mini-widget becomes redundant *unless* the UX wants a persistent "due now" sidebar visible from every tab.
- Status: **OPEN — decide at UX step.** Two candidate outcomes: (a) drop it — Departures tab covers it; (b) keep a slim right rail (Departures due + overdue count) visible across tabs. Space budget decides.

### D-385-R2-04 — Process: UX step BEFORE HTML mockup (new sub-gate)
Owner: *"Before going into the HTML mockup, first we will do a UX."*

**Locked process for CR-385:**
| Step | Deliverable | Fidelity | Owner action |
|---|---|---|---|
| **Gate 2** (now) | Decision log + Impact Analysis (data sources, component boundaries per panel) | Text | Answer open ODs |
| **Gate 2.4 — UX Flow** *(NEW)* | Low-fi wireframe / flow: KPI-tab strip, panel regions, where drawer opens, what stays visible per tab, space budget (Channel Sync / Departures widget yes-no), click paths for Check-In / Check-Out / HK | Boxes-and-arrows (text/ASCII or simple diagram), **no styling** | Review & approve UX |
| **Gate 2.5 — Design Freeze** | HTML mockup, styled per `PMS_DESIGN_TOKENS.md` | Hi-fi | Approve design |
| Gate 3 → 4 → 5 | Plan → GO → Implement → QA | — | — |

**Gate rule (owner, 2026-09-16): agent does NOT advance to the next gate unless the owner explicitly says to close the current gate.**

### Follow-up items (round 2)
| ID | Item | Trigger |
|---|---|---|
| **FU-385-B** | Confirm Sync Now / AIOSELL sync status is available on `ChannelManagerPage.jsx` before removing the Channel Sync card from Front Desk | Gate 2.4 decision |

### Gate 2 status (after round 2)
- Locked: OD-01+OD-07 (merged → 4 KPI-tabs, one strip), OD-03 (no navigation for Check-In), OD-04 (default), OD-06 (Arrivals), process (UX step before mockup)
- Deferred: OD-02 → FU-385-A
- **Still open (owner answer needed): OD-05 (Full / Compact / Hybrid room grid), OD-08 (Occupancy tile ↔ Room Status panel labelling)**
- **To decide at Gate 2.4 UX step:** OD-03 pattern (P1/P2/P3), Channel Sync removal (D-R2-02), Departures widget (D-R2-03), OD-08
- Next agent action inside Gate 2: Impact Analysis (per-panel data sources + component boundaries). **Gate 2 remains OPEN. Gate 2.4 / 2.5 NOT started.**

---

## Gate 2.5 — Design Freeze Note (MANDATORY)

Per **CR-011 Screen Freeze Protocol**, Gate 2.5 is mandatory for this CR because:
- It is a full UX revamp (not an incremental feature)
- Navigation architecture changes affect 5+ pages
- Owner explicitly said: *"freeze the UX and flow first, then come to the design"*

**Gate 2.5 deliverable:** Live HTML mockup of the tabbed workstation (all 4 tabs, KPI strip, inline actions) served at a dev URL. Owner approves before Gate 3 Implementation Plan is written.

No code in `src/` is written until Gate 2.5 is approved.

---

## Absorbed Items

None — this is a new CR. Related CRs (CR-358-P1/P3/P4) built the underlying pages; their code is reused/re-composed, not discarded.

---

## Next Steps

1. **Owner answers OD-385-01 through OD-385-07** (or accepts defaults) → unlocks Gate 2
2. **Gate 2** → Impact Analysis (agent traces each tab's data sources, API calls, component boundaries)
3. **Gate 2.5** → HTML mockup built → owner approves design
4. **Gate 3** → Implementation Plan (exact edits, file-by-file)
5. **Gate 4 GO** → Owner approves plan → Implementation begins

---

*Intake complete. Code reality: NONE. Duplicate check: DISTINCT. Blast radius: LARGE. Gate 2.5 mandatory.*
*Owner direction locked: Option B (Tabbed Workstation). OD-385-01 through OD-385-07 open for Gate 2.*
