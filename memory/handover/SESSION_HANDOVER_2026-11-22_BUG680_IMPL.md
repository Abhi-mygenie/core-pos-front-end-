# Session Handover — 2026-11-22 (E1)

**Agent:** E1 (main) · **Role sequence this session:** INVESTIGATION (suggest) → INTAKE → PLANNING G2 → PLANNING G3 → IMPLEMENTATION (Gate 4 GO)
**Item:** BUG-680 — Order discount not reflected on Dashboard / Order Entry / Cart (P0, CRITICAL financial)
**Env:** preprod (`REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`), RID 69 · webpack clean, HTTP 200

---

## 1. Shipped (GATE_5A_IMPLEMENTED)
Root cause: `api/constants.js:259` `MANAGE` pointed at **v1** `order-discount-manage` (stored config only, never recalculated `order_amount`) → Dashboard/OrderEntry/Cart all showed pre-discount totals. Backend v2 recalc was DONE & live-verified; FE never switched.

- **E1** `api/constants.js:259` — v1 → `/api/v2/vendoremployee/order/order-discount-manage` (single switch point → all 5 `applyOrderDiscount` call sites; body already matched v2 contract).
- **E2** `components/cards/OrderCard.jsx` — discount badge after amount span (`−X%`/`−₹X`, `data-testid=order-discount-badge-<id>`); amount span auto-shows discounted `order.amount`.
- **E3** `components/order-entry/CollectPaymentPanel.jsx` L449 + L1603 — unapply sends currently-applied type (OD-680-04=b guardrail).
- **E4** `__tests__/api/orderDiscountEndpoint.bug680.test.js` — v2 endpoint guard (6/6 PASS with constants.test).

NOT touched (verify-only / already correct): `orderTransform.js`, `OrderEntry.jsx`, `CartPanel.jsx`, `orderService.js`, sockets, settlement/print, CPP capture/validation.

## 2. Gate 2/3 artifacts
- IA: `impact/BUG-680_IMPACT_ANALYSIS.md` (risk upgraded HIGH→CRITICAL — shared endpoint switch changes discount allocation/line GST/print/settlement).
- Plan: `plans/BUG-680_IMPLEMENTATION_PLAN.md` (13-check Verification Matrix; REG-1..3 money gate).
- RE-INTAKE: `change_requests/BUG-680_ORDER_DISCOUNT_NOT_ON_DASHBOARD_INTAKE.md`.

## 3. EXIT GATE — 5/5
registry.json (GATE_5A_IMPLEMENTED, nov_cr_batch) · BUG_TRACKER.md · FILE_OWNERSHIP.md · code markers `// BUG-680` · webpack 0 new warnings (1 pre-existing `allDays`).

## 4. Next agent — pick up here
1. **QA Gate 5b** (testing_agent/browser, preprod RID 69, `owner@thegoankitchen.com`/`Qplazm@10`): V5-V9 in `handover/QA_HANDOVER_BUG-680_2026-11-22.md`.
2. **CRITICAL E2E money regression (owner smoke, MANDATORY):** REG-1 fixed pro-rata, REG-2 print, REG-3 settle, REG-4 coupon — verify CPP summary == OrderCard == bill == settlement.
3. OD-680-02/03/04/05 were planned on recommended defaults; owner can still override 02 (badge format) / 03 (refresh).

## 5. ODs applied (recommended defaults — owner-confirmable)
02 = compact badge · 03 = rely on existing poll/socket (no refetch) · 04 = (b) send applied type on remove · 05 = CRITICAL E2E regression at QA.

## 6. Not verified yet
Browser QA + money regression NOT run this session (requires authenticated preprod order with a discount + print/settle). Reported as GATE_5A_IMPLEMENTED, **not** QA-passed.
