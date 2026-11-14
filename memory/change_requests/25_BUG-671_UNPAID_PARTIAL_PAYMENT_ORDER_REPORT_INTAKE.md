# BUG-671 — Unable to Unpaid Orders in Case of Partial Payment (Order Report / New POS)

**Registered:** 2026-11-12
**Type:** BUG
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

In the Order Report (New POS / Order Beta), when an order has a **partial payment**, the system does not allow marking it as "Unpaid" (reversing the payment to credit/pay-later status). This is a missing or broken flow for partially-paid orders.

**Current behaviour:** For orders with partial payment, the "Unpaid" / "Change Payment Method" action either does not appear or fails to work correctly, preventing the reversal of partial payments back to unpaid status.

**Expected behaviour:** Partially-paid orders should be reversible to "Unpaid" or "Credit" status from the Order Report, consistent with how fully-paid orders can be reversed.

---

## 2. Classification

- **Type:** BUG
- **Severity:** P1 — High (blocking operation; partial payments cannot be reversed)
- **Risk:** HIGH — payment reversal, credit flow, partial payment state
- **Area:** Payments / Coupons / Credit
- **Fast Lane:** NOT eligible (payment reversal, HIGH risk)

---

## 3. Duplicate Check

- BUG-605 (Order Report Beta: Unpaid/Change Payment Method Buttons Not Working — GATE_1_INTAKE_COMPLETE, RELATED CR-349): partial overlap
- **Result: RELATED BUG-605** — BUG-605 covers buttons not working generally; BUG-671 specifically covers partial payment scenario

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED (owner reported as bug)

---

## 5. Root Cause (preliminary)

Partial payment orders may have a different `payment_status` or `order_state` that bypasses the "make unpaid" flow. The unpaid button condition likely checks for fully-paid orders only, not partial payment state.

---

## 6. Blast Radius

- `AllOrdersReportPage.jsx` or `OrderReportBetaPage.jsx` — unpaid button condition
- Payment service — partial payment reversal API
- **Estimated scope:** SMALL-MEDIUM (1–2 files)

---

## 7. Code Reality

- **Status:** NONE — partial payment reversal not working

---

## 8. Related

- BUG-605 (Order Beta unpaid/change payment buttons — GATE_1_INTAKE, RELATED)
- BUG-645 (Payment filter for split/partial — GATE_5B_QA_PASS)
