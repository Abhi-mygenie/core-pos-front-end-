# Session Handover — 2026-07-31 (BUG-280 + BUG-281 Implementation)

**Session type:** IMPLEMENTATION  
**Date:** 2026-07-31  
**Status:** COMPLETE — awaiting QA

---

## Summary

BUG-280 and BUG-281 implemented in full following Gate 3 plan. All 7 edits applied, 5/5 exit gates passed, Jest tests pass (0 new failures), webpack introduces 0 new warnings.

---

## Items Completed This Session

### BUG-280 — Customer Details Not Sent in Collect Bill Settle API
- **Fix:** `collectBillExisting` in `orderTransform.js` — added `cust_name`, `cust_mobile`, `cust_membership_id` to BILL_PAYMENT payload (E1b)
- **No email change** (OD-BUG280-1)
- **Known limitation:** `CollectBillPanelDrawer.buildCustomer` uses `customerName` not `name` → `cust_name` remains `''` for Hold-tab settle. Out of scope per plan.
- **Status:** IMPLEMENTED — PENDING QA

### BUG-281 — custGST/custGSTName Missing from Auto-Print Paths
- **Scope expanded vs investigation:** 6 sites fixed (investigation found 4; planning found 2 more: M_NEW-A L1496 QSR existing-order, M_NEW-B L1891 autoPrintNewOrderIfEnabled)
- **Edits:** E1a (destructuring), E1b (settlement payload), E2 (M1), E3 (M2), E4 (M_NEW-A), E5 (M_NEW-B), E6 (M3)
- **Manual Print Bill unchanged** — already correct via CR-116 (CPP L1166-1167)
- **Status:** IMPLEMENTED — PENDING QA

---

## Files Changed

| File | Edits | Lines added |
|------|-------|-------------|
| `frontend/src/api/transforms/orderTransform.js` | E1a, E1b | +12 |
| `frontend/src/components/order-entry/OrderEntry.jsx` | E2, E3, E4, E5, E6 | +10 |

Total: 22 lines added, 0 lines deleted/modified.

---

## Exit Gate Results

| Gate | Result |
|------|--------|
| 1. Registry sync | PASS |
| 2. BUG_TRACKER.md updated | PASS |
| 3. FILE_OWNERSHIP.md updated | PASS |
| 4. Code markers present | PASS |
| 5. Compile (0 new warnings) | PASS |

---

## Pre-Existing Test Status

- `qa_subtotal_delivery_validation.test.js`: 2 failures — confirmed pre-existing (same failures before and after edits via git stash test)
- All other orderTransform tests: 67/67 PASS
- cr029.roundUp: PASS
- orderTransformAddonQty, orderTransform.roomInfo: PASS

---

## Artifacts Created/Updated

| Artifact | Path |
|---------|------|
| Impact Analysis | `/app/memory/impact/BUG-280_BUG-281_IMPACT_ANALYSIS.md` |
| Implementation Plan | `/app/memory/plans/BUG-280_BUG-281_IMPLEMENTATION_PLAN.md` |
| QA Handover | `/app/memory/handover/QA_HANDOVER_BUG280_BUG281_20260731.md` |
| BUG_TRACKER.md | Updated — both items at Gate 5 IMPLEMENTED |
| registry.json | Updated — both items gate=5 |
| FILE_OWNERSHIP.md | Entry added 2026-07-31 |

---

## Next Steps

1. **QA role** — execute test cases in `QA_HANDOVER_BUG280_BUG281_20260731.md`
   - T1/T2/T3: BUG-280 customer fields in BILL_PAYMENT payload (console log)
   - T5–T8: BUG-281 GST in auto-print overrides (console log)
   - R1–R5: regression checks
2. If QA passes → owner smoke test (Gate 6)
3. If QA fails → BUG FIX role on specific failures

---

## Open Items (Not This Session)

| ID | Status | Note |
|----|--------|------|
| BUG-271 | IMPLEMENTED (prev session) — not QA-verified | VAT/GST manual-print fix |
| CR-117 | Intake done — Planning pending | Order Report Beta (domain question pending owner) |
| CR-118 | Intake done — Planning pending | Aggregator manual KOT/Bill print |
| CR-119 | Intake done — BLOCKED | Aggregator food mapping (spec missing) |
