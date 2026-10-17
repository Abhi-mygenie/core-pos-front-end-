# HANDOVER TO NEXT AGENT — QA Execution for BUG-419 through BUG-430

**Handover Date:** 2026-09-16  
**From:** Implementation + QA Planning Agent (Fork Session)  
**To:** QA Execution Agent  
**Session Status:** CLOSED — Ready for QA execution  
**Critical:** This handover covers 12 CRITICAL financial bugs affecting PMS balance calculations

---

## 🎯 Mission for Next Agent

**Your role:** Read this QA plan, present it to the owner, and execute comprehensive testing for 12 PMS bugs.

**What you need to do:**
1. **Read and understand** the complete QA plan (this document + referenced docs)
2. **Present the plan** to owner with clear explanation of approach and timeline
3. **Execute testing** using hybrid method (automated + manual)
4. **Report results** with pass/fail status for each bug
5. **Handle failures** by documenting issues and coordinating fixes

**Expected timeline:** 2-3 hours for complete QA execution

---

## 📊 Current State Summary

### What Has Been Done

**Investigation & Bug Discovery (BUG-429 → BUG-430):**
- Investigated why guest balance showed ₹1,930.40 instead of ₹1,947
- Root cause: Room orders GST missing add-ons calculation
- Registered BUG-430 (correction of BUG-429 implementation gap)

**Implementation (BUG-430):**
- Added add-ons calculation to `folioTransform.js` and `pmsService.js`
- Pattern copied from `orderTransform.js` (checkout reference)
- Code complete, webpack compiled successfully

**QA Planning (BUG-419 through BUG-430):**
- Created comprehensive QA Master Plan
- Organized 12 bugs into 3 logical batches
- Created consolidated QA handovers for each batch
- Documented testing strategy (Option B: Parallel Batching)
- Updated all control documents

**Status:** All 12 bugs are GATE_5A_IMPLEMENTED (code complete), ready for QA

---

## 🚨 Why This QA Plan Is CRITICAL

### 1. Financial Accuracy at Stake

**These bugs affect real money calculations:**
- Guest bills showing wrong amounts (₹1,930.40 vs ₹1,947)
- GST calculations incorrect across multiple surfaces
- Room charges, F&B totals, and final invoices all impacted

**Risk if bugs are not properly tested:**
- Under-billing: Hotel loses revenue (₹16-18 per guest with add-ons)
- Over-billing: Customer disputes, refunds, reputation damage
- Tax compliance: Incorrect GST reporting to authorities
- Accounting errors: Financial reports don't match actual transactions

### 2. Cascading Dependencies

**BATCH 2 (BUG-426/427/428/429/430) is particularly critical:**
- All 5 bugs fix the SAME calculation from different angles
- BUG-430 depends on BUG-429
- BUG-429 depends on BUG-427 and BUG-426
- If ONE fails, the entire chain breaks

**Test strategy:** Single guest ("test gst") validates all 5 bugs simultaneously

### 3. Three-Way Consistency Requirement

**The same guest balance MUST show identical amounts on:**
1. Checkout page (final bill)
2. Folio page (guest statement)
3. In-House Guests page (dashboard)

**Before fixes:** ₹1,947 ≠ ₹1,929 ≠ ₹1,930.40 (inconsistent)  
**After fixes:** ₹1,947 = ₹1,947 = ₹1,947 (required)

**If this fails:** Staff cannot trust ANY balance shown, operational chaos

### 4. Production Impact

**This POS/PMS system is used by:**
- Hotels for check-in, billing, checkout
- Staff for room service orders
- Accounting teams for financial reports
- Guests for their bills and receipts

**Any calculation error affects:**
- Daily operations
- Financial reconciliation
- Customer satisfaction
- Legal compliance (GST)

---

## 📦 Three Testing Batches Explained

### BATCH 1: Foundation (BUG-422/423/424/425)
**What it fixes:** Basic room balance GST inclusion across all surfaces  
**Why important:** Without this foundation, all subsequent fixes fail  
**Test coverage:** 27 tests  
**Status:** Has complete QA handover (pre-existing)  
**Handover:** `/app/memory/handover/QA_HANDOVER_BATCHA_BUG422_423_424_425_2026_09_16.md`

**Key validations:**
- Old modal includes GST in balance_payment
- Folio Room Balance = room + GST - advance
- Room Orders section appears on folio
- PmsCheckoutDrawer shows correct room balance

---

