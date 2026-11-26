# Gate 3 — Implementation Plan: CR-373
## Aggregator ProductForm: "Use Item Image for Swiggy" Toggle

**Date:** 2026-09-10
**Agent Role:** PLANNING (Role 2 — Gate 3)
**Protocol:** AGENT_PROMPT_ALPHA v0.7
**IA verified:** All line refs confirmed live. No drift.
**Batch:** A — item 2. **MUST implement AFTER BUG-390.**

---

## Entry Verification ✅

| Plan says | Live code | Match? |
|---|---|---|
| Line 207: `const [saving, setSaving]` | confirmed | ✅ |
| Line 255: `swiggyImagePreview: product.swiggyImage` | confirmed | ✅ |
| Line 285: `swiggyImageFile: null, swiggyImagePreview: null` | confirmed | ✅ |
| Line 361: Swiggy block start comment | `{/* BUG-327: Swiggy image upload */}` | ✅ |
| Line 602: `addFoodAggregatorMultipart(...form.swiggyImageFile)` | confirmed | ✅ |
| Line 609: `editFoodAggregator(...form.swiggyImageFile)` | confirmed | ✅ |

---

## Edits

### E1 — After line 207: Add new state field
**File:** `src/components/panels/menu/ProductForm.jsx`

```js
// After: const [saving, setSaving] = useState(false);
// Add:
const [useItemImageForSwiggy, setUseItemImageForSwiggy] = useState(true); // CR-373
```

### E2 — Around line 255: Set toggle default for edit-item
**File:** `src/components/panels/menu/ProductForm.jsx`
**Location:** In the useEffect/init block that runs when `product` changes (where line 255 lives)

```js
// After the line: swiggyImagePreview: product.swiggyImage || null,
// Add (in the same init block, after other setXxx calls):
setUseItemImageForSwiggy(!product.swiggyImage); // CR-373: false if Swiggy image exists
```

### E3 — Lines 361–390: Replace Swiggy upload block with toggle + conditional upload
**File:** `src/components/panels/menu/ProductForm.jsx`

```jsx
{/* CR-373: Swiggy image — toggle (Use same / Upload different) */}
{menuType === 'Aggregator' && (
  <div className="py-1.5">
    <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Swiggy Image</label>
    <div className="flex gap-2 mb-2">
      {[true, false].map((val) => (
        <button key={String(val)} type="button"
          onClick={() => setUseItemImageForSwiggy(val)}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            useItemImageForSwiggy === val
              ? 'text-white border-transparent'
              : 'border-gray-200 hover:bg-orange-50'
          }`}
          style={useItemImageForSwiggy === val ? { background: COLORS.primaryOrange } : { color: COLORS.grayText }}
          data-testid={val ? 'swiggy-use-item-image' : 'swiggy-upload-different'}>
          {val ? 'Use same as Item Image' : 'Upload different image'}
        </button>
      ))}
    </div>
    {!useItemImageForSwiggy && (
      <div className="flex items-center gap-3">
        {form.swiggyImagePreview && (
          <div className="relative w-16 h-16 rounded-lg overflow-hidden border" style={{ borderColor: COLORS.borderGray }}>
            <img src={form.swiggyImagePreview} alt="Swiggy preview" className="w-full h-full object-cover" />
            <button onClick={() => { update("swiggyImageFile", null); update("swiggyImagePreview", null); }}
              className="absolute top-0 right-0 p-0.5 bg-white/80 rounded-bl">
              <XIcon className="w-3 h-3" style={{ color: "#EF4444" }} />
            </button>
          </div>
        )}
        <label className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
          style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
          data-testid="swiggy-image-upload-btn">
          <Upload className="w-4 h-4" />
          {form.swiggyImagePreview ? 'Change' : 'Upload'}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) { update("swiggyImageFile", file); update("swiggyImagePreview", URL.createObjectURL(file)); }
          }} />
        </label>
      </div>
    )}
  </div>
)}
```

### E4 — Before line 602: Compute effectiveSwiggyFile
**File:** `src/components/panels/menu/ProductForm.jsx`

```js
// Add immediately before the if (isNew) / else block at line ~600:
const effectiveSwiggyFile = useItemImageForSwiggy ? form.imageFile : form.swiggyImageFile; // CR-373
```

### E5 — Line 602: Use effectiveSwiggyFile
**File:** `src/components/panels/menu/ProductForm.jsx`

```js
FROM: await menuService.addFoodAggregatorMultipart(foodInfo, form.imageFile, form.swiggyImageFile);
TO:   await menuService.addFoodAggregatorMultipart(foodInfo, form.imageFile, effectiveSwiggyFile); // CR-373
```

### E6 — Line 609: Use effectiveSwiggyFile
**File:** `src/components/panels/menu/ProductForm.jsx`

```js
FROM: await menuService.editFoodAggregator(product.productId, foodInfo, form.imageFile, form.swiggyImageFile);
TO:   await menuService.editFoodAggregator(product.productId, foodInfo, form.imageFile, effectiveSwiggyFile); // CR-373
```

---

## Summary

| | |
|---|---|
| File | `ProductForm.jsx` only |
| Lines added | ~30 (toggle UI replaces ~30 existing lines in E3) |
| New state | 1 (`useItemImageForSwiggy`) |
| New files | 0 |
| API changes | NONE |
| Risk | LOW-MEDIUM |

---

## Verification Matrix

| # | Test | Expected |
|---|---|---|
| V1 | Aggregator Add Item | Toggle "Use same as Item Image" / "Upload different" visible |
| V2 | New item default | Toggle pre-selected on "Use same as Item Image" |
| V3 | Existing item with Swiggy image | Toggle pre-selected on "Upload different" |
| V4 | Normal menu Add Item | NO toggle shown (not Aggregator) |
| V5 | Save with "Use same" | Swiggy = Item image on backend |
| V6 | Save with "Upload different" | Swiggy = separately uploaded image |
| V7 | Toggle ON hides upload control | Upload section hidden when "Use same" |

---

## Post-Code Registry Checklist

```
□ registry.json: CR-373 → status: IMPLEMENTED, gate: 5, sprint_key: pos_7_0
□ CR_REGISTRY.md: row → IMPLEMENTED
□ FILE_OWNERSHIP.md: ProductForm.jsx → CR-373 E1–E6 (date)
□ Code markers: // CR-373 on all edited sections
□ Compile: 0 new warnings
```

---

*Gate 3 complete. 1 file, ~6 edits. Implement AFTER BUG-390.*
