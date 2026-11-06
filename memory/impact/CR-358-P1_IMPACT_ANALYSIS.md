# CR-358-P1 — Gate 2: Impact Analysis
## PMS Phase 1 — Foundation + Channel Manager Core + In-House

**Doc:** `impact/CR-358-P1_IMPACT_ANALYSIS.md`
**Date:** 2026-09-01
**Agent Role:** PLANNING (Gate 2 — Impact Analysis only. Gate 3 / Implementation Plan NOT written.)
**Parent:** CR-358 (PMS Module + Channel Manager — Gate 2 CLOSED 2026-08-28, phased plan APPROVED 2026-09-01)
**Code Reality:** NONE — no PMS/AIOSELL code exists anywhere in `src/`. Fully greenfield.
**Risk:** HIGH (sole phase touching `Sidebar.jsx` + `App.js` hotspots; AIOSELL API integration first-ever wiring)
**Conflict Pre-Check:** CLEAN — no currently-open items touch `App.js` or `Sidebar.jsx`. See §3.
**OD-P1-01 STATUS:** ✅ CONFIRMED 2026-09-01 — Option A. Gate on `features.room`. Owner note: "this is only for hotels for now — a separate dedicated key will be provided later to replace `features.room`."

---

## 0. Step 0 — Code Reality Check

```bash
grep -rn "aiosellService|pmsService|aiosellTransform|ChannelManagerPage|InHouseGuests|/pms/" \
  /app/frontend/src/ --include="*.js" --include="*.jsx"
# → 0 results
```

**Result: NONE.** No PMS routes, services, transforms, or pages exist. Full Phase 1 scope is greenfield.
The single existing PMS-adjacent comment (`/* CR-004: Room Orders Report (PMS-style view) */` in Sidebar.jsx line 127) is a label comment only — no code block.

---

## 1. Step 1 — Conflict Pre-Check

| File | Last Modified By | Date | Open Conflict? |
|---|---|---|---|
| `api/constants.js` | CR-143 (AGGREGATOR_SYNC_ENDPOINTS) | 2026-07-19 | **NONE** — additive new block at EOF |
| `App.js` | CR-131 (+2 CRM beta routes) | 2026-08-06 | **NONE** — additive imports + routes |
| `components/layout/Sidebar.jsx` | CR-131 (+2 sidebar entries) | 2026-08-06 | **NONE** — additive section + VISIBLE_SECTIONS edit |
| All 3 new service/transform files | — | — | **NONE** — new files, no conflict possible |
| All 2 new page files | — | — | **NONE** — new files |

**Registry check:** CR-358 status = `GATE 3 — PHASED PLAN OWNER-APPROVED`. CR-358-P1 not yet registered (expected — this IA is the Gate 2 output that triggers registration). No other open CR touches the same files.

---

## 2. Risk Classification

**Risk: HIGH**

Triggers:
- `Sidebar.jsx` is a hotspot file (R5) — 836 lines, 68-file BUG-361 sweep recently completed (2026-08-26), `VISIBLE_SECTIONS` constant + `SIDEBAR_PERMISSIONS` dict both require edits.
- `App.js` is touched — adds 9 new route imports + 9 route entries to a 101-route file.
- First-ever AIOSELL API wiring in FE — new API integration, response shapes captured from probes but any field name drift between probe date and implementation date is a risk (R12 rule).

**Not CRITICAL** — no financial, payment, tax, order, or settlement logic touched. Pure new module addition.

---

## 3. Data Flow Trace (Phase 1 screens)