### BATCH 2: Finalization (BUG-426/427/428/429/430) — MOST CRITICAL
**What it fixes:** Complete guest balance with transferred F&B, room orders, and correct GST on add-ons  
**Why critical:** This is the cumulative fix for the ₹1,947 discrepancy  
**Test coverage:** ~25 tests  
**Status:** NEW consolidated handover created  
**Handover:** `/app/memory/handover/QA_HANDOVER_BATCH2_BUG426-430_2026_09_16.md`

**The ₹1,947 Breakdown:**
- Room Balance: ₹950 (including GST)
- Transferred F&B: ₹741 (restaurant orders posted to room)
- Room Orders: ₹256 (food ordered directly to room, including add-ons + GST)
- **Total:** ₹1,947

**Before fixes:**
- Missing transferred F&B (BUG-426)
- Missing room orders from total (BUG-427)
- GST calculated wrong (BUG-429)
- Add-ons excluded from GST (BUG-430)
- Lodging GST line not visible (BUG-428)

**Critical Test Case (TC7):**
```
Checkout GRAND TOTAL:    ₹_______ (fill in)
Folio Total Balance Due: ₹_______ (fill in)
In-House Balance:        ₹_______ (fill in)

MUST ALL BE: ₹1,947
```

**If this fails:** The entire PMS balance system is unreliable

---

### BATCH 3: UI/UX (BUG-419/420/421)
**What it fixes:** CheckInPage and In-House page UI improvements  
**Why important:** User experience and operational efficiency  
**Test coverage:** ~10-15 tests  
**Status:** NEW handover created, but implementation needs verification  
**Handover:** `/app/memory/handover/QA_HANDOVER_BATCH3_BUG419-421_2026_09_16.md`

**Note:** Registry shows GATE_5A_IMPLEMENTED, but code changes should be verified before testing

---

## 📋 Complete Document Map for QA Execution

### Must-Read Documents (Priority Order)

**1. Master Plan (START HERE):**
`/app/memory/test_reports/QA_MASTER_PLAN_BUG419-430.md`
- Complete QA strategy
- Execution plan (4 phases)
- Success criteria for all 12 bugs
- Risk assessment

**2. BATCH 1 Handover:**
`/app/memory/handover/QA_HANDOVER_BATCHA_BUG422_423_424_425_2026_09_16.md`
- 27 test cases (T1-T23 + R1-R4)
- Test data specifications
- Expected outcomes

**3. BATCH 2 Handover (CRITICAL):**
`/app/memory/handover/QA_HANDOVER_BATCH2_BUG426-430_2026_09_16.md`
- 10 main test cases + 7 regression tests
- Three-way match validation (TC7)
- Single guest testing strategy

**4. BATCH 3 Handover:**
`/app/memory/handover/QA_HANDOVER_BATCH3_BUG419-421_2026_09_16.md`
- 8 test cases + 4 regression tests
- UI/UX verification focus

**5. Test Protocol:**
`/app/test_result.md`
- Current QA status
- User preferences documented
- Execution checklist

---

### Reference Documents (As Needed)

**Investigation Reports:**
- `/app/memory/BUG-429_INVESTIGATION_REPORT.md` — Root cause analysis for ₹1,947 discrepancy

**Individual Bug Handovers (BATCH 2):**
- `/app/memory/handover/QA_HANDOVER_BUG426_2026_09_16.md`
- `/app/memory/handover/QA_HANDOVER_BUG427_2026_09_16.md`
- `/app/memory/handover/QA_HANDOVER_BUG428_2026_09_16.md`
- `/app/memory/handover/QA_HANDOVER_BUG429_2026_09_16.md`
- `/app/memory/handover/QA_HANDOVER_BUG430_2026_09_16.md`

**Implementation Plans (If Needed for Context):**
- `/app/memory/plans/BUG-419_IMPLEMENTATION_PLAN.md` through BUG-430

