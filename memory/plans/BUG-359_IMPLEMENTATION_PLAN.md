# BUG-359 — Implementation Plan: Settings Tax Cleanup

**Gate:** 3 — Implementation Plan
**Date:** 2026-08-26
**Impact Analysis:** `/app/memory/impact/BUG-359_IMPACT_ANALYSIS.md`
**Code Reality:** NONE — clean implementation
**Risk:** MEDIUM (3 files, UI-only, no order calculation change)
**Files WILL change:** `RestaurantSettingsPage.jsx` · `ProductForm.jsx` · `BulkEditor.jsx`
**Files will NOT touch:** `restaurantSettingsTransform.js` · `menuManagementTransform.js` · `productTransform.js` · `orderTransform.js` · any other file

---

## Entry Verification (MANDATORY before coding)

| # | File | Line | Expected current state |
|---|---|---|---|
| 1 | `RestaurantSettingsPage.jsx:540` | 540 | `{s4.gstEnabled && (` |
| 2 | `RestaurantSettingsPage.jsx:541` | 541 | `<div className="grid grid-cols-2 gap-4 mt-4">` |
| 3 | `RestaurantSettingsPage.jsx:543` | 543 | `<SelectInput label="GST Mode" ...>` |
| 4 | `RestaurantSettingsPage.jsx:544` | 544 | `<NumberInput label="GST Tax %" ...>` |
| 5 | `RestaurantSettingsPage.jsx:545` | 545 | `<NumberInput label="Tax %" ...>` |
| 6 | `ProductForm.jsx:412` | 412 | `<div className="grid grid-cols-3 gap-3">` |
| 7 | `ProductForm.jsx:416` | 416 | `<SelectField label="Tax Calculation" value={form.taxCalc} ...>` |
| 8 | `BulkEditor.jsx:54` | 54 | `{ key: "taxCalc", label: "Tax Calc", type: "dropdown", width: 100, tier: 2 },` |
| 9 | `BulkEditor.jsx:1344` | 1344 | `if (col.key === "taxCalc") {` |

---

## Edits

### Edit 1 — `RestaurantSettingsPage.jsx:540-547` — Remove dead fields, simplify grid

**Current:**
```jsx
                {s4.gstEnabled && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <TextInput label="GST Number" required value={s4.gstCode} onChange={(v) => updateStep('step4', 'gstCode', v)} placeholder="15-digit GSTIN" testId="input-gst-code" />
                    <SelectInput label="GST Mode" value={s4.gstMode} onChange={(v) => updateStep('step4', 'gstMode', v)} options={[{ value: 'category', label: 'Item Level' }, { value: 'flat', label: 'Restaurant Level' }]} />
                    <NumberInput label="GST Tax %" value={s4.gstTax} onChange={(v) => updateStep('step4', 'gstTax', v)} suffix="%" min={0} max={100} />
                    <NumberInput label="Tax %" value={s4.tax} onChange={(v) => updateStep('step4', 'tax', v)} suffix="%" min={0} max={100} />
                  </div>
                )}
```

**New:**
```jsx
                {s4.gstEnabled && (
                  <div className="mt-4"> {/* BUG-359: removed GST Mode, GST Tax%, Tax% — dead fields */}
                    <TextInput label="GST Number" required value={s4.gstCode} onChange={(v) => updateStep('step4', 'gstCode', v)} placeholder="15-digit GSTIN" testId="input-gst-code" />
                  </div>
                )}
```

**Why safe:** `restaurantSettingsTransform.js` save payload still sends `restaurent_gst: s4.gstMode`, `gst_tax: s4.gstTax`, `tax: s4.tax` — they will always be sent with their initialised defaults (`'category'`, `0`, `0`). No backend contract change.

---

### Edit 2 — `ProductForm.jsx:412-418` — Remove Tax Calculation, shrink grid to 2 cols

**Current:**
```jsx
          <div className="grid grid-cols-3 gap-3">
            <SelectField label="Tax Type" value={form.taxType} onChange={(v) => update("taxType", v)}
              options={[{ value: "GST", label: "GST" }, { value: "VAT", label: "VAT" }, { value: "None", label: "None" }]} />
            <InputField label="Tax %" value={form.taxPercentage} onChange={(v) => update("taxPercentage", v)} type="number" min={0} max={100} step={0.01} />
            <SelectField label="Tax Calculation" value={form.taxCalc} onChange={(v) => update("taxCalc", v)}
              options={[{ value: "Inclusive", label: "Inclusive" }, { value: "Exclusive", label: "Exclusive" }]} />
          </div>
```

**New:**
```jsx
          <div className="grid grid-cols-2 gap-3"> {/* BUG-359: removed Tax Calculation — always Exclusive */}
            <SelectField label="Tax Type" value={form.taxType} onChange={(v) => update("taxType", v)}
              options={[{ value: "GST", label: "GST" }, { value: "VAT", label: "VAT" }, { value: "None", label: "None" }]} />
            <InputField label="Tax %" value={form.taxPercentage} onChange={(v) => update("taxPercentage", v)} type="number" min={0} max={100} step={0.01} />
          </div>
```

