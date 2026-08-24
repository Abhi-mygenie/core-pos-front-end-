# CR-039 — Credit Management: Wire Total Credit / Total Paid from API

**Status:** REGISTERED — INTAKE COMPLETE
**Created:** 2026-06-12
**Type:** CR (Change Request / Bug — pre-built FE awaiting backend data that is now available)
**Area:** Credit Management Panel
**Priority:** P1 (data visibility — portfolio totals missing from KPI strip)
**Sprint:** POS 4.0

---

## 1. Symptom

On the Credit Management screen, the **TOTAL CREDIT** and **TOTAL PAID** KPI tiles show **"—"** (dashes) instead of actual values. The OUTSTANDING tile works correctly (₹12,26,344.27 in screenshot — derived from client-side sum of customer balances).

Owner confirms: **the backend API has now added these fields** to the `tap-waiter-list` response, but the FE isn't reading them.

---

## 2. Root Cause

`getTabCustomerList()` in `creditService.js` (L16-18) returns only `res.data['employee-tap-list']` (the customer array). The parent fields `total_credit` / `total_paid` at `res.data` top level are discarded.

`CreditManagementPanel.jsx` (L67-68) then tries to read `list._totalCredit` / `list._totalPaid` from the array object — which are always `undefined` since arrays don't carry those properties.

The code has `// BG-01` comments throughout, indicating it was **pre-built** waiting for the backend to ship these fields. Backend has now shipped them.

---

## 3. Fix Scope (preliminary)

### creditService.js — `getTabCustomerList()`
Change return to include the top-level fields. Either:
- (a) Return a richer object `{ customers: [...], totalCredit, totalPaid }` and update consumers, OR
- (b) Attach `_totalCredit` / `_totalPaid` as expando properties on the returned array (current design intent per L67-68)

### CreditManagementPanel.jsx
- If approach (a): destructure the new shape
- If approach (b): no change needed (already reads `list._totalCredit`)

### Open question: what are the exact field names in the API response?
Need to verify: `total_credit` / `total_paid`? Or `total_tap_credit_amount` / `total_tap_debit_amount`? (The detail endpoint uses `total_tap_credit_amount` — list may use same or different keys.)

---

## 4. Impact

- **Files:** 1–2 files (`creditService.js` + possibly `CreditManagementPanel.jsx`)
- **Regression risk:** LOW — additive change, existing Outstanding tile unaffected
- **Money/payload impact:** NONE — display-only KPI
- **Downstream:** Portfolio Summary export may also benefit if it reads these totals

---

## 5. Screenshot Evidence

Owner-provided screenshot shows:
- TOTAL CREDIT: **—** (should show a value)
- TOTAL PAID: **—** (should show a value)
- OUTSTANDING: **₹12,26,344.27** (working — client-side sum)
- 41 customers · 24 with balance

---

## 6. Gate Status

| Gate | Status |
|------|--------|
| 0 — Registration | ✅ COMPLETE |
| 1 — Intake | ✅ COMPLETE (this document) |
| 2 — Impact Analysis | PENDING |
| 3 — Implementation Plan | PENDING |
| 4 — Code Gate | PENDING |
| 5 — Implementation + QA | PENDING |
| 6 — Owner Smoke | PENDING |

---

*CR-039 Intake — 2026-06-12*