**Code Files Changed:**
- `/app/frontend/src/api/transforms/folioTransform.js` (BUG-427, 429, 430)
- `/app/frontend/src/api/services/pmsService.js` (BUG-426, 429, 430)
- `/app/frontend/src/pages/pms/GuestFolioPage.jsx` (BUG-427)
- `/app/frontend/src/pages/pms/InHouseGuestsPage.jsx` (BUG-426)
- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` (BUG-428)

---

## 🧪 Test Data & Credentials

### Primary Test Account
- **URL:** https://preprod.mygenie.online
- **Account:** palmhouse
- **Credentials:** Check `/app/memory/test_credentials.md` (may be empty, ask owner if needed)
- **Settings:** `roomGstApplicable = true`

### Primary Test Guest
- **Guest Name:** "test gst"
- **Order #:** 000069
- **Status:** Should be in-house
- **Expected Balance:** ₹1,947
- **Breakdown:**
  - Room: ₹950
  - Transferred F&B: ₹741
  - Room Orders: ₹256 (includes add-ons + GST)

### Backup Accounts (If Needed)
- welcomeresort (alternate GST-enabled property)
- kunafamahal (alternate test account)

---

## 🎬 Execution Instructions for Next Agent

### Phase 1: Preparation (10 minutes)

**1.1 Read and Understand:**
```bash
# Read master plan first
cat /app/memory/test_reports/QA_MASTER_PLAN_BUG419-430.md

# Read all three batch handovers
cat /app/memory/handover/QA_HANDOVER_BATCHA_BUG422_423_424_425_2026_09_16.md
cat /app/memory/handover/QA_HANDOVER_BATCH2_BUG426-430_2026_09_16.md
cat /app/memory/handover/QA_HANDOVER_BATCH3_BUG419-421_2026_09_16.md
```

**1.2 Present to Owner:**
Create a summary presentation covering:
- What these 12 bugs fix
- Why testing is critical (financial accuracy)
- Three batch approach
- Expected timeline (2-3 hours)
- Success criteria (especially ₹1,947 three-way match)

**Ask owner:**
- Confirm preprod.mygenie.online access
- Get palmhouse account credentials if not in `/app/memory/test_credentials.md`
- Confirm "test gst" guest exists and is in-house
- Get GO signal to start testing

**1.3 Technical Verification:**
```bash
# Verify services running
tail -n 50 /var/log/supervisor/frontend.out.log
tail -n 50 /var/log/supervisor/backend.out.log

# Check frontend compiles
# (Should already be running with 0 new warnings)
```

---

### Phase 2: Testing Execution (90-120 minutes)

**Strategy:** Parallel batching (all 3 batches can run simultaneously)

#### Thread 1: BATCH 1 Testing

**Approach:** Hybrid (automated + manual)

**Automated tests:**
```
Use testing_agent for:
- T1-T3: Old modal balance_payment validation
- T5-T7: Folio Room Balance calculations
- T17-T21: PmsCheckoutDrawer calculations
```

**Manual tests:**
```
Use screenshots for:
- T4, T8, T10-T16, T22-T23: Visual validations
- R1-R4: Regression checks
```

**Documentation:**
- Record results in `/app/test_reports/BATCH1_BUG422-425_QA.json`
- Take screenshots for key validations

---

#### Thread 2: BATCH 2 Testing (HIGHEST PRIORITY)

**Approach:** Hybrid with focus on three-way match

**Step 1: Navigate to In-House (TC1)**
```
1. Login to preprod.mygenie.online (palmhouse)
2. PMS → In-House Guests
3. Find "test gst" guest
4. Check Balance column
Expected: ₹1,947
```

**Step 2: Check Folio (TC2-TC4)**
```
1. Click "test gst" guest → Folio tab
2. Verify 3-tile grid: Room (₹950) + F&B (₹741) + Room Orders (₹256)
3. Check Room Orders section shows ₹256 (not ₹238)
4. Check Total Balance Due = ₹1,947
```

**Step 3: Check Checkout (TC5-TC6)**
```
1. Click Checkout button
2. Verify Lodging GST line visible
3. Check GRAND TOTAL = ₹1,947
```

**Step 4: CRITICAL — Three-Way Match (TC7)**
```
Compare all three values:
- Checkout GRAND TOTAL: _______
- Folio Total Balance Due: _______
- In-House Balance: _______

MUST ALL BE ₹1,947 ✅

If NOT identical → CRITICAL FAILURE, escalate immediately
```

**Automated validation:**
```
Use testing_agent to:
- Validate API responses
- Confirm calculations in transforms
- Verify add-ons included in GST base
```

**Documentation:**
- Record in `/app/test_reports/BATCH2_BUG426-430_QA.json`
- MUST include screenshot of three-way match

---

#### Thread 3: BATCH 3 Testing

**Pre-check:**
```bash
# Verify implementation status first
grep -n "BUG-419\|BUG-420\|BUG-421" /app/frontend/src/pages/pms/CheckInPage.jsx
grep -n "BUG-421" /app/frontend/src/api/services/pmsService.js
```

**If implemented:**
- Execute TC1-TC8 per BATCH 3 handover
- Focus on UI/visual validation
- Document in `/app/test_reports/BATCH3_BUG419-421_QA.json`

**If NOT implemented:**
- Document "BATCH 3 SKIPPED — Bugs not yet implemented"
- Notify owner

---

### Phase 3: Consolidation (30 minutes)

**3.1 Aggregate Results:**
```bash
# Create master report
cat > /app/memory/test_reports/QA_MASTER_REPORT_BUG419-430_2026_09_16.md << 'EOF'
# QA Execution Report — BUG-419 through BUG-430

