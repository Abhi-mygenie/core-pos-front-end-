# Handover Note — POS3.1 BUG-111 Phase 2 (Next Session)

**From session:** 2026-05-27 (forked job continuation)
**To next agent:** Resume here for POS3.1 BUG-111 Phase 2 implementation + live test.

---

## TL;DR — Read This First

1. **POS3.1 BUG-111 Phase 1 is SHIPPED & BUILD-CLEAN.** Grand Total on placed QSR orders now correctly displays the server-authoritative amount (₹675) instead of locally-recomputed ₹1,200+. Owner confirmed visually.

2. **Phase 2 is FULLY DOCUMENTED but NOT APPLIED.** All 4 diffs are spelled out as text in `/app/memory/change_requests/POS3_1_BUG_111_QSR_BILL_PARITY_PLAN_2026_05_27.md` §13.

3. **DO NOT APPLY Phase 2 diffs without explicit owner Gate A-P2 approval.** Owner enforces strict per-gate playbook.

4. **CRITICAL test that BLOCKS close-out:** Live test that all 4 discount sources (restaurant + coupon + loyalty + wallet) club into a **SINGLE aggregated `Discount` row** in QSR Billing — see T-DISCOUNT-CLUB in plan doc §13.

---

## What to do first (next session)

1. Read in this exact order:
   - `/app/memory/PRD.md` (full sprint state)
   - `/app/memory/change_requests/POS3_1_BUG_111_QSR_BILL_PARITY_PLAN_2026_05_27.md` (§13 = Phase 2)
   - `/app/memory/change_requests/POS3_1_BUG_109_110_QSR_GATE_ALIGNMENT_PLAN_2026_05_27.md` (sibling, shipped)

2. Greet owner concisely: "POS3.1 BUG-111 Phase 1 is shipped. Phase 2 plan is ready. Approve Gate A-P2 to apply diffs 3/4/5/6 (~+35 lines, 3 files)?"

3. If approved → apply diffs in sequence (B-P2 → E-P2) using `mcp_search_replace`. All diffs are exact-text, ready to paste. Run `cd /app/frontend && CI=false yarn build` after each gate.

4. After build clean → ask owner for preprod credentials to execute T-DISCOUNT-CLUB live test, OR ask owner to perform the live test themselves. **Do not declare close-out without this test passing.**

5. Once T-DISCOUNT-CLUB passes → draft combined QA + Handoff doc at `/app/memory/change_requests/pos_3_1/POS3_1_BUG_109_110_111_QA_HANDOFF_2026_05_27.md` covering all three bugs (109, 110, 111-P1, 111-P2). Move all 3 plan docs into `/app/memory/change_requests/pos_3_1/` per BUG-109/110 plan §9.

---

## Phase 2 — Exact diffs (copy-paste ready)

> All 4 diffs are in `/app/memory/change_requests/POS3_1_BUG_111_QSR_BILL_PARITY_PLAN_2026_05_27.md` §13. Re-pasting here for convenience:

### Diff 3 — `orderTransform.js` (after L227)
Surface 6 missing server fields: `couponDiscount, loyaltyDiscount, walletDebit, gstTax, vatTax, roundUp`. All `parseFloat || 0`.

### Diff 4 — `OrderEntry.jsx` L2213 (after `onFullBilling` line)
Add one prop: `placedOrderData={orderFromContext || orderData}`.

### Diff 5 — `CartPanel.jsx` (3 small edits)
- Add `placedOrderData` to outer CartPanel destructure
- Add `placedOrderData = null,` to QsrBillingSection destructure (L244-252)
- Add `placedOrderData={placedOrderData}` to QsrBillingSection JSX call (L1256-1275)

### Diff 6 — `CartPanel.jsx` L492 (replaces Phase 1 Diff 2 wrapper)
2-branch ternary:
- `hasPlacedItems && placedOrderData` → server-driven breakdown (8 rows from `placedOrderData.*`)
- else → existing local-recompute block (unchanged)

