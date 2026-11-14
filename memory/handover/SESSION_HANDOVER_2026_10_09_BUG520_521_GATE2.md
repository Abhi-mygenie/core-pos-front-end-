# SESSION HANDOVER — 2026-10-09 (BUG-520 + BUG-521 Gate 2)

**Date:** 2026-10-09 (second session)
**Role:** PLANNING (Gate 2 only — stopped as instructed)
**Registry items touched:** BUG-520 (GATE_2_IMPACT_ANALYSIS), BUG-521 (GATE_2_IMPACT_ANALYSIS)

---

## 1. WHAT WAS DONE THIS SESSION

- Read AGENT_PROMPT_ALPHA.md, SESSION_HANDOVER_2026_10_09_BUG516_519_IMPL.md
- Reviewed investigation findings from previous turn (BUG-519 implementation issues)
- Read `fe_discount_curls.md` (API contract for food/room discount payload)
- Read `collectBillExisting` in orderTransform.js to verify actual payload construction
- Read `CollectPaymentPanel.jsx` to confirm `total` prop is unused in display
- Registered BUG-520 + BUG-521 (inline intake for R0 compliance)
- Wrote Gate 2 Impact Analysis for both bugs
- **STOPPED at Gate 2 — did not write Implementation Plans**

---

## 2. BUGS REGISTERED + GATE 2 STATUS

### BUG-520 (P1/CRITICAL/R6 — financial payload)
- **Sub-A:** `handlePaid` food discount block (L334–339) sends `order_discount` + `order_discount_type` but is **missing** `discount_value` (the % half value) and `discount_type` — required by API contract per `fe_discount_curls.md` §6
- **Sub-B:** When "Both" is active AND cashier also applies CollectPaymentPanel's ADJUSTMENTS > Discount, our `payload.order_discount = foodDiscountRs` overwrites `collectBillExisting`'s `order_discount` — CPP's manual food discount is silently lost
- **OD-520-01 OPEN:** When Both active + CPP manual discount set: Option a (room discount food side only) / Option b (CPP wins) / Option c (stack). **Recommendation: a**
- **Scope:** 1 file, ~8 lines in handlePaid only. Parallel-safe with BUG-521.

### BUG-521 (P2/MEDIUM — UX feedback)
- BUG-519 E-519-3 removed the `{foodDiscountRs > 0 && <div data-testid="bill-fnb-discount-preview">}` block from `Statement`
- When "Both" is selected: left shows "Room discount: −₹255" ✅ but food side "F&B (split): −₹17" shows NOWHERE
- Cashier can't see the food discount is being applied → reports "not applied"
- **OD-521-01 OPEN:** Restore preview to RIGHT panel (inside RoomDiscountControls) or LEFT panel (Statement). **Recommendation: a (right panel)**
- **Scope:** 1 file, RoomDiscountControls component + call site only. Parallel-safe with BUG-520.

---

## 3. OPEN OWNER DECISIONS

| ID | Bug | Question | Recommendation | Impact on Gate 3 |
|---|---|---|---|---|
| OD-520-01 | BUG-520 | Both + CPP manual discount: which takes priority? (a=room discount only / b=CPP wins / c=stack) | **a** | BLOCKS gate 3 for BUG-520 Sub-B |
| OD-521-01 | BUG-521 | F&B preview location: right panel inside RoomDiscountControls (a) or left panel in Statement (b)? | **a** | BLOCKS gate 3 for BUG-521 |

**If owner answers OD-520-01=a + OD-521-01=a → Gate 3 GO is simple (no structural change needed)**

---

## 4. WHAT IS NOT A BUG (CLEARED DURING INVESTIGATION)

- **`grant_amount` dropping room balance** — CLEARED. In collect-bill path, `grant_amount = fbOnlyTotal` (F&B only) is correct by design (BUG-484). Room balance is closed by `paid_room:"yes"`. Not a bug.
- **`total` prop unused in CollectPaymentPanel** — CONFIRMED design gap, not a bug. CollectPaymentPanel computes its own Food Total from cartItems. The `total` prop doesn't affect display. This is pre-existing and not fixable without modifying CollectPaymentPanel (R5 hotspot).
- **"Two discount boxes"** — NOT a bug. ROOM DISCOUNT section + CollectPaymentPanel ADJUSTMENTS > Discount are separate mechanisms by design. BUG-521 fix will make "Both" mode's food side visible inside the ROOM DISCOUNT section, reducing confusion.

---

## 5. IMPACT ANALYSIS DOCUMENTS

| Bug | Document |
|---|---|
| BUG-520 | `impact/BUG-520_IMPACT_ANALYSIS.md` |
| BUG-521 | `impact/BUG-521_IMPACT_ANALYSIS.md` |

---

## 6. NEXT AGENT BOOT SEQUENCE

```
Last session (2026-10-09 session 2): BUG-520+BUG-521 Gate 2 complete. 
Two ODs open. Gate 3 BLOCKED on owner answers.

STEP 0: Owner gives OD answers + "Gate 3 GO" → PLANNING agent writes Implementation Plans
  IF OD-520-01=a + OD-521-01=a → Gate 3 for BUG-520+BUG-521 (simple, 1 file total, ~15 lines)
  
PLANNING boot for Gate 3:
  1. Read this handover
  2. Read impact/BUG-520_IMPACT_ANALYSIS.md + impact/BUG-521_IMPACT_ANALYSIS.md
  3. Lock ODs → write Implementation Plans
  4. STOP — await Gate 4 GO before any code
```

---

## 7. ENVIRONMENT

| Service | Status |
|---|---|
| Frontend | RUNNING (webpack compiled, 0 new warnings) |
| All BUG-516..519 code | Live on pod |
