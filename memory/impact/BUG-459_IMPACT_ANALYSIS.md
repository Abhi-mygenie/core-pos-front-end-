# BUG-459 — Impact Analysis (Gate 2)
**Stock Audit physical count: base-unit number sent with display-unit label → ×factor stock inflation on save; drift badge mixes units**

**Planning agent:** 2026-09-25 · **Code Reality:** NONE · **Conflict Pre-Check:** CONFLICT (BUG-455, sequenced — see Header)
**Risk:** CRITICAL (confirmed) · **R11 API Probe:** PASS — live probe 2026-09-25 (§1)
**Owner trigger:** "choose planning role for impact analysis for above bug and CR" (2026-09-25) — Gate 2 only; no Implementation Plan written.

---

## Header

| Field | Value |
|---|---|
| Code Reality | **NONE** — `grep -rn "display_qty_parts\|displayQtyParts\|quantityBreakdown\|BUG-459" src/` = 0 hits (2026-09-25). `StockAuditPanel.jsx` `getDrift()` L47–54 and `addStock()` call L81–87 unchanged since BUG-379 (2026-09-03) / BUG-455 (2026-09-24). |
| Conflict Pre-Check | **CONFLICT with BUG-455** on `StockAuditPanel.jsx` (L176–178 BUG-455 text span) and `inventoryTransform.js` (L26, L73 `displayQtyText`). BUG-455 status `GATE_5A_IMPLEMENTED`, QA Gate 5b pending. **Execution order: BUG-459 AFTER BUG-455 Gate 5b (or same wave with BUG-455 lines preserved).** Parallel-safe by construction only if BUG-459 edits do not touch L176–178 / L73 — this IA keeps them untouched. No other open item on these files (registry scan 2026-09-25). |
| Hotspot files (R5) | **NONE** (StockAuditPanel, inventoryTransform, new util not in HIGH-RISK FILE TRAPS) |
| Financial logic (R6) | **NO direct money.** Stock quantity write → feeds wastage rows + valuation reports (backend). Risk stays CRITICAL because of data corruption, not currency. |
| OD status for IA | **ALL LOCKED 2026-09-25** — owner verbatim "All recommended · 459-01: a · 9.4 pkt , update docs and decsions". OD-459-01 = **9.4 pkt** for #20329 (no manual repair — self-heals on first post-fix audit; Gate 6 smoke item). All others = recommended ⚑. **Gate 2 CLOSED.** Gate 3 awaits verbatim "Gate 3 GO". |

---

## §1 · R11 — API Contract (PASS, live-verified 2026-09-25, preprod RID 835, alias `QA_INV`)

Source: `evidence/INV-UNIT-CONTRACT/probes_2026_09_25/PROBE_REPORT.md` §0, §1, §3.

**Read:** `GET /api/v2/vendoremployee/inventory/stock-inventory` → `{ current_stocks: [...] }` — per row:
```
unit "pkt" · small_unit "gm" · has_unit_conversion true · converion_factor 800 · consumption_unit "gm"
quantity "7800.000" (base) · cal_quantity "7800.00" (base) · display_qty "9.75" · display_unit "pkt"
display_qty_text "9 pkt 600 gm"
display_qty_parts { major: 9, major_unit: "pkt", minor: 600, minor_unit: "gm", sign: "" }   ← unmapped today
physical_qty "10"  (last count, stored in the unit it was sent)
```
No-conversion row: `has_unit_conversion false`, `converion_factor null`, `display_qty_parts { major: 0, major_unit: "kg", minor: null, minor_unit: null }`.

**Write:** `POST /api/v2/vendoremployee/inventory/add-stock/{id}` body `{ quantity: 0, unit, physicalqty_master: true, physical_qty, waste_reason, wastage_reason_id, notes }`

