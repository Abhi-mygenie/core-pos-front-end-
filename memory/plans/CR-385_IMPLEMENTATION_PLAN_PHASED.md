# CR-385 · Phased, line-by-line Implementation Plan (Gate 3 CLOSED 2026-09-21)

```
Authority:   owner 2026-09-21 — "Clean plan should be given by line-by-line implementation since now there are no blockers and nothing … we want phased implementation so that smoke test can happen by the owner before moving to the next phase … so yes, go ahead and close gate three"
Companion:   plans/CR-385_IMPLEMENTATION_PLAN.md (module detail, data contract §3, gap/AC mapping §5, matrix §6, registry checklist §7, risks §8) — still binding; THIS file is the execution schedule and the exact edit list.
Binding:     DESIGN_DECISIONS D1–D68 · mockup public/cr385-frontdesk-mockup.html v2.29 (v2.28 visuals) · AC-01…AC-22 · money contract D50 (charge.* only) · N7/N8/N9 D52–D55 · spike D57 (440×560, Q6 host CSS, scroll-on-expand, sticky-th no top padding, panel balance from charge)
Gate state:  Gate 3 CLOSED (quote above, P-12 / G4-06). Gate 4 GO = owner words only (G4-10). Nothing in frontend/src/ until then.
Sandbox:     OWNER_TGK (memory/test_credentials.md) · rooms r4/8525, r5/8527, r1/8528 only · settle every stay (TAB/Cash) · restore settings (allow_early_checkin=false, extend_rate_mode=calendar, auto_print_checkin_receipt=false) · never touch 8524/8526.
```

## 0. Phase gating rule (owner's requirement)
```
Phase N:  code (Implementation role, Entry Verification first) → unit tests green → yarn build clean → QA agent (testing_agent) pass
          → Step 5 registry sync → QA handover section → **OWNER SMOKE (script in this file)** → owner says "Phase N smoke OK"
Phase N+1 starts ONLY after that sentence. A failed owner smoke → fix → re-QA → re-smoke of the same phase. No phase skipping, no parallel phases.
Each phase is independently shippable/rollback-able (sidebar item + route removal = full rollback of everything; per-phase rollback = revert that phase's files).
```
| Phase | Modules | Risk | What the owner sees at the end | Files touched (existing) |
|---|---|---|---|---|
| **P0** | M0 shell *(CODED + QA 35/35 2026-09-21 → P0.5 §0.7 pending)* | MEDIUM | New "Front Desk (Beta)" page: 4 tiles/tabs, live counts, tables, Rooms grid + detail, search, alerts, refresh. Read-only — no money movement. | `App.js`, `Sidebar.jsx`, `roomStatusTransform.js` (+test) |
| **P1** | M7 settings tab · M2 cancel / no-show / modify | HIGH (inventory) | Channel Manager › Front Desk Rules tab; Arrivals row → Cancel / No-Show inline, Modify with server preview. | `ChannelManagerPage.jsx`, `restaurantSettingsService.js`, `CancelBookingDialog.jsx`, `NoShowDialog.jsx` |
| **P2** | M1 new booking · M3 check-in | CRITICAL (money in) | + New Booking form (server-priced, advance), Check-In form (room/upgrade/ID/collect-now, early-check-in guard, HK-room allowed). | none new (all new files) |
| **P3** | M4 extend stay · M5 balances/row actions | CRITICAL (money) | Departures/In-House balances = folio; Extend Stay with per-night lines (held / calendar / held_fallback), collect-now, 409 → move. | none |
| **P4** | M6 bill / checkout | CRITICAL (settlement) | Bill expansion (Layout B) with the real POS payment panel; TAB/Cash/Card/UPI/Split; SGST+CGST two lines (BUG-418). | none |
| **P5** | closure | — | Full regression (matrix §6 all rows), POS F&B regression, registry closure, FU-385-C decision (retire old pages) | — |

### 0-bis. Phase N.5 rule (owner, 2026-09-21 — hard rule)
```
Every phase N has an N.5: ALL bugs found during phase N (QA, smoke, intake) are fixed and re-QA'd in N.5 BEFORE phase N+1 starts,
unless the intake doc proves a hard dependency on a later phase. Then the bug is tagged DEFERRED-TO-P<k>, becomes an ENTRY CONDITION
of P<k> (fixed inside P<k>, not after), and the owner approves the deferral explicitly. N.5 uses the same loop: plan note → owner
"Phase N.5 GO" → Bug Fix role → QA re-test protocol (all phase-N cases + fixes) → ONE owner smoke for N + N.5 → "Phase N smoke OK".
```
Routing of the bugs open at the end of P0 (owner-approved 2026-09-21): BUG-434/435/436/437/438 → **P0.5** · BUG-431/432 → **DEFERRED-TO-P2** (entry conditions of P2) · BUG-433 → **DEFERRED-TO-P3** (entry condition of P3).

---

## PHASE 0 — M0 Shell (read-only)

### 0.1 Existing-file edits (exact)
**E1 `frontend/src/App.js`**
| Line | Current | New |
|---|---|---|
| 109 | `import GuestFolioPage      from './pages/pms/GuestFolioPage';          // CR-364` | keep; **insert after** as new L110: `import FrontDeskWorkstationPage from './pages/pms/FrontDeskWorkstationPage'; // CR-385 M0` |
| 270 (→271 after insert) | `              <Route path="/pms/folio/:orderId"   element={<ProtectedRoute><GuestFolioPage /></ProtectedRoute>} />       {/* CR-364 */}` | keep; **insert after**: `              <Route path="/pms/front-desk-v2"    element={<ProtectedRoute><FrontDeskWorkstationPage /></ProtectedRoute>} /> {/* CR-385 M0 */}` |

**E2 `frontend/src/components/layout/Sidebar.jsx`**
| Line | Current | New |
|---|---|---|
| 244 | `      { id: 'pms-revenue',       label: 'Revenue Dashboard',  path: '/pms/revenue' },` | keep; **insert after** L245: `      { id: 'pms-front-desk-v2', label: 'Front Desk (Beta)',  path: '/pms/front-desk-v2' }, // CR-385 M0 OD-385-14` |

