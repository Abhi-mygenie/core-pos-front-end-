# BUG-460 — Impact Analysis (Gate 2)

**Date:** 2026-09-25 · **Role 2 PLANNING** · **Sprint:** sep_bug_closure
**Item:** BUG-460 · **Status:** GATE_2_IMPACT_ANALYSIS
**Risk:** HIGH (financial-adjacent — changes suggested purchase quantity + two-box seed default)
**Code Reality:** NONE — no `// BUG-460` markers in codebase

## 0. Conflict Pre-Check

- `purchasePlanner.js`: last modified by CR-387 (2026-09-25, GATE_5A_IMPLEMENTED) + BUG-455 (2026-09-24, GATE_5A_IMPLEMENTED). Both shipped & QA-passed. **No conflict.**
- `quantityBreakdown.js`: last modified by BUG-459 + CR-387 (2026-09-25, GATE_5A_IMPLEMENTED). Shipped & QA-passed. **No conflict — BUG-460 adds a helper here.**
- No other active item touches these files.

## 1. Problem Statement

Smart Purchase → "Suggested Qty" shows un-purchasable fractions of a display unit (e.g. "641 bottle 330 ml"). Since stock is bought in whole display units (bottles, tins, boxes, packets), the suggestion must ceil to the **next whole display unit**.

## 2. Owner Decisions (all resolved at intake)

| # | Decision | Answer |
|---|----------|--------|
| OD-460-01 | Rounding method | **Ceil / round-up** to next whole display unit (never short) |
| OD-460-02 | Alert / top-up rows | **Yes** — apply same rounding |
| OD-460-03 | Projected Need + Gap | **Keep partial** (informational, exact breakdown) |

## 3. Root Cause — Data Flow Trace

```
API: GET /stock-inventory → item.calQuantity (base unit, e.g. ml)
  → purchasePlanner.js
    L126 (velocity rows):  suggest = gap < 0 ? Math.ceil(-gap) : 0
    L173 (alert rows):     suggest_qty = Math.ceil(threshold - onHand)
      ↑ BREAK POINT: both ceil to the nearest whole BASE unit (ml/gm/piece),
        not the nearest whole DISPLAY unit (bottle/tin/box/pkt)
  → AutoShoppingList.jsx
    L344: fmtBreak(r.suggest_qty, r)  →  toBreakdown(baseQty, factor, major, minor)
      → renders "641 bottle 330 ml" (641 whole bottles + 330 ml leftover)
  → SmartPurchasePanel.jsx
    L65-67: two-box seed from toBreakdown(r.suggest_qty, ...)
      → seeds "641" in major box, "330" in minor box (un-purchasable fraction)
```

**Fix granularity:** The rounding must happen at the **planner** level (before display), so that `suggest_qty` is already a whole-display-unit multiple when it reaches AutoShoppingList and SmartPurchasePanel. This keeps all downstream consumers (fmtBreak, two-box seed, rate hint, GroupedVendorPreview) automatically consistent.

## 4. Affected Files

### 4a. Files WILL change

| # | File | Change | Lines (est) |
|---|------|--------|:-----------:|
| E1 | `src/utils/quantityBreakdown.js` | Add `ceilToDisplayUnit(baseQty, factor)` helper | ~5 |
| E2 | `src/utils/purchasePlanner.js` L126 | Velocity rows: use `ceilToDisplayUnit` for `has_conversion` rows | ~3 |
| E3 | `src/utils/purchasePlanner.js` L173 | Alert rows: same `ceilToDisplayUnit` for `has_conversion` rows | ~3 |
| E4 | `src/__tests__/utils/purchasePlanner.cr387.test.js` (or new `.bug460.test.js`) | Test cases for rounded suggest_qty | ~20 |

**Total: 2 files modified + 1 test file (new or extended). ~31 lines.**

### 4b. Files will NOT touch

