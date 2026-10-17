# CR-387 — Impact Analysis (Gate 2)
**Smart Purchase (Stock Update): unit-consistent quantity breakdown + two-box Qty to Buy + `add-purchase` payload in display units**

**Planning agent:** 2026-09-25 · **Code Reality:** NONE · **Conflict Pre-Check:** CONFLICT (BUG-455, sequenced) + DEPENDENCY (BUG-459 util)
**Risk:** HIGH (confirmed) · **R11 API Probe:** PASS — live probe 2026-09-25 (§1)
**Owner trigger:** "choose planning role for impact analysis for above bug and CR" (2026-09-25) — Gate 2 only.

---

## Header

| Field | Value |
|---|---|
| Code Reality | **NONE** — planner emits display values for On-Hand only (`purchasePlanner.js` L131–134, L157–160); `AutoShoppingList.jsx` renders `projected_need` L197/L311, `gap` L198, `suggest_qty` L203/L312 raw; single `<Input>` for qty L200–202; `SmartPurchasePanel.jsx` L216–217 sends `unit: r.unit` (= smallUnit) + `quantity: Number(r.qty ?? r.suggest_qty)`. 0 hits for breakdown util. |
| Conflict Pre-Check | **CONFLICT with BUG-455** on `purchasePlanner.js` (L134, L160 `display_qty_text`) and `AutoShoppingList.jsx` (L194, L307 text spans) — BUG-455 `GATE_5A_IMPLEMENTED`, QA pending → **execute AFTER BUG-455 Gate 5b**. **DEPENDS ON BUG-459** (`utils/quantityBreakdown.js`) → **execute AFTER BUG-459 Gate 5a** (or same wave, BUG-459 first). BUG-458 (`vendorRanking.js`) parallel-safe — different file. No other open item on `SmartPurchasePanel.jsx` / `GroupedVendorPreview.jsx`. |
| Hotspot files (R5) | **NONE** |
| Financial logic (R6) | **YES (adjacent)** — `rate` per unit derived from total (`CR-348`: `rate = Number(r.rate) / qty`) and `Amount` sent to `add-purchase` → expense/purchase report. Owner approval matrix applies (already: owner-driven CR). Total `Amount` is **unchanged** by this CR; only the per-unit `rate` basis changes (OD-387-02). |
| OD status | **ALL LOCKED 2026-09-25** — owner verbatim "All recommended · 459-01: a · 9.4 pkt , update docs and decsions". OD-387-01 = **(b)** display unit + display qty; 02–05, 07, 08 = recommended; 06 = probe in Gate 3. §3.3 E-C payload edits stand. **Gate 2 CLOSED.** Gate 3 awaits verbatim "Gate 3 GO". |

---

## §1 · R11 — API Contract (PASS, live-verified 2026-09-25, preprod RID 835)

Source: `evidence/INV-UNIT-CONTRACT/probes_2026_09_25/PROBE_REPORT.md` §2.
`POST /api/v2/vendoremployee/inventory/add-purchase` — `purchase_items[]: { Ingredient, Unit, quantity, rate, Amount, batch, expiry_date, origin }` (via `toAPI.addPurchase()` L177–208, unchanged).

| `Unit` / `quantity` sent (item 20326, pkt/gm @800) | HTTP | `added_items[0]` | Stock effect |
|---|---|---|---|
| `"pkt"` / 1 | 200 | `stock_quantity 1, sunit "pkt", calculate_quantity 800` | +800 gm, display_unit stays pkt |
| `"gm"` / 100 | 200 | `stock_quantity 100, sunit "gm", calculate_quantity 100` | +100 gm, **no display flip** (unlike add-stock) |
| `"pkt"` / 1.5 | 200 | `calculate_quantity 1200` | +1200 gm |
| `"xyz"` / 1 | 422 `PURCHASE_UNIT_NOT_COMPATIBLE` | — | none |
| `"PKT"` / 1 | 200 | `calculate_quantity 800` | case-insensitive |

