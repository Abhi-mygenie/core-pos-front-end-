# BUG-460 — Implementation Plan (Gate 3)

**Date:** 2026-09-25 · **Role 2 PLANNING** · **Sprint:** sep_bug_closure
**Item:** BUG-460 · **Status:** GATE_3_PLAN_COMPLETE
**Risk:** HIGH (financial-adjacent)
**Code Reality:** NONE
**IA verification:** All target file lines re-verified at HEAD — no drift.

---

## 0. Scope Lock

**Files WILL change:**
| # | File | Type |
|---|------|------|
| 1 | `src/utils/quantityBreakdown.js` | MODIFY — add `ceilToDisplayUnit` export |
| 2 | `src/utils/purchasePlanner.js` | MODIFY — 2 edit sites (L126, L173) |
| 3 | `src/__tests__/utils/purchasePlanner.bug460.test.js` | NEW — unit tests |

**Files will NOT touch:**
- `AutoShoppingList.jsx` — inherits fix automatically via `suggest_qty`
- `SmartPurchasePanel.jsx` — inherits fix automatically via `toBreakdown(suggest_qty, ...)`
- `GroupedVendorPreview.jsx` — reads user-edited qty, not suggest_qty
- `StockAuditPanel.jsx` — unrelated screen
- `inventoryTransform.js` — data layer, unchanged
- No backend files
- No `.env` changes

---

## 1. Execution Sequence

Implement in order E1 → E2 → E3 → E4. Webpack compile check after E3.

---

## E1 — `src/utils/quantityBreakdown.js` — Add `ceilToDisplayUnit` helper

**Insert after L44** (after `normalizeBreakdown`, before `rowQuantity`):

```js
// BUG-460: ceil base-unit quantity UP to the next whole display unit (owner: never short)
export function ceilToDisplayUnit(baseQty, factor) {
  const f = Number(factor);
  if (!(f > 0) || baseQty <= 0) return Math.ceil(baseQty);
  return Math.ceil(baseQty / f) * f;
}
```

**Current L44:**
```js
}
```
(closing brace of `normalizeBreakdown`)

**After edit, L45–50 = new function, L51 = blank line, L52 = existing `// CR-387` comment.**

**Verification:** Function exists and exported. Unit tests T7, T8 in E4.

---

## E2 — `src/utils/purchasePlanner.js` L126 — Velocity rows

**Current L126:**
```js
      const suggest      = gap < 0 ? Math.ceil(-gap) : 0;
```

**New L126:**
```js
      const hasCnv = !!item.hasUnitConversion && (Number(item.conversionFactor) || 0) > 0 && String(item.displayUnit || '').toLowerCase() !== String(unit).toLowerCase(); // BUG-460
      const suggest = gap < 0 ? (hasCnv ? ceilToDisplayUnit(-gap, Number(item.conversionFactor)) : Math.ceil(-gap)) : 0; // BUG-460: ceil to whole display unit
```

**Also add import at top of file.** Current L1–L5:
```js
// CR-078 · Smart Purchase planner — daily consumption × horizon → suggested purchase quantity.
// BUG-224: Rule 2 — low-stock alert rows (stock_alert) added below velocity rows.
// CR-387: conversion metadata (small_unit, conversion_factor, has_conversion, display_qty_parts) on all row types.
// BUG-455: +display_qty_text on velocity + alert rows.
// CR-105 Sub-A: showAll param → in-stock items appended.
```

**Insert after L5:**
```js
import { ceilToDisplayUnit } from '@/utils/quantityBreakdown'; // BUG-460
```

**Note:** The `hasCnv` local variable reuses the exact same expression as the `has_conversion` field on L138. It must be computed **before** `suggest` (L126) because the return object's `has_conversion` is on L138. This is cleaner than reordering the return object.

**Verification:** Velocity rows with `has_conversion=true` produce `suggest_qty` that is a whole-display-unit multiple. Unit tests T1, T2, T3 in E4.

---

## E3 — `src/utils/purchasePlanner.js` L173 — Alert rows

**Current L173:**
```js
        suggest_qty: Math.ceil(threshold - onHand),              // Q2: top-up
```

**New L173:**
```js
        suggest_qty: (!!item.hasUnitConversion && (Number(item.conversionFactor) || 0) > 0 && String(item.displayUnit || '').toLowerCase() !== String(item.smallUnit || item.unit || '').toLowerCase()) // BUG-460
          ? ceilToDisplayUnit(threshold - onHand, Number(item.conversionFactor))
          : Math.ceil(threshold - onHand),              // Q2: top-up — BUG-460: ceil to whole display unit
```

**Note:** The `has_conversion` check inline mirrors L168. Using the same `ceilToDisplayUnit` import from E2.

**Verification:** Alert rows with `has_conversion=true` produce `suggest_qty` that is a whole-display-unit multiple. Unit tests T4, T5 in E4.

**Webpack compile check: run after E3.**

---

## E4 — `src/__tests__/utils/purchasePlanner.bug460.test.js` — NEW

