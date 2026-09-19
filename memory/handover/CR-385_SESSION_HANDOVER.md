# CR-385 Front-Desk Workstation — SESSION HANDOVER
Date: 2026-06 · Design gate: **CLOSED at v2.25** · Next: QA review (see `plans/CR-385_QA_TEST_PLAN.md`)

## What this is
A single-file, **static, fully-mocked** interactive HTML mockup of the PMS front-desk workstation.
No backend, no persistence — a design prototype for stakeholder + QA review.
- File: `/app/frontend/public/cr385-frontdesk-mockup.html` (self-contained: HTML + CSS + JS).
- Served by the existing frontend at `{REACT_APP_BACKEND_URL}/cr385-frontdesk-mockup.html`.
- Current version string: **v2.25** (see `<title>` and `freeze()`).

## Design goal (product intent)
A compact, operationally realistic front desk using one consistent language:
- Expand work panels **in place** (no modals), critical actions visible without a right-pane
  scrollbar at **1920×800**, **SGST/CGST always separate**, and a property manager able to run
  **every front-desk operation** — including from the Rooms tab.

## State at handover — ALL front-desk panels built
| Panel | Version | Status |
|---|---|---|
| Checkout / Folio | v2.9 | LOCKED (regression only) |
| Check-In | v2.16 | LOCKED (multi-room ON HOLD, Phase-2) |
| New Booking | v2.18 | LOCKED (type-only) |
| Extend Stay | v2.20 | Built, agent-tested |
| Modify Booking | v2.21 | Built, agent-tested (arithmetic = rate×nights) |
| No-Show + Cancel | v2.22 (+reveal-scroll + single-button rule) | Built, agent-tested |
| Room Detail | v2.23 | Built, agent-tested (all ops from tile) |
| Rooms controls | v2.24 | Density removed; light Group segmented control |
| Real board shape + sections + Turns | v2.25 | Built, agent-tested |

There are **no remaining expandable work panels** (Room Detail was the last).

## This session delivered (chronological)
1. **Modify Booking v2.21** — arithmetic corrected so current booking amount = rate × nights
   (regression passed iteration_21).
2. **No-Show + Cancel v2.22** — compact confirmation dialogs; backend-owned penalty; read-only money
   outcome (prepaid→forfeit/penalty w/ separate SGST+CGST→refund→refund-mode Phase-2 mock);
   Variant-A prepaid seeding; added demo expired-OTA arrival (F. Almeida) + review hooks.
3. **v2.22 refinements** — `fitConfirm()` reveal-scroll; **EITHER/OR single-button rule by source**
   (`nsOrCancel()`) across row/kebab/alert/search (OTA→No-Show, non-OTA→Cancel).
4. **Room Detail v2.23** — filled cells per status; added Extend (occupied) + booked kebab
   (Modify + Cancel/No-Show); linked booked rooms to distinct arrivals; reveal-scroll; rate from
   table; "Manage in Housekeeping →" link (CR-365); HK cell for every status.
5. **Rooms controls v2.24** — removed Density/Compact; single light Group segmented control
   (Room no./Type/Area); fixed guest[0] seed check-out date.
6. **Real board shape v2.25** — mock mirrors the real payload; **Area groups by `title` (section)**
   (mock sections Patal Lok/Baga Wing/Anjuna Block/Palm Court); section in detail header;
   **"Turns today" filter**; `hk_assignee` real field name.

## Key code landmarks (in the single HTML file)
- Data seed: `rooms` (+ real-shape fields, `SECTIONS`), `arr` (+ IIFE linking booked→arrivals),
  `guests`, `T='2026-09-17'`, `types`, `CI_RATE`, `NB_TYPES/NB_PLANS`, `OTA_NS`.
- `expansion(o,kind)` → checkout / extend / modify / **noshow** / **cancel** blocks + helpers
  (`prepaidOf`, `nsPenalty`, `cancelPenalty`, `refundCard`, `refundModeToggle`, `CANCEL_REASONS`).
- `nsOrCancel(o)`/`isOTA(o)` — single-button rule. `isTurn(r)` — Turns filter.
- `roomDetail(r)` (routes extend/modify/noshow/cancel/checkin/nb; `rmHk`, `rmNextArrival`, `rateOf`),
  `roomActs(r)`, `roomsPanel()` (Group control + Turns chip + Area-by-title grouping), `kebab(e,id,ota)`.
