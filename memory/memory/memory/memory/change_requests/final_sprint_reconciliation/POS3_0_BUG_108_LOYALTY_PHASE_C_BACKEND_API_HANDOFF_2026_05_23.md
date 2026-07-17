# POS 3.0 BUG-108 — Loyalty Phase C Backend API Handoff

> **⚠️ DRAFT / NON-AUTHORITATIVE — DO NOT TREAT AS A CRM COMMITMENT.**
>
> This document was authored by the POS planning agent on 2026-05-23 before
> reconciling against the authoritative CRM contract. It is a **proposal**
> for the API shape **if and when** the redemption CR is re-commissioned.
>
> Authoritative loyalty contract (read-only, GREEN-LIGHT):
> `/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md`
>
> Per the authoritative source §1 and §8.2:
> - `POST /pos/loyalty/redeem` — **deferred indefinitely per owner sign-off** (Q4).
> - `POST /pos/loyalty/reverse` — **declared "not needed" by CRM** (Q5).
>
> Reconciliation: `POS3_0_BUG_108_LOYALTY_PHASE_C_API_RECONCILIATION_UPDATE_2026_05_23.md`
>
> Phase C3 implementation status: **`deferred_per_crm_handoff_owner_signoff`**,
> not `backend_blocked`. Owner must re-commission the redemption CR (Q9) and
> re-decide the reverse endpoint (Q10) before any backend work is chartered.

---

**Date:** 2026-05-23
**From:** POS 3.0 Frontend Team
**To:** CRM / Backend Team
**Re:** Two new endpoints required for live loyalty redemption (BUG-108 Phase C)
**Pairs with:** `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEMPTION_PLAN_2026_05_23.md`
**Status:** Backend implementation pending — Phase C3 is blocked on this.

---

## 1. Summary

Phase B (read-only preview) shipped successfully. Phase C requires **two new CRM endpoints**:

1. `POST /pos/loyalty/redeem` — commit or reserve a points redemption against a customer + order.
2. `POST /pos/loyalty/reverse` — roll back a prior redemption (on payment failure, order cancellation, or manual cashier action).

Both endpoints must be **idempotent**, **atomic**, and **return enough data for the POS to refresh the loyalty section without a follow-up `lookupCustomer` call**.

---

## 2. Required Endpoint 1 — Redeem

### 2.1 Header
| Item | Value |
|------|-------|
| Method | `POST` |
| Path | `/pos/loyalty/redeem` |
| Auth | `X-API-Key: <crm_token>` (same header pattern as existing `/pos/customers`, `/pos/customer-lookup`) |
| Content-Type | `application/json` |

### 2.2 Request body
```json
{
  "restaurant_id":        "rest_xxx",
  "customer_id":          "bc92911c-c4a0-4ab3-bd56-3e7a9c0d1234",
  "customer_phone":       "9004020412",
  "order_id":             "ord_yyy",
  "temp_order_reference": null,
  "bill_amount":          1250.00,
  "points_to_redeem":     86,
  "redeem_amount":        86.00,
  "idempotency_key":      "7c1b7a48-1f6f-4d99-9b3e-8f87b2c2c7c0",
  "source":               "pos_collect_bill"
}
```

Field notes:
- `order_id` OR `temp_order_reference` — exactly one. Reservation flows use `temp_order_reference` (POS-generated UUID) when the order hasn't been placed yet.
- `bill_amount` — grand total at the moment of redemption (informational; backend may sanity-check).
- `points_to_redeem` — integer.
- `redeem_amount` — rupee equivalent; POS computes as `points_to_redeem * ratio_per_point`. Backend should verify and use its own value if drift.
- `idempotency_key` — UUID v4 generated client-side; backend MUST return the original response on duplicate.
- `source` — one of `pos_collect_bill` | `pos_prepaid` | `room_service`.

### 2.3 Successful response (HTTP 200)
```json
{
  "success":          true,
  "redemption_id":    "red_zzz",
  "points_redeemed":  86,
  "discount_amount":  86.00,
  "remaining_points": 0,
  "ratio_per_point":  1.0,
  "message":          "Redemption successful"
}
```

### 2.4 Error responses

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `invalid_request` | Malformed / missing field |
| 401 | `auth_failed` | Bad / missing X-API-Key |
| 404 | `customer_not_found` | `customer_id` unknown |
| 409 | `idempotency_replay` | (Treat as 200 — return original response; do NOT debit again) |
| 422 | `insufficient_points` | `points_to_redeem > total_points` |
| 422 | `loyalty_disabled` | Customer or restaurant has loyalty turned off |
| 429 | `rate_limited` | Standard rate-limit |
| 500 | `internal_error` | Generic |

All error bodies use this shape:
```json
{ "success": false, "error_code": "...", "message": "Human-readable explanation" }
```

### 2.5 Atomicity contract

- Points are debited from `customer.total_points` only when the response is 200.
- A failed request leaves `total_points` unchanged.
- Partial debits are NOT allowed.

### 2.6 Idempotency contract

- Backend keeps `idempotency_key → redemption_id` mapping for at least 24 hours.
- Duplicate request with the same `idempotency_key` returns the original 200 response (same `redemption_id`, same `discount_amount`).
- Idempotency keys are scoped per `restaurant_id` (different restaurants can reuse the same UUID — extremely unlikely with UUIDv4 but documented).

### 2.7 Reservation semantics (optional but recommended)

