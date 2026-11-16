# BUG-678: Service Charge Included in API Payload Despite Being Removed from UI (Prepaid Orders)

**ID:** BUG-678
**Type:** BUG
**Area:** Payments / Coupons / Credit
**Priority:** P0
**Risk:** CRITICAL (money — order_amount ≠ amount collected)
**Severity:** P0 — CRITICAL (financial discrepancy)
**Client:** ALL (any restaurant with autoServiceCharge=Yes)
**Assignee:** Abhishek (FE code error, not backend-blocked)
**Routing reason:** FE code error in OrderEntry.jsx, not blocked at backend
**Sprint:** —
**Created:** 2026-11-16

---

## Symptom
When creating a prepaid order, cashier removes service charge via toggle in UI. UI correctly shows ₹250. But API payload sends `service_tax: 23.81`, `service_gst_tax_amount: 1.19`, `order_amount: 275`. Backend records ₹275. Cash collected = ₹250. Books don't match.

## Classification
- **Bug** — existing functionality broken (BUG-662 unintended side-effect)
- **Source:** OWNER-REPORTED
- **Confidence:** CONFIRMED (code-traced to exact lines)

## Root Cause (from investigation INV-SC-PREPAID-2026-11-16)
**CODE_ERROR at `OrderEntry.jsx:1708-1709` and `2492-2493`.**

```javascript
const scApplicable = (orderType === 'dineIn' || ...)
  && (!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0);
```

When `autoServiceCharge=true`: the `||` short-circuits — `scApplicable` is ALWAYS true regardless of cashier's toggle. The toggle-OFF state (`paymentData.serviceCharge = 0`) is never evaluated. `calcOrderTotals` receives full SC percentage → computes SC + SC GST into `order_amount`.

**Introduced by:** BUG-662 fix (intended to allow manual SC ON when auto=No; unintended: prevents manual SC OFF when auto=Yes).

## Evidence
- Code flow trace: `/app/memory/evidence/INV-SC-PREPAID-2026-11-16/code_flow_trace.md`
- Full investigation: `/app/memory/investigations/INV-SC-PREPAID-2026-11-16.md`
- Reported payload: RID 675, Table 6087, order_amount=₹275, actual collected=₹250

## Blast Radius
- 1 file (OrderEntry.jsx), 2 locations (L1708-1709, L2492-2493)
- Affects: ALL restaurants with `autoServiceCharge=Yes` + prepaid dine-in/walk-in/room orders
- `collectBillExisting` path is NOT affected (reads ₹ amount directly)
- `placeOrder` and `updateOrder` paths are NOT affected (no payment toggle exists)

## Proposed Fix
Remove `!!restaurant?.autoServiceCharge ||` from both locations. Trust `paymentData.serviceCharge > 0` alone.

**Location 1:** OrderEntry.jsx:1708-1709 (QSR prepaid)
**Location 2:** OrderEntry.jsx:2492-2493 (Scenario 2 prepaid)

2 lines changed, 1 file. **But OrderEntry is R5 hotspot + financial logic = full Planning gate required.**

## Open Questions
None — fix is straightforward, investigation complete.

## Duplicate Check
- **BUG-662:** RELATED — this is a regression introduced by BUG-662's fix. BUG-662 itself is CLOSED/IMPLEMENTED.
- **Verdict:** DISTINCT — new bug caused by BUG-662 side-effect.
