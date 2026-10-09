# CR-392 — Allow Discount on Grand Total for Transferred Room Orders — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_cr_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Priority | **P2 — MEDIUM** |
| Risk | HIGH — discount logic on transferred orders; financial impact |
| Area | PMS / Discount / Transferred Orders / Room Settlement |
| Duplicate check | DISTINCT |
| Code reality | NONE |
| Fast Lane | NO |

---

## Requirement

When a room has **no active room orders** (only transferred F&B orders), a discount should be **directly applicable to the grand total** without requiring the transferred order to be made unpaid first.

**Current behaviour:** Discount cannot be applied → must make order Unpaid → then apply discount → re-settle.
**Expected:** Discount field available on transferred-order-only bill.

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-392-01: Is this via Folio / PmsCheckoutDrawer / Front Desk Bill tab?
- OD-392-02: Should discount apply to total (room + F&B) or only the transferred F&B portion?
- OD-392-03: Is there a backend endpoint that accepts discount on transferred orders directly?

---

## Next Step
Gate 2 GO after owner answers. HIGH risk — requires financial logic review (R6).
