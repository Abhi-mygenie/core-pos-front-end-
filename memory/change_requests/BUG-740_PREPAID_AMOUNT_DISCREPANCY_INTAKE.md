# BUG-740 — Prepaid placement saves/credits a higher amount than submitted

**Registered:** 2026-11-20
**Type:** BUG
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

On a **prepaid** order placement, the amount the POS submits does **not** match the amount the order is saved/credited with. Observed during CR-527/BB-09 backend verification on preprod:

- **Placement submitted:** ₹127.00
- **Order saved as:** ₹132.71
- **TAB credit created:** ₹132.71 (matches the inflated saved amount)

The **postpaid** path for the same scenario was correct (saved and credited ₹127.00). So the discrepancy is specific to the **prepaid placement** flow. The ₹5.71 gap (~4.5%) is consistent with an extra charge (service charge / tax) being applied to the saved amount but not reflected in the submitted payment amount — source (frontend `placeOrder` totals vs backend save) to be confirmed at Investigation.

**Impact:** the customer/credit-holder is charged/credited more than billed → money correctness + credit-ledger integrity.

---

## 2. Classification

- **Type:** BUG
- **Severity:** P0 — money is wrong (per Intake rubric). Owner may downgrade to P1 if treated as non-blocking.
- **Risk:** CRITICAL (billing / payment / credit amount)
- **Area:** Payments / Coupons / Credit
- **Fast Lane:** NOT eligible (money logic)

---

## 3. Duplicate Check

- **Result: DISTINCT.** Not a duplicate of BUG-666 (CPP split-GST 1-paisa) or BUG-684 (cart Collect-Bill ₹1 round-off display). Those are display/rounding issues; this is a **prepaid save/credit amount inflation** of ₹5.71.
- **Relates to:** CR-527/BB-09 (observed during its verification), CR-483 (`received_amount` for prepaid).

---

## 4. Evidence

- **Source:** AGENT-DISCOVERED (backend handoff `backend_replies/CR-527_BB-09_FRONTEND_HANDOFF_2026-11-20.md`, "Verification" section).
- **Confidence:** CONFIRMED on preprod (backend-reported readback).
- **Repro data (preprod):**
  - Restaurant: **672**
  - Order: **1578984** · Bill **000823** · flow **Prepaid TAB** · submitted ₹127 → saved/credited ₹132.71
  - Control (correct): Order **1578985** · Bill **000824** · flow **Postpaid→TAB** · ₹127 throughout
- **Steps to reproduce:** place a prepaid order for a known item total of ₹127 on restaurant 672 → observe saved `order_amount` and the TAB credit row amount = ₹132.71.

---

## 5. Blast Radius (quick estimate)

- `src/api/transforms/orderTransform.js` — `placeOrder` / `placeOrderWithPayment` payload (`calcOrderTotals`, `received_amount` CR-483, `payment_amount`).
- Possibly backend order-save (saved `order_amount` differs from submitted) — confirm at Investigation.
- **Estimated scope:** SMALL–MEDIUM (1–2 FE files) if frontend; otherwise BACKEND.
- **Hotspot:** `orderTransform.js` (R5) — YES.

---

## 6. Open Questions

- OD-740-01: Is the ₹5.71 a **service charge** or a **tax** component added to the saved amount but omitted from the submitted `payment_amount`/`received_amount`?
- OD-740-02: Is the inflated amount computed **frontend** (`placeOrder` totals) or **backend** (order-save re-calculation)?
- OD-740-03: Expected behaviour — should prepaid saved/credit amount equal the **submitted payment amount**, or the **billed total incl. charges**? (defines whether FE submit is wrong or backend save is wrong)

---

## 7. Code Reality

- **Status:** NEEDS INVESTIGATION. Prepaid placement amount path exists (`orderTransform.placeOrder` L1076; `received_amount` CR-483 L1121). No existing fix for a prepaid save/credit mismatch.

---

## 8. Assignee

- **Proposed:** **Gyan** (Area = Payments/Credit AND suspected backend-blocked — saved amount differs server-side). Routing reason: "any other area + backend-blocked → Gyan". If Investigation shows the frontend submits the wrong amount → reassign **Abhishek**.
- *Owner to confirm.*

---

## 9. Next

Gate 2 → **INVESTIGATION** (curl-probe prepaid placement on restaurant 672: compare submitted payload `payment_amount`/`received_amount`/`order_amount` vs saved order vs TAB credit row) to localise FE vs backend before planning.
