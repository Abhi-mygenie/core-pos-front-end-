# BUG-481 — Prepaid Order Made Unpaid Then Re-settled — Payment Status Becomes Cash_On_Delivery — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)
**Related:** BUG-482 (duplicate payment entries — different angle of same Unpaid→Re-settle flow)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P1 — HIGH** — incorrect payment method recorded |
| Risk | HIGH — financial reporting incorrectly shows COD |
| Area | Payment / Settlement / Old POS / Backend |
| Duplicate check | DISTINCT |
| Code reality | LOW FE involvement — likely Old POS or backend default |
| Fast Lane | NO |

---

## Description

When a **prepaid order** (e.g. online payment) is made **Unpaid** and then **re-settled in Old POS**, the payment status incorrectly becomes **Cash_On_Delivery** instead of preserving or prompting for the correct payment method.

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

- Backend: HIGH — Old POS settlement endpoint uses COD as default fallback
- FE: LOW — New POS `collectBill` sends explicit payment_method; Old POS may not
- Scope: MEDIUM (prepaid orders re-settled via Old POS)

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-481-01: Is this specifically Old POS (legacy) re-settlement or also New POS?
- OD-481-02: What payment method does the re-settlement screen show — does it offer a choice?
- OD-481-03: Is the COD status visible only in reports, or does it affect the order flow?

---

## Next Step

Backend probe: call `make-order-unpaid` on a test prepaid order, then inspect the order’s `payment_method` field before and after re-settlement via Old POS. Check what Old POS sends in its settlement payload — likely missing explicit payment_method, backend defaults to COD.
