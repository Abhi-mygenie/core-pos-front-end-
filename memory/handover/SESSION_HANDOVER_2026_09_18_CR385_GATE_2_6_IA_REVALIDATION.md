# SESSION HANDOVER — CR-385 Front Desk Unified Workstation · HARD GATE 2.6 (Impact Analysis re-validation)

```
Written:   2026-09-18 · for the next agent (PLANNING role, ALPHA v0.7)
Owner:     Abhi (answers in plain English; questions ≤ 5, lettered options a/b/c, never numbered lists)
Language:  English only
Gate now:  2.6 OPEN (owner has NOT yet answered Q1–Q5). Gate 2.5 (design) CLOSED/frozen. Gate 3 NOT started.
Code:      ZERO `src/` files written for CR-385. Existing PMS pages must NOT be edited (OD-385-12).
```

## 1. What this CR is (one paragraph)
A brand-new beta page `/pms/front-desk-v2` (`FrontDeskWorkstationPage.jsx`) that puts Arrivals · Departures · In-House · Rooms in one tabbed screen. Every action (Check-In, Check-Out+Folio, Extend, Modify, Cancel, No-Show, New Booking, Room tile actions) **expands in place** under the row/tile — no side panels, no modals, no page navigation. Existing pages stay untouched; the new page *copies* their logic (mirror rule R9, header marker `// CR-385 COPY-OF <file> L<a>–<b> @ <sha>`).

## 2. Source of truth (read in this order)
| # | File | Why |
|---|---|---|
| 1 | `frontend/public/cr385-frontdesk-mockup.html` | Frozen interactive design (v2.5). Open it in the browser at `<REACT_APP_BACKEND_URL>/cr385-frontdesk-mockup.html`. |
| 2 | `memory/plans/CR-385_DESIGN_DECISIONS.md` | F1–F16 fixed behaviours + switch values. **Any change here = re-open 2.5 + re-run 2.6.** |
| 3 | `memory/impact/CR-385_IMPACT_ANALYSIS_REV3_GATE_2_6.md` | Current IA (Rev 3): 17 new files (~3,900 L), 3 existing lines edited, risks R15–R21, money paths, §7 decision log (EMPTY — fill after owner answers). |
| 4 | `memory/backend_briefs/BACKEND_BRIEF_CR-385_ADDENDUM_2026-09-18.md` | BQ-385-04 (No-Show all channels), BQ-385-06 (availability by date range). |
| 5 | `memory/plans/CR-385_DESIGN_GAP_CHECKLIST.md`, `memory/plans/CR-385_UX_FLOW_GATE_2_4.md` | History of design refinements. |
| 6 | `memory/impact/CR-385_IMPACT_ANALYSIS.md` (Rev 2.2) + `memory/impact/CR-385_DATA_INVENTORY.md` | Baseline IA + data fields available per endpoint. |
| 7 | `/app/test_reports/iteration_1.json` | Testing-agent run on the mockup (passed after fixes). |

Read-only reference code you will copy from at Gate 4 (do NOT edit): `pages/pms/FrontDeskPage.jsx`, `CheckInPage.jsx`, `NewBookingPage.jsx`, `GuestFolioPage.jsx`, `ArrivalsPage.jsx`, `DeparturesPage.jsx`, `InHouseGuestsPage.jsx`, `RoomStatusPage.jsx`, `components/pms/PmsCheckoutDrawer.jsx`, `components/pms/CollectPaymentPanel.jsx`, `components/pms/{ExtendStay,ModifyBooking,CancelBooking,NoShow}Dialog.jsx`, `api/services/pmsService.js`, `api/transforms/aiosellTransform.js`, `roomStatusTransform.js`.

## 3. The 5 open questions (owner must answer to close Gate 2.6)

Present these ONE message, lettered options, plain English. Record answers in IA Rev 3 §7 and (if a design change results) in DESIGN_DECISIONS.md.

### Q1 — "Undo" after Check-Out (risk R16, HIGH)
The mockup shows a toast `Checked out · Room 204 · [Print bill] [Undo 10 s]`. **The backend has no "un-checkout" API.** Once we call checkout + payment, it is final.
- (a) **Drop Undo** — toast shows only `[Print bill]`. Simplest, matches backend reality. *(recommended)*
- (b) **Delayed commit** — we wait 10 s (or until the toast is dismissed) before actually calling checkout+payment. Undo just cancels the timer. Downside: the row looks checked-out while nothing has hit the server yet; if the browser closes in those 10 s the checkout is lost; Print bill must also wait.
- (c) Keep Undo but only as a **confirmation-style "Are you sure?" before commit** (i.e. move the safety step earlier — no post-hoc undo).

