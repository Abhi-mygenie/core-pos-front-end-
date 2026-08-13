# CR-106 — Investigation Report #3: OrderCard Gaps + 5-Item Overflow

**Created:** 2026-07-26
**Role:** INVESTIGATION (no code edits)
**Steps used:** 5/10

---

## Summary

| # | Gap | Root Cause | Classification | Severity |
|---|-----|-----------|----------------|----------|
| G1 | Item shows `Double Chicken Keema Roll ()` — empty parens | **Field name mismatch:** OrderCard uses `item.qty` but aggregatorTransform sets `item.quantity` | FE_BUG | P1 |
| G2 | No quantity prefix (`1×`) on items | OrderCard renders `{item.name} ({item.qty})` — no `×` prefix format | FE_BUG (design gap) | P2 |
| G3 | No item price shown | OrderCard doesn't render `item.unitPrice` or `item.price` for ANY order type — design shows `₹120.00` | FE_BUG (design gap) | P2 |
| G4 | No customer+phone section visible | OrderCard has no dedicated "Customer: SWIGGY · +919999999992" section for aggregator | FE_BUG (missing section) | P2 |
| G5 | 5 items overflow (user question) | **TableCard:** shows first 2 + "+3 more" — correct. **OrderCard:** shows ALL items (scrollable) — acceptable | CLARIFICATION | N/A |

---

## Detailed Analysis

### G1 (P1): `item.qty` vs `item.quantity` — THE critical bug

**Evidence:**
- `OrderCard.jsx:692` → `{item.name} ({item.qty})`
- Regular `orderTransform.js:126` → `qty: detail.quantity || 1` (maps API `quantity` → `qty`)
- `aggregatorTransform.js` → `quantity: Number(f.quantity) || 1` (uses `quantity`, NOT `qty`)

**Result:** For aggregator items, `item.qty` is `undefined` → renders as `Double Chicken Keema Roll ()` with empty parens.

**Fix:** In `aggregatorTransform.js`, item object should use `qty` (not `quantity`) to match what OrderCard expects. OR add `qty` as alias.

---

### G2 (P2): Item format doesn't match design

**Design mockup (Section 3):**
```
● 1× Paneer Butter Masala     ₹120.00
```

**Current OrderCard renders (for ALL orders, not just aggregator):**
```
Double Chicken Keema Roll ()
```

The `●` dot prefix and `Qty×` format are NOT in OrderCard — this is the EXISTING format for all order types. The design mockup shows a different format than what was implemented. This is an existing design gap, not specific to aggregator.

---

### G3 (P2): No item price in OrderCard

The design mockup shows `₹120.00` per item. OrderCard line 692 only renders `{item.name} ({item.qty})` — no price. This applies to ALL order types, not just aggregator. Adding price display for aggregator items would diverge from the existing pattern.

**Decision needed:** Should aggregator OrderCard items show price (diverge from POS items), or should ALL items show price?

---

### G4 (P2): No customer+phone section

OrderCard has:
- **Header:** Shows display name from `getDisplayName()` — for aggregator this shows `#002359` (order number, from our previous fix)
- **Address section (L618-625):** Shows delivery address for delivery orders
- **Rider section (L856-870):** Shows "Awaiting Runner" or rider name — **this IS visible** ✅

**Missing:** A dedicated "Customer: SWIGGY · +919999999992" row between items and rider. The design mockup (Section 3) shows this as a separate section.

Currently the customer name (`Vansh`) is shown in the TableCard waiter slot, but in OrderCard it's not explicitly shown as "Customer: Name · Phone".

---

### G5: What happens with 5 items?

**TableCard (grid view):**
```
● 1× Item A
● 1× Item B
+3 more          ← correct, shows overflow count
```
This is correct per BUG-252 implementation (`.slice(0, 2)` + overflow count).

**OrderCard (list view):**
All 5 items render individually with their own rows. The card gets taller but is scrollable. This is the existing behavior for ALL order types — no truncation in list view.

---

## Recommendations

| # | Gap | Fix | Scope | Needs Intake? |
|---|-----|-----|-------|:---:|
| **G1** | `qty` vs `quantity` field mismatch | Add `qty: Number(f.quantity) || 1` in aggregatorTransform item mapping | 1 line | BUG — register |
| **G2** | Item format (dot prefix, ×) | Style change in OrderCard item rendering for aggregator | ~5 lines | Owner decide: aggregator-only or all? |
| **G3** | Item price not shown | Add `currencySymbol + unitPrice` to item display | ~3 lines | Owner decide: aggregator-only or all? |
| **G4** | Customer+phone section | Add aggregator customer row in OrderCard body | ~10 lines | CR/BUG — register |

---

## Handover

```
Investigation complete. 5 gaps traced. Steps: 5/10.
  G1 (P1 BUG): item.qty undefined — aggregatorTransform uses 'quantity', OrderCard expects 'qty'. 1-line fix.
  G2 (P2): Item format — design shows ● Qty× Name ₹Price. OrderCard shows Name (qty). Existing pattern.
  G3 (P2): No item price — design shows ₹120.00. OrderCard doesn't render price for any order type.
  G4 (P2): No customer+phone row — design shows dedicated customer section.
  G5 (clarification): 5 items — TableCard: 2 + "+3 more". OrderCard: all shown (scrollable).

Owner decisions needed:
  - G2/G3: Change item format for aggregator only, or for ALL order types?
  - G4: Register as new BUG for customer+phone display?
  - G1: Register as BUG (qty field mismatch) — direct fix eligible.
```
