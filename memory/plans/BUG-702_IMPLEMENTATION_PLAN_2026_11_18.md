# BUG-702 — Implementation Plan (Gate 3)
## ScanOrderPopOut: show selected variation option(s) + each price (Option A)

**ID:** BUG-702
**Date:** 2026-11-18
**Role:** PLANNING (stage = implementation_plan)
**Code Reality:** CONFIRMED — items carry `variation` in RESPONSE shape `[{name, values:[{label, optionPrice}]}]` (orderTransform.js:136); popup renders `v.name` / `Number(v.price)` only
**Risk:** LOW — display-only, 1 file, no financial/state/API/print change
**Design:** Option A (`design/POS_INVEST_GATE2_5_MOCKUPS_2026_11_18.html`) → `Oat milk (+₹40.00), Large (+₹20.00)` (option name(s) + each price, no group label)
**Files WILL change:** `src/components/dashboard/ScanOrderPopOut.jsx` (1 file, 3 edit sites)
**Files WILL NOT touch:** `orderTransform.js` · `CartPanel.jsx` (read-only reference) · `DashboardPage.jsx` · any R5 transform/socket/context

---

## 1. Scope Lock

1 file, 3 edit sites:
- **E-1** — 2 module-level pure helpers (option extraction) near the existing helpers (~L66).
- **E-2** — collapsed "new items" summary variation render (L481).
- **E-3** — expanded list variation render (L609-631), plus a local `const` at L536.

Display-only. Line totals (`lineTotal = unit * qty`) are unchanged — variation upcharge is already baked into `unitPrice` upstream (`orderTransform` variationAmount), so we only surface the per-option price text, we do **not** recompute totals.

**Marker:** `// BUG-702` on all new/changed blocks.

**Sequencing (R5):** same file as **CR-547** (per-item KOT) and already-implemented **CR-552** (two-section render). E-2/E-3 touch only the variation `<span>`/`<div>` inside the existing CR-552 structure — no structural change. **Batch E-1..E-3 together with CR-547's ScanOrderPopOut edits in one branch** to avoid same-file churn.

---

## 2. Edits

### E-1: Add option-extraction helpers (insert after `hasUnconfirmedWebEditItems`, ~L66)

**New:**
```js
// BUG-702: Extract SELECTED variation options (label + per-option price) from a
// single variation group. Tolerates both shapes the app produces:
//   RESPONSE shape → values: [{label, optionPrice}]   (running-orders / socket)
//   REQUEST  shape → values: {label: [...]}            (place/update payload — no price)
// Returns [{ label, price }]. Mirrors CartPanel.jsx:112-124 label logic.
export const getSelectedVariationOptions = (v) => {
  if (Array.isArray(v?.values)) {
    return v.values
      .filter((opt) => opt && opt.label != null)
      .map((opt) => ({ label: String(opt.label), price: parseFloat(opt.optionPrice) || 0 }));
  }
  if (Array.isArray(v?.values?.label)) {
    return v.values.label.filter(Boolean).map((label) => ({ label: String(label), price: 0 }));
  }
  const fallback = v?.label || v?.name;
  return fallback ? [{ label: String(fallback), price: parseFloat(v?.price) || 0 }] : [];
};

// BUG-702: Flatten selected options across all variation groups on an item.
export const flattenVariationOptions = (variations) =>
  (Array.isArray(variations) ? variations : []).flatMap(getSelectedVariationOptions);
```

**Why module-level:** pure, unit-testable, reused by E-2 and E-3; no component state.

---

### E-2: Collapsed "new items" summary (L475 + L481)

**Current (L475):**
```js
const variations = Array.isArray(it?.variation) ? it.variation : [];
```
**Add immediately after (L475):**
```js
const variationOptions = flattenVariationOptions(variations); // BUG-702
```

**Current (L481):**
```jsx
{variations.length > 0 && <span className="text-xs text-gray-400 ml-1">({variations.map(v => v.name).join(', ')})</span>}
```
**New (L481):**
```jsx
{variationOptions.length > 0 && (
  <span className="text-xs text-gray-400 ml-1" data-testid={`popout-new-item-variation-${idx}`}>
    ({variationOptions.map(o => o.price > 0 ? `${o.label} (+${currencySymbol}${o.price.toFixed(2)})` : o.label).join(', ')})
  </span>
)}
```

---

### E-3: Expanded list (L536 + L609-631)

**Current (L536):**
```js
const variations = Array.isArray(it?.variation) ? it.variation : [];
```
**Add immediately after (L536):**
```js
const variationOptions = flattenVariationOptions(variations); // BUG-702
```

