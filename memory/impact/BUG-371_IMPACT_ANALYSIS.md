# BUG-371 IMPACT ANALYSIS — Bulk Editor: Variation Price Not Editable
**Date:** 2026-09-01 | **Stage:** Gate 2 — Impact Analysis
**Code Reality:** NONE (expand panel is read-only; no price input exists)
**Conflict Pre-Check:** BulkEditor.jsx — last modified by CR-145 + GAP-BULK-DEFAULTS. VariationExpandPanel.jsx — last modified by CR-145. No active items on same files.
**Risk:** MEDIUM

---

## Root Cause — HIGH Confidence

```
BulkEditor.jsx:
  isDirty map line 375: variations: () => false  ← always read-only
  VariationExpandPanel receives: variations={row.variations || []}
                                 onClose={closeExpand}
                                 ← NO onPriceChange prop

VariationExpandPanel.jsx:
  Line 21: "Read-only — edit in Product Form for changes"
  Line 41: {val.name}{val.price > 0 ? ` · ₹${val.price}` : ''}  ← static display only
           ← NO input element
```

**Owner Decision Locked — Option A: Inline editing per variation row in expand panel.**

---

## Data Flow Trace

```
Current (read-only):
  BulkEditor row expand → VariationExpandPanel → static text chips

Target (editable):
  BulkEditor row expand → VariationExpandPanel (with price input per val)
    → onPriceChange(groupIdx, valIdx, newPrice)
      → BulkEditor updates row.variations[groupIdx].values[valIdx].price
        → isDirty(row) returns true
          → Save: toAPI(row) includes updated variations[]
            → menuManagementTransform.toAPI:283: variations: form.variations ✓ ALREADY IN PAYLOAD
```

---

## Fix Scope

### Edit 1 — VariationExpandPanel.jsx (~15 lines)
- Add `onPriceChange` prop
- Replace static price display `{val.name} · ₹{val.price}` with:
  - Variation name (static)
  - Price input: `<input type="number" value={val.price} onChange={e => onPriceChange(groupIdx, valIdx, parseFloat(e.target.value) || 0)} />`
- When `onPriceChange` is undefined (read-only mode), keep static display (backwards compat)

### Edit 2 — BulkEditor.jsx (~12 lines)
1. Add `variationEdits` state per expanded row to track price changes
2. Update `VariationExpandPanel` call to pass `onPriceChange` handler
3. Update `isDirty.variations` from `() => false` to check if any variation price was changed vs original
4. Include updated variations in the `saveRows` payload when dirty

### Edit 3 — menuManagementTransform.js (VERIFY ONLY — likely no change)
`toAPI line 283: ...(form.variations ? { variations: form.variations } : {})` — already includes variations if present. Confirm the API accepts optionPrice updates. If API key differs, update the key name.

---

## Affected Files

| File | Change | Risk |
|---|---|---|
| `VariationExpandPanel.jsx` | Add `onPriceChange` prop + price inputs | LOW (small UI component, no logic) |
| `BulkEditor.jsx` | Wire `onPriceChange`, track dirty variations, update `isDirty` | MEDIUM (complex state) |
| `menuManagementTransform.js` | Verify save payload includes variation price — likely no change needed | LOW |

## Scope Lock
**Files WILL change:** `VariationExpandPanel.jsx`, `BulkEditor.jsx`
**Files will NOT touch:** `ProductForm.jsx`, `menuManagementService.js`, anything outside menu management

## Owner Decisions: NONE — Option A confirmed
## Blast Radius: MEDIUM (2 files, ~27 lines)
## Next: Gate 3 Implementation Plan → Gate 4 GO
