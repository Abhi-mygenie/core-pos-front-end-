# BUG-459 — Implementation Plan (Gate 3 · FINAL — OD-UNIFY-01/02 applied 2026-09-25)
**Stock Audit physical count: two-box display-unit converter · payload in display unit · drift as breakdown**

**Date:** 2026-09-25 · **Based on:** `impact/BUG-459_IMPACT_ANALYSIS.md` (Gate 2 CLOSED, all ODs locked)
**Owner trigger (verbatim):** "choose planning role to complete implementation planning for above bug and CR do not jump gate"
**Code reality re-verified:** NONE — `grep -rn "display_qty_parts\|displayQtyParts\|quantityBreakdown\|BUG-459" src/` = 0 hits. Line numbers re-checked at HEAD 2026-09-25 (`StockAuditPanel.jsx` 233 lines, `inventoryTransform.js` 277 lines) — identical to IA.
**Risk:** CRITICAL (data corruption) · **R11:** PASS (probe A1–A9, C1–C2) · **Hotspots:** none
**Conflict / sequencing (OD-UNIFY-02 AMENDS OD-459-07):** `BUG-455` is `GATE_5A_IMPLEMENTED` on the same two files. Its Gate 5b QA is **no longer a precondition** — per the owner freeze it is folded into a **combined QA wave** run together with BUG-459 (+CR-387) after all three are implemented. Implementation order stays **BUG-459 → CR-387** (CR-387 needs the shared util). Implementation agent must still re-run Step 0 entry verification below.

---

## Owner decisions applied (all LOCKED 2026-09-25)
| OD | Applied as |
|---|---|
| 459-01 | No data action. #20329 self-heals on first post-fix audit → Gate 6 smoke item (V7). |
| 459-02 | No conversion / sub-recipe → single box, label + `unit` = `item.unit` (`displayUnit || unit` for regular rows without conversion — identical value in practice). |
| 459-03 | Minor ≥ factor → `normalizeBreakdown` on blur (E3h). |
| 459-04 | Drift = sign + breakdown text; `diffBase === 0` → "Match"; minor 0 dp for gm/ml/piece (util rule). |
| 459-05 | Toast per item from `res.data.wastage` (E3j), null-guarded. |
| 459-06 | `audit-input-${id}` stays on major box; `audit-input-minor-${id}` added. |
| 459-07 | ~~Execute after BUG-455 Gate 5b~~ → **AMENDED by OD-UNIFY-02**: combined QA wave (see sequencing above). |
| UNIFY-01 | **Suppress** the BUG-455 parenthetical on Stock Audit (this screen). The two-box converter + drift badge are the single breakdown source. BUG-455 KEPT on Current Stock + Sub-Recipe Stock. New edit site **E4m**. |
| UNIFY-02 | BUG-455 + BUG-459 (+CR-387) QA'd together in one wave; impl order BUG-459 → CR-387 preserved. |

---

## Scope Lock
**Files WILL change (4):**
1. `src/utils/quantityBreakdown.js` — **NEW** (shared with CR-387)
2. `src/__tests__/utils/quantityBreakdown.bug459.test.js` — **NEW**
3. `src/api/transforms/inventoryTransform.js` — 2 additive lines (insert **after** the BUG-455 lines, never modify them)
4. `src/components/inventory/StockAuditPanel.jsx` — 12 edit sites (E4a–E4l + **E4m: BUG-455 parenthetical suppression, OD-UNIFY-01**). Rationale: the two-box converter is now the single breakdown source on this screen, so the BUG-455 `({displayQtyText})` span on the System-Qty cell is suppressed here via a screen-level flag (not deleted).

**Files will NOT touch:** `toAPI.addStock` / `toAPI.addSubRecipeStock` · `inventoryService.js` · **`SubRecipeStockPanel.jsx` · `CurrentStockPanel.jsx` (BUG-455 parenthetical STAYS — OD-UNIFY-01 boundary)** · `pages/StockAuditPage.jsx` · `purchasePlanner.js` / `AutoShoppingList.jsx` / `SmartPurchasePanel.jsx` (CR-387) · backend.

Estimated: ~85 lines net (util ~45, test ~50, transform +2, panel ~+40/−15).

---

