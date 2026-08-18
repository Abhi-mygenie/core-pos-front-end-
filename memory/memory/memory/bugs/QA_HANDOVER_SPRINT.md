# QA Validation Handover — Sprint (Apr-2026)

## QA Agent Run Summary

### Bugs Validated: 5 (BUG-028, 029, 032, 034, 035)
### Final Outcomes

| Bug | Title | QA Result | Sheet Status |
|-----|-------|-----------|--------------|
| BUG-028 | Service Charge Default OFF | ❌ Failed | qa_failed |
| BUG-029 | Prepaid Settle Returns to Clean State | ❌ Failed | qa_failed |
| BUG-032 | Restaurant Order ID in Collect Payment | ✅ Passed | qa_passed |
| BUG-034 | Duplicate Notification Sound | ✅ Passed | qa_passed |
| BUG-035 | Dynamic Price Feature (₹1 items) | ✅ Passed | qa_passed |

---

## Bugs Needing Re-Implementation

### BUG-028 — qa_failed
**File:** `CollectPaymentPanel.jsx` line ~1150
**Fix:** Change `{serviceChargePercentage > 0 &&` → `{scApplicable && serviceChargePercentage > 0 &&`
**Why:** SC toggle in Adjustments panel shows for takeaway/delivery (missing scApplicable guard). Cashier can accidentally enable SC → inflated total stored on backend → shows on order card.

### BUG-029 — qa_failed
**File:** `DashboardPage.jsx` handleMarkServed (~line 1258)
**Fix:** After `await completePrepaidOrder(...)` in the prepaid branch, add `handlePrepaidSettleSuccess(tableEntry.orderId)` + add it to useCallback deps.
**Why:** Serve button on prepaid order correctly calls paid-prepaid-order endpoint (correct), order cleared from context via socket (correct), but DashboardPage local OrderEntry selection state is NOT cleared → stale edit screen stays open.

---

## QA Report Files
- /app/memory/bugs/BUG_QA_REPORT_028.md — qa_failed
- /app/memory/bugs/BUG_QA_REPORT_029.md — qa_failed
- /app/memory/bugs/BUG_QA_REPORT_032.md — qa_passed
- /app/memory/bugs/BUG_QA_REPORT_034.md — qa_passed
- /app/memory/bugs/BUG_QA_REPORT_035.md — qa_passed

---

## Environment Notes
- Branch: main
- Build: yarn build — clean, no errors
- App: Running at localhost:3000
- SA credentials: /app/memory/.intake-sa.json
- Sheet ID: 1d3KIARjVkvhcyHZc-ZD5QIAOy9ZoRAJfkWbEcy3Ah50 | Tab: Bugs
