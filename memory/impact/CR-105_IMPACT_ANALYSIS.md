# CR-105 — Impact Analysis (Gate 2)

**ID:** CR-105
**Stage:** Gate 2 — Impact Analysis
**Date:** 2026-07-25
**Risk:** LOW
**Code Reality:** PARTIAL — Sub-B (Manual Add) infrastructure already exists: `AdHocTypeahead` component built (AutoShoppingList.jsx:11-53), `onAddAdHoc` handler wired (SmartPurchasePanel.jsx:119), but commented out in UI (L106-110). Sub-A (Show All) = new code.
**Conflict Pre-Check:** No active items targeting these 3 files. BUG-247 (IMPLEMENTED, same session) wrapped VendorSuggestionCell in React.memo — compatible change. SAFE.

---

## 1. Summary

Two sub-features to make Smart Purchase show all ingredients + allow manual additions.

**Sub-A: "Show All" toggle** — new `showAll` state in SmartPurchasePanel. When ON, `computePlan()` returns ALL items (gap < 0 AND gap ≥ 0). In-stock items marked `origin: 'in_stock'` with green tint and `suggest_qty: 0`. Fully editable like deficit items.

**Sub-B: "Add Item" from master list** — **already 90% built**. `AdHocTypeahead` exists, `onAddAdHoc` is wired. Only need to uncomment the trigger button (L106-110) and verify it works post-BUG-247 fix.

---

## 2. Data Flow Trace

### Sub-A: Show All

```
SmartPurchasePanel
  → [NEW] showAll state (default: false)
  → computePlan({ stockInventory, dcrStockSummary, horizonDays, showAll })  ← new param
  → purchasePlanner.js:
      Line 140: velocityRows = rows.filter(r => r.gap < 0)   ← B2 Rule 1 (unchanged)
      [NEW]:    inStockRows = showAll ? rows.filter(r => r.gap >= 0).map(r => ({...r, origin: 'in_stock', suggest_qty: 0})) : []
      Line 168: return [...velocityRows, ...alertRows, ...inStockRows]
  → SmartPurchasePanel.jsx:52: initialRows = planned.map(...)  ← no change, already processes all rows
  → AutoShoppingList renders rows  ← needs green tint for origin='in_stock'
```

### Sub-B: Manual Add

```
AutoShoppingList.jsx:
  Line 106-110: UNCOMMENT the "+ Add Item" button
  → showTypeahead=true → AdHocTypeahead renders (already built L11-53)
  → User picks from ingredientsMaster (master-list only per OQ-2)
  → handlePick() builds row with origin='ad_hoc', calls onAddAdHoc
  → SmartPurchasePanel.jsx:119: onAddAdHoc = setRows([...prev, newRow])  ← already wired
```

---

## 3. Affected Files — Exact Edit Locations

### File 1: `utils/purchasePlanner.js`

| Edit | Line | Current | New |
|------|------|---------|-----|
| E1 | L107 signature | `computePlan({ stockInventory, dcrStockSummary, horizonDays })` | `computePlan({ stockInventory, dcrStockSummary, horizonDays, showAll = false })` |
| E2 | L140-141 (after velocityRows) | — | Add `inStockRows` computation when `showAll` |
| E3 | L168 return | `[...velocityRows, ...alertRows]` | `[...velocityRows, ...alertRows, ...inStockRows]` |

**~8 lines added.**

### File 2: `components/inventory/SmartPurchasePanel.jsx`

| Edit | Line | Current | New |
|------|------|---------|-----|
| E4 | ~L17 | — | Add `const [showAll, setShowAll] = useState(false);` |
| E5 | L45-49 | `computePlan({ stockInventory, dcrStockSummary: dcr?.stock_summary \|\| [], horizonDays })` | Add `showAll` param |
| E6 | L75 deps | `[horizonDays]` | `[horizonDays, showAll]` |
| E7 | ~L200 (header area) | — | Add toggle switch UI for "Show All" |

**~10 lines added.**

### File 3: `components/inventory/smart/AutoShoppingList.jsx`

| Edit | Line | Current | New |
|------|------|---------|-----|
| E8 | L72-79 `rowBg()` | No `in_stock` case | Add `if (row.origin === 'in_stock') return 'bg-green-50/30';` |
| E9 | L106-110 | Commented out `+ Add Ad-hoc Item` button | UNCOMMENT and rename to `+ Add Item` |
| E10 | L159 (origin badges) | `stock_alert` badge only | Add `in_stock` green badge: "In stock" |

**~5 lines changed.**

---

## 4. Files WILL Change

| File | Lines | Change |
|------|-------|--------|
| `utils/purchasePlanner.js` | ~107, 140-141, 168 | +showAll param, +inStockRows, return merge |
| `components/inventory/SmartPurchasePanel.jsx` | ~17, 45, 75, 200 | +showAll state, pass to computePlan, toggle UI |
| `components/inventory/smart/AutoShoppingList.jsx` | ~72, 106-110, 159 | +in_stock rowBg, uncomment Add Item button, +badge |

## Files will NOT touch

- `VendorSuggestionCell.jsx` — no change
- `GroupedVendorPreview.jsx` — no change
- `vendorRanking.js` — no change
- `inventoryService.js` — no API change
- `inventoryTransform.js` — no transform change
- `HorizonPicker.jsx` — no change

---

## 5. Risk Assessment

| Factor | Assessment |
|--------|-----------|
| Change scope | 3 files, ~23 lines (8 + 10 + 5) |
| Financial logic | NO — planner math unchanged, only filter relaxed |
| API contract | NO — same API calls, no new endpoints |
| State management | +1 boolean state (`showAll`), trivial |
| Hotspot file? | NO — none of these 3 files are in R5 hotspot list |
| B2 ruling | PRESERVED — default `showAll=false` keeps B2 behavior. Toggle opt-in only. |
| Sub-B risk | VERY LOW — component already built+wired, just uncomment trigger |

**Risk: LOW**

---

## 6. Mockup

HTML mockup at: `/app/frontend/public/__dev/cr105-mockup.html`
Shows: toggle in header + "Add Item" button + in-stock rows with green tint

---

## Next

Ready for **Gate 3 — Implementation Plan**.
