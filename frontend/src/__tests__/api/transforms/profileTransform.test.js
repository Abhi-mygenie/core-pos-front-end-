// T-05 Test: profileTransform.js should NOT have hardcoded preprod storage URL

describe('T-05 | profileTransform.js — No hardcoded preprod storage URL', () => {
  const filePath = require('path').resolve(__dirname, '../../../api/transforms/profileTransform.js');
  const fs = require('fs');

  test('Source code should NOT contain preprod.mygenie.online', () => {
    const source = fs.readFileSync(filePath, 'utf-8');
    expect(source).not.toContain('preprod.mygenie.online');
  });

  test('getImageUrl should return null for null/empty input', () => {
    const { fromAPI } = require('../../../api/transforms/profileTransform');
    
    const result = fromAPI.profileResponse({
      restaurants: [{ id: 1, name: 'Test', logo: null }],
    });
    expect(result.restaurant.logo).toBeNull();
  });

  test('getImageUrl should return full URL as-is when it starts with http', () => {
    const { fromAPI } = require('../../../api/transforms/profileTransform');
    
    const result = fromAPI.profileResponse({
      restaurants: [{ id: 1, name: 'Test', logo: 'https://cdn.example.com/logo.png' }],
    });
    expect(result.restaurant.logo).toBe('https://cdn.example.com/logo.png');
  });

  test('getImageUrl should prepend storage base for relative paths', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://prod.mygenie.online';
    jest.resetModules();
    const { fromAPI } = require('../../../api/transforms/profileTransform');
    
    const result = fromAPI.profileResponse({
      restaurants: [{ id: 1, name: 'Test', logo: 'images/logo.png' }],
    });
    // Should use env var base, NOT hardcoded preprod
    expect(result.restaurant.logo).not.toContain('preprod.mygenie.online');
    expect(result.restaurant.logo).toContain('images/logo.png');
  });
});

describe('Room Module V2 | profileTransform.js — checkInFlags exposure', () => {
  test('maps all Yes flags to booleans + preserves bill_date_format', () => {
    jest.resetModules();
    const { fromAPI } = require('../../../api/transforms/profileTransform');

    const result = fromAPI.profileResponse({
      restaurants: [{
        id: 1,
        name: 'Test',
        guest_details: 'Yes',
        booking_details: 'Yes',
        show_user_gst: 'Yes',
        room_gst_applicable: 'Yes',
        food_price_with_paisa: 'Yes',
        bill_date_format: 'dd-MM-yyyy HH:mm',
      }],
    });

    expect(result.restaurant.checkInFlags).toEqual({
      guestDetails: true,
      bookingDetails: true,
      showUserGst: true,
      roomGstApplicable: true,
      foodPriceWithPaisa: true,
      billDateFormat: 'dd-MM-yyyy HH:mm',
    });
  });

  test('maps all No flags to booleans + default bill_date_format when missing', () => {
    jest.resetModules();
    const { fromAPI } = require('../../../api/transforms/profileTransform');

    const result = fromAPI.profileResponse({
      restaurants: [{
        id: 1,
        name: 'Test',
        guest_details: 'No',
        booking_details: 'No',
        show_user_gst: 'No',
        room_gst_applicable: 'No',
        food_price_with_paisa: 'No',
      }],
    });

    expect(result.restaurant.checkInFlags).toEqual({
      guestDetails: false,
      bookingDetails: false,
      showUserGst: false,
      roomGstApplicable: false,
      foodPriceWithPaisa: false,
      billDateFormat: 'dd/MMM/yyyy hh:mm a',
    });
  });

  test('defaults all booleans to false and billDateFormat to default when keys are absent', () => {
    jest.resetModules();
    const { fromAPI } = require('../../../api/transforms/profileTransform');

    const result = fromAPI.profileResponse({
      restaurants: [{ id: 1, name: 'Test' }],
    });

    expect(result.restaurant.checkInFlags).toEqual({
      guestDetails: false,
      bookingDetails: false,
      showUserGst: false,
      roomGstApplicable: false,
      foodPriceWithPaisa: false,
      billDateFormat: 'dd/MMM/yyyy hh:mm a',
    });
  });
});

