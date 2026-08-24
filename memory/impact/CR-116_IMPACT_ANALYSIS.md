# Impact Analysis — CR-116: B2B Customer GST & Name Capture

**ID:** CR-116
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-28
**Code Reality:** NONE — hardcoded empty strings, zero UI
**Conflict Pre-Check:** Touches `CollectPaymentPanel.jsx` (also touched by BUG-168) and `orderTransform.js` (shared with BUG-270/271). Different sections — no line conflict.
**Risk:** MEDIUM

---

## Data Flow Trace

### Current State
```
CollectPaymentPanel → customer object has: name, phone, id, email
  → NO custGST / custGSTName fields in state
  → settle payload (collectBillExisting): does NOT send custGST/custGSTName
  → print payload (buildBillPrintPayload): 
      L2067: custGSTName: ''  ← HARDCODED EMPTY
      L2068: custGST: ''     ← HARDCODED EMPTY
```

### Required State
```
CollectPaymentPanel → NEW state: custGST, custGSTName
  → NEW UI inputs for GST number + registered name
  → settle payload: add custGST + custGSTName keys
  → print payload: wire from overrides instead of hardcoded ''
```

## Affected Files
1. `CollectPaymentPanel.jsx` — new state + input fields
2. `orderTransform.js` L2067-2068 — wire from overrides
3. Possibly `orderTransform.js` `collectBillExisting` — add to settle payload

## Downstream Consumers
- Print bill (order-temp-store) — shows customer GST info
- Backend settle endpoint — may need GST for B2B invoicing
- CRM system — may link GST-registered businesses

## OWNER QUESTIONS

1. **Where should the custGST / custGSTName input fields appear?**
   - Option A: On the Collect Bill panel (alongside customer name/phone)
   - Option B: In a separate "B2B" section with a toggle
   - Option C: On the customer selection/creation dialog

2. **Should these fields be always visible, or conditional?**
   - Option A: Always visible (empty for B2C orders)
   - Option B: Only visible when a "B2B Invoice" toggle is ON
   - Option C: Only visible for certain order types

3. **Should custGST be validated?** (Indian GST is 15 chars: `22AAAAA0000A1Z5` format.) Or accept any string?

4. **Should these fields also be sent in the `collectBillExisting` settle payload to backend?** Or only in the print payload?

5. **Should custGST/custGSTName be saved per-customer in the CRM?** (So it auto-fills next time the same customer is selected.) Or entered fresh each order?

6. **What is the backend key name?** Is it `cust_gst` and `cust_gst_name`? Or different keys?

---
