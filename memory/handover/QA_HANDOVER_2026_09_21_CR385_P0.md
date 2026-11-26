# QA HANDOVER — CR-385 Phase 0 (M0 Front Desk shell, read-only) — 2026-09-21

```
Items:      CR-385 (Phase 0 / M0 only) · sprint_key pos_pms_2 · Risk HIGH (P0 module MEDIUM)
Route:      /pms/front-desk-v2  (sidebar Rooms & Reservations → "Front Desk (Beta)")
Build:      yarn build exit 0 · cr385 unit 20/20 · guards empty · QA agent test_reports/iteration_5.json
Role 4 (QA) executes §1–§3 below on preprod, reports PASS/FAIL per row, NO code. Then the owner runs the smoke (phased plan §0.5) and says "Phase 0 smoke OK".
Frozen rules under test: money from charge.* only · "today" = meta.business_date · Area = normalised room title · one expansion open at a time · sticky <th>, no top padding · no "Channel Manager" wording on the screen · no Split tile.
```

## 1. Inherited from Plan (Verification Matrix results — phased plan §0.1/§0.3, companion plan §6 M0 rows)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| +1 import L110, +1 route L272 | `App.js` | route renders; other routes unchanged; grep `CR-385 M0` = 2 | PASS ✅ |
| +1 item L245 "Front Desk (Beta)" | `components/layout/Sidebar.jsx` | item under Rooms & Reservations, navigates; old `/pms/front-desk` untouched | PASS ✅ (QA it.5) |
| additive `hkAssignee`, `isOccupied`, `guest.phone/email`, `meta` | `api/transforms/roomStatusTransform.js` | old payload → null/false/null; new payload → values; node script 5/5; jest additive test | PASS ✅ |
| `testCr385Additive()` | `…/__tests__/roomStatusTransform.cr358p4.test.js` | `node` run → ALL PASS (5/5) | PASS ✅ |
| M0-01 route + `?tab=` deep link + localStorage `mygenie_frontdesk_tab` | `FrontDeskWorkstationPage.jsx` | `?tab=rooms` opens Rooms; revisit without param restores last tab | PASS ✅ (QA it.5) |
| M0-02 tiles = tabs, numbers = `counts.*` / board / `kpis.today.occupancy_percent_physical` | `KpiTabStrip.jsx` | tile text === intercepted network response (0 / 2 / 2 / "0 free", 20 %) | PASS ✅ (QA it.5) |
| M0-03 buckets vs `meta.business_date` (Late/Today/Tomorrow/Upcoming; Overdue…; All/Arrived/Leaving/Stayover) | `frontDeskTransform.js`, panels | unit: 10 late === `counts.arrivals_late`; chip sums === pending rows | PASS ✅ |
| M0-04 common 9 cells, badge rule D48-b, ₹ = `charge.total_with_gst` / `charge.balance_due` | `GuestTable.jsx` | unit badgeFor priority; forbidden-field grep empty | PASS ✅ |
| M0-05 alert bar priority overdue → HK > 2 h → OOO ≥ 1 d → expired; max 3 + "+N more" | `AlertBar.jsx` | 3 shown + "+10 more" popover; click navigates to tab/chip/row | PASS ✅ (QA it.5) |
| M0-06 Rooms tab: board, chips, Area/Type/Number grouping persisted, Turns chip | `RoomsPanel.jsx` | 5 Area groups incl. "First Floor"; `mygenie_frontdesk_groupby` persists | PASS ✅ (QA it.5) |
| M0-06b Mark Clean / Request HK live (only P0 write) | `RoomDetail.jsx` → `patchRoomStatus` | r4 (8525) hk → available → hk restored; toast; refetch | PASS ✅ (self-test 09:08) |
| M0-07 RoomDetail 6 states | `RoomDetail.jsx` | occupied shows guest/stay/balance/source; hk shows since/assignee/next arrival | PASS ✅ (QA it.5) |
| M0-08 global search grouped, `/` focus, Esc clear | `GlobalSearch.jsx` | "r3" → Rooms group; guest name → In-house; click navigates | PASS ✅ (QA it.5) |
| M0-09 header greeting + business date + sync pill; never "Channel Manager" | `WorkstationHeader.jsx` | grep "Channel Manager" in frontdesk = 0; greeting from profile firstName | PASS ✅ |
| M0-10 one expansion; re-click collapses; Esc; ↑↓ Enter | `GuestTable.jsx`, page | ArrowDown → `fd-row-155`, Enter → 1 expansion, Esc → 0 | PASS ✅ (self-test) |
| X-06 sticky `<th>` in zero-padding scroll container | `frontdesk.css` `.fd-table-scroll` | th.top 315 vs container.top 314 (1 px border), padding-top 0 | PASS ✅ |
| X-12 LR 500 → page error + Retry; board 500 → Rooms tile "—" + panel retry | `frontDeskService.js`, page | unit (allSettled) + code-review; live intercept path exists | PASS ✅ (unit) / QA to confirm live |
| X-15 LR always sent with `start_date`/`end_date`/`view=all`; KPI window single day | `frontDeskService.js` | unit params; live network (QA it.5) | PASS ✅ |
| Money format en-IN | `money.js` | ₹19,688 · ₹2,212.35 · −₹500 · ₹12,34,567 | PASS ✅ |

