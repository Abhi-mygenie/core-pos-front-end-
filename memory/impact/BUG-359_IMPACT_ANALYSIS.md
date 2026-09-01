# BUG-359 — Impact Analysis: Settings Tax Cleanup

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-26
**Intake doc:** `/app/memory/change_requests/BUG-359_ITEM_LEVEL_TAX_SETTINGS_NOT_SYNCING_INTAKE.md`
**Code Reality:** NONE — all 3 target fields present, no cleanup done
**Risk:** MEDIUM (3 files, UI-only, no order calculation change)

---

## Step 0 — Code Reality

| Target | File | Line | Current State |
|---|---|---|---|
| GST Mode dropdown | `RestaurantSettingsPage.jsx:543` | 543 | `<SelectInput label="GST Mode" ... options=[Item Level, Restaurant Level]>` — present |
| GST Tax % field | `RestaurantSettingsPage.jsx:544` | 544 | `<NumberInput label="GST Tax %" ...>` — present |
| Tax % field | `RestaurantSettingsPage.jsx:545` | 545 | `<NumberInput label="Tax %" ...>` — present |
| Inclusive option | `ProductForm.jsx:416-417` | 416-417 | `options=[{Inclusive}, {Exclusive}]` — present |
| taxCalc column | `BulkEditor.jsx:54` | 54 | `{ key: "taxCalc", tier: 2 }` — present |
| taxCalc renderer | `BulkEditor.jsx:1344-1350` | 1344-1350 | Inclusive/Exclusive `<select>` renderer — present |

---

## Step 1 — Conflict Pre-Check

| Item | File Overlap | Risk | Verdict |
|---|---|---|---|
| BUG-135 (BulkEditor save errors) | `BulkEditor.jsx` | Targets lines ~497-508, 600 — different from taxCalc at lines 54, 1344 | PARALLEL-SAFE |
| BUG-147 (duplicate error prefix) | `BulkEditor.jsx:78` | Single line in AddCustomItemModal, different section | PARALLEL-SAFE |
| BUG-289 (typo fix) | `RestaurantSettingsPage.jsx` | Typo in a label in a different step section | PARALLEL-SAFE |

**CONFLICT: NONE**

---

## Step 2 — Downstream Safety Analysis

### Save payload — NOT touching `restaurantSettingsTransform.js`

`restaurantSettingsTransform.js` still sends these to backend on save:
```js
restaurent_gst:  s4.gstMode,   // defaults to 'category' (Item Level) ← correct
gst_tax:         String(0),     // defaults to 0 ← safe
tax:             String(0),     // defaults to 0 ← safe
```
Hiding the UI fields means the save always sends these safe defaults. **No backend contract change needed.**

### ProductForm save — `menuManagementTransform.js:282`
```js
tax_calc: form.taxCalc || 'Exclusive'
```
Removing the dropdown but keeping `form.taxCalc` initialised to `'Exclusive'` (line 231) means the save always sends `tax_calc: 'Exclusive'`. **No transform change needed.**

### BulkEditor save — `BulkEditor.jsx:196`
```js
tax_calc: row.taxCalc || "Exclusive"
```
Removing the column from `ALL_COLUMNS` means `row.taxCalc` comes from the initial build (line 117: `taxCalc: f.taxCalc || "Exclusive"`), always `'Exclusive'`. **No transform change needed.**

### Order calculations — `orderTransform.js`, `CollectPaymentPanel.jsx`
Read `item.tax.calculation` and `item.tax.isInclusive` from the cart item (which came from the product). Since no existing items have `tax_calc = 'Inclusive'` (owner confirmed), these paths remain dormant. **Zero impact on order flow.**

---

## Step 2 — What Changes

### Edit 1 — `RestaurantSettingsPage.jsx:541-547` — Remove 3 dead fields

**Current (lines 540-547):**
```jsx
{s4.gstEnabled && (
  <div className="grid grid-cols-2 gap-4 mt-4">
    <TextInput label="GST Number" required ... />       {/* KEEP */}
    <SelectInput label="GST Mode" ... />               {/* REMOVE */}
    <NumberInput label="GST Tax %" ... />              {/* REMOVE */}
    <NumberInput label="Tax %" ... />                  {/* REMOVE */}
  </div>
)}
```

