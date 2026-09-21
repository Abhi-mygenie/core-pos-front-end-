# QA Handover — BUG-426
**Date:** 2026-09-16
**Implemented by:** IMPLEMENTATION agent
**Risk:** HIGH — In-House Guests balance column was showing room-only (₹950); should show ₹1,624

---

## 1. Inherited from Plan — Verification Matrix Results

| Edit | File | Verification | Self-Test |
|------|------|-------------|-----------|
| Function signature `{ roomGstApplicable = false } = {}` | `pmsService.js` L38 | Present | ✅ PASS |
| `transferredFnb` from `associated_order_list` | `pmsService.js` L111-113 | `reduce` over array, `a.order_amount` | ✅ PASS |
| `roomOrdersTotal` with GST conditional | `pmsService.js` L116-130 | filter check-in/cancelled, conditional GST branch | ✅ PASS |
| `row.transferredFnbBalance` stored separately | `pmsService.js` L133 | Present | ✅ PASS |
| `row.roomOrdersBalance` stored separately | `pmsService.js` L134 | Present | ✅ PASS |
| `row.balance = roomBalance + transferredFnb + roomOrdersTotal` | `pmsService.js` L135 | Present | ✅ PASS |
| `useRestaurant` import | `InHouseGuestsPage.jsx` L9 | Present | ✅ PASS |
| `roomGstApplicable` from `checkInFlags` | `InHouseGuestsPage.jsx` L23 | `?? false` default | ✅ PASS |
| `getInHouseGuests({ roomGstApplicable })` | `InHouseGuestsPage.jsx` L29 | Present | ✅ PASS |
| `useCallback` deps `[roomGstApplicable]` | `InHouseGuestsPage.jsx` L36 | Present | ✅ PASS |
| Compile | — | webpack 1 pre-existing warning, 0 new | ✅ PASS |

Self-test: **9/9 code checks verified**

---

## 2. Test Cases for QA

### TC-01 — In-House Balance column shows full amount (CRITICAL)
**Guest:** "test gst" (order #000069, r1)
**Steps:** Login → PMS → In-House Guests page
**Expected:** Balance column for "test gst" = **₹1,624**
(room ₹950 + transferred F&B ₹418 + room orders ₹256)
**Was:** ₹950 (room only)

### TC-02 — Outstanding Balance KPI updates correctly
**Steps:** Same page load
**Expected:** Outstanding Balance KPI (top strip) sums ₹1,624 for "test gst" in total
**Was:** Summing only room-only balances

### TC-03 — roomGstApplicable=false: room orders use pre-tax amount
**Steps:** Restaurant with `roomGstApplicable = false` → In-House Guests page
**Expected:** Balance = room balance + transferredFnb + room orders (NO food item GST added)
Room orders contribution = ₹228 (pre-tax) not ₹256 (post-tax)

### TC-04 — No transferred F&B: balance = room + room orders only
**Steps:** Guest with no transferred orders → check balance
**Expected:** Balance = roomBalance + roomOrdersTotal (transferredFnb = 0, no error)

### TC-05 — No room orders: balance = room + transferred F&B only
**Steps:** Guest with no room-native food orders
**Expected:** Balance = roomBalance + transferredFnb (roomOrdersTotal = 0, no error)

### TC-06 — No regression: BUG-421 room balance formula intact
**Steps:** Guest with only room booking (no F&B) — e.g. "parth" (no advance)
**Expected:** Balance = room ₹1,050 (roomPrice + gstTax, no advance). transferredFnb=0, roomOrdersTotal=0.

### TC-07 — Page still loads when Step 3 API call fails gracefully
**Steps:** Simulate network failure on SINGLE_ORDER_NEW (or test with guest whose orderId returns null)
**Expected:** Page loads with balance from Step 2 fallback (amount_after_tax). No crash.

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R1 | BUG-421 Step 3 room balance formula preserved | pmsService.js Step 3 extended — verify `roomBalance = rp + gt - ap - rb` still correct |
| R2 | All other pmsService functions unaffected | Only `getInHouseGuests` signature changed — other exports unchanged |
| R3 | `useCallback` re-fires when `roomGstApplicable` changes | Deps array now `[roomGstApplicable]` — verify load() re-runs on flag change |
| R4 | ExtendStay, Refresh, search still work on In-House page | InHouseGuestsPage.jsx modified — other functionality untouched |

---

## 4. Registry Sync Confirmation

- Registry synced: **YES**
- BUG-426 status: `GATE_5A_IMPLEMENTED`
- Sprint: `pos_pms_1`
- EXIT GATE: **5/5 PASS**
  - ☑ 1. registry.json synced
  - ☑ 2. BUG_TRACKER.md updated
  - ☑ 3. FILE_OWNERSHIP.md updated (pmsService.js + InHouseGuestsPage.jsx)
  - ☑ 4. Code markers: `// BUG-426` in all modified sections
  - ☑ 5. Compile: webpack 0 new warnings

---

## 5. Credentials + Environment

- **Test guest:** "test gst" — room ₹1,000, GST ₹50, advance ₹100, order #000069, r1
- **Expected In-House balance:** ₹1,624 = room ₹950 + transferred F&B ₹418 + room orders ₹256
- **Test credentials:** `/app/memory/test_credentials.md`
- **URL:** preprod.mygenie.online → PMS → In-House Guests → check Balance column for "test gst"
