# BUG-249 — Impact Analysis + Implementation Plan (Gate 2 + Gate 3)

**ID:** BUG-249
**Title:** Current Stock: Negative quantity items show "In Stock" badge
**Date:** 2026-07-25
**Risk:** LOW
**Code Reality:** Bug confirmed — 10 sites use `item.quantity` (stale raw field) for status, but display uses `item.displayQty`.
**Conflict Pre-Check:** `CurrentStockPanel.jsx` last modified by BUG-211 + BUG-212 + CR-086 (2026-07-21). No active items targeting this file. SAFE.

---

## Impact Analysis (Gate 2)

### Data Flow
```
Backend API → inventoryTransform.stockItems() →
  item.quantity    = Number(api.quantity)        ← RAW, stale, wrong unit basis
  item.calQuantity = Number(api.cal_quantity)    ← CALCULATED in small_unit, reliable
  item.displayQty  = Number(api.display_qty)     ← DISPLAY value (kg/ltr), reliable

CurrentStockPanel.jsx:
  DISPLAY (L322):  item.displayQty || item.quantity  → user sees -87496 kg
  STATUS (L325):   item.quantity                      → badge says "In Stock" (wrong!)
  
  ROOT CAUSE: quantity > 0 while displayQty < 0 → status/display mismatch
```

### 10 Affected Sites

| Line | Context | Uses |
|------|---------|------|
| L24 | StatusBadge threshold | `Number(quantity) <= 0` |
| L65 | KPI: lowStock filter | `Number(i.quantity) > 0` |
| L66 | KPI: outOfStock filter | `Number(i.quantity) <= 0` |
| L94 | Status filter: low | `Number(item.quantity) > 0` |
| L95 | Status filter: out | `Number(item.quantity) > 0` |
| L96 | Status filter: ok | `Number(item.quantity) <= 0` |
| L100 | Sort rank | `Number(i.quantity) <= 0` |
| L117 | Excel export status | `Number(item.quantity) <= 0` |
| L148 | PDF export status | `Number(item.quantity) <= 0` |
| L307 | Row tint: isOut | `Number(item.quantity) <= 0` |

### Risk
- **LOW** — single file, purely display/classification logic, no API/financial/state changes
- Pattern is consistent: replace all `item.quantity` status checks with `effectiveQty(item)`

---

## Implementation Plan (Gate 3)

### Scope Lock

**File WILL change:** `components/inventory/CurrentStockPanel.jsx`
**Files will NOT touch:** inventoryTransform.js, inventoryService.js, SmartPurchasePanel.jsx, any other file

### Edit 1 — Add helper function (after L27, before `export default`)

**Insert after line 27:**
```js
// BUG-249: Use displayQty (what user sees) for status, with calQuantity + quantity fallback
const effectiveQty = (item) => Number(item.displayQty || item.calQuantity || item.quantity) || 0;
```

### Edit 2 — StatusBadge (L23-26)

**Current:**
```js
function StatusBadge({ isLowStock, quantity }) {
  if (Number(quantity) <= 0) return <span ...>Out of Stock</span>;
```
**New:**
```js
function StatusBadge({ isLowStock, quantity }) {
  if (quantity <= 0) return <span ...>Out of Stock</span>;
```
*(No change needed inside StatusBadge — caller will pass effectiveQty value instead)*

### Edit 3 — StatusBadge call site (L325)

**Current:** `<StatusBadge isLowStock={item.isLowStock} quantity={item.quantity} />`
**New:** `<StatusBadge isLowStock={item.isLowStock} quantity={effectiveQty(item)} />`

### Edit 4 — KPI counts (L65-66)

**Current:**
```js
const lowStock = stockItems.filter(i => i.isLowStock && Number(i.quantity) > 0).length;
const outOfStock = stockItems.filter(i => Number(i.quantity) <= 0).length;
```
**New:**
```js
const lowStock = stockItems.filter(i => i.isLowStock && effectiveQty(i) > 0).length;
const outOfStock = stockItems.filter(i => effectiveQty(i) <= 0).length;
```

### Edit 5 — Status filters (L94-96)

**Current:**
```js
if (statusFilter === 'low' && !(item.isLowStock && Number(item.quantity) > 0)) return false;
if (statusFilter === 'out' && Number(item.quantity) > 0) return false;
if (statusFilter === 'ok' && (item.isLowStock || Number(item.quantity) <= 0)) return false;
```
**New:**
```js
if (statusFilter === 'low' && !(item.isLowStock && effectiveQty(item) > 0)) return false;
if (statusFilter === 'out' && effectiveQty(item) > 0) return false;
if (statusFilter === 'ok' && (item.isLowStock || effectiveQty(item) <= 0)) return false;
```

### Edit 6 — Sort rank (L100)

**Current:** `const rank = (i) => Number(i.quantity) <= 0 ? 0 : i.isLowStock ? 1 : 2;`
**New:** `const rank = (i) => effectiveQty(i) <= 0 ? 0 : i.isLowStock ? 1 : 2;`

### Edit 7 — Excel export (L117)

**Current:** `'Status': Number(item.quantity) <= 0 ? 'Out of Stock' : item.isLowStock ? 'Low Stock' : 'In Stock',`
**New:** `'Status': effectiveQty(item) <= 0 ? 'Out of Stock' : item.isLowStock ? 'Low Stock' : 'In Stock',`

### Edit 8 — PDF export (L148)

**Current:** `Number(item.quantity) <= 0 ? 'Out of Stock' : item.isLowStock ? 'Low Stock' : 'In Stock',`
**New:** `effectiveQty(item) <= 0 ? 'Out of Stock' : item.isLowStock ? 'Low Stock' : 'In Stock',`

### Edit 9 — Row tint (L307)

**Current:** `const isOut = Number(item.quantity) <= 0;`
**New:** `const isOut = effectiveQty(item) <= 0;`

---

## Verification Matrix

| # | Check | Method | Auto? |
|---|-------|--------|:---:|
| V1 | `effectiveQty` helper exists | grep | YES |
| V2 | Zero references to `Number(item.quantity)` for status | grep | YES |
| V3 | Zero references to `Number(i.quantity)` for status | grep | YES |
| V4 | Webpack compiles, 0 new warnings | log check | YES |
| V5 | Negative displayQty items show "Out of Stock" badge | Browser: login → Current Stock → check Morzella cheese | NO |
| V6 | KPI Out of Stock count includes negative-displayQty items | Browser: KPI card number | NO |
| V7 | "Out of Stock" filter shows negative-displayQty items | Browser: click Out of Stock KPI | NO |

---

## Post-Code Registry Checklist (EXIT GATE)

```
- [ ] registry.json: BUG-249 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: CurrentStockPanel.jsx entry for BUG-249
- [ ] Code markers: // BUG-249 comment in effectiveQty helper
- [ ] Compile check: webpack 0 new warnings
```

---

## Next

Awaiting **Gate 4 GO** from owner to implement.
