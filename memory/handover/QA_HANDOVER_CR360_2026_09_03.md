# QA HANDOVER — CR-360
## S6 In-House Guests — Phase 1 Completion: KPI Tiles + View Bill Wiring

**Doc:** `memory/handover/QA_HANDOVER_CR360_2026_09_03.md`
**Date:** 2026-09-03
**From:** IMPLEMENTATION agent → QA agent
**Sprint:** pos_pms_1
**Risk:** LOW
**Scope:** 1 file — `pages/pms/InHouseGuestsPage.jsx`, ~20 lines
**Test on:** https://preprod.mygenie.online — Restaurant 69 (`owner@thegoankitchen.com`, password in `test_credentials.md`)

---

## 1. Inherited from Plan — Verification Matrix Results

| # | Check | File | Expected | Self-Test Result |
|---|---|---|---|---|
| V1 | `useNavigate` imported + initialised | `InHouseGuestsPage.jsx` | 2 grep hits | ✅ PASS — line 4 (import) + line 18 (init) |
| V2 | `checkoutToday` derived and rendered | `InHouseGuestsPage.jsx` | 2 grep hits | ✅ PASS — line 37 (def) + line 95 (use) |
| V3 | `totalBalance` derived and rendered | `InHouseGuestsPage.jsx` | 2 grep hits | ✅ PASS — line 38 (def) + line 96 (use) |
| V4 | `avgNights` derived and rendered | `InHouseGuestsPage.jsx` | 2 grep hits | ✅ PASS — line 39–44 (def) + line 97 (use) |
| V5 | Old hardcoded `'—'` GONE from KPI strip | `InHouseGuestsPage.jsx` | 0 hits for `value: '—'` in KPI section | ✅ PASS — 0 hits |
| V6 | View Bill has `onClick → navigate` | `InHouseGuestsPage.jsx` | 1 grep hit | ✅ PASS — line 167 |
| V7 | webpack compiles clean | webpack | `compiled successfully` | ✅ PASS — `webpack compiled successfully` |

**Plan deviation noted (not a bug):** Plan §2 Step 2 specified `r.checkinDate` for avgNights. Code uses `r.bookingCheckin` instead — documented in code comment `// CR-360: use booking dates for "nights booked", not physical checked_in_at`. This is correct intent (booking window, not physical arrival timestamp).

---

## 2. Test Cases for QA Agent

### TC-1: KPI strip — Checkout Today tile shows derived count
- Navigate to `/pms/in-house` (login as `owner@thegoankitchen.com`, Restaurant 69)
- **Expected:** "Checkout Today" tile shows a numeric count (0 if no checkouts today, NOT `'—'`)
- **data-testid:** `in-house-guests-page`
- **Fail signal:** tile shows `'—'` static string

### TC-2: KPI strip — Outstanding Balance tile shows ₹ amount
- Same page load
- **Expected:** "Outstanding Balance" tile shows `₹<amount>` (if any guest has balance > 0) OR `'—'` (if all balances are 0/null)
- In red text (`text-[#EF4444]`)
- **Fail signal:** tile shows `'—'` regardless of actual data, or shows no rupee symbol

### TC-3: KPI strip — Avg Nights tile shows computed duration
- Same page load
- **Expected:** "Avg Nights" tile shows `<N>d` (e.g. `9d`) if any guest has both `bookingCheckin` + `checkoutDate`; shows `'—'` only if NO guest has both dates
- **Fail signal:** tile always shows `'—'`

### TC-4: KPI strip — loading state shows `…` placeholder
- On page load (before data returns):
- **Expected:** All 4 KPI tiles show `…` while `loading = true`
- **Note:** This is timing-sensitive; verify by throttling network or on slow connection

### TC-5: View Bill button — click navigates to /reports/room-orders
- On the In-House Guests table, click any guest's **"View Bill"** button
- **Expected:** Browser navigates to `/reports/room-orders` (Room Orders Report page loads)
- **data-testid:** `view-bill-btn`
- **Fail signal:** click does nothing, or navigates to wrong route, or throws error

### TC-6: View Bill — regression on guests with no parentOrderId
- If any row has `parentOrderId = null` (walk-in without direct reservation):
- **Expected:** View Bill button still renders and click still navigates (button is not conditional on parentOrderId)
- **Fail signal:** button missing or error thrown for walk-in rows

### TC-7: KPI strip — In-House count still correct (regression on existing tile)
- **Expected:** "In-House" KPI (tile 1) still shows `rows.length` — unchanged from CR-358-P1
- **Fail signal:** In-House tile now shows wrong count or `'—'`

### TC-8: Search still works after CR-360 changes
- Type `r2` in the search box (`data-testid="in-house-search"`)
- **Expected:** Only rows with roomNumber containing `r2` are shown — filter unchanged
- **Fail signal:** search broken or throws error

### TC-9: Refresh button still works
- Click the Refresh button (`data-testid="in-house-refresh-btn"`)
- **Expected:** Table re-fetches and KPI tiles update (show `…` briefly then populate)
- **Fail signal:** error thrown, or KPI tiles stay stale

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | `RoomOrdersReportPage` renders when navigated to via View Bill | Route `/reports/room-orders` must exist and load correctly — CR-360 navigates here |
| R2 | BUG-378 data still populates (Room, Phone, Dates, Balance) | CR-360 reads from `rows[]` — must not have broken BUG-378's data join |
| R3 | CR-358-P1 sidebar PMS section still renders (Rooms & Reservations visible) | `InHouseGuestsPage.jsx` is a child of PMS routing — parent structure must be intact |
| R4 | No new webpack warnings introduced | CR-360 added useNavigate import — verify compiler shows same 1 pre-existing warning only |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: CR-360
Status in registry.json: IMPLEMENTED — Gate 5a
Sprint: pos_pms_1
FILE_OWNERSHIP.md: InHouseGuestsPage.jsx listed under CR-360 (2026-09-03)
CR_REGISTRY.md: row updated to IMPLEMENTED — Gate 5a
EXIT GATE: ALL 5 PASSED
```

---

## 5. EXIT GATE Results

| □ | Check | Result |
|---|---|---|
| □1 | `registry.json`: CR-360 → IMPLEMENTED, sprint_key: pos_pms_1 | ✅ PASS |
| □2 | `CR_REGISTRY.md`: row updated IMPLEMENTED | ✅ PASS |
| □3 | `FILE_OWNERSHIP.md`: `InHouseGuestsPage.jsx` listed under CR-360 | ✅ PASS |
| □4 | Code markers: 8× `// CR-360` in `InHouseGuestsPage.jsx` | ✅ PASS |
| □5 | Compile: `webpack compiled successfully` (0 new warnings) | ✅ PASS |

**EXIT GATE: 5/5 PASS**

---

## 6. Credentials + Environment

- **Account:** `owner@thegoankitchen.com` (Restaurant 69 — `features.room = true` required for PMS sidebar)
- **Password:** see `/app/memory/test_credentials.md`
- **Preprod URL:** https://preprod.mygenie.online
- **App URL:** https://pos-app-deploy-1.preview.emergentagent.com (local pod)
- **Note for TC-3:** 3 in-house guests on preprod — `WalkIn Probe Test` (r2, walk-in), `Test Guest` (r5, booking.com), `Future Guest` (r1, Direct). Walk-in has no booking dates → excluded from avgNights. Other 2 guests should yield non-null avgNights.
- **Note for TC-2:** `Test Guest` has balance ₹13,922 + `Future Guest` has ₹5,000 → totalBalance ≈ ₹18,922 expected (if backend is live and BUG-BE-02/BE-04 are fixed).
