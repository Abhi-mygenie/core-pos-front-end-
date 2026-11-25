# BUG-680 — Order Discount Not Reflected on Dashboard / Order Entry

**Registered:** 2026-11-17
**Type:** BUG
**Sprint:** nov_cr_batch
**Priority:** P0
**Risk:** HIGH (financial display — order totals shown incorrectly across dashboard + order entry)
**Status:** GATE_1_INTAKE_COMPLETE
**Client:** ALL
**Assignee:** Gyan (backend — recommended Option B) → Abhishek (FE if Option A chosen)
**Routing reason:** Backend `order_amount` never includes discount — backend fix is cleanest path

---

## 1. Description

When a staff member applies a discount in CollectPaymentPanel (e.g., 50% discount on a ₹116 order), the discount is correctly saved to the backend via `order-discount-manage` API and correctly shown inside the CollectPaymentPanel bill summary. However:

- **Dashboard tile** (OrderCard) still shows ₹116.24 (pre-discount total)
- **Order Entry "Collect Bill" button** still shows ₹116.24 (pre-discount total)
- **CartPanel total** still shows ₹116.24 (pre-discount total)

The customer-facing amount is correct only inside the payment panel — everywhere else the discount is invisible.

---

## 2. Classification

- **Type:** BUG
- **Severity:** P0 — Financial display incorrect across primary screens. Staff sees wrong amounts, could lead to billing confusion.
- **Risk:** HIGH — touches financial display on Dashboard (OrderCard.jsx), Order Entry (OrderEntry.jsx), and CartPanel.jsx
- **Area:** Dashboard / Order Entry / Financial Display
- **Fast Lane:** NOT eligible (multiple files, financial area)

---

## 3. Duplicate Check

