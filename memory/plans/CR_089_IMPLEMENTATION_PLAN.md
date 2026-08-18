# CR-089 — Implementation Plan (Gate 3) — UPDATED

**Date:** 2026-07-24 (updated from 2026-07-23 — line numbers corrected)
**Impact Analysis:** `impact/CR_089_IMPACT_ANALYSIS.md` (Gate 2 ✅)
**Code Reality:** NONE
**Risk:** LOW
**Scope Lock:** 1 file WILL change

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Auto? |
|--------|------|--------|---------------|:---:|
| 1 | `RecipeManagementPanel.jsx:4` | Add `FileDown` to lucide import | Code inspection | NO |
| 2 | `RecipeManagementPanel.jsx:2` | Add jsPDF imports | Code inspection | NO |
| 3 | `RecipeManagementPanel.jsx:~410` | Add `handleExportPDF` function | Code inspection | NO |
| 4 | `RecipeManagementPanel.jsx:~452` | Add "Download PDF" button | Browser: button visible + click downloads PDF | NO |

---

## Edits

### Edit 1: Import jsPDF (after L2)
**Line:** After existing imports at top of file
**New:** Add 2 lines:
```js
import jsPDF from 'jspdf'; // CR-089
import 'jspdf-autotable';  // CR-089
```

### Edit 2: Add FileDown to lucide import (L4)
**Current:**
```js
import { Search, Plus, Clock, Users, ChefHat, LayoutGrid, Table2, FileText, ChevronsUpDown, Check } from 'lucide-react';
```
**New:**
```js
import { Search, Plus, Clock, Users, ChefHat, LayoutGrid, Table2, FileText, ChevronsUpDown, Check, FileDown } from 'lucide-react'; // CR-089: +FileDown
```

### Edit 3: handleExportPDF function (after handleBack at L407)
**Line:** After L410 (end of handleBack function)
**New:** (same as original plan — ~40 lines, generates 3-section PDF with autoTable)

### Edit 4: "Download PDF" button (before Create Recipe button at L452)
**Line:** Before L452 (`{activeTab !== 'by-ingredient' && (`)
**New:**
```jsx
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5 text-xs mr-2"
            data-testid="recipe-export-pdf-btn" disabled={loading}>
            <FileDown className="w-3.5 h-3.5" /> Download PDF
          </Button>
```

---

## Scope Lock

**Files WILL change:** `RecipeManagementPanel.jsx` (1 file, ~45 lines)
**Files WILL NOT touch:** recipeService.js, recipeTransform.js, RecipeBulkEditor.jsx, RecipeFormPanel.jsx

## Post-Code Registry Checklist
- [ ] registry.json: CR-089 → IMPLEMENTED
- [ ] CR_REGISTRY.md row updated
- [ ] FILE_OWNERSHIP.md: add RecipeManagementPanel.jsx with CR-089
- [ ] Code markers: // CR-089

---

**Next:** Gate 4 GO → Implementation
