# QA Handover — BATCH 2 (BUG-426 / BUG-427 / BUG-428 / BUG-429 / BUG-430)

**Date:** 2026-09-16  
**Batch:** PMS Balance Finalization (Cumulative Fix)  
**Status:** GATE_5A_IMPLEMENTED — Awaiting QA Execution  
**Risk:** CRITICAL (All bugs affect same financial calculation)

---

## §1 — Registry Sync Confirmation

- BUG-426: GATE_5A_IMPLEMENTED ✅
- BUG-427: GATE_5A_IMPLEMENTED ✅
- BUG-428: GATE_5A_IMPLEMENTED ✅
- BUG-429: GATE_5A_IMPLEMENTED ✅
- BUG-430: GATE_5A_IMPLEMENTED ✅

---

## §2 — Why These 5 Bugs Are Tested Together

### Cascading Dependencies

**The Problem:** Guest "test gst" shows different balances on different pages
- Checkout: ₹1,947 ✅ (correct)
- Folio: ₹1,929 ❌ (missing ₹18)
- In-House: ₹1,930.40 ❌ (missing ₹16.60)

**The Fixes (in sequence):**
1. **BUG-426** (In-House): Added transferred F&B + room orders to balance calculation
2. **BUG-427** (Folio): Added room orders to Total Balance Due + 3-tile grid
3. **BUG-429** (Both): Fixed GST calculation using 3-step pattern from orderTransform
4. **BUG-430** (Both): Added add-ons to GST base amount (correction of BUG-429)
5. **BUG-428** (Checkout): Display Lodging GST as separate line item

**Result:** All three pages should now show **₹1,947** for "test gst" guest

---

## §3 — Files Changed

| File | Bug(s) | Change Summary |
|------|--------|---------------|
| `api/services/pmsService.js` | BUG-426, BUG-429, BUG-430 | Step 3 extended: transferredFnb + roomOrdersTotal (with GST). L125-130: add-ons calculation added. 3-step GST logic (L132-144). |
| `api/transforms/folioTransform.js` | BUG-427, BUG-429, BUG-430 | roomOrders section added (L105-137). L115-120: add-ons calculation added. 3-step GST logic (L122-129). |
| `pages/pms/GuestFolioPage.jsx` | BUG-427 | 3-tile grid (Room Balance + Transferred F&B + Room Orders). Total Balance Due formula updated. |
| `pages/pms/InHouseGuestsPage.jsx` | BUG-426 | roomGstApplicable flag passed to getInHouseGuests(). |
| `components/order-entry/CollectPaymentPanel.jsx` | BUG-428 | Lodging GST conditional line (L1836-1842). R5 hotspot. |

---

## §4 — Test Data

