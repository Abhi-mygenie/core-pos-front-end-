# BUG-680 — Impact Analysis (Gate 2)

**Role:** PLANNING (Gate 2 — Impact Analysis ONLY; no Implementation Plan)
**Date:** 2026-11-22 · **Author:** E1
**Item:** BUG-680 — Order discount not reflected on Dashboard / Order Entry / Cart (`order_amount` shown pre-discount)
**Priority:** P0 · **Sprint:** `nov_cr_batch` · **Assignee:** Abhishek
**Intake:** `change_requests/BUG-680_ORDER_DISCOUNT_NOT_ON_DASHBOARD_INTAKE.md` (RE-INTAKE 2026-11-22)
**Backend status:** DONE & live-verified — `handover/CR-527_BUG-680_BACKEND_HANDOVER.md` Part B + `investigations/INV-CR527_BUG680_BACKEND_VERIFICATION_2026-11-21.md`

---

## Header — Code Reality + Conflict Pre-Check

- **Code Reality: PARTIAL.** The discount apply/unapply flow already exists (`CollectPaymentPanel` → `applyOrderDiscount`) but is wired to the **v1** endpoint that does NOT recalculate `order_amount`. The post-discount display on Dashboard/OrderEntry/Cart and the v2 switch are **NOT STARTED**.
- **Conflict Pre-Check:** see §6. Shared-file awareness on `OrderCard.jsx` (CR-527, CR-525 both GATE_5A, QA pending) — line-disjoint, parallel-safe.

---

## 1. Risk Classification

- **Registered (intake): HIGH (financial display).**
- **PLANNING upgrade → CRITICAL** (agent-upgraded, allowed per v0.7 Risk table; rationale below). **Owner approval + E2E money regression required before Gate 4.**
- **Rationale for upgrade:** the fix is not display-only. `applyOrderDiscount` is a **single shared service** and switching its endpoint v1→v2 (§3) changes the **discount write/allocation behaviour** for *every* discount apply/unapply across the collect-payment flow:
  - Backend **E1 behaviour change**: a **fixed** order discount is now re-spread **pro-rata across all active items on every recalculation** (previously single-item). This changes per-line `discount_on_food` → **per-line GST** → the **printed bill** and **settlement** math.
  - Backend **R behaviour change**: `discount_amount:0` of *any* type now fully clears.
  → Because this touches discount allocation, line GST, bill print and settlement, it falls in the CRITICAL trigger set ("money, tax, discounts, settlement"). Treat accordingly.
- **Fast Lane / planning-skip:** NOT eligible.

---

## 2. Data-Flow Trace (API → transform → component → UI)

### Current (broken)
```
CollectPaymentPanel.handleApplyDiscount (CollectPaymentPanel.jsx:422)
  + inline auto-unapply (CollectPaymentPanel.jsx:1603)
  + 5 call sites total (L429, L433, L449, L452, L1603)
    → orderService.applyOrderDiscount()           [orderService.js:240]
    → POST ORDER_DISCOUNT_ENDPOINTS.MANAGE         [constants.js:259]
       = /api/v1/vendoremployee/order-discount-manage
    → v1 stores order_discount_json config; DOES NOT recalc order_amount   ← ROOT CAUSE

Backend running-orders list → order_amount = PRE-discount
    → orderTransform.fromAPI.order:228  amount = parseFloat(api.order_amount)   [pre-discount]
       (also parses: discount L239 = restaurant_discount_amount;
                      discountValue L241 = discount_value;
                      discountType L242 = discount_type||order_discount_type)
    → OrderCard.jsx:532       ₹{order.amount}                 [pre-discount] ❌
    → OrderEntry.jsx:1227-28  total = orderFinancials.amount   [pre-discount] ❌ (Collect-Bill button)
    → CartPanel.jsx (placed)  authoritative total              [pre-discount] ❌

CollectPaymentPanel bill summary → computes manualDiscount/presetDiscount LOCALLY → correct ✅ (panel only)
```
**BREAK POINT:** `constants.js:259` — the apply call hits v1, which never mutates `order_amount`. Everything downstream reads the un-mutated `order_amount`.