**What does NOT change:**
- State init `taxCalc: product.taxCalc || 'Exclusive'` (line 231) — stays, ensures save always sends `'Exclusive'`
- `menuManagementTransform.js:282` sends `tax_calc: form.taxCalc || 'Exclusive'` — still correct

---

### Edit 3 — `BulkEditor.jsx:54` — Remove taxCalc column definition

**Current:**
```js
  { key: "taxCalc",          label: "Tax Calc",         type: "dropdown", width: 100, tier: 2 },
```

**New:** delete this line entirely.

**Why safe:** Save payload at line 196 sends `tax_calc: row.taxCalc || "Exclusive"`. Since `row.taxCalc` is initialised as `f.taxCalc || "Exclusive"` (line 117), it always sends `'Exclusive'`.

---

### Edit 4 — `BulkEditor.jsx:1344-1350` — Remove taxCalc cell renderer (dead code after Edit 3)

**Current:**
```js
    if (col.key === "taxCalc") {
      return <select value={row.taxCalc || "Exclusive"} onChange={e => updateCell(row._id, "taxCalc", e.target.value)}
        className={base} style={{ color: COLORS.darkText, borderColor: bc }} data-testid={`cell-taxCalc-${row._id}`}>
        <option value="Inclusive">Inclusive</option>
        <option value="Exclusive">Exclusive</option>
      </select>;
    }
```

**New:** delete lines 1344-1350 entirely.

**Why safe:** Column removed in Edit 3 so this branch can never be reached. Removing prevents dead code lint warnings.

---

## Execution Sequence

Edits 1, 2, 3, 4 are **fully independent** (different files, non-overlapping sections). Execute all in parallel.

1. Edit 1 — `RestaurantSettingsPage.jsx`
2. Edit 2 — `ProductForm.jsx`
3. Edit 3 — `BulkEditor.jsx` line 54
4. Edit 4 — `BulkEditor.jsx` lines 1344-1350
5. Compile check → 0 new warnings

---

## Scope Lock

**WILL change:** `RestaurantSettingsPage.jsx` · `ProductForm.jsx` · `BulkEditor.jsx`

**WILL NOT touch:**
- `restaurantSettingsTransform.js` — save payload sends defaults safely, no change needed
- `menuManagementTransform.js` — `tax_calc: form.taxCalc || 'Exclusive'` already correct
- `productTransform.js` — reads `api.tax_calc || 'Exclusive'`, no change
- `orderTransform.js` — reads item-level tax only, no change
- `CollectPaymentPanel.jsx` — no change
- Any other file

---

## Verification Matrix

| # | Edit | Test | Expected | Auto/Manual |
|---|---|---|---|---|
| T1 | E1 | Open Restaurant Settings Step 4 with GST Enabled | GST Number input only. No GST Mode, no GST Tax %, no Tax % | MANUAL |
| T2 | E1 | Save Step 4 | Network: payload has `restaurent_gst:"category"`, `gst_tax:"0.00"`, `tax:"0"` as safe defaults | MANUAL (Network tab) |
| T3 | E1 | GST Enabled toggle, GST Number field, Show GST to Customers toggle | All 3 still functional | MANUAL |
| T4 | E1 | VAT Configuration section | VAT Enabled toggle + VAT Code field unchanged | MANUAL |
| T5 | E2 | Open ProductForm (Add new menu item) | Tax section shows Tax Type + Tax % only. No Tax Calculation dropdown | MANUAL |
| T6 | E2 | Save menu item | Network: `tax_calc:"Exclusive"` in payload | MANUAL (Network tab) |
| T7 | E2 | Edit existing item | Tax Calculation field absent; existing item loads correctly | MANUAL |
| T8 | E3+E4 | Open BulkEditor column chooser | `Tax Calc` absent from Tier 2 column list | MANUAL |
| T9 | E3+E4 | Save row via BulkEditor | Network: `tax_calc:"Exclusive"` in payload | MANUAL (Network tab) |
| T10 | Regression | Place an order on any restaurant | Order tax computed correctly — item-level tax unchanged | MANUAL |
| T11 | Regression | BulkEditor: taxType (GST/VAT) + taxPercent columns | Still present and functional (Tier 1) | MANUAL |

---

## Post-Code Registry Checklist

- [ ] `registry.json`: BUG-359 → `status: "IMPLEMENTED"`, `gate: "5"`
- [ ] `BUG_TRACKER.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: `RestaurantSettingsPage.jsx` + `ProductForm.jsx` + `BulkEditor.jsx` listed with BUG-359
- [ ] Code markers: `// BUG-359` on every modified section
- [ ] Compile: 0 new warnings
