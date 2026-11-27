# BUG-665 — Impact Analysis (Gate 2)

**ID:** BUG-665
**Date:** 2026-11-10
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** PARTIAL — both buggy rounding paths present in running code
**Risk:** CRITICAL (financial — payment submission fails)
**OD-665-01:** LOCKED — Option A: fix in CPP, `orderTransform.js` not touched
**OD-665-02:** LOCKED — ALL payment types (prepaid, postpaid QSR, collect-bill)

---

## 1. Code Reality Check

```bash
# PATH A (orderTransform.js L29) — present ✓
gstTax = itemGstPostDiscount + scGstAmt + ...
totalTax = Math.round((gstTax + vat) * 100) / 100  # rounds WHOLE GST → 192.99

# PATH B (CollectPaymentPanel.jsx L789-790) — present ✓
sgst = Math.round((totalGst / 2) * 100) / 100       # rounds EACH HALF → 96.50
cgst = Math.round((totalGst / 2) * 100) / 100       # 96.50 + 96.50 = 193.00
# → effectiveTotal = 4052.90, splitCap = 4052.90 (L3034)
```

Both paths confirmed in codebase. No prior fix attempt found. `BUG-665` marker absent.

---

## 2. Conflict Pre-Check

| Item | File | Status | Conflict? |
|---|---|---|---|
| BUG-660 | `CollectPaymentPanel.jsx` | GATE_5A | PARALLEL-SAFE — credit/TAB block (L541-692). No overlap with split payment block (L3025-3050). |
| BUG-664 | `orderTransform.js` | GATE_3 | PARALLEL-SAFE — BUG-665 does NOT touch `orderTransform.js` (Option A). |
| BUG-639 | `orderTransform.js` | GATE_3 | PARALLEL-SAFE — same reason. |
| BUG-619, BUG-614/615 | `CollectPaymentPanel.jsx` | GATE_5A | PARALLEL-SAFE — discount block (L370-405). No overlap. |
| CR-409/410/412 | CPP + orderTransform | GATE_5A/6 | Already shipped. Code marker present. No conflict. |

**Execution constraint:** BUG-665 implementation can run independently. No ordering dependency on any open item.

---

## 3. Data Flow Trace — Full Path of the Bug

```
Cashier opens Collect Bill (or QSR Place+Pay)
  → CollectPaymentPanel renders
    → CPP computes totalGst = 192.994999... (unrounded float)
    → sgst = Math.round(96.4974999... × 100)/100 = 96.50   ← PATH B rounding
    → cgst = 96.50
    → rawFinalTotal = subtotal(3859.90) + 96.50 + 96.50 = 4052.90
    → effectiveTotal = 4052.90
    → splitCap = effectiveTotal = 4052.90                    ← BREAK POINT L3034

  Cashier taps "Split", types ₹3000 cash, tabs out (onBlur)
    → remaining = splitCap(4052.90) − 3000 = 1052.90
    → UPI field auto-fills: 1052.90
    → splitPayments state = [{cash:3000},{upi:1052.90}]

  Cashier taps "Pay"
    → handlePayment() → placeOrderWithPayment()/collectBillExisting()
    → orderTransform.js computes:
        totalTax = Math.round(192.994999... × 100)/100 = 192.99  ← PATH A
        rawTotal = 3859.90 + 192.99 = 4052.89
        order_amount = 4052.89

  Backend receives:
    order_amount: 4052.89
    partial_payments: [{cash:3000},{upi:1052.90}]  → sum = 4052.90
    4052.90 ≠ 4052.89  →  ERROR  ✗
```

**Secondary impact — Remaining display (L3094):**
After fix, splitCap = 4052.89 → auto-fill UPI = 1052.89.
Remaining display: `finalTotal(4052.90) − (3000+1052.89) = 0.01` — shows "Remaining: ₹0.01" even though amounts are correct. Cosmetically misleading. **Must also fix in Gate 3 (E2).**

---

## 4. Exact Lines Affected

### Primary fix — E1 (`CollectPaymentPanel.jsx` L3034)
```js
// CURRENT
const splitCap = isRoom ? effectiveTotal - roomBalance : effectiveTotal; // BUG-530
```
Problem: `effectiveTotal` uses `sgst + cgst` (each half rounded) → 193.00 → 4052.90.
Needs: use whole-GST rounding to match `orderTransform` → 192.99 → 4052.89.

