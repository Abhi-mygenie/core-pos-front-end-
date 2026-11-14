# CR-515 — Order Beta: Staff Rights for Reprint and Collect Pay-Later

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

Owner wants to show Order Beta (all-orders report) to staff, but currently there is no rights/permission control for the two key action buttons on that page — **Reprint** and **Collect (Pay-Later)**. All logged-in users who can access Order Beta can also trigger reprints and settle pay-later orders, which the owner wants to restrict.

**Current behaviour:** Order Beta page exposes Reprint and Collect Payment buttons to all users regardless of role/permissions. No gating exists for these two actions.

**Expected behaviour:** 
- Two new permission toggles (or reuse of existing rights): `reprint_bill` and `collect_paylater_order`
- Staff without the right see the buttons disabled or hidden on the Order Beta page
- Owner/manager retain full access

---

## 2. Classification

- **Type:** CR
- **Severity:** P1 — High (staff can trigger reprints and collect payments unintentionally or fraudulently)
- **Risk:** CRITICAL — touches permissions system, Order Beta page, potential payment flow
- **Area:** Permissions / Security
- **Fast Lane:** NOT eligible (permissions, financial flow)

---

## 3. Duplicate Check

- Searched: CR-490 (Daily Report Only Permission — GATE_5B_QA_PASS); this is specifically about Order Beta action buttons, not report access
- **Result: RELATED CR-490** (same permissions framework; different scope — CR-490 is read-access to daily report; CR-515 is action buttons on Order Beta)

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** not provided specifically for this item
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- `OrderReportBetaPage.jsx` or `AllOrdersReportPage.jsx` — gate Reprint + Collect buttons
- Permissions service / `hasPermission()` hook — add new permission keys
- Backend: may need new permission module IDs (backend dependency TBD)
- **Estimated scope:** SMALL-MEDIUM (2–3 files)

---

## 6. Open Questions

- OD-515-01: Should these be new permission keys or reuse existing `reprint` / `collect_payment` rights already in the system?
- OD-515-02: If no permission, should buttons be (a) hidden or (b) visible but disabled?
- OD-515-03: Does backend need to deliver new module IDs in the permissions/settings API?

---

## 7. Code Reality

- **Status:** NONE — no permission gating on Reprint/Collect in Order Beta

---

## 8. Related

- CR-490 (Daily Report Only Permission — GATE_5B_QA_PASS, same framework)
- CR-503 (Order Beta: Pay Later - Print Bill and Collect Payment — GATE_1_INTAKE_COMPLETE)
