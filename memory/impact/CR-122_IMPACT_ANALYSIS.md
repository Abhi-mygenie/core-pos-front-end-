# CR-122 — Impact Analysis (Gate 2)

**ID:** CR-122  
**Stage:** Impact Analysis  
**Date:** 2026-07-31  
**Risk:** MEDIUM → revised **LOW-MEDIUM** (label changes are LOW; layout reorder is MEDIUM)

---

## 1. Scope Confirmed (from intake)

Owner request: Rename all "Smart Purchase" labels → "Stock Update", rename button "Submit Purchase" → "Update Stock", remove duplicate toolbar button, move `GroupedVendorPreview` above item list.

---

## 2. File Inventory

### WILL change (4 files, ~9 edits)

| File | Line(s) | Change |
|------|---------|--------|
| `InventoryTabBar.jsx` | 11 | label `'Smart Purchase'` → `'Stock Update'` |
| `Sidebar.jsx` | 128 | label `"Smart Purchase"` → `"Stock Update"` |
| `SmartPurchasePage.jsx` | 24 | heading `Smart Purchase` → `Stock Update` |
| `SmartPurchasePanel.jsx` | 76 | error string `'Failed to load Smart Purchase'` → `'Failed to load Stock Update'` |
| `SmartPurchasePanel.jsx` | 189 | API notes `` `Smart Purchase · horizon Xd` `` → `` `Stock Update · horizon Xd` `` |
| `SmartPurchasePanel.jsx` | 226–234 | **REMOVE** entire "Review & Submit" button block (9 lines) |
| `SmartPurchasePanel.jsx` | 246 | loading text `Loading Smart Purchase…` → `Loading Stock Update…` |
| `SmartPurchasePanel.jsx` | 250–281 | **REORDER** — move `<GroupedVendorPreview>` (lines 275–281) to BEFORE `<AutoShoppingList>` (currently line 250) |
| `SmartPurchasePanel.jsx` | 298 | button label `Submit Purchase (N vendors)` → `Update Stock (N vendors)` |

### WILL NOT touch

- `App.js` — route path `/inventory-smart-purchase` unchanged
- `GroupedVendorPreview.jsx` — component internals unchanged
- `AutoShoppingList.jsx` — unchanged
- `SmartPurchasePage.jsx` — `data-testid="smart-purchase-page"` unchanged (testid)
- `InventoryTabBar.jsx` — `id: 'smart-purchase'` and `path:` unchanged (routing identifiers)
- `Sidebar.jsx` — `id: "inventory-smart-purchase"` and `path:` unchanged
- All other inventory pages (InventoryCurrentStockPage, InventoryReceivePage, etc.)
- `purchasePlanner.js`, `vendorRanking.js`, `inventoryService.js`

---

## 3. Layout Change — Before / After

### Before (current)
```
[Sticky toolbar]
  HorizonPicker | item count | [Review & Submit ← REMOVE]
[loadError banner]
[loading spinner: "Loading Smart Purchase…"]
[else:]
  <AutoShoppingList>   ← 100+ rows
  <GroupedVendorPreview>  ← BURIED BELOW SCROLL
  [submitResults panel]
  [Submit Purchase (N vendors) button ← BURIED]
```

### After (target)
```
[Sticky toolbar]
  HorizonPicker | item count   (button removed)
[loadError banner]
[loading spinner: "Loading Stock Update…"]
[else:]
  <GroupedVendorPreview>   ← VISIBLE IMMEDIATELY (top)
  <AutoShoppingList>       ← rows below
  [submitResults panel]
  [Update Stock (N vendors) button]
```

---

## 4. Risk Assessment

| Change | Risk | Reason |
|--------|------|--------|
| Label renames (6 strings) | LOW | Static text, no logic change |
| Remove toolbar button | LOW | `data-testid="smart-purchase-review-submit"` gone — no functional regression, same `handleSubmit` wired to bottom button |
| Reorder GroupedVendorPreview | LOW-MEDIUM | Moves JSX block; `groupedByVendor`, `paymentMethods`, `pmByVendor`, `vendorNamesById` props all available at same render depth — no state change needed |
| Rename bottom button | LOW | Label change only; `canSubmit` guard, `handleSubmit` wiring unchanged |

**Hotspot check:** `SmartPurchasePanel.jsx` is NOT on R5 list. ✅  
**Financial logic:** No financial calculations touched. ✅  
**R6 (Sacred):** `handleSubmit` function untouched. ✅

---

## 5. Regression Risk

- `smart-purchase-review-submit` testid gone — update test if any. Low risk (no test found referencing it in `/app/frontend/src/__tests__/`).
- No API contract change (notes field is backend-stored string, not a key).
- Route and nav unaffected.
