# Session Handover — BUG-516 through BUG-519 INTAKE (2026-10-08)

**Role:** INTAKE
**Status:** GATE_1 COMPLETE for BUG-516, BUG-517, BUG-518, BUG-519

---

## Summary

4 bugs registered from checkout phase investigation. All full gate cycle (no fast lane). Registry now 802 items.

---

## Items Registered

| ID | Title | Severity | Risk | Duplicate check | ODs open |
|---|---|---|---|---|---|
| BUG-516 | VAT item shows "GST" label in room orders | P2 | MEDIUM | DISTINCT | None |
| BUG-517 | Checkout % discount formula uses baseBalance not bc | P1 | CRITICAL | RELATED BUG-498 | OD-517-01 |
| BUG-518 | Both discount display/payload mismatch (BUG-499 gap) | P0 | CRITICAL | RELATED BUG-499 | OD-518-01/02/03 |
| BUG-519 | Room discount controls on left (should be right) | P2 | HIGH | DISTINCT | OD-519-01/02/03 |

---

## Owner Decisions Needed Before Gate 2

### BUG-517 OD-517-01
Correct % formula: `roomDiscountRs = min(floor(bc × pct/100), baseBalance)` — confirm?

### BUG-518 OD-518-01
'Both' split with caps: Option a (cap each half independently) / Option b (fill room first) / Option c (custom ratio)?

### BUG-518 OD-518-02
Should display match payload? (YES recommended)

### BUG-518 OD-518-03
F&B Percent base: `fnbTotal` or `order.amount`?

### BUG-519 OD-519-01
Left panel when discount > 0: read-only discount line (a) or no line (b)?

### BUG-519 OD-519-02
Room discount controls placement on right: above CollectPaymentPanel (a) / inside (b) / wireframe (c)?

### BUG-519 OD-519-03
Split room payment: also move to right (a) or stay left (b)?

---

## Artifacts

- Intake docs: `change_requests/BUG-516_*.md` through `BUG-519_*.md`
- Evidence dirs: `evidence/BUG-516/` through `evidence/BUG-519/`
- Investigation basis: `investigations/INV-CHECKOUT-PHASE-2026-10-08.md`

---

## Next

Owner answers ODs → Gate 2 GO for each → PLANNING (Impact Analysis)
Suggested order: BUG-518 (P0) first → BUG-517 (P1) → BUG-516+BUG-519 (P2) together