- `render()` calls `fitCheckin/fitBooking/fitExtend/fitModify/fitConfirm` (reveal-scroll; fitConfirm
  covers noshow/cancel/room-detail).
- Review hooks at init before `render()`: `?bill / ?checkin(&concept) / ?booking / ?open / ?room`.
- `freeze()` dumps a decision snapshot (dev aid).

## Verification provenance (IMPORTANT)
All testing is **agent-tested only** (iterations 12–25, all passing). **No user acceptance** has been
recorded for the later versions — present completion as agent-tested / mockup-shipped, not
user-confirmed. Everything is MOCKED (see QA plan §4).

## Dead-ends / do-not-retry
- Don't merge SGST/CGST; don't allow right-pane internal scroll at 1920×800; don't put room number
  or documents in Booking (both are at Check-In); don't apply Extend's assigned-room move to Modify
  (pre-check-in → type availability); don't show both No-Show & Cancel on one booking; don't reopen
  LOCKED screens (Checkout v2.9 / Check-In v2.16 / Booking v2.18) without explicit ask; don't build
  multi-room Check-In (ON HOLD); the screenshot tool **reloads to the base URL** for its auto-shot, so
  use review-hook URLs (or the testing agent) to verify state; `yarn install` needs `--ignore-engines`.
- `title` is a **shared section**, NOT a floor or per-room name (owner-confirmed); no floor field
  exists in the real payload.

## Next steps (for after QA)
1. QA pass using `plans/CR-385_QA_TEST_PLAN.md`; fix anything contradicting the invariants/§1–§3.
2. Obtain **user/stakeholder acceptance** of v2.19→v2.25.
3. Wire real data: replace mock `SECTIONS` with the board `title` list; read real `guest{}` payload;
   map `hk_assignee`/`room_operational_status_at`; then Section/Floor KPIs.
4. Real refund/credit processing for No-Show/Cancel & Modify; discount unification across screens.
5. CR-365 Housekeeping Workflow is a separate module (owns crew assignment/checklists/timers).

## Docs index
- Decisions: `plans/CR-385_DESIGN_DECISIONS.md` (D40–D43 latest).
- Blueprints: `plans/CR-385_NOSHOW_CANCEL_V2_22_BLUEPRINT.md`, Booking/Extend blueprints.
- PRD/changelog: `PRD.md`. QA: `plans/CR-385_QA_TEST_PLAN.md`. Test reports: `test_reports/iteration_12..25.json`.


## ADDENDUM 2026-06 — QA audit + v2.26 closure
- QA audit (read-only) → plans/CR-385_QA_AUDIT_REPORT.md (31 findings) and the owner-facing HTML at /cr385-qa-fix-plan.html (frontend/public/cr385-qa-fix-plan.html). Fix plan → plans/CR-385_QA_FIX_PLAN.md.
- Owner decision: design gate fixes 19 design items + minimal money/seed sanity in the mockup; full validation/data rules go to the impact-analysis / implementation track as acceptance criteria (D44-h).
- v2.26 implemented (D44): single booking-charge source (`RATE`, `bookingCharge`, `folioOf`, `BILL_D`, `refundOf`, `plural`, `money` 2-dp), Bill room block from the guest record, partial-payment state, two-step Checkout, refund = prepaid − penalty − GST, "✕ Close"/"Close" everywhere, glossary sweep, pills for refund/notify, Room Detail action footer, SVG icons, focus ring, contrast, tab ellipsis, Check-In right pane fits 1366×768, guards (over-collect / past date / adults ≥ 1), seed fixes (no same-day stays), hooks obey source rule, VERSION const.
- Locks: Checkout v2.10, Check-In v2.17, Booking v2.19 (figures/validation/labels only). Evidence: iteration_26 (pre-fix audit), iteration_27 (post-fix, 24/27 → remaining 3 fixed + self-verified: Check-In "✕ Close", balance-remaining clamp, dialog testids).
- Open: owner visual acceptance of v2.26; Safari/Edge manual pass; implementation-track acceptance criteria hand-off.

## NEXT SESSION → read handover/SESSION_HANDOVER_2026_06_CR385_V2_26_TO_IMPACT_ANALYSIS.md
The next agent's task is the complete read-only impact analysis of design v2.26 against the already-implemented PMS Front Desk pages. That file is the entry point; this file is history.
