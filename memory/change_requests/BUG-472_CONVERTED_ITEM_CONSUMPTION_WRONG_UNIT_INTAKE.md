# BUG-472 — Converted Item Consumption in Wrong Unit (Packets Instead of Grams) — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)
**Related:** BUG-471 (same root, quantity angle), CR-397

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P1 — HIGH** |
| Risk | HIGH — inventory data integrity |
| Area | Inventory / Order Processing |
| Duplicate check | RELATED to BUG-471 (different angle: unit vs quantity) |
| Code reality | PARTIAL |
| Fast Lane | NO |

---

## Description

For **converted items** (e.g. Coffee Powder stored in grams, sold in packets), the system records consumption/deduction in **packets** instead of converting to the base unit (grams/pieces). This causes the actual inventory level to be inflated — the system thinks more stock is available than actually is.

---

## Evidence

| Item | Detail |
|---|---|
| Source | OWNER-REPORTED |
| Screenshot | Not provided |
| Steps to reproduce | OWNER WILL PROVIDE LATER |
| Confidence | REPORTED |

---

## Blast Radius

- Backend: HIGH — consumption calculation during order placement
- Scope: MEDIUM (all converted-unit items)

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-472-01: Specific item example with conversion factor?
- OD-472-02: Confirmed via Current Stock report or Consumption Report?

---

## Next Step

Same investigation as BUG-471. Will likely be fixed together. Backend: consumption must apply `conversion_factor` before deducting from base-unit stock.
