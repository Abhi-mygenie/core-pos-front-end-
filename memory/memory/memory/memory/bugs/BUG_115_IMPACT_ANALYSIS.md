# BUG-115 — Impact Analysis (Gate 2)

**Bug:** BUG-115 — Audit Report cancelled item/order not rendering correctly
**Date:** 2026-06-07
**Agent:** E1 (Emergent)
**Sprint:** POS 4.0

---

## 1. Problem

The Audit Report's `TAB_FILTERS.cancelled` classifier at `AllOrdersReportPage.jsx` L84 is narrower than the Order Ledger's equivalent at `OrderLedgerMockup.jsx` L70. Orders with lowercase `paymentMethod = 'cancelled'` are missed by the Audit Report but correctly classified by the Order Ledger.

Additionally, the `paid` (L70) and `running` (L107) tab exclusions only check for exact `'Cancel'`, meaning a lowercase `'cancelled'` order could leak into Paid or Running tabs.

---

## 2. Root Cause — Parity Gap

Order Ledger (S6) was built later (2026-06-03) and improved the cancelled filter. The Audit Report was not updated to match.

| Check | Order Ledger (S6) L70 | Audit Report L84 |
|-------|----------------------|-------------------|
| `paymentMethod === 'Cancel'` | ✅ | ✅ |
| `paymentMethod?.toLowerCase() === 'cancelled'` | ✅ | ❌ MISSING |

---

## 3. Affected File

| File | Lines | Change Type |
|------|-------|-------------|
| `AllOrdersReportPage.jsx` | L84 | Expand cancelled filter |
| `AllOrdersReportPage.jsx` | L70 | Expand paid tab exclusion |
| `AllOrdersReportPage.jsx` | L107 | Expand running tab exclusion |

**No other files affected.** The transform (`reportTransform.js`) already computes `isCancelled` correctly with all 3 checks. This is a tab-classifier-only gap.

---

## 4. Regression Risk: LOW

- Change is isolated to 3 predicates inside `TAB_FILTERS` object
- No financial logic touched
- No transform/service/API changes
- No state management changes
- No other tabs affected (credit, hold, merged, aggregator, audit all use different predicates)
- Order Ledger already ships this logic in production — proven safe

---

## 5. Historical Data Note

Owner confirmed: the `fOrderStatus = 3` + `paymentMethod = 'pending'` scenario (from original intake doc) was a backend bug, now fixed. The `fOrderStatus === 3` check from the transform's `isCancelled` flag is NOT being added to the tab filter — only the lowercase `'cancelled'` check, matching Order Ledger parity exactly.

---

## 6. Related Items

- **OG-FE-01** — Cancelled tab classifier gap (OPEN_GAPS_REGISTER.md). Q-115-1 (Cancelled vs Voided tab) is **resolved** — owner confirmed backend fix eliminates the `fOrderStatus=3 + pending` case. Remaining gap is lowercase parity only.
- **BUG-115 Intake:** `/app/memory/memory/bugs/BUG_115_AUDIT_REPORT_CANCEL_VALIDATION_INTAKE.md`
