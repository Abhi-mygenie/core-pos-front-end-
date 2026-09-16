# Testing Protocol and Results

**Last Updated:** 2026-09-16 — QA PLAN APPROVED (Option B: Parallel Batching)  
**Status:** PLAN DOCUMENTED — Awaiting QA execution GO signal

---

## Current QA Status

### QA Master Plan
**Document:** `/app/memory/test_reports/QA_MASTER_PLAN_BUG419-430.md`  
**Strategy:** Option B — Parallel Batching (3 batches tested simultaneously)  
**Method:** Hybrid (Automated playwright + Manual browser verification)  
**Scope:** 12 bugs (BUG-419 through BUG-430)

---

## Batch Overview

### BATCH 1: PMS Balance Foundation (BUG-422/423/424/425)
**Status:** ✅ READY (Has QA handover)  
**Risk:** CRITICAL (financial)  
**Test count:** 27 tests (23 + 4 regression)  
**Handover:** `/app/memory/handover/QA_HANDOVER_BATCHA_BUG422_423_424_425_2026_09_16.md`

**Bugs:**
- BUG-422: Old modal balance_payment missing GST
- BUG-423: Folio Room Balance excludes GST
- BUG-424: Folio Room Orders section missing
- BUG-425: PmsCheckoutDrawer ROOM balance excludes GST

---

### BATCH 2: PMS Balance Finalization (BUG-426/427/428/429/430)
**Status:** ✅ READY (Consolidated handover created)  
**Risk:** CRITICAL (cumulative financial fix)  
**Test count:** ~25 tests  
**Handover:** `/app/memory/handover/QA_HANDOVER_BATCH2_BUG426-430_2026_09_16.md`

**Bugs:**
- BUG-426: In-House balance missing transferred F&B + room orders
- BUG-427: Folio Total Balance Due excludes room orders
- BUG-428: Checkout ROOM breakdown missing Lodging GST line
- BUG-429: Room orders GST under-counted (3-step GST logic)
- BUG-430: Room orders GST excludes add-ons

**Key Validation:** Three-way match — Checkout (₹1,947) = Folio (₹1,947) = In-House (₹1,947)

---

### BATCH 3: PMS UI/UX Fixes (BUG-419/420/421)
**Status:** ⚠️ PENDING IMPLEMENTATION VERIFICATION  
**Risk:** LOW to HIGH (non-financial, UI)  
**Test count:** ~10-15 tests  
**Handover:** `/app/memory/handover/QA_HANDOVER_BATCH3_BUG419-421_2026_09_16.md`

**Bugs:**
- BUG-419: CheckInPage Corp/B2B checkbox wrong position (P2, LOW)
- BUG-420: Walk-in check-in returning guest docs show text only (P1, MEDIUM)
- BUG-421: In-House balance shows booking total not outstanding (P1, HIGH)

**Note:** Registry shows GATE_5A_IMPLEMENTED, but code verification needed before QA execution.

---

## Testing Approach

### Automated Testing (Testing Subagent)
**Use for:**
- API response validation
- Critical calculation flows
- Regression test automation
- Multi-step user flows

**Tools:** Playwright scripts via testing_agent

---

### Manual Testing (Screenshots)
**Use for:**
- Visual layout verification
- UI positioning checks
- Currency formatting validation
- User-facing display accuracy

**Tools:** Screenshot tool + browser inspection

---

## Test Data

### Primary Account
- **URL:** https://preprod.mygenie.online
- **Account:** palmhouse
- **Credentials:** Check `/app/memory/test_credentials.md`
- **Settings:** `roomGstApplicable = true`

### Primary Test Guest
- **Name:** "test gst"
- **Order #:** 000069
- **Expected Balance:** ₹1,947
- **Breakdown:**
  - Room: ₹950
  - Transferred F&B: ₹741
  - Room Orders: ₹256

---

## Execution Plan

### Phase 1: Pre-QA Setup (10 min)
- [ ] Verify frontend/backend services running
- [ ] Confirm test credentials available
- [ ] Access preprod.mygenie.online (palmhouse account)
- [ ] Verify "test gst" guest exists and is in-house

### Phase 2: Parallel Batch Execution (90-120 min)
**Thread 1: BATCH 1**
- Execute 27 test cases
- Document in `/app/test_reports/BATCH1_BUG422-425_QA.json`

**Thread 2: BATCH 2**
- Execute 25 test cases (single guest validates all 5 bugs)
- Document in `/app/test_reports/BATCH2_BUG426-430_QA.json`

**Thread 3: BATCH 3**
- Verify implementation status first
- Execute 10-15 test cases if implemented
- Document in `/app/test_reports/BATCH3_BUG419-421_QA.json`

### Phase 3: Consolidation (30 min)
- [ ] Aggregate all test results
- [ ] Create master QA report
- [ ] Update registry (all bugs → GATE_5B status)
- [ ] Flag failures for immediate fix

### Phase 4: Owner Handover (15 min)
- [ ] Present consolidated report
- [ ] Provide acceptance checklist
- [ ] Await Gate 6 GO

---

## Success Criteria

### Overall
- [ ] 60+ test cases executed
- [ ] 12 bugs validated
- [ ] 0 critical failures
- [ ] All CRITICAL financial bugs accurate

### BATCH 1
- [ ] 27/27 tests PASS
- [ ] Room balance includes GST across all surfaces

### BATCH 2 (CRITICAL)
- [ ] Three-way match: ₹1,947 = ₹1,947 = ₹1,947 ✅
- [ ] Room Orders GST includes add-ons (₹256 not ₹238)
- [ ] 25/25 tests PASS

### BATCH 3
- [ ] Corp/B2B checkbox position correct
- [ ] Returning guest docs show images
- [ ] In-House balance shows outstanding
- [ ] 10-15/10-15 tests PASS

---

## Incorporate User Feedback

**User preferences for testing:**
- ✅ Use BOTH automated (playwright) and manual (screenshots) testing
- ✅ Follow Option B strategy (Parallel Batching)
- ✅ Do NOT start QA execution yet (awaiting GO signal)

**Next Steps:**
1. Owner reviews QA plan
2. Owner gives GO signal
3. Execute QA per approved plan
4. Report results

---

## Documents Created

1. **Master Plan:** `/app/memory/test_reports/QA_MASTER_PLAN_BUG419-430.md`
2. **BATCH 1 Handover:** `/app/memory/handover/QA_HANDOVER_BATCHA_BUG422_423_424_425_2026_09_16.md` (pre-existing)
3. **BATCH 2 Handover:** `/app/memory/handover/QA_HANDOVER_BATCH2_BUG426-430_2026_09_16.md` (NEW)
4. **BATCH 3 Handover:** `/app/memory/handover/QA_HANDOVER_BATCH3_BUG419-421_2026_09_16.md` (NEW)

---

**Status:** QA PLAN APPROVED AND DOCUMENTED  
**Awaiting:** Owner GO signal to execute testing