Manual `PurchaseEntryPanel.jsx` L62/L105 already sends `Unit: ing.unit` (purchase unit) with the user's quantity — i.e. the display-unit contract is **already in production use** on the manual path. Smart Purchase is the outlier (base unit).

---

## §2 · Data Flow Trace

```
API  stock-inventory row: cal_quantity 5520 (ml) · display_qty 8.49 · display_unit "bottle" · converion_factor 650 · small_unit "ml" · display_qty_text "8 bottle 319 ml" · display_qty_parts {8,"bottle",319,"ml"}
  │
Transform  fromAPI.stockItems() → calQuantity, displayQty, displayUnit, smallUnit, conversionFactor, displayQtyText  (displayQtyParts → BUG-459 E2a)
  │
Planner  computePlan()  purchasePlanner.js
  │   L120 unit = smallUnit ("ml") · L121 onHand = calQuantity · L124 projected = velocity×days · L125 gap · L126 suggest = ceil(-gap)
  │   row: { unit:"ml", display_unit:"bottle", on_hand:5520, display_on_hand:8.49, display_qty_text, projected_need:6820, gap:-1300, suggest_qty:1300 }
  │   ⚠ row carries NO conversion_factor / small_unit → UI cannot break down projected/gap/suggest            ← S1
  │   alert rows L149–167 same gap · in_stock rows L178–181 same
  │
Panel  SmartPurchasePanel.jsx L57–69  initialRows: { ...r, qty: r.suggest_qty (base ml), rate:'', suggestedRate }
  │
UI  AutoShoppingList.jsx
  │   On-Hand L193–194 / L306–307 → fmtQty(display_on_hand, display_unit) + "(8 bottle 319 ml)"   ← display domain ✅
  │   Projected Need L197 `${r.projected_need} ${r.unit}` → "6820 ml" · L311 same                  ← base, labelled     ← S2
  │   Gap L198 `{r.gap}` → "-1300"                                                                 ← base, UNLABELLED   ← S2
  │   Qty to Buy L200–203 <Input value={r.qty ?? r.suggest_qty}> + "suggest: 1300"                  ← base, unlabelled   ← S3
  │   Suggested Qty L312 `{r.suggest_qty}` → "1300"                                                ← base, unlabelled   ← S2
  │   Rate placeholder/hint L208/L210 use Number(r.qty)                                             (total ₹ — unaffected)
  │
Preview  GroupedVendorPreview.jsx L77–78 `{r.qty || r.suggest_qty} {r.unit}` → "1300 ml"          ← base (OD-387-04)
  │
Submit  SmartPurchasePanel.jsx L214–223
        unit: r.unit ("ml") · quantity: Number(r.qty) (1300) · rate: Number(r.rate)/1300 · amount: Number(r.rate) · conversionFactor: 1 (ignored by toAPI since BUG-244)
Transform toAPI.addPurchase → Unit:"ml", quantity:1300 → backend +1300 ml  (consistent, not corrupting)      ← S4 contract change target
Validate L161 `Number(r.qty ?? r.suggest_qty) > 0`  · L176 subtotal = Σ r.rate (totals)  — unaffected by unit basis
```

---

## §3 · Affected Files — Exact Edit Sites (HEAD 2026-09-25)

### 3.1 `src/utils/purchasePlanner.js` (191 lines)
| Edit | Line | Change |
|---|---|---|
| E-P1 | L127–139 velocity rows | + `small_unit: unit`, + `conversion_factor: Number(item.conversionFactor) \|\| 0`, + `has_conversion: !!item.hasUnitConversion && factor > 0 && item.displayUnit !== unit`, + `display_qty_parts: item.displayQtyParts \|\| null` |
| E-P2 | L153–166 alert rows | same 4 fields |
| E-P3 | (in_stock rows reuse `rows` → inherit E-P1) | none |
| — | L120–126 math | **unchanged** — planner math stays in base units (G4/Path X rulings intact) |
No breakdown computed in the planner; UI derives via util (keeps planner pure and tested).

