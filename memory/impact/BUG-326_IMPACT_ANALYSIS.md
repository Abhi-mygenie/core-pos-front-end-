# BUG-326 — Impact Analysis (Gate 2)

**Date:** 2026-08-17
**Role:** PLANNING (Gate 2)
**Code Reality:** PARTIAL — `packedFood` wired everywhere; `is_packaged_good` / `swiggy_packing_chrg` absent
**Conflict Pre-Check:** Last touch on all 4 files was CR-142/143/144/145 and BUG-323/324 (2026-08-15). No other open item in QUEUED/IMPLEMENTATION status touches these files. CLEAR.
**Risk:** MEDIUM

---

## 1. Problem Statement

For Aggregator food:
- Backend no longer reads `packed_food`. It now reads `is_packaged_good` (1/0) and `swiggy_packing_chrg` (YES/NO).
- Both fields are **aggregator-only** — applies to `add-food-aggregator` and `product/foods/{id}` (update).
- Frontend transform reads `api.packed_food` (null in aggregator response) → `packedFood` always false.
- Frontend sends `packed_food` key → backend ignores for aggregator.
- `swiggy_packing_chrg` is completely absent: not read, not stored, not sent, no UI.

**Owner-provided key mapping:**

| API field | DB stores | Accepted inputs → stored |
|---|---|---|
| `is_packaged_good` | 1 / 0 | yes/y/1/true → 1, else 0 |
| `swiggy_packing_chrg` | YES / NO | yes/y/1/true → YES, else NO |

Both fields: **aggregator food only**.

---

## 2. API Contract (confirmed 2026-08-17)

```
GET /foods-list?food_for=Aggregator → food:
  packed_food:         null   ← legacy (ignored)
  is_packaged_good:    0      ← correct read key
  swiggy_packing_chrg: "NO"  ← new key

POST /product/add-food-aggregator  → accepts is_packaged_good, swiggy_packing_chrg
POST /product/foods/{id}           → accepts is_packaged_good, swiggy_packing_chrg
```

---

## 3. Affected Files + Line-level Analysis

### 3a. `src/api/transforms/menuManagementTransform.js`

**READ side — `fromAPI.food()` L116:**
```js
// CURRENT:
packedFood: toBoolean(api.packed_food),    // null → always false for aggregator

// FIX (read is_packaged_good instead):
packedFood: toBoolean(api.is_packaged_good ?? api.packed_food),
// Note: ?? fallback so normal food (which only has packed_food) keeps working
```

Wait — normal food: Does `foods-list?food_for=Normal` return `packed_food` or `is_packaged_good`?
→ Probe result shows aggregator returns both (packed_food=null, is_packaged_good=0).
→ Safe assumption: normal food also has `is_packaged_good` (same backend field). Use `api.is_packaged_good ?? api.packed_food` as a safe dual-read.

**READ side — add `swiggyPackingChrg` (new, L116 area):**
```js
swiggyPackingChrg: api.swiggy_packing_chrg === 'YES',
```

**WRITE side — `toAPI.foodInfo()` L248–252 (Aggregator spread):**
```js
// CURRENT:
...(form.foodFor === 'Aggregator' ? {
  swiggy: ..., zomato: ..., client: ...,
} : {})

// FIX — add two new keys:
...(form.foodFor === 'Aggregator' ? {
  swiggy: ..., zomato: ..., client: ...,
  is_packaged_good:    form.packedFood      ? 1     : 0,
  swiggy_packing_chrg: form.swiggyPackingChrg ? 'YES' : 'NO',
} : {})
```

**Line 275 `packed_food` — NO CHANGE needed.** Normal food still uses `packed_food`; for aggregator the backend ignores it but it's harmless to send.

---

### 3b. `src/components/panels/menu/BulkEditor.jsx`

**AGGR_COLUMNS (L76–80):** Add one new column for `swiggyPackingChrg`:
```js
// ADD:
{ key: 'swiggyPackingChrg', label: 'Swiggy Pack Chrg', type: 'yesno', width: 130, tier: 1 },
```
`packedFood` already in BASE_COLUMNS (L39) and visible for all types — no change needed there.

**`buildRow()` (after L148 aggregator block):** Add:
```js
swiggyPackingChrg: f.swiggyPackingChrg ? 'Yes' : 'No',
```

