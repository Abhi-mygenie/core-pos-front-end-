# CR-089 — Implementation Plan: PDF Export for Recipes (Gate 3)

**Date:** 2026-07-23 | **Impact:** `/app/memory/impact/CR-089_IMPACT_ANALYSIS.md` (verified) | **Risk:** LOW
**Entry verification:** PASS 2026-07-23 — RecipeManagementPanel.jsx 236 lines, no PDF export. `jspdf` + `jspdf-autotable` in package.json. No Wave 1/2 conflicts.

## Dependencies / Execution Order
Implement AFTER CR-092 (sort) and CR-088 (By Ingredient tab) since both add to toolbar/tabs. CR-089 adds a single button — parallel-safe but implement last to avoid line-number conflicts. PDF reads recipe state directly (not affected by sort or tab additions).

## Scope Lock
WILL change: `components/inventory/RecipeManagementPanel.jsx` only.
WILL NOT touch: `recipeService.js`, `recipeTransform.js`, `RecipeBulkEditor.jsx`, `RecipeFormPanel.jsx`.
LIBRARIES: `jspdf`, `jspdf-autotable` (already installed in package.json).

## Edits (exact)

### Edit 1 — Import jsPDF (top of file, after existing imports)
```jsx
import jsPDF from 'jspdf'; // CR-089
import 'jspdf-autotable';  // CR-089
```

### Edit 2 — Import Download icon (add to lucide-react import, line 4)
Add `FileDown` to the existing lucide-react import:
```jsx
import { Search, Plus, Clock, Users, ChefHat, LayoutGrid, Table2, FileDown } from 'lucide-react';
```

### Edit 3 — handleExportPDF function (inside main component, after handleBack ~line 165)
```jsx
  // CR-089: PDF export — all recipe types in one document
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Recipe Book', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

    let yPos = 35;
    const sections = [
      { title: `Standard Recipes (${standardRecipes.length})`, recipes: standardRecipes },
      { title: `Sub-Recipes (${subRecipes.length})`, recipes: subRecipes },
      { title: `Addon Recipes (${addonRecipes.length})`, recipes: addonRecipes },
    ];

    for (const section of sections) {
      if (section.recipes.length === 0) continue;
      if (yPos > 260) { doc.addPage(); yPos = 20; }
      doc.setFontSize(13);
      doc.text(section.title, 14, yPos);
      yPos += 6;

      doc.autoTable({
        startY: yPos,
        head: [['Recipe', 'Item', 'Prep', 'Cook', 'Serves', 'Cost', 'Ingredients']],
        body: section.recipes.map(r => [
          r.name,
          r.foodName || r.addonName || '—',
          r.preparationTime || '—',
          r.serveTime || '—',
          r.servePeople || '—',
          r.cost ? `₹${Number(r.cost).toFixed(2)}` : '—',
          (r.ingredients || []).map(i => `${i.name} ${i.quantity}${i.unit}`).join(', ') || '—',
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [242, 107, 51] },
        columnStyles: { 6: { cellWidth: 50 } },
      });

      yPos = doc.lastAutoTable.finalY + 10;
    }

    doc.save('recipe-book.pdf');
    toast.success('Recipe book PDF downloaded');
  };
```

### Edit 4 — "Download PDF" button in toolbar (next to "Create Recipe" button, line 192)
Insert before the Create Recipe button:
```jsx
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5 text-xs mr-2"
            data-testid="recipe-export-pdf-btn" disabled={loading}>
            <FileDown className="w-3.5 h-3.5" /> Download PDF
          </Button>
```

Total: 1 file, ~45 lines.

## Verification Matrix
| # | Verify | How | Auto? |
|---|---|---|---|
| 1 | "Download PDF" button visible in toolbar | Browser | NO |
| 2 | Click → .pdf file downloads | Browser: click button, check Downloads | NO |
| 3 | PDF contains all 3 sections (Standard, Sub, Addon) | Open PDF | NO |
| 4 | Ingredients column populated | Open PDF, check last column | NO |
| 5 | Empty section skipped | If no addon recipes, no "Addon" section in PDF | NO |
| 6 | Button disabled while loading | Refresh page, button grey during fetch | NO |
| 7 | Regression: existing toolbar buttons still work | Create Recipe, Card/Bulk toggle | NO |

## Risk Register
| Risk | Severity | Mitigation |
|---|---|---|
| jsPDF already installed | NONE | Confirmed in package.json |
| Large recipe count → multi-page PDF | LOW | autoTable handles page breaks |
| Missing data fields | LOW | Fallback to '—' |

## Cross-Impact
- **Wave 1 (RecipeFormPanel.jsx):** NO conflict — different file.
- **Wave 2 (inventoryTransform.js, InventorySetupPanel.jsx):** NO conflict — different files.
- **CR-092 (sort):** NO conflict — PDF reads raw recipe arrays, not sorted. Intentional: PDF is a full export, sort is view-only.
- **CR-088 (By Ingredient):** NO conflict — different toolbar section, different tab.

## Registry Checklist
- [ ] registry.json CR-089 → GATE 3 COMPLETE → IMPLEMENTED
- [ ] `// CR-089` markers
- [ ] webpack clean
