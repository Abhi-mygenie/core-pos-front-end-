# CR-348 — Implementation Plan: Add GST / Tax Field to Custom Item Modal

**Gate:** 3 — Implementation Plan
**Date:** 2026-08-26
**Impact Analysis:** `/app/memory/impact/CR-348_IMPACT_ANALYSIS.md`
**Code Reality:** NONE — clean implementation
**Risk:** HIGH — touches orderTransform.js (R5) and OrderEntry.jsx (R5)
**Files WILL change:** `AddCustomItemModal.jsx` · `orderTransform.js` · `OrderEntry.jsx`
**Files will NOT touch:** Any other file

---

## Entry Verification (Implementation agent must confirm before coding)

| # | File | Expected current state |
|---|---|---|
| 1 | `orderTransform.js:1012` | `addCustomItem: (name, categoryId, price) => ({` |
| 2 | `OrderEntry.jsx:1327` | `const handleAddCustomItem = async ({ name, categoryId, price, qty, notes }) => {    const payload = orderToAPI.addCustomItem(name, categoryId, price);` |
| 3 | `OrderEntry.jsx:2779` | `<AddCustomItemModal` with no `showGst` prop |
| 4 | `AddCustomItemModal.jsx:6` | `const [name, setName] = useState('');` (no taxPercent/taxCalc state) |

---

## Edits

### Edit 1 — `AddCustomItemModal.jsx` — Add tax state + conditional UI

**1a. Add state** (after `const [notes, setNotes] = useState('');` line 11):
```js
// CR-348: GST fields — shown only when restaurant has GST enabled (via showGst prop)
const [taxPercent, setTaxPercent] = useState('');
const [taxCalc, setTaxCalc] = useState('Exclusive');
```

**1b. Add `showGst` to props** (line 5):
```js
const AddCustomItemModal = ({ categories = [], products = [], onClose, onAdd, showGst = false }) => {
```

**1c. Add GST UI block** (insert between Price field and Quantity field — after the closing `</div>` of Price section ~line 225):
```jsx
{/* CR-348: GST fields — shown when restaurant has GST enabled */}
{showGst && (
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.grayText }}>
        GST %
      </label>
      <input
        type="number"
        placeholder="e.g. 5"
        value={taxPercent}
        onChange={(e) => setTaxPercent(e.target.value)}
        min="0"
        max="100"
        step="0.01"
        className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
        style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
        data-testid="custom-item-tax-percent"
      />
    </div>
    <div>
      <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.grayText }}>
        Tax Calc
      </label>
      <select
        value={taxCalc}
        onChange={(e) => setTaxCalc(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-white"
        style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
        data-testid="custom-item-tax-calc"
      >
        <option value="Exclusive">Exclusive</option>
        <option value="Inclusive">Inclusive</option>
      </select>
    </div>
  </div>
)}
```

**1d. Pass tax fields in handleAdd** (line 75 — extend `onAdd` call):
```js
await onAdd({ name: name.trim(), categoryId: parseInt(categoryId), price: parseFloat(price), qty, notes, taxPercent: parseFloat(taxPercent) || 0, taxCalc });
```

---

### Edit 2 — `orderTransform.js:1012` — Extend addCustomItem signature

**Current:**
```js
addCustomItem: (name, categoryId, price) => ({
  name,
  category_id: categoryId,
  price,
  tax:      0,
  tax_type: 'GST',
  tax_calc: 'Exclusive',
}),
```

**New:**
```js
// CR-348: tax + tax_calc wired to user input (was hardcoded 0/Exclusive)
addCustomItem: (name, categoryId, price, taxPercent = 0, taxCalc = 'Exclusive') => ({
  name,
  category_id: categoryId,
  price,
  tax:      Number(taxPercent) || 0,
  tax_type: 'GST',
  tax_calc: taxCalc,
}),
```

---

### Edit 3 — `OrderEntry.jsx:1327` — Pass tax fields through handler and transform

**Current:**
```js
const handleAddCustomItem = async ({ name, categoryId, price, qty, notes }) => {    const payload = orderToAPI.addCustomItem(name, categoryId, price);
```

**New:**
```js
// CR-348: receive + forward tax fields from AddCustomItemModal
const handleAddCustomItem = async ({ name, categoryId, price, qty, notes, taxPercent = 0, taxCalc = 'Exclusive' }) => {
  const payload = orderToAPI.addCustomItem(name, categoryId, price, taxPercent, taxCalc);
```

---

### Edit 4 — `OrderEntry.jsx:2779` — Pass `showGst` prop to AddCustomItemModal

**Current:**
```jsx
<AddCustomItemModal
  categories={categories}
  products={products}
  onClose={() => setShowCustomItemModal(false)}
  onAdd={handleAddCustomItem}
/>
```

**New:**
```jsx
<AddCustomItemModal
  categories={categories}
  products={products}
  onClose={() => setShowCustomItemModal(false)}
  onAdd={handleAddCustomItem}
  showGst={!!(restaurant?.tax?.gstStatus || (restaurant?.tax?.gstPercentage || 0) > 0)}
/>
```

---

## Execution Sequence

1. Edit 2 (`orderTransform.js`) — foundation, no UI dependency
2. Edit 1a+1b (`AddCustomItemModal` state + props)
3. Edit 1c (`AddCustomItemModal` UI)
4. Edit 1d (`AddCustomItemModal` onAdd call)
5. Edit 3 (`OrderEntry` handler)
6. Edit 4 (`OrderEntry` modal mount)
7. Compile check → 0 warnings

---

## Verification Matrix (seeds QA)

| Edit | File | Test | Manual/Auto |
|---|---|---|---|
| E2 | orderTransform.js | `addCustomItem('X', 1, 100, 5, 'Inclusive')` → payload has `tax:5, tax_calc:'Inclusive'` | AUTO (unit test) |
| E2 | orderTransform.js | `addCustomItem('X', 1, 100)` → payload has `tax:0, tax_calc:'Exclusive'` (backward compat) | AUTO |
| E1+E3+E4 | Full flow (GST on) | Open modal with GST restaurant → GST % and Tax Calc fields visible | MANUAL (browser) |
| E1+E3+E4 | Full flow (GST off) | Open modal with non-GST restaurant → GST fields hidden | MANUAL (browser) |
| E1+E3+E4 | Submit flow | Enter GST 5% Exclusive → Network: `tax:5, tax_calc:"Exclusive"` in POST | MANUAL (Network tab) |
| Regression | Cart | Add custom item → cart renders correctly, price/qty match | MANUAL |

---

## Post-Code Registry Checklist

- [ ] `registry.json`: CR-348 → `status: "IMPLEMENTED"`, `gate: "5"`
- [ ] `CR_REGISTRY.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: `AddCustomItemModal.jsx`, `orderTransform.js`, `OrderEntry.jsx` listed with CR-348
- [ ] Code markers: `// CR-348` on every modified block
- [ ] Compile: 0 new warnings
