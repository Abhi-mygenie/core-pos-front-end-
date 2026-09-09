# QA HANDOVER — CR-358-P1
## PMS Phase 1 — Foundation + Channel Manager + In-House Guests
**Date:** 2026-09-02
**Implementation agent → QA agent**
**Sprint:** pos_pms_1
**Test on:** preprod.mygenie.online — Restaurant 69 (`owner@thegoankitchen.com`, password in `test_credentials.md`)

---

## 1. Inherited from Plan — Verification Matrix (Self-Test Results)

| # | Check | File | Expected | Self-Test Result |
|---|---|---|---|---|
| V1 | AIOSELL_ENDPOINTS exported, no key collision | `api/constants.js` | 1 grep hit | ✅ PASS |
| V2 | `decodeMealPlan` correct labels | `aiosellTransform.js` | 7/7 cases | ✅ PASS — `"deluxe-ep"→"Room Only"`, `"std-cp"→"Breakfast Included"`, `"suite-map"→"Half Board"`, `"prem-ap"→"Full Board"`, unknown/null/empty → null |
| V3 | `fromAPI.status()` defensive on null | `aiosellTransform.js` | No crash | ✅ PASS |
| V4 | `fromAPI.rooms()` maps verify05 shape | `aiosellTransform.js` | mappedCount=5, localRooms.length=5 | ✅ PASS |
| V5 | `getAiosellStatus()` calls STATUS endpoint | `aiosellService.js` | 1 grep hit | ✅ PASS |
| V6 | `getInHouseGuests()` wraps roomService | `pmsService.js` | import only, no modification | ✅ PASS |
| V7 | `BedDouble` in lucide import | `Sidebar.jsx` line 7 | 1 hit on import line + 1 on icon | ✅ PASS |
| V8 | `'pms'` in SIDEBAR_PERMISSIONS + VISIBLE_SECTIONS | `Sidebar.jsx` | 3 hits | ✅ PASS |
| V9 | `'pms'` in VISIBLE_SECTIONS (11 entries total) | `Sidebar.jsx` | Set includes pms | ✅ PASS |
| V10 | `features.room` gate in visibleMenuItems | `Sidebar.jsx` line 344 | `!restaurant?.features?.room` present | ✅ PASS (verified by view — grep missed `?.` optional chaining) |
| V11 | PMS section has 9 children | `Sidebar.jsx` | 9 `pms-*` ids | ✅ PASS |
| V12 | App.js route count = 111 | `App.js` | was 102 + 9 | ✅ PASS |
| V13 | Webpack 0 new errors | webpack | `compiled with 1 warning` (pre-existing) | ✅ PASS |
| V19 | 7 placeholder routes render PmsPlaceholderPage | `App.js` | phase props correct | ✅ PASS |
| V20 | `decodeMealPlan("suite-map")` → "Half Board" (not "Full Board") | `aiosellTransform.js` | map matched before ap | ✅ PASS |

---

## 2. Test Cases for QA Agent

### TC-1: PMS sidebar visible for hotel restaurant (features.room = true)
- Login to Restaurant 69 on preprod
- Expected: "Rooms & Reservations" section appears in sidebar with 9 items
- Regression: All existing sections still visible (Dashboard, Reports, Insights, Inventory, Aggregator)

### TC-2: PMS sidebar hidden for non-hotel restaurant
- Login to a restaurant without `features.room = true` (e.g. any cafe/QSR restaurant)
- Expected: "Rooms & Reservations" section NOT visible in sidebar
- Regression: All other sidebar sections still visible

### TC-3: Channel Manager page loads
- Navigate to `/pms/channel-manager`
- Expected: Page loads with 4 tabs visible (OTA / Sync, AIOSELL Setup, Room Mapping, Rates & Restrictions)
- Expected: `GET /aiosell/status` fires on load; status card visible (Connected or Not Connected)
- data-testid: `channel-manager-page`