## Step 0 — Entry verification for the Implementation agent (run before any edit)
```
grep -n "displayQtyText: item.display_qty_text" src/api/transforms/inventoryTransform.js      → expect L26 and L73
grep -n "physicalQty: Number(entry.qty)" src/components/inventory/StockAuditPanel.jsx        → expect L72 and L84
grep -n "placeholder={String(item.quantity)}" src/components/inventory/StockAuditPanel.jsx   → expect L184
grep -n "drift.diff.toFixed(2)" src/components/inventory/StockAuditPanel.jsx                 → expect L197 and L202
python3 - <<'EOF'
import json; d=json.load(open('/app/memory/control/registry.json')); it={i['id']:i for i in d['items']}
assert it['BUG-455']['status'].startswith(('GATE_5A','GATE_5B','GATE_6','CLOSED')), 'BUG-455 must be implemented (GATE_5A+); QA combined per OD-UNIFY-02'
assert it['BUG-459']['status']=='GATE_3_PLAN_COMPLETE'
print('entry OK')
EOF
```
Any mismatch → STOP, return to Planning ("plan stale").

---

## Edits

### E1 — `src/utils/quantityBreakdown.js` (NEW)
```js
// BUG-459 · shared quantity breakdown helpers (consumed by StockAuditPanel; CR-387 Smart Purchase)
// All maths in the item's BASE unit (small_unit). factor = base units per 1 display unit.
const ZERO_DP_UNITS = new Set(['gm', 'g', 'gms', 'ml', 'piece', 'pieces', 'pc', 'pcs', 'unit']);
const round = (v, dp) => { const m = 10 ** dp; return Math.round((Number(v) + Number.EPSILON) * m) / m; };

export const minorDp = (unit) => (ZERO_DP_UNITS.has(String(unit || '').toLowerCase()) ? 0 : 2); // OD-459-04 / OD-387-05

export function hasConversion(factor, majorUnit, minorUnit) {
  const f = Number(factor);
  return f > 0 && !!majorUnit && !!minorUnit && String(majorUnit).toLowerCase() !== String(minorUnit).toLowerCase();
}

// base → { sign, major, minor, majorUnit, minorUnit, text }
export function toBreakdown(baseValue, factor, majorUnit, minorUnit) {
  const v = Number(baseValue) || 0;
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (!hasConversion(factor, majorUnit, minorUnit)) {
    const major = round(abs, minorDp(majorUnit));
    return { sign, major, minor: null, majorUnit: majorUnit || '', minorUnit: null, text: `${sign}${major} ${majorUnit || ''}`.trim() };
  }
  const f = Number(factor);
  let major = Math.floor(abs / f + 1e-9);
  let minor = round(abs - major * f, minorDp(minorUnit));
  if (minor >= f) { major += 1; minor = 0; }
  const text = `${sign}${major} ${majorUnit}${minor > 0 ? ` ${minor} ${minorUnit}` : ''}`;
  return { sign, major, minor, majorUnit, minorUnit, text };
}

// (major, minor) → { displayQty (≤4 dp, what the API receives), baseQty }
export function fromBreakdown(major, minor, factor) {
  const M = Number(major) || 0, m = Number(minor) || 0, f = Number(factor) || 0;
  if (!(f > 0)) return { displayQty: round(M, 4), baseQty: M };
  const baseQty = M * f + m;
  return { displayQty: round(baseQty / f, 4), baseQty };
}

// OD-459-03 (a): carry minor ≥ factor into major
export function normalizeBreakdown(major, minor, factor) {
  const M = Number(major) || 0, m = Number(minor) || 0, f = Number(factor) || 0;
  if (!(f > 0) || m < f) return { major: M, minor: m };
  const carry = Math.floor(m / f);
  return { major: M + carry, minor: round(m - carry * f, 6) };
}
```