| Checked Against | Result |
|----------------|--------|
| BUG-527 (Dashboard CPP check-in discount) | DISTINCT — BUG-527 is about ROOM discount on dashboard/CPP. This bug is about ORDER discount. |
| BUG-528 (Dashboard tile pre-discount balance) | DISTINCT — BUG-528 is about room balance tile. This is about order amount tile. |
| BUG-595 (Role-based discount not live in CPP) | DISTINCT — BUG-595 is about discount not live-updating in CPP. This bug is about discount never shown outside CPP. |
| BUG-492 (Checkout total doesn't reflect room discount) | DISTINCT — room checkout vs order discount on dashboard |
| CR-444 (Revenue report discounts) | DISTINCT — reporting vs display |

**Result: DISTINCT** — no existing item covers order discount not reflected on Dashboard/OrderEntry.

---

## 4. Evidence

- **Source:** AGENT-DISCOVERED (Investigation session 2, 2026-11-17)
- **Confidence:** CONFIRMED (code-traced, full data flow mapped)
- **Investigation report:** `investigations/INV-BUG-DISCOUNT_DASHBOARD_NOT_REFLECTING_2026_11_17.md`
- **Test account:** owner@mantri.com / Qplazm@10, Table T2, Order #001447
- **Screenshots:** User-provided — CollectPaymentPanel shows discount, Dashboard shows pre-discount amount

---

## 5. Root Cause

`order_amount` in the backend `running-orders` response is NEVER reduced by the discount. The discount is stored as a configuration object (`order_discount_json`) via `order-discount-manage` endpoint, but it does NOT mutate `order_amount`.

**Break point:** Backend stores discount as config, not as an amount mutation.

### Data flow:
```
CollectPaymentPanel → applyOrderDiscount() → POST /order-discount-manage
  → Backend stores: order_discount_json = { discount: 50, discount_type: 'percent' }
  → Backend does NOT change: order_amount (stays at pre-discount total)

Dashboard OrderCard.jsx:524 → ₹{order.amount} → pre-discount ❌
OrderEntry.jsx:1223 → total = orderFinancials.amount → pre-discount ❌
CartPanel.jsx:512 → authoritativeTotal = total → pre-discount ❌
CollectPaymentPanel → reads orderDiscountJson, computes locally → correct ✅
```

---

## 6. Blast Radius

- `OrderCard.jsx:524` — dashboard tile amount display
- `OrderEntry.jsx:1223-1227` — Collect Bill button amount
- `CartPanel.jsx:512` — cart total for placed orders
- Potentially: any other screen reading `order.amount` for display
- **Estimated scope:** MEDIUM (3-4 FE files if FE fix, or 1 backend change if backend fix)
- **Hotspot files touched:** OrderEntry.jsx (R5), CartPanel.jsx (R5)

---

## 7. Fix Options

| Option | What | Effort | Risk |
|--------|------|--------|------|
| **A. FE-only** | Read `orderDiscountJson`, compute deduction, subtract from `order.amount` wherever displayed | 3-4 FE files | MEDIUM — discount computation in multiple places |
| **B. Backend (recommended)** | Backend returns post-discount amount in `order_amount` after `order-discount-manage`, or adds `order_amount_after_discount` field | 1 backend change | LOW for FE — cleanest |
| **C. FE utility** | Centralize `getEffectiveAmount(order)` function, use everywhere | 3-4 FE files | MEDIUM — many consumers |

**Recommendation:** Option B — backend should include discount in `order_amount` or add new field. This is the single source of truth approach.

---

## 8. Open Questions

- OD-680-01: Option A (FE-only), Option B (backend fix), or Option C (FE utility)?
  - **Recommended:** Option B (backend)

---

## 9. Dependencies

- If Option B: Backend brief to Gyan for `order_amount` mutation or new field
- If Option A/C: No backend dependency, but touches R5 hotspot files

---

## 10. Related

- BUG-527 (room discount on dashboard — same page, different discount type)
- BUG-595 (role-based discount reactivity in CPP — same discount, different symptom)
- CR-444 (revenue report discounts — reporting side)

---

```
Intake complete: BUG-680
Classification: BUG, Severity: P0, Risk: HIGH
Duplicate check: DISTINCT
Evidence: code-traced + user screenshots (investigation report)
Blast radius: MEDIUM (3-4 FE files, 2 R5 hotspots)
Client: ALL
Assignee: Gyan (backend Option B) → Abhishek (FE if Option A)
Docs updated: change_requests/BUG-680_ORDER_DISCOUNT_NOT_ON_DASHBOARD_INTAKE.md
Next: Owner decides Option A/B/C → Planning Gate 2
```


---

# RE-INTAKE — 2026-11-22 (INTAKE role, E1)

**Trigger:** Backend for BUG-680 is **DONE & live-verified** (see `handover/CR-527_BUG-680_BACKEND_HANDOVER.md` Part B + `investigations/INV-CR527_BUG680_BACKEND_VERIFICATION_2026-11-21.md` + `investigations/INV-CR527_BUG680_COMPLETION_PLAN_AND_BACKEND_GAPS_2026-11-21.md`). The original intake recommended **Option B = backend fix**; backend has now shipped the recalc on the **v2** endpoint, so the remaining work is **FE-only**. Re-registering the FE scope (same ID, same P0/HIGH).

## R1. Decision update — OD-680-01 LOCKED = FE switch to v2 (was "backend Option B")
`POST /api/v2/vendoremployee/order/order-discount-manage` now recalculates `order_amount` + `restaurant_discount_amount` and **propagates to the running-orders list** that `OrderCard` consumes (proven live on preprod rest 69: order `1579043` 1717→1546 at 10%; order #000020 100→85 at 15% for role_name=Manager **and** Owner). **No backend gap remains for the dashboard display.**

## R2. Remaining FE scope (NOT STARTED)
1. **Switch apply call v1 → v2.** `api/constants.js:259` `MANAGE` currently points at `/api/v1/vendoremployee/order-discount-manage` (no recalc). Repoint `applyOrderDiscount` (`api/services/orderService.js:~228`) to the v2 path; body `{order_id:int, discount_amount:number, discount_type:"percent"|"fixed", discount_note?}`; handle 422/404/401.
2. **Render post-discount on the tile.** `OrderCard.jsx:~526` already renders `order.amount` (`orderTransform.js:225`) — once v2 is used this auto-shows the discounted number. Add a discount line/badge from already-parsed `order.discount` (`restaurant_discount_amount`), `order.discountValue`, `order.discountType`.
3. **Parity (same pre-discount bug):** verify `OrderEntry.jsx:~1223` (Collect-Bill button) and `CartPanel.jsx:~512` show the discounted total once the list returns the recalculated amount.
4. **Remove-path guardrail:** when clearing a discount, send the **currently-applied** `discount_type` (read from the order), not a hardcoded type. (Backend B1 now fully clears a zero of any type, but the FE guardrail is retained per the completion-plan "NEW finding 3".)

## R3. Code Reality — PARTIAL
- Apply flow EXISTS but on the stale **v1** endpoint (`api/constants.js:259`), apply button `discount-apply-btn` in `CollectPaymentPanel.jsx:1650`.
- Post-discount display + v2 switch + parity = **NOT STARTED**.
- No new transform field needed — all required data already parsed onto the `order` object.

## R4. Duplicate check — DISTINCT (re-intake of existing BUG-680)
- RELATED: **CR-527** (shares the `CR-527_BUG-680_BACKEND_HANDOVER.md` backend reply; different concern — diner capture), BUG-740 (prepaid amount discrepancy), BUG-527 / BUG-595 / CR-444 (prior related list).

## R5. Blast radius — SMALL–MEDIUM
- Primary edits: `api/constants.js`, `api/services/orderService.js`, `components/cards/OrderCard.jsx`.
- Parity verify: `OrderEntry.jsx` (R5), `CartPanel.jsx` (R5).
- Estimated scope: 3 edit files + 2 parity verify. Hotspots: OrderEntry.jsx / CartPanel.jsx (R5).

## R6. Risk + process
- **P0 / HIGH (financial display).** Fast Lane NOT eligible. Planning-skip NOT eligible → **full PLANNING Gate 2** (Impact Analysis), then Gate 3 → Gate 4 GO → IMPLEMENTATION → QA.

## R7. Client + Assignee
- **Client:** ALL.
- **Assignee:** **Abhishek** (frontend work, no longer backend-blocked — backend shipped). Routing reason updated from "Gyan (backend Option B)".

```
Re-intake complete: BUG-680
Classification: BUG, Severity: P0, Risk: HIGH
Duplicate check: DISTINCT (re-intake of existing ID)
Code reality: PARTIAL (apply on v1; v2 switch + post-discount display NOT STARTED)
Evidence: backend live-verified (INV + backend handover), prior investigation + screenshots
Blast radius: SMALL–MEDIUM (3 edit files + 2 R5 parity verify)
Client: ALL · Assignee: Abhishek (FE; backend done)
Docs updated: change_requests/BUG-680_ORDER_DISCOUNT_NOT_ON_DASHBOARD_INTAKE.md, registry.json, BUG_TRACKER.md
Next: PLANNING Gate 2 (Impact Analysis) — HIGH financial, no planning-skip
```