| Sent | Result | Meaning |
|---|---|---|
| `unit:"pkt", physical_qty:9.75` (= current) | 200, `wastage: null`, qty unchanged | display unit honoured |
| `unit:"pkt", physical_qty:9` | 200 → 7200 gm; `wastage {type:"Loss (Wastage)", current_stock:9.75, physical_count:9, difference:0.75, unit:"pkt"}` | factor applied; drift returned in sent unit |
| `unit:"pkt", physical_qty:9.5` / `"PKT" 9.25` | 200 → 7600 / 7400 gm | decimals OK; case-insensitive |
| `unit:"gm", physical_qty:7800` | 200, `cal_quantity` 7800 ✅ but `quantity`→7.800, `display_unit`→"kg", text "9 kg 750 gm", `wastage.unit` "kg" | **base-unit send is unsafe** — flips display unit |
| `unit:""` | 422 `unit required` | unit mandatory |
| `unit:"xyz"` | 422 `PURCHASE_UNIT_NOT_COMPATIBLE` | only purchase or consumption unit |
| `physicalqty_master` omitted | 422 `vendor_id required` | flag marks recount |

Every 200 creates a `purchase_id` / `PUR-<rid>-<date>-<n>` row with `added_quantity 0`.

**Contract chosen for FE:** always send `unit = item.displayUnit` (falls back to `item.unit`) and `physical_qty` in that unit. Never send `smallUnit` from Stock Audit.

---

## §2 · Data Flow Trace (Break Points)

```
API  current_stocks[i]  quantity 4700 (gm) · display_qty 9.4 · display_unit "pkt" · converion_factor 500 · display_qty_parts {9,"pkt",200,"gm"}
  │
Transform  fromAPI.stockItems()  L57–84
  │   quantity→4700 · displayQty→9.4 · displayUnit→"pkt" · smallUnit→"gm" · conversionFactor→500 · displayQtyText→"9 pkt 200 gm"
  │   display_qty_parts → NOT MAPPED                                        ← S0 (gap, not a bug)
  │
State  StockAuditPanel.stockItems[] · physicalEntries { [id]: { qty: "<string>", reasonId } }   L14
  │
UI   System Qty cell L174–178 → "9.4 pkt (9 pkt 200 gm)"          (display domain)
     Physical Qty  L181–186 <Input type=number placeholder={String(item.quantity)}>  → hint "4700"  (BASE domain, no label)   ← S1
  │
Derived  getDrift()  L47–54  diff = Number(entry.qty) − Number(item.quantity)  (base − base)  → unit: item.displayUnit   ← S2 (label mismatch)
UI   Drift badge L195–203  `${diff.toFixed(2)} ${unit}`  → "-100.00 pkt"
  │
Save  handleSaveAll() L81–87  addStock(itemId, { quantity:0, unit: item.displayUnit || item.unit, physicalQty: Number(entry.qty), ... })   ← S3 (ROOT — base number, display label)
Transform  toAPI.addStock() L221–231 → { quantity:0, unit:"pkt", physicalqty_master:true, physical_qty:4700, waste_reason, wastage_reason_id, notes }
API  add-stock → interprets 4700 as 4700 pkt → stores 2,350,000 gm                                             ← corruption
  │
Sub-recipe branch L66–74  addSubRecipeStock(subrecipeId, { quantity:0, unit: item.unit, physicalQty })  — RID 835 sub-recipes have no conversion (piece/piece) → numerically safe today; same structural mismatch if a converted sub-recipe ever exists (OD-459-02 covers).
```

**Break points:** S3 (root, corrupting) · S2 (misleading label) · S1 (UX prompt in wrong domain) · S0 (unmapped helper data).

---

## §3 · Affected Files — Exact Edit Sites (current HEAD, post-BUG-455)

