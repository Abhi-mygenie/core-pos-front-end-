# CR-397 — Add Stock in Packets, Store/Deduct in Grams/Pieces Internally — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_cr_batch` · **Gate:** 1 (INTAKE)
**Related:** BUG-471/BUG-472 (deduction bug — same conversion logic, different direction), BUG-459 (stock audit)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Priority | **P2 — MEDIUM** |
| Risk | HIGH — inventory data integrity; conversion factor logic |
| Area | Inventory / Stock Management / Add Stock |
| Duplicate check | DISTINCT (BUG-471 is the consumption side; this is the add-stock side) |
| Code reality | PARTIAL — CR-387/BUG-459 handled smart-purchase and audit display; add-stock flow may need update |
| Fast Lane | NO |

---

## Requirement

When **adding stock** for a converted item (e.g. Coffee Powder: 1 packet = 500g):
- Staff enters quantity in **packets** (display unit, natural for purchasing)
- System stores and tracks in **grams** (base unit) internally
- Stock reports show both packet count and gram equivalent

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-397-01: Does `inventory-receive` (Add Stock) currently accept `display_unit` and convert, or only base unit?
- OD-397-02: Is this the same fix needed as BUG-471 (order deduction) or a separate screen?
- OD-397-03: Should the Add Stock screen show both packet qty input AND calculated gram total?

---

## Next Step
Gate 2 GO after owner answers. Coordinate with BUG-471/472 — may be implementable together.