**Current (L609-631):**
```jsx
{variations.length > 0 ? (
  <div className="mt-1 pl-3 border-l-2" style={{ borderColor: COLORS.borderGray }}>
    {variations.map((v, vIdx) => (
      <div key={`var-${vIdx}`} className="text-xs" style={{ color: COLORS.grayText }} data-testid={`popout-item-variation-${idx}-${vIdx}`}>
        {v?.name || v?.label || ''}
        {Number(v?.price) > 0 ? (
          <span className="ml-1">(+{currencySymbol}{Number(v.price).toFixed(2)})</span>
        ) : null}
      </div>
    ))}
  </div>
) : null}
```
**New (L609-631):**
```jsx
{variationOptions.length > 0 ? (
  <div className="mt-1 pl-3 border-l-2" style={{ borderColor: COLORS.borderGray }}>
    {variationOptions.map((o, vIdx) => (
      <div key={`var-${vIdx}`} className="text-xs" style={{ color: COLORS.grayText }} data-testid={`popout-item-variation-${idx}-${vIdx}`}>
        {o.label}
        {o.price > 0 ? (
          <span className="ml-1">(+{currencySymbol}{o.price.toFixed(2)})</span>
        ) : null}
      </div>
    ))}
  </div>
) : null}
```

**What changes:** iterate the flattened **selected options** instead of the group objects; each line shows the chosen option label + its `(+₹optionPrice)`. `data-testid` pattern preserved (now 1 per option, still unique per `idx`/`vIdx`).

**Examples after fix:**
| item.variation | Before (collapsed / expanded) | After |
|---|---|---|
| `[{name:"Choice of milk", values:[{label:"Oat milk", optionPrice:"40"}]}]` | `(Choice of milk)` / `Choice of milk` | `(Oat milk (+₹40.00))` / `Oat milk (+₹40.00)` |
| `[{name:"Milk",values:[{label:"Oat milk",optionPrice:"40"}]},{name:"Size",values:[{label:"Large",optionPrice:"20"}]}]` | `(Milk, Size)` | `(Oat milk (+₹40.00), Large (+₹20.00))` |
| `[{name:"Sauce", values:[{label:"Mild", optionPrice:"0"}]}]` | `(Sauce)` | `(Mild)` (no +₹) |
| `[{name:"Base", values:{label:["Thin"]}}]` (request shape) | `(Base)` | `(Thin)` (no price available in that shape) |
| item with no variation | nothing | nothing (unchanged) |

---

## 3. Execution Sequence

1. E-1 — insert the two helpers (~L66).
2. E-2 — collapsed summary (L475 + L481).
3. E-3 — expanded list (L536 + L609-631).
4. Verify webpack compiles with 0 new warnings (hot reload).
5. Run verification matrix.

---

## 4. Verification Matrix

| # | Check | How to Verify | Auto? |
|---|-------|---------------|:---:|
| V-1 | `getSelectedVariationOptions` + `flattenVariationOptions` present | grep in ScanOrderPopOut.jsx | YES |
| V-2 | `// BUG-702` markers present (3 sites) | grep `BUG-702` | YES |
| V-3 | No remaining `variations.map(v => v.name)` / `Number(v.price)` in render | grep absence | YES |
| V-4 | Array `values` shape → label + optionPrice | unit test helper | YES |
| V-5 | `values.label` request shape → labels, price 0 | unit test helper | YES |
| V-6 | optionPrice 0 → no `(+₹)` | unit test helper | YES |
| V-7 | Webpack compiles 0 new warnings | hot reload log | YES |
| V-8 | Expanded row shows `Oat milk (+₹40.00)` | Browser: web-edit order in ScanOrderPopOut | NO |
| V-9 | Collapsed "new items" summary shows options + price | Browser: Mode-B edit order | NO |
| V-10 | Multi-group item → comma-joined options | Browser | NO |
| V-11 | Add-ons row + per-item cancel (CR-545) + cancelled strike (BUG-679) unchanged | Browser / code review | NO |

---

## 5. Post-Code Registry Checklist
```
- [ ] registry.json: BUG-702 → status: GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated with IMPLEMENTED status
- [ ] FILE_OWNERSHIP.md: ScanOrderPopOut.jsx → BUG-702 marker + date
- [ ] Code markers: // BUG-702 at all 3 sites
- [ ] COMPILE CHECK: webpack 0 new warnings
- [ ] Unit test for helpers (optional, LOW risk)
```

---

## 6. Risks

| # | Risk | Mitigation |
|---|------|------------|
| R-1 | `values[]` contains full catalog, not just selected | BUG-573 API probe already confirmed `item.variation[].values` holds ONLY selected option(s) (catalog lives in `food_details.variations[].values`). Same source here. |
| R-2 | Double-counting price into line total | We render price **text only**; `lineTotal` (L473/L533) is untouched — upcharge already in `unitPrice`. |
| R-3 | Request-shape `values.label` has no optionPrice | Renders label with price 0 (no `+₹`). Acceptable — those orders don't carry per-option price. |
| R-4 | Same-file churn with CR-547 / CR-552 | Batch with CR-547; edits are additive inside the CR-552 two-section structure (no structural change). |
| R-5 | `data-testid` index semantics change (per-option vs per-group) | Still unique per `idx`/`vIdx`; existing tests key off `idx` prefix — re-confirm any snapshot expecting group names. |
