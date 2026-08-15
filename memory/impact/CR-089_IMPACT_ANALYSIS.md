# CR-089 — Impact Analysis: PDF Export for Recipes

**ID:** CR-089
**Gate:** 2 (Impact Analysis)
**Risk:** LOW
**Code Reality:** NONE — no PDF export exists. RecipeBulkEditor has Excel export only (standard recipes). No `exportRecipesPDF()` function.
**Conflict Pre-Check:** CLEAR — recipeService.js shared with BUG-222 (Wave 3, Excel export fix) but CR-089 adds PDF — completely additive, zero overlap. RecipeManagementPanel.jsx same as CR-088/CR-092 (CLEAR).

---

## 1. Data Flow Trace

```
Backend probe:
  GET /api/v2/vendoremployee/recipe/export-recipe-pdf → 404 (NOT FOUND)
  → No backend PDF endpoint.

Client-side approach (CONFIRMED):
  jspdf (v4.2.1) + jspdf-autotable (v5.0.8) already in package.json
  → same pattern used by existing reportExporter.js for other reports

  Flow:
    RecipeManagementPanel.jsx → "Download PDF" button in toolbar
    → collect recipes for current tab (or all tabs)
    → build jsPDF document with autoTable
    → trigger browser download
```

**No new API endpoint needed.** Client-side PDF generation from already-loaded recipe data.

---

## 2. Affected Files

| # | File | Lines | Change | Est. Lines |
|---|------|-------|--------|------------|
| 1 | `components/inventory/RecipeManagementPanel.jsx` | 235 total | Add "Download PDF" button in toolbar + `handleExportPDF()` function | ~35-40 lines |

**Files WILL NOT touch:** `recipeService.js`, `recipeTransform.js`, `RecipeBulkEditor.jsx`, `RecipeFormPanel.jsx`, `constants.js`, `App.js`

**Libraries used (already installed):** `jspdf`, `jspdf-autotable`

---

## 3. PDF Document Structure

```
┌────────────────────────────────────────────┐
│  [MyGenie Logo]  Recipe Book               │
│  Restaurant: cafe103                        │
│  Generated: 22/07/2026                     │
│                                            │
│  ═══ STANDARD RECIPES (64) ═══            │
│  ┌─────────┬────────┬──────┬──────┐       │
│  │ Recipe  │ Menu   │ Prep │ Serve│       │
│  │ Name    │ Item   │ Time │ Size │       │
│  ├─────────┼────────┼──────┼──────┤       │
│  │ Paneer  │ Paneer │ 15m  │ 1    │       │
│  │ Tikka   │ Tikka  │      │      │       │
│  └─────────┴────────┴──────┴──────┘       │
│  Ingredients: Paneer 200g, Curd 50ml...   │
│                                            │
│  ═══ SUB-RECIPES (11) ═══                 │
│  ... same table ...                        │
│                                            │
│  ═══ ADDON RECIPES (7) ═══               │
│  ... same table ...                        │
└────────────────────────────────────────────┘
```

### Columns per recipe type

| Column | Standard | Sub | Addon |
|---|---|---|---|
| Recipe Name | YES | YES | YES |
| Menu/Addon Item | foodName | — | addonName |
| Prep Time | YES | YES | YES |
| Serve Time | YES | YES | YES |
| Serves | YES | YES | YES |
| Cost | YES | YES | YES |
| Ingredients (sub-row) | count + names | count + names | count + names |

---

## 4. Button Placement

Two options (owner choice, or default to Option A):

**Option A (Recommended):** Single "Download PDF" button next to Card/Bulk toggle in toolbar. Exports ALL recipes across all tabs.

**Option B:** Per-tab export — button inside each TabsContent. Exports only current tab's recipes.

→ Default to **Option A** (single button, all tabs) — kitchen staff want the full recipe book.

---

## 5. Implementation Pattern

```javascript
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const handleExportPDF = () => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Recipe Book', 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

  let yPos = 35;
  const sections = [
    { title: 'Standard Recipes', recipes: standardRecipes },
    { title: 'Sub-Recipes', recipes: subRecipes },
    { title: 'Addon Recipes', recipes: addonRecipes },
  ];

  for (const section of sections) {
    if (section.recipes.length === 0) continue;
    doc.setFontSize(14);
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
      styles: { fontSize: 8 },
      headStyles: { fillColor: [242, 107, 51] }, // primaryOrange
    });

    yPos = doc.lastAutoTable.finalY + 10;
    if (yPos > 250) { doc.addPage(); yPos = 20; }
  }

  doc.save('recipe-book.pdf');
};
```

---

## 6. Downstream Consumers

- NONE — PDF export is a fire-and-forget browser download
- Does not modify any state or data

---

## 7. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| jspdf bundle size | NEGLIGIBLE | Already in package.json + installed |
| Large recipe list → large PDF | LOW | autoTable handles pagination automatically |
| Missing ingredient data | LOW | Fallback to '—' for empty fields |
| BUG-222 conflict (recipeService.js) | NONE | CR-089 does NOT touch recipeService.js |

---

## 8. Owner Decisions — 1 NON-BLOCKING

| # | Question | Default |
|---|---|---|
| OQ-1 | Export all tabs (full recipe book) or per-tab? | Default: ALL tabs (full book) |

---

## Next
Gate 3 (Implementation Plan) → Gate 4 GO
