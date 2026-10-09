# CR-391 — Room Settlement: Show Payment Details + Veg/Non-Veg Charge Separation — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_cr_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Priority | **P2 — MEDIUM** |
| Risk | MEDIUM — settlement display; no financial calculation change |
| Area | PMS / Room Settlement / Payment / Bill |
| Duplicate check | DISTINCT |
| Code reality | NONE |
| Fast Lane | NO |

---

## Requirement

During **room settlement**, the system should:
1. Display detailed payment breakdown (amounts per payment method, advance, balance)
2. Allow charges to be **separated between vegetarian and non-vegetarian items** for properties that need this split for billing/tax purposes

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-391-01: Is veg/non-veg split for display only, or does it affect GST calculation?
- OD-391-02: Which screen — Folio, PmsCheckoutDrawer, or Front Desk Bill tab?
- OD-391-03: Is this required for specific restaurant types (e.g. Jain properties)?
- OD-391-04: Does the backend already tag items as veg/non-veg, or does FE need to derive this?

---

## Next Step
Gate 2 GO after owner answers OD-391-01 to 04.