### S8 — Channel Manager (`/pms/channel-manager`)
```
GET /aiosell/status
  → aiosellService.getStatus()
  → aiosellTransform.fromAPI.status(res.data)
    → { isRunning, isActive, hotelCode, pmsSlug, lastSyncAt }
  → ChannelManagerPage — Tab A (Connect) card

GET /aiosell/rooms
  → aiosellService.getRooms()
  → aiosellTransform.fromAPI.rooms(res.data)
    → { property{}, mapping{}, localRooms[], aiosellRooms[], mappings[] }
  → ChannelManagerPage — Tab B (Room Mapping) grid

POST /aiosell/room-mapping  (payload: { mappings: [{restaurant_table_id, aiosell_room_code, aiosell_rateplan_code}] })
  → aiosellService.saveRoomMapping(mappings)
  → ChannelManagerPage — Tab B "Save Mapping" button

POST /aiosell/fetch-inventory  (payload: { start_date, end_date })
  → aiosellService.fetchInventory(dateRange)
  → aiosellTransform.fromAPI.inventory(res.data)
    → { updates[{ date, rooms[{ roomCode, available }] }] }
  → ChannelManagerPage — OTA/Sync tab inventory bars

POST /aiosell/push-inventory  (payload: { start_date, end_date })
  → aiosellService.pushInventory(dateRange)
  → ChannelManagerPage — "Sync All Now" button toast

POST /aiosell/start / POST /aiosell/stop
  → aiosellService.startService() / stopService()
  → ChannelManagerPage — Tab A start/stop toggle

POST /aiosell/fetch-reservations  (payload: { start_date, end_date, import: true })
  → aiosellService.fetchReservations(params)
  → ChannelManagerPage — OTA/Sync tab "Fetch Reservations" action
```

### S6 — In-House Guests (`/pms/in-house`)
```
GET /api/v2/vendoremployee/get-room-list  (existing endpoint)
  → roomService.getRoomList()            ← EXISTING — not modified
  → pmsService.getInHouseGuests()        ← wraps roomService.getRoomList()
  → roomListTransform.transformRoomListToRows(raw)  ← EXISTING — not modified
  → InHouseGuestsPage — table of occupied rooms
```

### Meal Plan Decoder (pure function — no API call)
```
rateplan_code: "deluxe-ep"  →  aiosellTransform.decodeMealPlan("deluxe-ep")
  → strips suffix: "ep" → "Room Only"
  → "cp" → "Breakfast Included"
  → "map" → "Half Board"
  → "ap" → "Full Board"
  → (no suffix / unknown) → null (no badge rendered)
```

### Phase 2–5 Placeholder Pages (7 routes)
```
/pms/new-booking, /pms/check-in, /pms/front-desk,
/pms/reservations, /pms/arrivals, /pms/departures,
/pms/room-status
  → PmsPlaceholderPage (props: { phase, title })
  → Static "Coming in Phase N" card — no API calls
```

---

## 4. Affected Files

### Files WILL change (9 total — 3 modify, 6 new)

