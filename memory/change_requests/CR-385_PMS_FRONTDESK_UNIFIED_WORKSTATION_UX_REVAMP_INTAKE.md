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
| **Gate** | 1 — INTAKE COMPLETE |
| **Status** | INTAKE — Gate 1 COMPLETE. Awaiting Gate 2 GO (owner). |

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
- KPI strip (Occupancy / Arrivals / Departures / In-House) remains at top, always visible regardless of active tab
- New Booking CTA button always visible in header

### What does NOT change (scope lock — Gate 2 to confirm)
| Page | Decision | Reason |
|---|---|---|
| `CheckInPage.jsx` | Stays as-is | Complex form (CRM, ID docs, GST, advance payment) — no change |
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