**After:**
```jsx
{s4.gstEnabled && (
  <div className="mt-4">
    <TextInput label="GST Number" required ... />       {/* only field remains */}
  </div>
)}
```

Grid wrapper simplified from `grid grid-cols-2 gap-4` → plain `div` since only 1 field remains.

**What stays untouched in Step 4:**
- GST Enabled toggle (line 539) ✅
- Show GST to Customers toggle (line 548) ✅
- VAT Configuration section (lines 550-556) ✅
- Service Charge section (lines 558-566) ✅
- Tips & Discounts section (lines 567-571) ✅
- Other Charges section (lines 572-577) ✅

---

### Edit 2 — `ProductForm.jsx:416-417` — Remove Tax Calculation dropdown

**Current:**
```jsx
<SelectField label="Tax Calculation" value={form.taxCalc} onChange={(v) => update("taxCalc", v)}
  options={[{ value: "Inclusive", label: "Inclusive" }, { value: "Exclusive", label: "Exclusive" }]} />
```

**After:** Remove these 2 lines entirely.

**State init (line 231) stays:**
```js
taxCalc: product.taxCalc || 'Exclusive',   // keeps default, still saves correctly
```

The `Tax Type` and `Tax %` fields (lines 413-415) are NOT touched — item-level GST/VAT type and rate are correct and needed.

---

### Edit 3 — `BulkEditor.jsx:54` — Remove taxCalc column definition

**Current (line 54):**
```js
{ key: "taxCalc", label: "Tax Calc", type: "dropdown", width: 100, tier: 2 },
```

**After:** Remove this line entirely.

**Cell renderer (lines 1344-1350)** — also remove (becomes dead code with column removed):
```js
if (col.key === "taxCalc") {
  return <select ...>
    <option value="Inclusive">Inclusive</option>
    <option value="Exclusive">Exclusive</option>
  </select>;
}
```

**State build (line 117) stays:** `taxCalc: f.taxCalc || "Exclusive"` — still initialises correctly for save.

---

## Files WILL Change

| File | Edits | Lines | Risk |
|---|---|---|---|
| `pages/RestaurantSettingsPage.jsx` | Remove 3 fields from Step 4 GST grid | 541-547 (replace block) | LOW |
| `components/panels/menu/ProductForm.jsx` | Remove Tax Calculation dropdown | 416-417 (delete) | LOW |
| `components/panels/menu/BulkEditor.jsx` | Remove taxCalc column + renderer | 54 (delete), 1344-1350 (delete) | LOW |

## Files Will NOT Touch

`restaurantSettingsTransform.js` · `menuManagementTransform.js` · `productTransform.js` · `orderTransform.js` · `CollectPaymentPanel.jsx` · any other file

---

## Verification Matrix (seeds Gate 3 plan + QA)

| # | Test | Expected |
|---|---|---|
| T1 | Open Restaurant Settings Step 4 with GST Enabled | Only shows: GST Number input. No GST Mode dropdown, no GST Tax %, no Tax % |
| T2 | Save Step 4 with just GST Number filled | Backend receives `gst_tax: "0.00"`, `tax: "0"`, `restaurent_gst: "category"` as safe defaults |
| T3 | Open ProductForm (Add/Edit menu item) | Tax section shows: Tax Type + Tax % only. No Tax Calculation row |
| T4 | Save menu item with default Tax Calculation | `tax_calc: "Exclusive"` sent to backend |
| T5 | Open BulkEditor column picker | `Tax Calc` column absent from Tier 2 column list |
| T6 | Save row via BulkEditor | `tax_calc: "Exclusive"` sent for all rows |
| T7 | Place an order after settings save | Order tax unchanged — item-level tax still applied correctly |
| T8 | Regression: GST Enabled toggle + GST Number + Show GST | All 3 still functional |
| T9 | Regression: VAT Configuration section | VAT Enabled + VAT Code unchanged |

---

## Post-Code Registry Checklist (for Implementation agent)

- [ ] `registry.json`: BUG-359 → `status: "IMPLEMENTED"`, `gate: "5"`
- [ ] `BUG_TRACKER.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: 3 files listed with BUG-359
- [ ] Code markers: `// BUG-359` on every modified section
- [ ] Compile: 0 new warnings
