// BUG-630 / BB-14 Phase B — verify parseTopFoodSalesRow reads r.net_sales (not r.total_sales)
// Fixtures are the VERIFIED preprod examples from BUG-630_BB-14_ITEM_SALES_FRONTEND_HANDOFF_2026_11_19.md
import { parseTopFoodSalesRow } from '../../../api/services/topFoodSalesService';

const hotGarlicSauce = {
  food_item: 'Hot Garlic Sauce', station_name: 'KDS', category_name: 'BOWL OF RICE / NOODLE',
  complementary_status: 'No', total_quantity: '27',
  item_price: '8073.00', variation_price: '0.00', addon_price: '0.00', discount: '0.00',
  gst: '403.65', vat: '0.00', service_charge: '2517.60', complementary_price: '0.00',
  net_sales: '8073.00', total_sales: '10994.25',
};

const gulabJamun = {
  food_item: 'Gulab Jamun (2 Pcs)', station_name: 'KDS', category_name: 'DESSERT',
  complementary_status: 'No', total_quantity: '45',
  item_price: '6705.00', variation_price: '0.00', addon_price: '0.00', discount: '395.99',
  gst: '315.46', vat: '0.00', service_charge: '0.00', complementary_price: '0.00',
  net_sales: '6309.01', total_sales: '6624.47',
};

const near = (a, b) => Math.abs(a - b) < 0.01;

describe('BUG-630 Phase B — topFoodSalesService.parseTopFoodSalesRow', () => {
  test('netSales reads r.net_sales (pre-tax), NOT r.total_sales', () => {
    const row = parseTopFoodSalesRow(hotGarlicSauce, 0);
    expect(near(row.netSales, 8073.00)).toBe(true);
    // regression: with service charge present, netSales must differ from totalSales
    expect(near(row.netSales, row.totalSales)).toBe(false);
  });

  test('totalSales reads corrected r.total_sales (service-inclusive)', () => {
    const row = parseTopFoodSalesRow(hotGarlicSauce, 0);
    expect(near(row.totalSales, 10994.25)).toBe(true);
  });

  test('tax = gst + vat + service_charge', () => {
    const row = parseTopFoodSalesRow(hotGarlicSauce, 0);
    expect(near(row.tax, 403.65 + 0 + 2517.60)).toBe(true); // 2921.25
  });

  test('identity: net_sales + tax == total_sales (per BB-14)', () => {
    [hotGarlicSauce, gulabJamun].forEach((r, i) => {
      const row = parseTopFoodSalesRow(r, i);
      expect(near(row.netSales + row.tax, row.totalSales)).toBe(true);
    });
  });

  test('net_sales reflects discount (Gulab Jamun = 6705 - 395.99)', () => {
    const row = parseTopFoodSalesRow(gulabJamun, 1);
    expect(near(row.netSales, 6309.01)).toBe(true);
    expect(near(row.discount, 395.99)).toBe(true);
  });

  test('missing net_sales -> 0 (no fallback to total_sales)', () => {
    const { net_sales, ...noNet } = hotGarlicSauce;
    const row = parseTopFoodSalesRow(noNet, 0);
    expect(row.netSales).toBe(0);
  });
});