## Summary
- Total bugs tested: X
- Tests executed: X
- Tests passed: X
- Tests failed: X

## BATCH 1 Results: PASS/FAIL
## BATCH 2 Results: PASS/FAIL (CRITICAL)
## BATCH 3 Results: PASS/FAIL

## Critical Validations
- Three-way match (₹1,947): PASS/FAIL

## Failures (if any)
[List any failures with details]

## Recommendations
[Next steps based on results]
EOF
```

**3.2 Update Registry:**
```bash
# For each bug, update status
# If PASS → GATE_5B_QA_PASS
# If FAIL → GATE_5B_QA_FAIL
```

**3.3 Update Control Documents:**
- Update BUG_TRACKER.md with QA results
- Update test_result.md with execution summary

---

### Phase 4: Owner Handover (15 minutes)

**Present Results:**
- Show master QA report
- Highlight three-way match result (CRITICAL)
- Present any failures with root cause analysis
- Provide screenshots of key validations

**Acceptance Checklist:**
```
BATCH 1:
[ ] 27/27 tests passed
[ ] Room balance includes GST everywhere

BATCH 2 (CRITICAL):
[ ] Three-way match: ₹1,947 = ₹1,947 = ₹1,947 ✅
[ ] Room Orders = ₹256 (with add-ons)
[ ] 25/25 tests passed

BATCH 3:
[ ] UI fixes verified
[ ] 10-15/10-15 tests passed
```

**Next Steps:**
- If ALL PASS → Ready for Gate 6 (Owner Smoke)
- If ANY FAIL → Document issues, coordinate fixes, re-test

---

## 🚨 Critical Failure Scenarios

### Scenario 1: Three-Way Match Fails

**Example:** Checkout shows ₹1,947, but Folio shows ₹1,929

**Action:**
1. **DO NOT PROCEED** with remaining tests
2. Document exact discrepancy
3. Check which bug is causing the issue:
   - If Folio wrong → BUG-427 or BUG-430
   - If In-House wrong → BUG-426 or BUG-430
4. Use troubleshoot_agent to investigate
5. Report to owner immediately

---

### Scenario 2: Room Orders Still Show ₹238 (Not ₹256)

**Root cause:** BUG-430 (add-ons) not working

**Action:**
1. Check browser console for JS errors
2. Verify add-ons exist in order data
3. Check `folioTransform.js` L115-120: Is `addonPerUnit` calculation present?
4. Use troubleshoot_agent
5. May need code fix and re-test

---

### Scenario 3: Lodging GST Line Missing (BUG-428)

**Action:**
1. Check `roomInfo.gstTax` value (should be > 0)
2. Check `restaurant.settings.roomGstApplicable` (should be true)
3. Verify `CollectPaymentPanel.jsx` L1836-1842
4. If conditional guards failing, investigate why

---

## 📊 Success Criteria Reminder

### Overall Success
- ✅ 60+ tests executed
- ✅ 12 bugs validated
- ✅ 0 CRITICAL failures
- ✅ All financial calculations accurate

### BATCH 2 Success (MOST IMPORTANT)
- ✅ Checkout = Folio = In-House = ₹1,947 (three-way match)
- ✅ Room Orders = ₹256 (includes add-ons + GST)
- ✅ All components visible (Lodging GST line, Room Orders section, 3-tile grid)

---

## 🎁 What You're Testing (Visual Guide)

### The Guest Journey

**1. Guest checks in:**
- Room: ₹1,000 + GST ₹50 = ₹1,050
- Advance paid: ₹100
- Room balance: ₹950

**2. Guest orders food to restaurant, transferred to room:**
- Restaurant orders: ₹741 (already includes GST)
- Transferred to room folio

**3. Guest orders food directly to room:**
- Base items: ₹200
- Add-ons (extra cheese, etc.): ₹20
- GST on (₹200 + ₹20): ₹36
- Room Orders total: ₹256

**4. Guest checks out:**
- Total bill: ₹950 + ₹741 + ₹256 = **₹1,947**

**What you're verifying:**
- All three pages (Checkout, Folio, In-House) show this exact amount
- All components are calculated correctly
- All line items are visible

---

## 📝 Key Terminology

**Room Balance:** Room charge + GST - advance - payments received  
**Transferred F&B:** Restaurant orders posted to guest's room folio  
**Room Orders:** Food ordered directly to room (not from restaurant)  
**Add-ons:** Extra items on food orders (extra cheese, make it spicy, etc.)  
**GST:** Goods and Services Tax (India) — must be calculated on base + add-ons  
**Three-way match:** Same balance shown on Checkout, Folio, and In-House pages

---

## 🔧 Tools and Commands

### Testing Subagent
```bash
# Call testing agent for automated tests
testing_agent({
  "task": "Test BATCH 2 BUG-426 through BUG-430 for guest 'test gst'..."
})
```

### Screenshot Tool
```bash
# Take screenshot for manual verification
mcp_screenshot_tool({
  "page_url": "http://localhost:3000",
  "script": "..."
})
```

### Troubleshoot Agent (If Stuck)
```bash
# Use after 2 failed attempts
troubleshoot_agent({
  "task": "ISSUE: Three-way match failing..."
})
```

---

## 💡 Tips for Success

**1. Start with BATCH 2 (if time-constrained):**
- It's the most critical
- Single guest validates 5 bugs
- Three-way match is make-or-break

**2. Use testing subagent for complex flows:**
- API validations
- Multi-step user journeys
- Regression tests

**3. Use screenshots for visual checks:**
- Currency formatting
- UI layout
- Line item visibility

**4. Don't skip regression tests:**
- R-tests verify previous bugs still work
- Critical for BATCH 1 + BATCH 2 interaction

**5. If stuck, call troubleshoot_agent:**
- After 2 failed attempts at anything
- For root cause analysis
- For debugging assistance

---

## 📞 Owner Communication Template

### When Presenting Plan:
```
"I've reviewed the QA plan for 12 PMS bugs (BUG-419 through BUG-430). 

