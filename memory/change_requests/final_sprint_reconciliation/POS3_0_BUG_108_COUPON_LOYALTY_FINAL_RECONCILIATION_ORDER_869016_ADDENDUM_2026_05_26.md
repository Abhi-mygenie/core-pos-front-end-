# POS3.0 — BUG-108 Coupon + Loyalty Final Reconciliation — Order 869016 Addendum

**Date:** 2026-05-26 (afternoon — order 869016 live mapper audit)
**Sprint:** BUG-108 Coupon + Loyalty (final QA wave)
**Author:** QA + Documentation Agent (read-only)
**Status sticker:** `bug_108_coupon_loyalty_final_addendum_p1_backend_defect_found_2026_05_26`

> Supersedes the earlier LIVE QA addendum for the mapper-audit section.
> All other prior addendums remain valid as audit history.

---

## 1. What Changed Since Live Validate-Only Run

| Item | Live validate run | After order 869016 inspection |
|---|---|---|
| Backend mapper I-1 | NOT_RUN | **PASS** |
| Backend mapper I-2 | NOT_RUN | **PASS (inferred)** |
| Backend mapper I-3 | NOT_RUN | NOT_RUN (still — bill artifact needed) |
| Backend mapper I-4 | NOT_RUN | **PASS for V1**, partial V2/V3 |
| Backend mapper I-5 | NOT_RUN | **🔴 FAILED — P1 backend defect** |
| Coupon + Loyalty stacking (live) | Inferred from validate | **VERIFIED end-to-end on real order** |
| NG-07 (frontend copy) | Open low-priority | **Closed — FALSE POSITIVE** (L819 already has it) |
| NG-08 (CRM seed-data) | Open observation | **Closed — IGNORED per owner** |
| NG-10 (mapper field rename) | not detected | **Detected and closed informational** |

---

## 2. The One Real Defect — `loyalty_idempotency_key = null`

Order 869016 (preprod, restaurant 689, dine-in, postpaid cash) was
committed with both a coupon (`SEED_EDGE_STACKABLE`, −₹108.20) and
loyalty redemption (237 points / ₹237). The persisted `loyalty_info`
block reads:

```
{
  "loyalty_discount": 237,
  "loyalty_points_used": 237,
  "loyalty_idempotency_key": null,    ← should be "order_869016_loyalty"
  "updated_at": "2026-05-26 15:00:22"
}
```

Per the Phase C contract freeze
(`POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_API_CONTRACT_FREEZE_2026_05_23.md`),
the POS Backend is responsible for generating the idempotency key on
any loyalty-redeeming order. The frontend deliberately omits it
(`BUG108_FLAGS.loyaltyRedeemLive=false`).

### Severity
**P1.** Without the key, a retry of the CRM redeem call (e.g.,
network blip, POS retry, Laravel queue replay) will cause the customer
to be **debited twice** for the same redemption.

### Owner
POS Backend team. No frontend change can address this.

### Recommended fix
1. In the order-commit Laravel handler, before calling CRM
   `/pos/loyalty/redeem`, set:
   `loyalty_idempotency_key = 'order_' . $order_id . '_loyalty'`
   when `used_loyalty_point > 0`.
2. Persist the key on the order / loyalty_info row.
3. On idempotent replay, reuse the same key.
4. Add a backend test asserting the key is non-null whenever
   `used_loyalty_point > 0`.

### Verification after fix
Place a new order on restaurant 689 with `loyalty_points_used > 0`
and confirm `loyalty_info.loyalty_idempotency_key` matches the
expected shape.

---

## 3. End-to-End Stacking Verified Live

Order 869016 is the **first live commit** observed with both a coupon
and a loyalty redemption simultaneously:

| Component | Value |
|---|---|
| Coupon code | `SEED_EDGE_STACKABLE` |
| Coupon `stackable_with_loyalty` | `true` |
| Coupon discount on bill | ₹108.20 |
| Loyalty points used | 237 |
| Loyalty discount on bill | ₹237 |
| Total `discount_value` | ₹345.20 |
| `payment_status` | `paid` |
| `payment_type` | `postpaid` |
| `payment_method` | `cash` |
| `order_amount` (final) | ₹774 |

This corroborates the frontend stacking-guard implementation (where
`stackable_with_loyalty=false` would have blocked the validate call
with `STACKING_NOT_ALLOWED`). The stacking path is fully wired
end-to-end.

