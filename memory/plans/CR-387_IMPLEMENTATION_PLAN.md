# CR-387 — Implementation Plan (Gate 3 · FINAL — OD-UNIFY-01/02 applied 2026-09-25)
**Smart Purchase (Stock Update): unit-consistent breakdown on all qty columns · two-box Qty to Buy · `add-purchase` in display units · rate per display unit**

**Date:** 2026-09-25 · **Based on:** `impact/CR-387_IMPACT_ANALYSIS.md` (Gate 2 CLOSED, all ODs locked)
**Owner trigger (verbatim):** "choose planning role to complete implementation planning for above bug and CR do not jump gate"
**Code reality re-verified:** NONE — 0 hits for `quantityBreakdown|has_conversion|qty_major|CR-387` in `src/`. Line numbers re-checked at HEAD 2026-09-25 (`purchasePlanner.js` 191 · `AutoShoppingList.jsx` 331 · `SmartPurchasePanel.jsx` 326 · `GroupedVendorPreview.jsx` 208) — identical to IA.
**Risk:** HIGH (financial-adjacent: per-unit `rate` basis; `Amount` total unchanged) · **R11:** PASS (probe B1–B5) · **Hotspots:** none
**Dependencies / sequencing (OD-UNIFY-02 AMENDS OD-387-08):** requires `utils/quantityBreakdown.js` from **BUG-459 (Gate 5a)** — impl order **BUG-459 → CR-387 preserved**. BUG-455 Gate 5b is **no longer a precondition**: its QA is folded into the **combined QA wave** with BUG-459 + CR-387 (owner freeze). Under **OD-UNIFY-01** the two on-hand BUG-455 spans (`AutoShoppingList.jsx` L194/L307) are now **suppressed on this screen** (moved into scope — see E-A10/E-A11). The BUG-455 data field in `purchasePlanner.js` (L134/L160) stays untouched.

**OD-387-06 probe status: EXECUTED 2026-09-25 — RESOLVED.** Read-only GET `vendor-item-list` (42 rows): `unit_price = Amount ÷ base quantity` in every row (1 pkt@800 ₹1 → 0.00125 · 100 gm ₹100 → 1 · 1 pkt@500 ₹100 → 0.2 = 250 gm ₹50 → 0.2). **Basis = per BASE unit → E-A7 default (`unit_price × baseQty`) is correct; no switch.** Evidence `evidence/CR-387/probes_2026_09_25/od387_06_vendor_item_list.json`.

---

## Owner decisions applied (all LOCKED 2026-09-25)
| OD | Applied as |
|---|---|
| 387-01 (b) | `Unit: display_unit`, `quantity` = display qty (4 dp) for `has_conversion` rows; `Unit: r.unit` + base qty otherwise (E-C3/E-C4). |
| 387-02 YES | `rate = Number(r.rate) / displayQty` (E-C5); `amount` = total unchanged. |
| 387-03 (a) | Table 2 read-only breakdown text (E-A8/E-A9); two-box input only in Purchase List (E-A6). |
| 387-04 YES | GroupedVendorPreview lines use breakdown text (E-G1). |
| 387-05 YES | rounding via util `minorDp` (0 dp gm/ml/piece; 2 dp else). |
| 387-06 (a) | probe DONE → `unit_price` per BASE unit → E-A7 uses `baseQty` (confirmed). |
| 387-07 (a) | ad-hoc rows seed `qty_major:''`, `qty_minor:''` (E-A2). |
| 387-08 (a) | ~~after BUG-455 5b + BUG-459 5a~~ → **AMENDED by OD-UNIFY-02**: after BUG-459 5a (shared util); BUG-455 QA in combined wave. |
| UNIFY-01 | **Suppress** the BUG-455 on-hand parenthetical on Smart Purchase (Table 1 L194 + Table 2 L307). New edit sites **E-A10/E-A11**. BUG-455 KEPT on Current Stock + Sub-Recipe Stock. |
| UNIFY-02 | BUG-455 + BUG-459 + CR-387 QA'd together in one wave; impl order BUG-459 → CR-387 preserved. |

---

