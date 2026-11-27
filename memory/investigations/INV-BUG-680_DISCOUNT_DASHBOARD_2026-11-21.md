# Investigation Report — Discount applied in Collect Payment not reflected on Dashboard (BUG-680)

**Role:** INVESTIGATION (Role 6) — read-only, NO application code changed
**Date:** 2026-11-21
**Item:** BUG-680 (registry: `GATE_1_INTAKE_COMPLETE — OD LOCKED`, OD-680-01 = Option B / backend)
**Confidence:** HIGH (FE code-traced + live preprod probe)
**Steps used:** 6/10
**Account:** owner@cafe103.com / Qplazm@10 (preprod)

---

## 1. Summary
- **Matches the owner's report exactly:** a discount applied in `CollectPaymentPanel` (e.g. 50% → Grand Total ₹105 in the screenshots) is correct inside the payment panel only. The **Dashboard order tile (₹209)**, the **Order Entry "Collect Bill ₹209" button**, and the **CartPanel total** all still show the **pre-discount** amount.
- **Root cause (two independent FE gaps):**
  1. **No code shipped.** BUG-680 is still at Gate 1 — there are **zero `BUG-680` code markers** in `frontend/src`. The fix was never implemented.
  2. **Apply path + display path both pre-discount:** `applyOrderDiscount` still calls the **v1** endpoint `/api/v1/vendoremployee/order-discount-manage` (`constants.js:259 MANAGE`), which stores the discount as config and does **not** recalc `order_amount`; and `OrderCard.jsx:~526` renders `order.amount` with **no discount line at all**.
- **Classification:** FE_ARCHITECTURE_GAP (unimplemented) with backend V2 now available to support the fix.

## 2. Live Probe Finding (new this session)
`GET employee-orders-list` (the running-orders list that feeds the dashboard) **does return discount fields** on each order: `order_amount`, `restaurant_discount_amount`, `order_discount`, `discount_value`, `order_discount_type`, `order_discount_json`.
- The two live orders currently carry no discount (`discount_value: 0`), so a discounted readback couldn't be captured, but the **fields exist on the list payload** — the dashboard has the data it needs; it simply doesn't read/subtract/display it.
- A **v2** endpoint `POST /api/v2/vendoremployee/order/order-discount-manage` exists (per handoff `V2_ORDER_DISCOUNT_FRONTEND_HANDOFF_2026-11-20.md`) and recalculates `order_amount` + `restaurant_discount_amount`. The FE is **not wired to v2** anywhere (verified).

## 3. Data Flow Trace
```
CollectPaymentPanel → applyOrderDiscount() → POST v1 order-discount-manage
  → stores order_discount_json (config); order_amount NOT recalculated
Dashboard   OrderCard.jsx:~526  → ₹{order.amount}        → pre-discount ❌ (+ no discount line)
OrderEntry  OrderEntry.jsx:~1223 → orderFinancials.amount → pre-discount ❌
CartPanel   CartPanel.jsx:~512   → authoritativeTotal     → pre-discount ❌
CollectPaymentPanel                → recomputes locally     → correct ✅ (only here)
BREAK POINT: v1 apply does not mutate order_amount; OrderCard ignores restaurant_discount_amount.
```

## 4. Evidence Artifacts (/app/memory/evidence/BUG-680/)
- `running_orders.json` — live list, HTTP 200, discount keys present on orders (`order_amount`, `restaurant_discount_amount`, `order_discount_json`, …)
- Code refs: `constants.js:259` (v1 MANAGE), `orderTransform.js:225/236` (amount/discount parsed), `OrderCard.jsx` (renders amount, no discount) — consistent with prior reports INV-BUG-680_V2 (2026-11-20) and INV-BUG-DISCOUNT (2026-11-17).

## 5. Recommendation
- **Classification:** FE_FIX (Option B wiring), per locked OD-680-01.
- **Scope (small-to-medium FE):**
  1. Switch `applyOrderDiscount` to the **v2** endpoint so `order_amount` / `restaurant_discount_amount` are recalculated server-side (or confirm backend aliases v1→v2).
  2. Make `OrderCard` headline amount reflect post-discount `order_amount` and add a discount indication (fields already on the transformed `order`: `discount`, `discountValue`, `discountType`).
  3. Optional parity: `OrderEntry.jsx:~1223` Collect-Bill button + `CartPanel.jsx:~512`.
- **Risk:** HIGH (financial display), P0 → **Planning-skip NOT eligible.** Route to PLANNING Gate 2 for the Option B implementation plan.
- **Before coding:** confirm with a live discounted order that the running-orders list returns the recalculated `order_amount` after a v2 apply (couldn't force a discounted order read-only this session).

## 6. Retroactive Candidates
None — no BUG-680 code exists.