### 3.2 `src/components/inventory/smart/AutoShoppingList.jsx` (331 lines)
| Edit | Line | Change |
|---|---|---|
| E-A1 | L3 / new import | `import { toBreakdown, fromBreakdown, normalizeBreakdown } from '@/utils/quantityBreakdown'` (BUG-459 util) |
| E-A2 | L27–30 ad-hoc row | + `small_unit`, `conversion_factor`, `has_conversion`, `display_qty_parts` from `ingredient` (ingredients transform has `conversionFactor`, `displayUnit`, `smallUnit`); `qty` → `qty_major:''`, `qty_minor:''` |
| E-A3 | L98–102 `fmtQty` | keep for On-Hand; add `fmtBreak(baseQty, r)` = `has_conversion ? toBreakdown(baseQty, factor, display_unit, small_unit).text : fmtQty(baseQty, unit)` |
| E-A4 | L197 | Projected Need → `fmtBreak(r.projected_need, r)` |
| E-A5 | L198 | Gap → `fmtBreak(r.gap, r)` (sign preserved, e.g. "-2 bottle 0 ml" → "-2 bottle") |
| E-A6 | L200–203 Qty to Buy | two-box converter: `[qty_major] <bottle> [qty_minor] <ml>` for `has_conversion`, single box otherwise; `onChange` → `onRowChange(ix, { qty_major / qty_minor })`; `onBlur` minor → normalize (mirrors OD-459-03); hint "suggest: {fmtBreak(r.suggest_qty, r)}"; testids `row-qty-${id}` (major, continuity) + `row-qty-minor-${id}` |
| E-A7 | L208, L210 rate placeholder/hint | `Number(r.qty \|\| r.suggest_qty)` → `qtyBase(r)` helper (= `fromBreakdown(major, minor, factor).baseQty`, fallback suggest) — keeps "last total ₹" math in base×unit_price (unit_price history is per base unit today — see R3) |
| E-A8 | L311 | Projected Need (table 2) → `fmtBreak` (OD-387-03) |
| E-A9 | L312 | Suggested Qty → `fmtBreak(r.suggest_qty, r)` (OD-387-03) |

### 3.3 `src/components/inventory/SmartPurchasePanel.jsx` (327 lines)
| Edit | Line | Change |
|---|---|---|
| E-C1 | L64 `qty: r.suggest_qty` | seed `qty_major / qty_minor` from `toBreakdown(r.suggest_qty, factor, …)` when `has_conversion`; else `qty_major: r.suggest_qty` |
| E-C2 | L161 validate | `qtyDisplay(r) > 0` where `qtyDisplay = has_conversion ? fromBreakdown(major, minor, factor).displayQty : Number(major)` |
| E-C3 | L216 `unit: r.unit` | → `unit: r.has_conversion ? r.display_unit : r.unit` **(OD-387-01 b)** |
| E-C4 | L217 `quantity` | → `qtyDisplay(r)` rounded 4 dp |
| E-C5 | L218 `rate: Number(r.rate) / qty` | divisor → `qtyDisplay(r)` → rate = ₹ per display unit **(OD-387-02)**; `amount` L219 unchanged (total) |
| E-C6 | L220 `conversionFactor: 1` | delete (dead since BUG-244) or leave — Gate 3 decision, zero effect |

### 3.4 `src/components/inventory/smart/GroupedVendorPreview.jsx`
| E-G1 | L77–78 | `{r.qty \|\| r.suggest_qty} {r.unit}` → breakdown text via util (OD-387-04) |

### 3.5 Not touched
`toAPI.addPurchase()` (contract already field-complete) · `vendorRanking.js` · `PurchaseEntryPanel.jsx` · `HorizonPicker.jsx` · `VendorSuggestionCell.jsx` · planner math L120–126 · BUG-455 spans L194/L307 (verbatim).

---

## §4 · Downstream Consumers