- `AutoShoppingList.jsx` — `fmtBreak(r.suggest_qty, r)` already renders the breakdown correctly; once `suggest_qty` is a whole-display-unit multiple, the minor part will be 0 → renders "642 bottle" naturally.
- `SmartPurchasePanel.jsx` — `toBreakdown(r.suggest_qty, ...)` will produce `{ major: 642, minor: 0 }` → seeds "642" / "" automatically.
- `GroupedVendorPreview.jsx` — inherits from rowQuantity, which reads the user-edited qty, not suggest_qty directly.
- `StockAuditPanel.jsx` — unrelated (Stock Audit, not Smart Purchase).
- `inventoryTransform.js` — unchanged (provides raw data to planner).
- No backend change.

## 5. Fix Design

### E1: New helper in `quantityBreakdown.js`

```js
// BUG-460: ceil base-unit quantity to the next whole display unit
export function ceilToDisplayUnit(baseQty, factor) {
  const f = Number(factor);
  if (!(f > 0) || baseQty <= 0) return Math.ceil(baseQty);
  return Math.ceil(baseQty / f) * f;
}
```

- Input: `baseQty` in base units (e.g. 211330 ml), `factor` (e.g. 330 ml/bottle)
- Output: base-unit quantity rounded UP to the next whole display unit (e.g. 211860 ml = 642 bottles × 330 ml)
- No-conversion rows (`factor <= 0`) fall through to `Math.ceil(baseQty)` — unchanged behaviour.

### E2: Velocity rows (`purchasePlanner.js` L126)

**Current:**
```js
const suggest = gap < 0 ? Math.ceil(-gap) : 0;
```

**Proposed:**
```js
const hasCnv = !!item.hasUnitConversion && (Number(item.conversionFactor) || 0) > 0
               && String(item.displayUnit || '').toLowerCase() !== String(unit).toLowerCase();
const suggest = gap < 0
  ? (hasCnv ? ceilToDisplayUnit(-gap, Number(item.conversionFactor)) : Math.ceil(-gap))
  : 0;
```

**Note:** The `hasCnv` expression mirrors the existing `has_conversion` computation on L138. We can reuse that by computing `has_conversion` earlier (before `suggest`), or inline the check. The plan will pick the cleaner approach at implementation.

### E3: Alert rows (`purchasePlanner.js` L173)

**Current:**
```js
suggest_qty: Math.ceil(threshold - onHand),
```

**Proposed:**
```js
suggest_qty: hasCnvAlert
  ? ceilToDisplayUnit(threshold - onHand, Number(item.conversionFactor))
  : Math.ceil(threshold - onHand),
```

Where `hasCnvAlert` mirrors the `has_conversion` check on L168.

### E4: Test cases

Extend `purchasePlanner.cr387.test.js` or create `purchasePlanner.bug460.test.js`:

| # | Test | Input | Expected |
|---|------|-------|----------|
| T1 | Velocity row, has_conversion, fractional gap | gap=-211330 ml, factor=330 → suggest=211860 (642×330) | 211860 |
| T2 | Velocity row, has_conversion, exact multiple | gap=-211200 ml, factor=330 → suggest=211200 (640×330) | 211200 |
| T3 | Velocity row, no conversion | gap=-641.3, factor=0 → suggest=642 | 642 |
| T4 | Alert row, has_conversion, fractional | threshold-onHand=2270, factor=330 → suggest=2310 (7×330) | 2310 |
| T5 | Alert row, no conversion | threshold-onHand=7.3, factor=0 → suggest=8 | 8 |
| T6 | No gap (onHand >= projected) | gap=100, factor=330 → suggest=0 | 0 |
| T7 | ceilToDisplayUnit helper, edge: baseQty=0 | ceilToDisplayUnit(0, 330) → 0 | 0 |
| T8 | ceilToDisplayUnit helper, exact multiple | ceilToDisplayUnit(660, 330) → 660 | 660 |

## 6. Downstream Impact Verification

