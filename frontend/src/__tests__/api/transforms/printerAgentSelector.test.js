// CR-POS2-003 (May-2026) — printerAgentSelector unit tests.

const {
  BILL_STATION_LABEL,
  normalizePrinterAgent,
  selectAgentsForBill,
  selectAgentsForKot,
  cartStationsToSet,
} = require('../../../api/transforms/printerAgentSelector');

describe('CR-POS2-003 | printerAgentSelector', () => {
  describe('BILL_STATION_LABEL', () => {
    test('is the literal "BILL"', () => {
      expect(BILL_STATION_LABEL).toBe('BILL');
    });
  });

  describe('normalizePrinterAgent', () => {
    test('returns null for null / non-object input', () => {
      expect(normalizePrinterAgent(null)).toBeNull();
      expect(normalizePrinterAgent(undefined)).toBeNull();
      expect(normalizePrinterAgent('x')).toBeNull();
    });

    test('returns null when printer_data is empty (OQ-PA-5)', () => {
      expect(normalizePrinterAgent({ mapping: { area_name: 'BILL' }, printer_data: [] })).toBeNull();
    });

    test('returns null when printer_data is missing/non-array (OQ-PA-5)', () => {
      expect(normalizePrinterAgent({ mapping: { area_name: 'BILL' } })).toBeNull();
      expect(normalizePrinterAgent({ mapping: { area_name: 'BILL' }, printer_data: 'x' })).toBeNull();
    });

    test('returns null when area_name is blank/missing (OQ-PA-6)', () => {
      expect(normalizePrinterAgent({ mapping: { area_name: '' }, printer_data: [{}] })).toBeNull();
      expect(normalizePrinterAgent({ mapping: { area_name: '   ' }, printer_data: [{}] })).toBeNull();
      expect(normalizePrinterAgent({ mapping: {}, printer_data: [{}] })).toBeNull();
    });

    test('preserves verbatim casing on station (R-OWNER-1)', () => {
      const out = normalizePrinterAgent({
        mapping: { area_name: 'PaStRy' },
        printer_data: [{ printer_name: 'X' }],
      });
      expect(out.station).toBe('PaStRy');
    });

    test('coerces printer_agent_id and printer_paper_roll to string (R-OWNER-3)', () => {
      const out = normalizePrinterAgent({
        mapping: { area_name: 'BILL', default_employee_id: 3429 },
        printer_data: [{ printer_paper_roll: 58 }],
      });
      expect(out.printer_agent_id).toBe('3429');
      expect(out.printer_paper_roll).toBe('58');
    });

    test('null/undefined IDs become empty string (R-OWNER-3)', () => {
      const out = normalizePrinterAgent({
        mapping: { area_name: 'BILL' },
        printer_data: [{}],
      });
      expect(out.printer_agent_id).toBe('');
      expect(out.printer_paper_roll).toBe('');
    });

    test('preserves null for passthrough fields (R-OWNER-4)', () => {
      const out = normalizePrinterAgent({
        mapping: { area_name: 'BILL', default_employee_id: 1 },
        printer_data: [{
          printer_name: null, printer_ip: null, vendor_id: null,
          product_id: null, wifi_printer_ip: null, wifi_printer_name: null,
        }],
      });
      expect(out.printer_type).toBeNull();
      expect(out.printer_ip).toBeNull();
      expect(out.vendor_id).toBeNull();
      expect(out.product_id).toBeNull();
      expect(out.wifi_printer_ip).toBeNull();
      expect(out.printer_name).toBeNull();
    });

    test('uses printer_data[0] only (R-OWNER-5)', () => {
      const out = normalizePrinterAgent({
        mapping: { area_name: 'KDS' },
        printer_data: [
          { printer_name: 'FIRST', printer_paper_roll: '58' },
          { printer_name: 'SECOND', printer_paper_roll: '80' },
        ],
      });
      expect(out.printer_type).toBe('FIRST');
      expect(out.printer_paper_roll).toBe('58');
    });
  });

  describe('selectAgentsForBill', () => {
    const agents = [
      { station: 'KDS', printer_agent_id: '1' },
      { station: 'BILL', printer_agent_id: '2' },
      { station: 'BAR', printer_agent_id: '3' },
    ];

    test('returns only the BILL agent (R-OWNER-7)', () => {
      const res = selectAgentsForBill(agents);
      expect(res).toHaveLength(1);
      expect(res[0].station).toBe('BILL');
    });

    test('matches case-insensitive (R-OWNER-2)', () => {
      const res = selectAgentsForBill([
        { station: 'bill', printer_agent_id: '9' },
        { station: '  Bill ', printer_agent_id: '10' },
        { station: 'KDS' },
      ]);
      expect(res).toHaveLength(2);
      expect(res.map((a) => a.station)).toEqual(['bill', '  Bill ']);
    });

    test('returns [] for non-array / no BILL match', () => {
      expect(selectAgentsForBill(null)).toEqual([]);
      expect(selectAgentsForBill([])).toEqual([]);
      expect(selectAgentsForBill([{ station: 'KDS' }])).toEqual([]);
    });
  });

  describe('selectAgentsForKot', () => {
    const agents = [
      { station: 'KDS', printer_agent_id: '1' },
      { station: 'BAR', printer_agent_id: '2' },
      { station: 'BILL', printer_agent_id: '3' },
      { station: 'PASTRY', printer_agent_id: '4' }, // BE-PA8 dynamic label
      { station: 'GRILL', printer_agent_id: '5' },  // BE-PA8 dynamic label
    ];

    test('matches the cart-station set; excludes BILL (R-OWNER-8)', () => {
      const res = selectAgentsForKot(agents, ['KDS', 'BAR']);
      expect(res.map((a) => a.station)).toEqual(['KDS', 'BAR']);
    });

    test('does not include BILL even if explicitly in stationSet (R-OWNER-8)', () => {
      const res = selectAgentsForKot(agents, ['BILL', 'KDS']);
      expect(res.map((a) => a.station)).toEqual(['KDS']);
    });

    test('handles dynamic labels (BE-PA8): PASTRY / GRILL', () => {
      const res = selectAgentsForKot(agents, ['PASTRY', 'GRILL']);
      expect(res.map((a) => a.station)).toEqual(['PASTRY', 'GRILL']);
    });

    test('preserves API order (OQ-PA-12)', () => {
      const res = selectAgentsForKot(agents, ['BAR', 'KDS']);
      expect(res.map((a) => a.station)).toEqual(['KDS', 'BAR']);
    });

    test('silently ignores cart stations with no agent match (OQ-PA-14)', () => {
      const res = selectAgentsForKot(agents, ['KDS', 'NONEXISTENT', 'BAR']);
      expect(res.map((a) => a.station)).toEqual(['KDS', 'BAR']);
    });

    test('case-insensitive matching with backend casing in output (R-OWNER-2 + R-OWNER-1)', () => {
      const res = selectAgentsForKot(agents, ['kds', '  Bar  ']);
      expect(res.map((a) => a.station)).toEqual(['KDS', 'BAR']);
    });

    test('returns [] for missing/empty stationSet', () => {
      expect(selectAgentsForKot(agents, [])).toEqual([]);
      expect(selectAgentsForKot(agents, null)).toEqual([]);
      expect(selectAgentsForKot(agents, ['', '   '])).toEqual([]);
    });

    test('returns [] for non-array printerAgents', () => {
      expect(selectAgentsForKot(null, ['KDS'])).toEqual([]);
    });
  });

  describe('cartStationsToSet', () => {
    test('returns [] for non-array input', () => {
      expect(cartStationsToSet(null)).toEqual([]);
      expect(cartStationsToSet(undefined)).toEqual([]);
    });

    test('extracts distinct trimmed station values, preserving casing', () => {
      const items = [
        { station: 'KDS' },
        { station: 'BAR' },
        { station: 'kds' }, // distinct case → distinct entry (preserve casing for downstream selector)
        { station: '  KDS  ' }, // trimmed → duplicate of 'KDS'
        { station: '' },
        { station: null },
        { station: 'PASTRY' },
      ];
      const out = cartStationsToSet(items);
      expect(out).toContain('KDS');
      expect(out).toContain('BAR');
      expect(out).toContain('PASTRY');
      // 'kds' lowercase remains because Set preserves casing; downstream
      // selector applies case-insensitive match.
      expect(out).toContain('kds');
      // Empty / null are dropped.
      expect(out).not.toContain('');
      expect(out).not.toContain(null);
    });
  });
});
