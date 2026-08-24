# BUG-209 — Gate 2 (Impact Analysis) + Gate 3 (Implementation Plan)

**ID:** BUG-209
**Title:** Weight Item Qty Display — Bill Summary Missing Unit Labels (`x100` → `100gm`)
**Date:** 2026-08-20
**Planner:** PLANNING AGENT (AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 2 + Gate 3 (combined, owner requested both)
**Risk:** MEDIUM (R5 hotspot — CollectPaymentPanel.jsx, display only, no financial logic)
**Intake doc:** `change_requests/BUG-209_WEIGHT_DISPLAY_BILL_SUMMARY.md`
**Investigation:** `investigation/BUG-209_INVESTIGATION_REPORT_2026_08_20.md`

---

## Code Reality Check

```bash
grep -n "isWeightItem\|itemUnit" src/components/order-entry/CollectPaymentPanel.jsx
# → 0 results — no weight-item handling exists anywhere in this file
grep -n "x{item\.qty}" src/components/order-entry/CollectPaymentPanel.jsx
# → 5 locations: L1925, L2310, L2880, L2918, L2956
```

**Code Reality: NONE** — fix does not exist. All 5 `x{item.qty}` locations need updating.

---

## Conflict Pre-Check

| File | Open items | Lines they touch | Overlap? |
|---|---|---|---|
| `CollectPaymentPanel.jsx` | CR-058 (INTAKE) | Complementary logic (different area) | **SAFE** |

**Pre-Check: CLEAN** — no open item overlaps with target lines.

---

## Gate 2 — Impact Analysis

### Root Cause

`CollectPaymentPanel.jsx` renders item quantity as `x{item.qty}` at 5 locations with zero `isWeightItem` awareness. `CartPanel.jsx` already has the correct weight-label logic (L169-173). The `isWeightItem` and `itemUnit` fields ARE present on all cart item objects (set at `OrderEntry.jsx:89`) and flow through to all display lists in CollectPaymentPanel.

### All 5 affected locations

| Line | Context | Item source | Fix priority |
|---|---|---|---|
| **L1925** | Bill Summary — postpaid/dine-in primary list | `displayItems` (from `cartItems`) | **P1 — primary** |
| **L2310** | Bill Summary — QSR/alternate primary list | `displayItems` (from `cartItems`) | **P1 — primary** |
| **L2880** | Bar section compact list | `barItems` ← `activeItems` ← `cartItems` | **P2 — secondary** |
| **L2918** | Kitchen section compact list | `kitchenItems` ← `activeItems` ← `cartItems` | **P2 — secondary** |
| **L2956** | Cancelled items strikethrough list | `cancelledItems` ← `useMemo` ← `cartItems` | **P2 — secondary** |

### Data flow confirmed

```
OrderEntry.jsx:89 — isWeightItem: ['Kg','gm','L','ml'].includes(product.itemUnit)
OrderEntry.jsx:88 — itemUnit: product.itemUnit || null
       ↓
cartItems[] (prop passed to CollectPaymentPanel)
       ↓
displayItems / barItems / kitchenItems / cancelledItems
       ↓
All 5 render locations → item.isWeightItem + item.itemUnit AVAILABLE ✅
```

### CartPanel reference logic (L169-173)

```js
item.isWeightItem
  ? (item.qty < 1 && (item.itemUnit === 'Kg' || item.itemUnit === 'L')
      ? `${Math.round(item.qty * 1000)}${item.itemUnit === 'Kg' ? 'gm' : 'ml'}`
      : `${parseFloat((item.qty || 0).toFixed(2))}${item.itemUnit}`)
  : `x${item.qty}`
```

**Behaviour:**
| qty | itemUnit | Output |
|---|---|---|
| 100 | gm | `100gm` |
| 0.5 | Kg | `500gm` (converts sub-1 Kg to grams) |
| 1.5 | Kg | `1.5Kg` |
| 0.5 | L | `500ml` (converts sub-1 L to ml) |
| 3 | — | `x3` (normal item) |

### Scope NOT in this fix

| Item | Reason |
|---|---|
| Gap 2 (owner config — mixed units) | Not a code bug |
| Gap 3 (backend receipt printer) | Backend-owned |
| `SplitBillModal.jsx:441` (`x{item.qty}`) | Out of intake scope — separate batch if needed |

### Risk Classification

**MEDIUM** — R5 hotspot (CollectPaymentPanel). Display only — no price, tax, or financial logic touched. Fast Lane NOT eligible (hotspot).

---

## Gate 3 — Implementation Plan

### Architecture Decision: Local `formatQty` helper

With 5 locations needing the same logic, a **local helper const** inside the component is cleanest:

```js
// Add near other display helpers in CollectPaymentPanel
// BUG-209: weight-item qty display — mirrors CartPanel.jsx L169-173
const formatQty = (item) =>
  item?.isWeightItem
    ? (item.qty < 1 && (item.itemUnit === 'Kg' || item.itemUnit === 'L')
        ? `${Math.round(item.qty * 1000)}${item.itemUnit === 'Kg' ? 'gm' : 'ml'}`
        : `${parseFloat((item.qty || 0).toFixed(2))}${item.itemUnit}`)
    : `x${item.qty}`;
```

All 5 locations replace their inline expression with `{formatQty(item)}`.

---

### Edit 1 — Add `formatQty` helper

**Location:** After existing display helpers (search for `const isLineComplimentary` which is near the top of the component). Add `formatQty` immediately after.

```js
// BUG-209: weight-item qty display helper — mirrors CartPanel.jsx L169-173
const formatQty = (item) =>
  item?.isWeightItem
    ? (item.qty < 1 && (item.itemUnit === 'Kg' || item.itemUnit === 'L')
        ? `${Math.round(item.qty * 1000)}${item.itemUnit === 'Kg' ? 'gm' : 'ml'}`
        : `${parseFloat((item.qty || 0).toFixed(2))}${item.itemUnit}`)
    : `x${item.qty}`;
```

**Verify:** Function defined once, accessible in all render contexts (it's in component scope).

---

### Edit 2 — L1925: Primary Bill Summary span

**Current:**
```jsx
<span className="ml-2" style={{ color: COLORS.grayText }}>x{item.qty}</span>
```

**New:**
```jsx
<span className="ml-2" style={{ color: COLORS.grayText }}>{formatQty(item)}</span>{/* BUG-209 */}
```

---

### Edit 3 — L2310: Secondary Bill Summary span

**Current:**
```jsx
<span className="ml-2" style={{ color: COLORS.grayText }}>x{item.qty}</span>
```

**New:**
```jsx
<span className="ml-2" style={{ color: COLORS.grayText }}>{formatQty(item)}</span>{/* BUG-209 */}
```

---

### Edit 4 — L2880: Bar items compact list

**Current:**
```jsx
<div key={idx}>{item.name} x{item.qty}</div>
```

**New:**
```jsx
<div key={idx}>{item.name} {formatQty(item)}</div>{/* BUG-209 */}
```

---

### Edit 5 — L2918: Kitchen items compact list

**Current:**
```jsx
<div key={idx}>{item.name} x{item.qty}</div>
```

**New:**
```jsx
<div key={idx}>{item.name} {formatQty(item)}</div>{/* BUG-209 */}
```

---

### Edit 6 — L2956: Cancelled items list

**Current:**
```jsx
<div key={idx} className="line-through">{item.name} x{item.qty} - ₹{getItemLinePrice(item)}</div>
```

**New:**
```jsx
<div key={idx} className="line-through">{item.name} {formatQty(item)} - ₹{getItemLinePrice(item)}</div>{/* BUG-209 */}
```

---

### Execution Sequence

| # | Edit | Lines | Type |
|---|---|---|---|
| 1 | Add `formatQty` helper | After `isLineComplimentary` (~L150 area) | +5 lines |
| 2 | L1925 span | 1 line change | MODIFIED |
| 3 | L2310 span | 1 line change | MODIFIED |
| 4 | L2880 compact | 1 line change | MODIFIED |
| 5 | L2918 compact | 1 line change | MODIFIED |
| 6 | L2956 cancelled | 1 line change | MODIFIED |

**Total: 1 file, +5 lines (helper) + 5 × 1-line changes = ~10 net lines**

---

### Verification Matrix

| # | Edit | Verification | Manual/Auto |
|---|---|---|---|
| 1 | `formatQty` helper correct | Check: 100gm→"100gm", 0.5Kg→"500gm", 0.5L→"500ml", 3 (normal)→"x3" | Code review |
| 2 | L1925 shows "100gm" not "x100" | Browser: weight item in Bill Summary primary list | Manual |
| 3 | L2310 shows "100gm" not "x100" | Browser: QSR collect bill weight item | Manual |
| 4 | L2880 bar items show unit | Browser: bar-station weight item (if applicable) | Manual |
| 5 | L2918 kitchen items show unit | Browser: kitchen weight item in split view | Manual |
| 6 | Cancelled item shows unit in strikethrough | Browser: cancel a weight item | Manual |
| R1 | Normal items still show "x3" (no regression) | Browser: non-weight item — verify "x3" unchanged | Manual |
| R2 | Collect Bill math/totals unchanged | Verify prices still correct after display change | Manual |
| R3 | Webpack 0 new warnings | Compile check | Auto |

---

### Post-Code Registry Checklist

```
- [ ] registry.json: BUG-209 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: CollectPaymentPanel.jsx BUG-209 entry added
- [ ] Code markers: // BUG-209 in every modified location
- [ ] Compile: webpack 0 new warnings
```

---

## Files WILL change
- `src/components/order-entry/CollectPaymentPanel.jsx` (1 helper + 5 line edits)

## Files WILL NOT touch
`CartPanel.jsx`, `OrderEntry.jsx`, `orderTransform.js`, `SplitBillModal.jsx`, any other file

---

*Planning complete. Awaiting Gate 4 GO from owner.*
