# BUG-471 — Inventory Deduction Incorrect for Packet-to-Gram Converted Items — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)
**Related:** BUG-472 (same root cause, consumption unit), CR-397 (add-stock companion CR), BUG-459 (stock audit — separate flow)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P1 — HIGH** — inventory deduction wrong on every converted-item order |
| Risk | HIGH — inventory data integrity |
| Area | Inventory / Order Processing / Backend |
| Duplicate check | DISTINCT from BUG-459 (which covers stock audit, not order-time deduction) |
| Code reality | PARTIAL — `inventoryTransform.js` has `display_unit`/`conversion_factor` but order-time consumption path may not use them |
| Fast Lane | NO |

---

## Description

When an order is placed for an item with a **unit conversion** (e.g. 1 packet = 500g), the inventory deduction uses the **wrong quantity or unit**. Example: ordering 2 packets should deduct 1000g from stock, but the system deducts 2 (treating it as 2g or 2 base units).

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

- Backend: HIGH — order-time inventory deduction logic
- FE: LOW-MEDIUM — `orderTransform.js` `buildPlaceOrderPayload` may send wrong unit
- Scope: MEDIUM (affects all converted items in orders)

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-471-01: Which specific item(s) show incorrect deduction? (example: Coffee Powder, packets)
- OD-471-02: Is deduction wrong by a factor (e.g. 2 deducted instead of 1000), or completely wrong unit?
- OD-471-03: Does this affect all converted items or only specific ones?
- OD-471-04: Is the issue visible in Current Stock report after placing an order?

---

## Next Step

Probe `POST place-order` payload for a converted item — check if `unit` field is sent as display unit or base unit. Compare backend inventory record before/after order. May require backend fix if deduction logic ignores conversion_factor.