### 3.1 `src/utils/quantityBreakdown.js` — **NEW** (shared with CR-387)
Pure functions, no React, no API.
```
toBreakdown(baseValue, factor, majorUnit, minorUnit, opts?)   → { sign:'-'|'', major, minor, majorUnit, minorUnit, text }
   factor > 0 && majorUnit !== minorUnit : major = floor(|v| / factor), minor = round(|v| % factor, minorDp)
   else                                    : major = |v| (rounded), minor = null   (no-conversion path)
   text: `${sign}${major} ${majorUnit}` + (minor ? ` ${minor} ${minorUnit}` : '')   · v === 0 → "0 <majorUnit>"
fromBreakdown(major, minor, factor)        → { displayQty: major + minor/factor, baseQty: major*factor + minor }
normalizeBreakdown(major, minor, factor)   → carries minor ≥ factor into major (OD-459-03 a)
```
Rounding rule (OD-459-04 / OD-387-05 ⚑): minor 0 dp for gm/ml/piece/pcs; else 2 dp. `displayQty` kept to ≤ 4 dp to avoid float noise (9.75, 4.9625).
Unit test file `src/__tests__/utils/quantityBreakdown.bug459.test.js` (Gate 3 to list cases: 0, exact multiple, remainder, negative, no-factor, minor ≥ factor, fractional factor 2.5).

### 3.2 `src/api/transforms/inventoryTransform.js`
| Edit | Line | Current | New |
|---|---|---|---|
| E2a | L73 (stockItems) — **insert after** BUG-455 line, do not modify it | `displayQtyText: item.display_qty_text \|\| '', // BUG-455` | + `displayQtyParts: item.display_qty_parts \|\| null, // BUG-459` |
| E2b | L26 (ingredients) — same pattern | `displayQtyText: … // BUG-455` | + `displayQtyParts: item.display_qty_parts \|\| null, // BUG-459` (needed by CR-387 ad-hoc rows; harmless otherwise) |
No change to `toAPI.addStock()` L221–231 — contract already correct; only the caller's values change.

