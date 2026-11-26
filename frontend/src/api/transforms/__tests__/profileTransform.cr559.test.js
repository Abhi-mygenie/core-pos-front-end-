// CR-559 — profileTransform.settings maps scan_order_auto_print (nested, with root fallback)
import { fromAPI } from '../profileTransform';

describe('CR-559 | profileTransform settings.scanOrderAutoPrint', () => {
  test('maps nested restaurants[0].settings.scan_order_auto_print = "Yes" → true', () => {
    const out = fromAPI.settings({ settings: { scan_order_auto_print: 'Yes' } });
    expect(out.scanOrderAutoPrint).toBe(true);
  });

  test('maps root scan_order_auto_print fallback = "Yes" → true', () => {
    const out = fromAPI.settings({ scan_order_auto_print: 'Yes' });
    expect(out.scanOrderAutoPrint).toBe(true);
  });

  test('"No" → false', () => {
    const out = fromAPI.settings({ settings: { scan_order_auto_print: 'No' } });
    expect(out.scanOrderAutoPrint).toBe(false);
  });

  test('absent → false', () => {
    const out = fromAPI.settings({ settings: {} });
    expect(out.scanOrderAutoPrint).toBe(false);
  });
});
