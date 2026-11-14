# SESSION HANDOVER — CR-385 Front Desk · next task: **IMPACT ANALYSIS (design v2.26 → existing implementation)**
Date: 2026-06 · From: design/QA session (mockup v2.26 closed) · To: impact-analysis agent
Read this file first. Then read ONLY the files in §2 in the order given. Everything else in `/app/memory` is historical noise for this task unless §2 points you to it.

---

## 0. Your task in one paragraph
The Front Desk workstation has been **designed** (static HTML mockup v2.26, agent-tested, owner acceptance pending) and it has **already been implemented once** in the real React app (`/pms/front-desk` and sibling PMS pages, built under earlier CRs — CR-358 P1–P5, CR-162/163/364/365, BUG-38x/39x/4xx). The two have drifted. Your job is a **complete, read-only impact analysis**: for every screen, control, state, calculation and rule in the design, find the corresponding implementation (or its absence), verify against the **proof** (test reports, decisions, acceptance criteria), and produce a gap register with effort/risk so the owner can plan the implementation phase. **Do not modify code.** Output = one impact-analysis document (template in §7).

---

## 1. What "the design" is (source of truth, in priority order)
1. **`/app/frontend/public/cr385-frontdesk-mockup.html`** — v2.26, single file, fully interactive mock. Open it at `{REACT_APP_BACKEND_URL}/cr385-frontdesk-mockup.html` (URL from `/app/frontend/.env`). Review hooks: `?bill=102` · `?checkin=a2` · `?booking=1` · `?open=ans:noshow` · `?open=a0:cancel` · `?room=101` · `?room=101:extend` · `?room=119` (booked, Direct) · `?room=223` (booked, OTA). Mock "today" = 2026-09-17.
2. **`/app/memory/plans/CR-385_DESIGN_DECISIONS.md`** — D1…D45. The **binding rules** live here. Most recent: **D44** (QA-audit closure: money source of truth, GST-on-penalty, partial payment, two-step checkout, glossary, locks) and **D45** (Phase-2 notes). Locked screen versions: **Checkout v2.10 · Check-In v2.17 · Booking v2.19**; Multi-room Check-In = Phase 2 / ON HOLD.
3. **`/app/memory/plans/CR-385_IMPLEMENTATION_ACCEPTANCE_CRITERIA.md`** (AC-01…AC-21; tick-box copy at `/cr385-acceptance-criteria.html`) — the behaviour the real app must satisfy. Treat each AC as a row you must map to code.
4. **`/app/memory/plans/CR-385_QA_AUDIT_REPORT.md`** + **`CR-385_QA_FIX_PLAN.md`** + owner HTML `/cr385-qa-fix-plan.html` — the 31 QA findings (QA-385-001…031) and how each was resolved in the mock. Useful because the implementation very likely has the **same classes of defect** (hard-coded amounts, mixed amount bases, missing guards, label drift).
5. **`/app/memory/plans/CR-385_QA_TEST_PLAN.md`** (§1–§6) — expected values per screen; §6 = v2.26 checks.
6. Older design intent (only if a decision is unclear): `plans/CR-385_UX_FLOW_GATE_2_4.md` (screen skeleton), `plans/CR-385_DESIGN_GAP_CHECKLIST.md`, blueprints `CR-385_BOOKING_V2_17_BLUEPRINT.md`, `CR-385_EXTEND_STAY_V2_19_BLUEPRINT.md`, `CR-385_NOSHOW_CANCEL_V2_22_BLUEPRINT.md`, intake `change_requests/CR-385_PMS_FRONTDESK_UNIFIED_WORKSTATION_UX_REVAMP_INTAKE.md` (owner decisions OD-385-xx, backend questions BQ-385-01…07).

**Precedence when documents disagree:** D44/D45 > the v2.26 mockup > acceptance criteria > QA plan > older blueprints/intake. If the mockup and a decision disagree, flag it as a *design defect*, do not pick one silently.

## 2. Reading order (≈ 45 min)
1. This file. 2. `CR-385_DESIGN_DECISIONS.md` §D44–D45, then skim D1–D43 headings. 3. `CR-385_IMPLEMENTATION_ACCEPTANCE_CRITERIA.md`. 4. Walk the mockup with every hook in §1.1 at 1920×800 and 1366×768. 5. `CR-385_QA_AUDIT_REPORT.md` §C (registry) and §H (regression groups). 6. `/app/test_reports/iteration_26.json` (pre-fix audit) and `iteration_27.json` (post-fix verification) — these are the **proof**; note the 3 items fixed after iteration_27 (Check-In "✕ Close", balance-remaining clamp, dialog test ids — self-verified, not agent-tested). 7. Then the implementation (§3).

