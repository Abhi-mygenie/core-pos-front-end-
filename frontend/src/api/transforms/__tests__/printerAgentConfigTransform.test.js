// CR-133: Printer Agent Config Transform tests
// Fixture = live GET evidence (restaurant 478, Gate 3 probe)
// Hard gate: V3 round-trip integrity — zero data loss through fromAPI→toAPI.

import {
  fromAPI,
  toAPI,
  normalizePrinter,
  denormalizePrinter,
  newPrinter,
  findReinjectedPrinters,
} from '../printerAgentConfigTransform';

const fixture = require('./fixtures/cr133_printer_agent_config.json');
const apiData = fixture.data;

const clone = (o) => JSON.parse(JSON.stringify(o));

describe('V2 — fromAPI maps all editable fields from live fixture', () => {
  const state = fromAPI(apiData);

  test('printers normalized (2 printers, camelCase, defaults)', () => {
    expect(state.printers).toHaveLength(2);
    const p0 = state.printers[0];
    expect(p0.id).toBe('printer_478_kds_001');
    expect(p0.label).toBe('Kitchen Printer');
    expect(p0.type).toBe('USB Printer');
    expect(p0.usbPrinterName).toBe('POS58 Printer');
    expect(p0.vendorId).toBe(''); // null → ''
    expect(p0.lanPort).toBe('9100'); // string, not number
    expect(p0.paperSize).toBe('58 mm');
    expect(p0.handledStations).toEqual(['KDS']);
    expect(p0.handlesBill).toBe(false);
    expect(state.printers[1].handlesBill).toBe(true);
  });

  test('global settings + toggles + copies', () => {
    expect(state.paperSize).toBe('58 mm');
    expect(state.printerType).toBe('USB Printer');
    expect(state.footerText).toBe('Powered by MyGenie');
    expect(state.billCopyCount).toBe(1);
    expect(state.kotCopyCount).toBe(1);
    expect(state.autoPrintBill).toBe(true);
    expect(state.autoPrintKot).toBe(true);
    expect(state.autoSettle).toBe(false);
    expect(state.aggregatorAutoBillStage).toBe('Acknowledged');
    expect(state.upiQrEnabled).toBe(false);
    expect(state.upiId).toBe(''); // null → ''
    expect(state.upiDynamicEnabled).toBe(false);
    expect(state.usePdfOnWindows).toBe(true);
    expect(state.showItemDateOn80mm).toBe(false);
  });

  test('style config normalized (sections, rows, bold as bool)', () => {
    expect(state.fontFamily).toBe(apiData.style_config.global_settings.font_family);
    expect(state.billStyle.restaurant_header.restaurant_name).toEqual({
      fontSize58: 12,
      fontSize80: 17,
      bold: true,
    });
    expect(Object.keys(state.billStyle)).toEqual(
      Object.keys(apiData.style_config.bill_print_style)
    );
    expect(Object.keys(state.kotStyle)).toEqual(
      Object.keys(apiData.style_config.kot_print_style)
    );
  });

  test('options sourced from raw (never hardcoded)', () => {
    expect(state.options.paperSizes).toEqual(['58 mm', '80 mm']); // note the space
    expect(state.options.fonts).toHaveLength(20);
    expect(state.options.aggregatorStages).toEqual(['Acknowledged', 'Food Ready']);
  });

  test('read-only restaurant info exposed', () => {
    expect(state.restaurantInfo.name).toBe('18march');
    expect(state.restaurantInfo.phone).toBe('9999999999');
  });
});

describe('V3 — HARD GATE: round-trip integrity (zero data loss)', () => {
  test('toAPI(fromAPI(fixture)) deep-equals fixture minus printer_configuration and top-level restaurant_id', () => {
    const result = toAPI(fromAPI(apiData));
    const expected = clone(apiData);
    delete expected.settings_config.printer_configuration;
    delete expected.restaurant_id;
    expect(result).toEqual(expected);
  });

  test('unknown keys preserved: server_configuration, api_authentication, field_visibility, windows/android objects, P1 leftovers', () => {
    const result = toAPI(fromAPI(apiData));
    expect(result.settings_config.server_configuration).toEqual(
      apiData.settings_config.server_configuration
    );
    expect(result.settings_config.api_authentication).toEqual(
      apiData.settings_config.api_authentication
    );
    expect(result.settings_config.field_visibility).toEqual(
      apiData.settings_config.field_visibility
    );
    // platform objects on style rows untouched
    expect(
      result.style_config.bill_print_style.restaurant_header.restaurant_name.windows
    ).toEqual(
      apiData.style_config.bill_print_style.restaurant_header.restaurant_name.windows
    );
    // P1 leftover keys survive
    expect(
      result.style_config.bill_print_style.restaurant_header.restaurant_name.alignment
    ).toBe('left');
    expect(
      result.style_config.bill_print_style.bill_information.row_1.content
    ).toBe('table_waiter');
    expect(
      result.style_config.bill_print_style.bill_information.row_1.visible
    ).toBe(false);
  });
});

describe('V4 — decimal font sizes survive round-trip as floats', () => {
  test('amount_section.paid_by 5.5 / 6.5 preserved', () => {
    const raw = apiData.style_config.bill_print_style.amount_section.paid_by;
    // fixture may carry ints on some rows; assert on paid_by specifically
    const state = fromAPI(apiData);
    expect(state.billStyle.amount_section.paid_by.fontSize58).toBe(raw.font_size_58mm);
    const result = toAPI(state);
    expect(result.style_config.bill_print_style.amount_section.paid_by.font_size_58mm).toBe(
      raw.font_size_58mm
    );
    // decimal-in / decimal-out guarantee
    const edited = fromAPI(apiData);
    edited.billStyle.amount_section.paid_by.fontSize58 = 5.5;
    const out = toAPI(edited);
    expect(out.style_config.bill_print_style.amount_section.paid_by.font_size_58mm).toBe(5.5);
  });
});

