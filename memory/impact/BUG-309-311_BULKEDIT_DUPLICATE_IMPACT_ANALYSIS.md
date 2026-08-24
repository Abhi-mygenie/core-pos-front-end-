# Impact Analysis — BUG-309, BUG-310, BUG-311 (Ingredient Bulk Edit + Duplicate Detection)

**Gate:** 2 — Impact Analysis  
**Date:** 2026-08-13  
**Role:** PLANNING  
**Sprint:** pos_5_1  
**Status:** GATE 2 COMPLETE

---

## Header

| Field | Value |
|---|---|
| Code Reality | CONFIRMED — all bugs live in code as described; investigation reports verified |
| Conflict Pre-Check | **CONFLICT** — BUG-309, BUG-310, BUG-311 all touch `IngredientBulkEditor.jsx`. Execution order required: BUG-310 → BUG-309 → BUG-311 |
| Items | BUG-309, BUG-310, BUG-311 |
| Risk (highest) | HIGH (BUG-309 — data loss on save) |

---

## §1 — Conflict Pre-Check

| File | Touching Bugs | Last Modifier | Open Conflicts |
|---|---|---|---|
| `components/inventory/IngredientBulkEditor.jsx` | BUG-309 (L430–433) + BUG-310 (L286–288) + BUG-311 Layer 3 (L188–205) | BUG-277+278+279 (IMPLEMENTED) | **CONFLICT — 3 bugs, 1 file. Execution order: BUG-310 → BUG-309 → BUG-311** |
| `components/inventory/InventorySetupPanel.jsx` | BUG-311 Layer 2 (L136–150) | BUG-275 / BUG-269 / CR-090 (all IMPLEMENTED). BUG-314 (fetchData, different function) | **NO CONFLICT** — BUG-314 touches `fetchData()`, BUG-311 touches `addIngredient()`. Different functions, no overlap. |

**Execution order inside `IngredientBulkEditor.jsx`:**
1. BUG-310 (line 286 — `numCls` function) — earliest in file
2. BUG-309 (lines 430–433 — Min Unit cell) — later in file
3. BUG-311 Layer 3 (lines 188–205 — `handleSave` new-row path) — between the above but in different logical block

---

## §2 — BUG-309: Min Unit Input Type Wrong (Data Loss on Save)

### Severity: P1 — HIGH risk

### Data Flow Trace (Broken Chain)

```
Backend: item.min_unit_alert = "gm"
↓ inventoryTransform.js:72
  minUnitAlert: item.min_unit_alert || ''      → "gm"  ✅
↓ IngredientBulkEditor buildRow():29
  _originalMinUnit: ing.minUnitAlert || ''     → "gm"  ✅
  minUnitAlert: ing.minUnitAlert || ''         → "gm"  ✅
↓ IngredientBulkEditor JSX:430-433
  <input type="number" value={row.minUnitAlert}>
  value="gm" → browser discards non-numeric    → ""   ❌
↓ User sees: "—" placeholder (never shows "gm")
↓ isDirty: String("") !== String("gm") = true → always dirty!
↓ handleSave → updateIngredient → min_unit_alert: "" → DATA OVERWRITTEN ❌
```

### Why `type="number"` is wrong

`min_unit_alert` is a **unit string** (e.g., "gm", "bottle", "pkt") per BUG-219 contract — confirmed by backend and card view. Browsers silently coerce `<input type="number" value="gm">` to empty string. This makes the bulk editor:
1. **Always show "—"** even for ingredients with a stored unit
2. **Always mark row as dirty** (empty ≠ "gm")
3. **Overwrite stored unit with ""** on any save

### Card View Contrast (Correct Pattern)

`InventorySetupPanel.jsx` BUG-269-C: `minUnitAlert` rendered as **read-only `<span>`** locked to `smallUnit`. Min unit is NOT editable — it is always derived from `smallUnit`. Bulk edit must match this.

### Fix Approach

Replace `<input type="number">` with a read-only `<span>` showing the locked value:

```jsx
// BEFORE (line 430-433):
<input type="number" className={isNew ? newNumCls : numCls(String(row.minUnitAlert) !== String(row._originalMinUnit))}
  value={row.minUnitAlert} onChange={e => updateRow(row._key, 'minUnitAlert', e.target.value)}
  placeholder="—" data-testid={`bulk-minunit-${row._key}`} />

// AFTER (BUG-309):
<span className="text-xs text-slate-500 select-none" data-testid={`bulk-minunit-${row._key}`}>
  {row.minUnitAlert || row.smallUnit || row.unit || '—'}
</span>
```

