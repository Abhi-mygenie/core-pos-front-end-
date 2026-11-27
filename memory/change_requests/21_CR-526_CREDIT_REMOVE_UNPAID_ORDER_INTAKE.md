# CR-526 — Credit Management: Remove/Unpaid Order Removal

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

Owner wants the ability to **remove an unpaid order from the Credit Management** list. Currently, once an order lands in credit (pay-later), there is no way to remove or mark it as "void/removed" if the customer doesn't pay or the order needs to be cleared without payment.

**Current behaviour:** Unpaid orders in Credit Management can only be collected (paid) or remain indefinitely. There is no "remove" or "write off" action.

**Expected behaviour:** An authorized user (manager/owner role) can remove an unpaid order from the credit list, with an optional reason. The removed order should be tracked in an audit log.

---

## 2. Classification

- **Type:** CR
- **Severity:** P1 — High (credit list grows indefinitely; no way to clear bad debts or errors)
- **Risk:** HIGH — touches Credit Management, potential financial reporting impact
- **Area:** Payments / Coupons / Credit
- **Fast Lane:** NOT eligible (financial, credit data)

---

## 3. Duplicate Check

- Searched: "remove credit", "unpaid credit", "credit remove" in registry.json — no match
- CR-488 (Credit Management print — GATE_1_INTAKE_FROZEN): adjacent feature
- **Result: DISTINCT**

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- `CreditManagementPage.jsx` — add remove/void action
- Credit service — new API call or status update
- Backend: needs `void-credit-order` or similar endpoint
- **Estimated scope:** MEDIUM (2–3 files, backend dependency)

---

## 6. Open Questions

- OD-526-01: Should "remove" be role-gated (manager/owner only)?
- OD-526-02: Should removed orders appear in a separate "Removed" tab or disappear entirely?
- OD-526-03: Does the backend have a "void" or "remove" credit endpoint?

---

## 7. Code Reality

- **Status:** NONE — no remove/void action on credit orders

---

## 8. Related

- CR-488 (Credit Management print — GATE_1_INTAKE_FROZEN)
- BUG-643 (Credit order detail sheet won't close — GATE_1_INTAKE)
