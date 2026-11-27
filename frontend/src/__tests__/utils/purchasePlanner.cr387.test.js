// CR-387 · purchasePlanner conversion metadata + rowQuantity
import { computePlan } from '@/utils/purchasePlanner';
import { rowQuantity } from '@/utils/quantityBreakdown';

const horizonDays = 7;

describe('CR-387 planner conversion metadata', () => {
  test('P1 converted velocity row carries fields; gap/suggest unchanged (base math)', () => {
    const stockInventory = [{
      id: 1, name: 'BAR BEER', unit: 'ml', smallUnit: 'ml', displayUnit: 'bottle',
      calQuantity: 5520, quantity: 8.49, conversionFactor: 650, hasUnitConversion: true,
      displayQtyParts: { major: 8, minor: 319 }, minQtyAlert: 0, isSubRecipe: false,
    }];
    const dcr = [{ ingredient_id: 1, total_consumed: '7000 ml' }];
    const [row] = computePlan({ stockInventory, dcrStockSummary: dcr, horizonDays });
    expect(row.has_conversion).toBe(true);
    expect(row.conversion_factor).toBe(650);
    expect(row.small_unit).toBe('ml');
    expect(row.display_qty_parts).toEqual({ major: 8, minor: 319 });
    expect(row.gap).toBe(-1480);       // 5520 - 7000, base math untouched
    expect(row.suggest_qty).toBe(1950); // BUG-460: was 1480 (base ceil), now 1950 (display-unit ceil = 3 bottles × 650 ml)
  });

  test('P2 no-conversion row → has_conversion false, factor 0', () => {
    const stockInventory = [{
      id: 2, name: 'CHIPS', unit: 'piece', smallUnit: 'piece', displayUnit: 'piece',
      calQuantity: 0, quantity: 0, conversionFactor: '', hasUnitConversion: false, minQtyAlert: 0, isSubRecipe: false,
    }];
    const dcr = [{ ingredient_id: 2, total_consumed: '10 piece' }];
    const [row] = computePlan({ stockInventory, dcrStockSummary: dcr, horizonDays });
    expect(row.has_conversion).toBe(false);
    expect(row.conversion_factor).toBe(0);
  });

  test('P3 alert (threshold) row carries the 4 fields', () => {
    const stockInventory = [{
      id: 3, name: 'FLOUR', unit: 'gm', smallUnit: 'gm', displayUnit: 'pkt',
      calQuantity: 1000, quantity: 1.25, conversionFactor: 800, hasUnitConversion: true,
      displayQtyParts: { major: 1, minor: 200 }, minQtyAlert: 5, isSubRecipe: false,
    }];
    // no DCR → not in velocity path → threshold path (5*800=4000 > 1000)
    const [row] = computePlan({ stockInventory, dcrStockSummary: [], horizonDays });
    expect(row.origin).toBe('stock_alert');
    expect(row.has_conversion).toBe(true);
    expect(row.conversion_factor).toBe(800);
    expect(row.small_unit).toBe('gm');
    expect(row.display_qty_parts).toEqual({ major: 1, minor: 200 });
  });

  test('P4 displayUnit===smallUnit with factor 1 → has_conversion false', () => {
    const stockInventory = [{
      id: 4, name: 'RICE', unit: 'kg', smallUnit: 'kg', displayUnit: 'kg',
      calQuantity: 0, quantity: 0, conversionFactor: 1, hasUnitConversion: true, minQtyAlert: 0, isSubRecipe: false,
    }];
    const dcr = [{ ingredient_id: 4, total_consumed: '10 kg' }];
    const [row] = computePlan({ stockInventory, dcrStockSummary: dcr, horizonDays });
    expect(row.has_conversion).toBe(false);
  });
});

describe('CR-387 rowQuantity', () => {
  test('converted', () => {
    const r = rowQuantity({ has_conversion: true, qty_major: '2', qty_minor: '0', conversion_factor: 650, display_unit: 'bottle', small_unit: 'ml', unit: 'ml' });
    expect(r.displayQty).toBe(2); expect(r.baseQty).toBe(1300); expect(r.unit).toBe('bottle'); expect(r.text).toBe('2 bottle');
  });
  test('converted with minor', () => {
    const r = rowQuantity({ has_conversion: true, qty_major: '2', qty_minor: '150', conversion_factor: 650, display_unit: 'bottle', small_unit: 'ml', unit: 'ml' });
    expect(r.baseQty).toBe(1450); expect(r.text).toBe('2 bottle 150 ml');
  });
  test('no conversion', () => {
    const r = rowQuantity({ qty_major: '5', unit: 'kg' });
    expect(r.displayQty).toBe(5); expect(r.baseQty).toBe(5); expect(r.unit).toBe('kg'); expect(r.text).toBe('5 kg');
  });
  test('empty', () => {
    const r = rowQuantity(null);
    expect(r.displayQty).toBe(0); expect(r.baseQty).toBe(0);
  });
});
