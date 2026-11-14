# QA Handover — BATCH 3 (BUG-419 / BUG-420 / BUG-421)

**Date:** 2026-09-16  
**Batch:** PMS UI/UX Fixes  
**Status:** GATE_5A_IMPLEMENTED — Awaiting QA Execution  
**Risk:** LOW to HIGH (Non-financial, UI/display improvements)

---

## §1 — Registry Sync Confirmation

- BUG-419: GATE_5A_IMPLEMENTED ✅
- BUG-420: GATE_5A_IMPLEMENTED ✅
- BUG-421: GATE_5A_IMPLEMENTED ✅

---

## §2 — Why These 3 Bugs Are Tested Together

### Common Theme: CheckInPage & In-House UX

**BUG-419:** CheckInPage Corp/B2B checkbox wrong position (P2, LOW risk)  
**BUG-420:** Walk-in check-in returning guest docs show text only, not images (P1, MEDIUM risk)  
**BUG-421:** In-House page balance shows booking total not outstanding (P1, HIGH risk)

**Why together:**
- BUG-419 & BUG-420 both affect CheckInPage UI
- BUG-421 affects In-House page (related to BUG-426 but different calculation)
- All are independent fixes (no cascading dependencies)
- Can test in single session (CheckIn flow → In-House view)

---

## §3 — Files Changed

| File | Bug | Change Summary |
|------|-----|---------------|
| `pages/pms/CheckInPage.jsx` | BUG-419 | Corp/B2B checkbox repositioned (moved from X to Y) |
| `pages/pms/CheckInPage.jsx` | BUG-420 | Returning guest doc display fixed (show images, not text) |
| `api/services/pmsService.js` | BUG-421 | In-House balance calculation: outstanding amount (not booking total) |

**Note:** Implementation plans exist for all 3, but code implementation status needs verification.

---

## §4 — Test Data

### For BUG-419 & BUG-420 (CheckInPage)
**Accounts:** Any property with check-in capability  
**Test scenarios:**
1. New guest walk-in check-in
2. Returning guest walk-in (guest exists in CRM with docs)
3. Corp/B2B booking check-in

### For BUG-421 (In-House Balance)
**Test guest:** Any checked-in guest with mid-stay payments or outstanding balance  
**Example:**
- Booking total: ₹5,000
- Advance paid: ₹2,000
- Mid-stay received: ₹1,000
- **Outstanding (expected):** ₹2,000 (not ₹5,000)

---

## §5 — Test Cases

### BUG-419 — Corp/B2B Checkbox Position

#### TC1 — Checkbox Visible in Correct Position
**Steps:**
1. Login to any property account
2. Navigate to PMS → Check-In
3. Select a reservation OR start walk-in check-in
4. Locate Corp/B2B checkbox

**Expected:**
- Checkbox is in the correct position (refer to implementation plan for exact location)
- Label: "Corporate/B2B Booking" or similar
- Checkbox functional (can toggle on/off)

**Before fix:** Checkbox in wrong position (specify old position from plan)

---

### BUG-420 — Returning Guest Document Display

#### TC2 — New Guest (No Existing Docs)
**Steps:**
1. Navigate to PMS → Check-In
2. Start walk-in check-in
3. Enter NEW guest phone number (not in system)
4. Check document section

**Expected:**
- Document upload fields shown (ID type, front/back image)
- No pre-populated data

---

#### TC3 — Returning Guest (Has Docs in CRM)
**Steps:**
1. Navigate to PMS → Check-In
2. Start walk-in check-in
3. Enter phone number of EXISTING guest (with docs in CRM)
4. Check document section after CRM lookup

**Expected:**
- **Guest documents shown as IMAGES** (not text) ✅
- Front image thumbnail visible
- Back image thumbnail visible (if applicable)
- Option to re-upload new docs (if needed)

**Before fix:** Documents shown as text only (e.g., "Aadhaar - Front: abc123.jpg") instead of actual image thumbnails

---

#### TC4 — Returning Guest (No Docs in CRM)
**Steps:**
1. Walk-in check-in with existing guest (no docs uploaded previously)
2. Check document section

**Expected:**
- Empty upload fields (same as new guest)
- No "text only" display issue

---

### BUG-421 — In-House Balance Shows Outstanding (Not Booking Total)

#### TC5 — Guest With Advance Payment Only
**Steps:**
1. Check in a guest: Room ₹1,000, Advance ₹300
2. Navigate to PMS → In-House Guests
3. Check Balance column for this guest

**Expected:**
- Balance: **₹700** (outstanding = booking total - advance)

**Before fix:** ₹1,000 (booking total, ignoring advance)

---

#### TC6 — Guest With Mid-Stay Payments
**Steps:**
1. Check in a guest: Room ₹2,000, Advance ₹500
2. Record mid-stay payment: ₹800
3. Navigate to In-House Guests
4. Check Balance column

**Expected:**
- Balance: **₹700** (outstanding = ₹2,000 - ₹500 - ₹800)

**Before fix:** ₹2,000 (ignoring all payments)

---

#### TC7 — Guest With Full Payment (₹0 Outstanding)
**Steps:**
1. Check in guest: Room ₹1,000, Advance ₹1,000 (fully paid)
2. Navigate to In-House Guests
3. Check Balance column

**Expected:**
- Balance: **₹0** or **"Fully Paid"**

