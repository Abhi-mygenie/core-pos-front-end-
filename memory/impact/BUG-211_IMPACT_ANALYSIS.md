# BUG-211 — Impact Analysis + Implementation Plan

**ID:** BUG-211
**Stage:** Impact Analysis + Implementation Plan (Gate 2+3)
**Code Reality:** NONE
**Risk:** MEDIUM
**Conflict Pre-Check:** No other items touching `CurrentStockPanel.jsx`

---

## Impact Analysis (Gate 2)

### Data Flow
```
API: getStockInventory() → fromAPI.stockItems() → stockItems state
→ useMemo `filtered` (L85-96, NO .sort()) → table render (L286)
```

### Break Points
1. **Sort:** `filtered` useMemo has NO `.sort()` — items in raw API insertion order
2. **KPI click:** KPI cards (L146-183) are `<div>` with no `onClick`. Status chips (L244-268) have `setStatusFilter()` — filter infra exists

### Affected Files
- `CurrentStockPanel.jsx` (331 lines) — ONLY file

---

## Implementation Plan (Gate 3)

### Edit 1: Add `.sort()` to `filtered` useMemo (L85-96)

**Current (L85-96):**
```js
const filtered = useMemo(() => {
  return stockItems.filter(item => { ... });
}, [stockItems, search, categoryFilter, statusFilter]);
```

**New:** Chain `.sort()` after `.filter()`:
```js
const filtered = useMemo(() => {
  return stockItems.filter(item => { ... }).sort((a, b) => {
    const aOut = Number(a.quantity) <= 0 ? 0 : a.isLowStock ? 1 : 2;
    const bOut = Number(b.quantity) <= 0 ? 0 : b.isLowStock ? 1 : 2;
    return aOut - bOut; // Out of Stock → Low Stock → In Stock
  });
}, [stockItems, search, categoryFilter, statusFilter]);
```

### Edit 2: Make KPI cards clickable (L146-183)

Add `onClick`, `cursor-pointer`, active ring state to Low Stock, Out of Stock, and In Stock KPI cards. Toggle behavior: click sets filter, click again clears.

### Edit 3: Remove status chip row (L243-268)

Per owner Option A: KPI cards replace chip row. Remove the entire `<div data-testid="status-chips">` block + `CHIP_CLASSES` constant (L13-18).

### Verification Matrix

| # | File | Change | How to Verify |
|---|------|--------|---------------|
| 1 | CurrentStockPanel.jsx:85 | Sort added | Table shows Out of Stock first, then Low, then In Stock |
| 2 | CurrentStockPanel.jsx:146-183 | KPI click | Click "Low Stock" card → table filters to low stock only |
| 3 | CurrentStockPanel.jsx:243-268 | Chip row removed | No status chip row visible below toolbar |

### Post-Code Registry Checklist
- [ ] registry.json: BUG-211 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: CurrentStockPanel.jsx
- [ ] Code marker: // BUG-211