| # | File | Type | Lines est. | Change summary |
|---|---|---|---|---|
| 1 | `api/constants.js` | MODIFY | +30 | Add `AIOSELL_ENDPOINTS` export block after line 557 (EOF). Contains ~15 endpoint constants: STATUS, PROPERTY, START, STOP, ROOMS, ROOM_MAPPING, PUSH_INVENTORY, FETCH_INVENTORY, FETCH_RESERVATIONS, DIRECT_RESERVATION, LOCAL_RESERVATIONS, ROOM_CHECK_IN (reuse existing), DASHBOARD_KPIS (Phase 3 stub, inert). All additive — zero edits to existing constants. |
| 2 | `api/services/aiosellService.js` | NEW | ~250 | 9 exported async functions using `api` from `../axios`. Status, property, start/stop, rooms, room-mapping, push/fetch-inventory, fetch-reservations. Each: try/catch, returns `res.data`. |
| 3 | `api/services/pmsService.js` | NEW | ~80 | `getInHouseGuests()` wraps `roomService.getRoomList()` + `roomListTransform.transformRoomListToRows()`. Skeleton exports for P2 (`getReservations` → throws "Phase 3" until wired). |
| 4 | `api/transforms/aiosellTransform.js` | NEW | ~200 | `fromAPI.status()`, `fromAPI.rooms()`, `fromAPI.inventory()`. Pure function `decodeMealPlan(rateplanCode)` — OD-08 meal plan badge. Defensive: `res?.data ?? {}` guards on every field. |
| 5 | `App.js` | MODIFY | +18 | **Import section (top):** +9 lazy imports (or direct imports per existing pattern). **Routes block:** +9 `<Route>` elements in a new `{/* CR-358-P1: PMS Module */}` comment block. All wrapped in `<ProtectedRoute>`. App.js touched ONCE — frozen after P1. |
| 6 | `Sidebar.jsx` | MODIFY | +20 | **4 targeted edits:** E1: `SIDEBAR_PERMISSIONS` — add `'pms': 'pos'`. E2: `VISIBLE_SECTIONS` — add `'pms'` to Set. E3: `sidebarMenuItems[]` — add `{id:'pms', label:'Rooms & Reservations', icon:Building2, children:[9 entries]}` (see §4a). E4: `visibleMenuItems` filter — add `if (item.id === 'pms' && !restaurant?.features?.room) return false` (OD-P1-01 ✅ confirmed — `features.room` gate; future dedicated key is a 1-line swap). Sidebar touched ONCE — frozen after P1. |
| 7 | `pages/pms/ChannelManagerPage.jsx` | NEW | ~400 | S8: Tabs A (Setup/Connect), B (Room Mapping), C (OTA/Sync — inventory bars, Sync Now, Fetch Reservations). Tabs D (Rates) + E (No-Show) render Phase 5 placeholder. Uses aiosellService + aiosellTransform. |
| 8 | `pages/pms/InHouseGuestsPage.jsx` | NEW | ~200 | S6: calls pmsService.getInHouseGuests(), renders sortable table of occupied rooms (room no, guest name, phone, check-in date, order ID). Uses BUG-361 localStorage sidebar pattern. |
| 9 | `pages/pms/PmsPlaceholderPage.jsx` | NEW | ~30 | Shared placeholder for 7 Phase 2–5 unbuilt routes. Props: `{ title, phase }`. Renders "Coming in Phase N" card. |

#### §4a — Sidebar PMS section children (9 entries, added to `sidebarMenuItems[]`)

| id | label | path | featureGate | Phase |
|---|---|---|---|---|
| `pms-channel-manager` | Channel Manager | `/pms/channel-manager` | — | P1 |
| `pms-in-house` | In-House Guests | `/pms/in-house` | — | P1 |
| `pms-new-booking` | New Booking | `/pms/new-booking` | — | P2 placeholder |
| `pms-check-in` | Check-In | `/pms/check-in` | — | P2 placeholder |
| `pms-front-desk` | Front Desk | `/pms/front-desk` | — | P3 placeholder |
| `pms-reservations` | Tape Chart | `/pms/reservations` | — | P4 placeholder |
| `pms-arrivals` | Arrivals | `/pms/arrivals` | — | P3 placeholder |
| `pms-departures` | Departures | `/pms/departures` | — | P3 placeholder |
| `pms-room-status` | Room Status | `/pms/room-status` | — | P4 placeholder |

### Files will NOT touch (confirmed scope lock)

| File | Reason |
|---|---|
| `components/modals/RoomCheckInModal.jsx` | OD-01 CO-EXIST — untouched through all phases |
| `pages/DashboardPage.jsx` | OD-01 — no routing changes to existing dashboard |
| `components/order-entry/CollectPaymentPanel.jsx` | Not in P1 scope |
| `api/transforms/orderTransform.js` | Not in P1 scope |
| `api/services/roomService.js` | Wrapped by pmsService — signature NOT changed |
| `api/transforms/roomListTransform.js` | Reused by pmsService — NOT modified |
| `api/transforms/profileTransform.js` | No new feature flag added (see OD-P1-01) |

---

## 5. Risks

