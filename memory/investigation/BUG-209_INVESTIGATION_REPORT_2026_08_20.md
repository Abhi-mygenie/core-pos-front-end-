# INVESTIGATION REPORT — BUG-209

**ID:** BUG-209
**Date:** 2026-08-20
**Role:** INVESTIGATION
**Trigger:** Owner request — "check if already done in codebase"
**Steps used:** 8 / 10

---

## 1. Summary

**Root cause:** NOT fixed. `CollectPaymentPanel.jsx` renders `x{item.qty}` for all items at 5 locations — no `isWeightItem` check exists anywhere in that file. Weight items show `x100` instead of `100gm`.

**Classification:** FE_BUG — confirmed present
**Confidence:** HIGH — code search found zero weight-item handling in CollectPaymentPanel
**Code Reality:** NONE — no fix code exists

---

## 2. Code Reality Check

### CollectPaymentPanel.jsx — qty display locations
```bash
grep -n "x{item\.qty}" src/components/order-entry/CollectPaymentPanel.jsx
```

| Line | Context | Fix needed? |
|---|---|---|
| L1925 | Bill Summary — primary item list (postpaid/dine-in) | ✅ YES — primary |
| L2310 | Bill Summary — secondary item list (QSR / alternate view) | ✅ YES — primary |
| L2880 | Compact summary row `{item.name} x{item.qty}` | ⚠ Likely yes |
| L2918 | Compact summary row (second instance) | ⚠ Likely yes |
| L2956 | Cancelled items list (strikethrough) | ⚠ Assess at Gate 3 |

```bash
grep -n "isWeightItem\|itemUnit" src/components/order-entry/CollectPaymentPanel.jsx
# → 0 results — no weight item handling at all in this file
```

### CartPanel.jsx — reference implementation (correct)
```js
// CartPanel.jsx L168-172
{item.isWeightItem ? (
  item.qty < 1 && (item.itemUnit === 'Kg' || item.itemUnit === 'L')
    ? `${Math.round(item.qty * 1000)} ${item.itemUnit === 'Kg' ? 'gm' : 'ml'}`
    : `${parseFloat((item.qty || 0).toFixed(2))} ${item.itemUnit}`
) : `x${item.qty}`}
```

This logic is the approved pattern. CollectPaymentPanel needs the same.

---

## 3. Data Flow Trace

```
Weight item added to cart (e.g. ANGAARA DRUMSTICKS 250GM)
  → CartPanel renders qty as "100gm" ✅
  → Staff clicks Collect Bill
    → CollectPaymentPanel.buildDisplayItems() receives cartItems with isWeightItem=true
    → Bill Summary renders: <span>x{item.qty}</span>
      ↑ No isWeightItem check → shows "x100" instead of "100gm" ❌
  BREAK POINT: CollectPaymentPanel.jsx L1925, L2310 — raw x{item.qty}
```

**Note:** `isWeightItem`, `itemUnit` fields ARE present on cartItems (set in OrderEntry.jsx:89). CollectPaymentPanel receives them but never uses them for qty display.

---

## 4. Scope Assessment

| Location | File | Fix complexity | Priority |
|---|---|---|---|
| L1925 | CollectPaymentPanel.jsx | ~5 lines | P1 — primary Bill Summary |
| L2310 | CollectPaymentPanel.jsx | ~5 lines | P1 — secondary Bill Summary |
| L2880, L2918 | CollectPaymentPanel.jsx | ~3 lines each | P2 — compact summary |
| L2956 | CollectPaymentPanel.jsx | ~3 lines | P2 — cancelled items |
| SplitBillModal.jsx:441 | SplitBillModal.jsx | ~3 lines | P3 — out of intake scope |

**Intake doc scope (Gap 1):** L1860 and L2220 (now confirmed as L1925 and L2310 in current file). Scope is accurate.

**Files WILL change:** `CollectPaymentPanel.jsx` only
**Files WILL NOT touch:** CartPanel, OrderEntry, orderTransform, any other file

---

## 5. Risk Reassessment

| Dimension | Assessment |
|---|---|
| Risk | MEDIUM — R5 hotspot (CollectPaymentPanel) |
| Financial impact | NONE — display only, no price calculation |
| Planning skip | NOT eligible — hotspot file |
| Fast Lane | NOT eligible — hotspot |

Intake doc risk assessment (MEDIUM) is confirmed correct.

---

## 6. Recommendations

- **Proceed to Gate 2 Impact Analysis → Gate 3 → Gate 4 GO → Implementation**
- Fix L1925 and L2310 (primary — matches intake scope)
- Assess L2880/2918/2956 at Gate 3 (compact summary rows)
- Use CartPanel L168-172 as exact reference implementation
- **Do NOT touch SplitBillModal in this batch** — out of scope

---

## 7. Retroactive Candidates
None.