## 3. Where the existing implementation lives (React, `/app/frontend/src`)
| Design surface (mockup) | Existing implementation | Notes for gap-finding |
|---|---|---|
| Workstation shell: header/search, KPI tab strip, alert bar, tabs | `pages/pms/FrontDeskPage.jsx` (352 lines, route `/pms/front-desk`, built under CR-358-P3) + `components/layout/Sidebar.jsx` | Design = one page with 4 tabs + expand-in-place rows. Implementation may still navigate to separate pages (below). |
| Arrivals / Departures / In-House lists | `pages/pms/ArrivalsPage.jsx`, `DeparturesPage.jsx`, `InHouseGuestsPage.jsx` | Design says these are **tabs**, not pages (OD-385-03: no page navigation for Check-In). |
| Check-In (v2.17) | `pages/pms/CheckInPage.jsx` (910 lines), `components/pms/GuestDocsSection.jsx` | Check IDs/documents, room assignment/upgrade, B2B GST capture, auto-print default, collect-now, late-arrival note, "1 night" plural, reference field only after method. |
| New Booking (v2.19) | `pages/pms/NewBookingPage.jsx`, `pmsService.createDirectReservation` | Type × rate-plan grid, optional advance, B2B, guards (past date, adults ≥ 1, advance ≤ total), Save & check in now. |
| Bill / Checkout (v2.10) | `components/pms/PmsCheckoutDrawer.jsx`, `pages/pms/GuestFolioPage.jsx` | Room block from booking record, SGST→CGST, Amount received + Outstanding + Credit, two-step checkout, per-folio adjustment state. Known history: BUG-401/425 (room GST omitted), BUG-386/388/396 (GST base). Verify these are really fixed. |
| Extend Stay | `components/pms/ExtendStayDialog.jsx`, `pmsService.extendStay` | Conflict → room move, discount with reason, collect ≤ payable, "Pending balance · bill". |
| Modify Booking | `components/pms/ModifyBookingDialog.jsx`, `pmsService.modifyReservation` | Type inventory grid, change ±, reason required, guards. |
| No-Show / Cancel | `components/pms/NoShowDialog.jsx`, `CancelBookingDialog.jsx`, `pmsService.markNoShowBooking / cancelReservation` | Confirmation dialogs, read-only money outcome, refund = prepaid − penalty − GST, source rule (OTA → No-Show only, non-OTA → Cancel only), config-driven reasons. See BUG-385 (no-show field) and CR-358-P5. |
| Rooms board / Room Detail | `pages/pms/RoomStatusPage.jsx`, `pmsService.getRoomStatusBoard / patchRoomStatus / bulkMarkClean` | Group Room no./Type/Area (Area = board `title`, not floor), Turns today, Room Detail 4-cell grid + footer actions, HK read-only + link to CR-365. |
| KPIs / alerts | `pmsService.getFrontDeskKpis`, `getReservationOps`, `bucketReservationOps` | "Leaving today" must exclude overdue; KPI number = list count. |
| Data layer | `api/services/pmsService.js` (560 lines) — reservations, check-in, room board, rates, no-show, cancel, modify, extend, folio, night audit | Map every design field (booking charge, prepaid, pah, plan, title, hk_assignee, room_operational_status_at, guest{}) to a real payload field or mark **BACKEND GAP**. |

Related backend-side references already in memory: `change_requests/CR-365_PMS_HOUSEKEEPING_WORKFLOW_INTAKE.md` (HK module boundary), `CR-364_*` (folio detail/print), `CR-162_*` (mid-stay partial payment), `CR-163_*` (room-table food transfer), `investigations/INV_DAILY_REPORT_PMS_GAPS_2026_09_15.md`, `INV-PMS-CHECKIN-CRM-GAP_*`. Open backend questions from intake: **BQ-385-01** (sockets/webhook push), **BQ-385-02** (aggregation endpoints), **BQ-385-04** (non-OTA no-show), **BQ-385-06** (availability by date range), **BQ-385-07** (room-level discount at checkout). Check whether any were answered since (grep `BQ-385` in `/app/memory`).

## 4. What to validate — the checklist (do all of it)
**A. Validation date / proof check**
- Confirm mockup `<title>` says v2.26 and `VERSION='v2.26'`; confirm `iteration_27.json` date and pass list; confirm the three post-27 fixes exist in the file (`checkin-close-button` text "✕ Close"; `Math.max(0,f.balanceRemaining)` on extend/modify; `noshow-close-button` / `cancel-close-button`). If anything is missing → record as **design-build defect**, not implementation gap.
- Confirm owner visual acceptance status in `PRD.md` (currently **pending**). Flag it: the design is agent-tested, not owner-accepted.