**Why this value:** `row.minUnitAlert` is the stored unit from the backend. `row.smallUnit || row.unit` is the fallback for new rows where no min unit is set yet. This matches the card view pattern exactly.

**Impact on save path:** `row.minUnitAlert` is never modified by user interaction → `isDirty` minUnit check always false for existing rows → `min_unit_alert` sent back unchanged on save → no data loss.

**Impact on `isDirty`:** The `isDirty` function at line 49 still checks `String(row.minUnitAlert) !== String(row._originalMinUnit)` — this is correct, but since the span prevents state updates, it will always be equal. No change needed to `isDirty`.

### Affected Files

| File | Lines | Change | Risk |
|---|---|---|---|
| `components/inventory/IngredientBulkEditor.jsx` | 430–433 | `<input type="number">` → `<span>` | HIGH fix / LOW regression risk |

**Files NOT touched:** `inventoryTransform.js` (fromAPI read path correct at line 72), `inventoryService.js`, `InventorySetupPanel.jsx`.

### Risk Assessment

| Factor | Assessment |
|---|---|
| Data loss | FIXED — span prevents overwrite |
| API contract | NO change — `min_unit_alert` still sent from `row.minUnitAlert` on save |
| Hotspot | NO |
| Financial | NO |
| Regression | `isDirty` for minUnit remains functionally correct (span prevents any change) |

**Risk: HIGH (current bug) → LOW (after fix)**

---

## §3 — BUG-310: Conversion Field Invisible (Transparent Styling)

### Severity: P2 — LOW risk

### Root Cause

```
IngredientBulkEditor.jsx:286–288 — numCls function:
  const numCls = (dirty) => `... ${
    dirty
      ? 'border-amber-300 bg-white ...'       ← visible (amber border + white bg)
      : 'border-transparent bg-transparent ...' ← INVISIBLE (no border, no background)
  }`;

Conversion column (line 420–424):
  <input type="number" className={numCls(String(row.conversionFactor) !== String(row._originalConversion))}
  value={row.conversionFactor} placeholder="—" ...>

When conversionFactor is unchanged (dirty=false):
  → border-transparent bg-transparent
  → placeholder "—" appears as floating black text on white page
  → User cannot tell this is an editable field
```

**Secondary cause:** For auto-units (kg, ltr), `conversionFactor` is intentionally `''` (backend handles ×1000 internally). The transparent styling makes this look broken rather than "not applicable."

### numCls scope

`numCls` is used for 3 columns: `conversionFactor`, `minQtyAlert`, and `minUnitAlert`. After BUG-309 fix, `minUnitAlert` becomes a `<span>` and no longer uses `numCls`. So the change to `numCls` affects:
- `conversionFactor` input — the primary reported issue
- `minQtyAlert` input — also gets the improved styling (positive side-effect)

### Owner Decision on Fix Option

**Option A (minimal — recommended):** Change `numCls(false)` to add subtle visible background:
```js
// dirty=false case:
'border-slate-100 bg-slate-50/50 hover:border-slate-300 focus:border-orange-400'
```
Faint slate background + light border on clean inputs. User sees the input is editable. 1 line change.

**Option B (full smart logic):** For auto-units (kg/ltr), replace editable input with a disabled `"Auto ×1000"` display. For same base/small unit, disable. Matches card view behaviour fully. ~15 lines, but adds conditional rendering complexity.

**Recommended: Option A** — minimal, safe, reversible. Option B can be a follow-up CR if owner wants full parity with card view.

### Affected Files

| File | Lines | Change (Option A) | Risk |
|---|---|---|---|
| `components/inventory/IngredientBulkEditor.jsx` | 287–288 | Change `border-transparent bg-transparent` → `border-slate-100 bg-slate-50/50 hover:border-slate-300` in `numCls(false)` | LOW |

**Files NOT touched:** All other files.

### Risk Assessment

| Factor | Assessment |
|---|---|
| Functional logic | NO change — only CSS class strings |
| Data | NO change |
| Hotspot | NO |
| Financial | NO |
| Regression | Very low — only visual change to dirty=false state of number inputs |

**Risk: LOW**

---

## §4 — BUG-311: Ingredient Add — No Duplicate Detection

### Severity: P1 — MEDIUM risk

### Scope Decision (Layers 2+3 This Sprint, Layer 1 Deferred)

