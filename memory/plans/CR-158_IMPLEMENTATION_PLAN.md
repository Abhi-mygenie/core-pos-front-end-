# CR-158 — Gate 3: Implementation Plan

**ID:** CR-158
**Title:** GST/VAT Validate Button in Menu Management Bulk Editor
**Date:** 2026-08-20
**Planner:** PLANNING AGENT (AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 3 — Implementation Plan
**Prerequisite:** Gate 2 Impact Analysis ✅ (`memory/impact/CR-158_IMPACT_ANALYSIS.md`)
**Risk:** HIGH
**Owner decisions:** Q1=tax only · Q2=highlight only · Q3=count on button

---

## Entry Verification (Implementation agent must confirm before coding)

| # | Plan says | Verify by |
|---|---|---|
| 1 | `ShieldCheck` NOT in lucide import | `grep ShieldCheck BulkEditor.jsx` → 0 results |
| 2 | `validateIssueCount` state does NOT exist | `grep validateIssueCount BulkEditor.jsx` → 0 results |
| 3 | `handleValidate` does NOT exist | `grep handleValidate BulkEditor.jsx` → 0 results |
| 4 | `updateCell` ends at L446 with `};` after `setRows` | `sed -n '435,447p' BulkEditor.jsx` |
| 5 | Save button at L846 has `onClick={handleSave}` | `sed -n '846p' BulkEditor.jsx` |

If any fails → re-check line numbers (file may have shifted). Re-read before coding.

---

## Execution Sequence (implement in this exact order)

---

### Edit 1 — Add `ShieldCheck` to lucide import

**File:** `src/components/panels/menu/BulkEditor.jsx`

**Current (L2-6):**
```js
import {
  X, Search, Save, Plus, RotateCcw, Check, AlertCircle,
  Columns3, ChevronDown, ChevronRight, Eye, EyeOff, Table2,
  ArrowUpDown, Download, Upload, Loader2, Trash2
} from "lucide-react";
```

**New:**
```js
import {
  X, Search, Save, Plus, RotateCcw, Check, AlertCircle,
  Columns3, ChevronDown, ChevronRight, Eye, EyeOff, Table2,
  ArrowUpDown, Download, Upload, Loader2, Trash2, ShieldCheck
} from "lucide-react";
```

**Verify:** `grep -n "ShieldCheck" BulkEditor.jsx` → 1 result on import line.

---

### Edit 2 — Add `validateIssueCount` state

**File:** `src/components/panels/menu/BulkEditor.jsx`

**Current (L243):**
```js
  const [showErrors, setShowErrors] = useState(false);
```

**New:**
```js
  const [showErrors, setShowErrors] = useState(false);
  // CR-158: null = not yet run, 0 = clean, N = N rows with tax issues
  const [validateIssueCount, setValidateIssueCount] = useState(null);
```

**Verify:** `grep -n "validateIssueCount" BulkEditor.jsx` → 2 results (state declaration + setter).

---

### Edit 3 — Add `handleValidate` function

**File:** `src/components/panels/menu/BulkEditor.jsx`

**Location:** After `validateRow` closes (after `return errors; };`), before `// ─── Save` comment.

**Current (L516-519):**
```js
    return errors;
  };

  // ─── Save (batch parallel) ────────────────────────────────────────
```

**New:**
```js
    return errors;
  };

  // ─── CR-158: Validate (tax-only pre-flight check) ──────────────────
  // Owner Q1: check GST/VAT fields only (name/category/price = Save only).
  // Owner Q2: highlight in-place, no scroll.
  // Owner Q3: show issue count on button.
  // Does NOT trigger save. Does NOT make API calls.
  const handleValidate = () => {
    let issueCount = 0;
    setRows(prev => prev.map(r => {
      const allErrors = validateRow(r);
      // Keep only tax field errors (taxType + taxPercent)
      const taxErrors = allErrors.filter(
        e => e.field === 'taxType' || e.field === 'taxPercent'
      );
      // Preserve any non-tax errors from a prior save attempt (e.g. missing name)
      const existingNonTax = (r._validationErrors || []).filter(
        e => e.field !== 'taxType' && e.field !== 'taxPercent'
      );
      const merged = [...existingNonTax, ...taxErrors];
      if (taxErrors.length > 0) issueCount++;
      return { ...r, _validationErrors: merged.length > 0 ? merged : null };
    }));
    setValidateIssueCount(issueCount);
  };

  // ─── Save (batch parallel) ────────────────────────────────────────
```

**Verify:** `grep -n "handleValidate\|CR-158" BulkEditor.jsx` → function present.

---

### Edit 4 — Reset `validateIssueCount` when any cell is edited

**File:** `src/components/panels/menu/BulkEditor.jsx`

**Location:** `updateCell` function at L435. Add reset AFTER `setRows(...)` closes.

**Current (L435-446):**
```js
  const updateCell = (rowId, field, value) => {
    setRows(prev => prev.map(r => {
      if (r._id !== rowId) return r;
      // CR-027 Phase 3: re-editing a failed row clears its error trail
      const u = { ...r, [field]: value, _saveError: null, _validationErrors: null };
      if (field === "categoryId") {
        const cat = categories.find(c => c.categoryId === Number(value));
        u.categoryName = cat?.categoryName || "Uncategorized";
      }
      return u;
    }));
  };
```

**New:**
```js
  const updateCell = (rowId, field, value) => {
    setRows(prev => prev.map(r => {
      if (r._id !== rowId) return r;
      // CR-027 Phase 3: re-editing a failed row clears its error trail
      const u = { ...r, [field]: value, _saveError: null, _validationErrors: null };
      if (field === "categoryId") {
        const cat = categories.find(c => c.categoryId === Number(value));
        u.categoryName = cat?.categoryName || "Uncategorized";
      }
      return u;
    }));
    setValidateIssueCount(null); // CR-158: stale count after edit → reset to "not run"
  };
```

**Verify:** `grep -n "setValidateIssueCount" BulkEditor.jsx` → 2 results (state init + reset in updateCell).

---

### Edit 5 — Add Validate button in toolbar (before Save)

**File:** `src/components/panels/menu/BulkEditor.jsx`

**Location:** Toolbar, before the Save button (`onClick={handleSave}`).

**Current (L840-851):**
```jsx
          <div className="w-px h-6" style={{ backgroundColor: COLORS.borderGray }} />
          <button onClick={addNewRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-white hover:opacity-90"
            style={{ backgroundColor: COLORS.primaryGreen }} data-testid="add-row-btn">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
          <button onClick={handleSave} disabled={dirtyCount === 0 || saving}
```

**New:**
```jsx
          <div className="w-px h-6" style={{ backgroundColor: COLORS.borderGray }} />
          <button onClick={addNewRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-white hover:opacity-90"
            style={{ backgroundColor: COLORS.primaryGreen }} data-testid="add-row-btn">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
          {/* CR-158: pre-flight tax validate button */}
          <button onClick={handleValidate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border hover:opacity-90 transition-colors"
            style={{
              borderColor: validateIssueCount === null
                ? COLORS.borderGray
                : validateIssueCount === 0 ? '#16a34a' : '#dc2626',
              color: validateIssueCount === null
                ? COLORS.grayText
                : validateIssueCount === 0 ? '#16a34a' : '#dc2626',
              backgroundColor: 'transparent',
            }}
            data-testid="validate-tax-btn">
            <ShieldCheck className="w-3.5 h-3.5" />
            {validateIssueCount === null
              ? 'Validate Tax'
              : validateIssueCount === 0
                ? 'Validate Tax (✓ clean)'
                : `Validate Tax (${validateIssueCount} issue${validateIssueCount > 1 ? 's' : ''})`}
          </button>
          <button onClick={handleSave} disabled={dirtyCount === 0 || saving}
```

**Verify:** `grep -n "validate-tax-btn\|handleValidate" BulkEditor.jsx` → button present in JSX.

---

## Execution Order Summary

| # | Edit | File | Lines affected |
|---|---|---|---|
| 1 | Add `ShieldCheck` import | `BulkEditor.jsx` | L5 (+1 word) |
| 2 | Add `validateIssueCount` state | `BulkEditor.jsx` | After L243 (+2 lines) |
| 3 | Add `handleValidate` function | `BulkEditor.jsx` | After L516 (+20 lines) |
| 4 | Reset in `updateCell` | `BulkEditor.jsx` | L445 (+1 line) |
| 5 | Add Validate button in toolbar | `BulkEditor.jsx` | After addNewRow button (+15 lines) |

**Total: 1 file, ~39 net lines added**

---

## Verification Matrix

| # | Test | Steps | Expected | Auto/Manual |
|---|---|---|---|---|
| 1 | Validate Tax with 0 issues | All items have GST/VAT set | Button → "Validate Tax (✓ clean)", no red rows | Manual |
| 2 | Validate Tax with 3 issues | 3 items missing tax | Button → "Validate Tax (3 issues)", 3 rows red | Manual |
| 3 | Both taxType + taxPercent cells tinted | Row with no tax | taxType cell red + taxPercent cell red | Manual |
| 4 | Edit a red row | Fix tax on 1 of 3 flagged rows | That row's red clears, button resets to "Validate Tax" | Manual |
| 5 | Re-validate after fix | Click Validate Tax again | Button → "Validate Tax (2 issues)" | Manual |
| 6 | PackedFood = Yes items skipped | 1 packed item with no tax | Packed item NOT flagged | Manual |
| 7 | `gstRequired = false` restaurant | Restaurant with GST off | "Validate Tax (✓ clean)" — no tax rule applies | Manual |
| 8 | Save still works independently | Click Save after Validate Tax | Save runs its own full validation, unaffected | Manual |
| 9 | Compile 0 new warnings | After all edits | `webpack compiled with 1 warning` (pre-existing only) | Auto |
| 10 | Existing tests pass | `npx craco test --testPathPattern="BulkEditor"` | All pass — no regression | Auto |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-158 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: BulkEditor.jsx CR-158 entry added
- [ ] Code markers: // CR-158 in every modified section
- [ ] Compile: webpack 0 new warnings
```

---

## Files WILL change
- `src/components/panels/menu/BulkEditor.jsx` (5 edits, ~39 lines)

## Files WILL NOT touch
`MenuManagementPanel.jsx`, `profileTransform.js`, `orderTransform.js`, any test file (unless regression found)

---

*Gate 3 complete. Awaiting Gate 4 GO from owner.*