## 2. Additional test cases (discovered during implementation)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| A1 | KPI 31-day cap | Open page; watch `dashboard-kpis` request | `start_date = end_date = business_date`; status 200 (was 422 with −30/+60 window) |
| A2 | Empty "Today" landing | Land on Arrivals on a day with 0 arrivals today | Chip "Today 0" active, empty-state text "No today arrivals"; "Late N" chip red with count; one click shows the late rows |
| A3 | Slow PATCH | Rooms → HK tile → Mark Clean on r4/r5/r1 | Button shows spinner up to ~5 s; toast "Room marked as available…"; tile flips after refetch; no double-submit while busy |
| A4 | Refresh on window focus | Switch browser tab ≥ 1 min, return | Sync pill re-reads "synced just now"; numbers refreshed |
| A5 | Rooms `Turns today` chip | Only when an in-house guest leaves today AND a pending arrival is due today on the same room | Chip count equals such rooms; tile shows "TURN TODAY" pill (0 expected on current sandbox) |
| A6 | Search — phone suffix | Type last 4 digits of an in-house guest's phone | Match appears in In-house group (phone is masked as ••••NNNN in rows) |
| A7 | Duplicate test-ids | Both viewports, Rooms tab with a detail open, alerts popover open | No duplicate `data-testid` in DOM |
| A8 | 1366×768 fit | Rooms tab, Area grouping, one detail open | No horizontal overflow; tile grid 4 columns; header + tiles + chips + first row visible without scrolling |
| A9 | Board 500 isolation | Intercept `room-status-board` → 500, click ↻ | Rooms tile "—" + sub "board unavailable"; Arrivals/Departures/In-House still populated; Rooms tab shows `fd-rooms-error` + `fd-rooms-retry-btn`; retry recovers |
| A10 | LR 500 | Intercept `local-reservations` → 500, click ↻ | `fd-page-error` "Reservations could not be loaded" + `fd-retry-btn`; release intercept → Retry restores tiles |

## 3. Regression tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | Old `/pms/front-desk`, `/pms/arrivals`, `/pms/departures`, `/pms/in-house`, `/pms/room-status`, `/pms/check-in`, folio, dialogs render and behave exactly as before | OD-385-12: no existing page changed; only App.js/Sidebar/roomStatusTransform additive edits |
| R2 | `/pms/room-status` tiles still show HK assignee/guest/since; Mark Clean there still works | `roomStatusTransform.js` edited (additive fields + `meta` passthrough) |
| R3 | Sidebar: all other Rooms & Reservations items still route correctly; collapse/expand state persists | Sidebar.jsx +1 item |
| R4 | POS dine-in bill / split / TAB untouched | `CollectPaymentPanel.jsx`, `orderTransform.js`, `pmsService.js` not modified (git status clean) |
| R5 | Old Room Status tile and the Beta RoomTile look identical for each of the 6 states | Mirror rule (RoomTile copied from RoomStatusPage.jsx @8c7745f) |
| R6 | Tile numbers on Beta === counts on the legacy pages (Arrivals today, In-House rows, Room Status available) | AC-12 parity — the owner's smoke step 2 |

## 4. Registry Sync Confirmation
  Registry synced: YES
  Items: CR-385 (GATE_5A_IMPLEMENTED (P0)), BUG-431, BUG-432, BUG-433 (INTAKE)
  Sprint: pos_pms_2
  EXIT GATE: ALL 5 PASSED
  Checklist: public/cr385-master-checklist.html — M0-01…10, X-01/06/07/10/11/12/13/14/15, R-04, R-08, G4-10 ticked with evidence

## 5. Credentials + Environment
  Account: OWNER_TGK — see `memory/test_credentials.md` (never paste values into reports)
  URL: preview `REACT_APP_BACKEND_URL` from `frontend/.env`; login page at `/` (`login-email`, `login-password`, LOG IN); backend preprod (RID 69 sandbox-pms); single-session token — re-login on 401
  Sandbox rules: rooms r4/8525, r5/8527, r1/8528 only; NEVER 8524 (r3) / 8526 (r2); Phase 0 has no booking/payment writes — do not create stays; restore any room status you toggle
  Viewports: 1920×800 and 1366×768; zero console errors (ignore pre-existing "No routes matched location /login", "[useSocketEvents] Socket not ready", Firebase logs, cdn-cgi aborts)
  Evidence: `test_reports/iteration_5.json`, `memory/handover/SESSION_HANDOVER_2026_09_21_CR385_P0.md`
