# QA Master Plan — BUG-419 through BUG-430

**Date:** 2026-09-16  
**QA Role:** Adopted  
**Strategy:** Option B — Parallel Batching (3 batches tested simultaneously)  
**Method:** Hybrid (Automated playwright + Manual browser verification)  
**Status:** PLAN APPROVED — Awaiting execution GO

---

## Overview

### Scope
- **Total bugs:** 12 (BUG-419 through BUG-430)
- **All bugs status:** GATE_5A_IMPLEMENTED (code complete)
- **Test batches:** 3 (logical grouping by feature area)
- **Estimated duration:** 2-3 hours (parallel execution)

### Testing Approach
- **Automated:** Testing subagent (playwright) for critical flows
- **Manual:** Browser verification with screenshots for visual validation
- **Combined:** Use both methods for high-risk CRITICAL bugs

---

## Batch Structure

### BATCH 1: PMS Balance Foundation (BUG-422/423/424/425)
**Status:** READY (Has QA handover: `QA_HANDOVER_BATCHA_BUG422_423_424_425_2026_09_16.md`)  
**Focus:** Room balance GST inclusion across all surfaces  
**Risk:** CRITICAL (financial calculations)  
**Files:** RoomCheckInModal.jsx, GuestFolioPage.jsx, folioTransform.js, PmsCheckoutDrawer.jsx  
**Test count:** 23 test cases (T1-T23) + 4 regression tests (R1-R4)  
**Test data:** Various room rates (₹500, ₹1,000) with/without GST, advances, mid-stay payments

**Bugs:**
- BUG-422: Old modal balance_payment missing GST
- BUG-423: Folio Room Balance excludes GST
- BUG-424: Folio Room Orders section missing
- BUG-425: PmsCheckoutDrawer ROOM balance excludes GST

---