| Layer | Description | Lines | Files | Status |
|---|---|---|---|---|
| **Layer 1** | Typeahead combobox on name input | ~50 lines + new component | `InventorySetupPanel.jsx` + new file | **DEFER** — new component required, owner decision pending |
| **Layer 2** | Pre-save `isDuplicate` check in `addIngredient()` | ~5 lines | `InventorySetupPanel.jsx` | **THIS SPRINT** |
| **Layer 3** | Duplicate skip+badge in `IngredientBulkEditor.handleSave()` for new rows | ~10 lines | `IngredientBulkEditor.jsx` | **THIS SPRINT** |

**Rationale for deferring Layer 1:** Typeahead requires a new combobox component or adaptation of `ItemCombobox` from expense. This is a larger feature (>50 lines, new file). Layers 2+3 provide immediate data protection with minimal code. Layer 1 can ship as a follow-up CR.

### Layer 2 — Pre-Save isDuplicate in `addIngredient()`

**Current (`InventorySetupPanel.jsx:136–150`):**
```js
const addIngredient = async () => {
  if (!newIng.name.trim() || !newIng.categoryId || !newIng.unit) {
    toast.error('Name, category, and unit are required');
    return;
  }
  try {
    await inventoryService.addIngredient(newIng);
    ...
```

**Missing:** No name duplicate check before API call.

**Reference pattern (`InventorySetupPanel.jsx:84–87` — category guard already exists):**
```js
if (categories.some(c => (c.name || '').trim().toLowerCase() === dupName)) {
  toast.error(`Category "${newCatName.trim()}" already exists`);
  return;
}
```

**Fix — add after the required-fields check at line 138:**
```js
// BUG-311: Layer 2 — pre-save duplicate guard
const dupName = newIng.name.trim().toLowerCase();
if (ingredients.some(i => i.name.trim().toLowerCase() === dupName)) {
  toast.error(`"${newIng.name.trim()}" already exists`);
  return;
}
```

**Scope note:** Duplicate check is **global** (across all categories) — this is correct for ingredients (unlike expenses which are per-category). An ingredient with the same name in two categories would be confusing.

### Layer 3 — Duplicate Skip in `IngredientBulkEditor.handleSave()`

**Current (`IngredientBulkEditor.jsx:188–205` — new row save path):**
```js
for (const r of dirty) {
  setRows(prev => prev.map(x => x._key === r._key ? { ...x, _saving: true, _saveOk: false, _saveError: null } : x));
  try {
    if (r._isNew) {
      await inventoryService.addIngredient(r);  // ← no dup check
    } else {
      await inventoryService.updateIngredient(r._id, r);
    }
```

**Props available:** `IngredientBulkEditor` receives `allItems` prop (the full ingredient list, confirmed at component signature line ~56: `export default function IngredientBulkEditor({ allItems, categories, units, onRefresh, onClose })`).

**Fix — add dup check inside the `if (r._isNew)` block:**
```js
if (r._isNew) {
  // BUG-311: Layer 3 — duplicate skip+badge for new bulk-edit rows
  const dupName = r.name.trim().toLowerCase();
  const dup = allItems.some(i => (i.name || '').trim().toLowerCase() === dupName);
  if (dup) {
    setRows(prev => prev.map(x => x._key === r._key
      ? { ...x, _saving: false, _saveError: `"${r.name}" already exists` }
      : x));
    fail++;
    continue;
  }
  await inventoryService.addIngredient(r);
```

**Visual feedback:** The existing `_saveError` badge UI at line ~455 shows red ✗ with the error message as a tooltip — no new UI needed. This is the same pattern as `ExpenseBulkEditor.jsx:366`.

### Layer 1 Deferral Note

Layer 1 (typeahead) is deferred as a follow-up CR. When implemented:
- Adapts `ItemCombobox` from `ExpenseEntryPanel.jsx` or creates `IngredientCombobox`
- Wired to `newIng.name` input in `InventorySetupPanel.jsx:306–308`
- ~50 lines, 1–2 files, Medium risk (new component)

### Affected Files

| File | Layer | Lines | Change | Risk |
|---|---|---|---|---|
| `components/inventory/InventorySetupPanel.jsx` | Layer 2 | 138–140 (+3 lines) | Pre-save isDuplicate guard in `addIngredient()` | MEDIUM |
| `components/inventory/IngredientBulkEditor.jsx` | Layer 3 | 191–199 (+~7 lines) | Dup skip+badge in `handleSave()` new-row path | MEDIUM |

