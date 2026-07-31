# CR-106 Wave 2 — Pending Fixes Doc (For Next Agent)

**Document:** `plans/CR106_WAVE2_PENDING_FIXES.md`
**Created:** 2026-07-27
**Status:** DOCUMENTED — awaiting next implementation session

---

## Owner Decisions (2026-07-27)

| # | Decision | Answer |
|---|----------|--------|
| D1 | BUG-252 TableCard body (items/customer/rider) | **REVERT.** Remove items/customer/rider body from TableCard aggregator cards. Keep same height as regular cards. Just: S badge + order# + status + Ready button. |
| D2 | G1: OrderCard `item.qty` bug | **FIX.** Add `qty:` alias in aggregatorTransform. 1 line. |
| D3 | G2: Item format (● prefix, × symbol) | **DEFER.** Document for future. Not this session. |
| D4 | G3: Item price display | **DEFER.** Document for future. Not this session. |
| D5 | G4: Customer+phone section in OrderCard | **DEFER.** Document for future. Not this session. |

---

## Fix 1: Revert BUG-252 (TableCard body)

**File:** `components/cards/TableCard.jsx`
**Action:** Remove the aggregator body block (~L412-443) that renders items, customer+phone, rider for `isAggregator` cards. 

**What to remove:**
```jsx
{/* BUG-252: Aggregator card body — items, customer+phone, rider status */}
{isAggregator && table.order && (
  <div className="flex-1 flex flex-col gap-1 mb-2 min-h-0">
    ... items, customer, rider ...
  </div>
)}
```

**Result:** Aggregator TableCards render at same height as regular delivery cards: S badge + label + status + time + Ready button.

---

## Fix 2: G1 qty field mismatch (aggregatorTransform)

**File:** `api/transforms/aggregatorTransform.js`
**Action:** In the items mapping, add `qty:` field alongside `quantity:`:

**Current:**
```js
quantity: Number(f.quantity) || 1,
```

**New:**
```js
quantity: Number(f.quantity) || 1,
qty: Number(f.quantity) || 1, // G1: OrderCard reads item.qty (not item.quantity)
```

**Result:** OrderCard shows `Double Chicken Keema Roll (1)` instead of `Double Chicken Keema Roll ()`.

---

## Future Work (Documented, NOT for this session)

### G2: Item format enhancement
OrderCard currently shows: `item.name (item.qty)`
Design mockup shows: `● Qty× Item Name  ₹Price`
**Scope:** Change item rendering format in OrderCard for aggregator orders.
**Decision needed:** Aggregator-only or all order types?

### G3: Item price display
OrderCard doesn't show item prices for ANY order type.
Design mockup shows: `₹120.00` per item line.
**Scope:** Add `currencySymbol + item.unitPrice` to item display.
**Decision needed:** Aggregator-only or all order types?

### G4: Customer+phone section in OrderCard
OrderCard has no dedicated "Customer: Name · Phone" section for aggregator.
Design mockup (Section 3) shows this between items and rider.
**Scope:** Add customer row in OrderCard body when `isAggregator`.
**Data available:** `order.customerName`, `order.phone` from aggregatorTransform.