These bugs fix a critical issue where guest balances were showing 
different amounts on different pages (₹1,947 vs ₹1,930.40).

The testing is organized into 3 batches:
- BATCH 1: Foundation fixes (27 tests)
- BATCH 2: Final calculation fix (25 tests) — MOST CRITICAL
- BATCH 3: UI improvements (10-15 tests)

I'll use both automated testing (playwright) and manual verification 
(screenshots) to ensure complete coverage.

The key validation is checking that Checkout, Folio, and In-House 
all show ₹1,947 for the 'test gst' guest.

Estimated time: 2-3 hours.

Ready to proceed?"
```

### When Reporting Results:
```
"QA execution complete for BUG-419 through BUG-430.

BATCH 1: X/27 tests passed
BATCH 2: X/25 tests passed (Three-way match: PASS/FAIL)
BATCH 3: X/15 tests passed

Critical validation:
- Checkout: ₹______
- Folio: ₹______
- In-House: ₹______
[All three MUST be ₹1,947]

[If failures] Issues found:
1. [List issues]

[If pass] All bugs validated successfully. Ready for Owner Smoke testing."
```

---

## 🎯 Your Mission (Summary)

1. **Read** this handover + all referenced QA documents
2. **Understand** why these bugs are critical (financial accuracy)
3. **Present** the plan to owner clearly
4. **Execute** testing using hybrid approach (automated + manual)
5. **Validate** the three-way match (₹1,947 = ₹1,947 = ₹1,947)
6. **Report** results with clear pass/fail status
7. **Coordinate** fixes if failures occur

**Success = All surfaces show ₹1,947 for "test gst" guest**

---

## 📚 Final Checklist Before You Start

- [ ] Read QA Master Plan
- [ ] Read all 3 batch handovers
- [ ] Understand three-way match requirement
- [ ] Know where "test gst" guest is (palmhouse account)
- [ ] Have credentials ready
- [ ] Verify services are running
- [ ] Present plan to owner
- [ ] Get GO signal
- [ ] Execute testing
- [ ] Report results

---

**Handover Status:** COMPLETE  
**Next Agent Action:** Present QA plan → Execute testing → Report results  
**Critical Success Factor:** Three-way match (₹1,947 = ₹1,947 = ₹1,947)  
**Expected Outcome:** All 12 bugs validated and ready for production

**Good luck! These fixes will ensure accurate financial calculations for the entire PMS system.**