**Before fix:** ₹1,000 (showing booking total despite full payment)

---

#### TC8 — Guest With Additional Charges (F&B Posted)
**Steps:**
1. Check in guest: Room ₹1,000, Advance ₹500
2. Post F&B to room: ₹300
3. Navigate to In-House Guests
4. Check Balance column

**Expected:**
- Balance: **₹800** (room ₹500 + F&B ₹300)
- Formula: (room + F&B + room orders) - (advance + payments)

**Note:** This overlaps with BUG-426 territory. Ensure BUG-421 fix doesn't break BUG-426.

---

## §6 — Automated Testing Checklist

### BUG-419 (Manual Only)
- [ ] Visual verification via screenshot (checkbox position)

### BUG-420 (Manual + Automated)
- [ ] Automated: Check CRM API response includes document URLs
- [ ] Automated: Verify CheckInPage component receives docs
- [ ] Manual: Screenshot showing image thumbnails (not text)

### BUG-421 (Automated + Manual)
- [ ] Automated: API `/api/v2/vendoremployee/aiosell/local-reservations` returns correct balance
- [ ] Automated: `pmsService.js` calculates outstanding correctly
- [ ] Manual: Screenshot of In-House page with correct balance

---

## §7 — Manual Verification Checklist

### Screenshots Required
- [ ] CheckInPage: Corp/B2B checkbox in correct position (BUG-419)
- [ ] CheckInPage: Returning guest docs showing IMAGE thumbnails (BUG-420)
- [ ] In-House Guests: Balance column showing outstanding (not booking total) (BUG-421)

### Visual Validation
- [ ] No layout shifts or broken UI after fixes
- [ ] All text labels readable and positioned correctly
- [ ] Images load without broken icon placeholders

---

## §8 — Regression Tests

| # | What to verify | Why | Bug |
|---|---------------|-----|-----|
| R1 | New guest check-in flow unaffected | BUG-420 changes shouldn't break new guest flow | 420 |
| R2 | CheckInPage other fields still functional | BUG-419 position change shouldn't affect form validation | 419 |
| R3 | BUG-426 In-House balance calculation preserved | BUG-421 fix is additive (shouldn't overwrite BUG-426 transferred F&B logic) | 421 |
| R4 | Document upload still works for new guests | BUG-420 shouldn't break upload functionality | 420 |

---

## §9 — Known Limitations

**BUG-419, 420, 421 are in GATE_3 status (Plan complete, awaiting Gate 4 GO for implementation)**

**Note:** If these bugs are NOT yet implemented at code level, this QA handover serves as a **pre-implementation reference**. QA execution should only proceed AFTER bugs reach GATE_5A_IMPLEMENTED status.

**Current Status Check Required:**
- [ ] Verify BUG-419 code changes exist in CheckInPage.jsx
- [ ] Verify BUG-420 code changes exist in CheckInPage.jsx
- [ ] Verify BUG-421 code changes exist in pmsService.js

**If NOT implemented:** Move BATCH 3 QA to "PENDING IMPLEMENTATION" status.

---

## §10 — Success Criteria

### Must Pass (Critical)
- [ ] TC3: Returning guest docs show images ✅ (BUG-420)
- [ ] TC5-TC7: In-House balance shows outstanding, not booking total ✅ (BUG-421)
- [ ] TC1: Corp/B2B checkbox in correct position ✅ (BUG-419)
- [ ] All 8 test cases PASS
- [ ] 4 regression tests PASS

### Nice to Have
- [ ] No console errors
- [ ] Page load performance unchanged

---

## §11 — Failure Scenarios

### If TC3 fails (Docs still showing as text)
**Root cause:** BUG-420 not correctly implemented or CRM API not returning URLs  
**Action:**
1. Check browser Network tab: Does CRM lookup return `front_image_url`?
2. Check CheckInPage.jsx: Is component rendering `<img>` tags or just text?
3. Revert BUG-420 changes if needed

### If TC5-TC7 fail (Balance shows booking total)
**Root cause:** BUG-421 formula incorrect or API not sending payment data  
**Action:**
1. Check API response: Does it include `advance_payment` and `received_payment`?
2. Check pmsService.js: Is balance calculation using `booking_total - payments`?
3. Verify BUG-426 logic is NOT overwritten

---

## §12 — Handover to Owner

**When all tests pass:**
- [ ] Update registry: All 3 bugs → GATE_5B_QA_PASS
- [ ] Create QA report with screenshots
- [ ] Mark ready for Gate 6 (Owner Smoke)

**Owner Acceptance:**
- [ ] Verify checkbox position looks correct
- [ ] Verify returning guest sees their doc images
- [ ] Verify In-House balances are accurate (outstanding, not booking total)

---

**Status:** QA Handover complete (Pre-implementation reference)  
**Awaiting:** 
1. Verification that BUG-419/420/421 are GATE_5A_IMPLEMENTED
2. If yes → QA execution GO signal
3. If no → Wait for implementation completion

**Implementation Plans:**
- BUG-419: `/app/memory/plans/BUG-419_IMPLEMENTATION_PLAN.md`
- BUG-420: `/app/memory/plans/BUG-420_IMPLEMENTATION_PLAN.md`
- BUG-421: `/app/memory/plans/BUG-421_IMPLEMENTATION_PLAN.md`
