# BUG-298 + BUG-299 — Impact Analysis (Gate 2) [BATCHED]

**IDs:** BUG-298 (dine-in) + BUG-299 (QSR)  
**Title:** Item-Level Complementary — Qty-Aware Modal (Dine-in + QSR)  
**Date:** 2026-08-05  
**Role:** PLANNING AGENT (Gate 2 — Impact Analysis only)  
**Risk:** CRITICAL (financial: comp = zero price on order payload, R5 hotspots)

---

## Design Confirmation (from owner)

Owner confirmed: "how we do this at item level cancellation show modal"

**Approved design pattern — mirrors `CancelFoodModal.jsx`:**
1. Per-item **Comp button** next to Cancel button on each cart item row
2. Single-qty items → toggle directly (no modal)
3. Multi-qty items (qty > 1) → open `MarkCompModal` with `+/-` selector:
   - "Biryani × 3 → Mark Comp Qty: **[−] 1 [+]** → 2 remain charged"
4. Works in **both dine-in (PlacedItemRow in CartPanel) and QSR (same CartPanel)**
5. Must propagate through orderTransform as partial complementary on payload

---

## Code Reality

**PARTIAL:**
- `toggleItemComplimentary()` logic EXISTS in `OrderEntry.jsx` L789 — flips `isComplementaryRuntime` on entire item
- `buildCartItem()` in `orderTransform.js` handles `isComplementaryRuntime` — zeros all amounts ✅
- `collectBillExisting()` in `orderTransform.js` handles `isComplementaryRuntime` ✅
- **GAP A (BUG-298):** No Comp button in `PlacedItemRow` (CartPanel.jsx)
- **GAP B (BUG-299):** No complementary support in QSR billing path
- **GAP C (both):** Current design is binary (all or nothing) — no partial qty support

---

## Conflict Pre-Check

| File | Last Modified By | Risk |
|---|---|---|
| `CartPanel.jsx` | BUG-195 agent (2026-07-11) | MEDIUM — recent change (CR-051 toggles) |
| `orderTransform.js` | BUG-270/271/CR-116 agent (2026-07-30) | HIGH — very recent, financial payload |
| `CollectPaymentPanel.jsx` | CR-116 agent (2026-07-30) | HIGH — very recent, financial flow |

**Hotspot conflicts:** `CartPanel.jsx` and `orderTransform.js` are R5 hotspots. `orderTransform.js` was modified 6 days ago. Must read latest version of comp handling before implementing.

---

## Data Flow Trace

### Current (broken) dine-in path:
```
CartPanel.jsx → PlacedItemRow → Cancel button only, NO comp button
OrderEntry.jsx → CollectPaymentPanel → tiny checkbox (no label, hard to find)
```

### Proposed new path (both dine-in + QSR):
```
CartPanel.jsx → PlacedItemRow L79-82 area:
  → [Cancel] [COMP] buttons side-by-side per placed item
  → onClick comp button:
    IF item.qty === 1  → toggleItemComp(item.id, 1)  // toggle directly
    IF item.qty > 1   → setCompItem(item)  // open MarkCompModal

MarkCompModal (NEW):
  → displays item name + current qty
  → +/- selector for compQty (min: 0, max: item.qty, default: item.qty)
  → "Mark X Complementary" button → onMarkComp({ item, compQty })

CartPanel.jsx handleMarkComp():
  → calls parent prop onToggleComplementary(item.id, compQty)
  → OR manages local state + isComplementaryRuntime + compQty

orderTransform.js buildCartItem() — NEW LOGIC NEEDED:
  IF item.compQty > 0 AND item.compQty < item.qty:
    → Emit 2 cart lines:
      Line 1: { ...item, qty: item.compQty, is_complementary: 'Yes', food_amount: 0, ... }
      Line 2: { ...item, qty: item.qty - item.compQty, is_complementary: 'No', normal pricing }
  IF item.compQty === item.qty (or isComplementaryRuntime === true):
    → Emit 1 cart line: { is_complementary: 'Yes', all amounts: 0 } (existing behavior)
  IF item.compQty === 0:
    → Normal line (no comp)
```

---

## Affected Files

| File | Change Type | Risk | Hotspot? |
|---|---|---|---|
| `components/order-entry/CartPanel.jsx` | MODIFY — add `compItem` state, `handleMarkComp()`, comp button in `PlacedItemRow`, prop pass-down | CRITICAL | **YES (R5)** |
| `components/order-entry/OrderEntry.jsx` | MODIFY — add `onMarkComp` handler for comp state (already has `toggleItemComplimentary`), possibly expose `compQty` on cartItems | CRITICAL | **YES (R5)** |
| `api/transforms/orderTransform.js` | MODIFY — `buildCartItem()` and QSR `buildCartItemQSR()`: handle partial `compQty` → 2-line split | CRITICAL | **YES (R5, financial, R6)** |
| `components/order-entry/MarkCompModal.jsx` | **NEW** — qty-aware modal, mirroring `CancelFoodModal.jsx` pattern | MEDIUM | NO |
| `components/order-entry/CollectPaymentPanel.jsx` | MODIFY — update existing checkbox to align with new `compQty` approach, or remove checkbox if comp button replaces it | HIGH | YES (R5) |

**Files WILL change:** CartPanel.jsx, OrderEntry.jsx, orderTransform.js, CollectPaymentPanel.jsx + NEW MarkCompModal.jsx  
**Files will NOT touch:** DashboardPage.jsx, LoadingPage.jsx, socketHandlers.js, any inventory/expense/settings files

---

## Key Design Questions (MUST resolve before Gate 3)

| # | Decision | Why it matters |
|---|---|---|
| OD-1 | **Partial comp: 2-line split OR compQty field?** Agent recommends 2-line split in orderTransform — sends backend-valid payload without new API contract. But splits the cart visually. | Changes orderTransform financially (R6) |
| OD-2 | **Remove the existing checkbox in CollectPaymentPanel, or keep it as fallback?** If Comp button is in cart, checkbox becomes redundant. | Determines scope of CollectPaymentPanel change |
| OD-3 | **Comp button placement:** next to Cancel button (like Cancel = XCircle), or as a badge/chip on the item row? | Determines CartPanel JSX changes |
| OD-4 | **Can cashier undo comp?** Clicking Comp button again → opens modal with current compQty pre-filled → set to 0 to undo? | State management in CartPanel |
| OD-5 | **QSR billing: comp reduces the total shown on QSR Collect Bill button?** Currently QSR billing uses CartPanel's total computation — comp must be excluded. | orderTransform QSR path |

---

## Risk Classification

- **Risk: CRITICAL**
- Triggers: financial logic (item price zeroed), 3 R5 hotspot files, order payload contract
- Both `orderTransform.js` and `CartPanel.jsx` modified in last 6 days — HIGH merge risk
- Must run full E2E regression (place order → collect bill → verify item amounts in receipt)
- Owner approval MANDATORY at Gate 4

---

## Regression Checklist (for QA)

1. Dine-in: place order with qty-3 item → mark 1 comp → verify payload has 2 lines
2. Dine-in: mark all 3 comp → verify payload has 1 line, all amounts = 0
3. QSR: same as 1 + 2 via QSR billing path
4. Catalog-complementary items (isComplementary=true): comp button disabled
5. Collect bill: existing checkbox still works or is removed cleanly
6. Walk-in: comp + place order → correct