**Primary Test Guest:** "test gst" (order #000069)  
**Account:** palmhouse (preprod.mygenie.online)  
**Guest Details:**
- Room rate: ₹950 (includes GST)
- Transferred F&B: ₹741
- Room Orders: ₹256 (base + GST + add-ons)
- **Expected Total:** ₹950 + ₹741 + ₹256 = **₹1,947**

**Breakdown of ₹256 (Room Orders):**
- Base food items: ~₹200-220
- Add-ons (extra cheese, etc.): ~₹18-20
- GST on (base + add-ons): ~₹18-20
- **Total:** ₹256

**Before fixes:**
- Folio Room Orders: ₹238 (missing add-ons GST)
- Folio Total: ₹1,929 (₹950 + ₹741 + ₹238)
- In-House Balance: ₹1,930.40

**After fixes:**
- Folio Room Orders: ₹256 ✅
- Folio Total: ₹1,947 ✅
- In-House Balance: ₹1,947 ✅

---

## §5 — Test Cases

### Combined Test Suite (Single Guest Validates All 5 Bugs)

#### TC1 — In-House Balance (BUG-426)
**Steps:**
1. Login to preprod.mygenie.online (palmhouse account)
2. Navigate to PMS → In-House Guests
3. Locate "test gst" guest row
4. Check Balance column

**Expected:**
- Balance: **₹1,947**
- Breakdown (if hovering/clicking):
  - Room: ₹950
  - Transferred F&B: ₹741
  - Room Orders: ₹256

**Before fix:** ₹1,930.40 (missing transferred F&B partial + room orders GST miscalc)

---

#### TC2 — Folio 3-Tile Grid (BUG-427)
**Steps:**
1. From In-House, click "test gst" guest
2. Navigate to Folio tab
3. Check the 3-tile grid at top

**Expected:**
- **Tile 1 (Room Balance):** ₹950
- **Tile 2 (Transferred F&B):** ₹741
- **Tile 3 (Room Orders):** ₹256
- All three tiles visible

**Before fix:** Only 2 tiles (Room + F&B), Room Orders missing

---

#### TC3 — Folio Room Orders Section (BUG-427 + BUG-429 + BUG-430)
**Steps:**
1. Same folio page
2. Scroll to "Room Orders" card on LHS
3. Check line items

**Expected:**
- All room food orders listed with:
  - Item name
  - Quantity
  - Unit price
  - Amount (includes add-ons)
  - GST % and amount
- **Total at bottom:** ₹256
- Expand rows to see SGST/CGST breakdown

**Before fix (BUG-427):** Section missing entirely  
**Before fix (BUG-429):** Total showed ₹238 (GST wrong)  
**Before fix (BUG-430):** Add-ons excluded from GST base

---

#### TC4 — Folio Total Balance Due (BUG-427)
**Steps:**
1. Same folio page
2. Scroll to Balance Breakdown section (bottom)
3. Check "Total Balance Due" line

**Expected:**
- Room Balance: ₹950
- Transferred F&B: ₹741
- Room Orders: ₹256
- **Total Balance Due: ₹1,947**

**Before fix:** ₹1,929 (room orders under-counted)

---

#### TC5 — Checkout Lodging GST Line (BUG-428)
**Steps:**
1. From folio, click "Checkout" button
2. PmsCheckoutDrawer opens
3. Check ROOM breakdown section

**Expected:**
- Room Charge: ₹1,000
- **Lodging GST: ₹50** ← NEW LINE (BUG-428)
- Advance Paid: ₹100
- Remaining: ₹950

**Before fix:** Lodging GST line missing (₹1,000 - ₹100 = ₹950, GST hidden)

---

#### TC6 — Checkout Grand Total (BUG-426/427/428/429/430 Combined)
**Steps:**
1. Same checkout drawer
2. Scroll to bottom
3. Check GRAND TOTAL

**Expected:**
- ROOM: ₹950
- Transferred F&B: ₹741
- Room Orders: ₹256
- **GRAND TOTAL: ₹1,947**

**Before fix:** Already correct (₹1,947) — checkout was the reference

---

#### TC7 — Three-Way Match (CRITICAL VALIDATION)
**Steps:**
1. Note Checkout GRAND TOTAL: _______
2. Note Folio Total Balance Due: _______
3. Note In-House Balance: _______

**Expected:**
- All three values are **IDENTICAL**
- **₹1,947 = ₹1,947 = ₹1,947** ✅

**Before fixes:** Checkout (₹1,947) ≠ Folio (₹1,929) ≠ In-House (₹1,930.40)

---

### Edge Case Tests

#### TC8 — Room Orders Without Add-Ons (BUG-430 Regression)
**Steps:**
1. Find a guest with room orders that have NO add-ons
2. Check Folio Room Orders total
3. Check In-House balance

**Expected:**
- GST calculated correctly (same as before BUG-430 fix)
- No change in total for items without add-ons

**Validates:** BUG-430 doesn't break items without add-ons

---

#### TC9 — Room Orders With Multiple Add-Ons (BUG-430)
**Steps:**
1. Find a room order with multiple add-ons (e.g., "Burger + Extra Cheese + Extra Patty")
2. Check Folio Room Orders line item amount
3. Verify: `amount = (base_price + addon1_price + addon2_price) × qty`

**Expected:**
- All add-ons included in amount
- GST calculated on `(base + all add-ons)`

---

#### TC10 — Transferred F&B vs Room Orders (BUG-426/427)
**Steps:**
1. Check "test gst" guest
2. Verify Transferred F&B section (restaurant orders posted to room)
3. Verify Room Orders section (food ordered directly to room)

**Expected:**
- Two separate sections with different totals
- Transferred F&B: ₹741 (from associated_order_list)
- Room Orders: ₹256 (from orderDetails)
- Both included in Total Balance Due

---

## §6 — Automated Testing Checklist

### API Validation (Testing Subagent)
- [ ] GET `/api/v2/vendoremployee/aiosell/local-reservations` returns correct data
- [ ] Response includes `rooms[].order_data.order_details[]` with add-ons
- [ ] `pmsService.js` calculates transferredFnb correctly
- [ ] `pmsService.js` calculates roomOrdersTotal with add-ons + GST
- [ ] POST `/api/v1/order/singleOrderNew` returns folio data
- [ ] `folioTransform.js` maps roomOrders with add-ons + GST

### Frontend Flow (Playwright)
- [ ] Navigate to In-House → check balance = ₹1,947
- [ ] Click guest → Folio → check 3 tiles visible
- [ ] Check Room Orders tile = ₹256
- [ ] Check Total Balance Due = ₹1,947
- [ ] Click Checkout → check Lodging GST line visible
- [ ] Check GRAND TOTAL = ₹1,947

---

## §7 — Manual Verification Checklist

### Screenshots Required
- [ ] In-House Guests page: Balance column showing ₹1,947
- [ ] Folio page: 3-tile grid (Room + F&B + Room Orders)
- [ ] Folio page: Room Orders section with expanded GST row
- [ ] Folio page: Balance Breakdown showing Total Balance Due = ₹1,947
- [ ] Checkout drawer: Lodging GST line visible
- [ ] Checkout drawer: GRAND TOTAL = ₹1,947

### Visual Validation
- [ ] All currency values formatted correctly (₹ symbol, 2 decimals)
- [ ] No console errors in browser
- [ ] Page loads without infinite spinners
- [ ] Expand/collapse works for Room Orders rows (SGST/CGST)

---

## §8 — Regression Tests

| # | What to verify | Why | Bug |
|---|---------------|-----|-----|
| R1 | BUG-422/423 Room Balance still includes GST | BATCH 1 fixes must persist | 422/423 |
| R2 | BUG-424 Room Orders section still visible | BATCH 1 fix | 424 |
| R3 | BUG-425 PmsCheckoutDrawer ROOM balance correct | BATCH 1 fix | 425 |
| R4 | Non-GST rooms unaffected | `roomGstApplicable=false` path | 426/427 |
| R5 | Non-room orders checkout unaffected | R5 hotspot guard | 428 |
| R6 | `gst_tax_amount` field (if present) still used | BUG-429 Step 1 | 429 |
| R7 | Inclusive tax calculation still works | BUG-429 Step 2 | 429 |

---

## §9 — Known Limitations

None. All 5 bugs are complete and cumulative.

---

## §10 — Success Criteria

### Must Pass (Critical)
- [ ] TC7: Three-way match (₹1,947 = ₹1,947 = ₹1,947) ✅
- [ ] TC3: Room Orders = ₹256 (not ₹238)
- [ ] TC5: Lodging GST line visible
- [ ] All 10 test cases PASS
- [ ] 7 regression tests PASS

### Nice to Have (Non-blocking)
- [ ] Performance: Page loads < 2s
- [ ] No console warnings (aside from pre-existing)

---

## §11 — Failure Scenarios

### If TC7 fails (Three-way match broken)
**Root cause:** One or more bugs not correctly implemented  
**Action:** 
1. Identify which surface shows wrong value
2. Check FILE_OWNERSHIP.md for which bug affects that surface
3. Revert specific bug's commits
4. Re-test after revert

### If TC3 fails (Room Orders ≠ ₹256)
**Root cause:** BUG-429 or BUG-430 issue  
**Check:**
1. Are add-ons included in amount? (BUG-430)
2. Is GST calculated correctly? (BUG-429)
3. Check browser console for JS errors

### If TC5 fails (Lodging GST line missing)
**Root cause:** BUG-428 conditional guard failing  
**Check:**
1. `roomInfo.gstTax > 0` → true?
2. `restaurant?.settings?.roomGstApplicable !== false` → true?
3. R5 regression: Does non-room checkout still work?

---

## §12 — Handover to Owner

**When all tests pass:**
- [ ] Update registry: All 5 bugs → GATE_5B_QA_PASS
- [ ] Create consolidated QA report with screenshots
- [ ] Mark bugs ready for Gate 6 (Owner Smoke)

**Owner Acceptance:**
- [ ] Verify "test gst" guest shows ₹1,947 on all pages
- [ ] Spot-check 2-3 other guests for correctness
- [ ] Approve for production

---

**Status:** QA Handover complete  
**Awaiting:** QA execution GO signal  
**Individual Handovers:** 
- BUG-426: `handover/QA_HANDOVER_BUG426_2026_09_16.md`
- BUG-427: `handover/QA_HANDOVER_BUG427_2026_09_16.md`
- BUG-428: `handover/QA_HANDOVER_BUG428_2026_09_16.md`
- BUG-429: `handover/QA_HANDOVER_BUG429_2026_09_16.md`
- BUG-430: `handover/QA_HANDOVER_BUG430_2026_09_16.md`