### E2 — `src/__tests__/utils/quantityBreakdown.bug459.test.js` (NEW) — cases (V1)
| # | Call | Expect |
|---|---|---|
| T1 | `toBreakdown(7800, 800, 'pkt', 'gm')` | `{ major: 9, minor: 600, text: '9 pkt 600 gm' }` |
| T2 | `toBreakdown(4700, 500, 'pkt', 'gm')` | `{ major: 9, minor: 200 }` |
| T3 | `toBreakdown(-100, 500, 'pkt', 'gm')` | `{ sign: '-', major: 0, minor: 100, text: '-0 pkt 100 gm' }` → render layer prefixes arrow, so assert `sign==='-'` and `text.endsWith('0 pkt 100 gm')` |
| T4 | `toBreakdown(0, 500, 'pkt', 'gm')` | `text === '0 pkt'` |
| T5 | `toBreakdown(2.5, '', 'kg', '')` (no factor) | `{ major: 2.5, minor: null, text: '2.5 kg' }` |
| T6 | `toBreakdown(1600, 1600, 'tin', 'gm')` | `{ major: 1, minor: 0, text: '1 tin' }` |
| T7 | `toBreakdown(5, 2.5, 'box', 'ltr')` (fractional factor) | `{ major: 2, minor: 0 }` |
| T8 | `fromBreakdown(9, 600, 800)` | `{ displayQty: 9.75, baseQty: 7800 }` |
| T9 | `fromBreakdown(9, '', 500)` | `{ displayQty: 9, baseQty: 4500 }` |
| T10 | `fromBreakdown('9.4', 0, 0)` (no factor) | `{ displayQty: 9.4, baseQty: 9.4 }` |
| T11 | `normalizeBreakdown(0, 1700, 1600)` | `{ major: 1, minor: 100 }` |
| T12 | `normalizeBreakdown(2, 300, 1600)` | unchanged `{ major: 2, minor: 300 }` |
| T13 | `hasConversion(800,'pkt','gm')` true · `hasConversion('', 'kg','')` false · `hasConversion(1,'kg','kg')` false | booleans |
| T14 | `minorDp('gm')===0`, `minorDp('ltr')===2` | numbers |
Run: `npx craco test --watchAll=false --testPathPattern=quantityBreakdown`

