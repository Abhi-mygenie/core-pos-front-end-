# Impact Analysis — BUG-272: Partial Payment Breakdown Missing in Order Report

**ID:** BUG-272
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-28
**Code Reality:** NONE — `partial_payments` never parsed
**Conflict Pre-Check:** No other open items touch `reportTransform.js`. Clean.
**Risk:** LOW

---

## Data Flow Trace

### API Response (from owner screenshot)
```json
{
  "orders_table": { "payment_method": "partial", ... },
  "partial_payments": [
    { "id": 15258, "payment_mode": "cash", "amount": "30.00", "payment_status": "paid" },
    { "id": 15259, "payment_mode": "upi", "amount": "33.00", "payment_status": "paid" }
  ]
}
```

### Current Transform (`reportTransform.js:837-1100`)
```
orderLogsReportRow(orderWrapper):
  const api = orderWrapper.orders_table   ← reads orders_table
  paymentMethod: api.payment_method       ← "partial" — correct label
  
  ❌ orderWrapper.partial_payments is NEVER read
  ❌ No cashAmount / upiAmount / cardAmount fields in output
```

### OrderLedgerMockup Display
```
L169: { key: 'partialPayment', label: 'Partial Payment', group: 'Money Split' }
L128: 'cashAmount','cardAmount','upiAmount' — column keys exist
L443: included in visible columns list
BUT — data fields are never populated in the transform → all show 0 or empty
```

## Affected Files
1. `reportTransform.js` `orderLogsReportRow()` — parse `orderWrapper.partial_payments` → populate `cashAmount`, `upiAmount`, `cardAmount`, `partialPayment` (boolean/string)
2. `OrderLedgerMockup.jsx` — columns already exist, just need data

## Downstream Consumers
- Order Ledger report display
- Excel/PDF export (if columns are included)
- Settlement reconciliation

## OWNER QUESTIONS

1. **Which report pages should show the partial payment breakdown?**
   - Order Ledger only? (columns already exist)
   - Daily Report also?
   - Settlement Report?

2. **How should the breakdown be displayed?**
   - Option A: Separate columns (Cash: ₹30, UPI: ₹33) — Order Ledger already has `cashAmount`, `upiAmount`, `cardAmount` columns
   - Option B: Single "Partial Payment" column showing "Cash ₹30 + UPI ₹33"
   - Option C: Both

3. **The `partial_payments` array — does it exist on ALL order-logs-report responses, or only when `payment_method === 'partial'`?** (Need to know if we should check for its existence defensively.)

4. **Are there other payment modes besides cash/card/upi in partial payments?** (e.g., wallet, loyalty, tab/credit, paylater)

---
