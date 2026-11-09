# CR-404 — Menu Restructuring — Proper Grouping of Add-ons — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_cr_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Priority | **P2 — MEDIUM** |
| Risk | MEDIUM — menu management UI; no financial impact |
| Area | Menu Management / Add-ons / Category Structure |
| Duplicate check | DISTINCT |
| Code reality | PARTIAL — `AddonManagementPanel.jsx` exists; bulk editor covers add-ons |
| Fast Lane | NO |

---

## Requirement

The **menu structure** needs to be **restructured** with proper **grouping of add-ons**: add-ons should be organised under clear groups/categories rather than being a flat list, making it easier for staff and customers to understand customisation options.

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-404-01: What does the desired add-on group structure look like? (e.g. “Sauces”, “Extras”, “Sizes”)
- OD-404-02: Does the backend already support add-on groups/categories?
- OD-404-03: Should groups be shown in Order Entry customer-facing view, kitchen-facing, or both?
- OD-404-04: Is this a backend schema change (add-on groups table) or purely FE display grouping?
- OD-404-05: What screens are affected — Menu Management, Bulk Editor, Order Entry, KOT?

---

## Next Step
Gate 2 GO after owner answers. Scope depends heavily on backend schema — may be a multi-sprint effort.