**Discount row aggregation (per owner directive):**
```js
const srvDiscount = (placedOrderData.discount        || 0)
                  + (placedOrderData.couponDiscount  || 0)
                  + (placedOrderData.loyaltyDiscount || 0)
                  + (placedOrderData.walletDebit     || 0);
```
→ **SINGLE `Discount -₹XXX` row** containing all 4 sources summed. Do NOT show separate rows.

---

## T-DISCOUNT-CLUB Live Test (BLOCKING)

**Setup:**
1. Open Full Mode → place order with items totalling ~₹1,200
2. In CollectPaymentPanel apply ALL FOUR discount sources:
   - Restaurant discount (e.g. ₹50 manual)
   - Coupon (e.g. WELCOME10 → ₹100 off)
   - Loyalty (e.g. 300 pts → ₹30 off)
   - Wallet (e.g. ₹50 off)
3. Submit Collect Bill → server confirms with all 4 fields populated in response

**Verification:**
4. Navigate back to the order in QSR mode
5. **PASS criteria:**
   - QSR Billing shows `Item Total ₹1,200` (server `subtotalAmount`)
   - QSR Billing shows ONE `Discount -₹230` row (server `discount + couponDiscount + loyaltyDiscount + walletDebit` aggregated)
   - QSR Billing shows `Subtotal`, `Service Charge`, `Tax (GST)`, `VAT` (if applicable), `Round-off` rows
   - Grand Total matches Full Mode's Collect Bill summary byte-for-byte
6. **FAIL if:** discount rows appear separated, any source is missed, or values mismatch Full Mode

**Owner directive (verbatim 2026-05-27):**
> "we need to test a order how loyalty coupon and other discounts all shd club in single discount for qsr view"

---

## Strict playbook reminders

1. **Never edit code without explicit per-gate owner approval.** Plan → owner reviews → owner says "approved" → edit one diff → repeat.

2. **DO NOT TOUCH:**
   - `/app/memory/final/`
   - `/app/memory/crm/crm_1_0/`
   - Outbound payload contracts in `orderTransform.js` (`placeOrder`, `updateOrder`, `placeOrderWithPayment`, `collectBillExisting`)

3. **Build verification after every gate:** `cd /app/frontend && CI=false yarn build` → exit 0. Only acceptable warning: pre-existing `OrderEntry.jsx:1308` `printOrder` ESLint warning.

4. **Server-authoritative pattern (canonical reference):** `OrderEntry.jsx:788-792` — `total = hasPlacedItems ? (orderFinancials.amount || 0) + ... : applyRoundOff(rawLocalTotal) + deliveryAddOn`.

5. **Park (do not pick up):**
   - CR-003 Coupon Analytics Dashboard Phase 2 (different sprint, owner directive 2026-05-27)
   - CRM 2.0 work until POS3.1 fully closed

---

## Pending items if owner pivots away from Phase 2

If owner decides to defer Phase 2 indefinitely and move to next priority instead:
- P1: CR-005 Wallet Discovery
- P1: CR-002 Stage 8 — append live R689 HAR/payload evidence (BLOCKED — needs owner upload)
- P2: CR-003 Tab, CR-008 Integrations

---

## Mistakes I made this session (avoid repeating)

1. **Over-engineered the initial BUG-111 plan** — proposed surfacing 11 transform fields + 15-key `orderFinancials` extension across 5 re-seed sites (75 lines), when the actual fix was a 1-line prop consumption mirroring `OrderEntry.jsx:788`. Owner caught this and forced a rewrite to Option Y (minimal). **Lesson: before drafting, check if the data is already on the wire via existing props.** Read `OrderEntry.jsx:788-792` (the Full Mode `total` ternary) — it's the canonical pattern.

2. **Did not run owner's exact validation early** — should have explored the `total` prop wiring in `OrderEntry.jsx → CartPanel.jsx → QsrBillingSection` destructure chain BEFORE writing 290 lines of plan. The over-engineered draft burned ~10 min of owner's review time.

3. **Phase 1 Diff 2 was too aggressive** — hiding the entire breakdown block surfaced the immediate need for Phase 2 (server-driven breakdown). Should have flagged at Gate A: "by hiding rows, we'll need a follow-up CR to bring them back populated from server data." Phase 2 is now documented; flag this trade-off upfront to owner next time.

---

**End of handover note. Good luck.**
