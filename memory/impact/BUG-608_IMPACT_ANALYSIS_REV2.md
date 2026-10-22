# BUG-608 — Impact Analysis Rev 2 (Gate 2)

**ID:** BUG-608
**Date:** 2026-10-22
**Supersedes:** `impact/BUG-608_IMPACT_ANALYSIS.md` (Rev 1 — hypothesis-based)
**Code Reality:** CONFIRMED — root cause found in number input handler
**Risk:** HIGH (affects all non-zero number fields across menu management)
**Conflict Pre-Check:** CLEAN

---

## 1. Root Cause

All number inputs in BulkEditor and ProductForm share the same pattern from BUG-392/BUG-394:

```js
onFocus={e => { if (e.target.value === '0' || e.target.value === 0) e.target.value = ''; }}
onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 0) updateCell(..., n); }}
```

**The bug:**
- `onFocus` only clears the field when the value is `0`. For any non-zero value (e.g. `6`), the field keeps its content.
- When the user tries to **clear the field to type a new number**, deleting all characters produces an empty string `""`.
- `parseFloat("")` returns `NaN` → `!isNaN(NaN)` is `false` → `onChange` silently rejects the input.
- The field appears frozen — the user cannot clear and retype. They can only append digits or use arrow keys.

**Why it "works" for zero:**
- When tax is `0`, `onFocus` clears it to `""`, then the user types `5` → `parseFloat("5") = 5` → accepted.
- When tax is `6`, `onFocus` does nothing, user selects all + deletes → `""` → `NaN` → rejected. Field snaps back to `6`.

## 2. Affected Components — ALL number inputs

### BulkEditor.jsx (L1402-1406) — **11 number columns**

| # | Column | Key | Affected? |
|---|--------|-----|:-:|
| 1 | Price | `basePrice` | ✅ Yes — any non-zero price can't be replaced |
| 2 | Tax % | `taxPercent` | ✅ Yes — original report |
| 3 | Discount | `discount` | ✅ Yes |
| 4 | Comp. Price | `complementaryPrice` | ✅ Yes |
| 5 | Prep Time | `prepTimeMin` | ✅ Yes |
| 6 | Serve Time | `serveTimeMin` | ✅ Yes |
| 7 | Pack Charges | `packCharges` | ✅ Yes |
| 8 | Takeaway Charge | `takeawayCharge` | ✅ Yes |
| 9 | Delivery Charge | `deliveryCharge` | ✅ Yes |
| 10 | Sort Order | `sortOrder` | ✅ Yes |
| 11 | Kcal | `kcal` | ✅ Yes |

All 11 columns use the **same** `CellRenderer` function (L1402-1406) with identical `onFocus`/`onChange` logic.

### ProductForm.jsx — **InputField component** (L10-30)

Same pattern at L23:
```js
onFocus={(e) => { if (type === "number" && (e.target.value === "0" || e.target.value === 0)) e.target.value = ""; }}
```

Affects: Price (L436), Tax % (L460), Discount (L466), and all other number inputs using `InputField`.

**However**, ProductForm has an `onBlur` handler (L24) that BulkEditor lacks:
```js
onBlur={(e) => { if (type === "number" && e.target.value === "") onChange(0); }}
```
This resets empty fields to 0 on blur — a partial mitigation that BulkEditor doesn't have.

### ProductForm variation inputs (L178, L183)

Min/Max fields for variations have the same pattern:
```js
onFocus={e => { if (e.target.value === '0' || e.target.value === 0) e.target.value = ''; }}
onChange={(e) => { const n = parseInt(e.target.value); if (!isNaN(n) && n >= 0) updateField('min', n); }}
```

### VariationOptionRow (L107-108)

Option price field — same pattern.

---

## 3. Proposed Fix

### Fix A: `onFocus` → select all text (recommended)

Replace the "clear if zero" logic with "select all" so the user can type over any value:

**BulkEditor.jsx L1403:**
```js
// BEFORE:
onFocus={e => { if (e.target.value === '0' || e.target.value === 0) e.target.value = ''; }}

// AFTER:
onFocus={e => e.target.select()}
```

**Plus** handle empty string in `onChange`:
```js
// BEFORE:
onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 0) updateCell(row._id, col.key, n); }}

// AFTER:
onChange={e => { if (e.target.value === '' || e.target.value === '-') return; const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 0) updateCell(row._id, col.key, n); }}
```

**And** add `onBlur` to reset empty to 0 (matching ProductForm):
```js
onBlur={e => { if (e.target.value === '') updateCell(row._id, col.key, 0); }}
```

Apply the same pattern to:
- ProductForm `InputField` (L23) — change `onFocus` to `select()`
- ProductForm variation min/max (L178, L183)
- VariationOptionRow price (L107)

---

## 4. Files Affected

| # | File | Lines | Change |
|---|------|:---:|--------|
| 1 | `BulkEditor.jsx` | L1403 | Fix `onFocus`/`onChange`/add `onBlur` on number input |
| 2 | `ProductForm.jsx` | L23, L107, L178, L183 | Same fix on `InputField` + variation inputs |

**Files WILL NOT touch:** `menuManagementService.js`, `menuManagementTransform.js`, any report/order/payment file.

---

## 5. Risk Assessment

| Risk | Level | Note |
|------|:---:|------|
| Regression on zero-value editing | NONE | `select()` on focus works for both zero and non-zero |
| Negative numbers | NONE | `onChange` guard `n >= 0` unchanged |
| BUG-392 (scroll wheel) | NONE | `onWheel` handler unchanged |
| BUG-394 (special chars) | NONE | `parseFloat` + guard unchanged |

---

## 6. Verification Matrix

| # | What to Verify | Method |
|---|---------------|--------|
| V-1 | Tax % = 6 → click field → can type new value | Browser: BulkEditor |
| V-2 | Tax % = 0 → click field → can type new value | Browser: BulkEditor |
| V-3 | Price = 50 → click field → can type new value | Browser: BulkEditor |
| V-4 | Empty field → blur → resets to 0 | Browser: BulkEditor |
| V-5 | ProductForm Tax % with existing value → editable | Browser: ProductForm |
| V-6 | Variation min/max with existing value → editable | Browser: ProductForm |
| V-7 | Scroll wheel still prevented (BUG-392) | Browser |
| V-8 | Special chars still blocked (BUG-394) | Browser |
| V-9 | webpack 0 new warnings | Dev server log |

---

## 7. Scope Lock

**Files WILL change:** `BulkEditor.jsx` (1 location), `ProductForm.jsx` (4 locations)
**Files WILL NOT touch:** Everything else
**Blockers:** NONE — root cause confirmed, fix is clear
