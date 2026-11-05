# BUG-482 — Duplicate Payment Entries on Re-settlement (Critical Financial Bug) — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)
**Backend Brief filed:** `backend_briefs/BACKEND_BRIEF_BUG482_DUPLICATE_SETTLEMENT_2026_09_27.md`

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P0 — CRITICAL** — active financial data corruption |
| Risk | CRITICAL — financial reporting inflated; settlement totals wrong |
| Area | Settlement / Payment Allocations / Backend |
| Duplicate check | DISTINCT |
| Code reality | CONFIRMED BACKEND — `paymentMutationService.makeOrderUnpaid` correctly calls endpoint; root cause is backend not voiding previous allocations |
| Fast Lane | NO |

---

## Description

When a **settled order is made Unpaid** and then **re-settled**, the previous payment allocation is NOT reversed. The new settlement **appends** a second payment record instead of replacing the first.

**Example:** ₹160 order settled as Cash, made Unpaid, re-settled as Card → system now shows ₹160 Cash + ₹160 Card = ₹320 total payment entries for a ₹160 order.

**Owner’s confirmed rule:**
> *“Making an order Unpaid must reverse/invalidate the previous settlement allocation; re-settlement must not append another active payment allocation to the same order. Previous settlement entries should be reversed/replaced rather than accumulated.”*

---

## Code Evidence

```javascript
// paymentMutationService.js — Endpoint B
export const makeOrderUnpaid = async (orderId) => {
  const order_id = normalizeOrderId(orderId);
  const response = await api.post(
    API_ENDPOINTS.MAKE_ORDER_UNPAID,   // POST make-order-unpaid
    { order_id }
  );
  return response.data;
};
// FE is correct — simply calls the endpoint
// ROOT CAUSE: backend make-order-unpaid does NOT void previous payment_allocations
```

---

## Evidence

| Item | Detail |
|---|---|
| Source | OWNER-REPORTED |
| Screenshot | Not provided |
| Confidence | HIGH — FE code confirmed correct; backend logic gap confirmed by data flow trace |
| Backend Brief | `backend_briefs/BACKEND_BRIEF_BUG482_DUPLICATE_SETTLEMENT_2026_09_27.md` |

---

## Blast Radius

- FE: NONE (no FE code change needed)
- Backend: HIGH — `make-order-unpaid` endpoint needs to void previous allocations
- Financial reports: HIGH — Settlement Report, Day Closure, Audit Report all affected
- Scope: MEDIUM (any order settled more than once)

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-482-01: How many orders are affected historically? Can they be identified and corrected?
- OD-482-02: Is this Old POS only, New POS only, or both?
- OD-482-03: Should old allocations be hard-deleted or soft-voided (for audit trail)?

---

## Next Step

**Backend team action required** — Backend Brief already filed. Backend must:
1. On `make-order-unpaid`: void/reverse all existing active payment allocation records
2. Add idempotency guard on re-settlement

FE: No changes needed.