**Files NOT touched:** `inventoryService.js`, `inventoryTransform.js`, `ExpenseSetupPanel.jsx`.

### Risk Assessment

| Factor | Assessment |
|---|---|
| Financial logic | NO |
| Hotspot | NO (`InventorySetupPanel.jsx` and `IngredientBulkEditor.jsx` not on R5) |
| API impact | NO — duplicate detection is purely FE-side guard; API still acts as safety net |
| Data integrity | IMPROVED — prevents silent duplicate creation |
| Regression | Very low — guard only adds early return on duplicate name; all other paths unchanged |

**Risk: MEDIUM (data integrity feature, safe implementation)**

---

## §5 — Scope Lock

| File | BUG-309 | BUG-310 | BUG-311 L2 | BUG-311 L3 |
|---|---|---|---|---|
| `components/inventory/IngredientBulkEditor.jsx` | ✅ L430–433 | ✅ L287–288 | ❌ | ✅ L191–199 |
| `components/inventory/InventorySetupPanel.jsx` | ❌ | ❌ | ✅ L138–140 | ❌ |
| All other files | ❌ | ❌ | ❌ | ❌ |

**New files:** NONE  
**Total:** 2 files, ~20 lines net (3 targeted edits + 2 line additions)

---

## §6 — Verification Matrix

| # | Bug | Edit | File | How to Verify | Automated? |
|---|---|---|---|---|---|
| V1 | BUG-309 | Min Unit span | `IngredientBulkEditor.jsx` | Open bulk edit → existing ingredient with "gm" min unit → Min Unit column shows "gm" (not "—") | Browser |
| V2 | BUG-309 | No data loss | `IngredientBulkEditor.jsx` | Save without touching Min Unit → Network → `min_unit_alert` = "gm" (not "") | Browser DevTools |
| V3 | BUG-309 | New row | `IngredientBulkEditor.jsx` | Add new row → Min Unit shows `smallUnit || unit || '—'` (read-only) | Browser |
| V4 | BUG-310 | Styling visible | `IngredientBulkEditor.jsx` | Open bulk edit → Conversion column shows faint `bg-slate-50` background on clean rows | Browser |
| V5 | BUG-310 | Dirty still amber | `IngredientBulkEditor.jsx` | Edit conversion → column shows amber border | Browser |
| V6 | BUG-311 L2 | Dup guard add form | `InventorySetupPanel.jsx` | Card view add form → type existing ingredient name → click Add → toast "already exists" | Browser |
| V7 | BUG-311 L3 | Dup guard bulk edit | `IngredientBulkEditor.jsx` | Bulk edit add row → type existing name → Save → row shows ✗ badge "already exists" | Browser |
| V8 | BUG-311 L3 | Non-dup passes | `IngredientBulkEditor.jsx` | Bulk edit add row → new unique name → saves normally | Browser |
| V9 | Regression | StockAuditPanel unaffected | Other files | Stock Audit tab still functions normally | Browser |

---

## §7 — Owner Decisions

| # | ID | Decision | Blocking? |
|---|---|---|---|
| OD-1 | BUG-310 | **Option A** (subtle bg-slate-50/50) or **Option B** (smart auto-unit logic)? | YES — blocks Gate 3 for BUG-310 |
| OD-2 | BUG-311 | Confirm: Layer 1 (typeahead) deferred to follow-up CR? Ship Layers 2+3 now? | YES — confirms scope |

**Recommended answers (for owner to approve):**
- OD-1: Option A — minimal, safe, 1 line
- OD-2: Layers 2+3 now, Layer 1 as separate CR

---

## §8 — Post-Code Registry Checklist (for Implementation agent)

```
□ 1. REGISTRY SYNC: BUG-309, BUG-310, BUG-311 → IMPLEMENTED, sprint_key: pos_5_1
□ 2. BUG_TRACKER.md: rows updated
□ 3. FILE_OWNERSHIP.md:
     | components/inventory/IngredientBulkEditor.jsx | BUG-309: minUnit input→span (L430–433). BUG-310: numCls visible bg (L287–288). BUG-311 L3: dup skip in handleSave (L191–199) |
     | components/inventory/InventorySetupPanel.jsx  | BUG-311 L2: isDuplicate guard in addIngredient() (L138–140) |
□ 4. CODE MARKERS: // BUG-309, // BUG-310, // BUG-311 in each modified block
□ 5. COMPILE CHECK: webpack 0 new warnings
```