| Consumer | Effect |
|---|---|
| `add-purchase` backend | receives `Unit: "bottle"`, `quantity: 2` → +1300 ml (probe B1/B3) |
| Purchase / expense reports (`getPurchaseReport`) | `rate` now per display unit; `Amount` identical. Historical Smart-Purchase rows are per base unit → mixed history (R3) |
| `vendor-item-list` `unit_price` used for `suggestedRate` (L63) | today derived from past purchases — basis will shift to display unit for new rows; the "last total ₹" hint multiplies `unit_price × qty` → must multiply by the **same basis** as the row that produced `unit_price` (R3, OD-387-06 new) |
| `GroupedVendorPreview` subtotal L47 | Σ totals — unaffected |
| CR-100 split validation L176 | Σ totals — unaffected |
| QA testids | `row-qty-${id}` kept on major; `row-qty-minor-${id}` new; `plan-row-*`, `avail-row-*` unchanged |

---

## §5 · Scope Lock (for Gate 3)
**WILL change:** `utils/purchasePlanner.js` (+4 fields ×2 sites) · `components/inventory/smart/AutoShoppingList.jsx` (~9 sites) · `components/inventory/SmartPurchasePanel.jsx` (5–6 sites) · `components/inventory/smart/GroupedVendorPreview.jsx` (1 site, if OD-387-04 YES) · tests `src/__tests__/utils/purchasePlanner.cr387.test.js` (new fields) + RTL for two-box.
**WILL NOT touch:** `toAPI.addPurchase`, `inventoryService.js`, `vendorRanking.js`, `PurchaseEntryPanel.jsx`, planner math, BUG-455 spans, backend.
Estimated: ~17 edit sites, ~90–120 lines net. **Depends on** `utils/quantityBreakdown.js` from BUG-459.

---

## §6 · Open Owner Decisions (block Gate 3)

| ID | Question | Recommended ⚑ |
|---|---|---|
| OD-387-01 | Payload basis: (a) base unit + base qty (works today) · (b) display unit + display qty | **LOCKED (b) — add-purchase payload Unit = display_unit, quantity = display qty (4 dp); rows without conversion keep Unit: r.unit.** |
| OD-387-02 | `rate` = ₹ per display unit (divisor = display qty) | **LOCKED YES — rate = ₹ per display unit (divisor = display qty); Amount total unchanged.** |
| OD-387-03 | Breakdown + two-box in table 2 (All Ingredients: Projected Need / Suggested Qty read-only there; two-box only in Purchase List) | **LOCKED (a) — table 2 (All Ingredients) read-only breakdown text for Projected Need / Suggested Qty; two-box input only in table 1 (Purchase List).** |
| OD-387-04 | GroupedVendorPreview quantities in breakdown | **LOCKED YES — GroupedVendorPreview quantities rendered as breakdown.** |
| OD-387-05 | Minor rounding: 0 dp gm/ml/piece; 2 dp others | **LOCKED YES — minor 0 dp for gm/ml/piece, 2 dp otherwise (shared with OD-459-04).** |
| OD-387-06 (new) | `suggestedRate`/"last total ₹" hint after basis change: multiply `unit_price` by base qty (history basis) or display qty? Requires knowing which basis `vendor-item-list.unit_price` uses (R11 follow-up probe in Gate 3) | **RESOLVED 2026-09-25 — read-only probe GET vendor-item-list (42 rows) proves unit_price = Amount ÷ BASE quantity (1 pkt@800 ₹1 → 0.00125; 100 gm ₹100 → 1; 1 pkt@500 ₹100 → 0.2 = 250 gm ₹50 → 0.2). Plan E-A7 default (hint = unit_price × baseQty) CONFIRMED; no switch. Evidence evidence/CR-387/probes_2026_09_25/od387_06_vendor_item_list.json.** |
| OD-387-07 (new) | Ad-hoc rows: seed two-box empty, or from `display_qty_parts` of ingredient master? | **LOCKED (a) — ad-hoc rows seed two-box empty.** |
| OD-387-08 (new) | Execution order: after BUG-455 Gate 5b **and** BUG-459 Gate 5a | **LOCKED (a) — execute AFTER BUG-455 Gate 5b AND BUG-459 Gate 5a.** |

---

## §7 · Risk Register