**`buildPayload()` — Aggregator spread (L164–169):** Add two new keys:
```js
...(row.foodFor === 'Aggregator' ? {
  swiggy: ..., zomato: ..., client: ...,
  is_packaged_good:    row.packedFood         === 'Yes' ? 1     : 0,
  swiggy_packing_chrg: row.swiggyPackingChrg  === 'Yes' ? 'YES' : 'NO',
} : {})
```

**`isDirty` checks (L317–371):** Add one check:
```js
swiggyPackingChrg: () => (o.swiggyPackingChrg ? 'Yes' : 'No') !== row.swiggyPackingChrg,
```

---

### 3c. `src/components/panels/menu/ProductForm.jsx`

**State init — edit mode (L241):** Add:
```js
swiggyPackingChrg: product.swiggyPackingChrg || false,
```

**State init — new mode (L276):** Add:
```js
swiggyPackingChrg: false,
```

**Platform Sync section (L358–367):** Add one new `ToggleField` inside the `menuType === 'Aggregator'` guard:
```jsx
<ToggleField label="Swiggy Packing Charge"
  checked={form.swiggyPackingChrg}
  onChange={v => update('swiggyPackingChrg', v)}
  description="Applies Swiggy packing charge (aggregator only)" />
```
Existing "Packaged Item" toggle in Status & Flags (L545) remains for all food types — `packedFood` state is reused to send `is_packaged_good` for aggregator via transform.

---

### 3d. `src/components/panels/menu/ProductCard.jsx`

**State init (L51):** Add:
```js
swiggyPackingChrg: product.swiggyPackingChrg || false,
```

**Quick-edit form — below existing "Packaged" `<select>` (~L238–244):** Add a new `<select>` for `swiggyPackingChrg`, **only rendered when `product.foodFor === 'Aggregator'`**:
```jsx
{product.foodFor === 'Aggregator' && (
  <div>
    <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Swiggy Pack Chrg</label>
    <select value={form.swiggyPackingChrg ? "yes" : "no"}
            onChange={(e) => update("swiggyPackingChrg", e.target.value === "yes")}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white"
            style={{ borderColor: COLORS.borderGray }}>
      <option value="no">No</option>
      <option value="yes">Yes</option>
    </select>
  </div>
)}
```
No change to save handler — ProductCard calls `onSave(form)`, and `form.swiggyPackingChrg` will flow through the transform automatically.

---

## 4. Downstream Impact

| Path | Impact |
|---|---|
| `menuManagementService.addFoodAggregator()` | Passes `foodInfo` payload — no change needed, transform output includes new keys |
| `menuManagementService.editFood()` | Same — transform output includes new keys |
| Normal food add/edit | NOT affected — `is_packaged_good`/`swiggy_packing_chrg` only in Aggregator spread |
| BulkEditor save path | Passes `buildPayload(row)` — no service change needed |
| `fromAPI.food()` for Normal food | `api.is_packaged_good ?? api.packed_food` — safe dual-read |

---

## 5. Risk Classification

| Dimension | Assessment |
|---|---|
| API contract change | YES — new keys sent/read |
| Financial logic | NONE |
| Hotspot file (R5) | NONE — BulkEditor is high-activity but not R5 hotspot |
| Files changed | 4 |
| Normal food regression | LOW — dual-read `??` fallback preserves existing behavior |
| Overall | **MEDIUM** |

---

## 6. Open Questions

None. Owner provided the full key mapping and confirmed aggregator-only scope.

---

## 7. Verification Plan (seeds Gate 3)

| # | Check | Method |
|---|---|---|
| V1 | Edit an aggregator food → toggle "Packaged Item" ON → save → re-load → `is_packaged_good` = 1 in API payload | Browser Network tab |
| V2 | Edit an aggregator food → toggle "Swiggy Packing Charge" ON → save → re-load → `swiggy_packing_chrg` = "YES" | Browser Network tab |
| V3 | Load aggregator food in BulkEditor → `is_packaged_good` read correctly (not always false) | Browser: API probe + BulkEditor cell |
| V4 | `swiggyPackingChrg` column visible in BulkEditor Aggregator mode | Browser: Editing bar shows "Swiggy Pack Chrg" |
| V5 | Normal food save — `packed_food` still sent, `is_packaged_good` NOT sent | Browser Network tab |
| V6 | QuickEdit (ProductCard) shows "Swiggy Pack Chrg" select for aggregator food only | Browser: open quick-edit on aggregator vs normal food |
