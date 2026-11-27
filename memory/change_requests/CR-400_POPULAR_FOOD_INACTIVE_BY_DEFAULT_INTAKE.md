# CR-400 — Popular Food Should Be Inactive by Default for All Customers — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_cr_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Priority | **P3 — LOW** |
| Risk | LOW — config/default change |
| Area | Menu / Popular Items / Config / Order Entry |
| Duplicate check | DISTINCT |
| Code reality | PARTIAL — Popular tab exists in OrderEntry (CR-037 removed it from some views; CR-376-FU-B reintroduced menu-aware popular) |
| Fast Lane | NO |

---

## Requirement

The **Popular Food** feature/tab should be **disabled by default** for all customers/restaurants. Currently it appears to be enabled by default and some restaurants do not want it.

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-400-01: Should this be a per-restaurant setting or a global default change?
- OD-400-02: Is “Popular Food” the Popular category tab in Order Entry, or the Popular items section?
- OD-400-03: For existing restaurants that have it on — should it be turned off, or only affect new restaurants?

---

## Next Step
Gate 2 GO after owner answers. Low-risk config default change.
