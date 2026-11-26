# CR-529 — Password / OTP Guard for Cancel, Discount, and Complementary Actions

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

Owner wants a **password or OTP confirmation step** before staff can perform sensitive operations:

1. **Cancel** an order or item
2. Apply a **Discount**
3. Mark an item as **Complementary**

This is a broader protection gate than CR-494 (which covers cancel amount threshold + manager PIN for high-value cancellations only).

**Current behaviour:** Any staff member with the relevant permission can cancel, apply discounts, or mark items complementary without any additional confirmation beyond their normal login.

**Expected behaviour:** When a staff member initiates cancel/discount/complementary, a PIN or OTP prompt appears. Only after correct entry does the action proceed. Possibly configurable per action type.

---

## 2. Classification

- **Type:** CR
- **Severity:** P1 — High (security/fraud control; no current gate on these high-impact actions)
- **Risk:** CRITICAL — touches cancel flow, payment/discount (R5), complementary gating
- **Area:** Permissions / Security
- **Fast Lane:** NOT eligible (security-critical, multiple R5 files)

---

## 3. Duplicate Check

- CR-492 (Complementary role-based gating — GATE_1_INTAKE_COMPLETE): gates complementary by role; CR-529 adds PIN/OTP confirmation layer on top
- CR-494 (Cancellation amount threshold + manager PIN — GATE_1_INTAKE_COMPLETE): covers cancel threshold PIN; CR-529 is broader (all cancels + discount + complementary)
- **Result: RELATED CR-492, RELATED CR-494** — CR-529 is a broader cross-action PIN guard; can be scoped to complement existing items

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- Cancel flow in `OrderEntry.jsx` (R5) — add PIN prompt
- Discount flow in `CollectPaymentPanel.jsx` (R5) — add PIN prompt
- Complementary flow — add PIN prompt
- New PIN/OTP dialog component
- Backend: may need manager PIN verification endpoint
- **Estimated scope:** LARGE (4+ files, R5 × 2, backend dependency possible)

---

## 6. Open Questions

- OD-529-01: Is this a fixed 4-digit manager PIN (like CR-494) or a dynamic OTP (SMS/email)?
- OD-529-02: Which of the three actions (cancel/discount/complementary) should be gated — all three, or configurable per restaurant?
- OD-529-03: Should CR-494 and CR-529 be merged or implemented as separate but coordinated features?

---

## 7. Code Reality

- **Status:** NONE — no PIN/OTP confirmation before cancel/discount/complementary

---

## 8. Related

- CR-492 (Complementary role-based — GATE_1_INTAKE_COMPLETE)
- CR-494 (Cancel amount threshold + PIN — GATE_1_INTAKE_COMPLETE)
- BUG-538 (Role-based discount not wired — GATE_1_INTAKE)