**B. Design-vs-decision consistency ("is everything in the design validating?")**
- For each D44 sub-decision (a–j) and each AC, open the mockup and prove the rule is visible there (e.g. AC-05 → `?open=ans:noshow` shows Total deducted; AC-12 → tab strip "4 leaving today" = Departures "4 today"). Anything the mockup fails → design defect list.
- Check the permanent constraints are honoured in the mock: separate SGST/CGST; no right-pane scroll at 1366×768 for money panes; Booking = room type only (no room number, no IDs); confirmation dialogs for No-Show/Cancel; never both No-Show and Cancel for one booking; Area = `title`, never floor from room number; HK crew assignment not in Room Detail.

**C. Implementation gap register (the core)**
- For each row of §3 and each AC-01…AC-21: **Present / Partial / Missing / Contradicts**, with file + line, the API call involved, and whether the gap is **FE-only**, **needs backend field/endpoint**, or **needs product decision**.
- Pay special attention to the defect classes the QA audit found in the mock, because the earlier implementation was built before those rules existed: hard-coded amounts; amount base mixing (per-night vs total; base vs GST-inclusive); prepaid derived from channel; missing guards (over-collect, past dates, adults); "leaving today" including overdue; folio state leaking between guests; label drift (Check In / Check-in / Check-In; Cancel vs Close); ISO dates; emoji icons; No-Show colour; tax order.
- Navigation model: design is **one workstation, expand-in-place**; implementation has separate pages (`ArrivalsPage`, `CheckInPage`, …). Decide and document whether the impact is "refactor into tabs" or "keep pages, restyle" — this is the single largest architectural gap; quantify it.
- Data: list every field the design needs that `pmsService` responses do not currently provide (booking charge total, plan code, `prepaid`, `pah`, penalty+GST for no-show/cancel, room `title`, `hk_assignee`, `room_operational_status_at`, turn indicator, KPI counts). Each → BACKEND GAP with a proposed contract.

**D. Blast radius & risk**
- Which existing flows (POS, GST invoice, CRM lookup, printing CR-364, HK CR-365, night audit, revenue dashboard) share components or services with the touched files. Note any file > 700 lines (CheckInPage.jsx is 910) as a refactor risk.

## 5. What NOT to do
- Do not change any file under `/app/frontend/src`, the mockup, or `.env`. Read-only.
- Do not reopen closed design decisions (D1–D45); if you think one is wrong, log it under "Design questions for owner" with evidence.
- Do not treat mocked values (rates, 2.5 %/2.5 % GST sample, penalties, HK timers, section names) as requirements — the **rules** are the requirements.
- Do not rely on older handovers/plans (BATCH09, CR-358 gates, BUG-4xx) for design intent — they predate D44. Use them only to understand *why the implementation looks the way it does*.
- Do not run plain `yarn install` (Node engine issue); frontend is supervisor-managed.

## 6. Known state you can trust
- Mockup v2.26 parses clean, 0 console errors on every hook; verified iteration_27 (24/27) + 3 self-verified follow-ups.
- Locks: Checkout v2.10, Check-In v2.17, Booking v2.19; Multi-room Check-In ON HOLD; Floor KPIs parked (no floor data); Shift Summary card = Phase 2 (D45-a); real section `title` list still awaited from owner (only "patal lok" confirmed) — Area grouping already derives from room titles (D45-b).
- Test credentials for the real app (if you need to log in to compare): `/app/memory/test_credentials.md`.

## 7. Deliverable — `/app/memory/investigations/CR-385_IMPACT_ANALYSIS_<date>.md`
1. Executive summary (5 lines): overall fit, biggest gaps, estimated effort band, decisions needed.
2. Proof/validation check results (§4A) — pass/fail table.
3. Design self-consistency results (§4B) — design defects found (if any).
4. **Gap register** — table: `ID · Design surface / AC · Rule (D-ref) · Implementation location · Status (Present/Partial/Missing/Contradicts) · Gap type (FE / Backend / Decision) · Effort (S/M/L) · Risk · Evidence (file:line or screenshot)`.
5. Backend contract gaps — proposed fields/endpoints, linked to BQ-385-xx.
6. Architecture note — tabs-vs-pages decision options with effort.
7. Blast radius.
8. Recommended implementation phases (P0 money integrity → P1 validation/source rule → P2 workstation shell → P3 consistency/a11y), each with its acceptance-criteria IDs and regression groups from the QA audit §H.
9. Open questions for the owner.
Update `/app/memory/PRD.md` with a short entry and finish with the platform summary.