| # | Risk | Phase | Severity | Mitigation |
|---|---|---|---|---|
| R1 | `Sidebar.jsx` hotspot — 4 edits in 1 file; BUG-361 pattern must be preserved for new pages | P1 | HIGH | Grep `mygenie_sidebar_expanded` in new page files before merge; implementation agent must follow existing localStorage init pattern verbatim. Regression: 3 existing sidebar sections post-implementation. |
| R2 | `App.js` route count 101 → 110 — no lazy loading in existing code | P1 | MEDIUM | Per existing pattern, direct imports. Performance acceptable (React 19, CRA). Monitor bundle size. |
| R3 | AIOSELL API response shape drift — probed 2026-08-31, implementation may be days/weeks later | P1 | MEDIUM | Per R12 rule: implementation agent must re-verify `GET /aiosell/status` + `GET /aiosell/rooms` response field names before writing aiosellTransform. Proof: POST /aiosell/fetch-inventory shape was `data.updates[].rooms[].roomCode` as of probe — confirm at implementation time. |
| R4 | `ChannelManagerPage.jsx` crash on null API response — BUG-194 lesson (PaymentsMockup `.data?.` missing) | P1 | MEDIUM | aiosellTransform `fromAPI.*` must use `res?.data ?? {}` defensive guard on every field. ChannelManagerPage must show skeleton state while loading + error boundary on fetch fail. |
| R5 | Sidebar `VISIBLE_SECTIONS` Set edit — additive but must not break existing 10 sections | P1 | LOW | Single-line string addition. Existing `const VISIBLE_SECTIONS = new Set([...])` pattern is clear; risk is typo only. Self-test: navigate 3 existing sections post-edit. |
| R6 | Meal plan decoder — suffix extraction from `rateplanCode` string (e.g., `"deluxe-ep"` → `"ep"`) | P1 | LOW | Pure function, no API. Unit-testable. Per OD-08 confirmed: ep/cp/map/ap → labels. Unknown suffixes → null (no badge). |
| R7 | `AIOSELL_ENDPOINTS` path strings — must exactly match Laravel backend routes at `/api/v2/vendoremployee/aiosell/...` | P1 | MEDIUM | Paths captured from parent IA + probe evidence. Implementation agent must cross-check against `verify04_aiosell_status.json` + `verify05_room_mapping.json` at plan time. |

---

## 6. Owner Decisions — Phase 1

All OD-01 through OD-08 from parent Gate 2 are confirmed and carry over.

### OD-P1-01 — PMS Sidebar Section Visibility Gate ✅ CONFIRMED 2026-09-01

**Decision: Option A — Gate on `features.room`.**

Owner confirmation (verbatim): *"Yes this will be only for hotels for now — this key will be used later, we will provide a separate key."*

**Meaning:**
- The "Rooms & Reservations" sidebar section is only visible to restaurants with `features.room = true` (hotels).
- Implementation: add `if (item.id === 'pms' && !restaurant?.features?.room) return false` to the `visibleMenuItems` filter in `Sidebar.jsx`.
- No `profileTransform.js` change needed — `features.room` is already mapped from `api.room`.
- **Future:** A dedicated feature flag (e.g. `features.aiosell` or `features.pms`) will replace `features.room` for this gate when the owner provides it. When that key is added to the backend profile API, a one-line change in `profileTransform.js` + `Sidebar.jsx` filter is all that's needed. No other P1 code is affected.

**Zero open owner decisions remain. Gate 3 (Implementation Plan) is unblocked.**

---

## 7. Verification Matrix (seeds QA handover for Implementation agent)