### BATCH 2: PMS Balance Finalization (BUG-426/427/428/429/430)
**Status:** READY (Individual handovers exist for 426/427/428/429/430)  
**Focus:** Complete guest balance calculation (cumulative fix)  
**Risk:** CRITICAL (financial — all 5 bugs affect same calculation)  
**Files:** pmsService.js, folioTransform.js, GuestFolioPage.jsx, InHouseGuestsPage.jsx, CollectPaymentPanel.jsx  
**Test count:** ~25 test cases (combined suite)  
**Test data:** "test gst" guest (order #000069) — single guest validates all 5 bugs

**Bugs:**
- BUG-426: In-House balance missing transferred F&B + room orders
- BUG-427: Folio Total Balance Due excludes room orders
- BUG-428: Checkout ROOM breakdown missing Lodging GST line
- BUG-429: Room orders GST under-counted (3-step GST logic)
- BUG-430: Room orders GST excludes add-ons

**Key Validation:** Three-way match — Checkout (₹1,947) = Folio (₹1,947) = In-House (₹1,947)

---

### BATCH 3: PMS UI/UX Fixes (BUG-419/420/421)
**Status:** NEEDS QA HANDOVER (Plan exists, handover to be created)  
**Focus:** CheckInPage and In-House page UI improvements  
**Risk:** LOW to HIGH (non-financial, UI/display)  
**Files:** CheckInPage.jsx, pmsService.js  
**Test count:** ~10-15 test cases  
**Test data:** Various check-in scenarios (walk-in, returning guest, corp/B2B)

**Bugs:**
- BUG-419: CheckInPage Corp/B2B checkbox wrong position (P2, LOW)
- BUG-420: Walk-in check-in returning guest docs show text only, not images (P1, MEDIUM)
- BUG-421: In-House page balance column shows booking total not outstanding (P1, HIGH)

---

## Testing Strategy Per Batch

### BATCH 1 — Hybrid (Automated + Manual)
**Automated (Testing subagent):**
- T1-T3: Old modal balance_payment network payload validation
- T5-T7: Folio Room Balance calculations
- T17-T21: PmsCheckoutDrawer ROOM balance calculations

**Manual (Screenshots):**
- T4, T8, T10-T16, T22-T23: Visual verification of displayed values
- R1-R4: Regression checks

**Expected outcome:** 27/27 PASS

---

### BATCH 2 — Hybrid (Automated + Manual)
**Automated (Testing subagent):**
- API response validation for "test gst" guest
- Three-way balance calculation verification
- Add-ons GST calculation flow (BUG-430)
- Room orders aggregation logic (BUG-426/427)

**Manual (Screenshots):**
- Folio page: Room Orders tile shows ₹256 (not ₹238)
- Folio page: Total Balance Due = ₹1,947 (not ₹1,929)
- In-House page: Balance column = ₹1,947 (not ₹1,930.40)
- Checkout page: Lodging GST line visible (BUG-428)
- Checkout page: GRAND TOTAL = ₹1,947

**Expected outcome:** All surfaces show ₹1,947 ✅

---

### BATCH 3 — Manual (Screenshots primarily)
**Manual verification:**
- BUG-419: Corp/B2B checkbox position correct
- BUG-420: Returning guest docs show images (not text only)
- BUG-421: In-House balance shows outstanding (not booking total)

**Automated (if needed):**
- BUG-421: API response validation for balance calculation

**Expected outcome:** UI fixes visible and functional

---

## Execution Plan

### Phase 1: Pre-QA Setup (10 min)
1. Verify frontend/backend services running
2. Confirm test credentials available (`/app/memory/test_credentials.md`)
3. Identify test accounts:
   - palmhouse account (preprod.mygenie.online) for "test gst" guest
   - Any account with room GST applicable setting
4. Update `/app/test_result.md` with QA plan

### Phase 2: Parallel Batch Execution (90-120 min)
**Thread 1: BATCH 1 (BUG-422/423/424/425)**
- Execute 27 test cases via testing subagent + manual verification
- Document results in `/app/test_reports/BATCH1_BUG422-425_QA.json`

**Thread 2: BATCH 2 (BUG-426/427/428/429/430)**
- Execute combined test suite (single "test gst" guest validates all 5)
- Document results in `/app/test_reports/BATCH2_BUG426-430_QA.json`

**Thread 3: BATCH 3 (BUG-419/420/421)**
- Execute UI verification tests
- Document results in `/app/test_reports/BATCH3_BUG419-421_QA.json`

### Phase 3: Consolidation (30 min)
1. Aggregate all test results
2. Create master QA report: `/app/memory/test_reports/QA_MASTER_REPORT_BUG419-430_2026_09_16.md`
3. Update registry: All bugs → GATE_5B_QA_PASS or GATE_5B_QA_FAIL
4. Update BUG_TRACKER.md with QA status
5. Flag any failures for immediate fix

### Phase 4: Owner Handover (15 min)
1. Present consolidated report to owner
2. Provide acceptance checklist (all bugs)
3. Await Gate 6 GO for Owner Smoke Testing

---

## Success Criteria

### BATCH 1
- [ ] All 23 test cases PASS
- [ ] 4 regression tests PASS
- [ ] Room balance includes GST across all surfaces

### BATCH 2
- [ ] Three-way match: Checkout = Folio = In-House = ₹1,947
- [ ] Room Orders GST includes add-ons (₹256 not ₹238)
- [ ] Lodging GST line visible on checkout
- [ ] All 25 test cases PASS

### BATCH 3
- [ ] Corp/B2B checkbox position correct
- [ ] Returning guest docs show images
- [ ] In-House balance shows outstanding amount
- [ ] All 10-15 test cases PASS

### Overall
- [ ] 60+ test cases executed
- [ ] 12 bugs validated
- [ ] 0 critical failures
- [ ] All CRITICAL financial bugs verified accurate

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| BATCH 2 cascading failure (one bug breaks others) | MEDIUM | HIGH | Test in sequence within batch: 426→427→429→430→428 |
| Test data unavailable ("test gst" guest missing) | LOW | HIGH | Use any guest with room orders + add-ons |
| Frontend service crashes during testing | LOW | MEDIUM | Restart supervisor, retry failed tests |
| Playwright script timeout on slow API | MEDIUM | LOW | Increase timeout to 15s per API call |
| Manual verification missed edge case | MEDIUM | MEDIUM | Use testing subagent for critical paths |

---

## Rollback Plan

**If critical failure found in QA:**
1. Document exact failure scenario
2. Revert specific bug's commits (per FILE_OWNERSHIP.md)
3. Re-run subset of tests to confirm revert
4. Bug returns to GATE_5A_IMPLEMENTED → Gate 4 (fix)

---

## Deliverables

### Per Batch:
1. Test execution report (JSON format in `/app/test_reports/`)
2. Screenshots (stored in `/app/memory/evidence/QA_BUG<range>/`)
3. Pass/Fail summary with failure details

### Master Report:
1. Consolidated QA report (Markdown)
2. Owner acceptance checklist
3. Registry updates (all bugs → GATE_5B status)
4. Known issues register (if any failures)

---

## Appendix: Test Account Details

**Primary Test Account:**
- Base URL: https://preprod.mygenie.online
- Account: palmhouse
- Credentials: (Check `/app/memory/test_credentials.md`)
- Test guest: "test gst" (order #000069)
- Settings: `roomGstApplicable = true`

**Backup Accounts:**
- welcomeresort (if palmhouse unavailable)
- kunafamahal (alternate GST-enabled account)

---

**Status:** QA Plan approved and documented  
**Next:** Await execution GO signal from owner  
**Estimated completion:** 2-3 hours after GO signal
