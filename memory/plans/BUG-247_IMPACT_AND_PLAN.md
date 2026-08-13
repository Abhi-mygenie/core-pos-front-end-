# BUG-247 — Impact Analysis + Implementation Plan (Gate 2 + Gate 3)

**ID:** BUG-247
**Title:** Smart Purchase ad-hoc typeahead blocks UI
**Date:** 2026-07-25
**Risk:** LOW
**Code Reality:** Bug confirmed — no React.memo on VendorSuggestionCell, no memoization on filteredMaster.
**Conflict Pre-Check:** AutoShoppingList last modified BUG-240/241 (2026-07-24). VendorSuggestionCell last modified BUG-227 (2026-07-23). No active CRs on either file. SAFE.

---

## Impact Analysis (Gate 2)

### Re-render Cascade
```
User types in typeahead input
  → setTypeaheadQuery(value) — local state in AutoShoppingList
  → AutoShoppingList re-renders (entire component)
  → Table renders ALL rows via rows.map() at L117
  → Each row renders <VendorSuggestionCell> at L163
    → 120-line component: Popover + Command + CommandInput + useMemo
    → With 50+ rows = 50+ heavy re-renders per keystroke
  → UI blocks/lags
```

### Why React.memo Works
`VendorSuggestionCell` receives props: `ranking`, `selectedVendorId`, `onChange`, `ingredientId`. None of these change when `typeaheadQuery` changes. With `React.memo`, all 50+ cells skip re-render on typeahead keystrokes.

### Risk Register
| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| React.memo prevents valid re-render | NONE | Props only change when user edits a row — typeahead doesn't affect row props |
| filteredMaster still runs per render | LOW | O(106 × 50) = 5,300 ops — negligible after VendorSuggestionCell re-renders eliminated |

---

## Implementation Plan (Gate 3)

### Scope Lock
- **Files WILL change:** `components/inventory/smart/VendorSuggestionCell.jsx` (wrap export)
- **Files WILL NOT touch:** AutoShoppingList.jsx (no structural change needed), SmartPurchasePanel.jsx

### Edit

**File:** `VendorSuggestionCell.jsx`

**Current (L31 + end of file):**
```js
export default function VendorSuggestionCell({ ranking, selectedVendorId, onChange, ingredientId }) {
  // ... 90 lines of component body ...
}
```

**New:**
```js
import { useState, useMemo, memo } from 'react';  // BUG-247: +memo

// BUG-247: React.memo prevents re-render when parent re-renders from typeahead state change.
// Props (ranking, selectedVendorId, onChange, ingredientId) don't change on typeahead keystrokes.
const VendorSuggestionCell = memo(function VendorSuggestionCell({ ranking, selectedVendorId, onChange, ingredientId }) {
  // ... 90 lines unchanged ...
});

export default VendorSuggestionCell;
```

**Change:** 3 lines — import `memo`, wrap function in `memo()`, change export pattern.

### Verification Matrix

| # | Check | How to Verify |
|---|-------|--------------|
| V1 | Typeahead no longer lags | Browser: Smart Purchase → click "Add Ad-hoc" → type quickly → verify no freeze |
| V2 | Vendor dropdown still works | Browser: click vendor combobox on any row → search → select → verify |
| V3 | Row edits (qty/rate) still trigger cell update | Browser: change qty → verify cell re-renders correctly |
| V4 | Webpack compiles | Logs check |

### Post-Code Registry Checklist
- [ ] registry.json: BUG-247 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add VendorSuggestionCell.jsx with BUG-247
- [ ] Code markers: `// BUG-247` comment
