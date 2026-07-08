# Quick Debugging Handover — Cash Quick-Pills & Change Use Food-Only Total on Room Orders

**Status:** ✅ Fixed (Apr-2026)
**Type:** Bug
**Severity:** Medium-High — silent cashier-UX bug on room orders carrying associated transfers and/or a room balance. Backend money-flow already correct; symptom is on the cashier's pills + Change display.
**Scope:** Frontend only (single-file patch)

---

## 1. User Report
- **Raw user issue:** "If order is in room, it has three kinds of bills — room bills, room service, associated order. Total shows correctly. But in bill for cash, it considered NOT room service food cost. Pill should be according to total amount in case orders are room orders."
- **Clarified requirement:** On the Checkout / CollectPaymentPanel screen for a room order, the **cash quick-pills** below the "Cash Received" input AND the **Change** displayed when cash is entered must reflect the **GRAND TOTAL** (food + associated transfers + room balance), not the food-only subtotal.
- **Current behavior (pre-fix):** For Order #002926 (₹594 food + ₹3,288 transferred + ₹300 room balance = ₹4,182 grand total):
  - Quick-pills showed ₹594 / ₹600 / ₹1,000 (based on food only).
  - "Change" was computed as `amountReceived - 594` instead of `amountReceived - 4182`.
  - The Grand Total label and the Checkout button correctly showed ₹4,182.
  - The backend payload also correctly used the combined total.
- **Expected behavior:** Pills should round up the **grand total** (₹4,182 → ₹4,200 → ₹4,500) and Change should subtract from grand total.

---

## 2. Scope
- **Included:** All room orders that carry either:
  - One or more associated orders (`associatedOrders.length > 0`), or
  - A non-zero room booking balance (`roomBalance > 0`).
- **Excluded:** Non-room orders, prepaid orders (no cash UI), Split-Bill mode (already used the combined formula).
- **Affected screens/modules:** `CollectPaymentPanel` (Order Entry → Checkout) — Cash payment method only.

---

## 3. Documents Reviewed
- `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
- User screenshot of Checkout for Order #002926

---

## 4. Code Areas Reviewed

| File | Why | Relevant function/line | Finding |
|---|---|---|---|
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` ⭐ | The whole bill summary + cash UI lives here | L370 `finalTotal` (food-only); L1825 cash pills; L375 change | **Bug location** — pills + change used `finalTotal` instead of grand total. |
| Same file, L416 (`handlePayment`) | Backend payload | `effectiveTotal = finalTotal + (transfers ? associatedTotal : 0) + roomBalance` | ✅ Correct. Backend is unaffected — money-flow always recorded the right amount. |
| Same file, L1481 (Grand Total row) | Visible header | Inline `(finalTotal + (isRoom ? associatedTotal + roomBalance : 0))` | ✅ Correct. |
| Same file, L561/L573 (Split Bill) | Split modal trigger | Same inline combined formula | ✅ Correct. |
| Same file, L952 / L1209 / L1457 | "Food Total" / "Room Orders Total" labels | Use `finalTotal` deliberately | ✅ Correct usage — these labels are *meant* to be food-only. |

---

## 5. Flow Trace (Cash entry on room order)

1. **User action:** Cashier opens Checkout on a room order with food=594 + transfers=3,288 + roomBalance=300.
2. **Bill Summary card renders:** Food Total ₹594 + Transferred Total ₹3,288 + Room Balance ₹300 = **GRAND TOTAL ₹4,182** (correct).
3. **Cashier picks Cash → "Cash Received" input appears with 3 quick-pills.**
4. **Pre-fix bug:** pills computed from `finalTotal` = `[594, 600, 1000]`.
5. **Cashier types ₹5000:** displayed Change = `5000 − 594 = 4406` ❌ (should be `5000 − 4182 = 818`).
6. **Cashier clicks Checkout:** backend receives `payment_amount: 4182` (correct via `handlePayment` → `effectiveTotal`). The cashier's *physical handling* is the only thing impacted.

---

## 6. Root Cause Analysis

- **Confirmed root cause (from code):** `CollectPaymentPanel.jsx` had two distinct totals in scope — `finalTotal` (food-only) and `effectiveTotal` (food + transfers + roomBalance). The combined formula was inlined in 4 places (L416 / L561 / L573 / L1481), each correctly. But two consumers — the cash quick-pills (L1825) and the Change calc (L375) — referenced bare `finalTotal` instead.
- **Why it manifests only on room orders:** For non-room orders, `associatedTotal = 0` and `roomBalance = 0`, so `effectiveTotal === finalTotal` by coincidence — the bug was invisible. Room orders with transfers or a room balance break that coincidence.
- **Contributing code smell:** The combined formula was duplicated in 4 places instead of being computed once at top-level. The two omissions were the natural consequence — easy to forget the 5th and 6th place.

---

## 7. Fix Approach (Implemented)

Centralised the grand total at top-level (right after `finalTotal` is computed). Switched the two buggy consumers to it. Pre-existing 4 call-sites with the inline formula left untouched (they already produce the same value; not in scope).

---

## 8. Files Modified

| Path | Change | Risk |
|---|---|---|
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | (a) Added `const effectiveTotal = …` after L373 with explanatory comment block. (b) L388 (was L375) — `change` now subtracts from `effectiveTotal`. (c) L1838 (was L1825) — cash pills now derive from `effectiveTotal`. | Low |

### Diff (consolidated)

