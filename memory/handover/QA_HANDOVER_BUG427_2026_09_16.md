# QA Handover — BUG-427
**Date:** 2026-09-16  
**Implemented by:** IMPLEMENTATION agent  
**Risk:** CRITICAL — Total Balance Due on folio was understated by ₹256

---

## 1. Inherited from Plan — Verification Matrix Results

| Edit | File | Verification | Self-Test |
|------|------|-------------|-----------|
| `totalAmount` field added | `folioTransform.js` L125 | `Math.round((amt + gstAmt) * 100) / 100` | ✅ PASS |
| `useRestaurant` import | `GuestFolioPage.jsx` L8 | Present | ✅ PASS |
| `roomGstApplicable` from `checkInFlags` | L113 | `restaurant?.checkInFlags?.roomGstApplicable ?? false` | ✅ PASS |
| `roomOrdersTotal` conditional reduce | L138-140 | Uses `r.totalAmount` when flag true | ✅ PASS |
| Room Orders section total conditional | L357 | Same conditional | ✅ PASS |
| 3-tile grid `grid-cols-3` | L379 | Present | ✅ PASS |
| Tile 1: Room Balance | L380-385 | `data-testid="room-balance-display"` | ✅ PASS |
| Tile 2: Transferred F&B (renamed) | L386-392 | `data-testid="fb-balance-display"` | ✅ PASS |
| Tile 3: Room Orders (new) | L393-399 | `data-testid="room-orders-balance-display"` | ✅ PASS |
| Total Balance Due formula | L404 | `roomBalance + fnbTotal + roomOrdersTotal` | ✅ PASS |
| Compile | — | webpack 1 pre-existing warning, 0 new | ✅ PASS |

Self-test: **11/11 verified**

---

## 2. Test Cases for QA

### TC-01 — Room Orders tile shows correct post-GST amount (CRITICAL)
**Guest:** "test gst" (order #000069, r1)  
**Steps:** Login → PMS → Guest Folio → open "test gst" folio  
**Expected:**
- Room Orders tile: **₹256** (not ₹228)
- Transferred F&B tile: **₹418**
- Room Balance tile: **₹950**
- Total Balance Due: **₹1,624**

### TC-02 — Room Orders section total in LHS card uses post-GST
**Steps:** Same folio, scroll to Room Orders card (LHS)  
**Expected:** "Room Orders Total: ₹256" (not ₹228)

### TC-03 — Total Balance Due correct
**Steps:** Same folio, RHS Balance Breakdown  
**Expected:** Total Balance Due = **₹1,624** (was ₹1,368 before fix)

### TC-04 — Transferred F&B tile correct and renamed
**Steps:** Same folio  
**Expected:** Tile labelled "Transferred F&B" (not "F&B Posted"), shows **₹418**

### TC-05 — roomGstApplicable=false: Room Orders uses pre-tax amount
**Steps:** Restaurant with `roomGstApplicable = false` → open any room folio with room orders  
**Expected:** Room Orders tile shows pre-tax amount (food_details.tax not applied). Total Balance Due adjusts accordingly.

### TC-06 — No room orders: Room Orders tile shows ₹0 (greyed)
**Steps:** Open folio for guest with no room-native food orders  
**Expected:** Room Orders tile shows ₹0 in grey (#ccc). Total Balance Due = Room Balance + Transferred F&B only.

### TC-07 — No regression: Room Charges card (Room Price, Lodging GST, Advance, Amount Received) unchanged
**Steps:** Same folio, Room Charges card (RHS)  
**Expected:** All 4 FinRow values correct and unchanged. BUG-423 roomBalance formula intact.

### TC-08 — No regression: Per-row display in Room Orders still shows pre-tax + expandable GST
**Steps:** Same folio, Room Orders card → tap a row  
**Expected:** Row shows pre-tax amount; tap expands GST breakdown (BUG-424 behaviour preserved)

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R1 | BUG-423 roomBalance formula | GuestFolioPage.jsx modified — verify roomBalance calc unchanged |
| R2 | BUG-424 Room Orders section display (per-row pre-tax + expand) | folioTransform.js modified — totalAmount is additive, existing fields unchanged |
| R3 | Check Out button still works from folio | GuestFolioPage modified — PmsCheckoutDrawer integration unchanged |
| R4 | folio page loads correctly when `folio` is null (loading state) | `roomOrdersTotal` uses `folio?.roomOrders ?? []` — safe on null |

---

## 4. Registry Sync Confirmation

- Registry synced: **YES**
- BUG-427 status: `GATE_5A_IMPLEMENTED`
- Sprint: `pos_pms_1`
- EXIT GATE: **5/5 PASS**
  - ☑ 1. registry.json synced
  - ☑ 2. BUG_TRACKER.md updated
  - ☑ 3. FILE_OWNERSHIP.md updated
  - ☑ 4. Code markers: `// BUG-427` in all modified sections
  - ☑ 5. Compile: webpack 0 new warnings

---

## 5. Credentials + Environment

- **Test guest:** "test gst" — room ₹1,000, GST ₹50, advance ₹100
- **Expected grand total:** ₹1,624 = Room ₹950 + Transferred F&B ₹418 + Room Orders ₹256
- **Test credentials:** `/app/memory/test_credentials.md`
- **URL:** preprod.mygenie.online → PMS → In-House Guests → tap "test gst" → View Folio
