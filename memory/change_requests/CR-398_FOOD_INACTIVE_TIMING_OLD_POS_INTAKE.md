# CR-398 — Food Inactive Timing in Old POS — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_cr_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Priority | **P3 — LOW** |
| Risk | LOW — menu availability display |
| Area | Menu / Availability / Old POS |
| Duplicate check | DISTINCT |
| Code reality | NONE in New POS frontend (Old POS is a separate codebase) |
| Fast Lane | NO |

---

## Requirement

Time-based food item deactivation (e.g. breakfast items inactive after 11 AM) should be available in the **Old POS**, matching the functionality that exists in New POS.

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-398-01: Is the inactive timing configured per-item or per-category?
- OD-398-02: Is this an Old POS frontend task or a backend config that Old POS doesn’t read?
- OD-398-03: Which Old POS version/codebase needs this?

---

## Next Step
Gate 2 GO after owner answers. Old POS is separate codebase — confirm scope.