## Scope Lock
**Files WILL change (6):**
1. `src/utils/quantityBreakdown.js` — **+1 exported helper** `rowQuantity(row)` (additive to BUG-459 file; see Deviation note)
2. `src/utils/purchasePlanner.js` — +4 fields at 2 sites, math untouched
3. `src/components/inventory/smart/AutoShoppingList.jsx` — **11 sites** (9 + **E-A10/E-A11: suppress the BUG-455 on-hand parenthetical, OD-UNIFY-01**)
4. `src/components/inventory/SmartPurchasePanel.jsx` — 5 sites
5. `src/components/inventory/smart/GroupedVendorPreview.jsx` — 1 site
6. `src/__tests__/utils/purchasePlanner.cr387.test.js` — **NEW**

**Files will NOT touch:** `toAPI.addPurchase()` · `inventoryService.js` · `vendorRanking.js` · `PurchaseEntryPanel.jsx` · `HorizonPicker.jsx` · `VendorSuggestionCell.jsx` · planner math L120–126 · **`purchasePlanner.js` L134/L160 BUG-455 data field (stays)** · **`CurrentStockPanel.jsx` / `SubRecipeStockPanel.jsx` (BUG-455 parenthetical STAYS — OD-UNIFY-01 boundary)** · backend.
**Scope change vs earlier draft:** `AutoShoppingList.jsx` L194/L307 BUG-455 on-hand spans move OUT of "will NOT touch" INTO "WILL change" (suppress via screen-level flag, not delete).

**Deviation from IA (declared):** IA placed `qtyDisplay`/`qtyBase` helpers inside two components; this plan centralises them as one `rowQuantity(row)` in the shared util so `AutoShoppingList`, `SmartPurchasePanel` and `GroupedVendorPreview` compute the identical number (DRY, no behaviour change). Additive, unit-tested.

Estimated: ~19 edit sites, ~110 lines net.

---

## Step 0 — Entry verification for the Implementation agent
```
test -f src/utils/quantityBreakdown.js && grep -c "export function fromBreakdown" src/utils/quantityBreakdown.js   → 1 (BUG-459 landed)
grep -n "display_qty_text: item.displayQtyText || '', // BUG-455" src/utils/purchasePlanner.js                   → L134 and L160
grep -n "qty: r.suggest_qty," src/components/inventory/SmartPurchasePanel.jsx                                       → L64
grep -n "unit: r.unit," src/components/inventory/SmartPurchasePanel.jsx                                             → L216
grep -n "row-qty-\${r.ingredient_id}" src/components/inventory/smart/AutoShoppingList.jsx                          → L202
grep -n "{r.qty || r.suggest_qty} {r.unit}" src/components/inventory/smart/GroupedVendorPreview.jsx                → L77 and L78
python3 - <<'EOF'
import json; d=json.load(open('/app/memory/control/registry.json')); it={i['id']:i for i in d['items']}
assert it['BUG-455']['status'].startswith(('GATE_5A','GATE_5B','GATE_6','CLOSED')), 'BUG-455 must be implemented (GATE_5A+); QA combined per OD-UNIFY-02'
assert it['BUG-459']['status'].startswith(('GATE_5','GATE_6','CLOSED')), 'BUG-459 not implemented'
assert it['CR-387']['status']=='GATE_3_PLAN_COMPLETE'; print('entry OK')
EOF
```

---

## Edits

### E-U — `src/utils/quantityBreakdown.js` (append)
```js
// CR-387 · Smart Purchase row → purchase quantity in both domains (row fields from purchasePlanner E-P1)
// row: { qty_major, qty_minor, has_conversion, conversion_factor, unit (base), display_unit, small_unit }
export function rowQuantity(row) {
  if (!row) return { displayQty: 0, baseQty: 0, unit: '', text: '' };
  if (row.has_conversion) {
    const { displayQty, baseQty } = fromBreakdown(row.qty_major, row.qty_minor, row.conversion_factor);
    return { displayQty, baseQty, unit: row.display_unit, text: toBreakdown(baseQty, row.conversion_factor, row.display_unit, row.small_unit).text };
  }
  const q = Number(row.qty_major) || 0;
  return { displayQty: q, baseQty: q, unit: row.unit, text: `${q} ${row.unit || ''}`.trim() };
}
```
Add tests to `quantityBreakdown.bug459.test.js` **or** the new cr387 test: `rowQuantity({has_conversion:true, qty_major:'2', qty_minor:'0', conversion_factor:650, display_unit:'bottle', small_unit:'ml', unit:'ml'})` → `{displayQty:2, baseQty:1300, unit:'bottle', text:'2 bottle'}`; no-conversion `{qty_major:'5', unit:'kg'}` → `{displayQty:5, baseQty:5, unit:'kg', text:'5 kg'}`; empty → 0.

