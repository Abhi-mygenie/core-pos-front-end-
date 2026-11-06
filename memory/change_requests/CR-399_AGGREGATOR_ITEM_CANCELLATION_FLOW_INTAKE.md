# CR-399 — Zomato and Swiggy Orders — Food/Item Cancellation Flow — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_cr_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Priority | **P2 — MEDIUM** |
| Risk | HIGH — aggregator order flow; backend API coordination |
| Area | Aggregator / Order Management / Cancellation |
| Duplicate check | DISTINCT |
| Code reality | NONE — no item-cancel UI for aggregator orders currently |
| Fast Lane | NO |

---

## Requirement

For **Zomato and Swiggy** orders, allow **individual item cancellation** from the POS. Currently there is no cancellation flow for aggregator order items. Staff need to be able to mark items as cancelled (e.g. out of stock) and notify the customer.

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-399-01: Does Swiggy/Zomato API support item-level cancellation callbacks from POS?
- OD-399-02: Should cancellation notify the customer automatically, or only update POS records?
- OD-399-03: Can the whole aggregator order be cancelled, or only individual items?
- OD-399-04: Is there a backend endpoint already for this (`cancel-aggregator-item`?)?

---

## Next Step
Gate 2 GO after owner answers. Backend probe needed for aggregator cancel API.
