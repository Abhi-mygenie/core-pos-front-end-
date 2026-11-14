# BUG-639 — Impact Analysis + Implementation Plan

**Gate:** 2 (Impact Analysis) + 3 (Implementation Plan)
**Item:** BUG-639 (P1, updateOrder missing expandCompItems)
**Code Reality:** NONE — expandCompItems not called in updateOrder
**Conflict Pre-Check:** CLEAN — 13 items touch orderTransform but all at QA_PASS or IMPLEMENTED, none modifying L1184/L1191

---

## IMPACT ANALYSIS (Gate 2)

### Data Flow Trace

```
Cashier marks item as partial comp (e.g., 1 of 3 qty comp)
  → handleMarkComp sets: compQty=1, isComplementaryRuntime = (1 >= 3) = false
  → Cart state: { qty: 3, compQty: 1, isComplementaryRuntime: false }

Cashier adds more items → triggers updateOrder
  → updateOrder L1184: newItems.map(buildCartItem) ← NO expandCompItems
    → buildCartItem sees isComplementaryRuntime=false → is_complementary: "No" ❌
  → updateOrder L1191: allActiveItems.map(buildCartItem) ← NO expandCompItems
    → Financial totals computed on unsplit items → comp items counted as billable ❌

What SHOULD happen (like placeOrder):
  → expandCompItems splits: [{qty:1, isComplementaryRuntime:true}, {qty:2, isComplementaryRuntime:false}]
  → buildCartItem: line 1 → is_complementary: "Yes", line 2 → is_complementary: "No" ✅
  → Financial totals: only line 2 (qty 2) is billable ✅
```

### Pattern comparison — 4 paths

| Path | Line | expandCompItems? | Status |
|---|---|---|---|
| `placeOrder` | L1054, L1062 | ✅ YES | Correct |
| `placeOrderWithPayment` | L1293 | ✅ YES | Correct |
| `collectBillExisting` | L1547 | ✅ YES | Correct |
| **`updateOrder`** | **L1184, L1191** | **❌ NO** | **BUG** |

### Risk Assessment
- **Risk:** MEDIUM — orderTransform.js is R5, financial totals path
- **Financial impact:** YES — unsplit comp items inflate billable totals on update-order
- **Printer impact:** YES — KOT/bill shows is_complementary:"No" for items that should be comp

---

## IMPLEMENTATION PLAN (Gate 3)

### Edit Summary
| # | File | Line | Current | New | Risk |
|---|------|------|---------|-----|------|
| E1 | `orderTransform.js` | L1184 | `newItems.map(buildCartItem)` | `expandCompItems(newItems).map(buildCartItem)` | LOW |
| E2 | `orderTransform.js` | L1191 | `allActiveItems.map(buildCartItem)` | `expandCompItems(allActiveItems).map(buildCartItem)` | LOW |

**Files WILL change:** `orderTransform.js`
**Files will NOT touch:** Any other file

---

### E1 — L1184: Wrap newItems with expandCompItems

**Current:**
```js
    // cart-update payload: only NEW (unplaced) items
    const cartUpdateRaw = newItems.map(buildCartItem);
```

**New:**
```js
    // cart-update payload: only NEW (unplaced) items
    const cartUpdateRaw = expandCompItems(newItems).map(buildCartItem); // BUG-639: split partial-comp before buildCartItem
```

---

### E2 — L1191: Wrap allActiveItems with expandCompItems

**Current:**
```js
    const allActiveItems = allCartItems.filter(i => i.status !== 'cancelled' && !i.isCheckInMarker);
    const allBuilt = allActiveItems.map(buildCartItem);
```

**New:**
```js
    const allActiveItems = allCartItems.filter(i => i.status !== 'cancelled' && !i.isCheckInMarker);
    const allBuilt = expandCompItems(allActiveItems).map(buildCartItem); // BUG-639: split partial-comp for correct totals
```

---

## Verification Matrix

| # | Change | How to Verify |
|---|--------|--------------|
| V1 | E1 — newItems expanded | Code review: pattern matches placeOrder L1054 |
| V2 | E2 — allActiveItems expanded | Code review: pattern matches placeOrder L1062 |
| V3 | Partial comp on update-order | Browser: mark 1 of 2 qty comp → add item → check update-order payload has 2 lines (1 comp, 1 normal) |
| V4 | Full comp on update-order | Browser: mark all qty comp → add item → is_complementary:"Yes" in payload |
| V5 | No comp items | Browser: normal order update → no change in behavior |
| V6 | Financial totals | Browser: comp items excluded from billable totals on update |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: BUG-639 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] Code markers: // BUG-639 in both lines
- [ ] Compile: webpack 0 new warnings
```

## Scope Lock
- **Files WILL change:** `orderTransform.js` (2 lines)
- **Files will NOT touch:** OrderEntry.jsx, CartPanel.jsx, CollectPaymentPanel.jsx, any service, any other transform