**E3 `frontend/src/api/transforms/roomStatusTransform.js`** (additive only, O-6)
| Line | Current | New |
|---|---|---|
| 17 | `    statusSince:   x.room_operational_status_at ?? null,` | keep; **insert after**: `    hkAssignee:    x.hk_assignee ?? null,            // CR-385 M0 O-6` and `    isOccupied:    Boolean(x.is_occupied),           // CR-385 M0 O-6` |
| 18 | `    guest: g ? { name: g.name ?? '', bookingId: g.booking_id ?? null, orderId: g.order_id ?? null } : null,` | `    guest: g ? { name: g.name ?? '', phone: g.phone ?? null, email: g.email ?? null, bookingId: g.booking_id ?? null, orderId: g.order_id ?? null } : null, // CR-385 M0 O-6` |
| 36 | `  return { autoHkOnRmCheckout: Boolean(d.auto_hk_on_rm_checkout), rooms, counts };` | `  return { autoHkOnRmCheckout: Boolean(d.auto_hk_on_rm_checkout), rooms, counts, meta: d.meta ?? null }; // CR-385 M0 G-52` |
| test `api/transforms/__tests__/roomStatusTransform.cr358p4.test.js` | — | append one `describe('CR-385 additive fields')`: old payload → `meta === null`, `hkAssignee === null`, `isOccupied === false`, `guest.phone === undefined→null`; new payload (probe `room_status_board.json`) → `meta.business_date === '2026-09-20'`, `hkAssignee`, `isOccupied === true` for occupied rooms. Existing assertions untouched. |

### 0.2 New files — line-by-line skeletons (numbers = code blocks in order; each block ≤ 15 lines)
**`frontend/src/api/services/frontDeskService.js`** (~70 L)
1. header `// CR-385 M0 — Front Desk snapshot service. Money: charge.* only (D50). Dates: meta.business_date only.` · imports `api`, `API_ENDPOINTS` from `../constants`, `fromRoomStatusBoard` from `../transforms/roomStatusTransform`, `fromFrontDeskSnapshot` from `../transforms/frontDeskTransform`
2. `export const getLocalReservationsAll = ({ start, end }) => api.get(API_ENDPOINTS.LOCAL_RESERVATIONS, { params: { start_date: start, end_date: end, view: 'all' } }).then(r => r.data)` — **window always sent** (C2: 422 without dates)
3. `export const getBoard = () => api.get(API_ENDPOINTS.ROOM_STATUS_BOARD).then(r => fromRoomStatusBoard(r.data))`
4. `export const getKpis = ({ start, end }) => api.get(API_ENDPOINTS.DASHBOARD_KPIS, { params: { start_date: start, end_date: end } }).then(r => r.data)`
5. `export const getSnapshot = async ({ start, end }) => { const [lr, board, kpis] = await Promise.allSettled([...]); return fromFrontDeskSnapshot({ lr, board, kpis }); }` — LR rejected ⇒ throw (page error); board/kpis rejected ⇒ `boardError`/`kpisError` flags (OD-385-11)
6. `export const patchRoomStatus`, `bulkMarkClean` → re-export from `pmsService` (no edit there)
(Phase 1+ adds `cancel`, `noShow`, `modifyPreview`, `modify`, `updateFrontDeskRules`; Phase 2 `createBooking`, `checkIn`; Phase 3 `extendStay`, `getRowBalance`; Phase 4 `getFolio` — each appended, never edited.)

**`frontend/src/api/transforms/frontDeskTransform.js`** (~160 L)
1. header + `const OTA_CHANNELS_EXCLUDE = ['Direct', 'WalkIn']` · `export const isOta = (channel) => !OTA_CHANNELS_EXCLUDE.includes(channel)`
2. `export const normaliseTitle = (t) => t ? t.trim().replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'No section'` (fixture: `"first  floor"` → `First Floor`)
3. `export const fromReservation = (r) => ({ id, bookingId: r.booking_id, cmBookingId, guestName: [first_name,last_name].join(' ').trim(), phone, email, channel, isOta: isOta(r.channel), checkin, checkout, nights: r.charge?.nights ?? null, adults: rooms[0]?.adults, children, roomNo: rooms[0]?.table_no, roomTitle: rooms[0]?.table_title, roomType: rooms[0]?.room_code, orderId: rooms[0]?.order_id, tableId: rooms[0]?.restaurant_table_id, orderPaymentStatus: rooms[0]?.order_payment_status, lineStatus, operationalStatus: r.operational_status, status: r.status, pah: Boolean(r.pah), specialRequests, charge: r.charge ?? null, cancelReason, cancelledAt })` — **never reads** `balance_payment / advance_payment(top) / amount_after_tax` (X-01)
4. `export const bucketArrival = (row, bd) => row.checkin < bd ? 'late' : row.checkin === bd ? 'today' : row.checkin === plusDays(bd,1) ? 'tomorrow' : 'upcoming'` (string compare on ISO dates; `plusDays` = pure string date add)
5. `export const bucketDeparture = (row, bd) => row.checkout < bd ? 'overdue' : row.checkout === bd ? 'today' : row.checkout === plusDays(bd,1) ? 'tomorrow' : 'upcoming'`
6. `export const nsOrCancel = (row) => row.isOta ? 'noshow' : 'cancel'` (AC-13)
7. `export const isCleared = (row) => row.orderPaymentStatus === 'paid' && Number(row.charge?.balance_due) === 0` (X-02, OG-PMS-028)
8. `export const badgeFor = (row) => { const c=row.charge||{}; if (Number(c.prepaid_amount)>0) return {kind:'prepaid'}; if (row.pah) return {kind:'pah'}; if (Number(c.advance_payment)>0 && row.operationalStatus!=='departed') return {kind:'advance', amount:c.advance_payment}; return null }` (D48-b, AC-03)
9. `export const groupRooms = (rooms, mode) => mode==='area' ? groupBy(rooms, r=>normaliseTitle(r.title)) : mode==='type' ? groupBy(rooms, r=>r.roomType) : [{ key:'all', rooms: sortBy(rooms, tableNo) }]`
10. `export const isTurn = (room, rowsByTable, bd) => departing-today && arriving-today on same tableId` (D42)
11. `export const fromFrontDeskSnapshot = ({ lr, board, kpis }) => ({ meta: lr.data.meta, counts: lr.data.counts, reservations: lr.data.reservations.map(fromReservation), rooms: board.status==='fulfilled' ? board.value.rooms : [], boardMeta, boardError: board.status==='rejected', kpis: kpis.status==='fulfilled' ? kpis.value.data : null, kpisError, loadedAt: Date.now() })`