### After fix (v2 switch)
`POST /api/v2/vendoremployee/order/order-discount-manage` recalculates `order_amount` + `restaurant_discount_amount` and **propagates to the running-orders list** (backend live-verified: order `1579043` 1717→1546 @10%; order `#000020` 100→85 @15% for role_name=Manager **and** Owner — `INV-CR527_BUG680_COMPLETION_PLAN_AND_BACKEND_GAPS_2026-11-21.md`). Then `order.amount` (already `parseFloat(api.order_amount)`) auto-shows the discounted number in all three consumers — **no transform change needed**.

---

## 3. Root Cause

`ORDER_DISCOUNT_ENDPOINTS.MANAGE` (`constants.js:259`) points at **v1** `order-discount-manage`, which persists the discount as a config object only and never recalculates `order_amount`. The three display surfaces read `order_amount` from the running-orders list, so they show the pre-discount total. The CollectPaymentPanel appears correct only because it computes the discount locally for its own bill summary. The backend fix (recalc + propagate) lives on **v2**; the FE never switched.

---

## 4. Affected Files, Lines, Risks (scope PREVIEW — exact edits are Gate 3, not here)

| # | File | Area | Change intent | Risk |
|---|------|------|---------------|------|
| A | `src/api/constants.js` | L259 `ORDER_DISCOUNT_ENDPOINTS.MANAGE` | Repoint v1 → `/api/v2/vendoremployee/order/order-discount-manage` | **CRITICAL** — flips write/allocation behaviour for all 5 callers |
| B | `src/components/cards/OrderCard.jsx` | near amount span L531-533 | Add net-new discount line/badge from `order.discount`/`order.discountValue`/`order.discountType` | MEDIUM (net-new UI) |
| C | `src/api/services/orderService.js` | `applyOrderDiscount` L240-248 | (likely NO change — send-map `'flat'→'fixed'` L244 already correct; confirm v2 accepts same body). Possible error handling for 422/404/401. | LOW |

**Downstream consumers that auto-correct via `order.amount` (VERIFY-ONLY, no edit expected):**
- `OrderEntry.jsx:1227-1228` — Collect-Bill button `total = orderFinancials.amount` (R5 hotspot, read-only verify).
- `CartPanel.jsx` placed-order authoritative total (R5 hotspot, read-only verify).

**Transform:** `orderTransform.js` already parses `amount`, `discount`, `discountValue`, `discountType` — **WILL NOT touch.**

---

## 5. Key Risks / Edge Cases (must be addressed in plan/QA)

1. **Shared-endpoint blast (CRITICAL).** The v1→v2 switch is a single-line constant change but affects **all 5 discount call sites** (preset apply/unapply L429/L433, manual apply/unapply L449/L452, inline auto-unapply L1603). The CollectPaymentPanel's **local** bill-summary math (`manualDiscount`/`presetDiscount`, per-line GST) must be re-verified to still agree with the backend's v2 recalc — otherwise the panel shows one total and the dashboard/bill shows another.
2. **Fixed-discount pro-rata (backend E1 change).** Apply a **fixed** ₹ discount, then add an item → backend now re-spreads pro-rata across lines (per-line GST changes). Verify the panel, OrderCard, printed bill and settlement all agree after re-spread. (Backend example: ₹20 on ₹100, add ₹100 → 10/10, total 180.)
3. **Remove-path type (completion-plan NEW finding 3).** v2/B1 now clears a zero of any type, so the old "must match applied type" bug is backend-fixed. Still recommend the FE send the **currently-applied** `discount_type` (read from order) on unapply as a defensive guardrail. Current code sends `discountType || 'percent'` (L449/L1603) and hardcodes `'percent'` on the preset path (L429, OK since presets are %).
4. **No immediate refresh after apply.** `CollectPaymentPanel` does **not** call a refetch or emit a socket after `applyOrderDiscount`. The discounted `order_amount` reaches the dashboard tile via existing `useOrderPollingReconciliation` polling / socket update, and the panel re-seeds reactively (`initialDiscount`, BUG-595 L417). Decide whether an explicit refresh-on-apply is in scope (OD-680-03).
5. **`discountType` value shape.** `orderTransform.js:242` yields `'Percent'` / `'Amount'` (capitalized, BUG-659) from the running-orders list. The OrderCard badge must format by shape (percent → `−{discountValue}%`, amount → `−₹{discount}`).
6. **Discount display element is net-new on OrderCard** (no existing discount UI there) → needs format decision (OD-680-02).

