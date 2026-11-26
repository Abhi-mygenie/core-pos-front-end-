# CR-517 — Advance Payment for Bulk / Scheduled Orders

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

Owner wants to support **bulk/catering orders** with an advance partial payment workflow:

1. Customer places an order for a future date/time (scheduled order)
2. Cashier takes a partial **advance payment** at the time of booking
3. The remaining balance is paid after delivery/service

**Current behaviour:** No advance/deposit payment mechanism exists for regular POS orders. Orders are either fully paid at collect-bill or added to credit. There is no way to record a partial advance and schedule the order for a future date.

**Expected behaviour:**
- Create a "Scheduled Order" with a future delivery date/time
- Accept a partial advance amount (less than total bill)
- Record the advance amount and remaining balance
- At delivery time, the remaining amount can be collected

---

## 2. Classification

- **Type:** CR
- **Severity:** P1 — High (catering/bulk orders have no workaround in the POS)
- **Risk:** CRITICAL — new order type, payment flow, billing, credit/balance tracking
- **Area:** Payments / Coupons / Credit
- **Fast Lane:** NOT eligible (new payment flow, financial, R5 files likely)

---

## 3. Duplicate Check

- Searched: "advance payment", "bulk order", "scheduled order", "deposit" in registry.json
- PMS check-in has advance payment (CR-385, BUG-496/497 etc.) — those are hotel-room specific
- **Result: DISTINCT** — no POS-level advance/bulk-order registration found

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** REPORTED (no screenshot provided)

---

## 5. Blast Radius

- New UI: "Bulk/Catering Order" flow or "Scheduled Order" panel
- `CollectPaymentPanel.jsx` (R5) — partial advance collection
- `orderTransform.js` (R5) — new order type/status
- Backend: needs new APIs or order type support (significant dependency)
- **Estimated scope:** LARGE (6+ files, backend dependency)

---

## 6. Open Questions

- OD-517-01: Is this a new order type (Bulk/Catering) or an enhancement to existing order types?
- OD-517-02: Where does the scheduled date picker appear?
- OD-517-03: Is the advance amount a fixed value or a percentage of the total?
- OD-517-04: Backend dependency — does backend support advance payment for POS orders?
- OD-517-05: Does this integrate with the existing Credit system or is it a separate flow?

---

## 7. Code Reality

- **Status:** NONE — no bulk/scheduled order or advance payment flow in POS (outside PMS)

---

## 8. Related

- CR-385 (PMS check-in advance payment — PMS-specific, not same)
- CR-425 (Wallet Recharge — adjacent payment feature)