### E-P — `src/utils/purchasePlanner.js`
**E-P1 — velocity rows, insert after L134 (`display_qty_text: … // BUG-455`)**
```js
        // CR-387: conversion metadata so the UI can render/enter quantities in display units (math above stays in base)
        small_unit:        unit,
        conversion_factor: Number(item.conversionFactor) || 0,
        has_conversion:    !!item.hasUnitConversion && (Number(item.conversionFactor) || 0) > 0 && String(item.displayUnit || '').toLowerCase() !== String(unit).toLowerCase(),
        display_qty_parts: item.displayQtyParts || null,
```
**E-P2 — alert rows, insert after L160** — same 4 lines with `unit` → `(item.smallUnit || item.unit || '')` inline.
(in_stock rows spread `rows` → inherit E-P1. No other planner change.)

### E-T — `src/__tests__/utils/purchasePlanner.cr387.test.js` (NEW)
| # | Case | Expect |
|---|---|---|
| P1 | converted item (`hasUnitConversion:true, conversionFactor:650, displayUnit:'bottle', smallUnit:'ml', calQuantity:5520`) + DCR row | row has `has_conversion:true, conversion_factor:650, small_unit:'ml'`, and `gap`/`suggest_qty` **equal** to values computed before the change (snapshot the numbers from a pre-change run) |
| P2 | no-conversion item (`hasUnitConversion:false, conversionFactor:''`) | `has_conversion:false, conversion_factor:0` |
| P3 | alert row (threshold path) | carries the 4 fields |
| P4 | `displayUnit === smallUnit` with factor 1 | `has_conversion:false` |
Run: `npx craco test --watchAll=false --testPathPattern="purchasePlanner|quantityBreakdown"`

