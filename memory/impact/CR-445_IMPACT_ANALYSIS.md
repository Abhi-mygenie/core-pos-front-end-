# CR-445 (+CR-058) — Whole-Order Complimentary in Payment Methods — Impact Analysis (Gate 2) — 2026-11-14

Code Reality: PARTIAL — item comp exists (CPP checkbox, MarkCompModal, `is_complementary`, `complementary_reason`). Order-level comp today = "Complementary 100%" discount preset (profile `restaurant_discount_type`, CPP L1525-1530). No comp entry in payment-method rail.
Risk: CRITICAL (bill total, settlement, reports; R6). Backend-blocked: PARTIAL (contract).

## Owner decision (locked)
Whole-order Complimentary option inside payment-methods list. Reason required. PIN depends on right — detail at impact. Comp count in existing Discount report (comp section).

## Findings
- Payment rail built from `paymentTypes` (profile `payment_types`) + restaurant flags (CPP L88-130). Adding "Complimentary" = FE-synthetic method unless backend adds a type.
- Discount report (`DiscountReportMockup.jsx`, `fetchInsightsDiscounts`) already has a `comp` bucket (daily + total).
- Item comp lines are sent with price 0 and `complementary_price` (orderTransform buildCartItem L773-794).

## Open owner/backend decisions
- OD-445-A: how is whole-order comp saved — (a) every line marked comp (item-comp path, reason on each line), (b) 100% discount preset, or (c) new payment method "complimentary"? Affects reports + GST. OPEN (backend + owner).
- OD-445-B: PIN detail — comp right (`complementary_food`) alone enough, or CR-494 comp PIN/threshold also applies to whole-order comp? OPEN.
- OD-445-C: whole-order comp of a room order / credit (TAB) customer allowed? OPEN.

- Owner 2026-11-14 round 3: **OD-445-A = b — whole-order comp saved as the 100% discount preset** ("Complementary 100%", `restaurant_discount_type`). Report impact: counted in Discount report as discount (comp section mapping to confirm with backend).

## Backend asks
- B-445-1: contract for whole-order comp (per OD-445-A) and how it is counted in Discount report comp section.