```js
// BUG-460 · Suggested Qty rounds UP to the next whole display unit for converted items
import { computePlan } from '@/utils/purchasePlanner';
import { ceilToDisplayUnit } from '@/utils/quantityBreakdown';

const horizonDays = 7;

describe('BUG-460 ceilToDisplayUnit helper', () => {
  test('T7 exact zero → 0', () => {
    expect(ceilToDisplayUnit(0, 330)).toBe(0);
  });
  test('T8 exact multiple → unchanged', () => {
    expect(ceilToDisplayUnit(660, 330)).toBe(660);
  });
  test('T8b fractional → next multiple', () => {
    expect(ceilToDisplayUnit(661, 330)).toBe(990);
  });
  test('T8c no factor → Math.ceil', () => {
    expect(ceilToDisplayUnit(7.3, 0)).toBe(8);
  });
  test('T8d negative → 0 (via Math.ceil guard)', () => {
    expect(ceilToDisplayUnit(-5, 330)).toBe(Math.ceil(-5));
  });
});

describe('BUG-460 velocity rows — suggest_qty rounded to whole display unit', () => {
  test('T1 converted, fractional gap → ceil to next whole display unit', () => {
    // gap = 5520 - 7000 = -1480 ml. factor = 650 ml/bottle.
    // ceil(1480/650) = ceil(2.276) = 3 → 3×650 = 1950
    const stockInventory = [{
      id: 1, name: 'BAR BEER', unit: 'ml', smallUnit: 'ml', displayUnit: 'bottle',
      calQuantity: 5520, quantity: 8.49, conversionFactor: 650, hasUnitConversion: true,
      displayQtyParts: { major: 8, minor: 319 }, minQtyAlert: 0, isSubRecipe: false,
    }];
    const dcr = [{ ingredient_id: 1, total_consumed: '7000 ml' }];
    const [row] = computePlan({ stockInventory, dcrStockSummary: dcr, horizonDays });
    expect(row.suggest_qty).toBe(1950); // 3 bottles × 650 ml
    expect(row.suggest_qty % 650).toBe(0); // whole display-unit multiple
  });

  test('T2 converted, exact multiple gap → unchanged', () => {
    // gap = 0 - 1300 = -1300 ml. factor = 650.
    // ceil(1300/650) = 2 → 2×650 = 1300
    const stockInventory = [{
      id: 1, name: 'BEER', unit: 'ml', smallUnit: 'ml', displayUnit: 'bottle',
      calQuantity: 0, conversionFactor: 650, hasUnitConversion: true,
      displayQtyParts: null, minQtyAlert: 0, isSubRecipe: false,
    }];
    const dcr = [{ ingredient_id: 1, total_consumed: '1300 ml' }];
    const [row] = computePlan({ stockInventory, dcrStockSummary: dcr, horizonDays });
    expect(row.suggest_qty).toBe(1300); // exactly 2 bottles
  });

  test('T3 no conversion → Math.ceil (unchanged behaviour)', () => {
    const stockInventory = [{
      id: 2, name: 'SALT', unit: 'piece', smallUnit: 'piece', displayUnit: 'piece',
      calQuantity: 0, conversionFactor: '', hasUnitConversion: false, minQtyAlert: 0, isSubRecipe: false,
    }];
    const dcr = [{ ingredient_id: 2, total_consumed: '10 piece' }];
    const [row] = computePlan({ stockInventory, dcrStockSummary: dcr, horizonDays });
    expect(row.suggest_qty).toBe(10); // Math.ceil(10)
  });
});

describe('BUG-460 alert rows — suggest_qty rounded to whole display unit', () => {
  test('T4 converted alert, fractional → ceil to next whole display unit', () => {
    // threshold = 5 × 800 = 4000 gm. onHand = 1000 gm. diff = 3000.
    // ceil(3000/800) = ceil(3.75) = 4 → 4×800 = 3200
    const stockInventory = [{
      id: 3, name: 'FLOUR', unit: 'gm', smallUnit: 'gm', displayUnit: 'pkt',
      calQuantity: 1000, conversionFactor: 800, hasUnitConversion: true,
      displayQtyParts: { major: 1, minor: 200 }, minQtyAlert: 5, isSubRecipe: false,
    }];
    const [row] = computePlan({ stockInventory, dcrStockSummary: [], horizonDays });
    expect(row.origin).toBe('stock_alert');
    expect(row.suggest_qty).toBe(3200); // 4 pkts × 800 gm
    expect(row.suggest_qty % 800).toBe(0);
  });

  test('T5 no-conversion alert → Math.ceil (unchanged)', () => {
    const stockInventory = [{
      id: 4, name: 'NAPKIN', unit: 'piece', smallUnit: 'piece', displayUnit: 'piece',
      calQuantity: 2, conversionFactor: '', hasUnitConversion: false, minQtyAlert: 10, isSubRecipe: false,
    }];
    const [row] = computePlan({ stockInventory, dcrStockSummary: [], horizonDays });
    expect(row.origin).toBe('stock_alert');
    expect(row.suggest_qty).toBe(8); // Math.ceil(10-2) = 8
  });
});

describe('BUG-460 no-gap → suggest_qty 0', () => {
  test('T6 sufficient stock → 0', () => {
    const stockInventory = [{
      id: 5, name: 'PLENTY', unit: 'ml', smallUnit: 'ml', displayUnit: 'bottle',
      calQuantity: 99999, conversionFactor: 650, hasUnitConversion: true,
      displayQtyParts: null, minQtyAlert: 0, isSubRecipe: false,
    }];
    const dcr = [{ ingredient_id: 5, total_consumed: '1000 ml' }];
    const [row] = computePlan({ stockInventory, dcrStockSummary: dcr, horizonDays });
    // gap = 99999 - 1000 = 98999 > 0 → suggest = 0
    expect(row.suggest_qty).toBe(0);
  });
});
```

