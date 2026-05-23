// printerAgentSelector.js
// CR-POS2-003 (May-2026) — Print Agent Mapping helpers (atomic single PR).
//
// Pure functions only. No React, no axios, no JSX, no side effects.
// Contract gates honoured (see implementation handover §3 / plan §5):
//   - R-OWNER-1  : preserve backend casing in output `station` and matched entries.
//   - R-OWNER-2  : station matching is case-insensitive (trim + lowercase compare).
//   - R-OWNER-3  : `printer_agent_id` and `printer_paper_roll` always emitted as string.
//                  null/undefined → ''.
//   - R-OWNER-4  : preserve `null` for all other passthrough fields (ip / vendor_id /
//                  product_id / wifi_printer_ip / printer_name / printer_type).
//   - R-OWNER-5  : use `printer_data[0]` only; ignore [1..n].
//   - R-OWNER-7  : BILL agent only for bill print (case-insensitive match on 'BILL').
//   - R-OWNER-8  : KOT — match cart-station set; exclude BILL.
//   - R-OWNER-9  : same KOT selector reused for place-order with print_kot:'Yes'.
//   - OQ-PA-5    : skip entries whose `printer_data` is empty.
//   - OQ-PA-6    : skip entries whose `mapping.area_name` is missing or blank.
//   - OQ-PA-12   : preserve API order (no sort).
//   - OQ-PA-14   : silently ignore unmatched cart stations (no phantom entries).
//   - BE-PA8     : station labels are dynamic (KDS/BAR/PASTRY/GRILL/etc.). The
//                  ONLY hard-coded literal in this file is the BILL sentinel,
//                  which is documented as a future tenant-config override.

export const BILL_STATION_LABEL = 'BILL';

// R-OWNER-2 / OQ-PA-15: case-insensitive comparator with both sides trimmed.
function matchStation(a, b) {
  if (a == null || b == null) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

// Single-row normaliser. Returns null when the entry is unusable so the caller
// can `.filter(Boolean)`. Honours OQ-PA-5/6 + R-OWNER-1/3/4/5.
export function normalizePrinterAgent(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const mapping = raw.mapping || {};
  const printerData = Array.isArray(raw.printer_data) ? raw.printer_data : [];

  // OQ-PA-5: skip entries with no printer data.
  if (printerData.length === 0) return null;

  const station = mapping.area_name;
  // OQ-PA-6: skip entries with missing/blank area_name.
  if (station == null || (typeof station === 'string' && station.trim() === '')) {
    return null;
  }

  const p = printerData[0]; // R-OWNER-5: index [0] only.

  // R-OWNER-3: string coercion for ID + paper roll. null/undefined → ''.
  const toStrFlexible = (v) => (v == null ? '' : String(v));
  // R-OWNER-4: preserve null for everything else.
  const passthroughOrNull = (v) => (v === undefined ? null : v);

  return {
    station, // R-OWNER-1: verbatim casing.
    printer_agent_id:    toStrFlexible(mapping.default_employee_id),
    printer_type:        passthroughOrNull(p.printer_name),
    printer_ip:          passthroughOrNull(p.printer_ip),
    printer_paper_roll:  toStrFlexible(p.printer_paper_roll),
    vendor_id:           passthroughOrNull(p.vendor_id),
    product_id:          passthroughOrNull(p.product_id),
    wifi_printer_ip:     passthroughOrNull(p.wifi_printer_ip),
    printer_name:        passthroughOrNull(p.wifi_printer_name),
  };
}

// R-OWNER-7: BILL agent only. Output preserves backend casing per R-OWNER-1.
// OQ-PA-12: preserve API order.
export function selectAgentsForBill(printerAgents) {
  if (!Array.isArray(printerAgents)) return [];
  return printerAgents.filter((a) => matchStation(a && a.station, BILL_STATION_LABEL));
}

// R-OWNER-8 / R-OWNER-9: KOT — match cart-station set; exclude BILL.
// OQ-PA-12 / OQ-PA-14: preserve API order; silently ignore unmatched cart stations.
export function selectAgentsForKot(printerAgents, stationSet) {
  if (!Array.isArray(printerAgents)) return [];
  if (!Array.isArray(stationSet) || stationSet.length === 0) return [];

  const wantedNorm = stationSet
    .filter((s) => s != null && String(s).trim() !== '')
    .map((s) => String(s).trim().toLowerCase());

  if (wantedNorm.length === 0) return [];

  return printerAgents.filter((a) => {
    if (!a) return false;
    if (matchStation(a.station, BILL_STATION_LABEL)) return false; // exclude BILL
    if (a.station == null) return false;
    const stnNorm = String(a.station).trim().toLowerCase();
    return wantedNorm.includes(stnNorm);
  });
}

// Source for KOT-on-place-order. Operates on already-filtered unplaced items
// (caller passes the same `unplacedItems` array used for cart construction).
export function cartStationsToSet(unplacedItems) {
  if (!Array.isArray(unplacedItems)) return [];
  const set = new Set();
  for (const item of unplacedItems) {
    const s = item && item.station;
    if (s != null && String(s).trim() !== '') {
      set.add(String(s).trim()); // preserve casing per R-OWNER-1.
    }
  }
  return Array.from(set);
}
