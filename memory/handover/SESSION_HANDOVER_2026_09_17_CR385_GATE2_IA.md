# Session Handover — 2026-09-17
## CR-385 PMS Front Desk Unified Workstation · PLANNING (Gate 2 Impact Analysis)

```
Session date:     2026-09-17
Role:             PLANNING (ALPHA v0.7) — Stage: Impact Analysis ONLY (owner choice 1a)
Registry synced:  YES (CR-385 gate 1→2, status + artifacts updated)
Scope drift:      NONE — zero src/ changes; docs + evidence only
Status at close:  GATE 2 CLOSED by owner 2026-09-17. Backend brief written. Owner added HARD GATE 2.6 (IA re-validation after final design, before Gate 3).
Next agent role:  PLANNING/DESIGN — Gate 2.4 low-fi UX flow (boxes + arrows, ≤5 questions per message, owner approves) → Gate 2.5 HTML mockup
Workspace:        /app · branch PMS17
```

## Owner choices this session
| Q | Answer |
|---|---|
| Scope | Impact Analysis only; owner closes Gate 2 |
| Backend brief (BQ-385-01/02) | **HOLD until Gate 2 closed** |
| Curl probes | Yes — owner supplied a preprod account (alias `goankitchen_owner_rid69`, RID 69, sandbox PMS). Password NOT stored in docs (R20). |
| FU-385-B | Verify inside IA → **DONE**: OTA page has "Sync All Now" + "Fetch Reservations" + last-sync |

## Artifacts
- **IA:** `/app/memory/impact/CR-385_IMPACT_ANALYSIS.md` (§4.5 Check-In extraction contract, §4.6 balance probe, §5 scope lock, §6 new ODs)
- **Evidence:** `/app/memory/evidence/CR-385/` — `local_reservations`, `dashboard_kpis`, `room_status_board`, `aiosell_status` (all HTTP 200, phone/email redacted), `balance_compare.json`
- Registry: `control/registry.json` CR-385 → gate 2 (IA written, open), `CR_REGISTRY.md` row, `CONTROL_DASHBOARD.md` line, `OPEN_GAPS_REGISTER.md` (OG-PMS-017/018)

## ⚠️ OD-385-12 (owner, later in session) — supersedes Rev 1 file plan
"We will create a new page. No existing pages should be touched. Entirely new design, like a beta; then we disable the old page." → IA Rev 2: 13 NEW files under `components/pms/frontdesk/` + `pages/pms/FrontDeskWorkstationPage.jsx` + `api/services/frontDeskService.js`; **App.js +2 lines only**; Check-In form and RoomTile are **copies** (mirror rule R9); cutover = **FU-385-C**. OD-385-09 superseded. New open: OD-385-13 (route), OD-385-14 (sidebar item vs URL-only).

## Key findings (read before Gate 2.4)
1. **Code reality NONE**; `App.js` needs **0 edits** (route already points to `FrontDeskPage`). Intake said "re-point" — corrected.
2. **LR rows carry `balance_payment` but it is unreliable** (900 vs 950 on identical folios; excludes F&B). Q4 stays folio-based → strengthens BQ-385-02.
3. Board rows carry `hk_assignee`; KPIs carry `no_show_count` — both unread by FE. `hk_assignee` → CR-365. `no_show_count` → BUG-385 may be backend-resolved (OG-PMS-017).
4. **Conflicts:** BUG-411 + BUG-402 (awaiting QA) share `CheckInPage.jsx` / `InHouseGuestsPage.jsx` → CR-385 Gate 4 after their QA. **CR-365 must target the new `RoomsPanel`/`RoomTile`, not `RoomStatusPage.jsx`.**
5. Check-In extraction: form body = `CheckInPage.jsx` L457–905 → `components/pms/CheckInForm.jsx`; only logic edit is L341 `navigate` → `onSuccess`. Row shape `fromReservationOps` ⊇ `fromPendingArrival` ✔.
6. `View Folio` on room tiles → `/reports/rooms`, elsewhere → `/pms/folio/:id` (SC-385-01).

## Open owner decisions (new, non-blocking for mockup)
**LOCKED:** OD-385-13 = `/pms/front-desk-v2` · OD-385-14 = +1 sidebar item "Front Desk (Beta)" · OD-385-10 = `?tab=` yes · OD-385-11 = degrade Rooms tab only.
**LOCKED OD-385-15:** owner: folio + checkout on ONE screen, no second pop-up, Print Bill + Print Folio. → `FolioCheckoutPanel` (IA §4.9): folio cards left + `CollectPaymentPanel` inline right (host logic copied verbatim from `PmsCheckoutDrawer`, R12). Check Out / View Folio buttons open it; no drawer on new page. Print Folio disabled until CR-364-PRINT (backend-blocked). **OPEN:** MV-01 layout variant (full-width ★ / overlay / collapsed) → mockup. SC-385-01 superseded.

## Hard rules carried forward (owner verbatim intent)
- Do not jump gate unless owner explicitly says close. Gates 2 → 2.4 → 2.5 → 3 → 4.
- UX options are decided **in the mockup** (MV-01…MV-09 live switches), not on paper.
- ≤5 questions per message, lettered options. Never "Channel Manager" in UI.

## Gate 2.4 — DRAFT WRITTEN (same session)
`plans/CR-385_UX_FLOW_GATE_2_4.md`: regions A–E, per-tab tables, click paths, Folio+Checkout single screen, Check-In side panel, visibility matrix, busy-day walkthrough. Owner review questions asked in chat; answers → §11 of that doc. Gate 2.4 closes only on explicit owner say-so.