### E-A — `src/components/inventory/smart/AutoShoppingList.jsx`
**E-A1 — import after L7**
```js
import { toBreakdown, normalizeBreakdown, rowQuantity } from '@/utils/quantityBreakdown'; // CR-387
```
**E-A2 — ad-hoc row L25–31**
```
// BEFORE (L27–30):
      unit: ingredient.smallUnit || ingredient.unit || '',
      display_unit: ingredient.displayUnit || ingredient.unit || '',
      on_hand: 0, velocity_per_day: 0, projected_need: 0, gap: 0, suggest_qty: 0,
      qty: '', rate: recentRow?.unit_price ? String((recentRow.unit_price * (ingredient.suggest_qty || 1)).toFixed(0)) : '', origin: 'ad_hoc', // CR-348: pre-fill total
// AFTER:
      unit: ingredient.smallUnit || ingredient.unit || '',
      display_unit: ingredient.displayUnit || ingredient.unit || '',
      small_unit: ingredient.smallUnit || ingredient.unit || '',                                                   // CR-387
      conversion_factor: Number(ingredient.conversionFactor) || 0,                                                 // CR-387
      has_conversion: !!ingredient.hasUnitConversion && (Number(ingredient.conversionFactor) || 0) > 0
        && String(ingredient.displayUnit || '').toLowerCase() !== String(ingredient.smallUnit || ingredient.unit || '').toLowerCase(), // CR-387
      display_qty_parts: ingredient.displayQtyParts || null,                                                       // CR-387
      on_hand: 0, velocity_per_day: 0, projected_need: 0, gap: 0, suggest_qty: 0,
      qty_major: '', qty_minor: '',                                                                                 // CR-387 OD-387-07: seed empty
      rate: recentRow?.unit_price ? String((recentRow.unit_price * (ingredient.suggest_qty || 1)).toFixed(0)) : '', origin: 'ad_hoc', // CR-348: pre-fill total
```
**E-A3 — after `fmtQty` (after L102)**
```js
  // CR-387: base qty → "2 bottle 150 ml" for converted rows, fmtQty otherwise (sign preserved for Gap)
  const fmtBreak = (baseQty, r) => r.has_conversion
    ? toBreakdown(baseQty, r.conversion_factor, r.display_unit, r.small_unit).text
    : fmtQty(baseQty, r.unit);
```
**E-A4 — L197** `{r.projected_need} {r.unit}` → `{fmtBreak(r.projected_need, r)}` `{/* CR-387 */}`
**E-A5 — L198** `{r.gap}` → `{fmtBreak(r.gap, r)}`
**E-A6 — L199–204 Qty to Buy cell → two-box**
```jsx
                      <td className="py-2 px-3">
                        {/* CR-387: two-box purchase qty [major] display_unit [minor] small_unit; single box when no conversion */}
                        <div className="flex items-center gap-1">
                          <Input type="number" step={r.has_conversion ? '1' : '0.001'} min="0" value={r.qty_major ?? ''}
                            onChange={e => onRowChange(ix, { qty_major: e.target.value })}
                            className="h-8 text-sm w-16" data-testid={`row-qty-${r.ingredient_id}`} />
                          <span className="text-[10px] text-slate-500">{r.has_conversion ? r.display_unit : r.unit}</span>
                          {r.has_conversion && (
                            <>
                              <Input type="number" step="1" min="0" value={r.qty_minor ?? ''}
                                onChange={e => onRowChange(ix, { qty_minor: e.target.value })}
                                onBlur={() => {
                                  if (r.qty_minor === '' || r.qty_minor === undefined) return;
                                  const n = normalizeBreakdown(r.qty_major, r.qty_minor, r.conversion_factor); // mirrors OD-459-03 (a)
                                  if (String(n.major) !== String(r.qty_major ?? '') || String(n.minor) !== String(r.qty_minor ?? ''))
                                    onRowChange(ix, { qty_major: String(n.major), qty_minor: String(n.minor) });
                                }}
                                className="h-8 text-sm w-16" data-testid={`row-qty-minor-${r.ingredient_id}`} />
                              <span className="text-[10px] text-slate-500">{r.small_unit}</span>
                            </>
                          )}
                        </div>
                        {r.suggest_qty > 0 && <div className="text-[10px] text-orange-500 font-medium mt-0.5">suggest: {fmtBreak(r.suggest_qty, r)}</div>}
                      </td>
```
**E-A7 — rate placeholder/hint L208 + L210 (OD-387-06 default = base basis, i.e. today's semantics)**
```
// BEFORE (both lines): (Number(r.qty || r.suggest_qty) || 1)
// AFTER  (both lines): (rowQuantity(r).baseQty || r.suggest_qty || 1)   // CR-387 · OD-387-06: unit_price history is per BASE unit (default). If probe shows per DISPLAY unit → use rowQuantity(r).displayQty here and in AdHocTypeahead L30.
```
**E-A8 — L311** `${r.projected_need} ${r.unit}` → `fmtBreak(r.projected_need, r)` (OD-387-03 read-only)
**E-A9 — L312** `r.suggest_qty` → `fmtBreak(r.suggest_qty, r)`
Table 1 `minWidth: 1140` → `1220` (L164) for the extra box.
**E-A10/E-A11 — suppress BUG-455 on-hand parenthetical (OD-UNIFY-01) — re-grep first: `grep -n "({r.display_qty_text})" src/components/inventory/smart/AutoShoppingList.jsx` (currently Table 1 L194, Table 2 L307).**
Add a screen-level flag near the top (E-A1 import region):
```js
const SHOW_BUG455_PARENTHETICAL = false; // CR-387 (OD-UNIFY-01): breakdown now expressed via CR-387 units on this screen; BUG-455 stays live on CurrentStock/SubRecipeStock
```
Gate BOTH spans (suppress, do NOT delete):
```jsx
// BEFORE (L194 Table 1 · and identically L307 Table 2):
                        {r.display_qty_text && <span className="text-xs text-slate-300 ml-1">({r.display_qty_text})</span>} {/* BUG-455 */}
// AFTER:
                        {SHOW_BUG455_PARENTHETICAL && r.display_qty_text && <span className="text-xs text-slate-300 ml-1">({r.display_qty_text})</span>} {/* BUG-455 · suppressed here by CR-387 (OD-UNIFY-01) */}
```

### E-C — `src/components/inventory/SmartPurchasePanel.jsx`
**E-C0 — import after L9**
```js
import { toBreakdown, rowQuantity } from '@/utils/quantityBreakdown'; // CR-387
```
**E-C1 — L64 seed**
```
// BEFORE: qty: r.suggest_qty,
// AFTER:
          ...(r.has_conversion                                                             // CR-387: seed two-box from suggest (base)
            ? (() => { const b = toBreakdown(r.suggest_qty, r.conversion_factor, r.display_unit, r.small_unit); return { qty_major: String(b.major), qty_minor: String(b.minor) }; })()
            : { qty_major: String(r.suggest_qty), qty_minor: '' }),
```
**E-C2 — L161 validate**
```
// BEFORE: const badQty = activeRows.find(r => !(Number(r.qty ?? r.suggest_qty) > 0));
// AFTER:  const badQty = activeRows.find(r => !(rowQuantity(r).displayQty > 0)); // CR-387
```
**E-C3/E-C4/E-C5 — L214–219 items map**
```
// BEFORE:
          items: group.map(r => ({
            ingredientId: r.ingredient_id,
            unit: r.unit,
            quantity: Number(r.qty ?? r.suggest_qty),
            rate: Number(r.rate) / (Number(r.qty ?? r.suggest_qty) || 1), // CR-348: derive per-unit rate from total
            amount: Number(r.rate),                                         // CR-348: r.rate IS the total
// AFTER:
          items: group.map(r => { const q = rowQuantity(r); return {          // CR-387
            ingredientId: r.ingredient_id,
            unit: q.unit,                                                    // CR-387 OD-387-01 (b): display unit when converted, base unit otherwise
            quantity: q.displayQty,                                          // CR-387: qty in that unit (4 dp)
            rate: Number(r.rate) / (q.displayQty || 1),                      // CR-348 + CR-387 OD-387-02: ₹ per display unit
            amount: Number(r.rate),                                         // CR-348: r.rate IS the total (unchanged)
```
and close with `}; })` instead of `}))` at L224. `conversionFactor: 1` (L220) **left as is** (E-C6: dead since BUG-244).

### E-G — `src/components/inventory/smart/GroupedVendorPreview.jsx`
**E-G0 — import after L3:** `import { rowQuantity } from '@/utils/quantityBreakdown'; // CR-387`
**E-G1 — L77–78**
```
// BEFORE:
                  <span>{r.name} · {r.qty || r.suggest_qty} {r.unit}</span>
                  <span>₹{Number(r.rate || 0).toFixed(2)} for {r.qty || r.suggest_qty} {r.unit}</span>{/* CR-348: total-price display */}
// AFTER:
                  <span>{r.name} · {rowQuantity(r).text}</span>{/* CR-387 OD-387-04 */}
                  <span>₹{Number(r.rate || 0).toFixed(2)} for {rowQuantity(r).text}</span>{/* CR-348: total-price display */}
```

---

## Execution sequence
1. E-U util helper + tests → jest green.
2. E-P1/E-P2 planner + E-T test (P1 snapshot must match pre-change numbers) → jest green.
3. E-C0/E-C1 seed + E-A1/E-A2/E-A3 → compile → E-A4–E-A9 + E-A10/E-A11 (BUG-455 suppression) → compile.
4. E-C2–E-C5 submit + E-G0/E-G1 → compile → `yarn build`.
5. Self-verify V1–V8; V9/V10/V11 live (credentials) — else flag BLOCKED for QA.
6. EXIT GATE 5/5 → QA handover.

---

## Verification Matrix
| # | File | Check | How | Auto |
|---|---|---|---|:---:|
| V1 | purchasePlanner.js | P1–P4; `gap`/`suggest_qty` unchanged vs pre-change | jest | YES |
| V2 | quantityBreakdown.js | `rowQuantity` 3 cases | jest | YES |
| V3 | AutoShoppingList (table 1) | UAT BAR BEER (bottle/ml @650): Projected Need "10 bottle 320 ml"-style text, Gap "-2 bottle", suggest hint "2 bottle" | browser | NO |
| V4 | AutoShoppingList | Purchase List row seeded `[2] bottle [0] ml`; type `700` in ml → blur → `[3] bottle [50] ml` | browser | NO |
| V5 | AutoShoppingList | no-conversion row → single box labelled `unit`; ad-hoc row → empty two-box (OD-387-07) | browser | NO |
| V6 | AutoShoppingList (table 2) | Projected Need / Suggested Qty read-only breakdown text; no inputs | browser | NO |
| V7 | Network / RTL | submit → `purchase_items[0] = { Ingredient, Unit:"bottle", quantity:2, rate:<total/2>, Amount:<total> }`; no-conversion row → `Unit:<base>`, quantity base | DevTools / mock `inventoryService.addPurchase` | YES |
| V8 | Validation | empty two-box → "Quantity must be > 0 for …"; split-sum check unchanged | browser | NO |
| V9 | Live | `stock-inventory` `cal_quantity` +1300 ml after 2-bottle purchase; `display_unit` still bottle | curl read-back | NO |
| V10 | Reports | Purchase report row Unit "bottle", qty 2, rate = total/2 | browser | NO |
| V11 | OD-387-06 | DONE at Gate 3: evidence json shows per-base-unit `unit_price`; E-A7 uses `baseQty` | code review | YES |
| V12 | AutoShoppingList (OD-UNIFY-01) | On-Hand cell shows **NO** BUG-455 parenthetical (both tables); breakdown renders **exactly once per cell** across On-Hand / Projected Need / Gap / Suggested Qty | browser | NO |
| V12b | Regression (boundary) | BUG-455 parenthetical **STILL present** on **Current Stock** + **Sub-Recipe Stock**; BUG-458 vendor names; CR-114 add/remove; CR-115 filters; CR-100 split validation; GroupedVendorPreview subtotal | browser | NO |
| V13 | Compile | `yarn build` exit 0, no new warnings | CLI | YES |

---

## Risk register (plan-level)
| # | Risk | Mitigation |
|---|---|---|
| R1 | financial-adjacent contract change | probe B1–B5 PASS; `Amount` untouched (E-C5 keeps `amount: Number(r.rate)`); Gate 6 owner smoke with one real purchase (V9/V10) |
| R2 | `rate` semantics per-ml → per-bottle mid-history | OD-387-02 explicit; report shows Unit column |
| R3 | `unit_price` hint basis unknown | OD-387-06 probe pending; default keeps today's maths; one-token switch documented at E-A7 |
| R4 | rows without conversion must stay single-box + base unit | `has_conversion` flag from planner (P2/P4) + `rowQuantity` branch (V2, V5, V7) |
| R5 | ad-hoc rows lack stock row | E-A2 uses ingredients-master fields (`conversionFactor`, `displayUnit`, `smallUnit`, `displayQtyParts` via BUG-459 E3-1) |
| R6 | BUG-455 line drift / accidental global removal | OD-UNIFY-01: suppress via screen-level flag (E-A10/E-A11), never delete; Step 0 grep of `({r.display_qty_text})`; V12b confirms the other two screens keep BUG-455 |
| R7 | float | `fromBreakdown` 4 dp |
| R8 | any consumer still reading `r.qty` | grep `\.qty\b` in `components/inventory/smart/*` + `SmartPurchasePanel.jsx` after edits → must be 0 hits |

---

## Post-Code Registry Checklist (Implementation agent executes)
```
- [ ] registry.json: CR-387 → GATE_5A_IMPLEMENTED, sprint_key sep_bug_closure, status_history with "Gate 4 GO" verbatim
- [ ] CR_REGISTRY.md: row + top line updated
- [ ] FILE_OWNERSHIP.md: quantityBreakdown.js (+rowQuantity) · purchasePlanner.js · AutoShoppingList.jsx · SmartPurchasePanel.jsx · GroupedVendorPreview.jsx · __tests__/utils/purchasePlanner.cr387.test.js (NEW)
- [ ] Code markers: // CR-387 in all 6 files (incl. `// CR-387 (OD-UNIFY-01)` at E-A10/E-A11)
- [x] OD-387-06: probe executed 2026-09-25 (Gate 3) — base-unit basis; E-A7 uses baseQty
- [ ] QA handover: handover/QA_HANDOVER_<date>_CR387.md (V1–V13 incl. V12/V12b) — flagged for the COMBINED wave with BUG-455 + BUG-459 (OD-UNIFY-02)
```

---

## Handover
```
Plan ready at plans/CR-387_IMPLEMENTATION_PLAN.md. 21 edits across 6 files (1 new test; +1 helper in BUG-459 util) — incl. E-A10/E-A11 BUG-455 on-hand suppression (OD-UNIFY-01).
Code reality: NONE. Scope: purchasePlanner.js (+4 fields ×2) · AutoShoppingList.jsx (11) · SmartPurchasePanel.jsx (5) · GroupedVendorPreview.jsx (1) · quantityBreakdown.js (+rowQuantity) / NOT: toAPI.addPurchase, inventoryService, vendorRanking, PurchaseEntryPanel, planner math, purchasePlanner.js BUG-455 field, CurrentStock/SubRecipeStock, backend.
Verification matrix: 14 checks (4 automated, 10 manual; V9–V11 need preprod credentials).
Owner decisions needed: none (8/8 locked + OD-UNIFY-01/02 applied). OD-387-06 probe DONE — base-unit basis confirmed.
Preconditions for Gate 4: BUG-459 Gate 5a implemented (shared util); BUG-455 QA folded into combined wave (OD-UNIFY-02).
Awaiting Gate 4 GO.
```