describe('V5 — edited fields land at the right API path with the right type', () => {
  test('toggles → "Yes"/"No" strings; copies → int; stage select', () => {
    const state = fromAPI(apiData);
    state.autoSettle = true;
    state.upiDynamicEnabled = true;
    state.billCopyCount = 3;
    state.aggregatorAutoBill = true;
    state.aggregatorAutoBillStage = 'Food Ready';
    const out = toAPI(state);
    expect(out.settings_config.auto_printing.auto_settle).toBe('Yes');
    expect(out.settings_config.qr_codes.upi_dynamic_enabled).toBe('Yes');
    expect(out.settings_config.print_copies.bill_copy_count).toBe(3);
    expect(out.settings_config.auto_printing.aggregator_auto_bill).toBe('Yes');
    expect(out.settings_config.auto_printing.aggregator_auto_bill_stage).toBe('Food Ready');
  });

  test('lan_port stays string; restaurant_configuration.restaurant_id stringified', () => {
    const state = fromAPI(apiData);
    state.printers[0].lanIpAddress = '192.168.1.50';
    state.printers[0].lanPort = '9101';
    // simulate raw carrying a numeric inner id
    state._raw.settings_config.restaurant_configuration.restaurant_id = 478;
    const out = toAPI(state);
    expect(out.settings_config.printers[0].lan_port).toBe('9101');
    expect(typeof out.settings_config.printers[0].lan_port).toBe('string');
    expect(out.settings_config.restaurant_configuration.restaurant_id).toBe('478');
  });

  test('nullable text: cleared input → null (matches GET shape)', () => {
    const state = fromAPI(apiData);
    state.upiId = '';
    state.printers[0].usbPrinterName = '';
    const out = toAPI(state);
    expect(out.settings_config.qr_codes.upi_id).toBeNull();
    expect(out.settings_config.printers[0].usb_printer_name).toBeNull();
  });

  test('top-level restaurant_id not sent; employee_id passthrough', () => {
    const out = toAPI(fromAPI(apiData));
    expect(out).not.toHaveProperty('restaurant_id');
    expect(out.employee_id).toBe(apiData.employee_id);
  });
});

describe('V6 — printer_configuration absent from POST body', () => {
  test('deleted from settings_config', () => {
    const out = toAPI(fromAPI(apiData));
    expect(out.settings_config).not.toHaveProperty('printer_configuration');
  });
});

describe('V7 — printer CRUD semantics', () => {
  test('new printer gets printer_new_* id and round-trips into POST', () => {
    const state = fromAPI(apiData);
    const added = newPrinter({ paperSize: state.paperSize });
    expect(added.id).toMatch(/^printer_new_\d+$/);
    added.label = 'Bar Printer';
    added.type = 'LAN Printer';
    added.lanIpAddress = '10.0.0.5';
    state.printers.push(added);
    const out = toAPI(state);
    expect(out.settings_config.printers).toHaveLength(3);
    const posted = out.settings_config.printers[2];
    expect(posted.id).toMatch(/^printer_new_\d+$/);
    expect(posted.label).toBe('Bar Printer');
    expect(posted.lan_ip_address).toBe('10.0.0.5');
    expect(posted.usb_printer_name).toBeNull(); // '' → null
  });

  test('delete removes printer from POST array', () => {
    const state = fromAPI(apiData);
    state.printers = state.printers.filter((p) => p.id !== 'printer_478_kds_001');
    const out = toAPI(state);
    expect(out.settings_config.printers).toHaveLength(1);
    expect(out.settings_config.printers[0].id).toBe('printer_478_bill_001');
  });

  test('normalize/denormalize are exact inverses on fixture printers', () => {
    apiData.settings_config.printers.forEach((raw) => {
      expect(denormalizePrinter(normalizePrinter(raw))).toEqual(raw);
    });
  });
});

describe('QA fix — findReinjectedPrinters (backend deep-merge re-injects deleted printers)', () => {
  const raw = apiData.settings_config.printers; // kds_001 + bill_001

  test('detects a locally-deleted printer that the server kept', () => {
    const sent = [normalizePrinter(raw[1])]; // user deleted kds_001
    const fresh = raw.map(normalizePrinter); // server re-injected it
    const reinjected = findReinjectedPrinters(raw, sent, fresh);
    expect(reinjected).toHaveLength(1);
    expect(reinjected[0].id).toBe('printer_478_kds_001');
  });

  test('no false positive on a clean save (nothing deleted)', () => {
    const sent = raw.map(normalizePrinter);
    const fresh = raw.map(normalizePrinter);
    expect(findReinjectedPrinters(raw, sent, fresh)).toHaveLength(0);
  });

  test('no false positive when backend re-keys a NEW printer', () => {
    const added = { ...newPrinter(), id: 'printer_new_123', label: 'Bar' };
    const sent = [...raw.map(normalizePrinter), added];
    // server accepted all, re-keyed printer_new_123 → printer_478_bar_001
    const fresh = [...raw.map(normalizePrinter), { ...added, id: 'printer_478_bar_001' }];
    expect(findReinjectedPrinters(raw, sent, fresh)).toHaveLength(0);
  });

  test('deletion that actually persisted produces no warning', () => {
    const sent = [normalizePrinter(raw[1])];
    const fresh = [normalizePrinter(raw[1])]; // server honored the delete
    expect(findReinjectedPrinters(raw, sent, fresh)).toHaveLength(0);
  });
});
