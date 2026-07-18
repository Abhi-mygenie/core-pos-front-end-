# BUG-115 — Implementation Plan (Gate 3)

**Bug:** BUG-115 — Audit Report cancelled order tab filter parity with Order Ledger
**Date:** 2026-06-07
**Agent:** E1 (Emergent)
**Sprint:** POS 4.0

---

## 1. Objective

Align `AllOrdersReportPage.jsx` TAB_FILTERS with `OrderLedgerMockup.jsx` TAB_FILTERS for the `cancelled` predicate and its exclusions in `paid` and `running` tabs.

---

## 2. Changes (3 lines, 1 file)

### File: `src/pages/AllOrdersReportPage.jsx`

**Change 1 — L70 (paid tab exclusion):**
```
BEFORE:  if (o.paymentMethod === 'Cancel') return false;
AFTER:   if (o.paymentMethod === 'Cancel' || o.paymentMethod?.toLowerCase() === 'cancelled') return false;
```

**Change 2 — L84 (cancelled tab filter):**
```
BEFORE:  cancelled: (o) => o.paymentMethod === 'Cancel',
AFTER:   cancelled: (o) => o.paymentMethod === 'Cancel' || o.paymentMethod?.toLowerCase() === 'cancelled',
```

**Change 3 — L107 (running tab exclusion):**
```
BEFORE:  if (o.paymentMethod === 'Cancel') return false;
AFTER:   if (o.paymentMethod === 'Cancel' || o.paymentMethod?.toLowerCase() === 'cancelled') return false;
```

---

## 3. Files NOT Changed

- `reportTransform.js` — already correct
- `reportService.js` — no change needed
- `OrderDetailSheet.jsx` — no change needed
- `OrderLedgerMockup.jsx` — already correct (reference implementation)
- `orderLedgerService.js` — no change needed
- All other files — no change needed

---

## 4. Test Strategy

1. Verify frontend compiles clean (webpack)
2. Visual verification: navigate to Audit Report on preprod, check Cancelled tab count
3. Confirm no cancelled orders leak into Paid or Running tabs
4. Confirm parity: Audit Report cancelled count should match Order Ledger cancelled count for the same date range

---

## 5. Rollback

Revert the 3 lines to their original form. No data migration, no state changes, no side effects.