**Approach:** derive `finalSplitBase` from `totalGst` rounded as a whole (same as PATH A):
```js
// BUG-665: derive split cap using whole-GST rounding to match order_amount
const totalGstRounded = Math.round(totalGst * 100) / 100;
const rawSplitBase    = Math.round((subtotal + totalGstRounded + vat) * 100) / 100;
const finalSplitBase  = applyGrandTotalRoundOff(rawSplitBase, roundOffEnabled)
                        + (isRoom && associatedOrders.length > 0 ? associatedTotal : 0);
const splitCap        = isRoom ? finalSplitBase : finalSplitBase; // BUG-530+BUG-665
```
*(room: finalSplitBase already excludes roomBalance; non-room: same value)*

### Secondary fix — E2 (`CollectPaymentPanel.jsx` L3094)
```js
// CURRENT
Remaining: ₹{Math.max(0, finalTotal - splitPayments.reduce(...)).toFixed(2)}
```
After E1, the auto-filled amounts match `finalSplitBase` (4052.89), but display uses `finalTotal` (4052.90) → shows "₹0.01 remaining" misleadingly.
Needs: use `finalSplitBase` for the display too (same value from E1).

---

## 5. Variables in Scope at L3034 (all confirmed ✓)

| Variable | Defined at | Value (example order) |
|---|---|---|
| `totalGst` | CPP L788 | 192.994999... |
| `subtotal` | CPP L820 | 3859.90 |
| `vat` | CPP L825 | 0 (GST restaurant) |
| `roundOffEnabled` | CPP L834 | true |
| `applyGrandTotalRoundOff` | imported L18 | function |
| `associatedOrders` | CPP prop L41 | [] (non-room) |
| `associatedTotal` | CPP L247 | 0 (non-room) |
| `isRoom` | CPP L... | false (dine-in) |
| `roomBalance` | CPP L207 | 0 (non-room) |

All variables available without additional imports or prop changes.

---

## 6. Edge Cases

| Scenario | Impact | Handled? |
|---|---|---|
| SC = 0 (no SC on order) | `totalGst = totalGstRounded` (no 0.5-paisa intermediate) → `finalSplitBase = effectiveTotal` → no behaviour change | ✓ safe |
| VAT restaurant | `vat` included in both current and new computation identically | ✓ safe |
| round-off disabled (`totalRound=false`) | `applyGrandTotalRoundOff` returns raw value unchanged in both paths | ✓ safe |
| Room orders (BUG-530 pattern) | `finalSplitBase` mirrors BUG-530: associatedTotal included, roomBalance excluded | ✓ safe |
| Tip with SC GST | Same rounding fix applies — `tipGst` is already inside `totalGst` | ✓ covered |
| 3-way split (3 rows) | `splitCap` used as max across all rows — same fix applies | ✓ covered |
| onChange (typing, not blur) | Per BUG-113/OD-530-01: intentionally unclamped. Unchanged. | ✓ no change |

---

## 7. Downstream Consumers — NOT touched

| File | Why safe |
|---|---|
| `orderTransform.js` | Option A — untouched. `order_amount` computation unchanged. |
| `OrderEntry.jsx` | Receives `paymentData` from CPP — no change to what it receives. |
| `collectBillExisting` | Postpaid path — also uses CPP splitPayments. Fix in CPP covers it. |
| Receipt / print | Print payload uses separate `serviceCharge`/`gstTax` values, not `splitCap`. |
| Reports | Report amounts come from backend settled order data, not from CPP. |

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| R1 — SC amount on new order incorrect | CRITICAL | `finalSplitBase` = exact match of `order_amount` path. Proven mathematically. |
| R2 — Room order regression (BUG-530) | HIGH | Pattern preserved — `associatedTotal` included, `roomBalance` excluded |
| R3 — SC = 0 regression | MEDIUM | No 0.5-paisa intermediate → `finalSplitBase = effectiveTotal` → no change |
| R4 — Round-off regression | MEDIUM | `applyGrandTotalRoundOff` called identically in both paths |
| R5 — onChange clamping broken | LOW | onChange untouched per BUG-113 OD |

---

## 9. Scope Lock

**WILL change:**
- `src/components/order-entry/CollectPaymentPanel.jsx` — E1 L3034 (~+3 lines), E2 L3094 (1 line)

**WILL NOT touch:**
- `src/api/transforms/orderTransform.js` (Option A — reference only)
- `src/components/order-entry/OrderEntry.jsx`
- Any print / report / settlement transform
- Any financial formula (`sgst`, `cgst`, `effectiveTotal`, `finalTotal`)

**Files changed: 1 · Edits: 2 · R5 hotspot: YES**
**Fast Lane: NOT eligible (R5, financial)**

---

## 10. Owner Decisions

| OD | Decision | Status |
|---|---|---|
| OD-665-01 | Option A — fix in CPP (splitCap), `orderTransform` untouched | **LOCKED** |
| OD-665-02 | ALL types — prepaid, postpaid, QSR (one fix covers all) | **LOCKED** |

No new ODs. Ready for Gate 3.