| # | File | Change | How to Verify | Automated? |
|---|---|---|---|:---:|
| V1 | `api/constants.js` | AIOSELL_ENDPOINTS block exists, no duplicate key | `grep -n "AIOSELL_ENDPOINTS"` — 1 hit; `grep -n "STATUS\|PROPERTY"` in constants — no existing collision | NO |
| V2 | `api/services/aiosellService.js` | `getStatus()` returns parsed data | Mock: `jest.mock('../axios')` → returns verify04 JSON; assert `result.isRunning === true` | YES |
| V3 | `api/transforms/aiosellTransform.js` | `decodeMealPlan` returns correct labels | Unit: `"deluxe-ep" → "Room Only"`, `"std-cp" → "Breakfast Included"`, `"unknown" → null`, `"" → null` | YES |
| V4 | `api/transforms/aiosellTransform.js` | `fromAPI.status()` defensive on null | `fromAPI.status(null)` → no crash; `fromAPI.status({})` → defaults | YES |
| V5 | `App.js` | 9 new routes compile clean | `yarn build` 0 errors; navigate to `/pms/channel-manager` → ChannelManagerPage renders | NO |
| V6 | `Sidebar.jsx` — E1/E2/E3 | "Rooms & Reservations" section appears in sidebar | Login as restaurant 69 (features.room = true) → PMS section visible; Login as non-room restaurant → PMS section hidden (Option A only) | NO |
| V7 | `Sidebar.jsx` — E4 | BUG-361 localStorage pattern not broken | Navigate to any existing page with sidebar (DashboardPage, AllOrdersReport) — `mygenie_sidebar_expanded` key still controls expand/collapse correctly | NO |
| V8 | `pages/pms/ChannelManagerPage.jsx` | Tab A shows status card from live API | Login as R69 → navigate Channel Manager → Tab A status card shows `is_running: true`, hotel_code `sandbox-pms` (V4 endpoint probe) | NO |
| V9 | `pages/pms/ChannelManagerPage.jsx` | Tab B shows room mapping table | Tab B → 5 mapped rooms visible (executive × 5, IDs 8524-8528) | NO |
| V10 | `pages/pms/ChannelManagerPage.jsx` | OTA/Sync tab — Sync All Now triggers push-inventory | Click Sync All Now → network tab shows POST /aiosell/push-inventory → toast success | NO |
| V11 | `pages/pms/InHouseGuestsPage.jsx` | In-House table shows occupied rooms | Navigate `/pms/in-house` → GET_ROOM_LIST called → occupied rooms shown (or empty state if no active check-ins) | NO |
| V12 | Placeholder pages (7) | All P2–5 routes render PmsPlaceholderPage | Navigate to each `/pms/new-booking`, `/pms/check-in`, etc. → "Coming in Phase N" card; no crash | NO |
| V13 | Sidebar regression | Existing 10 sections still render correctly | Navigate: Dashboard, Reports, Insights, Expenses, Inventory — all still visible and navigable | NO |
| V14 | Webpack | 0 new errors | `tail /var/log/supervisor/frontend.out.log` → `compiled with N warnings` (existing 4) — no new warning | NO |

---

## 8. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: CR-358-P1 → status: IMPLEMENTED, sprint_key: pos_X_0, gate: 5a
- [ ] CR_REGISTRY.md: Add CR-358-P1 row (child of CR-358), status IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: Add all 9 files listed in §4 with CR-358-P1 + date
- [ ] Code markers: // CR-358-P1 comment in every modified/created file
- [ ] Verify: VISIBLE_SECTIONS still has all 10 original sections + 'pms'
- [ ] Verify: App.js still has all 101 original routes + 9 new ones (grep Route count)
```

---

## 9. Scope Lock

**WILL change:** `api/constants.js`, `api/services/aiosellService.js` (NEW), `api/services/pmsService.js` (NEW), `api/transforms/aiosellTransform.js` (NEW), `App.js`, `Sidebar.jsx`, `pages/pms/ChannelManagerPage.jsx` (NEW), `pages/pms/InHouseGuestsPage.jsx` (NEW), `pages/pms/PmsPlaceholderPage.jsx` (NEW)

**WILL NOT touch:** `RoomCheckInModal.jsx`, `DashboardPage.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`, `roomService.js`, `roomListTransform.js`, `profileTransform.js`, any existing report page, any existing settings page, `AppProviders.jsx`, `LoadingPage.jsx`

---

*Planning agent | CR-358-P1 Gate 2 | 2026-09-01 | Code reality: NONE | Conflict: CLEAN | Risk: HIGH | OD-P1-01 owner answer needed before Gate 3*
