# BUG-672 — Prepaid Order Unable to Go Into Credit (Missing Feature)

**Registered:** 2026-11-12
**Type:** BUG
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

**Prepaid orders** (orders marked as prepaid at the time of placing) cannot be moved to the **Credit** (pay-later) system. The option to send a prepaid order to credit is missing.

**Current behaviour:** Prepaid orders have no "Move to Credit" or "Make Credit/Unpaid" option. They are locked to their prepaid status.

**Expected behaviour:** A prepaid order should be movable to Credit status (e.g. if the prepayment needs to be reversed or the customer requests credit instead).

---

## 2. Classification

- **Type:** BUG (missing feature / regression)
- **Severity:** P1 — High (no workaround; prepaid orders stuck in prepaid status)
- **Risk:** HIGH — payment status transitions, credit system, financial
- **Area:** Payments / Coupons / Credit
- **Fast Lane:** NOT eligible (financial, payment status)

---

## 3. Duplicate Check

- BUG-481 (Prepaid → COD: backend assigns COD as default on re-settlement): related symptom area
- **Result: RELATED BUG-481** — BUG-481 is about COD assignment; BUG-672 is about moving prepaid to credit (different flow)

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

## 5. Root Cause (preliminary)

The "Move to Credit" or "Make Unpaid" action likely checks `order.paymentStatus !== 'prepaid'` before showing the option, excluding prepaid orders from credit transitions.

---

## 6. Blast Radius

- Order action panel / `OrderCard.jsx` — prepaid order credit option
- Credit service — `addToCredit` API call with prepaid order
- Backend: confirm prepaid → credit transition is supported
- **Estimated scope:** SMALL-MEDIUM (1–2 FE files, backend dependency TBD)

---

## 7. Code Reality

- **Status:** NONE — no prepaid → credit transition path

---

## 8. Related

- BUG-481 (Prepaid → COD: backend assigns COD)
- BUG-671 (Partial payment unable to unpaid)
- CR-526 (Remove/unpaid from credit)