| Consumer | Field | Impact | Action |
|----------|-------|--------|--------|
| AutoShoppingList Table 2 "Suggested Qty" (L344) | `r.suggest_qty` via `fmtBreak` | Now renders "642 bottle" (minor=0) instead of "641 bottle 330 ml" | ✅ Automatic — no change needed |
| AutoShoppingList Table 1 "suggest:" hint (L235) | `r.suggest_qty` via `fmtBreak` | Same — clean display | ✅ Automatic |
| SmartPurchasePanel two-box seed (L65-67) | `toBreakdown(r.suggest_qty, ...)` | Now seeds `{major:642, minor:0}` → "642" / "" | ✅ Automatic |
| SmartPurchasePanel rate hint (L240) | `rowQuantity(r).baseQty` or `r.suggest_qty` | Uses user-edited qty first; fallback `suggest_qty` is now correct | ✅ Automatic |
| GroupedVendorPreview (E-G1) | `rowQuantity(r)` | User-edited, not suggest; unaffected | ✅ No change |
| Projected Need (L211, L343) | `r.projected_need` | NOT touched per OD-460-03 (keep partial) | ✅ Unchanged |
| Gap (L212) | `r.gap` | NOT touched per OD-460-03 | ✅ Unchanged |

## 7. Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | Over-ordering: ceil always rounds up → slight overstock | LOW | Owner confirmed: "always rounds UP to the next whole unit" (OD-460-01). This is intentional. |
| R2 | No-conversion rows behaviour changes | LOW | `ceilToDisplayUnit` falls through to `Math.ceil()` when factor≤0 → identical to current behaviour. Test T3/T5. |
| R3 | Alert rows rounding inconsistent with velocity rows | LOW | Both use the same `ceilToDisplayUnit` helper (OD-460-02: yes). |
| R4 | `purchasePlanner.js` is shared by multiple consumers | MEDIUM | Only `suggest_qty` computation changes; `gap`, `projected_need`, `on_hand`, `velocity_per_day` all unchanged. Downstream consumers of `suggest_qty` benefit automatically (§6). |

## 8. Scope Estimate

- **SMALL**: 2 source files + 1 test file, ~31 lines total
- **No hotspot file** (R5 list): `purchasePlanner.js` and `quantityBreakdown.js` are not on the hotspot list
- **No backend change**
- **No API contract change**
- **No UI component change** (display inherits automatically)

## 9. Verification Matrix (seeds QA handover)

| # | File | Change | How to Verify | Automated? |
|---|------|--------|---------------|:---:|
| V1 | quantityBreakdown.js | ceilToDisplayUnit helper | Unit test T7, T8 | YES |
| V2 | purchasePlanner.js L126 | Velocity suggest_qty rounded | Unit test T1, T2, T3 | YES |
| V3 | purchasePlanner.js L173 | Alert suggest_qty rounded | Unit test T4, T5 | YES |
| V4 | purchasePlanner.js (no-conversion) | Unchanged behaviour | Unit test T3, T5, T6 | YES |
| V5 | AutoShoppingList Table 2 | "Suggested Qty" shows whole display unit | Browser: login QA_INV → Smart Purchase → converted row → read Suggested Qty | NO |
| V6 | AutoShoppingList Table 1 | "suggest:" hint shows whole display unit | Browser: same as V5, check hint text | NO |
| V7 | SmartPurchasePanel two-box seed | Seeds whole number in major, 0 in minor | Browser: click Buy on a converted row → check seeded qty | NO |
| V8 | Projected Need / Gap | Still shows partial breakdown (unchanged) | Browser: verify Projected Need/Gap still has partial like "641 bottle 330 ml" | NO |

## 10. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-460 → status: GATE_5A_IMPLEMENTED, sprint_key: sep_bug_closure
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add purchasePlanner.js + quantityBreakdown.js rows for BUG-460
- [ ] Code markers: // BUG-460 comment in every modified file
```

## 11. Next

Awaiting owner review → "Gate 3 GO" (Implementation Plan) → "Gate 4 GO" (code).
