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
  test('T8d negative → Math.ceil guard', () => {
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

describe('BUG-460 no-gap → item excluded from plan', () => {
  test('T6 sufficient stock → not in plan (gap >= 0, no alert)', () => {
    const stockInventory = [{
      id: 5, name: 'PLENTY', unit: 'ml', smallUnit: 'ml', displayUnit: 'bottle',
      calQuantity: 99999, conversionFactor: 650, hasUnitConversion: true,
      displayQtyParts: null, minQtyAlert: 0, isSubRecipe: false,
    }];
    const dcr = [{ ingredient_id: 5, total_consumed: '1000 ml' }];
    const rows = computePlan({ stockInventory, dcrStockSummary: dcr, horizonDays });
    // gap = 99999 - 1000 = 98999 > 0 → item excluded from plan (no velocity row, no alert)
    expect(rows.filter(r => r.ingredient_id === 5)).toHaveLength(0);
  });
});