```diff
   const roundOff = Math.round((finalTotal - rawFinalTotal) * 100) / 100;

-  const change = amountReceived ? Math.max(0, parseFloat(amountReceived) - finalTotal) : 0;
+  // BUG-ROOM-CASH-PILLS (Apr-2026): centralised grand total used by every
+  // "amount payable" surface — Cash quick-pills (L1825), change calculation
+  // (just below), Grand-Total row (L1481), Split-Bill total (L561/573), and
+  // the payment payload (handlePayment L416). Was previously inlined in 4
+  // places with two omissions (cash pills + change) that produced a food-only
+  // number on room orders carrying associated transfers and/or a room balance.
+  // For non-room orders associatedTotal & roomBalance are 0, so
+  // effectiveTotal === finalTotal and behavior is unchanged.
+  const effectiveTotal =
+    finalTotal +
+    (isRoom && associatedOrders.length > 0 ? associatedTotal : 0) +
+    roomBalance;
+
+  const change = amountReceived ? Math.max(0, parseFloat(amountReceived) - effectiveTotal) : 0;
```

```diff
-                {[finalTotal, Math.ceil(finalTotal / 100) * 100, Math.ceil(finalTotal / 500) * 500].map((amt, idx) => (
+                {[effectiveTotal, Math.ceil(effectiveTotal / 100) * 100, Math.ceil(effectiveTotal / 500) * 500].map((amt, idx) => (
```

---

## 9. What NOT To Change
- ❌ `finalTotal` itself (still semantically correct as the food-only total — used by L952, L1209, L1457 labels).
- ❌ Backend payload path in `handlePayment` (L416) — already correct.
- ❌ Inline combined-formula occurrences at L416 / L561 / L573 / L1481 — left as-is. They produce the same value as the new top-level `effectiveTotal`. Optional DRY cleanup deferred (see Section 12).
- ❌ Grand Total visible label, Split Bill behavior, Print Bill payload, Round-off math.
- ❌ No backend changes.

---

## 10. Edge Cases Preserved

- **Non-room order** (dine-in / takeaway / delivery): `effectiveTotal === finalTotal`. Pills + change identical to pre-fix.
- **Room order, no transfers, no balance:** Same as non-room (effectiveTotal === finalTotal).
- **Room order with only roomBalance:** pills/change reflect `finalTotal + roomBalance`.
- **Room order with only transfers:** pills/change reflect `finalTotal + associatedTotal`.
- **Discount / Coupon / Loyalty / Wallet:** `finalTotal` already incorporates these; `effectiveTotal` adds room-side parts on top, matching backend convention (room balance has no SC/GST/discount per L2 rule, comment block at L1444).
- **Round-off (L367–373):** still applied to food-side `finalTotal`. Adding integer-rupee `associatedTotal` and `roomBalance` cannot reintroduce fractions.
- **Split Bill mode:** cash quick-pills section is conditionally hidden when `showSplit === true`. No impact.
- **Prepaid orders:** never enter cash UI. No impact.

---

## 11. QA Checklist

### Before-fix reproduction
1. Pick a room with: ≥1 dine-in/walk-in order transferred to it AND/OR an outstanding room booking balance.
2. Open Order Entry → Checkout.
3. Bug A: Quick-pills below "Cash Received" show food-only values (e.g. ₹594/600/1000) instead of grand-total values.
4. Bug B: Type any amount in "Cash Received" → displayed Change subtracts food-only total, producing a wildly inflated number for room orders with transfers.

### After-fix expected
1. Same setup → pills show:
   - Pill 1 = grand total exactly (e.g. ₹4,182).
   - Pill 2 = grand total rounded up to next ₹100 (e.g. ₹4,200).
   - Pill 3 = grand total rounded up to next ₹500 (e.g. ₹4,500).
2. Cash Received = grand total → Change = 0.
3. Cash Received > grand total → Change = received − grand total (e.g. 5000 − 4182 = 818).
4. Cash Received < grand total → Change = 0 (Math.max guard) — note: no underpayment guard added in this fix; see Section 12.

### Regression (must all still pass)
1. **Non-room dine-in / takeaway / delivery** — pills + change identical to before.
2. **Room order with NO transfers AND NO balance** — pills + change identical to non-room.
3. **Split Bill mode** — totals at L561/573 unchanged.
4. **Grand Total visible row** at L1481 — unchanged value.
5. **Print Bill** — payload uses `effectiveTotal` via `handlePayment` (L416) → unchanged.
6. **Backend `/order-bill-payment`** request body — `payment_amount` = `effectiveTotal` (unchanged from before fix; the bug was display-only).

---

## 12. Deferred Improvements (Out of Scope for this Fix)

| Item | Status | Reason |
|---|---|---|
| **DRY cleanup** — replace 4 inline combined-formula sites (L416, L561, L573, L1481) with the new top-level `effectiveTotal`. | Deferred | Not required to fix the bug; produces no behavior change; do as a separate cleanup PR. Would also remove the local `effectiveTotal` shadow at L429 inside `handlePayment`. |
| **Underpayment guard** — block Checkout (or warn) when `paymentMethod === 'cash'` and `amountReceived < effectiveTotal`. | Deferred | Product decision needed: do some restaurants allow short-payment with manager override? File as separate ticket `UNDERPAYMENT_GUARD`. |

---

## 13. Implementation Agent Instruction
Already implemented in this session. Patch is in, lint-clean, frontend recompiled with no new warnings. Manual QA per Section 11 is the only remaining step.
