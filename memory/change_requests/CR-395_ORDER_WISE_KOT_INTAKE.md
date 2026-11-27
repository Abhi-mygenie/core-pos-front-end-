# CR-395 — Order-wise KOT Required — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_cr_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Priority | **P2 — MEDIUM** |
| Risk | MEDIUM — new print mode; no financial impact |
| Area | KOT / Print / Order Entry |
| Duplicate check | DISTINCT |
| Code reality | NONE |
| Fast Lane | NO |

---

## Requirement

Print **one KOT per order** (all stations/items combined on a single KOT slip) rather than separate per-station KOTs. This is required for properties that prefer a single kitchen ticket per order.

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-395-01: Should this be a restaurant-level setting or per-print action?
- OD-395-02: Should it replace per-station KOTs or be available as an additional print option?
- OD-395-03: Does the backend support a combined KOT print mode already?

---

## Next Step
Gate 2 GO after owner answers.