**`frontend/src/components/pms/frontdesk/money.js`** (~40 L): `fmtINR(n)` (en-IN, 0 dp when integer else 2, negative `−₹`), `fmtDate(iso)` (`21 Sep`), `fmtDateLong`, `plural(n, word)`, `avgRateLabel` = `'avg. rate / night'`. No maths on money beyond formatting.

**`frontend/src/pages/pms/FrontDeskWorkstationPage.jsx`** (~150 L)
1. header `// CR-385 M0` · imports (React, `useSearchParams`, service, transform, components, `frontdesk.css`, `toast` from sonner)
2. `useFrontDeskSnapshot()` hook (in-file, ~40 L): state `{ snap, loading, error }`; `refresh = useCallback(async () => { const bd = todayWindow(); setSnap(await getSnapshot({ start: minus30(bd), end: plus60(bd) })) })` — first call uses the browser date **only to build the request window**; every guard afterwards uses `snap.meta.business_date` (X-06); effects: mount, `window.addEventListener('focus', refresh)`, cleanup
3. tab state: `const [tab, setTab] = useTabParam()` — `?tab=` ↔ `localStorage 'mygenie_frontdesk_tab'`, default `'arrivals'` (OD-385-10)
4. `expanded` state `{ rowId, kind }` — one at a time (F1); `openExpansion(rowId, kind)`, `closeExpansion()`
5. `afterAction = async (msg) => { toast.success(msg); closeExpansion(); await refresh(); }` (X-14, P-09)
6. render: `error` → `<PageError data-testid="fd-page-error" onRetry={refresh} />`; else `<div data-testid="fd-page" className="fd-page">` → `<WorkstationHeader …/>` `<GlobalSearch …/>` `<KpiTabStrip …/>` `<AlertBar …/>` `<NewBookingForm slot (P2)>` `<TabPanel>`
7. `TabPanel` switch: `arrivals → <ArrivalsPanel rows={pending} … />`, `departures → <DeparturesPanel rows={inHouseDueOut} />`, `inhouse → <InHousePanel rows={inHouse} />`, `rooms → <RoomsPanel rooms snapshot boardError onRetry />`
8. selectors (memo): `pending = reservations.filter(r=>r.operationalStatus==='pending')`, `inHouse = …==='in_house'`, `inHouseDueOut = inHouse` (chips do the date split)

**`WorkstationHeader.jsx`** (~45 L): greeting (profile first name from existing auth context — read only), `fmtDateLong(meta.business_date)`, sync pill `● synced {minutesAgo} ago` + `↻` (`fd-refresh-btn`), `+ New Booking` (`fd-new-booking-btn`, disabled in P0 with tooltip "Phase 2"). Never renders the words "Channel Manager" (ui_naming_rule). No BETA badge (F9).

**`KpiTabStrip.jsx`** (~60 L): 4 tiles = tabs (`role="tablist"`), Rooms tile 2× wide; numbers: Arrivals `counts.arrivals_today` (+ `arrivals_late` red edge), Departures `counts.departures_today` (+ `departures_overdue` red edge), In-House `counts.in_house`, Rooms `${available} free` from board counts + `kpis.today.occupancy_percent_physical` (`—` when `boardError`). No trend hints (D4). testids `fd-tab-<t>`, `fd-tab-<t>-count`.

**`AlertBar.jsx`** (~55 L): derive alerts (D37 priority): overdue departures → HK > 2 h (`statusSince`) → OOO ≥ 1 d → expired arrivals (`checkin < bd`, pending). Max 3 + `+N` popover (`fd-alert-more`). Click → `onNavigate({ tab, chip, rowId, kind: nsOrCancel(row) })`.

**`GlobalSearch.jsx`** (~60 L): `/` focuses, `Esc` clears; client-side over snapshot by name/phone/booking id/room no; grouped In-house · Arriving · Departing · Rooms; result click → navigate/expand. testids `fd-search-input`, `fd-search-result-<group>-<i>`.

**`GuestTable.jsx`** (~120 L): props `{ rows, columns, sort, onSort, expandedId, onToggle, renderExpansion, testIdPrefix }`; scroll container `overflow-auto` with **no top padding** and `<th class="sticky top-0 bg-white z-10">` (M0-03); sort ▲▼ (F16); keyboard: `↑↓` move `tabIndex=0` rows, `Enter` toggles, `Esc` closes (D57); `ExpandableRow` calls `rowRef.current.scrollIntoView({ block: 'nearest' })` on open (M6-11). Common 9 cells (F3): Guest · Phone · Channel/badge · Dates · Nights/Pax · Room · ₹ · Status · Actions.

**`ArrivalsPanel.jsx` / `DeparturesPanel.jsx` / `InHousePanel.jsx`** (~70 L each): chips (F6) via `bucketArrival/bucketDeparture` vs `meta.business_date`; ₹ cell = `fmtINR(charge.total_with_gst)` (Arrivals) / `fmtINR(charge.balance_due)` (P0 placeholder; P3 replaces with `getRowBalance`); badge from `badgeFor`; **P0 actions disabled** with tooltip "Phase N"; footer `no_show_count` (Arrivals) from kpis.

