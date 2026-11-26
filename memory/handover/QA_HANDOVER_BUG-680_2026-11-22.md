# QA Handover — BUG-680 (Order discount reflects on Dashboard / Order Entry / Cart)

**From:** IMPLEMENTATION (E1) · **Date:** 2026-11-22 · **Risk:** CRITICAL (financial) · **Status:** GATE_5A_IMPLEMENTED
**Plan:** `plans/BUG-680_IMPLEMENTATION_PLAN.md` · **IA:** `impact/BUG-680_IMPACT_ANALYSIS.md`
**Backend:** DONE & live-verified (`handover/CR-527_BUG-680_BACKEND_HANDOVER.md` Part B)

## 1. What changed
- **E1** `api/constants.js:259` — discount apply endpoint v1 → **v2** `order-discount-manage` (recalculates `order_amount` + `restaurant_discount_amount`, propagates to the running-orders list).
- **E2** `OrderCard.jsx` — discount badge after the amount span (`−X%` / `−₹X`), `data-testid=order-discount-badge-<id>`; amount span now shows the discounted `order.amount`.
- **E3** `CollectPaymentPanel.jsx` L449 + L1603 — unapply sends the currently-applied discount type (guardrail).
- **E4** `__tests__/api/orderDiscountEndpoint.bug680.test.js` — v2 endpoint guard.

## 2. Self-test (done)
| Check | Result |
|---|---|
| Unit: `orderDiscountEndpoint.bug680` + `constants.test` | 6/6 PASS |
| webpack compile | clean (1 pre-existing `allDays` warning) |
| HTTP / app render | 200, login renders, no console crash |

## 3. QA test cases (browser — preprod RID 69, `owner@thegoankitchen.com` / `Qplazm@10`)
| # | Test | Steps | Expected | Severity if fail |
|---|------|-------|----------|---|
| V5 | % discount on dashboard | place order → CollectPayment → apply 10% → back to dashboard | OrderCard shows discounted ₹ + `−10%` badge (after poll/socket) | BLOCKER |
| V6 | Collect-Bill button parity | same order, reopen Order Entry | Collect-Bill button total = discounted | MAJOR |
| V7 | Cart parity | placed order cart | cart total = discounted | MAJOR |
| V8 | role parity | repeat V5 as Manager | same discounted amount (backend verified both roles) | MAJOR |
| V9 | remove path | apply %, unapply → revert; apply fixed, unapply → revert | order_amount + badge fully revert both cases | MAJOR |

## 4. CRITICAL E2E money regression (OD-680-05 — owner smoke, MANDATORY before Gate 6)
| # | Test | Expected |
|---|------|----------|
| REG-1 | fixed ₹20 on ₹100 item, add ₹100 item | per-line 10/10, total 180, line GST on 90/90; **CPP summary == OrderCard == bill** |
| REG-2 | apply discount → **print bill** | printed total == discounted total |
| REG-3 | apply discount → **settle/collect** | settled amount == discounted; audit/report reflect discount |
| REG-4 | discount + coupon | BUG-108 block/handling intact (no double-count) |

## 5. Registry Sync Confirmation
- Registry synced: YES · Item: BUG-680 · Sprint: nov_cr_batch · Status: GATE_5A_IMPLEMENTED
- EXIT GATE: 5/5 (registry, BUG_TRACKER, FILE_OWNERSHIP, code markers `// BUG-680`, compile clean)

## 6. Notes for QA
- Badge appears ONLY when `order.discount > 0`; a non-discounted order shows no badge (V4 by design).
- `discountType` from running-orders is `'Percent'`/`'Amount'` (capitalized) — badge handles both.
- Dashboard tile updates via existing polling/socket (OD-680-03=a — no explicit refetch added).
