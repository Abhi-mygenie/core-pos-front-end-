# CR-088 — Implementation Plan v2: Recipe "By Ingredient" Reverse View Tab (Gate 3 REVISED)

**Date:** 2026-07-23 (v2 — corrected per owner feedback) | **Impact:** `/app/memory/impact/CR-088_IMPACT_ANALYSIS.md` (verified) | **Risk:** LOW
**Entry verification:** PASS 2026-07-23 — RecipeManagementPanel.jsx 235 lines, 3 tabs at lines 177-188, RecipeCard at line 13. No CR-088 code exists.
**v2 change:** Owner clarified the key requirement is prominently showing **how much of the selected ingredient** each recipe uses. Previous plan reused RecipeCard as-is (generic ingredient list) — this revision adds a dedicated ingredient quantity highlight per result row instead.

## Dependencies / Execution Order
Standalone — no dependency on CR-092 (sort controls) since this tab has its own filter. Parallel-safe with CR-089.

## Scope Lock
WILL change: `components/inventory/RecipeManagementPanel.jsx` only.
WILL NOT touch: `recipeService.js`, `recipeTransform.js`, `RecipeFormPanel.jsx`, `RecipeBulkEditor.jsx`, `inventoryService.js` (read-only import).

## Edits (exact)

### Edit 1 — Import inventoryService (line 9, after recipeService import)
```jsx
import * as inventoryService from '@/api/services/inventoryService'; // CR-088
```

### Edit 2 — State for ingredients + selected (after viewMode state, line 130)
```jsx
  const [ingredients, setIngredients] = useState([]);    // CR-088
  const [selectedIngId, setSelectedIngId] = useState(''); // CR-088
```

### Edit 3 — Fetch ingredients in fetchData (expand the existing Promise.all at line 135)
```jsx
      const [std, sub, addon, ings] = await Promise.all([
        recipeService.getRecipes(),
        recipeService.getSubRecipes(),
        recipeService.getAddonRecipes(),
        inventoryService.getIngredients(), // CR-088
      ]);
      setStandardRecipes(std);
      setSubRecipes(sub);
      setAddonRecipes(addon);
      setIngredients(ings); // CR-088
```

### Edit 4 — 4th TabsTrigger (after addon trigger at line 188)
```jsx
            <TabsTrigger value="by-ingredient" data-testid="recipe-tab-byingredient-trigger"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">
              By Ingredient
            </TabsTrigger>
```

### Edit 5 — Hide Card/Bulk toggle + Create button on "by-ingredient" tab
Wrap the Card/Bulk toggle block (lines 197-208) and the Create Recipe button in guards:
- Create Recipe button: `{activeTab !== 'by-ingredient' && <Button ...>}`
- Card/Bulk toggle: `{activeTab !== 'by-ingredient' && (<div className="flex ..."> ... </div>)}`

### Edit 6 — 4th TabsContent (after addon TabsContent, inside the card-mode `<>` fragment, before closing `</>`)

This is the core change. Does NOT reuse RecipeCard. Instead renders a **table/list view** where each row prominently shows the selected ingredient's quantity:

```jsx
        <TabsContent value="by-ingredient" className="mt-0">
          {/* CR-088: Ingredient reverse lookup */}
          <div data-testid="by-ingredient-tab">
            {/* Ingredient selector */}
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-md outline-none focus:border-orange-400 bg-white appearance-none"
                  value={selectedIngId}
                  onChange={e => setSelectedIngId(e.target.value)}
                  data-testid="ingredient-selector"
                >
                  <option value="">Select an ingredient...</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results */}
            {selectedIngId ? (() => {
              const allRecipes = [
                ...standardRecipes.map(r => ({ ...r, _type: 'Standard' })),
                ...subRecipes.map(r => ({ ...r, _type: 'Sub' })),
                ...addonRecipes.map(r => ({ ...r, _type: 'Addon' })),
              ];
              const matches = allRecipes
                .map(r => {
                  const ingMatch = (r.ingredients || []).find(i => String(i.id) === String(selectedIngId));
                  if (!ingMatch) return null;
                  return { ...r, _matchedQty: ingMatch.quantity, _matchedUnit: ingMatch.unit };
                })
                .filter(Boolean);
              const selectedIngName = ingredients.find(i => String(i.id) === String(selectedIngId))?.name || '';
              const totalQty = matches.reduce((sum, m) => sum + (m._matchedQty || 0), 0);

              if (matches.length === 0) return (
                <div className="py-12 text-center text-sm text-slate-400" data-testid="no-matches">
                  No recipes use this ingredient
                </div>
              );

              return (
                <div>
                  {/* Summary strip */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-semibold text-slate-700">
                      {matches.length} recipe{matches.length !== 1 ? 's' : ''} use
                    </span>
                    <span className="text-sm font-bold text-orange-600">{selectedIngName}</span>
                    <span className="text-xs text-slate-400">
                      (Total: {totalQty.toFixed(totalQty < 10 ? 2 : 0)} {matches[0]?._matchedUnit || ''})
                    </span>
                  </div>

                  {/* Results table */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left" data-testid="by-ingredient-table">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Recipe Name</th>
                          <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Type</th>
                          <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Qty Used</th>
                          <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Unit</th>
                          <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Cost</th>
                          <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Sale</th>
                          <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Serves</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matches.map(r => (
                          <tr key={`${r._type}-${r.id}`}
                            className="border-b border-slate-50 hover:bg-orange-50/30 cursor-pointer transition-colors"
                            onClick={() => handleEdit(r, r._type.toLowerCase())}
                            data-testid={`byingredient-row-${r.id}`}
                          >
                            <td className="py-3 px-4">
                              <div className="text-sm font-medium text-slate-900">{r.name}</div>
                              {r.foodName && <div className="text-xs text-slate-400">Menu: {r.foodName}</div>}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                r._type === 'Standard' ? 'bg-orange-50 text-orange-600' :
                                r._type === 'Sub' ? 'bg-slate-100 text-slate-600' :
                                'bg-green-50 text-green-600'
                              }`}>{r._type}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-sm font-bold text-orange-600">{r._matchedQty}</span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500">{r._matchedUnit}</td>
                            <td className="py-3 px-4 text-right text-xs text-slate-600">
                              {r.cost ? `₹${Number(r.cost).toFixed(2)}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right text-xs text-slate-600">
                              {r.salePrice ? `₹${Number(r.salePrice).toFixed(2)}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-600">
                              {r.servePeople ? `${r.servePeople} Serve` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Total row */}
                      <tfoot>
                        <tr className="bg-slate-50 border-t border-slate-200">
                          <td className="py-2.5 px-4 text-xs font-bold text-slate-700">TOTAL</td>
                          <td className="py-2.5 px-4 text-xs text-slate-500">{matches.length} recipes</td>
                          <td className="py-2.5 px-4 text-right text-sm font-bold text-orange-600">
                            {totalQty.toFixed(totalQty < 10 ? 2 : 0)}
                          </td>
                          <td className="py-2.5 px-4 text-xs text-slate-500">{matches[0]?._matchedUnit || ''}</td>
                          <td colSpan={3}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })() : (
              <div className="py-12 text-center">
                <ChefHat className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Select an ingredient above to see which recipes use it</p>
              </div>
            )}
          </div>
        </TabsContent>
```

Total: 1 file, ~80-90 lines.

## Key Design Decisions (v2 corrections)

| Decision | v1 (wrong) | v2 (corrected) |
|----------|-----------|----------------|
| Result format | Reuse RecipeCard (grid) | **Table rows** — ingredient qty is the star column |
| Ingredient qty display | Buried in generic ingredient list | **Prominent orange bold column** per row |
| Total consumption | Not shown | **Footer row** summing all qty |
| Photos | Added food images | **No photos** — match existing screen |
| Click behavior | Edit via RecipeCard.onClick | **Row click → opens edit form** (same handleEdit) |

## Verification Matrix
| # | Verify | How | Auto? |
|---|---|---|---|
| 1 | 4th tab "By Ingredient" visible alongside Standard/Sub/Addon | Browser | NO |
| 2 | Ingredient dropdown populated with all ingredients | Browser | NO |
| 3 | Select ingredient → table shows matching recipes with qty column | Browser | NO |
| 4 | **Qty Used column shows the selected ingredient's quantity per recipe (bold orange)** | Browser | NO |
| 5 | **TOTAL row sums all quantities** | Browser | NO |
| 6 | Type badge (Standard/Sub/Addon) per row | Browser | NO |
| 7 | Click row → opens recipe edit form | Browser | NO |
| 8 | No ingredient selected → placeholder "Select an ingredient..." | Browser | NO |
| 9 | No matches → "No recipes use this ingredient" | Browser | NO |
| 10 | Card/Bulk toggle + Create Recipe button hidden on By Ingredient tab | Browser | NO |
| 11 | Regression: 3 original tabs still work (Standard/Sub/Addon) | Browser | NO |

## Registry Checklist
- [ ] registry.json CR-088 → IMPLEMENTED, pos_5_0
- [ ] FILE_OWNERSHIP.md: RecipeManagementPanel.jsx
- [ ] `// CR-088` markers in every edit
- [ ] webpack clean