### E3 — `src/api/transforms/inventoryTransform.js`
**E3-1 — `fromAPI.ingredients()` insert after L26**
```
// BEFORE (L26):
      displayQtyText: item.display_qty_text || '', // BUG-455
// AFTER:
      displayQtyText: item.display_qty_text || '', // BUG-455
      displayQtyParts: item.display_qty_parts || null, // BUG-459
```
**E3-2 — `fromAPI.stockItems()` insert after L73** — identical pattern. (Line becomes L74 after E3-1; grep the BUG-455 comment, don't count.)

### E4 — `src/components/inventory/StockAuditPanel.jsx`
**E4a — imports (after L8)**
```js
import { toBreakdown, fromBreakdown, normalizeBreakdown, hasConversion } from '@/utils/quantityBreakdown'; // BUG-459
```
**E4b — L14 state comment**
```
// BEFORE: const [physicalEntries, setPhysicalEntries] = useState({}); // { itemId: { qty, reasonId } }
// AFTER:  const [physicalEntries, setPhysicalEntries] = useState({}); // BUG-459: { itemId: { major, minor, reasonId } }
```
**E4c — helpers, insert after `updateEntry` (after L45)**
```js
  // BUG-459: two-box helpers — maths in base unit, API receives display unit + display qty
  const convOf = (item) => hasConversion(item.conversionFactor, item.displayUnit || item.unit, item.smallUnit);
  const hasValue = (e) => (e?.major !== undefined && e?.major !== '') || (e?.minor !== undefined && e?.minor !== '');
  const entered = (item, e) => convOf(item)
    ? fromBreakdown(e.major, e.minor, item.conversionFactor)
    : { displayQty: Number(e.major) || 0, baseQty: Number(e.major) || 0 };
```
**E4d — `getDrift` L47–54 → replace body**
```js
  const getDrift = (item) => {
    const entry = physicalEntries[item.id];
    if (!hasValue(entry)) return null;
    const diffBase = entered(item, entry).baseQty - Number(item.quantity); // BUG-459: base − base
    return { diffBase, breakdown: toBreakdown(diffBase, item.conversionFactor, item.displayUnit || item.unit, item.smallUnit) };
  };
```
**E4e — L57 filter**
```
// BEFORE: .filter(([_, v]) => v.qty !== undefined && v.qty !== '');
// AFTER:  .filter(([_, v]) => hasValue(v)); // BUG-459
```
**E4f — sub-recipe branch L69–74**
```
// BEFORE: physicalQty: Number(entry.qty),
// AFTER:  physicalQty: entered(item, entry).displayQty, // BUG-459 (sub-recipes: no conversion → Number(major))
```
(`unit: item.unit || ''` unchanged — OD-459-02.)
**E4g — regular branch L81–87**
```
// BEFORE:
          await inventoryService.addStock(itemId, {
            quantity: 0,
            unit: item.displayUnit || item.unit || '',
            physicalQty: Number(entry.qty),
// AFTER:
          const res = await inventoryService.addStock(itemId, {  // BUG-459: capture response for wastage toast
            quantity: 0,
            unit: item.displayUnit || item.unit || '',            // BUG-459: display unit — qty below is in this unit
            physicalQty: entered(item, entry).displayQty,        // BUG-459: major + minor/factor (was base number)
```
then immediately after the `});` of that call (E4h):
```js
          const w = res?.data?.wastage; // OD-459-05
          if (w && Number(w.difference) !== 0) toast(`${item.name}: ${w.type} ${w.difference} ${w.unit}`);
```
**E4i — L112 `hasEntries`**
```
// BEFORE: const hasEntries = Object.keys(physicalEntries).some(k => physicalEntries[k]?.qty !== undefined && physicalEntries[k]?.qty !== '');
// AFTER:  const hasEntries = Object.keys(physicalEntries).some(k => hasValue(physicalEntries[k])); // BUG-459
```
**E4j — L118 helper copy**
```
// BEFORE: Compare system quantities with actual physical stock. Enter what you see on the shelf.
// AFTER:  Compare system quantities with actual physical stock. Count in the display unit; put any leftover base units in the second box. {/* BUG-459 */}
```
**E4k — L180–187 input cell → two-box converter**
```jsx
                    <td className="py-3 px-4 text-center">
                      {/* BUG-459: two-box converter — [major] displayUnit [minor] smallUnit; placeholders from display_qty_parts, never base quantity */}
                      <div className="inline-flex items-center gap-1">
                        <Input type="number" step={convOf(item) ? '1' : '0.01'} min="0"
                          value={physicalEntries[item.id]?.major ?? ''}
                          onChange={e => updateEntry(item.id, 'major', e.target.value)}
                          placeholder={String(item.displayQtyParts?.major ?? item.displayQty ?? '')}
                          className="h-8 text-sm text-center w-16"
                          data-testid={`audit-input-${item.id}`} />
                        <span className="text-xs text-slate-500" data-testid={`audit-unit-major-${item.id}`}>{item.displayUnit || item.unit}</span>
                        {convOf(item) && (
                          <>
                            <Input type="number" step="1" min="0"
                              value={physicalEntries[item.id]?.minor ?? ''}
                              onChange={e => updateEntry(item.id, 'minor', e.target.value)}
                              onBlur={() => {
                                const e = physicalEntries[item.id] || {};
                                const n = normalizeBreakdown(e.major, e.minor, item.conversionFactor); // OD-459-03 (a)
                                if (String(n.major) !== String(e.major ?? '') || String(n.minor) !== String(e.minor ?? '')) {
                                  updateEntry(item.id, 'major', String(n.major)); updateEntry(item.id, 'minor', String(n.minor));
                                }
                              }}
                              placeholder={String(item.displayQtyParts?.minor ?? '')}
                              className="h-8 text-sm text-center w-16"
                              data-testid={`audit-input-minor-${item.id}`} />
                            <span className="text-xs text-slate-500" data-testid={`audit-unit-minor-${item.id}`}>{item.smallUnit}</span>
                          </>
                        )}
                      </div>
                    </td>
```
Note: `onBlur` normalisation only fires when both boxes have a value or minor ≥ factor; empty minor stays empty (`normalizeBreakdown('', '', f)` → `{0,0}` — guard: skip when `!hasValue(e)`). Implementation agent: add `if (!hasValue(e)) return;` as first line of onBlur.
**E4l — drift badge L189–204**
```
// BEFORE: ) : drift.diff === 0 ? (
// AFTER:  ) : drift.diffBase === 0 ? (                                                   // BUG-459
// BEFORE: ) : drift.diff < 0 ? (
// AFTER:  ) : drift.diffBase < 0 ? (
// BEFORE (L197): <TrendingDown className="w-3 h-3" /> {drift.diff.toFixed(2)} {drift.unit}
// AFTER:         <TrendingDown className="w-3 h-3" /> {drift.breakdown.text.replace(/^-/, '')}   {/* BUG-459: "0 pkt 600 gm" */}
// BEFORE (L202): <TrendingUp className="w-3 h-3" /> +{drift.diff.toFixed(2)} {drift.unit}
// AFTER:         <TrendingUp className="w-3 h-3" /> +{drift.breakdown.text}
// BEFORE (L207): {drift && drift.diff !== 0 ? (
// AFTER:         {drift && drift.diffBase !== 0 ? (
```
Column width: L155 header `width: '15%'` → `'22%'`; L153 Ingredient `'35%'` → `'28%'` (two boxes need room). `minWidth: 750` → `820` (L150). **BUG-455 System-Qty text cell is now SUPPRESSED here — see E4m (OD-UNIFY-01), reversing the earlier "untouched" note.**

**E4m — suppress BUG-455 parenthetical on the System-Qty cell (OD-UNIFY-01) — re-grep exact lines first (currently L176–178)**
Grep: `grep -n "({item.displayQtyText})" src/components/inventory/StockAuditPanel.jsx` → BUG-455 span (currently L177).
Add a screen-level flag near the top of the component (E4a import region):
```js
const SHOW_BUG455_PARENTHETICAL = false; // BUG-459 (OD-UNIFY-01): two-box converter is the single breakdown source on Stock Audit; BUG-455 stays live on CurrentStock/SubRecipeStock
```
Gate the existing span (do NOT delete the BUG-455 code — suppress via flag so it is trivially reversible):
```jsx
// BEFORE (L176–178):
                      {item.displayQtyText && item.displayQtyText !== `${item.displayQty} ${item.displayUnit}` && ( // BUG-455
                        <span className="text-xs text-slate-300 ml-1">({item.displayQtyText})</span>
                      )}
// AFTER:
                      {SHOW_BUG455_PARENTHETICAL && item.displayQtyText && item.displayQtyText !== `${item.displayQty} ${item.displayUnit}` && ( // BUG-455 · suppressed here by BUG-459 (OD-UNIFY-01)
                        <span className="text-xs text-slate-300 ml-1">({item.displayQtyText})</span>
                      )}
```

---

## Execution sequence
1. E1 util → E2 test → run jest (must be 14/14 green before touching UI).
2. E3-1, E3-2 transform (+2 lines) → `yarn build` compiles.
3. E4a–E4m panel, in order; compile after E4h and after E4m.
4. Self-verify V1–V6, V8–V9 (V7/V10 live on preprod with QA_INV — only if credentials are available in the environment; otherwise mark BLOCKED for QA).
5. EXIT GATE 5/5 → QA handover.

---

## Verification Matrix (inherited by Implementation self-test + QA)
| # | File | Check | How | Auto |
|---|---|---|---|:---:|
| V1 | quantityBreakdown.js | T1–T14 | jest | YES |
| V2 | inventoryTransform.js | `displayQtyParts` present on stockItems + ingredients; `null` when API omits | jest (`src/__tests__/api/transforms/*` pattern) or `node -e` on `fromAPI.stockItems([{display_qty_parts:{…}}])` | YES |
| V3 | StockAuditPanel | converted row (pkt/gm) renders 2 inputs + 2 unit labels; no-conversion row (kg only) renders 1 input + 1 label | browser screenshot | NO |
| V4 | StockAuditPanel | placeholders = `display_qty_parts.major/minor` ("9" / "600"), never "7800" | browser | NO |
| V5 | StockAuditPanel | type `9` / `0` on 9.75-pkt item → amber badge "↓ 0 pkt 600 gm" + "preview"; type `9` / `600` → "Match"; type `10` / `0` → green "+0 pkt 200 gm" | browser | NO |
| V6 | Network | Save → body `{quantity:0, unit:"pkt", physicalqty_master:true, physical_qty:9, waste_reason:…, wastage_reason_id:…, notes:""}` — keys identical to BUG-379 contract, value in display unit | DevTools / RTL mock of `inventoryService.addStock` asserting call args | YES |
| V7 | Live preprod (#20329 or any converted item) | after save `stock-inventory` `cal_quantity` = major×factor+minor, `display_unit` unchanged (not flipped to kg) | curl read-back | NO |
| V8 | StockAuditPanel (OD-UNIFY-01) | System-Qty cell shows **NO** BUG-455 parenthetical; breakdown renders **exactly once per row** (only via the two-box converter + drift badge) | browser | NO |
| V8b | Regression (boundary) | BUG-455 parenthetical **STILL present** on **Current Stock** + **Sub-Recipe Stock** (unchanged); BUG-223 unsaved banner + "preview" label intact; reason dropdown enables only when drift ≠ 0 | browser | NO |
| V9 | Regression | sub-recipe row saves via `addSubRecipeStock` with `unit: item.unit`, `physical_qty` = major | Network / RTL | NO |
| V10 | Toast | after save of 9 pkt on 9.75 → toast "…: Loss (Wastage) 0.75 pkt"; no-op save → no wastage toast | browser | NO |
| V11 | Blur | minor `1700` @1600/tin → boxes become `1` / `100` on blur | browser | NO |
| V12 | Compile | `yarn build` exit 0, no new lint warnings | CLI | YES |

---

## Risk register (from IA §7, plan-level mitigations)
| # | Risk | Mitigation in plan |
|---|---|---|
| R1 | float 9.7499999 | `fromBreakdown` rounds displayQty to 4 dp (T8) |
| R2 | staff type base number into major box | placeholder from parts + locked unit label + helper copy (E4j/E4k) |
| R3 | `conversionFactor === ''` rows hit two-box path | `hasConversion` gate (T13) drives `convOf(item)` |
| R4 | BUG-379 422 regression | payload keys untouched (V6) |
| R5 | BUG-455 line drift / accidental global removal | OD-UNIFY-01: suppress via screen-level flag (E4m), never delete; Step 0 + E4m greps; V8b confirms the other two screens keep BUG-455 |
| R7 | `wastage` null | E4h null guard |
| R8 | corrupted rows persist | #20329 self-heals → V7 |

---

## Post-Code Registry Checklist (Implementation agent executes)
```
- [ ] registry.json: BUG-459 → status GATE_5A_IMPLEMENTED, sprint_key sep_bug_closure, status_history event with owner's "Gate 4 GO" verbatim
- [ ] BUG_TRACKER.md: row + top line updated
- [ ] FILE_OWNERSHIP.md: StockAuditPanel.jsx · inventoryTransform.js · utils/quantityBreakdown.js (NEW) · __tests__/utils/quantityBreakdown.bug459.test.js (NEW) — "BUG-459 IMPL <date>"
- [ ] Code markers: // BUG-459 in all 4 files (incl. `// BUG-459 (OD-UNIFY-01)` at E4m)
- [ ] QA handover: handover/QA_HANDOVER_<date>_BUG459.md (V1–V12 incl. V8/V8b) — flagged for the COMBINED wave with BUG-455 + CR-387 (OD-UNIFY-02); V7/V10 live
- [ ] Gate 6 smoke note: audit #20329 UAT BIRYANI MASALA → [9] pkt [200] gm → read-back cal_quantity 4700 (OD-459-01)
```

---

## Handover
```
Plan ready at plans/BUG-459_IMPLEMENTATION_PLAN.md. 16 edits across 4 files (2 new) — incl. E4m BUG-455 suppression (OD-UNIFY-01).
Code reality: NONE. Scope: StockAuditPanel.jsx · inventoryTransform.js (+2) · NEW utils/quantityBreakdown.js · NEW test / NOT: toAPI.*, inventoryService, SubRecipeStockPanel, CurrentStockPanel, CR-387 files, backend.
Verification matrix: 12 checks (4 automated, 8 manual; V7/V10 need preprod credentials).
Owner decisions needed: none (7 locked + OD-UNIFY-01/02 applied). Precondition: none blocking — BUG-455 QA folded into combined wave (OD-UNIFY-02); impl order BUG-459 → CR-387.
Awaiting Gate 4 GO.
```
