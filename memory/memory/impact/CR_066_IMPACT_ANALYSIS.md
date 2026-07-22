# CR-066 — Impact Analysis (Gate 2)

**ID:** CR-066
**Title:** Unit Price Management — Tab in Expense Setup
**Date:** 2026-07-10
**Agent:** PLANNING (AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** PARTIAL (service layer ready, transform partially ready, no UI)
**Conflict Pre-Check:** NONE — no other active CR touches ExpenseSetupPanel or expenseTransform

---

## 1. Owner Decisions (All Locked)

| # | Decision | Answer |
|---|----------|--------|
| Q1 | Route location | **Tab inside `/expense-setup`** (no new route/page) |
| Q2 | Cashier restriction | **No restriction now** — role gating deferred to separate CR |
| Q3 | `quantity` + `price` → unit price | **unit_price = price ÷ quantity.** Default qty=1 → unit_price=price. If user enters qty>1, unit_price auto-computes = price/qty |
| Q4 | Display | **Two sections** — "Not Priced Yet" (top) + "Priced" (bottom). Items move down once price is set |

---

## 2. Data Flow Trace

### Current (no unit price UI)
```
fetchAll() → getCategories() + getExpenseItems() + getUnits()
           → allItems[].unitPriceAmount (exists in transform but not surfaced in UI)
```

### New (unit price tab)
```
loadUnitPriceTab() → Promise.all([
    getUnitPrices()           → fromAPI.unitPrices()   → pricedItems[]
    getItemsWithoutPrices()   → fromAPI.itemsWithoutPrices() ← NEW TRANSFORM
])

UI: two sections
  Section A — Not Priced Yet: itemsWithoutPrices[]
    Each row: stock title + category | [qty input=1] [price input] [Set Price btn]
    On Save: addUnitPrice(stockId, qty, price) → move row to Section B

  Section B — Priced: pricedItems[]
    Each row: stock title | qty | price | unit_price display | [Edit] [Delete]
    On Edit: editUnitPrice(id, price)
    On Delete: deleteUnitPrice(id) → move row back to Section A

Unit price display formula:
  unit_price = price / quantity   (shown as "₹X per unit")
  e.g. qty=30, price=180 → unit_price = ₹6/egg
```

---

## 3. What Exists vs What's Missing

| Layer | Status | Detail |
|-------|--------|--------|
| `getUnitPrices()` service | ✅ Ready | `expenseService.js` L202 |
| `getItemsWithoutPrices()` service | ✅ Ready | `expenseService.js` L208 |
| `addUnitPrice(stockId, qty, price)` service | ✅ Ready | `expenseService.js` L222 |
| `editUnitPrice(id, price)` service | ✅ Ready | `expenseService.js` L235 |
| `deleteUnitPrice(id)` service | ✅ Ready | `expenseService.js` L243 |
| `fromAPI.unitPrices()` transform | ✅ Ready | `expenseTransform.js` L170-183 |
| `fromAPI.itemsWithoutPrices()` transform | ❌ **MISSING** | Needs ~8 lines |
| Tab switcher in ExpenseSetupPanel | ❌ **MISSING** | Needs ~120 lines (additive) |
| Unit price tab UI | ❌ **MISSING** | Two-section layout |

---

## 4. Affected Files

### Files WILL change

| File | Change type | Lines estimate | Hotspot? |
|------|-------------|----------------|----------|
| `components/expense/ExpenseSetupPanel.jsx` | Additive — tab state + tab switcher + Unit Price tab JSX | +120 lines | NO |
| `api/transforms/expenseTransform.js` | Additive — `itemsWithoutPrices()` transform | +10 lines | NO |

### Files will NOT touch
- `pages/ExpenseSetupPage.jsx` — shell unchanged (ExpenseSetupPanel handles all logic)
- `App.js` — no new route (tab, not page)
- `Sidebar.jsx` — no new nav entry (Q1=tab, Q2=no restriction)
- `api/services/expenseService.js` — all 5 functions ready, zero changes needed
- Any R5 hotspot files (OrderEntry, CollectPaymentPanel, orderTransform, DashboardPage, LoadingPage)

---

## 5. Technical Decisions

### Tab switcher placement
Insert a 2-tab strip between the page header and the existing DragDropContext layout:
```
[Expense Setup header + Export/Import/BulkEdit/Refresh buttons]
[  Stock Master  |  Unit Prices  ]  ← NEW tab strip
[existing DragDropContext layout / new UnitPrice layout]
```
When "Unit Prices" tab is active → DragDropContext is hidden, Unit Price layout renders.

### Unit price computation (Q3)
```javascript
// In the Set Price handler:
const computedUnitPrice = qty > 1 ? price / qty : price;
// Display: `₹${computedUnitPrice.toFixed(2)} per unit`
```
The `quantity` field is passed as-is to `addUnitPrice(stockId, quantity, price)`.
The FE shows `price / quantity` as the computed unit price for the owner's reference.

### Optimistic local state (no full refetch on save/delete)
- On `addUnitPrice` success: remove item from `unpricedItems`, add to `pricedItems`
- On `deleteUnitPrice` success: remove from `pricedItems`, add back to `unpricedItems`
- On `editUnitPrice` success: update in `pricedItems` in place
- Avoids flicker (consistent with BUG-162 optimistic update approach)

### `fromAPI.itemsWithoutPrices()` shape
```javascript
itemsWithoutPrices: (res) => {
  const data = res?.data?.data ?? res?.data ?? [];
  return Array.isArray(data)
    ? data.map((i) => ({ id: i.id, title: i.stock_title ?? '' }))
    : [];
}
```

---

## 6. Risk Register

| Risk | Level | Mitigation |
|------|-------|------------|
| `editUnitPrice(id, price)` only takes `price` — can't update `quantity` | LOW | Show qty as read-only on edit; delete + re-add to change qty. Document in UI tooltip. |
| `getItemsWithoutPrices()` returns items with blank `stock_title` (seen in curl: `""`) | LOW | Filter out blank titles on FE (`title.trim() !== ''`) |
| No financial/billing impact — unit prices are cost tracking only, not customer-facing | NONE | R6 does not apply |
| No hotspot files touched | NONE | R5 does not apply |

---

## 7. Verification Matrix (seeds QA handover)

| Edit # | File | Change | How to Verify |
|--------|------|--------|---------------|
| 1 | `expenseTransform.js` | `itemsWithoutPrices()` transform | Unit: returns array with `id` + `title` |
| 2 | `ExpenseSetupPanel.jsx` | Tab strip renders | Browser: `/expense-setup` shows 2 tabs |
| 3 | `ExpenseSetupPanel.jsx` | "Not Priced Yet" section loads items | Browser: items without price appear in section A |
| 4 | `ExpenseSetupPanel.jsx` | Set Price: qty=1, price=50 → unit_price=50 | Browser: price shows ₹50/unit, moves to section B |
| 5 | `ExpenseSetupPanel.jsx` | Set Price: qty=30, price=180 → unit_price=6 | Browser: computed price shows ₹6/unit |
| 6 | `ExpenseSetupPanel.jsx` | Edit price → updates in section B | Browser: edit inline, price updates |
| 7 | `ExpenseSetupPanel.jsx` | Delete price → item moves back to section A | Browser: item returns to "Not Priced Yet" |
| 8 | `ExpenseSetupPanel.jsx` | Blank title items filtered out | Browser: no blank-name rows appear |

---

## 8. Post-Code Registry Checklist

- [ ] `registry.json`: CR-066 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] `CR_REGISTRY.md`: row updated with IMPLEMENTED status
- [ ] `FILE_OWNERSHIP.md`: `ExpenseSetupPanel.jsx` + `expenseTransform.js` listed with CR-066 + date
- [ ] Code markers: `// CR-066` in every modified file

---

## Summary

```
Planning complete: CR-066
Stage: Impact Analysis (Gate 2)
Code reality: PARTIAL (service layer ready, transform partial, UI missing)
Risk: LOW–MEDIUM (no R5/R6, no hotspot, additive only)
Files WILL change: ExpenseSetupPanel.jsx (+120 lines), expenseTransform.js (+10 lines)
Files WILL NOT touch: ExpenseSetupPage.jsx, App.js, Sidebar.jsx, expenseService.js, all R5 hotspots
Owner decisions: ALL LOCKED (Q1–Q4)
Docs: /app/memory/impact/CR_066_IMPACT_ANALYSIS.md
Next: Gate 3 (Implementation Plan) → Gate 4 GO
```
