# BUG-219 — Min Unit Alert Retype (Unit Dropdown + Transform Fix) — IMPLEMENTATION PLAN (Gate 3)

**Date:** 2026-07-23 (Session D)
**Impact Analysis:** `/app/memory/impact/BUG-219_IMPACT_ANALYSIS.md` (OWNER APPROVED — risk HIGH: live data-corruption fix)
**Risk:** HIGH | **Entry verification:** PASS 2026-07-23 — transform lines 26-27/71-72/134-135/147-148 and panel lines 250, 270-271, 282-285, 322-323, 334-337, 368-370 match

## DEPENDENCY — READ FIRST
**Implement AFTER or WITH BUG-226** (approved; touches `inventoryTransform.js` toAPI.addIngredient region — `converion_factor` ADD path). If BUG-226 lands first, re-verify toAPI line numbers. Do NOT resolve BUG-226's edits here (R14 scope lock).

## Scope Lock
- WILL change: `frontend/src/api/transforms/inventoryTransform.js`, `frontend/src/components/inventory/InventorySetupPanel.jsx`
- WILL NOT touch: `minQtyAlert` typing (stays numeric), `minimun_stock_alert` R9 typo, `converion_factor` R9 typo, addCategory (BUG-220), deleteIngredient (BUG-218), endpoints/keys

## Edits (exact)

### A — inventoryTransform.js (5 edits)
**Edit 1 (fromAPI.ingredients, line 27):**
```js
      minUnitAlert: Number(item.min_unit_alert) || 0,
```
→
```js
      minUnitAlert: item.min_unit_alert || '', // BUG-219: unit string ('gm'), not a number
```
**Edit 2 (second fromAPI block, line 72):** identical change (verify surrounding context first — same current text).

**Edit 3 (toAPI.addIngredient, line 135):**
```js
      min_unit_alert: String(data.minUnitAlert || 0),     // BUG-197 B2-5: backend requires string
```
→
```js
      min_unit_alert: data.minUnitAlert || '',     // BUG-219: unit string; BUG-197 B2-5 string req still met
```
**Edit 4 (toAPI.updateIngredient, line 148):**
```js
      min_unit_alert: String(data.minUnitAlert || 0),
```
→
```js
      min_unit_alert: data.minUnitAlert || '', // BUG-219: unit string
```
**Edit 5 (toAPI.updateStock, line 183):** `min_unit_alert: data.minUnitAlert || 0,` → `min_unit_alert: data.minUnitAlert || '', // BUG-219`
Note: `updateStock` has NO active callers (dead path, grep-verified 2026-07-23) — retyped for contract consistency only.

### B — InventorySetupPanel.jsx (6 edits)
**Edit 6 (add form, lines 282-286):** replace min alert cell contents:
```jsx
                        <Input type="number" value={newIng.minQtyAlert} onChange={e => setNewIng(p => ({ ...p, minQtyAlert: e.target.value }))}
                          placeholder="Min qty" className="h-8 text-xs w-16" data-testid="new-ingredient-min-qty" />
                        <Input type="number" value={newIng.minUnitAlert} onChange={e => setNewIng(p => ({ ...p, minUnitAlert: e.target.value }))}
                          placeholder="Min unit" className="h-8 text-xs w-16" data-testid="new-ingredient-min-unit" />
```
→
```jsx
                        <Input type="number" value={newIng.minQtyAlert} onChange={e => setNewIng(p => ({ ...p, minQtyAlert: e.target.value }))}
                          placeholder="Alert qty" className="h-8 text-xs w-16" data-testid="new-ingredient-min-qty" />
                        {/* BUG-219: alert unit is a UNIT (dropdown), not a number */}
                        <select className="h-8 text-xs border border-slate-200 rounded-md px-1 w-16 outline-none"
                          value={newIng.minUnitAlert} onChange={e => setNewIng(p => ({ ...p, minUnitAlert: e.target.value }))} data-testid="new-ingredient-min-unit">
                          <option value="">Unit...</option>
                          {units.map((u, i) => <option key={i} value={typeof u === 'string' ? u : u.name}>{typeof u === 'string' ? u : u.name}</option>)}
                        </select>
```
**Edit 7 (edit form, lines 334-337):** identical replacement with `editIng`/`setEditIng` + `data-testid="edit-ingredient-min-*"`.

