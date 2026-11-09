# CR-394 — Backward GST Calculation Required for Open Items — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_cr_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Priority | **P2 — MEDIUM** |
| Risk | HIGH — GST calculation change; financial logic |
| Area | Order Entry / GST / Open Items / Custom Items |
| Duplicate check | DISTINCT |
| Code reality | PARTIAL — `AddCustomItemModal.jsx` exists (CR-348); has `taxPercent`/`taxCalc` fields |
| Fast Lane | NO |

---

## Requirement

For **Open/Custom Items** (items entered manually), the GST calculation should support **backward/inclusive mode**: the entered price is treated as **GST-inclusive**, and the GST amount is extracted from it rather than added on top.

Example: Price entered = ₹118, GST 18% → Base = ₹100, GST = ₹18 (not Base = ₹118, GST = ₹21.24).

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-394-01: Should backward GST be the default for all open items, or a toggle per item?
- OD-394-02: Does the backend already support `tax_calc: 'Inclusive'` for custom items?
- OD-394-03: Which screen — AddCustomItemModal or a different entry point?

---

## Next Step
Gate 2 GO after owner answers. HIGH risk — financial calculation change.
