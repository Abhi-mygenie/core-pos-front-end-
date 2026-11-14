# QA Handover — CR-358-P5 (Gate 5b)
**Date:** 2026-09-08
**Item:** CR-358-P5 — PMS Phase 5: Rate Grid (S8-C) + Mark No-Show (S8-D)
**Sprint:** pos_pms_1
**Risk:** HIGH
**Implementation agent:** IMPLEMENTATION role (this session)

---

## 1. Inherited Verification Matrix (from plan — self-test results)

| Edit | File | Verification | Self-Test |
|---|---|---|---|
| E1 | aiosellService.js | 5 functions appended (getRates, pushRates, pushInventoryRestrictions, pushRateRestrictions, markNoShow) | ✅ grep confirmed — all 5 at lines 125/136/149/162/176 |
| E2a | aiosellTransform.js | fromRates function present after fromPendingArrival | ✅ grep confirmed — line 158 |
| E2b | aiosellTransform.js | rates: fromRates registered in fromAPI | ✅ grep confirmed — line 258 |
| E3a | pmsService.js | 5 new imports added to aiosellService import line | ✅ grep confirmed |
| E3b | pmsService.js | 5 new exports appended (getRatesData, pushRatesData, pushInvRestrictionsData, pushRateRestrictionsData, markNoShowBooking) | ✅ grep confirmed — lines 318/327/340/344/351 |
| E4 | NoShowDialog.jsx (NEW) | File exists, data-testid="noshow-dialog" present | ✅ confirmed |
| E5 | RatesTab.jsx (NEW) | File exists, all 5 key data-testids present | ✅ confirmed |
| E6 | ChannelManagerPage.jsx | RatesTab import + usage (2 hits) | ✅ grep confirmed |
| E7 | ArrivalsPage.jsx | noShowTarget, OTA_NO_SHOW_CHANNELS, arr-noshow-btn, NoShowDialog all present | ✅ grep confirmed |
| E8 | ReservationsPage.jsx | noShowTarget, onNoShow, tc-popover-noshow-btn, NoShowDialog all present | ✅ grep confirmed |

**Webpack compile:** `webpack compiled successfully` — 0 new errors.

---

## 2. Test Cases (from plan verification matrix §5 — browser-verifiable items)

| # | Test | Steps | Expected | data-testid |
|---|---|---|---|---|
| T-B1 | Rate grid renders | Login → PMS → Channel Manager → Rates & Restrictions tab (Tab 3) | Rate Grid table renders, no error | `rt-rates-grid` |
| T-B2 | Weekend shading | Same as T-B1, check SAT/SUN columns | Amber `#FFFBEB` background on weekend columns | — |
| T-B3 | Cell click → popover | Click any rate cell in the grid | Popover appears with live ₹ rate, ±chip buttons, Stage Change | `rt-cell-popover` |
| T-B4 | Stage → orange + bar | Stage 1 rate change via popover | Cell turns orange border, staged review bar appears at bottom | `rt-review-bar` |
| T-B5 | Diff modal | With 2 staged → click "Review & Push" | Diff modal shows before/after table with delta colours | `rt-diff-overlay` |
| T-B6 | Discard staged | Click "Discard All" on review bar | All orange cells revert, bar disappears | `rt-discard-btn` |
| T-B7 | Inv Restrictions sub-tab | Click "Inventory Restrictions" sub-tab | Form shows Executive Room + Suite cards with toggles | `rt-inv-form` |
| T-B8 | Rate Restrictions sub-tab | Click "Rate Restrictions" sub-tab | Shows "Load rates first" message when rates not loaded | `rt-rr-form` |
| T-B9 | Quick range selector | Click 14d / 30d buttons | Date range updates, matrix re-fetches | `rt-range-14`, `rt-range-30` |
| T-B10 | No-Show button on Late tab (booking.com) | Arrivals → Late tab → find booking.com pending row | No-Show button (red outline, UserX icon) visible | `arr-noshow-btn-{id}` |
| T-B11 | No-Show NOT on Direct row | Arrivals → any tab → find a Direct/Walk-in booking | No No-Show button visible | — |
| T-B12 | No-Show NOT on Upcoming tab | Arrivals → Upcoming tab | No No-Show buttons visible on any row | — |
| T-B13 | NoShowDialog shows correct details | Click No-Show button on any eligible row | Dialog shows bookingId, guestName, channel, check-in, roomCode | `noshow-dialog` |
| T-B14 | Cancel keeps booking | Dialog → Cancel / Keep Booking | Dialog closes, no API call fired | `noshow-cancel-btn` |
| T-B15 | Tape Chart No-Show eligible block | Reservations → Tape Chart → click pending booking.com block with past check-in date | BlockPopover shows No-Show button (red outline) | `tc-popover-noshow-btn` |
| T-B16 | No-Show NOT on in_house block | Tape Chart → click an occupied/in-house block | BlockPopover has NO No-Show button | — |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R-1 | ChannelManagerPage Tabs 0, 1, 2 still render normally | Tab 3 wiring must not break other tabs |
| R-2 | ArrivalsPage Today / Upcoming / Checked-In tabs load | No-Show addition must not break existing tabs |
| R-3 | Tape Chart loads and blocks are clickable | BlockPopover signature change (onNoShow added) must not break existing behaviour |
| R-4 | Existing BlockPopover Check-In button still works | No side-effects from E8 |
| R-5 | Fetch from Aiosell button triggers loading state | Basic service layer smoke |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: CR-358-P5 → IMPLEMENTED (Gate 5a — 2026-09-08)
Sprint: pos_pms_1
EXIT GATE: ALL 5 PASSED
  ✅ 1. registry.json — IMPLEMENTED
  ✅ 2. CR_REGISTRY.md — row updated IMPLEMENTED
  ✅ 3. FILE_OWNERSHIP.md — all 8 files listed
  ✅ 4. Code markers — // CR-358-P5 in all 8 files
  ✅ 5. Compile — webpack 0 errors
```

---

## 5. Credentials + Environment

- **URL:** `https://core-pos-live.preview.emergentagent.com`
- **Test credentials:** see `/app/memory/test_credentials.md`
- **Preprod API:** `https://preprod.mygenie.online/`
- **Note:** Mark No-Show API returns 422 for sandbox bookings (expected — confirmed in investigation). QA can verify dialog renders + error toast on API failure as acceptable PASS.
