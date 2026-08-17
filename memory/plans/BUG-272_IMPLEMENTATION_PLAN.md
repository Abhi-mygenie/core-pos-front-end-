# Implementation Plan — BUG-272 (Partial Payment Breakdown in Order Report)

**ID:** BUG-272
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-29
**Execution Phase:** 1 (Independent)
**Risk:** LOW
**Files:** 1 | **Lines changed:** ~15

---

## Step 0 — Starting Code State

**File:** `src/api/transforms/reportTransform.js`
**`orderLogsReportRow()` at L838:** reads `orderWrapper.orders_table` but never reads `orderWrapper.partial_payments`.
**L688:** `paymentMethod: api.payment_method || 'cash'` — correct label but no leg breakdown.
**OrderLedgerMockup.jsx L128,169:** Column keys `cashAmount`, `cardAmount`, `upiAmount`, `partialPayment` exist but never populated.

---

## Edits

### Edit 1 — Parse partial_payments array in orderLogsReportRow
**File:** `src/api/transforms/reportTransform.js`
**In `orderLogsReportRow()` after the `api` extraction (around L838-840), add:**
```js
  // BUG-272: Parse partial payment legs
  const partialPayments = orderWrapper.partial_payments || [];
  const partialMap = {};
  partialPayments.forEach(p => {
    const mode = (p.payment_mode || '').toLowerCase();
    partialMap[mode] = (partialMap[mode] || 0) + parseFloat(p.amount || 0);
  });
```

### Edit 2 — Populate cashAmount/cardAmount/upiAmount fields
**File:** `src/api/transforms/reportTransform.js`
**In the return object of `orderLogsReportRow()`, add/update these fields:**
```js
    cashAmount: partialMap.cash || 0,
    cardAmount: partialMap.card || 0,
    upiAmount: partialMap.upi || 0,
    partialPayment: partialPayments.length > 1
      ? partialPayments.map(p => `${p.payment_mode}: ${p.amount}`).join(' + ')
      : '',
```

---

## Verification Matrix

| # | Test | Method | Expected |
|---|------|--------|----------|
| V1 | Code: `orderWrapper.partial_payments` parsed | grep | present |
| V2 | Code: cashAmount/upiAmount populated | grep | present |
| V3 | Compile: webpack | log | compiled successfully |
| V4 | Runtime: Order Ledger for partial-payment order | Playwright | cash + upi columns show amounts |

## Rollback
Remove the partialMap parsing and field assignments. Columns revert to 0/empty.
