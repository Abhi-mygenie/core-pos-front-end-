# BUG-573 — Implementation Plan (Gate 3)
## Order card variation: show selected option from v.values[].label

**ID:** BUG-573
**Date:** 2026-10-21
**Code Reality:** PARTIAL — variant parser exists but misses `values[]` array
**Risk:** LOW — display-only, 1 file, no financial/state/API change
**Files WILL change:** `src/components/cards/OrderCard.jsx` (1 file)
**Files WILL NOT touch:** orderTransform.js, OrderEntry.jsx, any R5 hotspot

---

## 1. Scope Lock

1 file, 1 edit site. Display-only change — no API, no state, no financial logic.

**Also verified:** Order-level notes (`order.orderNote`) mapping + rendering chain is correct:
- `orderTransform.js:306` maps `api.order_note` → `orderNote` ✅
- `OrderCard.jsx:636-647` renders with FileText icon when truthy ✅
- Backend not returning the value is a separate backend bug (Gap 2 in IA) — no FE fix needed

---

## 2. Edit

### E-1: Add `v.values[]` array support to variant parser (L699-711)

**Current (L699-711):**
```js
const variantStr = variants.map(v => {
  if (typeof v === 'string') return v;
  // Check for name + labels array format (e.g., {name: "HALFNHALF", labels: ["Marinara"]})
  if (v.labels && Array.isArray(v.labels) && v.labels.length > 0) {
    const name = v.name || v.variant_name || v.variant_group || '';
    return `${name}: ${v.labels.join(', ')}`;
  }
  // Check for name + value format
  const name = v.name || v.variant_name || v.variant_group || '';
  const value = v.value || v.option_label || v.label || v.selected_option || '';
  if (name && value) return `${name}: ${value}`;
  return name || value || '';
}).filter(Boolean).join(', ');
```

**New (L699-715):**
```js
const variantStr = variants.map(v => {
  if (typeof v === 'string') return v;
  const name = v.name || v.variant_name || v.variant_group || '';
  // BUG-573: Check for values[] array (backend sends selected options here)
  if (v.values && Array.isArray(v.values) && v.values.length > 0) {
    const selected = v.values.map(val => val.label).filter(Boolean).join(', ');
    if (name && selected) return `${name}: ${selected}`;
    return selected || name || '';
  }
  // Check for name + labels array format (e.g., {name: "HALFNHALF", labels: ["Marinara"]})
  if (v.labels && Array.isArray(v.labels) && v.labels.length > 0) {
    return `${name}: ${v.labels.join(', ')}`;
  }
  // Check for name + value format (flat field fallback)
  const value = v.value || v.option_label || v.label || v.selected_option || '';
  if (name && value) return `${name}: ${value}`;
  return name || value || '';
}).filter(Boolean).join(', ');
```

**What changes:**
- Hoisted `name` extraction to top (was duplicated in two branches)
- Added `v.values[]` check as FIRST array branch (before `v.labels`)
- Extracts `val.label` from each entry, joins with comma for multi-select
- Existing `v.labels` and flat-field branches remain as fallbacks

**Examples after fix:**
| API data | Before | After |
|----------|--------|-------|
| `{name:"Choice Of Dip", values:[{label:"Tomato Relish"}]}` | "Choice Of Dip" | "Choice Of Dip: Tomato Relish" |
| `{name:"Choice Of:", values:[{label:"Poached"}]}` | "Choice Of:" | "Choice Of: Poached" |
| `{name:"Choice Of Rice", values:[{label:"Basmati"}]}` | "Choice Of Rice" | "Choice Of Rice: Basmati" |
| `{name:"Choice Of Filling (Max 2)", values:[{label:"Fried Egg"},{label:"Pineapple"}]}` | "Choice Of Filling (Max 2)" | "Choice Of Filling (Max 2): Fried Egg, Pineapple" |
| `{name:"HALFNHALF", labels:["Marinara"]}` | "HALFNHALF: Marinara" | "HALFNHALF: Marinara" (unchanged) |
| `{name:"Size", value:"Large"}` | "Size: Large" | "Size: Large" (unchanged) |

---

## 3. Execution Sequence

1. E-1 — Replace variant parser block
2. Verify webpack compiles with 0 new warnings
3. Run verification matrix

---

## 4. Verification Matrix

| # | Check | How to Verify | Auto? |
|---|-------|---------------|:---:|
| V-1 | `v.values` check present | grep `v.values` in OrderCard.jsx | YES |
| V-2 | `// BUG-573` marker present | grep `BUG-573` in OrderCard.jsx | YES |
| V-3 | `v.labels` branch still works | Code review — branch intact after `v.values` | YES |
| V-4 | Flat-field fallback still works | Code review — `v.value \|\| v.option_label` branch intact | YES |
| V-5 | Webpack compiles 0 new warnings | Hot reload log | YES |
| V-6 | Single-select variation shows selected option | Browser: order with "Choice Of Dip" → shows "Choice Of Dip: Tomato Relish" | NO |
| V-7 | Multi-select variation shows all selected | Browser: order with multiple values → comma-separated | NO |
| V-8 | Addons still display correctly | Browser: order with addons → still shows "+ milk" etc | NO |
| V-9 | Item notes still display correctly | Browser: order with food_level_notes → still shows with icon | NO |
| V-10 | Order note renders when backend sends it | Code review: L636 `order.orderNote &&` unchanged | YES |

---

## 5. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-573 → status: GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated with IMPLEMENTED status
- [ ] FILE_OWNERSHIP.md: add OrderCard.jsx with BUG-573 + date
- [ ] Code markers: // BUG-573 comment in OrderCard.jsx
- [ ] COMPILE CHECK: webpack 0 new warnings
```

---

## 6. Risks

| # | Risk | Mitigation |
|---|------|------------|
| R-1 | `v.values` exists but contains all options not just selected | API probe confirmed: `values[]` in the order response contains ONLY the selected option(s), not the full catalog. `food_details.variations[].values` has the full list, but `item.variation[].values` has only selected. |
| R-2 | Breaks existing `v.labels` format | `v.values` check runs FIRST — if no `values` array, falls through to `v.labels` unchanged |
| R-3 | Breaks flat-field format | Flat fields checked after both array branches — unchanged |