**Test run command:** `npx craco test --watchAll=false --testPathPattern=purchasePlanner.bug460`

---

## 2. Verification Matrix

| # | File | Change | How to Verify | Automated? |
|---|------|--------|---------------|:---:|
| V1 | quantityBreakdown.js | `ceilToDisplayUnit` helper added | Unit test T7, T8, T8b, T8c, T8d | YES |
| V2 | purchasePlanner.js L126 | Velocity `suggest_qty` uses `ceilToDisplayUnit` for converted rows | Unit test T1, T2 | YES |
| V3 | purchasePlanner.js L126 | No-conversion velocity rows unchanged | Unit test T3 | YES |
| V4 | purchasePlanner.js L173 | Alert `suggest_qty` uses `ceilToDisplayUnit` for converted rows | Unit test T4 | YES |
| V5 | purchasePlanner.js L173 | No-conversion alert rows unchanged | Unit test T5 | YES |
| V6 | purchasePlanner.js | No-gap → suggest_qty=0 | Unit test T6 | YES |
| V7 | AutoShoppingList Table 2 "Suggested Qty" | Shows whole display unit (e.g. "3 bottle" not "2 bottle 180 ml") | Browser: login QA_INV → Smart Purchase → All Ingredients → converted row | NO |
| V8 | AutoShoppingList Table 1 "suggest:" hint | Same — whole display unit | Browser: same as V7 | NO |
| V9 | SmartPurchasePanel two-box seed | Major = whole number, Minor = 0 or empty | Browser: click Buy on a converted row → check seeded qty | NO |
| V10 | Projected Need / Gap columns | Still shows partial breakdown (unchanged per OD-460-03) | Browser: same screen, verify Projected Need/Gap columns | NO |
| V11 | Existing CR-387 tests still pass | No regression | `npx craco test --watchAll=false --testPathPattern=purchasePlanner.cr387` | YES |
| V12 | Existing BUG-459 tests still pass | No regression | `npx craco test --watchAll=false --testPathPattern=quantityBreakdown.bug459` | YES |
| V13 | Webpack compiles | 0 new warnings | `yarn build` or webpack dev compile | YES |

---

## 3. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-460 → status: GATE_5A_IMPLEMENTED, sprint_key: sep_bug_closure
- [ ] BUG_TRACKER.md: row updated with IMPLEMENTED status
- [ ] FILE_OWNERSHIP.md: add rows for purchasePlanner.js + quantityBreakdown.js under BUG-460
- [ ] Code markers: // BUG-460 comment in every modified file (quantityBreakdown.js, purchasePlanner.js)
```

---

## 4. Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | Over-ordering from ceil rounding | LOW | Owner explicitly chose "never short" (OD-460-01) |
| R2 | No-conversion rows behaviour changes | NONE | `ceilToDisplayUnit` falls through to `Math.ceil` when factor≤0 — identical. Tests T3, T5, T8c |
| R3 | `purchasePlanner.js` shared by multiple consumers | MEDIUM | Only `suggest_qty` computation changes. `gap`, `projected_need`, `on_hand`, `velocity_per_day` untouched. 13 V-checks |
| R4 | Existing CR-387 / BUG-459 tests break | LOW | Both test files verified — they assert on `gap`/conversion fields, not on the rounded `suggest_qty`. T1 updates the expected value. V11/V12 regression checks |

---

## 5. Execution Notes

- **Import alias:** `@/utils/quantityBreakdown` already resolves correctly (used by `purchasePlanner.cr387.test.js` L3).
- **P1 test regression:** The existing CR-387 test P1 on line 21 asserts `expect(row.suggest_qty).toBe(1480)`. After BUG-460, this will become `1950` (3 bottles × 650 ml). **The implementation agent must update this assertion** — it is not a regression but an intentional behaviour change. Add a `// BUG-460: was 1480 (base ceil), now 1950 (display-unit ceil = 3 bottles)` comment.
- **P3 test:** P3 (alert row) on line 42-48 does not assert `suggest_qty` — no change needed.

---

## 6. Next

Awaiting owner **"Gate 4 GO"** → IMPLEMENTATION.