| # | Risk | Sev | Mitigation |
|---|---|---|---|
| R1 | Contract change on a financial-adjacent endpoint | HIGH | probe B1–B5 PASS; `Amount` unchanged; Gate 6 owner smoke with one real purchase |
| R2 | `rate` semantics flip mid-history (per ml → per bottle) | MED | OD-387-02 explicit; report shows `Unit` column already |
| R3 | `vendor-item-list.unit_price` basis unknown → "last total ₹" hint wrong by ×factor | MED | OD-387-06 probe in Gate 3 (read-only GET) |
| R4 | Rows without conversion (`has_conversion:false`) must keep single box + `Unit: r.unit` | HIGH | explicit flag from planner E-P1; unit test |
| R5 | Ad-hoc rows lack stock row → factor from ingredients master (`conversionFactor`, `displayUnit`, `smallUnit` present in `fromAPI.ingredients()` L15–24) | LOW | E-A2 |
| R6 | BUG-455 spans line drift | MED | execute after 5b; re-grep |
| R7 | Float: 1300/650 = 2 exactly; 319/650 = 0.4908 → send 4 dp | LOW | round 4 dp; probe B3 shows decimals accepted |
| R8 | Planner unit tests (if any) asserting row shape | LOW | additive fields only |

---

## §8 · Verification Matrix (seeds Gate 3 + QA)

| # | File | Check | How | Auto |
|---|---|---|---|:---:|
| V1 | purchasePlanner.js | rows carry `small_unit`, `conversion_factor`, `has_conversion`, `display_qty_parts`; math unchanged (same `gap`/`suggest_qty` as before) | jest | YES |
| V2 | AutoShoppingList | UAT BAR BEER: Projected Need "10 bottle 320 ml", Gap "-2 bottle", Suggested "2 bottle" (values per live data) | browser | NO |
| V3 | AutoShoppingList | Purchase List row shows `[2] bottle [0] ml`; typing 700 in ml → normalises to `[3] bottle [50] ml` | browser | NO |
| V4 | AutoShoppingList | no-conversion item (e.g. kg/gm without factor) → single box, label `unit` | browser | NO |
| V5 | Network | submit → `purchase_items[0]` = `{Unit:"bottle", quantity:2, rate:<total/2>, Amount:<total>}` | Network / RTL mock | YES |
| V6 | Live | `stock-inventory` `cal_quantity` +1300 ml; `display_unit` still "bottle" | curl read-back | NO |
| V7 | Validation | empty two-box → "Quantity must be > 0"; split-sum validation unchanged | browser | NO |
| V8 | Regression | On-Hand cell + BUG-455 "(8 bottle 319 ml)" intact; BUG-458 vendor names intact; CR-114 add/remove; CR-115 filters | browser | NO |
| V9 | GroupedVendorPreview | "UAT BAR BEER · 2 bottle" and "₹x for 2 bottle" | browser | NO |
| V10 | Reports | Purchase report row shows Unit "bottle", qty 2, rate per bottle | browser | NO |

---

## §9 · Post-Code Registry Checklist (for Implementation agent)
```
- [ ] registry.json: CR-387 → GATE_5A_IMPLEMENTED, sprint_key sep_bug_closure
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: purchasePlanner.js · AutoShoppingList.jsx · SmartPurchasePanel.jsx · GroupedVendorPreview.jsx · tests
- [ ] Code markers: // CR-387 in every modified file
```

---

## Handover
```
Impact Analysis complete for CR-387 (Gate 2). Path: impact/CR-387_IMPACT_ANALYSIS.md
Code reality: NONE. Conflicts: BUG-455 (2 shared files) → after Gate 5b; DEPENDS ON BUG-459 util → after BUG-459 Gate 5a.
Risk: HIGH (confirmed; financial-adjacent rate basis). R11: PASS (probe B1–B5).
Scope: purchasePlanner.js · AutoShoppingList.jsx · SmartPurchasePanel.jsx · GroupedVendorPreview.jsx (+tests).
Owner decisions blocking Gate 3: OD-387-01…08 (06 needs a read-only probe of vendor-item-list unit_price basis).
Next: owner answers ODs → "Gate 3 GO" → Implementation Plan (BUG-459 plan first).
```