**Edit 8 (add form conversion, line 271):** placeholder `"Factor..."` → dynamic:
```jsx
placeholder={`1 ${newIng.unit || 'unit'} = ? ${newIng.smallUnit || 'small'}`}
```
**Edit 9 (edit form conversion, line 323):** placeholder `"Factor"` → same pattern with `editIng`.

**Edit 10 (table header, line 250):** `Min Alert` → `Min Alert (Qty · Unit)`.

**Edit 11 (display row, lines 368-370):**
```jsx
                        {ing.minQtyAlert > 0 ? `${ing.minQtyAlert} ${ing.unit}` : '—'}
```
→
```jsx
                        {ing.minQtyAlert > 0 ? `${ing.minQtyAlert} ${ing.minUnitAlert || ing.unit}` : '—'} {/* BUG-219: show alert unit */}
```

Total: 2 files, 11 edits, ~25 lines. Default for blank alert unit: empty option (owner may auto-default to smallUnit later — deferred, noted).

## Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|---|---|---|---|---|
| 1-2 | inventoryTransform.js:27,72 | fromAPI keeps unit string | Unit test or `node` eval: `fromAPI.ingredients` with `min_unit_alert:'gm'` → `'gm'` not 0 | YES |
| 3-5 | inventoryTransform.js:135,148,183 | toAPI passes unit string | Unit test: `toAPI.updateIngredient({minUnitAlert:'gm'})` → `'gm'` | YES |
| 6-7 | InventorySetupPanel.jsx | min unit → select | Browser: add + edit forms show unit dropdown; edit pre-selects stored unit ('gm'), NOT 0 | NO |
| **CRITICAL** | e2e | No corruption on edit-save | Edit an ingredient WITHOUT touching alert fields → save → curl `get-inventory-master` → row's `min_unit_alert` unchanged ('gm', not '0') | NO |
| 8-10 | InventorySetupPanel.jsx | labels/placeholders | Browser visual | NO |
| 11 | InventorySetupPanel.jsx:369 | display uses alert unit | Row with min_qty 5/gm + base kg shows "5 gm" | NO |
| R1 | — | Regression BUG-224 seed | Smart Purchase threshold math unaffected (uses minQtyAlert numeric — unchanged) | NO |
| R2 | — | Regression add flow | Add ingredient with alert qty 5 + unit gm → curl row: `min_qty_alert 5`, `min_unit_alert 'gm'` | NO |

## Risk Register
- **HIGH:** touches write path of customer inventory config. Mitigation: CRITICAL e2e test above is mandatory before QA handover; test on a ZZ_TEST ingredient then delete it.
- `startEdit` (:120) `minUnitAlert: ing.minUnitAlert || ''` — already string-compatible, no edit needed.
- BUG-224 reads `minQtyAlert` (numeric, untouched) + `conversionFactor` — verify no import of minUnitAlert in purchasePlanner before QA sign-off.
- Conflicts: BUG-226 (same transform — sequence), BUG-218/220 (same panel, different functions — parallel-safe).

## Post-Code Registry Checklist
- [ ] registry.json: BUG-219 → IMPLEMENTED, sprint_key pos_5_0
- [ ] BUG_TRACKER.md row updated
- [ ] FILE_OWNERSHIP.md: both files + BUG-219 + date
- [ ] Code markers `// BUG-219` in both files
- [ ] Compile: webpack 0 new warnings

*Gate 3 complete. Awaiting Gate 4 GO.*