// =============================================================================
// BUG-AUTOKOT/AUTOBILL VISIBILITY (May-2026, REVISITED 2026-05-01)
// Regression coverage for autoKot/autoBill cooking from the actual backend
// keys — confirmed against the live preprod API on 2026-05-01:
//   restaurants[0].print_kot              -> cooked as settings.autoKot
//   restaurants[0].billing_auto_bill_print -> cooked as settings.autoBill
// Plus toBoolean acceptance for all common Yes/No-equivalent shapes.
// =============================================================================
describe('settings.autoKot / autoBill — toBoolean acceptance', () => {
  const { fromAPI } = require('../../../api/transforms/profileTransform');

  test.each([
    [true,    true],
    ['true',  true],
    ['TRUE',  true],
    ['Yes',   true],
    ['yes',   true],
    [1,       true],
    ['1',     true],
    ['on',    true],
    [false,     false],
    ['false',   false],
    ['No',      false],
    [0,         false],
    ['0',       false],
    ['off',     false],
    [null,      false],
    [undefined, false],
  ])('autoKot/autoBill input %p → %p', (input, expected) => {
    const r = fromAPI.settings({
      print_kot: input,
      billing_auto_bill_print: input,
    });
    expect(r.autoKot).toBe(expected);
    expect(r.autoBill).toBe(expected);
  });

  test('autoKot reads from print_kot — live API shape', () => {
    const r = fromAPI.settings({
      print_kot: 'Yes',
      billing_auto_bill_print: 'Yes',
    });
    expect(r.autoKot).toBe(true);
    expect(r.autoBill).toBe(true);
  });

  test('autoKot is false when print_kot is absent', () => {
    const r = fromAPI.settings({});
    expect(r.autoKot).toBe(false);
    expect(r.autoBill).toBe(false);
  });
});

// CR-POS2-003 (May-2026) — print_agent → restaurant.printerAgents mapping.
// Owner override 2026-05-08: v1 endpoint places `print_agent` at the TOP
// LEVEL of the response (not in `restaurants[0]`). Test fixtures updated
// accordingly.
describe('CR-POS2-003 | profileTransform.printerAgents from print_agent', () => {
  const { fromAPI } = require('../../../api/transforms/profileTransform');

  const buildProfile = (printAgent) => ({
    restaurants: [{ id: 1, name: 'T', logo: null }],
    print_agent: printAgent,
  });

  test('returns [] when print_agent is missing', () => {
    const r = fromAPI.profileResponse({ restaurants: [{ id: 1, name: 'T' }] });
    expect(r.restaurant.printerAgents).toEqual([]);
  });

  test('returns [] when print_agent is non-array', () => {
    const r = fromAPI.profileResponse(buildProfile({}));
    expect(r.restaurant.printerAgents).toEqual([]);
  });

  test('returns [] when print_agent is empty array', () => {
    const r = fromAPI.profileResponse(buildProfile([]));
    expect(r.restaurant.printerAgents).toEqual([]);
  });

  test('normalises a valid BILL entry preserving casing + types', () => {
    const r = fromAPI.profileResponse(buildProfile([{
      mapping: { area_name: 'BILL', default_employee_id: 3429 },
      printer_data: [{
        printer_name: 'EPSON_BILL',
        printer_ip: '192.168.0.10',
        printer_paper_roll: 58,
        vendor_id: null,
        product_id: null,
        wifi_printer_ip: null,
        wifi_printer_name: null,
      }],
    }]));
    expect(r.restaurant.printerAgents).toEqual([{
      station: 'BILL',
      printer_agent_id: '3429',
      printer_type: 'EPSON_BILL',
      printer_ip: '192.168.0.10',
      printer_paper_roll: '58',
      vendor_id: null,
      product_id: null,
      wifi_printer_ip: null,
      printer_name: null,
    }]);
  });

  test('skips entries with empty printer_data and blank area_name', () => {
    const r = fromAPI.profileResponse(buildProfile([
      { mapping: { area_name: 'BILL', default_employee_id: 1 }, printer_data: [] },
      { mapping: { area_name: '', default_employee_id: 2 }, printer_data: [{ printer_name: 'X' }] },
      { mapping: { area_name: 'KDS', default_employee_id: 3 }, printer_data: [{ printer_name: 'EPSON_KDS', printer_paper_roll: '80' }] },
    ]));
    expect(r.restaurant.printerAgents).toHaveLength(1);
    expect(r.restaurant.printerAgents[0].station).toBe('KDS');
    expect(r.restaurant.printerAgents[0].printer_agent_id).toBe('3');
  });

  test('uses printer_data[0] only and ignores [1..n]', () => {
    const r = fromAPI.profileResponse(buildProfile([{
      mapping: { area_name: 'BAR', default_employee_id: 5 },
      printer_data: [
        { printer_name: 'FIRST', printer_paper_roll: '58' },
        { printer_name: 'SECOND', printer_paper_roll: '80' },
      ],
    }]));
    expect(r.restaurant.printerAgents[0].printer_type).toBe('FIRST');
    expect(r.restaurant.printerAgents[0].printer_paper_roll).toBe('58');
  });

  test('preserves API order (no sort)', () => {
    const r = fromAPI.profileResponse(buildProfile([
      { mapping: { area_name: 'KDS' }, printer_data: [{ printer_name: 'A' }] },
      { mapping: { area_name: 'BILL', default_employee_id: 100 }, printer_data: [{ printer_name: 'B' }] },
      { mapping: { area_name: 'BAR' }, printer_data: [{ printer_name: 'C' }] },
    ]));
    expect(r.restaurant.printerAgents.map((a) => a.station)).toEqual(['KDS', 'BILL', 'BAR']);
  });
});