---

## 6. Conflict Pre-Check (Step 1)

| File | Recent modifiers (FILE_OWNERSHIP) | Status | Verdict |
|------|-----------------------------------|--------|---------|
| `constants.js` | BUG-599 (2026-10-21, added `aggregatorOrders` to `API_LOADING_ORDER`) | shipped | No conflict — different block (L458 vs L259). |
| `OrderCard.jsx` | **CR-527** diner chip (2026-11-21), **CR-525** showCollect/Bill block (2026-11-19), BUG-573 variant parser (2026-10-21) | CR-527/CR-525 **GATE_5A (QA pending)** | **RELATED / shared-file.** Edits line-disjoint: CR-527 = header-name diner chip; CR-525 = Bill button block (L123/465/1061/1241); our change = amount span discount line (L531-533). Parallel-safe; coordinate single PR; re-verify anchors at HEAD before Gate 3 edits. |
| `orderService.js` | BUG-538 (added `applyOrderDiscount`) | shipped | No conflict (change is the endpoint const, not this fn — unless C adds error handling). |
| `OrderEntry.jsx` / `CartPanel.jsx` | BUG-746/744/684 etc. (recent, active) | GATE_4/5 | **Read-only verify** in this item — no edit → no lock needed. |

**registry check:** no *other* open item mutates `constants.js:258-260` or the OrderCard amount span. CR-527/CR-525 share `OrderCard.jsx` but at different regions.

---

## 7. Owner Decisions (raise before Gate 3 / Gate 4)

- **OD-680-02 — OrderCard discount display format:** (a) compact badge `−₹X` / `−X%` next to amount **(recommended)**; (b) inline line "Disc −X% · now ₹Y"; (c) struck original + discounted.
- **OD-680-03 — Refresh after apply:** (a) rely on existing socket/polling (no extra code) **(recommended)**; (b) add explicit order refetch on apply.
- **OD-680-04 — Remove-path guardrail:** (a) leave as-is (backend B1 clears any type); (b) send currently-applied `discount_type` read from order **(recommended, cheap/defensive)**.
- **OD-680-05 — Risk/regression (CRITICAL):** confirm the mandatory E2E money regression scope before Gate 4 GO: apply % + apply fixed + add item (pro-rata) + unapply + **print bill** + **settle**, verifying panel = OrderCard = bill = settlement across Owner + Manager roles.

---

## 8. Business-Rule Guardrails (Rule R3 — not guessing)

- Do **not** assume the v2 body shape beyond the backend contract (`{order_id:int, discount_amount:number, discount_type:"percent"|"fixed", discount_note?}`, handover A/B). Send-mapping `'flat'→'fixed'` already matches (orderService L244).
- Do **not** alter CollectPaymentPanel's discount capture/validation (BUG-614/615/619/595) as part of this item — scope is the endpoint switch + display only.

---

## 9. Scope Lock (declared for Gate 3)

- **Files WILL change:** `constants.js` (A, required), `OrderCard.jsx` (B, required), `orderService.js` (C, only if error-handling added).
- **Files WILL NOT touch:** `orderTransform.js`, `OrderEntry.jsx`, `CartPanel.jsx` (verify-only), CollectPaymentPanel capture/validation, socket handlers, contexts, settlement/print builders.

---

## 10. Gate 2 Exit

```
Planning complete (Gate 2 — Impact Analysis): BUG-680
Stage: Impact Analysis
Code reality: PARTIAL (apply on v1; v2 switch + post-discount display NOT STARTED)
Risk: HIGH → upgraded CRITICAL (shared endpoint switch changes discount allocation / line GST / bill / settlement) — owner approval + E2E money regression required
Root cause: constants.js:259 MANAGE → v1 (no order_amount recalc); v2 recalc exists + verified
Files WILL change: constants.js, OrderCard.jsx, (orderService.js maybe)
Files WILL NOT touch: orderTransform.js, OrderEntry.jsx, CartPanel.jsx (verify-only), CPP capture/validation, sockets
Owner decisions: OD-680-02 (display format), OD-680-03 (refresh), OD-680-04 (remove-path), OD-680-05 (CRITICAL regression scope)
Backend: DONE & live-verified — no backend ask
Next: owner answers ODs → "Gate 3 GO" → Implementation Plan (+ Verification Matrix)
```