If backend wants to support **owner Q3 option C** (reserve before payment, confirm after), please offer either:

**Option I:** A single endpoint that holds the points until `confirm_redemption` or auto-expires after N minutes:
- First call: `state=reserve`, returns `redemption_id` with status `reserved`.
- Second call: same `redemption_id` with `state=confirm`, points permanently debited.
- Auto-expire after 15 minutes → auto-reverse.

**Option II:** Single one-shot redeem (current shape). POS handles reverse on payment failure.

If Option II only — that's acceptable; POS will use auto-reverse pattern (owner Q4=A).

---

## 3. Required Endpoint 2 — Reverse

### 3.1 Header
| Item | Value |
|------|-------|
| Method | `POST` |
| Path | `/pos/loyalty/reverse` |
| Auth | `X-API-Key` |

### 3.2 Request body
```json
{
  "restaurant_id":   "rest_xxx",
  "customer_id":     "bc92911c-...",
  "redemption_id":   "red_zzz",
  "order_id":        "ord_yyy",
  "reason":          "payment_failed",
  "idempotency_key": "a6e89b32-2b3a-4a1c-9b2e-7c5d3e8f1a23"
}
```

`reason` values: `payment_failed` | `order_cancelled` | `manual` | `refund`.

### 3.3 Successful response (HTTP 200)
```json
{
  "success":          true,
  "reversal_id":      "rev_aaa",
  "points_restored":  86,
  "new_total_points": 86,
  "message":          "Reversal complete"
}
```

### 3.4 Error responses

| HTTP | Code | Meaning |
|------|------|---------|
| 404 | `redemption_not_found` | `redemption_id` unknown |
| 409 | `already_reversed` | (Treat as success — return existing reversal_id) |
| 409 | `idempotency_replay` | Return original response |
| 422 | `redemption_not_reversible` | E.g., already settled in CRM ledger past the reversal window |
| 500 | `internal_error` | Generic |

### 3.5 Atomicity & idempotency

Same contract as `/redeem` — full reverse only, no partial.

### 3.6 No partial reversal in Phase C

Phase C does NOT support partial refunds against partial redemptions. If owner requires partial later, that's a separate CR.

---

## 4. Additional CRM-Side Asks (Optional but Useful)

### 4.1 `loyalty_enabled` field in customer responses

`POST /pos/customer-lookup` and `GET /pos/customers?search=` currently return `tier`, `total_points`, `points_value` but do not carry `loyalty_enabled`. POS defaults to `true`. Please return the real value so per-customer disabled flags are honored.

### 4.2 `ratio_per_point` canonicalization

Today POS derives `ratio_per_point = points_value / total_points` when CRM doesn't return it explicitly. Please make `ratio_per_point` a first-class field in `customer.loyalty` so POS doesn't need to back-compute.

### 4.3 Max-usable cap

If your loyalty rules cap usage at e.g. 20% of bill, please return `max_usable_amount` or `max_usable_percent` in the customer lookup payload so POS can preview the actual cap. Today POS assumes the full `points_value` is redeemable.

### 4.4 Health endpoint (optional)

`GET /pos/loyalty/health` returning 200 OK lets POS probe at boot to decide whether the redeem feature flag should be on for this preview/instance. Not required.

---

## 5. POS-Side Integration Notes (for backend awareness)

- POS will populate `used_loyalty_point` and `loyalty_dicount_amount` in the bill-payment payload AFTER redeem succeeds, with the values returned by the redeem endpoint.
- POS will pass `loyalty_redemption_id` as a new field on the bill-payment payload so the order ledger can reference the redemption.
- On full order cancellation post-bill-payment, POS will fire `/pos/loyalty/reverse` with `reason='order_cancelled'` before completing the cancellation.
- Cashier double-click protection is handled client-side via `disabled` state, but idempotency on the backend is still required as a safety net for network retries.

---

## 6. CRM-Team Checklist

Please tick off when the following are ready:

- [ ] `POST /pos/loyalty/redeem` endpoint live in staging with the exact request/response shape above
- [ ] `POST /pos/loyalty/reverse` endpoint live in staging
- [ ] Idempotency contract documented and enforced
- [ ] Atomicity contract verified — failure leaves `total_points` unchanged
- [ ] Reservation semantics decision: Option I (reserve/confirm) or Option II (one-shot redeem)
- [ ] Sample curl examples + Postman collection delivered to POS team
- [ ] One sample test customer in staging with redeemable points
- [ ] `loyalty_enabled` field added to customer responses (Section 4.1)
- [ ] `ratio_per_point` canonicalized in customer lookup payload (Section 4.2)
- [ ] Max-usable cap decision documented (Section 4.3)

---

## 7. Open Questions for CRM Team

1. Do you support reservation (`reserve → confirm`) semantics, or one-shot redeem only?
2. What is the default reversal window? (POS should not attempt reverse beyond this.)
3. Is there a daily / per-bill cap on redemption amount per restaurant?
4. Does the ledger handle CRM-side accruals on the same order that has a redemption? (i.e., can a customer earn AND redeem in the same transaction?)
5. What is your turnaround estimate for these two endpoints?

---

## 8. Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| POS Frontend Lead | (pending) | 2026-05-23 | Sent |
| CRM Backend Lead | (pending) | — | Awaiting reply |
| Restaurant Owner | (pending — Phase C owner approval Q1–Q8 also outstanding) | — | Awaiting |

---

**End of BUG-108 Loyalty Phase C Backend API Handoff.**