### 3.3 `src/components/inventory/StockAuditPanel.jsx`
| Edit | Line(s) | Change |
|---|---|---|
| E3a | L14 | `physicalEntries` shape `{ [id]: { qty, reasonId } }` → `{ [id]: { major: string, minor: string, reasonId } }` (single-box items use `major` only) |
| E3b | L40–45 `updateEntry` | unchanged signature; field names `major` / `minor` |
| E3c | L47–54 `getDrift()` | compute `baseEntered = fromBreakdown(major, minor, factor).baseQty` (no factor: `Number(major)`); `diffBase = baseEntered − Number(item.quantity)`; return `{ diffBase, breakdown: toBreakdown(diffBase, factor, displayUnit, smallUnit) }`; "entered" test → `major !== '' \|\| minor !== ''` |
| E3d | L57 filter + L112 `hasEntries` | replace `v.qty` checks with `hasValue(v)` = major or minor non-empty |
| E3e | L81–87 regular branch | `unit: item.displayUnit \|\| item.unit`, `physicalQty: fromBreakdown(...).displayQty` (no factor → `Number(major)`) — **payload key set unchanged** |
| E3f | L69–74 sub-recipe branch | same composition; `unit` stays `item.unit` (no conversion on sub-recipes; OD-459-02) |
| E3g | L155 header | "Physical Qty" → "Physical Qty (count)" (copy; optional ⚑) |
| E3h | L180–187 input cell | replace single `<Input>` with two-box converter: `[major]` + locked `<span>{displayUnit}</span>` + (`hasConversion ? [minor] + <span>{smallUnit}</span> : null)`; placeholders from `item.displayQtyParts` (`major`/`minor`) — **never** `item.quantity`; `data-testid` `audit-input-major-${id}` / `audit-input-minor-${id}` (keep `audit-input-${id}` on the major box for QA continuity ⚑); `onBlur` on minor → `normalizeBreakdown` (OD-459-03 a) |
| E3i | L189–204 drift badge | `drift.diffBase === 0` → Match; `< 0` → amber `↓ {breakdown.text}`; `> 0` → green `↑ +{breakdown.text}`; remove `toFixed(2)`+`unit` pair |
| E3j | L91 toast | after each 200, read `res.data.wastage` → toast `"<name>: <type> <difference> <unit>"` (OD-459-05 ⚑); requires `inventoryService.addStock` to return the axios response (it already returns `api.post(...)`) |
| E3k | L118 helper copy | "Enter what you see on the shelf." → "Count in <display unit>; add leftover <base unit> in the second box." (copy ⚑) |

Line numbers are from HEAD 2026-09-25 (233 lines). Gate 3 must re-grep.

### 3.4 Not touched (scope lock candidates)
`inventoryService.js` (returns response already) · `toAPI.addStock` / `addSubRecipeStock` · `SubRecipeStockPanel.jsx` · `CurrentStockPanel.jsx` · `pages/StockAuditPage.jsx` · backend.

---

## §4 · Downstream Consumers

| Consumer | Effect |
|---|---|
| `toAPI.addStock()` | receives display qty — contract satisfied (§1) |
| Backend wastage / valuation | receives correct counts; historical corrupted rows (#20329) are **not** auto-healed → OD-459-01 |
| `pages/StockAuditPage.jsx` | renders panel only, no props — none |
| BUG-455 text cell L176–178 | untouched; reads `displayQtyText` |
| CR-387 | imports `quantityBreakdown.js`; shape defined here is the dependency |
| QA testids | `audit-input-${id}` reused on the major box; new `audit-input-minor-${id}`, `drift-preview-badge` retained |

---

## §5 · Scope Lock (for Gate 3)
**WILL change:** `src/components/inventory/StockAuditPanel.jsx` · `src/api/transforms/inventoryTransform.js` (2 additive lines) · `src/utils/quantityBreakdown.js` (NEW) · `src/__tests__/utils/quantityBreakdown.bug459.test.js` (NEW).
**WILL NOT touch:** `toAPI.addStock`, `toAPI.addSubRecipeStock`, `inventoryService.js`, `SubRecipeStockPanel.jsx`, `CurrentStockPanel.jsx`, `purchasePlanner.js`, `AutoShoppingList.jsx`, `SmartPurchasePanel.jsx` (CR-387 owns these), backend.
Estimated: ~12 edit sites, ~70–90 lines net.

---

## §6 · Open Owner Decisions (block Gate 3)

| ID | Question | Recommended ⚑ |
|---|---|---|
| OD-459-01 | Repair `#20329 UAT BIRYANI MASALA` (250,000 gm = 500 pkt) — true value? Data action via probe pattern, not code | **LOCKED (a) — true on-hand for #20329 UAT BIRYANI MASALA = 9.4 pkt (= 4700 gm @500). Owner 2026-09-25: test data, NO separate repair call. Self-heals on first Stock Audit save after BUG-459 ships (staff enter [9] pkt [200] gm → backend overwrites to 4700 gm). #20329 = designated Gate 6 smoke item (V7 read-back expects cal_quantity 4700, display_unit pkt).** |
| OD-459-02 | No-conversion items & sub-recipes: single box, send `item.unit` | **LOCKED YES — no-conversion items + sub-recipes: single box, send unit: item.unit.** |
| OD-459-03 | minor ≥ factor: (a) auto-normalise on blur · (b) block | **LOCKED (a) — minor >= factor auto-normalises into major on blur.** |
| OD-459-04 | Drift: sign + breakdown text; 0 → "Match"; minor rounding 0 dp for gm/ml/piece | **LOCKED YES — drift = sign + breakdown text; 0 → 'Match'; minor 0 dp for gm/ml/piece.** |
| OD-459-05 | Post-save toast echoes backend `wastage` per item (vs generic count) | **LOCKED YES — post-save toast echoes backend wastage per item (null-guarded).** |
| OD-459-06 (new) | Keep `audit-input-${id}` testid on the major box (QA continuity) and add `-minor` | **LOCKED YES — keep audit-input-${id} on major box; add audit-input-minor-${id}.** |
| OD-459-07 (new) | Execution order vs BUG-455: wait for Gate 5b, or same wave preserving BUG-455 lines | **LOCKED (a) — execute AFTER BUG-455 Gate 5b closes.** |

---

## §7 · Risk Register

| # | Risk | Sev | Mitigation |
|---|---|---|---|
| R1 | Float composition `major + minor/factor` produces 9.749999 → backend rounds differently | MED | round displayQty to 4 dp; unit test; probe A4 showed 9.5 exact |
| R2 | Staff still type a base number into the major box (habit) | MED | placeholder from `displayQtyParts.major`, locked unit label beside box, helper copy E3k |
| R3 | Items with `conversionFactor === ''` (no conversion) fall into two-box path | HIGH | gate on `item.hasUnitConversion && Number(factor) > 0 && displayUnit !== smallUnit` |
| R4 | Regression of BUG-379 (422) if payload keys change | HIGH | payload keys unchanged; only values; probe body identical to A1 |
| R5 | BUG-455 line drift when both land | MED | OD-459-07; Gate 3 re-grep; keep L176–178 verbatim |
| R6 | Sub-recipe converted item appears later | LOW | same composition path; unit `item.unit` (OD-459-02) |
| R7 | Backend `wastage` absent on no-op (null) → toast code must null-guard | LOW | E3j guard |
| R8 | Existing corrupted rows remain after fix until first audit | MED (data, test env) | OD-459-01: #20329 self-heals on first post-fix audit save = Gate 6 smoke item; eyeball other converted items |

---

## §8 · Verification Matrix (seeds Gate 3 + QA)

| # | File | Check | How | Auto |
|---|---|---|---|:---:|
| V1 | quantityBreakdown.js | 7800/800 → {9,600}; 4700/500 → {9,200}; −100/500 → {'-',0,100}; 0 → "0 pkt"; no factor → major only; 1700 minor@1600 → normalise {1,100} | jest | YES |
| V2 | inventoryTransform.js | `displayQtyParts` mapped from `display_qty_parts`, null when absent | jest | YES |
| V3 | StockAuditPanel | converted row renders 2 boxes with locked labels; no-conversion row renders 1 box | browser / RTL | YES |
| V4 | StockAuditPanel | placeholders = `display_qty_parts.major/minor`, never base `quantity` | browser | NO |
| V5 | StockAuditPanel | enter 9 pkt 0 gm on 9.75 pkt item → badge "↓ 0 pkt 600 gm" (or per OD-459-04 format) | browser | NO |
| V6 | Network | save → body `{quantity:0, unit:"pkt", physicalqty_master:true, physical_qty:9, …}` | Network tab / RTL mock | YES |
| V7 | Live (preprod) | after save, `stock-inventory` `quantity` = 7200 gm, `display_unit` still "pkt" | curl read-back | NO |
| V8 | Regression | BUG-455 text cell still shows "(9 pkt 600 gm)"; BUG-223 banner + preview label intact | browser | NO |
| V9 | Regression | sub-recipe row (piece/piece) saves via `addSubRecipeStock` with `unit:"piece"` | Network | NO |
| V10 | Toast | per-item "Loss 0.75 pkt" after save (if OD-459-05 YES) | browser | NO |

---

## §9 · Post-Code Registry Checklist (for Implementation agent — Gate 3 copies this)
```
- [ ] registry.json: BUG-459 → status GATE_5A_IMPLEMENTED, sprint_key sep_bug_closure
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: StockAuditPanel.jsx · inventoryTransform.js · utils/quantityBreakdown.js (NEW) · __tests__/utils/quantityBreakdown.bug459.test.js (NEW)
- [ ] Code markers: // BUG-459 in every modified file
- [ ] Gate 6 smoke: audit #20329 → [9] pkt [200] gm → read-back cal_quantity 4700 (OD-459-01 self-heal; no manual repair)
```

---

## Handover
```
Impact Analysis complete for BUG-459 (Gate 2). Path: impact/BUG-459_IMPACT_ANALYSIS.md
Code reality: NONE. Conflict: BUG-455 (same 2 files) → execute AFTER BUG-455 Gate 5b (OD-459-07).
Risk: CRITICAL (confirmed). R11: PASS (live probe 2026-09-25).
Scope: StockAuditPanel.jsx + inventoryTransform.js (+2 lines) + NEW utils/quantityBreakdown.js (+test).
Owner decisions blocking Gate 3: OD-459-01…07.
Next: owner answers ODs → "Gate 3 GO" → Implementation Plan.
```