### Q2 — Extend / Modify / Cancel / No-Show: copy the form bodies inline, or reuse the existing dialogs as modals? (risk R17)
The frozen design says everything expands in place (F1). The 4 existing dialogs are modals; to expand them in place we must **copy their form bodies** (~4 × 110 lines more duplicated code to keep in sync).
- (a) **Copy inline** — pure F1, more copied code (11 copied sources total). *(matches frozen design)*
- (b) **Reuse the existing dialogs unchanged as modals** for these 4 rarer actions — less code, less drift risk, but breaks "no pop-ups" for those 4 actions. Would need a DESIGN_DECISIONS amendment (F1 exception).
- (c) Hybrid: Extend Stay inline (it is used daily and touches money), the other 3 as existing modals.

### Q3 — "Shift since HH:MM" in the header (F9)
Login time is not stored anywhere in the app today.
- (a) Use the login timestamp from the auth/session store if present; **hide the text if not available**. *(recommended, zero backend)*
- (b) Store login time in `localStorage` on login (touches the login flow = edit outside CR-385 scope → not allowed under OD-385-12; would need a tiny separate CR).
- (c) Drop "shift since" from the header entirely.

### Q4 — Rooms tile trend hint `yesterday X%` (F5)
Needs a **second** `dashboard-kpis` call for yesterday's date on every refresh.
- (a) **Phase 2** — hide the trend hint in v1; add when backend aggregation (BQ-385-02) lands. *(recommended)*
- (b) Make the extra call now (one more request per refresh, small cost).
- (c) Drop the trend hint permanently.

### Q5 — Gate 3 technical spike before writing the Implementation Plan? (risk R15/R19)
Two layout unknowns: (i) `CollectPaymentPanel` uses `h-full` + inner scroll and may collapse inside a table `<td>` unless given a fixed height (~560 px); (ii) `<tr colSpan>` expansion + sticky headers + keyboard focus in the same table.
- (a) **Yes — do a ½-day throw-away spike** (a scratch component, not committed to src/ or deleted after) to prove both, then write the plan with real numbers. *(recommended — de-risks the biggest unknown)*
- (b) No spike — write the plan now with the 560 px assumption; resolve at Gate 4.
- (c) Spike only (i) the payment panel; skip (ii).

## 4. If the owner's answers change the design
Allowed. Procedure:
1. Edit `DESIGN_DECISIONS.md` — add a row in a new section "D. Amendments (Gate 2.6)" with date + reason; do NOT rewrite frozen rows, strike them and point to the amendment.
2. If the change is visual, update the mockup `cr385-frontdesk-mockup.html` to match (it is the spec QA will compare against). Re-run a quick screenshot/test.
3. Re-check IA Rev 3 §1–§4 (files, line estimates, risks) and bump to Rev 3.1 with a changelog line.
4. Only then ask owner to say "close Gate 2.6".

## 5. After Gate 2.6 closes → Gate 3
- Spike (if Q5 = a), evidence into `memory/evidence/CR-385/spike/`.
- Write `memory/plans/CR-385_IMPLEMENTATION_PLAN.md`: component tree, props/state, service functions, copy inventory with source line ranges + sha, verification matrix inheriting money-path tests (IA §3), file ownership / mirror notes, rollout (sidebar item "Front Desk (Beta)"), FU-385-C cutover diff list.
- Owner closes Gate 3 explicitly → Gate 4 code (≈17 new files, `App.js` +2 L, `Sidebar.jsx` +1 L, nothing else edited).

## 6. Rules the owner enforces (do not break)
- Every gate needs an explicit owner "close". Never start the next gate on your own.
- No `src/` edits before Gate 4. No edits to existing PMS pages ever under this CR.
- Questions ≤ 5 per message, lettered options, plain English, explain the "why" and the downside of each option.
- Money formulas (advance, GST base, checkout payload, BUG-425 balance override) are copied byte-for-byte; any change = CRITICAL stop.
- Keep registry / CR_REGISTRY / CONTROL_DASHBOARD in sync when a gate closes.

## 7. Parked follow-ups (do not pull in)
FU-385-A sidebar re-point · FU-385-C cutover · FU-385-D navigation review · FU-385-E guest notes · FU-385-F bulk rooms · FU-385-G late checkout by hours · FU-385-H date navigation · BQ-385-01 sockets · BQ-385-02 aggregation · BQ-385-03 balance_payment · CR-364-PRINT folio print.