## Gate 2.5 — CLICKABLE MOCKUP LIVE (owner merged 2.4 into 2.5)
`/app/frontend/public/cr385-frontdesk-mockup.html` → `<preview>/cr385-frontdesk-mockup.html`. Self-contained HTML+JS, PMS tokens (Poppins, #F26B33, #329937), no forbidden colours, no 'Channel Manager' string. Control bar: Width 1440/1024 · MV-01 (full/overlay/collapsed) · MV-02 (side/overlay) · MV-03 · MV-04 · MV-05 · MV-06 · MV-07 click+dismiss · MV-08 RS-A/B/C · MV-09 · Q1 Rooms→Check-In · Q2 after checkout · Q3 row click · Q5 walk-in · states: board failed (OD-11), quiet day. Interactive: tab switch, chips, Check-In side panel (confirm moves guest to In-House), Folio+Checkout single screen (Collect → room auto-HK, Q2 landing), Request HK/Mark Clean flips badge + Rooms count, kebab dialogs, alert links, density/grouping, 'Freeze design → JSON' (paste into `plans/CR-385_DESIGN_DECISIONS.md`). Verified via screenshots 2026-09-18 (tabs, folio, side panel PASS).
**Feedback rounds 1–2 (2026-09-18) → `plans/CR-385_DESIGN_GAP_CHECKLIST.md`** (P1 expand-in-place everywhere, P2 Check Out = Folio single screen, P3 common guest row, P5 small tiles, late/no-show rules A2–A5/A9, tab reviews, decisions §8). **Mockup NOT edited yet — owner said do not edit until he says 'go'.** FU-385-D (review all screens later), BQ-385-04 (owner raises).
**Mockup v2 LIVE 2026-09-18** (rebuilt per checklist; design_agent blueprint `/app/design_guidelines.json`; screenshots PASS: tabs, checkout expand, checkin expand, search). Switches now: MV-02 compare, MV-04, MV-05, MV-06, MV-07d, MV-08 A/B, MV-09, Q5, states. Decided items are fixed behaviour.
**v2.1 (2026-09-18):** T1–T6 in checklist §7b applied (no tab switch from Rooms, 60px tiles, no upcoming/outstanding on tiles, state-specific room details, compact Check Out, 1024 two-column, short dates). testing_agent `/app/test_reports/iteration_1.json` PASS.
**v2.5 (2026-09-18):** New Booking IN SCOPE (intake addendum) → in-place NewBooking expansion (header + Book Room tile; Save / Save & Check in now → morphs into Check-In). Q5 retired. M1 Tomorrow chip, M2 sort, M3 sticky th, M4 checkout toast Print/Undo, M5 room picker clean/HK/reserved, M6 ID per adult, M9 loading skeleton, M11 keyboard. Header: user menu, merged sync+refresh, BETA removed. Backend addendum `backend_briefs/BACKEND_BRIEF_CR-385_ADDENDUM_2026-09-18.md` (BQ-385-06). FU-385-E..H parked. Verified via screenshots (NB header/tile, morph, Esc, chips, sort).
**GATE 2.5 CLOSED 2026-09-18** → `plans/CR-385_DESIGN_DECISIONS.md` (F1–F16, switches frozen). **HARD GATE 2.6 IA Rev 3 written** → `impact/CR-385_IMPACT_ANALYSIS_REV3_GATE_2_6.md` (17 new files, 3 existing lines, 11 copied sources incl. 4 dialog bodies + NewBooking, R15–R21, Q1–Q5). Awaiting owner answers → close 2.6 → Gate 3 plan.
**Next agent (superseded):** owner reviews v2.5 → tweaks in mockup (retire MV-01/03, Q1/2/3; MV-02 expand ★) → owner reviews → requests tweaks in the mockup → says freeze → write `plans/CR-385_DESIGN_DECISIONS.md` (CR-379 format) → **HARD GATE 2.6** IA re-validation → Gate 3.

## Next steps (superseded list kept for history)
1. **Gate 2.4 low-fi UX flow** (DRAFT DONE — merged into 2.5) — regions (header · KPI-tab strip · alert bar · panel · Folio+Checkout full-width panel · Check-In side panel), click paths (Check-In / Check-Out+Folio / HK / Extend / No-Show), what stays visible per tab. No styling. Owner approves.
2. **Gate 2.5 mockup** `public/cr385-frontdesk-mockup.html` — 40 rooms, busy day, MV-01 (revised layout)…MV-09 live switches, 1440 + 1024, tokens from `PMS_DESIGN_TOKENS.md`, never the words "Channel Manager". Owner freezes per switch → `plans/CR-385_DESIGN_DECISIONS.md`.
3. **HARD GATE 2.6** — re-open `impact/CR-385_IMPACT_ANALYSIS.md` against the frozen design (file list, copied-code inventory, R12 money path, line refs). Owner closes explicitly.
4. Gate 3 plan → Gate 4 GO → code.

Backend brief sent: `backend_briefs/BACKEND_BRIEF_CR-385_2026-09-17.md` — track replies to BQ-385-01 (sockets, needed before Gate 3), BQ-385-03 (`balance_payment`), CR-364-PRINT (Print Folio).

## Unrelated carry-overs (untouched)
BUG-408 (backend blocked), BUG-409 (parked), CR-377 QA pending, BUG-393 inside CR-377 QA, BUG-419..425 QA 5b pending.