**`RoomsPanel.jsx`** (~80 L) + **`RoomTile.jsx`** (copy of `RoomStatusPage.jsx` tile markup — header records `// copied from pages/pms/RoomStatusPage.jsx L<a>–<b> @<commit>; mirror rule until FU-385-C`) + **`RoomDetail.jsx`** (~90 L, 6 states: available · booked · occupied · occupied_hk · hk · ooo; actions dispatch `Mark Clean / Request HK / Set OOO` → `patchRoomStatus` (live in P0), `Check in / Bill / Extend` → disabled until their phase). Group-by segmented control `Room no. · Type · Area` (`fd-rooms-groupby-<mode>`, persisted `mygenie_frontdesk_groupby`); chips All/Available/Occupied/Booked/HK/OOO/**Turns today** (D42); `boardError` → panel-level retry only (`fd-rooms-retry-btn`).

**`frontdesk.css`** (~40 L): `.fd-page` layout vars; `.fd-table-scroll { overflow:auto; padding-top:0 }`; `.fd-sticky-th { position:sticky; top:0 }`; `.frontdesk-bill …` rules reserved for P4 (added then).

### 0.3 Tests (P0)
`frontDeskTransform.cr385.test.js` — fixtures = `evidence/CR-385/probes_2026_09_20_g4_09/local_reservations_view_all.json` + `room_status_board.json` (copy into `src/__fixtures__/cr385/`): counts pass-through (10 late / 2 in-house / 2 arrived), `normaliseTitle` on the 5 raw titles, `bucketArrival` late/today/tomorrow/upcoming vs `business_date '2026-09-20'`, `nsOrCancel` (Direct/WalkIn → cancel; booking.com → noshow), `isCleared` (paid + 0 → true; paid + 950 → false), `badgeFor` (prepaid > pah > advance > null), `fromFrontDeskSnapshot` with board rejected → `boardError true, rooms []`.
`frontDeskService.cr385.test.js` — axios mock: LR called with `start_date/end_date/view=all`; LR reject → throws; board reject → snapshot still returned.
`money.cr385.test.js` — `fmtINR(19688) === '₹19,688'`, `fmtINR(2212.35) === '₹2,212.35'`, negative sign.
Grep guard (bash, part of `yarn test:cr385` script): `grep -rn "balance_payment\|remaining_room_balance\|amount_after_tax\|\* 0.05\|\* 0.18\|toISOString()\.slice\|new Date()\.getDate" src/components/pms/frontdesk src/api/services/frontDeskService.js src/api/transforms/frontDeskTransform.js src/pages/pms/FrontDeskWorkstationPage.jsx` → must be empty.

### 0.4 QA-agent brief (P0) — frontend only, 1920×800 + 1366×768
route renders; sidebar item; old `/pms/front-desk` unchanged (screenshot diff); tile numbers === network `counts.*`; chips split rows correctly against `meta.business_date`; sticky header at scroll (`th.top === container.top`); `↑↓ Enter Esc`; one expansion; Rooms group-by Area shows 5 groups incl. "First Floor"; Turns chip; alert bar order; search `/`; board 500 (route intercept) → Rooms "—" + others fine; LR 500 → page error + Retry; zero console errors; every interactive element has a unique `data-testid`.

### 0.5 OWNER SMOKE — Phase 0 (≈10 min, read-only)
1. Sidebar → Rooms & Reservations → **Front Desk (Beta)**. Page opens on **Arrivals**; header shows your first name and today's business date; sync pill says "synced just now".
2. Compare the four tile numbers with the old pages: Arrivals count = `/pms/arrivals` Today count; In-House = `/pms/in-house` row count; Rooms "N free" = `/pms/room-status` available count. **They must be identical.**
3. Click **Departures** → chips Today / Overdue / Tomorrow; click a row → it expands (actions greyed "Phase 3/4"); press `Esc` → closes; `↑↓` moves the highlight.
4. **Rooms** tab → Group by **Area** → you see Ground Floor · First Floor · 2nd Floor · 3rd Floor · Patal Lok (from your board titles); click an occupied tile → detail shows guest, dates, balance from the server; click a HK tile → **Mark Clean** → tile turns Available (this is the only write in Phase 0; it is the same call the old Room Status page makes). Click **Request HK** to put it back.
5. Type `/`, search a guest name → grouped results; click → jumps to the row.
6. Switch to another browser tab for a minute, come back → sync pill refreshed.
7. Open the old `/pms/front-desk` page → looks exactly as before.
Say **"Phase 0 smoke OK"** (or list what's wrong).

> **EXCEPTION D74 (owner, 2026-09-21, Phase 0 only):** this smoke is deferred and run together with the Phase 1 smoke (one combined session: M0-S01…S12 + Phase 1 steps). Phase 1 may start without "Phase 0 smoke OK". The N.5 rule (§0-bis) is unchanged for Phase 1+.

### 0.6 Rollback P0
Delete L110 + L271 in `App.js`, L245 in `Sidebar.jsx`; leave E3 (additive, harmless) or revert the 4 lines. New files inert.

### 0.7 PHASE 0.5 — Bug fix of everything found in P0 (LOW risk, same gates compressed)
Owner decisions recorded: **D70** BUG-437 → option (a) first non-empty chip · **D71** BUG-435 → 5 s focus-refresh debounce.
Brief, Entry Verification, fix skeleton and smoke additions: `handover/MASTER_HANDOVER_2026_09_21_CR385_P0_TO_P0_5.md` §4 (authoritative). Plan note to be written by the next agent at `plans/CR-385_PHASE_0_5_BUGFIX_PLAN.md` before "Phase 0.5 GO".

| Bug | File(s) | Change (one line) | Test |
|---|---|---|---|
| BUG-434 | `FrontDeskWorkstationPage.jsx`, `RoomsPanel.jsx` | Retry buttons disabled + spinner + "Retrying…" while `refreshing` | RTL busy state |
| BUG-435 | `FrontDeskWorkstationPage.jsx` (`useFrontDeskSnapshot`) | skip when in flight; ignore focus-refresh < 5 s after last fetch (D71) | RTL 2× focus → 1 fetch |
| BUG-436 | `FrontDeskWorkstationPage.jsx` | `data-testid="fd-workstation-body"` on `<main>`; QA scope updated | DOM probe |
| BUG-437 | `FrontDeskWorkstationPage.jsx`, `ArrivalsPanel.jsx` (`CHIP_ORDER`) | initial chip = first non-empty (late→today→tomorrow→upcoming / overdue→…) until the user clicks a chip (D70) | unit + RTL fixture |
| BUG-438 | `components/pms/frontdesk/__tests__/` | GuestTable keyboard, searchSnapshot phone-suffix, isTurn live-shaped tests; A4/A5/A6 in QA brief | jest |
Exit: cr385 tests green · guards empty · `yarn build` exit 0 · testing_agent both viewports (P0 matrix + fixes) · EXIT GATE 5/5 · registry `GATE_5B_QA_PASSED (P0+P0.5)` · combined owner smoke (§0.5 + master handover §4.4) → "Phase 0 smoke OK".

**Phase 0.5 CLOSED 2026-09-21 (owner):** BUG-434…438 QA-VERIFIED (rounds 1–2, `iteration_7/8/9.json`); Gate 5B (P0+P0.5) closed. **BUG-439** (MINOR, duplicate row-action testids while expanded — D72) registered via Intake; routing open (owner) — intake recommends Fast Lane Bug Fix; any route must run X-10 with a row expanded. Next: owner combined Phase 0 smoke → "Phase 0 smoke OK".

---

## PHASE 1 — M7 Front Desk Rules tab · M2 Cancel / No-Show / Modify

### 1.1 Existing-file edits (exact)
**E8 `frontend/src/pages/pms/ChannelManagerPage.jsx`**
| Line | Current | New |
|---|---|---|
| 21 | `import RatesTab from './RatesTab'; // CR-358-P5` | keep; **insert after** L22: `import FrontDeskRulesTab from './FrontDeskRulesTab'; // CR-385 M7 OD-385-17` |
| 26 (→27) | `const TABS = ['OTA / Sync', 'AIOSELL Setup', 'Room Mapping', 'Rates & Restrictions'];` | `const TABS = ['OTA / Sync', 'AIOSELL Setup', 'Room Mapping', 'Rates & Restrictions', 'Front Desk Rules']; // CR-385 M7` |
| 468 (→469) | `          {activeTab === 3 && <RatesTab />}` | keep; **insert after**: `          {/* ── TAB 4: Front Desk Rules (CR-385 M7, OD-385-17) ── */}` and `          {activeTab === 4 && <FrontDeskRulesTab />}` |

**E10 `frontend/src/api/services/restaurantSettingsService.js`** — **append after L33** (no existing line changes):
```js
// CR-385 M7 — partial write of the two Front Desk rules (multipart data={"basic":{…}} — the only accepted shape, C10)
export const updateFrontDeskRules = async ({ allowEarlyCheckin, extendRateMode }) => {
  const formData = new FormData();
  formData.append('data', JSON.stringify({ basic: { allow_early_checkin: Boolean(allowEarlyCheckin), extend_rate_mode: extendRateMode === 'held' ? 'held' : 'calendar' } }));
  const response = await api.post(API_ENDPOINTS.RESTAURANT_SETTINGS_UPDATE, formData);
  return response.data;
};
```
(boolean encoding `true/false` — verified by `run_n7n8.py::settings_set`; R29 retired.)

**E4 `frontend/src/components/pms/CancelBookingDialog.jsx`**
| Line | Current | New |
|---|---|---|
| 10 | `export default function CancelBookingDialog({ target, onClose, onSuccess }) {` | `export default function CancelBookingDialog({ target, onClose, onSuccess, inline = false }) { // CR-385 M2 D2` |
| 48 | `    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="cancel-booking-dialog">` | `    <div className={inline ? 'w-full' : 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4'} data-testid="cancel-booking-dialog"> {/* CR-385 M2 D2 inline */}` |

**E5 `frontend/src/components/pms/NoShowDialog.jsx`**
| Line | Current | New |
|---|---|---|
| 12 | `export default function NoShowDialog({ target, onClose, onSuccess }) {` | `export default function NoShowDialog({ target, onClose, onSuccess, inline = false }) { // CR-385 M2 D2` |
| 39 | `      className="fixed inset-0 z-50 flex items-center justify-center"` | `      className={inline ? 'w-full' : 'fixed inset-0 z-50 flex items-center justify-center'} // CR-385 M2 D2 inline` |
(inner card `max-w-*` stays; when `inline` the card renders inside the expansion row.)

`ExtendStayDialog.jsx` / `ModifyBookingDialog.jsx` — **NOT touched** (OD-385-16 a).

### 1.2 New files
**`frontend/src/pages/pms/FrontDeskRulesTab.jsx`** (~90 L, pattern `RatesTab.jsx`)
1. imports `getSettings`-style read (`api.get(API_ENDPOINTS.RESTAURANT_SETTINGS_LIST)` → `data.basic`), `updateFrontDeskRules`, `toast`
2. state `{ allowEarlyCheckin:false, extendRateMode:'calendar', loading, saving, dirty }`; load on mount, read `basic.allow_early_checkin ?? basic['pms.allow_early_checkin']`, `basic.extend_rate_mode ?? basic['pms.extend_rate_mode']`
3. card `data-testid="frontdesk-rules-card"`: **Allow early check-in** toggle (`toggle-allow-early-checkin`) hint "Let staff check a guest in before the booked arrival date. Off = check-in is blocked until the business date reaches the booking."
4. **Extension pricing** radio (`radio-extend-rate-mode-calendar` / `-held`): "Rate table (calendar) — extra nights priced from the rate calendar for each date; GST applied per night" / "Held rate — extra nights keep the rate held at check-in"
5. Save (`frontdesk-rules-save-btn`) → `updateFrontDeskRules` → re-read → toast; 422 → `frontdesk-rules-error`

**`components/pms/frontdesk/ModifyBookingForm.jsx`** (~140 L, OD-385-16 a): dates (`min` = `meta.business_date`), plan select from `getRatesData`, guests, reason; **preview** `PATCH local-reservations/{id}` `{checkin?, checkout?, rateplan_code?, reason, preview:true}` debounced → "Current → New" from server `charge` (`modify-preview-total`, `-delta`); confirm = same body without `preview` — **never `amount_after_tax`** (G-02); guards `checkout > checkin` (AC-11), 422 text verbatim; success → `onDone('Booking updated')`.
`frontDeskService` += `cancelReservation(id, {reason, cancelledBy})` → existing `pmsService.cancelReservation`; `markNoShow(bookingId, channel)` → existing; `modifyReservation(id, body)` → `api.patch`.
Panels (P1 wiring): Arrivals row actions live: **Check In** (still disabled → P2), **Modify** (kebab), **Cancel** / **No-Show** by `nsOrCancel(row)` (AC-13); expansions render `<CancelBookingDialog inline target=… onSuccess={afterAction} />`, `<NoShowDialog inline …/>` (target shape = what `ArrivalsPage.jsx` passes today — copy that mapping), `<ModifyBookingForm …/>`; alert "expired arrival" link → expands with `nsOrCancel`. Money-outcome read-only card (`outcome-card`) + "Phase 2" ribbon (`outcome-phase2-ribbon`) inside the Cancel/No-Show expansion header (DEC-2, AC-05).

### 1.3 Tests
`updateFrontDeskRules` multipart body snapshot; `ModifyBookingForm` preview payload has `preview:true`, confirm payload lacks `amount_after_tax`; `nsOrCancel` wiring (row with `channel 'booking.com'` shows No-Show only; `'Direct'` shows Cancel only); inline dialogs render without `fixed` class; old `ArrivalsPage` still passes no `inline` (snapshot).

### 1.4 QA-agent brief (P1)
Channel Manager → 5th tab renders, tabs 0–3 unchanged; toggle early ON → Save → network multipart `data` → profile flips → toggle OFF → Save (restore); radio held → Save → back to calendar. Arrivals: Direct row → Cancel inline (reason select from API) → row disappears, counts refetched; OTA row → No-Show button; Modify → preview figures change with dates, zero-night blocked, confirm → row updated; old `/pms/arrivals` dialogs still overlay.

### 1.5 OWNER SMOKE — Phase 1 (≈10 min)
1. Channel Manager → **Front Desk Rules** tab → turn **Allow early check-in ON** → Save → reload → still ON → turn **OFF** → Save. Set **Extension pricing = Held rate** → Save → back to **Rate table** → Save. (Ends at defaults.)
2. Front Desk (Beta) → Arrivals → a **Direct** row shows **Cancel** (no No-Show); a **booking.com** row shows **No-Show** (no Cancel).
3. Cancel a test Direct booking (create one on `/pms/new-booking` first): reason dropdown → Confirm → row gone, Arrivals tile −1.
4. Modify a test booking: +1 night → the preview shows the new total **from the server** before you confirm → Confirm → row shows the new dates and total.
5. Old `/pms/arrivals` → Cancel dialog still pops as an overlay.
Say **"Phase 1 smoke OK"**.

---

## PHASE 2 — M1 New Booking · M3 Check-In (money in)

### 2.1 Existing-file edits — none.
### 2.2 New files
**`NewBookingForm.jsx`** (~220 L, blueprint v2.17 + D34/35/36/48-c, **no Split tile — OD-385-18 a**)
1. props `{ meta, onDone, onCheckInNow }`; state guest{name, phone}, checkin (`min` = `meta.business_date`), checkout (`min` = checkin+1), adults ≥1, children, selected `{roomCode, rateplanCode}`, advance `{amount, method:'cash'|'card'|'upi', reference}`, b2b note only
2. effects: `getRatesData({startDate: checkin, endDate: checkout})` → grid types × plans (server rates for **display**); `room-availability?checkin&checkout` → free count per type (sold-out row disabled)
3. payload `POST direct-reservation` `{ guest:{name,phone}, checkin, checkout, adults, children, rooms:[{room_code, rateplan_code, rooms_count:1}], advance? }` — **never `rate_per_night`** (BQ-16); advance only when amount > 0; Card/UPI require reference (AC-09)
4. 201 → `data.reservation.charge` → confirmation strip (total, SGST, CGST, advance, balance from `charge`) → `onDone` (refetch) or `onCheckInNow(reservation)`; 422 "no rate configured" → `booking-error` verbatim
5. testids as plan §4 M1 (minus `booking-pay-split`)

**`CheckInForm.jsx`** (~300 L) — copy of the `CheckInPage.jsx` **form body** (header: `// CR-385 M3 — copied from pages/pms/CheckInPage.jsx L26–57,137,250,263–345,619–897 @<commit>; mirror rule until FU-385-C`), re-laid per Check-In v2.17:
1. LEFT: facts (guest, phone, dates, pax, channel badge) · **Room** select = booked-type rooms from board (`available` + **`hk` with badge + duration + amber note**, N9/D52) + "Show higher categories (upgrade)" (D23) → `upgrade_type paid|complimentary`, `upgrade_amount`, `upgrade_reason` · ID cards (`GuestDocsSection`, unchanged import) · B2B toggle → `firm_name/firm_gst` (D48-c)
2. RIGHT (no inner scroll): bill from `row.charge` (rate, upgrade line, SGST, CGST, total), "Already paid" = `charge.advance_payment`, **Collect now** amount + Cash/Card/UPI (+ reference), balance after; completion strip + "Ready to check in" pill (D30); auto-print toggle default `settings.auto_print_checkin_receipt` (D32)
3. **Early check-in guard** (N7/D53): `allowEarlyCheckin` from profile; when false and `row.checkin > meta.business_date` → Confirm disabled + tooltip `checkin-early-tooltip` "Arrives {date} — modify the booking dates to check in today"; server 422 text shown verbatim regardless
4. submit → `frontDeskService.checkIn(p)` = the `pmsCheckIn` FormData builder **copied** (75 L) + `aiosell_reservation_id`, `upgrade_*`, `advance_payment` (collect-now, **D17 fixed**: server merges with booking carry), `payment_method`, `booking_for=Individual`, `room_price=0/order_amount=0` (server prices) → 200 `data.order_id`, `data.charge` → row updated immediately then refetch (M3-05, X-14)
5. testids as plan §4 M3 (minus split)

Panels wiring: header **+ New Booking** live → form expands at top of the current tab; Arrivals **Check In** live → `CheckInForm` expansion; RoomDetail (booked tile) **Check in** live.

### 2.3 Tests
payload snapshots (booking: no `rate_per_night`, `rooms_count 1`; check-in: FormData superset of `pmsCheckIn` + 4 new keys); guards; early-check-in guard with mocked profile true/false; HK room selectable; 422 verbatim; RIGHT pane `scrollHeight === clientHeight` @1366×768 (Playwright).

### 2.4 QA-agent brief (P2) — live sandbox, settle everything
create booking (₹1,000 UPI advance) → 201; LR `balance_due = total − 1000`; check-in with paid upgrade ₹1,500 + collect-now ₹500 Card → response `charge.advance_payment 1500`, folio shows both ledger rows, `Room upgrade: <reason>` line; early check-in: with setting OFF a future booking's Check In is disabled + tooltip; with setting ON it succeeds (restore OFF); HK room check-in allowed with warning; old `/pms/check-in` unchanged.

### 2.5 OWNER SMOKE — Phase 2 (≈15 min, money — use today's date)
1. Front Desk → **+ New Booking** → "Smoke P2", today → tomorrow, 1 adult, pick a room type/plan → the price shown is the **rate-table price** (you cannot type a price) → advance ₹1,000 UPI + UTR → **Save** → confirmation shows total / SGST / CGST / advance / balance → Arrivals row appears with a **₹1,000 advance chip**.
2. Row → **Check In** → choose a room (try a **Needs-cleaning** room: allowed, amber note) → tick **Show higher categories** → pick a suite → **Paid upgrade ₹1,500**, reason "smoke" → RIGHT bill shows the upgrade line and the recomputed GST **after** confirm; **Collect now ₹500 Card** + ref → **Confirm** → In-House row shows **Paid so far ₹1,500**.
3. Open the old Guest Folio for that stay → Advance Paid ₹1,500, two payment rows (1,000 UPI · 500 Card), "Room upgrade: smoke" line.
4. Early check-in: create a booking for **tomorrow** → its Check In button is greyed with "Arrives …" tooltip. Channel Manager › Front Desk Rules → Allow early ON → the button is live → turn it **OFF** again.
5. Settle the stay from the old Departures page (Cash) so the room is free.
Say **"Phase 2 smoke OK"**.

---

## PHASE 3 — M4 Extend Stay · M5 Balances & row actions

### 3.1 Existing-file edits — none.
### 3.2 New files / additions
`frontDeskService` += `extendStay({ orderId, newCheckoutDate, reason, payment?, discount?, newRestaurantTableId? })` → `POST room-extend-stay` (C7; **never `new_room_price`**); `getRowBalances(rows, roomGstApplicable)` → calls existing `pmsService.getInHouseGuests` once, joins by `orderId`, returns `{ [orderId]: { room: charge.balance_due, fnb, transferred, total } }` (M5-01); `roomAvailability({checkin, checkout})`.
**`NightsLines.jsx`** (~40 L, shared M4/M6): renders `nights_detail[]` rows `date · ₹rate · chip {held: 'held rate', calendar: 'rate table', held_fallback: 'held (no rate for this date)'} · GST %`; when absent → `N nights · avg. rate / night ₹X`; **never sums `gst`**; fixtures: `probes_2026_09_20_n11` (mixed), `probes_2026_09_21_held_fallback/h1_extend_1116.json` (**real `held_fallback`**), held-mode row (no detail).
**`ExtendStayForm.jsx`** (~200 L, D39, OD-385-16 a): new checkout (`min` = current +1), reason, optional discount (type/value/reason), collect-now (Cash/Card/UPI + ref, amount ≤ payable, AC-06 — **no Split**, OD-385-18 a); RIGHT: pending balance (`charge.balance_due` from LR) → "Extension priced by the server on confirm (rate table / held per property setting)" → after 200: `NightsLines` from response + totals from `charge` → then **refetch LR** (D55) and re-render from the row (row now carries `nights_detail`, BQ-19); **409** → blocker booking + free same-type rooms → `new_restaurant_table_id` required (`extend-move-room-<tableId>`); shorten allowed (D15 fixed) — confirm text "Shorten to {date}".
Panels wiring: Departures/In-House ₹ cell = `getRowBalances` total (== folio grand total, AC-02); **Cleared** pill + Bill disabled when `isCleared` (X-02); chips Leaving today (`checkout === bd` and not overdue), Overdue N d, Arrived today, Stayover; actions **Bill** (P4, disabled), **Request HK / Mark Clean** (`patchRoomStatus`), **Extend** live; RoomDetail occupied → Extend live.

### 3.3 Tests
extend payload snapshot (no `new_room_price`; `payment{}`; `discount{}`; `new_restaurant_table_id`); `NightsLines` on the three fixtures (labels, never sums gst, avg label); collect > payable blocked; 409 fixture → Confirm disabled until room picked; D55: row rendered from LR after extend (mock response ≠ LR → LR wins); `getRowBalances` on saved LR + mocked in-house set → sums to the rupee; leaving-today excludes overdue; cleared fixture.

### 3.4 QA-agent brief (P3) — live sandbox
extend +1 night with ₹500 Cash collect → panel shows per-night lines (held/calendar), SGST=CGST, balance = LR; shorten back → figures 10,100-style (D15); move to another room → GST unchanged (D16); In-House balance with a room-service order + transferred F&B == folio grand total; Request HK / Mark Clean; settle all.

### 3.5 OWNER SMOKE — Phase 3 (≈15 min)
1. Check in a test guest (Phase 2 flow). In-House row **Balance** = the old Guest Folio "Balance Due" to the rupee. Add a room-service order from POS → both numbers move by the same amount.
2. Row → **Extend** → +1 night → confirm → panel lists **each night with its source chip** ("held rate" / "rate table"), SGST and CGST as two lines, total payable, **Collect now ₹500 Cash** → balance remaining drops by 500. Refresh the page → the per-night lines are still there.
3. Extend again to a date the backend has left without a rate (ask backend for the wipe→restore recipe, D68) → the added night shows **"held (no rate for this date)"**. Backend restores the rate.
4. Shorten by one night → totals drop to the sold night's rate (not an average).
5. Departures → **Leaving today** chip lists only today's departures; an overdue one shows "Overdue 1 d".
6. Settle the stay (old Departures, Cash).
Say **"Phase 3 smoke OK"**.

---

## PHASE 4 — M6 Bill / Checkout (Layout B, real payment panel)

### 4.1 Existing-file edits — none (`CollectPaymentPanel.jsx` imported only; `PmsCheckoutDrawer.jsx` untouched).
### 4.2 New files / additions
`frontdesk.css` += (Q6 = host CSS, D57/M6-09):
```css
.frontdesk-bill [data-testid="checkout-room-booking-toggle"],
.frontdesk-bill [data-testid="checkout-transferred-toggle"],
.frontdesk-bill [data-testid="checkout-room-service-toggle"] { display: none; }
.frontdesk-bill { width: 440px; height: 560px; overflow: hidden; }
.fd-bill-grid { display: grid; grid-template-columns: 1fr 440px; height: 560px; }
```
`hideSectionRows.cr385.test.js`: reads `CollectPaymentPanel.jsx` source, asserts the three testid strings exist (regression guard).
`frontDeskService` += `getFolio(orderId)` → existing `pmsService.getGuestFolio` (unchanged) → `orderTransform.fromAPI.order` output for items / `associatedOrders` / `orderFinancials`.
**`FolioCheckoutPanel.jsx`** (~260 L)
1. props `{ row, meta, onDone }`; on mount `scrollIntoView({block:'nearest'})` (M6-11); load `getFolio(row.orderId)` (2 calls per expand incl. the snapshot row, M6-12); `bill-error` + `bill-retry-btn`
2. LEFT `bill-left` (own scroll): Guest & stay → **ROOM** (collapsed heading with `charge.total_with_gst`; expanded: `NightsLines` (P3), booking amount `charge.booking_charge`, `Room upgrade: <reason>` folio line, room-discount control **disabled** + tooltip "needs BQ-385-07" (G-09 parked), **SGST `charge.sgst` / CGST `charge.cgst` two lines (BUG-418, M6-06)**, already paid `charge.advance_payment`, room balance `charge.balance_due`) → **ROOM ORDERS** (folio `roomOrders`) → **TRANSFERRED** (`associatedOrders`)
3. RIGHT `bill-right` class `frontdesk-bill`: `<CollectPaymentPanel isRoom hasPlacedItems onOpenSplitBill={null} onToggleComplimentary={null} isProcessingPayment orderType orderNumber customer={buildCustomer(row)} associatedOrders orderFinancials roomInfo={…} onPaymentComplete={handlePaid} onPrintBill={printBill} … />` — **prop mapping copied verbatim from `PmsCheckoutDrawer.jsx` L260–297** except the BUG-425 hand-override (L271–285) which is **replaced** by `roomInfo.roomPaymentSummary.remainingRoomBalance = row.charge.balance_due`, `roomPrice = charge.booking_charge`, `gstTax = charge.sgst + charge.cgst`, `advancePayment = charge.advance_payment` (M6-10: panel room balance === row balance to the rupee)
4. `handlePaid(result)`: `result.status === 'already_paid'` → toast "Already checked out" (M6-04, verified 200); else toast `Checked out · Room {n} · [Print bill]` → `onDone()` (refetch LR + board → row leaves Departures, tile → hk). No Undo (D1). Print Folio button disabled (`bill-print-folio-btn`, OD-385-15).
Panels wiring: **Bill** live on Departures/In-House rows + RoomDetail occupied.

### 4.3 Tests
Playwright metrics: box 440×560, header 62 pinned, body 353, Pay row 91 inside viewport at 1920×800 and 1366×768, last row too; toggles `display:none` inside `.frontdesk-bill` while `/dashboard` dine-in checkout still shows them; guard test; `roomInfo` mapping unit (fixture LR row → remainingRoomBalance 18,188); SGST/CGST two lines; `already_paid` handling; per-folio state reset (open A → close → open B, AC-15).

### 4.4 QA-agent brief (P4) — live sandbox + POS regression
shapes (i) bare room (ii) room-service lines (iii) transferred; TAB full balance → 200, LR `departed`, `balance_due 0`, ledger row = amount sent, room `hk`; second submit → "Already checked out" toast (no 500); Cash and Card paths; Split rows sum (panel's own); POS dine-in bill / split / TAB / coupon unchanged (R-02); old `/pms/departures` drawer unchanged.

### 4.5 OWNER SMOKE — Phase 4 (≈15 min, settlement)
1. Check in a test guest, add a room-service order and, if you use it, transfer a dine-in bill to the room.
2. Departures/In-House → **Bill** → LEFT: Guest & stay, **ROOM** (open it: nights, upgrade, **SGST and CGST on two lines**, paid, balance), **ROOM ORDERS**, **TRANSFERRED**. RIGHT: the familiar POS payment panel, **Checkout button visible without scrolling** (also on a 1366×768 laptop). The room balance in the panel equals the ROOM balance on the left.
3. Pay with **Credit/TAB** for the full amount → toast "Checked out · Room r4" → row gone from Departures → Rooms tile shows **Needs cleaning**. Click Bill on another guest and press Pay again on the first (via old folio) → "Already checked out", no double charge.
4. Second guest: pay **Cash + Card split** → both rows sum to the grand total → checkout.
5. POS: do a normal dine-in bill and a split bill on `/dashboard` → unchanged.
Say **"Phase 4 smoke OK"**.

---

## PHASE 5 — Closure
1. Full matrix §6 re-run (all 34 rows) on the final build; final probe pack (`run_gate4`, `run_n7n8`, `run_n11`, `run_d1516`, `run_d17`, held_fallback recipe) → `probes_<date>_release/`.
2. Step 5 registry checklist (§7 of the companion plan) for every module; BUG-418 → closed via M6; BUG-412 re-verified (D17); intake BUG-431/432/433 filed from the smoke notes.
3. FILE_OWNERSHIP.md entries for all new files + E1–E5, E8, E10.
4. Owner decision **FU-385-C**: retire old pages (`FrontDeskPage`, `ArrivalsPage`, `DeparturesPage`, `InHouseGuestsPage`, `RoomStatusPage`, `CheckInPage`, `NewBookingPage`, `GuestFolioPage`, `PmsCheckoutDrawer`, `ExtendStayDialog`, `ModifyBookingDialog`) and drop the "(Beta)" label — separate CR; until then mirror rule for `RoomTile` / `CheckInForm`.
5. Owner sign-off → Gate 5 closed → sprint status.

## Cross-phase checklist (Implementation agent, every phase)
- [ ] Entry Verification: line numbers in this file still match (`sed -n`) before editing; if drifted, re-anchor by content, note in QA handover
- [ ] `// CR-385 M<n>` marker on every new file header and every edited line (R18)
- [ ] grep guards empty (X-01/X-06) · hotspot files unchanged (`git log -1 -- CollectPaymentPanel.jsx orderTransform.js pmsService.js`) · mockup sha unchanged
- [ ] `yarn test --watchAll=false --testPathPattern=cr385` green · `yarn build` no new warnings
- [ ] QA agent pass at 1920×800 **and** 1366×768; zero console errors; unique `data-testid` on every interactive element
- [ ] Sandbox settled + settings restored; rooms 8524/8526 never touched
- [ ] registry.json status `GATE_5A_IMPLEMENTED (P<n>)` + status_history; CR_REGISTRY, CONTROL_DASHBOARD, PRD, handover updated (R17)
- [ ] Owner smoke script handed over; wait for "Phase n smoke OK"
