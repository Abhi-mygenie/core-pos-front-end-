# POS 3.0 BUG-108 — Owner Decision Matrix (Q1-Q6)

**Date:** 2026-05-22
**Paired with:** `POS3_0_BUG_108_COUPON_LOYALTY_WALLET_CRM_API_DISCOVERY_PLAN_2026_05_22.md`
**Purpose:** One-page tick-box sheet for the owner to sign off on the 6 critical decisions blocking BUG-108 implementation.

**Instructions:** Tick **one** option per question. Add notes in the comment column if a hybrid / phased answer is needed. Return this file (or its decisions) to unblock the next agent.

---

## Q1. Who owns the coupon master?

| Tick | Option | Implication |
|:---:|--------|-------------|
| [ ] | (a) POS backend owns catalog; CRM stores per-customer entitlement only | Settings panel becomes the source of truth; CRM only adds "which customers can use which codes" |
| [ ] | (b) CRM owns both catalog and entitlement; POS queries only | Simplest contract; campaigns managed in CRM admin UI |
| [ ] | (c) Hybrid — global codes in POS backend, customer-targeted codes in CRM | Most flexible; two endpoints to call on apply |

**Owner notes:**
> _____________________________________________________________________

---

## Q2. Coupon validation timing

| Tick | Option | Implication |
|:---:|--------|-------------|
| [ ] | (a) Apply-time only (1 API call) | Cheapest. Allows race conditions (expiry between apply and checkout, double-use across terminals) |
| [ ] | (b) Apply-time + final commit at PLACE_ORDER / BILL_PAYMENT | Defends against stale state. 2 API calls per order |
| [ ] | (c) Full lifecycle: apply → commit → reverse on cancel/unpaid | Production-grade; required if double-redemption is materially costly |

**Owner notes:**
> _____________________________________________________________________

---

## Q3. Loyalty redemption ratio

**Current code:** hardcoded 1 point = ₹1 in `CollectPaymentPanel.jsx:502-503`.

| Tick | Option | Implication |
|:---:|--------|-------------|
| [ ] | (a) Keep hardcoded 1:1 forever | No API; never changes; code release required to alter |
| [ ] | (b) Per-restaurant — add field to profile API | Per-outlet override. Simple. |
| [ ] | (c) Per-customer from `/pos/customers/{id}.loyalty` blob | Already returned by CRM (currently unused). Customer-specific. |
| [ ] | (d) Dynamic per-tier (Bronze 1:1 / Silver 1:1.2 / Gold 1:1.5 …) | CRM-driven; richest UX; requires CRM-side calculation |

**Owner notes:**
> _____________________________________________________________________

---

## Q4. When does a wallet debit become real?

| Tick | Option | Implication |
|:---:|--------|-------------|
| [ ] | (a) At apply (immediate reserve) | User can lose money if they back out of checkout |
| [ ] | (b) At PLACE_ORDER (debit on creation; refund on cancel) | Today's likely behavior. Needs reverse API. |
| [ ] | (c) At BILL_PAYMENT (only on settlement) | Safest. Race risk across terminals during edit window. |
| [ ] | (d) Two-phase: reserve at apply → commit at payment → release on timeout/cancel | Full reservation pattern. Most engineering effort. |

**Critical sub-question:** Has the backend team confirmed POS backend currently forwards `use_wallet_balance` to a CRM debit endpoint?
- [ ] Yes — confirmed working
- [ ] No — wallet payments today are silent fiction
- [ ] Unknown — needs backend team to confirm

**Owner notes:**
> _____________________________________________________________________

---

## Q5. Reversal handling on cancel / unpaid / payment-method change

| Tick | Option | Implication |
|:---:|--------|-------------|
| [ ] | (a) No reversal (debit is permanent) | Customer-service tickets on every cancel |
| [ ] | (b) Manual CRM admin reversal (POS only logs the event) | Acceptable if cancels are rare and a human always reviews |
| [ ] | (c) Automatic reverse-API calls on cancel-item / cancel-order / make-unpaid / change-payment | Production-grade. Requires 3 reverse endpoints. |

**Owner notes:**
> _____________________________________________________________________

---

## Q6. Customer-specific coupon entitlements

**Current schema slot:** `customer.coupons` is referenced (`CollectPaymentPanel.jsx:649`) but never populated.

| Tick | Option | Implication |
|:---:|--------|-------------|
| [ ] | (a) Inline in `/pos/customer-lookup` and `/pos/customers/{id}` | One fewer roundtrip; payload grows; OK for <10 coupons per customer |
| [ ] | (b) Separate `/pos/customers/{id}/coupons` endpoint | Cleaner; supports pagination + time filters; one extra call per checkout |
| [ ] | (c) Bulk `/pos/coupons/available?customer_id=…&order_total=…` | Server pre-filters by min-order & validity; enables "Suggested Coupons" chips above input |

**Owner notes:**
> _____________________________________________________________________

---

## Cross-Cutting Sign-Offs

### S1. Phase ordering OK?

The plan proposes **108-P0 (decisions) → P1 (read parity) → P2 (validate) → P3 (commit) → P4 (reverse) → P5 (polish)**, each independently deployable.

- [ ] OK as proposed
- [ ] Want to reorder / split / merge phases — see notes below

**Owner notes:**
> _____________________________________________________________________

### S2. Field-name lock-in OK?

POS payload uses snake_case fields like `loyalty_dicount_amount` (legacy misspelling) and `used_loyalty_point`. Renaming requires coordinated backend release and is **out of scope** for BUG-108.

- [ ] OK — keep existing field names
- [ ] Want to rename — schedule a separate coordinated change (NOT BUG-108)

### S3. Multi-terminal safety

Today, two cashiers settling the same customer simultaneously can overspend wallet / double-redeem points. Acceptable for now?

- [ ] Accept the risk for now; defer to a later sprint
- [ ] Must be solved in BUG-108 (will require optimistic locking / reserve semantics in chosen Q4 option)

---

## Returning This Sheet

Once ticked, the next agent will use these answers to produce:

1. **API contract document** — per-endpoint request/response shapes (only for endpoints the owner has decided are in scope).
2. **Frontend implementation plan** — file-level diffs, phase by phase.
3. **QA checklist** — analogous to BUG-104 Phase 2A QA Handoff.

**Until this sheet is returned, BUG-108 implementation does NOT start.**

---

**End of Owner Decision Matrix.**