---

## 4. Reconciliation Outcome — Final v2

| Stream | Final status |
|---|---|
| Coupon V1A | CONFIRMED |
| Coupon V1B | CONFIRMED (code + live validate + live commit) |
| `couponLive` flag removal | CONFIRMED |
| Coupon V2 item/category | CONFIRMED (code + live validate); commit-side inferred PASS via mapper I-1 passthrough |
| Coupon V3-A time-window | CONFIRMED |
| Coupon V3-B BOGO/BXG | CONFIRMED |
| Coupon V3-C Every-Nth | CONFIRMED |
| Coupon + Loyalty stacking (live) | **CONFIRMED via order 869016** |
| Loyalty Phase B / C | CONFIRMED |
| Wallet | DEFERRED |
| QSR coupon UI | CONFIRMED (Full Billing only) |
| Room / Hotel coupon | CONFIRMED (inline mirror) |
| Coupon reversal | DEFERRED (CRM Phase 2) |
| Backend mapper I-1 | **PASS** |
| Backend mapper I-2 | PASS (inferred) |
| Backend mapper I-3 | NOT_RUN (bill artifact needed) |
| Backend mapper I-4 | PASS for V1 ; partial V2/V3 |
| **Backend mapper I-5** | **🔴 FAILED — P1 backend defect** |
| Frontend NG-07 / NG-08 / NG-10 | Closed (false positive / ignored / informational) |

---

## 5. Reconciliation Doc Linkages — final set

| Output | Path |
|---|---|
| Morning QA report (audit history) | `POS3_0_BUG_108_COUPON_V2_V3_QA_REPORT_2026_05_26.md` |
| Live validate-only QA report | `POS3_0_BUG_108_COUPON_V2_V3_QA_REPORT_LIVE_UPDATE_2026_05_26.md` |
| Morning mapper audit (audit history) | `POS3_0_BUG_108_BACKEND_MAPPER_AUDIT_REPORT_2026_05_26.md` |
| **Live mapper audit (order 869016)** | `POS3_0_BUG_108_BACKEND_MAPPER_AUDIT_REPORT_LIVE_UPDATE_2026_05_26.md` |
| Open gaps register (current) | `POS3_0_BUG_108_COUPON_LOYALTY_OPEN_GAPS_REGISTER_2026_05_26.md` |
| Morning reconciliation addendum (audit history) | `POS3_0_BUG_108_COUPON_LOYALTY_FINAL_RECONCILIATION_QA_ADDENDUM_2026_05_26.md` |
| Live validate-only addendum (audit history) | `POS3_0_BUG_108_COUPON_LOYALTY_FINAL_RECONCILIATION_LIVE_QA_ADDENDUM_2026_05_26.md` |
| **THIS** order-869016 reconciliation addendum | `POS3_0_BUG_108_COUPON_LOYALTY_FINAL_RECONCILIATION_ORDER_869016_ADDENDUM_2026_05_26.md` |

---

## 6. Single Final Recommended Next Action

**POS Backend team — P1 fix:**
Inject `loyalty_idempotency_key='order_{order_id}_loyalty'` (or
Phase-C-contract shape) in the order-commit Laravel handler before
calling CRM `/pos/loyalty/redeem`, then place one new test order on
restaurant 689 with loyalty redemption to verify.

Once verified, the BUG-108 sprint is **completely closed** apart from
the optional bill-print artifact capture (D-03 / I-3).

---

## 7. Final Verdict

`bug_108_sprint_code_complete_live_qa_passed_22_of_22_validate_4_of_5_mapper_PASS_1_P1_BACKEND_DEFECT_2026_05_26`

- 22/22 live validate scenarios PASS.
- 4/5 backend mapper items PASS (I-1 direct, I-2 inferred, I-4 V1).
- **1 P1 backend defect:** `loyalty_idempotency_key=null` on
  loyalty-redeeming orders.
- Coupon + Loyalty stacking VERIFIED end-to-end live on order 869016.
- NG-07, NG-08, NG-10 closed.
- **No POS Frontend code change in this entire QA wave.**
- **No `/app/memory/final/` file changed.**
- No new preprod orders placed by the agent (only inspected the
  owner-supplied order 869016).