### TC-4: Channel Manager — OTA tab inventory bars
- Click "OTA / Sync" tab (default)
- Expected: `POST /aiosell/fetch-inventory` fires; inventory bars render for tonight's availability
- data-testid: `channel-manager-tab-0`

### TC-5: Channel Manager — Sync All Now
- Click "Sync All Now" button on OTA tab
- Expected: `POST /aiosell/push-inventory` fires; success toast appears
- data-testid: `sync-all-btn`

### TC-6: Channel Manager — Room Mapping tab
- Click "Room Mapping" tab
- Expected: `GET /aiosell/rooms` fires; table shows local rooms with AIOSELL dropdown selectors
- data-testid: `room-mapping-table`, `save-mapping-btn`

### TC-7: Channel Manager — AIOSELL Setup tab
- Click "AIOSELL Setup" tab
- Expected: If connected → Connected card with hotel_code + Start/Stop button
- data-testid: `toggle-service-btn`

### TC-8: In-House Guests page loads
- Navigate to `/pms/in-house`
- Expected: Page loads; `GET /get-room-list` fires; table shows in-house guests (or empty state)
- data-testid: `in-house-guests-page`, `in-house-table`

### TC-9: In-House Guests — search
- Type in search box
- Expected: Table filters by guest name / room / order number
- data-testid: `in-house-search`

### TC-10: Placeholder routes render correctly
- Navigate to `/pms/new-booking` → "Coming in Phase 2" card with Clock icon
- Navigate to `/pms/front-desk` → "Coming in Phase 3"
- Navigate to `/pms/reservations` → "Coming in Phase 4"
- No crash on any route
- data-testid: `pms-placeholder-page`

### TC-11: Sidebar regression — BUG-361 localStorage preserved
- Expand/collapse sidebar on any existing page (Dashboard, Reports)
- Navigate to a PMS page
- Navigate back to Dashboard
- Expected: Sidebar expand/collapse state persists across all pages

### TC-12: Sidebar regression — existing 10 sections still visible
- Navigate to: Dashboard, Daily Report, Expenses, Menu Management, Credit, Reports, Settings, Inventory, Insights, Aggregator
- Expected: All sections visible and navigable; zero regression

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | Existing room check-in modal on Dashboard still works (OD-01 co-exist) | Sidebar.jsx E5 added PMS section — must not affect RoomCheckInModal path |
| R2 | CollectPaymentPanel checkout still works for existing room orders | pmsService wraps roomService — must not affect existing checkout |
| R3 | All 10 existing sidebar sections still navigate correctly | Sidebar E1-E5 edits touched hotspot file |
| R4 | App.js 102 original routes still work (pick 3 at random) | App.js +9 routes added — no import conflicts |

---

## 4. Registry Sync Confirmation

- Registry synced: YES
- Item: CR-358-P1 → status IMPLEMENTED, sprint_key: pos_pms_1
- EXIT GATE: ALL 5 PASSED (see §5)

---

## 5. EXIT GATE Results

| # | Check | Result |
|---|---|---|
| □1 | registry.json: CR-358-P1 → IMPLEMENTED, sprint_key: pos_pms_1 | ✅ REGISTERED |
| □2 | CR_REGISTRY.md: row added | ✅ ADDED |
| □3 | FILE_OWNERSHIP.md: 9 files listed | ✅ ADDED |
| □4 | Code markers: `// CR-358-P1` in every file | ✅ ALL 9 FILES |
| □5 | Compile: 0 new warnings | ✅ `webpack compiled with 1 warning` (pre-existing) |

---

## 6. Credentials + Environment

- Account: `owner@thegoankitchen.com` (Restaurant 69, has `features.room = true` — required for PMS sidebar visibility)
- Password: see `/app/memory/test_credentials.md`
- URL: https://preprod.mygenie.online
- Note: For TC-2, use any non-hotel restaurant login (cafe/QSR)
