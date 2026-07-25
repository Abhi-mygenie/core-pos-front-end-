# BUG-203 — Impact Analysis (Gate 2)

**Date:** 2026-07-17
**Role:** PLANNING
**Gate:** 2 (Impact Analysis)
**Code Reality:** NONE — no price input exists in inline edit row
**Conflict Pre-Check:** No other active item targets `ExpenseSetupPanel.jsx` inline edit block (CR-074-B Phase 6 closed)

---

## 1. Summary

The inline edit row (pencil icon) on Expense Setup Stock Master only allows editing item **name** and **category**. Missing: unit price input. Owner wants price editable inline.

**Backend constraint (curl-verified 2026-07-17):** PUT `/expenses/{id}` silently **ignores** the `unit_price` field. Response only echoes `{id, stock_title, category_id, category_name}`. The price stayed at ₹20 after PUT with `unit_price: 99.50`.

**Owner decision:** (a) File backend brief for §3.4 for future + (b) Use **2-call workaround** now — PUT name+cat via existing endpoint, then set/edit price via separate `editUnitPrice(id, price)` or `addUnitPrice(stockId, 1, price)`.

---

## 2. Data Flow Trace

### Current inline edit flow (CR-074-B Phase 3):
```
User clicks pencil → editingItemId set → row renders name input + category dropdown
→ Save → PUT /expenses/{id} with {stock_title, category_id}
→ Optimistic local update → done
```

### Proposed 2-call workaround flow:
```
User clicks pencil → row renders name input + category dropdown + PRICE INPUT (new)
→ Save →
  Call 1: PUT /expenses/{id} with {stock_title, category_id} (existing)
  Call 2 (if price changed):
    IF item already has unitPrice → editUnitPrice(unitPriceRowId, newPrice)
    IF item had no price → addUnitPrice(stockId, 1, newPrice)
    IF price cleared → deleteUnitPrice(unitPriceRowId)
→ Optimistic local update → done
```

### Key data dependency:
- `allItems[]` has `{id, title, categoryId, unitPrice (bool), unitPriceAmount}` — knows IF priced and the amount, but **NOT** the `unitPriceRowId` (unit_price table's own PK)
- `pricedItems[]` has `{id (=unitPriceRowId), stockId, stockTitle, price}` — loaded **only** when Unit Prices tab is active
- **Gap:** When user is on Stock Master tab and clicks edit, `pricedItems` may be empty. Need to either:
  - (A) Eagerly load `pricedItems` on mount (1 extra API call)
  - (B) Lazy-fetch the unitPriceRowId when user enters edit mode for a priced item
  - (C) Build a `stockId → unitPriceRowId` lookup from `pricedItems` and keep it synced

---

## 3. API Endpoints (curl-verified)

| Endpoint | Method | Payload | Returns | Verified |
|---|---|---|---|---|
| `/expenses/{id}` | PUT | `{stock_title, category_id}` | `{message, updated_expense}` | ✅ unit_price silently ignored |
| `/stock-unit-prices` | GET | — | `[{id, stock_id, expense_name, quantity, price}]` | ✅ 3 priced items on cafe103 |
| `/stock-unit-price` | POST | `{stock_id, quantity, price}` | Creates new unit price row | ✅ (validation errors returned on empty body) |
| `/stock-unit-price/{id}` | PUT | `{price}` | Edits existing unit price row | ✅ (used by Unit Prices tab) |
| `/stock-unit-price/{id}` | DELETE | — | Deletes unit price row | ✅ (used by Unit Prices tab) |

---

## 4. Affected Files

| File | Change | Risk |
|---|---|---|
| `ExpenseSetupPanel.jsx` | Add price input to inline edit row; update `saveEditItem()` with 2-call logic; load/cache `pricedItems` for stockId→unitPriceRowId lookup | MEDIUM |
| `expenseService.js` | No new functions needed — `editUnitPrice`, `addUnitPrice`, `deleteUnitPrice` already exist | NONE |
| `expenseTransform.js` | No change needed | NONE |

### Bulk Editor feasibility (owner asked):
- **Current:** Read-only `₹X.XX` chip via `bulk-price-chip-{id}`. No per-row edit for price.
- **To add:** Would need a price input column in the grid + same 2-call save logic on bulk save.
- **Complexity:** MEDIUM — `ExpenseBulkEditor.jsx` (875 lines) already tracks dirty state per row. Adding a `price` column + `priceChanged` dirty flag + 2-call save is ~40-60 lines.
- **Recommendation:** Feasible. Ship in same implementation as Stock Master inline edit since the service calls are identical.

---

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Race condition: PUT name+cat succeeds but editUnitPrice fails | LOW | Item renamed but price unchanged; stale UI | Revert name on price-call failure; OR toast "Name saved, price update failed" and keep |
| pricedItems stale (user changed price in Unit Prices tab, then edits in Stock Master) | LOW | Wrong unitPriceRowId → 404 on editUnitPrice | Refresh pricedItems lookup before save; OR catch 404 and retry with addUnitPrice |
| User clears price (sets to empty/0) — should that delete the unit price row? | MEDIUM | Ambiguous UX | Owner decision needed |

---

## 6. Owner Decisions (locked 2026-07-17)

| # | Decision |
|---|---|
| **OQ-1 → (c) VALIDATE.** | Price field is required for priced items — show validation error if empty. User cannot clear a unit price via inline edit (they must use the Unit Prices tab to delete). Rationale: user doesn't control amount directly, only unit — price must always be present. |
| **OQ-2 → (a) YES.** | Bulk Editor gets price column in same implementation. Same 2-call service pattern. |

---

## 7. Evidence

- PUT probe with unit_price field: `/app/memory/evidence/BUG-203/put_probe_with_unit_price.json`
- Unit prices GET response (cafe103): 3 priced items (pav×3 at ₹20/₹26/₹30)
- Service functions already exist: `editUnitPrice(id, price)`, `addUnitPrice(stockId, qty, price)`, `deleteUnitPrice(id)`

---

## 8. Backend Brief (for future §3.4)

**Filed separately.** Requesting: PUT `/expenses/{id}` to optionally accept `unit_price` field. When provided, backend creates/updates the `stock_unit_prices` row in a single transaction. Eliminates the 2-call workaround and race condition risk.

---

**Impact Analysis complete. All OQs locked. Ready for Gate 3 (Implementation Plan).**
